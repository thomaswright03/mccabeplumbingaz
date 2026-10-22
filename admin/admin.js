(() => {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KEY = "mccabe_admin_in";

  /* ---------- Mock auth (any credentials) ---------- */
  const login = $("#login"), dash = $("#dash");
  function enter(animate) {
    login.classList.add("hide");
    dash.classList.add("show");
    try { sessionStorage.setItem(KEY, "1"); } catch (e) {}
    if (animate !== false) initDashboard();
  }
  $("#loginForm").addEventListener("submit", (e) => { e.preventDefault(); enter(); });
  $("#logout").addEventListener("click", () => {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  });
  // Stay signed in within the session
  let already = false;
  try { already = sessionStorage.getItem(KEY) === "1"; } catch (e) {}
  if (already) { login.classList.add("hide"); dash.classList.add("show"); }

  /* ---------- Helpers ---------- */
  const fmt = (n) => Math.round(n).toLocaleString();
  function countUp(el, target, dur) {
    const start = performance.now();
    const d = reduce ? 0 : (dur || 1400);
    const step = (now) => {
      const p = d === 0 ? 1 : Math.min((now - start) / d, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Sparklines ---------- */
  function drawSpark(svg) {
    const data = svg.dataset.spark.split(",").map(Number);
    const w = 90, h = 34, max = Math.max(...data), min = Math.min(...data);
    const nx = (i) => (i / (data.length - 1)) * w;
    const ny = (v) => h - 3 - ((v - min) / (max - min || 1)) * (h - 6);
    let d = "M" + nx(0) + " " + ny(data[0]);
    data.forEach((v, i) => { if (i) d += " L" + nx(i).toFixed(1) + " " + ny(v).toFixed(1); });
    const area = d + ` L${w} ${h} L0 ${h} Z`;
    svg.innerHTML = `<path class="area" d="${area}"/><path d="${d}"/>`;
    const line = svg.querySelector("path:last-child");
    if (!reduce) {
      const len = line.getTotalLength();
      line.style.strokeDasharray = len; line.style.strokeDashoffset = len;
      line.getBoundingClientRect();
      line.style.transition = "stroke-dashoffset 1.3s ease";
      line.style.strokeDashoffset = 0;
    }
  }

  /* ---------- Area chart ---------- */
  const W = 760, H = 260, PAD = { l: 38, r: 14, t: 16, b: 26 };
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b;
  const tip = $("#tip");

  function genSeries(days) {
    const arr = [];
    let base = days === 7 ? 360 : days === 90 ? 180 : 260;
    for (let i = 0; i < days; i++) {
      const trend = i / days * (days === 90 ? 320 : 180);
      const wave = Math.sin(i / 2.4) * 40;
      const weekend = (i % 7 === 5 || i % 7 === 6) ? -55 : 0;
      const noise = (Math.sin(i * 12.9898) * 43758.5453 % 1) * 70;
      arr.push(Math.max(60, Math.round(base + trend + wave + weekend + Math.abs(noise))));
    }
    return arr;
  }

  function drawChart(days) {
    const data = genSeries(days);
    const max = Math.max(...data) * 1.1, min = 0;
    const nx = (i) => PAD.l + (i / (data.length - 1)) * iw;
    const ny = (v) => PAD.t + ih - ((v - min) / (max - min)) * ih;
    const chart = $("#chart");

    // gridlines + y labels
    let grid = '<g class="grid">';
    for (let g = 0; g <= 4; g++) {
      const y = PAD.t + (ih / 4) * g;
      const val = Math.round(max - (max / 4) * g);
      grid += `<line x1="${PAD.l}" y1="${y}" x2="${W - PAD.r}" y2="${y}"/>`;
      grid += `<text x="${PAD.l - 8}" y="${y + 4}" text-anchor="end">${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val}</text>`;
    }
    grid += "</g>";

    // x labels (few)
    let xlabels = "";
    const ticks = days === 7 ? 7 : days === 90 ? 6 : 6;
    for (let t = 0; t < ticks; t++) {
      const i = Math.round((data.length - 1) * (t / (ticks - 1)));
      const daysAgo = data.length - 1 - i;
      const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
      const lbl = dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      xlabels += `<text x="${nx(i)}" y="${H - 6}" text-anchor="middle">${lbl}</text>`;
    }

    let line = "M" + nx(0) + " " + ny(data[0]);
    data.forEach((v, i) => { if (i) line += " L" + nx(i).toFixed(1) + " " + ny(v).toFixed(1); });
    const area = line + ` L${nx(data.length - 1)} ${PAD.t + ih} L${nx(0)} ${PAD.t + ih} Z`;

    chart.innerHTML = grid + xlabels +
      `<path class="area" d="${area}"/>` +
      `<path class="line" d="${line}"/>` +
      `<circle class="dot" id="dot" r="4" cx="${nx(data.length - 1)}" cy="${ny(data[data.length - 1])}"/>`;

    const path = chart.querySelector(".line");
    if (!reduce) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
      path.getBoundingClientRect();
      path.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1)";
      path.style.strokeDashoffset = 0;
      const areaEl = chart.querySelector(".area");
      areaEl.style.opacity = 0; areaEl.style.transition = "opacity 1.2s ease .4s";
      requestAnimationFrame(() => areaEl.style.opacity = 1);
    }

    // hover tooltip
    chart.onpointermove = (ev) => {
      const r = chart.getBoundingClientRect();
      const relX = (ev.clientX - r.left) / r.width * W;
      let idx = Math.round((relX - PAD.l) / iw * (data.length - 1));
      idx = Math.max(0, Math.min(data.length - 1, idx));
      const dot = $("#dot");
      dot.setAttribute("cx", nx(idx)); dot.setAttribute("cy", ny(data[idx]));
      const px = (nx(idx) / W) * r.width;
      const py = (ny(data[idx]) / H) * r.height;
      const daysAgo = data.length - 1 - idx;
      const dt = new Date(); dt.setDate(dt.getDate() - daysAgo);
      tip.style.left = px + "px"; tip.style.top = py + "px"; tip.style.opacity = 1;
      tip.innerHTML = `<b>${fmt(data[idx])}</b> visits<br>${dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}`;
    };
    chart.onpointerleave = () => { tip.style.opacity = 0; };
  }

  /* ---------- Donut ---------- */
  const sources = [
    { name: "Organic Search", val: 46, color: "#38d2ff" },
    { name: "Direct", val: 24, color: "#22e6d2" },
    { name: "Paid Search", val: 16, color: "#ff7a1a" },
    { name: "Social", val: 9, color: "#8b7bff" },
    { name: "Referral", val: 5, color: "#ffc24d" },
  ];
  function drawDonut() {
    const svg = $("#donut"), r = 48, c = 2 * Math.PI * r;
    let offset = 0;
    let html = `<circle class="donut__track" cx="60" cy="60" r="${r}"/>`;
    sources.forEach((s, i) => {
      const len = (s.val / 100) * c;
      html += `<circle cx="60" cy="60" r="${r}" stroke="${s.color}" stroke-dasharray="0 ${c}" stroke-dashoffset="${-offset}" data-len="${len}" style="transition:stroke-dasharray 1s cubic-bezier(.16,1,.3,1) ${i * 0.12}s"/>`;
      offset += len;
    });
    svg.innerHTML = html;
    requestAnimationFrame(() => {
      $$("circle[data-len]", svg).forEach((el) => {
        const len = +el.dataset.len;
        el.setAttribute("stroke-dasharray", `${reduce ? len : len} ${c - len}`);
      });
    });
    $("#legend").innerHTML = sources.map((s) =>
      `<li><span class="dot" style="background:${s.color}"></span>${s.name}<span class="val">${s.val}%</span></li>`
    ).join("");
  }

  /* ---------- Top pages bars ---------- */
  const pages = [
    { name: "/ (Home)", views: 4820 },
    { name: "/services/water-heaters", views: 2140 },
    { name: "/emergency-plumbing", views: 1870 },
    { name: "/services/drain-cleaning", views: 1560 },
    { name: "/contact", views: 1290 },
    { name: "/services/water-treatment", views: 980 },
  ];
  function drawBars() {
    const max = Math.max(...pages.map((p) => p.views));
    $("#bars").innerHTML = pages.map((p) =>
      `<div class="bar__row"><div class="bar__top" style="grid-column:1/-1"><span>${p.name}</span><span>${fmt(p.views)}</span></div><div class="bar__track"><div class="bar__fill" data-w="${(p.views / max) * 100}"></div></div></div>`
    ).join("");
    requestAnimationFrame(() => {
      $$(".bar__fill").forEach((b, i) => {
        setTimeout(() => b.style.width = b.dataset.w + "%", reduce ? 0 : 150 + i * 90);
      });
    });
  }

  /* ---------- Recent leads ---------- */
  const leads = [
    { n: "Jessica Alvarez", s: "Water Heater Repair", c: "Gilbert", src: "Organic Search", sc: "#38d2ff", st: "new", lbl: "New" },
    { n: "Mark Dalton", s: "Emergency — Burst Pipe", c: "Queen Creek", src: "Direct", sc: "#22e6d2", st: "called", lbl: "Called" },
    { n: "Priya Nair", s: "Drain Cleaning", c: "Chandler", src: "Paid Search", sc: "#ff7a1a", st: "new", lbl: "New" },
    { n: "Tom Becker", s: "Whole-Home Repipe", c: "Mesa", src: "Organic Search", sc: "#38d2ff", st: "won", lbl: "Booked" },
    { n: "Angela Ruiz", s: "Water Softener Install", c: "San Tan Valley", src: "Social", sc: "#8b7bff", st: "called", lbl: "Called" },
    { n: "Derek Shaw", s: "Leak Detection", c: "Apache Junction", src: "Referral", sc: "#ffc24d", st: "new", lbl: "New" },
    { n: "Lauren Kim", s: "Faucet Installation", c: "Gilbert", src: "Organic Search", sc: "#38d2ff", st: "won", lbl: "Booked" },
  ];
  function drawLeads() {
    const cls = { new: "tag--new", called: "tag--called", won: "tag--won" };
    $("#leads").innerHTML = leads.map((l) =>
      `<tr><td><strong>${l.n}</strong></td><td>${l.s}</td><td>${l.c}</td><td><span class="src"><i style="background:${l.sc}"></i>${l.src}</span></td><td><span class="tag ${cls[l.st]}">${l.lbl}</span></td></tr>`
    ).join("");
  }

  /* ---------- Range toggle ---------- */
  $("#range").addEventListener("click", (e) => {
    const btn = e.target.closest("button"); if (!btn) return;
    $$("#range button").forEach((b) => b.classList.remove("on"));
    btn.classList.add("on");
    const d = +btn.dataset.days;
    $("#chartLabel").textContent = "Last " + d + " days";
    drawChart(d);
  });

  /* ---------- Live counter ---------- */
  function liveTick() {
    const el = $("#liveNum"); if (!el) return;
    let n = +el.textContent + Math.round((Math.random() - 0.5) * 6);
    n = Math.max(8, Math.min(34, n));
    el.textContent = n;
  }

  /* ---------- Init ---------- */
  let inited = false;
  function initDashboard() {
    if (inited) return; inited = true;
    $$(".kpi__num").forEach((el) => countUp(el, +el.dataset.count));
    $$(".kpi__spark").forEach(drawSpark);
    drawChart(30);
    drawDonut();
    drawBars();
    drawLeads();
    const dl = $("#dateline");
    const end = new Date();
    const start = new Date(); start.setDate(end.getDate() - 29);
    const o = { month: "short", day: "numeric" };
    dl.textContent = `${start.toLocaleDateString(undefined, o)} – ${end.toLocaleDateString(undefined, { ...o, year: "numeric" })}`;
    if (!reduce) setInterval(liveTick, 3500);
  }

  // If already signed in on load, render immediately
  if (already) initDashboard();
})();
