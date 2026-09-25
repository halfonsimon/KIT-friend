// The KIT Friend logo: the blue rounded square with a ring of dots (same art as public/icons/icon.svg).
// The gradient is CSS rather than an SVG <linearGradient>, so several logos on one page
// (one of them hidden) never fight over a shared gradient id.
const ring = [
  [256, 170],
  [317, 195],
  [342, 256],
  [317, 317],
  [256, 342],
  [195, 317],
  [170, 256],
  [195, 195],
] as const;

export default function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 bg-linear-to-br from-[#4f46e5] to-[#3b82f6]"
      style={{ width: size * 0.875, height: size * 0.875, margin: size / 16, borderRadius: size * 0.215 }}
    >
      <svg width="100%" height="100%" viewBox="32 32 448 448">
        <g fill="#fff">
          <circle cx="256" cy="256" r="30" />
          {ring.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="22" />
          ))}
        </g>
      </svg>
    </span>
  );
}
