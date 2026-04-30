const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Sajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Pastikan folder data ada untuk mount volume Docker
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);

// Inisialisasi SQLite Database
const db = new sqlite3.Database(path.join(dbDir, 'cheatsheet.db'));

// Buat tabel jika belum ada
db.run(`
  CREATE TABLE IF NOT EXISTS commands (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    cmd TEXT,
    desc TEXT,
    cat TEXT
  )
`);

// --- REST API ENDPOINTS ---

// GET: Ambil semua data
app.get('/api/commands', (req, res) => {
  db.all('SELECT * FROM commands ORDER BY id DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});


app.get('/api/categories', (req, res) => {
  db.all('SELECT DISTINCT cat FROM commands', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(r => r.cat));
  });
});


// POST: Tambah data baru
app.post('/api/commands', (req, res) => {
  const { name, cmd, desc, cat } = req.body;
  db.run('INSERT INTO commands (name, cmd, desc, cat) VALUES (?, ?, ?, ?)', 
    [name, cmd, desc, cat], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID, name, cmd, desc, cat });
  });
});

// PUT: Update data
app.put('/api/commands/:id', (req, res) => {
  const { name, cmd, desc, cat } = req.body;
  db.run('UPDATE commands SET name = ?, cmd = ?, desc = ?, cat = ? WHERE id = ?',
    [name, cmd, desc, cat, req.params.id], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ updated: this.changes });
  });
});

// DELETE: Hapus data
app.delete('/api/commands/:id', (req, res) => {
  db.run('DELETE FROM commands WHERE id = ?', req.params.id, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

const PORT = 3080;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
