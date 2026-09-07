"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/auth";
import {
  sendBookingReceivedEmail,
  sendCancellationEmail,
  sendEventReminderEmail,
  sendFinalPaymentReminderEmail,
  sendPaymentReminderEmail,
} from "@/lib/email";
import { getSettings, SETTINGS_KEYS } from "@/lib/settings";

const manualBookingSchema = z.object({
  name: z.string().trim().min(2, "Nafn þarf að vera a.m.k. 2 stafir").max(120),
  email: z.string().trim().email("Ógilt netfang"),
  phone: z.string().trim().min(7, "Símanúmer virðist of stutt").max(20),
  partySize: z.coerce.number().int().min(1, "Fjöldi verður að vera a.m.k. 1").max(50),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  sendConfirmation: z.coerce.boolean().optional(),
});

export type ManualBookingState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof manualBookingSchema>, string>>;
};

export async function createBookingManually(
  sittingId: string,
  _prevState: ManualBookingState,
  formData: FormData
): Promise<ManualBookingState> {
  await requireAdminSession();

  const parsed = manualBookingSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    partySize: formData.get("partySize"),
    notes: formData.get("notes") ?? "",
    sendConfirmation: formData.get("sendConfirmation"),
  });

  if (!parsed.success) {
    const fieldErrors: ManualBookingState["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof z.infer<typeof manualBookingSchema>;
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Vinsamlegast leiðréttið villurnar hér að neðan.", fieldErrors };
  }

  const data = parsed.data;

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const sitting = await tx.sitting.findUnique({ where: { id: sittingId } });
      if (!sitting) {
        throw new Error("SITTING_NOT_FOUND");
      }

      // Sama læsing og í almenna bókunarflæðinu svo handvirk skráning geti
      // ekki farið yfir hámark ef bókun berst samtímis á vefnum.
      await tx.$queryRaw`SELECT id FROM "Sitting" WHERE id = ${sitting.id} FOR UPDATE`;

      const bookedAgg = await tx.booking.aggregate({
        where: { sittingId: sitting.id, status: "CONFIRMED" },
        _sum: { partySize: true },
      });
      const booked = bookedAgg._sum.partySize ?? 0;
      const available = sitting.maxSeats - booked;

      if (data.partySize > available) {
        throw new Error(`NOT_ENOUGH_SEATS:${available}`);
      }

      return tx.booking.create({
        data: {
          sittingId: sitting.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          partySize: data.partySize,
          notes: data.notes || null,
        },
        include: { sitting: true },
      });
    });

    if (data.sendConfirmation) {
      await sendBookingReceivedEmail(
        booking.sitting,
        { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
        booking.email
      );
    }

    revalidatePath(`/admin/aefingar/${sittingId}`);
    revalidatePath("/admin/bokanir");
    return { status: "success", message: "Bókun skráð." };
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NOT_ENOUGH_SEATS:")) {
      const available = err.message.split(":")[1];
      return {
        status: "error",
        message: available === "0" ? "Engin sæti laus á þessa æfingu." : `Aðeins ${available} sæti laus á þessa æfingu.`,
      };
    }
    console.error("[createBookingManually] villa:", err);
    return { status: "error", message: "Eitthvað fór úrskeiðis." };
  }
}

const bookingEditSchema = z.object({
  name: z.string().trim().min(2, "Nafn þarf að vera a.m.k. 2 stafir").max(120),
  email: z.string().trim().email("Ógilt netfang"),
  phone: z.string().trim().min(7, "Símanúmer virðist of stutt").max(20),
  partySize: z.coerce.number().int().min(1, "Fjöldi verður að vera a.m.k. 1").max(50),
});

export type UpdateBookingResult = { status: "success" } | { status: "error"; message: string };

export async function updateBookingDetails(
  bookingId: string,
  input: { name: string; email: string; phone: string; partySize: number }
): Promise<UpdateBookingResult> {
  await requireAdminSession();

  const parsed = bookingEditSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Ógild gögn." };
  }
  const data = parsed.data;

  const existing = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });

  if (data.partySize !== existing.partySize && existing.status === "CONFIRMED") {
    const bookedAgg = await prisma.booking.aggregate({
      where: { sittingId: existing.sittingId, status: "CONFIRMED", id: { not: bookingId } },
      _sum: { partySize: true },
    });
    const bookedByOthers = bookedAgg._sum.partySize ?? 0;
    const sitting = await prisma.sitting.findUniqueOrThrow({ where: { id: existing.sittingId } });
    if (bookedByOthers + data.partySize > sitting.maxSeats) {
      return {
        status: "error",
        message: `Ekki nóg pláss — hámark ${sitting.maxSeats - bookedByOthers} sæti fyrir þessa bókun.`,
      };
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { name: data.name, email: data.email, phone: data.phone, partySize: data.partySize },
  });

  revalidatePath(`/admin/aefingar/${existing.sittingId}`);
  revalidatePath("/admin/bokanir");
  return { status: "success" };
}

export async function adminCancelBooking(bookingId: string) {
  await requireAdminSession();

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED" },
    include: { sitting: true },
  });

  await sendCancellationEmail(
    booking.sitting,
    { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
    booking.email
  );

  revalidatePath(`/admin/aefingar/${booking.sittingId}`);
}

export async function toggleBookingPaid(bookingId: string) {
  await requireAdminSession();
  const booking = await prisma.booking.findUniqueOrThrow({ where: { id: bookingId } });
  await prisma.booking.update({ where: { id: bookingId }, data: { isPaid: !booking.isPaid } });
  revalidatePath(`/admin/aefingar/${booking.sittingId}`);
}

export async function sendReminderNow(bookingId: string) {
  await requireAdminSession();

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { sitting: true },
  });

  const settings = await getSettings();

  await sendPaymentReminderEmail(
    booking.sitting,
    { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
    booking.email,
    settings[SETTINGS_KEYS.paymentInstructions],
    settings[SETTINGS_KEYS.bankAccount],
    settings[SETTINGS_KEYS.bankAccountHolder],
    settings[SETTINGS_KEYS.bankKennitala]
  );

  await prisma.booking.update({ where: { id: bookingId }, data: { reminderSentAt: new Date() } });
  revalidatePath(`/admin/aefingar/${booking.sittingId}`);
}

export async function sendEventReminderNow(bookingId: string) {
  await requireAdminSession();

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { sitting: true },
  });

  await sendEventReminderEmail(
    booking.sitting,
    { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
    booking.email
  );

  await prisma.booking.update({ where: { id: bookingId }, data: { eventReminderSentAt: new Date() } });
  revalidatePath(`/admin/aefingar/${booking.sittingId}`);
}

export async function sendFinalReminderNow(bookingId: string) {
  await requireAdminSession();

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { sitting: true },
  });

  const settings = await getSettings();

  await sendFinalPaymentReminderEmail(
    booking.sitting,
    { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
    booking.email,
    settings[SETTINGS_KEYS.bankAccount],
    settings[SETTINGS_KEYS.bankAccountHolder],
    settings[SETTINGS_KEYS.bankKennitala]
  );

  await prisma.booking.update({ where: { id: bookingId }, data: { finalReminderSentAt: new Date() } });
  revalidatePath(`/admin/aefingar/${booking.sittingId}`);
}
