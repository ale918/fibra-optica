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
  fibra:       { label: 'Pasado de fibra principal', icon: '📡' },
  cajas:       { label: 'Armado de cajas NAT',       icon: '📦' },
  instalacion: { label: 'Instalación cliente final', icon: '🔌' },
};

let actividadesSeleccionadas = new Set();
let todosLosReportes = [];
let stockActual = [];
let semanaActual = '';

document.getElementById('fecha').valueAsDate = new Date();

// ── Conectados ───────────────────────────────────────────
async function cargarConectados() {
  try {
    const res = await fetch('/api/conectados');
    const conectados = await res.json();
    const texto = document.getElementById('conectados-texto');
    const badge = document.getElementById('conectados-badge');
    if (conectados.length === 0) {
      texto.textContent = 'Solo tú';
      badge.title = '';
    } else if (conectados.length === 1) {
      texto.textContent = conectados[0].nombre;
      badge.title = `Conectado desde: ${conectados[0].desde}`;
    } else {
      texto.textContent = `${conectados.length} conectados`;
      badge.title = conectados.map(c => `${c.nombre} (desde ${c.desde})`).join('\n');
    }
  } catch(e) {}
}

cargarConectados();
setInterval(cargarConectados, 30000);

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

function toggleActividad(id) {
  const btn = document.getElementById('act-' + id);
  if (actividadesSeleccionadas.has(id)) {
    actividadesSeleccionadas.delete(id);
    btn.classList.remove('selected');
  } else {
    actividadesSeleccionadas.add(id);
    btn.classList.add('selected');
  }
}

function mostrarTab(tab) {
  ['registro','historial','bodega','indicadores'].forEach(t => {
    document.getElementById('tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.tab').forEach((btn, i) => {
    btn.classList.toggle('active', i === ['registro','historial','bodega','indicadores'].indexOf(tab));
  });
  if (tab === 'historial') cargarHistorial();
  if (tab === 'bodega') cargarBodega();
  if (tab === 'indicadores') iniciarIndicadores();
}

// ── Reportes ─────────────────────────────────────────────
async function guardarReporte() {
  const fecha = document.getElementById('fecha').value;
  const observaciones = document.getElementById('observaciones').value.trim();
  if (!fecha) { toast('⚠ Selecciona la fecha'); return; }
  if (actividadesSeleccionadas.size === 0) { toast('⚠ Selecciona al menos una actividad'); return; }

  const integrantes = [...document.querySelectorAll('.integrante-check input:checked')].map(i => i.value);
  if (!integrantes.length) { toast('⚠ Selecciona al menos un integrante'); return; }

  const materiales = MATERIALES.map(m => ({
    material: m.label,
    cantidad: parseFloat(document.getElementById(m.id).value) || 0,
    unidad: m.unidad
  })).filter(m => m.cantidad > 0);
  if (!materiales.length) { toast('⚠ Ingresa al menos un material'); return; }

  try {
    const res = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, integrantes, observaciones, materiales, actividades: [...actividadesSeleccionadas] })
    });
    const data = await res.json();
    if (data.ok) { toast('✓ Reporte guardado'); limpiarFormulario(); }
    else toast('Error: ' + data.error);
  } catch(e) { toast('Error de conexión'); }
}

