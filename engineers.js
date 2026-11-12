(function () {
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  function tile(label, value, note) {
    return '<div class="card" style="padding:16px 18px;display:flex;flex-direction:column;gap:4px">' +
      '<span style="font-size:13px;font-weight:600;color:#55576A">' + label + "</span>" +
      '<span style="font-size:22px;font-weight:700">' + value + "</span>" +
      (note ? '<span style="font-size:12px;color:#55576A">' + note + "</span>" : "") + "</div>";
  }
  $("codeline").innerHTML = window.GOLIVE_CODE
    ? 'Code, tests, MCP server, skill, notebook and runbook: <a href="' + window.GOLIVE_CODE + '">' + window.GOLIVE_CODE.replace("https://", "") + "</a>"
    : "Code, tests, MCP server, skill, notebook and runbook are available on request.";
})();
