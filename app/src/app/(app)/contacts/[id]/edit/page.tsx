// Old address of the edit form: the Contact page now opens its Edit sheet.
import { redirect } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function EditContactPage({ params }: Params) {
  const { id } = await params;
  redirect(`/contacts/${encodeURIComponent(id)}?edit=1`);
}
