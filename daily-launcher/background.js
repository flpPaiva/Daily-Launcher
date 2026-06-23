chrome.action.onClicked.addListener(async () => {
  const popupUrl = chrome.runtime.getURL("popup.html");

  const existing = await chrome.windows.getAll({ windowTypes: ["popup"], populate: true });
  const popupWin = existing.find((w) => w.tabs?.some((t) => t.url?.startsWith(popupUrl)));

  if (popupWin) {
    chrome.windows.update(popupWin.id, { focused: true });
    return;
  }

  const width = 340;
  const height = 745;
  const margin = 20;

  const browserWin = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });

  const left = browserWin.left + browserWin.width - width - margin;
  const top = browserWin.top + margin;

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
