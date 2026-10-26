import { NextRequest, NextResponse } from "next/server";
import { addDays, endOfDay, startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { sendFinalPaymentReminderEmail, sendPaymentReminderEmail } from "@/lib/email";
import { getPaymentInstructionsFor, getSettings, SETTINGS_KEYS } from "@/lib/settings";

export const dynamic = "force-dynamic";

const FIRST_REMINDER_DAYS_BEFORE = 7;
const FINAL_REMINDER_DAYS_BEFORE = 2;

function dateRange(daysFromNow: number) {
  const target = addDays(new Date(), daysFromNow);
  return { gte: startOfDay(target), lte: endOfDay(target) };
}

// Keyrt daglega af Vercel Cron (sjá vercel.json).
// 1) Finnur æfingar sem eiga sér stað eftir nákvæmlega viku og sendir
//    staðfestingar-/greiðslupóst á allar staðfestar bókanir sem eiga eftir
//    að fá slíkan póst.
// 2) Finnur æfingar sem eiga sér stað eftir nákvæmlega tvo daga og sendir
//    lokaáminningu á bókanir sem eru enn ógreiddar þrátt fyrir að hafa fengið
//    fyrri áminninguna.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getSettings();

  const firstSittings = await prisma.sitting.findMany({
    where: { date: dateRange(FIRST_REMINDER_DAYS_BEFORE) },
    include: {
      bookings: { where: { status: "CONFIRMED", reminderSentAt: null } },
    },
  });

  let firstSentCount = 0;
  const errors: string[] = [];

  for (const sitting of firstSittings) {
    for (const booking of sitting.bookings) {
      try {
        await sendPaymentReminderEmail(
          sitting,
          { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
          booking.email,
          getPaymentInstructionsFor(settings, sitting.mealType),
          settings[SETTINGS_KEYS.bankAccount],
          settings[SETTINGS_KEYS.bankAccountHolder],
          settings[SETTINGS_KEYS.bankKennitala]
        );
        await prisma.booking.update({ where: { id: booking.id }, data: { reminderSentAt: new Date() } });
        firstSentCount++;
      } catch (err) {
        console.error(`[cron] Villa við sendingu áminningar fyrir bókun ${booking.id}:`, err);
        errors.push(booking.id);
      }
    }
  }

  const finalSittings = await prisma.sitting.findMany({
    where: { date: dateRange(FINAL_REMINDER_DAYS_BEFORE) },
    include: {
      bookings: {
        where: { status: "CONFIRMED", isPaid: false, reminderSentAt: { not: null }, finalReminderSentAt: null },
      },
    },
  });

  let finalSentCount = 0;

  for (const sitting of finalSittings) {
    for (const booking of sitting.bookings) {
      try {
        await sendFinalPaymentReminderEmail(
          sitting,
          { id: booking.id, name: booking.name, partySize: booking.partySize, cancelToken: booking.cancelToken },
          booking.email,
          settings[SETTINGS_KEYS.bankAccount],
          settings[SETTINGS_KEYS.bankAccountHolder],
          settings[SETTINGS_KEYS.bankKennitala]
        );
        await prisma.booking.update({ where: { id: booking.id }, data: { finalReminderSentAt: new Date() } });
        finalSentCount++;
      } catch (err) {
        console.error(`[cron] Villa við sendingu lokaáminningar fyrir bókun ${booking.id}:`, err);
        errors.push(booking.id);
      }
    }
  }

  return NextResponse.json({
    firstRemindersSent: firstSentCount,
    finalRemindersSent: finalSentCount,
    failedBookingIds: errors,
  });
}
