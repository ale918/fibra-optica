import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';
import { Low } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATA_DIR = process.env.RAILWAY_VOLUME_MOUNT_PATH || join(__dirname, 'data');
try { mkdirSync(DATA_DIR, { recursive: true }); } catch(e) {}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'airnet-reportes', allowed_formats: ['jpg','jpeg','png','webp'] }
});
const upload = multer({ storage });

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'airnet_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 12 }
}));

const USUARIOS = {
  'Telecomadmin': { nombre: 'Administrador', pass: process.env.ADMIN_PASS },
  'Efrain':       { nombre: 'Efrain',        pass: process.env.USER_EFRAIN_PASS },
  'Alejandro':    { nombre: 'Alejandro',      pass: process.env.USER_ALEJANDRO_PASS },
  'DavidG':       { nombre: 'David Garcia',   pass: process.env.USER_DAVIDG_PASS },
};

const sesionesActivas = new Map();
const historialDesconexiones = [];

function requireAuth(req, res, next) {
  if (req.session.loggedIn) return next();
  res.status(401).json({ error: 'No autorizado' });
}

app.use(express.static(join(__dirname, 'público')));

app.get('/', (req, res) => {
  if (!req.session.loggedIn) {
    return res.sendFile(join(__dirname, 'público', 'login.html'));
  }
  res.sendFile(join(__dirname, 'público', 'formulario.html'));
});

// ── Login / Logout ────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const user = USUARIOS[usuario];
  if (user && user.pass && password === user.pass) {
    for (const [sessionId, sesion] of sesionesActivas.entries()) {
      if (sesion.usuario === usuario) {
        sesionesActivas.delete(sessionId);
      }
    }
    req.session.loggedIn = true;
    req.session.usuario = usuario;
    req.session.nombre = user.nombre;
    sesionesActivas.set(req.session.id, {
      nombre: user.nombre,
      usuario,
      desde: new Date().toLocaleString('es-EC')
    });
    res.json({ ok: true, nombre: user.nombre });
  } else {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
});

app.post('/api/logout', (req, res) => {
  const sesion = sesionesActivas.get(req.session.id);
  if (sesion) {
    historialDesconexiones.push({
      nombre: sesion.nombre,
      usuario: sesion.usuario,
      salio: new Date().toLocaleString('es-EC'),
      salioTimestamp: Date.now()
    });
    // Mantener solo desconexiones de la última hora
    const unaHoraAtras = Date.now() - 60 * 60 * 1000;
    while (historialDesconexiones.length > 0 && historialDesconexiones[0].salioTimestamp < unaHoraAtras) {
      historialDesconexiones.shift();
    }
    sesionesActivas.delete(req.session.id);
  }
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (req.session.loggedIn) {
    res.json({ loggedIn: true, usuario: req.session.usuario, nombre: req.session.nombre });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/api/conectados', requireAuth, (req, res) => {
  const conectados = [...sesionesActivas.values()].map(s => ({
    nombre: s.nombre,
    estado: 'online'
  }));
  const desconectados = historialDesconexiones.slice(-5).map(h => ({
    nombre: h.nombre,
    estado: 'offline',
    salio: h.salio
  }));
  res.json({ conectados, desconectados });
});

const adapter = new JSONFileSync(join(DATA_DIR, 'database.json'));
const defaultData = { reportes: [], bodega: [], movimientos: [] };
const db = new Low(adapter, defaultData);
db.read();

if (!db.data) db.data = { reportes: [], bodega: [], movimientos: [] };
if (!db.data.reportes) db.data.reportes = [];
if (!db.data.bodega) db.data.bodega = [];
if (!db.data.movimientos) db.data.movimientos = [];
db.write();

// ── Reportes ─────────────────────────────────────────────
app.post('/api/reportes', requireAuth, (req, res) => {
  const { fecha, observaciones, integrantes, materiales, actividades } = req.body;
  if (!fecha || !integrantes || !materiales?.length) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }
  const nuevoReporte = {
    id: Date.now(),
    fecha,
    observaciones,
    integrantes: Array.isArray(integrantes) ? integrantes : integrantes.split(',').map(i => i.trim()),
    materiales,
    actividades: actividades || [],
    fotos: [],
    creado_en: new Date().toLocaleString('es-EC')
  };
  db.data.reportes.push(nuevoReporte);
  db.write();
  res.json({ ok: true, id: nuevoReporte.id });
});

