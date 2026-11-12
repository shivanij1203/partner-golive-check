(function () {
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var titles = {}, about = {};

  // One plain sentence for a group of pages.
  function say(rows) {
    if (!rows) return null;
    var expected = 0, caught = 0, unsure = 0, wrong = 0;
    rows.forEach(function (r) {
      expected += r.score.expected.length;
      caught += r.score.hits.length;
      r.score.false_alarms.forEach(function (c) { if (c === "ORDER_DATA_UNVERIFIED") unsure++; else wrong++; });
    });
    var s = caught === expected ? "Caught every problem" : caught === 0 ? "Missed the problems" : "Caught some problems";
    if (unsure) s += ", and sent the pages it couldn't read to a person";
    if (wrong) s += ", with some false alarms";
    return s;
  }

  function box(label, text) {
    var muted = !text;
    return '<div style="background:#EFF1FA;border-radius:12px;padding:16px 18px;display:flex;flex-direction:column;gap:4px">' +
      '<span style="font-size:13px;font-weight:600;color:#55576A">' + label + "</span>" +
      '<span style="font-size:17px;font-weight:600;color:' + (muted ? "#55576A" : "#0B0B3D") + '">' + esc(text || "Not run yet") + "</span></div>";
  }

  function group(title, sub, rules, agent) {
    return '<div class="card" style="padding:26px 28px;display:flex;flex-direction:column;gap:18px">' +
      '<div style="display:flex;flex-direction:column;gap:4px"><h3 style="margin:0;font-size:20px">' + title + "</h3>" +
      '<p style="margin:0;font-size:15px;color:#55576A">' + sub + "</p></div>" +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
      box("Fixed rules alone", rules) + box("AI agent", agent) + "</div></div>";
  }

  function cell(row) {
    if (!row) return '<span style="color:#55576A">Not run yet</span>';
    var s = row.score, out = [];
    if (!s.misses.length && !s.false_alarms.length) out.push("Found everything");
    if (s.misses.length) out.push("Missed: " + s.misses.map(function (c) { return esc(titles[c] || c); }).join("; "));
    if (s.false_alarms.length) out.push("Also flagged: " + s.false_alarms.map(function (c) { return esc(titles[c] || c); }).join("; "));
    out.push('<span style="color:#55576A">' + (row.verdict === "go" ? "Said ready" : "Said not ready") +
             (row.verdict === row.expected_verdict ? "" : " (wrong)") + "</span>");
    return out.join("<br>");
  }

  function render(d) {
    var rules = d.rules, agent = d.agent;
    if (!rules) {
      $("compare").innerHTML = '<p style="margin:0;color:#55576A">Running the test. This takes a few seconds.</p>';
      setTimeout(load, 2000);
      return;
    }
    var split = function (res, std) {
      return res ? res.pages.filter(function (p) { return (p.setup === "documented") === std; }) : null;
    };
    $("compare").innerHTML =
      group("Pages set up the standard way", "Set up the way the integration guide says", say(split(rules, true)), say(split(agent, true))) +
      group("Pages set up their own way", "Set up the way developers often do it instead", say(split(rules, false)), say(split(agent, false)));

    var byAgent = {};
    (agent ? agent.pages : []).forEach(function (p) { byAgent[p.slug] = p; });
    $("pages").innerHTML = "<tr><th>Example page</th><th>Problems it should find</th><th>Fixed rules alone</th><th>AI agent</th></tr>" +
      rules.pages.map(function (p) {
        var exp = p.score.expected.map(function (c) { return esc(titles[c] || c); }).join("; ") || "None, it's set up right";
        return "<tr><td><b>" + esc(about[p.slug] || p.name) + '</b><br><span style="color:#55576A">' + esc(p.name) + ", " + (p.setup === "documented" ? "set up the standard way" : "set up differently") +
          "</span></td><td>" + exp + "</td><td>" + cell(p) + "</td><td>" + cell(byAgent[p.slug]) + "</td></tr>";
      }).join("");
  }

  var tries = 0;
  function load() {
    Promise.all([
      fetch(API + "/api/partners").then(function (r) { return r.json(); }),
      fetch(API + "/api/eval").then(function (r) { return r.json(); })
    ]).then(function (res) {
      Object.keys(res[0].issues).forEach(function (k) { titles[k] = res[0].issues[k].title; });
      res[0].partners.forEach(function (p) { about[p.slug] = p.about; });
      render(res[1]);
    }).catch(function () {
      tries += 1;
      $("compare").innerHTML = '<p style="margin:0;color:#55576A">' + (tries < 15 ? "Starting up the checker. This takes a few seconds." : "The checker isn't responding right now. Please try again in a few minutes.") + "</p>";
      if (tries < 15) setTimeout(load, 4000);
    });
  }
  load();
})();

// Owner controls: open works.html?admin to rerun the test.
(function () {
  if (!/[?&]admin\b/.test(location.search)) return;
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  $("admin").classList.remove("hidden");
  function run(mode) {
    var headers = {};
    if (mode === "agent") {
      var code = window.prompt("Access code for the AI agent test:");
      if (!code) return;
      headers["X-Eval-Token"] = code;
    }
    $("runmsg").textContent = "Starting...";
    fetch(API + "/api/eval/run?mode=" + mode, { method: "POST", headers: headers })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.detail); return d; }); })
      .then(function () { $("runmsg").textContent = "Running. Refresh this page in a few minutes."; })
      .catch(function (e) { $("runmsg").textContent = e.message || "Could not start."; });
  }
  $("runrules").addEventListener("click", function () { run("rules"); });
  $("runagent").addEventListener("click", function () { run("agent"); });
})();
