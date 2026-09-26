/**
 * The signed-in user's account: the name and email stored on the user row,
 * and how they sign in. The stored email is the account email every Digest
 * path uses (scheduled run, test send and preview), never the session's copy.
 */
import { prisma } from "@/lib/db";

export type Account = {
  name: string | null;
  email: string;
  provider: "google" | "email";
};

export async function getAccount(userId: string): Promise<Account> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, accounts: { select: { provider: true } } },
  });
  const provider = user.accounts.some((a) => a.provider === "google") ? "google" : "email";
  return { name: user.name, email: user.email, provider };
}
