# HopDrop - Spécifications Techniques

**Application de livraison collaborative**

*Documentation technique complète - Architecture, implémentation et roadmap*

*Dernière mise à jour : 27/12/2025*

---

## Table des matières

1. [Présentation Générale](#1-présentation-générale)
2. [Architecture Technique](#2-architecture-technique)
3. [Modèle de Données](#3-modèle-de-données)
4. [API Backend](#4-api-backend)
5. [Application Mobile](#5-application-mobile)
6. [Parcours Utilisateurs](#6-parcours-utilisateurs)
7. [Systèmes Critiques](#7-systèmes-critiques)
8. [État d'Avancement](#8-état-davancement)
9. [Intégrations Tierces](#9-intégrations-tierces)
10. [Configuration & Déploiement](#10-configuration--déploiement)
11. [Roadmap & Recommandations](#11-roadmap--recommandations)

---

# 1. Présentation Générale

## 1.1 Concept

HopDrop est une plateforme de mise en relation peer-to-peer entre **vendeurs** (particuliers souhaitant faire expédier leurs colis) et **livreurs** (particuliers effectuant ces expéditions contre rémunération).

## 1.2 Proposition de valeur

### Pour les vendeurs
- ✅ Pas d'emballage à gérer
- ✅ Pas de déplacement au point relais
- ✅ Service à domicile
- ✅ Prix fixe transparent (3-7€ selon taille)
- ✅ Validation en direct de l'emballage

### Pour les livreurs
- ✅ Rémunération flexible (80% du prix)
- ✅ Liberté de choix des missions
- ✅ Liberté du point de dépôt
- ✅ Délai confortable (12h pour déposer)

## 1.3 Workflow Standard

```
1. CRÉATION
   Vendeur crée un colis sur l'app
   └─> Informations: taille, point relais destination, créneau

2. MATCHING
   Système propose la mission aux livreurs proches
   └─> Livreur accepte la mission

3. RÉCUPÉRATION
   Livreur se rend chez le vendeur
   └─> Emballe l'article devant le vendeur
   └─> Prend photo de l'emballage
   └─> Vendeur valide la photo en direct
   └─> Statut: PICKED_UP

4. DÉPÔT
   Livreur dépose au point relais de son choix (12h max)
   └─> Upload preuve de dépôt (photo ticket/colis)
   └─> Timer 12h démarre pour confirmation vendeur
   └─> Statut: En attente confirmation

5. CONFIRMATION
   Vendeur confirme OU auto-confirmation après 12h
   └─> Paiement libéré vers le livreur
   └─> Option: noter le livreur
   └─> Statut: DELIVERED
```

## 1.4 Modèle Économique

### Tarification par taille

| Taille | Dimensions | Prix TTC | Commission plateforme | Paiement livreur |
|--------|------------|----------|----------------------|------------------|
| SMALL | < 30cm | 3,00 € | 0,60 € (20%) | 2,40 € |
| MEDIUM | 30-50cm | 4,00 € | 0,80 € (20%) | 3,20 € |
| LARGE | 50-80cm | 5,50 € | 1,10 € (20%) | 4,40 € |
| XLARGE | > 80cm | 7,00 € | 1,40 € (20%) | 5,60 € |

### Système de paiement

1. **Capture immédiate** : Le vendeur paie à la création du colis
2. **Escrow** : Montant bloqué jusqu'à confirmation de livraison
3. **Libération** :
   - Automatique après confirmation vendeur
   - OU auto-confirmation 12h après dépôt
4. **Transfert** : Vers compte Stripe Connect du livreur
5. **Payout** : Versement hebdomadaire sur compte bancaire livreur

---

# 2. Architecture Technique

## 2.1 Stack Technologique

### Backend
- **Runtime** : Node.js 20+
- **Framework** : Fastify 4.x
- **Langage** : TypeScript 5.x
- **ORM** : Prisma 5.x
- **Base de données** : PostgreSQL 15+ avec extension PostGIS
- **Authentification** : JWT (@fastify/jwt)
- **Validation** : Zod
- **Upload** : Cloudinary SDK

### Mobile
- **Framework** : React Native (Expo SDK 51)
- **Langage** : TypeScript 5.x
- **Navigation** : React Navigation 6
- **État global** : Zustand 4.x
- **UI** : React Native Paper 5.x
- **HTTP** : Axios
- **Maps** : React Native Maps (Google Maps)
- **Location** : Expo Location

### Services Externes
- **Paiements** : Stripe (Payment Intents + Connect)
- **Stockage** : Cloudinary
- **Push** : Firebase Cloud Messaging
- **Email** : Resend
- **Maps** : Google Maps Platform

## 2.2 Architecture Backend

```
backend/
├── src/
│   ├── app.ts                    # Point d'entrée, config Fastify
│   ├── config/
│   │   └── env.ts               # Gestion variables d'environnement
│   ├── modules/                 # Modules métier
│   │   ├── auth/               # Authentification JWT
│   │   ├── users/              # Gestion utilisateurs
│   │   ├── addresses/          # Adresses avec géocodage
│   │   ├── parcels/            # CRUD colis + pricing
│   │   ├── missions/           # Matching + tracking livreurs
│   │   ├── packaging/          # Confirmation emballage (nouveau)
│   │   ├── delivery/           # Confirmation dépôt + timer 12h (nouveau)
│   │   ├── payments/           # Stripe intégration
│   │   ├── reviews/            # Système de notation
│   │   ├── chat/               # Messagerie temps réel
│   │   ├── uploads/            # Upload Cloudinary
│   │   ├── notifications/      # Push + Email
│   │   ├── carrier-documents/  # Documents KYC
│   │   └── admin/              # Panel admin
│   └── shared/
│       ├── prisma.ts           # Client Prisma
│       ├── middlewares/        # Auth + Admin
│       └── services/           # Services partagés
├── prisma/
│   ├── schema.prisma           # Schéma base de données
│   └── migrations/             # Migrations SQL
└── package.json
```

## 2.3 Architecture Mobile

```
mobile/
├── src/
│   ├── components/
│   │   ├── carrier/           # Composants livreur
│   │   ├── vendor/            # Composants vendeur
│   │   ├── common/            # Composants partagés
│   │   └── forms/             # Formulaires
│   ├── screens/
│   │   ├── auth/              # Login, register, reset
│   │   ├── vendor/            # Écrans vendeur
│   │   ├── carrier/           # Écrans livreur
│   │   ├── shared/            # Profil, adresses, settings
│   │   ├── chat/              # Chat
│   │   └── admin/             # Admin dashboard
│   ├── navigation/
│   │   ├── AppNavigator.tsx   # Navigation principale
│   │   └── types.ts           # Types navigation
│   ├── services/
│   │   ├── api.ts             # Client API Axios
│   │   ├── location.ts        # Géolocalisation
│   │   └── notifications.ts   # Push notifications
│   ├── stores/                # État global Zustand
│   │   ├── authStore.ts
│   │   ├── parcelStore.ts
│   │   └── missionStore.ts
│   ├── types/
│   │   └── index.ts           # Types TypeScript
│   └── theme/
│       └── index.ts           # Thème Material Design
└── package.json
```

---

# 3. Modèle de Données

## 3.1 Schéma Relationnel

```prisma
// UTILISATEURS & AUTHENTIFICATION
User {
  id: String @uuid
  email: String @unique
  password: String (hashed bcrypt)
  firstName: String
  lastName: String
  phone: String?
  avatarUrl: String?
  role: UserRole (VENDOR|CARRIER|BOTH|ADMIN)
  fcmToken: String?
  emailVerified: Boolean @default(false)

  // Relations
  addresses: Address[]
  parcels: Parcel[] (as vendor)
  missions: Mission[] (as carrier)
  carrierProfile: CarrierProfile?
  reviewsGiven: Review[]
  reviewsReceived: Review[]
  conversations: Conversation[]
  messages: Message[]
  refreshTokens: RefreshToken[]
}

RefreshToken {
  id: String @uuid
  token: String @unique
  userId: String
  expiresAt: DateTime
  user: User
}

// ADRESSES
Address {
  id: String @uuid
  userId: String
  label: String (ex: "Domicile", "Bureau")
  street: String
  city: String
  postalCode: String
  country: String @default("FR")
  latitude: Float?
  longitude: Float?
  isDefault: Boolean @default(false)
  isTemporary: Boolean @default(false)

  user: User
  pickupParcels: Parcel[] (as pickup address)
  dropoffParcels: Parcel[] (as dropoff address)
}

// COLIS
Parcel {
  id: String @uuid
  vendorId: String
  pickupAddressId: String
  dropoffName: String (ex: "Point Relais Carrefour")
  dropoffAddress: String
  size: ParcelSize (SMALL|MEDIUM|LARGE|XLARGE)
  weight: Float? (en kg)
  fragile: Boolean @default(false)
  carrier: Carrier (VINTED|MONDIAL_RELAY|COLISSIMO|etc.)
  trackingNumber: String?
  shippingLabelUrl: String? (bordereau fourni par vendeur)
  itemPhotoUrl: String? (pour analyse IA future)
  itemCategory: String? (catégorie détectée par IA)
  suggestedSize: ParcelSize? (suggestion IA)
  description: String?
  price: Float (3.00-7.00€)
  platformFee: Float (20% du prix)
  carrierPayout: Float (80% du prix)
  status: ParcelStatus
  pickupMode: PickupMode (SCHEDULED|IMMEDIATE)
  pickupDate: DateTime?
  pickupTimeSlotStart: DateTime?
  pickupTimeSlotEnd: DateTime?
  pickupCode: String? (code à 6 chiffres)
  qrCode: String? (pour scan rapide)
  assignedCarrierId: String?
  expiresAt: DateTime?

  // Relations
  vendor: User
  pickupAddress: Address
  assignedCarrier: User?
  mission: Mission?
  transaction: Transaction?
  reviews: Review[]
  conversation: Conversation?
}

enum ParcelStatus {
  PENDING      // Créé, en attente acceptation livreur
  ACCEPTED     // Livreur assigné
  IN_PROGRESS  // Livreur en route (optionnel)
  PICKED_UP    // Emballage validé, colis récupéré
  DELIVERED    // Preuve de dépôt validée
  CANCELLED    // Annulé
  EXPIRED      // Expiré sans prise en charge
}

// MISSIONS (Suivi livreur)
Mission {
  id: String @uuid
  parcelId: String @unique
  carrierId: String
  status: MissionStatus
  acceptedAt: DateTime
  startedAt: DateTime? (départ vers vendeur)
  arrivedAt: DateTime? (arrivée chez vendeur)

  // PACKAGING FLOW (nouveau système 12h)
  packagingPhotoUrl: String?
  packagingConfirmedAt: DateTime? (livreur confirme)
  vendorPackagingConfirmedAt: DateTime? (vendeur confirme)
  packagingRejectedAt: DateTime?
  packagingRejectionReason: String?

  pickedUpAt: DateTime? (après validation emballage)

  // DELIVERY FLOW (nouveau système 12h)
  deliveredAt: DateTime? (dépôt effectué)
  deliveryProofUrl: String? (photo preuve)
  deliveryConfirmationDeadline: DateTime? (12h après dépôt)
  clientConfirmedDeliveryAt: DateTime?
  clientContestedAt: DateTime?
  contestReason: String?
  autoConfirmed: Boolean @default(false)

  proofPhotoUrl: String? (LEGACY - à supprimer)
  completedAt: DateTime?
  cancelledAt: DateTime?
  cancellationReason: String?
  estimatedArrival: DateTime? (calculé, non persisté)

  parcel: Parcel
  carrier: User
}

enum MissionStatus {
  ACCEPTED     // Mission acceptée
  IN_PROGRESS  // En route vers vendeur
  PICKED_UP    // Colis récupéré (après validation emballage)
  DELIVERED    // Déposé et confirmé
  CANCELLED    // Annulée
}

// PROFIL LIVREUR
CarrierProfile {
  id: String @uuid
  userId: String @unique
  available: Boolean @default(true)
  currentLatitude: Float?
  currentLongitude: Float?
  vehicleType: VehicleType
  maxDistance: Int @default(10) (km)
  hasPrinter: Boolean @default(false)
  totalDeliveries: Int @default(0)
  averageRating: Float @default(0)
  balance: Float @default(0) (cagnotte)
  stripeAccountId: String? (Stripe Connect)
  stripeAccountStatus: String?

  user: User
  documents: CarrierDocument[]
  transactions: Transaction[]
}

// DOCUMENTS KYC
CarrierDocument {
  id: String @uuid
  carrierId: String
  type: DocumentType
  url: String
  status: String @default("pending")
  uploadedAt: DateTime
  reviewedAt: DateTime?
  reviewedBy: String?
  rejectionReason: String?

  carrier: CarrierProfile
}

enum DocumentType {
  ID_CARD_FRONT
  ID_CARD_BACK
  KBIS (pour auto-entrepreneurs)
  VEHICLE_REGISTRATION
}

// PAIEMENTS
Transaction {
  id: String @uuid
  parcelId: String
  carrierId: String?
  amount: Float
  platformFee: Float
  carrierPayout: Float?
  stripePaymentIntentId: String?
  stripeTransferId: String?
  status: String (pending|completed|failed|refunded)
  type: String (payment|payout|refund)

  parcel: Parcel
  carrier: CarrierProfile?
}

// AVIS
Review {
  id: String @uuid
  parcelId: String
  reviewerId: String (qui note)
  revieweeId: String (qui est noté)
  rating: Int (1-5)
  comment: String?

  parcel: Parcel
  reviewer: User
  reviewee: User
}

// CHAT
Conversation {
  id: String @uuid
  parcelId: String @unique
  vendorId: String
  carrierId: String
  lastMessageAt: DateTime?

  parcel: Parcel
  vendor: User
  carrier: User
  messages: Message[]
}

Message {
  id: String @uuid
  conversationId: String
  senderId: String
  content: String
  read: Boolean @default(false)

  conversation: Conversation
  sender: User
}
```

## 3.2 Enums et Constantes

### Rôles Utilisateur
```typescript
enum UserRole {
  VENDOR  // Peut créer des colis
  CARRIER // Peut accepter des missions
  BOTH    // Les deux
  ADMIN   // Administrateur
}
```

### Tailles de Colis
```typescript
enum ParcelSize {
  SMALL   // < 30cm - 3€
  MEDIUM  // 30-50cm - 4€
  LARGE   // 50-80cm - 5.50€
  XLARGE  // > 80cm - 7€
}
```

### Transporteurs Supportés
```typescript
enum Carrier {
  VINTED
  MONDIAL_RELAY
  COLISSIMO
  CHRONOPOST
  RELAIS_COLIS
  UPS
  DHL
  FEDEX
  OTHER
}
```

### Types de Véhicule
```typescript
enum VehicleType {
  NONE     // À pied
  BIKE     // Vélo
  SCOOTER  // Scooter/moto
  CAR      // Voiture
}
```

---

# 4. API Backend

## 4.1 Endpoints d'Authentification

### POST /auth/register
**Inscription d'un nouvel utilisateur**

```typescript
Request Body:
{
  email: string
  password: string (min 8 chars)
  firstName: string
  lastName: string
  phone?: string
  role: "VENDOR" | "CARRIER" | "BOTH"
}

Response: {
  user: User
  accessToken: string
  refreshToken: string
}
```

### POST /auth/login
**Connexion**

```typescript
Request Body:
{
  email: string
  password: string
}

Response: {
  user: User
  accessToken: string
  refreshToken: string
}
```

### POST /auth/refresh
**Rafraîchir le token d'accès**

```typescript
Request Body:
{
  refreshToken: string
}

Response: {
  accessToken: string
  refreshToken: string
}
```

### POST /auth/forgot-password
**Demande de réinitialisation de mot de passe**

```typescript
Request Body:
{
  email: string
}

Response: {
  message: "Email envoyé" (simulé)
}
```

### GET /auth/me
**Obtenir l'utilisateur connecté**

```typescript
Headers: Authorization: Bearer {token}

Response: User
```

## 4.2 Endpoints Parcels

### POST /parcels
**Créer un colis**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  pickupAddressId: string
  dropoffName: string
  dropoffAddress: string
  size: ParcelSize
  weight?: number
  fragile?: boolean
  carrier: Carrier
  trackingNumber?: string
  shippingLabelUrl?: string
  description?: string
  pickupMode: "SCHEDULED" | "IMMEDIATE"
  pickupDate?: string (ISO 8601)
  pickupTimeSlotStart?: string
  pickupTimeSlotEnd?: string
}

Response: {
  parcel: Parcel
  clientSecret: string (Stripe PaymentIntent)
}
```

**Note** : Le prix est calculé automatiquement selon la taille

### GET /parcels
**Lister les colis du vendeur**

```typescript
Headers: Authorization: Bearer {token}

Query Params:
  status?: ParcelStatus (filtre optionnel)

Response: {
  parcels: Parcel[]
}
```

### GET /parcels/:id
**Détails d'un colis**

```typescript
Headers: Authorization: Bearer {token}

Response: Parcel
```

### DELETE /parcels/:id
**Annuler un colis**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  message: "Colis annulé"
}
```

**Restrictions** : Impossible si statut !== PENDING

## 4.3 Endpoints Missions

### GET /missions/available
**Missions disponibles pour un livreur**

```typescript
Headers: Authorization: Bearer {token}

Query Params:
  latitude: number
  longitude: number
  maxDistance?: number (défaut: profil livreur)

Response: {
  missions: Array<{
    parcel: Parcel
    distance: number (km)
    estimatedEarnings: number (€)
  }>
}
```

### POST /missions/:parcelId/accept
**Accepter une mission**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  mission: Mission
  parcel: Parcel
}
```

**Side effects** :
- Parcel.status → ACCEPTED
- Parcel.assignedCarrierId → carrierId
- Mission créée
- Notification push au vendeur

### GET /missions/current
**Missions en cours du livreur**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  missions: Mission[] (include parcel + vendor)
}
```

### POST /missions/:id/depart
**Signaler le départ vers le vendeur**

```typescript
Headers: Authorization: Bearer {token}

Response: Mission

Side effects:
- mission.status → IN_PROGRESS
- mission.startedAt → now()
- Notification vendeur
```

### POST /missions/:id/arrived
**Signaler l'arrivée chez le vendeur**

```typescript
Headers: Authorization: Bearer {token}

Response: Mission

Side effects:
- mission.arrivedAt → now()
- Notification vendeur
```

### POST /missions/:id/cancel
**Annuler une mission**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  reason: string
}

Response: Mission

Side effects:
- mission.status → CANCELLED
- parcel.status → PENDING
- parcel.assignedCarrierId → null
- Notification vendeur
```

## 4.4 Endpoints Packaging (Système de confirmation emballage)

### POST /packaging/carrier-confirm
**Livreur confirme l'emballage avec photo**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  missionId: string
  photoUrl: string (Cloudinary URL)
}

Response: {
  success: true
  message: "Photo d'emballage envoyée au vendeur"
}

Side effects:
- mission.packagingPhotoUrl → photoUrl
- mission.packagingConfirmedAt → now()
- Notification push au vendeur
```

### POST /packaging/vendor-confirm
**Vendeur valide l'emballage**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
}

Response: {
  success: true
  message: "Emballage validé !"
}

Side effects:
- mission.vendorPackagingConfirmedAt → now()
- parcel.status → PICKED_UP
- mission.status → PICKED_UP
- mission.pickedUpAt → now()
- Notification livreur
```

### POST /packaging/vendor-reject
**Vendeur refuse l'emballage**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
  reason: string
}

Response: {
  success: true
  message: "Emballage refusé. Le livreur doit recommencer."
}

Side effects:
- mission.packagingRejectedAt → now()
- mission.packagingRejectionReason → reason
- mission.packagingPhotoUrl → null
- mission.packagingConfirmedAt → null
- Notification livreur avec raison
```

### GET /packaging/status/:parcelId
**Statut de l'emballage**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  status: "PENDING" | "AWAITING_VENDOR" | "CONFIRMED" | "REJECTED"
  photoUrl?: string
  confirmedAt?: DateTime
  rejectedAt?: DateTime
  rejectionReason?: string
}
```

## 4.5 Endpoints Delivery (Système de confirmation dépôt 12h)

### POST /delivery/confirm
**Livreur confirme le dépôt avec preuve**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  missionId: string
  proofUrl: string (photo du ticket/colis déposé)
}

Response: {
  success: true
  message: "Preuve de dépôt enregistrée. Le client a 12h pour confirmer."
  confirmationDeadline: DateTime
}

Side effects:
- mission.deliveredAt → now()
- mission.deliveryProofUrl → proofUrl
- mission.deliveryConfirmationDeadline → now() + 12h
- Notification push au vendeur (avec photo)
```

### POST /delivery/client-confirm
**Client confirme la réception**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
  rating?: number (1-5, optionnel)
  comment?: string (optionnel)
}

Response: {
  success: true
  message: "Livraison confirmée ! Le paiement va être traité."
}

Side effects:
- mission.status → DELIVERED
- mission.clientConfirmedDeliveryAt → now()
- parcel.status → DELIVERED
- carrierProfile.totalDeliveries += 1
- Si rating fourni: création Review
- Notification livreur
- TODO: Capture paiement Stripe
- TODO: Transfer vers Stripe Connect livreur
```

### POST /delivery/client-contest
**Client conteste la livraison**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
  reason: string
}

Response: {
  success: true
  message: "Contestation enregistrée. Notre équipe va examiner le dossier."
}

Side effects:
- mission.clientContestedAt → now()
- mission.contestReason → reason
- Notification livreur
- TODO: Création ticket support
```

### GET /delivery/status/:parcelId
**Statut du dépôt**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  status: "PENDING" | "AWAITING_CONFIRMATION" | "CONFIRMED" | "CONTESTED" | "AUTO_CONFIRMED"
  deliveredAt?: DateTime
  proofUrl?: string
  confirmationDeadline?: DateTime
  hoursRemaining?: number
  clientConfirmedAt?: DateTime
  contestedAt?: DateTime
  contestReason?: string
  autoConfirmed: boolean
}
```

### POST /delivery/auto-confirm (CRON)
**Auto-confirme les livraisons expirées**

```typescript
Headers: x-cron-secret: {CRON_SECRET}

Response: {
  confirmed: number (nombre de confirmations)
}

Logic:
- Trouve toutes les missions avec:
  - deliveryConfirmationDeadline < now()
  - clientConfirmedDeliveryAt = null
  - clientContestedAt = null
- Pour chaque mission:
  - mission.status → DELIVERED
  - mission.autoConfirmed → true
  - parcel.status → DELIVERED
  - carrierProfile.totalDeliveries += 1
  - Notifications vendeur + livreur
  - TODO: Capture + Transfer paiement
```

**Configuration Scheduler** : Cron job à exécuter toutes les 15 minutes

## 4.6 Endpoints Payments

### POST /payments/create-intent
**Créer un PaymentIntent Stripe**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
}

Response: {
  clientSecret: string
  amount: number (centimes)
}
```

**Note** : Appelé automatiquement lors de POST /parcels

### POST /payments/confirm
**Confirmer un paiement**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
  paymentIntentId: string
}

Response: {
  success: true
  transaction: Transaction
}

Side effects:
- Transaction créée avec status "completed"
```

### POST /payments/connect/create
**Créer un compte Stripe Connect pour livreur**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  country: string (défaut "FR")
  email: string
  businessType: "individual" | "company"
}

Response: {
  accountId: string
  onboardingUrl: string (lien vers Stripe)
}
```

### GET /payments/connect/status
**Statut du compte Stripe Connect**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  accountId: string
  detailsSubmitted: boolean
  chargesEnabled: boolean
  payoutsEnabled: boolean
}
```

### GET /payments/transactions
**Historique des transactions**

```typescript
Headers: Authorization: Bearer {token}

Query Params:
  page?: number
  limit?: number

Response: {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

## 4.7 Endpoints Reviews

### POST /reviews
**Créer un avis**

```typescript
Headers: Authorization: Bearer {token}

Request Body:
{
  parcelId: string
  rating: number (1-5)
  comment?: string (max 500 chars)
}

Response: Review

Side effects:
- Si reviewee est livreur: mise à jour carrierProfile.averageRating
```

**Règles** :
- Parcel doit être DELIVERED
- Un seul avis par utilisateur par colis
- Vendeur → note livreur
- Livreur → note vendeur

### GET /reviews/received
**Mes avis reçus**

```typescript
Headers: Authorization: Bearer {token}

Query Params:
  page?: number
  limit?: number

Response: {
  reviews: Review[]
  stats: {
    totalReviews: number
    averageRating: number
    ratingDistribution: { 1: number, 2: number, 3: number, 4: number, 5: number }
  }
  pagination: { ... }
}
```

### GET /reviews/given
**Mes avis donnés**

```typescript
Headers: Authorization: Bearer {token}

Response: {
  reviews: Review[]
  pagination: { ... }
}
```

## 4.8 Endpoints Admin

### GET /admin/stats
**Statistiques plateforme**

```typescript
Headers: Authorization: Bearer {token}
Middleware: admin.middleware.ts

Response: {
  totalUsers: number
  totalVendors: number
  totalCarriers: number
  totalParcels: number
  totalDeliveries: number
  pendingDocuments: number
  revenue: number
}
```

### GET /admin/documents/pending
**Documents en attente de validation**

```typescript
Headers: Authorization: Bearer {token}
Middleware: admin.middleware.ts

Response: CarrierDocument[]
```

### POST /admin/documents/:documentId/approve
**Approuver un document**

```typescript
Headers: Authorization: Bearer {token}
Middleware: admin.middleware.ts

Response: CarrierDocument

Side effects:
- document.status → "approved"
- document.reviewedAt → now()
- Notification au livreur
```

### POST /admin/documents/:documentId/reject
**Refuser un document**

```typescript
Headers: Authorization: Bearer {token}
Middleware: admin.middleware.ts

Request Body:
{
  reason: string
}

Response: CarrierDocument

Side effects:
- document.status → "rejected"
- document.rejectionReason → reason
- Notification au livreur
```

## 4.9 Autres Endpoints

### Addresses
- GET /addresses - Liste
- POST /addresses - Créer
- PUT /addresses/:id - Modifier
- DELETE /addresses/:id - Supprimer
- POST /addresses/geocode - Géocoder une adresse

### Chat
- GET /chat/conversations - Liste conversations
- GET /chat/parcel/:parcelId - Conversation pour un colis
- POST /chat/:conversationId/messages - Envoyer message
- POST /chat/:conversationId/read - Marquer comme lu

### Uploads
- POST /uploads - Upload fichier vers Cloudinary
- GET /uploads/signature - Signature pour upload direct
- DELETE /uploads/:publicId - Supprimer fichier

### Notifications
- POST /notifications/test-push - Test notification push
- POST /notifications/test-email - Test email

---

# 5. Application Mobile

## 5.1 Navigation

### Structure de Navigation

```typescript
// Navigation principale (Stack Navigator)
AppNavigator
├── Auth Stack (si non connecté)
│   ├── LoginScreen
│   ├── RegisterScreen
│   └── ForgotPasswordScreen
│
└── Main Stack (si connecté)
    ├── Vendor Tab (si role = VENDOR ou BOTH)
    │   ├── VendorHomeScreen (liste colis)
    │   ├── CreateParcelScreen
    │   ├── ParcelDetailScreen
    │   ├── VendorHistoryScreen
    │   └── TrackingScreen
    │
    ├── Carrier Tab (si role = CARRIER ou BOTH)
    │   ├── CarrierHomeScreen (carte missions)
    │   ├── AvailableMissionsScreen (liste)
    │   ├── MissionDetailScreen
    │   ├── ActiveMissionsScreen
    │   ├── CarrierHistoryScreen
    │   ├── CarrierProfileScreen
    │   └── CarrierDocumentsScreen
    │
    ├── Shared Screens
    │   ├── ProfileScreen
    │   ├── AddressesScreen
    │   ├── SettingsScreen
    │   ├── ChatScreen
    │   └── ReviewScreen
    │
    └── Admin Tab (si role = ADMIN)
        └── AdminDashboardScreen
```

## 5.2 Stores (Zustand)

### authStore.ts
```typescript
interface AuthStore {
  user: User | null
  token: string | null
  refreshToken: string | null

  login: (email, password) => Promise<void>
  register: (data) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
  updateProfile: (data) => Promise<void>
}
```

### parcelStore.ts
```typescript
interface ParcelStore {
  parcels: Parcel[]
  currentParcel: Parcel | null
  isLoading: boolean

  fetchParcels: (status?) => Promise<void>
  fetchParcel: (id) => Promise<void>
  createParcel: (data) => Promise<Parcel>
  cancelParcel: (id) => Promise<void>
}
```

### missionStore.ts
```typescript
interface MissionStore {
  availableMissions: Mission[]
  currentMissions: Mission[]
  isLoading: boolean

  fetchAvailableMissions: (location) => Promise<void>
  fetchCurrentMissions: () => Promise<void>
  acceptMission: (parcelId) => Promise<void>
  cancelMission: (id, reason) => Promise<void>
  updateMissionStatus: (id, status) => Promise<void>
}
```

## 5.3 Composants Clés

### Vendor Components

#### PackagingConfirmationModal.tsx
**Modal de validation d'emballage côté vendeur**

```typescript
Props:
  visible: boolean
  photoUrl: string
  onConfirm: () => void
  onReject: (reason: string) => void
  onDismiss: () => void

Affiche:
- Photo de l'emballage prise par le livreur
- Bouton "Valider l'emballage"
- Bouton "Refuser" (avec raison)
```

### Carrier Components

#### CarrierPackagingModal.tsx
**Modal de confirmation d'emballage côté livreur**

```typescript
Props:
  visible: boolean
  missionId: string
  onConfirm: (photoUrl: string) => void
  onDismiss: () => void

Fonctionnalités:
- Capture photo avec caméra
- Upload vers Cloudinary
- Envoi au backend
```

#### DeliveryProofModal.tsx
**Modal de preuve de dépôt**

```typescript
Props:
  visible: boolean
  missionId: string
  onConfirm: (proofUrl: string) => void
  onDismiss: () => void

Fonctionnalités:
- Capture photo du ticket/colis déposé
- Upload vers Cloudinary
- Envoi au backend
- Déclenche timer 12h
```

#### CurrentMissionCard.tsx
**Carte d'affichage mission en cours**

```typescript
Props:
  mission: Mission
  onPress: () => void

Affiche:
- Adresse pickup
- Statut mission
- Boutons d'action selon statut
```

### Common Components

#### DeliveryDeadlineBadge.tsx
**Badge du timer 12h**

```typescript
Props:
  confirmationDeadline: DateTime
  autoConfirmed: boolean

Affiche:
- Temps restant (ex: "8h 23min restantes")
- Change de couleur selon urgence
- "Confirmé automatiquement" si expiré
```

#### PackagingStatusBadge.tsx
**Badge statut emballage**

```typescript
Props:
  packagingStatus: string

Affiche:
- "En attente photo" (awaiting photo)
- "En attente validation vendeur" (awaiting vendor)
- "Validé ✓" (confirmed)
- "Refusé" (rejected)
```

#### ParcelCard.tsx
**Carte colis**

```typescript
Props:
  parcel: Parcel
  onPress: () => void

Affiche:
- Taille + prix
- Adresse pickup
- Statut
- Date créneau
```

---

# 6. Parcours Utilisateurs

## 6.1 Parcours Vendeur Complet

### 1. Création du Compte
```
VendorHomeScreen.tsx
└─> LoginScreen ou RegisterScreen
    └─> Saisie: email, password, firstName, lastName, role=VENDOR
    └─> POST /auth/register
    └─> Connexion automatique
```

### 2. Ajout d'une Adresse
```
ProfileScreen → AddressesScreen
└─> Saisie: label, street, city, postalCode
└─> POST /addresses/geocode (obtenir lat/long)
└─> POST /addresses
```

### 3. Création d'un Colis
```
CreateParcelScreen.tsx
└─> Formulaire:
    - Adresse pickup (sélection dans liste)
    - Nom point relais destination
    - Adresse complète destination
    - Taille (SMALL/MEDIUM/LARGE/XLARGE)
    - Transporteur (Vinted, Mondial Relay, etc.)
    - Numéro de suivi
    - Upload bordereau (optionnel)
    - Mode: SCHEDULED ou IMMEDIATE
    - Si SCHEDULED: date + créneau horaire
└─> POST /parcels
    └─> Création PaymentIntent Stripe
    └─> Affichage formulaire paiement
    └─> Confirmation paiement
    └─> Parcel.status = PENDING
```

### 4. Attente Acceptation
```
VendorHomeScreen
└─> Liste colis avec filtre "En attente"
└─> Notification push quand livreur accepte
└─> Parcel.status → ACCEPTED
```

### 5. Suivi de la Mission
```
ParcelDetailScreen.tsx
└─> Affichage:
    - Info livreur (nom, photo, note)
    - Statut mission
    - Bouton "Suivre en temps réel" → TrackingScreen

TrackingScreen.tsx
└─> Carte avec:
    - Position livreur (mise à jour temps réel)
    - Position vendeur
    - ETA (calculé via Google Directions API)
```

### 6. Validation Emballage
```
ParcelDetailScreen
└─> Notification: "Le livreur a terminé l'emballage"
└─> PackagingConfirmationModal s'affiche automatiquement
    └─> Affiche photo de l'emballage
    └─> Deux options:

        A) VALIDER
        └─> POST /packaging/vendor-confirm
        └─> Parcel.status → PICKED_UP
        └─> Notification au livreur

        B) REFUSER
        └─> Saisie raison
        └─> POST /packaging/vendor-reject
        └─> Livreur doit recommencer
```

### 7. Notification Dépôt
```
ParcelDetailScreen
└─> Notification: "Colis déposé !"
└─> Affichage modal avec:
    - Photo de preuve
    - Timer 12h (DeliveryDeadlineBadge)
    - Bouton "Confirmer réception"
    - Bouton "Contester"
```

### 8. Confirmation Dépôt
```
ParcelDetailScreen → Modal Confirmation
└─> Deux options:

    A) CONFIRMER
    └─> Optionnel: noter le livreur (1-5 étoiles + commentaire)
    └─> POST /delivery/client-confirm { rating?, comment? }
    └─> Parcel.status → DELIVERED
    └─> Paiement libéré vers livreur
    └─> Notification au livreur

    B) CONTESTER
    └─> Saisie raison
    └─> POST /delivery/client-contest
    └─> Création ticket support
    └─> Notification au livreur

    C) AUCUNE ACTION
    └─> Auto-confirmation après 12h (cron job)
    └─> Parcel.status → DELIVERED
    └─> Paiement libéré vers livreur
```

## 6.2 Parcours Livreur Complet

### 1. Création du Compte
```
RegisterScreen
└─> Saisie: email, password, firstName, lastName, role=CARRIER
└─> POST /auth/register
└─> CarrierProfile créé automatiquement
```

### 2. Configuration Profil
```
CarrierProfileScreen.tsx
└─> Mise à jour:
    - Type de véhicule
    - Rayon d'action (maxDistance)
    - Possède imprimante
└─> PUT /carrier/settings
```

### 3. Upload Documents KYC
```
CarrierDocumentsScreen.tsx
└─> Upload (obligatoire):
    - Pièce d'identité recto
    - Pièce d'identité verso
    - (Optionnel) Carte grise si véhicule
    - (Optionnel) KBIS si auto-entrepreneur
└─> POST /carrier/documents
└─> Status: "pending"
└─> Attente validation admin
```

### 4. Activation Disponibilité
```
CarrierHomeScreen ou CarrierProfileScreen
└─> Toggle "Disponible"
└─> PUT /carrier/availability { available: true }
└─> Partage position GPS
└─> PUT /carrier/location { latitude, longitude }
```

### 5. Recherche de Missions
```
CarrierHomeScreen (Map) ou AvailableMissionsScreen (List)
└─> GET /missions/available?latitude=X&longitude=Y
└─> Affichage missions dans rayon maxDistance
└─> Filtres: distance, earnings, pickupMode
```

### 6. Acceptation Mission
```
MissionDetailScreen
└─> Bouton "Accepter la mission"
└─> POST /missions/:parcelId/accept
└─> Mission créée
└─> Parcel.status → ACCEPTED
└─> Notification au vendeur
```

### 7. Départ vers Vendeur
```
ActiveMissionsScreen → MissionDetailScreen
└─> Bouton "Je pars"
└─> POST /missions/:id/depart
└─> Mission.status → IN_PROGRESS
└─> Notification au vendeur
└─> Début tracking GPS temps réel
```

### 8. Arrivée chez Vendeur
```
MissionDetailScreen
└─> Bouton "Je suis arrivé"
└─> POST /missions/:id/arrived
└─> Notification au vendeur
```

### 9. Emballage et Photo
```
MissionDetailScreen
└─> Bouton "Terminer l'emballage"
└─> CarrierPackagingModal s'ouvre
    └─> Capture photo du colis emballé
    └─> Upload vers Cloudinary
    └─> POST /packaging/carrier-confirm
    └─> Notification au vendeur
    └─> Attente validation vendeur
```

### 10. Validation Emballage par Vendeur
```
Notification: "Emballage validé !"
OU
Notification: "Emballage refusé: [raison]"
└─> Si refusé: recommencer emballage
└─> Si validé:
    └─> Parcel.status → PICKED_UP
    └─> Mission.status → PICKED_UP
    └─> Livreur peut partir déposer
```

### 11. Dépôt du Colis
```
Livreur dépose au point relais de son choix (12h max)
└─> MissionDetailScreen
    └─> Bouton "Confirmer le dépôt"
    └─> DeliveryProofModal s'ouvre
        └─> Capture photo ticket/colis déposé
        └─> Upload vers Cloudinary
        └─> POST /delivery/confirm
        └─> Timer 12h démarre
        └─> Notification au vendeur
```

### 12. Confirmation Client
```
Notification: "Client a confirmé la livraison !"
OU
Notification: "Livraison auto-confirmée" (12h expirées)
OU
Notification: "Le client conteste la livraison: [raison]"

└─> Si confirmé:
    └─> Parcel.status → DELIVERED
    └─> Mission.status → DELIVERED
    └─> CarrierProfile.totalDeliveries += 1
    └─> CarrierProfile.balance += carrierPayout
    └─> Paiement transféré vers Stripe Connect
    └─> Peut être noté par le client
```

---

# 7. Systèmes Critiques

## 7.1 Système de Confirmation d'Emballage

### Vue d'ensemble
Système de double validation pour garantir la qualité de l'emballage avant récupération du colis.

### Workflow

```
1. Livreur termine emballage
   └─> Prend photo
   └─> POST /packaging/carrier-confirm
   └─> mission.packagingPhotoUrl = url
   └─> mission.packagingConfirmedAt = now()

2. Push notification au vendeur
   └─> "Le livreur a terminé l'emballage"

3. Vendeur ouvre ParcelDetailScreen
   └─> PackagingConfirmationModal s'affiche auto
   └─> Affiche photo

4. Vendeur choisit:

   A) VALIDER
      └─> POST /packaging/vendor-confirm
      └─> mission.vendorPackagingConfirmedAt = now()
      └─> parcel.status = PICKED_UP
      └─> mission.status = PICKED_UP
      └─> mission.pickedUpAt = now()
      └─> Push notification au livreur

   B) REFUSER
      └─> Saisit raison (ex: "Emballage insuffisant")
      └─> POST /packaging/vendor-reject
      └─> mission.packagingRejectedAt = now()
      └─> mission.packagingRejectionReason = raison
      └─> mission.packagingPhotoUrl = null (reset)
      └─> mission.packagingConfirmedAt = null (reset)
      └─> Push notification au livreur avec raison
      └─> Livreur doit recommencer
```

### Statuts Packaging

```typescript
GET /packaging/status/:parcelId

Retourne:
{
  status: "PENDING" | "AWAITING_VENDOR" | "CONFIRMED" | "REJECTED"
}

Logique:
- PENDING: mission.packagingConfirmedAt = null
- AWAITING_VENDOR: mission.packagingConfirmedAt != null && vendorPackagingConfirmedAt = null
- CONFIRMED: mission.vendorPackagingConfirmedAt != null
- REJECTED: mission.packagingRejectedAt != null
```

### Composants Mobiles

#### Livreur
```typescript
// mobile/src/components/carrier/CarrierPackagingModal.tsx
<CarrierPackagingModal
  visible={showPackagingModal}
  missionId={mission.id}
  onConfirm={handlePackagingConfirm}
  onDismiss={() => setShowPackagingModal(false)}
/>

function handlePackagingConfirm(photoUrl: string) {
  await api.carrierConfirmPackaging(mission.id, photoUrl)
  // Attente validation vendeur
}
```

#### Vendeur
```typescript
// mobile/src/components/vendor/PackagingConfirmationModal.tsx
<PackagingConfirmationModal
  visible={showPackagingModal}
  photoUrl={packagingPhotoUrl}
  onConfirm={handlePackagingConfirm}
  onReject={handlePackagingReject}
  onDismiss={() => setShowPackagingModal(false)}
/>
```

### Badge Statut

```typescript
// mobile/src/components/common/PackagingStatusBadge.tsx
<PackagingStatusBadge packagingStatus={status} />

Affichage:
- "En attente photo" (orange)
- "En attente validation vendeur" (blue)
- "Validé ✓" (green)
- "Refusé - Raison: ..." (red)
```

## 7.2 Système de Confirmation de Dépôt (Timer 12h)

### Vue d'ensemble
Système de confirmation avec délai de 12h permettant au vendeur de valider la livraison, avec auto-confirmation automatique.

### Workflow Détaillé

```
1. Livreur dépose le colis
   └─> Prend photo du ticket/colis déposé
   └─> POST /delivery/confirm
   └─> mission.deliveredAt = now()
   └─> mission.deliveryProofUrl = photoUrl
   └─> mission.deliveryConfirmationDeadline = now() + 12h

2. Push notification au vendeur
   └─> "Colis déposé !"
   └─> Avec photo de preuve

3. Vendeur ouvre ParcelDetailScreen
   └─> Modal confirmation s'affiche
   └─> Affiche:
      - Photo de preuve
      - Timer 12h (DeliveryDeadlineBadge)
      - Bouton "Confirmer"
      - Bouton "Contester"

4. Vendeur choisit (dans les 12h):

   A) CONFIRMER
      └─> POST /delivery/client-confirm
         {
           parcelId,
           rating?: number,    // Optionnel
           comment?: string    // Optionnel
         }
      └─> mission.status = DELIVERED
      └─> mission.clientConfirmedDeliveryAt = now()
      └─> parcel.status = DELIVERED
      └─> carrierProfile.totalDeliveries += 1
      └─> Si rating fourni: création Review
      └─> carrierProfile.averageRating recalculé
      └─> Push notification au livreur
      └─> TODO: Capture paiement Stripe
      └─> TODO: Transfer vers Stripe Connect

   B) CONTESTER
      └─> Saisit raison
      └─> POST /delivery/client-contest
      └─> mission.clientContestedAt = now()
      └─> mission.contestReason = raison
      └─> Push notification au livreur
      └─> TODO: Création ticket support
      └─> Blocage du paiement

   C) AUCUNE ACTION (12h expirées)
      └─> Cron job exécuté toutes les 15min
      └─> POST /delivery/auto-confirm (interne)
      └─> Logique identique à A) CONFIRMER
      └─> mission.autoConfirmed = true
      └─> Notifications aux deux parties
```

### Auto-Confirmation (Scheduler)

**Fichier** : `backend/src/modules/delivery/delivery.scheduler.ts`

```typescript
// Fonction exécutée par cron toutes les 15 minutes
async function autoConfirmExpiredDeliveries() {
  const now = new Date()

  // Trouver missions expirées
  const expiredMissions = await prisma.mission.findMany({
    where: {
      deliveryConfirmationDeadline: { lt: now },
      clientConfirmedDeliveryAt: null,
      clientContestedAt: null,
    },
    include: { parcel: true, carrier: true }
  })

  for (const mission of expiredMissions) {
    // Mise à jour mission
    await prisma.mission.update({
      where: { id: mission.id },
      data: {
        status: 'DELIVERED',
        autoConfirmed: true,
      }
    })

    // Mise à jour parcel
    await prisma.parcel.update({
      where: { id: mission.parcelId },
      data: { status: 'DELIVERED' }
    })

    // Mise à jour stats livreur
    await prisma.carrierProfile.update({
      where: { userId: mission.carrierId },
      data: { totalDeliveries: { increment: 1 } }
    })

    // Notifications
    await notificationService.send(...)

    // TODO: Capture + Transfer paiement
  }

  return { confirmed: expiredMissions.length }
}
```

**Configuration Cron** :
```bash
# Exécuter toutes les 15 minutes
*/15 * * * * curl -X POST https://api.hopdrop.com/delivery/auto-confirm \
  -H "x-cron-secret: ${CRON_SECRET}"
```

### Statuts Delivery

```typescript
GET /delivery/status/:parcelId

Retourne:
{
  status: "PENDING" | "AWAITING_CONFIRMATION" | "CONFIRMED" | "CONTESTED" | "AUTO_CONFIRMED"
  deliveredAt?: DateTime
  proofUrl?: string
  confirmationDeadline?: DateTime
  hoursRemaining?: number  // Calculé
  clientConfirmedAt?: DateTime
  contestedAt?: DateTime
  contestReason?: string
  autoConfirmed: boolean
}

Logique status:
- PENDING: mission.deliveredAt = null
- AWAITING_CONFIRMATION: deliveredAt != null && clientConfirmedAt = null && clientContestedAt = null
- CONFIRMED: clientConfirmedAt != null
- AUTO_CONFIRMED: autoConfirmed = true
- CONTESTED: clientContestedAt != null
```

### Composants Mobiles

#### Badge Timer
```typescript
// mobile/src/components/common/DeliveryDeadlineBadge.tsx
<DeliveryDeadlineBadge
  confirmationDeadline={mission.deliveryConfirmationDeadline}
  autoConfirmed={mission.autoConfirmed}
/>

Affichage:
- "8h 23min restantes" (vert si >6h, orange si >3h, rouge si <3h)
- "Confirmé automatiquement" (si autoConfirmed = true)
- Auto-update chaque minute
```

#### Modal Confirmation (Vendeur)
```typescript
// mobile/src/screens/vendor/ParcelDetailScreen.tsx
const renderConfirmationModal = () => (
  <Modal visible={showConfirmModal}>
    <Image source={{ uri: deliveryStatus.proofUrl }} />
    <DeliveryDeadlineBadge ... />

    {/* Section notation optionnelle */}
    <RatingInput value={rating} onChange={setRating} />
    {rating > 0 && (
      <TextInput value={comment} onChange={setComment} placeholder="Commentaire optionnel" />
    )}

    <Button onPress={handleConfirmDelivery}>
      Confirmer la réception
    </Button>
    <Button onPress={() => setShowContestForm(true)}>
      Contester la livraison
    </Button>
  </Modal>
)

async function handleConfirmDelivery() {
  await api.clientConfirmDelivery(
    parcelId,
    rating > 0 ? rating : undefined,
    comment.trim() || undefined
  )
  // Fermer modal, rafraîchir données
}
```

#### Modal Preuve (Livreur)
```typescript
// mobile/src/components/carrier/DeliveryProofModal.tsx
<DeliveryProofModal
  visible={showProofModal}
  missionId={mission.id}
  onConfirm={handleDeliveryConfirm}
  onDismiss={() => setShowProofModal(false)}
/>

function handleDeliveryConfirm(proofUrl: string) {
  await api.confirmDelivery(mission.id, proofUrl)
  // Timer 12h démarre
}
```

## 7.3 Système de Paiement (Stripe)

### Architecture

```
1. CRÉATION COLIS (Vendeur)
   └─> POST /parcels
       └─> Calcul prix selon taille
       └─> POST /payments/create-intent
           └─> Stripe.paymentIntents.create({
                 amount: price * 100,  // centimes
                 currency: 'eur',
                 capture_method: 'manual',  // Capture différée
                 metadata: { parcelId }
               })
           └─> Retourne clientSecret
       └─> Mobile affiche Stripe Elements
       └─> Vendeur paie
       └─> POST /payments/confirm
           └─> Transaction créée (status: pending)
           └─> Montant autorisé mais NON capturé

2. CONFIRMATION LIVRAISON
   └─> POST /delivery/client-confirm
       └─> TODO: Capturer le paiement
           └─> Stripe.paymentIntents.capture(paymentIntentId)
           └─> Transaction.status = completed

3. TRANSFERT AU LIVREUR
   └─> TODO: Transfer vers Stripe Connect
       └─> Stripe.transfers.create({
             amount: carrierPayout * 100,
             currency: 'eur',
             destination: carrierProfile.stripeAccountId,
             transfer_group: parcelId
           })
       └─> Transaction créée (type: payout)
       └─> CarrierProfile.balance += carrierPayout

4. PAYOUT HEBDOMADAIRE
   └─> TODO: Cron job hebdomadaire
       └─> Stripe Connect auto-payout
       └─> Vers compte bancaire livreur
```

### Configuration Stripe Connect

```typescript
// Livreur crée son compte Connect
POST /payments/connect/create
{
  country: "FR",
  email: carrier.email,
  businessType: "individual"
}

// Stripe crée Express Account
const account = await stripe.accounts.create({
  type: 'express',
  country: 'FR',
  email: email,
  capabilities: {
    transfers: { requested: true }
  }
})

// Retourne lien onboarding
const accountLink = await stripe.accountLinks.create({
  account: account.id,
  refresh_url: 'https://app.hopdrop.com/carrier/profile',
  return_url: 'https://app.hopdrop.com/carrier/profile?success=true',
  type: 'account_onboarding'
})

// Sauvegarde
carrierProfile.stripeAccountId = account.id
```

### Calcul des Montants

```typescript
// backend/src/modules/parcels/parcels.pricing.ts

const PRICING = {
  SMALL: 3.00,
  MEDIUM: 4.00,
  LARGE: 5.50,
  XLARGE: 7.00
}

const PLATFORM_FEE_PERCENTAGE = 0.20  // 20%

function calculatePricing(size: ParcelSize) {
  const basePrice = PRICING[size]
  const platformFee = basePrice * PLATFORM_FEE_PERCENTAGE
  const carrierPayout = basePrice - platformFee

  return {
    price: basePrice,
    platformFee,
    carrierPayout
  }
}
```

### Webhooks Stripe

**À implémenter** : Endpoint pour recevoir les webhooks Stripe

```typescript
// backend/src/modules/payments/payments.routes.ts

POST /payments/webhook

async function handleStripeWebhook(request, reply) {
  const sig = request.headers['stripe-signature']
  const event = stripe.webhooks.constructEvent(
    request.rawBody,
    sig,
    process.env.STRIPE_WEBHOOK_SECRET
  )

  switch (event.type) {
    case 'payment_intent.succeeded':
      // Confirmer transaction
      break

    case 'payment_intent.payment_failed':
      // Gérer échec paiement
      break

    case 'transfer.created':
      // Confirmer transfer au livreur
      break

    case 'payout.paid':
      // Confirmer payout vers banque
      break
  }
}
```

## 7.4 Système de Notifications

### Push Notifications (FCM)

**Configuration** : Firebase Cloud Messaging via firebase-admin

```typescript
// backend/src/modules/notifications/push.service.ts

class PushNotificationService {
  async send(fcmToken: string, title: string, body: string, data?: object) {
    if (!admin.apps.length) {
      // Mode simulé si Firebase non configuré
      console.log('📱 PUSH SIMULÉ:', { title, body, data })
      return
    }

    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      data,
      android: {
        priority: 'high',
        notification: { sound: 'default' }
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 }
        }
      }
    })
  }
}
```

### Types de Notifications

| Événement | Destinataire | Titre | Body |
|-----------|--------------|-------|------|
| Mission acceptée | Vendeur | "Mission acceptée !" | "{Carrier} arrive dans {ETA}" |
| Départ livreur | Vendeur | "Le livreur est en route" | "Arrivée estimée: {time}" |
| Arrivée livreur | Vendeur | "Le livreur est arrivé" | "Il va emballer votre colis" |
| Emballage terminé | Vendeur | "Emballage terminé" | "Validez la photo pour continuer" |
| Emballage validé | Livreur | "Emballage validé !" | "Vous pouvez partir déposer le colis" |
| Emballage refusé | Livreur | "Emballage refusé" | "Raison: {reason}" |
| Colis déposé | Vendeur | "Colis déposé !" | "Confirmez dans les 12h" |
| Livraison confirmée | Livreur | "Livraison confirmée !" | "Paiement en cours de traitement" |
| Livraison auto-confirmée | Vendeur + Livreur | "Livraison auto-confirmée" | "Délai de 12h expiré" |
| Livraison contestée | Livreur | "Livraison contestée" | "Raison: {reason}" |
| Document approuvé | Livreur | "Document validé !" | "{type} approuvé par l'admin" |
| Document refusé | Livreur | "Document refusé" | "Raison: {reason}" |

### Mobile - Gestion des Notifications

```typescript
// mobile/src/services/notifications.ts

import * as Notifications from 'expo-notifications'

// Configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// Demander permission
async function requestPermissions() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Notifications désactivées')
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data
  return token
}

// Sauvegarder token
async function saveFCMToken(token: string) {
  await api.updateFCMToken(token)
}

// Écouter notifications
Notifications.addNotificationReceivedListener(notification => {
  // Notification reçue en foreground
})

Notifications.addNotificationResponseReceivedListener(response => {
  // Utilisateur a cliqué sur la notification
  const data = response.notification.request.content.data

  switch (data.type) {
    case 'mission_accepted':
      navigation.navigate('ParcelDetail', { parcelId: data.parcelId })
      break
    case 'packaging_confirmed':
      navigation.navigate('MissionDetail', { missionId: data.missionId })
      break
    // ...
  }
})
```

### Email Notifications (Resend)

**Configuration** : Resend API

```typescript
// backend/src/modules/notifications/email.service.ts

class EmailService {
  async sendPasswordReset(email: string, resetToken: string) {
    if (!process.env.RESEND_API_KEY) {
      console.log('📧 EMAIL SIMULÉ:', { email, resetToken })
      return
    }

    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Réinitialisation mot de passe - HopDrop',
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <p>Cliquez sur ce lien pour réinitialiser votre mot de passe:</p>
        <a href="${process.env.APP_URL}/reset-password?token=${resetToken}">
          Réinitialiser
        </a>
        <p>Ce lien expire dans 1 heure.</p>
      `
    })
  }

  async sendEmailVerification(email: string, verificationToken: string) {
    // Similaire
  }

  async sendDeliveryConfirmation(email: string, parcel: Parcel) {
    // Email de confirmation de livraison
  }
}
```

---

# 8. État d'Avancement

## 8.1 Légende

- ✅ **Implémenté et fonctionnel**
- 🔧 **Partiellement implémenté** (code présent mais incomplet)
- ❌ **Non implémenté**
- ⚠️ **Problème ou dette technique**

## 8.2 Authentification & Utilisateurs

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Inscription email/password | ✅ | ✅ | Bcrypt + JWT |
| Connexion | ✅ | ✅ | Access + Refresh tokens |
| Refresh token | ✅ | ✅ | Rotation automatique |
| Logout | ✅ | ✅ | Révocation refresh token |
| Mot de passe oublié | ✅ | ✅ | Email simulé |
| Reset password | ✅ | ✅ | Token 1h |
| Vérification email | 🔧 | ❌ | Backend OK, flow mobile manquant |
| OAuth Google | ❌ | ❌ | À implémenter |
| OAuth Apple | ❌ | ❌ | À implémenter |
| OAuth Facebook | ❌ | ❌ | Optionnel |
| Photo de profil | ✅ | ✅ | Upload Cloudinary |
| Mise à jour profil | ✅ | ✅ | |
| FCM Token storage | ✅ | 🔧 | Sauvegarde OK, permissions à vérifier |

## 8.3 Gestion des Colis (Vendeur)

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| CRUD colis | ✅ | ✅ | Complet |
| Calcul prix automatique | ✅ | ✅ | Selon taille |
| Liste avec filtres | ✅ | ✅ | Par statut |
| Historique colis | ✅ | ✅ | Pagination |
| Annulation colis | ✅ | ✅ | Si PENDING uniquement |
| Upload bordereau | 🔧 | 🔧 | Cloudinary OK, UX à améliorer |
| Sélection créneau | 🔧 | 🔧 | Date + heures basiques |
| Code pickup | ✅ | ❌ | Généré backend, non utilisé mobile |
| QR Code | ⚠️ | ❌ | Champ existe, pas de génération |
| Photo article (IA) | ❌ | ❌ | Champs prêts (itemPhotoUrl, suggestedSize) |
| Analyse IA taille | ❌ | ❌ | OpenAI Vision à intégrer |
| Mode IMMEDIATE | 🔧 | ❌ | Enum exists, logic incomplete |
| Expiration auto | ⚠️ | ❌ | EXPIRED status exists, no cron |

## 8.4 Missions (Livreur)

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Liste missions dispo | ✅ | ✅ | Par géolocalisation |
| Filtrage distance | ✅ | ✅ | Rayon configurable |
| Acceptation mission | ✅ | ✅ | |
| Missions en cours | ✅ | ✅ | |
| Historique missions | ✅ | ✅ | |
| Annulation mission | ✅ | ✅ | Avec raison |
| Tracking départ/arrivée | ✅ | ✅ | |
| Map missions | ❌ | ❌ | **Priorité haute** |
| Filtrage créneaux | 🔧 | ❌ | Backend partiel |
| ETA calculation | ❌ | ❌ | Google Directions API needed |
| Notifications push | ✅ | 🔧 | Backend OK, mobile partiellement |

## 8.5 Flux Emballage & Dépôt

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| **EMBALLAGE** ||||
| Upload photo emballage | ✅ | ✅ | Cloudinary |
| Confirmation livreur | ✅ | ✅ | CarrierPackagingModal |
| Confirmation vendeur | ✅ | ✅ | PackagingConfirmationModal |
| Refus avec raison | ✅ | ✅ | |
| Badge statut emballage | N/A | ✅ | PackagingStatusBadge |
| **DÉPÔT** ||||
| Upload preuve dépôt | ✅ | ✅ | DeliveryProofModal |
| Timer 12h | ✅ | ✅ | delivery.scheduler.ts |
| Confirmation client | ✅ | ✅ | Avec notation optionnelle |
| Contestation client | ✅ | ✅ | |
| Auto-confirmation 12h | ✅ | ✅ | Cron job |
| Badge deadline | N/A | ✅ | DeliveryDeadlineBadge |
| Notation lors confirmation | ✅ | ✅ | **Nouvelle fonctionnalité** |

## 8.6 Paiements

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Stripe Payment Intent | ✅ | ❌ | Backend OK, UI manquante |
| Capture paiement | ⚠️ | ❌ | Logique existe, non déclenchée auto |
| Stripe Connect setup | 🔧 | ❌ | Backend OK, onboarding à intégrer |
| Transfer au livreur | ⚠️ | ❌ | Code existe, non appelé |
| Webhooks Stripe | ⚠️ | N/A | Secret configuré, endpoint manquant |
| Historique transactions | ✅ | ❌ | Backend OK, écran mobile manquant |
| Cagnotte livreur | ✅ | ❌ | Backend OK, écran mobile manquant |
| Payout hebdomadaire | ❌ | ❌ | Stripe Connect auto-payout |
| Apple Pay | ❌ | ❌ | |
| Google Pay | ❌ | ❌ | |
| Remboursements | ❌ | ❌ | Logique à implémenter |

## 8.7 Système de Notation

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Créer review | ✅ | ✅ | **Nouvelle intégration** |
| Reviews reçues | ✅ | ❌ | Backend OK, écran manquant |
| Reviews données | ✅ | ❌ | Backend OK, écran manquant |
| Profil public avec avis | ✅ | ❌ | Backend OK, écran manquant |
| Moyenne notation livreur | ✅ | ✅ | Auto-calculée |
| Distribution notes | ✅ | ❌ | Stats backend OK |
| Notation lors confirmation | ✅ | ✅ | **Implémenté 27/12/2025** |

## 8.8 Chat

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Conversations | ✅ | ✅ | |
| Envoi messages | ✅ | ✅ | |
| Marquer lu | ✅ | ✅ | |
| Temps réel (polling) | ✅ | 🔧 | Polling basique |
| WebSocket | ❌ | ❌ | Pour vrai temps réel |
| Notifications | ✅ | 🔧 | Push OK, in-app manquant |
| Pièces jointes | ❌ | ❌ | |

## 8.9 Documents KYC

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Upload documents | ✅ | ✅ | |
| Validation admin | ✅ | ✅ | AdminDashboardScreen |
| Refus avec raison | ✅ | ✅ | |
| Notifications | ✅ | ✅ | |
| Documents requis | ✅ | ✅ | ID recto/verso + optionnels |

## 8.10 Admin

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Dashboard stats | ✅ | ✅ | |
| Validation documents | ✅ | ✅ | |
| Liste utilisateurs | ❌ | ❌ | |
| Gestion litiges | ⚠️ | ❌ | Contestations enregistrées, pas d'UI |
| Analytics avancées | ❌ | ❌ | |

## 8.11 Autres Fonctionnalités

| Fonctionnalité | Backend | Mobile | Notes |
|----------------|---------|--------|-------|
| Gestion adresses | ✅ | ✅ | CRUD + géocodage |
| Géolocalisation | ✅ | ✅ | PostGIS + Expo Location |
| Upload images | ✅ | ✅ | Cloudinary |
| Profil livreur | ✅ | ✅ | Véhicule, dispo, stats |
| Tracking temps réel | 🔧 | 🔧 | Position OK, pas de WebSocket |
| Notifications push | 🔧 | 🔧 | FCM configuré, permissions à vérifier |
| Emails | 🔧 | N/A | Resend configuré, non envoyés |

## 8.12 Problèmes Détectés

### Critiques ⚠️

1. **Paiement incomplet** : Capture et transfer existent mais ne sont pas automatiquement déclenchés
2. **Webhooks Stripe manquants** : Pas d'endpoint pour recevoir les événements
3. **Auto-confirm endpoint non sécurisé** : Utilise header au lieu d'auth
4. **Duplicate fields** : `proofPhotoUrl` ET `deliveryProofUrl` dans Mission
5. **Fichier mal placé** : `backend/src/modules/carrier-documents/CarrierDocumentsScreen.tsx`
6. **Hardcoded API URL** : `mobile/src/services/api.ts` utilise IP locale

### Moyennes 🔧

1. **Emails non envoyés** : Resend configuré mais méthodes non appelées
2. **Expiration colis** : Status EXPIRED existe mais pas de cron
3. **QR Code** : Champ existe mais pas de génération
4. **Code pickup** : Généré mais jamais utilisé
5. **Scheduler interval** : 1h trop long pour window 12h (devrait être 15min)

### Mineures

1. **Pas de tests** : Vitest installé mais aucun test
2. **Pas de logs structurés** : console.log partout
3. **Pas de rate limiting** : Endpoints publics non protégés
4. **TypeScript non strict** : Possibles erreurs de types
5. **N+1 queries potentielles** : Certains endpoints manquent includes

---

# 9. Intégrations Tierces

## 9.1 Stripe (Paiements)

### Configuration

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Services Utilisés

1. **Payment Intents** : Paiements vendeurs
   - `capture_method: 'manual'` pour capture différée
   - Montant bloqué jusqu'à confirmation livraison

2. **Stripe Connect Express** : Comptes livreurs
   - Type: Express (simplifié)
   - Capability: `transfers`
   - Onboarding automatique

3. **Transfers** : Versements livreurs
   - Depuis compte plateforme
   - Vers comptes Connect livreurs

4. **Webhooks** : Événements Stripe
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `transfer.created`
   - `payout.paid`

### État

- ✅ Payment Intents configurés
- ✅ Connect account creation
- ⚠️ Capture automatique non déclenchée
- ⚠️ Transfers non déclenchés auto
- ❌ Webhooks endpoint manquant
- 🔧 Mode simulation si clés non fournies

## 9.2 Cloudinary (Stockage Images)

### Configuration

```env
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
```

### Dossiers Organisés

```
hopdrop/
├── profiles/          # Photos de profil
├── parcels/
│   ├── items/        # Photos articles (IA)
│   ├── labels/       # Bordereaux
│   └── packaging/    # Photos emballage
├── delivery/
│   └── proofs/       # Preuves de dépôt
└── documents/
    ├── id-cards/     # Pièces identité
    ├── kbis/         # KBIS
    └── vehicles/     # Cartes grises
