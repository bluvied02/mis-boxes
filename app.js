'use strict'
// MIS BOXES — productos, boxes (combos) y pedidos para el Día de la Madre.
// Todo queda guardado en el celular (localStorage). Sin cuentas ni internet.

const CLAVE = 'misboxes-v1'
let datos = cargar()
let pestana = 'boxes'

function cargar () {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE))
    if (d && Array.isArray(d.productos)) return { productos: d.productos, boxes: d.boxes || [], pedidos: d.pedidos || [] }
  } catch (e) {}
  return { productos: [], boxes: [], pedidos: [] }
}
function guardar () {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)) } catch (e) { avisar('⚠️ No se pudo guardar') }
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {})

// ---------- Ayudas ----------
const $ = (s, r = document) => r.querySelector(s)
const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const plata = (n) => '$' + Math.round(n || 0).toLocaleString('es-AR')
const numTxt = (n) => (n ? Math.round(n).toLocaleString('es-AR') : '')
function leerNum (txt) {
  // "12.500" -> 12500 ; "1250,50" -> 1250.5
  const s = String(txt || '').replace(/[^\d,]/g, '').replace(',', '.')
  const n = parseFloat(s)
  return isFinite(n) ? n : 0
}
const redondear = (n) => Math.ceil(n / 100) * 100
const prod = (id) => datos.productos.find((p) => p.id === id)
const box = (id) => datos.boxes.find((b) => b.id === id)

function costoBox (b) {
  let c = (b.caja || 0) + (b.otros || 0)
  for (const it of b.items) { const p = prod(it.p); if (p) c += p.costo * it.c }
  return c
}
function contenido (b) {
  return b.items.filter((it) => prod(it.p)).map((it) => (it.c > 1 ? it.c + ' ' : '') + prod(it.p).nombre).join(', ')
}
function porcentaje (gan, costo) { return costo > 0 ? Math.round((gan / costo) * 100) : 0 }

let tAviso
function avisar (txt) {
  const a = $('#aviso'); a.textContent = txt; a.classList.add('ver')
  clearTimeout(tAviso); tAviso = setTimeout(() => a.classList.remove('ver'), 2200)
}

// Campos de plata: muestran 12.500 mientras escribís
function campoPlata (el) {
  el.addEventListener('input', () => {
    const tieneComa = el.value.includes(',')
    if (tieneComa) return
    const n = leerNum(el.value)
    el.value = n ? n.toLocaleString('es-AR') : ''
  })
}

// ---------- Hojas (pantallas que se abren encima) ----------
// El botón "atrás" del celular cierra la hoja en vez de salir de la app.
const pila = []
function abrirHoja (titulo, html, alArmar) {
  const fondo = document.createElement('div')
  fondo.className = 'hoja-fondo'
  fondo.innerHTML = '<div class="hoja"><div class="hoja-cab"><h2>' + esc(titulo) + '</h2><button class="cerrar" aria-label="Cerrar">✕</button></div><div class="hoja-cuerpo">' + html + '</div></div>'
  $('#hojas').appendChild(fondo)
  pila.push(fondo)
  history.pushState({ hoja: pila.length }, '')
  fondo.querySelector('.cerrar').onclick = () => cerrarHoja()
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrarHoja() })
  fondo.querySelectorAll('.plata').forEach(campoPlata)
  if (alArmar) alArmar(fondo.querySelector('.hoja-cuerpo'), fondo)
  return fondo
}
function cerrarHoja () { if (pila.length) history.back() }
window.addEventListener('popstate', () => {
  const f = pila.pop()
  if (f) f.remove()
})

// ---------- Pestañas ----------
document.querySelectorAll('.pestanas button').forEach((b) => {
  b.onclick = () => { pestana = b.dataset.p; dibujar(); window.scrollTo(0, 0) }
})
$('#btn-nuevo').onclick = () => {
  if (pestana === 'boxes') editarBox()
  else if (pestana === 'productos') editarProducto()
  else editarPedido()
}
$('#btn-ajustes').onclick = ajustes

function dibujar () {
  document.querySelectorAll('.pestanas button').forEach((b) => b.classList.toggle('activa', b.dataset.p === pestana))
  $('#btn-nuevo-txt').textContent = { boxes: 'Nueva box', productos: 'Nuevo producto', pedidos: 'Nuevo pedido' }[pestana]
  const m = $('#pantalla')
  if (pestana === 'boxes') verBoxes(m)
  else if (pestana === 'productos') verProductos(m)
  else verPedidos(m)
}

