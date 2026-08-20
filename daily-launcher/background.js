chrome.action.onClicked.addListener(async () => {
  const popupUrl = chrome.runtime.getURL("popup.html");

  const existing = await chrome.windows.getAll({ windowTypes: ["popup"], populate: true });
  const popupWin = existing.find((w) => w.tabs?.some((t) => t.url?.startsWith(popupUrl)));

  if (popupWin) {
    chrome.windows.update(popupWin.id, { focused: true });
    return;
  }

  const width = 340;
  const margin = 20;

  const browserWin = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });

  // Usa toda a altura da janela do navegador
  const height = browserWin.height - margin;
  const left = browserWin.left + browserWin.width - width - margin;
  const top = browserWin.top;

  chrome.windows.create({
    url: popupUrl,
    type: "popup",
    width,
    height,
    left,
    top,
    focused: true,
  });
});