```

### Optimisations

- Format auto : WebP/AVIF si supporté
- Compression qualité 80
- Lazy loading
- Responsive images

### État

- ✅ Complètement configuré
- ✅ Upload direct depuis mobile
- ✅ Signatures pour upload sécurisé
- ✅ Suppression via publicId

## 9.3 Firebase Cloud Messaging (Push)

### Configuration

```env
FIREBASE_PROJECT_ID=hopdrop-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@hopdrop.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### Fichiers Config

- Android : `mobile/google-services.json`
- iOS : `mobile/GoogleService-Info.plist`

### Flow

```
1. App demande permission notifications
2. Expo génère token FCM
3. Token envoyé au backend
4. Stocké dans User.fcmToken
5. Backend envoie notifications via firebase-admin
```

### État

- 🔧 Backend configuré
- 🔧 Mobile partiellement (permissions à vérifier)
- 🔧 Mode simulation si Firebase non config

## 9.4 Google Maps Platform

### Services Requis

1. **Geocoding API** : Convertir adresses en coordonnées
   - Utilisé pour Address.latitude/longitude

2. **Maps SDK** : Affichage cartes mobile
   - React Native Maps
   - Missions disponibles
   - Tracking livreur

3. **Directions API** : Calcul d'itinéraires
   - ETA (temps d'arrivée estimé)
   - Non implémenté

### Configuration

```env
GOOGLE_MAPS_API_KEY=AIzaSy...
```

```typescript
// mobile/app.json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSy..."
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSy..."
      }
    }
  }
}
```

### État

- ❌ API Key non configurée
- ✅ Geocoding service prêt (backend)
- ❌ Maps mobile à implémenter
- ❌ Directions API à intégrer

## 9.5 Resend (Emails)

### Configuration

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@hopdrop.com
```

### Templates

1. **Password Reset**
   - Lien avec token 1h
   - Déjà codé mais non envoyé

2. **Email Verification**
   - Lien avec token
   - Déjà codé mais non envoyé

3. **Delivery Confirmation** (à créer)
   - Confirmation livraison
   - Résumé transaction

### État

- 🔧 Resend configuré
- 🔧 Templates créés
- ⚠️ Méthodes non appelées
- 🔧 Mode simulation actif

## 9.6 PostgreSQL + PostGIS

### Configuration

```env
DATABASE_URL=postgresql://user:password@host:5432/hopdrop
```

### Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Fonctionnalités PostGIS

- Stockage latitude/longitude
- Calcul distances géographiques
- Requêtes spatiales pour missions

### État

- ✅ PostgreSQL configuré
- ✅ PostGIS actif
- ✅ Migrations fonctionnelles
- ✅ Requêtes spatiales opérationnelles

## 9.7 Expo (Mobile)

### Services Utilisés

1. **Expo Location** : GPS
2. **Expo Notifications** : Push notifications
3. **Expo Image Picker** : Photos
4. **Expo Camera** : Caméra

### Build

```bash
# Development build
eas build --profile development --platform android

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform all
```

### État

- ✅ Expo SDK 51 configuré
- 🔧 EAS Build partiellement setup
- ❌ App non déployée sur stores

---

# 10. Configuration & Déploiement

## 10.1 Variables d'Environnement

### Backend (.env)

```env
# === DATABASE ===
DATABASE_URL=postgresql://user:password@localhost:5432/hopdrop

# === JWT ===
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# === STRIPE ===
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# === CLOUDINARY ===
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# === FIREBASE ===
FIREBASE_PROJECT_ID=hopdrop-xxxxx
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# === RESEND (Email) ===
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@hopdrop.com

# === GOOGLE MAPS ===
GOOGLE_MAPS_API_KEY=AIzaSy...

# === APP ===
APP_URL=https://app.hopdrop.com
PORT=3000
NODE_ENV=production

# === CRON ===
CRON_SECRET=your-cron-secret-key
```

### Mobile (.env)

```env
API_URL=https://api.hopdrop.com
STRIPE_PUBLISHABLE_KEY=pk_test_...
GOOGLE_MAPS_API_KEY=AIzaSy...
```

## 10.2 Déploiement Backend

### Option 1 : Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Link to project
railway link

# Set env vars
railway variables set DATABASE_URL="postgresql://..."
railway variables set JWT_SECRET="..."
# ... etc

# Deploy
railway up
```

### Option 2 : Render

```yaml
# render.yaml
services:
  - type: web
    name: hopdrop-api
    env: node
    buildCommand: npm install && npx prisma generate && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: hopdrop-db
          property: connectionString
      - key: NODE_ENV
        value: production
      # ... autres vars

databases:
  - name: hopdrop-db
    databaseName: hopdrop
    user: hopdrop
    plan: starter
    postgresMajorVersion: 15
```

### Migration Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# (Optionnel) Seed data
npx prisma db seed
```

## 10.3 Déploiement Mobile

### Configuration EAS

```json
// eas.json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "buildConfiguration": "Release"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./android-service-account.json",
        "track": "internal"
      },
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABCDE12345"
      }
    }
  }
}
```

### Build & Submit

```bash
# Login to Expo
eas login

