'use strict';

const SECCIONES = ['inicio', 'dia', 'tareas', 'calendario', 'estadisticas'];

const TITULOS_SECCION = {
  inicio: 'Inicio',
  dia: 'Mi día',
  tareas: 'Tareas',
  calendario: 'Calendario',
  estadisticas: 'Estadísticas'
};

const MENSAJES = [
  'Un paso a la vez: lo importante es empezar.',
  'Hoy es un buen día para avanzar en lo que importa.',
  'Lo pequeño, hecho todos los días, se vuelve grande.',
  'Organizá tu día y ganá tiempo para lo que disfrutás.',
  'No hace falta hacerlo todo, alcanza con hacer lo próximo.',
  'La constancia le gana a la motivación.',
  'Terminar una tarea chica también cuenta.'
];

const CLAVE = 'dia-a-dia-tareas-v1';

const $ = (selector, raiz = document) => raiz.querySelector(selector);
const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];

function fechaISO(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

function desdeISO(valor) {
  const [anio, mes, dia] = valor.split('-').map(Number);
  return new Date(anio, mes - 1, dia, 12);
}

function cargarTareas() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE) || '[]');

    return Array.isArray(datos)
      ? datos.filter(t =>
          t &&
          typeof t.id === 'string' &&
          typeof t.titulo === 'string' &&
          typeof t.fecha === 'string'
        )
      : [];
  } catch (error) {
    console.warn('No se pudieron cargar las tareas guardadas.', error);
    return [];
  }
}

const estado = {
  tareas: cargarTareas(),
  seccionActiva: 'inicio',
  fechaDia: fechaISO(new Date()),
  fechaSeleccionada: fechaISO(new Date()),
  mesCalendario: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  idEditando: null
};

function guardarTareas() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado.tareas));
    return true;
  } catch (error) {
    mostrarAviso('No se pudieron guardar los cambios en este navegador.', 'error');
    return false;
  }
}

function fechaLarga(fecha) {
  return new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(fecha).replace(/^./, letra => letra.toUpperCase());
}

function fechaCorta(valor) {
  return new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'short'
  }).format(desdeISO(valor));
}

function horaActual() {
  const ahora = new Date();

  return `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
}

function saludo() {
  const hora = new Date().getHours();

  if (hora < 6) return '¡Buenas noches!';
  if (hora < 12) return '¡Buen día!';
  if (hora < 20) return '¡Buenas tardes!';

  return '¡Buenas noches!';
}

function mensajeDelDia() {
  const ahora = new Date();
  const inicio = new Date(ahora.getFullYear(), 0, 0);
  const dia = Math.floor((ahora - inicio) / 86400000);

  return MENSAJES[dia % MENSAJES.length];
}

function ordenarTareas(a, b) {
  if (a.horaInicio && b.horaInicio) {
    return a.horaInicio.localeCompare(b.horaInicio) ||
      a.titulo.localeCompare(b.titulo);
  }

  if (a.horaInicio) return -1;
  if (b.horaInicio) return 1;

  return a.titulo.localeCompare(b.titulo);
}

function tareasDeFecha(fecha) {
  return estado.tareas
    .filter(tarea => tarea.fecha === fecha)
    .sort(ordenarTareas);
}

function resumen(tareas) {
  const completadas = tareas.filter(tarea => tarea.completada).length;

  return {
    total: tareas.length,
    completadas,
    pendientes: tareas.length - completadas,
    porcentaje: tareas.length
      ? Math.round(completadas / tareas.length * 100)
      : 0
  };
}

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[caracter]);
}

function crearElemento(etiqueta, clase, texto) {
  const elemento = document.createElement(etiqueta);

  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;

  return elemento;
}

function mostrarAviso(mensaje, tipo = 'info') {
  const contenedor = $('#avisos');

  if (!contenedor) return;

  while (contenedor.children.length >= 3) {
    contenedor.firstElementChild.remove();
  }

  const aviso = document.createElement('div');
  aviso.className = `aviso${tipo === 'error' ? ' aviso-error' : ''}`;
  aviso.textContent = mensaje;

  contenedor.appendChild(aviso);

  setTimeout(() => {
    aviso.classList.add('saliendo');
    setTimeout(() => aviso.remove(), 280);
  }, 3200);
}

/* NAVEGACIÓN */

function irASeccion(nombre) {
  if (!SECCIONES.includes(nombre)) return;

  if (location.hash === `#${nombre}`) {
    mostrarSeccion(nombre, false);
    return;
  }

  location.hash = nombre;
}

