const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const config = require('./config/config');
const logger = require('./config/logger');
const { DatabaseError } = require('./middleware/errorHandler');

const dbPath = path.resolve(config.database.path);

// Promisifier les méthodes de la base de données
class Database {
  constructor() {
    this.db = null;
  }

  // Connexion à la base de données
  connect() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          logger.error('Erreur de connexion à la base de données:', err);
          reject(new DatabaseError('Impossible de se connecter à la base de données'));
        } else {
          logger.info('Connecté à la base de données SQLite');
          // Activer les clés étrangères
          this.db.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  // Initialiser la base de données
  async init() {
    try {
      await this.connect();
      await this.createTables();
      await this.createIndexes();
      logger.info('Base de données initialisée avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de la base de données:', error);
      throw error;
    }
  }

  // Créer les tables
  createTables() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Table des clients
        this.db.run(`
          CREATE TABLE IF NOT EXISTS clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            address TEXT,
            city TEXT,
            postal_code TEXT,
            country TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table des produits/services
        this.db.run(`
          CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            price REAL NOT NULL,
            unit TEXT DEFAULT 'unité',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Table des factures
        this.db.run(`
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            client_id INTEGER NOT NULL,
            issue_date DATE NOT NULL,
            due_date DATE,
            subtotal REAL NOT NULL,
            tax_rate REAL DEFAULT 20.0,
            tax_amount REAL NOT NULL,
            discount REAL DEFAULT 0,
            total REAL NOT NULL,
            status TEXT DEFAULT 'draft',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE RESTRICT,
            CHECK (status IN ('draft', 'sent', 'paid', 'cancelled'))
          )
        `);

        // Table des lignes de facture
        this.db.run(`
          CREATE TABLE IF NOT EXISTS invoice_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_id INTEGER NOT NULL,
            product_id INTEGER,
            description TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            total REAL NOT NULL,
            FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
            FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
          )
        `, (err) => {
          if (err) {
            logger.error('Erreur lors de la création des tables:', err);
            reject(new DatabaseError('Erreur lors de la création des tables'));
          } else {
            resolve();
          }
        });
      });
    });
  }

  // Créer les index pour optimiser les performances
  createIndexes() {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id)', (err) => {
          if (err) {
            logger.error('Erreur lors de la création des index:', err);
            reject(new DatabaseError('Erreur lors de la création des index'));
          } else {
            resolve();
          }
        });
      });
    });
  }

  // Méthode GET (pour une seule ligne)
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          logger.error('Erreur lors de la requête GET:', { sql, params, error: err.message });
          reject(new DatabaseError(err.message));
        } else {
          resolve(row);
        }
      });
    });
  }

  // Méthode ALL (pour plusieurs lignes)
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          logger.error('Erreur lors de la requête ALL:', { sql, params, error: err.message });
          reject(new DatabaseError(err.message));
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Méthode RUN (pour INSERT, UPDATE, DELETE)
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          logger.error('Erreur lors de la requête RUN:', { sql, params, error: err.message });
          reject(new DatabaseError(err.message));
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  // Méthode pour exécuter une transaction
  async transaction(callback) {
    try {
      await this.run('BEGIN TRANSACTION');
      const result = await callback(this);
      await this.run('COMMIT');
      return result;
    } catch (error) {
      await this.run('ROLLBACK');
      logger.error('Transaction annulée:', error);
      throw error;
    }
  }

  // Fermer la connexion
  close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            logger.error('Erreur lors de la fermeture de la base de données:', err);
            reject(err);
          } else {
            logger.info('Connexion à la base de données fermée');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

// Créer et exporter une instance unique
const database = new Database();

module.exports = database;