# Build Android APK (testing)
eas build --profile development --platform android

# Build Production
eas build --profile production --platform all

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

## 10.4 Cron Jobs

### Auto-Confirmation (12h)

```bash
# Crontab (toutes les 15 minutes)
*/15 * * * * curl -X POST https://api.hopdrop.com/delivery/auto-confirm \
  -H "x-cron-secret: ${CRON_SECRET}"
```

### Stripe Payouts (hebdomadaire)

```bash
# Crontab (tous les lundis à 2h du matin)
0 2 * * 1 curl -X POST https://api.hopdrop.com/payments/process-payouts \
  -H "x-cron-secret: ${CRON_SECRET}"
```

**Note** : À implémenter l'endpoint `/payments/process-payouts`

### Expiration Colis (quotidien)

```bash
# Crontab (tous les jours à 3h)
0 3 * * * curl -X POST https://api.hopdrop.com/parcels/expire \
  -H "x-cron-secret: ${CRON_SECRET}"
```

**Note** : À implémenter

## 10.5 Monitoring & Logs

### À Configurer

1. **Sentry** : Tracking erreurs
```env
SENTRY_DSN=https://...@sentry.io/...
```

2. **Logging structuré** : Winston ou Pino
```typescript
import pino from 'pino'
const logger = pino({ level: 'info' })
```

