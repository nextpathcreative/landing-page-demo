/* =====================================================================
   Cornerstone Plumbing — LANDING page behavior (vanilla JS)
   - reusable 3-step scheduler factory (mounts in hero + booking modal)
   - booking modal (header / CTA band open it)
   - before/after comparison sliders + service-type filter
   - scroll reveals, animated "how it works"
   ===================================================================== */
(function () {
  "use strict";

  var PHONE = "(206) 555-0142";
  var OWNER = "Mark";

  function refreshIcons() { if (window.lucide) window.lucide.createIcons(); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }

  /* ---------------- Availability model (shared) ---------------- */
  // 2-hour windows. Availability is mocked deterministically per date.
  // TODO: wire to real backend / scheduler — owner confirms by text for now.
  var SLOTS = [
    { h: 8,  l: "8 AM" }, { h: 10, l: "10 AM" }, { h: 12, l: "12 PM" },
    { h: 14, l: "2 PM" }, { h: 16, l: "4 PM" },  { h: 18, l: "6 PM" }
  ];
  function buildDays() {
    var out = [], c = new Date();
    c = new Date(c.getFullYear(), c.getMonth(), c.getDate());
    while (out.length < 5) { if (c.getDay() !== 0) out.push(new Date(c)); c = new Date(c.getTime() + 86400000); }
    return out;
  }
  function bookedSet(d) {
    var s = d.toDateString().split("").reduce(function (a, c) { return a + c.charCodeAt(0); }, 0);
    var t = {};
    SLOTS.forEach(function (x, i) { if ((s * (i + 7)) % 10 < 3) t[x.h] = true; });
    return t;
  }
  function isPast(d, h) {
    var n = new Date();
    if (d.toDateString() !== n.toDateString()) return false;
    return h <= n.getHours() + 1;
  }
  function dn(d) {
    var t = new Date(), tm = new Date(t.getTime() + 86400000);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === tm.toDateString()) return "Tmrw";
    return d.toLocaleDateString("en-US", { weekday: "short" });
  }
  function fd(d) {
    var t = new Date(), tm = new Date(t.getTime() + 86400000);
    if (d.toDateString() === t.toDateString()) return "Today";
    if (d.toDateString() === tm.toDateString()) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "long" });
  }
  function dl(d) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

  var days = buildDays();
  var soonest = null;
  for (var i = 0; i < days.length && !soonest; i++) {
    var tk = bookedSet(days[i]);
    for (var j = 0; j < SLOTS.length; j++) {
      if (!tk[SLOTS[j].h] && !isPast(days[i], SLOTS[j].h)) { soonest = { di: i, slot: SLOTS[j] }; break; }
    }
  }

  /* ---------------- Scheduler factory ---------------- */
  function createScheduler(host) {
    if (!host) return null;
    var state = { dayIdx: soonest ? soonest.di : 0, slot: soonest ? soonest.slot.h : null, step: 1, form: { name: "", phone: "", address: "", notes: "" } };
    var lastStep = 1;

    function render() {
      var day = days[state.dayIdx];
      var taken = bookedSet(day);
      var sel = SLOTS.filter(function (s) { return s.h === state.slot; })[0];
      var html = "";

      if (state.step === 1) {
        html += '<div class="sched-steps">';
        html += '<div class="sched-top"><div>'
             +  '<span class="sched-eyebrow"><i data-lucide="calendar"></i> Book a visit</span>'
             +  '<div class="sched-title">Pick a time that works</div></div>';
        if (soonest) html += '<span class="soonest"><span class="dot"></span>Soonest: ' + dn(days[soonest.di]) + ' ' + soonest.slot.l + '</span>';
        html += '</div>';
        html += '<div class="sched-step-label">When works for you?</div>';
        html += '<div class="days">';
        days.forEach(function (d, i) {
          html += '<button type="button" class="day' + (i === state.dayIdx ? " on" : "") + '" data-day="' + i + '">'
               +  '<span class="dn">' + dn(d) + '</span><span class="dd">' + d.getDate() + '</span></button>';
        });
        html += '</div>';
        html += '<div class="slot-lbl"><span>Open times · ' + fd(day) + ' ' + dl(day) + '</span><span class="muted">2-hour windows</span></div>';
        html += '<div class="slots">';
        SLOTS.forEach(function (s) {
          var past = isPast(day, s.h);
          var t2 = taken[s.h] || past;
          var on = state.slot === s.h;
          html += '<button type="button" class="slot' + (on ? " on" : "") + '" data-slot="' + s.h + '"' + (t2 ? " disabled" : "") + '>'
               +  '<span class="t">' + s.l + '</span><span class="st">' + (past ? "past" : t2 ? "booked" : on ? "picked" : "open") + '</span></button>';
        });
        html += '</div>';
        html += '<button type="button" class="btn btn-primary btn-block" data-next="2"' + (state.slot === null ? " disabled" : "") + '>'
             +  (state.slot === null ? "Pick a time above" : "Continue — " + fd(day) + " at " + sel.l) + '<i data-lucide="arrow-right"></i></button>';
        html += '<div class="sched-fine"><i data-lucide="shield-check"></i><span>Times are tentative until ' + OWNER + ' confirms by text — usually within the hour.</span></div>';
        html += '</div>';
      } else if (state.step === 2) {
        html += '<div class="sched-steps">';
        html += '<div class="sched-top" style="align-items:center;">'
             +  '<button type="button" class="sched-back" data-next="1"><i data-lucide="arrow-left"></i> Change time</button>'
             +  '<span class="sched-when"><i data-lucide="calendar"></i> ' + fd(day) + ' · ' + sel.l + '</span></div>';
        html += '<div class="sched-title" style="margin-top:2px;">Last thing — where and what?</div>';
        html += '<div class="sched-form">';
        html += '<div class="field"><label>Your name</label><input data-f="name" value="' + esc(state.form.name) + '" placeholder="Jamie Park" autocomplete="name" /></div>';
        html += '<div class="field"><label>Phone</label><input data-f="phone" value="' + esc(state.form.phone) + '" placeholder="' + PHONE + '" inputmode="tel" autocomplete="tel" /></div>';
        html += '<div class="field"><label>Address or ZIP</label><input data-f="address" value="' + esc(state.form.address) + '" placeholder="4218 Leary Way NW, or 98107" autocomplete="street-address" /></div>';
        html += '<div class="field"><label>What\'s going on?</label><textarea data-f="notes" placeholder="Water heater\'s leaking…">' + esc(state.form.notes) + '</textarea>'
             +  '<span class="help">A sentence is plenty — "water heater\'s leaking," "kitchen drain\'s backed up." We\'ll sort the details on the call.</span></div>';
        html += '</div>';
        html += '<button type="button" class="btn btn-primary btn-block" data-next="3"' + ((!state.form.name || !state.form.phone) ? " disabled" : "") + '>Request this time<i data-lucide="arrow-right"></i></button>';
        html += '<div class="sched-fine"><i data-lucide="message-square"></i><span>' + OWNER + ' will text to confirm — no marketing, no card needed.</span></div>';
        html += '</div>';
      } else {
        html += '<div class="done">';
        html += '<div class="check"><i data-lucide="check"></i></div>';
        html += '<div class="title">You\'re on ' + OWNER + '\'s list.</div>';
        html += '<div class="receipt">';
        html += '<div class="r"><span>Time requested</span><b>' + fd(day) + ' · ' + dl(day) + ' · ' + sel.l + '</b></div>';
        html += '<div class="r"><span>Phone</span><b>' + (esc(state.form.phone) || "—") + '</b></div>';
        html += '<div class="r"><span>Address</span><b>' + (esc(state.form.address) || "—") + '</b></div>';
        html += '</div>';
        html += '<p style="font-size:12.5px;color:var(--fg-muted);max-width:34ch;margin:0;line-height:1.5;">' + OWNER + ' will text you shortly to lock in the time. No card needed, and the estimate\'s free. If it\'s an emergency, call <a href="tel:+12065550142" style="color:var(--accent);font-weight:700;">' + PHONE + '</a> and we\'ll move fast.</p>';
        html += '<button type="button" class="sched-back" data-reset><i data-lucide="rotate-ccw"></i> Schedule another time</button>';
        html += '</div>';
      }

      host.innerHTML = html;
      var animated = state.step !== lastStep;
      lastStep = state.step;
      if (animated) { var ss = host.querySelector(".sched-steps"); if (ss) ss.classList.add("anim"); }
      bind();
      refreshIcons();
    }

    function bind() {
      host.querySelectorAll("[data-day]").forEach(function (b) {
        b.addEventListener("click", function () { state.dayIdx = +b.getAttribute("data-day"); state.slot = null; render(); });
      });
      host.querySelectorAll("[data-slot]").forEach(function (b) {
        if (b.disabled) return;
        b.addEventListener("click", function () { state.slot = +b.getAttribute("data-slot"); render(); });
      });
      host.querySelectorAll("[data-next]").forEach(function (b) {
        b.addEventListener("click", function () {
          var to = +b.getAttribute("data-next");
          if (to === 2 && state.slot === null) return;
          if (to === 3 && (!state.form.name || !state.form.phone)) return;
          state.step = to; render();
        });
      });
      host.querySelectorAll("[data-f]").forEach(function (el) {
        el.addEventListener("input", function () {
          state.form[el.getAttribute("data-f")] = el.value;
          var btn = host.querySelector('[data-next="3"]');
          if (btn) btn.disabled = !state.form.name || !state.form.phone;
        });
      });
      var rs = host.querySelector("[data-reset]");
      if (rs) rs.addEventListener("click", function () {
        state.step = 1; state.slot = null; state.form = { name: "", phone: "", address: "", notes: "" }; render();
      });
    }

    render();
    return { reset: function () { state.step = 1; state.slot = null; state.form = { name: "", phone: "", address: "", notes: "" }; render(); } };
  }

  // mount hero scheduler
  createScheduler(document.getElementById("hero-scheduler"));

  /* ---------------- Booking modal ---------------- */
  var modal = document.getElementById("bookModal");
  var modalSched = null;
  function openModal() {
    if (!modal) return;
    if (!modalSched) modalSched = createScheduler(document.getElementById("modal-scheduler"));
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-lock");
    refreshIcons();
    var x = modal.querySelector(".modal-x");
    if (x) setTimeout(function () { try { x.focus({ preventScroll: true }); } catch (e) {} }, 60);
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-lock");
  }
  if (modal) {
    modal.querySelectorAll("[data-close]").forEach(function (el) { el.addEventListener("click", closeModal); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
  }
  document.querySelectorAll("[data-book-modal]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); openModal(); });
  });

  /* ---------------- Hero "see available times" → flash inline ---------------- */
  function goToSched() {
    var target = document.getElementById("hero-scheduler");
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("flash"); void target.offsetWidth; target.classList.add("flash");
  }
  document.querySelectorAll("[data-book]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); goToSched(); });
  });

  var brandTop = document.getElementById("brandTop");
  if (brandTop) {
    var toTop = function () { window.scrollTo({ top: 0, behavior: "smooth" }); };
    brandTop.addEventListener("click", toTop);
    brandTop.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toTop(); } });
  }

  /* ---------------- Header CTA: ghost at top, solid past the hero ---------------- */
  (function () {
    var heroEl = document.querySelector(".section_landing-hero");
    var headerCta = document.getElementById("headerCta");
    if (!heroEl || !headerCta || !("IntersectionObserver" in window)) return;
    var sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;left:0;bottom:0;width:1px;height:1px;pointer-events:none;";
    heroEl.appendChild(sentinel);
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        headerCta.classList.toggle("is-solid", en.boundingClientRect.top < 80);
      });
    }, { threshold: 0, rootMargin: "-80px 0px 0px 0px" });
    io.observe(sentinel);
  })();

  /* ---------------- Before / after sliders ---------------- */
  document.querySelectorAll(".ba").forEach(function (ba) {
    var handle = ba.querySelector(".ba-handle");
    function setPos(clientX) {
      var r = ba.getBoundingClientRect();
      var p = ((clientX - r.left) / r.width) * 100;
      p = Math.max(6, Math.min(94, p));
      ba.style.setProperty("--pos", p + "%");
    }
    var dragging = false;
    ba.addEventListener("pointerdown", function (e) { dragging = true; try { ba.setPointerCapture(e.pointerId); } catch (x) {} setPos(e.clientX); });
    ba.addEventListener("pointermove", function (e) { if (dragging) setPos(e.clientX); });
    ba.addEventListener("pointerup", function () { dragging = false; });
    ba.addEventListener("pointercancel", function () { dragging = false; });
    if (handle) handle.addEventListener("keydown", function (e) {
      var cur = parseFloat(ba.style.getPropertyValue("--pos")) || 50;
      if (e.key === "ArrowLeft") cur -= 5; else if (e.key === "ArrowRight") cur += 5; else return;
      e.preventDefault();
      ba.style.setProperty("--pos", Math.max(6, Math.min(94, cur)) + "%");
    });
  });

  /* ---------------- Work filter tabs ---------------- */
  var tabs = document.querySelectorAll(".work-tab");
  var jobs = document.querySelectorAll(".job");
  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      tabs.forEach(function (x) { x.classList.toggle("on", x === t); });
      var c = t.getAttribute("data-cat");
      jobs.forEach(function (jb) { jb.classList.toggle("hide", c !== "all" && jb.getAttribute("data-cat") !== c); });
    });
  });

  /* ---------------- Review list: user-paced "load more" ---------------- */
  (function () {
    var btn = document.getElementById("revLoadMore");
    var list = document.getElementById("revList");
    if (!btn || !list) return;
    var BATCH = 3;
    function hiddenCards() { return Array.prototype.slice.call(list.querySelectorAll(".rev-more.hidden")); }
    btn.addEventListener("click", function () {
      hiddenCards().slice(0, BATCH).forEach(function (el, i) {
        el.classList.remove("hidden");
        el.classList.add("show");
        el.style.animationDelay = (i * 80) + "ms";
      });
      if (hiddenCards().length === 0) {
        btn.style.transition = "opacity 240ms";
        btn.style.opacity = "0";
        setTimeout(function () { btn.remove(); }, 240);
      }
    });
  })();

  /* ---------------- Scroll reveals + staggered groups ---------------- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-reveal-group]").forEach(function (g) {
    g.querySelectorAll("[data-reveal]").forEach(function (el, i) { el.style.transitionDelay = (i * 70) + "ms"; });
  });

  if (reduce || !("IntersectionObserver" in window)) {
    document.querySelectorAll("[data-reveal]").forEach(function (el) { el.classList.add("in"); });
    var st = document.getElementById("steps"); if (st) st.classList.add("in");
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll("[data-reveal]").forEach(function (el) { io.observe(el); });

    var stepsEl = document.getElementById("steps");
    if (stepsEl) {
      var io2 = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io2.unobserve(en.target); } });
      }, { threshold: 0.3 });
      io2.observe(stepsEl);
    }
    setTimeout(function () {
      document.querySelectorAll("[data-reveal]:not(.in)").forEach(function (el) {
        if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add("in");
      });
    }, 1600);
  }

  refreshIcons();
})();
