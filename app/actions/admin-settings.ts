"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/auth";
import { SETTINGS_KEYS, updateSettings } from "@/lib/settings";

export type SettingsFormState = { status: "idle" | "error" | "success"; message?: string };

export async function saveSettings(
  _prevState: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  await requireAdminSession();

  await updateSettings({
    [SETTINGS_KEYS.bankAccount]: String(formData.get("bankAccount") ?? "").trim(),
    [SETTINGS_KEYS.bankAccountHolder]: String(formData.get("bankAccountHolder") ?? "").trim(),
    [SETTINGS_KEYS.bankKennitala]: String(formData.get("bankKennitala") ?? "").trim(),
    [SETTINGS_KEYS.paymentInstructionsLunch]: String(formData.get("paymentInstructionsLunch") ?? "").trim(),
    [SETTINGS_KEYS.paymentInstructionsDinner]: String(formData.get("paymentInstructionsDinner") ?? "").trim(),
    [SETTINGS_KEYS.organizerEmail]: String(formData.get("organizerEmail") ?? "").trim(),
  });

  revalidatePath("/admin/stillingar");
  return { status: "success", message: "Stillingar vistaðar." };
}
