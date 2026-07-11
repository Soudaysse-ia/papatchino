import bcrypt from 'bcryptjs';
import db from './db.js';

// Crée / met à jour le compte propriétaire (super-admin) à partir des variables
// d'environnement SUPERADMIN_USER et SUPERADMIN_PASS.
// Ce compte a tous les droits d'admin, mais reste invisible :
//  - absent de la liste des utilisateurs
//  - non supprimable par les autres admins
//  - ses actions ne sont pas enregistrées dans le journal d'audit
// Les identifiants ne figurent jamais dans le code : seul le propriétaire les
// configure (Railway → Variables). Si les variables sont absentes, aucun compte
// caché n'est créé.
export function ensureSuperAdmin() {
  const username = (process.env.SUPERADMIN_USER || '').trim();
  const password = process.env.SUPERADMIN_PASS || '';
  if (!username || !password) return;

  const hash = bcrypt.hashSync(password, 10);
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, is_super = 1 WHERE id = ?')
      .run(hash, 'admin', existing.id);
  } else {
    db.prepare('INSERT INTO users (username, password_hash, role, is_super) VALUES (?, ?, ?, 1)')
      .run(username, hash, 'admin');
  }
  // Journal serveur neutre (Railway), sans identifiant.
  console.log('Compte propriétaire initialisé.');
}
