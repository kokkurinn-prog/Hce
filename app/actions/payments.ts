"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createCheckoutSession, isCardPaymentsConfigured } from "@/lib/payments";

export type StartCardPaymentState = { status: "idle" | "error"; message?: string };

export async function startCardPayment(
  _prevState: StartCardPaymentState,
  formData: FormData
): Promise<StartCardPaymentState> {
  const cancelToken = String(formData.get("cancelToken") ?? "");
  if (!cancelToken) return { status: "error", message: "Ógildur hlekkur." };

  if (!isCardPaymentsConfigured()) {
    return { status: "error", message: "Kortagreiðsla er ekki virk ennþá." };
  }

  const booking = await prisma.booking.findUnique({
    where: { cancelToken },
    include: { sitting: true },
  });
  if (!booking || booking.status !== "CONFIRMED") {
    return { status: "error", message: "Fann ekki virka bókun tengda þessum hlekk." };
  }
  if (booking.isPaid) {
    return { status: "error", message: "Þessi bókun er þegar greidd." };
  }

  let session;
  try {
    session = await createCheckoutSession({
      bookingId: booking.id,
      cancelToken: booking.cancelToken,
      amountKronur: booking.sitting.pricePerSeat * booking.partySize,
      description: `${booking.sitting.title} — ${booking.name}`,
    });
  } catch (err) {
    console.error("[startCardPayment] villa:", err);
    return { status: "error", message: "Ekki tókst að opna greiðslusíðu. Vinsamlegast reyndu aftur síðar." };
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: { cardPaymentStatus: "PENDING", cardPaymentRef: session.reference },
  });

  redirect(session.url);
}
