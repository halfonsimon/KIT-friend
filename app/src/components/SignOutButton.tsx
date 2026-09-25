"use client";

import { signOut } from "next-auth/react";
import Icon from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/button";

export default function SignOutButton() {
  return (
    <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className={buttonClass("soft", "sm")}>
      <Icon name="signOut" size={16} />
      Sign out
    </button>
  );
}
