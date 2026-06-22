import * as pdfjsLib from "./pdf.min.mjs";

console.log("[init] popup.js carregado");

try {
  const pdfWorker = new Worker(new URL("./pdf.worker.min.mjs", import.meta.url), { type: "module" });
  pdfjsLib.GlobalWorkerOptions.workerPort = pdfWorker;
  console.log("[init] PDF.js worker criado com sucesso");
} catch (err) {
  console.error("[init] Erro ao criar worker:", err);
}

// Documento PDF em memória para reuso no preview
let pdfDoc = null;
let currentPage = 1;
let selectedFile = null; // arquivo original para envio ao Mantis

function formatTotalValue(value) {
  return value
    .toString()
    .replace(/[^0-9]/g, "")
    .replace(/(\d{2})$/, ",$1")
    .replace(",", ".");
}

async function parsePDF(file) {
  console.log("[parsePDF] inicio, arquivo:", file.name, file.size, "bytes");
  const buffer = await file.arrayBuffer();
  console.log("[parsePDF] arrayBuffer ok, carregando documento...");

  pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;
  console.log("[parsePDF] documento carregado, paginas:", pdfDoc.numPages);

  let text = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }

  console.log("[parsePDF] texto extraido (primeiros 300 chars):", text.slice(0, 300));

  const code = text.match(/Número:\s*(\S+)/)?.[1] || "";
  const date = text.match(/Emissão:\s*(\S+)/)?.[1] || "";
  const rawValue = text.match(/Valor pago R\$:\s*(\S+)/)?.[1] || "";
  const vlTotal = rawValue ? formatTotalValue(rawValue) : "";

  console.log("[parsePDF] valores extraidos:", { code, date, vlTotal });
  return { code, date, vlTotal };
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status" + (isError ? " error" : "");
  console.log("[status]", msg);
}

// Upload — sem fileInput.click() via JS (fecha popup no Chrome)
const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");

console.log("[init] fileInput:", fileInput, "uploadArea:", uploadArea);

uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "#005b97";
});

uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.borderColor = "";
});

uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  console.log("[drop] arquivo solto");
  const file = e.dataTransfer.files[0];
  if (file?.type === "application/pdf") handleFile(file);
  else setStatus("Somente arquivos PDF são aceitos.", true);
});

fileInput.addEventListener("change", () => {
  console.log("[change] arquivo selecionado:", fileInput.files[0]?.name);
  if (fileInput.files[0]) handleFile(fileInput.files[0]);
});

async function handleFile(file) {
  selectedFile = file;
  console.log("[handleFile] inicio:", file.name);
  setStatus("Lendo PDF...");
  uploadArea.classList.add("has-file");
  uploadArea.querySelector(".upload-label").innerHTML =
    `📄 ${file.name} <span>clique para trocar</span>`;

  try {
    const data = await parsePDF(file);

    document.getElementById("f-code").value = data.code;
    document.getElementById("f-date").value = data.date;
    document.getElementById("f-vlTotal").value = data.vlTotal;
    document.getElementById("preview-filename").textContent = file.name;

    const formSection = document.getElementById("form-section");
    formSection.classList.add("visible");
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });

    setStatus("PDF lido com sucesso.");
    console.log("[handleFile] form exibido com dados:", data);
  } catch (err) {
    console.error("[handleFile] erro:", err);
    setStatus("Erro ao ler o PDF: " + err.message, true);
  }
}

// ── Renomear pasta ───────────────────────────────────────

function setRenameStatus(msg, isError = false) {
  const el = document.getElementById("rename-status");
  el.textContent = msg;
  el.className = "rename-status" + (isError ? " error" : "");
}

document.getElementById("btn-renamer").addEventListener("click", async () => {
  let dirHandle;
  try {
    dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });
  } catch (err) {
    if (err.name !== "AbortError") setRenameStatus("Erro: " + err.message, true);
    return;
  }

  // Coleta todos os arquivos com lastModified (mais próximo de birthtime no browser)
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file") {
      const file = await handle.getFile();
      files.push({ handle, name, lastModified: file.lastModified });
    }
  }

  if (!files.length) {
    setRenameStatus("Nenhum arquivo encontrado.", true);
    return;
  }

  // Ordena por data de modificação (mais antigos primeiro) — equivalente ao birthtime
  files.sort((a, b) => a.lastModified - b.lastModified);
  setRenameStatus(`Renomeando ${files.length} arquivo(s)...`);

  // Passo 1: renomeia todos para nomes temporários (evita colisões)
  for (let i = 0; i < files.length; i++) {
    const ext = files[i].name.includes(".") ? "." + files[i].name.split(".").pop() : "";
    await files[i].handle.move(`__tmp__${i}${ext}`);
    files[i].ext = ext;
  }

  // Passo 2: renomeia temporários para 1.ext, 2.ext, …
  for (let i = 0; i < files.length; i++) {
    await files[i].handle.move(`${i + 1}${files[i].ext}`);
  }

  setRenameStatus(`${files.length} arquivo(s) renomeados com sucesso.`);
});