function mostrarSeccion(nombre, moverFoco = false) {
  if (!SECCIONES.includes(nombre)) {
    nombre = 'inicio';
  }

  $$('.seccion').forEach(seccion => {
    seccion.hidden = seccion.dataset.seccion !== nombre;
  });

  $$('.nav-boton').forEach(boton => {
    if (boton.dataset.ir === nombre) {
      boton.setAttribute('aria-current', 'page');
    } else {
      boton.removeAttribute('aria-current');
    }
  });

  estado.seccionActiva = nombre;
  document.title = `${TITULOS_SECCION[nombre]} · Día a Día`;

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (moverFoco) {
    const titulo = $(`#seccion-${nombre} h1`);
    titulo?.focus({ preventScroll: true });
  }

  renderizarTodo();
}

/* INICIO */

function renderizarInicio() {
  const ahora = new Date();
  const hoy = fechaISO(ahora);
  const tareas = tareasDeFecha(hoy);
  const datos = resumen(tareas);

  $('#saludo').textContent = saludo();
  $('#fecha-actual').textContent = fechaLarga(ahora);
  $('#mensaje-motivador').textContent = mensajeDelDia();

  $('#progreso-porcentaje').textContent = `${datos.porcentaje}%`;

  $('#progreso-detalle').textContent = datos.total
    ? `${datos.completadas} de ${datos.total} ${datos.total === 1 ? 'tarea completada' : 'tareas completadas'}`
    : 'Todavía no hay tareas para hoy';

  $('#contador-completadas').textContent = datos.completadas;
  $('#contador-pendientes').textContent = datos.pendientes;

  $('#barra-relleno').style.width = `${datos.porcentaje}%`;
  $('#barra-progreso').setAttribute('aria-valuenow', String(datos.porcentaje));

  const proxima = tareas
    .filter(tarea =>
      !tarea.completada &&
      tarea.horaInicio &&
      tarea.horaInicio >= horaActual()
    )
    .sort(ordenarTareas)[0];

  const contenedorProxima = $('#proxima-actividad');
  contenedorProxima.replaceChildren();

  if (proxima) {
    const bloque = crearElemento('div', 'proxima');

    bloque.append(
      crearElemento('p', 'proxima-hora', proxima.horaInicio),
      crearElemento('p', 'proxima-titulo', proxima.titulo),
      crearElemento(
        'p',
        'proxima-meta',
        `${proxima.categoria} · Prioridad ${proxima.prioridad}`
      )
    );

    contenedorProxima.append(bloque);
  } else {
    contenedorProxima.append(
      crearElemento(
        'p',
        'texto-suave',
        tareas.length
          ? 'No tenés actividades pendientes con horario por delante hoy.'
          : 'Todavía no hay actividades programadas para hoy.'
      )
    );
  }

  const lista = $('#lista-proximas');
  const vacio = $('#estado-vacio');

  lista.replaceChildren();

  if (!tareas.length) {
    lista.hidden = true;
    vacio.hidden = false;
    return;
  }

  vacio.hidden = true;
  lista.hidden = false;

  const pendientes = tareas.filter(tarea => !tarea.completada).slice(0, 4);

  if (!pendientes.length) {
    lista.append(
      crearElemento('li', 'texto-suave', '¡Completaste todas las tareas de hoy!')
    );
    return;
  }

  pendientes.forEach(tarea => {
    const elemento = crearElemento('li', 'tarea-item');
    elemento.dataset.prioridad = tarea.prioridad;

    const contenido = crearElemento('div', 'tarea-item-contenido');

    contenido.append(
      crearElemento('p', 'tarea-titulo', tarea.titulo),
      crearElemento(
        'p',
        'tarea-meta',
        `${tarea.categoria} · Prioridad ${tarea.prioridad}`
      )
    );

    elemento.append(
      crearElemento('span', 'tarea-hora', tarea.horaInicio || 'Sin hora'),
      contenido
    );

    lista.append(elemento);
  });
}

