const { pool } = require('../config/database');

class Team {
  static async getAll() {
    const [rows] = await pool.query('SELECT * FROM Teams ORDER BY name ASC');
    return rows;
  }

  static async getById(id) {
    const [rows] = await pool.query('SELECT * FROM Teams WHERE id = ?', [id]);
    return rows[0] || null;
  }

  static async create({ name, primary_color, secondary_color, crest_url }) {
    const [result] = await pool.query(
      'INSERT INTO Teams (name, primary_color, secondary_color, crest_url) VALUES (?, ?, ?, ?)',
      [name, primary_color, secondary_color, crest_url]
    );
    return result.insertId;
  }

  static async update(id, { name, primary_color, secondary_color, crest_url }) {
    await pool.query(
      'UPDATE Teams SET name = ?, primary_color = ?, secondary_color = ?, crest_url = ? WHERE id = ?',
      [name, primary_color, secondary_color, crest_url, id]
    );
  }

  static async delete(id) {
    // MySQL foreign key constraint ON DELETE RESTRICT will prevent deletion of teams with active players
    await pool.query('DELETE FROM Teams WHERE id = ?', [id]);
  }
}

module.exports = Team;
