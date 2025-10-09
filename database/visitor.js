const { runQuery, getQuery, allQuery } = require('./connection');

class Visitor {
  constructor(data = {}) {
    this.id = data.id;
    this.userId = data.user_id;
    this.visitorName = data.visitor_name;
    this.email = data.email;
    this.phone = data.phone;
    this.validFrom = data.valid_from;
    this.validTo = data.valid_to;
    this.notes = data.notes;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      visitorName: this.visitorName,
      email: this.email,
      phone: this.phone,
      validFrom: this.validFrom,
      validTo: this.validTo,
      notes: this.notes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static async create(visitorData) {
    const { userId, visitorName, email = null, phone = null, validFrom = null, validTo, notes = null } = visitorData;
    const values = [userId, visitorName, email, phone, validFrom, validTo, notes];
    const result = await runQuery(
      `INSERT INTO visitors (user_id, visitor_name, email, phone, valid_from, valid_to, notes)
       VALUES (?, ?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP), ?, ?)`,
      values
    );
    const created = await Visitor.findById(result.lastID);
    return created;
  }

  static async findById(id) {
    const row = await getQuery('SELECT * FROM visitors WHERE id = ?', [id]);
    return row ? new Visitor(row) : null;
  }

  static async findByUser(userId, options = {}) {
    const { includeExpired = false, page = 1, limit = 20 } = options;
    let sql = 'SELECT * FROM visitors WHERE user_id = ?';
    const params = [userId];
    if (!includeExpired) {
      sql += ' AND valid_to >= CURRENT_TIMESTAMP';
    }
    sql += ' ORDER BY valid_to ASC LIMIT ? OFFSET ?';
    params.push(limit, (page - 1) * limit);
    const rows = await allQuery(sql, params);
    return rows.map(r => new Visitor(r));
  }

  static async countByUser(userId, options = {}) {
    const { includeExpired = false } = options;
    let sql = 'SELECT COUNT(*) as count FROM visitors WHERE user_id = ?';
    const params = [userId];
    if (!includeExpired) {
      sql += ' AND valid_to >= CURRENT_TIMESTAMP';
    }
    const row = await getQuery(sql, params);
    return row.count;
  }

  async update(updateData) {
    const allowed = ['visitor_name', 'email', 'phone', 'valid_from', 'valid_to', 'notes'];
    const mapping = {
      visitorName: 'visitor_name',
      validFrom: 'valid_from',
      validTo: 'valid_to',
    };
    const updates = [];
    const params = [];
    for (const [key, value] of Object.entries(updateData)) {
      const dbKey = mapping[key] || key;
      if (allowed.includes(dbKey) && value !== undefined) {
        updates.push(`${dbKey} = ?`);
        params.push(value);
      }
    }
    if (updates.length === 0) return this;
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(this.id);
    const sql = `UPDATE visitors SET ${updates.join(', ')} WHERE id = ?`;
    await runQuery(sql, params);
    const refreshed = await Visitor.findById(this.id);
    return refreshed;
  }

  async delete() {
    await runQuery('DELETE FROM visitors WHERE id = ?', [this.id]);
    return true;
  }
}

module.exports = Visitor;
