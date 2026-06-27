// Utilitaires pour gérer un panier dont les articles portent des options.

// Normalise une sélection : { [groupKey]: choiceKey | [choiceKeys] }.
export function emptySelection(item) {
  const sel = {};
  for (const g of item.options || []) {
    sel[g.key] = g.type === 'multi' ? [] : '';
  }
  return sel;
}

// Renvoie true si l'article possède des options à choisir.
export function hasOptions(item) {
  return Array.isArray(item.options) && item.options.length > 0;
}

// Liste lisible des options choisies : [{ group, label, price }].
export function optionLines(item, selection) {
  const lines = [];
  for (const g of item.options || []) {
    const raw = selection?.[g.key];
    const keys = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    for (const k of keys) {
      const c = (g.choices || []).find((x) => x.key === k);
      if (c) lines.push({ group: g.label, label: c.label, price: Number(c.price) || 0 });
    }
  }
  return lines;
}

// Surcoût total des options sélectionnées.
export function optionsExtra(item, selection) {
  return optionLines(item, selection).reduce((s, l) => s + l.price, 0);
}

// Prix unitaire = prix de base + options.
export function unitPrice(item, selection) {
  return (Number(item.price) || 0) + optionsExtra(item, selection);
}

// Vérifie que la sélection respecte les contraintes (requis, min/max).
export function validateSelection(item, selection) {
  for (const g of item.options || []) {
    const raw = selection?.[g.key];
    const keys = Array.isArray(raw) ? raw : (raw ? [raw] : []);
    if (g.type === 'multi') {
      const min = g.min ?? (g.required ? 1 : 0);
      const max = g.max ?? Infinity;
      if (keys.length < min || keys.length > max) {
        return min === max
          ? `Choisissez ${min} option(s) pour « ${g.label} »`
          : `Choisissez entre ${min} et ${max} option(s) pour « ${g.label} »`;
      }
    } else if (g.required && keys.length !== 1) {
      return `Sélectionnez « ${g.label} »`;
    }
  }
  return null;
}

// Clé stable identifiant une configuration (article + options) pour regrouper le panier.
export function lineKey(itemId, selection) {
  const parts = Object.entries(selection || {})
    .map(([k, v]) => `${k}:${Array.isArray(v) ? [...v].sort().join(',') : v}`)
    .sort();
  return `${itemId}|${parts.join('|')}`;
}

// Convertit la sélection au format attendu par l'API.
export function toApiOptions(selection) {
  return selection || {};
}

// Génère une clé technique à partir d'un libellé (sans accents, minuscules).
export function slug(text) {
  return (text || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

// Normalise les groupes d'options saisis dans l'admin :
// régénère des clés uniques, nettoie les champs, supprime les groupes/choix vides.
export function normalizeOptions(groups) {
  const usedG = {};
  return (groups || [])
    .map((g, gi) => {
      let gkey = slug(g.label) || `groupe_${gi + 1}`;
      while (usedG[gkey]) gkey = `${gkey}_${gi + 1}`;
      usedG[gkey] = true;

      const usedC = {};
      const choices = (g.choices || [])
        .filter((c) => (c.label || '').trim())
        .map((c, ci) => {
          let ckey = slug(c.label) || `choix_${ci + 1}`;
          while (usedC[ckey]) ckey = `${ckey}_${ci + 1}`;
          usedC[ckey] = true;
          return { key: ckey, label: c.label.trim(), price: Number(c.price) || 0 };
        });

      const out = {
        key: gkey,
        label: (g.label || '').trim() || `Groupe ${gi + 1}`,
        type: g.type === 'multi' ? 'multi' : 'single',
        required: !!g.required,
        choices,
      };
      if (out.type === 'multi') {
        if (g.min !== '' && g.min != null) out.min = Number(g.min);
        if (g.max !== '' && g.max != null) out.max = Number(g.max);
      }
      return out;
    })
    .filter((g) => g.choices.length > 0);
}