function limpiarFormulario() {
  document.getElementById('observaciones').value = '';
  document.getElementById('fecha').valueAsDate = new Date();
  MATERIALES.forEach(m => { document.getElementById(m.id).value = ''; });
  document.querySelectorAll('.integrante-check input').forEach(c => c.checked = false);
  actividadesSeleccionadas.clear();
  document.querySelectorAll('.actividad-btn').forEach(b => b.classList.remove('selected'));
}

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
    return `
      <div class="reporte-card">
        <div class="reporte-header" onclick="toggleReporte(${r.id})">
          <div>
            <div class="reporte-fecha">${dia}, ${r.fecha}</div>
            <div class="reporte-integrantes">👷 ${r.integrantes.join(' · ')}</div>
            ${acts ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">${acts}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${fotos.length > 0 ? `<span style="font-size:11px;color:var(--muted);">📷 ${fotos.length}</span>` : ''}
            <div style="color:var(--muted);font-size:18px;" id="arrow-${r.id}">▼</div>
          </div>
        </div>
        <div class="reporte-body" id="body-${r.id}" style="display:none;">
          ${r.observaciones ? `<div class="obs-box">${r.observaciones}</div>` : ''}
          <table class="mat-table">
            <thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead>
            <tbody>${r.materiales.map(m => `<tr><td>${m.material}</td><td class="cant">${m.cantidad}</td><td>${m.unidad}</td></tr>`).join('')}</tbody>
          </table>
          <div style="margin-top:1rem;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📷 Fotos del trabajo</div>
            <div id="fotos-${r.id}" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
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
    'Unidad': m.unidad, 'Observaciones': r.observaciones || ''
  }));
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [{wch:12},{wch:12},{wch:40},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
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
        'Unidad': m.unidad, 'Observaciones': r.observaciones || ''
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [{wch:12},{wch:12},{wch:40},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
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
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:500;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  overlay.innerHTML = `<img src="${url}" style="max-width:90%;max-height:90%;border-radius:8px;" />`;
  overlay.onclick = () => document.body.removeChild(overlay);
  document.body.appendChild(overlay);
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
  if (!stockActual.length) {
    cont.innerHTML = '<p class="empty">No hay stock registrado. Usa "Actualizar stock" para agregar.</p>';
    return;
  }
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
    if (!movimientos.length) {
      cont.innerHTML = '<p class="empty">No hay movimientos registrados.</p>';
      return;
    }
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
  ws['!cols'] = [{wch:30},{wch:20}];
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
  const metaFibra = Math.round(2000 * numPersonas / 5);
  const metaCajas = Math.round(5 * numPersonas / 5);
  let puntos = 0; let total = 0;
  if (actividades.includes('fibra')) {
    total++;
    if (fibra >= metaFibra) puntos++;
    else if (fibra >= metaFibra / 2) puntos += 0.5;
  }
  if (actividades.includes('cajas')) {
    total++;
    if (cajas >= metaCajas) puntos++;
    else if (cajas >= metaCajas / 2) puntos += 0.5;
  }
  if (actividades.includes('instalacion')) { total++; puntos++; }
  if (total === 0) return { badge: 'Sin actividad', color: 'var(--muted)', bg: 'var(--surface2)' };
  const ratio = puntos / total;
  if (ratio >= 0.8) return { badge: 'Productivo', color: '#3B6D11', bg: '#EAF3DE' };
  if (ratio >= 0.4) return { badge: 'Parcial', color: '#854F0B', bg: '#FAEEDA' };
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
  let diasProductivos = 0;
  let totalFibra = 0;
  let totalCajas = 0;
  let totalInstalaciones = 0;

  diasSemana.slice(0, 5).forEach(fecha => {
    const reportes = reportesPorFecha[fecha] || [];
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(x => x.trim())))];
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
      <div style="font-size:11px;color:var(--muted);">meta: 10,000m semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Cajas armadas</div>
      <div style="font-size:22px;font-weight:600;">${totalCajas}</div>
      <div style="font-size:11px;color:var(--muted);">meta: 25 semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Instalaciones</div>
      <div style="font-size:22px;font-weight:600;color:var(--accent);">${totalInstalaciones}</div>
      <div style="font-size:11px;color:var(--muted);">${tieneSabado ? '+ Sáb extra' : 'días con instalaciones'}</div>
    </div>`;

  const cont = document.getElementById('dias-semana');
  cont.innerHTML = diasSemana.map((fecha, i) => {
    const reportes = reportesPorFecha[fecha] || [];
    const esSabado = i === 5;
    const actividades = [...new Set(reportes.flatMap(r => r.actividades || []))];
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(x => x.trim())))];
    const numPersonas = integrantes.length || 5;
    const metaFibra = Math.round(2000 * numPersonas / 5);
    const metaCajas = Math.round(5 * numPersonas / 5);
    const fibra = getMat(reportes, 'Fibra Principal');
    const cajas = getMat(reportes, 'Cajas NAT');

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
            ${numPersonas < 5 && !esSabado && reportes.length > 0 ? `<span style="font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 7px;border-radius:10px;margin-left:6px;">👥 ${numPersonas}/5 personas</span>` : ''}
            ${esSabado ? '<span style="font-size:10px;background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:2px 6px;border-radius:10px;margin-left:6px;">horas extra</span>' : ''}
          </div>
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${badgeInfo.bg};color:${badgeInfo.color};">${badgeInfo.badge}</span>
        </div>

        ${reportes.length === 0 ? '<p style="font-size:12px;color:var(--muted);text-align:center;padding:0.5rem 0;">Sin actividad registrada</p>' : `
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
          <div style="margin-bottom:12px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📊 Rendimiento del día${numPersonas < 5 ? ` (ajustado a ${numPersonas}/5 personas)` : ''}</div>
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
                  <span style="font-size:11px;color:var(--muted);">meta: ${metaCajas}</span>
                </div>
                ${barMeta(cajas, metaCajas)}
              </div>` : ''}
            ${actividades.includes('instalacion') ? `
              <div style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;color:var(--text);">🔌 Instalación cliente</span>
                  <span style="font-size:11px;color:var(--accent);">✓ Día productivo</span>
                </div>
                <div style="height:7px;background:#EAF3DE;border-radius:4px;">
                  <div style="width:100%;height:100%;background:#1D9E75;border-radius:4px;"></div>
                </div>
              </div>` : ''}
          </div>
          ${todosMat.length > 0 ? `
          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📦 Materiales utilizados</div>
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${todosMat.map(m => `
                  <tr>
                    <td style="font-size:12px;color:var(--text);padding:5px 8px 5px 0;width:150px;white-space:nowrap;">${m.label}</td>
                    <td style="padding:5px 8px;">
                      <div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden;">
                        <div style="width:100%;height:100%;background:#1D9E75;border-radius:3px;"></div>
                      </div>
                    </td>
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

// ── Exportar informe semanal ──────────────────────────────
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
    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(x => x.trim())))];
    const numPersonas = integrantes.length || 5;
    const { badge } = i === 5 ? { badge: 'Extra' } : calcularBadge(reportes, actividades, numPersonas);
    const fibra = getMat(reportes, 'Fibra Principal');
    const cajas = getMat(reportes, 'Cajas NAT');
    const herrajesA = getMat(reportes, 'Herrajes A');
    const herrajesU = getMat(reportes, 'Herrajes U');
    const obs = reportes.map(r => r.observaciones).filter(Boolean).join(' | ');
    resumenFilas.push({
      'Día': nombres[i], 'Fecha': fecha, 'Estado': badge,
      'Personas': numPersonas,
      'Actividades': actividades.map(a => ACTIVIDADES_INFO[a]?.label || a).join(', ') || '—',
      'Integrantes': integrantes.join(', ') || '—',
      'Fibra Principal (m)': fibra,
      'Herrajes A': herrajesA, 'Herrajes U': herrajesU,
      'Herrajes total': herrajesA + herrajesU,
      'Cajas NAT': cajas, 'Observaciones': obs || '—'
    });
  });
  const wsResumen = XLSX.utils.json_to_sheet(resumenFilas);
  wsResumen['!cols'] = [{wch:12},{wch:12},{wch:14},{wch:10},{wch:45},{wch:35},{wch:18},{wch:12},{wch:12},{wch:14},{wch:12},{wch:40}];
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
          'Integrantes': Array.isArray(r.integrantes) ? r.integrantes.join(', ') : r.integrantes,
          'Material': m.material, 'Cantidad': m.cantidad, 'Unidad': m.unidad
        });
      });
    });
  });
  const wsMat = XLSX.utils.json_to_sheet(matFilas);
  wsMat['!cols'] = [{wch:12},{wch:12},{wch:45},{wch:35},{wch:28},{wch:12},{wch:8}];
  XLSX.utils.book_append_sheet(wb, wsMat, 'Detalle materiales');
  XLSX.writeFile(wb, `informe_semana_${semanaActual}.xlsx`);
  toast('✓ Informe semanal exportado');
}