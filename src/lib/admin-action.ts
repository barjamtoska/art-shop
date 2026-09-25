import "server-only";
import { unstable_rethrow } from "next/navigation";
import { Prisma } from "@/generated/prisma/client";
import { failed, type FormState } from "./admin-form";

/**
 * Runs the body of an admin save. Expected failures (a record deleted in
 * another window, a clash, a busy database) come back as a message on the
 * form instead of the error page; anything else is logged and reported as a
 * failed save. Next.js's own signals (redirect, notFound) pass through.
 *
 * The admin check stays outside, so an unauthorised call still fails loudly.
 */
export async function catchSaveErrors(save: () => Promise<FormState>): Promise<FormState> {
  try {
    return await save();
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2025":
          return failed("This record no longer exists. It may have been deleted in another window.");
        case "P2002":
          return failed("Another record already uses one of these values. Please check and try again.");
        case "P2003":
          return failed("This record is still in use elsewhere, so it cannot be removed.");
        case "P2028":
          return failed("The database was busy. Please try again in a moment.");
      }
    }
    console.error("Admin save failed:", error);
    return failed("Something went wrong while saving. Please try again.");
  }
}

/** For interactive transactions: allow for a busy connection pool. */
export const transactionOptions = { maxWait: 10_000, timeout: 20_000 } as const;
