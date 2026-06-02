const ACTIVIDADES_INFO = {
  fibra:      { label: 'Pasado de fibra principal',    icon: '📡' },
  cajas:      { label: 'Armado de cajas NAT',          icon: '📦' },
  instalacion:{ label: 'Instalación cliente final',    icon: '🔌' },
  mudanza:    { label: 'Mudar clientes radio a fibra', icon: '🔄' },
  odf:        { label: 'Armado de ODF',                icon: '🗄️' },
  mangas:     { label: 'Armado de mangas',             icon: '🔧' },
  incidencias:{ label: 'Incidencias',                  icon: '⚠️' },
  reparacion: { label: 'Reparación de fibra principal',icon: '🛠️' },
};

const INCIDENCIAS_TIPOS = {
  cambio_equipos:   { label: 'Cambio de equipos',  icon: '🔧' },
  foco_rojo:        { label: 'Foco rojo',           icon: '🔴' },
  actualizaciones:  { label: 'Actualizaciones',     icon: '🔄' },
  cambio_domicilio: { label: 'Cambio de domicilio', icon: '🏠' },
};

const TIPO_CAJA = {
  principal: { label: 'Caja principal', icon: '📦', color: '#1D9E75' },
  cliente:   { label: 'Caja cliente',   icon: '🔌', color: '#3B82F6' },
  pasante:   { label: 'Pasante',        icon: '➡️', color: '#F59E0B' },
};

const BUFFERS = ['Azul','Naranja','Verde','Café','Gris','Blanco','Rojo','Negro'];
const HILOS   = ['Azul','Naranja','Verde','Café','Gris','Blanco','Rojo','Negro','Amarillo','Violeta','Rosado','Aqua'];
const COLOR_BUFFER = {
  Azul:'#3B82F6', Naranja:'#F97316', Verde:'#22C55E', Café:'#92400E',
  Gris:'#6B7280', Blanco:'#E5E7EB', Rojo:'#EF4444', Negro:'#111827'
};

const MATERIALES_STOCK = [
  { id:'herrajesA',      label:'Herrajes A',            unidad:'und' },
  { id:'herrajesU',      label:'Herrajes U',            unidad:'und' },
  { id:'cinta34',        label:'Cinta 3/4"',            unidad:'m'   },
  { id:'cinta32',        label:'Cinta 3/2"',            unidad:'m'   },
  { id:'cableDrop',      label:'Cable Drop',            unidad:'m'   },
  { id:'fibraPrincipal', label:'Fibra Principal',       unidad:'m'   },
  { id:'hebilla34',      label:'Hebilla metálica 3/4"', unidad:'und' },
  { id:'hebilla32',      label:'Hebilla metálica 3/2"', unidad:'und' },
  { id:'chupones',       label:'Chupones',              unidad:'und' },
  { id:'preformados',    label:'Preformados',           unidad:'und' },
  { id:'cajasNat',       label:'Cajas NAT',             unidad:'und' },
  { id:'splitter116',    label:'Splitter 1/16',         unidad:'und' },
  { id:'splitter14',     label:'Splitter 1/4',          unidad:'und' },
  { id:'ganchosTel',     label:'Ganchos telefónicos',   unidad:'und' },
  { id:'conectorUpc',    label:'Conector UPC',          unidad:'und' },
  { id:'conectorApc',    label:'Conector APC',          unidad:'und' },
];

let actividadesSeleccionadas = new Set();
let todosLosReportes = [];
let todasLasCuadrillas = [];
let todasLasCajas = [];
let stockActual = [];
let semanaActual = '';
let rolActual = '';
let cuadrillaHoyId = null;
let ipCounters = {};
let gpsLat = null, gpsLng = null;
let cajaGpsLat = null, cajaGpsLng = null;
let mapaLeaflet = null;
let marcadoresMapa = [];
let marcadorYo = null;
let circuloYo = null;
let filtroActivo = 'todos';
let modoSeleccionMapa = false;
let modoSeleccionMapaCaja = false;
let distContador = 0;
let distRegContador = 0;
let editDistMap = {};

// ── Fecha local ──────────────────────────────────────────
function fechaLocal() {
  const a = new Date();
  return `${a.getFullYear()}-${String(a.getMonth()+1).padStart(2,'0')}-${String(a.getDate()).padStart(2,'0')}`;
}

// ── Init ─────────────────────────────────────────────────
async function init() {
  try {
    const res = await fetch('/api/me');
    const data = await res.json();
    if (!data.loggedIn) { window.location.href = '/'; return; }
    rolActual = data.rol;
    await cargarTodasLasCuadrillas();
    const tabs = document.getElementById('nav-tabs');
    if (rolActual === 'admin') {
      tabs.innerHTML = `
        <button class="tab active" onclick="mostrarTab('historial')">Historial</button>
        <button class="tab" onclick="mostrarTab('mapa')">Mapa</button>
        <button class="tab" onclick="mostrarTab('bodega')">Bodega</button>
        <button class="tab" onclick="mostrarTab('indicadores')">Indicadores</button>
        <button class="tab" onclick="mostrarTab('cuadrillas')">Cuadrillas</button>`;
      mostrarTab('historial');
    } else {
      tabs.innerHTML = `
        <button class="tab active" onclick="mostrarTab('registro')">Nuevo registro</button>
        <button class="tab" onclick="mostrarTab('mapa')">Mapa</button>
        <button class="tab" onclick="mostrarTab('historial')">Historial</button>
        <button class="tab" onclick="mostrarTab('bodega')">Bodega</button>
        <button class="tab" onclick="mostrarTab('indicadores')">Indicadores</button>`;
      const f = document.getElementById('fecha');
      if (f) f.value = fechaLocal();
      await cargarCuadrillaHoy();
      mostrarTab('registro');
    }
    cargarConectados();
    setInterval(cargarConectados, 30000);
  } catch(e) { console.error('Init error:', e); }
}
init();

// ── Actividades ──────────────────────────────────────────
function toggleActividad(id) {
  const btn = document.getElementById('act-' + id);
  const panel = document.getElementById('panel-' + id);
  if (actividadesSeleccionadas.has(id)) {
    actividadesSeleccionadas.delete(id);
    btn.classList.remove('selected');
    if (panel) panel.style.display = 'none';
  } else {
    actividadesSeleccionadas.add(id);
    btn.classList.add('selected');
    if (panel) panel.style.display = 'block';
  }
}

function toggleIncPanel(tipo) {
  const cb = document.getElementById(`inc-${tipo}`);
  const panel = document.getElementById(`subpanel-${tipo}`);
  if (panel) panel.style.display = cb.checked ? 'block' : 'none';
}

// ── Distribución de hilos por buffer ─────────────────────
function toggleDistribucionReg() {
  const tipo = document.getElementById('caja-tipo-reg')?.value;
  const panel = document.getElementById('dist-reg-panel');
  if (panel) panel.style.display = tipo === 'principal' ? 'block' : 'none';
}

function agregarDistReg(bufferPreset = '') {
  distRegContador++;
  const id = distRegContador;
  const lista = document.getElementById('dist-reg-lista');
  const div = document.createElement('div');
  div.id = `dreg-grupo-${id}`;
  div.style.cssText = 'background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;';
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Buffer</label>
      <select id="dreg-buf-${id}" class="sel-field" style="flex:1;min-width:100px;" onchange="renderHilosBuffer(${id})">
        <option value="">Seleccionar...</option>
        ${BUFFERS.map(b => `<option value="${b}" ${b===bufferPreset?'selected':''}>${b}</option>`).join('')}
      </select>
      <input type="text" id="dreg-id-${id}" placeholder="ID (Ej: #1, Fibra A...)"
        style="flex:1;min-width:100px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;outline:none;" />
      <button onclick="document.getElementById('dreg-grupo-${id}').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;flex-shrink:0;line-height:1;">✕</button>
    </div>
    <div id="dreg-hilos-${id}" style="padding-left:4px;">
      <div style="font-size:12px;color:var(--muted);">Selecciona un buffer para ver los hilos</div>
    </div>`;
  lista.appendChild(div);
  if (bufferPreset) renderHilosBuffer(id);
}
function renderHilosBuffer(grupoId) {
  const buffer = document.getElementById(`dreg-buf-${grupoId}`)?.value;
  const cont = document.getElementById(`dreg-hilos-${grupoId}`);
  if (!cont) return;
  if (!buffer) {
    cont.innerHTML = '<div style="font-size:12px;color:var(--muted);">Selecciona un buffer para ver los hilos</div>';
    return;
  }
  const bufColor = COLOR_BUFFER[buffer] || '#6b7280';
  cont.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px;display:flex;align-items:center;gap:5px;">
      <span style="width:8px;height:8px;background:${bufColor};border-radius:50%;display:inline-block;"></span>
      Hilos del buffer ${buffer} — marca los que salen de esta caja
    </div>
    ${HILOS.map(h => {
      const hColor = COLOR_BUFFER[h] || '#6b7280';
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;min-width:110px;">
          <input type="checkbox" id="dreg-check-${grupoId}-${h}" style="accent-color:var(--accent);width:14px;height:14px;" />
          <span style="display:flex;align-items:center;gap:4px;font-size:12px;color:var(--text);">
            <span style="width:8px;height:8px;background:${hColor};border-radius:50%;display:inline-block;border:1px solid rgba(255,255,255,0.2);"></span>
            ${h}
          </span>
        </label>
        <input type="text" id="dreg-dest-${grupoId}-${h}" placeholder="Destino (Caja 01, Pasante...)"
          style="flex:1;min-width:130px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:5px 8px;outline:none;" />
      </div>`;
    }).join('')}`;
}

function getDistribucionReg() {
  const resultado = [];
  document.querySelectorAll('[id^="dreg-grupo-"]').forEach(grupo => {
    const id = grupo.id.replace('dreg-grupo-', '');
    const buffer = document.getElementById(`dreg-buf-${id}`)?.value;
    const bufferId = document.getElementById(`dreg-id-${id}`)?.value.trim() || '';
    if (!buffer) return;
    HILOS.forEach(h => {
      const check = document.getElementById(`dreg-check-${id}-${h}`);
      if (check?.checked) {
        const destino = document.getElementById(`dreg-dest-${id}-${h}`)?.value.trim() || '';
        resultado.push({ buffer, bufferId, hilo: h, destino });
      }
    });
  });
  return resultado;
}

// ── Distribución mapa (mismo sistema buffer+checkboxes) ──
let distMapaContador = 0;

function agregarDistMapa(bufferPreset = '') {
  distMapaContador++;
  const id = distMapaContador;
  const lista = document.getElementById('distribucion-lista');
  const div = document.createElement('div');
  div.id = `dmapa-grupo-${id}`;
  div.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:8px;';
  div.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
      <label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.05em;flex-shrink:0;">Buffer</label>
      <select id="dmapa-buf-${id}" class="sel-field" style="flex:1;min-width:100px;" onchange="renderHilosMapaBuffer(${id})">
        <option value="">Seleccionar...</option>
        ${BUFFERS.map(b => `<option value="${b}" ${b===bufferPreset?'selected':''}>${b}</option>`).join('')}
      </select>
      <input type="text" id="dmapa-id-${id}" placeholder="ID (Ej: #1, Fibra A...)"
        style="flex:1;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:12px;padding:6px 8px;outline:none;" />
      <button onclick="document.getElementById('dmapa-grupo-${id}').remove()"
        style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;flex-shrink:0;line-height:1;">✕</button>
    </div>
    <div id="dmapa-hilos-${id}" style="padding-left:4px;">
      <div style="font-size:12px;color:var(--muted);">Selecciona un buffer para ver los hilos</div>
    </div>`;
  lista.appendChild(div);
  if (bufferPreset) renderHilosMapaBuffer(id);
}

