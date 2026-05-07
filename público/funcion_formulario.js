const MATERIALES = [
  { id: 'herrajesA',     label: 'Herrajes A',           unidad: 'und' },
  { id: 'herrajesU',     label: 'Herrajes U',           unidad: 'und' },
  { id: 'cinta34',       label: 'Cinta 3/4"',           unidad: 'm'   },
  { id: 'cinta32',       label: 'Cinta 3/2"',           unidad: 'm'   },
  { id: 'cableDrop',     label: 'Cable Drop',           unidad: 'm'   },
  { id: 'fibraPrincipal',label: 'Fibra Principal',      unidad: 'm'   },
  { id: 'hebilla34',     label: 'Hebilla metálica 3/4"',unidad: 'und' },
  { id: 'hebilla32',     label: 'Hebilla metálica 3/2"',unidad: 'und' },
  { id: 'chupones',      label: 'Chupones',             unidad: 'und' },
  { id: 'preformados',   label: 'Preformados',          unidad: 'und' },
  { id: 'cajasNat',      label: 'Cajas NAT',            unidad: 'und' },
  { id: 'splitter116',   label: 'Splitter 1/16',        unidad: 'und' },
  { id: 'splitter14',    label: 'Splitter 1/4',         unidad: 'und' },
  { id: 'ganchosTel',    label: 'Ganchos telefónicos',  unidad: 'und' },
  { id: 'conectorUpc',   label: 'Conector UPC',         unidad: 'und' },
  { id: 'conectorApc',   label: 'Conector APC',         unidad: 'und' },
];

const ACTIVIDADES_INFO = {
  fibra:       { label: 'Pasado de fibra principal',    icon: '📡' },
  cajas:       { label: 'Armado de cajas NAT',          icon: '📦' },
  instalacion: { label: 'Instalación cliente final',    icon: '🔌' },
  mudanza:     { label: 'Mudar clientes radio a fibra', icon: '🔄' },
  odf:         { label: 'Armado de ODF',                icon: '🗄️' },
  mangas:      { label: 'Armado de mangas',             icon: '🔧' },
  incidencias: { label: 'Incidencias',                  icon: '⚠️' },
};

const INCIDENCIAS_INFO = {
  reparaciones:     { label: 'Reparaciones',       icon: '🔨' },
  focos_rojos:      { label: 'Focos rojos',         icon: '🔴' },
  actualizaciones:  { label: 'Actualizaciones',     icon: '🔄' },
  cambio_domicilio: { label: 'Cambio de domicilio', icon: '🏠' },
};

let actividadesSeleccionadas = new Set();
let todosLosReportes = [];
let todasLasCuadrillas = [];
let stockActual = [];
let semanaActual = '';
let rolActual = '';
let ipCounter = 0;
let cuadrillaSeleccionadaId = null;

// ── Init ─────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn) { window.location.href = '/'; return; }
    rolActual = data.rol;

    if (rolActual === 'admin') {
      document.getElementById('tab-cuadrillas-btn').style.display = 'inline-flex';
      document.getElementById('admin-cuadrilla-selector').style.display = 'block';
      document.getElementById('trabajador-fecha-box').style.display = 'none';
      await cargarCuadrillasSelect();
    } else {
      document.getElementById('admin-cuadrilla-selector').style.display = 'none';
      document.getElementById('trabajador-fecha-box').style.display = 'block';
      document.getElementById('fecha-trabajador').valueAsDate = new Date();
      await cargarCuadrillaHoy();
    }

    document.getElementById('fecha') && (document.getElementById('fecha').valueAsDate = new Date());
    document.getElementById('cuadrilla-fecha') && (document.getElementById('cuadrilla-fecha').valueAsDate = new Date());

    cargarConectados();
    setInterval(cargarConectados, 30000);
  } catch(e) { console.error(e); }
}
init();

// ── Cuadrilla del día para trabajadores ──────────────────
async function cargarCuadrillaHoy() {
  try {
    const res = await fetch('/api/cuadrillas');
    todasLasCuadrillas = await res.json();
    const hoy = new Date().toISOString().slice(0, 10);
    const cuadrilla = todasLasCuadrillas.find(c => c.fecha === hoy);
    const box = document.getElementById('cuadrilla-asignada-box');
    if (cuadrilla) {
      cuadrillaSeleccionadaId = cuadrilla.id;
      box.style.display = 'block';
      box.innerHTML = `
        <div style="background:linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,153,255,0.05));border:1px solid var(--accent);border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">
          <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:8px;">Cuadrilla asignada hoy</div>
          <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">${cuadrilla.nombre}</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${cuadrilla.integrantes.map(i => `
              <span style="font-size:12px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:3px 10px;color:var(--accent);">
                👷 ${i}
              </span>`).join('')}
          </div>
        </div>`;
    } else {
      box.style.display = 'none';
      cuadrillaSeleccionadaId = null;
    }
  } catch(e) {}
}

// ── Cuadrillas select para admin ─────────────────────────
async function cargarCuadrillasSelect() {
  try {
    const res = await fetch('/api/cuadrillas');
    todasLasCuadrillas = await res.json();
    const sel = document.getElementById('cuadrilla-select');
    if (!sel) return;
    sel.innerHTML = '<option value="">Sin cuadrilla asignada</option>' +
      todasLasCuadrillas.map(c => `<option value="${c.id}">${c.nombre} — ${c.fecha}</option>`).join('');
  } catch(e) {}
}