// ---------- PRODUCTOS ----------
function verProductos (m) {
  if (!datos.productos.length) {
    m.innerHTML = '<div class="vacio"><div class="grande">🧺</div><p><b>Todavía no cargaste productos</b></p>' +
      '<p>Cargá cada cosa que va adentro de las boxes (taza, chocolates, vela, flores…) con lo que te costó.</p></div>'
    return
  }
  const lista = datos.productos.slice().sort((a, b) => a.nombre.localeCompare(b.nombre))
  let h = datos.productos.length > 8 ? '<input class="entrada buscar" id="buscar" placeholder="🔍 Buscar producto" autocomplete="off">' : ''
  h += '<div id="lista-prod">'
  for (const p of lista) {
    const usos = datos.boxes.filter((b) => b.items.some((it) => it.p === p.id)).length
    h += '<button class="tarjeta" data-id="' + p.id + '" data-n="' + esc(p.nombre.toLowerCase()) + '"><div class="fila"><div><h3>' + esc(p.nombre) + '</h3>' +
      '<div class="chico">' + (usos ? 'Está en ' + usos + (usos === 1 ? ' box' : ' boxes') : 'No está en ninguna box') + '</div></div>' +
      '<div class="precio-grande">' + plata(p.costo) + '</div></div></button>'
  }
  m.innerHTML = h + '</div>'
  m.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => editarProducto(prod(b.dataset.id)) })
  const bus = $('#buscar')
  if (bus) bus.oninput = () => {
    const q = bus.value.toLowerCase().trim()
    m.querySelectorAll('[data-n]').forEach((t) => { t.style.display = t.dataset.n.includes(q) ? '' : 'none' })
  }
}

function formProducto (p) {
  return '<label class="campo"><span>Nombre del producto</span><input class="entrada" id="f-nombre" value="' + esc(p ? p.nombre : '') + '" placeholder="Ej: Taza con frase" autocomplete="off"></label>' +
    '<label class="campo"><span>¿Cuánto te costó? <small>(cada uno)</small></span><div class="con-peso"><input class="entrada plata" id="f-costo" inputmode="decimal" value="' + numTxt(p ? p.costo : 0) + '" placeholder="0"></div></label>'
}

function editarProducto (p, alGuardar) {
  const nuevo = !p
  abrirHoja(nuevo ? 'Nuevo producto' : 'Editar producto',
    formProducto(p) +
    '<button class="btn btn-rosa" id="f-guardar">Guardar</button>' +
    (nuevo ? '' : '<button class="btn btn-quitar" id="f-borrar">Borrar producto</button>'),
    (c) => {
      if (nuevo) setTimeout(() => $('#f-nombre', c).focus(), 250)
      $('#f-guardar', c).onclick = () => {
        const nombre = $('#f-nombre', c).value.trim()
        if (!nombre) { avisar('Poné el nombre'); return }
        const costo = leerNum($('#f-costo', c).value)
        if (nuevo) { p = { id: nuevoId(), nombre, costo }; datos.productos.push(p) } else { p.nombre = nombre; p.costo = costo }
        guardar(); cerrarHoja(); dibujar()
        avisar(nuevo ? 'Producto agregado ✓' : 'Guardado ✓')
        if (alGuardar) alGuardar(p)
      }
      const borrar = $('#f-borrar', c)
      if (borrar) borrar.onclick = () => {
        const usos = datos.boxes.filter((b) => b.items.some((it) => it.p === p.id))
        const msj = usos.length ? '"' + p.nombre + '" está en: ' + usos.map((b) => b.nombre).join(', ') + '.\nSe va a sacar de esas boxes. ¿Borrar igual?' : '¿Borrar "' + p.nombre + '"?'
        if (!confirm(msj)) return
        datos.productos = datos.productos.filter((x) => x.id !== p.id)
        for (const b of usos) b.items = b.items.filter((it) => it.p !== p.id)
        guardar(); cerrarHoja(); dibujar(); avisar('Producto borrado')
      }
    })
}

