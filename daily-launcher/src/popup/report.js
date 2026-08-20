const STORAGE_KEY = "launchHistory";

export async function getLaunchHistory() {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  return stored[STORAGE_KEY] || [];
}

export async function addLaunchRecord(record) {
  const history = await getLaunchHistory();
  history.push(record);
  await chrome.storage.session.set({ [STORAGE_KEY]: history });
}

export async function removeLaunchRecord(index) {
  const history = await getLaunchHistory();
  history.splice(index, 1);
  await chrome.storage.session.set({ [STORAGE_KEY]: history });
}

async function clearLaunchHistory() {
  await chrome.storage.session.remove(STORAGE_KEY);
}

export async function renderReport() {
  const history = await getLaunchHistory();
  const empty = document.getElementById("report-empty");
  const table = document.getElementById("report-table");
  const tbody = document.getElementById("report-tbody");
  const totalEl = document.getElementById("report-total");

  tbody.innerHTML = "";

  if (!history.length) {
    empty.style.display = "flex";
    table.classList.remove("visible");
    totalEl.classList.remove("visible");
    return;
  }

  empty.style.display = "none";
  table.classList.add("visible");

  let total = 0;
  history.forEach((item, index) => {
    const tr = document.createElement("tr");
    [item.fileName, item.code, item.date, item.vlTotal, item.type, item.time].forEach((value) => {
      const td = document.createElement("td");
      td.textContent = value || "-";
      tr.appendChild(td);
    });

    // Adiciona botão de exclusão
    const tdAction = document.createElement("td");
    tdAction.classList.add("report-action-cell");
    const btnDelete = document.createElement("button");
    btnDelete.classList.add("btn-delete-record");
    btnDelete.innerHTML = '<span class="material-symbols-outlined">delete</span>';
    btnDelete.setAttribute("aria-label", "Excluir lançamento");
    btnDelete.addEventListener("click", async () => {
      await removeLaunchRecord(index);
      await renderReport();
    });
    tdAction.appendChild(btnDelete);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
    total += parseFloat(String(item.vlTotal || "0").replace(",", ".")) || 0;
  });

  totalEl.textContent = `Total: ${total.toFixed(2).replace(".", ",")}`;
  totalEl.classList.add("visible");
}

export function initReportScreen({ showScreen }) {
  document.getElementById("btn-track-launches").addEventListener("click", async () => {
    await renderReport();
    showScreen("screen-report");
  });

  document.getElementById("btn-back-report").addEventListener("click", () => showScreen("screen-launcher"));

  document.getElementById("btn-clear-report").addEventListener("click", async () => {
    await clearLaunchHistory();
    await renderReport();
  });
}
