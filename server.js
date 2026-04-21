import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || join(__dirname, 'data');
try { mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, 'público')));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'público', 'formulario.html'));
});

const adapter = new JSONFileSync(join(DATA_DIR, 'database.json'));
const defaultData = { reportes: [], bodega: [], movimientos: [] };
const db = new Low(adapter, defaultData);
db.read();
if (!db.data.bodega) db.data.bodega = [];
if (!db.data.movimientos) db.data.movimientos = [];

// ── Reportes ─────────────────────────────────────────────
app.post('/api/reportes', (req, res) => {
  const { fecha, observaciones, integrantes, materiales } = req.body;
  if (!fecha || !integrantes || !materiales?.length) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  const nuevoReporte = {
    id: Date.now(),
    fecha,
    observaciones,
    integrantes: Array.isArray(integrantes) ? integrantes : integrantes.split(',').map(i => i.trim()),
    materiales,
    creado_en: new Date().toLocaleString('es-EC')
  };
  db.data.reportes.push(nuevoReporte);
  db.write();
  res.json({ ok: true, id: nuevoReporte.id });
});

app.get('/api/reportes', (req, res) => {
  const reportes = [...db.data.reportes].reverse().map(r => ({
    ...r,
    integrantes: Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(i => i.trim())
  }));
  res.json(reportes);
});

app.delete('/api/reportes/:id', (req, res) => {
  db.data.reportes = db.data.reportes.filter(r => r.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Bodega ───────────────────────────────────────────────
app.get('/api/bodega', (req, res) => {
  res.json(db.data.bodega);
});

app.post('/api/bodega/stock', (req, res) => {
  const { material, cantidad } = req.body;
  if (!material || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const item = db.data.bodega.find(b => b.material === material);
  if (item) {
    item.cantidad = cantidad;
  } else {
    db.data.bodega.push({ material, cantidad });
  }
  db.write();
  res.json({ ok: true });
});

app.post('/api/bodega/movimiento', (req, res) => {
  const { tipo, material, cantidad, responsable, nota } = req.body;
  if (!tipo || !material || !cantidad || !responsable) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const item = db.data.bodega.find(b => b.material === material);
  if (!item) return res.status(400).json({ error: 'Material no encontrado' });

  if (tipo === 'salida' && item.cantidad < cantidad) {
    return res.status(400).json({ error: 'Stock insuficiente' });
  }

  item.cantidad += tipo === 'entrada' || tipo === 'devolucion' ? cantidad : -cantidad;

  const movimiento = {
    id: Date.now(),
    tipo,
    material,
    cantidad,
    responsable,
    nota: nota || '',
    fecha: new Date().toLocaleString('es-EC')
  };
  db.data.movimientos.push(movimiento);
  db.write();
  res.json({ ok: true });
});

app.get('/api/bodega/movimientos', (req, res) => {
  res.json([...db.data.movimientos].reverse());
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});