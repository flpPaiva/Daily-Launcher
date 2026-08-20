import { state } from "./state.js";
import { setStatus, goToNextFile } from "./launcher.js";
import { addLaunchRecord } from "./report.js";
import { MANTIS_HOST_PATTERN, MANTIS_SALVAR_BUTTON_ID } from "./constants.js";

// Busca a aba do Mantis em qualquer janela (a extensão roda em janela própria)
async function getMantisTab() {
  let [tab] = await chrome.tabs.query({ url: MANTIS_HOST_PATTERN });

  if (!tab) {
    // Fallback: aba ativa que seja uma página http(s) (exclui chrome://, chrome-extension://, etc.)
    const allActive = await chrome.tabs.query({ active: true });
    tab = allActive.find((t) => t.url?.startsWith("http"));
  }

  return tab;
}

// Função injetada na página do Mantis para clicar no botão "Salvar".
// Precisa ser autocontida: roda no contexto da página, sem acesso ao escopo deste módulo.
function clickSalvarButton(buttonId) {
  let btn = document.getElementById(buttonId);

  if (!btn) {
    // O id é gerado dinamicamente pelo Angular; busca por texto como fallback
    btn = [...document.querySelectorAll("button.mat-success")].find((b) => b.textContent.trim() === "Salvar");
  }

  if (!btn) {
    console.warn("Botão Salvar não encontrado");
    return;
  }

  btn.click();
}

// Função injetada na página do Mantis (mesma lógica do fillDiaria.console.js).
// Também autocontida pelo mesmo motivo.
function fillForm(data) {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) {
      console.warn(`Não encontrado: ${selector}`);
      return;
    }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function selectOption(selectSel, panelSel, text) {
    const sel = document.querySelector(selectSel);
    if (!sel) {
      console.warn(`Select não encontrado: ${selectSel}`);
      return;
    }
    sel.click();
    await delay(600);
    const opt = [...document.querySelectorAll(`${panelSel} .mat-mdc-option`)].find((o) => o.textContent.trim().includes(text));
    if (!opt) {
      console.warn(`Opção "${text}" não encontrada`);
      return;
    }
    opt.click();
    await delay(300);
  }

  function getDescription(type) {
    switch (type) {
      case "Meal":
        return "Refeição.";
      case "Mercado":
        return "Mercado.";
      case "Combustível":
        return "Abastecimento do veículo.";
      default:
        return "";
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
      const removerBtns = [...document.querySelectorAll("a, button, span")].filter((el) => el.textContent.trim() === "Remover");

      for (const btn of removerBtns) {
        btn.click();
        await delay(400);
      }

      // Aguarda a UI limpar antes de adicionar o novo arquivo
      await delay(300);

      const res = await fetch(data.fileBase64);
      const blob = await res.blob();
      const file = new File([blob], data.fileName, { type: "application/pdf" });
      const dt = new DataTransfer();
      dt.items.add(file);
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.files = dt.files;
        fileInput.dispatchEvent(new Event("change", { bubbles: true }));
        fileInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
  })();
}

async function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function initMantisActions() {
  document.getElementById("btn-lancar").addEventListener("click", async () => {
    const data = {
      code: document.getElementById("f-code").value.trim(),
      date: document.getElementById("f-date").value.trim(),
      vlTotal: document.getElementById("f-vlTotal").value.trim(),
      type: document.getElementById("f-type").value,
      priority: document.getElementById("f-priority").value,
    };

    if (state.selectedFile) {
      data.fileName = state.selectedFile.name;
      data.fileBase64 = await fileToBase64(state.selectedFile);
    }

    setStatus("Preenchendo formulário...");

    const tab = await getMantisTab();
    if (!tab) {
      setStatus("Nenhuma aba do Mantis encontrada.", true);
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: fillForm,
        args: [data],
      });

      await addLaunchRecord({
        fileName: data.fileName,
        code: data.code,
        date: data.date,
        vlTotal: data.vlTotal,
        type: data.type,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      });

      setStatus("Formulário preenchido!");
    } catch (err) {
      setStatus("Erro: " + err.message, true);
    }
  });

  document.getElementById("btn-salvar").addEventListener("click", async () => {
    const tab = await getMantisTab();
    if (!tab) {
      setStatus("Nenhuma aba do Mantis encontrada.", true);
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: clickSalvarButton,
        args: [MANTIS_SALVAR_BUTTON_ID],
      });

      const hasNext = goToNextFile();
      if (hasNext) {
        setStatus("Salvo! Próxima nota carregada.");
      } else {
        setStatus("Salvo! (última nota)");
      }
    } catch (err) {
      setStatus("Erro: " + err.message, true);
    }
  });

  document.getElementById("btn-capture-pdf").addEventListener("click", async () => {
    try {
      // Pega todas as janelas para encontrar a janela normal (não popup)
      const windows = await chrome.windows.getAll({ populate: true, windowTypes: ["normal"] });

      let activeTab = null;
      for (const window of windows) {
        const tab = window.tabs.find((t) => t.active);
        if (tab && tab.url?.startsWith("http")) {
          activeTab = tab;
          break;
        }
      }

      if (!activeTab) {
        setStatus("Nenhuma página web ativa encontrada.", true);
        return;
      }

      setStatus("Capturando página em PDF...");

      // Pega o contador atual
      const stored = await chrome.storage.local.get("pdfCaptureCounter");
      const counter = (stored.pdfCaptureCounter || 0) + 1;

      // Salva o novo contador
      await chrome.storage.local.set({ pdfCaptureCounter: counter });

      // Anexa debugger à aba
      const debuggee = { tabId: activeTab.id };
      await chrome.debugger.attach(debuggee, "1.3");

      try {
        // Captura a página em PDF usando Chrome DevTools Protocol
        const result = await chrome.debugger.sendCommand(debuggee, "Page.printToPDF", {
          printBackground: true,
          paperWidth: 8.27, // A4 width in inches
          paperHeight: 11.69, // A4 height in inches
          marginTop: 0.4,
          marginBottom: 0.4,
          marginLeft: 0.4,
          marginRight: 0.4,
        });

        // Desanexa debugger
        await chrome.debugger.detach(debuggee);

        // Converte base64 para blob
        const pdfData = Uint8Array.from(atob(result.data), (c) => c.charCodeAt(0));
        const blob = new Blob([pdfData], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);

        // Salva o arquivo
        const fileName = `page-${String(counter).padStart(3, "0")}.pdf`;
        await chrome.downloads.download({
          url: url,
          filename: fileName,
          saveAs: false,
        });

        setStatus(`PDF salvo: ${fileName}`);
      } catch (err) {
        // Garante que o debugger seja desanexado mesmo em caso de erro
        await chrome.debugger.detach(debuggee).catch(() => {});
        throw err;
      }
    } catch (err) {
      setStatus("Erro ao capturar PDF: " + err.message, true);
    }
  });
}
