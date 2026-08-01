"use client";

import { useActionState } from "react";
import { submitInquiry, type FormState } from "@/actions/contact";
import { Button } from "@/components/ui/button-link";
import { cn } from "@/lib/utils";

const initial: FormState = { ok: false, message: "" };

export function InquiryForm({
  formType,
  className,
}: {
  formType: "contact" | "consultation";
  className?: string;
}) {
  const [state, action, pending] = useActionState(submitInquiry, initial);

  return (
    <form action={action} className={cn("surface-panel border border-border p-6 sm:p-8", className)}>
      <input type="hidden" name="formType" value={formType} />
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          label="Name"
          name="name"
          required
          error={state.errors?.name?.[0]}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          error={state.errors?.email?.[0]}
        />
        <Field
          label="Phone"
          name="phone"
          type="tel"
          required
          error={state.errors?.phone?.[0]}
        />
        {formType === "consultation" ? (
          <Field
            label="Area of interest"
            name="topic"
            placeholder="e.g. Property, tax, family"
            error={state.errors?.topic?.[0]}
          />
        ) : (
          <div className="hidden sm:block" />
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="message" className="mb-2 block text-sm font-medium text-ink">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          className="w-full border border-border bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brass focus:ring-2 focus:ring-brass/30"
          placeholder={
            formType === "consultation"
              ? "Briefly describe your situation…"
              : "How can we help?"
          }
        />
        {state.errors?.message?.[0] ? (
          <p className="mt-1 text-xs text-red-700">{state.errors.message[0]}</p>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : formType === "consultation" ? "Request Consultation" : "Send Message"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Consultations are held by phone or WhatsApp.
        </p>
      </div>

      {state.message ? (
        <p
          className={cn(
            "mt-5 border px-4 py-3 text-sm",
            state.ok
              ? "border-brass/40 bg-brass/10 text-ink"
              : "border-red-200 bg-red-50 text-red-800",
          )}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="w-full border border-border bg-white/70 px-3 py-2.5 text-sm text-ink outline-none transition focus:border-brass focus:ring-2 focus:ring-brass/30"
      />
      {error ? <p className="mt-1 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
