// Shared wayfinding: a journey bar under the header and a "next step" card at the bottom of
// every page, so nobody has to guess where to go next.
(function () {
  var page = document.body.getAttribute("data-page") || "home";
  var steps = [
    { key: "home", href: "index.html", label: "How it works" },
    { key: "check", href: "check.html", label: "Check a partner" },
    { key: "health", href: "health.html", label: "Partner health" },
    { key: "works", href: "works.html", label: "Does it work?" }
  ];
  var NEXT = {
    home: { title: "Next: check a partner's page", text: "Pick a practice page and watch the AI agent check it.",
            href: "check.html", button: "Check a partner", alt: { href: "health.html", label: "Or jump to partner health" } },
    check: { title: "Next: keep live partners working", text: "Once a partner is live, the same agent finds out why when your data shows something changed.",
             href: "health.html", button: "See partner health", alt: { href: "check.html", label: "Or check another page" } },
    health: { title: "Next: see how well it works", text: "It was tested on pages where every problem was already known.",
              href: "works.html", button: "Does it work?", alt: { href: "check.html", label: "Or check another page" } },
    works: { title: "That's the whole tour", text: "Want to try it again, or check one more page?",
             href: "check.html", button: "Check a partner", alt: { href: "index.html", label: "Or go back to the start" } }
  };

  // Journey bar
  var header = document.querySelector("header");
  if (header) {
    var idx = steps.findIndex(function (s) { return s.key === page; });
    var bar = document.createElement("div");
    bar.className = "journey";
    bar.setAttribute("aria-label", "Where you are");
    bar.innerHTML = '<div class="journey-in">' + steps.map(function (s, i) {
      var state = i === idx ? "on" : (idx > i ? "done" : "");
      return '<a href="' + s.href + '" class="jstep ' + state + '"' + (i === idx ? ' aria-current="step"' : "") + ">" +
        '<span class="jnum">' + (idx > i ? "&#10003;" : (i + 1)) + "</span><span>" + s.label + "</span></a>" +
        (i < steps.length - 1 ? '<span class="jline" aria-hidden="true"></span>' : "");
    }).join("") + (idx === -1 ? '<span class="jextra">Extra page</span>' : "") + "</div>";
    header.parentNode.insertBefore(bar, header.nextSibling);
  }

  // Next-step card
  var n = NEXT[page];
  var main = document.querySelector("main");
  if (n && main) {
    var card = document.createElement("section");
    card.className = "nextstep";
    card.innerHTML = '<div><div class="nlabel">Next step</div><h2>' + n.title + "</h2><p>" + n.text + "</p></div>" +
      '<div class="nactions"><a class="btn" href="' + n.href + '">' + n.button + ' <span aria-hidden="true">&rarr;</span></a>' +
      '<a class="nalt" href="' + n.alt.href + '">' + n.alt.label + "</a></div>";
    main.appendChild(card);
  }
})();
