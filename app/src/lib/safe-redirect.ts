/**
 * Where to go after signing in: only a path inside the app, so a crafted
 * ?callbackUrl= can't send people to another site. Anything else goes to Today.
 */
export function safeCallbackUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith("/")) return "/";
  // "//evil.com" and "/\evil.com" are read by browsers as other hosts.
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}
