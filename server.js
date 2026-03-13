const express = require('express');
const path = require('path');
const { getStatus, takeMed, getHistory, addMed, deleteMed, getPacificDate } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API Routes ───────────────────────────────────────────────────────────────

// GET /api/status — today's meds grouped by category
app.get('/api/status', (req, res) => {
  try {
    res.json(getStatus());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// POST /api/take — mark a med as taken
// Body: { med_id: number } OR { med_name: string }
app.post('/api/take', (req, res) => {
  try {
    let { med_id, med_name } = req.body;

    // Allow ElevenLabs agent to pass med name instead of id
    if (!med_id && med_name) {
      const { db } = require('./db');
      const med = db
        .prepare("SELECT id FROM meds WHERE LOWER(name) LIKE LOWER(?) AND active = 1")
        .get(`%${med_name}%`);
      if (!med) return res.status(404).json({ error: `Medication "${med_name}" not found` });
      med_id = med.id;
    }

    if (!med_id) return res.status(400).json({ error: 'med_id or med_name is required' });

    const result = takeMed(Number(med_id));
    if (!result.success) return res.status(409).json(result);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to log medication' });
  }
});

// GET /api/history?days=7 — recent log history
app.get('/api/history', (req, res) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 7, 90);
    res.json(getHistory(days));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

// POST /api/meds — add a new medication
app.post('/api/meds', (req, res) => {
  try {
    const { name, category, instructions } = req.body;
    if (!name || !category) return res.status(400).json({ error: 'name and category are required' });
    if (!['morning', 'evening', 'as_needed'].includes(category)) {
      return res.status(400).json({ error: 'category must be morning, evening, or as_needed' });
    }
    res.status(201).json(addMed(name, category, instructions));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add medication' });
  }
});

// DELETE /api/logs/today — clear all of today's medication logs
app.delete('/api/logs/today', (req, res) => {
  try {
    const { db } = require('./db');
    const today = getPacificDate();
    const result = db.prepare('DELETE FROM med_logs WHERE date = ?').run(today);
    res.json({ success: true, deleted: result.changes, date: today });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to clear today\'s logs' });
  }
});

// DELETE /api/meds/:id — soft-delete a medication
app.delete('/api/meds/:id', (req, res) => {
  try {
    const deleted = deleteMed(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Medication not found' });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete medication' });
  }
});

// ─── Catch-all → dashboard ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Med manager running on http://localhost:${PORT}`);
});
