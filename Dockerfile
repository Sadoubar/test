# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copier les fichiers package
COPY client/package*.json ./

# Installer les dépendances
RUN npm ci

# Copier le code source
COPY client/ ./

# Build de production
RUN npm run build

# Stage 2: Setup backend
FROM node:18-alpine AS backend

WORKDIR /app

# Installer les dépendances système nécessaires pour SQLite
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copier les fichiers package du backend
COPY package*.json ./

# Installer les dépendances de production uniquement
RUN npm ci --only=production

# Copier le code du serveur
COPY server/ ./server/

# Copier le build du frontend depuis le stage précédent
COPY --from=frontend-builder /app/client/dist ./client/dist

# Copier les fichiers de configuration
COPY .env.example ./.env

# Créer les répertoires nécessaires
RUN mkdir -p logs

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV NODE_ENV=production \
    PORT=3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Utilisateur non-root pour la sécurité
USER node

# Démarrer l'application
CMD ["node", "server/index.js"]
