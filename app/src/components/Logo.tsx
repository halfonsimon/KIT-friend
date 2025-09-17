type LogoProps = {
  size?: "sm" | "md" | "lg";
  showGlow?: boolean;
  animated?: boolean;
};

export default function Logo({
  size = "md",
  showGlow = false,
  animated = true,
}: LogoProps) {
  const sizeClasses = {
    sm: "w-9 h-9",
    md: "w-12 h-12",
    lg: "w-20 h-20",
  };

  const nodeSizes = {
    sm: { center: "w-2 h-2", outer: "w-1.5 h-1.5", indicator: "w-3 h-3" },
    md: { center: "w-3 h-3", outer: "w-2 h-2", indicator: "w-3 h-3" },
    lg: { center: "w-4 h-4", outer: "w-2 h-2", indicator: "w-4 h-4" },
  };

  const lineLength = {
    sm: { horizontal: "w-4", vertical: "h-4" },
    md: { horizontal: "w-5", vertical: "h-5" },
    lg: { horizontal: "w-6", vertical: "h-6" },
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Background glow effect */}
      {showGlow && (
        <div
          className={`absolute inset-0 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-3xl blur-xl opacity-30 ${
            animated ? "animate-pulse" : ""
          }`}
        ></div>
      )}

      {/* Main logo container */}
      <div
        className={`relative ${
          sizeClasses[size]
        } rounded-3xl bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 shadow-2xl flex items-center justify-center ${
          animated
            ? "transform hover:scale-105 transition-transform duration-300"
            : ""
        }`}
      >
        {/* Network pattern */}
        <div className="absolute inset-2 rounded-2xl border border-white/20"></div>

        {/* Connection nodes */}
        <div className="relative">
          {/* Center node */}
          <div
            className={`${nodeSizes[size].center} bg-white rounded-full shadow-lg relative z-10`}
          ></div>

          {/* Surrounding nodes */}
          <div
            className={`absolute -top-2 -left-2 ${nodeSizes[size].outer} bg-white/90 rounded-full`}
          ></div>
          <div
            className={`absolute -top-2 -right-2 ${nodeSizes[size].outer} bg-white/90 rounded-full`}
          ></div>
          <div
            className={`absolute -bottom-2 -left-2 ${nodeSizes[size].outer} bg-white/90 rounded-full`}
          ></div>
          <div
            className={`absolute -bottom-2 -right-2 ${nodeSizes[size].outer} bg-white/90 rounded-full`}
          ></div>

          {/* Connection lines */}
          <div
            className={`absolute top-1/2 left-1/2 ${lineLength[size].horizontal} h-px bg-white/50 -translate-x-1/2 -translate-y-1/2 rotate-45`}
          ></div>
          <div
            className={`absolute top-1/2 left-1/2 ${lineLength[size].horizontal} h-px bg-white/50 -translate-x-1/2 -translate-y-1/2 -rotate-45`}
          ></div>
          <div
            className={`absolute top-1/2 left-1/2 ${lineLength[size].horizontal} h-px bg-white/50 -translate-x-1/2 -translate-y-1/2`}
          ></div>
          <div
            className={`absolute top-1/2 left-1/2 ${lineLength[size].vertical} w-px bg-white/50 -translate-x-1/2 -translate-y-1/2`}
          ></div>
        </div>

        {/* Active indicator */}
        <div
          className={`absolute -top-1 -right-1 ${nodeSizes[size].indicator} bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-lg`}
        >
          <div
            className={`w-full h-full bg-green-400 rounded-full ${
              animated ? "animate-ping opacity-75" : ""
            }`}
          ></div>
        </div>
      </div>
    </div>
  );
}
