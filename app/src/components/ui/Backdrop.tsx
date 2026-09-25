// The faint lilac and ice blurs behind every signed-in screen. Decorative only.
export default function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-36 h-[520px] w-[620px] rounded-full bg-[#b7c0f2] opacity-45 blur-[120px]" />
      <div className="absolute -right-24 -top-48 h-[440px] w-[560px] rounded-full bg-[#d5dcff] opacity-60 blur-[120px]" />
      <div className="absolute -bottom-40 -left-32 h-[460px] w-[520px] rounded-full bg-[#c9d6ff] opacity-50 blur-[120px]" />
      <div className="absolute -bottom-32 -right-20 h-[380px] w-[440px] rounded-full bg-[#e2e5fa] opacity-50 blur-[120px]" />
    </div>
  );
}
