import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initSchema } from './db.js';

initSchema();

console.log('Initialisation des données de démonstration...');

const reset = process.argv.includes('--reset');
if (reset) {
  db.exec('DELETE FROM access_log; DELETE FROM orders; DELETE FROM menu_items; DELETE FROM tables; DELETE FROM users;');
  console.log('Données existantes effacées (--reset).');
}

// --- Utilisateurs ---
const upsertUser = (username, password, role) => {
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return;
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)')
    .run(username, bcrypt.hashSync(password, 10), role);
  console.log(`  + utilisateur ${username} (${role})`);
};
upsertUser('admin', 'admin123', 'admin');
upsertUser('caisse', 'caisse123', 'cashier');
upsertUser('cuisine', 'cuisine123', 'kitchen');

// --- Tables ---
const tableCount = db.prepare('SELECT COUNT(*) AS c FROM tables').get().c;
if (tableCount === 0) {
  const insertTable = db.prepare('INSERT INTO tables (name, qr_code_token) VALUES (?, ?)');
  for (let i = 1; i <= 6; i++) insertTable.run(`Table ${i}`, uuidv4());
  console.log('  + 6 tables créées');
}

// --- Menu ---
const menuCount = db.prepare('SELECT COUNT(*) AS c FROM menu_items').get().c;
if (menuCount === 0) {
  const insert = db.prepare(`
    INSERT INTO menu_items (name, description, price, category, photo_url, is_available, stock_quantity, low_stock_threshold, options)
    VALUES (@name, @description, @price, @category, @photo_url, 1, @stock, @threshold, @options)
  `);

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

  const items = [
    // 🍔 Smash Burgers (formule combo)
    { name: 'Cheese', description: 'Smash burger cheese', price: 2750, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
    { name: 'Double Cheese', description: 'Smash burger double cheese', price: 3500, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
    { name: 'Royal', description: 'Smash burger Royal', price: 3750, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
    { name: 'Chicken', description: 'Smash burger poulet', price: 3250, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
    { name: 'Triple Cheese', description: 'Smash burger triple cheese', price: 4000, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },
    { name: 'Supreme', description: 'Smash burger Suprême', price: 4800, category: 'Smash Burgers', stock: 50, threshold: 10, options: [combo] },

    // 🌯 Sandwichs (formule combo)
    { name: 'Chicken Tikka', description: 'Sandwich poulet tikka', price: 3500, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
    { name: 'Chicken Tandoori', description: 'Sandwich poulet tandoori', price: 3750, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
    { name: 'Filet de Bœuf', description: 'Sandwich filet de bœuf', price: 3800, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
    { name: 'Triple Steak', description: 'Sandwich triple steak', price: 4250, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },
    { name: 'Buffalo', description: 'Sandwich buffalo', price: 4750, category: 'Sandwichs', stock: 50, threshold: 10, options: [combo] },

    // 🍟 Frites Signature (frites ou chips banane)
    { name: 'Saucisse', description: 'Frites signature saucisse', price: 1750, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
    { name: 'Poulet', description: 'Frites signature poulet', price: 2750, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
    { name: 'Steak Cheese', description: 'Frites signature steak cheese', price: 3500, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },
    { name: 'Poulet Crusty', description: 'Frites signature poulet crusty', price: 3000, category: 'Frites Signature', stock: 50, threshold: 10, options: [baseFrites] },

    // 🔥 Grillades (accompagnement au choix + suppléments)
    { name: 'Brochettes de Bœuf', description: 'Morceaux de filet de bœuf tendres et grillés au feu, assaisonnés maison.', price: 3500, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
    { name: 'Brochettes de Poulet', description: 'Filets de poulet marinés et grillés pour une viande tendre et savoureuse.', price: 3500, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
    { name: 'Ailes de Poulet', description: 'Ailes de poulet marinées puis grillées pour un résultat juteux et plein de saveur.', price: 3250, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },
    { name: 'Demi-Poulet Grillé', description: 'Demi-poulet mariné et grillé à la braise, juteux et plein de saveur.', price: 3750, category: 'Grillades', stock: 40, threshold: 8, options: [accompagnement, supplementsGrillade] },

    // 🥩 Les Planchas (accompagnements à choisir)
    { name: 'La Plancha (4 personnes)', description: 'Assortiment à partager : brochettes de bœuf, brochettes de poulet, ailes de poulet, demi-poulet. Servie avec 4 accompagnements au choix.', price: 18500, category: 'Les Planchas', stock: 15, threshold: 3, options: [planchaAccomp(4)] },
    { name: 'La Big Plancha (6 personnes)', description: 'Grand assortiment de viandes à partager. Servie avec 6 accompagnements au choix.', price: 25000, category: 'Les Planchas', stock: 10, threshold: 2, options: [planchaAccomp(6)] },

    // 🧇 Desserts – Crêpes / Gaufres (crêpe ou gaufre)
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

    // 🥤 Boissons (conservées)
    { name: 'Jus de bissap', description: "Jus d'hibiscus frais", price: 1000, category: 'Boissons', stock: 40, threshold: 10, options: [] },
    { name: 'Jus de gingembre', description: 'Jus de gingembre maison', price: 1000, category: 'Boissons', stock: 40, threshold: 10, options: [] },
    { name: 'Eau minérale', description: 'Bouteille 50cl', price: 500, category: 'Boissons', stock: 60, threshold: 12, options: [] },
    { name: 'Soda', description: 'Canette 33cl', price: 800, category: 'Boissons', stock: 50, threshold: 12, options: [] },
  ];

  const tx = db.transaction(() => items.forEach((it) =>
    insert.run({ ...it, photo_url: it.photo_url || '', options: JSON.stringify(it.options || []) })
  ));
  tx();
  console.log(`  + ${items.length} plats ajoutés`);
}

console.log('\nTerminé. Comptes par défaut :');
console.log('  admin   / admin123    (administrateur)');
console.log('  caisse  / caisse123   (caisse)');
console.log('  cuisine / cuisine123  (cuisine)');
process.exit(0);
