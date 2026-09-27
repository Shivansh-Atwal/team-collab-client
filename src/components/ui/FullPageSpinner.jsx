export function Spinner({ size = 28 }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" aria-label="Loading">
      <circle cx="12" cy="12" r="10" stroke="#e8eaed" strokeWidth="3" fill="none" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="#1a73e8" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function FullPageSpinner() {
  return (
    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
      <Spinner />
    </div>
  );
}
