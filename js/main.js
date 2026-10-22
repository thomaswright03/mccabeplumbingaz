(() => {
  "use strict";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  /* ---------- Preloader ---------- */
  window.addEventListener("load", () => {
    const pre = $("#preloader");
    setTimeout(() => {
      pre.classList.add("done");
      document.body.style.overflow = "";
      playHeroIntro();
    }, reduce ? 0 : 1600);
  });
  document.body.style.overflow = "hidden";
  // Safety: never let the preloader trap the page
  setTimeout(() => {
    const pre = $("#preloader");
    if (pre && !pre.classList.contains("done")) {
      pre.classList.add("done");
      document.body.style.overflow = "";
      playHeroIntro();
    }
  }, 3000);

  /* ---------- Year ---------- */
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Split hero headline into chars (preserving .grad spans) ---------- */
  $$("[data-splitline]").forEach((line) => {
    line.setAttribute("aria-label", line.textContent);
    const nodes = [...line.childNodes];
    const frag = document.createDocumentFragment();
    const addChars = (str, grad) => {
      [...str].forEach((ch) => {
        const s = document.createElement("span");
        s.className = "char" + (grad ? " grad" : "");
        s.textContent = ch === " " ? " " : ch;
        frag.appendChild(s);
      });
    };
    nodes.forEach((n) => {
      if (n.nodeType === Node.TEXT_NODE) addChars(n.textContent, false);
      else addChars(n.textContent, n.classList && n.classList.contains("grad"));
    });
    line.innerHTML = "";
    line.appendChild(frag);
  });

  let heroPlayed = false;
  function playHeroIntro() {
    if (heroPlayed) return;
    heroPlayed = true;
    const chars = $$(".hero__title .char");
    chars.forEach((c, i) => {
      if (reduce) { c.style.transform = "none"; return; }
      c.style.transition = "transform .9s cubic-bezier(.16,1,.3,1)";
      c.style.transitionDelay = (i * 0.028) + "s";
      requestAnimationFrame(() => { c.style.transform = "translateY(0)"; });
    });
    // reveal hero items
    $$(".hero [data-reveal]").forEach((el, i) => {
      setTimeout(() => el.classList.add("in"), reduce ? 0 : 250 + i * 110);
    });
  }

  /* ---------- Scroll reveal ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        // staggered checks inside
        $$("[data-check]", e.target).forEach((c, i) => {
          setTimeout(() => c.classList.add("in"), i * 90);
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  $$("[data-reveal]").forEach((el) => {
    if (el.closest(".hero")) return; // hero handled by intro
    io.observe(el);
  });
  $$("[data-check]").forEach((c) => {
    if (!c.closest("[data-reveal]")) io.observe(c);
  });

  /* ---------- Header + scroll progress + totop ---------- */
  const header = $("#header");
  const progress = $("#scrollProgress");
  const totop = $("#totop");
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle("scrolled", y > 30);
    totop.classList.toggle("show", y > 600);
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? (y / h) * 100 : 0) + "%";
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  totop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));

  /* ---------- Mobile menu ---------- */
  const burger = $("#burger"), mobile = $("#mobilemenu");
  const toggleMenu = (open) => {
    burger.classList.toggle("open", open);
    mobile.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleMenu(!mobile.classList.contains("open")));
  $$("#mobilemenu a").forEach((a) => a.addEventListener("click", () => toggleMenu(false)));

  /* ---------- Count up ---------- */
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      const target = +el.dataset.count;
      const suffix = el.dataset.suffix || "";
      const dur = reduce ? 0 : 1600;
      const start = performance.now();
      const fmt = (n) => n >= 1000 ? Math.round(n).toLocaleString() : Math.round(n);
      const tick = (now) => {
        const p = dur === 0 ? 1 : Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  $$("[data-count]").forEach((el) => countIO.observe(el));

  /* ---------- Timeline fill ---------- */
  const tl = $("#timeline"), fill = $("#timelineFill");
  if (tl && fill) {
    const tlIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { fill.style.width = "100%"; tlIO.unobserve(e.target); } });
    }, { threshold: 0.4 });
    tlIO.observe(tl);
  }

  /* ---------- Glow tracking + 3D tilt ---------- */
  const tiltEls = $$("[data-tilt]");
  tiltEls.forEach((el) => {
    el.addEventListener("pointermove", (ev) => {
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width;
      const py = (ev.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      if (!reduce) {
        const rx = (py - 0.5) * -10;
        const ry = (px - 0.5) * 12;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      }
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });

  /* ---------- Magnetic buttons ---------- */
  if (!reduce && window.matchMedia("(pointer:fine)").matches) {
    $$("[data-magnetic]").forEach((el) => {
      const strength = 0.3;
      el.addEventListener("pointermove", (ev) => {
        const r = el.getBoundingClientRect();
        const x = ev.clientX - (r.left + r.width / 2);
        const y = ev.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("pointerleave", () => { el.style.transform = ""; });
    });
  }

  /* ---------- Button ripple ---------- */
  $$(".btn").forEach((btn) => {
    btn.addEventListener("click", (ev) => {
      const r = btn.getBoundingClientRect();
      const span = document.createElement("span");
      span.className = "ripple";
      span.style.left = (ev.clientX - r.left) + "px";
      span.style.top = (ev.clientY - r.top) + "px";
      btn.appendChild(span);
      setTimeout(() => span.remove(), 650);
    });
  });

  /* ---------- Custom cursor ---------- */
  const cursor = $("#cursor"), dot = $("#cursorDot");
  if (window.matchMedia("(pointer:fine)").matches) {
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = `translate(${tx}px,${ty}px) translate(-50%,-50%)`;
    });
    const loop = () => {
      cx += (tx - cx) * 0.18; cy += (ty - cy) * 0.18;
      cursor.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    };
    loop();
    $$("a, button, [data-tilt], summary").forEach((el) => {
      el.addEventListener("pointerenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("pointerleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- Hero droplets ---------- */
  const dropWrap = $("#droplets");
  if (dropWrap && !reduce) {
    for (let i = 0; i < 18; i++) {
      const d = document.createElement("span");
      d.className = "droplet";
      d.style.left = Math.random() * 100 + "%";
      d.style.animationDuration = (3 + Math.random() * 4) + "s";
      d.style.animationDelay = (Math.random() * 5) + "s";
      d.style.height = (10 + Math.random() * 16) + "px";
      d.style.opacity = (0.2 + Math.random() * 0.4).toFixed(2);
      dropWrap.appendChild(d);
    }
  }

  /* ---------- Hero parallax ---------- */
  if (!reduce) {
    const orbs = $$(".hero .orb");
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      orbs.forEach((o, i) => { o.style.transform = `translateY(${y * (0.08 + i * 0.04)}px)`; });
    }, { passive: true });
  }

  /* ---------- Smooth anchor scroll (header offset) ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      const t = $(id);
      if (!t) return;
      e.preventDefault();
      const top = t.getBoundingClientRect().top + window.scrollY - 76;
      window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    });
  });

  /* ---------- Active nav link ---------- */
  const sections = $$("main section[id]");
  const navLinks = $$(".nav a");
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const id = e.target.id;
        navLinks.forEach((l) => l.style.color = l.getAttribute("href") === "#" + id ? "var(--text)" : "");
      }
    });
  }, { threshold: 0.4 });
  sections.forEach((s) => navIO.observe(s));
})();