// ---------- BOXES ----------
function verBoxes (m) {
  if (!datos.boxes.length) {
    m.innerHTML = '<div class="vacio"><div class="grande">🎁</div><p><b>¡Hola! Armemos tus boxes</b></p>' +
      '<ol class="pasos"><li>En <b>🧺 Productos</b> cargá cada cosa con lo que te costó.</li>' +
      '<li>Acá en <b>🎁 Boxes</b> tocá <b>＋ Nueva box</b>, elegí qué lleva y cuánto sale la caja.</li>' +
      '<li>La app te dice cuánto te cuesta y cuánto ganás.</li>' +
      '<li>En <b>📝 Pedidos</b> anotás quién te compró.</li></ol></div>'
    return
  }
  let h = '<button class="btn btn-verde" id="compartir-todo" style="margin:0 0 14px">📲 Mandar lista de precios por WhatsApp</button>'
  for (const b of datos.boxes) {
    const costo = costoBox(b)
    const gan = (b.precio || 0) - costo
    h += '<button class="tarjeta" data-id="' + b.id + '"><div class="fila"><h3>' + esc(b.nombre) + '</h3>' +
      '<div class="precio-grande">' + (b.precio ? plata(b.precio) : '<span class="chico">sin precio</span>') + '</div></div>' +
      '<div class="chico">' + (esc(contenido(b)) || 'Sin productos todavía') + '</div>' +
      '<div class="cifras"><div class="cifra"><small>Te cuesta</small><b>' + plata(costo) + '</b></div>' +
      (b.precio ? '<div class="cifra ' + (gan >= 0 ? 'gana' : 'pierde') + '"><small>' + (gan >= 0 ? 'Ganás' : 'Perdés') + '</small><b>' + plata(Math.abs(gan)) + ' <span style="font-size:13px">(' + porcentaje(gan, costo) + '%)</span></b></div>' : '') +
      '</div></button>'
  }
  m.innerHTML = h
  m.querySelectorAll('[data-id]').forEach((t) => { t.onclick = () => editarBox(box(t.dataset.id)) })
  $('#compartir-todo').onclick = () => {
    const conPrecio = datos.boxes.filter((b) => b.precio)
    if (!conPrecio.length) { avisar('Primero ponele precio a las boxes'); return }
    let t = '💐 *Boxes Día de la Madre* 💐\n'
    for (const b of conPrecio) t += '\n🎁 *' + b.nombre + '* — ' + plata(b.precio) + (contenido(b) ? '\n   ' + contenido(b) : '') + '\n'
    t += '\n¡Hacé tu pedido! 💕'
    whatsapp(t)
  }
}

