import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Resend } from "resend";
import { site } from "@/config/site";
import { emailConfigured, env, localFallbacks } from "./env";

/*
 * Outgoing email. With RESEND_API_KEY set, mail goes out through Resend.
 * Without it (development only — production requires the key), each message
 * is written to .dev-mail/ as an HTML file you can open, and summarised in
 * the terminal. The e2e tests read sign-in links from there.
 */

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export const DEV_MAIL_DIR = path.join(process.cwd(), ".dev-mail");

const resend = emailConfigured ? new Resend(env.RESEND_API_KEY) : null;

export async function sendEmail(email: Email): Promise<void> {
  if (resend) {
    const { error } = await resend.emails.send({ from: env.EMAIL_FROM, ...email });
    if (error) throw new Error(`Email to ${email.to} failed: ${error.message}`);
    return;
  }

  if (!localFallbacks) throw new Error("Email is not configured (RESEND_API_KEY)");
  await mkdir(DEV_MAIL_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeTo = email.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = path.join(DEV_MAIL_DIR, `${stamp}-${safeTo}`);
  await writeFile(`${file}.html`, email.html, "utf8");
  await writeFile(`${file}.json`, JSON.stringify({ ...email, sentAt: new Date().toISOString() }, null, 2), "utf8");
  console.info(
    `\n✉  Email to ${email.to}: "${email.subject}"\n   ${email.text.split("\n").join("\n   ")}\n   (saved in .dev-mail/)\n`,
  );
}

/** Minimal HTML that email clients render reliably, in the gallery's voice and colours. */
export function emailLayout({
  heading,
  body,
  action,
}: {
  heading: string;
  body: string;
  action?: { label: string; url: string };
}) {
  const button = action
    ? `<p style="margin:32px 0"><a href="${action.url}" style="display:inline-block;padding:12px 28px;border:1px solid #b8935a;color:#f3ebdd;text-decoration:none;letter-spacing:.12em;font-size:13px;text-transform:uppercase">${action.label}</a></p>`
    : "";
  return `<!doctype html><html lang="en"><body style="margin:0;background:#2e0908;padding:40px 16px;font-family:Georgia,'Times New Roman',serif;color:#f3ebdd">
<div style="max-width:520px;margin:0 auto;background:#501210;padding:40px 32px;border:1px solid rgba(184,147,90,.35)">
<p style="margin:0 0 28px;letter-spacing:.3em;font-size:14px;color:#cbbfa8">${site.name.toUpperCase()}</p>
<h1 style="margin:0 0 16px;font-weight:normal;font-size:24px">${heading}</h1>
<div style="font-size:16px;line-height:1.6;color:#cbbfa8">${body}</div>
${button}
</div></body></html>`;
}
