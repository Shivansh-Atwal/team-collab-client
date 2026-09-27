// Flat, geometric Google-style spot illustrations for each module card.
const G = { blue: '#4285f4', red: '#ea4335', yellow: '#fbbc04', green: '#34a853', gDark: '#188038', gray: '#e8eaed', gray2: '#dadce0', gray3: '#f1f3f4' };

const Frame = ({ children }) => (
  <svg viewBox="0 0 120 90" className="h-full w-full" aria-hidden="true">
    {children}
  </svg>
);

export function ChatArt() {
  return (
    <Frame>
      <rect x="8" y="14" width="66" height="42" rx="8" fill={G.gray} />
      <rect x="18" y="26" width="36" height="5" rx="2.5" fill={G.gray2} />
      <rect x="18" y="37" width="24" height="5" rx="2.5" fill={G.gray2} />
      <path d="M22 56 L22 68 L34 56Z" fill={G.gray} />
      <rect x="46" y="38" width="64" height="36" rx="8" fill={G.blue} />
      <path d="M96 74 L100 84 L86 74Z" fill={G.blue} />
      <circle cx="62" cy="56" r="3.5" fill="#fff" />
      <circle cx="75" cy="56" r="3.5" fill="#fff" />
      <circle cx="88" cy="56" r="3.5" fill="#fff" />
      <circle cx="100" cy="18" r="10" fill={G.yellow} />
    </Frame>
  );
}

export function BoardArt() {
  return (
    <Frame>
      <rect x="6" y="18" width="80" height="54" rx="3" fill={G.gray3} stroke={G.gray} />
      <circle cx="13" cy="24" r="1.8" fill={G.red} />
      <circle cx="19" cy="24" r="1.8" fill={G.yellow} />
      <rect x="14" y="34" width="18" height="6" rx="1" fill={G.gray2} />
      <rect x="14" y="44" width="18" height="6" rx="1" fill={G.gray2} />
      <rect x="37" y="34" width="18" height="6" rx="1" fill={G.gray2} />
      <rect x="62" y="6" width="22" height="80" fill={G.green} />
      <rect x="62" y="34" width="22" height="24" fill={G.gDark} />
      <path d="M66 46 l5 5 l9 -10" stroke="#fff" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="90" y="34" width="22" height="24" fill={G.gray2} opacity=".6" />
    </Frame>
  );
}

export function CanvasArt() {
  return (
    <Frame>
      <rect x="6" y="20" width="76" height="52" rx="3" fill={G.gray3} stroke={G.gray} />
      <rect x="16" y="34" width="22" height="8" rx="4" fill={G.gray2} />
      <rect x="16" y="48" width="14" height="8" rx="4" fill={G.gray2} />
      <circle cx="28" cy="38" r="3" fill={G.green} />
      <circle cx="21" cy="52" r="3" fill={G.red} />
      <circle cx="92" cy="30" r="22" fill={G.yellow} />
      <circle cx="92" cy="30" r="9" fill="#fff" />
      <path d="M70 84 A26 26 0 0 1 96 58 L96 84Z" fill={G.blue} />
      <path d="M44 50 L66 50" stroke={G.blue} strokeWidth="2.5" strokeDasharray="3 3" />
    </Frame>
  );
}

export function CodeArt() {
  return (
    <Frame>
      <rect x="8" y="14" width="96" height="64" rx="4" fill={G.gray3} stroke={G.gray} />
      <rect x="8" y="14" width="96" height="12" rx="4" fill={G.gray} />
      <circle cx="16" cy="20" r="2" fill={G.red} />
      <circle cx="23" cy="20" r="2" fill={G.yellow} />
      <circle cx="30" cy="20" r="2" fill={G.green} />
      <rect x="18" y="34" width="30" height="5" rx="2.5" fill={G.blue} />
      <rect x="26" y="44" width="40" height="5" rx="2.5" fill={G.gray2} />
      <rect x="26" y="54" width="26" height="5" rx="2.5" fill={G.green} />
      <rect x="18" y="64" width="18" height="5" rx="2.5" fill={G.gray2} />
      <path d="M78 42 l-8 9 l8 9" stroke={G.red} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M90 42 l8 9 l-8 9" stroke={G.yellow} strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

export function FilesArt() {
  return (
    <Frame>
      <path d="M10 26 h30 l8 8 h56 v44 a3 3 0 0 1 -3 3 h-88 a3 3 0 0 1 -3 -3Z" fill={G.gray} />
      <rect x="10" y="34" width="94" height="47" rx="3" fill={G.gray3} stroke={G.gray} />
      <text x="50" y="66" fontSize="22" fontWeight="700" fill={G.gray2} fontFamily="Roboto, sans-serif">G</text>
      <path d="M54 6 h14 v26 l-7 -6 l-7 6Z" fill={G.yellow} />
      <path d="M78 81 A26 26 0 0 1 104 55 L104 81Z" fill={G.blue} />
    </Frame>
  );
}

export function DashboardArt() {
  return (
    <Frame>
      <rect x="8" y="12" width="96" height="66" rx="4" fill={G.gray3} stroke={G.gray} />
      <rect x="20" y="48" width="12" height="22" rx="2" fill={G.gray2} />
      <rect x="38" y="36" width="12" height="34" rx="2" fill={G.blue} />
      <rect x="56" y="26" width="12" height="44" rx="2" fill={G.green} />
      <rect x="74" y="42" width="12" height="28" rx="2" fill={G.yellow} />
      <path d="M18 32 L42 24 L60 16 L84 22" stroke={G.red} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="74" r="12" fill={G.green} opacity=".9" />
    </Frame>
  );
}

export function MembersArt() {
  return (
    <Frame>
      <circle cx="70" cy="30" r="14" fill={G.gray} />
      <circle cx="40" cy="58" r="16" fill={G.gray} />
      <circle cx="56" cy="44" r="18" fill={G.gDark} />
      <path d="M56 35 v18 M47 44 h18" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
    </Frame>
  );
}

export function WorkspaceArt() {
  return (
    <Frame>
      <path d="M22 34 h76 l-6 44 h-64Z" fill={G.yellow} />
      <path d="M18 20 h84 l6 16 a8 8 0 0 1 -16 0 a8 8 0 0 1 -16 0 a8 8 0 0 1 -16 0 a8 8 0 0 1 -16 0 a8 8 0 0 1 -16 0 a8 8 0 0 1 -16 0Z" fill="#f29900" />
      <path d="M34 20 l-4 16 M50 20 l-2 16 M66 20 l0 16 M82 20 l2 16" stroke={G.yellow} strokeWidth="6" />
      <rect x="46" y="54" width="28" height="24" rx="2" fill="#f29900" opacity=".6" />
    </Frame>
  );
}
