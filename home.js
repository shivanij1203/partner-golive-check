// Home page motion: reveal on scroll, the email scrambling, and the "How it works" player.
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Reveal sections as they scroll into view.
  var items = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("seen"); io.unobserve(e.target); } });
    }, { threshold: 0.15 });
    Array.prototype.forEach.call(items, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(items, function (el) { el.classList.add("seen"); });
  }

  // The email turns from plain text into a scrambled hash, then back.
  var pill = document.getElementById("emailpill"), label = document.getElementById("emaillabel");
  var plain = "shopper@example.com", hashed = "9f2c4e81a7d3b065...";
  var hex = "0123456789abcdef";
  function scramble(done) {
    var n = 0;
    var t = setInterval(function () {
      n++;
      var out = "";
      for (var i = 0; i < hashed.length; i++) {
        out += i < n ? hashed[i] : hex[Math.floor(Math.random() * 16)];
      }
      pill.textContent = out;
      if (n >= hashed.length) { clearInterval(t); done(); }
    }, 45);
  }
  function setPlain() {
    pill.textContent = plain;
    pill.className = "pill bad"; label.className = "plabel bad";
    label.textContent = "Plain text: anyone can read it";
  }
  function cycle() {
    setPlain();
    setTimeout(function () {
      label.textContent = "Scrambling...";
      scramble(function () {
        pill.className = "pill good"; label.className = "plabel good";
        label.textContent = "Scrambled: safe to share";
        setTimeout(cycle, 2600);
      });
    }, 2200);
  }
  if (pill && !reduce) cycle();

  // "How it works": steps play in turn; click one to jump to it.
  var steps = document.querySelectorAll(".hstep"), scenes = document.querySelectorAll(".scene");
  var how = document.querySelector(".how"), cur = 0, timer = null;
  function go(i) {
    cur = i;
    Array.prototype.forEach.call(steps, function (s, k) { s.classList.toggle("on", k === i); s.setAttribute("aria-pressed", String(k === i)); });
    Array.prototype.forEach.call(scenes, function (s, k) {
      s.classList.toggle("on", k === i);
      if (k === i) { var c = s.cloneNode(true); s.parentNode.replaceChild(c, s); }   // restart its animations
    });
    scenes = document.querySelectorAll(".scene");
  }
  function play() {
    clearInterval(timer);
    if (reduce) { how.classList.add("paused"); return; }
    timer = setInterval(function () { go((cur + 1) % steps.length); }, 4000);
  }
  Array.prototype.forEach.call(steps, function (s) {
    s.addEventListener("click", function () { go(+s.getAttribute("data-step")); play(); });
  });
  if (steps.length) { go(0); play(); }
})();
