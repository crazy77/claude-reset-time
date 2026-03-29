const DASHBOARD_URL = "http://localhost:3456/api/usage/sync";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "SYNC_USAGE") return;

  fetch(DASHBOARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(msg.data),
  })
    .then((r) => r.json())
    .then((d) => console.log("[Claude Usage Sync] posted to dashboard:", d))
    .catch(() => {});
});
