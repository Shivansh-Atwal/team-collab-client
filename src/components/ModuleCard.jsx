import { Link } from 'react-router-dom';

// Card from the hero design: caption on top, spot illustration, hairline, bold title, muted copy.
// On hover it lifts into a white elevated card and the caption becomes a dark chip.
export default function ModuleCard({ to, caption, art: Art, title, body }) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col rounded-lg px-5 pb-8 pt-5 transition-all duration-200 hover:-translate-y-1 hover:bg-white hover:shadow-float focus-visible:bg-white focus-visible:shadow-float focus-visible:outline-none"
    >
      <span className="eyebrow self-start rounded px-1.5 py-1 transition-colors group-hover:bg-ink group-hover:text-white group-focus-visible:bg-ink group-focus-visible:text-white">
        {caption}
      </span>
      <div className="mt-5 h-24 w-32">
        <Art />
      </div>
      <div className="mt-6 h-px w-12 bg-line transition-all duration-200 group-hover:w-full group-hover:bg-ink-5" />
      <h3 className="mt-4 text-[13px] font-bold leading-snug text-ink">{title}</h3>
      <p className="mt-3 text-xs leading-relaxed text-ink-4">{body}</p>
    </Link>
  );
}