// ── Preview ──────────────────────────────────────────────

let zoomScale = 1.0;
const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 3.0;
let currentRenderTask = null;

async function renderPage(pageNum) {
  if (!pdfDoc) return;

  // Cancela render em andamento antes de iniciar novo
  if (currentRenderTask) {
    currentRenderTask.cancel();
    currentRenderTask = null;
  }

  const page = await pdfDoc.getPage(pageNum);
  const canvas = document.getElementById("preview-canvas");
  const scroll = document.getElementById("preview-scroll");

  // Escala base = PDF cabe exatamente na largura do container (zoom 1.0)
  const naturalViewport = page.getViewport({ scale: 1 });
  const baseScale = (scroll.clientWidth - 16) / naturalViewport.width;
  const finalScale = baseScale * zoomScale;
  const viewport = page.getViewport({ scale: finalScale });

  // Define o tamanho real do canvas em pixels
  canvas.width  = viewport.width;
  canvas.height = viewport.height;
  // Tamanho CSS igual ao tamanho real (sem escalonamento pelo browser)
  canvas.style.width  = viewport.width  + "px";
  canvas.style.height = viewport.height + "px";

  currentRenderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
  try {
    await currentRenderTask.promise;
  } catch (err) {
    if (err?.name !== "RenderingCancelledException") throw err;
    return; // render cancelado — ignora
  }
  currentRenderTask = null;

  currentPage = pageNum;
  document.getElementById("page-info").textContent   = `${pageNum} / ${pdfDoc.numPages}`;
  document.getElementById("btn-prev-page").disabled  = pageNum <= 1;
  document.getElementById("btn-next-page").disabled  = pageNum >= pdfDoc.numPages;
  document.getElementById("zoom-level").textContent  = Math.round(zoomScale * 100) + "%";
  document.getElementById("btn-zoom-out").disabled   = zoomScale <= ZOOM_MIN;
  document.getElementById("btn-zoom-in").disabled    = zoomScale >= ZOOM_MAX;
}

function closePreview() {
  document.getElementById("preview-modal").classList.remove("open");
}

document.getElementById("btn-preview").addEventListener("click", async () => {
  if (!selectedFile) return;

  // Salva o PDF em base64 no session storage para a janela de preview ler
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(selectedFile);
  });
  await chrome.storage.session.set({ previewPdf: base64 });

  // Abre a janela de preview ao lado esquerdo do popup
  const popupWin   = await chrome.windows.getCurrent();
  const previewW   = 520;
  const previewH   = popupWin.height;
  const previewLeft= popupWin.left - previewW - 10;
  const previewTop = popupWin.top;

  chrome.windows.create({
    url: chrome.runtime.getURL("preview.html"),
    type: "popup",
    width:  previewW,
    height: previewH,
    left:   Math.max(0, previewLeft),
    top:    previewTop,
    focused: false, // mantém o foco no popup principal
  });
});

document.getElementById("btn-close-preview").addEventListener("click", closePreview);
document.getElementById("btn-close-preview-nav").addEventListener("click", closePreview);

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.getElementById("preview-modal").classList.contains("open")) {
    closePreview();
  }
});

document.getElementById("btn-prev-page").addEventListener("click", () => renderPage(currentPage - 1));
document.getElementById("btn-next-page").addEventListener("click", () => renderPage(currentPage + 1));

// ── Drag to pan ──────────────────────────────────────────

const previewScroll = document.getElementById("preview-scroll");
let isDragging = false;
let dragStartX, dragStartY, scrollStartX, scrollStartY;

previewScroll.addEventListener("mousedown", (e) => {
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  scrollStartX = previewScroll.scrollLeft;
  scrollStartY = previewScroll.scrollTop;
  previewScroll.classList.add("dragging");
  e.preventDefault();
});

window.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  previewScroll.scrollLeft = scrollStartX - (e.clientX - dragStartX);
  previewScroll.scrollTop  = scrollStartY - (e.clientY - dragStartY);
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  previewScroll.classList.remove("dragging");
});

