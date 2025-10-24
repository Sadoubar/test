# Application de Facturation Professionnelle

Une application web complète et prête pour la production pour la gestion de facturation avec interface moderne et sécurisée.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Fonctionnalités

- **Gestion des clients** : Créer, modifier, supprimer et rechercher des clients
- **Gestion des produits** : Catalogue de produits et services
- **Facturation complète** : Création, modification et suivi des factures
- **Calcul automatique** : TVA, remises et totaux
- **Export PDF** : Génération de factures PDF professionnelles
- **Statistiques** : Tableaux de bord et rapports
- **Interface moderne** : Interface utilisateur responsive et intuitive

## Technologies

### Backend
- **Node.js** + **Express** : Serveur web robuste
- **SQLite** : Base de données légère et performante
- **PDFKit** : Génération de PDF
- **Winston** : Logging professionnel
- **Helmet** : Sécurité HTTP
- **Express Validator** : Validation des données
- **Rate Limiting** : Protection contre les abus

### Frontend
- **React** + **Vite** : Interface utilisateur rapide
- **CSS moderne** : Design responsive

### DevOps
- **PM2** : Gestionnaire de processus
- **Docker** : Conteneurisation
- **Jest** : Tests automatisés
- **ESLint** : Qualité du code

## Prérequis

- Node.js >= 14.0.0
- npm >= 6.0.0
- (Optionnel) Docker pour le déploiement conteneurisé
- (Optionnel) PM2 pour la gestion de processus

## Installation

### 1. Cloner le projet

```bash
git clone <repository-url>
cd billing-app
```

### 2. Configuration de l'environnement

Copier le fichier `.env.example` vers `.env` et configurer les variables :

```bash
cp .env.example .env
```

Éditer le fichier `.env` avec vos paramètres :

```env
NODE_ENV=production
PORT=3000
DB_PATH=./billing.db

# Informations de votre entreprise
COMPANY_NAME=Votre Entreprise
COMPANY_ADDRESS=123 Rue Exemple
COMPANY_CITY=75001 Paris
COMPANY_PHONE=+33 1 23 45 67 89
COMPANY_EMAIL=contact@votreentreprise.com
COMPANY_SIRET=123 456 789 00012
COMPANY_VAT=FR12345678901
```

### 3. Installation des dépendances

#### Backend
```bash
npm install
```

#### Frontend
```bash
cd client
npm install
cd ..
```

## Utilisation

### Mode Développement

Démarre le backend et le frontend avec hot-reload :

```bash
npm run dev
```

- Backend : http://localhost:3000
- Frontend : http://localhost:5173
- API : http://localhost:3000/api

### Mode Production

#### Build du frontend

```bash
npm run build
```

#### Démarrage du serveur

```bash
npm start
```

L'application complète sera accessible sur http://localhost:3000

## Scripts disponibles

```bash
# Développement
npm run dev              # Démarre backend et frontend en mode dev
npm run server           # Démarre uniquement le backend
npm run server:dev       # Démarre le backend avec nodemon
npm run client           # Démarre uniquement le frontend

# Production
npm run build            # Build le frontend pour la production
npm start                # Démarre le serveur en mode production

# Tests
npm test                 # Lance les tests avec coverage
npm run test:watch       # Lance les tests en mode watch

# Qualité du code
npm run lint             # Vérifie le code avec ESLint

# PM2 (Process Manager)
npm run pm2:start        # Démarre avec PM2
npm run pm2:stop         # Arrête PM2
npm run pm2:restart      # Redémarre PM2
npm run pm2:logs         # Affiche les logs PM2

# Docker
npm run docker:build     # Build l'image Docker
npm run docker:run       # Lance le conteneur Docker
```

## Déploiement

### Option 1 : Déploiement avec PM2 (Recommandé)

PM2 est un gestionnaire de processus de production pour Node.js avec load balancing intégré.

```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer l'application
npm run pm2:start

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs billing-app

# Redémarrer
pm2 restart billing-app

# Configurer le démarrage automatique
pm2 startup
pm2 save
```

### Option 2 : Déploiement avec Docker

#### Utilisation de Docker Compose (Recommandé)

```bash
# Build et démarrage
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêt
docker-compose down
```

#### Utilisation de Docker seul

```bash
# Build de l'image
docker build -t billing-app .

# Lancement du conteneur
docker run -d \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/logs:/app/logs \
  --env-file .env \
  --name billing-app \
  billing-app

# Voir les logs
docker logs -f billing-app
```

### Option 3 : Déploiement traditionnel

```bash
# Build du frontend
npm run build

# Démarrage en production
NODE_ENV=production npm start
```

## Configuration avancée

### Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NODE_ENV` | Environnement (development/production) | development |
| `PORT` | Port du serveur | 3000 |
| `HOST` | Hôte du serveur | 0.0.0.0 |
| `DB_PATH` | Chemin de la base de données | ./billing.db |
| `LOG_LEVEL` | Niveau de log (debug/info/warn/error) | info |
| `LOG_DIR` | Répertoire des logs | ./logs |
| `CORS_ORIGIN` | Origine CORS autorisée | * |
| `RATE_LIMIT_MAX_REQUESTS` | Nombre max de requêtes | 100 |
| `RATE_LIMIT_WINDOW_MS` | Fenêtre de rate limiting (ms) | 900000 |

