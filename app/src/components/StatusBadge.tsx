type StatusBadgeProps = {
  status: "overdue" | "today" | "ok";
  daysUntilDue: number;
};

export default function StatusBadge({
  status,
  daysUntilDue,
}: StatusBadgeProps) {
  const getStatusText = () => {
    if (status === "overdue") return `${Math.abs(daysUntilDue)}d overdue`;
    if (status === "today") return "Due today";
    return `${daysUntilDue}d left`;
  };

  const getStatusStyles = () => {
    if (status === "overdue")
      return "bg-red-50 text-red-700 ring-1 ring-red-600/20 shadow-sm";
    if (status === "today")
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-600/20 shadow-sm";
    return "bg-green-50 text-green-700 ring-1 ring-green-600/20 shadow-sm";
  };

  const getIcon = () => {
    if (status === "overdue") {
      return (
        <svg
          className="w-3 h-3 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      );
    }
    if (status === "today") {
      return (
        <svg
          className="w-3 h-3 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="w-3 h-3 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusStyles()}`}
    >
      {getIcon()}
      {getStatusText()}
    </span>
  );
}
