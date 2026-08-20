import { EXTERNAL_LINKS } from "./constants.js";

export function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

export async function openOrFocus(url) {
  const origin = new URL(url).origin + "/*";
  const [existing] = await chrome.tabs.query({ url: origin });
  if (existing) {
    await chrome.tabs.update(existing.id, { active: true, url });
    await chrome.windows.update(existing.windowId, { focused: true });
  } else {
    chrome.tabs.create({ url });
  }
}

export function initNavigation({ onBackToHome }) {
  document.getElementById("btn-go-launcher").addEventListener("click", () => showScreen("screen-launcher"));

  document.getElementById("btn-back").addEventListener("click", () => {
    onBackToHome();
    showScreen("screen-home");
  });

  for (const [id, url] of Object.entries(EXTERNAL_LINKS)) {
    document.getElementById(id)?.addEventListener("click", () => openOrFocus(url));
  }
}
