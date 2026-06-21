require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const { pool, initializeDatabase } = require('./src/config/database');
const { requireAdmin } = require('./src/middlewares/authMiddleware');
const { uploadCrest, uploadAvatar } = require('./src/middlewares/uploadMiddleware');

const adminController = require('./src/controllers/adminController');
const publicController = require('./src/controllers/publicController');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup session middleware
app.use(session({
  secret: 'taticas-secret-key-123456789',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// --- PUBLIC ROUTES ---
app.get('/', publicController.getBoard);
app.get('/api/teams', publicController.getTeams);
app.get('/api/teams/:id/players', publicController.getTeamPlayers);

// --- ADMIN LOGIN / LOGOUT ---
app.get('/admin/login', adminController.getLogin);
app.post('/admin/login', adminController.postLogin);
app.get('/admin/logout', adminController.getLogout);

// --- PROTECTED ADMIN ROUTES & CRUD ---
app.get('/admin/dashboard', requireAdmin, adminController.getDashboard);

// Teams CMS
app.get('/admin/api/teams', requireAdmin, adminController.getTeams);
app.post('/admin/api/teams', requireAdmin, uploadCrest.single('crest'), adminController.createTeam);
app.put('/admin/api/teams/:id', requireAdmin, uploadCrest.single('crest'), adminController.updateTeam);
app.delete('/admin/api/teams/:id', requireAdmin, adminController.deleteTeam);

// Players CMS
app.get('/admin/api/teams/:id/players', requireAdmin, adminController.getTeamPlayers);
app.post('/admin/api/players', requireAdmin, uploadAvatar.single('photo'), adminController.createPlayer);
app.put('/admin/api/players/:id', requireAdmin, uploadAvatar.single('photo'), adminController.updatePlayer);
app.delete('/admin/api/players/:id', requireAdmin, adminController.deletePlayer);

// Initialize database and start server
async function startServer() {
  try {
    // 1. Bootstrap database schema
    await initializeDatabase();
    
    // 2. Initialize tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Teams (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        primary_color VARCHAR(7) NOT NULL,
        secondary_color VARCHAR(7) NOT NULL,
        crest_url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS Players (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        number INT NOT NULL,
        position VARCHAR(10) NOT NULL,
        photo_url VARCHAR(255) NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES Teams(id) ON DELETE RESTRICT
      );
    `);

    // Create placeholder image files so they don't return 404
    createPlaceholderFiles();

    // 3. Seed default teams & players if database is empty
    const [teamRows] = await pool.query('SELECT COUNT(*) as count FROM Teams');
    if (teamRows[0].count === 0) {
      await seedDatabase();
    }

    // 4. Start listening
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err.message);
  }
}

function createPlaceholderFiles() {
  const crestsDir = path.join(__dirname, 'public/uploads/crests');
  const avatarsDir = path.join(__dirname, 'public/uploads/avatars');

  if (!fs.existsSync(crestsDir)) fs.mkdirSync(crestsDir, { recursive: true });
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

  // Create empty placeholder image files if they don't exist
  const placeholders = [
    path.join(crestsDir, 'palmeiras.png'),
    path.join(crestsDir, 'flamengo.png')
  ];

  placeholders.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      // 1x1 transparent PNG pixel base64
      const placeholderPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      fs.writeFileSync(filePath, placeholderPng);
    }
  });
}

async function seedDatabase() {
  console.log('Seeding MySQL database with default Palmeiras and Flamengo rosters...');

  // Seed Palmeiras
  const [teamA] = await pool.query(
    'INSERT INTO Teams (name, primary_color, secondary_color, crest_url) VALUES (?, ?, ?, ?)',
    ['Palmeiras', '#006437', '#FFFFFF', '/uploads/crests/palmeiras.png']
  );
  const teamAId = teamA.insertId;

  const playersA = [
    { name: 'Weverton', number: 21, position: 'GK' },
    { name: 'Mayke', number: 2, position: 'RB' },
    { name: 'Gustavo Gómez', number: 15, position: 'CB' },
    { name: 'Murilo', number: 26, position: 'CB' },
    { name: 'Piquerez', number: 22, position: 'LB' },
    { name: 'Aníbal Moreno', number: 5, position: 'DM' },
    { name: 'Richard Ríos', number: 20, position: 'CM' },
    { name: 'Raphael Veiga', number: 23, position: 'AM' },
    { name: 'Estêvão', number: 41, position: 'RW' },
    { name: 'Felipe Anderson', number: 9, position: 'LW' },
    { name: 'Flaco López', number: 42, position: 'ST' }
  ];

  for (const p of playersA) {
    await pool.query(
      'INSERT INTO Players (team_id, name, number, position, photo_url, is_active) VALUES (?, ?, ?, ?, NULL, 1)',
      [teamAId, p.name, p.number, p.position]
    );
  }

  // Seed Flamengo
  const [teamB] = await pool.query(
    'INSERT INTO Teams (name, primary_color, secondary_color, crest_url) VALUES (?, ?, ?, ?)',
    ['Flamengo', '#C4122E', '#000000', '/uploads/crests/flamengo.png']
  );
  const teamBId = teamB.insertId;

  const playersB = [
    { name: 'Rossi', number: 1, position: 'GK' },
    { name: 'Varela', number: 2, position: 'RB' },
    { name: 'Fabrício Bruno', number: 15, position: 'CB' },
    { name: 'Léo Pereira', number: 4, position: 'CB' },
    { name: 'Ayrton Lucas', number: 6, position: 'LB' },
    { name: 'Erick Pulgar', number: 8, position: 'DM' },
    { name: 'De la Cruz', number: 18, position: 'CM' },
    { name: 'Arrascaeta', number: 14, position: 'AM' },
    { name: 'Luiz Araújo', number: 7, position: 'RW' },
    { name: 'Everton Cebolinha', number: 11, position: 'LW' },
    { name: 'Pedro', number: 9, position: 'ST' }
  ];

  for (const p of playersB) {
    await pool.query(
      'INSERT INTO Players (team_id, name, number, position, photo_url, is_active) VALUES (?, ?, ?, ?, NULL, 1)',
      [teamBId, p.name, p.number, p.position]
    );
  }

  console.log('Database seeded successfully!');
}

startServer();
