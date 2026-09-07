"use client";

import { useState, useTransition } from "react";
import { updateBookingDetails } from "@/app/actions/admin-bookings";
import { CancelBookingButton, SendFinalReminderButton, SendReminderButton, TogglePaidButton } from "./booking-actions";
import type { Booking } from "@/lib/generated/prisma/client";

export function BookingRow({ booking }: { booking: Booking }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(booking.name);
  const [email, setEmail] = useState(booking.email);
  const [phone, setPhone] = useState(booking.phone);
  const [partySize, setPartySize] = useState(String(booking.partySize));

  function startEditing() {
    setName(booking.name);
    setEmail(booking.email);
    setPhone(booking.phone);
    setPartySize(String(booking.partySize));
    setError(null);
    setEditing(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateBookingDetails(booking.id, {
        name,
        email,
        phone,
        partySize: Number(partySize),
      });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <tr className="bg-cream-muted/40">
        <td colSpan={9} className="px-5 py-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-muted">Nafn</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-muted">Netfang</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="mt-1 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-muted">Sími</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-28 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="block text-xs text-muted">Fjöldi</label>
              <input
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
                type="number"
                min={1}
                className="mt-1 w-20 rounded-lg border border-line px-2.5 py-1.5 text-sm outline-none focus:border-gold"
              />
            </div>
            <div className="flex gap-3 pb-1.5">
              <button
                type="button"
                disabled={isPending}
                onClick={save}
                className="text-sm text-gold-dark hover:underline disabled:opacity-50"
              >
                {isPending ? "Vista..." : "Vista"}
              </button>
              <button type="button" onClick={() => setEditing(false)} className="text-sm text-muted hover:underline">
                Hætta við
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className={booking.status === "CANCELLED" ? "opacity-50" : ""}>
      <td className="px-5 py-4 font-medium text-ink">{booking.name}</td>
      <td className="px-5 py-4 text-muted">{booking.email}</td>
      <td className="px-5 py-4 text-muted">{booking.phone}</td>
      <td className="px-5 py-4 text-muted">{booking.partySize}</td>
      <td className="px-5 py-4">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            booking.status === "CONFIRMED" ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {booking.status === "CONFIRMED" ? "Staðfest" : "Afbókað"}
        </span>
      </td>
      <td className="px-5 py-4">
        {booking.status === "CONFIRMED" ? (
          <TogglePaidButton bookingId={booking.id} isPaid={booking.isPaid} />
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-5 py-4 text-xs text-muted">
        {booking.status === "CONFIRMED" ? (
          <SendReminderButton bookingId={booking.id} alreadySent={!!booking.reminderSentAt} />
        ) : (
          "—"
        )}
      </td>
      <td className="px-5 py-4 text-xs text-muted">
        {booking.status === "CONFIRMED" ? (
          <SendFinalReminderButton bookingId={booking.id} alreadySent={!!booking.finalReminderSentAt} />
        ) : (
          "—"
        )}
      </td>
      <td className="px-5 py-4 text-right text-xs">
        <div className="flex items-center justify-end gap-3">
          {booking.status === "CONFIRMED" && (
            <button type="button" onClick={startEditing} className="text-gold-dark hover:underline">
              Breyta
            </button>
          )}
          {booking.status === "CONFIRMED" && <CancelBookingButton bookingId={booking.id} />}
        </div>
      </td>
    </tr>
  );
}
