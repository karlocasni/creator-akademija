export default function SkeletonCard() {
  return (
    <div className="glass rounded-[2rem] overflow-hidden border border-white/5 animate-pulse">
      <div className="p-6 flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-white/10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/10 rounded-full w-1/3" />
          <div className="h-2 bg-white/5 rounded-full w-1/4" />
        </div>
      </div>
      <div className="px-6 pb-6 space-y-3">
        <div className="h-3 bg-white/10 rounded-full w-full" />
        <div className="h-3 bg-white/10 rounded-full w-5/6" />
        <div className="h-3 bg-white/5 rounded-full w-2/3" />
      </div>
    </div>
  );
}