3. **APM** : New Relic, Datadog, ou AppSignal

4. **Uptime Monitoring** : UptimeRobot, Pingdom

---

# 11. Roadmap & Recommandations

## 11.1 Priorités Immédiates (Sprint 1) 🔥

### 1. Compléter le Flux de Paiement
**Impact** : CRITIQUE - Empêche monétisation

```
Tasks:
1. Capturer paiement automatiquement lors confirmation
   └─> Dans delivery.service.ts → clientConfirmDelivery()
   └─> Appeler payments.service.ts → capturePayment()

2. Transférer vers Stripe Connect
   └─> Dans delivery.service.ts → clientConfirmDelivery()
   └─> Appeler payments.service.ts → transferToCarrier()

3. Implémenter webhooks Stripe
   └─> POST /payments/webhook
   └─> Gérer payment_intent.*, transfer.*, payout.*

4. Créer endpoint payout hebdomadaire
   └─> POST /payments/process-payouts (cron)
```

**Estimation** : 2-3 jours
**Fichiers** :
- `backend/src/modules/payments/payments.service.ts`
- `backend/src/modules/delivery/delivery.service.ts`
- `backend/src/modules/payments/payments.routes.ts`

### 2. Sécuriser l'Endpoint Auto-Confirm
**Impact** : CRITIQUE - Sécurité