function seleccionarCuadrilla() {
  const id = parseInt(document.getElementById('cuadrilla-select').value);
  cuadrillaSeleccionadaId = id || null;
  const cuadrilla = todasLasCuadrillas.find(c => c.id === id);

  // Mostrar cuadro de cuadrilla para admin también
  const box = document.getElementById('cuadrilla-asignada-box');
  if (cuadrilla) {
    box.style.display = 'block';
    box.innerHTML = `
      <div style="background:linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,153,255,0.05));border:1px solid var(--accent);border-radius:12px;padding:1.25rem;margin-bottom:1.25rem;">
        <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:8px;">Cuadrilla seleccionada</div>
        <div style="font-size:18px;font-weight:600;color:var(--text);margin-bottom:8px;">${cuadrilla.nombre}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
          ${cuadrilla.integrantes.map(i => `
            <span style="font-size:12px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:3px 10px;color:var(--accent);">
              👷 ${i}
            </span>`).join('')}
        </div>
      </div>`;
    // Auto-marcar integrantes
    document.querySelectorAll('.integrante-check input').forEach(cb => {
      cb.checked = cuadrilla.integrantes.includes(cb.value);
    });
  } else {
    box.style.display = 'none';
    document.querySelectorAll('.integrante-check input').forEach(cb => cb.checked = false);
  }
}

// ── Conectados ───────────────────────────────────────────
async function cargarConectados() {
  try {
    const res = await fetch('/api/conectados');
    const conectados = await res.json();
    document.getElementById('conectados-texto').textContent = `🟢 ${conectados.length}`;
    document.getElementById('conectados-lista').innerHTML = conectados.length === 0
      ? '<div style="font-size:12px;color:#6b7280;padding:4px 0;">Nadie conectado</div>'
      : conectados.map(c => `
          <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2f3a;">
            <span style="width:7px;height:7px;background:#00d4aa;border-radius:50%;flex-shrink:0;"></span>
            <div>
              <div style="font-size:13px;color:#e8eaf0;font-weight:500;">${c.nombre}</div>
              <div style="font-size:11px;color:#00d4aa;">En línea</div>
            </div>
          </div>`).join('');
  } catch(e) {}
}

function toggleConectados() {
  const popup = document.getElementById('conectados-popup');
  popup.style.display = popup.style.display === 'none' ? 'block' : 'none';
  if (popup.style.display === 'block') cargarConectados();
}

document.addEventListener('click', e => {
  const badge = document.getElementById('conectados-badge');
  const popup = document.getElementById('conectados-popup');
  if (popup && badge && !badge.contains(e.target) && !popup.contains(e.target)) {
    popup.style.display = 'none';
  }
});

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

async function cerrarSesion() {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
}

function mostrarTab(tab) {
  ['registro','historial','bodega','indicadores','cuadrillas'].forEach(t => {
    const el = document.getElementById('tab-' + t);
    if (el) el.style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach(btn => btn.classList.remove('active'));
  const tabs = ['registro','historial','bodega','indicadores','cuadrillas'];
  document.querySelectorAll('.tab')[tabs.indexOf(tab)]?.classList.add('active');
  if (tab === 'historial') cargarHistorial();
  if (tab === 'bodega') cargarBodega();
  if (tab === 'indicadores') iniciarIndicadores();
  if (tab === 'cuadrillas') cargarCuadrillas();
}

// ── Actividades ──────────────────────────────────────────
function toggleActividad(id) {
  const btn = document.getElementById('act-' + id);
  if (actividadesSeleccionadas.has(id)) {
    actividadesSeleccionadas.delete(id);
    btn.classList.remove('selected');
  } else {
    actividadesSeleccionadas.add(id);
    btn.classList.add('selected');
  }
  document.getElementById('incidencias-panel').style.display =
    actividadesSeleccionadas.has('incidencias') ? 'block' : 'none';
  const needsIp = ['instalacion','mudanza','incidencias'].some(a => actividadesSeleccionadas.has(a));
  document.getElementById('ips-panel').style.display = needsIp ? 'block' : 'none';
}

// ── IPs ──────────────────────────────────────────────────
function agregarIP() {
  ipCounter++;
  const lista = document.getElementById('ips-lista');
  const div = document.createElement('div');
  div.id = `ip-row-${ipCounter}`;
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center;';
  div.innerHTML = `
    <input type="text" placeholder="Ej. 192.168.1.100" id="ip-${ipCounter}"
      style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;outline:none;" />
    <button onclick="document.getElementById('ip-row-${ipCounter}').remove()"
      style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>`;
  lista.appendChild(div);
}

function getIPs() {
  return [...document.querySelectorAll('[id^="ip-"]')]
    .filter(el => el.tagName === 'INPUT')
    .map(el => el.value.trim())
    .filter(Boolean);
}

// ── Guardar Reporte ──────────────────────────────────────
async function guardarReporte() {
  const esAdmin = rolActual === 'admin';
  const fecha = esAdmin
    ? document.getElementById('fecha').value
    : document.getElementById('fecha-trabajador').value;

  if (!fecha) { toast('⚠ Selecciona la fecha'); return; }
  if (actividadesSeleccionadas.size === 0) { toast('⚠ Selecciona al menos una actividad'); return; }

  const observaciones = document.getElementById('observaciones').value.trim();

  // Integrantes: admin los elige, trabajador usa la cuadrilla
  let integrantes = [];
  if (esAdmin) {
    integrantes = [...document.querySelectorAll('.integrante-check input:checked')].map(i => i.value);
    if (!integrantes.length) { toast('⚠ Selecciona al menos un integrante'); return; }
  } else {
    const cuadrilla = todasLasCuadrillas.find(c => c.id === cuadrillaSeleccionadaId);
    integrantes = cuadrilla ? cuadrilla.integrantes : [];
  }

  const materiales = MATERIALES.map(m => ({
    material: m.label,
    cantidad: parseFloat(document.getElementById(m.id)?.value) || 0,
    unidad: m.unidad
  })).filter(m => m.cantidad > 0);

  const incidencias = [...document.querySelectorAll('.inc-check:checked')].map(el => el.value);
  const numIncidencias = parseInt(document.getElementById('num-incidencias')?.value) || 0;
  const ips = getIPs();

  try {
    const res = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha, integrantes, observaciones, materiales,
        actividades: [...actividadesSeleccionadas],
        incidencias, numIncidencias, ips,
        cuadrillaId: cuadrillaSeleccionadaId
      })
    });
    const data = await res.json();
    if (data.ok) { toast('✓ Reporte guardado'); limpiarFormulario(); }
    else toast('Error: ' + data.error);
  } catch(e) { toast('Error de conexión: ' + e.message); }
}

