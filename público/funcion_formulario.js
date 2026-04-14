const MATERIALES = [
  { id: 'herrajesA',    label: 'Herrajes A',          unidad: 'und' },
  { id: 'herrajesU',    label: 'Herrajes U',          unidad: 'und' },
  { id: 'cinta34',      label: 'Cinta 3/4"',          unidad: 'm'   },
  { id: 'cinta32',      label: 'Cinta 3/2"',          unidad: 'm'   },
  { id: 'cableDrop',    label: 'Cable Drop',          unidad: 'm'   },
  { id: 'fibraPrincipal','label': 'Fibra Principal',  unidad: 'm'   },
  { id: 'hebilla34',    label: 'Hebilla metálica 3/4"',unidad: 'und'},
  { id: 'hebilla32',    label: 'Hebilla metálica 3/2"',unidad: 'und'},
  { id: 'chupones',     label: 'Chupones',            unidad: 'und' },
  { id: 'preformados',  label: 'Preformados',         unidad: 'und' },
  { id: 'cajasNat',     label: 'Cajas NAT',           unidad: 'und' },
  { id: 'splitter116',  label: 'Splitter 1/16',       unidad: 'und' },
  { id: 'splitter14',   label: 'Splitter 1/4',        unidad: 'und' },
];

let todosLosReportes = [];

// ── Init ────────────────────────────────────────────────
document.getElementById('fecha').valueAsDate = new Date();

// ── Toast ───────────────────────────────────────────────
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── Tabs ────────────────────────────────────────────────
function mostrarTab(tab) {
  document.getElementById('tab-registro').style.display  = tab === 'registro'  ? 'block' : 'none';
  document.getElementById('tab-historial').style.display = tab === 'historial' ? 'block' : 'none';
  document.querySelectorAll('.tab').forEach((btn, i) => {
    btn.classList.toggle('active', (i === 0 && tab === 'registro') || (i === 1 && tab === 'historial'));
  });
  if (tab === 'historial') cargarHistorial();
}

// ── Guardar reporte ─────────────────────────────────────
async function guardarReporte() {
  const fecha = document.getElementById('fecha').value;
  const integrantes = document.getElementById('integrantes').value.trim();
  const observaciones = document.getElementById('observaciones').value.trim();

  if (!fecha)        { toast('⚠ Selecciona la fecha'); return; }
  if (!integrantes)  { toast('⚠ Ingresa los integrantes del grupo'); return; }

  const materiales = MATERIALES.map(m => ({
    material: m.label,
    cantidad: parseFloat(document.getElementById(m.id).value) || 0,
    unidad: m.unidad
  })).filter(m => m.cantidad > 0);

  if (!materiales.length) { toast('⚠ Ingresa al menos un material usado'); return; }

  try {
    const res = await fetch('/api/reportes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, integrantes, observaciones, materiales })
    });
    const data = await res.json();
    if (data.ok) {
      toast('✓ Reporte guardado correctamente');
      limpiarFormulario();
    } else {
      toast('Error: ' + data.error);
    }
  } catch (e) {
    toast('Error de conexión con el servidor');
  }
}

// ── Limpiar formulario ──────────────────────────────────
function limpiarFormulario() {
  document.getElementById('integrantes').value = '';
  document.getElementById('observaciones').value = '';
  document.getElementById('fecha').valueAsDate = new Date();
  MATERIALES.forEach(m => { document.getElementById(m.id).value = ''; });
}

// ── Cargar historial ────────────────────────────────────
async function cargarHistorial() {
  try {
    const res = await fetch('/api/reportes');
    todosLosReportes = await res.json();
    renderHistorial(todosLosReportes);
  } catch (e) {
    document.getElementById('lista-reportes').innerHTML =
      '<p class="empty">Error al conectar con el servidor.</p>';
  }
}

function filtrarHistorial() {
  const q = document.getElementById('buscar-fecha').value.trim().toLowerCase();
  const filtrados = todosLosReportes.filter(r => r.fecha.includes(q));
  renderHistorial(filtrados);
}

