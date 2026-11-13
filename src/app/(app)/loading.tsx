export default function Cargando() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-stone-500" role="status">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-stone-200 border-t-oro-600" />
      <p className="text-lg">Cargando, un momento...</p>
    </div>
  );
}