```
Tasks:
1. Remplacer header auth par API key ou JWT
2. Ajouter rate limiting
3. Logger toutes les exécutions
```

**Estimation** : 1 jour
**Fichiers** : `backend/src/modules/delivery/delivery.routes.ts`

### 3. Configurer Firebase FCM
**Impact** : HAUTE - Expérience utilisateur

```
Tasks:
1. Créer projet Firebase
2. Télécharger google-services.json / GoogleService-Info.plist
3. Configurer dans app.json
4. Tester permissions notifications mobile
5. Remplacer mode simulation
```

**Estimation** : 1 jour

### 4. Implémenter Emails Réels
**Impact** : HAUTE - Communication utilisateur

```
Tasks:
1. Vérifier domaine Resend
2. Créer templates HTML
3. Appeler emailService dans auth/delivery flows
4. Tester envois
```

**Estimation** : 1 jour
**Fichiers** : `backend/src/modules/notifications/email.service.ts`

## 11.2 Améliorations Court Terme (Sprint 2-3) 🚀

### 5. Carte Interactive Missions
**Impact** : HAUTE - UX livreur

```
Files to create:
- mobile/src/screens/carrier/MissionsMapScreen.tsx
- mobile/src/components/carrier/MissionMarker.tsx

Dependencies:
- react-native-maps
- Google Maps API Key

Features:
- Afficher missions sur carte
- Cluster markers si nombreuses
- Popup mission au clic
- Bouton "Accepter" direct
```

