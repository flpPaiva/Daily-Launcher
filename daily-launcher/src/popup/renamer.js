function setRenameStatus(msg, isError = false) {
  const el = document.getElementById("rename-status");
  el.textContent = msg;
  el.className = "rename-status" + (isError ? " error" : "");
}

export function initRenamer({ onRenamed }) {
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

    onRenamed();
    setRenameStatus(`${files.length} arquivo(s) renomeados com sucesso.`);
  });
}
