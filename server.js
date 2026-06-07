import express from 'express';
import session from 'express-session';
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/adapters';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 8080;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.json')
  : join(__dirname, 'database.json');

const adapter = new JSONFileSync(dbPath);
const db = new Low(adapter, {});
db.read();
db.data ||= { reportes:[], cajas:[], mangas:[], cuadrillas:[], bodega:[], movimientos:[] };
if (!db.data.mangas) db.data.mangas = [];
db.write();

app.use(express.json());
app.use(express.static(join(__dirname, 'público')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'airnet_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const upload = multer({ storage: multer.memoryStorage() });

const USUARIOS = {
  [process.env.ADMIN_USER || 'Telecomadmin']: { pass: process.env.ADMIN_PASS || 'Airnet2024$', rol: 'admin', nombre: 'Administrador' },
  Efrain:    { pass: process.env.USER_EFRAIN_PASS    || 'Ef#2024!rain',   rol: 'trabajador', nombre: 'Efrain' },
  Alejandro: { pass: process.env.USER_ALEJANDRO_PASS || 'Al@2024!ejo',    rol: 'trabajador', nombre: 'Alejandro' },
  DavidG:    { pass: process.env.USER_DAVIDG_PASS    || 'Dg*2024!garcia', rol: 'trabajador', nombre: 'David Garcia' },
};

const sesionesActivas = new Map();

function fechaLocal() {
  const a = new Date();
  return `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`;
}

// ── Auth ─────────────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const user = USUARIOS[usuario];
  if (!user || user.pass !== password) return res.json({ ok: false, error: 'Usuario o contraseña incorrectos' });
  req.session.usuario = usuario;
  req.session.rol = user.rol;
  req.session.nombre = user.nombre;
  sesionesActivas.set(usuario, { nombre: user.nombre, desde: new Date() });
  res.json({ ok: true, rol: user.rol });
});

app.post('/api/logout', (req, res) => {
  if (req.session?.usuario) sesionesActivas.delete(req.session.usuario);
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/api/me', (req, res) => {
  if (!req.session?.usuario) return res.json({ loggedIn: false });
  res.json({ loggedIn: true, usuario: req.session.usuario, rol: req.session.rol, nombre: req.session.nombre });
});

app.get('/api/conectados', (req, res) => {
  res.json([...sesionesActivas.values()]);
});

// ── Reportes ──────────────────────────────────────────────
app.get('/api/reportes', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const reportes = [...(db.data.reportes || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  res.json(reportes);
});

app.post('/api/reportes', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const reporte = { id: Date.now(), ...req.body, fotos: [], creado_en: new Date().toISOString() };
  db.data.reportes.push(reporte);
  db.write();
  res.json({ ok: true, reporte });
});

app.put('/api/reportes/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const idx = db.data.reportes.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, error: 'No encontrado' });
  db.data.reportes[idx] = { ...db.data.reportes[idx], ...req.body };
  db.write();
  res.json({ ok: true });
});

app.delete('/api/reportes/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  db.data.reportes = db.data.reportes.filter(r => r.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

app.post('/api/reportes/:id/fotos', upload.array('fotos'), async (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const idx = db.data.reportes.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, error: 'Reporte no encontrado' });
  try {
    const urls = await Promise.all(req.files.map(file => new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({ folder: 'airnet' }, (err, result) => {
        if (err) reject(err); else resolve({ url: result.secure_url, public_id: result.public_id });
      });
      Readable.from(file.buffer).pipe(stream);
    })));
    db.data.reportes[idx].fotos = [...(db.data.reportes[idx].fotos || []), ...urls];
    db.write();
    res.json({ ok: true, fotos: urls });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

app.delete('/api/reportes/:id/fotos/:public_id', async (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const idx = db.data.reportes.findIndex(r => r.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, error: 'Reporte no encontrado' });
  try {
    const publicId = decodeURIComponent(req.params.public_id);
    await cloudinary.uploader.destroy(publicId);
    db.data.reportes[idx].fotos = (db.data.reportes[idx].fotos || []).filter(f => f.public_id !== publicId);
    db.write();
    res.json({ ok: true });
  } catch(e) { res.json({ ok: false, error: e.message }); }
});

// ── Cajas ─────────────────────────────────────────────────
app.get('/api/cajas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  res.json(db.data.cajas || []);
});