**Estimation** : 2-3 jours

### 6. ETA (Temps d'Arrivée Estimé)
**Impact** : HAUTE - UX vendeur

```
Backend:
- missions.tracking.ts → calculateETA()
- Google Directions API

Mobile:
- TrackingScreen.tsx → Afficher ETA
- Update toutes les 30s
```

**Estimation** : 2 jours

### 7. Écrans Manquants Mobile

**WalletScreen** (Livreur)
```
- Affiche balance actuelle
- Historique transactions
- Bouton "Configurer Stripe Connect"
- Bouton "Retirer fonds"
```

**ReviewScreen** (Partagé)
```
- Liste reviews reçues
- Stats (moyenne, distribution)
- Filtres (date, note)
```

**Estimation** : 3-4 jours total

### 8. Nettoyage Technique

```
1. Supprimer CarrierDocumentsScreen.tsx du backend
2. Fusionner duplicate fields (proofPhotoUrl)
3. Ajouter indexes database
4. Remplacer console.log par logger
5. Configurer TypeScript strict mode
6. Fix hardcoded API URL mobile
```

**Estimation** : 2 jours

## 11.3 Fonctionnalités Moyen Terme (Sprint 4-6) 🎯

### 9. Analyse IA des Photos

```
OpenAI Vision API integration:
1. Upload photo article
2. Analyse via GPT-4 Vision
3. Détection catégorie + taille suggérée
4. Pré-remplissage formulaire
```

