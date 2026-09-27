export default function EmptyState({ art: Art, title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {Art && (
        <div className="mb-4 h-24 w-32">
          <Art />
        </div>
      )}
      <h3 className="text-base font-medium text-ink">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-ink-3">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