function limpiarFormulario() {
  document.getElementById('observaciones').value = '';
  if (rolActual === 'admin') {
    document.getElementById('fecha').valueAsDate = new Date();
    document.getElementById('cuadrilla-select').value = '';
    document.querySelectorAll('.integrante-check input').forEach(c => c.checked = false);
    document.getElementById('cuadrilla-asignada-box').style.display = 'none';
  } else {
    document.getElementById('fecha-trabajador').valueAsDate = new Date();
  }
  MATERIALES.forEach(m => { const el = document.getElementById(m.id); if(el) el.value = ''; });
  actividadesSeleccionadas.clear();
  document.querySelectorAll('.actividad-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('incidencias-panel').style.display = 'none';
  document.getElementById('ips-panel').style.display = 'none';
  document.getElementById('ips-lista').innerHTML = '';
  const ni = document.getElementById('num-incidencias');
  if (ni) ni.value = '';
  document.querySelectorAll('.inc-check').forEach(c => c.checked = false);
  ipCounter = 0;
  cuadrillaSeleccionadaId = null;
}

// ── Historial ────────────────────────────────────────────
async function cargarHistorial() {
  try {
    const res = await fetch('/api/reportes');
    todosLosReportes = await res.json();
    renderHistorial(todosLosReportes);
  } catch(e) {
    document.getElementById('lista-reportes').innerHTML = '<p class="empty">Error al conectar con el servidor.</p>';
  }
}

function filtrarHistorial() {
  const q = document.getElementById('buscar-fecha').value.trim().toLowerCase();
  renderHistorial(todosLosReportes.filter(r => r.fecha.includes(q)));
}

function renderHistorial(reportes) {
  const cont = document.getElementById('lista-reportes');
  if (!reportes.length) { cont.innerHTML = '<p class="empty">No hay reportes registrados.</p>'; return; }
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  cont.innerHTML = reportes.map(r => {
    const d = new Date(r.fecha + 'T12:00:00');
    const dia = dias[d.getDay()];
    const acts = (r.actividades || []).map(a => ACTIVIDADES_INFO[a] ? `${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}` : a).join(' · ');
    const fotos = r.fotos || [];
    const ips = r.ips || [];
    const incidencias = r.incidencias || [];
    const cuadrilla = todasLasCuadrillas.find(c => c.id === r.cuadrillaId);
    return `
      <div class="reporte-card">
        <div class="reporte-header" onclick="toggleReporte(${r.id})">
          <div>
            <div class="reporte-fecha">${dia}, ${r.fecha}</div>
            ${cuadrilla ? `<div style="font-size:11px;color:var(--accent);margin-top:2px;">🏷️ ${cuadrilla.nombre}</div>` : ''}
            <div class="reporte-integrantes">👷 ${r.integrantes.join(' · ')}</div>
            ${acts ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${acts}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${fotos.length > 0 ? `<span style="font-size:11px;color:var(--muted);">📷 ${fotos.length}</span>` : ''}
            <div style="color:var(--muted);font-size:18px;" id="arrow-${r.id}">▼</div>
          </div>
        </div>
        <div class="reporte-body" id="body-${r.id}" style="display:none;">
          ${cuadrilla ? `
            <div style="background:linear-gradient(135deg,rgba(0,212,170,0.08),rgba(0,153,255,0.03));border:1px solid rgba(0,212,170,0.3);border-radius:10px;padding:1rem;margin-bottom:10px;">
              <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Cuadrilla</div>
              <div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px;">${cuadrilla.nombre}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;">
                ${cuadrilla.integrantes.map(i => `<span style="font-size:11px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:2px 8px;color:var(--accent);">👷 ${i}</span>`).join('')}
              </div>
            </div>` : ''}

          ${r.observaciones ? `<div class="obs-box">${r.observaciones}</div>` : ''}

          ${incidencias.length > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">⚠️ Incidencias${r.numIncidencias ? ` (${r.numIncidencias} atendidas)` : ''}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${incidencias.map(i => INCIDENCIAS_INFO[i] ? `<span style="font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">${INCIDENCIAS_INFO[i].icon} ${INCIDENCIAS_INFO[i].label}</span>` : '').join('')}
              </div>
            </div>` : ''}

          ${ips.length > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">🌐 IPs de clientes</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${ips.map(ip => `<span style="font-size:12px;font-family:'IBM Plex Mono',monospace;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">${ip}</span>`).join('')}
              </div>
            </div>` : ''}

          <table class="mat-table">
            <thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead>
            <tbody>${r.materiales.map(m => `<tr><td>${m.material}</td><td class="cant">${m.cantidad}</td><td>${m.unidad}</td></tr>`).join('')}</tbody>
          </table>

          <div style="margin-top:1rem;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📷 Fotos del trabajo</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              ${fotos.map(f => `
                <div style="position:relative;">
                  <img src="${f.url}" style="width:100px;height:100px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="verFoto('${f.url}')" />
                  <button onclick="eliminarFoto(${r.id},'${f.public_id}')" style="position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.6);border:none;color:#fff;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;padding:0;">✕</button>
                </div>`).join('')}
            </div>
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;background:var(--surface2);border:1px solid var(--border);border-radius:7px;padding:6px 12px;">
              <span>+ Agregar fotos</span>
              <input type="file" accept="image/*" multiple style="display:none;" onchange="subirFotos(event,${r.id})" />
            </label>
          </div>

          <div class="reporte-actions" style="margin-top:1rem;">
            <button onclick="exportarReporteExcel(${r.id})">↓ Excel</button>
            <button onclick="editarReporte(${r.id})">✏️ Editar</button>
            <button class="btn-danger" onclick="eliminarReporte(${r.id})">Eliminar</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

function toggleReporte(id) {
  const body = document.getElementById('body-' + id);
  const arrow = document.getElementById('arrow-' + id);
  const visible = body.style.display !== 'none';
  body.style.display = visible ? 'none' : 'block';
  arrow.textContent = visible ? '▼' : '▲';
}

async function eliminarReporte(id) {
  if (!confirm('¿Eliminar este reporte?')) return;
  await fetch('/api/reportes/' + id, { method: 'DELETE' });
  toast('Reporte eliminado');
  cargarHistorial();
}

function editarReporte(id) {
  const r = todosLosReportes.find(x => x.id === id);
  if (!r) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;">
      <h3 style="color:var(--accent);font-size:14px;margin-bottom:1rem;font-family:'IBM Plex Mono',monospace;">✏️ Editar reporte</h3>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px;">
        <label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;">Fecha</label>
        <input type="date" id="edit-fecha" value="${r.fecha}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:8px 10px;outline:none;" />
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;margin-bottom:12px;">
        <label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;">Observaciones</label>
        <textarea id="edit-obs" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:8px 10px;outline:none;min-height:80px;resize:vertical;">${r.observaciones || ''}</textarea>
      </div>
      <div style="display:flex;gap:8px;margin-top:1rem;">
        <button onclick="guardarEdicion(${id})" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px;cursor:pointer;">Guardar</button>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:none;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);padding:10px;cursor:pointer;">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function guardarEdicion(id) {
  const fecha = document.getElementById('edit-fecha').value;
  const observaciones = document.getElementById('edit-obs').value.trim();
  try {
    const res = await fetch('/api/reportes/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, observaciones })
    });
    const data = await res.json();
    if (data.ok) {
      toast('✓ Reporte editado');
      document.querySelector('div[style*="position:fixed"]')?.remove();
      await cargarHistorial();
    }
  } catch(e) { toast('Error al editar'); }
}

function exportarReporteExcel(id) {
  const r = todosLosReportes.find(x => x.id === id);
  if (!r) return;
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const d = new Date(r.fecha + 'T12:00:00');
  const acts = (r.actividades || []).map(a => ACTIVIDADES_INFO[a]?.label || a).join(', ');
  const datos = r.materiales.map(m => ({
    'Fecha': r.fecha, 'Día': dias[d.getDay()], 'Actividades': acts,
    'Integrantes': r.integrantes.join(', '),
    'Material': m.material, 'Cantidad': m.cantidad,
    'Unidad': m.unidad, 'Observaciones': r.observaciones || '',
    'IPs': (r.ips || []).join(', ')
  }));
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `reporte_${r.fecha}.xlsx`);
  toast('✓ Excel descargado');
}

function exportarTodoExcel() {
  if (!todosLosReportes.length) { toast('⚠ No hay reportes'); return; }
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const filas = [];
  todosLosReportes.forEach(r => {
    const d = new Date(r.fecha + 'T12:00:00');
    const acts = (r.actividades || []).map(a => ACTIVIDADES_INFO[a]?.label || a).join(', ');
    r.materiales.forEach(m => {
      filas.push({
        'Fecha': r.fecha, 'Día': dias[d.getDay()], 'Actividades': acts,
        'Integrantes': r.integrantes.join(', '),
        'Material': m.material, 'Cantidad': m.cantidad,
        'Unidad': m.unidad, 'Observaciones': r.observaciones || '',
        'IPs': (r.ips || []).join(', ')
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  XLSX.writeFile(wb, `historial_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Historial exportado');
}

// ── Fotos ─────────────────────────────────────────────────
async function subirFotos(event, reporteId) {
  const files = event.target.files;
  if (!files.length) return;
  const formData = new FormData();
  for (const file of files) formData.append('fotos', file);
  toast('⏳ Subiendo fotos...');
  try {
    const res = await fetch(`/api/reportes/${reporteId}/fotos`, { method: 'POST', body: formData });
    const data = await res.json();
    if (data.ok) { toast('✓ Fotos subidas'); await cargarHistorial(); }
    else { toast('Error: ' + data.error); }
  } catch(e) { toast('Error al subir fotos'); }
}

async function eliminarFoto(reporteId, publicId) {
  if (!confirm('¿Eliminar esta foto?')) return;
  try {
    const res = await fetch(`/api/reportes/${reporteId}/fotos/${encodeURIComponent(publicId)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) { toast('Foto eliminada'); await cargarHistorial(); }
  } catch(e) { toast('Error al eliminar foto'); }
}

function verFoto(url) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:600;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  overlay.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:8px;" />`;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

// ── Cuadrillas (admin) ───────────────────────────────────
async function cargarCuadrillas() {
  try {
    const res = await fetch('/api/cuadrillas');
    todasLasCuadrillas = await res.json();
    const cont = document.getElementById('lista-cuadrillas');
    if (!todasLasCuadrillas.length) {
      cont.innerHTML = '<p class="empty">No hay cuadrillas creadas.</p>';
      return;
    }
    cont.innerHTML = todasLasCuadrillas.map(c => `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div>
            <div style="font-weight:600;color:var(--accent);font-size:15px;">${c.nombre}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:2px;">📅 ${c.fecha}</div>
          </div>
          <button class="btn-danger" onclick="eliminarCuadrilla(${c.id})" style="font-size:12px;padding:5px 10px;">Eliminar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${c.integrantes.map(i => `<span style="font-size:12px;background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:3px 10px;color:var(--accent);">👷 ${i}</span>`).join('')}
        </div>
      </div>`).join('');
  } catch(e) {}
}

async function crearCuadrilla() {
  const nombre = document.getElementById('cuadrilla-nombre').value.trim();
  const fecha = document.getElementById('cuadrilla-fecha').value;
  const integrantes = [...document.querySelectorAll('.cuadrilla-int:checked')].map(i => i.value);
  if (!nombre) { toast('⚠ Ingresa un nombre'); return; }
  if (!fecha) { toast('⚠ Selecciona la fecha'); return; }
  if (!integrantes.length) { toast('⚠ Selecciona al menos un integrante'); return; }
  try {
    const res = await fetch('/api/cuadrillas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, fecha, integrantes })
    });
    const data = await res.json();
    if (data.ok) {
      toast('✓ Cuadrilla creada');
      document.getElementById('cuadrilla-nombre').value = '';
      document.querySelectorAll('.cuadrilla-int').forEach(c => c.checked = false);
      await cargarCuadrillas();
      await cargarCuadrillasSelect();
    }
  } catch(e) { toast('Error al crear cuadrilla'); }
}

async function eliminarCuadrilla(id) {
  if (!confirm('¿Eliminar esta cuadrilla?')) return;
  await fetch('/api/cuadrillas/' + id, { method: 'DELETE' });
  toast('Cuadrilla eliminada');
  await cargarCuadrillas();
  await cargarCuadrillasSelect();
}

// ── Bodega ───────────────────────────────────────────────
async function cargarBodega() {
  try {
    const res = await fetch('/api/bodega');
    stockActual = await res.json();
    renderStock();
    setTimeout(() => llenarSelectMaterial(), 100);
    cargarMovimientos();
  } catch(e) {
    document.getElementById('tabla-stock').innerHTML = '<p class="empty">Error al cargar bodega.</p>';
  }
}

function renderStock() {
  const cont = document.getElementById('tabla-stock');
  if (!stockActual.length) { cont.innerHTML = '<p class="empty">No hay stock registrado.</p>'; return; }
  cont.innerHTML = `
    <table class="mat-table">
      <thead><tr><th>Material</th><th>Stock disponible</th><th>Estado</th></tr></thead>
      <tbody>${stockActual.map(s => `
        <tr>
          <td>${s.material}</td>
          <td class="cant">${s.cantidad}</td>
          <td><span style="color:${s.cantidad > 5 ? 'var(--accent)' : s.cantidad > 0 ? '#f59e0b' : 'var(--danger)'};font-size:12px;">
            ${s.cantidad > 5 ? '✓ Disponible' : s.cantidad > 0 ? '⚠ Poco stock' : '✕ Sin stock'}
          </span></td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

function llenarSelectMaterial() {
  const sel = document.getElementById('mov-material');
  if (!sel) return;
  sel.innerHTML = MATERIALES.map(m => `<option value="${m.label}">${m.label}</option>`).join('');
}

function mostrarModalStock() {
  const cont = document.getElementById('modal-stock-items');
  cont.innerHTML = MATERIALES.map(m => {
    const item = stockActual.find(s => s.material === m.label);
    return `
      <div class="mat-row" style="margin-bottom:8px;">
        <label style="color:var(--text);font-size:13px;text-transform:none;letter-spacing:0;">${m.label}</label>
        <input type="number" min="0" id="stock-${m.id}" value="${item ? item.cantidad : 0}" style="width:80px;text-align:right;" />
        <span class="unidad">${m.unidad}</span>
      </div>`;
  }).join('');
  document.getElementById('modal-stock').style.display = 'flex';
}

function cerrarModalStock() {
  document.getElementById('modal-stock').style.display = 'none';
}

async function guardarStock() {
  try {
    for (const m of MATERIALES) {
      const el = document.getElementById('stock-' + m.id);
      const cantidad = el ? parseFloat(el.value) || 0 : 0;
      const res = await fetch('/api/bodega/stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material: m.label, cantidad })
      });
      const data = await res.json();
      if (!data.ok) { toast('Error: ' + data.error); return; }
    }
    cerrarModalStock();
    await cargarBodega();
    toast('✓ Stock actualizado');
  } catch(e) { toast('Error: ' + e.message); }
}

async function registrarMovimiento() {
  const tipo = document.getElementById('mov-tipo').value;
  const material = document.getElementById('mov-material').value;
  const cantidad = parseFloat(document.getElementById('mov-cantidad').value);
  const responsable = document.getElementById('mov-responsable').value.trim();
  const nota = document.getElementById('mov-nota').value.trim();
  if (!cantidad || cantidad <= 0) { toast('⚠ Ingresa una cantidad válida'); return; }
  if (!responsable) { toast('⚠ Ingresa el responsable'); return; }
  try {
    const res = await fetch('/api/bodega/movimiento', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo, material, cantidad, responsable, nota })
    });
    const data = await res.json();
    if (data.ok) {
      toast('✓ Movimiento registrado');
      document.getElementById('mov-cantidad').value = '';
      document.getElementById('mov-responsable').value = '';
      document.getElementById('mov-nota').value = '';
      await cargarBodega();
    } else { toast('Error: ' + data.error); }
  } catch(e) { toast('Error de conexión'); }
}

async function cargarMovimientos() {
  try {
    const res = await fetch('/api/bodega/movimientos');
    const movimientos = await res.json();
    const cont = document.getElementById('tabla-movimientos');
    if (!movimientos.length) { cont.innerHTML = '<p class="empty">No hay movimientos registrados.</p>'; return; }
    const colores = { salida: 'var(--danger)', entrada: 'var(--accent)', devolucion: '#f59e0b' };
    cont.innerHTML = `
      <table class="mat-table">
        <thead><tr><th>Fecha</th><th>Tipo</th><th>Material</th><th>Cantidad</th><th>Responsable</th><th>Nota</th><th></th></tr></thead>
        <tbody>${movimientos.map(m => `
          <tr>
            <td style="font-size:12px;color:var(--muted);">${m.fecha}</td>
            <td><span style="color:${colores[m.tipo]};font-weight:600;text-transform:capitalize;">${m.tipo}</span></td>
            <td>${m.material}</td>
            <td class="cant">${m.cantidad}</td>
            <td>${m.responsable}</td>
            <td style="color:var(--muted);">${m.nota || '—'}</td>
            <td><button class="del-btn" onclick="eliminarMovimiento(${m.id})">✕</button></td>
          </tr>`).join('')}
        </tbody>
      </table>`;
  } catch(e) {}
}

async function eliminarMovimiento(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  try {
    const res = await fetch('/api/bodega/movimientos/' + id, { method: 'DELETE' });
    const data = await res.json();
    if (data.ok) { toast('Movimiento eliminado'); cargarMovimientos(); }
  } catch(e) { toast('Error al eliminar'); }
}

function exportarBodegaExcel() {
  if (!stockActual.length) { toast('⚠ No hay stock para exportar'); return; }
  const datos = stockActual.map(s => ({ 'Material': s.material, 'Stock disponible': s.cantidad }));
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Stock');
  XLSX.writeFile(wb, `bodega_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Stock exportado');
}

// ── Indicadores ──────────────────────────────────────────
function getLunes(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  const dia = d.getDay();
  const diff = dia === 0 ? -6 : 1 - dia;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function getMat(reportes, label) {
  return reportes.reduce((s, r) => {
    const m = r.materiales.find(m => m.material === label);
    return s + (m ? m.cantidad : 0);
  }, 0);
}

function barMeta(valor, meta) {
  const pct = Math.min(Math.round(valor / meta * 100), 100);
  const c = valor >= meta ? '#1D9E75' : valor >= meta / 2 ? '#BA7517' : '#E24B4A';
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${c};border-radius:4px;"></div>
      </div>
      <span style="font-size:11px;color:var(--muted);width:70px;text-align:right;">${valor} / ${meta}</span>
    </div>`;
}

function calcularBadge(reportes, actividades, numPersonas = 5) {
  if (reportes.length === 0) return { badge: 'Sin registro', color: 'var(--muted)', bg: 'var(--surface2)' };
  const fibra = getMat(reportes, 'Fibra Principal');
  const cajas = getMat(reportes, 'Cajas NAT');
  const numIncidencias = reportes.reduce((s, r) => s + (r.numIncidencias || 0), 0);
  const acts = new Set(actividades);

  if (numPersonas >= 5 && fibra >= 2000 && acts.has('fibra')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas === 3 && fibra >= 1500 && acts.has('fibra')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas >= 5 && fibra >= 500 && acts.has('fibra') && acts.has('cajas') && (acts.has('instalacion') || acts.has('mudanza'))) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas <= 2 && cajas >= 5 && acts.has('cajas')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas <= 2 && acts.has('odf')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas <= 2 && acts.has('mangas')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (numPersonas <= 2 && numIncidencias > 6 && acts.has('incidencias')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (acts.has('instalacion')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (acts.has('mudanza')) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (fibra > 0 || cajas > 0 || numIncidencias > 0) return { badge: 'Parcial', color: '#854F0B', bg: '#FAEEDA' };
  return { badge: 'Bajo', color: '#A32D2D', bg: '#FCEBEB' };
}

async function iniciarIndicadores() {
  try {
    const res = await fetch('/api/reportes');
    todosLosReportes = await res.json();
    const semanas = {};
    todosLosReportes.forEach(r => { semanas[getLunes(r.fecha)] = true; });
    const semanasOrdenadas = Object.keys(semanas).sort().reverse();
    const sel = document.getElementById('semana-select');
    sel.innerHTML = semanasOrdenadas.map(s => {
      const lunes = new Date(s + 'T12:00:00');
      const sabado = new Date(lunes);
      sabado.setDate(sabado.getDate() + 5);
      const label = `${lunes.toLocaleDateString('es-EC', {day:'2-digit',month:'short'})} – ${sabado.toLocaleDateString('es-EC', {day:'2-digit',month:'short',year:'numeric'})}`;
      return `<option value="${s}">${label}</option>`;
    }).join('');
    cargarIndicadores();
  } catch(e) {
    document.getElementById('dias-semana').innerHTML = '<p class="empty">Error al cargar indicadores.</p>';
  }
}

function cargarIndicadores() {
  semanaActual = document.getElementById('semana-select').value;
  if (!semanaActual) return;
  const inicio = new Date(semanaActual + 'T12:00:00');
  const diasSemana = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    diasSemana.push(d.toISOString().slice(0, 10));
  }
  const reportesPorFecha = {};
  todosLosReportes.forEach(r => {
    if (!reportesPorFecha[r.fecha]) reportesPorFecha[r.fecha] = [];
    reportesPorFecha[r.fecha].push(r);
  });
  const nombres = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  let diasProductivos = 0, totalFibra = 0, totalCajas = 0, totalInstalaciones = 0;

  diasSemana.slice(0, 5).forEach(fecha => {
    const reportes = reportesPorFecha[fecha] || [];
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : []))];
    const numPersonas = integrantes.length || 5;
    const { badge } = calcularBadge(reportes, actividades, numPersonas);
    if (badge === 'Productivo') diasProductivos++;
    totalFibra += getMat(reportes, 'Fibra Principal');
    totalCajas += getMat(reportes, 'Cajas NAT');
    if (actividades.includes('instalacion') && reportes.length > 0) totalInstalaciones++;
  });

  const tieneSabado = (reportesPorFecha[diasSemana[5]] || []).length > 0;

  document.getElementById('metricas-resumen').innerHTML = `
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Días productivos</div>
      <div style="font-size:22px;font-weight:600;color:${diasProductivos >= 4 ? 'var(--accent)' : diasProductivos >= 2 ? '#f59e0b' : 'var(--danger)'};">${diasProductivos}/5</div>
      <div style="font-size:11px;color:var(--muted);">Lun – Vie</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Fibra tendida</div>
      <div style="font-size:22px;font-weight:600;">${totalFibra}m</div>
      <div style="font-size:11px;color:var(--muted);">semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Cajas armadas</div>
      <div style="font-size:22px;font-weight:600;">${totalCajas}</div>
      <div style="font-size:11px;color:var(--muted);">semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Instalaciones</div>
      <div style="font-size:22px;font-weight:600;color:var(--accent);">${totalInstalaciones}</div>
      <div style="font-size:11px;color:var(--muted);">${tieneSabado ? '+ Sáb extra' : 'días'}</div>
    </div>`;

  const cont = document.getElementById('dias-semana');
  cont.innerHTML = diasSemana.map((fecha, i) => {
    const reportes = reportesPorFecha[fecha] || [];
    const esSabado = i === 5;
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : []))];
    const numPersonas = integrantes.length || 5;
    const metaFibra = numPersonas >= 5 ? 2000 : numPersonas === 3 ? 1500 : Math.round(2000 * numPersonas / 5);
    const fibra = getMat(reportes, 'Fibra Principal');
    const cajas = getMat(reportes, 'Cajas NAT');
    const numIncidencias = reportes.reduce((s, r) => s + (r.numIncidencias || 0), 0);
    const ips = [...new Set(reportes.flatMap(r => r.ips || []))];
    const incidencias = [...new Set(reportes.flatMap(r => r.incidencias || []))];
    const cuadrilla = todasLasCuadrillas.find(c => reportes.some(r => r.cuadrillaId === c.id));

    let badgeInfo = esSabado
      ? { badge: 'Extra', color: '#854F0B', bg: '#FAEEDA' }
      : calcularBadge(reportes, actividades, numPersonas);

    const observaciones = reportes.map(r => r.observaciones).filter(Boolean);
    const actsHTML = actividades.length > 0 ? `
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        ${actividades.map(a => ACTIVIDADES_INFO[a] ? `
          <span style="font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">
            ${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}
          </span>` : '').join('')}
      </div>` : '';

    const todosMat = MATERIALES.map(m => ({
      label: m.label, val: getMat(reportes, m.label), unidad: m.unidad
    })).filter(m => m.val > 0);

    return `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;color:var(--accent);">${nombres[i]}</span>
            <span style="font-size:12px;color:var(--muted);margin-left:8px;">${fecha}</span>
            ${numPersonas < 5 && !esSabado && reportes.length > 0 ? `<span style="font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 7px;border-radius:10px;margin-left:6px;">👥 ${numPersonas}/5</span>` : ''}
            ${esSabado ? '<span style="font-size:10px;background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:2px 6px;border-radius:10px;margin-left:6px;">horas extra</span>' : ''}
          </div>
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${badgeInfo.bg};color:${badgeInfo.color};">${badgeInfo.badge}</span>
        </div>

        ${reportes.length === 0 ? '<p style="font-size:12px;color:var(--muted);text-align:center;padding:0.5rem 0;">Sin actividad registrada</p>' : `
          ${cuadrilla ? `<div style="font-size:12px;color:var(--accent);margin-bottom:8px;">🏷️ ${cuadrilla.nombre}</div>` : ''}
          ${actsHTML}
          ${integrantes.length > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">👷 Integrantes</div>
              <div style="font-size:13px;">${integrantes.join(', ')}</div>
            </div>` : ''}
          ${observaciones.length > 0 ? `
            <div style="margin-bottom:10px;background:var(--surface);border-left:3px solid var(--accent2);border-radius:0 6px 6px 0;padding:8px 12px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:3px;">📋 Observaciones</div>
              <div style="font-size:13px;line-height:1.5;">${observaciones.join(' | ')}</div>
            </div>` : ''}
          ${incidencias.length > 0 || numIncidencias > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">⚠️ Incidencias${numIncidencias > 0 ? ` (${numIncidencias} atendidas)` : ''}</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${incidencias.map(i => INCIDENCIAS_INFO[i] ? `<span style="font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">${INCIDENCIAS_INFO[i].icon} ${INCIDENCIAS_INFO[i].label}</span>` : '').join('')}
              </div>
            </div>` : ''}
          ${ips.length > 0 ? `
            <div style="margin-bottom:10px;">
              <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">🌐 IPs atendidas</div>
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${ips.map(ip => `<span style="font-size:12px;font-family:'IBM Plex Mono',monospace;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">${ip}</span>`).join('')}
              </div>
            </div>` : ''}
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📊 Rendimiento del día</div>
            ${actividades.includes('fibra') ? `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;color:var(--text);">📡 Fibra Principal</span>
                  <span style="font-size:11px;color:var(--muted);">meta: ${metaFibra}m</span>
                </div>
                ${barMeta(fibra, metaFibra)}
              </div>` : ''}
            ${actividades.includes('cajas') ? `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;color:var(--text);">📦 Cajas NAT</span>
                  <span style="font-size:11px;color:var(--muted);">meta: 5</span>
                </div>
                ${barMeta(cajas, 5)}
              </div>` : ''}
            ${actividades.includes('incidencias') ? `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;color:var(--text);">⚠️ Incidencias</span>
                  <span style="font-size:11px;color:var(--muted);">meta: 6</span>
                </div>
                ${barMeta(numIncidencias, 6)}
              </div>` : ''}
            ${['instalacion','mudanza','odf','mangas'].filter(a => actividades.includes(a)).map(a => `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;color:var(--text);">${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}</span>
                  <span style="font-size:11px;color:var(--accent);">✓ Productivo</span>
                </div>
                <div style="height:7px;background:#EAF3DE;border-radius:4px;">
                  <div style="width:100%;height:100%;background:#1D9E75;border-radius:4px;"></div>
                </div>
              </div>`).join('')}
          </div>
          ${todosMat.length > 0 ? `
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📦 Materiales utilizados</div>
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${todosMat.map(m => `
                  <tr>
                    <td style="font-size:12px;color:var(--text);padding:5px 8px 5px 0;width:150px;white-space:nowrap;">${m.label}</td>
                    <td style="padding:5px 8px;"><div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden;"><div style="width:100%;height:100%;background:#1D9E75;border-radius:3px;"></div></div></td>
                    <td style="font-size:12px;color:var(--muted);padding:5px 0;text-align:right;white-space:nowrap;width:80px;">${m.val} ${m.unidad}</td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>` : ''}
        `}
      </div>`;
  }).join('');

  const contMat = document.getElementById('top-materiales');
  const totalesMat = {};
  diasSemana.forEach(fecha => {
    (reportesPorFecha[fecha] || []).forEach(r => {
      r.materiales.forEach(m => { totalesMat[m.material] = (totalesMat[m.material] || 0) + m.cantidad; });
    });
  });
  const sorted = Object.entries(totalesMat).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) { contMat.innerHTML = '<p class="empty">No hay materiales registrados esta semana.</p>'; return; }
  const max = sorted[0][1];
  contMat.innerHTML = sorted.map(([mat, cant]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--muted);width:160px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mat}</span>
      <div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;">
        <div style="width:${Math.round(cant/max*100)}%;height:100%;background:var(--accent);border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;color:var(--muted);width:40px;text-align:right;">${cant}</span>
    </div>`).join('');
}

