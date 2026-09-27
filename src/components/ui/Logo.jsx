import { Link } from 'react-router-dom';

export function LogoMark({ size = 24 }) {
  return <img src="/logo.svg" alt="" width={size} height={size} />;
}

// "Google Merchant Center"-style lockup: mark + regular product name + lighter suffix
export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 text-[19px] leading-none text-ink-3">
      <LogoMark />
      <span>
        <span className="font-medium text-ink-2">Team</span>
        <span className="font-normal">Collab</span>
      </span>
    </Link>
  );
}
