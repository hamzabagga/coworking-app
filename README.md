application web de gestion d'un espace de coworking : espaces, membres et réservations.

Backend : API REST avec NestJS
Frontend : React, basé sur le template TailAdmin
Base de données : MongoDB
Fonctionnalités

Deux rôles : admin et member.

L'administrateur peut :

créer, modifier, désactiver et supprimer des espaces ;
gérer les comptes des membres (rôle, activation) ;
consulter et annuler toutes les réservations.

Le membre peut :

consulter les espaces et leurs disponibilités ;
réserver un espace sur un créneau ;
modifier ou annuler ses réservations ;
modifier son profil et son mot de passe.

Un espace ne peut pas être réservé deux fois sur des créneaux qui se chevauchent.

Stack
Partie	Technologies
Backend	NestJS, TypeScript, Mongoose, JWT, bcrypt, class-validator
Frontend	React 19, TypeScript, Vite, Tailwind CSS, axios
Base de données	MongoDB
Tests	Jest
Architecture
Frontend React  --(HTTP / JSON + token JWT)-->  API NestJS  --(Mongoose)-->  MongoDB
  :5173                                          :3000/api                   :27017

Le frontend n'accède jamais directement à la base : toutes les opérations passent par l'API, qui applique la validation, l'authentification et les règles métier.

Structure
coworking-management/
├── backend/
│   └── src/
│       ├── auth/            inscription, connexion, JWT
│       ├── users/           comptes et profils
│       ├── spaces/          espaces
│       ├── reservations/    réservations
│       └── common/          guards, décorateurs, pipes
└── frontend/
    └── src/
        ├── api/             client axios
        └── pages/           pages de l'application
Installation

Prérequis : Node.js (version LTS) et MongoDB en local.

bash
git clone https://github.com/hamzabagga/coworking-management.git
cd coworking-management
Backend
bash
cd backend
npm install

Créer un fichier backend/.env :

env
MONGO_URI=mongodb://localhost:27017/coworking
JWT_SECRET=une_chaine_longue_et_aleatoire
JWT_EXPIRES_IN=1d
PORT=3000
ADMIN_EMAIL=admin@exemple.com
ADMIN_PASSWORD=motdepasse

Au premier démarrage, un compte administrateur est créé avec ADMIN_EMAIL et ADMIN_PASSWORD s'il n'existe pas encore.

bash
npm run start:dev

L'API est disponible sur http://localhost:3000/api.

Frontend

Dans un second terminal :

bash
cd frontend
npm install
npm run dev

L'application est disponible sur http://localhost:5173.

API

Toutes les routes sont préfixées par /api. Sauf indication « public », elles nécessitent le header Authorization: Bearer <token>.

Authentification (public)
Méthode	Route	Description
POST	/auth/register	Créer un compte membre
POST	/auth/login	Se connecter, renvoie accessToken
Utilisateurs
Méthode	Route	Accès	Description
GET	/users/me	connecté	Mon profil
PATCH	/users/me	connecté	Modifier mon profil
PATCH	/users/me/password	connecté	Changer mon mot de passe
GET	/users	admin	Liste des utilisateurs
POST	/users	admin	Créer un utilisateur
GET / PATCH / DELETE	/users/:id	admin	Détail, modification, suppression
Espaces
Méthode	Route	Accès	Description
GET	/spaces	public	Liste (filtres : type, minCapacity, includeInactive)
GET	/spaces/:id	public	Détail
GET	/spaces/:id/availability?date=YYYY-MM-DD	public	Créneaux réservés pour un jour
POST	/spaces	admin	Créer
PATCH	/spaces/:id	admin	Modifier
DELETE	/spaces/:id	admin	Supprimer
Réservations
Méthode	Route	Description
POST	/reservations	Réserver un créneau
GET	/reservations	Mes réservations (toutes pour l'admin)
GET	/reservations/:id	Détail
PATCH	/reservations/:id	Modifier ou déplacer
PATCH	/reservations/:id/cancel	Annuler
Règles de réservation
le créneau doit être dans le futur ;
durée comprise entre 30 minutes et 12 heures ;
l'espace doit être actif ;
le nombre de personnes ne doit pas dépasser la capacité de l'espace ;
pas de chevauchement avec une réservation confirmée du même espace (sinon 409 Conflict) ;
le prix est calculé à la création (durée × prix horaire) et n'est plus modifié ensuite ;
un espace qui a des réservations à venir ne peut pas être supprimé.
Tests
bash
cd backend
npm test

Les tests unitaires couvrent les règles de réservation : chevauchement, capacité, durée, annulation et calcul du prix.

Évolutions prévues
forfaits et abonnements ;
paiement en ligne ;
notifications par email ;
calendrier des disponibilités.
Auteur

Hamza Bagga
