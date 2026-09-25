"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { FormMessage, buttonClass } from "@/components/admin/forms";
import { idle, type FormState } from "@/lib/admin-form";
import type { UploadTarget } from "@/lib/image-upload";

type Props = {
  prepare: () => Promise<UploadTarget>;
  attach: (upload: { key: string; alt: string; credit: string }) => Promise<FormState>;
  defaultAlt: string;
  defaultCredit: string;
  hasImage: boolean;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/tiff";

/**
 * Uploads the work's photograph: straight to Cloudinary in production (or to
 * the development store), then asks the server to verify and attach it.
 */
export function ImageUploader({ prepare, attach, defaultAlt, defaultCredit, hasImage }: Props) {
  const router = useRouter();
  const id = useId();
  const [state, setState] = useState<FormState>(idle);
  const [progress, setProgress] = useState<string | null>(null);
  const altError = state.fieldErrors?.alt;

  async function upload(form: HTMLFormElement) {
    const data = new FormData(form);
    const file = data.get("file");
    const alt = String(data.get("alt") ?? "");
    const credit = String(data.get("credit") ?? "");
    if (!(file instanceof File) || file.size === 0) {
      setState({ status: "error", message: "Choose an image file first." });
      return;
    }
    if (alt.trim().length < 20) {
      setState({
        status: "error",
        message: "Describe the painting first.",
        fieldErrors: { alt: ["Describe the painting for someone who cannot see it (at least a sentence)."] },
      });
      return;
    }

    try {
      setProgress("Preparing…");
      const target = await prepare();
      const body = new FormData();
      for (const [key, value] of Object.entries(target.fields)) body.append(key, value);
      body.append("file", file);

      setProgress(`Uploading ${(file.size / 1024 / 1024).toFixed(1)} MB…`);
      const response = await fetch(target.url, { method: "POST", body });
      const result = (await response.json().catch(() => ({}))) as {
        public_id?: string;
        key?: string;
        error?: string | { message?: string };
      };
      if (!response.ok) {
        const reason = typeof result.error === "string" ? result.error : result.error?.message;
        throw new Error(reason ?? "The upload did not complete.");
      }
      const key = target.kind === "cloudinary" ? result.public_id : result.key;
      if (!key) throw new Error("The upload did not complete.");

      setProgress("Checking the image…");
      const outcome = await attach({ key, alt, credit });
      setState(outcome);
      if (outcome.status === "success") {
        form.reset();
        router.refresh();
      }
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "The upload failed." });
    } finally {
      setProgress(null);
    }
  }

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void upload(event.currentTarget);
      }}
    >
      <div>
        <label htmlFor={`${id}-file`} className="mb-1.5 block text-sm text-ivory">
          {hasImage ? "Replace the photograph" : "Photograph"}
        </label>
        <input
          id={`${id}-file`}
          name="file"
          type="file"
          accept={ACCEPT}
          className="block w-full text-sm text-ivory-muted file:mr-4 file:border file:border-gold/50 file:bg-transparent file:px-4 file:py-2 file:text-ivory"
        />
        <p className="mt-1.5 text-xs text-ivory-muted">
          JPEG, PNG, WebP or TIFF, colour-accurate, ideally 4000px on the long edge for the brushwork viewer.
        </p>
      </div>
      <div>
        <label htmlFor={`${id}-alt`} className="mb-1.5 block text-sm text-ivory">
          Description for screen readers
        </label>
        <textarea
          id={`${id}-alt`}
          name="alt"
          rows={3}
          defaultValue={defaultAlt}
          aria-invalid={altError ? true : undefined}
          aria-describedby={`${id}-alt-hint${altError ? ` ${id}-alt-error` : ""}`}
          className="block w-full border border-gold/30 bg-wall-deep/70 px-3 py-2 leading-relaxed text-ivory aria-invalid:border-alert"
        />
        <p id={`${id}-alt-hint`} className="mt-1.5 text-xs text-ivory-muted">
          What the painting shows, in a sentence or two — for visitors who cannot see it.
        </p>
        {altError && (
          <p id={`${id}-alt-error`} className="mt-1.5 text-sm text-alert">
            {altError.join(" ")}
          </p>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-credit`} className="mb-1.5 block text-sm text-ivory">
          Photo credit (optional)
        </label>
        <input
          id={`${id}-credit`}
          name="credit"
          defaultValue={defaultCredit}
          className="block w-full border border-gold/30 bg-wall-deep/70 px-3 py-2 text-ivory"
        />
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <button type="submit" className={buttonClass} disabled={progress !== null} aria-busy={progress !== null}>
          {progress ?? (hasImage ? "Upload and replace" : "Upload")}
        </button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
