(function () {
  var API = window.GOLIVE_API || "";
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var GREEN = "#007F67", PINK = "#A3134F", GREY = "#9A9CAA", BLUE = "#292EB1";
  var ICON = {
    done: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + GREEN + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M7.5 12.5l3 3 6-6.5"></path></svg>',
    problem: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + PINK + '" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M12 7v6"></path><path d="M12 16.5v.5"></path></svg>',
    note: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="' + GREY + '" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M8 12h8"></path></svg>',
    spin: '<svg class="spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="#C9CCEE"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="' + BLUE + '"></path></svg>',
    big_ok: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' + GREEN + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="flex:none"><circle cx="12" cy="12" r="10"></circle><path d="M7.5 12.5l3 3 6-6.5"></path></svg>',
    big_x: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="' + PINK + '" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" style="flex:none"><circle cx="12" cy="12" r="10"></circle><path d="M12 7v6"></path><path d="M12 16.5v.5"></path></svg>'
  };
  var state = { partners: [], pick: null, job: null, timer: null, page: null, name: "" };

  function show(id) {
    ["pick", "checking", "result", "error"].forEach(function (s) { $(s).classList.toggle("hidden", s !== id); });
    window.scrollTo(0, 0);
  }

  // Step text from the checker, minus the technical asides.
  function plain(t) {
    return String(t)
      .replace(/\s*\(\d+ KB, \d+ scripts?\)/, "")
      .replace(/\s*\(read by [^)]*\)/, "")
      .replace("Loaded the confirmation page", "Opened their order confirmation page")
      .replace("Found the offer tag", "Found the offer code");
  }

  function loadPartners() {
    fetch(API + "/api/partners").then(function (r) { return r.json(); }).then(function (d) {
      var order = ["example-01", "example-04", "example-02", "example-11", "example-10", "example-13"];
      state.partners = d.partners.filter(function (p) { return p.featured; })
        .sort(function (a, b) { return order.indexOf(a.slug) - order.indexOf(b.slug); });
      $("partners").innerHTML = state.partners.map(function (p, i) {
        var pass = /should pass/i.test(p.hint);
        return '<button type="button" class="pcard" aria-pressed="false" data-i="' + i + '">' +
          '<em class="tag ' + (pass ? "ok" : "bad") + '">' + (pass ? "No mistakes" : "Has a mistake") + "</em>" +
          "<b>" + esc(p.about) + "</b><span>" + esc(p.hint) + "</span></button>";
      }).join("");
      Array.prototype.forEach.call(document.querySelectorAll(".pcard"), function (b) {
        b.addEventListener("click", function () { pick(+b.getAttribute("data-i")); });
      });
      pick(1);   // start with "Pays the wrong account" chosen, so the button is ready
    }).catch(function () {
      $("partners").innerHTML = '<p style="margin:0">The checker is waking up. Refresh in a minute.</p>';
    });
  }

  function pick(i) {
    state.pick = state.partners[i];
    Array.prototype.forEach.call(document.querySelectorAll(".pcard"), function (b) {
      b.setAttribute("aria-pressed", String(+b.getAttribute("data-i") === i));
    });
    $("run").disabled = false;
    $("run").textContent = "Check this page";
  }

  function start(body, name, page) {
    state.name = name;
    state.page = page;
    $("ctitle").textContent = /^Example store/.test(name) ? "Checking the page" : "Checking " + name;
    $("steps").innerHTML = '<li class="step">' + ICON.spin + "<span>Starting</span></li>";
    show("checking");
    fetch(API + "/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.detail || "The check could not start."); return d; }); })
      .then(function (d) { state.job = d.job_id; poll(); })
      .catch(function (e) { fail(e.message); });
  }

  function poll() {
    fetch(API + "/api/check/" + state.job).then(function (r) { return r.json(); }).then(function (s) {
      renderSteps(s.steps || [], s.status === "running");
      if (s.status === "running") { state.timer = setTimeout(poll, 700); return; }
      if (s.status === "error") { fail(s.error); return; }
      renderResult(s.report);
    }).catch(function () { state.timer = setTimeout(poll, 1500); });
  }

  function renderSteps(steps, running) {
    var html = steps.map(function (s) {
      var icon = s.status === "problem" ? ICON.problem : s.status === "note" ? ICON.note : ICON.done;
      return '<li class="step">' + icon + "<span>" + esc(plain(s.text)) + "</span></li>";
    }).join("");
    if (running) html += '<li class="step">' + ICON.spin + '<span style="font-weight:600">Working on the next step</span></li>';
    $("steps").innerHTML = html;
  }

  function fixList(items, start) {
    return '<ol style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:12px">' + items.map(function (f, i) {
      return '<li class="card" style="padding:22px 24px;display:flex;gap:16px;align-items:flex-start">' +
        '<div style="flex:none;width:34px;height:34px;border-radius:50%;background:#FFEAF1;color:#A3134F;display:flex;align-items:center;justify-content:center;font-weight:700">' + (start + i) + "</div>" +
        '<div style="display:flex;flex-direction:column;gap:6px"><h3 style="margin:4px 0 0;font-size:18px">' + esc(f.title) + "</h3>" +
        '<p style="margin:0;font-size:15px;line-height:1.55;color:#55576A">' + esc(f.why) + "</p></div></li>";
    }).join("") + "</ol>";
  }

  function renderResult(r) {
    var who = /^Example store/.test(r.partner) ? "This page" : r.partner;
    var blockers = r.findings.filter(function (f) { return f.severity === "blocker"; });
    var warnings = r.findings.filter(function (f) { return f.severity !== "blocker"; });
    var go = r.verdict === "go";
    var v = $("verdict");
    v.style.background = go ? "#EEF9AF" : "#FFEAF1";
    v.style.border = go ? "0" : "1px solid #F7B5CC";
    var sub;
    if (go) {
      sub = warnings.length ? "It can launch. " + warnings.length + (warnings.length === 1 ? " small thing" : " small things") + " should be fixed soon."
                            : "Everything checks out.";
    } else {
      sub = blockers.length + (blockers.length === 1 ? " thing needs" : " things need") + " fixing before offers can go live.";
    }
    v.innerHTML = (go ? ICON.big_ok : ICON.big_x) + '<div style="display:flex;flex-direction:column;gap:6px">' +
      '<h1 style="margin:0;font-size:32px;letter-spacing:-0.02em">' + esc(who) + (go ? " is ready to go live" : " is not ready yet") + "</h1>" +
      '<p style="margin:0;font-size:18px">' + esc(sub) + "</p></div>";

    var fx = "";
    if (blockers.length) fx += '<h2 style="margin:0;font-size:22px">What to fix</h2>' + fixList(blockers, 1);
    if (warnings.length) fx += '<h2 style="margin:8px 0 0;font-size:22px">Can wait until after launch</h2>' + fixList(warnings, blockers.length + 1);
    $("fixes").innerHTML = fx;
    $("fixes").classList.toggle("hidden", !fx);

    $("msgbox").classList.toggle("hidden", !r.findings.length);
    $("msgtitle").textContent = who === "This page" ? "Message for the partner's developer"
                                                   : "Message for " + who + (/s$/i.test(who) ? "'" : "'s") + " developer";
    $("msg").textContent = r.developer_note;

    $("next").classList.toggle("hidden", !go);
    $("nextlist").innerHTML = (r.checklist || []).map(function (c, i) {
      return '<li style="display:flex;gap:12px;align-items:center"><input type="checkbox" id="n' + i + '" style="width:20px;height:20px;accent-color:#007F67"><label for="n' + i + '">' + esc(c) + "</label></li>";
    }).join("");

    $("openpage").href = state.page;
    var by = r.mode === "agent" ? "Checked by the AI agent. The code, not the agent, decides what counts as a problem and whether the partner can launch."
                                 : "Checked by the simple rules.";
    if (r.notes && r.notes.length) by += " " + r.notes.join(" ");
    $("who").textContent = by;

    $("tech").innerHTML =
      "<div><b>Steps</b><ol style=\"margin:6px 0 0;padding-left:20px\">" + r.steps.map(function (s) {
        return "<li>" + esc(s.text) + (s.evidence_id ? ' <span style="color:#55576A">(' + esc(s.evidence_id) + ")</span>" : "") + "</li>";
      }).join("") + "</ol></div>" +
      "<div><b>Problem codes</b>: " + (r.findings.map(function (f) { return esc(f.code) + " (" + esc(f.evidence_ids.join(", ")) + ")"; }).join(", ") || "none") + "</div>" +
      "<div><b>Evidence</b><pre>" + esc(JSON.stringify(r.evidence, null, 2)) + "</pre></div>";
    show("result");
  }

  function fail(msg) {
    $("errtext").textContent = msg || "Something went wrong.";
    show("error");
  }

  function reset() {
    clearTimeout(state.timer);
    show("pick");
  }

  $("run").addEventListener("click", function () {
    if (!state.pick) return;
    start({ partner: state.pick.slug, mode: "agent" }, state.pick.name, API + "/partners/" + state.pick.slug + "/confirmation");
  });
  $("runurl").addEventListener("click", function () {
    var url = $("curl").value.trim(), pid = $("cpid").value.trim(), name = $("cname").value.trim() || "This partner";
    if (!/^https?:\/\//.test(url) || !pid) { $("curl").focus(); return; }
    start({ url: url, partner_id: pid, partner_name: name, mode: "agent" }, name, url);
  });
  $("copy").addEventListener("click", function () {
    var t = $("msg").textContent;
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function () {
      $("copy").textContent = "Copied";
      setTimeout(function () { $("copy").textContent = "Copy message"; }, 1500);
    }).catch(function () {});
  });
  $("again").addEventListener("click", reset);
  $("again2").addEventListener("click", reset);
  loadPartners();
})();