previewScroll.addEventListener("wheel", async (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  const next = +(zoomScale + delta).toFixed(2);
  if (next < ZOOM_MIN || next > ZOOM_MAX) return;
  zoomScale = next;
  await renderPage(currentPage);
}, { passive: false });

document.getElementById("btn-zoom-in").addEventListener("click", async () => {
  if (zoomScale >= ZOOM_MAX) return;
  zoomScale = Math.min(ZOOM_MAX, +(zoomScale + ZOOM_STEP).toFixed(2));
  await renderPage(currentPage);
});

document.getElementById("btn-zoom-out").addEventListener("click", async () => {
  if (zoomScale <= ZOOM_MIN) return;
  zoomScale = Math.max(ZOOM_MIN, +(zoomScale - ZOOM_STEP).toFixed(2));
  await renderPage(currentPage);
});

// Lançar Diária
document.getElementById("btn-lancar").addEventListener("click", async () => {
  const data = {
    code: document.getElementById("f-code").value.trim(),
    date: document.getElementById("f-date").value.trim(),
    vlTotal: document.getElementById("f-vlTotal").value.trim(),
    type: document.getElementById("f-type").value,
    priority: document.getElementById("f-priority").value,
  };

  // Converte o arquivo selecionado para base64 para passar ao content script
  if (selectedFile) {
    data.fileName = selectedFile.name;
    data.fileBase64 = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // "data:application/pdf;base64,..."
      reader.readAsDataURL(selectedFile);
    });
  }

  console.log("[lancar] dados:", { ...data, fileBase64: data.fileBase64 ? "[base64]" : null });
  setStatus("Preenchendo formulário...");

  // Busca a aba do Mantis em qualquer janela (a extensão roda em janela própria)
  let [tab] = await chrome.tabs.query({ url: "https://mantis-br.nttdata-solutions.com/*" });

  if (!tab) {
    // Fallback: aba ativa que não seja a própria extensão
    const allActive = await chrome.tabs.query({ active: true });
    tab = allActive.find((t) => !t.url?.startsWith("chrome-extension://"));
  }

  if (!tab) {
    setStatus("Nenhuma aba do Mantis encontrada.", true);
    return;
  }

  console.log("[lancar] aba alvo:", tab.url);

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: fillForm,
      args: [data],
    });
    setStatus("Formulário preenchido!");
  } catch (err) {
    console.error("[lancar] erro:", err);
    setStatus("Erro: " + err.message, true);
  }
});

// Função injetada na página do Mantis (mesma lógica do fillDiaria.console.js)
function fillForm(data) {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) { console.warn(`Não encontrado: ${selector}`); return; }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function selectOption(selectSel, panelSel, text) {
    const sel = document.querySelector(selectSel);
    if (!sel) { console.warn(`Select não encontrado: ${selectSel}`); return; }
    sel.click();
    await delay(600);
    const opt = [...document.querySelectorAll(`${panelSel} .mat-mdc-option`)]
      .find((o) => o.textContent.trim().includes(text));
    if (!opt) { console.warn(`Opção "${text}" não encontrada`); return; }
    opt.click();
    await delay(300);
  }

  function getDescription(type) {
    switch (type) {
      case "Meal": return "Refeição.";
      case "Mercado": return "Mercado.";
      case "Combustível": return "Abastecimento do veículo.";
      default: return "";
    }
  }

  return (async () => {
    if (data.priority) await selectOption("mat-select#priority-select", "#priority-select-panel", data.priority);
    const description = getDescription(data.type);
    if (description) setInput("textarea#description-textarea", description);
    if (data.type) await selectOption("mat-select#expenseType-select", "#expenseType-select-panel", data.type);
    if (data.date) setInput("#-from", data.date);
    if (data.code) setInput("#document-number", data.code);
    if (data.vlTotal) setInput("#value", data.vlTotal);

    if (data.fileBase64 && data.fileName) {
      // Remove arquivos já anexados clicando em todos os botões "Remover"
      const removerBtns = [...document.querySelectorAll("a, button, span")]
        .filter((el) => el.textContent.trim() === "Remover");

      for (const btn of removerBtns) {
        btn.click();
        await delay(400);
      }

      // Aguarda a UI limpar antes de adicionar o novo arquivo
      await delay(300);

      const res  = await fetch(data.fileBase64);
      const blob = await res.blob();
      const file = new File([blob], data.fileName, { type: "application/pdf" });
      const dt   = new DataTransfer();
      dt.items.add(file);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input",  { bubbles: true }));
      }
    }
  })();
}
