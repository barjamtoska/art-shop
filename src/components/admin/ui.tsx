import Link from "next/link";
import type { ReactNode } from "react";

/* Display pieces for admin pages. Server components; no interactivity. */

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-10">
      {back && (
        <Link
          href={back.href}
          className="text-sm text-ivory-muted underline decoration-gold/40 underline-offset-4 hover:text-ivory"
        >
          ← {back.label}
        </Link>
      )}
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl">{title}</h1>
          {description && <p className="mt-2 max-w-prose text-ivory-muted">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="inline-flex items-center border border-gold/60 px-5 py-2 text-sm tracking-wide text-ivory transition-colors duration-500 hover:border-gold hover:bg-gold/10"
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
}

export function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-gold/25 text-ivory-muted">
            {head.map((label) => (
              <th key={label} scope="col" className="px-3 py-2 font-normal">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-3 [&_td]:py-3 [&_td]:align-top [&>tr]:border-b [&>tr]:border-gold/10">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-gold/25 px-5 py-8 text-center text-ivory-muted">{children}</p>;
}

const tones = {
  neutral: "border-ivory-muted/40 text-ivory-muted",
  positive: "border-gold/60 text-ivory",
  attention: "border-notice/60 text-notice",
  alert: "border-alert/60 text-alert",
} as const;

export function StatusLabel({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-block border px-2 py-0.5 text-xs whitespace-nowrap ${tones[tone]}`}>{children}</span>;
}

const dateTime = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Dublin",
});
const dateOnly = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export const formatDateTime = (date: Date) => dateTime.format(date);
export const formatDate = (date: Date) => dateOnly.format(date);

export function Stat({ label, value, href }: { label: string; value: ReactNode; href?: string }) {
  const body = (
    <>
      <span className="block text-3xl text-ivory">{value}</span>
      <span className="mt-1 block text-sm text-ivory-muted">{label}</span>
    </>
  );
  return href ? (
    <Link href={href} className="block border border-gold/20 p-5 transition-colors duration-500 hover:border-gold/60">
      {body}
    </Link>
  ) : (
    <div className="border border-gold/20 p-5">{body}</div>
  );
}
