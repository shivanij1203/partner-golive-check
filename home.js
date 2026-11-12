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

  // "How it works": steps play in turn, slowly enough to read. Hovering or focusing pauses it;
  // the arrows step through by hand; the button pauses and resumes.
  var steps = document.querySelectorAll(".hstep"), scenes = document.querySelectorAll(".scene");
  var how = document.querySelector(".how"), cur = 0, timer = null, userPaused = reduce, hovering = false;
  var playBtn = document.getElementById("hplay");
  function go(i) {
    cur = (i + steps.length) % steps.length;
    Array.prototype.forEach.call(steps, function (s, k) { s.classList.toggle("on", k === cur); s.setAttribute("aria-pressed", String(k === cur)); });
    Array.prototype.forEach.call(scenes, function (s, k) {
      s.classList.toggle("on", k === cur);
      if (k === cur) { var c = s.cloneNode(true); s.parentNode.replaceChild(c, s); }   // restart its animations
    });
    scenes = document.querySelectorAll(".scene");
    // restart the progress bar
    var bar = steps[cur].querySelector(".prog");
    if (bar) { bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = ""; }
  }
  function sync() {
    var paused = userPaused || hovering;
    how.classList.toggle("paused", paused);
    if (playBtn) { playBtn.textContent = userPaused ? "Play" : "Pause"; playBtn.setAttribute("aria-label", userPaused ? "Play" : "Pause"); }
    clearInterval(timer);
    if (!paused) timer = setInterval(function () { go(cur + 1); }, 7000);
  }
  if (how) {
    if (reduce) how.classList.add("still");
    Array.prototype.forEach.call(steps, function (s) {
      s.addEventListener("click", function () { go(+s.getAttribute("data-step")); sync(); });
    });
    how.addEventListener("mouseenter", function () { hovering = true; sync(); });
    how.addEventListener("mouseleave", function () { hovering = false; sync(); });
    how.addEventListener("focusin", function () { hovering = true; sync(); });
    how.addEventListener("focusout", function () { hovering = false; sync(); });
    document.getElementById("hprev").addEventListener("click", function () { go(cur - 1); sync(); });
    document.getElementById("hnext").addEventListener("click", function () { go(cur + 1); sync(); });
    playBtn.addEventListener("click", function () { userPaused = !userPaused; sync(); });
    go(0); sync();
  }
})();
