import { Resend } from "resend";
import { formatDateLong, formatKronur, mealTypeLabel } from "@/lib/format";

type SittingInfo = {
  date: Date;
  mealType: "LUNCH" | "DINNER";
  title: string;
  pricePerSeat: number;
  paymentReference?: string | null;
};

type BookingInfo = {
  id: string;
  name: string;
  partySize: number;
  cancelToken: string;
};

function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function getFrom() {
  return process.env.EMAIL_FROM ?? "MK Bókanir <onboarding@resend.dev>";
}

let resendClient: Resend | null = null;
function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!resendClient) resendClient = new Resend(apiKey);
  return resendClient;
}

async function sendEmail(to: string, subject: string, html: string) {
  const resend = getResend();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY vantar — sendi ekki, en hér er innihaldið:
Til: ${to}
Efni: ${subject}
${html}`);
    return;
  }
  const { error } = await resend.emails.send({
    from: getFrom(),
    to,
    subject,
    html,
  });
  if (error) {
    console.error("[email] Villa við sendingu:", error);
    throw new Error("Ekki tókst að senda tölvupóst");
  }
}

function wrapEmail(title: string, bodyHtml: string) {
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
    <div style="background: #14110f; color: #f4ead9; padding: 28px 32px; border-radius: 8px 8px 0 0;">
      <div style="font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; opacity: 0.7;">Hótel og matvælaskólinn · Matreiðslu og framreiðsludeild</div>
      <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 600;">${title}</h1>
    </div>
    <div style="border: 1px solid #e7e0d4; border-top: none; padding: 28px 32px; border-radius: 0 0 8px 8px;">
      ${bodyHtml}
      <p style="margin-top: 32px; font-size: 12px; color: #8a8578;">
        Þessi tölvupóstur var sendur sjálfvirkt frá bókunarkerfi Matreiðslu og framreiðsludeildar hjá Hótel og matvælaskólanum.
      </p>
    </div>
  </div>`;
}

function sittingDetailsHtml(sitting: SittingInfo, booking: BookingInfo) {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #6b6558;">Viðburður</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${sitting.title}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Dagsetning</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDateLong(sitting.date)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Máltíð</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${mealTypeLabel(sitting.mealType)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Fjöldi gesta</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.partySize}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Verð á mann</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatKronur(sitting.pricePerSeat)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Samtals</td><td style="padding: 6px 0; text-align: right; font-weight: 700;">${formatKronur(sitting.pricePerSeat * booking.partySize)}</td></tr>
    </table>`;
}

function sittingSummaryHtml(sitting: SittingInfo, booking: BookingInfo) {
  return `
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 6px 0; color: #6b6558;">Viðburður</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${sitting.title}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Dagsetning</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDateLong(sitting.date)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Máltíð</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${mealTypeLabel(sitting.mealType)}</td></tr>
      <tr><td style="padding: 6px 0; color: #6b6558;">Fjöldi gesta</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${booking.partySize}</td></tr>
    </table>`;
}

export async function sendBookingReceivedEmail(sitting: SittingInfo, booking: BookingInfo, to: string) {
  const cancelUrl = `${getSiteUrl()}/bokun/${booking.cancelToken}/hafna`;
  const html = wrapEmail(
    "Bókun móttekin",
    `
      <p>Sæl/l ${booking.name},</p>
      <p>Takk fyrir bókunina! Hún hefur verið skráð og sætin frátekin.</p>
      ${sittingDetailsHtml(sitting, booking)}
      <p>Um það bil viku fyrir viðburðinn sendum við þér staðfestingu ásamt greiðsluupplýsingum.</p>
      <p style="margin-top: 24px; font-size: 13px; color: #6b6558;">
        Þarftu að afbóka? <a href="${cancelUrl}" style="color: #7a4b1f;">Smelltu hér til að afbóka</a>.
      </p>
    `
  );
  await sendEmail(to, `Bókun móttekin — ${sitting.title}`, html);
}

function applyTemplateTokens(text: string, sitting: SittingInfo, booking: BookingInfo) {
  return text
    .replaceAll("{fjöldi}", String(booking.partySize))
    .replaceAll("{verð}", formatKronur(sitting.pricePerSeat))
    .replaceAll("{samtals}", formatKronur(sitting.pricePerSeat * booking.partySize))
    .replaceAll("{tilvísun}", sitting.paymentReference ?? "");
}

export async function sendPaymentReminderEmail(
  sitting: SittingInfo,
  booking: BookingInfo,
  to: string,
  paymentInstructions: string,
  bankAccount: string,
  bankAccountHolder: string,
  bankKennitala: string
) {
  const cancelUrl = `${getSiteUrl()}/bokun/${booking.cancelToken}/hafna`;
  const instructions = applyTemplateTokens(paymentInstructions, sitting, booking);
  const bankHtml = bankAccount
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f7f3ec; border-radius: 6px;">
        <tr><td style="padding: 10px 14px; color: #6b6558;">Reikningsnúmer</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankAccount}</td></tr>
        ${bankAccountHolder ? `<tr><td style="padding: 10px 14px; color: #6b6558;">Móttakandi</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankAccountHolder}</td></tr>` : ""}
        ${bankKennitala ? `<tr><td style="padding: 10px 14px; color: #6b6558;">Kennitala</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankKennitala}</td></tr>` : ""}
      </table>`
    : "";
  const html = wrapEmail(
    "Staðfesting og greiðsluupplýsingar",
    `
      <p>Sæl/l ${booking.name},</p>
      <p>Viðburðurinn þinn er eftir viku — hér er staðfesting bókunarinnar og greiðsluupplýsingar.</p>
      ${sittingDetailsHtml(sitting, booking)}
      ${bankHtml}
      <p>${instructions}</p>
      <p style="margin-top: 24px; font-size: 13px; color: #6b6558;">
        Þarftu að afbóka? <a href="${cancelUrl}" style="color: #7a4b1f;">Smelltu hér til að afbóka</a>.
      </p>
    `
  );
  await sendEmail(to, `Staðfesting og greiðsla — ${sitting.title}`, html);
}

