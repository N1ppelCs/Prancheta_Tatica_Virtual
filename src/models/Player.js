const { pool } = require('../config/database');

class Player {
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM Players WHERE is_active = 1 ORDER BY name ASC');
    return rows;
  }

  static async getByTeamId(teamId, includeInactive = false) {
    const query = includeInactive 
      ? 'SELECT * FROM Players WHERE team_id = ? ORDER BY number ASC' 
      : 'SELECT * FROM Players WHERE team_id = ? AND is_active = 1 ORDER BY number ASC';
    const [rows] = await pool.query(query, [teamId]);
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM Players WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ team_id, name, number, position, photo_url }) {
    const [result] = await pool.query(
      'INSERT INTO Players (team_id, name, number, position, photo_url, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [team_id, name, number, position, photo_url]
    );
    return result.insertId;
  }

  static async update(id, { team_id, name, number, position, photo_url, is_active }) {
    await pool.query(
      'UPDATE Players SET team_id = ?, name = ?, number = ?, position = ?, photo_url = ?, is_active = ? WHERE id = ?',
      [team_id, name, number, position, photo_url, is_active, id]
    );
  }

  static async deleteSoft(id) {
    await pool.query('UPDATE Players SET is_active = 0 WHERE id = ?', [id]);
  }

  static async restore(id) {
    await pool.query('UPDATE Players SET is_active = 1 WHERE id = ?', [id]);
  }
}

module.exports = Player;
