import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'público')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'público', 'formulario.html'));
});

const adapter = new JSONFileSync('database.json');
const defaultData = { reportes: [] };
const db = new Low(adapter, defaultData);
db.read();

app.post('/api/reportes', (req, res) => {
  const { fecha, observaciones, integrantes, materiales } = req.body;
  if (!fecha || !integrantes || !materiales?.length) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  const nuevoReporte = {
    id: Date.now(),
    fecha,
    observaciones,
    integrantes,
    materiales,
    creado_en: new Date().toLocaleString('es-EC')
  };
  db.data.reportes.push(nuevoReporte);
  db.write();
  res.json({ ok: true, id: nuevoReporte.id });
});

app.get('/api/reportes', (req, res) => {
  const reportes = [...db.data.reportes].reverse();
  res.json(reportes);
});

app.delete('/api/reportes/:id', (req, res) => {
  db.data.reportes = db.data.reportes.filter(r => r.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});