function editarBox (orig) {
  const nuevo = !orig
  // Trabajo sobre una copia; se guarda recién al tocar "Guardar"
  const b = orig ? JSON.parse(JSON.stringify(orig)) : { id: nuevoId(), nombre: '', items: [], caja: 0, otros: 0, precio: 0 }
  abrirHoja(nuevo ? 'Nueva box' : 'Editar box',
    '<label class="campo"><span>Nombre de la box</span><input class="entrada" id="f-nombre" value="' + esc(b.nombre) + '" placeholder="Ej: Box Desayuno" autocomplete="off"></label>' +
    '<div class="titulo-seccion" style="margin-top:0">¿Qué lleva adentro?</div>' +
    '<div class="caja-blanca"><div id="f-items"></div><button class="btn btn-borde" id="f-agregar" style="margin:8px 0 2px">＋ Agregar producto</button></div>' +
    '<div class="dos"><label class="campo"><span>Caja</span><div class="con-peso"><input class="entrada plata" id="f-caja" inputmode="decimal" value="' + numTxt(b.caja) + '" placeholder="0"></div></label>' +
    '<label class="campo"><span>Otros <small>(moño, papel, tarjeta)</small></span><div class="con-peso"><input class="entrada plata" id="f-otros" inputmode="decimal" value="' + numTxt(b.otros) + '" placeholder="0"></div></label></div>' +
    '<label class="campo"><span>Precio de venta</span><div class="con-peso"><input class="entrada plata" id="f-precio" inputmode="decimal" value="' + numTxt(b.precio) + '" placeholder="0"></div></label>' +
    '<div class="sugerencias" id="f-sug"></div>' +
    '<div class="cuenta" id="f-cuenta"></div>' +
    '<button class="btn btn-rosa" id="f-guardar">Guardar box</button>' +
    (nuevo ? '' : '<div class="botonera"><button class="btn btn-verde" id="f-wsp">📲 Compartir</button><button class="btn btn-borde" id="f-dup">Duplicar</button></div><button class="btn btn-quitar" id="f-borrar">Borrar box</button>'),
    (c) => {
      const leer = () => {
        b.nombre = $('#f-nombre', c).value.trim()
        b.caja = leerNum($('#f-caja', c).value)
        b.otros = leerNum($('#f-otros', c).value)
        b.precio = leerNum($('#f-precio', c).value)
      }
      const pintarItems = () => {
        const cont = $('#f-items', c)
        const items = b.items.filter((it) => prod(it.p))
        if (!items.length) { cont.innerHTML = '<div class="chico" style="padding:6px 0;color:var(--suave)">Todavía no agregaste productos.</div>'; return }
        cont.innerHTML = items.map((it) => {
          const p = prod(it.p)
          return '<div class="item"><div class="nom">' + esc(p.nombre) + '<small>' + plata(p.costo) + (it.c > 1 ? ' × ' + it.c + ' = ' + plata(p.costo * it.c) : '') + '</small></div>' +
            '<div class="contador"><button data-menos="' + it.p + '">' + (it.c === 1 ? '🗑' : '−') + '</button><b>' + it.c + '</b><button data-mas="' + it.p + '">+</button></div></div>'
        }).join('')
        cont.querySelectorAll('[data-mas]').forEach((x) => { x.onclick = () => { b.items.find((i) => i.p === x.dataset.mas).c++; refrescar() } })
        cont.querySelectorAll('[data-menos]').forEach((x) => {
          x.onclick = () => {
            const it = b.items.find((i) => i.p === x.dataset.menos)
            if (it.c > 1) it.c--; else b.items = b.items.filter((i) => i !== it)
            refrescar()
          }
        })
      }
      const pintarCuenta = () => {
        leer()
        const prods = b.items.reduce((s, it) => s + (prod(it.p) ? prod(it.p).costo * it.c : 0), 0)
        const costo = costoBox(b)
        const gan = b.precio - costo
        $('#f-cuenta', c).innerHTML =
          '<div class="fila"><span>Productos</span><span>' + plata(prods) + '</span></div>' +
          '<div class="fila"><span>Caja y otros</span><span>' + plata(b.caja + b.otros) + '</span></div>' +
          '<div class="fila total"><span>Te cuesta</span><span>' + plata(costo) + '</span></div>' +
          (b.precio ? '<div class="fila ' + (gan >= 0 ? 'gana' : 'pierde') + '"><span>' + (gan >= 0 ? 'Ganás' : 'Perdés') + '</span><span>' + plata(Math.abs(gan)) + ' (' + porcentaje(gan, costo) + '%)</span></div>' : '<div class="fila chico" style="color:var(--suave)">Poné el precio de venta para ver cuánto ganás</div>')
        $('#f-sug', c).innerHTML = costo > 0
          ? [50, 80, 100].map((pc) => '<button data-pc="' + pc + '"><b>' + plata(redondear(costo * (1 + pc / 100))) + '</b>ganar ' + pc + '%</button>').join('')
          : ''
        $('#f-sug', c).querySelectorAll('[data-pc]').forEach((x) => {
          x.onclick = () => { $('#f-precio', c).value = numTxt(redondear(costoBox(b) * (1 + x.dataset.pc / 100))); pintarCuenta() }
        })
      }
      const refrescar = () => { pintarItems(); pintarCuenta() }
      refrescar()
      if (nuevo) setTimeout(() => $('#f-nombre', c).focus(), 250)
      ;['#f-caja', '#f-otros', '#f-precio'].forEach((s) => $(s, c).addEventListener('input', pintarCuenta))

      $('#f-agregar', c).onclick = () => elegirProducto(b, refrescar)
      $('#f-guardar', c).onclick = () => {
        leer()
        if (!b.nombre) { avisar('Poné el nombre de la box'); $('#f-nombre', c).focus(); return }
        if (nuevo) datos.boxes.push(b); else Object.assign(orig, b)
        guardar(); cerrarHoja(); dibujar(); avisar(nuevo ? 'Box creada 🎁' : 'Guardado ✓')
      }
      if (!nuevo) {
        $('#f-wsp', c).onclick = () => {
          leer()
          whatsapp('🎁 *' + (b.nombre || 'Box') + '*' + (contenido(b) ? '\nLleva: ' + contenido(b) : '') + (b.precio ? '\n💲 ' + plata(b.precio) : '') + '\n\n¡Ideal para el Día de la Madre! 💐')
        }
        $('#f-dup', c).onclick = () => {
          leer()
          const copia = JSON.parse(JSON.stringify(b)); copia.id = nuevoId(); copia.nombre = b.nombre + ' (copia)'
          datos.boxes.push(copia); guardar(); cerrarHoja(); dibujar(); avisar('Box duplicada: editala a tu gusto')
          setTimeout(() => editarBox(copia), 350)
        }
        $('#f-borrar', c).onclick = () => {
          if (!confirm('¿Borrar la box "' + orig.nombre + '"?')) return
          datos.boxes = datos.boxes.filter((x) => x.id !== orig.id)
          guardar(); cerrarHoja(); dibujar(); avisar('Box borrada')
        }
      }
    })
}

