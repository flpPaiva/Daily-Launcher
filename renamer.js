#!/usr/bin/env node
/**
 * Renomeia todos os arquivos em cypress/NFes para 1.ext, 2.ext, 3.ext…
 * baseado na **data de criação** (mais antigos recebem números menores).
 * Uso:  node renamer.js
 */

const fs = require("fs").promises;
const path = require("path");

(async () => {
  const dirPath = path.join(__dirname, "cypress", "NFes");

  // Lê a pasta e pega só arquivos (ignora subpastas)
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const fileNames = entries.filter((d) => d.isFile()).map((d) => d.name);

  if (!fileNames.length) {
    console.log("⚠️  Nenhum arquivo encontrado em cypress/NFes.");
    return;
  }

  // Obtém data de criação (birthtime) para cada arquivo
  const filesWithStats = await Promise.all(
    fileNames.map(async (name) => {
      const fullPath = path.join(dirPath, name);
      const stats = await fs.stat(fullPath);
      return { name, birthtime: stats.birthtime };
    })
  );

  // Ordena por data de criação (mais antigos primeiro)
  const sortedFiles = filesWithStats.sort((a, b) => a.birthtime - b.birthtime).map((f) => f.name);

  console.log(`🔄 Encontrados ${sortedFiles.length} arquivo(s). Renomeando com base na data de **criação**…`);

  // 1) Renomeia todos para nomes temporários únicos
  const tempInfo = [];
  for (const [idx, file] of sortedFiles.entries()) {
    const ext = path.extname(file);
    const tempName = `__tmp__${idx}${ext}`;
    await fs.rename(path.join(dirPath, file), path.join(dirPath, tempName));
    tempInfo.push({ tempName, ext });
  }

  // 2) Renomeia temporários para 1.ext, 2.ext, …
  for (const [idx, { tempName, ext }] of tempInfo.entries()) {
    const finalName = `${idx + 1}${ext}`;
    await fs.rename(path.join(dirPath, tempName), path.join(dirPath, finalName));
  }

  console.log("✅ Renomeação concluída com sucesso!");
})().catch((err) => {
  console.error("❌ Ocorreu um erro:", err);
  process.exitCode = 1;
});
