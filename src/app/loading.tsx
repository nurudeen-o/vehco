export default function GlobalLoading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[70vh] p-6 space-y-4">
      <div className="w-12 h-12 border-4 border-[#0F6B4B] border-t-transparent rounded-full animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-slate-700">Loading vehiCO Dashboard...</p>
        <p className="text-xs text-slate-400">Fetching latest fleet data and logs</p>
      </div>
    </div>
  );
}
