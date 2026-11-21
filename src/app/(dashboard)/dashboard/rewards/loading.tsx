export default function RewardsLoading() {
  return <div className="animate-pulse space-y-3" aria-label="Loading rewards"><div className="h-6 w-40 rounded bg-surface-subtle" /><div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">{[0,1,2,3].map((i) => <div key={i} className="h-28 rounded-[13px] bg-surface-subtle" />)}</div><div className="h-36 rounded-[13px] bg-surface-subtle" /><div className="h-64 rounded-[13px] bg-surface-subtle" /></div>;
}
