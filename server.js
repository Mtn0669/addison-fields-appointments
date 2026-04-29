const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');
const utils = require('./utils');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'addison-fields-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Authentication middleware
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  }
  if (req.accepts('html')) {
    return res.redirect('/login');
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (req.session && req.session.userId && req.session.isAdmin) {
    return next();
  }
  if (req.accepts('html')) {
    return res.status(403).send('<h1>Access Denied</h1><p>Admin privileges required.</p>');
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Routes

// Home page
app.get('/', (req, res) => {
  res.send('<!DOCTYPE html><html><head><title>Addison Fields Appointments</title></head><body><h1>Welcome to Addison Fields Appointments</h1><p><a href="/login">Login</a> | <a href="/register">Register</a></p></body></html>');
});

// Login page
app.get('/login', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/profile');
  }
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Register page
app.get('/register', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/profile');
  }
  res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// Login POST
app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).send('Email and password required');
    }

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
      if (err) {
        return res.status(500).send('Server error');
      }

      if (!user) {
        return res.status(401).send('Invalid credentials');
      }

      const isMatch = await utils.comparePassword(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).send('Invalid credentials');
      }

      // Update last login
      db.run('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);

      // Set session
      req.session.userId = user.id;
      req.session.isAdmin = user.is_admin === 1;
      req.session.userName = `${user.first_name} ${user.last_name}`;

      if (req.accepts('html')) {
        return res.redirect('/profile');
      }
      return res.json({ message: 'Login successful', user: { id: user.id, email: user.email, name: req.session.userName } });
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Register POST
app.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, dateOfBirth, idNumber, idType } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !phone || !dateOfBirth || !idNumber || !idType) {
      return res.status(400).send('All fields required');
    }

    if (!utils.isValidEmail(email)) {
      return res.status(400).send('Invalid email format');
    }

    if (!utils.isStrongPassword(password)) {
      return res.status(400).send('Password must be at least 8 characters with uppercase, lowercase, number, and special character');
    }

    if (!utils.isValidPhone(phone)) {
      return res.status(400).send('Invalid phone number');
    }

    const age = utils.calculateAge(dateOfBirth);
    if (age < 18) {
      return res.status(400).send('Must be 18 years or older');
    }

    // Check if email exists
    db.get('SELECT id FROM users WHERE email = ?', [email], (err, existingUser) => {
      if (err) {
        return res.status(500).send('Server error');
      }
      if (existingUser) {
        return res.status(400).send('Email already registered');
      }

      // Hash password and create user
      const passwordHash = utils.hashPasswordSync(password);

      db.run('INSERT INTO users (email, password_hash, first_name, last_name, phone, date_of_birth, id_number, id_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [email, passwordHash, firstName, lastName, phone, dateOfBirth, idNumber, idType],
        function(err) {
          if (err) {
            return res.status(500).send('Server error');
          }

          // Set session
          req.session.userId = this.lastID;
          req.session.isAdmin = false;
          req.session.userName = `${firstName} ${lastName}`;

          if (req.accepts('html')) {
            return res.redirect('/profile');
          }
          return res.json({ message: 'Registration successful', user: { id: this.lastID, email, name: `${firstName} ${lastName}` } });
        }
      );
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});

// Profile page (protected)
app.get('/profile', requireAuth, (req, res) => {
  db.get('SELECT id, email, first_name, last_name, phone, date_of_birth, id_number, id_type, created_at FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(500).send('Server error');
    }
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Profile - Addison Fields</title></head>
      <body>
        <h1>Welcome, ${req.session.userName}</h1>
        <h2>Your Profile</h2>
        <p><strong>Email:</strong> ${user.email}</p>
        <p><strong>Name:</strong> ${user.first_name} ${user.last_name}</p>
        <p><strong>Phone:</strong> ${user.phone}</p>
        <p><strong>Date of Birth:</strong> ${user.date_of_birth}</p>
        <p><strong>ID:</strong> ${user.id_number} (${user.id_type})</p>
        <p><a href="/logout">Logout</a></p>
      </body>
      </html>
    `);
  });
});

// Verify age page (protected)
app.get('/verify-age', requireAuth, (req, res) => {
  db.get('SELECT date_of_birth FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err || !user) {
      return res.status(500).send('Server error');
    }
    const age = utils.calculateAge(user.date_of_birth);
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>Age Verification - Addison Fields</title></head>
      <body>
        <h1>Age Verification</h1>
        <p>You are <strong>${age} years old</strong>.</p>
        <p>Status: ${age >= 18 ? '<span style="color:green">Verified (18+)</span>' : '<span style="color:red">Under 18</span>'}</p>
        <p><a href="/profile">Back to Profile</a></p>
      </body>
      </html>
    `);
  });
});

