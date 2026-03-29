// ==UserScript==
// @name         Claude Usage Sync
// @namespace    claude-reset-time
// @version      1.4
// @description  claude.ai 사용량을 로컬 대시보드로 자동 동기화
// @match        https://claude.ai/*
// @grant        GM_xmlhttpRequest
// @grant        GM_log
// @grant        GM_addElement
// @connect      localhost
// @sandbox      raw
// @run-at       document-idle
// ==/UserScript==

(function () {
  GM_log("[Claude Usage Sync] v1.4 script started");

  var DASHBOARD_URL = "http://localhost:3456/api/usage/sync";
  var INTERVAL_MS = 30000;

  function getOrgId() {
    try {
      var m = document.cookie.match(/lastActiveOrg=([^;]+)/);
      return m ? m[1] : null;
    } catch (e) { return null; }
  }

  function syncUsage() {
    var orgId = getOrgId();
    if (!orgId) {
      GM_log("[Claude Usage Sync] org_id not found in cookies");
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/organizations/" + orgId + "/usage");
    xhr.onload = function () {
      if (xhr.status !== 200) {
        GM_log("[Claude Usage Sync] API returned " + xhr.status);
        return;
      }
      GM_xmlhttpRequest({
        method: "POST",
        url: DASHBOARD_URL,
        headers: { "Content-Type": "application/json" },
        data: xhr.responseText,
        onload: function (r) {
          try {
            var d = JSON.parse(xhr.responseText);
            GM_log("[Claude Usage Sync] synced: " +
              (d.five_hour ? d.five_hour.utilization + "%(5h) " : "") +
              (d.seven_day ? d.seven_day.utilization + "%(7d)" : ""));
          } catch (e) {}
        },
        onerror: function () {
          GM_log("[Claude Usage Sync] dashboard not reachable");
        }
      });
    };
    xhr.onerror = function () {
      GM_log("[Claude Usage Sync] API fetch failed");
    };
    xhr.send();
  }

  setTimeout(syncUsage, 3000);
  setInterval(syncUsage, INTERVAL_MS);

  GM_log("[Claude Usage Sync] v1.4 loaded - will sync every 30s");
})();