/* TARJETAS DE TAREAS */

function htmlTarea(tarea) {
  const completa = tarea.completada ? ' completada' : '';

  const horario = tarea.horaInicio
    ? `${tarea.horaInicio}${tarea.horaFin ? `–${tarea.horaFin}` : ''}`
    : 'Sin horario';

  return `
    <li class="tarea-card${completa}" data-id="${escapar(tarea.id)}" data-prioridad="${escapar(tarea.prioridad)}">
      <input
        class="tarea-check"
        type="checkbox"
        data-tarea-completar="${escapar(tarea.id)}"
        aria-label="Marcar ${escapar(tarea.titulo)} como completada"
        ${tarea.completada ? 'checked' : ''}
      >

      <div class="tarea-card-contenido">
        <p class="tarea-card-titulo">${escapar(tarea.titulo)}</p>

        ${tarea.descripcion
          ? `<p class="tarea-descripcion">${escapar(tarea.descripcion)}</p>`
          : ''
        }

        <div class="tarea-card-meta">
          <span class="tag">${escapar(fechaCorta(tarea.fecha))}</span>
          <span class="tag">${escapar(horario)}</span>
          <span class="tag">${escapar(tarea.categoria)}</span>
          <span class="tag prioridad-${escapar(tarea.prioridad)}">Prioridad ${escapar(tarea.prioridad)}</span>
          <span class="tag">${tarea.completada ? 'Completada' : 'Pendiente'}</span>
        </div>
      </div>

      <div class="tarea-acciones">
        <button
          type="button"
          class="boton-mini"
          data-editar="${escapar(tarea.id)}"
          aria-label="Editar ${escapar(tarea.titulo)}"
          title="Editar"
        >
          <svg class="icono"><use href="#i-editar"/></svg>
        </button>

        <button
          type="button"
          class="boton-mini eliminar"
          data-eliminar="${escapar(tarea.id)}"
          aria-label="Eliminar ${escapar(tarea.titulo)}"
          title="Eliminar"
        >
          <svg class="icono"><use href="#i-papelera"/></svg>
        </button>
      </div>
    </li>
  `;
}

function renderizarLista(elementoId, vacioId, tareas, mensaje) {
  const lista = $(`#${elementoId}`);
  const vacio = $(`#${vacioId}`);

  lista.innerHTML = tareas.map(htmlTarea).join('');
  vacio.hidden = tareas.length > 0;
  vacio.textContent = mensaje;
}

/* MI DÍA */

function renderizarDia() {
  const selectorFecha = $('#fecha-dia');

  if (selectorFecha.value !== estado.fechaDia) {
    selectorFecha.value = estado.fechaDia;
  }

  const tareas = tareasDeFecha(estado.fechaDia);
  const datos = resumen(tareas);

  $('#titulo-agenda-dia').textContent =
    `Agenda · ${fechaLarga(desdeISO(estado.fechaDia))}`;

  $('#contador-agenda').textContent =
    `${datos.total} ${datos.total === 1 ? 'tarea' : 'tareas'} · ${datos.completadas} completadas`;

  renderizarLista(
    'lista-dia',
    'vacio-dia',
    tareas,
    'No hay tareas para esta fecha. Aprovechá para planificar tu día.'
  );
}

/* TODAS LAS TAREAS Y FILTROS */

