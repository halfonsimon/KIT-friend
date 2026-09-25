// The digest preview moved into Settings ("Today's email").
import { redirect } from "next/navigation";

export default function DigestPage() {
  redirect("/settings#email-preview");
}
