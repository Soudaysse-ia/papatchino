import { useOnline } from '../lib/useOnline.js';

// Indicateur "En ligne / Hors ligne" + nombre de commandes en attente de synchro.
export default function OnlineBadge() {
  const { online, pending } = useOnline();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span
        className={`badge ${online ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}
      >
        <span className={`mr-1 inline-block h-2 w-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-red-500'}`} />
        {online ? 'En ligne' : 'Hors ligne'}
      </span>
      {pending > 0 && (
        <span className="badge bg-amber-100 text-amber-800" title="Commandes en attente de synchronisation">
          {pending} en attente
        </span>
      )}
    </div>
  );
}
