"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import { sendBookingReceivedEmail, sendWaitlistSpotAvailableEmail } from "@/lib/email";

export async function notifyWaitlistEntry(entryId: string) {
  await requireAdminSession();

  const entry = await prisma.waitlistEntry.findUniqueOrThrow({
    where: { id: entryId },
    include: { sitting: true },
  });

  await sendWaitlistSpotAvailableEmail(
    entry.sitting,
    { name: entry.name, partySize: entry.partySize },
    entry.email,
    entry.sittingId
  );

  await prisma.waitlistEntry.update({ where: { id: entryId }, data: { notifiedAt: new Date() } });
  revalidatePath(`/admin/aefingar/${entry.sittingId}`);
}

export async function removeWaitlistEntry(entryId: string) {
  await requireAdminSession();
  const entry = await prisma.waitlistEntry.delete({ where: { id: entryId } });
  revalidatePath(`/admin/aefingar/${entry.sittingId}`);
}

export type PromoteWaitlistResult = { status: "success" } | { status: "error"; message: string };

/** Flytur einn biðlistagest yfir í venjulega bókun, ef pláss leyfir. */
export async function promoteWaitlistEntry(entryId: string): Promise<PromoteWaitlistResult> {
  await requireAdminSession();

  const entry = await prisma.waitlistEntry.findUniqueOrThrow({ where: { id: entryId } });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const sitting = await tx.sitting.findUniqueOrThrow({ where: { id: entry.sittingId } });

      // Sama læsing og annars staðar í bókunarflæðinu svo ekki sé hægt að
      // færa yfir í sæti sem er þegar upppantað samtímis.
      await tx.$queryRaw`SELECT id FROM "Sitting" WHERE id = ${sitting.id} FOR UPDATE`;

      const bookedAgg = await tx.booking.aggregate({
        where: { sittingId: sitting.id, status: "CONFIRMED" },
        _sum: { partySize: true },
      });
      const booked = bookedAgg._sum.partySize ?? 0;
      const available = sitting.maxSeats - booked;

      if (entry.partySize > available) {
        throw new Error(`NOT_ENOUGH_SEATS:${available}`);
      }

      const created = await tx.booking.create({
        data: {
          sittingId: sitting.id,
          name: entry.name,
          email: entry.email,
          phone: entry.phone,
          partySize: entry.partySize,
        },
        include: { sitting: true },
      });

      await tx.waitlistEntry.delete({ where: { id: entry.id } });

      return created;
    });

    await sendBookingReceivedEmail(
      booking.sitting,
      { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
      booking.email
    );

    revalidatePath(`/admin/aefingar/${entry.sittingId}`);
    revalidatePath("/admin/bokanir");
    return { status: "success" };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NOT_ENOUGH_SEATS:")) {
      const available = err.message.split(":")[1];
      return {
        status: "error",
        message:
          available === "0"
            ? "Engin sæti laus — ekki hægt að færa yfir."
            : `Aðeins ${available} sæti laus — hópurinn er ${entry.partySize}.`,
      };
    }
    console.error("[promoteWaitlistEntry] villa:", err);
    return { status: "error", message: "Eitthvað fór úrskeiðis." };
  }
}