// ── Render historial ────────────────────────────────────
function renderHistorial(reportes) {
  const cont = document.getElementById('lista-reportes');

  if (!reportes.length) {
    cont.innerHTML = '<p class="empty">No hay reportes registrados.</p>';
    return;
  }

  cont.innerHTML = reportes.map(r => {
    const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const d = new Date(r.fecha + 'T12:00:00');
    const diaNombre = diasSemana[d.getDay()];

    const filasMaterieles = r.materiales.map(m => `
      <tr>
        <td>${m.material}</td>
        <td class="cant">${m.cantidad}</td>
        <td>${m.unidad}</td>
      </tr>
    `).join('');

    return `
      <div class="reporte-card">
        <div class="reporte-header" onclick="toggleReporte(${r.id})">
          <div>
            <div class="reporte-fecha">${diaNombre}, ${r.fecha}</div>
            <div class="reporte-integrantes">👷 ${r.integrantes.join(' · ')}</div>
          </div>
          <div style="color:var(--muted);font-size:18px;" id="arrow-${r.id}">▼</div>
        </div>
        <div class="reporte-body" id="body-${r.id}" style="display:none;">
          ${r.observaciones ? `<div class="obs-box">${r.observaciones}</div>` : ''}
          <table class="mat-table">
            <thead>
              <tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr>
            </thead>
            <tbody>${filasMaterieles}</tbody>
          </table>
          <div class="reporte-actions">
            <button onclick="exportarReporteExcel(${r.id})">↓ Excel</button>
            <button class="btn-danger" onclick="eliminarReporte(${r.id})">Eliminar</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function toggleReporte(id) {
  const body = document.getElementById('body-' + id);
  const arrow = document.getElementById('arrow-' + id);
  const visible = body.style.display !== 'none';
  body.style.display = visible ? 'none' : 'block';
  arrow.textContent = visible ? '▼' : '▲';
}

// ── Eliminar reporte ────────────────────────────────────
async function eliminarReporte(id) {
  if (!confirm('¿Eliminar este reporte?')) return;
  await fetch('/api/reportes/' + id, { method: 'DELETE' });
  toast('Reporte eliminado');
  cargarHistorial();
}

// ── Exportar un reporte a Excel ─────────────────────────
function exportarReporteExcel(id) {
  const r = todosLosReportes.find(x => x.id === id);
  if (!r) return;

  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const d = new Date(r.fecha + 'T12:00:00');
  const diaNombre = diasSemana[d.getDay()];

  const datos = r.materiales.map(m => ({
    'Fecha': r.fecha,
    'Día': diaNombre,
    'Integrantes': r.integrantes.join(', '),
    'Material': m.material,
    'Cantidad': m.cantidad,
    'Unidad': m.unidad,
    'Observaciones': r.observaciones || ''
  }));

  const ws = XLSX.utils.json_to_sheet(datos);
  ws['!cols'] = [{wch:12},{wch:12},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
  XLSX.writeFile(wb, `reporte_${r.fecha}.xlsx`);
  toast('✓ Excel descargado');
}

// ── Exportar TODO el historial ──────────────────────────
function exportarTodoExcel() {
  if (!todosLosReportes.length) { toast('⚠ No hay reportes'); return; }

  const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const filas = [];

  todosLosReportes.forEach(r => {
    const d = new Date(r.fecha + 'T12:00:00');
    const diaNombre = diasSemana[d.getDay()];
    r.materiales.forEach(m => {
      filas.push({
        'Fecha': r.fecha,
        'Día': diaNombre,
        'Integrantes': r.integrantes.join(', '),
        'Material': m.material,
        'Cantidad': m.cantidad,
        'Unidad': m.unidad,
        'Observaciones': r.observaciones || ''
      });
    });
  });

  const ws = XLSX.utils.json_to_sheet(filas);
  ws['!cols'] = [{wch:12},{wch:12},{wch:35},{wch:25},{wch:10},{wch:8},{wch:40}];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Historial');
  const hoy = new Date().toISOString().slice(0,10);
  XLSX.writeFile(wb, `historial_materiales_${hoy}.xlsx`);
  toast('✓ Historial exportado a Excel');
}