app.post('/api/cajas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const caja = { id: Date.now(), ...req.body, registrado_por: req.session.usuario, creado_en: new Date().toISOString() };
  if (!db.data.cajas) db.data.cajas = [];
  db.data.cajas.push(caja);
  db.write();
  res.json({ ok: true, caja });
});

app.put('/api/cajas/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const idx = db.data.cajas.findIndex(c => c.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, error: 'No encontrada' });
  db.data.cajas[idx] = { ...db.data.cajas[idx], ...req.body };
  db.write();
  res.json({ ok: true });
});

app.delete('/api/cajas/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  db.data.cajas = db.data.cajas.filter(c => c.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Mangas ────────────────────────────────────────────────
app.get('/api/mangas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  res.json(db.data.mangas || []);
});

app.post('/api/mangas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const { nombre, tipoFibra, sector, distribucion, lat, lng } = req.body;
  if (!nombre || !lat || !lng) return res.json({ ok: false, error: 'Faltan datos obligatorios' });
  if (!db.data.mangas) db.data.mangas = [];
  const manga = {
    id: Date.now(), nombre, tipoFibra, sector,
    distribucion: distribucion || [], lat, lng,
    registrado_por: req.session.usuario,
    creado_en: new Date().toISOString()
  };
  db.data.mangas.push(manga);
  db.write();
  res.json({ ok: true, manga });
});

app.put('/api/mangas/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  if (!db.data.mangas) return res.json({ ok: false, error: 'No existe' });
  const idx = db.data.mangas.findIndex(m => m.id === parseInt(req.params.id));
  if (idx === -1) return res.json({ ok: false, error: 'No encontrada' });
  db.data.mangas[idx] = { ...db.data.mangas[idx], ...req.body };
  db.write();
  res.json({ ok: true });
});

app.delete('/api/mangas/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  if (!db.data.mangas) return res.json({ ok: false });
  db.data.mangas = db.data.mangas.filter(m => m.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Cuadrillas ────────────────────────────────────────────
app.get('/api/cuadrillas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  res.json(db.data.cuadrillas || []);
});

app.post('/api/cuadrillas', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const cuadrilla = { id: Date.now(), ...req.body };
  if (!db.data.cuadrillas) db.data.cuadrillas = [];
  db.data.cuadrillas.push(cuadrilla);
  db.write();
  res.json({ ok: true, cuadrilla });
});

app.delete('/api/cuadrillas/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  db.data.cuadrillas = (db.data.cuadrillas || []).filter(c => c.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Bodega ────────────────────────────────────────────────
app.get('/api/bodega', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  res.json(db.data.bodega || []);
});

app.post('/api/bodega/stock', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const { material, cantidad } = req.body;
  if (!db.data.bodega) db.data.bodega = [];
  const idx = db.data.bodega.findIndex(b => b.material === material);
  if (idx >= 0) db.data.bodega[idx].cantidad = cantidad;
  else db.data.bodega.push({ material, cantidad });
  db.write();
  res.json({ ok: true });
});

app.get('/api/bodega/movimientos', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const movimientos = [...(db.data.movimientos || [])].sort((a, b) => b.id - a.id);
  res.json(movimientos);
});

app.post('/api/bodega/movimiento', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  const { tipo, material, cantidad, responsable, nota } = req.body;
  if (!db.data.movimientos) db.data.movimientos = [];
  if (!db.data.bodega) db.data.bodega = [];
  const mov = { id: Date.now(), tipo, material, cantidad, responsable, nota, fecha: fechaLocal() };
  db.data.movimientos.push(mov);
  const idx = db.data.bodega.findIndex(b => b.material === material);
  if (idx >= 0) {
    if (tipo === 'entrada' || tipo === 'devolucion') db.data.bodega[idx].cantidad += cantidad;
    else db.data.bodega[idx].cantidad = Math.max(0, db.data.bodega[idx].cantidad - cantidad);
  }
  db.write();
  res.json({ ok: true });
});

app.delete('/api/bodega/movimientos/:id', (req, res) => {
  if (!req.session?.usuario) return res.status(401).json({ error: 'No autorizado' });
  db.data.movimientos = (db.data.movimientos || []).filter(m => m.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Debug ─────────────────────────────────────────────────
app.get('/api/debug/db', (req, res) => {
  if (!req.session?.usuario || req.session.rol !== 'admin') return res.status(403).json({ error: 'No autorizado' });
  res.json(db.data);
});

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'público', 'login.html'));
});

app.listen(PORT, () => console.log(`Airnet corriendo en puerto ${PORT}`));