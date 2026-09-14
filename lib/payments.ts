import crypto from "crypto";

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Er búið að setja inn Teya-aðgangsgögn í umhverfisbreytur? */
export function isCardPaymentsConfigured() {
  return Boolean(process.env.TEYA_MERCHANT_ID && process.env.TEYA_API_KEY);
}

/** Hlekkur sem óhætt er að birta gestum (t.d. í tölvupósti) — aðeins ef kortagreiðsla er virk. */
export function getCardPaymentUrl(cancelToken: string): string | null {
  if (!isCardPaymentsConfigured()) return null;
  return `${getSiteUrl()}/greida/${cancelToken}`;
}

export type CheckoutSessionInput = {
  bookingId: string;
  cancelToken: string;
  amountKronur: number;
  description: string;
};

export type CheckoutSession = { url: string; reference: string };

/**
 * Býr til hýsta greiðslusíðu hjá Teya fyrir eina bókun og skilar hlekk sem
 * gestur er sendur á.
 *
 * ÓKLÁRAÐ: raunveruleg útfærsla vantar — nákvæm vefslóð Teya-þjónustunnar,
 * auðkenningaraðferð (TEYA_API_KEY/TEYA_API_SECRET) og svarsniðið liggja
 * ekki fyrir fyrr en samningur er kominn á og tæknigögn hafa borist (sjá
 * gátlistann sem fjármálastjóri fékk sendan). Þegar þau gögn liggja fyrir
 * þarf aðeins að fylla út þessa einu fallsútfærslu — restin af
 * greiðsluflæðinu (síða, vefkrókur, gagnagrunnsvelli) er þegar tilbúin.
 */
export async function createCheckoutSession(_input: CheckoutSessionInput): Promise<CheckoutSession> {
  if (!isCardPaymentsConfigured()) {
    throw new Error("CARD_PAYMENTS_NOT_CONFIGURED");
  }
  throw new Error("TEYA_INTEGRATION_NOT_IMPLEMENTED");
}

/** Ber saman leynilykil úr vefkróki Teya við TEYA_WEBHOOK_SECRET á öruggan hátt. */
export function verifyWebhookSecret(providedSecret: string | null): boolean {
  const expected = process.env.TEYA_WEBHOOK_SECRET;
  if (!expected || !providedSecret) return false;
  const a = Buffer.from(providedSecret);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