// Bookings/Appointments page (protected)
app.get('/bookings', requireAuth, (req, res) => {
  db.all('SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_date, appointment_time', [req.session.userId], (err, appointments) => {
    if (err) {
      return res.status(500).send('Server error');
    }
    let html = `
      <!DOCTYPE html>
      <html>
      <head><title>Bookings - Addison Fields</title></head>
      <body>
        <h1>Your Appointments</h1>
    `;

    if (appointments && appointments.length > 0) {
      html += '<ul>';
      appointments.forEach(apt => {
        html += `<li>${apt.appointment_date} at ${apt.appointment_time} - ${apt.service_type} (${apt.status})</li>`;
      });
      html += '</ul>';
    } else {
      html += '<p>No appointments scheduled.</p>';
    }

    html += '<p><a href="/profile">Back to Profile</a></p></body></html>';
    res.send(html);
  });
});

// Admin page (admin only)
app.get('/admin', requireAdmin, (req, res) => {
  // Get all users
  db.all('SELECT id, email, first_name, last_name, is_admin, created_at FROM users ORDER BY created_at DESC', [], (err, users) => {
    if (err) {
      return res.status(500).send('Server error');
    }

    // Get all appointments
    db.all(`
      SELECT a.*, u.first_name, u.last_name
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.appointment_date DESC
    `, [], (err, appointments) => {
      if (err) {
        return res.status(500).send('Server error');
      }

      let html = `
        <!DOCTYPE html>
        <html>
        <head><title>Admin Panel - Addison Fields</title></head>
        <body>
          <h1>Admin Panel</h1>
          <p><a href="/profile">Back to Profile</a> | <a href="/logout">Logout</a></p>

          <h2>Users (${users.length})</h2>
          <table border="1">
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Admin</th><th>Registered</th></tr>
      `;

      users.forEach(user => {
        html += `<tr><td>${user.id}</td><td>${user.first_name} ${user.last_name}</td><td>${user.email}</td><td>${user.is_admin ? 'Yes' : 'No'}</td><td>${user.created_at}</td></tr>`;
      });

      html += '</table>';

      html += '<h2>Appointments</h2><table border="1"><tr><th>ID</th><th>User</th><th>Date</th><th>Time</th><th>Service</th><th>Status</th></tr>';

      if (appointments) {
        appointments.forEach(apt => {
          html += `<tr><td>${apt.id}</td><td>${apt.first_name} ${apt.last_name}</td><td>${apt.appointment_date}</td><td>${apt.appointment_time}</td><td>${apt.service_type}</td><td>${apt.status}</td></tr>`;
        });
      }

      html += '</table></body></html>';
      res.send(html);
    });
  });
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect('/profile');
    }
    res.redirect('/login?loggedOut=true');
  });
});

// API endpoint for promo codes
app.get('/api/promo-codes', (req, res) => {
  db.all('SELECT * FROM promo_codes', [], (err, codes) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    res.json({ promo_codes: codes });
  });
});

// API to check promo code
app.get('/api/promo/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  db.get('SELECT * FROM promo_codes WHERE code = ?', [code], (err, promo) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }
    if (!promo) {
      return res.status(404).json({ error: 'Promo code not found' });
    }
    res.json(promo);
  });
});

// Start server (only if this is the main module)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Login page: http://localhost:${PORT}/login`);
    console.log(`Register: http://localhost:${PORT}/register`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
  });
}

module.exports = app;