app.get('/api/reportes', requireAuth, (req, res) => {
  const reportes = [...db.data.reportes].reverse().map(r => ({
    ...r,
    integrantes: Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(i => i.trim()),
    actividades: r.actividades || [],
    fotos: r.fotos || []
  }));
  res.json(reportes);
});

app.delete('/api/reportes/:id', requireAuth, (req, res) => {
  db.data.reportes = db.data.reportes.filter(r => r.id !== parseInt(req.params.id));
  db.write();
  res.json({ ok: true });
});

// ── Fotos ─────────────────────────────────────────────────
app.post('/api/reportes/:id/fotos', requireAuth, upload.array('fotos', 5), async (req, res) => {
  const id = parseInt(req.params.id);
  const reporte = db.data.reportes.find(r => r.id === id);
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
  if (!reporte.fotos) reporte.fotos = [];
  const nuevasFotos = req.files.map(f => ({
    url: f.path,
    public_id: f.filename,
    subida_en: new Date().toLocaleString('es-EC')
  }));
  reporte.fotos.push(...nuevasFotos);
  db.write();
  res.json({ ok: true, fotos: nuevasFotos });
});

app.delete('/api/reportes/:id/fotos/:public_id', requireAuth, async (req, res) => {
  const id = parseInt(req.params.id);
  const public_id = decodeURIComponent(req.params.public_id);
  const reporte = db.data.reportes.find(r => r.id === id);
  if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
  await cloudinary.uploader.destroy(public_id);
  reporte.fotos = (reporte.fotos || []).filter(f => f.public_id !== public_id);
  db.write();
  res.json({ ok: true });
});

// ── Bodega ───────────────────────────────────────────────
app.get('/api/bodega', requireAuth, (req, res) => {
  res.json(db.data.bodega);
});

app.post('/api/bodega/stock', requireAuth, (req, res) => {
  const { material, cantidad } = req.body;
  if (!material || cantidad === undefined) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const item = db.data.bodega.find(b => b.material === material);
  if (item) { item.cantidad = cantidad; }
  else { db.data.bodega.push({ material, cantidad }); }
  db.write();
  res.json({ ok: true });
});

app.post('/api/bodega/movimiento', requireAuth, (req, res) => {
  const { tipo, material, cantidad, responsable, nota } = req.body;
  if (!tipo || !material || !cantidad || !responsable) {
    return res.status(400).json({ error: 'Faltan datos' });
  }
  const item = db.data.bodega.find(b => b.material === material);
  if (!item) return res.status(400).json({ error: 'Material no encontrado en bodega' });
  if (tipo === 'salida' && item.cantidad < cantidad) {
    return res.status(400).json({ error: 'Stock insuficiente' });
  }
  item.cantidad += tipo === 'entrada' || tipo === 'devolucion' ? cantidad : -cantidad;
  const movimiento = {
    id: Date.now(), tipo, material, cantidad, responsable,
    nota: nota || '', fecha: new Date().toLocaleString('es-EC')
  };
  db.data.movimientos.push(movimiento);
  db.write();
  res.json({ ok: true });
});

app.get('/api/bodega/movimientos', requireAuth, (req, res) => {
  res.json([...db.data.movimientos].reverse());
});

app.delete('/api/bodega/movimientos/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const movimiento = db.data.movimientos.find(m => m.id === id);
  if (!movimiento) return res.status(404).json({ error: 'Movimiento no encontrado' });
  const item = db.data.bodega.find(b => b.material === movimiento.material);
  if (item) {
    if (movimiento.tipo === 'salida') { item.cantidad += movimiento.cantidad; }
    else if (movimiento.tipo === 'entrada' || movimiento.tipo === 'devolucion') {
      item.cantidad -= movimiento.cantidad;
      if (item.cantidad < 0) item.cantidad = 0;
    }
  }
  db.data.movimientos = db.data.movimientos.filter(m => m.id !== id);
  db.write();
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});