**Estimation** : 3-4 jours

### 10. Système de Litiges

```
Admin Panel:
- Liste contestations
- Affichage preuves (photos)
- Chat avec utilisateurs
- Décision (refund/validate/partial)
- Notifications automatiques
```

**Estimation** : 5-7 jours

### 11. OAuth (Google, Apple, Facebook)

```
1. Google OAuth
   - Google Cloud Console config
   - Backend flow
   - Mobile button

2. Apple Sign In
   - Apple Developer config
   - Required for iOS

3. Facebook (optionnel)
```

**Estimation** : 4-5 jours total

### 12. WebSocket pour Temps Réel

```
Socket.io integration:
- Position livreur (live)
- Nouveaux messages chat
- Notifications in-app
- Statut mission updates
```

**Estimation** : 5-6 jours

## 11.4 Optimisations Long Terme (Sprint 7+) 🔮

### 13. Tests Automatisés

```
1. Tests unitaires (Vitest)
   - Services backend
   - Utils frontend

2. Tests intégration (Supertest)
   - Endpoints API
   - Flows critiques

3. Tests E2E (Detox)
   - Parcours utilisateur complet
```

**Estimation** : 10-15 jours

### 14. CI/CD Pipeline

```
GitHub Actions:
- Lint & Type check
- Run tests
- Build Docker image
- Deploy to staging
- Deploy to production (manual approval)
```

