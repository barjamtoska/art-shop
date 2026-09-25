"use client";

import { useState } from "react";
import { buttonClass } from "@/components/admin/forms";
import { authClient } from "@/lib/auth-client";

type Status = { kind: "idle" | "sending" | "sent" } | { kind: "error"; message: string };

export function SignInForm() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  if (status.kind === "sent") {
    return (
      <p role="status" className="mt-8 border border-gold/30 px-4 py-4 text-ivory">
        If that address belongs to an administrator, a sign-in link is on its way. You can close this page.
      </p>
    );
  }

  return (
    <form
      className="mt-8 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
        setStatus({ kind: "sending" });
        const { error } = await authClient.signIn.magicLink({
          email,
          callbackURL: "/admin",
          errorCallbackURL: "/admin/sign-in",
        });
        // The same answer whether or not the address is an admin's, so the
        // form never reveals who can sign in. Only transport errors show.
        if (error && error.status !== 400) {
          setStatus({
            kind: "error",
            message:
              error.status === 429
                ? "Too many attempts. Please wait a few minutes."
                : "Something went wrong. Please try again.",
          });
        } else if (error) {
          setStatus({ kind: "error", message: "Please enter a valid email address." });
        } else {
          setStatus({ kind: "sent" });
        }
      }}
    >
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-ivory">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="block w-full border border-gold/30 bg-wall/60 px-3 py-2 text-ivory focus-visible:border-gold"
        />
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-sm text-alert">
          {status.message}
        </p>
      )}
      <button type="submit" className={buttonClass} disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending…" : "Send me a sign-in link"}
      </button>
    </form>
  );
}
