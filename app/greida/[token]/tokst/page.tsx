import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Gestur lendir hér þegar hann kemur til baka frá greiðslusíðu Teya eftir
// að hafa (líklega) lokið greiðslu. Sjálf staðfestingin á að hafa borist
// gegnum vefkrókinn (/api/payments/teya/webhook) rétt á undan eða á eftir —
// þess vegna er staðan sótt aftur hér í stað þess að gera ráð fyrir að hún
// sé þegar rétt.
export default async function PaymentSuccessPage({ params }: PageProps<"/greida/[token]/tokst">) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });
  if (!booking) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h1 className="font-display text-3xl text-ink">
            {booking.isPaid ? "Greiðsla móttekin" : "Greiðsla í vinnslu"}
          </h1>

          <div className="mt-6 rounded-2xl border border-line bg-white/60 p-6 text-sm text-muted">
            {booking.isPaid ? (
              <p>Takk fyrir — greiðslan þín hefur verið staðfest.</p>
            ) : (
              <p>
                Við erum að bíða eftir staðfestingu frá greiðslugáttinni. Þetta tekur yfirleitt aðeins
                nokkrar sekúndur — <Link href={`/greida/${token}`} className="text-gold-dark hover:underline">
                  smelltu hér til að athuga stöðuna aftur
                </Link>.
              </p>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
