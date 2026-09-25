import type { Category } from "@/lib/contact";
import Icon, { type IconName } from "./Icon";

// Each category's tint, ink and icon. Chips are told apart by icon and label, not colour alone.
export const categoryStyle: Record<Category, { label: string; icon: IconName; chip: string; ink: string }> = {
  FAMILY: { label: "Family", icon: "family", chip: "bg-family text-family-ink", ink: "text-family-ink" },
  FRIEND: { label: "Friend", icon: "friend", chip: "bg-friend text-friend-ink", ink: "text-friend-ink" },
  WORK: { label: "Work", icon: "work", chip: "bg-work text-work-ink", ink: "text-work-ink" },
  OTHER: { label: "Other", icon: "other", chip: "bg-other text-other-ink", ink: "text-other-ink" },
};

export default function CategoryChip({ category }: { category: Category }) {
  const { label, icon, chip } = categoryStyle[category];
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-bold ${chip}`}
    >
      <Icon name={icon} size={14} />
      {label}
    </span>
  );
}