**Estimation** : 3-4 jours

### 15. Performance & Scaling

```
1. Database:
   - Indexes optimisés
   - Query optimization
   - Connection pooling
   - Read replicas

2. Cache:
   - Redis pour sessions
   - Cache API responses
   - Cache geocoding results

3. CDN:
   - Cloudinary CDN
   - Static assets CDN
```

**Estimation** : 7-10 jours

### 16. Features Avancées

- [ ] Mode "Prise en Charge Immédiate" (matching auto)
- [ ] Système de badges/récompenses livreurs
- [ ] Programme de parrainage
- [ ] Abonnements vendeurs (tarifs dégressifs)
- [ ] Application web (vendeurs)
- [ ] Analytics avancées (Mixpanel, Amplitude)
- [ ] A/B testing (Optimizely)
- [ ] Support multilingue (i18n)

## 11.5 Corrections Critiques ⚠️

### À Corriger Immédiatement

1. **Duplicate Mission Fields**
```prisma
// Supprimer:
- proofPhotoUrl (legacy)

// Garder:
- deliveryProofUrl (nouveau système)
```

2. **Fichier Mal Placé**
```bash
# Supprimer:
backend/src/modules/carrier-documents/CarrierDocumentsScreen.tsx
```

3. **API URL Hardcodée**
```typescript
// mobile/src/services/api.ts
// Avant:
baseURL: 'http://192.168.1.78:3000'

// Après:
baseURL: process.env.API_URL || 'http://192.168.1.78:3000'
```

4. **Cron Secret Auth**
```typescript
// delivery.routes.ts
// Ajouter middleware dédié
const verifyCronSecret = (request, reply, done) => {
  const secret = request.headers['x-cron-secret']
  if (secret !== process.env.CRON_SECRET) {
    return reply.status(401).send({ error: 'Unauthorized' })
  }
  done()
}

app.post('/delivery/auto-confirm', { preHandler: verifyCronSecret }, ...)
```

5. **Scheduler Interval**
```typescript
// delivery.scheduler.ts
// Changer de 1h à 15min
setInterval(autoConfirmExpiredDeliveries, 15 * 60 * 1000)
```

## 11.6 Métriques de Succès

### KPIs à Tracker

**Utilisateurs**
- Inscriptions vendeurs/livreurs
- Taux d'activation (documents validés)
- Taux de rétention (D1, D7, D30)

**Transactions**
- GMV (Gross Merchandise Value)
- Nombre de livraisons
- Taux de confirmation (vs contestation)
- Temps moyen confirmation

**Qualité**
- Note moyenne livreurs
- Taux d'annulation missions
- Taux d'emballage refusé
- Taux de livraison contestée

**Performance**
- Temps de réponse API (p50, p95, p99)
- Uptime (target: 99.9%)
- Taux d'erreur
- Temps de chargement mobile

---

# Résumé Exécutif

## ✅ Complètement Implémenté

1. **Authentification JWT** avec refresh tokens
2. **CRUD complet** : utilisateurs, colis, missions, adresses
3. **Système d'emballage** : photo + double confirmation (12h window)
4. **Système de dépôt** : preuve + timer 12h + auto-confirmation
5. **Chat** vendeur-livreur temps réel
6. **Documents KYC** avec validation admin
7. **Notation** avec intégration lors confirmation livraison
8. **Géolocalisation** missions par distance
9. **Upload images** Cloudinary

## 🔧 Partiellement Implémenté (à finaliser)

1. **Paiements Stripe** : logique OK, capture/transfer non auto
2. **Notifications** : FCM/Resend configurés, mode simulation actif
3. **Stripe Connect** : setup OK, onboarding mobile manquant
4. **Tracking livreur** : position OK, pas de WebSocket ni ETA

## ❌ Priorités Non Implémentées

1. **Carte missions** (react-native-maps)
2. **ETA** (Google Directions API)
3. **Webhooks Stripe**
4. **OAuth** (Google, Apple, Facebook)
5. **Écrans mobile** : Wallet, Reviews, Analytics
6. **Analyse IA** photos (OpenAI Vision)
7. **Tests automatisés**
8. **Gestion litiges** (UI admin)

## 🎯 Next Steps (1-2 semaines)

1. Finaliser flux paiement (capture + transfer auto)
2. Activer Firebase FCM & Resend
3. Sécuriser cron endpoints
4. Implémenter carte missions
5. Ajouter ETA calculation
6. Créer écrans manquants (Wallet, Reviews)

---

*Document généré le 27/12/2025*
*Basé sur analyse complète du code source*

**HopDrop © 2025**
