import GoogleArcs from './layout/GoogleArcs.jsx';
import Logo from './ui/Logo.jsx';

export default function AuthShell({ heading, sub, children }) {
  return (
    <div className="relative min-h-full overflow-hidden bg-white">
      <GoogleArcs />
      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-6 py-6 sm:px-10">
        <Logo />
        <div className="mx-5 mt-4 border-b border-line sm:mx-0" />
        <div className="grid flex-1 items-center gap-12 py-10 lg:grid-cols-[1fr_420px]">
          <div className="hidden lg:block">
            <h1 className="text-[34px] font-normal leading-tight text-ink">{heading}</h1>
            <p className="mt-2 max-w-md text-[26px] font-light leading-snug text-ink-5">{sub}</p>
            <p className="mt-8 max-w-sm text-sm text-ink-3">
              Chat, tasks, files, a system-design canvas, a live code editor and team insights — all in one workspace.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-line bg-white/95 p-8 shadow-float backdrop-blur sm:p-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