function getDistribucionMapa() {
  const resultado = [];
  document.querySelectorAll('[id^="dmapa-grupo-"]').forEach(grupo => {
    const id = grupo.id.replace('dmapa-grupo-', '');
    const buffer = document.getElementById(`dmapa-buf-${id}`)?.value;
    const bufferId = document.getElementById(`dmapa-id-${id}`)?.value.trim() || '';
    if (!buffer) return;
    HILOS.forEach(h => {
      const check = document.getElementById(`dmapa-check-${id}-${h}`);
      if (check?.checked) {
        const destino = document.getElementById(`dmapa-dest-${id}-${h}`)?.value.trim() || '';
        resultado.push({ buffer, bufferId, hilo: h, destino });
      }
    });
  });
  return resultado;
}
// ── GPS de caja en registro ──────────────────────────────
function obtenerGPSCaja() {
  const status = document.getElementById('caja-gps-status');
  if (!navigator.geolocation) { if(status) status.textContent = '❌ GPS no disponible'; return; }
  if (status) status.textContent = '⏳ Obteniendo GPS...';
  navigator.geolocation.getCurrentPosition(
    pos => {
      cajaGpsLat = pos.coords.latitude;
      cajaGpsLng = pos.coords.longitude;
      if (status) {
        status.innerHTML = `✅ GPS listo: <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${cajaGpsLat.toFixed(5)}, ${cajaGpsLng.toFixed(5)}</span>`;
        status.style.color = 'var(--accent)';
      }
    },
    () => { if(status) status.textContent = '❌ No se pudo obtener GPS. Usa "Marcar en mapa".'; },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

function activarSeleccionMapaCaja() {
  mostrarTab('mapa');
  setTimeout(() => {
    if (!mapaLeaflet) return;
    modoSeleccionMapaCaja = true;
    const lbl = document.getElementById('modo-seleccion-label');
    if (lbl) lbl.textContent = '👆 Haz clic en el mapa para ubicar la caja del reporte';
    mapaLeaflet.getContainer().style.cursor = 'crosshair';
    toast('Haz clic en el mapa para ubicar la caja');
  }, 600);
}

function limpiarGPSCaja() {
  cajaGpsLat = null; cajaGpsLng = null;
  const status = document.getElementById('caja-gps-status');
  if (status) { status.textContent = 'Sin ubicación — la caja no se guardará en el mapa'; status.style.color = 'var(--muted)'; }
}

// ── IPs ──────────────────────────────────────────────────
function agregarIPActividad(contexto) {
  if (!ipCounters[contexto]) ipCounters[contexto] = 0;
  ipCounters[contexto]++;
  const id = `${contexto}-${ipCounters[contexto]}`;
  const lista = document.getElementById(`ips-lista-${contexto}`);
  if (!lista) return;
  const div = document.createElement('div');
  div.id = `ip-row-${id}`;
  div.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;align-items:center;';
  div.innerHTML = `
    <input type="text" placeholder="Ej. 192.168.1.100" id="ip-input-${id}"
      style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:7px 10px;outline:none;" />
    <button onclick="document.getElementById('ip-row-${id}').remove()"
      style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>`;
  lista.appendChild(div);
}

function getIPsDeContexto(contexto) {
  const lista = document.getElementById(`ips-lista-${contexto}`);
  if (!lista) return [];
  return [...lista.querySelectorAll('input')].map(el => el.value.trim()).filter(Boolean);
}

// ── Recopilar datos ──────────────────────────────────────
function recopilarDatos() {
  const datos = { actividades: [...actividadesSeleccionadas], materiales: [], ips: [], detalles: {} };

  if (actividadesSeleccionadas.has('fibra')) {
    const metros      = parseFloat(document.getElementById('fibra-metros')?.value) || 0;
    const chupones    = parseFloat(document.getElementById('fibra-chupones')?.value) || 0;
    const herrajesA   = parseFloat(document.getElementById('fibra-herrajesA')?.value) || 0;
    const herrajesU   = parseFloat(document.getElementById('fibra-herrajesU')?.value) || 0;
    const heb34       = parseFloat(document.getElementById('fibra-hebilla34')?.value) || 0;
    const heb32       = parseFloat(document.getElementById('fibra-hebilla32')?.value) || 0;
    const preformados = parseFloat(document.getElementById('fibra-preformados')?.value) || 0;
    const cinta34     = parseFloat(document.getElementById('fibra-cinta34')?.value) || 0;
    if (metros > 0)       datos.materiales.push({ material:'Fibra Principal',       cantidad:metros,      unidad:'m'   });
    if (chupones > 0)     datos.materiales.push({ material:'Chupones',              cantidad:chupones,    unidad:'und' });
    if (herrajesA > 0)    datos.materiales.push({ material:'Herrajes A',            cantidad:herrajesA,   unidad:'und' });
    if (herrajesU > 0)    datos.materiales.push({ material:'Herrajes U',            cantidad:herrajesU,   unidad:'und' });
    if (heb34 > 0)        datos.materiales.push({ material:'Hebilla metálica 3/4"', cantidad:heb34,       unidad:'und' });
    if (heb32 > 0)        datos.materiales.push({ material:'Hebilla metálica 3/2"', cantidad:heb32,       unidad:'und' });
    if (preformados > 0)  datos.materiales.push({ material:'Preformados',           cantidad:preformados, unidad:'und' });
    if (cinta34 > 0)      datos.materiales.push({ material:'Cinta 3/4"',            cantidad:cinta34,     unidad:'m'   });
    datos.detalles.fibra = { metros };
  }

  if (actividadesSeleccionadas.has('cajas')) {
    const cajasnat = parseFloat(document.getElementById('caja-cajasnat')?.value) || 0;
    const sp16     = parseFloat(document.getElementById('caja-sp16')?.value) || 0;
    const sp4      = parseFloat(document.getElementById('caja-sp4')?.value) || 0;
    const heb34    = parseFloat(document.getElementById('caja-heb34')?.value) || 0;
    const cinta32  = parseFloat(document.getElementById('caja-cinta32')?.value) || 0;
    if (cajasnat > 0) datos.materiales.push({ material:'Cajas NAT',             cantidad:cajasnat, unidad:'und' });
    if (sp16 > 0)     datos.materiales.push({ material:'Splitter 1/16',         cantidad:sp16,     unidad:'und' });
    if (sp4 > 0)      datos.materiales.push({ material:'Splitter 1/4',          cantidad:sp4,      unidad:'und' });
    if (heb34 > 0)    datos.materiales.push({ material:'Hebilla metálica 3/4"', cantidad:heb34,    unidad:'und' });
    if (cinta32 > 0)  datos.materiales.push({ material:'Cinta 3/2"',            cantidad:cinta32,  unidad:'m'   });
    datos.detalles.cajas = {
      tipo:            document.getElementById('caja-tipo-reg')?.value,
      buffer:          document.getElementById('caja-buffer-reg')?.value,
      hilo:            document.getElementById('caja-hilo-reg')?.value,
      totalPuertos:    parseInt(document.getElementById('caja-total-reg')?.value) || 16,
      puertosOcupados: parseInt(document.getElementById('caja-ocupados-reg')?.value) || 0,
      distribucion:    getDistribucionReg(),
      lat: cajaGpsLat, lng: cajaGpsLng
    };
  }

  if (actividadesSeleccionadas.has('instalacion')) {
    const ganchos = parseFloat(document.getElementById('inst-ganchos')?.value) || 0;
    const drop    = parseFloat(document.getElementById('inst-drop')?.value) || 0;
    const upc     = parseFloat(document.getElementById('inst-upc')?.value) || 0;
    const apc     = parseFloat(document.getElementById('inst-apc')?.value) || 0;
    if (ganchos > 0) datos.materiales.push({ material:'Ganchos telefónicos', cantidad:ganchos, unidad:'und' });
    if (drop > 0)    datos.materiales.push({ material:'Cable Drop',          cantidad:drop,    unidad:'m'   });
    if (upc > 0)     datos.materiales.push({ material:'Conector UPC',        cantidad:upc,     unidad:'und' });
    if (apc > 0)     datos.materiales.push({ material:'Conector APC',        cantidad:apc,     unidad:'und' });
    getIPsDeContexto('instalacion').forEach(ip => datos.ips.push({ ip, tipo:'instalacion', label:'Instalación cliente', icon:'🔌' }));
  }

  if (actividadesSeleccionadas.has('mudanza')) {
    const drop = parseFloat(document.getElementById('mud-drop')?.value) || 0;
    const upc  = parseFloat(document.getElementById('mud-upc')?.value) || 0;
    const apc  = parseFloat(document.getElementById('mud-apc')?.value) || 0;
    if (drop > 0) datos.materiales.push({ material:'Cable Drop',   cantidad:drop, unidad:'m'   });
    if (upc > 0)  datos.materiales.push({ material:'Conector UPC', cantidad:upc,  unidad:'und' });
    if (apc > 0)  datos.materiales.push({ material:'Conector APC', cantidad:apc,  unidad:'und' });
    datos.detalles.mudanza = {
      antenas: parseInt(document.getElementById('mud-antenas')?.value) || 0,
      routers: parseInt(document.getElementById('mud-routers')?.value) || 0,
    };
    getIPsDeContexto('mudanza').forEach(ip => datos.ips.push({ ip, tipo:'mudanza', label:'Mudanza radio a fibra', icon:'🔄' }));
  }

  if (actividadesSeleccionadas.has('odf')) {
    datos.detalles.odf = {
      nodo:  document.getElementById('odf-nodo')?.value,
      hilos: parseInt(document.getElementById('odf-hilos')?.value) || 0,
      linea: document.getElementById('odf-linea')?.value.trim(),
      obs:   document.getElementById('odf-obs')?.value.trim(),
    };
  }

  if (actividadesSeleccionadas.has('mangas')) {
    datos.detalles.mangas = {
      hilos:  parseInt(document.getElementById('manga-hilos')?.value) || 0,
      sector: document.getElementById('manga-sector')?.value.trim(),
      buffer: document.getElementById('manga-buffer')?.value,
    };
  }

  if (actividadesSeleccionadas.has('incidencias')) {
    const incTipos = [];
    if (document.getElementById('inc-cambio_equipos')?.checked) {
      incTipos.push({ tipo:'cambio_equipos', desc: document.getElementById('inc-ce-desc')?.value.trim() });
      getIPsDeContexto('cambio_equipos').forEach(ip => datos.ips.push({ ip, tipo:'cambio_equipos', label:'Cambio de equipos', icon:'🔧' }));
    }
    if (document.getElementById('inc-foco_rojo')?.checked) {
      const upcFR = parseInt(document.getElementById('fr-upc-cant')?.value) || 0;
      const apcFR = parseInt(document.getElementById('fr-apc-cant')?.value) || 0;
      incTipos.push({
        tipo:'foco_rojo',
        daños: {
          conectorUpc: document.getElementById('fr-conector-upc')?.checked,
          conectorApc: document.getElementById('fr-conector-apc')?.checked,
          fibra:       document.getElementById('fr-fibra')?.checked,
        },
        upc: upcFR, apc: apcFR,
      });
      if (upcFR > 0) datos.materiales.push({ material:'Conector UPC', cantidad:upcFR, unidad:'und' });
      if (apcFR > 0) datos.materiales.push({ material:'Conector APC', cantidad:apcFR, unidad:'und' });
      getIPsDeContexto('foco_rojo').forEach(ip => datos.ips.push({ ip, tipo:'foco_rojo', label:'Foco rojo', icon:'🔴' }));
    }
    if (document.getElementById('inc-actualizaciones')?.checked) {
      incTipos.push({ tipo:'actualizaciones', desc: document.getElementById('inc-act-desc')?.value.trim() });
      getIPsDeContexto('actualizaciones').forEach(ip => datos.ips.push({ ip, tipo:'actualizaciones', label:'Actualizaciones', icon:'🔄' }));
    }
    if (document.getElementById('inc-cambio_domicilio')?.checked) {
      const drop = parseFloat(document.getElementById('cd-drop')?.value) || 0;
      const upc  = parseFloat(document.getElementById('cd-upc')?.value) || 0;
      const apc  = parseFloat(document.getElementById('cd-apc')?.value) || 0;
      incTipos.push({ tipo:'cambio_domicilio', drop, upc, apc });
      if (drop > 0) datos.materiales.push({ material:'Cable Drop',   cantidad:drop, unidad:'m'   });
      if (upc > 0)  datos.materiales.push({ material:'Conector UPC', cantidad:upc,  unidad:'und' });
      if (apc > 0)  datos.materiales.push({ material:'Conector APC', cantidad:apc,  unidad:'und' });
      getIPsDeContexto('cambio_domicilio').forEach(ip => datos.ips.push({ ip, tipo:'cambio_domicilio', label:'Cambio de domicilio', icon:'🏠' }));
    }
    datos.detalles.incidencias = { tipos: incTipos, total: parseInt(document.getElementById('num-incidencias')?.value) || 0 };
    datos.incidencias    = incTipos.map(t => t.tipo);
    datos.numIncidencias = parseInt(document.getElementById('num-incidencias')?.value) || 0;
  }

  if (actividadesSeleccionadas.has('reparacion')) {
    datos.detalles.reparacion = {
      ardilla:    document.getElementById('rep-ardilla')?.checked,
      arrancada:  document.getElementById('rep-arrancada')?.checked,
      atenuacion: document.getElementById('rep-atenuacion')?.checked,
      sector:     document.getElementById('rep-sector')?.value.trim(),
      hilos:      parseInt(document.getElementById('rep-hilos')?.value) || 0,
      buffer:     document.getElementById('rep-buffer')?.value,
      up:         document.getElementById('rep-up')?.value.trim(),
    };
  }

  const matMap = {};
  datos.materiales.forEach(m => {
    if (matMap[m.material]) matMap[m.material].cantidad += m.cantidad;
    else matMap[m.material] = { ...m };
  });
  datos.materiales = Object.values(matMap);
  return datos;
}

// ── Guardar Reporte ──────────────────────────────────────
async function guardarReporte() {
  const fecha = document.getElementById('fecha')?.value;
  if (!fecha) { toast('⚠ Selecciona la fecha'); return; }
  if (actividadesSeleccionadas.size === 0) { toast('⚠ Selecciona al menos una actividad'); return; }
  const observaciones = document.getElementById('observaciones')?.value.trim() || '';
  const cuadrilla = todasLasCuadrillas.find(c => c.id === cuadrillaHoyId);
  const integrantes = cuadrilla ? cuadrilla.integrantes : [];
  const datos = recopilarDatos();

  if (actividadesSeleccionadas.has('cajas') && cajaGpsLat !== null && cajaGpsLng !== null) {
    const det = datos.detalles.cajas;
    const tipoLabel = det.tipo==='principal'?'Caja Principal':det.tipo==='cliente'?'Caja Cliente':'Pasante';
    try {
      await fetch('/api/cajas', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: det.tipo||'cliente', referencia: document.getElementById('caja-referencia-reg')?.value.trim() || `${tipoLabel} — ${fecha}`,
          lat: cajaGpsLat, lng: cajaGpsLng,
          totalPuertos: det.totalPuertos, puertosOcupados: det.puertosOcupados,
          buffer: det.buffer, hilo: det.hilo, distribucion: det.distribucion||[]
        })
      });
    } catch(e) { console.error('Error guardando caja en mapa:', e); }
  }

  try {
    const res = await fetch('/api/reportes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fecha, integrantes, observaciones,
        materiales: datos.materiales, actividades: datos.actividades,
        incidencias: datos.incidencias||[], numIncidencias: datos.numIncidencias||0,
        ips: datos.ips, detalles: datos.detalles, cuadrillaId: cuadrillaHoyId
      })
    });
    const data = await res.json();
    if (data.ok) { toast('✓ Reporte guardado'); limpiarFormulario(); }
    else toast('Error: ' + data.error);
  } catch(e) { toast('Error de conexión: ' + e.message); }
}

