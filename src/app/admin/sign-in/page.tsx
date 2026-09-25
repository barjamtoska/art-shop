import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "@/config/site";
import { getAdmin } from "@/lib/admin";
import { MAGIC_LINK_MINUTES } from "@/lib/auth";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

const linkErrors: Record<string, string> = {
  EXPIRED_TOKEN: "That sign-in link has expired. Ask for a new one below.",
  INVALID_TOKEN: "That sign-in link is not valid, or has already been used. Ask for a new one below.",
  new_user_signup_disabled: "That address is not on the list of administrators.",
  unable_to_create_user: "That address is not on the list of administrators.",
};

export default async function SignInPage({ searchParams }: PageProps<"/admin/sign-in">) {
  if (await getAdmin()) redirect("/admin");
  const { error } = await searchParams;
  const errorMessage = typeof error === "string" ? (linkErrors[error] ?? "Sign-in failed. Please try again.") : null;

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <p className="font-caps text-2xl tracking-[0.3em] text-ivory">{site.name}</p>
        <h1 className="mt-8 text-3xl">Sign in</h1>
        <p className="mt-3 text-ivory-muted">
          Enter your email address and we will send you a link to sign in. It works once and expires in{" "}
          {MAGIC_LINK_MINUTES} minutes.
        </p>
        {errorMessage && (
          <p role="alert" className="mt-6 border border-alert/40 px-4 py-3 text-sm text-alert">
            {errorMessage}
          </p>
        )}
        <SignInForm />
      </div>
    </main>
  );
}
