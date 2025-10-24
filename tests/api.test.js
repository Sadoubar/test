const request = require('supertest');
const app = require('../server/index');
const database = require('../server/database');

// Configuration pour les tests
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

describe('API Tests', () => {
  beforeAll(async () => {
    await database.init();
  });

  afterAll(async () => {
    await database.close();
  });

  describe('Health Check', () => {
    test('GET /api/health should return 200', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('OK');
    });
  });

  describe('Clients API', () => {
    let clientId;

    test('POST /api/clients should create a new client', async () => {
      const newClient = {
        name: 'Test Client',
        email: 'test@example.com',
        phone: '+33123456789',
        address: '123 Test Street',
        city: 'Paris',
        postal_code: '75001',
        country: 'France'
      };

      const response = await request(app)
        .post('/api/clients')
        .send(newClient);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      clientId = response.body.id;
    });

    test('GET /api/clients should return all clients', async () => {
      const response = await request(app).get('/api/clients');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('GET /api/clients/:id should return a specific client', async () => {
      const response = await request(app).get(`/api/clients/${clientId}`);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Client');
    });

    test('PUT /api/clients/:id should update a client', async () => {
      const response = await request(app)
        .put(`/api/clients/${clientId}`)
        .send({ name: 'Updated Client' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client mis à jour avec succès');
    });

    test('POST /api/clients with invalid data should return 400', async () => {
      const response = await request(app)
        .post('/api/clients')
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });
  });

  describe('Products API', () => {
    let productId;

    test('POST /api/products should create a new product', async () => {
      const newProduct = {
        name: 'Test Product',
        description: 'A test product',
        price: 99.99,
        unit: 'unité'
      };

      const response = await request(app)
        .post('/api/products')
        .send(newProduct);

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
      productId = response.body.id;
    });

    test('GET /api/products should return all products', async () => {
      const response = await request(app).get('/api/products');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('GET /api/products/:id should return a specific product', async () => {
      const response = await request(app).get(`/api/products/${productId}`);
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Test Product');
    });

    test('DELETE /api/products/:id should delete a product', async () => {
      const response = await request(app).delete(`/api/products/${productId}`);
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    test('GET /api/invalid-route should return 404', async () => {
      const response = await request(app).get('/api/invalid-route');
      expect(response.status).toBe(404);
    });

    test('GET /api/clients/999999 should return 404', async () => {
      const response = await request(app).get('/api/clients/999999');
      expect(response.status).toBe(404);
    });
  });
});
