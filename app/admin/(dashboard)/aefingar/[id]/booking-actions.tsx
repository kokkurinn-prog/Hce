"use client";

import { useTransition } from "react";
import {
  adminCancelBooking,
  sendEventReminderNow,
  sendFinalReminderNow,
  sendReminderNow,
  toggleBookingPaid,
} from "@/app/actions/admin-bookings";

export function TogglePaidButton({ bookingId, isPaid }: { bookingId: string; isPaid: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => toggleBookingPaid(bookingId))}
      className="text-gold-dark hover:underline disabled:opacity-50"
    >
      {isPaid ? "Merkja ógreitt" : "Merkja greitt"}
    </button>
  );
}

export function SendReminderButton({ bookingId, alreadySent }: { bookingId: string; alreadySent?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => sendReminderNow(bookingId))}
      className="text-gold-dark hover:underline disabled:opacity-50"
    >
      {isPending ? "Sendi..." : alreadySent ? "Senda aftur" : "Senda áminningu"}
    </button>
  );
}

export function SendFinalReminderButton({ bookingId, alreadySent }: { bookingId: string; alreadySent?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => sendFinalReminderNow(bookingId))}
      className="text-gold-dark hover:underline disabled:opacity-50"
    >
      {isPending ? "Sendi..." : alreadySent ? "Senda aftur" : "Senda lokaáminningu"}
    </button>
  );
}

export function SendEventReminderButton({ bookingId, alreadySent }: { bookingId: string; alreadySent?: boolean }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => sendEventReminderNow(bookingId))}
      className="text-gold-dark hover:underline disabled:opacity-50"
    >
      {isPending ? "Sendi..." : alreadySent ? "Senda aftur" : "Senda viðburðaráminningu"}
    </button>
  );
}

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        if (confirm("Afbóka þessa bókun? Gestur fær tilkynningu í tölvupósti.")) {
          startTransition(() => adminCancelBooking(bookingId));
        }
      }}
      className="text-red-700 hover:underline disabled:opacity-50"
    >
      Afbóka
    </button>
  );
}
