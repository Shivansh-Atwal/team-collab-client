// The sweeping blue / yellow / green arcs and faint watermark circles from the hero design.
export default function GoogleArcs({ className = '' }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden opacity-40 sm:opacity-100 ${className}`} aria-hidden="true">
      <svg className="absolute right-0 top-0 h-full w-[62%] min-w-[520px]" viewBox="0 0 600 560" preserveAspectRatio="xMaxYMin meet">
        {/* watermark shapes */}
        <circle cx="120" cy="92" r="30" fill="none" stroke="#f1f3f4" strokeWidth="9" />
        <circle cx="152" cy="200" r="14" fill="#f1f3f4" />
        <path d="M430 150 A120 120 0 1 0 520 330 L520 250 L440 250" fill="none" stroke="#f1f3f4" strokeWidth="46" />
        <path d="M20 -30 A330 330 0 0 1 60 10" fill="none" stroke="#f1f3f4" strokeWidth="14" />
        {/* colored arcs */}
        <path d="M70 -20 C 150 90, 230 160, 330 170" fill="none" stroke="#4285f4" strokeWidth="7" strokeLinecap="round" />
        <path d="M200 120 C 300 190, 440 230, 640 200" fill="none" stroke="#fbbc04" strokeWidth="7" strokeLinecap="round" />
        <path d="M380 200 C 480 250, 560 330, 640 440" fill="none" stroke="#34a853" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}
