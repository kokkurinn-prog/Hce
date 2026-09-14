import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentCancelledPage({ params }: PageProps<"/greida/[token]/hafnad">) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({ where: { cancelToken: token } });
  if (!booking) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h1 className="font-display text-3xl text-ink">Greiðsla tókst ekki</h1>

          <div className="mt-6 rounded-2xl border border-line bg-white/60 p-6 text-sm text-muted">
            <p>
              Greiðslan var ekki kláruð — annað hvort hættir þú við eða eitthvað fór úrskeiðis hjá
              greiðslugáttinni. Bókunin þín er ennþá skráð og engin sæti hafa tapast.
            </p>
            <p className="mt-4">
              <Link href={`/greida/${token}`} className="text-gold-dark hover:underline">
                Reyna aftur
              </Link>{" "}
              eða notaðu millifærsluleiðbeiningarnar sem fylgdu í tölvupóstinum.
            </p>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
