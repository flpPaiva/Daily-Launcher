import { state } from "./state.js";
import { extractInvoiceData } from "./pdf.js";

const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const uploadLabel = uploadArea.querySelector(".upload-label");

const EMPTY_LABEL = `<span class="material-symbols-outlined upload-icon">upload_file</span>Clique para selecionar o PDF<span class="upload-hint">ou arraste aqui</span>`;

export function setStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.textContent = msg;
  el.className = "status" + (isError ? " error" : "");
}

function updateFileNav() {
  const nav = document.getElementById("file-nav");
  const info = document.getElementById("file-nav-info");
  const prevBtn = document.getElementById("btn-prev-file");
  const nextBtn = document.getElementById("btn-next-file");

  if (state.selectedFiles.length > 1) {
    nav.classList.add("visible");
    info.textContent = `Arquivo ${state.currentFileIndex + 1} de ${state.selectedFiles.length}`;
    prevBtn.disabled = state.currentFileIndex === 0;
    nextBtn.disabled = state.currentFileIndex === state.selectedFiles.length - 1;
  } else {
    nav.classList.remove("visible");
  }
}

async function handleFile(file) {
  state.selectedFile = file;
  setStatus("Lendo PDF...");
  uploadArea.classList.add("has-file");
  uploadLabel.innerHTML = `<span class="material-symbols-outlined upload-icon">description</span>${file.name}<span class="upload-hint">clique para trocar</span>`;

  try {
    const data = await extractInvoiceData(file);

    document.getElementById("f-code").value = data.code;
    document.getElementById("f-date").value = data.date;
    document.getElementById("f-vlTotal").value = data.vlTotal;

    const formSection = document.getElementById("form-section");
    formSection.classList.add("visible");
    formSection.scrollIntoView({ behavior: "smooth", block: "start" });

    setStatus("PDF lido com sucesso.");
  } catch (err) {
    setStatus("Erro ao ler o PDF: " + err.message, true);
  }
}

function selectFileAt(index) {
  state.currentFileIndex = index;
  updateFileNav();
  handleFile(state.selectedFiles[index]);
}

export function goToNextFile() {
  if (state.currentFileIndex < state.selectedFiles.length - 1) {
    selectFileAt(state.currentFileIndex + 1);
    return true;
  }
  return false;
}

export function resetLauncher() {
  state.selectedFile = null;
  state.selectedFiles = [];
  state.currentFileIndex = 0;

  fileInput.value = "";
  uploadArea.classList.remove("has-file");
  uploadLabel.innerHTML = EMPTY_LABEL;

  document.getElementById("form-section").classList.remove("visible");
  document.getElementById("file-nav").classList.remove("visible");
  setStatus("");
}

async function openPreviewWindow() {
  if (!state.selectedFile) return;

  // Salva o PDF em base64 no session storage para a janela de preview ler
  const base64 = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(state.selectedFile);
  });
  await chrome.storage.session.set({ previewPdf: base64 });

  // Abre a janela de preview ao lado esquerdo do popup
  const popupWin = await chrome.windows.getCurrent();
  const previewWidth = 520;
  const previewHeight = popupWin.height;
  const previewLeft = popupWin.left - previewWidth - 10;
  const previewTop = popupWin.top;

  chrome.windows.create({
    url: chrome.runtime.getURL("preview.html"),
    type: "popup",
    width: previewWidth,
    height: previewHeight,
    left: Math.max(0, previewLeft),
    top: previewTop,
    focused: false, // mantém o foco no popup principal
  });
}

export function initLauncher() {
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("drag-over");
  });

  uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("drag-over"));

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("drag-over");
    const pdfs = Array.from(e.dataTransfer.files).filter((f) => f.type === "application/pdf");
    if (!pdfs.length) {
      setStatus("Somente arquivos PDF são aceitos.", true);
      return;
    }
    state.selectedFiles = pdfs;
    selectFileAt(0);
  });

  fileInput.addEventListener("change", () => {
    if (!fileInput.files.length) return;
    state.selectedFiles = Array.from(fileInput.files);
    selectFileAt(0);
  });

  document.getElementById("btn-prev-file").addEventListener("click", () => {
    if (state.currentFileIndex > 0) selectFileAt(state.currentFileIndex - 1);
  });

  document.getElementById("btn-next-file").addEventListener("click", () => {
    if (state.currentFileIndex < state.selectedFiles.length - 1) selectFileAt(state.currentFileIndex + 1);
  });

  document.getElementById("btn-preview").addEventListener("click", openPreviewWindow);

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;

    if (e.key === "-") {
      document.getElementById("btn-preview").click();
    } else if (e.key === "ArrowLeft") {
      if (state.currentFileIndex > 0) {
        selectFileAt(state.currentFileIndex - 1);
      }
    } else if (e.key === "ArrowRight") {
      if (state.currentFileIndex < state.selectedFiles.length - 1) {
        selectFileAt(state.currentFileIndex + 1);
      }
    }
  });
}
