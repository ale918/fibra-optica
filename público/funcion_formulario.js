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
];

const METAS = {
  fibraPrincipal: { label: 'Fibra Principal', meta: 2000, unidad: 'm', productivo: 2000, parcial: 1000 },
  cajasNat:       { label: 'Cajas NAT',        meta: 5,    unidad: 'und', productivo: 5, parcial: 3 },
  herrajes:       { label: 'Herrajes (A+U)',   meta: 40,   unidad: 'und', productivo: 40, parcial: 20 },
};

let todosLosReportes = [];
let stockActual = [];

document.getElementById('fecha').valueAsDate = new Date();

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
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
  const integrantes = document.getElementById('integrantes').value.trim();
  const observaciones = document.getElementById('observaciones').value.trim();
  if (!fecha)       { toast('⚠ Selecciona la fecha'); return; }
  if (!integrantes) { toast('⚠ Ingresa los integrantes'); return; }
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
      body: JSON.stringify({ fecha, integrantes, observaciones, materiales })
    });
    const data = await res.json();
    if (data.ok) { toast('✓ Reporte guardado'); limpiarFormulario(); }
    else toast('Error: ' + data.error);
  } catch(e) { toast('Error de conexión'); }
}

function limpiarFormulario() {
  document.getElementById('integrantes').value = '';
  document.getElementById('observaciones').value = '';
  document.getElementById('fecha').valueAsDate = new Date();
  MATERIALES.forEach(m => { document.getElementById(m.id).value = ''; });
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
    return `
      <div class="reporte-card">
        <div class="reporte-header" onclick="toggleReporte(${r.id})">
          <div>
            <div class="reporte-fecha">${dia}, ${r.fecha}</div>
            <div class="reporte-integrantes">👷 ${r.integrantes.join(' · ')}</div>
          </div>
          <div style="color:var(--muted);font-size:18px;" id="arrow-${r.id}">▼</div>
        </div>
        <div class="reporte-body" id="body-${r.id}" style="display:none;">
          ${r.observaciones ? `<div class="obs-box">${r.observaciones}</div>` : ''}
          <table class="mat-table">
            <thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead>
            <tbody>${r.materiales.map(m => `<tr><td>${m.material}</td><td class="cant">${m.cantidad}</td><td>${m.unidad}</td></tr>`).join('')}</tbody>
          </table>
          <div class="reporte-actions">
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
  const datos = r.materiales.map(m => ({
    'Fecha': r.fecha, 'Día': dias[d.getDay()],
    'Integrantes': r.integrantes.join(', '),
    'Material': m.material, 'Cantidad': m.cantidad,
    'Unidad': m.unidad, 'Observaciones': r.observaciones || ''
  }));
  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [{wch:12},{wch:12},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
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
    r.materiales.forEach(m => {
      filas.push({
        'Fecha': r.fecha, 'Día': dias[d.getDay()],
        'Integrantes': r.integrantes.join(', '),
        'Material': m.material, 'Cantidad': m.cantidad,
        'Unidad': m.unidad, 'Observaciones': r.observaciones || ''
      });
    });
  });
  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [{wch:12},{wch:12},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  XLSX.writeFile(wb, `historial_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('✓ Historial exportado');
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

function getMaterialCantidad(reportes, labelMaterial) {
  return reportes.reduce((s, r) => {
    const m = r.materiales.find(m => m.material === labelMaterial);
    return s + (m ? m.cantidad : 0);
  }, 0);
}

function barMeta(valor, meta, colorOk, colorParcial, colorBajo) {
  const pct = Math.min(Math.round(valor / meta * 100), 100);
  const color = valor >= meta ? colorOk : valor >= meta / 2 ? colorParcial : colorBajo;
  return `
    <div style="display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
      </div>
      <span style="font-size:11px;color:var(--muted);width:60px;text-align:right;">${valor} / ${meta}</span>
    </div>`;
}

async function iniciarIndicadores() {
  try {
    const res = await fetch('/api/reportes');
    todosLosReportes = await res.json();

    const semanas = {};
    todosLosReportes.forEach(r => {
      const lunes = getLunes(r.fecha);
      semanas[lunes] = true;
    });

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
  const lunes = document.getElementById('semana-select').value;
  if (!lunes) return;

  const inicio = new Date(lunes + 'T12:00:00');
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

  diasSemana.slice(0, 5).forEach(fecha => {
    const reportes = reportesPorFecha[fecha] || [];
    const fibra = getMaterialCantidad(reportes, 'Fibra Principal');
    if (fibra >= METAS.fibraPrincipal.productivo) diasProductivos++;
    totalFibra += fibra;
    totalCajas += getMaterialCantidad(reportes, 'Cajas NAT');
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
      <div style="font-size:11px;color:var(--muted);">meta: ${METAS.fibraPrincipal.productivo * 5}m semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Cajas instaladas</div>
      <div style="font-size:22px;font-weight:600;">${totalCajas}</div>
      <div style="font-size:11px;color:var(--muted);">meta: ${METAS.cajasNat.productivo * 5} semana</div>
    </div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;">
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Horas extra</div>
      <div style="font-size:22px;font-weight:600;color:${tieneSabado ? '#f59e0b' : 'var(--muted)'};">${tieneSabado ? 'Sáb' : '—'}</div>
      <div style="font-size:11px;color:var(--muted);">${tieneSabado ? '1 día registrado' : 'sin registro'}</div>
    </div>`;

  // Días de la semana
  const cont = document.getElementById('dias-semana');
  cont.innerHTML = diasSemana.map((fecha, i) => {
    const reportes = reportesPorFecha[fecha] || [];
    const esSabado = i === 5;
    const fibra = getMaterialCantidad(reportes, 'Fibra Principal');
    const cajas = getMaterialCantidad(reportes, 'Cajas NAT');
    const herrajesA = getMaterialCantidad(reportes, 'Herrajes A');
    const herrajesU = getMaterialCantidad(reportes, 'Herrajes U');
    const herrajes = herrajesA + herrajesU;
    const metaHerrajesDia = Math.round(fibra / 50);

    let badge, badgeColor, badgeBg;
    if (esSabado) {
      badge = 'Extra'; badgeColor = '#854F0B'; badgeBg = '#FAEEDA';
    } else if (reportes.length === 0) {
      badge = 'Sin registro'; badgeColor = 'var(--muted)'; badgeBg = 'var(--surface2)';
    } else if (fibra >= METAS.fibraPrincipal.productivo) {
      badge = 'Productivo'; badgeColor = '#3B6D11'; badgeBg = '#EAF3DE';
    } else if (fibra >= METAS.fibraPrincipal.parcial) {
      badge = 'Parcial'; badgeColor = '#854F0B'; badgeBg = '#FAEEDA';
    } else {
      badge = 'Bajo'; badgeColor = '#A32D2D'; badgeBg = '#FCEBEB';
    }

    const integrantes = [...new Set(reportes.flatMap(r => Array.isArray(r.integrantes) ? r.integrantes : r.integrantes.split(',').map(x => x.trim())))];
    const observaciones = reportes.map(r => r.observaciones).filter(Boolean);

    return `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:10px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <span style="font-family:'IBM Plex Mono',monospace;font-size:14px;font-weight:600;color:var(--accent);">${nombres[i]}</span>
            <span style="font-size:12px;color:var(--muted);margin-left:8px;">${fecha}</span>
            ${esSabado ? '<span style="font-size:10px;background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:2px 6px;border-radius:10px;margin-left:6px;">horas extra</span>' : ''}
          </div>
          <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${badgeBg};color:${badgeColor};">${badge}</span>
        </div>

        ${reportes.length === 0 ? '<p style="font-size:12px;color:var(--muted);text-align:center;padding:0.5rem 0;">Sin actividad registrada</p>' : `

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

          <div style="margin-bottom:10px;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">📊 Metas del día</div>

            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:12px;color:var(--text);">Fibra Principal</span>
                <span style="font-size:11px;color:var(--muted);">meta: ${METAS.fibraPrincipal.meta}m</span>
              </div>
              ${barMeta(fibra, METAS.fibraPrincipal.meta, '#1D9E75', '#BA7517', '#E24B4A')}
            </div>

            <div style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:12px;color:var(--text);">Cajas NAT</span>
                <span style="font-size:11px;color:var(--muted);">meta: ${METAS.cajasNat.meta}</span>
              </div>
              ${barMeta(cajas, METAS.cajasNat.meta, '#1D9E75', '#BA7517', '#E24B4A')}
            </div>

            <div>
              <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
                <span style="font-size:12px;color:var(--text);">Herrajes (A+U)</span>
                <span style="font-size:11px;color:var(--muted);">meta según fibra: ${metaHerrajesDia > 0 ? metaHerrajesDia : METAS.herrajes.meta}</span>
              </div>
              ${barMeta(herrajes, metaHerrajesDia > 0 ? metaHerrajesDia : METAS.herrajes.meta, '#1D9E75', '#BA7517', '#E24B4A')}
            </div>
          </div>

          <div>
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">📦 Materiales usados</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${(() => {
                const mat = {};
                reportes.forEach(r => r.materiales.forEach(m => { mat[m.material] = (mat[m.material] || 0) + m.cantidad; }));
                return Object.entries(mat).map(([m, c]) => `
                  <span style="font-size:12px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">
                    ${m}: <strong>${c}</strong>
                  </span>`).join('');
              })()}
            </div>
          </div>
        `}
      </div>`;
  }).join('');

  // Top materiales
  const contMat = document.getElementById('top-materiales');
  const totalesMat = {};
  diasSemana.forEach(fecha => {
    (reportesPorFecha[fecha] || []).forEach(r => {
      r.materiales.forEach(m => {
        totalesMat[m.material] = (totalesMat[m.material] || 0) + m.cantidad;
      });
    });
  });

  const sorted = Object.entries(totalesMat).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) {
    contMat.innerHTML = '<p class="empty">No hay materiales registrados esta semana.</p>';
    return;
  }
  const max = sorted[0][1];
  contMat.innerHTML = sorted.map(([mat, cant]) => `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-size:12px;color:var(--muted);width:160px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mat}</span>
      <div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;">
        <div style="width:${Math.round(cant/max*100)}%;height:100%;background:var(--accent);border-radius:3px;"></div>
      </div>
      <span style="font-size:12px;color:var(--muted);width:30px;text-align:right;">${cant}</span>
    </div>`).join('');
}