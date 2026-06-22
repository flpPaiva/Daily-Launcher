const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const { spawnSync } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const lineIterator = rl[Symbol.asyncIterator]();

async function ask(question) {
  process.stdout.write(question);
  const { value = "" } = await lineIterator.next();
  return value.trim();
}

function parseCurrentFileName() {
  const content = fs.readFileSync(path.join(__dirname, "formValue.js"), "utf8");
  const noComments = content.replace(/^\s*\/\/.*$/gm, "");
  const match = noComments.match(/export\s+const\s+fileName\s*=\s*["'`]([^"'`]*)["'`]/);
  return match?.[1] || null;
}

function getNextFileName(current) {
  if (!current) return "1.pdf";
  const num = parseInt(current.replace(".pdf", ""), 10);
  return isNaN(num) ? "1.pdf" : `${num + 1}.pdf`;
}

function isEmpty(value) {
  return value === undefined || value === null || value.toString().trim() === "";
}

function formatTotalValue(value) {
  return value
    .toString()
    .replace(/[^0-9]/g, "")
    .replace(/(\d{2})$/, ",$1")
    .replace(",", ".");
}

function copyToClipboard(text) {
  const tools = [
    { cmd: "xclip", args: ["-selection", "clipboard"] },
    { cmd: "xsel", args: ["--clipboard", "--input"] },
    { cmd: "wl-copy", args: [] },
  ];

  for (const { cmd, args } of tools) {
    const result = spawnSync(cmd, args, { input: text, encoding: "utf8" });
    if (result.status === 0) return cmd;
  }

  return null;
}

async function main() {
  const currentFile = parseCurrentFileName();
  const suggestion = getNextFileName(currentFile);

  // 1. Arquivo PDF
  const fileAnswer = await ask(`Arquivo PDF [${suggestion}]: `);
  const raw = fileAnswer || suggestion;
  const fileName = raw.endsWith(".pdf") ? raw : `${raw}.pdf`;

  // 2. Tipo de despesa
  console.log("\nTipo de despesa:");
  console.log("  1) Meal");
  console.log("  2) Mercado");
  console.log("  3) Combustível");
  const typeAnswer = await ask("Opção [1]: ");
  const typeMap = { "1": "Meal", "2": "Mercado", "3": "Combustível" };
  const type = typeMap[typeAnswer] || "Meal";

  // 3. Prioridade
  console.log("\nPrioridade:");
  console.log("  1) Mínima");
  console.log("  2) Baixa");
  console.log("  3) Média");
  console.log("  4) Alta");
  console.log("  5) Urgente");
  const prioAnswer = await ask("Opção [3]: ");
  const prioMap = { "1": "Mínima", "2": "Baixa", "3": "Média", "4": "Alta", "5": "Urgente" };
  const priority = prioMap[prioAnswer] || "Média";

  rl.close();
  console.log("");

  // Lê o PDF
  const pdfPath = path.join(__dirname, "cypress/NFes", fileName);

  if (!fs.existsSync(pdfPath)) {
    throw new Error(`Arquivo não encontrado: ${pdfPath}`);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const pdfData = await pdf(dataBuffer);

  const code = pdfData.text.match(/Número:\s*(.*)/)?.[1].split(" ")[0] || null;
  const pdfVlTotal = pdfData.text.match(/Valor pago R\$:\s*(.*)/)?.[1] || null;
  const date = pdfData.text.match(/Emissão:\s*(.*)/)?.[1].split(" ")[0] || null;
  const vlTotal = isEmpty(pdfVlTotal) ? null : formatTotalValue(pdfVlTotal);

  console.log(`PDF lido: ${fileName}`);

  const result = { code, date, vlTotal, type, priority };
  const text = JSON.stringify(result, null, 2);

  console.log("\n" + text + "\n");

  const tool = copyToClipboard(text);
  if (tool) {
    console.log(`Copiado para o clipboard via ${tool}.`);
  } else {
    console.log("Nao foi possivel copiar. Instale xclip, xsel ou wl-copy.");
  }
}

main().catch((err) => {
  rl.close();
  console.error("Erro:", err.message);
  process.exit(1);
});
