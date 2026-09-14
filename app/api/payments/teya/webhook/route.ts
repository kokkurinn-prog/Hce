import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSecret } from "@/lib/payments";

export const dynamic = "force-dynamic";

/**
 * Móttökuslóð fyrir ASYNC-tilkynningu frá Teya um að greiðsla hafi tekist
 * eða mistekist ("webhook").
 *
 * ÓKLÁRAÐ: nákvæm auðkenningaraðferð (fara Teya eftir sameiginlegum leynilykli
 * í haus, undirskrift, IP-lista o.s.frv.?) og nákvæmt JSON-snið tilkynningar
 * (hvaða reitir bera tilvísunarnúmer/stöðu) liggja ekki fyrir fyrr en
 * tæknigögn berast frá Teya. Núna er gert ráð fyrir einföldum
 * "Authorization: Bearer <TEYA_WEBHOOK_SECRET>" haus og reitunum
 * `reference` og `status` — uppfæra þarf þetta þegar raunveruleg skjöl
 * liggja fyrir.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const providedSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : null;
  if (!verifyWebhookSecret(providedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const reference = body?.reference as string | undefined;
  const status = body?.status as string | undefined;

  if (!reference || !status) {
    return NextResponse.json({ error: "Vantar reference eða status" }, { status: 400 });
  }

  const booking = await prisma.booking.findFirst({ where: { cardPaymentRef: reference } });
  if (!booking) {
    return NextResponse.json({ error: "Fann enga bókun með þessa tilvísun" }, { status: 404 });
  }

  if (status === "PAID") {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cardPaymentStatus: "PAID", isPaid: true },
    });
  } else if (status === "FAILED") {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { cardPaymentStatus: "FAILED" },
    });
  }

  return NextResponse.json({ ok: true });
}
