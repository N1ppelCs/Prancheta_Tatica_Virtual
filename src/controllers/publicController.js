const path = require('path');
const Team = require('../models/Team');
const Player = require('../models/Player');

// Render main public tactical board
exports.getBoard = (req, res) => {
  res.sendFile(path.join(__dirname, '../views/public/board.html'));
};

// GET /api/teams - Returns all teams and their colors for the public interface
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.getAll();
    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/teams/:id/players - Returns the list of active players of a specific team
exports.getTeamPlayers = async (req, res) => {
  try {
    const { id } = req.params;
    const players = await Player.getByTeamId(id, false); // Active only
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
