import { prisma } from "@/lib/prisma";

export const SETTINGS_KEYS = {
  bankAccount: "payment_bank_account",
  bankAccountHolder: "payment_bank_account_holder",
  bankKennitala: "payment_bank_kennitala",
  paymentInstructionsLunch: "payment_instructions_lunch",
  paymentInstructionsDinner: "payment_instructions_dinner",
  organizerEmail: "organizer_email",
} as const;

// Fyrir breytinguna var aðeins eitt textabox fyrir allar æfingar — þessi
// lykill er lesinn áfram (en ekki skrifaður í) svo fyrri sérstillingin
// glatist ekki þegar hún er flutt yfir í hádegis-/kvöldverðarreitina.
const LEGACY_PAYMENT_INSTRUCTIONS_KEY = "payment_instructions";

export type SettingsMap = Record<(typeof SETTINGS_KEYS)[keyof typeof SETTINGS_KEYS], string>;

const DEFAULT_PAYMENT_INSTRUCTIONS =
  "Vinsamlegast greiðið með millifærslu á ofangreindan reikning fyrir viðburðinn. Merkið millifærsluna með nafni ykkar.";

const DEFAULTS: SettingsMap = {
  [SETTINGS_KEYS.bankAccount]: "",
  [SETTINGS_KEYS.bankAccountHolder]: "Menntaskólinn í Kópavogi",
  [SETTINGS_KEYS.bankKennitala]: "",
  [SETTINGS_KEYS.paymentInstructionsLunch]: DEFAULT_PAYMENT_INSTRUCTIONS,
  [SETTINGS_KEYS.paymentInstructionsDinner]: DEFAULT_PAYMENT_INSTRUCTIONS,
  [SETTINGS_KEYS.organizerEmail]: "",
};

export async function getSettings(): Promise<SettingsMap> {
  const rows = await prisma.settings.findMany();
  const map = { ...DEFAULTS };
  const byKey = new Map(rows.map((row) => [row.key, row.value]));

  for (const row of rows) {
    if (row.key in map) {
      (map as Record<string, string>)[row.key] = row.value;
    }
  }

  const legacy = byKey.get(LEGACY_PAYMENT_INSTRUCTIONS_KEY);
  if (legacy) {
    if (!byKey.has(SETTINGS_KEYS.paymentInstructionsLunch)) {
      map[SETTINGS_KEYS.paymentInstructionsLunch] = legacy;
    }
    if (!byKey.has(SETTINGS_KEYS.paymentInstructionsDinner)) {
      map[SETTINGS_KEYS.paymentInstructionsDinner] = legacy;
    }
  }

  return map;
}

export async function updateSettings(values: Partial<SettingsMap>) {
  const entries = Object.entries(values) as [string, string][];
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.settings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      })
    )
  );
}

export function getPaymentInstructionsFor(settings: SettingsMap, mealType: "LUNCH" | "DINNER") {
  return mealType === "LUNCH"
    ? settings[SETTINGS_KEYS.paymentInstructionsLunch]
    : settings[SETTINGS_KEYS.paymentInstructionsDinner];
}