export async function sendCancellationEmail(sitting: SittingInfo, booking: BookingInfo, to: string) {
  const html = wrapEmail(
    "Bókun afbókuð",
    `
      <p>Sæl/l ${booking.name},</p>
      <p>Bókunin þín á eftirfarandi viðburð hefur verið afbókuð og sætin losuð.</p>
      ${sittingDetailsHtml(sitting, booking)}
      <p>Ef þetta var mistök, vinsamlegast bókaðu aftur á vefnum eða hafðu samband.</p>
    `
  );
  await sendEmail(to, `Bókun afbókuð — ${sitting.title}`, html);
}

export async function sendEventReminderEmail(sitting: SittingInfo, booking: BookingInfo, to: string) {
  const cancelUrl = `${getSiteUrl()}/bokun/${booking.cancelToken}/hafna`;
  const html = wrapEmail(
    "Áminning um viðburð",
    `
      <p>Sæl/l ${booking.name},</p>
      <p>Okkur langar að minna þig á að þú átt bókað borð hjá okkur.</p>
      ${sittingSummaryHtml(sitting, booking)}
      <p>Við hlökkum til að sjá þig!</p>
      <p style="margin-top: 24px; font-size: 13px; color: #6b6558;">
        Þarftu að afbóka? <a href="${cancelUrl}" style="color: #7a4b1f;">Smelltu hér til að afbóka</a>.
      </p>
    `
  );
  await sendEmail(to, `Áminning — ${sitting.title}`, html);
}

