import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initSchema } from './db.js';
import { loadDefaultMenu } from './menuData.js';

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

// --- Menu --- (menu Papatchino par défaut, défini dans menuData.js)
const menuCount = db.prepare('SELECT COUNT(*) AS c FROM menu_items').get().c;
const forceMenu = process.argv.includes('--reset-menu');
if (menuCount === 0 || forceMenu) {
  const n = loadDefaultMenu(db, { replace: forceMenu });
  console.log(`  + ${n} plats ${forceMenu ? '(menu réinitialisé)' : 'ajoutés'}`);
}

console.log('\nTerminé. Comptes par défaut :');
console.log('  admin   / admin123    (administrateur)');
console.log('  caisse  / caisse123   (caisse)');
console.log('  cuisine / cuisine123  (cuisine)');
process.exit(0);
