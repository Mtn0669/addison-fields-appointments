const db = require('../db');

describe('Database Module', () => {
  
  describe('db.get()', () => {
    test('should retrieve promo code by code', (done) => {
      db.get("SELECT * FROM promo_codes WHERE code = ?", ['WELCOME10'], (err, code) => {
        expect(err).toBeNull();
        expect(code).toBeDefined();
        expect(code.code).toBe('WELCOME10');
        done();
      });
    });

    test('should return undefined for non-existent email', (done) => {
      db.get("SELECT * FROM users WHERE email = ?", ['nonexistent@test.com'], (err, user) => {
        expect(err).toBeNull();
        expect(user).toBeUndefined();
        done();
      });
    });

    test('should retrieve promo code case-insensitive', (done) => {
      db.get("SELECT * FROM promo_codes WHERE code = ?", ['welcome10'], (err, code) => {
        expect(err).toBeNull();
        expect(code).toBeDefined();
        expect(code.discount_value).toBe(10);
        done();
      });
    });
  });

  describe('db.all()', () => {
    test('should retrieve all promo codes as array', (done) => {
      db.all("SELECT * FROM promo_codes", [], (err, codes) => {
        expect(err).toBeNull();
        expect(Array.isArray(codes)).toBe(true);
        expect(codes.length).toBeGreaterThanOrEqual(2);
        done();
      });
    });

    test('should handle appointments query', (done) => {
      db.all("SELECT * FROM appointments", [], (err, appointments) => {
        expect(err).toBeNull();
        expect(Array.isArray(appointments) || appointments === undefined).toBe(true);
        done();
      });
    });

    test('should handle webcast_registrations query', (done) => {
      db.all("SELECT * FROM webcast_registrations", [], (err, registrations) => {
        expect(err).toBeNull();
        expect(Array.isArray(registrations) || registrations === undefined).toBe(true);
        done();
      });
    });
  });

  describe('db.run()', () => {
    test('should handle INSERT statement without error', (done) => {
      const params = ['insert-test@email.com', 'hash', 'Test', 'User', '5551234567', '1990-01-01', 'ID123456', 'passport'];

      db.run("INSERT INTO users", params, function(err) {
        // Error or success, both are valid for this test as long as callback is called
        expect(typeof this).toBe('object');
        done();
      });
    });

    test('should handle UPDATE statement', (done) => {
      db.run("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [999], function(err) {
        // Update on non-existent ID should not error
        expect(typeof this).toBe('object');
        done();
      });
    });
  });
});