### Sécurité

L'application inclut plusieurs mesures de sécurité :

- **Helmet** : Protection des en-têtes HTTP
- **CORS** : Configuration des origines autorisées
- **Rate Limiting** : Protection contre les attaques DDoS
- **Validation des données** : Validation stricte avec express-validator
- **Sanitization** : Nettoyage des entrées utilisateur
- **Transaction SQL** : Prévention des injections SQL
- **Logging** : Traçabilité de toutes les actions

### Monitoring

#### Logs

Les logs sont organisés par type et rotation automatique :

```
logs/
├── combined-YYYY-MM-DD.log  # Tous les logs
├── error-YYYY-MM-DD.log     # Erreurs uniquement
├── pm2-error.log            # Erreurs PM2
└── pm2-out.log              # Output PM2
```

#### Health Check

Point de terminaison pour vérifier l'état du serveur :

```bash
curl http://localhost:3000/api/health
```

Réponse :
```json
{
  "status": "OK",
  "message": "Serveur de facturation en ligne",
  "version": "1.0.0",
  "environment": "production",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Structure du projet

```
billing-app/
├── server/
│   ├── config/
│   │   ├── config.js           # Configuration centralisée
│   │   └── logger.js           # Configuration Winston
│   ├── middleware/
│   │   ├── errorHandler.js     # Gestion des erreurs
│   │   ├── security.js         # Middleware de sécurité
│   │   └── validators.js       # Validateurs de données
│   ├── routes/
│   │   ├── clients.js          # Routes clients
│   │   ├── products.js         # Routes produits
│   │   └── invoices.js         # Routes factures
│   ├── database.js             # Gestion base de données
│   └── index.js                # Point d'entrée serveur
├── client/                     # Application React
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── index.html
├── tests/                      # Tests automatisés
│   └── api.test.js
├── logs/                       # Fichiers de logs
├── .env                        # Variables d'environnement
├── .env.example                # Exemple de configuration
├── ecosystem.config.js         # Configuration PM2
├── Dockerfile                  # Configuration Docker
├── docker-compose.yml          # Docker Compose
├── jest.config.js              # Configuration Jest
├── .eslintrc.js                # Configuration ESLint
├── package.json
└── README.md
```

## API Endpoints

### Clients

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/clients` | Liste tous les clients |
| GET | `/api/clients/:id` | Détails d'un client |
| GET | `/api/clients/:id/stats` | Statistiques d'un client |
| POST | `/api/clients` | Créer un nouveau client |
| PUT | `/api/clients/:id` | Modifier un client |
| DELETE | `/api/clients/:id` | Supprimer un client |

### Produits

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/products` | Liste tous les produits |
| GET | `/api/products/:id` | Détails d'un produit |
| POST | `/api/products` | Créer un nouveau produit |
| PUT | `/api/products/:id` | Modifier un produit |
| DELETE | `/api/products/:id` | Supprimer un produit |

### Factures

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/invoices` | Liste toutes les factures |
| GET | `/api/invoices/:id` | Détails d'une facture |
| GET | `/api/invoices/:id/pdf` | Télécharger la facture en PDF |
| GET | `/api/invoices/stats/summary` | Statistiques globales |
| POST | `/api/invoices` | Créer une nouvelle facture |
| PUT | `/api/invoices/:id` | Modifier une facture |
| DELETE | `/api/invoices/:id` | Supprimer une facture |

## Tests

L'application inclut une suite de tests automatisés.

```bash
# Lancer tous les tests
npm test

# Tests avec coverage
npm test -- --coverage

# Tests en mode watch
npm run test:watch
```

## Bonnes pratiques

### Sauvegarde

Sauvegarder régulièrement la base de données et les logs :

```bash
# Sauvegarde de la base de données
cp billing.db billing.db.backup-$(date +%Y%m%d)

# Archivage des logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz logs/
```

### Mise à jour

```bash
# Mettre à jour les dépendances
npm update

# Vérifier les vulnérabilités
npm audit

# Corriger les vulnérabilités
npm audit fix
```

### Performance

- Utiliser PM2 en mode cluster pour exploiter tous les CPU
- Configurer un reverse proxy (Nginx) pour servir les fichiers statiques
- Activer la compression gzip
- Utiliser un CDN pour les assets statiques

## Troubleshooting

### Le serveur ne démarre pas

```bash
# Vérifier les logs
tail -f logs/error-*.log

# Vérifier la configuration
node -c server/index.js
```

### Problèmes de base de données

```bash
# Réinitialiser la base de données
rm billing.db
npm start  # Recréera automatiquement la base
```

### Problèmes de permissions

```bash
# Donner les bonnes permissions
chmod -R 755 .
chmod 644 .env
chmod 644 billing.db
```

## Support et Contribution

Pour signaler un bug ou demander une fonctionnalité, veuillez ouvrir une issue sur le dépôt GitHub.

## Licence

MIT

## Auteur

Application développée avec Node.js, React et beaucoup de café.

---

**Note de sécurité** : En production, assurez-vous de :
1. Changer toutes les clés secrètes dans le fichier `.env`
2. Configurer HTTPS avec un certificat SSL valide
3. Configurer un firewall et limiter l'accès aux ports
4. Mettre en place des sauvegardes automatiques
5. Surveiller les logs régulièrement
6. Garder les dépendances à jour