function renderizarTareas() {
  const busqueda = $('#buscador').value.trim().toLocaleLowerCase('es-AR');
  const filtro = $('#filtro-estado').value;
  const prioridad = $('#filtro-prioridad').value;

  const todas = [...estado.tareas].sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || ordenarTareas(a, b)
  );

  const filtradas = todas.filter(tarea => {
    const coincideTexto = !busqueda ||
      `${tarea.titulo} ${tarea.descripcion} ${tarea.categoria}`
        .toLocaleLowerCase('es-AR')
        .includes(busqueda);

    const coincideEstado =
      filtro === 'todas' ||
      (filtro === 'completadas' ? tarea.completada : !tarea.completada);

    const coincidePrioridad =
      prioridad === 'todas' || tarea.prioridad === prioridad;

    return coincideTexto && coincideEstado && coincidePrioridad;
  });

  const datos = resumen(todas);

  $('#resumen-tareas').innerHTML = `
    <span class="resumen-pill">${datos.total} en total</span>
    <span class="resumen-pill">${datos.pendientes} pendientes</span>
    <span class="resumen-pill">${datos.completadas} completadas</span>
  `;

  renderizarLista(
    'lista-todas',
    'vacio-tareas',
    filtradas,
    todas.length
      ? 'No hay tareas que coincidan con esos filtros.'
      : 'Todavía no hay tareas. Creá la primera para empezar a organizarte.'
  );
}

/* CALENDARIO */

function renderizarCalendario() {
  const mes = estado.mesCalendario;

  $('#mes-anio').textContent = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    year: 'numeric'
  }).format(mes).replace(/^./, letra => letra.toUpperCase());

  const grid = $('#calendario-grid');
  grid.replaceChildren();

  ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach(dia => {
    grid.append(crearElemento('div', 'dia-semana', dia));
  });

  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const desplazamiento = (primero.getDay() + 6) % 7;

  const inicio = new Date(
    mes.getFullYear(),
    mes.getMonth(),
    1 - desplazamiento
  );

  const hoy = fechaISO(new Date());

  for (let i = 0; i < 42; i++) {
    const fecha = new Date(
      inicio.getFullYear(),
      inicio.getMonth(),
      inicio.getDate() + i
    );

    const iso = fechaISO(fecha);
    const tareas = tareasDeFecha(iso);

    const boton = crearElemento('button', 'dia-calendario');
    boton.type = 'button';
    boton.dataset.fecha = iso;

    boton.setAttribute(
      'aria-label',
      `${fechaLarga(fecha)}${tareas.length ? `, ${tareas.length} tareas` : ''}`
    );

    if (fecha.getMonth() !== mes.getMonth()) {
      boton.classList.add('otro-mes');
    }

    if (iso === hoy) {
      boton.classList.add('hoy');
    }

    if (iso === estado.fechaSeleccionada) {
      boton.classList.add('seleccionado');
      boton.setAttribute('aria-pressed', 'true');
    } else {
      boton.setAttribute('aria-pressed', 'false');
    }

    boton.append(crearElemento('span', 'dia-numero', String(fecha.getDate())));

    const puntos = crearElemento('span', 'puntos-tareas');

    tareas.slice(0, 3).forEach(tarea => {
      const punto = crearElemento(
        'span',
        `punto-tarea${tarea.completada ? '' : ' pendiente'}`
      );

      puntos.append(punto);
    });

    boton.append(puntos);
    grid.append(boton);
  }
}

function renderizarTareasFecha() {
  const tareas = tareasDeFecha(estado.fechaSeleccionada);

  $('#titulo-tareas-fecha').textContent =
    `Tareas · ${fechaLarga(desdeISO(estado.fechaSeleccionada))}`;

  renderizarLista(
    'lista-fecha',
    'vacio-fecha',
    tareas,
    'No hay tareas para este día. Podés agregar una con el botón de arriba.'
  );
}