function exportarInformeSemanal() {
  if (!semanaActual) { toast('⚠ Selecciona una semana'); return; }
  const inicio = new Date(semanaActual + 'T12:00:00');
  const diasSemana = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicio);
    d.setDate(d.getDate() + i);
    diasSemana.push(d.toISOString().slice(0, 10));
  }
  const reportesPorFecha = {};
  todosLosReportes.forEach(r => {
    if (!reportesPorFecha[r.fecha]) reportesPorFecha[r.fecha] = [];
    reportesPorFecha[r.fecha].push(r);
  });
  const nombres = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const wb = XLSX.utils.book_new();
  const resumenFilas = [];
  diasSemana.forEach((fecha, i) => {
    const reportes = reportesPorFecha[fecha] || [];
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : []))];
    const numPersonas = integrantes.length || 5;
    const { badge } = i === 5 ? { badge: 'Extra' } : calcularBadge(reportes, actividades, numPersonas);
    const fibra = getMat(reportes, 'Fibra Principal');
    const cajas = getMat(reportes, 'Cajas NAT');
    const herrajesA = getMat(reportes, 'Herrajes A');
    const herrajesU = getMat(reportes, 'Herrajes U');
    const numIncidencias = reportes.reduce((s, r) => s + (r.numIncidencias || 0), 0);
    const ips = [...new Set(reportes.flatMap(r => r.ips || []))];
    const obs = reportes.map(r => r.observaciones).filter(Boolean).join(' | ');
    const cuadrilla = todasLasCuadrillas.find(c => reportes.some(r => r.cuadrillaId === c.id));
    resumenFilas.push({
      'Día': nombres[i], 'Fecha': fecha, 'Estado': badge,
      'Cuadrilla': cuadrilla ? cuadrilla.nombre : '—',
      'Personas': numPersonas,
      'Actividades': actividades.map(a => ACTIVIDADES_INFO[a]?.label || a).join(', ') || '—',
      'Integrantes': integrantes.join(', ') || '—',
      'Fibra Principal (m)': fibra,
      'Herrajes A': herrajesA, 'Herrajes U': herrajesU,
      'Cajas NAT': cajas, 'Incidencias': numIncidencias,
      'IPs': ips.join(', ') || '—',
      'Observaciones': obs || '—'
    });
  });
  const wsResumen = XLSX.utils.json_to_sheet(resumenFilas);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen semanal');
  const matFilas = [];
  diasSemana.forEach((fecha, i) => {
    const reportes = reportesPorFecha[fecha] || [];
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    reportes.forEach(r => {
      r.materiales.forEach(m => {
        matFilas.push({
          'Día': nombres[i], 'Fecha': fecha,
          'Actividades': actividades.map(a => ACTIVIDADES_INFO[a]?.label || a).join(', ') || '—',
          'Integrantes': Array.isArray(r.integrantes) ? r.integrantes.join(', ') : '',
          'Material': m.material, 'Cantidad': m.cantidad, 'Unidad': m.unidad
        });
      });
    });
  });
  const wsMat = XLSX.utils.json_to_sheet(matFilas);
  XLSX.utils.book_append_sheet(wb, wsMat, 'Detalle materiales');
  XLSX.writeFile(wb, `informe_semana_${semanaActual}.xlsx`);
  toast('✓ Informe semanal exportado');
}