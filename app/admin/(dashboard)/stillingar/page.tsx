import { getSettings } from "@/lib/settings";
import { isCardPaymentsConfigured } from "@/lib/payments";
import { SettingsForm } from "./settings-form";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getSettings();
  const cardPaymentsOn = isCardPaymentsConfigured();

  return (
    <div>
      <h1 className="font-display text-2xl text-ink">Stillingar</h1>
      <p className="mt-2 text-sm text-muted">
        Þessar upplýsingar birtast gestum í sjálfvirka greiðslutölvupóstinum
        sem sendur er viku fyrir hverja æfingu.
      </p>

      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-line bg-white/60 px-5 py-4 text-sm">
        <span
          className={`h-2.5 w-2.5 rounded-full ${cardPaymentsOn ? "bg-green-500" : "bg-zinc-300"}`}
        />
        <span className="text-ink">
          Kortagreiðsla (Teya): <strong>{cardPaymentsOn ? "Virk" : "Óvirk"}</strong>
        </span>
        {!cardPaymentsOn && (
          <span className="text-muted">
            — verður sjálfvirkt virk þegar TEYA_MERCHANT_ID og TEYA_API_KEY eru sett í Vercel.
          </span>
        )}
      </div>

      <div className="mt-8">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
