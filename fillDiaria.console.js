(async () => {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  function setInput(selector, value) {
    const el = document.querySelector(selector);
    if (!el) { console.warn(`Nao encontrado: ${selector}`); return; }
    const proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function selectOption(selectSel, panelSel, text) {
    const sel = document.querySelector(selectSel);
    if (!sel) { console.warn(`Select nao encontrado: ${selectSel}`); return; }
    sel.click();
    await delay(600);
    const opt = [...document.querySelectorAll(`${panelSel} .mat-mdc-option`)]
      .find((o) => o.textContent.trim().includes(text));
    if (!opt) { console.warn(`Opcao "${text}" nao encontrada em ${panelSel}`); return; }
    opt.click();
    await delay(300);
  }

  function getDescription(type) {
    switch (type) {
      case "Meal": return "Refeicao.";
      case "Mercado": return "Mercado.";
      case "Combustivel": return "Abastecimento do veiculo.";
      default: return "";
    }
  }

  const json = prompt("Cole o JSON da NFe:");
  if (!json) return;
  const data = JSON.parse(json);
  console.log("Dados recebidos:", data);

  if (data.priority) {
    await selectOption("mat-select#priority-select", "#priority-select-panel", data.priority);
    console.log("priority ok");
  }

  const description = data.description || getDescription(data.type);
  if (description) {
    setInput("textarea#description-textarea", description);
    console.log("description ok");
  }

  if (data.type) {
    await selectOption("mat-select#expenseType-select", "#expenseType-select-panel", data.type);
    console.log("type ok");
  }

  if (data.date) {
    setInput("#-from", data.date);
    console.log("date ok");
  }

  if (data.code) {
    setInput("#document-number", data.code);
    console.log("code ok");
  }

  if (data.vlTotal) {
    setInput("#value", data.vlTotal);
    console.log("vlTotal ok");
  }

  const fileInput = document.querySelector('input[type="file"]');
  if (fileInput) {
    fileInput.click();
    console.log("seletor de arquivo aberto");
  } else {
    console.warn("input[type=file] nao encontrado");
  }

  console.log("Preenchimento concluido!");
})();
