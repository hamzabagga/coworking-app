# Coworking Management — Backend

API REST Nest.js + MongoDB (Mongoose) pour la gestion d'un espace de coworking : comptes, espaces et réservations.

## Démarrage

```bash
npm install
npm run start:dev      # http://localhost:3000/api
npm test               # tests unitaires
```

Variables `.env` :

| Variable | Rôle |
| --- | --- |
| `MONGO_URI` | adresse MongoDB |
| `JWT_SECRET` | clé de signature des access tokens (mettre une valeur longue et aléatoire) |
| `JWT_EXPIRES_IN` | durée de validité de l'access token (défaut `15m`) |
| `JWT_REFRESH_SECRET` | clé de signature des refresh tokens (différente de `JWT_SECRET`) |
| `JWT_REFRESH_EXPIRES_IN` | durée de validité du refresh token (défaut `7d`) |
| `PORT` | port HTTP (défaut `3000`) |
| `CORS_ORIGIN` | origine autorisée du frontend (défaut : toutes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | compte admin créé au démarrage s'il n'existe pas |

## Authentification

`POST /api/auth/login` (ou `/register`) renvoie `{ accessToken, user }` et dépose le
refresh token dans un cookie `refresh_token` (httpOnly, SameSite=Strict, limité à `/api/auth`,
`Secure` en production). Envoyer ensuite le header `Authorization: Bearer <accessToken>`.
Toutes les routes exigent un token sauf celles marquées « public ».

- L'access token dure 15 min. Quand il expire, `POST /api/auth/refresh` (avec le cookie)
  renvoie un nouvel access token et un nouveau refresh token : l'ancien est invalidé (rotation).
- Chaque connexion crée une session en base (collection `sessions`). Réutiliser un refresh token
  déjà échangé ferme toutes les sessions de l'utilisateur (token probablement volé).
- `POST /api/auth/logout` ferme la session : l'access token associé est refusé immédiatement.
- Changer son mot de passe déconnecte les autres appareils ; supprimer ou désactiver un compte
  bloque toutes ses sessions.
- Côté client, appeler l'API avec `credentials` (axios : `withCredentials: true`).

Deux rôles : `member` (par défaut à l'inscription) et `admin`.

## Endpoints

### Auth (public)

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ email, password (8+), firstName, lastName, phone? }` |
| POST | `/api/auth/login` | `{ email, password }` |
| POST | `/api/auth/refresh` | cookie `refresh_token` → nouvelle paire de tokens |
| POST | `/api/auth/logout` | cookie `refresh_token` → ferme la session |

### Utilisateurs

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/api/users/me` | connecté | mon profil |
| PATCH | `/api/users/me` | connecté | `{ firstName?, lastName?, phone? }` |
| PATCH | `/api/users/me/password` | connecté | `{ currentPassword, newPassword }` |
| GET | `/api/users` | admin | liste |
| POST | `/api/users` | admin | créer (peut fixer `role`) |
| GET / PATCH / DELETE | `/api/users/:id` | admin | détail / modifier (`role`, `isActive`…) / supprimer |

### Espaces

| Méthode | Route | Accès | Description |
| --- | --- | --- | --- |
| GET | `/api/spaces?type=&minCapacity=&includeInactive=` | public | liste filtrée |
| GET | `/api/spaces/:id` | public | détail |
| GET | `/api/spaces/:id/availability?date=YYYY-MM-DD` | public | créneaux déjà réservés ce jour (UTC) |
| POST | `/api/spaces` | admin | `{ name, type, capacity, pricePerHour, description?, amenities?, location?, imageUrl?, isActive? }` |
| PATCH | `/api/spaces/:id` | admin | modifier |
| DELETE | `/api/spaces/:id` | admin | refusé (409) s'il reste des réservations à venir |

`type` : `desk`, `private_office`, `meeting_room`, `event_space`.

### Réservations

Un membre ne voit et ne modifie que ses réservations ; l'admin voit tout.

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/reservations` | `{ spaceId, startTime, endTime, attendees?, notes? }` (dates ISO 8601) |
| GET | `/api/reservations?spaceId=&userId=&status=&from=&to=` | liste (`userId` : admin seulement) |
| GET | `/api/reservations/:id` | détail |
| PATCH | `/api/reservations/:id` | déplacer / modifier `{ startTime?, endTime?, attendees?, notes? }` |
| PATCH | `/api/reservations/:id/cancel` | annuler |

Règles métier :

- créneau dans le futur, durée entre 30 min et 12 h ;
- espace actif et `attendees` ≤ capacité ;
- pas de chevauchement avec une réservation confirmée du même espace (409) — des créneaux bout à bout (9h-11h puis 11h-12h) sont acceptés ;
- prix = durée en heures × `pricePerHour`, arrondi au centime et figé à la réservation ;
- une réservation annulée ou commencée ne peut plus être modifiée ; un membre ne peut plus annuler une réservation commencée (l'admin peut).
