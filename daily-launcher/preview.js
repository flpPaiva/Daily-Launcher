import * as pdfjsLib from "./pdf.min.mjs";

pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(
  new URL("./pdf.worker.min.mjs", import.meta.url),
  { type: "module" }
);

const ZOOM_STEP = 0.25;
const ZOOM_MIN  = 0.5;
const ZOOM_MAX  = 4.0;

let pdfDoc        = null;
let currentPage   = 1;
let zoomScale     = 1.0;
let renderTask    = null;

const scroll    = document.getElementById("scroll");
const canvas    = document.getElementById("canvas");
const loading   = document.getElementById("loading");
const pageInfo  = document.getElementById("page-info");
const zoomLevel = document.getElementById("zoom-level");
const btnPrev   = document.getElementById("btn-prev");
const btnNext   = document.getElementById("btn-next");
const btnZoomIn = document.getElementById("btn-zoom-in");
const btnZoomOut= document.getElementById("btn-zoom-out");

async function renderPage(pageNum) {
  if (!pdfDoc) return;

  if (renderTask) { renderTask.cancel(); renderTask = null; }

  const page           = await pdfDoc.getPage(pageNum);
  const naturalVP      = page.getViewport({ scale: 1 });
  const baseScale      = (scroll.clientWidth - 24) / naturalVP.width;
  const finalScale     = baseScale * zoomScale;
  const viewport       = page.getViewport({ scale: finalScale });

  canvas.width         = viewport.width;
  canvas.height        = viewport.height;
  canvas.style.width   = viewport.width  + "px";
  canvas.style.height  = viewport.height + "px";

  renderTask = page.render({ canvasContext: canvas.getContext("2d"), viewport });
  try {
    await renderTask.promise;
  } catch (e) {
    if (e?.name !== "RenderingCancelledException") console.error(e);
    return;
  }
  renderTask = null;

  currentPage         = pageNum;
  pageInfo.textContent = `${pageNum} / ${pdfDoc.numPages}`;
  zoomLevel.textContent= Math.round(zoomScale * 100) + "%";
  btnPrev.disabled    = pageNum <= 1;
  btnNext.disabled    = pageNum >= pdfDoc.numPages;
  btnZoomOut.disabled = zoomScale <= ZOOM_MIN;
  btnZoomIn.disabled  = zoomScale >= ZOOM_MAX;
}

// Carrega PDF do session storage
chrome.storage.session.get("previewPdf", async ({ previewPdf }) => {
  if (!previewPdf) { loading.textContent = "Nenhum PDF encontrado."; return; }

  const res    = await fetch(previewPdf);
  const buffer = await res.arrayBuffer();
  pdfDoc       = await pdfjsLib.getDocument({ data: buffer }).promise;

  loading.style.display = "none";
  canvas.style.display  = "block";
  await renderPage(1);
});

btnPrev.addEventListener("click",    () => renderPage(currentPage - 1));
btnNext.addEventListener("click",    () => renderPage(currentPage + 1));
async function zoomAround(newZoom) {
  const oldZoom = zoomScale;
  const cx      = scroll.scrollLeft + scroll.clientWidth  / 2;
  const cy      = scroll.scrollTop  + scroll.clientHeight / 2;
  zoomScale     = newZoom;
  await renderPage(currentPage);
  const ratio   = newZoom / oldZoom;
  scroll.scrollLeft = cx * ratio - scroll.clientWidth  / 2;
  scroll.scrollTop  = cy * ratio - scroll.clientHeight / 2;
}

btnZoomIn.addEventListener("click",  () => zoomAround(Math.min(ZOOM_MAX, +(zoomScale + ZOOM_STEP).toFixed(2))));
btnZoomOut.addEventListener("click", () => zoomAround(Math.max(ZOOM_MIN, +(zoomScale - ZOOM_STEP).toFixed(2))));

// Ctrl+scroll para zoom — ancora no ponto sob o cursor
scroll.addEventListener("wheel", async (e) => {
  if (!e.ctrlKey) return;
  e.preventDefault();
  const oldZoom = zoomScale;
  const delta   = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
  const next    = +(zoomScale + delta).toFixed(2);
  if (next < ZOOM_MIN || next > ZOOM_MAX) return;

  const rect    = scroll.getBoundingClientRect();
  const mouseX  = e.clientX - rect.left;
  const mouseY  = e.clientY - rect.top;
  const originX = scroll.scrollLeft + mouseX;
  const originY = scroll.scrollTop  + mouseY;

  zoomScale = next;
  await renderPage(currentPage);

  const ratio = next / oldZoom;
  scroll.scrollLeft = originX * ratio - mouseX;
  scroll.scrollTop  = originY * ratio - mouseY;
}, { passive: false });

// Drag to pan
let dragging = false, dx, dy, sx, sy;
scroll.addEventListener("mousedown", (e) => {
  dragging = true; dx = e.clientX; dy = e.clientY;
  sx = scroll.scrollLeft; sy = scroll.scrollTop;
  scroll.classList.add("dragging"); e.preventDefault();
});
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  scroll.scrollLeft = sx - (e.clientX - dx);
  scroll.scrollTop  = sy - (e.clientY - dy);
});
window.addEventListener("mouseup", () => {
  dragging = false; scroll.classList.remove("dragging");
});

// ESC fecha a janela
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") window.close();
});
