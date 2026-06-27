// Menu Papatchino par défaut — source unique utilisée par le seed initial
// et par l'endpoint admin « Charger le menu par défaut ».

// --- Groupes d'options réutilisables ---
// Formule (combo) pour burgers et sandwichs : +1 000 KMF, boisson + frites OU chips banane.
const combo = {
  key: 'formule', label: 'Formule', type: 'single', required: true,
  choices: [
    { key: 'seul', label: 'Seul', price: 0 },
    { key: 'menu_frites', label: 'En menu — boisson + Frites', price: 1000 },
    { key: 'menu_chips', label: 'En menu — boisson + Chips Banane', price: 1000 },
  ],
};
// Accompagnement de base pour les frites signature.
const baseFrites = {
  key: 'base', label: 'Base', type: 'single', required: true,
  choices: [
    { key: 'frites', label: 'Frites', price: 0 },
    { key: 'chips', label: 'Chips Banane', price: 0 },
  ],
};
// Accompagnement au choix (grillades).
const accompagnement = {
  key: 'accompagnement', label: 'Accompagnement au choix', type: 'single', required: true,
  choices: [
    { key: 'frites', label: 'Frites', price: 0 },
    { key: 'chips', label: 'Chips Banane', price: 0 },
    { key: 'riz', label: 'Riz', price: 0 },
    { key: 'salade', label: 'Salade', price: 0 },
  ],
};
// Suppléments grillades.
const supplementsGrillade = {
  key: 'supplements', label: 'Suppléments', type: 'multi', required: false,
  choices: [
    { key: 'broch_boeuf', label: 'Brochette de Bœuf', price: 500 },
    { key: 'broch_poulet', label: 'Brochette de Poulet', price: 500 },
    { key: 'ailes', label: 'Ailes de Poulet', price: 400 },
  ],
};
// Accompagnements à choisir pour les planchas (n au choix).
const planchaAccomp = (n) => ({
  key: 'accompagnements', label: `Accompagnements (${n} au choix)`, type: 'multi',
  required: true, min: n, max: n,
  choices: [
    { key: 'frites', label: 'Frites', price: 0 },
    { key: 'chips', label: 'Chips Banane', price: 0 },
    { key: 'riz', label: 'Riz', price: 0 },
    { key: 'salade', label: 'Salade', price: 0 },
    { key: 'plantain', label: 'Banane plantain', price: 0 },
    { key: 'legumes', label: 'Légumes grillés', price: 0 },
  ],
});
// Support des desserts crêpes/gaufres.
const support = {
  key: 'support', label: 'Crêpe ou Gaufre', type: 'single', required: true,
  choices: [
    { key: 'crepe', label: 'Crêpe', price: 0 },
    { key: 'gaufre', label: 'Gaufre', price: 0 },
  ],
};

