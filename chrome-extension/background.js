const DASHBOARD_URL = "http://localhost:3456/api/usage/sync";
const USAGE_API = "https://claude.ai/api/organizations";
const INTERVAL_MS = 30000;

// content script로부터 수신 (탭이 열려있을 때)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SYNC_USAGE") {
    postToDashboard(msg.data);
  }
});

// 탭 없이 직접 API 호출
async function fetchAndSync() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: "claude.ai" });
    const orgCookie = cookies.find((c) => c.name === "lastActiveOrg");
    if (!orgCookie) return;

    const cookieStr = cookies.map((c) => c.name + "=" + c.value).join("; ");

    const res = await fetch(USAGE_API + "/" + orgCookie.value + "/usage", {
      headers: { Cookie: cookieStr },
    });
    if (!res.ok) return;

    const data = await res.json();
    postToDashboard(data);
  } catch (e) {
    // 쿠키 만료 등 — 무시
  }
}

function postToDashboard(data) {
  fetch(DASHBOARD_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((r) => r.json())
    .then((d) => console.log("[Claude Usage Sync]", d))
    .catch(() => {});
}

// 주기적 실행 (MV3 alarm 사용)
chrome.alarms.create("sync-usage", { periodInMinutes: 0.5 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "sync-usage") fetchAndSync();
});

// 확장 시작 시 즉시 1회
fetchAndSync();