function limpiarFormulario() {
  document.getElementById('observaciones').value = '';
  const f = document.getElementById('fecha'); if (f) f.value = fechaLocal();
  actividadesSeleccionadas.clear();
  document.querySelectorAll('.actividad-btn').forEach(b => b.classList.remove('selected'));
  document.querySelectorAll('.act-panel').forEach(p => p.style.display = 'none');
  document.querySelectorAll('.inp-field').forEach(el => el.value = '');
  document.querySelectorAll('.sel-field').forEach(el => el.selectedIndex = 0);
  document.querySelectorAll('.tag-check input[type="checkbox"]').forEach(cb => cb.checked = false);
  document.querySelectorAll('#rep-ardilla,#rep-arrancada,#rep-atenuacion,#fr-conector-upc,#fr-conector-apc,#fr-fibra').forEach(cb => cb.checked = false);
  document.querySelectorAll('[id^="subpanel-"]').forEach(p => p.style.display = 'none');
  document.querySelectorAll('[id^="ips-lista-"]').forEach(l => l.innerHTML = '');
  ipCounters = {};
  cajaGpsLat = null; cajaGpsLng = null;
  const refReg = document.getElementById('caja-referencia-reg');
if (refReg) refReg.value = '';
  const gpsStatus = document.getElementById('caja-gps-status');
  if (gpsStatus) { gpsStatus.textContent = 'Sin ubicación — la caja no se guardará en el mapa'; gpsStatus.style.color = 'var(--muted)'; }
  distRegContador = 0;
  const drl = document.getElementById('dist-reg-lista');
  if (drl) drl.innerHTML = '';
  const dp = document.getElementById('dist-reg-panel');
  if (dp) dp.style.display = 'none';
}

// ── Historial ────────────────────────────────────────────
async function cargarHistorial() {
  try {
    const res = await fetch('/api/reportes');
    todosLosReportes = await res.json();
    renderHistorial(todosLosReportes);
  } catch(e) { document.getElementById('lista-reportes').innerHTML = '<p class="empty">Error al conectar.</p>'; }
}

function filtrarHistorial() {
  const q = document.getElementById('buscar-fecha').value.trim().toLowerCase();
  renderHistorial(todosLosReportes.filter(r => r.fecha.includes(q)));
}

function renderDetallesHistorial(detalles) {
  if (!detalles) return '';
  let html = '';
  if (detalles.fibra?.metros > 0) {
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">📡 Fibra: <strong style="color:var(--text);">${detalles.fibra.metros}m pasados</strong></div>`;
  }
  if (detalles.cajas) {
    const c = detalles.cajas;
    const bufColor = COLOR_BUFFER[c.buffer] || '#6b7280';
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">
      📦 Caja: <strong style="color:var(--text);">${c.tipo||'—'}</strong>
      ${c.buffer?`· <span style="display:inline-flex;align-items:center;gap:3px;"><span style="width:8px;height:8px;background:${bufColor};border-radius:50%;display:inline-block;"></span>Buffer ${c.buffer}</span>`:''}
      ${c.hilo?`· Hilo: <strong style="color:var(--text);">${c.hilo}</strong>`:''}
      · Puertos: <strong style="color:var(--text);">${c.puertosOcupados||0}/${c.totalPuertos||16}</strong>
      ${c.lat?'· 📍 En mapa':''}
    </div>`;
    if (c.distribucion?.length > 0) {
      const porBuffer = {};
      c.distribucion.forEach(d => { if (!porBuffer[d.buffer]) porBuffer[d.buffer]=[]; porBuffer[d.buffer].push(d); });
      html += `<div style="font-size:11px;color:var(--muted);margin-bottom:6px;margin-left:12px;padding:6px 10px;background:var(--surface2);border-radius:6px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;">📡 Distribución</div>
        ${Object.entries(porBuffer).map(([buf,hilos]) => {
          const bc = COLOR_BUFFER[buf]||'#6b7280';
          return `<div style="margin-bottom:3px;">
            <span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;">
              <span style="width:7px;height:7px;background:${bc};border-radius:50%;display:inline-block;"></span>
              <strong>Buffer ${buf}:</strong>
            </span>
            ${hilos.map(d=>{const hc=COLOR_BUFFER[d.hilo]||'#6b7280';return `<span style="display:inline-flex;align-items:center;gap:2px;font-size:11px;margin-left:6px;"><span style="width:6px;height:6px;background:${hc};border-radius:50%;display:inline-block;"></span>${d.hilo}${d.destino?` → ${d.destino}`:''}</span>`;}).join('')}
          </div>`;
        }).join('')}
      </div>`;
    }
  }
  if (detalles.mudanza) {
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">
      🔄 Mudanza: <strong style="color:var(--text);">${detalles.mudanza.antenas}</strong> antenas · <strong style="color:var(--text);">${detalles.mudanza.routers}</strong> routers retirados
    </div>`;
  }
  if (detalles.odf) {
    const o = detalles.odf;
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">
      🗄️ ODF — Nodo: <strong style="color:var(--text);">${o.nodo||'—'}</strong>
      · ${o.hilos} hilos fusionados ${o.linea?`· Línea: ${o.linea}`:''} ${o.obs?`· ${o.obs}`:''}
    </div>`;
  }
  if (detalles.mangas) {
    const m = detalles.mangas;
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">
      🔧 Manga: <strong style="color:var(--text);">${m.hilos} hilos</strong> ${m.sector?`· Sector: ${m.sector}`:''} ${m.buffer?`· Buffer: ${m.buffer}`:''}
    </div>`;
  }
  if (detalles.incidencias?.tipos?.length > 0) {
    detalles.incidencias.tipos.forEach(t => {
      const info = INCIDENCIAS_TIPOS[t.tipo]||{ label:t.tipo, icon:'⚠️' };
      html += `<div style="font-size:12px;color:var(--muted);margin-bottom:4px;">
        ${info.icon} ${info.label}
        ${t.desc?`· <em style="color:var(--text);">${t.desc}</em>`:''}
        ${t.daños?`· Daños: ${[t.daños.conectorUpc?'UPC':'',t.daños.conectorApc?'APC':'',t.daños.fibra?'Fibra':''].filter(Boolean).join(', ')}`:''}
        ${t.drop||t.upc||t.apc?`· Drop:${t.drop||0}m UPC:${t.upc||0} APC:${t.apc||0}`:''}
      </div>`;
    });
  }
  if (detalles.reparacion) {
    const r = detalles.reparacion;
    const daños = [r.ardilla?'🐿️ Ardilla':'',r.arrancada?'✂️ Arrancada':'',r.atenuacion?'📉 Atenuación':''].filter(Boolean).join(', ');
    html += `<div style="font-size:12px;color:var(--muted);margin-bottom:6px;">
      🛠️ Reparación: ${daños||'—'}
      ${r.sector?`· Sector: <strong style="color:var(--text);">${r.sector}</strong>`:''}
      · ${r.hilos} hilos ${r.buffer?`· Buffer: ${r.buffer}`:''} ${r.up?`· Quedó up: <strong style="color:var(--accent);">${r.up}</strong>`:''}
    </div>`;
  }
  return html ? `<div style="background:var(--surface);border-radius:8px;padding:10px 12px;margin-bottom:10px;border:1px solid var(--border);">${html}</div>` : '';
}

function renderIPsHistorial(ips) {
  if (!ips?.length) return '';
  const grupos = {};
  ips.forEach(item => {
    const key = item.tipo||'otro';
    if (!grupos[key]) grupos[key] = { label:item.label||key, icon:item.icon||'🌐', ips:[] };
    grupos[key].ips.push(item.ip||item);
  });
  return `<div style="margin-bottom:10px;">
    <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">🌐 IPs de clientes</div>
    ${Object.values(grupos).map(g => `
      <div style="margin-bottom:6px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:3px;">${g.icon} ${g.label}</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px;">
          ${g.ips.map(ip=>`<a href="http://${ip}" target="_blank" rel="noopener"
            style="font-size:12px;font-family:'IBM Plex Mono',monospace;background:var(--surface);border:1px solid var(--accent);border-radius:6px;padding:3px 10px;color:var(--accent);text-decoration:none;">${ip} ↗</a>`).join('')}
        </div>
      </div>`).join('')}
  </div>`;
}

