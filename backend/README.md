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
| `JWT_SECRET` | clé de signature des tokens (mettre une valeur longue et aléatoire) |
| `JWT_EXPIRES_IN` | durée de validité du token (défaut `1d`) |
| `PORT` | port HTTP (défaut `3000`) |
| `CORS_ORIGIN` | origine autorisée du frontend (défaut : toutes) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | compte admin créé au démarrage s'il n'existe pas |

## Authentification

`POST /api/auth/login` renvoie `{ accessToken, user }`. Envoyer ensuite le header
`Authorization: Bearer <accessToken>`. Toutes les routes exigent un token sauf celles marquées « public ».

Deux rôles : `member` (par défaut à l'inscription) et `admin`.

## Endpoints

### Auth (public)

| Méthode | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | `{ email, password (8+), firstName, lastName, phone? }` |
| POST | `/api/auth/login` | `{ email, password }` |

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
