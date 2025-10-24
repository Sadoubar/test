# Application de Facturation

Une application web complète pour la gestion de facturation avec interface moderne.

## Fonctionnalités

- Gestion des clients
- Gestion des produits et services
- Création et gestion de factures
- Calcul automatique (TVA, remises, totaux)
- Export PDF des factures
- Interface utilisateur moderne et responsive

## Technologies

### Backend
- Node.js + Express
- SQLite (base de données)
- PDFKit (génération PDF)

### Frontend
- React + Vite
- CSS moderne

## Installation

### Prérequis
- Node.js (v14 ou supérieur)
- npm

### Installation du backend

```bash
npm install
```

### Installation du frontend

```bash
cd client
npm install
cd ..
```

## Utilisation

### Démarrage en mode développement

```bash
npm run dev
```

Cela démarre :
- Backend sur http://localhost:3000
- Frontend sur http://localhost:5173

### Démarrage en production

```bash
# Build du frontend
npm run build

# Démarrage du serveur
npm start
```

## Structure du projet

```
billing-app/
├── server/
│   ├── index.js          # Point d'entrée du serveur
│   ├── database.js       # Configuration base de données
│   └── routes/           # Routes API
├── client/               # Application React
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── App.jsx       # Composant principal
│   │   └── main.jsx      # Point d'entrée
│   └── index.html
└── package.json
```

## API Endpoints

### Clients
- `GET /api/clients` - Liste tous les clients
- `POST /api/clients` - Créer un nouveau client
- `PUT /api/clients/:id` - Modifier un client
- `DELETE /api/clients/:id` - Supprimer un client

### Produits
- `GET /api/products` - Liste tous les produits
- `POST /api/products` - Créer un nouveau produit
- `PUT /api/products/:id` - Modifier un produit
- `DELETE /api/products/:id` - Supprimer un produit

### Factures
- `GET /api/invoices` - Liste toutes les factures
- `GET /api/invoices/:id` - Détails d'une facture
- `POST /api/invoices` - Créer une nouvelle facture
- `PUT /api/invoices/:id` - Modifier une facture
- `DELETE /api/invoices/:id` - Supprimer une facture
- `GET /api/invoices/:id/pdf` - Télécharger la facture en PDF

## Licence

MIT
