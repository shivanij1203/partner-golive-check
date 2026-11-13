(function () {
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var notes = {};

  // Times in words, not numbers.
  function ago(t) {
    if (!t) return "";
    var s = Date.now() / 1000 - t;
    if (s < 90) return "just now";
    if (s < 3600) return "a few minutes ago";
    if (s < 3 * 3600) return "about an hour ago";
    if (s < 24 * 3600) return "earlier today";
    if (s < 48 * 3600) return "yesterday";
    return "earlier this week";
  }

  function pill(status) {
    if (status === "working") return '<span style="background:#EEF9AF;color:#007F67;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">Working</span>';
    if (status === "broken") return '<span style="background:#FFEAF1;color:#A3134F;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">Broken</span>';
    return '<span style="background:#EFF1FA;color:#55576A;font-size:12px;font-weight:700;border-radius:999px;padding:4px 10px">Not checked yet</span>';
  }

  function card(p) {
    var broken = p.status === "broken";
    var html = '<div class="card" id="card-' + esc(p.slug) + '" style="padding:20px 22px;display:flex;flex-direction:column;gap:10px;' +
      (broken ? "border-color:#F7B5CC;" : "") + '">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">' +
      '<div><b style="font-size:17px">' + esc(p.name) + '</b><div style="font-size:13px;color:#55576A">' + esc(p.vertical) + "</div></div>" +
      pill(p.status) + "</div>";
    if (broken) {
      if (p.trigger) html += '<p style="margin:0;font-size:14px;color:#55576A"><b style="color:#0B0B3D">How it was found:</b> ' + esc(p.trigger) + "</p>";
      if ((p.what_changed || []).length) html += '<div style="font-size:15px"><b>What changed on the page</b>' +
        p.what_changed.map(function (w) { return '<div style="color:#3E4052;margin-top:2px">' + esc(w) + "</div>"; }).join("") + "</div>";
      html += p.problems.map(function (x) {
        return '<p style="margin:0;font-size:15px"><b>' + esc(x.title) + '</b><br><span style="color:#55576A">' + esc(x.why) + "</span></p>";
      }).join("");
      notes[p.slug] = p.developer_note || "";
      html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:4px">' +
        '<button type="button" class="btn btn-ghost" data-copy="' + esc(p.slug) + '">Copy message for their developer</button>' +
        '<button type="button" class="btn btn-ghost" data-fix="' + esc(p.slug) + '">Mark as fixed (demo)</button></div>';
      if (p.site_update) html += '<details style="font-size:13px;color:#55576A"><summary>Answer key (demo)</summary>' +
        '<div style="margin-top:4px">The demo applied this change: ' + esc(p.site_update) + "</div></details>";
    } else {
      html += '<p style="margin:0;font-size:14px;color:#55576A">Page passed its last check.</p>';
    }
    html += '<span style="font-size:12px;color:#55576A">' + (p.last_checked ? "Checked " + ago(p.last_checked) : "Waiting for the first check") +
      (broken && p.since ? ", broken since " + ago(p.since) : "") + "</span></div>";
    return html;
  }

  function render(st) {
    st.partners.forEach(function (p) { last[p.slug] = p; });
    $("cards").innerHTML = st.partners.map(card).join("");
    var items = [];
    st.incidents.forEach(function (i) {
      if (i.opened_at < Date.now() / 1000 - 30 * 60) return;   // a break from someone else's visit
      if (i.closed_at) items.push({ t: i.closed_at, ok: true, text: i.name + " is working again." });
      items.push({ t: i.opened_at, ok: false, text: i.name + " broke: " + i.problems.join("; ") + "." + (i.trigger ? " " + i.trigger : "") });
    });
    var since = Date.now() / 1000 - 30 * 60;           // older demo alerts are someone else's visit
    items = items.filter(function (a) { return a.t > since; });
    items.sort(function (a, b) { return b.t - a.t; });
    $("alerts").innerHTML = items.length ? items.slice(0, 5).map(function (a) {
      return '<li style="display:flex;gap:12px;align-items:flex-start;background:#EFF1FA;border-radius:12px;padding:12px 14px">' +
        '<span aria-hidden="true" style="flex:none;width:10px;height:10px;margin-top:6px;border-radius:50%;background:' + (a.ok ? "#00B592" : "#EF2678") + '"></span>' +
        '<span style="font-size:15px">' + esc(a.text) + ' <span style="color:#55576A;font-size:13px">' + ago(a.t) + "</span></span></li>";
    }).join("") : '<li style="color:#55576A;font-size:15px">No alerts yet. Every live partner is working.</li>';

    Array.prototype.forEach.call(document.querySelectorAll("[data-copy]"), function (b) {
      b.addEventListener("click", function () {
        var t = notes[b.getAttribute("data-copy")];
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () {
          b.textContent = "Copied"; setTimeout(function () { b.textContent = "Copy message for their developer"; }, 1500);
        });
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-fix]"), function (b) {
      b.addEventListener("click", function () { act("/api/monitor/fix", { slug: b.getAttribute("data-fix") }); });
    });
  }

  var tries = 0;
  function load() {
    return fetch(API + "/api/monitor").then(function (r) { return r.json(); }).then(function (st) { tries = 0; render(st); })
      .catch(function () {
        tries += 1;
        $("cards").innerHTML = '<p style="margin:0;color:#55576A">' + (tries < 15 ? "Starting up the checker. This takes a few seconds." : "The checker isn't responding right now. Please try again in a few minutes.") + "</p>";
        if (tries < 15) setTimeout(load, 4000);
      });
  }

  var last = {};
  function notice(res) {
    var n = $("notice"), p = last[res.slug] || {}, name = p.name || "The partner";
    var broke = res.status === "broken";
    n.style.background = broke ? "#FFEAF1" : "#EEF9AF";
    n.style.border = broke ? "1px solid #F7B5CC" : "0";
    var lines = broke ? [
      ["How it was found", res.trigger || ""],
      ["What changed on the page", (res.what_changed || []).join(" ")],
      ["What the check found", (p.problems || [])[0] ? p.problems[0].title + "." : ""]
    ] : [["", "The check passed again and the alert was closed."]];
    n.innerHTML = '<div style="display:flex;flex-direction:column;gap:4px"><b style="font-size:17px">' + esc(name) + (broke ? " just broke" : " is working again") + "</b>" +
      lines.filter(function (l) { return l[1]; }).map(function (l) {
        return '<div style="font-size:15px">' + (l[0] ? "<b>" + esc(l[0]) + ":</b> " : "") + esc(l[1]) + "</div>";
      }).join("") + "</div>" +
      '<a class="btn btn-ghost" href="#card-' + esc(res.slug) + '">' + (broke ? "See what to do" : "See the partner") + "</a>";
    n.classList.remove("hidden");
    var card = document.getElementById("card-" + res.slug);
    if (card) {
      card.classList.remove("flash"); void card.offsetWidth; card.classList.add("flash");
      card.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  function act(path, body) {
    $("busy").classList.remove("hidden");
    $("simulate").disabled = true; $("simulate2").disabled = true;
    var result;
    fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); })
      .then(function (res) { result = res; return load(); })
      .then(function () { if (result && result.slug) notice(result); })
      .finally(function () { $("busy").classList.add("hidden"); $("simulate").disabled = false; $("simulate2").disabled = false; });
  }

  ["simulate", "simulate2"].forEach(function (id) {
    $(id).addEventListener("click", function () { act("/api/monitor/simulate", { kind: $(id).getAttribute("data-kind") }); });
  });
  load();
  setInterval(load, 30000);
})();