export async function sendFinalPaymentReminderEmail(
  sitting: SittingInfo,
  booking: BookingInfo,
  to: string,
  bankAccount: string,
  bankAccountHolder: string,
  bankKennitala: string
) {
  const cancelUrl = `${getSiteUrl()}/bokun/${booking.cancelToken}/hafna`;
  const bankHtml = bankAccount
    ? `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0; background: #f7f3ec; border-radius: 6px;">
        <tr><td style="padding: 10px 14px; color: #6b6558;">Reikningsnúmer</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankAccount}</td></tr>
        ${bankAccountHolder ? `<tr><td style="padding: 10px 14px; color: #6b6558;">Móttakandi</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankAccountHolder}</td></tr>` : ""}
        ${bankKennitala ? `<tr><td style="padding: 10px 14px; color: #6b6558;">Kennitala</td><td style="padding: 10px 14px; text-align: right; font-weight: 600;">${bankKennitala}</td></tr>` : ""}
      </table>`
    : "";
  const html = wrapEmail(
    "Áminning — greiðsla vantar",
    `
      <p>Sæl/l ${booking.name},</p>
      <p>Viðburðurinn þinn er eftir aðeins tvo daga og við sjáum ekki enn að greiðsla hafi borist.</p>
      ${sittingDetailsHtml(sitting, booking)}
      ${bankHtml}
      <p>Vinsamlegast gakktu frá greiðslu sem fyrst svo bókunin haldist.</p>
      <p style="margin-top: 24px; font-size: 13px; color: #6b6558;">
        Þarftu að afbóka? <a href="${cancelUrl}" style="color: #7a4b1f;">Smelltu hér til að afbóka</a>.
      </p>
    `
  );
  await sendEmail(to, `Áminning — greiðsla vantar — ${sitting.title}`, html);
}

type WaitlistEntryInfo = { name: string; partySize: number };

export async function sendWaitlistJoinedEmail(sitting: SittingInfo, entry: WaitlistEntryInfo, to: string) {
  const html = wrapEmail(
    "Þú ert á biðlistanum",
    `
      <p>Sæl/l ${entry.name},</p>
      <p>Þessi æfing er því miður fullbókuð núna, en við höfum skráð þig á biðlista fyrir ${entry.partySize} manns.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #6b6558;">Viðburður</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${sitting.title}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b6558;">Dagsetning</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDateLong(sitting.date)}</td></tr>
      </table>
      <p>Ef sæti losnar höfum við samband við þig í tölvupósti.</p>
    `
  );
  await sendEmail(to, `Biðlisti — ${sitting.title}`, html);
}

export async function sendWaitlistSpotAvailableEmail(
  sitting: SittingInfo,
  entry: WaitlistEntryInfo,
  to: string,
  sittingId: string
) {
  const bookUrl = `${getSiteUrl()}/aefingar/${sittingId}`;
  const html = wrapEmail(
    "Sæti losnaði — bókaðu núna",
    `
      <p>Sæl/l ${entry.name},</p>
      <p>Góðar fréttir! Sæti losnaði á æfingunni sem þú varst á biðlista fyrir.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 0; color: #6b6558;">Viðburður</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${sitting.title}</td></tr>
        <tr><td style="padding: 6px 0; color: #6b6558;">Dagsetning</td><td style="padding: 6px 0; text-align: right; font-weight: 600;">${formatDateLong(sitting.date)}</td></tr>
      </table>
      <p>Sætin eru ekki tryggð fyrr en þú hefur bókað — við mælum með að bóka sem fyrst þar sem fleiri gætu verið á biðlistanum.</p>
      <p style="margin-top: 24px;">
        <a href="${bookUrl}" style="color: #7a4b1f; font-weight: 600;">Smelltu hér til að bóka</a>
      </p>
    `
  );
  await sendEmail(to, `Sæti laust — ${sitting.title}`, html);
}

export async function sendPasswordResetEmail(to: string, token: string) {
  const resetUrl = `${getSiteUrl()}/admin/endurstilla/${token}`;
  const html = wrapEmail(
    "Endurstilla lykilorð",
    `
      <p>Beiðni um að endurstilla lykilorð stjórnandaaðgangs var móttekin.</p>
      <p style="margin-top: 16px;">
        <a href="${resetUrl}" style="color: #7a4b1f; font-weight: 600;">Smelltu hér til að velja nýtt lykilorð</a>
      </p>
      <p style="margin-top: 24px; font-size: 13px; color: #6b6558;">
        Hlekkurinn rennur út eftir klukkustund. Ef þú baðst ekki um þetta getur þú hunsað þennan tölvupóst.
      </p>
    `
  );
  await sendEmail(to, "Endurstilla lykilorð — stjórnborð", html);
}