function elegirProducto (b, alElegir) {
  const pintar = (c) => {
    const lista = datos.productos.slice().sort((x, y) => x.nombre.localeCompare(y.nombre))
    let h = '<button class="btn btn-borde" id="e-nuevo" style="margin:0 0 12px">＋ Crear producto nuevo</button>'
    if (lista.length > 6) h += '<input class="entrada buscar" id="e-buscar" placeholder="🔍 Buscar" autocomplete="off">'
    if (!lista.length) h += '<div class="vacio">Todavía no tenés productos.<br>Creá el primero con el botón de arriba.</div>'
    h += '<div class="elegir">' + lista.map((p) => {
      const ya = b.items.find((it) => it.p === p.id)
      return '<button class="opcion' + (ya ? ' si' : '') + '" data-id="' + p.id + '" data-n="' + esc(p.nombre.toLowerCase()) + '"><span>' + (ya ? '✓ ' : '') + esc(p.nombre) + (ya ? ' <small>(' + ya.c + ')</small>' : '') + '</span><b>' + plata(p.costo) + '</b></button>'
    }).join('') + '</div>'
    if (lista.length) h += '<div class="listo"><button class="btn btn-rosa" id="e-listo">✓ Listo</button></div>'
    const q = $('#e-buscar', c) ? $('#e-buscar', c).value : ''
    c.innerHTML = h
    // Tocar un producto lo suma (una vez más cada toque) y la lista queda abierta para seguir eligiendo
    c.querySelectorAll('[data-id]').forEach((x) => {
      x.onclick = () => { sumar(x.dataset.id); pintar(c) }
    })
    $('#e-nuevo', c).onclick = () => {
      editarProducto(null, (p) => { sumar(p.id); setTimeout(() => pintar(c), 60) })
    }
    if ($('#e-listo', c)) $('#e-listo', c).onclick = cerrarHoja
    const bus = $('#e-buscar', c)
    const filtrar = () => {
      const t = bus.value.toLowerCase().trim()
      c.querySelectorAll('[data-n]').forEach((x) => { x.style.display = x.dataset.n.includes(t) ? '' : 'none' })
    }
    if (bus) { bus.value = q; bus.oninput = filtrar; if (q) filtrar() }
  }
  const sumar = (id) => {
    const ya = b.items.find((it) => it.p === id)
    if (ya) ya.c++; else b.items.push({ p: id, c: 1 })
    alElegir()
    avisar('Agregado ✓')
  }
  abrirHoja('Elegí los productos', '', pintar)
}

// ---------- PEDIDOS ----------
function totalPedido (p) { return (p.precio || 0) * (p.cant || 1) }
function faltaCobrar (p) { return Math.max(0, totalPedido(p) - (p.pagado || 0)) }

