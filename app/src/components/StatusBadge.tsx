type StatusBadgeProps = {
  status: "overdue" | "today" | "ok";
  daysUntilDue: number;
};

export default function StatusBadge({
  status,
  daysUntilDue,
}: StatusBadgeProps) {
  const getStatusText = () => {
    if (status === "overdue") return `Overdue by ${Math.abs(daysUntilDue)}d`;
    if (status === "today") return "Today";
    return `In ${daysUntilDue}d`;
  };

  const getStatusStyles = () => {
    if (status === "overdue") return "bg-red-100 text-red-800 border-red-200";
    if (status === "today")
      return "bg-orange-100 text-orange-800 border-orange-200";
    return "bg-green-100 text-green-800 border-green-200";
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getStatusStyles()}`}
    >
      {getStatusText()}
    </span>
  );
}
