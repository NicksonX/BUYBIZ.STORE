export function LoadingDots({ label = "Processing" }: { label?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-1" role="status" aria-label={label}>
      <span className="loading-dot h-1 w-1 rounded-full bg-current" />
      <span className="loading-dot h-1 w-1 rounded-full bg-current [animation-delay:140ms]" />
      <span className="loading-dot h-1 w-1 rounded-full bg-current [animation-delay:280ms]" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
