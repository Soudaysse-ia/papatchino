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
    INSERT INTO menu_items (name, description, price, category, photo_url, is_available, stock_quantity, low_stock_threshold)
    VALUES (@name, @description, @price, @category, @photo_url, 1, @stock, @threshold)
  `);
  const img = (q) => `https://source.unsplash.com/400x300/?${encodeURIComponent(q)}`;
  const items = [
    // Entrées
    { name: 'Salade César', description: 'Laitue, poulet grillé, parmesan, croûtons', price: 3500, category: 'Entrées', photo_url: img('caesar salad'), stock: 20, threshold: 5 },
    { name: 'Soupe du jour', description: 'Soupe maison de saison', price: 2000, category: 'Entrées', photo_url: img('soup bowl'), stock: 15, threshold: 4 },
    { name: 'Accras de poisson', description: 'Beignets de poisson épicés (6 pièces)', price: 2500, category: 'Entrées', photo_url: img('fish fritters'), stock: 18, threshold: 5 },
    // Plats
    { name: 'Poulet braisé', description: 'Demi-poulet braisé, sauce maison', price: 6000, category: 'Plats', photo_url: img('grilled chicken'), stock: 25, threshold: 6 },
    { name: 'Poisson grillé', description: 'Poisson entier grillé, attiéké', price: 7000, category: 'Plats', photo_url: img('grilled fish'), stock: 20, threshold: 5 },
    { name: 'Riz sauce arachide', description: 'Riz blanc, sauce arachide, viande', price: 4500, category: 'Plats', photo_url: img('rice peanut sauce'), stock: 30, threshold: 8 },
    { name: 'Burger maison', description: 'Steak, cheddar, frites maison', price: 5000, category: 'Plats', photo_url: img('burger fries'), stock: 22, threshold: 6 },
    // Boissons
    { name: 'Jus de bissap', description: 'Jus d\'hibiscus frais', price: 1000, category: 'Boissons', photo_url: img('hibiscus juice'), stock: 40, threshold: 10 },
    { name: 'Jus de gingembre', description: 'Jus de gingembre maison', price: 1000, category: 'Boissons', photo_url: img('ginger juice'), stock: 40, threshold: 10 },
    { name: 'Eau minérale', description: 'Bouteille 50cl', price: 500, category: 'Boissons', photo_url: img('water bottle'), stock: 60, threshold: 12 },
    { name: 'Soda', description: 'Canette 33cl', price: 800, category: 'Boissons', photo_url: img('soda can'), stock: 50, threshold: 12 },
    // Desserts
    { name: 'Salade de fruits', description: 'Fruits frais de saison', price: 2000, category: 'Desserts', photo_url: img('fruit salad'), stock: 16, threshold: 4 },
    { name: 'Gâteau au chocolat', description: 'Part de gâteau moelleux', price: 2500, category: 'Desserts', photo_url: img('chocolate cake'), stock: 12, threshold: 3 },
  ];
  const tx = db.transaction(() => items.forEach((it) => insert.run(it)));
  tx();
  console.log(`  + ${items.length} plats ajoutés`);
}

console.log('\nTerminé. Comptes par défaut :');
console.log('  admin   / admin123    (administrateur)');
console.log('  caisse  / caisse123   (caisse)');
console.log('  cuisine / cuisine123  (cuisine)');
process.exit(0);
