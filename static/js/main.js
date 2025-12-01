document.addEventListener("DOMContentLoaded", function () {
  
// LÓGICA DE NAVEGACIÓN (SIDEBAR)
  const menuCorpus = document.getElementById("menu-corpus");
  const menuBuscador = document.getElementById("menu-buscador");
  const sectionCorpus = document.getElementById("section-corpus");
  const sectionSearch = document.getElementById("section-search");
  const pageTitle = document.getElementById("page-title");

  menuCorpus.addEventListener("click", (e) => {
      e.preventDefault();
      // Activar menú
      menuCorpus.classList.add("active");
      menuBuscador.classList.remove("active");
      // Mostrar sección
      sectionCorpus.style.display = "block";
      sectionSearch.style.display = "none";
      pageTitle.innerText = "Gestión de Corpus y Procesamiento";
  });

  menuBuscador.addEventListener("click", (e) => {
      e.preventDefault();
      // Activar menú
      menuBuscador.classList.add("active");
      menuCorpus.classList.remove("active");
      // Mostrar sección
      sectionCorpus.style.display = "none";
      sectionSearch.style.display = "block";
      pageTitle.innerText = "Buscador y Visualización";
      
      // Cargar diccionarios al entrar aquí
      loadDiccionarios();
  });
  
  // Modificar también el redirect automático al procesar:
  // Donde antes tenías: document.getElementById("tab2-tab").click();
  //  
  
  // ============================================
  // 1. REFERENCIAS AL DOM
  // ============================================
  const corpusListEl = document.getElementById("corpusList");
  const documentsContainer = document.getElementById("documentsContainer");
  const selectedCorpusInput = document.getElementById("selectedCorpus");
  const processBtn = document.getElementById("processBtn");
  const statusBox = document.getElementById("statusBox");
  
  // Elementos de la Pestaña 2
  const diccionariosContainer = document.getElementById("diccionariosListContainer"); // CAMBIO: Usamos el contenedor de tarjetas
  const graphSummary = document.getElementById("graphSummary");
  const graphView = document.getElementById("graphView");
  const definitionInput = document.getElementById("definitionInput");
  const searchBtn = document.getElementById("searchBtn");
  const resultsList = document.getElementById("resultsList");

  // Prefijo URL
  let locationPathName = location.pathname;
  if (locationPathName === "/") locationPathName = "";

  // ============================================
  // 2. VARIABLES DE ESTADO
  // ============================================
  let selectedCorpus = null;
  let currentDocuments = [];
  let currentDiccionario = null; // IMPORTANTE: Esta variable habilita la búsqueda

  let lastMetaRes = null;
  let lastFilterSelection = {};
  let globalSelectedDocs = new Set();

  // ============================================
  // 3. LOGICA PESTAÑA 1 (CORPUS Y DOCUMENTOS) - IGUAL AL ORIGINAL
  // ============================================
  
  // Cargar lista de Corpus
  fetch(locationPathName + "/api/corpora")
    .then(r => r.json())
    .then(res => {
      if (res.ok) {
        res.data.forEach(c => {
          const li = document.createElement("li");
          li.className = "list-group-item list-group-item-action"; // Añadí estilo bootstrap
          li.innerText = c.nombre;
          li.dataset.id = c.id;

          li.addEventListener("click", function () {
            document.querySelectorAll("#corpusList .list-group-item").forEach(x =>
              x.classList.remove("active")
            );
            this.classList.add("active");

            selectedCorpus = { id: c.id, nombre: c.nombre };
            selectedCorpusInput.value = c.nombre;

            globalSelectedDocs.clear();
            lastFilterSelection = {};
            loadDocuments(c.id);
          });
          corpusListEl.appendChild(li);
        });
      } else {
        corpusListEl.innerHTML = "<li class='list-group-item text-danger'>Error cargando corpora</li>";
      }
    });

  // Cargar Documentos
  function loadDocuments(corpusId) {
    documentsContainer.innerHTML = "<p class='text-muted'>Cargando documentos...</p>";
    fetch(locationPathName + `/api/metadatos/${corpusId}`)
      .then(r => r.json())
      .then(metaRes => {
        lastMetaRes = metaRes;
        renderDocuments(corpusId, metaRes);
      });
  }

  function renderDocuments(corpusId, metaRes, filteredDocs = null) {
    let metaPanel = "";
    if (metaRes.ok) {
      metaPanel = `
      <div class="mb-2 p-2 border rounded bg-light">
        <label class="form-label small mb-1"><b>Filtrar por metadatos:</b></label>
        <div id="multiMetaPanel" class="mb-2">
          ${metaRes.data.map((m, i) => {
              const selectedVal = lastFilterSelection[m.nombre] || "";
              return `
            <div class="input-group input-group-sm mb-2">
              <span class="input-group-text">${m.nombre}</span>
              <select id="valor_${i}" class="form-select" data-meta="${m.nombre}">
                <option value="">--Cualquiera--</option>
                ${m.valores.map(v => `<option value="${v}" ${selectedVal === v ? "selected" : ""}>${v}</option>`).join("")}
              </select>
            </div>`;
            }).join("")}
        </div>
      </div>`;
    }

    if (!filteredDocs) {
      fetch(locationPathName + `/api/documentos/${corpusId}`)
        .then(r => r.json())
        .then(res => {
          if (res.ok) showDocuments(res.data, corpusId, metaPanel);
          else documentsContainer.innerHTML = `<p class="text-danger">${res.error}</p>`;
        });
    } else {
      showDocuments(filteredDocs, corpusId, metaPanel);
    }
  }

  function showDocuments(docs, corpusId, metaPanel) {
    currentDocuments = docs;
    let html = metaPanel;

    // Alerta de seleccionados
    if (globalSelectedDocs.size > 0) {
      html += `<div class='alert alert-info mb-3 selected-docs-alert'>
        <strong>${globalSelectedDocs.size} documentos seleccionados.</strong>
      </div>`;
    }

    if (docs.length === 0) {
      documentsContainer.innerHTML = metaPanel + "<p class='text-muted'>No hay documentos.</p>";
      return;
    }

    html += `
    <div class='mb-2'>
      <button id='selectAllDocs' class='btn btn-sm btn-outline-secondary'>Seleccionar visibles</button>
      <button id='clearAllDocs' class='btn btn-sm btn-outline-secondary'>Deseleccionar visibles</button>
    </div>`;

    const container = document.createElement("div");
    container.innerHTML = html;
    const list = document.createElement("div");

    docs.forEach(doc => {
      const fila = document.createElement("div");
      fila.className = "form-check";
      const checked = globalSelectedDocs.has(doc.id) ? "checked" : "";

      fila.innerHTML = `
      <input class="form-check-input doc-check" type="checkbox" value="${doc.id}" id="doc_${doc.id}" ${checked}>
      <label class="form-check-label" for="doc_${doc.id}">${doc.archivo}</label>
    `;
      list.appendChild(fila);
    });

    container.appendChild(list);
    documentsContainer.innerHTML = "";
    documentsContainer.appendChild(container);

    // Listeners selección
    document.getElementById("selectAllDocs").addEventListener("click", () => {
      document.querySelectorAll(".doc-check").forEach(cb => { cb.checked = true; globalSelectedDocs.add(parseInt(cb.value)); });
      loadDocuments(corpusId);
    });
    document.getElementById("clearAllDocs").addEventListener("click", () => {
      document.querySelectorAll(".doc-check").forEach(cb => { cb.checked = false; globalSelectedDocs.delete(parseInt(cb.value)); });
      loadDocuments(corpusId);
    });
    document.querySelectorAll(".doc-check").forEach(cb => cb.addEventListener("change", e => {
        const id = parseInt(cb.value);
        if (cb.checked) globalSelectedDocs.add(id);
        else globalSelectedDocs.delete(id);
    }));

    // Listeners Filtros
    document.querySelectorAll("#multiMetaPanel select").forEach(select => {
        select.addEventListener("change", applyFilters);
    });
  }

  function applyFilters() {
    const corpusId = selectedCorpus?.id;
    if (!corpusId) return;
    const selects = document.querySelectorAll("#multiMetaPanel select");
    const metas = []; const valores = [];
    lastFilterSelection = {};

    selects.forEach(sel => {
      if (sel.value) {
        metas.push(sel.dataset.meta); valores.push(sel.value);
        lastFilterSelection[sel.dataset.meta] = sel.value;
      }
    });

    if (metas.length === 0) { loadDocuments(corpusId); return; }

    documentsContainer.innerHTML = "<p class='text-muted'>Aplicando filtros...</p>";
    fetch(locationPathName + `/api/documentos/${corpusId}?meta=${encodeURIComponent(metas.join(","))}&valor=${encodeURIComponent(valores.join(","))}`)
      .then(r => r.json())
      .then(fres => {
        if (fres.ok) renderDocuments(corpusId, lastMetaRes, fres.data);
        else documentsContainer.innerHTML = `<p class='text-danger'>${fres.error}</p>`;
      });
  }

  // PROCESAR
  processBtn.addEventListener("click", function () {
    if (!selectedCorpus) { alert("Selecciona un corpus."); return; }
    if (globalSelectedDocs.size === 0) { alert("Selecciona documentos."); return; }

    const dicName = prompt("Introduce un nombre para este diccionario:", "NuevoDiccionario");
    if (!dicName) return;

    statusBox.innerText = "Procesando corpus...";
    processBtn.disabled = true;

    fetch(locationPathName + "/api/process", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ corpus_id: selectedCorpus.id, doc_ids: Array.from(globalSelectedDocs), dic_name: dicName })
    })
      .then(r => r.json())
      .then(res => {
        processBtn.disabled = false;
        if (res.ok) {
          statusBox.innerText = res.message;
          currentDiccionario = dicName; // Establecer diccionario actual
          
          graphSummary.innerHTML = `<strong>Nodos:</strong> ${res.graph.nodes.length} — <strong>Aristas:</strong> ${res.graph.edges.length}`;
          renderGraphPreview(res.graph); // Tu función original
          
          alert("Diccionario guardado.");
          document.getElementById("tab2-tab").click(); // Ir a pestaña 2
        } else {
          statusBox.innerText = "Error: " + res.error;
        }
      });
  });

  // ============================================
  // 4. GESTIÓN DE DICCIONARIOS Y BÚSQUEDA (MODIFICADO PARA CARDS)
  // ============================================

  // Función para listar diccionarios (adaptada a Cards)
  async function loadDiccionarios() {
    if(!diccionariosContainer) return; // Protección

    diccionariosContainer.innerHTML = "<div class='text-center text-muted'>Cargando...</div>";
    
    try {
      const res = await fetch(locationPathName + "/api/diccionarios");
      const data = await res.json();

      diccionariosContainer.innerHTML = ""; // Limpiar

      if (data.ok && data.data.length > 0) {
        data.data.forEach(d => {
            renderDiccionarioCard(d); // Crear tarjeta
        });
      } else {
        diccionariosContainer.innerHTML = "<p class='text-center text-muted'>No hay diccionarios guardados.</p>";
      }
    } catch (e) {
      diccionariosContainer.innerHTML = "<p class='text-danger'>Error de conexión</p>";
    }
  }

  // Función para dibujar CADA tarjeta (Nueva)
  function renderDiccionarioCard(dicData) {
    const card = document.createElement("div");
    card.className = "diccionario-card"; // Usa el estilo CSS que añadiste
    
    // Determinar si es el activo
    const isActive = (currentDiccionario === dicData.nombre);
    const bgClass = isActive ? "bg-light border-primary" : "";

    card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center ${bgClass} p-2 rounded mb-2">
            <strong>${dicData.nombre}</strong>
            ${isActive ? '<span class="badge bg-primary">Activo</span>' : ''}
        </div>
        <div class="d-flex gap-2">
            <button class="btn btn-sm btn-outline-primary flex-grow-1 btn-load">Cargar</button>
            <button class="btn btn-sm btn-outline-danger btn-delete">🗑️</button>
        </div>
    `;

    // 1. Evento Cargar
    card.querySelector(".btn-load").addEventListener("click", () => cargarDiccionario(dicData.nombre));
    
    // 2. Evento Eliminar
    card.querySelector(".btn-delete").addEventListener("click", () => eliminarDiccionario(dicData.nombre));

    diccionariosContainer.appendChild(card);
  }

  // Cargar Diccionario (Lógica antigua adaptada)
  async function cargarDiccionario(nombre) {
    graphSummary.innerHTML = "Cargando...";
    const res = await fetch(locationPathName + "/api/load_diccionario", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre })
    });
    const data = await res.json();

    if (data.ok) {
      currentDiccionario = nombre; // IMPORTANTE: Actualizamos la variable global para la búsqueda
      
      graphSummary.innerHTML = `<strong>Diccionario:</strong> ${nombre} (Nodos: ${data.graph.nodes.length})`;
      renderGraphPreview(data.graph); // Usamos tu visualización original
      loadDiccionarios(); // Recargar lista para actualizar el badge de "Activo"
    } else {
      alert("Error: " + data.error);
    }
  }

  // Eliminar Diccionario (Nueva funcionalidad)
  async function eliminarDiccionario(nombre) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;

    const res = await fetch(locationPathName + "/api/delete_diccionario", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre })
    });
    const data = await res.json();

    if (data.ok) {
        if (currentDiccionario === nombre) {
            currentDiccionario = null;
            graphSummary.innerText = "Ninguno cargado";
            graphView.innerHTML = "";
            resultsList.innerHTML = "";
        }
        loadDiccionarios(); // Refrescar lista
    } else {
        alert("Error al eliminar: " + data.error);
    }
  }

  // ============================================
  // 5. BÚSQUEDA (ARREGLADO)
  // ============================================
  searchBtn.addEventListener("click", function () {
    const def = definitionInput.value.trim();
    if (!def) { alert("Introduce una definición."); return; }

    // Validación crítica: Verificamos que la variable global tenga valor
    if (!currentDiccionario) {
      alert("Selecciona y CARGA un diccionario de la lista de la izquierda primero.");
      return;
    }

    resultsList.innerHTML = "<li>Cargando...</li>";

    fetch(locationPathName + "/api/search", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        definition: def,
        top_k: 15,
        diccionario: currentDiccionario // Enviamos el nombre correcto
      })
    })
      .then(r => r.json())
      .then(res => {
        if (res.ok) {
          resultsList.innerHTML = "";
          res.results.forEach(r => {
            const li = document.createElement("li");
            li.className = "list-group-item"; // Estilo simple
            li.innerHTML = `<b>${r.palabra}</b> <span class="text-muted small">(Score: ${r.score.toFixed(4)})</span>`;
            resultsList.appendChild(li);
          });
        } else {
          resultsList.innerHTML = `<li class="text-danger">${res.error}</li>`;
        }
      });
  });

  // ============================================
  // 6. VISUALIZACIÓN ORIGINAL (LA QUE QUERÍAS)
  // ============================================
  function renderGraphPreview(graphJson) {
    graphView.innerHTML = "";

    const summary = document.createElement("div");
    summary.innerHTML = `
      <p><strong>Nodos (muestra):</strong> ${graphJson.nodes.length}</p>
      <p><strong>Aristas (muestra):</strong> ${graphJson.edges.length}</p>`;
    graphView.appendChild(summary);

    const ul = document.createElement("ul");
    ul.style.maxHeight = "300px";
    ul.style.overflow = "auto";

    // Mostramos lista simple como antes
    graphJson.nodes.slice(0, 100).forEach(n => {
      const li = document.createElement("li");
      li.innerText = `${n.id} (f:${n.frequency}, d:${n.degree})`;
      ul.appendChild(li);
    });

    graphView.appendChild(ul);
  }

  // Inicializar Pestaña 2 al hacer click
  document.getElementById("tab2-tab").addEventListener("click", function () {
    loadDiccionarios();
  });

});