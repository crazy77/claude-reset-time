const INTERVAL_MS = 30000;

function getOrgId() {
  try {
    const m = document.cookie.match(/lastActiveOrg=([^;]+)/);
    return m ? m[1] : null;
  } catch (e) {
    return null;
  }
}

async function syncUsage() {
  const orgId = getOrgId();
  if (!orgId) return;

  try {
    const res = await fetch("/api/organizations/" + orgId + "/usage");
    if (!res.ok) return;
    const data = await res.json();

    // background service worker에게 전달 (CORS 우회)
    chrome.runtime.sendMessage({ type: "SYNC_USAGE", data: data });

    console.log(
      "[Claude Usage Sync]",
      (data.five_hour ? data.five_hour.utilization + "%(5h)" : ""),
      (data.seven_day ? data.seven_day.utilization + "%(7d)" : "")
    );
  } catch (e) {
    // 무시
  }
}

console.log("[Claude Usage Sync] content script loaded");
setTimeout(syncUsage, 3000);
setInterval(syncUsage, INTERVAL_MS);
