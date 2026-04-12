describe('Utility Functions', () => {
  
  // Email validation
  function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  describe('Email Validation', () => {
    test('should validate correct email format', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('john+tag@example.com')).toBe(true);
    });

    test('should reject invalid email format', () => {
      expect(isValidEmail('invalid.email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('test @example.com')).toBe(false);
    });

    test('should reject empty email', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });

  // Phone validation
  function isValidPhone(phone) {
    const phoneRegex = /^[0-9\-\+\(\)\s]{10,}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  describe('Phone Validation', () => {
    test('should validate correct phone formats', () => {
      expect(isValidPhone('123-456-7890')).toBe(true);
      expect(isValidPhone('(123) 456-7890')).toBe(true);
      expect(isValidPhone('+1 123 456 7890')).toBe(true);
    });

    test('should reject invalid phone formats', () => {
      expect(isValidPhone('123')).toBe(false);
      expect(isValidPhone('abc-def-ghij')).toBe(false);
    });
  });

  // Password strength validation
  function isStrongPassword(password) {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special char
    const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return strongRegex.test(password);
  }

  describe('Password Strength Validation', () => {
    test('should accept strong passwords', () => {
      expect(isStrongPassword('SecurePass123!')).toBe(true);
      expect(isStrongPassword('MyPassword@2024')).toBe(true);
    });

    test('should reject weak passwords', () => {
      expect(isStrongPassword('weak')).toBe(false);
      expect(isStrongPassword('noNumbers!')).toBe(false);
      expect(isStrongPassword('NONUMBERS123')).toBe(false);
      expect(isStrongPassword('nouppercase123!')).toBe(false);
    });
  });

  // Date formatting
  function formatISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  describe('Date Formatting', () => {
    test('should format date to ISO string', () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(formatISO(date)).toBe('2024-01-05');
    });

    test('should pad single digit months and days', () => {
      const date = new Date(2024, 8, 3); // Sep 3, 2024
      expect(formatISO(date)).toBe('2024-09-03');
    });
  });

  // Amount formatting
  function formatCurrency(amount) {
    return `$${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  describe('Currency Formatting', () => {
    test('should format currency correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(250.5)).toBe('$250.50');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });
  });
});
