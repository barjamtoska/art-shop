"use client";

import { useActionState, useId } from "react";
import { QuietButton } from "@/components/ui/Quiet";
import { sendEnquiry, type EnquiryState } from "./actions";

const field =
  "mt-2 block w-full border border-gold/30 bg-wall-deep/60 px-3 py-2.5 text-ivory placeholder:text-ivory-muted/60 transition-colors duration-500 focus-visible:border-gold aria-invalid:border-alert";

/** A short letter to the gallery. Works without JavaScript too. */
export function EnquiryForm({ work }: { work?: { slug: string; title: string } }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(sendEnquiry, { status: "idle" });
  const id = useId();

  if (state.status === "sent") {
    return (
      <p role="status" className="font-display text-2xl text-ivory italic">
        Thank you. We will reply soon.
      </p>
    );
  }

  const error = (name: "name" | "email" | "message") => state.fieldErrors?.[name];
  const described = (name: "name" | "email" | "message") => (error(name) ? `${id}-${name}-error` : undefined);

  return (
    <form action={action} className="space-y-6" noValidate>
      {work && <input type="hidden" name="work" value={work.slug} />}
      {/* Hidden from people; bots fill it in. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {work && (
        <p className="text-ivory-muted">
          About <cite className="font-display text-lg text-ivory">{work.title}</cite>
        </p>
      )}
      {(["name", "email"] as const).map((name) => (
        <div key={name}>
          <label htmlFor={`${id}-${name}`} className="font-caps text-label tracking-caps text-ivory-muted">
            {name === "name" ? "Your name" : "Your email"}
          </label>
          <input
            id={`${id}-${name}`}
            name={name}
            type={name === "email" ? "email" : "text"}
            autoComplete={name}
            required
            aria-invalid={error(name) ? true : undefined}
            aria-describedby={described(name)}
            className={field}
          />
          {error(name) && (
            <p id={`${id}-${name}-error`} className="mt-1.5 text-sm text-alert">
              {error(name)}
            </p>
          )}
        </div>
      ))}
      <div>
        <label htmlFor={`${id}-message`} className="font-caps text-label tracking-caps text-ivory-muted">
          Your message
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          rows={6}
          required
          aria-invalid={error("message") ? true : undefined}
          aria-describedby={described("message")}
          className={`${field} leading-relaxed`}
          placeholder={work ? "Which details would you like? Would you like to see the work in person?" : undefined}
        />
        {error("message") && (
          <p id={`${id}-message-error`} className="mt-1.5 text-sm text-alert">
            {error("message")}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <QuietButton type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "Sending…" : "Send"}
        </QuietButton>
        {state.status === "error" && state.message && (
          <p role="alert" className="text-sm text-alert">
            {state.message}
          </p>
        )}
      </div>
      <p className="text-placard text-ivory-muted">
        We use your details only to reply to you. See{" "}
        <a href="/privacy" className="underline decoration-gold/50 underline-offset-4">
          Privacy
        </a>
        .
      </p>
    </form>
  );
}