function verPedidos (m) {
  if (!datos.pedidos.length) {
    m.innerHTML = '<div class="vacio"><div class="grande">📝</div><p><b>Todavía no hay pedidos</b></p>' +
      '<p>Cuando alguien te compre, tocá <b>＋ Nuevo pedido</b> y anotá quién es, qué box quiere y cuánto te pagó.</p></div>'
    return
  }
  let total = 0, cobrado = 0, ganancia = 0, unidades = 0
  for (const p of datos.pedidos) {
    total += totalPedido(p); cobrado += Math.min(p.pagado || 0, totalPedido(p))
    ganancia += totalPedido(p) - (p.costo || 0) * (p.cant || 1); unidades += p.cant || 1
  }
  let h = '<div class="tarjeta resumen"><div class="fila"><h3>Vendiste ' + unidades + (unidades === 1 ? ' box' : ' boxes') + '</h3><b style="font-size:20px">' + plata(total) + '</b></div>' +
    '<div class="cifras"><div class="cifra"><small>Cobrado</small><b>' + plata(cobrado) + '</b></div>' +
    '<div class="cifra"><small>Falta cobrar</small><b>' + plata(total - cobrado) + '</b></div>' +
    '<div class="cifra"><small>Ganancia</small><b>' + plata(ganancia) + '</b></div></div></div>'
  const pendientes = datos.pedidos.filter((p) => !p.entregado)
  const entregados = datos.pedidos.filter((p) => p.entregado)
  if (pendientes.length) h += '<button class="btn btn-borde" id="compras" style="margin:0 0 4px">🛒 ¿Qué tengo que comprar?</button>'
  const tarjeta = (p) => {
    const b = box(p.box)
    const falta = faltaCobrar(p)
    return '<button class="tarjeta' + (p.entregado ? ' entregado' : '') + '" data-id="' + p.id + '"><div class="fila"><h3>' + esc(p.cliente) + '</h3><div class="precio-grande">' + plata(totalPedido(p)) + '</div></div>' +
      '<div class="chico">' + (p.cant > 1 ? p.cant + ' × ' : '') + esc(b ? b.nombre : (p.boxNombre || 'Box borrada')) + (p.nota ? ' · ' + esc(p.nota) : '') + '</div>' +
      (falta ? '<span class="pastilla p-naranja">Falta cobrar ' + plata(falta) + '</span>' : '<span class="pastilla p-verde">Pagado ✓</span>') +
      (p.entregado ? '<span class="pastilla p-gris">Entregado ✓</span>' : '<span class="pastilla p-naranja">Por entregar</span>') + '</button>'
  }
  if (pendientes.length) h += '<div class="titulo-seccion">Por entregar (' + pendientes.length + ')</div>' + pendientes.map(tarjeta).join('')
  if (entregados.length) h += '<div class="titulo-seccion">Entregados (' + entregados.length + ')</div>' + entregados.map(tarjeta).join('')
  m.innerHTML = h
  m.querySelectorAll('[data-id]').forEach((t) => { t.onclick = () => editarPedido(datos.pedidos.find((p) => p.id === t.dataset.id)) })
  const comp = $('#compras')
  if (comp) comp.onclick = listaCompras
}

