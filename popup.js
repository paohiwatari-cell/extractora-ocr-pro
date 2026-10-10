const state = {
  images: [],
  selected: new Set(),
  processed: [],
  log: []
};

const elements = {
  totalCount: document.getElementById('totalCount'),
  selectedCount: document.getElementById('selectedCount'),
  processedCount: document.getElementById('processedCount'),
  imageList: document.getElementById('imageList'),
  resultTable: document.getElementById('resultTable'),
  filterInput: document.getElementById('filterInput'),
  logPanel: document.getElementById('logPanel')
};

function addLog(message) {
  const stamp = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  state.log.unshift(`${stamp}: ${message}`);
  renderLog();
}

function renderLog() {
  elements.logPanel.innerHTML = state.log.slice(0, 8).map((entry) => `<div>${entry}</div>`).join('') || '<div class="empty-state">Sin actividad.</div>';
}

function updateCounts() {
  elements.totalCount.textContent = String(state.images.length);
  elements.selectedCount.textContent = String(state.selected.size);
  elements.processedCount.textContent = String(state.processed.length);
}

function normalizeText(value) {
  return (value || '').toString().trim();
}

function buildImageMarkup(image) {
  const alt = normalizeText(image.alt) || 'Sin texto alternativo';
  const type = image.type || 'imagen';
  const title = normalizeText(image.title) || alt;
  const url = image.url || 'URL no disponible';

  return `
    <div class="image-item" data-id="${image.id}">
      <img src="${image.url}" alt="${title}" />
      <div class="image-meta">
        <div class="image-title">${title}</div>
        <label>${type}</label>
        <div>${url}</div>
      </div>
      <input class="checkbox" type="checkbox" data-check="${image.id}" ${state.selected.has(image.id) ? 'checked' : ''} />
    </div>
  `;
}

function renderImageList() {
  const query = elements.filterInput.value.toLowerCase();
  const filtered = state.images.filter((image) => {
    const haystack = `${image.alt || ''} ${image.title || ''} ${image.url || ''} ${image.type || ''}`.toLowerCase();
    return haystack.includes(query);
  });

  if (!filtered.length) {
    elements.imageList.innerHTML = '<div class="empty-state">No hay imágenes para mostrar.</div>';
    return;
  }

  elements.imageList.innerHTML = filtered.map(buildImageMarkup).join('');

  document.querySelectorAll('[data-check]').forEach((checkbox) => {
    checkbox.addEventListener('change', (event) => {
      const id = event.target.getAttribute('data-check');
      if (event.target.checked) {
        state.selected.add(id);
      } else {
        state.selected.delete(id);
      }
      updateCounts();
    });
  });
}

function renderResultTable() {
  const rows = state.processed;
  if (!rows.length) {
    elements.resultTable.innerHTML = '<div class="empty-state">Todavía no se procesó ninguna imagen.</div>';
    return;
  }

  const headers = ['Proveedor', 'Modelo', 'Talle', 'Medida', 'Unidad', 'Estado', 'Fuente'];

  const tableHtml = `
    <table>
      <thead>
        <tr>
          ${headers.map((header) => `<th>${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows.map((item) => `
          <tr>
            <td>${item.provider || 'Desconocido'}</td>
            <td>${item.model || '—'}</td>
            <td>${item.size || '—'}</td>
            <td>${item.measure || '—'}</td>
            <td>${item.unit || 'cm'}</td>
            <td><span class="status-badge ${item.status === 'verificado' ? 'status-verificado' : item.status === 'dudoso' ? 'status-dudoso' : 'status-pendiente'}">${item.status || 'pendiente'}</span></td>
            <td>${item.source || 'N/A'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  elements.resultTable.innerHTML = tableHtml;
}

function saveToStorage() {
  chrome.storage.local.set({ extractorData: { images: state.images, processed: state.processed } }, () => {
    addLog('Resultados guardados localmente.');
  });
}

function readFromStorage() {
  chrome.storage.local.get(['extractorData'], (result) => {
    if (result.extractorData) {
      state.images = result.extractorData.images || [];
      state.processed = result.extractorData.processed || [];
      state.selected = new Set(state.images.filter((image) => image.selected).map((image) => image.id));
      renderImageList();
      updateCounts();
      renderResultTable();
      addLog('Se restauraron datos almacenados.');
    }
  });
}

async function sendAnalyzeMessage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    addLog('No se pudo identificar la pestaña activa.');
    return;
  }

  chrome.tabs.sendMessage(tab.id, { type: 'analyze-page' }, (response) => {
    if (chrome.runtime.lastError) {
      addLog('No fue posible comunicarse con la página actual.');
      return;
    }

    const images = response?.images || [];
    state.images = images.map((image, index) => ({ ...image, id: `${image.url || index}-${index}` }));
    state.selected = new Set(state.images.map((img) => img.id));
    updateCounts();
    renderImageList();
    addLog(`Se detectaron ${state.images.length} imágenes.`);
  });
}

async function processSelectedImages() {
  const selectedImages = state.images.filter((image) => state.selected.has(image.id));

  if (!selectedImages.length) {
    addLog('No hay imágenes seleccionadas para procesar.');
    return;
  }

  state.processed = [];
  for (const image of selectedImages) {
    const result = await LocalOCR.processImage(image);
    state.processed.push({
      provider: result.provider,
      model: result.model,
      size: result.size || '—',
      measure: result.measure || '—',
      unit: result.unit || 'cm',
      status: result.status || 'pendiente',
      source: result.sourceUrl || image.url
    });
    addLog(`Procesada: ${result.model || image.url}`);
  }

  renderResultTable();
  updateCounts();
  saveToStorage();
}

function exportCsv() {
  if (!state.processed.length) {
    addLog('No hay resultados para exportar.');
    return;
  }

  const header = ['Proveedor', 'Modelo', 'Talle', 'Medida', 'Unidad', 'Estado', 'Fuente'];
  const rows = state.processed.map((item) => [
    item.provider || '',
    item.model || '',
    item.size || '',
    item.measure || '',
    item.unit || '',
    item.status || '',
    item.source || ''
  ]);

  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extractora_ocr_pro.csv';
  a.click();
  URL.revokeObjectURL(url);
  addLog('Archivo CSV descargado.');
}

function exportJson() {
  if (!state.processed.length) {
    addLog('No hay resultados para exportar.');
    return;
  }

  const blob = new Blob([JSON.stringify(state.processed, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'extractora_ocr_pro.json';
  a.click();
  URL.revokeObjectURL(url);
  addLog('Archivo JSON descargado.');
}

document.getElementById('analyzePageBtn').addEventListener('click', sendAnalyzeMessage);
document.getElementById('detectAllBtn').addEventListener('click', () => {
  state.selected = new Set(state.images.map((image) => image.id));
  updateCounts();
  renderImageList();
  addLog('Se seleccionaron todas las imágenes detectadas.');
});
document.getElementById('selectTableBtn').addEventListener('click', () => {
  state.selected = new Set(state.images.filter((image) => /talle|size|medida|tabla|measure|manga|cintura|pecho|ancho|largo/i.test(`${image.alt || ''} ${image.title || ''} ${image.url || ''}`)).map((image) => image.id));
  updateCounts();
  renderImageList();
  addLog('Se marcaron imágenes con alta probabilidad de tabla.');
});
document.getElementById('processAllBtn').addEventListener('click', processSelectedImages);
document.getElementById('saveBtn').addEventListener('click', saveToStorage);
document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);
document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
document.getElementById('filterInput').addEventListener('input', renderImageList);

readFromStorage();
renderLog();
updateCounts();