function renderHistorial(reportes) {
  const cont = document.getElementById('lista-reportes');
  if (!reportes.length) { cont.innerHTML='<p class="empty">No hay reportes registrados.</p>'; return; }
  const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  cont.innerHTML = reportes.map(r => {
    const d = new Date(r.fecha+'T12:00:00');
    const dia = dias[d.getDay()];
    const acts = (r.actividades||[]).map(a=>ACTIVIDADES_INFO[a]?`${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}`:a).join(' · ');
    const fotos = r.fotos||[];
    const cuadrilla = todasLasCuadrillas.find(c=>c.id===r.cuadrillaId);
    const ips = r.ips||[];
    return `
      <div class="reporte-card">
        <div class="reporte-header" onclick="toggleReporte(${r.id})">
          <div>
            <div class="reporte-fecha">${dia}, ${r.fecha}</div>
            ${cuadrilla?`<div style="font-size:11px;color:var(--accent);margin-top:2px;">🏷️ ${cuadrilla.nombre}</div>`:''}
            <div class="reporte-integrantes">👷 ${(r.integrantes||[]).join(' · ')||'—'}</div>
            ${acts?`<div style="font-size:11px;color:var(--muted);margin-top:2px;">${acts}</div>`:''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${fotos.length>0?`<span style="font-size:11px;color:var(--muted);">📷 ${fotos.length}</span>`:''}
            ${ips.length>0?`<span style="font-size:11px;color:var(--accent);">🌐 ${ips.length}</span>`:''}
            <div style="color:var(--muted);font-size:18px;" id="arrow-${r.id}">▼</div>
          </div>
        </div>
        <div class="reporte-body" id="body-${r.id}" style="display:none;">
          ${cuadrilla?`
            <div style="background:linear-gradient(135deg,rgba(0,212,170,0.08),rgba(0,153,255,0.03));border:1px solid rgba(0,212,170,0.3);border-radius:10px;padding:1rem;margin-bottom:10px;">
              <div style="font-size:10px;color:var(--accent);text-transform:uppercase;margin-bottom:6px;">Cuadrilla</div>
              <div style="font-size:14px;font-weight:600;color:var(--text);margin-bottom:6px;">${cuadrilla.nombre}</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px;">${cuadrilla.integrantes.map(i=>`<span style="font-size:11px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:2px 8px;color:var(--accent);">👷 ${i}</span>`).join('')}</div>
            </div>`:''}
          ${r.observaciones?`<div class="obs-box">${r.observaciones}</div>`:''}
          ${renderDetallesHistorial(r.detalles)}
          ${renderIPsHistorial(ips)}
          ${(r.materiales||[]).length>0?`
            <table class="mat-table">
              <thead><tr><th>Material</th><th>Cantidad</th><th>Unidad</th></tr></thead>
              <tbody>${(r.materiales||[]).map(m=>`<tr><td>${m.material}</td><td class="cant">${m.cantidad}</td><td>${m.unidad}</td></tr>`).join('')}</tbody>
            </table>`:''}
          <div style="margin-top:1rem;">
            <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">📷 Fotos</div>
            <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
              ${fotos.map(f=>`
                <div style="position:relative;">
                  <img src="${f.url}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1px solid var(--border);cursor:pointer;" onclick="verFoto('${f.url}')" />
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
  const body=document.getElementById('body-'+id), arrow=document.getElementById('arrow-'+id);
  const visible=body.style.display!=='none';
  body.style.display=visible?'none':'block';
  arrow.textContent=visible?'▼':'▲';
}

async function eliminarReporte(id) {
  if (!confirm('¿Eliminar este reporte?')) return;
  await fetch('/api/reportes/'+id,{method:'DELETE'});
  toast('Reporte eliminado'); cargarHistorial();
}

function editarReporte(id) {
  const r=todosLosReportes.find(x=>x.id===id); if (!r) return;
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;">
      <h3 style="color:var(--accent);font-size:13px;margin-bottom:1rem;font-family:'IBM Plex Mono',monospace;">✏️ Editar reporte</h3>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;">
        <label style="font-size:11px;color:var(--muted);text-transform:uppercase;">Fecha</label>
        <input type="date" id="edit-fecha" value="${r.fecha}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:8px;outline:none;" />
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:10px;">
        <label style="font-size:11px;color:var(--muted);text-transform:uppercase;">Observaciones</label>
        <textarea id="edit-obs" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:8px;outline:none;min-height:80px;resize:vertical;">${r.observaciones||''}</textarea>
      </div>
      <div style="display:flex;gap:8px;">
        <button onclick="guardarEdicion(${id})" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px;cursor:pointer;">Guardar</button>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:none;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);padding:10px;cursor:pointer;">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

async function guardarEdicion(id) {
  const fecha=document.getElementById('edit-fecha').value;
  const observaciones=document.getElementById('edit-obs').value.trim();
  try {
    const res=await fetch('/api/reportes/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({fecha,observaciones})});
    const data=await res.json();
    if(data.ok){toast('✓ Reporte editado');document.querySelector('div[style*="position:fixed"]')?.remove();await cargarHistorial();}
  } catch(e){toast('Error al editar');}
}

function exportarReporteExcel(id) {
  const r=todosLosReportes.find(x=>x.id===id); if(!r) return;
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const d=new Date(r.fecha+'T12:00:00');
  const acts=(r.actividades||[]).map(a=>ACTIVIDADES_INFO[a]?.label||a).join(', ');
  const ipsTexto=(r.ips||[]).map(i=>typeof i==='object'?`${i.label}: ${i.ip}`:i).join(' | ');
  let datos=(r.materiales||[]).map(m=>({'Fecha':r.fecha,'Día':dias[d.getDay()],'Actividades':acts,'Integrantes':(r.integrantes||[]).join(', '),'Material':m.material,'Cantidad':m.cantidad,'Unidad':m.unidad,'Observaciones':r.observaciones||'','IPs':ipsTexto}));
  if(!datos.length) datos=[{'Fecha':r.fecha,'Día':dias[d.getDay()],'Actividades':acts,'Integrantes':(r.integrantes||[]).join(', '),'Material':'—','Cantidad':0,'Unidad':'—','Observaciones':r.observaciones||'','IPs':ipsTexto}];
  const ws=XLSX.utils.json_to_sheet(datos);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Reporte');
  XLSX.writeFile(wb,`reporte_${r.fecha}.xlsx`); toast('✓ Excel descargado');
}

function exportarTodoExcel() {
  if(!todosLosReportes.length){toast('⚠ No hay reportes');return;}
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const filas=[];
  todosLosReportes.forEach(r=>{
    const d=new Date(r.fecha+'T12:00:00');
    const acts=(r.actividades||[]).map(a=>ACTIVIDADES_INFO[a]?.label||a).join(', ');
    const ipsTexto=(r.ips||[]).map(i=>typeof i==='object'?`${i.label}: ${i.ip}`:i).join(' | ');
    (r.materiales||[]).forEach(m=>{filas.push({'Fecha':r.fecha,'Día':dias[d.getDay()],'Actividades':acts,'Integrantes':(r.integrantes||[]).join(', '),'Material':m.material,'Cantidad':m.cantidad,'Unidad':m.unidad,'Observaciones':r.observaciones||'','IPs':ipsTexto});});
  });
  const ws=XLSX.utils.json_to_sheet(filas);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Historial');
  XLSX.writeFile(wb,`historial_${new Date().toISOString().slice(0,10)}.xlsx`); toast('✓ Historial exportado');
}

async function subirFotos(event,reporteId) {
  const files=event.target.files; if(!files.length) return;
  const formData=new FormData();
  for(const file of files) formData.append('fotos',file);
  toast('⏳ Subiendo fotos...');
  try {
    const res=await fetch(`/api/reportes/${reporteId}/fotos`,{method:'POST',body:formData});
    const data=await res.json();
    if(data.ok){toast('✓ Fotos subidas');await cargarHistorial();}
    else{toast('Error: '+data.error);}
  }catch(e){toast('Error al subir fotos');}
}

async function eliminarFoto(reporteId,publicId) {
  if(!confirm('¿Eliminar esta foto?')) return;
  try {
    const res=await fetch(`/api/reportes/${reporteId}/fotos/${encodeURIComponent(publicId)}`,{method:'DELETE'});
    const data=await res.json();
    if(data.ok){toast('Foto eliminada');await cargarHistorial();}
  }catch(e){toast('Error al eliminar foto');}
}

function verFoto(url) {
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:600;display:flex;align-items:center;justify-content:center;cursor:pointer;';
  overlay.innerHTML=`<img src="${url}" style="max-width:92%;max-height:92%;border-radius:8px;" />`;
  overlay.onclick=()=>document.body.removeChild(overlay);
  document.body.appendChild(overlay);
}

// ── Mapa ─────────────────────────────────────────────────
async function iniciarMapa() {
  await cargarCajas();
  if (!mapaLeaflet) {
    const lat=todasLasCajas.length>0?todasLasCajas[0].lat:-1.0224;
    const lng=todasLasCajas.length>0?todasLasCajas[0].lng:-79.4604;
    mapaLeaflet=L.map('mapa').setView([lat,lng],15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(mapaLeaflet);

    // ── Ubicación en vivo ──
    if (navigator.geolocation) {
      const iconoYo = L.divIcon({
        html:`<div style="width:16px;height:16px;background:#0099ff;border:3px solid #fff;border-radius:50%;box-shadow:0 0 0 4px rgba(0,153,255,0.25);"></div>`,
        className:'', iconSize:[16,16], iconAnchor:[8,8]
      });

      const actualizarPosicion = (pos) => {
        const lat=pos.coords.latitude;
        const lng=pos.coords.longitude;
        const precision=pos.coords.accuracy;
        if (marcadorYo) {
          marcadorYo.setLatLng([lat,lng]);
          circuloYo.setLatLng([lat,lng]);
          circuloYo.setRadius(precision);
        } else {
          marcadorYo = L.marker([lat,lng],{icon:iconoYo,zIndexOffset:1000})
            .addTo(mapaLeaflet)
            .bindPopup(`<div style="font-family:'IBM Plex Sans',sans-serif;font-size:12px;">
              <strong>📍 Tu ubicación</strong><br>
              <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span><br>
              <span style="color:#6b7280;">Precisión: ±${Math.round(precision)}m</span>
            </div>`);
          circuloYo = L.circle([lat,lng],{
            radius:precision, color:'#0099ff',
            fillColor:'#0099ff', fillOpacity:0.08, weight:1
          }).addTo(mapaLeaflet);
        }
      };

      navigator.geolocation.watchPosition(actualizarPosicion, null, {
        enableHighAccuracy:true, maximumAge:10000
      });
    }

    mapaLeaflet.on('click', e => {
      if (modoSeleccionMapaCaja) {
        cajaGpsLat=e.latlng.lat; cajaGpsLng=e.latlng.lng;
        modoSeleccionMapaCaja=false;
        const lbl=document.getElementById('modo-seleccion-label');
        if(lbl) lbl.textContent='';
        mapaLeaflet.getContainer().style.cursor='';
        toast('✓ Ubicación guardada — vuelve a Nuevo registro');
        mostrarTab('registro');
        setTimeout(()=>{
          const status=document.getElementById('caja-gps-status');
          if(status){
            status.innerHTML=`✅ Ubicación en mapa: <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${cajaGpsLat.toFixed(5)}, ${cajaGpsLng.toFixed(5)}</span>`;
            status.style.color='var(--accent)';
          }
        },400);
        return;
      }
      if (!modoSeleccionMapa) return;
      gpsLat=e.latlng.lat; gpsLng=e.latlng.lng;
      actualizarStatusGPS();
      modoSeleccionMapa=false;
      const lbl=document.getElementById('modo-seleccion-label');
      if(lbl) lbl.textContent='';
      mapaLeaflet.getContainer().style.cursor='';
      toast('✓ Ubicación seleccionada');
    });
  }
  renderMarcadores(); renderListaCajas();
  if (rolActual==='trabajador') {
    const form=document.getElementById('mapa-trabajador-form');
    if(form) form.style.display='block';
    obtenerGPS();
  }
}

function activarSeleccionMapa() {
  modoSeleccionMapa=true;
  const lbl=document.getElementById('modo-seleccion-label');
  if(lbl) lbl.textContent='👆 Haz clic en el mapa para fijar la ubicación';
  mapaLeaflet.getContainer().style.cursor='crosshair';
}

function actualizarStatusGPS() {
  const status=document.getElementById('gps-status'); if(!status) return;
  if(gpsLat!==null&&gpsLng!==null){
    status.innerHTML=`✅ Ubicación lista: <span style="font-family:'IBM Plex Mono',monospace;font-size:11px;">${gpsLat.toFixed(5)}, ${gpsLng.toFixed(5)}</span>
      <button onclick="activarSeleccionMapa()" style="margin-left:8px;font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--accent);color:var(--accent);background:none;cursor:pointer;">🗺️ Cambiar</button>`;
    status.style.color='var(--accent)';
  }
}

function obtenerGPS() {
  const status=document.getElementById('gps-status');
  if(!navigator.geolocation){
    if(status) status.innerHTML=`❌ GPS no disponible. <button onclick="activarSeleccionMapa()" style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--accent);color:var(--accent);background:none;cursor:pointer;">🗺️ Seleccionar</button>`;
    return;
  }
  if(status) status.textContent='⏳ Obteniendo GPS...';
  navigator.geolocation.getCurrentPosition(
    pos=>{gpsLat=pos.coords.latitude;gpsLng=pos.coords.longitude;actualizarStatusGPS();if(mapaLeaflet)mapaLeaflet.setView([gpsLat,gpsLng],17);},
    ()=>{if(status) status.innerHTML=`⚠️ No se pudo obtener GPS. <button onclick="activarSeleccionMapa()" style="font-size:11px;padding:2px 8px;border-radius:4px;border:1px solid var(--accent);color:var(--accent);background:none;cursor:pointer;">🗺️ Seleccionar</button>`;},
    {enableHighAccuracy:true,timeout:10000}
  );
}

function actualizarFormCaja() {
  const tipo=document.getElementById('caja-tipo').value;
  const panel=document.getElementById('distribucion-panel');
  if(panel) panel.style.display=tipo==='principal'?'block':'none';
}

function selHilos(id,val='') {
  return `<select id="${id}" class="sel-field" style="flex:1;min-width:80px;"><option value="">Hilo...</option>${HILOS.map(h=>`<option value="${h}" ${val===h?'selected':''}>${h}</option>`).join('')}</select>`;
}

function selBuffers(id,val='') {
  return `<select id="${id}" class="sel-field" style="flex:1;min-width:80px;"><option value="">Buffer...</option>${BUFFERS.map(b=>`<option value="${b}" ${val===b?'selected':''}>${b}</option>`).join('')}</select>`;
}

function agregarDistribucion(buf='',hil='',dest='') {
  distContador++;
  const id=distContador;
  const lista=document.getElementById('distribucion-lista');
  const div=document.createElement('div');
  div.id=`dist-row-${id}`;
  div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;';
  div.innerHTML=`${selBuffers(`dist-buf-${id}`,buf)}${selHilos(`dist-hil-${id}`,hil)}
    <input type="text" id="dist-dest-${id}" placeholder="Destino..." value="${dest}"
      style="flex:2;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:6px 8px;outline:none;" />
    <button onclick="document.getElementById('dist-row-${id}').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;flex-shrink:0;">✕</button>`;
  lista.appendChild(div);
}

function getDistribucion() {
  return [...document.querySelectorAll('[id^="dist-row-"]')].map(row=>{
    const id=row.id.replace('dist-row-','');
    return {buffer:document.getElementById(`dist-buf-${id}`)?.value||'',hilo:document.getElementById(`dist-hil-${id}`)?.value||'',destino:document.getElementById(`dist-dest-${id}`)?.value.trim()||''};
  }).filter(d=>d.buffer||d.hilo||d.destino);
}

function crearIcono(tipo) {
  const colores={principal:'#1D9E75',cliente:'#3B82F6',pasante:'#F59E0B'};
  const color=colores[tipo]||'#6b7280';
  return L.divIcon({html:`<div style="width:14px;height:14px;background:${color};border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,0.4);"></div>`,className:'',iconSize:[14,14],iconAnchor:[7,7]});
}

function renderMarcadores() {
  marcadoresMapa.forEach(m=>mapaLeaflet.removeLayer(m));
  marcadoresMapa=[];
  const cajasFiltradas=filtroActivo==='todos'?todasLasCajas:todasLasCajas.filter(c=>c.tipo===filtroActivo);
  cajasFiltradas.forEach(caja=>{
    const libres=caja.totalPuertos-caja.puertosOcupados;
    const pct=Math.round((caja.puertosOcupados/caja.totalPuertos)*100);
    const colorBarra=pct>=90?'#E24B4A':pct>=60?'#F59E0B':'#1D9E75';
    const info=TIPO_CAJA[caja.tipo]||{label:caja.tipo,icon:'📦'};
    const bufColor=COLOR_BUFFER[caja.buffer]||'#6b7280';

    const porBuffer = {};
caja.distribucion.forEach(d => {
  const key = d.bufferId ? `${d.buffer} ${d.bufferId}` : d.buffer;
  if (!porBuffer[key]) porBuffer[key] = { color: d.buffer, hilos: [] };
  porBuffer[key].hilos.push(d);
});
distHTML = `<div style="margin-top:8px;border-top:1px solid #e5e7eb;padding-top:6px;">
  <div style="font-size:11px;font-weight:600;margin-bottom:4px;">📡 Hilos distribuidos</div>
  ${Object.entries(porBuffer).map(([label, grupo]) => {
    const bc = COLOR_BUFFER[grupo.color] || '#6b7280';
    return `<div style="margin-bottom:4px;">
      <span style="font-size:11px;display:inline-flex;align-items:center;gap:3px;">
        <span style="width:7px;height:7px;background:${bc};border-radius:50%;display:inline-block;"></span>
        <strong>Buffer ${label}:</strong>
      </span>
      ${grupo.hilos.map(d => {
        const hc = COLOR_BUFFER[d.hilo]||'#6b7280';
        return `<span style="font-size:11px;display:inline-flex;align-items:center;gap:2px;margin-left:8px;">
          <span style="width:6px;height:6px;background:${hc};border-radius:50%;display:inline-block;"></span>
          ${d.hilo}${d.destino?` → ${d.destino}`:''}
        </span>`;
      }).join('')}
    </div>`;
  }).join('')}
</div>`;

    const popup=`<div style="font-family:'IBM Plex Sans',sans-serif;min-width:200px;">
      <div style="font-weight:600;font-size:14px;margin-bottom:2px;">${info.icon} ${caja.referencia}</div>
      <div style="font-size:12px;color:#6b7280;margin-bottom:8px;">${info.label}</div>
      ${caja.buffer||caja.hilo?`<div style="display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap;">
        ${caja.buffer?`<span style="font-size:11px;background:#f3f4f6;border-radius:4px;padding:2px 6px;display:flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;background:${bufColor};border-radius:50%;display:inline-block;"></span>Buffer: ${caja.buffer}</span>`:''}
        ${caja.hilo?`<span style="font-size:11px;background:#f3f4f6;border-radius:4px;padding:2px 6px;">Hilo: ${caja.hilo}</span>`:''}
      </div>`:''}
      <div style="margin-bottom:6px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;"><span>Puertos</span><span>${caja.puertosOcupados}/${caja.totalPuertos}</span></div>
        <div style="height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${colorBarra};border-radius:3px;"></div></div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px;">${libres} libre${libres!==1?'s':''}</div>
      </div>
      ${distHTML}
      <div style="font-size:11px;color:#6b7280;margin-top:6px;">Por: ${caja.registrado_por||'—'}</div>
      ${rolActual==='trabajador'?`<div style="margin-top:8px;display:flex;gap:6px;">
        <button onclick="editarCaja(${caja.id})" style="flex:1;font-size:11px;padding:4px;background:#1D9E75;color:#fff;border:none;border-radius:4px;cursor:pointer;">Editar</button>
        <button onclick="eliminarCaja(${caja.id})" style="flex:1;font-size:11px;padding:4px;background:#E24B4A;color:#fff;border:none;border-radius:4px;cursor:pointer;">Eliminar</button>
      </div>`:''}
    </div>`;

    const marcador=L.marker([caja.lat,caja.lng],{icon:crearIcono(caja.tipo)}).addTo(mapaLeaflet).bindPopup(popup);
    marcadoresMapa.push(marcador);
  });
}

function renderListaCajas() {
  const cont=document.getElementById('lista-cajas'); if(!cont) return;
  const cajasFiltradas=filtroActivo==='todos'?todasLasCajas:todasLasCajas.filter(c=>c.tipo===filtroActivo);
  if(!cajasFiltradas.length){cont.innerHTML='<p class="empty">No hay puntos registrados.</p>';return;}

  const grupos={principal:[],cliente:[],pasante:[]};
  cajasFiltradas.forEach(c=>{if(grupos[c.tipo])grupos[c.tipo].push(c);else grupos.cliente.push(c);});

  const renderGrupo=(tipo,lista)=>{
    if(!lista.length) return '';
    const info=TIPO_CAJA[tipo];
    return `
      <div style="margin-bottom:8px;">
        <div onclick="toggleGrupoCajas('${tipo}')" style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:var(--surface);border:1px solid var(--border);border-radius:8px;cursor:pointer;user-select:none;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="width:10px;height:10px;background:${info.color};border-radius:50%;display:inline-block;"></span>
            <span style="font-size:13px;font-weight:500;color:var(--text);">${info.icon} ${info.label}</span>
            <span style="font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1px 8px;color:var(--muted);">${lista.length}</span>
          </div>
          <span id="arrow-cajas-${tipo}" style="color:var(--muted);font-size:14px;">▼</span>
        </div>
        <div id="grupo-cajas-${tipo}" style="display:none;padding-top:4px;">
          ${lista.map(c=>{
            const libres=c.totalPuertos-c.puertosOcupados;
            const pct=Math.round((c.puertosOcupados/c.totalPuertos)*100);
            const colorBarra=pct>=90?'#E24B4A':pct>=60?'#F59E0B':'#1D9E75';
            const bufColor=COLOR_BUFFER[c.buffer]||'#6b7280';
            return `
              <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-bottom:4px;cursor:pointer;" onclick="irACaja(${c.lat},${c.lng})">
                <div style="display:flex;align-items:flex-start;gap:10px;">
                  <div style="flex:1;min-width:0;">
                    <div style="font-size:13px;font-weight:500;color:var(--text);">${c.referencia}</div>
                    ${c.buffer||c.hilo?`<div style="display:flex;gap:5px;margin-top:3px;flex-wrap:wrap;">
                      ${c.buffer?`<span style="font-size:10px;background:var(--surface);border-radius:3px;padding:1px 5px;display:flex;align-items:center;gap:3px;"><span style="width:6px;height:6px;background:${bufColor};border-radius:50%;display:inline-block;"></span>${c.buffer}</span>`:''}
                      ${c.hilo?`<span style="font-size:10px;background:var(--surface);border-radius:3px;padding:1px 5px;">Hilo: ${c.hilo}</span>`:''}
                    </div>`:''}
                    ${c.distribucion?.length>0?`<div style="font-size:10px;color:var(--muted);margin-top:2px;">📡 ${c.distribucion.length} hilo${c.distribucion.length>1?'s':''} distribuido${c.distribucion.length>1?'s':''}</div>`:''}
                    <div style="margin-top:4px;">
                      <div style="height:4px;background:var(--surface);border-radius:2px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${colorBarra};border-radius:2px;"></div></div>
                      <div style="font-size:10px;color:var(--muted);margin-top:2px;">${libres} libre${libres!==1?'s':''} de ${c.totalPuertos}</div>
                    </div>
                  </div>
                  ${rolActual==='trabajador'?`<div style="display:flex;flex-direction:column;gap:4px;">
                    <button onclick="event.stopPropagation();editarCaja(${c.id})" style="font-size:11px;padding:3px 8px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:4px;cursor:pointer;">✏️</button>
                    <button onclick="event.stopPropagation();eliminarCaja(${c.id})" style="font-size:11px;padding:3px 8px;background:none;border:1px solid var(--danger);color:var(--danger);border-radius:4px;cursor:pointer;">✕</button>
                  </div>`:''}
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  };

  cont.innerHTML=`
    <div style="font-size:11px;color:var(--muted);margin-bottom:8px;">
      Total: ${cajasFiltradas.length} punto${cajasFiltradas.length!==1?'s':''} registrado${cajasFiltradas.length!==1?'s':''}
    </div>
    ${renderGrupo('principal',grupos.principal)}
    ${renderGrupo('cliente',grupos.cliente)}
    ${renderGrupo('pasante',grupos.pasante)}`;
}

function toggleGrupoCajas(tipo) {
  const grupo=document.getElementById(`grupo-cajas-${tipo}`);
  const arrow=document.getElementById(`arrow-cajas-${tipo}`);
  if(!grupo) return;
  const visible=grupo.style.display!=='none';
  grupo.style.display=visible?'none':'block';
  arrow.textContent=visible?'▼':'▲';
}

function irACaja(lat,lng) { if(mapaLeaflet) mapaLeaflet.setView([lat,lng],18); }

function filtrarMapa(tipo) {
  filtroActivo=tipo;
  document.querySelectorAll('[id^="filtro-"]').forEach(btn=>{btn.style.background='none';btn.style.color='var(--muted)';btn.style.borderColor='var(--border)';});
  const activo=document.getElementById('filtro-'+tipo);
  if(activo){activo.style.background='var(--accent)';activo.style.color='#000';activo.style.borderColor='var(--accent)';}
  renderMarcadores(); renderListaCajas();
}

async function cargarCajas() {
  try{const res=await fetch('/api/cajas');todasLasCajas=await res.json();}
  catch(e){todasLasCajas=[];}
}

async function registrarCaja() {
  if(gpsLat===null||gpsLng===null){toast('⚠ Obtén tu ubicación primero');return;}
  const tipo=document.getElementById('caja-tipo').value;
  const referencia=document.getElementById('caja-referencia').value.trim();
  const totalPuertos=parseInt(document.getElementById('caja-total-puertos').value)||16;
  const puertosOcupados=parseInt(document.getElementById('caja-puertos-ocupados').value)||0;
  const buffer=document.getElementById('caja-buffer').value;
  const hilo=document.getElementById('caja-hilo').value;
  const distribucion = tipo==='principal' ? getDistribucionMapa() : [];
  if(!referencia){toast('⚠ Ingresa una referencia');return;}
  try {
    const res=await fetch('/api/cajas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,referencia,lat:gpsLat,lng:gpsLng,totalPuertos,puertosOcupados,buffer,hilo,distribucion})});
    const data=await res.json();
    if(data.ok){
      toast('✓ Punto registrado');
      document.getElementById('caja-referencia').value='';
      document.getElementById('caja-total-puertos').value='16';
      document.getElementById('caja-puertos-ocupados').value='0';
      document.getElementById('caja-buffer').value='';
      document.getElementById('caja-hilo').value='';
      document.getElementById('distribucion-lista').innerHTML='';
      distContador=0;
      document.getElementById('distribucion-lista').innerHTML = '';
      distMapaContador = 0;
      await cargarCajas(); renderMarcadores(); renderListaCajas();
      if(mapaLeaflet) mapaLeaflet.setView([gpsLat,gpsLng],17);
    }else{toast('Error: '+data.error);}
  }catch(e){toast('Error de conexión');}
}

function editarCaja(id) {
  const c=todasLasCajas.find(x=>x.id===id); if(!c) return;
  const esPrincipal=c.tipo==='principal';
  const distFilas=(c.distribucion||[]).map((d,i)=>{
    const iid=`edit-dist-${id}-${i}`;
    return `<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;" id="${iid}">
      ${selBuffers(`edit-db-${id}-${i}`,d.buffer)}${selHilos(`edit-dh-${id}-${i}`,d.hilo)}
      <input type="text" id="edit-dd-${id}-${i}" placeholder="Destino..." value="${d.destino||''}"
        style="flex:2;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:6px 8px;outline:none;" />
      <button onclick="document.getElementById('${iid}').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>
    </div>`;
  }).join('');

  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML=`
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;">
      <h3 style="color:var(--accent);font-size:13px;margin-bottom:1rem;font-family:'IBM Plex Mono',monospace;">✏️ Editar punto</h3>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:120px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Tipo</label>
          <select id="edit-caja-tipo" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:7px;outline:none;width:100%;">
            <option value="principal" ${c.tipo==='principal'?'selected':''}>📦 Principal</option>
            <option value="cliente" ${c.tipo==='cliente'?'selected':''}>🔌 Cliente</option>
            <option value="pasante" ${c.tipo==='pasante'?'selected':''}>➡️ Pasante</option>
          </select>
        </div>
        <div style="flex:2;min-width:140px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Referencia</label>
          <input type="text" id="edit-caja-ref" value="${c.referencia}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:7px;outline:none;width:100%;" />
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:100px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Total puertos</label>
          <input type="number" id="edit-caja-total" value="${c.totalPuertos}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:7px;outline:none;width:100%;" />
        </div>
        <div style="flex:1;min-width:100px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Ocupados</label>
          <input type="number" id="edit-caja-ocupados" value="${c.puertosOcupados}" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:7px;outline:none;width:100%;" />
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <div style="flex:1;min-width:100px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Buffer</label>
          <select id="edit-caja-buffer" class="sel-field"><option value="">Sin buffer</option>${BUFFERS.map(b=>`<option value="${b}" ${c.buffer===b?'selected':''}>${b}</option>`).join('')}</select>
        </div>
        <div style="flex:1;min-width:100px;">
          <label style="font-size:11px;color:var(--muted);text-transform:uppercase;display:block;margin-bottom:4px;">Hilo</label>
          <select id="edit-caja-hilo" class="sel-field"><option value="">Sin hilo</option>${HILOS.map(h=>`<option value="${h}" ${c.hilo===h?'selected':''}>${h}</option>`).join('')}</select>
        </div>
      </div>
      ${esPrincipal?`<div style="margin-bottom:12px;">
        <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">📡 Hilos distribuidos</div>
        <div id="edit-dist-lista-${id}">${distFilas}</div>
        <button onclick="agregarDistEdit(${id})" style="font-size:12px;padding:4px 10px;margin-top:4px;">+ Agregar hilo</button>
      </div>`:''}
      <div style="display:flex;gap:8px;">
        <button onclick="guardarEdicionCaja(${id})" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px;cursor:pointer;">Guardar</button>
        <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:none;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);padding:10px;cursor:pointer;">Cancelar</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function agregarDistEdit(cajaId) {
  if(!editDistMap[cajaId]) editDistMap[cajaId]=100;
  editDistMap[cajaId]++;
  const idx=editDistMap[cajaId];
  const lista=document.getElementById(`edit-dist-lista-${cajaId}`);
  const div=document.createElement('div');
  div.style.cssText='display:flex;gap:6px;align-items:center;margin-bottom:6px;flex-wrap:wrap;';
  div.id=`edit-dist-${cajaId}-${idx}`;
  div.innerHTML=`${selBuffers(`edit-db-${cajaId}-${idx}`,'')}${selHilos(`edit-dh-${cajaId}-${idx}`,'')}
    <input type="text" id="edit-dd-${cajaId}-${idx}" placeholder="Destino..."
      style="flex:2;min-width:100px;background:var(--surface);border:1px solid var(--border);border-radius:6px;color:var(--text);font-size:13px;padding:6px 8px;outline:none;" />
    <button onclick="document.getElementById('edit-dist-${cajaId}-${idx}').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;">✕</button>`;
  lista.appendChild(div);
}

async function guardarEdicionCaja(id) {
  const tipo=document.getElementById('edit-caja-tipo').value;
  const referencia=document.getElementById('edit-caja-ref').value.trim();
  const totalPuertos=parseInt(document.getElementById('edit-caja-total').value);
  const puertosOcupados=parseInt(document.getElementById('edit-caja-ocupados').value);
  const buffer=document.getElementById('edit-caja-buffer').value;
  const hilo=document.getElementById('edit-caja-hilo').value;
  const distLista=document.getElementById(`edit-dist-lista-${id}`);
  let distribucion=[];
  if(distLista){
    distribucion=[...distLista.querySelectorAll('[id^="edit-dist-"]')].map(row=>{
      const rid=row.id.replace(`edit-dist-${id}-`,'');
      return{buffer:document.getElementById(`edit-db-${id}-${rid}`)?.value||'',hilo:document.getElementById(`edit-dh-${id}-${rid}`)?.value||'',destino:document.getElementById(`edit-dd-${id}-${rid}`)?.value.trim()||''};
    }).filter(d=>d.buffer||d.hilo||d.destino);
  }
  if(!referencia){toast('⚠ Ingresa una referencia');return;}
  try{
    const res=await fetch('/api/cajas/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,referencia,totalPuertos,puertosOcupados,buffer,hilo,distribucion})});
    const data=await res.json();
    if(data.ok){toast('✓ Punto actualizado');document.querySelector('div[style*="position:fixed"]')?.remove();await cargarCajas();renderMarcadores();renderListaCajas();}
  }catch(e){toast('Error al guardar');}
}

async function eliminarCaja(id) {
  if(!confirm('¿Eliminar este punto?')) return;
  try{await fetch('/api/cajas/'+id,{method:'DELETE'});toast('Punto eliminado');await cargarCajas();renderMarcadores();renderListaCajas();}
  catch(e){toast('Error al eliminar');}
}

// ── Cuadrillas ───────────────────────────────────────────
async function cargarTodasLasCuadrillas() {
  try{const res=await fetch('/api/cuadrillas');todasLasCuadrillas=await res.json();}
  catch(e){todasLasCuadrillas=[];}
}

async function cargarCuadrillaHoy() {
  const hoy=fechaLocal();
  const cuadrilla=todasLasCuadrillas.find(c=>c.fecha===hoy);
  const box=document.getElementById('cuadrilla-hoy-box'); if(!box) return;
  if(cuadrilla){
    cuadrillaHoyId=cuadrilla.id;
    box.innerHTML=`<div style="background:linear-gradient(135deg,rgba(0,212,170,0.1),rgba(0,153,255,0.05));border:1px solid var(--accent);border-radius:12px;padding:1.25rem;margin-bottom:1rem;">
      <div style="font-size:10px;color:var(--accent);text-transform:uppercase;letter-spacing:0.08em;font-family:'IBM Plex Mono',monospace;margin-bottom:6px;">Tu cuadrilla de hoy</div>
      <div style="font-size:17px;font-weight:600;color:var(--text);margin-bottom:10px;">${cuadrilla.nombre}</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">${cuadrilla.integrantes.map(i=>`<span style="font-size:12px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:4px 12px;color:var(--accent);">👷 ${i}</span>`).join('')}</div>
    </div>`;
  }else{
    cuadrillaHoyId=null;
    box.innerHTML=`<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:1rem;text-align:center;">
      <div style="font-size:13px;color:var(--muted);">No hay cuadrilla asignada para hoy</div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;">El administrador aún no ha creado la cuadrilla del día</div>
    </div>`;
  }
}

async function cargarCuadrillas() {
  await cargarTodasLasCuadrillas();
  const cont=document.getElementById('lista-cuadrillas'); if(!cont) return;
  const originales=todasLasCuadrillas.filter(c=>!c.reutilizada);
  if(!originales.length){cont.innerHTML='<p class="empty">No hay cuadrillas creadas.</p>';return;}
  cont.innerHTML=originales.map(c=>{
    const reusos=todasLasCuadrillas.filter(x=>x.reutilizada&&x.nombre===c.nombre);
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:8px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;flex-wrap:wrap;gap:6px;">
        <div>
          <div style="font-weight:600;color:var(--accent);font-size:14px;">${c.nombre}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">📅 ${c.fecha}${reusos.length>0?` · ♻️ ${reusos.length}x reutilizada`:''}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button onclick="reutilizarCuadrilla(${c.id})" style="font-size:12px;padding:5px 10px;background:var(--surface);border:1px solid var(--accent);color:var(--accent);border-radius:7px;cursor:pointer;">♻️ Reutilizar</button>
          <button class="btn-danger" onclick="eliminarCuadrilla(${c.id})" style="font-size:12px;padding:5px 10px;">Eliminar</button>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">${c.integrantes.map(i=>`<span style="font-size:12px;background:rgba(0,212,170,0.1);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:3px 10px;color:var(--accent);">👷 ${i}</span>`).join('')}</div>
    </div>`;
  }).join('');
}

async function crearCuadrilla() {
  const nombre=document.getElementById('cuadrilla-nombre').value.trim();
  const fecha=document.getElementById('cuadrilla-fecha').value;
  const integrantes=[...document.querySelectorAll('.cuadrilla-int:checked')].map(i=>i.value);
  if(!nombre){toast('⚠ Ingresa un nombre');return;}
  if(!fecha){toast('⚠ Selecciona la fecha');return;}
  if(!integrantes.length){toast('⚠ Selecciona al menos un integrante');return;}
  try{
    const res=await fetch('/api/cuadrillas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre,fecha,integrantes,reutilizada:false})});
    const text=await res.text(); let data; try{data=JSON.parse(text);}catch(e){toast('Error del servidor');return;}
    if(res.ok&&data.ok){toast('✓ Cuadrilla creada');document.getElementById('cuadrilla-nombre').value='';document.querySelectorAll('.cuadrilla-int').forEach(c=>c.checked=false);await cargarCuadrillas();}
    else{toast('Error: '+(data.error||'Error desconocido'));}
  }catch(e){toast('Error de conexión');}
}

async function eliminarCuadrilla(id) {
  if(!confirm('¿Eliminar esta cuadrilla y sus reusos?')) return;
  try{
    const c=todasLasCuadrillas.find(x=>x.id===id);
    await fetch('/api/cuadrillas/'+id,{method:'DELETE'});
    if(c){const reusos=todasLasCuadrillas.filter(x=>x.reutilizada&&x.nombre===c.nombre);for(const r of reusos)await fetch('/api/cuadrillas/'+r.id,{method:'DELETE'});}
    toast('Cuadrilla eliminada');await cargarCuadrillas();
  }catch(e){toast('Error al eliminar');}
}

function reutilizarCuadrilla(id) {
  const c=todasLasCuadrillas.find(x=>x.id===id); if(!c) return;
  const overlay=document.createElement('div');
  overlay.style.cssText='position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:500;display:flex;align-items:center;justify-content:center;padding:1rem;';
  overlay.innerHTML=`<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:1.5rem;width:100%;max-width:400px;">
    <h3 style="color:var(--accent);font-size:13px;margin-bottom:4px;font-family:'IBM Plex Mono',monospace;">♻️ Reutilizar cuadrilla</h3>
    <p style="font-size:13px;color:var(--muted);margin-bottom:1rem;">Mismos integrantes de <strong style="color:var(--text);">${c.nombre}</strong> para nueva fecha.</p>
    <div style="background:var(--surface2);border-radius:8px;padding:10px;margin-bottom:1rem;display:flex;flex-wrap:wrap;gap:5px;">${c.integrantes.map(i=>`<span style="font-size:11px;background:rgba(0,212,170,0.15);border:1px solid rgba(0,212,170,0.3);border-radius:20px;padding:2px 8px;color:var(--accent);">👷 ${i}</span>`).join('')}</div>
    <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:1rem;">
      <label style="font-size:11px;color:var(--muted);text-transform:uppercase;">Nueva fecha</label>
      <input type="date" id="reutilizar-fecha" style="background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:13px;padding:8px;outline:none;" />
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="confirmarReutilizar(${c.id})" style="flex:1;background:var(--accent);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:600;padding:10px;cursor:pointer;">Crear</button>
      <button onclick="this.closest('div[style*=fixed]').remove()" style="flex:1;background:none;border:1px solid var(--border);border-radius:8px;font-size:13px;color:var(--text);padding:10px;cursor:pointer;">Cancelar</button>
    </div>
  </div>`;
  const m=new Date(); m.setDate(m.getDate()+1);
  overlay.querySelector('#reutilizar-fecha').value=`${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}-${String(m.getDate()).padStart(2,'0')}`;
  document.body.appendChild(overlay);
}

async function confirmarReutilizar(id) {
  const c=todasLasCuadrillas.find(x=>x.id===id); if(!c) return;
  const fecha=document.getElementById('reutilizar-fecha').value;
  if(!fecha){toast('⚠ Selecciona una fecha');return;}
  try{
    const res=await fetch('/api/cuadrillas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nombre:c.nombre,fecha,integrantes:c.integrantes,reutilizada:true})});
    const text=await res.text(); let data; try{data=JSON.parse(text);}catch(e){toast('Error del servidor');return;}
    if(res.ok&&data.ok){toast('✓ Cuadrilla reutilizada para '+fecha);document.querySelector('div[style*="position:fixed"]')?.remove();await cargarCuadrillas();}
    else{toast('Error: '+(data.error||'Error desconocido'));}
  }catch(e){toast('Error de conexión');}
}

// ── Tabs ─────────────────────────────────────────────────
function mostrarTab(tab) {
  ['registro','mapa','historial','bodega','indicadores','cuadrillas'].forEach(t=>{
    const el=document.getElementById('tab-'+t); if(el) el.style.display=t===tab?'block':'none';
  });
  document.querySelectorAll('.tab').forEach(btn=>{btn.classList.toggle('active',btn.getAttribute('onclick')?.includes(`'${tab}'`));});
  if(tab==='mapa') iniciarMapa();
  if(tab==='historial') cargarHistorial();
  if(tab==='bodega') cargarBodega();
  if(tab==='indicadores') iniciarIndicadores();
  if(tab==='cuadrillas') cargarCuadrillas();
}

// ── Conectados ───────────────────────────────────────────
async function cargarConectados() {
  try{
    const res=await fetch('/api/conectados');
    const conectados=await res.json();
    document.getElementById('conectados-texto').textContent=`🟢 ${conectados.length}`;
    document.getElementById('conectados-lista').innerHTML=conectados.length===0
      ?'<div style="font-size:12px;color:#6b7280;padding:4px 0;">Nadie conectado</div>'
      :conectados.map(c=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2f3a;"><span style="width:7px;height:7px;background:#00d4aa;border-radius:50%;flex-shrink:0;"></span><div><div style="font-size:13px;color:#e8eaf0;font-weight:500;">${c.nombre}</div><div style="font-size:11px;color:#00d4aa;">En línea</div></div></div>`).join('');
  }catch(e){}
}

function toggleConectados() {
  const popup=document.getElementById('conectados-popup');
  popup.style.display=popup.style.display==='none'?'block':'none';
  if(popup.style.display==='block') cargarConectados();
}

document.addEventListener('click',e=>{
  const badge=document.getElementById('conectados-badge');
  const popup=document.getElementById('conectados-popup');
  if(popup&&badge&&!badge.contains(e.target)&&!popup.contains(e.target)) popup.style.display='none';
});

function toast(msg) {
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

async function cerrarSesion() {
  await fetch('/api/logout',{method:'POST'});
  window.location.href='/';
}

// ── Bodega ───────────────────────────────────────────────
async function cargarBodega() {
  try{
    const res=await fetch('/api/bodega'); stockActual=await res.json();
    renderStock(); setTimeout(()=>llenarSelectMaterial(),100); cargarMovimientos();
  }catch(e){document.getElementById('tabla-stock').innerHTML='<p class="empty">Error.</p>';}
}

function renderStock() {
  const cont=document.getElementById('tabla-stock');
  if(!stockActual.length){cont.innerHTML='<p class="empty">No hay stock registrado.</p>';return;}
  cont.innerHTML=`<table class="mat-table"><thead><tr><th>Material</th><th>Stock</th><th>Estado</th></tr></thead><tbody>${stockActual.map(s=>`<tr><td>${s.material}</td><td class="cant">${s.cantidad}</td><td><span style="color:${s.cantidad>5?'var(--accent)':s.cantidad>0?'#f59e0b':'var(--danger)'};font-size:12px;">${s.cantidad>5?'✓ Disponible':s.cantidad>0?'⚠ Poco':'✕ Sin stock'}</span></td></tr>`).join('')}</tbody></table>`;
}

function llenarSelectMaterial() {
  const sel=document.getElementById('mov-material'); if(!sel) return;
  sel.innerHTML=MATERIALES_STOCK.map(m=>`<option value="${m.label}">${m.label}</option>`).join('');
}

function mostrarModalStock() {
  const cont=document.getElementById('modal-stock-items');
  cont.innerHTML=MATERIALES_STOCK.map(m=>{const item=stockActual.find(s=>s.material===m.label);return `<div class="mat-row" style="margin-bottom:8px;"><label style="color:var(--text);font-size:12px;text-transform:none;letter-spacing:0;">${m.label}</label><input type="number" min="0" id="stock-${m.id}" value="${item?item.cantidad:0}" style="width:70px;text-align:right;" /><span class="unidad">${m.unidad}</span></div>`;}).join('');
  document.getElementById('modal-stock').style.display='flex';
}

function cerrarModalStock(){document.getElementById('modal-stock').style.display='none';}

async function guardarStock() {
  try{
    for(const m of MATERIALES_STOCK){
      const el=document.getElementById('stock-'+m.id);
      const cantidad=el?parseFloat(el.value)||0:0;
      const res=await fetch('/api/bodega/stock',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({material:m.label,cantidad})});
      const data=await res.json();
      if(!data.ok){toast('Error: '+data.error);return;}
    }
    cerrarModalStock();await cargarBodega();toast('✓ Stock actualizado');
  }catch(e){toast('Error: '+e.message);}
}

async function registrarMovimiento() {
  const tipo=document.getElementById('mov-tipo').value;
  const material=document.getElementById('mov-material').value;
  const cantidad=parseFloat(document.getElementById('mov-cantidad').value);
  const responsable=document.getElementById('mov-responsable').value.trim();
  const nota=document.getElementById('mov-nota').value.trim();
  if(!cantidad||cantidad<=0){toast('⚠ Ingresa una cantidad válida');return;}
  if(!responsable){toast('⚠ Ingresa el responsable');return;}
  try{
    const res=await fetch('/api/bodega/movimiento',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tipo,material,cantidad,responsable,nota})});
    const data=await res.json();
    if(data.ok){toast('✓ Movimiento registrado');document.getElementById('mov-cantidad').value='';document.getElementById('mov-responsable').value='';document.getElementById('mov-nota').value='';await cargarBodega();}
    else{toast('Error: '+data.error);}
  }catch(e){toast('Error de conexión');}
}

async function cargarMovimientos() {
  try{
    const res=await fetch('/api/bodega/movimientos');
    const movimientos=await res.json();
    const cont=document.getElementById('tabla-movimientos');
    if(!movimientos.length){cont.innerHTML='<p class="empty">No hay movimientos.</p>';return;}
    const colores={salida:'var(--danger)',entrada:'var(--accent)',devolucion:'#f59e0b'};
    cont.innerHTML=`<table class="mat-table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Material</th><th>Cant.</th><th>Responsable</th><th>Nota</th><th></th></tr></thead><tbody>${movimientos.map(m=>`<tr><td style="font-size:11px;color:var(--muted);">${m.fecha}</td><td><span style="color:${colores[m.tipo]};font-weight:600;font-size:12px;text-transform:capitalize;">${m.tipo}</span></td><td style="font-size:12px;">${m.material}</td><td class="cant">${m.cantidad}</td><td style="font-size:12px;">${m.responsable}</td><td style="color:var(--muted);font-size:12px;">${m.nota||'—'}</td><td><button class="del-btn" onclick="eliminarMovimiento(${m.id})">✕</button></td></tr>`).join('')}</tbody></table>`;
  }catch(e){}
}

async function eliminarMovimiento(id) {
  if(!confirm('¿Eliminar este movimiento?')) return;
  try{
    const res=await fetch('/api/bodega/movimientos/'+id,{method:'DELETE'});
    const data=await res.json();
    if(data.ok){toast('Movimiento eliminado');cargarMovimientos();}
  }catch(e){toast('Error al eliminar');}
}

function exportarBodegaExcel() {
  if(!stockActual.length){toast('⚠ No hay stock');return;}
  const datos=stockActual.map(s=>({'Material':s.material,'Stock disponible':s.cantidad}));
  const ws=XLSX.utils.json_to_sheet(datos);
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Stock');
  XLSX.writeFile(wb,`bodega_${new Date().toISOString().slice(0,10)}.xlsx`); toast('✓ Stock exportado');
}

// ── Indicadores ──────────────────────────────────────────
function getLunes(fecha) {
  const d=new Date(fecha+'T12:00:00'); const dia=d.getDay();
  const diff=dia===0?-6:1-dia; d.setDate(d.getDate()+diff);
  return d.toISOString().slice(0,10);
}

function getMat(reportes,label) {
  return reportes.reduce((s,r)=>{const m=(r.materiales||[]).find(m=>m.material===label);return s+(m?m.cantidad:0);},0);
}

function barMeta(valor,meta) {
  const pct=Math.min(Math.round(valor/meta*100),100);
  const c=valor>=meta?'#1D9E75':valor>=meta/2?'#BA7517':'#E24B4A';
  return `<div style="display:flex;align-items:center;gap:8px;"><div style="flex:1;height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${c};border-radius:4px;"></div></div><span style="font-size:11px;color:var(--muted);width:70px;text-align:right;">${valor} / ${meta}</span></div>`;
}

function calcularBadge(reportes,actividades,numPersonas=5,cuadrillaAsignada=false) {
  if(reportes.length===0){
    if(cuadrillaAsignada) return{badge:'Sin reporte',color:'#fff',bg:'#A32D2D'};
    return{badge:'Sin registro',color:'var(--muted)',bg:'var(--surface2)'};
  }
  const fibra=getMat(reportes,'Fibra Principal');
  const cajas=getMat(reportes,'Cajas NAT');
  const numInc=reportes.reduce((s,r)=>s+(r.numIncidencias||0),0);
  const acts=new Set(actividades);
  if(numPersonas>=5&&fibra>=2000&&acts.has('fibra'))    return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas===3&&fibra>=1500&&acts.has('fibra'))   return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas>=5&&fibra>=500&&acts.has('fibra')&&acts.has('cajas')&&(acts.has('instalacion')||acts.has('mudanza'))) return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas<=2&&cajas>=5&&acts.has('cajas'))       return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas<=2&&acts.has('odf'))                   return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas<=2&&acts.has('mangas'))                return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(numPersonas<=2&&numInc>6&&acts.has('incidencias')) return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(acts.has('instalacion'))  return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(acts.has('mudanza'))      return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(acts.has('reparacion'))   return{badge:'Productivo',color:'#3B6D11',bg:'#EAF3DE'};
  if(fibra>0||cajas>0||numInc>0) return{badge:'Parcial',color:'#854F0B',bg:'#FAEEDA'};
  return{badge:'Bajo',color:'#A32D2D',bg:'#FCEBEB'};
}

