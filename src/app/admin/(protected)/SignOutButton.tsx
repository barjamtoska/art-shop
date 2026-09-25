"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { quietButtonClass } from "@/components/admin/forms";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className={quietButtonClass}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        router.replace("/admin/sign-in");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
