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
  'Telecomadmin': { nombre: 'Administrador', pass: process.env.ADMIN_PASS, rol: 'admin' },
  'Efrain':       { nombre: 'Efrain',        pass: process.env.USER_EFRAIN_PASS, rol: 'trabajador' },
  'Alejandro':    { nombre: 'Alejandro',     pass: process.env.USER_ALEJANDRO_PASS, rol: 'trabajador' },
  'DavidG':       { nombre: 'David Garcia',  pass: process.env.USER_DAVIDG_PASS, rol: 'trabajador' },
};

const sesionesActivas = new Map();

function requireAuth(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  res.status(401).json({ error: 'No autorizado' });
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.loggedIn && req.session.rol === 'admin') return next();
  res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
}

app.use(express.static(join(__dirname, 'público')));

app.get('/', (req, res) => {
  if (!req.session || !req.session.loggedIn) {
    return res.sendFile(join(__dirname, 'público', 'login.html'));
  }
  res.sendFile(join(__dirname, 'público', 'formulario.html'));
});

app.post('/api/login', (req, res) => {
  const { usuario, password } = req.body;
  const user = USUARIOS[usuario];
  if (user && user.pass && password === user.pass) {
    for (const [sessionId, sesion] of sesionesActivas.entries()) {
      if (sesion.usuario === usuario) sesionesActivas.delete(sessionId);
    }
    req.session.loggedIn = true;
    req.session.usuario = usuario;
    req.session.nombre = user.nombre;
    req.session.rol = user.rol;
    sesionesActivas.set(req.session.id, { nombre: user.nombre, usuario, rol: user.rol });
    res.json({ ok: true, nombre: user.nombre, rol: user.rol });
  } else {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }
});

app.post('/api/logout', (req, res) => {
  sesionesActivas.delete(req.session.id);
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  if (req.session && req.session.loggedIn) {
    res.json({ loggedIn: true, usuario: req.session.usuario, nombre: req.session.nombre, rol: req.session.rol });
  } else {
    res.json({ loggedIn: false });
  }
});

app.get('/api/conectados', requireAuth, (req, res) => {
  res.json([...sesionesActivas.values()].map(s => ({ nombre: s.nombre, rol: s.rol })));
});

const adapter = new JSONFileSync(join(DATA_DIR, 'database.json'));
const defaultData = { reportes: [], bodega: [], movimientos: [], cuadrillas: [], cajas: [] };
const db = new Low(adapter, defaultData);
db.read();

if (!db.data) db.data = { reportes: [], bodega: [], movimientos: [], cuadrillas: [], cajas: [] };
if (!db.data.reportes) db.data.reportes = [];
if (!db.data.bodega) db.data.bodega = [];
if (!db.data.movimientos) db.data.movimientos = [];
if (!db.data.cuadrillas) db.data.cuadrillas = [];
if (!db.data.cajas) db.data.cajas = [];
db.write();

