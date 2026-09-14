"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startCardPayment, type StartCardPaymentState } from "@/app/actions/payments";

const initialState: StartCardPaymentState = { status: "idle" };

function PayButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-gold-dark disabled:opacity-50"
    >
      {pending ? "Opna greiðslusíðu..." : "Greiða með korti"}
    </button>
  );
}

export function PayForm({ cancelToken }: { cancelToken: string }) {
  const [state, formAction] = useActionState(startCardPayment, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="cancelToken" value={cancelToken} />
      {state.status === "error" && state.message && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.message}
        </div>
      )}
      <PayButton />
    </form>
  );
}