function editarPedido (orig) {
  if (!datos.boxes.length) { avisar('Primero armá una box en 🎁 Boxes'); return }
  const nuevo = !orig
  const p = orig ? Object.assign({}, orig) : { id: nuevoId(), cliente: '', tel: '', box: '', cant: 1, precio: 0, costo: 0, pagado: 0, nota: '', entregado: false }
  abrirHoja(nuevo ? 'Nuevo pedido' : 'Pedido',
    '<label class="campo"><span>¿Quién compra?</span><input class="entrada" id="f-cliente" value="' + esc(p.cliente) + '" placeholder="Nombre" autocomplete="off"></label>' +
    '<label class="campo"><span>Teléfono <small>(si querés)</small></span><input class="entrada" id="f-tel" type="tel" inputmode="tel" value="' + esc(p.tel) + '" placeholder="Ej: 351 555 1234"></label>' +
    '<div class="titulo-seccion" style="margin-top:0">¿Qué box?</div><div class="elegir" id="f-boxes"></div>' +
    '<div class="dos"><label class="campo"><span>Cantidad</span><div class="contador" style="height:52px"><button type="button" id="f-menos">−</button><b id="f-cant" style="font-size:20px;min-width:40px">' + p.cant + '</b><button type="button" id="f-mas">+</button></div></label>' +
    '<label class="campo"><span>Precio c/u</span><div class="con-peso"><input class="entrada plata" id="f-precio" inputmode="decimal" value="' + numTxt(p.precio) + '" placeholder="0"></div></label></div>' +
    '<label class="campo"><span>¿Cuánto te pagó?</span><div class="con-peso"><input class="entrada plata" id="f-pagado" inputmode="decimal" value="' + numTxt(p.pagado) + '" placeholder="0"></div></label>' +
    '<div class="sugerencias"><button type="button" id="f-todo"><b>Pagó todo</b>&nbsp;</button><button type="button" id="f-nada"><b>Nada todavía</b>&nbsp;</button></div>' +
    '<div class="cuenta" id="f-cuenta"></div>' +
    '<label class="campo"><span>Nota <small>(para cuándo, dirección, dedicatoria…)</small></span><input class="entrada" id="f-nota" value="' + esc(p.nota) + '" placeholder="Ej: Sábado a la tarde" autocomplete="off"></label>' +
    '<label class="tilde"><input type="checkbox" id="f-entregado"' + (p.entregado ? ' checked' : '') + '> Ya lo entregué</label>' +
    '<button class="btn btn-rosa" id="f-guardar">Guardar pedido</button>' +
    '<button class="btn btn-verde" id="f-wsp"' + (p.tel ? '' : ' style="display:none"') + '>📲 Escribirle por WhatsApp</button>' +
    (nuevo ? '' : '<button class="btn btn-quitar" id="f-borrar">Borrar pedido</button>'),
    (c) => {
      const pintarBoxes = () => {
        $('#f-boxes', c).innerHTML = datos.boxes.map((b) => '<button type="button" class="opcion' + (p.box === b.id ? ' si' : '') + '" data-b="' + b.id + '"><span>' + (p.box === b.id ? '✓ ' : '') + esc(b.nombre) + '</span><b>' + plata(b.precio) + '</b></button>').join('')
        c.querySelectorAll('[data-b]').forEach((x) => {
          x.onclick = () => {
            const b = box(x.dataset.b)
            p.box = b.id; p.boxNombre = b.nombre; p.costo = costoBox(b)
            $('#f-precio', c).value = numTxt(b.precio)
            pintarBoxes(); cuenta()
          }
        })
      }
      const leer = () => {
        p.cliente = $('#f-cliente', c).value.trim()
        p.tel = $('#f-tel', c).value.trim()
        p.precio = leerNum($('#f-precio', c).value)
        p.pagado = leerNum($('#f-pagado', c).value)
        p.nota = $('#f-nota', c).value.trim()
        p.entregado = $('#f-entregado', c).checked
      }
      const cuenta = () => {
        leer()
        const t = totalPedido(p)
        const falta = t - p.pagado
        $('#f-cuenta', c).innerHTML = '<div class="fila total"><span>Total</span><span>' + plata(t) + '</span></div>' +
          (falta > 0 ? '<div class="fila pierde" style="color:var(--naranja)"><span>Falta cobrar</span><span>' + plata(falta) + '</span></div>'
            : '<div class="fila gana"><span>Pagado ✓</span><span>' + (falta < 0 ? 'te dio ' + plata(-falta) + ' de más' : '') + '</span></div>')
        $('#f-wsp', c).style.display = p.tel ? '' : 'none'
      }
      pintarBoxes(); cuenta()
      if (nuevo) setTimeout(() => $('#f-cliente', c).focus(), 250)
      ;['#f-precio', '#f-pagado', '#f-tel'].forEach((s) => $(s, c).addEventListener('input', cuenta))
      $('#f-mas', c).onclick = () => { p.cant++; $('#f-cant', c).textContent = p.cant; cuenta() }
      $('#f-menos', c).onclick = () => { if (p.cant > 1) p.cant--; $('#f-cant', c).textContent = p.cant; cuenta() }
      $('#f-todo', c).onclick = () => { $('#f-pagado', c).value = numTxt(totalPedido(p)); cuenta() }
      $('#f-nada', c).onclick = () => { $('#f-pagado', c).value = ''; cuenta() }
      $('#f-wsp', c).onclick = () => {
        leer()
        const b = box(p.box)
        const falta = faltaCobrar(p)
        const num = p.tel.replace(/\D/g, '')
        const txt = '¡Hola ' + p.cliente + '! 💐 Te escribo por tu pedido: ' + (p.cant > 1 ? p.cant + ' × ' : '') + (b ? b.nombre : 'box') + '.' + (falta ? ' Te queda por pagar ' + plata(falta) + '.' : '')
        window.open('https://wa.me/' + (num.length === 10 ? '549' + num : num) + '?text=' + encodeURIComponent(txt), '_blank')
      }
      $('#f-guardar', c).onclick = () => {
        leer()
        if (!p.cliente) { avisar('Poné el nombre de quién compra'); $('#f-cliente', c).focus(); return }
        if (!p.box) { avisar('Elegí qué box lleva'); return }
        if (nuevo) datos.pedidos.unshift(p); else Object.assign(orig, p)
        guardar(); cerrarHoja(); dibujar(); avisar(nuevo ? 'Pedido anotado 📝' : 'Guardado ✓')
      }
      const borrar = $('#f-borrar', c)
      if (borrar) borrar.onclick = () => {
        if (!confirm('¿Borrar el pedido de ' + orig.cliente + '?')) return
        datos.pedidos = datos.pedidos.filter((x) => x.id !== orig.id)
        guardar(); cerrarHoja(); dibujar(); avisar('Pedido borrado')
      }
    })
}

