(function () {
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  function tile(label, value, note) {
    return '<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:4px">' +
      '<span style="font-size:13px;font-weight:600;color:#55576A">' + label + "</span>" +
      '<span style="font-size:22px;font-weight:700">' + value + "</span>" +
      (note ? '<span style="font-size:12px;color:#55576A">' + note + "</span>" : "") + "</div>";
  }
  Promise.all([
    fetch(API + "/api/metrics?days=7").then(function (r) { return r.json(); }),
    fetch(API + "/api/eval").then(function (r) { return r.json(); })
  ]).then(function (res) {
    var m = res[0], e = res[1];
    var pct = function (x) { return x == null ? "n/a" : Math.round(x * 100) + "%"; };
    $("live").innerHTML =
      tile("Checks, last 7 days", m.checks, m.by_mode_used.agent + " by the AI agent") +
      tile("AI agent fallback rate", pct(m.agent_fallback_rate), "alert above " + pct(m.fallback_alert_threshold)) +
      tile("Cost per AI check", m.avg_cost_usd_per_agent_check == null ? "n/a" : "$" + m.avg_cost_usd_per_agent_check.toFixed(4),
           m.avg_tokens_per_agent_check ? m.avg_tokens_per_agent_check + " tokens on average" : "no AI checks yet") +
      tile("Latency p50 / p95", (m.latency_ms.p50 == null ? "n/a" : (m.latency_ms.p50 / 1000).toFixed(1) + "s / " + (m.latency_ms.p95 / 1000).toFixed(1) + "s"), m.latency_ms.of);
    var line = function (name, r) {
      if (!r) return name + ": not run yet.";
      var s = r.summary.all;
      return name + ": caught " + s.caught + " of " + s.issues_expected + " problems, " + s.false_alarms + " false alarms, " +
             s.verdicts_right + " of " + s.pages + " verdicts right.";
    };
    $("evalline").innerHTML = "Eval on 13 example pages. " + line("Rules", e.rules) + " " + line("AI agent", e.agent) +
      ' <a href="works.html">Page by page</a>';
  }).catch(function () { $("live").innerHTML = '<p style="margin:0;color:#55576A">The checker is waking up. Refresh in a minute.</p>'; });
  $("codeline").innerHTML = window.GOLIVE_CODE
    ? 'Code, tests, MCP server, skill, notebook and runbook: <a href="' + window.GOLIVE_CODE + '">' + window.GOLIVE_CODE.replace("https://", "") + "</a>"
    : "Code, tests, MCP server, skill, notebook and runbook are available on request.";
})();
