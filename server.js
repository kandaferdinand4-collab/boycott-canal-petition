const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Table simplifiée : pas de nom, pas d'email, seulement pays + ID unique
pool.query(`
  CREATE TABLE IF NOT EXISTS signatures_simple (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL,
    device_id TEXT UNIQUE NOT NULL,
    date TEXT NOT NULL
  )
`);

// Récupérer les signatures
app.get('/api/signatures', async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as total FROM signatures_simple');
    const recent = await pool.query('SELECT country, date FROM signatures_simple ORDER BY date DESC LIMIT 20');
    res.json({ 
      total: parseInt(countResult.rows[0].total), 
      recent: recent.rows 
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// Ajouter une signature (simplifié)
app.post('/api/sign-simple', async (req, res) => {
  const { country, deviceId } = req.body;
  if (!country) {
    return res.status(400).json({ error: 'Veuillez sélectionner votre pays.' });
  }
  const date = new Date().toISOString();
  try {
    await pool.query(
      'INSERT INTO signatures_simple (country, device_id, date) VALUES ($1, $2, $3)',
      [country, deviceId || `temp-${Date.now()}`, date]
    );
    res.json({ success: true });
  } catch(err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Vous avez déjà soutenu ! Merci.' });
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