function listaCompras () {
  // Suma lo que llevan todos los pedidos que faltan entregar
  const cuenta = {}
  let cajas = 0
  for (const pe of datos.pedidos.filter((x) => !x.entregado)) {
    const b = box(pe.box)
    if (!b) continue
    cajas += pe.cant || 1
    for (const it of b.items) cuenta[it.p] = (cuenta[it.p] || 0) + it.c * (pe.cant || 1)
  }
  const filas = Object.keys(cuenta).filter(prod).map((id) => ({ p: prod(id), n: cuenta[id] })).sort((a, b) => a.p.nombre.localeCompare(b.p.nombre))
  let gasto = 0
  let h = '<p class="chico" style="color:var(--suave);margin-top:0">Todo lo que necesitás para armar los pedidos que faltan entregar.</p><div class="cuenta">'
  h += '<div class="fila"><span><b>' + cajas + '</b> cajas (con moño, papel…)</span><span></span></div>'
  for (const f of filas) { gasto += f.p.costo * f.n; h += '<div class="fila"><span><b>' + f.n + '</b> ' + esc(f.p.nombre) + '</span><span class="chico">' + plata(f.p.costo * f.n) + '</span></div>' }
  h += '<div class="fila total"><span>Productos</span><span>' + plata(gasto) + '</span></div></div>'
  h += '<button class="btn btn-verde" id="c-wsp">📲 Mandarme la lista por WhatsApp</button>'
  abrirHoja('🛒 Qué tengo que comprar', h, (c) => {
    $('#c-wsp', c).onclick = () => whatsapp('🛒 *Para comprar*\n' + cajas + ' cajas\n' + filas.map((f) => f.n + ' ' + f.p.nombre).join('\n'))
  })
}

// ---------- WhatsApp ----------
function whatsapp (txt) { window.open('https://wa.me/?text=' + encodeURIComponent(txt), '_blank') }

// ---------- Copia de seguridad ----------
function ajustes () {
  abrirHoja('Copia de seguridad',
    '<p style="margin-top:0">Todo lo que cargás queda guardado <b>en este celular</b>. Si cambiás de celular o borrás los datos del navegador, se pierde.</p>' +
    '<p>Por las dudas, cada tanto guardá una copia (por ejemplo mandátela a vos misma por WhatsApp o guardala en Drive).</p>' +
    '<button class="btn btn-rosa" id="a-copia">💾 Guardar copia</button>' +
    '<button class="btn btn-borde" id="a-cargar">📂 Recuperar desde una copia</button>' +
    '<input type="file" id="a-archivo" accept=".json,application/json" style="display:none">' +
    '<p class="chico" style="color:var(--suave);margin-top:18px">' + datos.productos.length + ' productos · ' + datos.boxes.length + ' boxes · ' + datos.pedidos.length + ' pedidos</p>',
    (c) => {
      $('#a-copia', c).onclick = async () => {
        const hoy = new Date().toISOString().slice(0, 10)
        const nombre = 'mis-boxes-' + hoy + '.json'
        const archivo = new File([JSON.stringify(datos)], nombre, { type: 'application/json' })
        try {
          if (navigator.canShare && navigator.canShare({ files: [archivo] })) { await navigator.share({ files: [archivo], title: 'Copia Mis Boxes' }); return }
        } catch (e) { if (e && e.name === 'AbortError') return }
        const a = document.createElement('a')
        a.href = URL.createObjectURL(archivo); a.download = nombre; a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 2000)
        avisar('Copia descargada ✓')
      }
      $('#a-cargar', c).onclick = () => $('#a-archivo', c).click()
      $('#a-archivo', c).onchange = (e) => {
        const f = e.target.files[0]
        if (!f) return
        const r = new FileReader()
        r.onload = () => {
          try {
            const d = JSON.parse(r.result)
            if (!d || !Array.isArray(d.productos) || !Array.isArray(d.boxes)) throw new Error()
            if (!confirm('Esto reemplaza lo que hay ahora por la copia (' + d.productos.length + ' productos, ' + d.boxes.length + ' boxes, ' + (d.pedidos || []).length + ' pedidos). ¿Seguir?')) return
            datos = { productos: d.productos, boxes: d.boxes, pedidos: d.pedidos || [] }
            guardar(); cerrarHoja(); dibujar(); avisar('Copia recuperada ✓')
          } catch (err) { avisar('Ese archivo no es una copia de Mis Boxes') }
        }
        r.readAsText(f)
      }
    })
}

dibujar()

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {})
