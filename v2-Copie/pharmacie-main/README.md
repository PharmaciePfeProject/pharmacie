# Pharmacy Platform (TRANSTU)

Plateforme full-stack de gestion pharmaceutique (operations + reporting), connectee a une base Oracle, avec authentification JWT et controle d acces par roles/permissions (RBAC).

## 1. Vue d ensemble

Le projet est organise en 2 applications:

- `backend/`: API REST Express, validation Zod, Oracle DB, Swagger, RBAC.
- `frontend/`: application React + Vite + TypeScript + Tailwind.

L application couvre notamment:

- Authentification (register, login, me)
- Gestion des utilisateurs et roles
- Produits et references
- Stock, lots, mouvements
- Distribution
- Inventaire
- Supply flow (commandes/receptions/livraisons)
- Medecins et prescriptions
- Navigation BI (Power BI)

## 2. Stack technique

### Backend

- Node.js + Express
- Oracle (`oracledb`)
- JWT (`jsonwebtoken`)
- Validation (`zod`)
- Swagger (`swagger-jsdoc`, `swagger-ui-express`)
- Securite: `helmet`, `cors`, `express-rate-limit`

### Frontend

- React 19 + Vite
- TypeScript
- Tailwind CSS
- React Router
- Axios

## 3. Structure du projet

```text
pharmacie-main/
	backend/
		src/
			app.js
			server.js
			config/
			middleware/
			modules/
				auth/
				distribution/
				doctors/
				inventory/
				prescriptions/
				products/
				references/
				stock/
				stock-movements/
				supply-flow/
				users/
			utils/
	frontend/
		src/
			api/
			auth/
			components/
			pages/
			router/
			types/
```

## 4. Prerequis

- Node.js 18+
- npm 9+
- Oracle Database accessible depuis votre machine
- Schema Oracle contenant les tables metier attendues

## 5. Installation et lancement

### 5.1 Backend

```bash
cd backend
npm install
npm run dev
```

Par defaut: `http://localhost:4000`

Endpoints utiles:

- `GET /health`
- `GET /docs` (Swagger)

### 5.2 Frontend

```bash
cd frontend
npm install
npm run dev
```

Par defaut: `http://localhost:5173`

## 6. Configuration (.env)

### 6.1 Backend (`backend/.env`)

Exemple minimal:

```env
ORACLE_USER=PHARMACIE
ORACLE_PASSWORD=pharma123
ORACLE_CONNECT_STRING=127.0.0.1:1521/orclpdb
ORACLE_SCHEMA=PHARMACIE

PORT=4000
JWT_SECRET=change_me_in_production
```

Notes:

- `ORACLE_SCHEMA` est utilise pour qualifier les tables (`SCHEMA.TABLE`).
- `JWT_SECRET` doit etre fort en production.

### 6.2 Frontend (`frontend/.env.development`)

Exemple:

```env
VITE_API_BASE_URL=http://localhost:4000

VITE_POWERBI_STOCK_REPORT=
VITE_POWERBI_CONSUMPTION_REPORT=
VITE_POWERBI_DISTRIBUTION_REPORT=
VITE_POWERBI_MOVEMENTS_REPORT=
VITE_POWERBI_INVENTORY_REPORT=
```

Important:

- Ne jamais mettre de secret dans les variables `VITE_*`.

## 7. Scripts npm

### Backend

- `npm run dev`: demarrage nodemon
- `npm start`: demarrage node

### Frontend

- `npm run dev`: serveur de dev Vite
- `npm run build`: build TypeScript + Vite
- `npm run preview`: preview du build
- `npm run lint`: lint ESLint

## 8. Securite et auth

- Auth JWT via header `Authorization: Bearer <token>`
- Rate limit applique sur `POST /api/auth/login` (anti brute-force)
- Middleware d auth commun pour routes protegees
- Gestion d erreurs centralisee (y compris erreurs Oracle)

## 9. RBAC (roles et permissions)

Roles principaux:

- `ADMIN`
- `PHARMACIEN`
- `PREPARATEUR`
- `GESTIONNAIRE_STOCK`
- `MEDECIN`
- `RESPONSABLE_REPORTING`

Permissions (exemples):

- `products.read`, `products.manage`
- `stock.read`, `stock.manage`
- `distributions.read`, `distributions.manage`
- `inventories.read`, `inventories.manage`
- `users.manage`, `admin.access`

Le role par defaut a l inscription est `PHARMACIEN` (role id `2`).

## 10. Modules metier (resume)

- `auth`: register/login/me, profil utilisateur
- `users`: administration utilisateurs et affectation des roles
- `doctors`: CRUD medecins + activation/desactivation
- `prescriptions`: creation, listing, details, lignes, filtres
- `products`: catalogue produits
- `stock`: etat de stock
- `stock-movements`: mouvements de stock
- `inventory`: inventaires
- `distribution`: distributions
- `supply-flow`: external/internal orders, receptions, internal deliveries
- `references`: tables de reference (location, movement-type, etc.)

## 11. Focus prescriptions (etat actuel)

Fonctionnalites implementees:

- Creation d une prescription (header + lignes)
- Enregistrement dans:
	- `PRESCRIPTION`
	- `PRESCRIPTION_LINE`
- Date de prescription forcee cote backend a la date systeme (`SYSTIMESTAMP`)
- Liste des agents et situation alimentee depuis la BDD
- Liste des types alimentee depuis la BDD
- Pour un utilisateur role `MEDECIN`: affichage des seules prescriptions de ce medecin

Comportement doctor:

- Le profil doctor est stocke dans `DOCTOR`
- Le compte de connexion reste dans `UTILISATEUR` + `UTILISATEUR_ROLE`
- Si un compte doctor n a pas de ligne `DOCTOR`, la synchronisation est geree automatiquement au login/me

## 12. Endpoints API importants

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Prescriptions

- `GET /api/prescriptions`
- `GET /api/prescriptions/:id`
- `POST /api/prescriptions`
- `GET /api/prescriptions/doctors`
- `GET /api/prescriptions/agents`
- `GET /api/prescriptions/types`

### Documentation

- `GET /docs`

## 13. Troubleshooting rapide

### Login refuse

- Verifier `JWT_SECRET`
- Verifier que le backend pointe vers la bonne DB Oracle
- Verifier le statut `ACTIVED` de l utilisateur
- Attention au rate limit login (10 tentatives / 15 min)

### Doctor non reconnu dans prescriptions

- Verifier la presence d une ligne dans table `DOCTOR`
- Verifier coherence nom/prenom utilisateur vs doctor

### Prescription sans ligne visible

- Verifier que la creation envoie au moins une ligne valide (produit + quantite > 0)
- Verifier l environnement et l API ciblee (port backend actif)
- Verifier table `PRESCRIPTION_LINE` avec `PRESCRIPTION_ID`

## 14. Bonnes pratiques pour la suite

- Remplacer les `MAX(ID)+1` par des `SEQUENCE` Oracle
- Ajouter tests integration backend (auth, prescriptions, RBAC)
- Renforcer la liaison technique entre `UTILISATEUR` et `DOCTOR` (cle explicite)
- Ajouter tracabilite create/update (`created_by`, `created_at`, etc.)

## 15. Licence

Projet interne (adapter selon votre contexte de diffusion).
