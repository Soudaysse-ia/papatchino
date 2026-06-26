// Formatage de la monnaie en francs comoriens (KMF), sans décimales.
export function formatPrice(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('fr-FR') + ' KMF';
}

export function formatTime(iso) {
  if (!iso) return '';
  const d = parseDate(iso);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export function formatDateTime(iso) {
  if (!iso) return '';
  const d = parseDate(iso);
  return d.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

// SQLite renvoie "YYYY-MM-DD HH:MM:SS" en UTC : on le rend interprétable par Date.
function parseDate(iso) {
  if (typeof iso === 'string' && iso.includes(' ') && !iso.includes('T')) {
    return new Date(iso.replace(' ', 'T') + 'Z');
  }
  return new Date(iso);
}

// Durée écoulée depuis `iso`, format "il y a Xmin".
export function elapsed(iso) {
  const d = parseDate(iso);
  const mins = Math.max(0, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h} h ${mins % 60} min`;
}

export const STATUS_LABELS = {
  recue: 'Reçue',
  en_preparation: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  payee: 'Payée',
  annulee: 'Annulée',
};

export const STATUS_COLORS = {
  recue: 'bg-blue-100 text-blue-800',
  en_preparation: 'bg-amber-100 text-amber-800',
  prete: 'bg-purple-100 text-purple-800',
  servie: 'bg-emerald-100 text-emerald-800',
  payee: 'bg-slate-200 text-slate-700',
  annulee: 'bg-red-100 text-red-700',
};

export const PAYMENT_LABELS = { cash: 'Espèces', mobile_money: 'Mobile Money' };
export const SOURCE_LABELS = { qr_table: 'Table (QR)', walk_in: 'Sur place', delivery: 'Livraison' };
