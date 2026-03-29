function pctClass(p) {
  if (p < 50) return "ok";
  if (p < 80) return "warn";
  return "danger";
}

function formatRemaining(iso) {
  var ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "리셋됨";
  var h = Math.floor(ms / 3600000);
  var m = Math.floor((ms % 3600000) / 60000);
  if (h > 24) return Math.floor(h / 24) + "일 " + (h % 24) + "시간";
  if (h > 0) return h + "시간 " + m + "분";
  return m + "분";
}

function render(data) {
  var el = document.getElementById("content");
  if (!data || !data.five_hour) {
    el.innerHTML = '<div class="error">데이터를 가져올 수 없습니다.<br>claude.ai에 로그인되어 있는지 확인하세요.</div>';
    return;
  }

  var fh = data.five_hour;
  var sd = data.seven_day;
  var fc = pctClass(fh.utilization);
  var sc = sd ? pctClass(sd.utilization) : "ok";

  var html = '';

  // 5시간 윈도우
  html += '<div class="card">';
  html += '<div class="card-title">5시간 윈도우 <span class="badge badge-sync">SYNC</span></div>';
  html += '<div class="pct pct-' + fc + '">' + fh.utilization + '%</div>';
  html += '<div class="bar-bg"><div class="bar-fill bar-' + fc + '" style="width:' + fh.utilization + '%"></div></div>';
  html += '<div class="meta"><span>리셋까지 ' + formatRemaining(fh.resets_at) + '</span></div>';
  html += '</div>';

  // 7일 윈도우
  if (sd) {
    html += '<div class="card">';
    html += '<div class="card-title">7일 윈도우 <span class="badge badge-sync">SYNC</span></div>';
    html += '<div class="pct pct-' + sc + '">' + sd.utilization + '%</div>';
    html += '<div class="bar-bg"><div class="bar-fill bar-' + sc + '" style="width:' + sd.utilization + '%"></div></div>';
    html += '<div class="meta"><span>리셋까지 ' + formatRemaining(sd.resets_at) + '</span></div>';
    html += '</div>';
  }

  // Sonnet
  if (data.seven_day_sonnet) {
    var sn = data.seven_day_sonnet;
    html += '<div class="card">';
    html += '<div class="card-title">Sonnet (7일)</div>';
    html += '<div class="meta"><span style="font-size:16px;font-weight:700;color:#f0f0ff">' + sn.utilization + '%</span><span>리셋까지 ' + formatRemaining(sn.resets_at) + '</span></div>';
    html += '<div class="bar-bg"><div class="bar-fill bar-' + pctClass(sn.utilization) + '" style="width:' + sn.utilization + '%"></div></div>';
    html += '</div>';
  }

  html += '<div class="footer">30초마다 자동 갱신</div>';
  el.innerHTML = html;
}

// 쿠키에서 org_id 가져와서 API 호출
chrome.cookies.get({ url: "https://claude.ai", name: "lastActiveOrg" }, function (cookie) {
  if (!cookie) {
    document.getElementById("content").innerHTML = '<div class="error">claude.ai 로그인 필요</div>';
    return;
  }

  fetch("https://claude.ai/api/organizations/" + cookie.value + "/usage", {
    credentials: "include",
  })
    .then(function (r) { return r.json(); })
    .then(render)
    .catch(function () {
      // 직접 호출 실패 시 저장된 sync 데이터 사용
      fetch("http://localhost:3456/api/usage/sync")
        .then(function (r) { return r.json(); })
        .then(function (d) { if (d) render(d); })
        .catch(function () {
          document.getElementById("content").innerHTML = '<div class="error">연결 실패</div>';
        });
    });
});
