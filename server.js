const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // sert index.html dans le même dossier

const db = new sqlite3.Database('./petition.db');

db.run(`
  CREATE TABLE IF NOT EXISTS signatures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    country TEXT NOT NULL,
    date TEXT NOT NULL
  )
`);

app.get('/api/signatures', (req, res) => {
    db.get('SELECT COUNT(*) as total FROM signatures', (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });
        db.all('SELECT name, country, date FROM signatures ORDER BY date DESC LIMIT 20', (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ total: countResult.total, recent: rows });
        });
    });
});

app.post('/api/sign', (req, res) => {
    const { name, email, country } = req.body;
    if (!name || !email || !country) {
        return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    const date = new Date().toISOString();
    db.run(
        'INSERT INTO signatures (name, email, country, date) VALUES (?, ?, ?, ?)',
        [name.trim(), email.trim().toLowerCase(), country, date],
        function (err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(409).json({ error: 'Cet email a déjà signé.' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true });
        }
    );
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});