/* ESTADÍSTICAS */

function renderizarEstadisticas() {
  const todas = estado.tareas;
  const datos = resumen(todas);

  $('#stat-total').textContent = datos.total;
  $('#stat-completadas').textContent = datos.completadas;
  $('#stat-pendientes').textContent = datos.pendientes;
  $('#stat-porcentaje').textContent = `${datos.porcentaje}%`;

  const grafico = $('#grafico-semanal');
  grafico.replaceChildren();

  const hoy = new Date();
  const dias = [];

  for (let i = 6; i >= 0; i--) {
    const fecha = new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      hoy.getDate() - i
    );

    const iso = fechaISO(fecha);

    dias.push({
      iso,
      label: new Intl.DateTimeFormat('es-AR', {
        weekday: 'short'
      }).format(fecha).replace('.', ''),
      cantidad: todas.filter(tarea =>
        tarea.fecha === iso && tarea.completada
      ).length
    });
  }

  const maximo = Math.max(1, ...dias.map(dia => dia.cantidad));

  dias.forEach(dia => {
    const fila = crearElemento('div', 'barra-dia');

    fila.append(
      crearElemento('span', '', dia.label),
      crearElemento('div', 'barra-dia-track'),
      crearElemento('span', 'barra-dia-numero', String(dia.cantidad))
    );

    const relleno = crearElemento('div', 'barra-dia-fill');
    relleno.style.width = `${dia.cantidad / maximo * 100}%`;

    fila.children[1].append(relleno);
    grafico.append(fila);
  });

  const categorias = $('#grafico-categorias');
  categorias.replaceChildren();

  const nombres = ['Personal', 'Estudio', 'Trabajo', 'Salud', 'Hogar', 'Otro'];

  if (!todas.length) {
    categorias.append(
      crearElemento(
        'p',
        'stats-vacio',
        'Cuando agregues tareas, vas a ver acá su distribución por categoría.'
      )
    );

    return;
  }

  const maxCategoria = Math.max(
    1,
    ...nombres.map(nombre =>
      todas.filter(tarea => tarea.categoria === nombre).length
    )
  );

  nombres.forEach(nombre => {
    const cantidad = todas.filter(
      tarea => tarea.categoria === nombre
    ).length;

    if (!cantidad) return;

    const bloque = crearElemento('div', 'categoria-stat');
    const cabecera = crearElemento('div', 'categoria-stat-cabecera');

    cabecera.append(
      crearElemento('span', '', nombre),
      crearElemento(
        'span',
        '',
        `${cantidad} · ${Math.round(cantidad / todas.length * 100)}%`
      )
    );

    const barra = crearElemento('div', 'categoria-track');
    const relleno = crearElemento('div', 'categoria-fill');

    relleno.style.width = `${cantidad / maxCategoria * 100}%`;

    barra.append(relleno);
    bloque.append(cabecera, barra);
    categorias.append(bloque);
  });
}

/* ACTUALIZACIÓN GENERAL */

function renderizarTodo() {
  renderizarInicio();
  renderizarDia();
  renderizarTareas();
  renderizarCalendario();
  renderizarTareasFecha();
  renderizarEstadisticas();
}

/* FORMULARIO: CREAR Y EDITAR */

function abrirModal(id = null, fechaInicial = null) {
  estado.idEditando = id;

  const formulario = $('#form-tarea');
  formulario.reset();

  $('#error-formulario').hidden = true;
  $('#error-formulario').textContent = '';

  const tarea = id
    ? estado.tareas.find(item => item.id === id)
    : null;

  $('#modal-titulo').textContent = tarea ? 'Editar tarea' : 'Nueva tarea';
  $('#guardar-tarea').textContent = tarea ? 'Guardar cambios' : 'Guardar tarea';

  $('#tarea-titulo').value = tarea?.titulo || '';
  $('#tarea-descripcion').value = tarea?.descripcion || '';
  $('#tarea-fecha').value =
    tarea?.fecha || fechaInicial || estado.fechaDia || fechaISO(new Date());

  $('#tarea-categoria').value = tarea?.categoria || 'Personal';
  $('#tarea-hora-inicio').value = tarea?.horaInicio || '';
  $('#tarea-hora-fin').value = tarea?.horaFin || '';
  $('#tarea-prioridad').value = tarea?.prioridad || 'media';

  const modal = $('#modal-tarea');

  if (!modal.open) {
    modal.showModal();
  }

  setTimeout(() => $('#tarea-titulo').focus(), 30);
}

