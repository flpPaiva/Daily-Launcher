import * as pdfjsLib from "../../pdf.min.mjs";

const worker = new Worker(new URL("../../pdf.worker.min.mjs", import.meta.url), { type: "module" });
pdfjsLib.GlobalWorkerOptions.workerPort = worker;

function formatTotalValue(rawValue) {
  return rawValue
    .toString()
    .replace(/[^0-9]/g, "")
    .replace(/(\d{2})$/, ",$1")
    .replace(",", ".");
}

export async function extractInvoiceData(file) {
  const buffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item) => item.str).join(" ") + "\n";
  }

  const code = text.match(/Número:\s*(\S+)/)?.[1] || "";
  const date = text.match(/Emissão:\s*(\S+)/)?.[1] || "";
  const rawValue = text.match(/Valor pago R\$:\s*(\S+)/)?.[1] || "";
  const vlTotal = rawValue ? formatTotalValue(rawValue) : "";

  return { code, date, vlTotal };
}
