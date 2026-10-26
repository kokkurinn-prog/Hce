"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { saveSettings, type SettingsFormState } from "@/app/actions/admin-settings";
import type { SettingsMap } from "@/lib/settings";

const initialState: SettingsFormState = { status: "idle" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-ink px-6 py-2.5 text-sm font-medium text-cream hover:bg-gold-dark disabled:opacity-50"
    >
      {pending ? "Vista..." : "Vista stillingar"}
    </button>
  );
}

export function SettingsForm({ settings }: { settings: SettingsMap }) {
  const [state, formAction] = useActionState(saveSettings, initialState);

  return (
    <form action={formAction} className="max-w-xl space-y-5 rounded-2xl border border-line bg-white p-6">
      {state.status === "success" && state.message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="bankAccount" className="block text-sm font-medium text-ink">
          Reikningsnúmer
        </label>
        <input
          id="bankAccount"
          name="bankAccount"
          defaultValue={settings.payment_bank_account}
          placeholder="0000-00-000000"
          className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor="bankAccountHolder" className="block text-sm font-medium text-ink">
          Nafn reikningseiganda
        </label>
        <input
          id="bankAccountHolder"
          name="bankAccountHolder"
          defaultValue={settings.payment_bank_account_holder}
          className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      <div>
        <label htmlFor="bankKennitala" className="block text-sm font-medium text-ink">
          Kennitala
        </label>
        <input
          id="bankKennitala"
          name="bankKennitala"
          defaultValue={settings.payment_bank_kennitala}
          placeholder="000000-0000"
          className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Texti í greiðslutölvupósti</label>
        <p className="mt-1 text-xs text-muted">
          Þessi texti fer í greiðslutölvupóstinn — mismunandi fyrir hádegis-
          og kvöldverð, enda er fyrirkomulagið oft ólíkt. Þú getur notað{" "}
          <code>{"{fjöldi}"}</code>, <code>{"{verð}"}</code>,{" "}
          <code>{"{samtals}"}</code> og <code>{"{tilvísun}"}</code> í
          textanum — kerfið skiptir þeim sjálfkrafa út fyrir réttar tölur úr
          hverri bókun (t.d. &bdquo;Upphæð {"{verð}"} á mann, samtals{" "}
          {"{samtals}"} fyrir hópinn, merkið greiðsluna með {"{tilvísun}"}
          &ldquo;). Tilvísunin (t.d. HÆ01) er stillt fyrir hverja æfingu fyrir
          sig undir „Breyta æfingu&ldquo;. Dagsetning og klukkan sjálf fylgja
          sjálfkrafa með í hverjum pósti — ekki þörf á að skrifa það hér.
        </p>

        <div className="mt-3">
          <label htmlFor="paymentInstructionsLunch" className="block text-xs font-medium text-muted">
            Hádegisverður
          </label>
          <textarea
            id="paymentInstructionsLunch"
            name="paymentInstructionsLunch"
            rows={4}
            defaultValue={settings.payment_instructions_lunch}
            className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>

        <div className="mt-3">
          <label htmlFor="paymentInstructionsDinner" className="block text-xs font-medium text-muted">
            Kvöldverður
          </label>
          <textarea
            id="paymentInstructionsDinner"
            name="paymentInstructionsDinner"
            rows={4}
            defaultValue={settings.payment_instructions_dinner}
            className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
          />
        </div>
      </div>

      <div>
        <label htmlFor="organizerEmail" className="block text-sm font-medium text-ink">
          Netfang deildar <span className="text-muted">(valfrjálst, birtist ekki gestum)</span>
        </label>
        <input
          id="organizerEmail"
          name="organizerEmail"
          type="email"
          defaultValue={settings.organizer_email}
          className="mt-1.5 w-full rounded-lg border border-line px-3.5 py-2.5 text-sm outline-none focus:border-gold"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
