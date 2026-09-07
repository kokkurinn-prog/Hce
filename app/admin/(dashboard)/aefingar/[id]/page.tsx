import { notFound } from "next/navigation";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { updateSitting } from "@/app/actions/admin-sittings";
import { SittingForm } from "@/components/sitting-form";
import { formatKronur } from "@/lib/format";
import { availableSeats, getBookedSeats } from "@/lib/sittings";
import { BookingRow } from "./booking-row";
import { ManualBookingForm } from "./manual-booking-form";
import { NotifyWaitlistButton, RemoveWaitlistButton } from "./waitlist-actions";

export const dynamic = "force-dynamic";

export default async function AdminSittingDetailPage({ params }: PageProps<"/admin/aefingar/[id]">) {
  const { id } = await params;

  const sitting = await prisma.sitting.findUnique({
    where: { id },
    include: {
      bookings: { orderBy: { createdAt: "desc" } },
      waitlist: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!sitting) notFound();

  const booked = await getBookedSeats(sitting.id);
  const available = availableSeats(sitting.maxSeats, booked);
  const boundUpdate = updateSitting.bind(null, sitting.id);

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-ink">{sitting.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {booked} / {sitting.maxSeats} sæti bókuð · {available} laus · {formatKronur(sitting.pricePerSeat)} / mann
          </p>
        </div>
        <a
          href={`/api/admin/bookings/export?sittingId=${sitting.id}`}
          className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-gold"
        >
          Sækja CSV
        </a>
      </div>

      <section>
        <h2 className="font-display text-lg text-ink">Breyta æfingu</h2>
        <div className="mt-4">
          <SittingForm
            action={boundUpdate}
            submitLabel="Vista breytingar"
            defaults={{
              date: format(sitting.date, "yyyy-MM-dd'T'HH:mm"),
              mealType: sitting.mealType,
              title: sitting.title,
              menuDescription: sitting.menuDescription ?? "",
              maxSeats: sitting.maxSeats,
              pricePerSeat: sitting.pricePerSeat,
              paymentReference: sitting.paymentReference ?? "",
            }}
          />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Skrá bókun handvirkt</h2>
        <p className="mt-1 text-sm text-muted">
          Fyrir bókanir sem berast símleiðis eða í tölvupósti.
        </p>
        <div className="mt-4">
          <ManualBookingForm sittingId={sitting.id} />
        </div>
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Bókanir ({sitting.bookings.length})</h2>
        {sitting.bookings.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Engar bókanir ennþá.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Nafn</th>
                  <th className="px-5 py-3 font-medium">Netfang</th>
                  <th className="px-5 py-3 font-medium">Sími</th>
                  <th className="px-5 py-3 font-medium">Fjöldi</th>
                  <th className="px-5 py-3 font-medium">Staða</th>
                  <th className="px-5 py-3 font-medium">Greitt</th>
                  <th className="px-5 py-3 font-medium">Áminning</th>
                  <th className="px-5 py-3 font-medium">Lokaáminning</th>
                  <th className="px-5 py-3 font-medium">Viðburðaráminning</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sitting.bookings.map((booking) => (
                  <BookingRow key={booking.id} booking={booking} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-lg text-ink">Biðlisti ({sitting.waitlist.length})</h2>
        {sitting.waitlist.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Enginn á biðlista.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Nafn</th>
                  <th className="px-5 py-3 font-medium">Netfang</th>
                  <th className="px-5 py-3 font-medium">Sími</th>
                  <th className="px-5 py-3 font-medium">Fjöldi</th>
                  <th className="px-5 py-3 font-medium">Staða</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {sitting.waitlist.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-5 py-4 font-medium text-ink">{entry.name}</td>
                    <td className="px-5 py-4 text-muted">{entry.email}</td>
                    <td className="px-5 py-4 text-muted">{entry.phone}</td>
                    <td className="px-5 py-4 text-muted">{entry.partySize}</td>
                    <td className="px-5 py-4 text-xs text-muted">{entry.notifiedAt ? "Tilkynnt" : "Óskráð"}</td>
                    <td className="px-5 py-4 text-right text-xs">
                      <div className="flex items-center justify-end gap-3">
                        <NotifyWaitlistButton entryId={entry.id} />
                        <RemoveWaitlistButton entryId={entry.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
