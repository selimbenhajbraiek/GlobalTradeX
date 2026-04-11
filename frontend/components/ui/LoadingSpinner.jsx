export function LoadingSpinner({ className = "" }) {
  return (
    <span
      role="status"
      aria-label="Chargement"
      className={`inline-block h-8 w-8 animate-spin rounded-full border-2 border-brass/25 border-t-brass ${className}`}
    />
  );
}
