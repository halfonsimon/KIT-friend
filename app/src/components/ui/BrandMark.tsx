// The KIT Friend logo: the blue rounded square with a ring of dots (same art as public/icons/icon.svg).
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
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="shrink-0">
      <defs>
        <linearGradient id="kf-brandmark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#3B82F6" />
        </linearGradient>
      </defs>
      <rect x="32" y="32" width="448" height="448" rx="110" fill="url(#kf-brandmark)" />
      <g fill="#fff">
        <circle cx="256" cy="256" r="30" />
        {ring.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="22" />
        ))}
      </g>
    </svg>
  );
}
