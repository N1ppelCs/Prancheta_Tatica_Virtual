const path = require('path');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Render Login Page
exports.getLogin = (req, res) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.sendFile(path.join(__dirname, '../views/admin/login.html'));
};

// Process Admin Authentication
exports.postLogin = (req, res) => {
  const { username, password } = req.body;
  
  // Default Credentials
  if (username === 'admin' && password === 'admin') {
    req.session.adminId = 1;
    req.session.username = 'admin';
    return res.json({ success: true, redirect: '/admin/dashboard' });
  } else {
    return res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }
};

// Logout handler
exports.getLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/admin/login');
  });
};

// Render Admin Dashboard Page
exports.getDashboard = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin/dashboard.html'));
};

// --- Teams API Endpoints ---

exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.getAll();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTeam = async (req, res) => {
  try {
    const { name, primary_color, secondary_color } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'O escudo oficial da equipe é obrigatório.' });
    }

    const crest_url = `/uploads/crests/${req.file.filename}`;
    const insertId = await Team.create({
      name,
      primary_color,
      secondary_color,
      crest_url
    });

    res.status(201).json({ id: insertId, name, primary_color, secondary_color, crest_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTeam = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, primary_color, secondary_color } = req.body;
    
    const existing = await Team.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Equipe não encontrada.' });
    }

    let crest_url = existing.crest_url;
    if (req.file) {
      crest_url = `/uploads/crests/${req.file.filename}`;
    }

    await Team.update(id, {
      name,
      primary_color,
      secondary_color,
      crest_url
    });

    res.json({ message: 'Equipe atualizada com sucesso', crest_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTeam = async (req, res) => {
  try {
    const { id } = req.params;
    await Team.delete(id);
    res.json({ message: 'Equipe excluída com sucesso' });
  } catch (err) {
    // If team has players (foreign key constraint), MySQL will reject the deletion
    res.status(400).json({ error: 'Não é possível excluir esta equipe pois há jogadores vinculados a ela.' });
  }
};

// --- Players API Endpoints (Admin specific) ---

exports.getTeamPlayers = async (req, res) => {
  try {
    const { id } = req.params; // Team ID
    const players = await Player.getByTeamId(id, true); // Include inactive
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPlayer = async (req, res) => {
  try {
    const { team_id, name, number, position } = req.body;
    
    let photo_url = null;
    if (req.file) {
      photo_url = `/uploads/avatars/${req.file.filename}`;
    }

    const insertId = await Player.create({
      team_id,
      name,
      number: parseInt(number),
      position,
      photo_url
    });

    res.status(201).json({ id: insertId, team_id, name, number, position, photo_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    const { team_id, name, number, position, is_active } = req.body;
    
    const existing = await Player.getById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Jogador não encontrado.' });
    }

    let photo_url = existing.photo_url;
    if (req.file) {
      photo_url = `/uploads/avatars/${req.file.filename}`;
    }

    await Player.update(id, {
      team_id,
      name,
      number: parseInt(number),
      position,
      photo_url,
      is_active: parseInt(is_active)
    });

    res.json({ message: 'Jogador atualizado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePlayer = async (req, res) => {
  try {
    const { id } = req.params;
    await Player.deleteSoft(id); // Soft Delete
    res.json({ message: 'Jogador desativado (soft delete) com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