function cerrarModal() {
  const modal = $('#modal-tarea');

  if (modal.open) {
    modal.close();
  }
}

function nuevoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function guardarFormulario(evento) {
  evento.preventDefault();

  const titulo = $('#tarea-titulo').value.trim();
  const fecha = $('#tarea-fecha').value;
  const horaInicio = $('#tarea-hora-inicio').value;
  const horaFin = $('#tarea-hora-fin').value;
  const error = $('#error-formulario');

  error.hidden = true;
  error.textContent = '';

  if (!titulo || !fecha) {
    error.textContent = 'Completá el título y la fecha de la tarea.';
    error.hidden = false;
    return;
  }

  if (horaInicio && horaFin && horaFin < horaInicio) {
    error.textContent = 'La hora de fin no puede ser anterior a la hora de inicio.';
    error.hidden = false;
    return;
  }

  const existente = estado.idEditando
    ? estado.tareas.find(tarea => tarea.id === estado.idEditando)
    : null;

  const tarea = {
    id: existente?.id || nuevoId(),
    titulo,
    descripcion: $('#tarea-descripcion').value.trim(),
    fecha,
    horaInicio,
    horaFin,
    categoria: $('#tarea-categoria').value,
    prioridad: $('#tarea-prioridad').value,
    completada: existente?.completada || false,
    fechaCreacion: existente?.fechaCreacion || new Date().toISOString(),
    fechaCompletada: existente?.fechaCompletada || null
  };

  if (existente) {
    estado.tareas = estado.tareas.map(item =>
      item.id === existente.id ? tarea : item
    );
  } else {
    estado.tareas.push(tarea);
  }

  if (!guardarTareas()) return;

  estado.fechaDia = fecha;
  estado.fechaSeleccionada = fecha;

  const fechaTarea = desdeISO(fecha);

  estado.mesCalendario = new Date(
    fechaTarea.getFullYear(),
    fechaTarea.getMonth(),
    1
  );

  $('#fecha-dia').value = fecha;

  cerrarModal();
  renderizarTodo();

  mostrarAviso(
    existente
      ? 'Tarea actualizada correctamente.'
      : '¡Tarea creada correctamente!'
  );
}

/* COMPLETAR, EDITAR Y ELIMINAR */

function cambiarCompletada(id, completada) {
  const tarea = estado.tareas.find(item => item.id === id);

  if (!tarea) return;

  const estadoAnterior = tarea.completada;
  const fechaAnterior = tarea.fechaCompletada;

  tarea.completada = completada;
  tarea.fechaCompletada = completada ? new Date().toISOString() : null;

  if (!guardarTareas()) {
    tarea.completada = estadoAnterior;
    tarea.fechaCompletada = fechaAnterior;
    renderizarTodo();
    return;
  }

  renderizarTodo();

  mostrarAviso(
    completada
      ? 'Tarea completada.'
      : 'Tarea marcada como pendiente.'
  );
}

function editarTarea(id) {
  if (estado.tareas.some(tarea => tarea.id === id)) {
    abrirModal(id);
  }
}

function eliminarTarea(id) {
  const tarea = estado.tareas.find(item => item.id === id);

  if (!tarea) return;

  const confirmar = window.confirm(
    `¿Querés eliminar la tarea "${tarea.titulo}"?`
  );

  if (!confirmar) return;

  const anteriores = estado.tareas;
  estado.tareas = estado.tareas.filter(item => item.id !== id);

  if (!guardarTareas()) {
    estado.tareas = anteriores;
    renderizarTodo();
    return;
  }

  renderizarTodo();
  mostrarAviso('Tarea eliminada.');
}

