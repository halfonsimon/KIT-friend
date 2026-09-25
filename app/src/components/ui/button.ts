// Pill button styles, shared by <button> and <Link> so both look the same.
export type ButtonVariant = "primary" | "brand" | "soft" | "white" | "glass" | "onBrand";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  // The main action on a screen ("We talked", "Save changes").
  primary: "bg-ink text-white hover:bg-ink/85",
  // Brand actions that start something ("Add contact", "Create an account").
  brand: "bg-brand text-white hover:bg-brand-strong",
  // Secondary actions on white or glass surfaces.
  soft: "bg-ground text-ink hover:bg-ice",
  // Secondary actions on the grey background ("Later").
  white: "bg-white text-ink shadow-float hover:bg-ice",
  glass: "glass text-ink hover:bg-white",
  // Quiet actions on an ultramarine card.
  onBrand: "bg-white/15 text-white hover:bg-white/25",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-11 px-4 text-sm",
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-6 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return [base, variants[variant], sizes[size], extra].filter(Boolean).join(" ");
}
