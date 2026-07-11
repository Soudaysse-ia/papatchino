# 🍟 Papatchino

Application web complète de **gestion de restaurant** : commande à table par QR code,
caisse, écran cuisine et administration. Interface **100 % en français**.
Charte graphique : **rouge `#d62027`** et **or `#f4b62c`**.

- **Frontend** : React + Vite + Tailwind CSS (PWA installable)
- **Backend** : Node.js + Express
- **Base de données** : SQLite (better-sqlite3)
- **Temps réel** : Socket.io (alertes sonores et visuelles à la caisse et en cuisine)
- **Hors ligne** : PWA + service worker + file d'attente IndexedDB avec synchronisation automatique

---

## 🚀 Installation et démarrage

Pré-requis : **Node.js 18+** et **npm**.

```bash
# 1. Installer les dépendances (racine + backend + frontend)
npm install

# 2. Créer la base de données et les données de démonstration
npm run seed

# 3. Lancer le backend et le frontend ensemble
npm run dev
```

- Frontend : <http://localhost:5173>
- API : <http://localhost:4100>

> Le `npm install` à la racine installe automatiquement les dépendances du backend
> et du frontend (script `postinstall`). En cas de souci, utilisez `npm run install:all`.

### Comptes par défaut (créés par le seed)

| Rôle            | Identifiant | Mot de passe |
|-----------------|-------------|--------------|
| Administrateur  | `admin`     | `admin123`   |
| Caisse          | `caisse`    | `caisse123`  |
| Cuisine         | `cuisine`   | `cuisine123` |

Pour réinitialiser complètement la base : `npm --prefix backend run seed -- --reset`.

---

## 🧭 Les pages

| Page | Accès | Adresse |
|------|-------|---------|
| **Menu client** | Public (scan QR) | `/menu?table=TOKEN` |
| **Suivi de commande** | Public | `/suivi/:id` |
| **Connexion** | Public | `/connexion` |
| **Caisse** | Rôle caisse / admin | `/caisse` |
| **Cuisine (KDS)** | Rôle cuisine / admin | `/cuisine` |
| **Administration** | Rôle admin | `/admin` |

### 1. Client (mobile-first)
Menu organisé **par catégorie**, barre de **recherche**, photos, prix. Les plats
indisponibles ou en rupture sont masqués. Le client choisit ses articles, ajuste les
quantités, commande **sans compte**, puis suit l'état en direct
(*reçue → en préparation → prête → servie*).

### 2. Caisse
Flux des commandes **en temps réel** avec **alerte sonore + visuelle clignotante** à
chaque nouvelle commande. Mise à jour des statuts, **encaissement** (Espèces ou
Mobile Money — **aucun pourboire**), création de commandes **sur place** et **livraison**,
bascule instantanée de la disponibilité des plats.

### 3. Cuisine (KDS)
Écran dédié n'affichant que les plats à préparer, **trié du plus ancien au plus récent**,
avec minuteur et alerte à chaque nouvelle commande. Bouton « Prête ✓ ».

### 4. Administration
- **Tableau de bord** du jour : nombre de commandes, recettes, répartition
  Espèces / Mobile Money, articles les plus commandés, heures de pointe, alertes de stock.
- **Historique** des commandes filtrable (date, table, statut, paiement).
- **Gestion du menu & du stock** (ajout / édition / suppression).
- **Tables & QR codes** : création de tables et **QR code PNG téléchargeable** par table.
- **Utilisateurs** : création des comptes caisse et cuisine.
- **Journal d'audit** : qui a fait quoi (connexions, validations, changements de statut,
  modifications du menu…), filtrable.
- **Export** du rapport quotidien en **CSV** (bouton « Exporter CSV ») ou en **PDF**
  (bouton « Imprimer / PDF » → enregistrer en PDF via la boîte d'impression).

---

## 📦 Gestion du stock (automatique)

- Chaque plat possède une **quantité en stock** et un **seuil d'alerte**.
- Le stock **diminue automatiquement** à chaque commande.
- À **0**, le plat passe **automatiquement « indisponible »**.
- Sous le seuil, une **alerte de stock bas** s'affiche sur le tableau de bord.

---

## 📴 Mode hors ligne

L'application est une **PWA installable** (téléphone / tablette, sans store).
Si la connexion tombe, les commandes du client sont **enregistrées localement (IndexedDB)**
puis **synchronisées automatiquement** au retour du réseau. Un indicateur
**« En ligne / Hors ligne »** est affiché en permanence.

> Le service worker n'est actif qu'en build de production (`npm run build` puis
> `npm --prefix frontend run preview`). En développement, la file d'attente IndexedDB
> et l'indicateur fonctionnent quand même.

---

## 🔐 Sécurité

- Mots de passe **hachés avec bcrypt**.
- Authentification **JWT** pour les rôles admin / caisse / cuisine.
- Les pages client sont en **lecture seule** ; les routes staff sont protégées côté
  serveur (vérification du rôle) **et** côté client, empêchant tout accès par
  manipulation d'URL.

---

## 🗂️ Structure du projet

```
restaurant-app/
├── package.json          # scripts globaux (dev, seed…)
├── backend/              # API Express + SQLite + Socket.io
│   └── src/
│       ├── index.js      # serveur HTTP + websockets
│       ├── db.js         # schéma SQLite
│       ├── seed.js       # données de démonstration
│       ├── auth.js       # JWT + middleware de rôles
│       ├── audit.js      # journal d'audit
│       └── routes/       # auth, menu, orders, tables, users, stats, logs
└── frontend/             # React + Vite + Tailwind (PWA)
    ├── public/           # manifest, service worker, icône
    └── src/
        ├── lib/          # api, auth, socket, offline (IndexedDB), son…
        ├── components/
        └── pages/        # client, caisse, cuisine, admin/
```

### Configuration (optionnelle)

Copiez `backend/.env.example` en `backend/.env` pour changer le port, le secret JWT
ou l'origine du client (utilisée pour générer les URL des QR codes).

---

## 💰 Monnaie

Les prix sont affichés en **KMF** (franc comorien). Adaptez le format dans
`frontend/src/lib/format.js` (`formatPrice`) si nécessaire.
