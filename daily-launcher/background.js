chrome.action.onClicked.addListener(async () => {
  const width  = 340;
  const height = 620;
  const margin = 20;

  const browserWin = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });

  const left = browserWin.left + browserWin.width  - width  - margin;
  const top  = browserWin.top  + margin;

  chrome.windows.create({
    url: chrome.runtime.getURL("popup.html"),
    type: "popup",
    width,
    height,
    left,
    top,
    focused: true,
  });
});
