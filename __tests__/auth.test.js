const bcrypt = require('bcryptjs');

describe('Authentication - Password Hashing', () => {
  
  test('should hash password successfully', async () => {
    const password = 'testPassword123!';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);
    
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  test('should compare password correctly', async () => {
    const password = 'testPassword123!';
    const hash = await bcrypt.hash(password, 12);
    
    const isMatch = await bcrypt.compare(password, hash);
    expect(isMatch).toBe(true);
  });

  test('should reject incorrect password', async () => {
    const password = 'testPassword123!';
    const wrongPassword = 'wrongPassword456!';
    const hash = await bcrypt.hash(password, 12);
    
    const isMatch = await bcrypt.compare(wrongPassword, hash);
    expect(isMatch).toBe(false);
  });

  test('should produce different hashes for same password', async () => {
    const password = 'testPassword123!';
    const hash1 = await bcrypt.hash(password, 12);
    const hash2 = await bcrypt.hash(password, 12);
    
    expect(hash1).not.toBe(hash2);
    expect(await bcrypt.compare(password, hash1)).toBe(true);
    expect(await bcrypt.compare(password, hash2)).toBe(true);
  });
});

describe('Authentication - Age Verification', () => {
  
  function calculateAge(dateOfBirth) {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  test('should calculate age correctly for 18+ years old', () => {
    const birthDate = new Date(2000, 0, 1).toISOString().split('T')[0];
    const age = calculateAge(birthDate);
    expect(age).toBeGreaterThanOrEqual(18);
  });

  test('should identify person under 18 as ineligible', () => {
    const today = new Date();
    const birthDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate())
      .toISOString()
      .split('T')[0];
    const age = calculateAge(birthDate);
    expect(age).toBeLessThan(18);
  });

  test('should handle birthday edge cases', () => {
    const today = new Date();
    // Birthday exactly 18 years ago today
    const birthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
      .toISOString()
      .split('T')[0];
    const age = calculateAge(birthDate);
    expect(age).toBe(18);
  });
});