async function iniciarIndicadores() {
  try{
    const res=await fetch('/api/reportes'); todosLosReportes=await res.json();
    const semanas={};
    todosLosReportes.forEach(r=>{semanas[getLunes(r.fecha)]=true;});
    todasLasCuadrillas.forEach(c=>{semanas[getLunes(c.fecha)]=true;});
    const semanasOrdenadas=Object.keys(semanas).sort().reverse();
    const sel=document.getElementById('semana-select');
    sel.innerHTML=semanasOrdenadas.map(s=>{
      const lunes=new Date(s+'T12:00:00'); const sabado=new Date(lunes); sabado.setDate(sabado.getDate()+5);
      return `<option value="${s}">${lunes.toLocaleDateString('es-EC',{day:'2-digit',month:'short'})} – ${sabado.toLocaleDateString('es-EC',{day:'2-digit',month:'short',year:'numeric'})}</option>`;
    }).join('');
    cargarIndicadores();
  }catch(e){document.getElementById('dias-semana').innerHTML='<p class="empty">Error al cargar.</p>';}
}

function cargarIndicadores() {
  semanaActual=document.getElementById('semana-select').value;
  if(!semanaActual) return;
  const inicio=new Date(semanaActual+'T12:00:00');
  const diasSemana=[];
  for(let i=0;i<6;i++){const d=new Date(inicio);d.setDate(d.getDate()+i);diasSemana.push(d.toISOString().slice(0,10));}
  const rpf={};
  todosLosReportes.forEach(r=>{if(!rpf[r.fecha])rpf[r.fecha]=[];rpf[r.fecha].push(r);});
  const nombres=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  let diasProd=0,totalFibra=0,totalCajas=0,totalInst=0;
  diasSemana.slice(0,5).forEach(fecha=>{
    const reportes=rpf[fecha]||[];
    const actividades=[...new Set(reportes.flatMap(r=>r.actividades||[]))];
    const integrantes=[...new Set(reportes.flatMap(r=>r.integrantes||[]))];
    const numP=integrantes.length||5;
    const cuadrillaDia=todasLasCuadrillas.find(c=>c.fecha===fecha);
    const{badge}=calcularBadge(reportes,actividades,numP,!!cuadrillaDia);
    if(badge==='Productivo')diasProd++;
    totalFibra+=getMat(reportes,'Fibra Principal');
    totalCajas+=getMat(reportes,'Cajas NAT');
    if(actividades.includes('instalacion')&&reportes.length>0)totalInst++;
  });
  const tieneSab=(rpf[diasSemana[5]]||[]).length>0;

  document.getElementById('metricas-resumen').innerHTML=`
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Días productivos</div><div style="font-size:20px;font-weight:600;color:${diasProd>=4?'var(--accent)':diasProd>=2?'#f59e0b':'var(--danger)'};">${diasProd}/5</div><div style="font-size:11px;color:var(--muted);">Lun–Vie</div></div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Fibra tendida</div><div style="font-size:20px;font-weight:600;">${totalFibra}m</div><div style="font-size:11px;color:var(--muted);">semana</div></div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Cajas armadas</div><div style="font-size:20px;font-weight:600;">${totalCajas}</div><div style="font-size:11px;color:var(--muted);">semana</div></div>
    <div style="background:var(--surface2);border-radius:8px;padding:1rem;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Instalaciones</div><div style="font-size:20px;font-weight:600;color:var(--accent);">${totalInst}</div><div style="font-size:11px;color:var(--muted);">${tieneSab?'+ Sáb extra':'días'}</div></div>`;

  const cont=document.getElementById('dias-semana');
  cont.innerHTML=diasSemana.map((fecha,i)=>{
    const reportes=rpf[fecha]||[];
    const esSab=i===5;
    const actividades=[...new Set(reportes.flatMap(r=>r.actividades||[]))];
    const integrantes=[...new Set(reportes.flatMap(r=>r.integrantes||[]))];
    const numP=integrantes.length||5;
    const metaFibra=numP>=5?2000:numP===3?1500:Math.round(2000*numP/5);
    const fibra=getMat(reportes,'Fibra Principal');
    const cajas=getMat(reportes,'Cajas NAT');
    const numInc=reportes.reduce((s,r)=>s+(r.numIncidencias||0),0);
    const cuadrilla=todasLasCuadrillas.find(c=>reportes.some(r=>r.cuadrillaId===c.id));
    const cuadrillaDia=todasLasCuadrillas.find(c=>c.fecha===fecha);
    const allIps=reportes.flatMap(r=>r.ips||[]);
    let badgeInfo=esSab?{badge:'Extra',color:'#854F0B',bg:'#FAEEDA'}:calcularBadge(reportes,actividades,numP,!!cuadrillaDia);
    const obs=reportes.map(r=>r.observaciones).filter(Boolean);
    const actsHTML=actividades.length>0?`<div style="display:flex;flex-wrap:wrap;gap:5px;margin-bottom:10px;">${actividades.map(a=>ACTIVIDADES_INFO[a]?`<span style="font-size:11px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:3px 8px;">${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}</span>`:'').join('')}</div>`:'';
    const todosMat=MATERIALES_STOCK.map(m=>({label:m.label,val:getMat(reportes,m.label),unidad:m.unidad})).filter(m=>m.val>0);

    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:10px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:var(--accent);">${nombres[i]}</span>
          <span style="font-size:12px;color:var(--muted);margin-left:8px;">${fecha}</span>
          ${numP<5&&!esSab&&reportes.length>0?`<span style="font-size:10px;background:#FAEEDA;color:#854F0B;padding:2px 6px;border-radius:10px;margin-left:6px;">👥 ${numP}/5</span>`:''}
          ${esSab?'<span style="font-size:10px;background:var(--surface);border:1px solid var(--border);color:var(--muted);padding:2px 6px;border-radius:10px;margin-left:6px;">extra</span>':''}
        </div>
        <span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;background:${badgeInfo.bg};color:${badgeInfo.color};">${badgeInfo.badge}</span>
      </div>
      ${reportes.length===0?`
        ${cuadrillaDia?`<div style="background:rgba(163,45,45,0.1);border:1px solid rgba(163,45,45,0.3);border-radius:8px;padding:1rem;text-align:center;">
          <div style="font-size:13px;font-weight:600;color:#ff6b6b;margin-bottom:6px;">⚠️ Sin reporte</div>
          <div style="font-size:12px;color:var(--muted);margin-bottom:8px;">La cuadrilla <strong style="color:var(--text);">${cuadrillaDia.nombre}</strong> no registró actividad este día</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px;justify-content:center;">${cuadrillaDia.integrantes.map(i=>`<span style="font-size:11px;background:rgba(163,45,45,0.15);border:1px solid rgba(163,45,45,0.3);border-radius:20px;padding:2px 8px;color:#ff6b6b;">👷 ${i}</span>`).join('')}</div>
        </div>`:'<p style="font-size:12px;color:var(--muted);text-align:center;padding:0.5rem 0;">Sin actividad registrada</p>'}
      `:`
        ${cuadrilla?`<div style="font-size:12px;color:var(--accent);margin-bottom:8px;">🏷️ ${cuadrilla.nombre}</div>`:''}
        ${actsHTML}
        ${integrantes.length>0?`<div style="margin-bottom:8px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:3px;">👷 Integrantes</div><div style="font-size:13px;">${integrantes.join(', ')}</div></div>`:''}
        ${obs.length>0?`<div style="margin-bottom:8px;background:var(--surface);border-left:3px solid var(--accent2);border-radius:0 6px 6px 0;padding:8px 12px;"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:2px;">📋 Observaciones</div><div style="font-size:13px;line-height:1.5;">${obs.join(' | ')}</div></div>`:''}
        ${allIps.length>0?renderIPsHistorial(allIps):''}
        <div style="margin-bottom:10px;">
          <div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:8px;">📊 Rendimiento</div>
          ${actividades.includes('fibra')?`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;color:var(--text);">📡 Fibra</span><span style="font-size:11px;color:var(--muted);">meta: ${metaFibra}m</span></div>${barMeta(fibra,metaFibra)}</div>`:''}
          ${actividades.includes('cajas')?`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;color:var(--text);">📦 Cajas NAT</span><span style="font-size:11px;color:var(--muted);">meta: 5</span></div>${barMeta(cajas,5)}</div>`:''}
          ${actividades.includes('incidencias')?`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;color:var(--text);">⚠️ Incidencias</span><span style="font-size:11px;color:var(--muted);">meta: 6</span></div>${barMeta(numInc,6)}</div>`:''}
          ${['instalacion','mudanza','odf','mangas','reparacion'].filter(a=>actividades.includes(a)).map(a=>`<div style="margin-bottom:8px;"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;color:var(--text);">${ACTIVIDADES_INFO[a].icon} ${ACTIVIDADES_INFO[a].label}</span><span style="font-size:11px;color:var(--accent);">✓ Productivo</span></div><div style="height:6px;background:#EAF3DE;border-radius:4px;"><div style="width:100%;height:100%;background:#1D9E75;border-radius:4px;"></div></div></div>`).join('')}
        </div>
        ${todosMat.length>0?`<div><div style="font-size:11px;color:var(--muted);text-transform:uppercase;margin-bottom:6px;">📦 Materiales</div><table style="width:100%;border-collapse:collapse;"><tbody>${todosMat.map(m=>`<tr><td style="font-size:12px;color:var(--text);padding:4px 8px 4px 0;width:140px;white-space:nowrap;">${m.label}</td><td style="padding:4px 6px;"><div style="height:5px;background:var(--surface);border-radius:3px;overflow:hidden;"><div style="width:100%;height:100%;background:#1D9E75;border-radius:3px;"></div></div></td><td style="font-size:12px;color:var(--muted);padding:4px 0;text-align:right;white-space:nowrap;width:70px;">${m.val} ${m.unidad}</td></tr>`).join('')}</tbody></table></div>`:''}
      `}
    </div>`;
  }).join('');

  const contMat=document.getElementById('top-materiales');
  const totalesMat={};
  diasSemana.forEach(fecha=>{(rpf[fecha]||[]).forEach(r=>{(r.materiales||[]).forEach(m=>{totalesMat[m.material]=(totalesMat[m.material]||0)+m.cantidad;});});});
  const sorted=Object.entries(totalesMat).sort((a,b)=>b[1]-a[1]);
  if(!sorted.length){contMat.innerHTML='<p class="empty">No hay materiales esta semana.</p>';return;}
  const max=sorted[0][1];
  contMat.innerHTML=sorted.map(([mat,cant])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><span style="font-size:12px;color:var(--muted);width:150px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mat}</span><div style="flex:1;height:6px;background:var(--surface2);border-radius:3px;overflow:hidden;"><div style="width:${Math.round(cant/max*100)}%;height:100%;background:var(--accent);border-radius:3px;"></div></div><span style="font-size:12px;color:var(--muted);width:36px;text-align:right;">${cant}</span></div>`).join('');
}

function exportarInformeSemanal() {
  if(!semanaActual){toast('⚠ Selecciona una semana');return;}
  const inicio=new Date(semanaActual+'T12:00:00');
  const diasSemana=[];
  for(let i=0;i<6;i++){const d=new Date(inicio);d.setDate(d.getDate()+i);diasSemana.push(d.toISOString().slice(0,10));}
  const rpf={};
  todosLosReportes.forEach(r=>{if(!rpf[r.fecha])rpf[r.fecha]=[];rpf[r.fecha].push(r);});
  const nombres=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const wb=XLSX.utils.book_new();
  const filas=[];
  diasSemana.forEach((fecha,i)=>{
    const reportes=rpf[fecha]||[];
    const actividades=[...new Set(reportes.flatMap(r=>r.actividades||[]))];
    const integrantes=[...new Set(reportes.flatMap(r=>r.integrantes||[]))];
    const numP=integrantes.length||5;
    const cuadrillaDia=todasLasCuadrillas.find(c=>c.fecha===fecha);
    const{badge}=i===5?{badge:'Extra'}:calcularBadge(reportes,actividades,numP,!!cuadrillaDia);
    const allIps=reportes.flatMap(r=>r.ips||[]);
    filas.push({
      'Día':nombres[i],'Fecha':fecha,'Estado':badge,
      'Cuadrilla':cuadrillaDia?cuadrillaDia.nombre:'—','Personas':numP,
      'Actividades':actividades.map(a=>ACTIVIDADES_INFO[a]?.label||a).join(', ')||'—',
      'Integrantes':integrantes.join(', ')||'—',
      'Fibra (m)':getMat(reportes,'Fibra Principal'),'Cajas NAT':getMat(reportes,'Cajas NAT'),
      'Incidencias':reportes.reduce((s,r)=>s+(r.numIncidencias||0),0),
      'IPs':allIps.map(i=>typeof i==='object'?`${i.label}: ${i.ip}`:i).join(' | ')||'—',
      'Observaciones':reportes.map(r=>r.observaciones).filter(Boolean).join(' | ')||'—'
    });
  });
  const ws=XLSX.utils.json_to_sheet(filas);
  XLSX.utils.book_append_sheet(wb,ws,'Resumen semanal');
  XLSX.writeFile(wb,`informe_semana_${semanaActual}.xlsx`);
  toast('✓ Informe exportado');
}