/* ACCIONES DE BOTONES */

function ejecutarAccion(accion) {
  switch (accion) {
    case 'agregar-tarea':
      abrirModal(
        null,
        estado.seccionActiva === 'calendario'
          ? estado.fechaSeleccionada
          : estado.seccionActiva === 'dia'
            ? estado.fechaDia
            : null
      );
      break;

    case 'agregar-tarea-fecha':
      abrirModal(null, estado.fechaSeleccionada);
      break;

    case 'cerrar-modal':
      cerrarModal();
      break;

    case 'hoy':
      estado.fechaDia = fechaISO(new Date());
      $('#fecha-dia').value = estado.fechaDia;
      renderizarDia();
      break;

    case 'mes-actual':
      estado.mesCalendario = new Date(
        new Date().getFullYear(),
        new Date().getMonth(),
        1
      );

      estado.fechaSeleccionada = fechaISO(new Date());

      renderizarCalendario();
      renderizarTareasFecha();
      break;
  }
}

/* INICIO DE LA APLICACIÓN */

function iniciar() {
  document.addEventListener('click', evento => {
    const navegacion = evento.target.closest('[data-ir]');

    if (navegacion) {
      irASeccion(navegacion.dataset.ir);
      return;
    }

    const accion = evento.target.closest('[data-accion]');

    if (accion) {
      ejecutarAccion(accion.dataset.accion);
      return;
    }

    const editar = evento.target.closest('[data-editar]');

    if (editar) {
      editarTarea(editar.dataset.editar);
      return;
    }

    const borrar = evento.target.closest('[data-eliminar]');

    if (borrar) {
      eliminarTarea(borrar.dataset.eliminar);
      return;
    }

    const dia = evento.target.closest('[data-fecha]');

    if (dia) {
      estado.fechaSeleccionada = dia.dataset.fecha;

      const fecha = desdeISO(estado.fechaSeleccionada);

      estado.mesCalendario = new Date(
        fecha.getFullYear(),
        fecha.getMonth(),
        1
      );

      renderizarCalendario();
      renderizarTareasFecha();
    }
  });

  document.addEventListener('change', evento => {
    const checkbox = evento.target.closest('[data-tarea-completar]');

    if (checkbox) {
      cambiarCompletada(
        checkbox.dataset.tareaCompletar,
        checkbox.checked
      );
      return;
    }

    if (evento.target.id === 'fecha-dia' && evento.target.value) {
      estado.fechaDia = evento.target.value;
      renderizarDia();
    }
  });

  $('#form-tarea').addEventListener('submit', guardarFormulario);

  $('#buscador').addEventListener('input', renderizarTareas);
  $('#filtro-estado').addEventListener('change', renderizarTareas);
  $('#filtro-prioridad').addEventListener('change', renderizarTareas);

  $('#mes-anterior').addEventListener('click', () => {
    estado.mesCalendario = new Date(
      estado.mesCalendario.getFullYear(),
      estado.mesCalendario.getMonth() - 1,
      1
    );

    renderizarCalendario();
  });

  $('#mes-siguiente').addEventListener('click', () => {
    estado.mesCalendario = new Date(
      estado.mesCalendario.getFullYear(),
      estado.mesCalendario.getMonth() + 1,
      1
    );

    renderizarCalendario();
  });

  window.addEventListener('hashchange', () => {
    mostrarSeccion(location.hash.slice(1) || 'inicio', true);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderizarTodo();
    }
  });

  $('#fecha-dia').value = estado.fechaDia;

  mostrarSeccion(
    SECCIONES.includes(location.hash.slice(1))
      ? location.hash.slice(1)
      : 'inicio',
    false
  );
}

iniciar();