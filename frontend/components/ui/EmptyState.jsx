export function EmptyState({ title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line/80 bg-panel/40 px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold text-[var(--text)]">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-mist">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