export const DEFAULT_MENU = [
  // 🍔 Smash Burgers
  { name: 'Cheese', description: 'Smash burger cheese', price: 2750, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
  { name: 'Double Cheese', description: 'Smash burger double cheese', price: 3500, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
  { name: 'Royal', description: 'Smash burger Royal', price: 3750, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
  { name: 'Chicken', description: 'Smash burger poulet', price: 3250, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
  { name: 'Triple Cheese', description: 'Smash burger triple cheese', price: 4000, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
  { name: 'Supreme', description: 'Smash burger Suprême', price: 4800, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },

  // 🌯 Sandwichs
  { name: 'Chicken Tikka', description: 'Sandwich poulet tikka', price: 3500, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
  { name: 'Chicken Tandoori', description: 'Sandwich poulet tandoori', price: 3750, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
  { name: 'Filet de Bœuf', description: 'Sandwich filet de bœuf', price: 3800, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
  { name: 'Triple Steak', description: 'Sandwich triple steak', price: 4250, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
  { name: 'Buffalo', description: 'Sandwich buffalo', price: 4750, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },

  // 🍟 Frites Signature
  { name: 'Saucisse', description: 'Frites signature saucisse', price: 1750, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
  { name: 'Poulet', description: 'Frites signature poulet', price: 2750, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
  { name: 'Steak Cheese', description: 'Frites signature steak cheese', price: 3500, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
  { name: 'Poulet Crusty', description: 'Frites signature poulet crusty', price: 3000, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },

  // 🔥 Grillades
  { name: 'Brochettes de Bœuf', description: 'Morceaux de filet de bœuf tendres et grillés au feu, assaisonnés maison.', price: 3500, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
  { name: 'Brochettes de Poulet', description: 'Filets de poulet marinés et grillés pour une viande tendre et savoureuse.', price: 3500, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
  { name: 'Ailes de Poulet', description: 'Ailes de poulet marinées puis grillées pour un résultat juteux et plein de saveur.', price: 3250, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
  { name: 'Demi-Poulet Grillé', description: 'Demi-poulet mariné et grillé à la braise, juteux et plein de saveur.', price: 3750, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },

  // 🥩 Les Planchas
  { name: 'La Plancha (4 personnes)', description: 'Assortiment à partager : brochettes de bœuf, brochettes de poulet, ailes de poulet, demi-poulet. Servie avec 4 accompagnements au choix.', price: 18500, category: 'Les Planchas', stock: 15, threshold: 3, options: [planchaAccomp(4)] },
  { name: 'La Big Plancha (6 personnes)', description: 'Grand assortiment de viandes à partager. Servie avec 6 accompagnements au choix.', price: 25000, category: 'Les Planchas', stock: 10, threshold: 2, options: [planchaAccomp(6)] },

  // 🧇 Desserts – Crêpes / Gaufres
  { name: 'Sucre', description: 'Sucre, Vanille', price: 1000, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },
  { name: 'Nutella', description: 'Vanille, Nutella', price: 1500, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },
  { name: 'Nutella Banane', description: 'Vanille, Nutella, Banane', price: 1750, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },
  { name: 'Nutella Oreo', description: 'Vanille, Nutella, Oreo', price: 2500, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },
  { name: 'Nutella Spéculoos', description: 'Vanille, Nutella, Spéculoos', price: 2500, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },
  { name: 'Nutella Daim', description: 'Vanille, Nutella, Chocolat Daim', price: 2500, category: 'Crêpes / Gaufres', stock: 40, threshold: 8, options: [support] },

  // 🍞 Brioche Perdue
  { name: 'Brioche Perdue Nature', description: 'Beurre, Vanille, Glace Vanille', price: 2000, category: 'Brioche Perdue', stock: 30, threshold: 6, options: [] },
  { name: 'Brioche Perdue Nutella', description: 'Beurre, Vanille, Nutella, Glace Vanille', price: 2500, category: 'Brioche Perdue', stock: 30, threshold: 6, options: [] },
  { name: 'Brioche Perdue Nutella Banane', description: 'Vanille, Nutella, Banane, Glace Vanille', price: 2750, category: 'Brioche Perdue', stock: 30, threshold: 6, options: [] },
  { name: 'Brioche Perdue Caramel Beurre Salé', description: 'Caramel beurre salé', price: 2750, category: 'Brioche Perdue', stock: 30, threshold: 6, options: [] },

  // 🥤 Boissons
  { name: 'Jus de bissap', description: "Jus d'hibiscus frais", price: 1000, category: 'Boissons', stock: 40, threshold: 10, options: [] },
  { name: 'Jus de gingembre', description: 'Jus de gingembre maison', price: 1000, category: 'Boissons', stock: 40, threshold: 10, options: [] },
  { name: 'Eau minérale', description: 'Bouteille 50cl', price: 500, category: 'Boissons', stock: 60, threshold: 12, options: [] },
  { name: 'Soda', description: 'Canette 33cl', price: 800, category: 'Boissons', stock: 50, threshold: 12, options: [] },
];

// Insère le menu par défaut dans la base. Si `replace` est vrai, vide d'abord la table.
export function loadDefaultMenu(db, { replace = false } = {}) {
  const insert = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, photo_url, is_available, stock_quantity, low_stock_threshold, options)
    VALUES (@name, @description, @price, @category, '', 1, @stock, @threshold, @options)
  `);
  const tx = db.transaction(() => {
    if (replace) db.exec('DELETE FROM menu_items');
    for (const it of DEFAULT_MENU) {
      insert.run({
        name: it.name,
        description: it.description,
        price: it.price,
        category: it.category,
        stock: it.stock,
        threshold: it.threshold,
        options: JSON.stringify(it.options || []),
      });
    }
  });
  tx();
  return DEFAULT_MENU.length;
}