// ── Cuadrillas ────────────────────────────────────────────
app.get('/api/cuadrillas', requireAuth, (req, res) => {
  try {
    if (!db.data.cuadrillas) db.data.cuadrillas = [];
    res.json(db.data.cuadrillas);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cuadrillas', requireAdmin, (req, res) => {
  try {
    const { nombre, integrantes, fecha, reutilizada } = req.body;
    if (!nombre || !integrantes?.length || !fecha) return res.status(400).json({ error: 'Faltan datos' });
    if (!db.data.cuadrillas) db.data.cuadrillas = [];
    const nueva = { id: Date.now(), nombre, integrantes, fecha, reutilizada: reutilizada || false, creado_en: new Date().toLocaleString('es-EC') };
    db.data.cuadrillas.push(nueva);
    db.write();
    res.json({ ok: true, id: nueva.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cuadrillas/:id', requireAdmin, (req, res) => {
  try {
    db.data.cuadrillas = db.data.cuadrillas.filter(c => c.id !== parseInt(req.params.id));
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Cajas (mapa) ──────────────────────────────────────────
app.get('/api/cajas', requireAuth, (req, res) => {
  try {
    res.json(db.data.cajas || []);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cajas', requireAuth, (req, res) => {
  try {
    const { tipo, referencia, lat, lng, totalPuertos, puertosOcupados } = req.body;
    if (!tipo || !referencia || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'Faltan datos' });
    }
    const nueva = {
      id: Date.now(),
      tipo,
      referencia,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      totalPuertos: parseInt(totalPuertos) || 16,
      puertosOcupados: parseInt(puertosOcupados) || 0,
      registrado_por: req.session.nombre,
      creado_en: new Date().toLocaleString('es-EC')
    };
    if (!db.data.cajas) db.data.cajas = [];
    db.data.cajas.push(nueva);
    db.write();
    res.json({ ok: true, id: nueva.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/cajas/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const caja = db.data.cajas.find(c => c.id === id);
    if (!caja) return res.status(404).json({ error: 'Caja no encontrada' });
    const { tipo, referencia, totalPuertos, puertosOcupados } = req.body;
    if (tipo) caja.tipo = tipo;
    if (referencia) caja.referencia = referencia;
    if (totalPuertos !== undefined) caja.totalPuertos = parseInt(totalPuertos);
    if (puertosOcupados !== undefined) caja.puertosOcupados = parseInt(puertosOcupados);
    caja.editado_en = new Date().toLocaleString('es-EC');
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/cajas/:id', requireAuth, (req, res) => {
  try {
    db.data.cajas = db.data.cajas.filter(c => c.id !== parseInt(req.params.id));
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Reportes ─────────────────────────────────────────────
app.post('/api/reportes', requireAuth, (req, res) => {
  try {
    const { fecha, observaciones, integrantes, materiales, actividades, incidencias, numIncidencias, ips, cuadrillaId } = req.body;
    if (!fecha || !actividades?.length) return res.status(400).json({ error: 'Faltan datos obligatorios' });
    const nuevoReporte = {
      id: Date.now(), fecha, observaciones: observaciones || '',
      integrantes: integrantes || [], materiales: materiales || [],
      actividades: actividades || [], incidencias: incidencias || [],
      numIncidencias: numIncidencias || 0, ips: ips || [],
      cuadrillaId: cuadrillaId || null, fotos: [],
      creado_en: new Date().toLocaleString('es-EC')
    };
    db.data.reportes.push(nuevoReporte);
    db.write();
    res.json({ ok: true, id: nuevoReporte.id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/reportes', requireAuth, (req, res) => {
  try {
    const reportes = [...db.data.reportes].reverse().map(r => ({
      ...r,
      integrantes: Array.isArray(r.integrantes) ? r.integrantes : [],
      actividades: r.actividades || [], incidencias: r.incidencias || [],
      ips: r.ips || [], fotos: r.fotos || []
    }));
    res.json(reportes);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/reportes/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const reporte = db.data.reportes.find(r => r.id === id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
    const { fecha, observaciones } = req.body;
    if (fecha) reporte.fecha = fecha;
    if (observaciones !== undefined) reporte.observaciones = observaciones;
    reporte.editado_en = new Date().toLocaleString('es-EC');
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reportes/:id', requireAuth, (req, res) => {
  try {
    db.data.reportes = db.data.reportes.filter(r => r.id !== parseInt(req.params.id));
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reportes/:id/fotos', requireAuth, upload.array('fotos', 5), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const reporte = db.data.reportes.find(r => r.id === id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
    if (!reporte.fotos) reporte.fotos = [];
    const nuevasFotos = req.files.map(f => ({ url: f.path, public_id: f.filename, subida_en: new Date().toLocaleString('es-EC') }));
    reporte.fotos.push(...nuevasFotos);
    db.write();
    res.json({ ok: true, fotos: nuevasFotos });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/reportes/:id/fotos/:public_id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const public_id = decodeURIComponent(req.params.public_id);
    const reporte = db.data.reportes.find(r => r.id === id);
    if (!reporte) return res.status(404).json({ error: 'Reporte no encontrado' });
    await cloudinary.uploader.destroy(public_id);
    reporte.fotos = (reporte.fotos || []).filter(f => f.public_id !== public_id);
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── Bodega ───────────────────────────────────────────────
app.get('/api/bodega', requireAuth, (req, res) => { res.json(db.data.bodega); });

app.post('/api/bodega/stock', requireAuth, (req, res) => {
  try {
    const { material, cantidad } = req.body;
    if (!material || cantidad === undefined) return res.status(400).json({ error: 'Faltan datos' });
    const item = db.data.bodega.find(b => b.material === material);
    if (item) { item.cantidad = cantidad; } else { db.data.bodega.push({ material, cantidad }); }
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/bodega/movimiento', requireAuth, (req, res) => {
  try {
    const { tipo, material, cantidad, responsable, nota } = req.body;
    if (!tipo || !material || !cantidad || !responsable) return res.status(400).json({ error: 'Faltan datos' });
    const item = db.data.bodega.find(b => b.material === material);
    if (!item) return res.status(400).json({ error: 'Material no encontrado' });
    if (tipo === 'salida' && item.cantidad < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    item.cantidad += tipo === 'entrada' || tipo === 'devolucion' ? cantidad : -cantidad;
    db.data.movimientos.push({ id: Date.now(), tipo, material, cantidad, responsable, nota: nota || '', fecha: new Date().toLocaleString('es-EC') });
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/bodega/movimientos', requireAuth, (req, res) => { res.json([...db.data.movimientos].reverse()); });

app.delete('/api/bodega/movimientos/:id', requireAuth, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const movimiento = db.data.movimientos.find(m => m.id === id);
    if (!movimiento) return res.status(404).json({ error: 'No encontrado' });
    const item = db.data.bodega.find(b => b.material === movimiento.material);
    if (item) {
      if (movimiento.tipo === 'salida') { item.cantidad += movimiento.cantidad; }
      else { item.cantidad -= movimiento.cantidad; if (item.cantidad < 0) item.cantidad = 0; }
    }
    db.data.movimientos = db.data.movimientos.filter(m => m.id !== id);
    db.write();
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor corriendo en http://localhost:${PORT}`));