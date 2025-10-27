const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'billing.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connecté à la base de données SQLite');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Table des clients
    db.run(`
      CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        postal_code TEXT,
        country TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des produits/services
    db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        unit TEXT DEFAULT 'unité',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Table des factures
    db.run(`
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
        internal_notes TEXT,
        payment_method TEXT DEFAULT 'Virement bancaire',
        payment_terms INTEGER DEFAULT 30,
        sent_date DATE,
        paid_date DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id)
      )
    `);

    // Table des lignes de facture
    db.run(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER,
        description TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit_price REAL NOT NULL,
        total REAL NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products (id)
      )
    `);

    // Table des paramètres de l'entreprise
    db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        company_name TEXT,
        company_address TEXT,
        company_city TEXT,
        company_postal_code TEXT,
        company_country TEXT,
        company_phone TEXT,
        company_email TEXT,
        company_website TEXT,
        company_siret TEXT,
        company_tax_id TEXT,
        company_capital TEXT,
        company_legal_form TEXT,
        company_rcs TEXT,
        bank_name TEXT,
        bank_iban TEXT,
        bank_bic TEXT,
        logo_path TEXT,
        signature_path TEXT,
        terms_and_conditions TEXT,
        invoice_footer TEXT,
        invoice_prefix TEXT DEFAULT 'FACT-',
        invoice_counter INTEGER DEFAULT 1,
        default_tax_rate REAL DEFAULT 20.0,
        default_payment_terms INTEGER DEFAULT 30,
        late_penalty_rate REAL DEFAULT 10.0,
        recovery_fee REAL DEFAULT 40.0,
        early_payment_discount REAL DEFAULT 0,
        legal_mentions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `, (err) => {
      if (err) {
        console.error('Erreur création table settings:', err);
      } else {
        // Insérer une ligne par défaut si elle n'existe pas
        db.run(`
          INSERT OR IGNORE INTO settings (
            id,
            company_name,
            invoice_footer,
            late_penalty_rate,
            recovery_fee,
            legal_mentions
          )
          VALUES (
            1,
            'Mon Entreprise',
            'Merci pour votre confiance',
            10.0,
            40.0,
            'En cas de retard de paiement, seront exigibles, conformément à l''article L. 441-10 du code de commerce, une indemnité calculée sur la base de trois fois le taux de l''intérêt légal en vigueur ainsi qu''une indemnité forfaitaire pour frais de recouvrement de 40 euros.'
          )
        `);
      }
    });

    console.log('Base de données initialisée avec succès');
  });
}

module.exports = db;
