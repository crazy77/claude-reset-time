const DASHBOARD_URL = "http://localhost:3456/api/usage/sync";
const USAGE_API = "https://claude.ai/api/organizations";

// 아이콘을 퍼센티지 텍스트로 동적 렌더링
function updateIcon(data) {
  if (!data || !data.five_hour) return;
  const pct = Math.round(data.five_hour.utilization);

  // 어두운 배경 + 밝은 텍스트 (고대비)
  const bg = "#1a1a2e";
  let fg;
  if (pct < 50) fg = "#4ade80";       // 밝은 초록
  else if (pct < 80) fg = "#fbbf24";  // 밝은 노랑
  else fg = "#f87171";                 // 밝은 빨강

  const imageData = {};
  for (const size of [16, 32, 48]) {
    const c = new OffscreenCanvas(size, size);
    const g = c.getContext("2d");

    // 어두운 배경
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(0, 0, size, size, size * 0.16);
    g.fill();

    // 숫자 (크게)
    g.fillStyle = fg;
    g.textAlign = "center";
    g.textBaseline = "alphabetic";
    const num = String(pct);
    const nfs = size * (num.length > 2 ? 0.52 : 0.62);
    g.font = `900 ${nfs}px "Arial Black", sans-serif`;
    g.fillText(num, size / 2, size * 0.64);

    // % 기호 (아래에 작게)
    const pfs = size * 0.28;
    g.font = `700 ${pfs}px "Arial", sans-serif`;
    g.fillText("%", size / 2, size * 0.88);

    imageData[size] = g.getImageData(0, 0, size, size);
  }
  chrome.action.setIcon({ imageData });
}

// content script로부터 수신 (탭이 열려있을 때)
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SYNC_USAGE") {
    updateIcon(msg.data);
    postToDashboard(msg.data);
  }
});

// 탭 없이 직접 API 호출
async function fetchAndSync() {
  try {
    const orgCookie = await chrome.cookies.get({
      url: "https://claude.ai",
      name: "lastActiveOrg",
    });
    if (!orgCookie) return;

    const res = await fetch(
      USAGE_API + "/" + orgCookie.value + "/usage",
      { credentials: "include" }
    );
    if (!res.ok) return;

    const data = await res.json();
    updateIcon(data);
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
