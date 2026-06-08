const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Connexion à PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Création de la table
pool.query(`
  CREATE TABLE IF NOT EXISTS signatures (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    date TEXT NOT NULL
  )
`);

// Route pour récupérer les signatures
app.get('/api/signatures', async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as total FROM signatures');
    const recent = await pool.query('SELECT name, country, date FROM signatures ORDER BY date DESC LIMIT 20');
    res.json({ 
      total: parseInt(countResult.rows[0].total), 
      recent: recent.rows 
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Route pour ajouter une signature
app.post('/api/sign', async (req, res) => {
  const { name, email, country } = req.body;
  if (!name || !email || !country) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }
  const date = new Date().toISOString();
  try {
    await pool.query(
      'INSERT INTO signatures (name, email, country, date) VALUES ($1, $2, $3, $4)',
      [name.trim(), email.trim().toLowerCase(), country, date]
    );
    res.json({ success: true });
  } catch(err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Cet email a déjà signé.' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
