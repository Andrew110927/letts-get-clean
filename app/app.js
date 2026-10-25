(() => {
  "use strict";
  const CFG = window.APP_CONFIG;
  const VERSION = "1.0.0";
  const CACHE_KEY = "lgcpro.cache.v1", SEEN_KEY = "lgcpro.seen.v1";
  const STATUSES = ["Requested", "Confirmed", "Done", "Cancelled"];
  const $ = (id) => document.getElementById(id);
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

  // ===== Theme: brand colors from config.js become CSS variables, so re-skinning needs no CSS edits. =====
  (function applyTheme() {
    const c = CFG.brand.colors, root = document.documentElement.style;
    const vars = { bg: "--bg", panel: "--panel", panel2: "--panel2", line: "--line", line2: "--line2", fg: "--fg", dim: "--dim", mute: "--mute", accent: "--accent", accentInk: "--accent-ink", ok: "--ok", warn: "--warn", bad: "--bad" };
    for (const [k, v] of Object.entries(vars)) if (c[k]) root.setProperty(v, c[k]);
    const m = /^#?([0-9a-f]{6})$/i.exec(c.accent || "");
    if (m) { const n = parseInt(m[1], 16); root.setProperty("--accent-soft", `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},.12)`); }
    document.querySelector('meta[name="theme-color"]').content = c.bg;
  })();

  // ===== Icons (static SVG paths, the only innerHTML in the app) =====
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>',
    users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z"/><path d="M16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    msg: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    nav: '<path d="M3 11l19-9-9 19-2-8-8-2z"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    chev: '<path d="M9 18l6-6-6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    share: '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="M16 6l-4-4-4 4M12 2v14"/>',
    money: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="3"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    car: '<path d="M5 17h14v-4l-2-5H7l-2 5v4z"/><path d="M3 13h18"/><circle cx="7.5" cy="17" r="1.5"/><circle cx="16.5" cy="17" r="1.5"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    link: '<path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
    calx: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18M10 14l4 4M14 14l-4 4"/>',
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
    tiktok: '<path d="M9 18a3 3 0 1 1 0-6"/><path d="M12 3v15"/><path d="M12 3c1 3 3 4.5 6 4.5"/>',
    facebook: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 8h-2a2 2 0 0 0-2 2v11"/><path d="M9 13h6"/>',
    google: '<path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="9" r="2.5"/>'
  };
  function icon(name, size, width) {
    const s = size || 22;
    return h("span", { class: "ic", "aria-hidden": "true", html: `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${width || 2.1}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ""}</svg>` });
  }

  // ===== Helpers =====
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k === "style") el.style.cssText = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
    return el;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function toast(msg) { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3200); }
  function haptic(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }
  function store(key, val) { try { val == null ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
  function load(key) { try { return JSON.parse(localStorage.getItem(key) || "null"); } catch (e) { return null; } }
  const money = (n) => "$" + Math.round(Number(n) || 0).toLocaleString();
  const money2 = (n) => "$" + (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const today = () => ymd(new Date());
  function addDays(s, n) { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return ymd(d); }
  function fmtTime(t) {
    if (!/^\d{2}:\d{2}$/.test(t || "")) return t || "";
    const [H, M] = t.split(":").map(Number);
    return ((H + 11) % 12 + 1) + (M ? ":" + pad(M) : "") + (H < 12 ? " AM" : " PM");
  }
  function fmtDate(s, opts) { return s ? new Date(s + "T12:00:00").toLocaleDateString(undefined, opts || { weekday: "short", month: "short", day: "numeric" }) : ""; }
  function dayLabel(s) {
    const t = today();
    return s === t ? "Today" : s === addDays(t, 1) ? "Tomorrow" : s === addDays(t, -1) ? "Yesterday" : fmtDate(s);
  }
  function fmtPhone(v) { const d = digits10(v); return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v || "").trim(); }
  function digits10(v) { let d = String(v || "").replace(/\D/g, ""); if (d.length === 11 && d[0] === "1") d = d.slice(1); return d; }
  function firstName(n) { return String(n || "").trim().split(/\s+/)[0] || "there"; }
  function initials(n) { return String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?"; }
  function whenMs(b) { return new Date(b.date + "T" + (b.time || "00:00") + ":00").getTime(); }
  const byWhen = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
  function until(b) {
    const m = Math.round((whenMs(b) - Date.now()) / 60000);
    if (m < -90) return "earlier";
    if (m <= 5) return "now";
    if (m < 60) return "in " + m + " min";
    const hh = Math.floor(m / 60);
    if (hh < 24) return "in " + hh + "h" + (m % 60 ? " " + (m % 60) + "m" : "");
    const dd = Math.round(hh / 24);
    return "in " + dd + " day" + (dd > 1 ? "s" : "");
  }
  function weekStart(s) { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); }
  const earned = (b) => (Number(b.total) || 0) + (Number(b.tip) || 0);
  function fill(tpl, vars) { return String(tpl || "").replace(/\{(\w+)\}/g, (m, k) => vars[k] != null ? vars[k] : m); }
  function telHref(phone) { return "tel:+1" + digits10(phone); }
  // "?&body=" works on both iOS and Android, same as the website uses.
  function smsHref(phone, body) { return "sms:" + (phone ? "+1" + digits10(phone) : "") + (body ? "?&body=" + encodeURIComponent(body) : ""); }
  function mapsHref(b) {
    const q = encodeURIComponent([b.address, b.town, "NY"].filter(Boolean).join(", "));
    return isIOS ? "https://maps.apple.com/?daddr=" + q : "https://www.google.com/maps/dir/?api=1&destination=" + q;
  }
  async function copyText(text, ok) {
    try { await navigator.clipboard.writeText(text); toast(ok || "Copied"); return true; }
    catch (e) {
      const ta = h("textarea", { style: "position:fixed;opacity:0" }); ta.value = text; document.body.append(ta); ta.select();
      let done = false; try { done = document.execCommand("copy"); } catch (x) {}
      ta.remove(); toast(done ? (ok || "Copied") : "Couldn't copy. Press and hold to select the text instead."); return done;
    }
  }
  function parseTime(v) {
    const m = /^\s*(\d{1,2})(?::(\d{2}))?\s*([ap])?\.?m?\.?\s*$/i.exec(v || "");
    if (!m) return null;
    let H = Number(m[1]); const M = Number(m[2] || 0), ap = (m[3] || "").toLowerCase();
    if (ap === "p" && H < 12) H += 12;
    if (ap === "a" && H === 12) H = 0;
    return H < 24 && M < 60 ? pad(H) + ":" + pad(M) : null;
  }

  // ===== Settings (same shape and validation as the website, so a bad value can't break either) =====
  const SOC = CFG.social.platforms;
  function mergeSettings(base, d) {
    const out = clone(base);
    if (!d || typeof d !== "object") return out;
    const isDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const isTimes = (v) => Array.isArray(v) && v.length > 0 && v.every(t => typeof t === "string" && /^\d{2}:\d{2}$/.test(t));
    const num = (v) => Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= 1000;
    const text = (v, max) => typeof v === "string" && v.trim().length > 0 && v.length <= (max || 80);
    if (text(d.phone, 30) && digits10(d.phone).length === 10) out.phone = d.phone.trim();
    if (isDate(d.dealEnds) || d.dealEnds === "") out.dealEnds = d.dealEnds;
    if (isDate(d.startDate) || d.startDate === "") out.startDate = d.startDate;
    if (isTimes(d.slotsWeekday)) out.slotsWeekday = d.slotsWeekday;
    if (isTimes(d.slotsWeekend)) out.slotsWeekend = d.slotsWeekend;
    if (Array.isArray(d.daysOff)) out.daysOff = d.daysOff.filter(isDate);
    const fallback = (list, p) => p && base[list].find(x => x.id === p.id);
    if (Array.isArray(d.packages) && d.packages.length) {
      const pk = d.packages.map(p => p && text(p.id, 30) && text(p.name, 40) && num(p.deal) && num(p.regular)
        ? { id: p.id, name: p.name, deal: Number(p.deal), regular: Number(p.regular), items: (Array.isArray(p.items) ? p.items : []).filter(i => text(i, 80)).slice(0, 8) }
        : fallback("packages", p)).filter(Boolean);
      if (pk.length) out.packages = clone(pk);
    }
    for (const key of ["sizes", "addons"]) {
      if (Array.isArray(d[key]) && d[key].length) {
        const list = d[key].map(a => a && text(a.id, 30) && text(a.label, 40) && num(a.price) ? { id: a.id, label: a.label, price: Number(a.price) } : fallback(key, a)).filter(Boolean);
        if (list.length) out[key] = clone(list);
      }
    }
    if (d.socials && typeof d.socials === "object") {
      for (const s of SOC) { const v = d.socials[s.k]; out.socials[s.k] = typeof v === "string" && /^https:\/\/[^\s"'<>]+$/.test(v) ? v : ""; }
    }
    return out;
  }
  function dealOn() { const e = S.settings.dealEnds; return !!e && new Date() <= new Date(e + "T23:59:59"); }
  function priceOf(p) { return dealOn() ? p.deal : p.regular; }
  function slotsFor(date) {
    const dow = new Date(date + "T12:00:00").getDay();
    return ((dow === 0 || dow === 6) ? S.settings.slotsWeekend : S.settings.slotsWeekday).slice().sort();
  }
  function openSlots(date) {
    const st = S.settings;
    if (st.startDate && date < st.startDate) return [];
    if ((st.daysOff || []).includes(date)) return [];
    const soon = Date.now() + 2 * 3600e3; // the website needs 2 hours' notice too
    return slotsFor(date).filter(t => new Date(date + "T" + t + ":00").getTime() > soon);
  }
  function freeSlots(date) {
    const taken = new Set(S.bookings.filter(b => b.status !== "Cancelled" && b.date === date).map(b => b.time));
    return openSlots(date).filter(t => !taken.has(t));
  }
  function msgVars(b) {
    return {
      first: firstName(b && b.name), day: b ? fmtDate(b.date, { weekday: "long", month: "short", day: "numeric" }) : "", time: b ? fmtTime(b.time) : "",
      package: (b && b.package) || "your detail", total: b ? money(b.total) : "",
      prep: b && b.location === "dropoff" ? CFG.messages.prepDropoff : CFG.messages.prepMobile,
      where: b ? (b.location === "dropoff" ? "drop-off" : [b.address, b.town].filter(Boolean).join(", ")) : "",
      owner: CFG.brand.owner, brand: CFG.brand.name, phone: S.settings.phone, site: CFG.site.url, review: CFG.site.reviewUrl, pay: CFG.payments.line
    };
  }

  // ===== State =====
  const S = {
    mode: null, user: null, settings: clone(CFG.defaults), bookings: [], reviews: [], posts: [], stats: [], expenses: [],
    missing: new Set(), ready: false, loading: false, loadedAt: 0, offline: false,
    route: "today", jobFilter: "upcoming", jobQuery: "", clientFilter: "all", clientQuery: "", moneyRange: "month", dirty: false, installEvt: null
  };
  let sb = null, api = null;

  // ===== Data: live (Supabase) =====
  const MISSING = new Set(["PGRST205", "42P01", "PGRST202"]);
  function sbErr(error) { const e = new Error(error.message || "Request failed"); e.code = error.code || ""; return e; }
  async function q(promise) { const { data, error } = await promise; if (error) throw sbErr(error); return data; }
  function isNetwork(e) { return !!e && !e.code && /fetch|network|load failed|offline|timed? ?out/i.test(String(e.message || e)); }
  function needLive() { if (!sb) throw new Error("offline"); }

  const live = {
    async loadAll() {
      needLive();
      const tasks = {
        bookings: () => q(sb.from("bookings").select("*").order("date").order("time").limit(3000)),
        reviews: () => q(sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(500)),
        settings: () => q(sb.from("site_settings").select("data").eq("id", 1).maybeSingle()),
        posts: () => q(sb.from("social_posts").select("*").order("post_date", { ascending: true, nullsFirst: false }).limit(500)),
        stats: () => q(sb.from("social_stats").select("*").order("day").limit(500)),
        expenses: () => q(sb.from("expenses").select("*").order("spent_on", { ascending: false }).limit(3000))
      };
      const keys = Object.keys(tasks);
      const res = await Promise.allSettled(keys.map(k => tasks[k]()));
      const out = { missing: [] };
      let hard = null;
      res.forEach((r, i) => {
        const k = keys[i];
        if (r.status === "fulfilled") out[k] = k === "settings" ? (r.value && r.value.data) || null : r.value || [];
        else if (MISSING.has(r.reason && r.reason.code)) { out.missing.push(k); out[k] = k === "settings" ? null : []; }
        else hard = hard || r.reason;
      });
      if (hard) throw hard;
      return out;
    },
    async updateBooking(id, patch) {
      needLive();
      let { data, error } = await sb.from("bookings").update(patch).eq("id", id).select().maybeSingle();
      if (error && error.code === "PGRST204" && "paid_with" in patch) {
        // paid_with arrives with the owner_app migration; save the rest without it until then.
        const p = { ...patch }; delete p.paid_with;
        ({ data, error } = await sb.from("bookings").update(p).eq("id", id).select().maybeSingle());
      }
      if (error) throw sbErr(error);
      if (!data) throw Object.assign(new Error("not allowed"), { code: "42501" });
      return data;
    },
    async addBooking(row) { needLive(); return q(sb.from("bookings").insert(row).select().single()); },
    async setReview(id, approved) { needLive(); return q(sb.from("reviews").update({ approved }).eq("id", id).select().single()); },
    async deleteReview(id) { needLive(); await q(sb.from("reviews").delete().eq("id", id)); },
    async saveSettings(data) {
      needLive();
      const row = await q(sb.from("site_settings").upsert({ id: 1, data, updated_at: new Date().toISOString() }).select("data").single());
      return row.data;
    },
    async savePost(p) {
      needLive();
      const { id, ...rest } = p;
      return id ? q(sb.from("social_posts").update(rest).eq("id", id).select().single()) : q(sb.from("social_posts").insert(rest).select().single());
    },
    async deletePost(id) { needLive(); await q(sb.from("social_posts").delete().eq("id", id)); },
    async logStats(rec) { needLive(); return q(sb.from("social_stats").upsert(rec, { onConflict: "day" }).select().single()); },
    async addExpense(e) { needLive(); return q(sb.from("expenses").insert(e).select().single()); },
    async deleteExpense(id) { needLive(); await q(sb.from("expenses").delete().eq("id", id)); }
  };

  // ===== Data: demo (in memory, so anyone can try every screen without an account) =====
  const demo = (() => {
    let db = null;
    const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "d" + Math.random().toString(16).slice(2));
    function seed() {
      const t = today(), P = CFG.defaults.packages, Z = CFG.defaults.sizes;
      const people = [
        ["Maria Gonzalez", "(845) 555-0101", "14 Maple Ave", "Newburgh", "Honda CR-V"],
        ["Devon Thomas", "(845) 555-0102", "220 Union Ave", "New Windsor", "Toyota Camry"],
        ["Chris Palmer", "(845) 555-0103", "8 Ridge Rd", "Middletown", "Ford F-150"],
        ["Alyssa Romano", "(845) 555-0104", "57 Main St", "Goshen", "Jeep Grand Cherokee"],
        ["Mike Dawson", "(845) 555-0105", "3 Lake Dr", "Warwick", "Honda Odyssey"],
        ["Jasmine King", "(845) 555-0106", "", "", "Nissan Altima"],
        ["Tony Bianchi", "(845) 555-0107", "91 Pine St", "Monroe", "Chevy Tahoe"],
        ["Sam Wilson", "(845) 555-0108", "40 Grand St", "Newburgh", "Subaru Outback"]
      ];
      // [day offset, time, person, package, size, status, source, tip, paid]
      const rows = [
        [-45, "17:00", 7, "exterior", "suv", "Done", "Flyer", 5, "Cash"],
        [-41, "15:00", 0, "full", "suv", "Done", "Instagram", 10, "Cash App"],
        [-34, "13:30", 1, "exterior", "car", "Done", "Flyer", 0, "Cash"],
        [-30, "17:00", 2, "full", "suv", "Done", "TikTok", 5, "Venmo"],
        [-26, "13:30", 3, "interior", "suv", "Done", "Instagram", 0, "Cash App"],
        [-21, "15:00", 1, "full", "car", "Done", "Flyer", 10, "Cash"],
        [-17, "17:30", 4, "full", "van", "Done", "Friend or family", 15, "Venmo"],
        [-14, "15:00", 5, "interior", "car", "Cancelled", "TikTok", 0, null],
        [-10, "13:30", 6, "full", "suv", "Done", "Google", 0, "Cash"],
        [-7, "17:00", 1, "exterior", "car", "Done", "Flyer", 5, "Cash"],
        [-5, "15:00", 5, "interior", "car", "Done", "TikTok", 0, "Cash App"],
        [-2, "13:30", 2, "exterior", "suv", "Done", "TikTok", 0, "Venmo"],
        [0, "17:00", 0, "interior", "suv", "Confirmed", "Instagram", 0, null],
        [1, "15:00", 3, "full", "suv", "Requested", "Instagram", 0, null],
        [2, "17:00", 4, "exterior", "van", "Requested", "Google", 0, null],
        [3, "15:00", 6, "full", "suv", "Confirmed", "Google", 0, null],
        [5, "13:30", 5, "full", "car", "Confirmed", "TikTok", 0, null]
      ];
      const bookings = rows.map(([off, time, who, pk, sz, status, source, tip, paid], i) => {
        const p = P.find(x => x.id === pk), z = Z.find(x => x.id === sz), [name, phone, address, town, car] = people[who];
        const date = addDays(t, off), drop = !address;
        return { id: uid(), created_at: new Date(Date.now() - (40 - i) * 864e5).toISOString(), status, date, time, name, phone,
          location: drop ? "dropoff" : "mobile", address: address || null, town: town || null, car, package: p.name, size: z.label,
          addons: i % 4 === 0 ? "Air freshener" : null, total: p.deal + z.price + (i % 4 === 0 ? 2 : 0), source, notes: i === 12 ? "Dog hair in the back seat. Gate code 4410." : null,
          deal: true, tip, paid_with: paid };
      });
      return {
        bookings, settings: clone(CFG.defaults), missing: [],
        reviews: [
          { id: uid(), created_at: new Date(Date.now() - 2 * 864e5).toISOString(), stars: 5, name: "Chris", text: "Truck looks brand new inside and out. Showed up right on time.", approved: false },
          { id: uid(), created_at: new Date(Date.now() - 9 * 864e5).toISOString(), stars: 5, name: "Devon", text: "Third time using Letts Get Clean. Always spotless and super easy to book.", approved: true },
          { id: uid(), created_at: new Date(Date.now() - 16 * 864e5).toISOString(), stars: 5, name: "Mike", text: "Got all the cheerios out of the minivan. That's a miracle.", approved: true },
          { id: uid(), created_at: new Date(Date.now() - 25 * 864e5).toISOString(), stars: 4, name: "Alyssa", text: "Interior came out great. Would book again.", approved: true }
        ],
        posts: [
          { id: uid(), created_at: new Date().toISOString(), post_date: addDays(t, 1), platforms: ["Instagram", "TikTok"], kind: "Showcase", visual: "Before/after of the Ford F-150 (blur the plate)", caption: "Before ➡️ After 👀\nFull Detail on a Ford F-150 in Middletown.\nWant yours looking like this? Book online (link in bio) or text (845) 282-9387.", hashtags: CFG.social.hashtags, status: "Draft" },
          { id: uid(), created_at: new Date().toISOString(), post_date: addDays(t, 3), platforms: ["Instagram", "Facebook"], kind: "Promo", visual: "Reel clip of the foam bath", caption: "🚗✨ Launch deal: The Full Detail for $50 (reg. $70). We bring the gear to your driveway. Book online (link in bio) or text (845) 282-9387.", hashtags: CFG.social.hashtags, status: "Draft" },
          { id: uid(), created_at: new Date().toISOString(), post_date: addDays(t, -3), platforms: ["TikTok"], kind: "Tip", visual: "", caption: "💡 Car care tip: park in the shade before washing.", hashtags: "", status: "Posted" }
        ],
        stats: [-28, -21, -14, -7, 0].map((off, i) => ({ day: addDays(t, off), instagram: 120 + i * 18, tiktok: 80 + i * 41, facebook: 40 + i * 4, google: null })),
        expenses: [
          { id: uid(), created_at: new Date().toISOString(), spent_on: addDays(t, -20), amount: 64.97, category: "Supplies", note: "Foam soap, microfiber towels" },
          { id: uid(), created_at: new Date().toISOString(), spent_on: addDays(t, -15), amount: 25, category: "Marketing", note: "Flyers" },
          { id: uid(), created_at: new Date().toISOString(), spent_on: addDays(t, -9), amount: 38.5, category: "Gas", note: "" },
          { id: uid(), created_at: new Date().toISOString(), spent_on: addDays(t, -4), amount: 22.49, category: "Supplies", note: "Tire shine" }
        ]
      };
    }
    const find = (list, id) => { const x = db[list].find(r => r.id === id); if (!x) throw new Error("Not found"); return x; };
    const wait = () => new Promise(r => setTimeout(r, 150));
    return {
      async loadAll() { if (!db) db = seed(); await wait(); return clone(db); },
      async updateBooking(id, patch) {
        await wait(); const b = find("bookings", id), next = { ...b, ...patch };
        if (next.status !== "Cancelled" && db.bookings.some(o => o.id !== id && o.status !== "Cancelled" && o.date === next.date && o.time === next.time)) throw Object.assign(new Error("dup"), { code: "23505" });
        Object.assign(b, patch); return clone(b);
      },
      async addBooking(row) {
        await wait();
        if (db.bookings.some(o => o.status !== "Cancelled" && o.date === row.date && o.time === row.time)) throw Object.assign(new Error("dup"), { code: "23505" });
        const b = { id: uid(), created_at: new Date().toISOString(), tip: 0, paid_with: null, ...row }; db.bookings.push(b); return clone(b);
      },
      async setReview(id, approved) { await wait(); const r = find("reviews", id); r.approved = approved; return clone(r); },
      async deleteReview(id) { await wait(); db.reviews = db.reviews.filter(r => r.id !== id); },
      async saveSettings(data) { await wait(); db.settings = clone(data); return clone(data); },
      async savePost(p) {
        await wait();
        if (p.id) { const x = find("posts", p.id); Object.assign(x, p); return clone(x); }
        const x = { ...p, id: uid(), created_at: new Date().toISOString() }; db.posts.push(x); return clone(x);
      },
      async deletePost(id) { await wait(); db.posts = db.posts.filter(p => p.id !== id); },
      async logStats(rec) { await wait(); db.stats = db.stats.filter(s => s.day !== rec.day).concat(rec).sort((a, b) => a.day.localeCompare(b.day)); return clone(rec); },
      async addExpense(e) { await wait(); const x = { ...e, id: uid(), created_at: new Date().toISOString() }; db.expenses.unshift(x); return clone(x); },
      async deleteExpense(id) { await wait(); db.expenses = db.expenses.filter(e => e.id !== id); }
    };
  })();

  function applyData(d) {
    S.bookings = (d.bookings || []).map(b => ({ ...b, total: Number(b.total) || 0, tip: Number(b.tip) || 0 }));
    S.reviews = d.reviews || [];
    S.posts = d.posts || [];
    S.stats = d.stats || [];
    S.expenses = (d.expenses || []).map(e => ({ ...e, amount: Number(e.amount) || 0 }));
    S.settings = mergeSettings(CFG.defaults, d.settings);
    S.missing = new Set(d.missing || []);
  }

  function niceError(e) {
    const c = e && e.code, m = String((e && e.message) || "");
    if (m === "offline" || isNetwork(e)) return "No connection. Try again when you have signal.";
    if (c === "23505") return "That day and time is already booked. Pick another time.";
    if (c === "23514") return "One of those values isn't allowed. Check the numbers and try again.";
    if (MISSING.has(c) || c === "PGRST204") return "This part needs the app's one-time database update first.";
    if (c === "42501") return "This account isn't allowed to do that.";
    if (/jwt|token/i.test(m)) return "Your sign-in expired. Sign in again.";
    return m ? "Couldn't save: " + m.slice(0, 140) : "Something went wrong. Try again.";
  }
  // Runs an action with its button disabled; returns true when it worked.
  async function run(btn, fn) {
    if (btn) btn.disabled = true;
    try { await fn(); return true; }
    catch (e) { toast(niceError(e)); haptic([20, 40, 20]); return false; }
    finally { if (btn && btn.isConnected) btn.disabled = false; }
  }
  function replaceIn(list, row) { const i = list.findIndex(x => x.id === row.id); if (i >= 0) list[i] = row; else list.push(row); }

  // ===== Sheets: a stack, one history entry per level so the phone's back button closes the top one =====
  const SH = { stack: [] };
  function openSheet(title, build) { SH.stack.push({ title, build }); history.pushState({ sheet: SH.stack.length }, ""); drawSheet(true); }
  function replaceSheet(title, build) { SH.stack[SH.stack.length - 1] = { title, build }; drawSheet(true); }
  function closeSheet() { if (SH.stack.length) history.back(); }
  function drawSheet(scrollTop) {
    const top = SH.stack[SH.stack.length - 1], sheet = $("sheet");
    document.body.classList.toggle("sheet-open", !!top);
    if (!top) {
      if (!sheet.hidden) { sheet.classList.add("closing"); setTimeout(() => { if (!SH.stack.length) { sheet.hidden = true; $("scrim").hidden = true; sheet.classList.remove("closing"); } }, 190); }
      return;
    }
    sheet.classList.remove("closing");
    $("scrim").hidden = false; sheet.hidden = false;
    $("sheetTitle").textContent = top.title;
    const body = $("sheetBody"), keep = body.scrollTop;
    body.replaceChildren();
    top.build(body, (t) => { top.title = t; $("sheetTitle").textContent = t; });
    body.scrollTop = scrollTop ? 0 : keep;
    // Move focus into the sheet for keyboard and screen-reader users, without popping the phone keyboard.
    if (scrollTop) $("sheetClose").focus({ preventScroll: true });
  }
  window.addEventListener("popstate", () => {
    const depth = (history.state && history.state.sheet) || 0;
    if (SH.stack.length > depth) { SH.stack.length = depth; drawSheet(false); }
    const r = routeFromHash();
    if (S.mode && r !== S.route) { S.route = r; S.dirty = false; render(true); }
  });

  // ===== Small UI builders =====
  function statusPill(s) { return h("span", { class: "pill st-" + s }, s === "Requested" ? "Needs OK" : s); }
  function kpi(label, value, sub) { return h("div", { class: "kpi" }, h("small", {}, label), h("b", {}, value), sub ? h("span", {}, sub) : null); }
  function empty(title, text, btn) { return h("div", { class: "empty" }, h("b", {}, title), text ? h("span", {}, text) : null, btn || null); }
  function field(label, input, hint) { const id = input.id || ("f" + Math.random().toString(36).slice(2, 8)); input.id = id; return h("div", { class: "field" }, h("label", { for: id }, label, hint ? h("small", {}, " " + hint) : null), input); }
  function seg(options, current, onPick) {
    return h("div", { class: "seg", role: "group" }, options.map(([k, label, count]) =>
      h("button", { type: "button", "aria-pressed": String(k === current), onclick: () => { haptic(8); onPick(k); } }, label, count != null ? h("span", { class: "count" }, count) : null)));
  }
  function chipPicker(options, selected, multi, onChange) {
    const sel = new Set(multi ? selected : [selected]);
    const box = h("div", { class: "chips", role: "group" });
    const draw = () => box.replaceChildren(...options.map(([k, label]) => h("button", { type: "button", class: "chip", "aria-pressed": String(sel.has(k)), onclick: () => {
      if (multi) sel.has(k) ? sel.delete(k) : sel.add(k); else { sel.clear(); sel.add(k); }
      draw(); onChange && onChange(multi ? [...sel] : k);
    } }, label)));
    draw();
    box.value = () => multi ? [...sel] : [...sel][0];
    return box;
  }
  function sureBtn(cls, label, sure, fn) {
    const b = h("button", { class: cls, type: "button" }, label);
    b.addEventListener("click", () => {
      if (b.dataset.sure) { fn(b); return; }
      b.dataset.sure = "1"; b.textContent = sure; haptic(15);
      setTimeout(() => { if (b.isConnected && b.dataset.sure) { delete b.dataset.sure; b.textContent = label; } }, 4000);
    });
    return b;
  }
  function action(iconName, label, opts) {
    const o = opts || {};
    const attrs = { class: "action" + (o.hot ? " hot" : ""), onclick: o.onclick };
    if (o.href) { attrs.href = o.href; if (/^https?:/.test(o.href)) { attrs.target = "_blank"; attrs.rel = "noopener"; } return h("a", attrs, icon(iconName), label); }
    return h("button", { ...attrs, type: "button", disabled: o.disabled }, icon(iconName), label);
  }
  function missingNote(what) {
    return h("div", { class: "note warn" }, h("b", {}, what + " needs a one-time database update."), h("span", {}, "Ask Claude to apply the Letts owner_app migration. Everything else works meanwhile."));
  }

  // ===== Routing =====
  const TABS = [["today", "Today", "home"], ["jobs", "Jobs", "cal"], ["clients", "Clients", "users"], ["social", "Social", "megaphone"], ["more", "More", "menu"]];
  const SCREENS = {
    today: { title: () => fmtDate(today(), { weekday: "short", month: "short", day: "numeric" }), kicker: greeting, draw: vToday, fab: ["plus", "Add a booking", () => addBookingSheet()] },
    jobs: { title: () => "Jobs", draw: vJobs, fab: ["plus", "Add a booking", () => addBookingSheet()] },
    clients: { title: () => "Clients", draw: vClients, fab: ["plus", "Add a booking", () => addBookingSheet()] },
    social: { title: () => "Social", kicker: () => "Post · plan · grow", draw: vSocial, fab: ["plus", "New post", () => composeSheet(null)] },
    more: { title: () => "More", draw: vMore },
    money: { title: () => "Money", parent: "more", draw: vMoney, fab: ["plus", "Add an expense", () => expenseSheet()] },
    reviews: { title: () => "Reviews", parent: "more", draw: vReviews },
    settings: { title: () => "Settings", kicker: () => "Updates the website live", parent: "more", draw: vSettings }
  };
  function greeting() { const hr = new Date().getHours(); return (hr < 12 ? "Good morning" : hr < 17 ? "Good afternoon" : "Good evening") + ", " + CFG.brand.owner; }
  function routeFromHash() { const r = (location.hash.match(/^#\/(\w+)/) || [])[1]; return r && SCREENS[r] ? r : "today"; }
  function go(route, push) {
    if (route === S.route) { $("view").scrollTo({ top: 0, behavior: "smooth" }); return; }
    if (S.route === "settings" && S.dirty && !confirm("Leave without saving your settings changes?")) return;
    S.dirty = false;
    // Sub-pages (Money, Reviews, Settings) get their own history entry so Back returns to More; tabs replace.
    if (push) history.pushState({ sub: true }, "", "#/" + route); else history.replaceState(null, "", "#/" + route);
    S.route = route; render(true);
  }
  function drawTabs() {
    const scr = SCREENS[S.route], active = scr.parent || S.route;
    const reqs = S.bookings.filter(b => b.status === "Requested" && b.date >= today()).length;
    const pendingReviews = S.reviews.filter(r => !r.approved).length;
    $("tabbar").replaceChildren(...TABS.map(([k, label, ic]) => {
      const n = k === "jobs" ? reqs : k === "more" ? pendingReviews : 0;
      return h("button", { class: "tab", type: "button", "aria-current": k === active ? "page" : null, onclick: () => { haptic(8); go(k); } },
        icon(ic, 24), label, n ? h("span", { class: "badge", "aria-label": n + " waiting" }, n > 9 ? "9+" : n) : null);
    }));
  }
  function render(fresh) {
    const scr = SCREENS[S.route];
    drawTabs();
    $("barTitle").textContent = scr.title();
    $("barKicker").textContent = scr.kicker ? scr.kicker() : CFG.brand.name;
    const back = $("backBtn"); back.hidden = !scr.parent;
    back.replaceChildren(icon("back", 26));
    // Opened from a link with no entry to go back to: go to the parent instead of leaving the app.
    back.onclick = () => history.state && history.state.sub ? history.back() : go(scr.parent);
    $("barActions").replaceChildren(h("button", { class: "icon-btn", type: "button", "aria-label": "Refresh", onclick: () => refresh(true) }, icon("refresh")));
    const v = $("view"), keep = v.scrollTop;
    v.replaceChildren();
    if (!S.ready) v.append(h("div", { class: "skel" }), h("div", { class: "skel", style: "min-height:160px" }), h("div", { class: "skel" }));
    else scr.draw(v);
    if (fresh) { v.scrollTop = 0; v.classList.remove("enter"); void v.offsetWidth; v.classList.add("enter"); } else v.scrollTop = keep;
    const fab = $("fab");
    if (scr.fab) { fab.hidden = false; fab.replaceChildren(icon(scr.fab[0], 28, 2.6)); fab.setAttribute("aria-label", scr.fab[1]); fab.onclick = () => { haptic(10); scr.fab[2](); }; }
    else fab.hidden = true;
  }
  // Background refreshes skip re-rendering while someone is typing, so their input isn't wiped.
  function softRender() {
    const a = document.activeElement;
    if (S.route === "settings" && S.dirty) { drawTabs(); return; }
    if (a && $("view").contains(a) && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { drawTabs(); return; }
    render(false);
  }

  // ===== Screen: Today =====
  function vToday(v) {
    const t = today(), now = Date.now();
    const active = S.bookings.filter(b => b.status !== "Cancelled");
    const reqs = S.bookings.filter(b => b.status === "Requested" && b.date >= t).sort(byWhen);
    // Not-done jobs that haven't started yet, or started within the last 3 hours (still in progress).
    const queue = active.filter(b => b.status !== "Done" && whenMs(b) > now - 3 * 3600e3).sort(byWhen);
    const next = queue[0];
    if (S.missing.size) v.append(missingNote("Social, expenses and payment tracking"));

    v.append(next ? nextCard(next) : noJobsCard());

    if (reqs.length) {
      const card = h("div", { class: "card alert-card" }, h("div", { class: "card-head" }, h("h3", {}, reqs.length === 1 ? "1 request to confirm" : reqs.length + " requests to confirm"), icon("clock")));
      for (const b of reqs.slice(0, 4)) {
        const row = h("div", { style: "display:grid;gap:10px;padding-top:10px;border-top:1px solid var(--line)" },
          h("button", { class: "item", type: "button", style: "padding:0;min-height:0;border:0", onclick: () => jobSheet(b.id) },
            h("div", { class: "main" }, h("b", {}, b.name), h("span", {}, dayLabel(b.date) + " · " + fmtTime(b.time) + " · " + b.package)), h("div", { class: "end" }, h("b", {}, money(b.total)))),
          h("div", { class: "row2" },
            h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: (e) => confirmJob(b.id, e.currentTarget) }, icon("check", 18), "Confirm"),
            h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => messageSheet(b.id, "confirm") }, icon("msg", 18), "Text first")));
        card.append(row);
      }
      if (reqs.length > 4) card.append(h("button", { class: "link", type: "button", onclick: () => { S.jobFilter = "requests"; go("jobs"); } }, "See all " + reqs.length + " requests"));
      v.append(card);
    }

    const todays = active.filter(b => b.date === t && b !== next).sort(byWhen);
    if (todays.length) { v.append(h("div", { class: "sec-title" }, h("h2", {}, "Also today"))); v.append(h("div", { class: "list" }, todays.map(jobItem))); }

    // KPIs
    const wkEnd = addDays(t, 6), monthKey = t.slice(0, 7);
    const bookedWeek = active.filter(b => b.status !== "Done" && b.date >= t && b.date <= wkEnd).reduce((n, b) => n + b.total, 0);
    const doneMonth = S.bookings.filter(b => b.status === "Done" && b.date.slice(0, 7) === monthKey);
    let open = 0; for (let i = 0; i < 7; i++) open += freeSlots(addDays(t, i)).length;
    const approved = S.reviews.filter(r => r.approved);
    v.append(h("div", { class: "kpis" },
      kpi("Booked · 7 days", money(bookedWeek), queue.filter(b => b.date <= wkEnd).length + " jobs"),
      kpi("Earned · " + new Date().toLocaleDateString(undefined, { month: "short" }), money(doneMonth.reduce((n, b) => n + earned(b), 0)), doneMonth.length + " done"),
      kpi("Open spots · 7 days", String(open), open ? "post them on Social" : "fully booked"),
      kpi("Rating", approved.length ? (approved.reduce((n, r) => n + r.stars, 0) / approved.length).toFixed(1) + " ★" : "–", approved.length + " reviews")));

    v.append(h("div", { class: "sec-title" }, h("h2", {}, "Quick actions")));
    v.append(h("div", { class: "actions4" },
      action("plus", "Booking", { onclick: () => addBookingSheet() }),
      action("megaphone", "Post", { onclick: () => composeSheet(null, "openings") }),
      action("star", "Get review", { onclick: () => reviewAskSheet() }),
      action("calx", "Day off", { onclick: () => dayOffSheet() })));

    const later = queue.filter(b => b !== next && b.date !== t).slice(0, 6);
    if (later.length) {
      v.append(h("div", { class: "sec-title" }, h("h2", {}, "Coming up"), h("button", { class: "link", type: "button", onclick: () => { S.jobFilter = "upcoming"; go("jobs"); } }, "All jobs")));
      v.append(jobGroups(later));
    }
  }
  function nextCard(b) {
    const drop = b.location === "dropoff";
    return h("div", { class: "hero-card" },
      h("div", { style: "display:flex;justify-content:space-between;gap:10px;align-items:center" }, h("span", { class: "eyebrow" }, "Next up · " + until(b)), b.status === "Requested" ? h("span", { class: "pill", style: "background:var(--accent-ink);color:var(--warn)" }, "Needs OK") : null),
      h("div", { class: "when" }, dayLabel(b.date) + " · " + fmtTime(b.time)),
      h("div", {}, h("div", { class: "who" }, b.name), h("div", { class: "meta" }, [b.package, b.size, b.car].filter(Boolean).join(" · ")),
        h("div", { class: "meta" }, drop ? "Drop-off at your place" : [b.address, b.town].filter(Boolean).join(", "), " · ", h("b", {}, money(b.total)))),
      h("div", { class: "actions4" },
        action("nav", "Navigate", drop || !b.address ? { disabled: true } : { href: mapsHref(b) }),
        action("phone", "Call", { href: telHref(b.phone) }),
        action("msg", "Text", { onclick: () => messageSheet(b.id, b.status === "Requested" ? "confirm" : "onMyWay") }),
        b.status === "Requested" ? action("check", "Confirm", { hot: true, onclick: (e) => confirmJob(b.id, e.currentTarget) }) : action("check", "Done", { hot: true, onclick: () => doneSheet(b.id) })),
      h("button", { class: "link", type: "button", style: "color:var(--accent-ink);padding:0", onclick: () => jobSheet(b.id) }, "Job details →"));
  }
  function noJobsCard() {
    const t = today();
    let nx = null;
    for (let i = 0; i < 30 && !nx; i++) { const d = addDays(t, i), s = freeSlots(d)[0]; if (s) nx = { d, s }; }
    return h("div", { class: "hero-card" },
      h("span", { class: "eyebrow" }, "Next up"),
      h("div", { class: "when" }, "No jobs booked"),
      h("div", { class: "meta" }, nx ? "Next opening: " + dayLabel(nx.d) + " at " + fmtTime(nx.s) + ". Share your booking link to fill it." : "No openings in the next 30 days."),
      h("div", { class: "row2" },
        h("button", { class: "btn btn-sm", type: "button", style: "background:var(--accent-ink);color:var(--accent)", onclick: shareBookingLink }, icon("share", 18), "Share link"),
        h("button", { class: "btn btn-sm", type: "button", style: "background:rgba(4,19,26,.12);color:var(--accent-ink)", onclick: () => composeSheet(null, "openings") }, icon("megaphone", 18), "Post openings")));
  }
  async function shareBookingLink() {
    const data = { title: CFG.brand.name, text: "Book a detail with " + CFG.brand.name + " in about a minute:", url: CFG.site.url };
    if (navigator.share) { try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; } }
    copyText(CFG.site.url, "Booking link copied");
  }

  // ===== Jobs =====
  function jobItem(b) {
    const [tm, ap] = fmtTime(b.time).split(" ");
    return h("button", { class: "item", type: "button", onclick: () => jobSheet(b.id) },
      h("div", { class: "time-pill" }, h("b", {}, tm), h("small", {}, ap)),
      h("div", { class: "main" }, h("b", {}, b.name), h("span", {}, [b.package, b.car, b.location === "dropoff" ? "Drop-off" : b.town].filter(Boolean).join(" · "))),
      h("div", { class: "end" }, h("b", {}, money(b.total)), statusPill(b.status)));
  }
  function jobGroups(list) {
    const box = h("div", { style: "display:grid;gap:12px" });
    let day = null, group = null;
    for (const b of list) {
      if (b.date !== day) {
        day = b.date;
        const dayTotal = list.filter(x => x.date === day && x.status !== "Cancelled").reduce((n, x) => n + x.total, 0);
        box.append(h("div", { class: "day-head" }, h("span", {}, dayLabel(day) + (dayLabel(day) !== fmtDate(day) ? " · " + fmtDate(day, { month: "short", day: "numeric" }) : "")), h("span", {}, money(dayTotal))));
        group = h("div", { class: "list" }); box.append(group);
      }
      group.append(jobItem(b));
    }
    return box;
  }
  function vJobs(v) {
    const t = today();
    const F = {
      upcoming: (b) => b.date >= t && b.status !== "Cancelled" && b.status !== "Done",
      requests: (b) => b.status === "Requested" && b.date >= t,
      done: (b) => b.status === "Done",
      cancelled: (b) => b.status === "Cancelled",
      all: () => true
    };
    const counts = Object.fromEntries(Object.keys(F).map(k => [k, S.bookings.filter(F[k]).length]));
    const input = h("input", { type: "search", placeholder: "Search name, phone, car, town", value: S.jobQuery, "aria-label": "Search jobs", autocomplete: "off" });
    const box = h("div", { style: "display:grid;gap:12px" });
    const draw = () => {
      const qy = S.jobQuery.trim().toLowerCase(), qd = qy.replace(/\D/g, "");
      let list = S.bookings.filter(F[S.jobFilter]);
      if (qy) list = list.filter(b => [b.name, b.car, b.town, b.address, b.package, b.notes].some(x => String(x || "").toLowerCase().includes(qy)) || (qd.length >= 3 && digits10(b.phone).includes(qd)));
      list.sort(S.jobFilter === "upcoming" || S.jobFilter === "requests" ? byWhen : (a, b) => byWhen(b, a));
      box.replaceChildren(list.length ? jobGroups(list.slice(0, 200)) : empty(qy ? "No matches" : "Nothing here yet",
        qy ? "Try a different name or number." : S.jobFilter === "requests" ? "New website bookings show up here for you to confirm." : "Website bookings and ones you add with + show up here.",
        qy ? null : h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: () => addBookingSheet() }, icon("plus", 18), "Add a booking")));
    };
    input.addEventListener("input", () => { S.jobQuery = input.value; draw(); });
    v.append(h("div", { class: "search field" }, icon("search", 20), input));
    v.append(seg([["upcoming", "Upcoming", counts.upcoming], ["requests", "Needs OK", counts.requests], ["done", "Done", counts.done], ["cancelled", "Cancelled", counts.cancelled], ["all", "All", counts.all]], S.jobFilter, (k) => { S.jobFilter = k; render(false); }));
    v.append(box);
    draw();
  }

  function jobSheet(id) {
    openSheet("Job", (body, setTitle) => {
      const b = S.bookings.find(x => x.id === id);
      if (!b) { body.append(empty("This job is gone", "It may have been removed on another device.")); return; }
      setTitle(b.name);
      const drop = b.location === "dropoff";
      body.append(h("div", { style: "display:flex;align-items:center;gap:10px;flex-wrap:wrap" }, statusPill(b.status),
        h("b", {}, dayLabel(b.date) + " · " + fmtTime(b.time)), b.status !== "Done" && b.status !== "Cancelled" ? h("span", { class: "muted small" }, until(b)) : null));
      body.append(h("div", { class: "actions4" },
        action("phone", "Call", { href: telHref(b.phone) }),
        action("msg", "Text", { onclick: () => messageSheet(b.id, b.status === "Requested" ? "confirm" : b.status === "Done" ? "thanks" : "onMyWay") }),
        action("nav", "Navigate", drop || !b.address ? { disabled: true } : { href: mapsHref(b) }),
        action("copy", drop ? "Copy phone" : "Copy address", { onclick: () => copyText(drop ? fmtPhone(b.phone) : [b.address, b.town, "NY"].filter(Boolean).join(", ")) })));

      const primary = h("div", { class: "row2" });
      if (b.status === "Requested") primary.append(
        h("button", { class: "btn btn-primary", type: "button", onclick: (e) => confirmJob(b.id, e.currentTarget) }, icon("check", 18), "Confirm"),
        sureBtn("btn btn-ghost", "Can't make it", "Tap to decline", (btn) => setStatus(b.id, "Cancelled", btn, "Declined · the time is open again", "decline")));
      else if (b.status === "Confirmed") primary.append(
        h("button", { class: "btn btn-ok", type: "button", onclick: () => doneSheet(b.id) }, icon("check", 18), "Mark done"),
        h("button", { class: "btn btn-ghost", type: "button", onclick: () => messageSheet(b.id, "onMyWay") }, icon("car", 18), "On my way"));
      else if (b.status === "Done") primary.append(
        h("button", { class: "btn btn-primary", type: "button", onclick: () => messageSheet(b.id, "thanks") }, icon("star", 18), "Ask for review"),
        h("button", { class: "btn btn-ghost", type: "button", onclick: () => doneSheet(b.id) }, icon("money", 18), "Payment"));
      else primary.append(h("button", { class: "btn btn-ghost", type: "button", style: "grid-column:1/-1", onclick: (e) => setStatus(b.id, "Confirmed", e.currentTarget, "Restored and confirmed") }, icon("refresh", 18), "Restore booking"));
      body.append(primary);

      const rows = [
        ["When", fmtDate(b.date, { weekday: "long", month: "long", day: "numeric" }) + " · " + fmtTime(b.time)],
        ["Package", b.package], ["Vehicle", b.size], ["Extras", b.addons], ["Car", b.car],
        ["Where", drop ? "Drop-off at your place" : [b.address, b.town].filter(Boolean).join(", ")],
        ["Phone", fmtPhone(b.phone)], ["Heard about us", b.source],
        ["Total", money(b.total) + (b.deal ? " · launch price" : "")],
        b.status === "Done" ? ["Tip", money(b.tip)] : null, b.paid_with ? ["Paid with", b.paid_with] : null,
        ["Booked", b.created_at ? new Date(b.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""]
      ].filter(r => r && r[1]);
      body.append(h("div", { class: "dl" }, rows.map(([k, val]) => h("div", {}, h("span", { class: "k" }, k), h("span", { class: "v" }, val)))));
      if (b.notes) body.append(h("div", { class: "quote" }, b.notes));
      const foot = h("div", { class: "row2" }, h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => editJobSheet(b.id) }, icon("edit", 18), "Edit"));
      if (b.status === "Requested" || b.status === "Confirmed") foot.append(sureBtn("btn btn-danger btn-sm", "Cancel job", "Tap to cancel", (btn) => setStatus(b.id, "Cancelled", btn, "Cancelled · the time is open again on the website")));
      body.append(foot);
    });
  }
  async function setStatus(id, status, btn, msg, thenText) {
    const ok = await run(btn, async () => { replaceIn(S.bookings, await api.updateBooking(id, { status })); });
    if (!ok) return;
    toast(msg); haptic(20); softRender();
    if (thenText) replaceSheet("Text", messageBuilder(id, thenText)); else drawSheet(false);
  }
  async function confirmJob(id, btn) {
    const ok = await run(btn, async () => { replaceIn(S.bookings, await api.updateBooking(id, { status: "Confirmed" })); });
    if (!ok) return;
    toast("Confirmed · now text them"); haptic(20); render(false);
    if (SH.stack.length) replaceSheet("Text", messageBuilder(id, "confirm")); else messageSheet(id, "confirm");
  }

  function doneSheet(id) {
    openSheet("Mark done", (body) => {
      const b = S.bookings.find(x => x.id === id); if (!b) return;
      const total = h("input", { type: "number", inputmode: "decimal", min: "0", max: "1000", value: String(b.total) });
      const tip = h("input", { type: "number", inputmode: "decimal", min: "0", max: "1000", value: b.tip ? String(b.tip) : "", placeholder: "0" });
      const paid = chipPicker(CFG.payments.methods.map(m => [m, m]), b.paid_with || "", false);
      const err = h("div", { class: "err", hidden: true });
      const save = h("button", { class: "btn btn-ok btn-block", type: "submit" }, icon("check", 18), "Save · paid " );
      const sum = () => { save.lastChild.textContent = "Save · " + money((Number(total.value) || 0) + (Number(tip.value) || 0)); };
      total.addEventListener("input", sum); tip.addEventListener("input", sum); sum();
      const form = h("form", { class: "form" },
        h("p", { class: "muted" }, b.name + " · " + b.package + " · " + dayLabel(b.date)),
        h("div", { class: "row2" }, field("Job total", h("div", { class: "money-in" }, total)), field("Tip", h("div", { class: "money-in" }, tip))),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Paid with"), paid), err, save);
      // field() sets ids on the wrapper, so label the inputs directly for screen readers.
      total.setAttribute("aria-label", "Job total"); tip.setAttribute("aria-label", "Tip");
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.hidden = true;
        const t = Number(total.value), tp = Number(tip.value || 0);
        if (!(t >= 0 && t <= 1000) || !(tp >= 0 && tp <= 1000)) { err.textContent = "Total and tip must be between $0 and $1,000."; err.hidden = false; return; }
        const patch = { status: "Done", total: Math.round(t), tip: Math.round(tp) };
        if (paid.value()) patch.paid_with = paid.value();
        const ok = await run(save, async () => { replaceIn(S.bookings, await api.updateBooking(id, patch)); });
        if (!ok) return;
        toast("Nice work! " + money(t + tp) + " logged"); haptic([15, 30, 15]); softRender();
        replaceSheet("Ask for a review", messageBuilder(id, "thanks"));
      });
      body.append(form);
    });
  }

  function editJobSheet(id) {
    openSheet("Edit job", (body) => {
      const b = S.bookings.find(x => x.id === id); if (!b) return;
      const inp = (name, val, attrs) => h("input", { name, value: val == null ? "" : String(val), autocomplete: "off", ...(attrs || {}) });
      const f = {
        date: inp("date", b.date, { type: "date" }), time: inp("time", b.time, { type: "time", step: "900" }),
        name: inp("name", b.name), phone: inp("phone", b.phone, { type: "tel", inputmode: "tel" }),
        address: inp("address", b.address), town: inp("town", b.town), car: inp("car", b.car),
        total: inp("total", b.total, { type: "number", inputmode: "numeric", min: "0", max: "1000" })
      };
      const notes = h("textarea", { name: "notes", maxlength: "500" }, b.notes || "");
      const err = h("div", { class: "err", hidden: true });
      const save = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Save changes");
      const form = h("form", { class: "form" },
        h("div", { class: "row2" }, field("Day", f.date), field("Time", f.time)),
        h("div", { class: "row2" }, field("Name", f.name), field("Phone", f.phone)),
        b.location === "dropoff" ? null : h("div", { class: "row2" }, field("Street address", f.address), field("Town", f.town)),
        h("div", { class: "row2" }, field("Car", f.car), field("Total ($)", f.total)),
        field("Notes", notes), err, save);
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.hidden = true;
        const patch = {
          date: f.date.value, time: f.time.value.slice(0, 5), name: f.name.value.trim().slice(0, 80), phone: fmtPhone(f.phone.value).slice(0, 30),
          car: f.car.value.trim().slice(0, 80) || null, total: Math.max(0, Math.min(1000, Math.round(Number(f.total.value) || 0))), notes: notes.value.trim().slice(0, 500) || null
        };
        if (b.location !== "dropoff") { patch.address = f.address.value.trim().slice(0, 150) || null; patch.town = f.town.value.trim().slice(0, 60) || null; }
        const problems = [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) problems.push("pick a day");
        if (!/^\d{2}:\d{2}$/.test(patch.time)) problems.push("pick a time");
        if (!patch.name) problems.push("add a name");
        if (digits10(patch.phone).length !== 10) problems.push("use a 10-digit phone");
        if (problems.length) { err.textContent = "Almost: " + problems.join(", ") + "."; err.hidden = false; return; }
        const ok = await run(save, async () => { replaceIn(S.bookings, await api.updateBooking(id, patch)); });
        if (!ok) return;
        toast("Saved"); softRender(); closeSheet();
      });
      body.append(form);
    });
  }

  function addBookingSheet(prefill) {
    openSheet("New booking", (body) => {
      const st = S.settings, p0 = prefill || {};
      let date = null;
      for (let i = 0; i < 30 && !date; i++) { const d = addDays(today(), i); if (freeSlots(d).length) date = d; }
      date = date || today();
      const dateIn = h("input", { type: "date", value: date });
      const timeIn = h("input", { type: "time", step: "900", value: freeSlots(date)[0] || slotsFor(date)[0] || "15:00" });
      const slotHint = h("div", { class: "chips" });
      const drawSlots = () => {
        const d = dateIn.value, all = slotsFor(d), free = new Set(freeSlots(d));
        slotHint.replaceChildren(...all.map(t => h("button", { type: "button", class: "chip", "aria-pressed": String(timeIn.value === t), disabled: !free.has(t),
          style: free.has(t) ? "" : "opacity:.4;text-decoration:line-through", onclick: () => { timeIn.value = t; drawSlots(); } }, fmtTime(t))));
      };
      dateIn.addEventListener("change", () => { const f = freeSlots(dateIn.value)[0]; if (f) timeIn.value = f; drawSlots(); });
      timeIn.addEventListener("change", drawSlots);
      const name = h("input", { autocomplete: "off", value: p0.name || "" }), phone = h("input", { type: "tel", inputmode: "tel", autocomplete: "off", value: p0.phone || "" });
      const address = h("input", { autocomplete: "off", value: p0.address || "" }), town = h("input", { autocomplete: "off", value: p0.town || "", list: "townList" });
      const car = h("input", { autocomplete: "off", value: p0.car || "", placeholder: "e.g. Honda CR-V" });
      const addrRow = h("div", { class: "row2" }, field("Street address", address), field("Town", town));
      const loc = chipPicker([["mobile", "At their place"], ["dropoff", "Drop-off at mine"]], p0.location || "mobile", false, (k) => { addrRow.hidden = k === "dropoff"; });
      addrRow.hidden = loc.value() === "dropoff";
      const pkg = chipPicker(st.packages.map(p => [p.id, p.name + " " + money(priceOf(p))]), (st.packages.find(p => p.name === p0.package) || st.packages[st.packages.length - 1]).id, false, () => recalc());
      const size = chipPicker(st.sizes.map(s => [s.id, s.label + (s.price ? " +" + money(s.price) : "")]), (st.sizes.find(s => s.label === p0.size) || st.sizes[0]).id, false, () => recalc());
      const addons = chipPicker(st.addons.map(a => [a.id, a.label + " +" + money(a.price)]), [], true, () => recalc());
      const total = h("input", { type: "number", inputmode: "numeric", min: "0", max: "1000" });
      const status = chipPicker([["Confirmed", "Confirmed"], ["Requested", "Needs OK"], ["Done", "Already done"]], "Confirmed", false);
      const notes = h("textarea", { maxlength: "500", placeholder: "Gate code, pet hair, where to park…" });
      const err = h("div", { class: "err", role: "alert", hidden: true });
      const save = h("button", { class: "btn btn-primary btn-block", type: "submit" }, icon("check", 18), "Save booking");
      function recalc() {
        const p = st.packages.find(x => x.id === pkg.value()) || st.packages[0], s = st.sizes.find(x => x.id === size.value()) || st.sizes[0];
        total.value = priceOf(p) + (s.price || 0) + st.addons.filter(a => addons.value().includes(a.id)).reduce((n, a) => n + a.price, 0);
      }
      recalc(); drawSlots();
      const towns = h("datalist", { id: "townList" }, ["Newburgh", "New Windsor", "Middletown", "Goshen", "Warwick", "Monroe", "Cornwall", "Montgomery", "Walden"].map(t => h("option", { value: t })));
      const form = h("form", { class: "form" },
        h("div", { class: "row2" }, field("Day", dateIn), field("Time", timeIn)), slotHint,
        h("div", { class: "row2" }, field("Name", name), field("Phone", phone)),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Where"), loc), addrRow, towns,
        field("Car", car),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Package"), pkg),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Vehicle"), size),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Extras"), addons),
        h("div", { class: "row2" }, field("Total", h("div", { class: "money-in" }, total)), h("div", { class: "field" }, h("span", { class: "lbl" }, "Status"), status)),
        field("Notes", notes, "optional"), err, save);
      total.setAttribute("aria-label", "Total");
      form.addEventListener("submit", async (e) => {
        e.preventDefault(); err.hidden = true;
        const p = st.packages.find(x => x.id === pkg.value()) || st.packages[0], s = st.sizes.find(x => x.id === size.value()) || st.sizes[0];
        const drop = loc.value() === "dropoff";
        const row = {
          date: dateIn.value, time: (timeIn.value || "").slice(0, 5), name: name.value.trim().slice(0, 80), phone: fmtPhone(phone.value).slice(0, 30),
          location: drop ? "dropoff" : "mobile", address: drop ? null : address.value.trim().slice(0, 150) || null, town: drop ? null : town.value.trim().slice(0, 60) || null,
          car: car.value.trim().slice(0, 80) || null, package: p.name.slice(0, 40), size: s.label.slice(0, 40),
          addons: st.addons.filter(a => addons.value().includes(a.id)).map(a => a.label).join(", ").slice(0, 150) || null,
          total: Math.max(0, Math.min(1000, Math.round(Number(total.value) || 0))), source: "Phone/text", notes: notes.value.trim().slice(0, 500) || null,
          deal: dealOn(), status: status.value()
        };
        const problems = [];
        if (!/^\d{4}-\d{2}-\d{2}$/.test(row.date)) problems.push("pick a day");
        if (!/^\d{2}:\d{2}$/.test(row.time)) problems.push("pick a time");
        if (!row.name) problems.push("add their name");
        if (digits10(row.phone).length !== 10) problems.push("add a 10-digit phone");
        if (!drop && !row.address) problems.push("add the address");
        if (problems.length) { err.textContent = "Almost there: " + problems.join(", ") + "."; err.hidden = false; haptic([20, 40, 20]); return; }
        const ok = await run(save, async () => { S.bookings.push(await api.addBooking(row)); });
        if (!ok) return;
        toast("Booked · " + dayLabel(row.date) + " " + fmtTime(row.time) + " is blocked on the website"); haptic(20);
        softRender(); closeSheet();
      });
      body.append(form);
    });
  }

  // ===== Messages =====
  const MSG_KINDS = [["confirm", "Confirm"], ["onMyWay", "On my way"], ["running", "Running late"], ["thanks", "Review"], ["rebook", "Rebook"], ["decline", "Can't make it"]];
  function messageSheet(id, kind) { openSheet("Text", messageBuilder(id, kind)); }
  function messageBuilder(id, kind) {
    return (body, setTitle) => {
      const b = S.bookings.find(x => x.id === id); if (!b) return;
      setTitle("Text " + firstName(b.name));
      const ta = h("textarea", { rows: "7", "aria-label": "Message" });
      const send = h("a", { class: "btn btn-primary btn-block" }, icon("msg", 18), "Open in Messages");
      const upd = () => { send.href = smsHref(b.phone, ta.value); };
      const pick = chipPicker(MSG_KINDS, kind, false, (k) => { ta.value = fill(CFG.messages[k], msgVars(b)); upd(); });
      ta.value = fill(CFG.messages[kind], msgVars(b)); upd();
      ta.addEventListener("input", upd);
      body.append(h("p", { class: "muted small" }, "To " + b.name + " · " + fmtPhone(b.phone) + ". Edit anything before sending."), pick, ta,
        send, h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: () => copyText(ta.value, "Message copied") }, icon("copy", 18), "Copy instead"));
    };
  }
  function reviewAskSheet() {
    openSheet("Ask for a review", (body) => {
      const seen = new Set();
      const recent = S.bookings.filter(b => b.status === "Done").sort((a, b) => byWhen(b, a)).filter(b => { const k = digits10(b.phone); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
      body.append(h("p", { class: "muted" }, "Pick a recent customer to text your review link. Reviews show on the website after you approve them."));
      if (recent.length) body.append(h("div", { class: "list" }, recent.map(b => h("button", { class: "item", type: "button", onclick: () => replaceSheet("Text", messageBuilder(b.id, "thanks")) },
        h("div", { class: "avatar" }, initials(b.name)), h("div", { class: "main" }, h("b", {}, b.name), h("span", {}, b.package + " · " + dayLabel(b.date))), icon("chev", 20)))));
      else body.append(empty("No finished jobs yet", "Mark a job done and you can text the customer from here."));
      body.append(h("div", { class: "row2" },
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => copyText(CFG.site.reviewUrl, "Review link copied") }, icon("copy", 18), "Copy link"),
        h("a", { class: "btn btn-ghost btn-sm", href: smsHref("", fill(CFG.messages.thanks, { ...msgVars(null), first: "" }).replace(/,\s*!/, "!")) }, icon("msg", 18), "Text anyone")));
    });
  }
  function dayOffSheet() {
    openSheet("Take a day off", (body) => {
      const d = h("input", { type: "date", min: today(), value: addDays(today(), 1) });
      const warn = h("div", { class: "note warn", hidden: true });
      const check = () => {
        const jobs = S.bookings.filter(b => b.date === d.value && b.status !== "Cancelled");
        warn.hidden = !jobs.length;
        warn.textContent = jobs.length ? "You already have " + jobs.length + " job" + (jobs.length > 1 ? "s" : "") + " that day (" + jobs.map(j => j.name + " " + fmtTime(j.time)).join(", ") + "). They stay booked; text them if you need to move them." : "";
      };
      d.addEventListener("change", check); check();
      const save = h("button", { class: "btn btn-primary btn-block", type: "button" }, icon("calx", 18), "Block this day on the website");
      save.addEventListener("click", async () => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(d.value)) return;
        const next = clone(S.settings);
        next.daysOff = [...new Set([...(next.daysOff || []), d.value])].filter(x => x >= today()).sort();
        const ok = await run(save, async () => { S.settings = mergeSettings(CFG.defaults, await api.saveSettings(next)); });
        if (ok) { toast(fmtDate(d.value) + " is blocked on the website"); softRender(); closeSheet(); }
      });
      const offs = (S.settings.daysOff || []).filter(x => x >= today());
      body.append(field("Day", d), warn, save);
      if (offs.length) body.append(h("p", { class: "muted small" }, "Already off: " + offs.map(x => fmtDate(x, { month: "short", day: "numeric" })).join(", ") + ". Remove days in Settings."));
    });
  }

  // ===== Clients =====
  function clientIndex() {
    const map = new Map(), t = today();
    for (const b of S.bookings) {
      const key = digits10(b.phone) || String(b.name || "").toLowerCase();
      const c = map.get(key) || { key, name: b.name, phone: b.phone, jobs: [], visits: 0, spent: 0, last: "", next: null, sources: new Set() };
      c.jobs.push(b);
      if (b.source) c.sources.add(b.source);
      if (b.status !== "Cancelled") {
        c.visits += b.status === "Done" ? 1 : 0;
        if (b.status === "Done") c.spent += earned(b);
        if (b.date <= t && b.date > c.last) c.last = b.date;
        if (b.date >= t && b.status !== "Done" && (!c.next || byWhen(b, c.next) < 0)) c.next = b;
        // The newest booking has the freshest name, address and car.
        if (!c.latest || byWhen(b, c.latest) > 0) c.latest = b;
      }
      map.set(key, c);
    }
    return [...map.values()].map(c => {
      const l = c.latest || c.jobs[0];
      const days = c.last ? Math.round((Date.now() - new Date(c.last + "T12:00:00")) / 864e5) : null;
      return { ...c, name: l.name, phone: l.phone, address: l.address, town: l.town, car: l.car, location: l.location, package: l.package, size: l.size, daysSince: days, due: !c.next && c.visits > 0 && days >= 28 };
    });
  }
  function vClients(v) {
    const all = clientIndex();
    const F = { all: () => true, due: (c) => c.due, repeat: (c) => c.visits >= 2, upcoming: (c) => !!c.next };
    const input = h("input", { type: "search", placeholder: "Search clients", value: S.clientQuery, "aria-label": "Search clients", autocomplete: "off" });
    const box = h("div");
    const draw = () => {
      const qy = S.clientQuery.trim().toLowerCase(), qd = qy.replace(/\D/g, "");
      let list = all.filter(F[S.clientFilter]);
      if (qy) list = list.filter(c => [c.name, c.car, c.town].some(x => String(x || "").toLowerCase().includes(qy)) || (qd.length >= 3 && digits10(c.phone).includes(qd)));
      list.sort((a, b) => (b.due - a.due) || ((b.next ? 1 : 0) - (a.next ? 1 : 0)) || (b.last || "").localeCompare(a.last || ""));
      box.replaceChildren(list.length ? h("div", { class: "list" }, list.map(c => h("button", { class: "item", type: "button", onclick: () => clientSheet(c.key) },
        h("div", { class: "avatar" }, initials(c.name)),
        h("div", { class: "main" }, h("b", {}, c.name), h("span", {}, [c.visits ? c.visits + " visit" + (c.visits > 1 ? "s" : "") : "New", c.next ? "next " + dayLabel(c.next.date) : c.last ? "last " + fmtDate(c.last, { month: "short", day: "numeric" }) : null, c.town].filter(Boolean).join(" · "))),
        h("div", { class: "end" }, h("b", {}, money(c.spent)), c.due ? h("span", { class: "pill st-Requested" }, "Due") : c.visits >= 2 ? h("span", { class: "pill st-Confirmed" }, "Regular") : null))))
        : empty(qy ? "No matches" : "No clients here", qy ? "Try a different name or number." : "Customers show up after their first booking, grouped by phone number."));
    };
    input.addEventListener("input", () => { S.clientQuery = input.value; draw(); });
    const dueN = all.filter(F.due).length;
    if (dueN && S.clientFilter === "all") v.append(h("button", { class: "card tap alert-card", type: "button", style: "text-align:left;color:var(--fg)", onclick: () => { S.clientFilter = "due"; render(false); } },
      h("div", { class: "card-head" }, h("h3", {}, dueN + " due for a detail"), icon("chev")), h("span", { class: "muted small" }, "4+ weeks since their last visit and nothing booked. A quick text brings them back.")));
    v.append(h("div", { class: "search field" }, icon("search", 20), input));
    v.append(seg([["all", "All", all.length], ["due", "Due", dueN], ["repeat", "Regulars", all.filter(F.repeat).length], ["upcoming", "Booked", all.filter(F.upcoming).length]], S.clientFilter, (k) => { S.clientFilter = k; render(false); }));
    v.append(box);
    draw();
  }
  function clientSheet(key) {
    openSheet("Client", (body, setTitle) => {
      const c = clientIndex().find(x => x.key === key);
      if (!c) { body.append(empty("Client not found")); return; }
      setTitle(c.name);
      const last = c.jobs.slice().sort((a, b) => byWhen(b, a))[0];
      body.append(h("div", { class: "actions4" },
        action("phone", "Call", { href: telHref(c.phone) }),
        action("msg", "Text", { onclick: () => messageSheet(last.id, c.due ? "rebook" : c.next ? "onMyWay" : "thanks") }),
        action("plus", "Book again", { hot: true, onclick: () => addBookingSheet(c) }),
        action("star", "Review", { onclick: () => messageSheet(last.id, "thanks") })));
      body.append(h("div", { class: "kpis" },
        kpi("Spent", money(c.spent), c.visits + " done"),
        kpi(c.next ? "Next visit" : "Last visit", c.next ? dayLabel(c.next.date) : c.last ? fmtDate(c.last, { month: "short", day: "numeric" }) : "–", c.next ? fmtTime(c.next.time) : c.daysSince != null ? c.daysSince + " days ago" : "")));
      if (c.due) body.append(h("div", { class: "note warn" }, h("b", {}, "Due for a detail"), h("span", {}, "It's been " + c.daysSince + " days. Send a rebook text?"),
        h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: () => messageSheet(last.id, "rebook") }, icon("msg", 18), "Send rebook text")));
      body.append(h("div", { class: "dl" }, [["Phone", fmtPhone(c.phone)], ["Car", c.car], ["Where", c.location === "dropoff" ? "Drop-off" : [c.address, c.town].filter(Boolean).join(", ")], ["Found you on", [...c.sources].join(", ")]]
        .filter(r => r[1]).map(([k, val]) => h("div", {}, h("span", { class: "k" }, k), h("span", { class: "v" }, val)))));
      body.append(h("h3", { style: "font-size:20px" }, "History"));
      body.append(h("div", { class: "list" }, c.jobs.slice().sort((a, b) => byWhen(b, a)).map(b => h("button", { class: "item", type: "button", onclick: () => jobSheet(b.id) },
        h("div", { class: "main" }, h("b", {}, fmtDate(b.date) + " · " + fmtTime(b.time)), h("span", {}, [b.package, b.car].filter(Boolean).join(" · "))),
        h("div", { class: "end" }, h("b", {}, money(earned(b))), statusPill(b.status))))));
    });
  }

  // ===== Social =====
  const POST_KINDS = [["Promo", "Promo"], ["Showcase", "Before & after"], ["Tip", "Tip"], ["Review", "Review"], ["Openings", "Openings"], ["Behind the scenes", "Behind the scenes"]];
  const TEMPLATES = {
    openings: { label: "Open spots", sub: "This week's free times", icon: "cal", kind: "Openings", make: () => {
      const spots = [];
      for (let i = 0; i < 7; i++) { const d = addDays(today(), i); for (const s of freeSlots(d)) spots.push(fmtDate(d, { weekday: "short", month: "short", day: "numeric" }) + " · " + fmtTime(s)); }
      const tail = "\n\nWe come to you anywhere in Orange County. Book online in a minute (link in bio) or text " + S.settings.phone + ".";
      return spots.length ? { caption: "📅 Open spots this week:\n" + spots.slice(0, 8).map(s => "• " + s).join("\n") + tail, visual: "Your best before/after photo or the reel" }
        : { caption: "This week is fully booked 🙌 Thank you!\nNext week's times are open now." + tail, visual: "A clean car you finished this week" };
    } },
    deal: { label: "Prices & deal", sub: "Your packages", icon: "money", kind: "Promo", make: () => {
      const P = S.settings.packages, full = P.find(p => p.id === "full") || P[P.length - 1];
      const list = P.map(p => p.name + " " + money(priceOf(p)) + (dealOn() ? " (reg. " + money(p.regular) + ")" : "")).join("\n");
      return { caption: (dealOn() ? "🚗✨ Launch deal ends " + fmtDate(S.settings.dealEnds, { month: "long", day: "numeric" }) + "!\n" : "🚗✨ Dirty car? Not for long.\n") + list +
        "\n\n" + full.name + " = inside and out, in your driveway. Book online (link in bio) or text " + S.settings.phone + ".", visual: "Reel clip of the foam bath" };
    } },
    showcase: { label: "Before & after", sub: "Show off a recent job", icon: "image", kind: "Showcase", make: () => {
      const b = S.bookings.filter(x => x.status === "Done").sort((a, c) => byWhen(c, a))[0];
      return { caption: "Before ➡️ After 👀\n" + (b ? b.package + (b.car ? " on a " + b.car : "") + (b.town ? " in " + b.town : "") + "." : "Another one cleaned up.") +
        "\nWant yours looking like this? Book online (link in bio) or text " + S.settings.phone + ".", visual: "Before/after photos" + (b && b.car ? " of the " + b.car : "") };
    } },
    review: { label: "Review shout-out", sub: "Share a 5-star review", icon: "star", kind: "Review", make: () => {
      const r = S.reviews.filter(x => x.approved && x.stars >= 4).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];
      return r ? { caption: "⭐".repeat(r.stars) + "\n“" + r.text + "” — " + (r.name || "a happy customer") + "\n\nThank you! Book yours online (link in bio) or text " + S.settings.phone + ".", visual: "Photo of their car, or the review on a clean background" }
        : { caption: "Your review could be here ⭐⭐⭐⭐⭐\nIf we've cleaned your car, we'd love to hear how it went: " + CFG.site.reviewUrl, visual: "A clean car you finished" };
    } },
    tip: { label: "Car care tip", sub: "Helpful, easy to post", icon: "bulb", kind: "Tip", make: () => {
      const tips = CFG.social.tips, tip = tips[Math.floor(Math.random() * tips.length)];
      return { caption: "💡 Car care tip: " + tip + "\n\nWant it done for you? Book online (link in bio) or text " + S.settings.phone + ".", visual: "Short clip of you doing it" };
    } },
    blank: { label: "Blank post", sub: "Write your own", icon: "edit", kind: "Behind the scenes", make: () => ({ caption: "", visual: "" }) }
  };
  function vSocial(v) {
    if (S.missing.has("posts")) v.append(missingNote("Saving posts and follower counts"));
    v.append(h("div", { class: "sec-title" }, h("h2", {}, "Your accounts")));
    v.append(h("div", { class: "profiles" }, SOC.map(s => {
      const url = S.settings.socials[s.k];
      return url ? h("a", { class: "profile", href: url, target: "_blank", rel: "noopener" }, icon(s.k, 26), s.label)
        : h("button", { class: "profile off", type: "button", onclick: () => go("settings", true) }, icon(s.k, 26), "Add " + s.label);
    })));
    v.append(h("div", { class: "sec-title" }, h("h2", {}, "Make a post"), h("a", { class: "link", href: CFG.social.scheduler.url, target: "_blank", rel: "noopener" }, "Open " + CFG.social.scheduler.label + " ↗")));
    v.append(h("div", { class: "tpl-grid" }, Object.entries(TEMPLATES).map(([k, t]) =>
      h("button", { class: "tpl", type: "button", onclick: () => composeSheet(null, k) }, icon(t.icon, 22), h("b", {}, t.label), h("span", {}, t.sub)))));

    const t = today();
    const planned = S.posts.filter(p => p.status !== "Posted").sort((a, b) => (a.post_date || "9").localeCompare(b.post_date || "9"));
    const posted = S.posts.filter(p => p.status === "Posted").sort((a, b) => (b.post_date || "").localeCompare(a.post_date || ""));
    v.append(h("div", { class: "sec-title" }, h("h2", {}, "Planned"), h("span", { class: "muted small" }, planned.length + " to post")));
    if (!planned.length) v.append(empty("Nothing planned", "Tap a template above to write a post and save it for later."));
    for (const p of planned) v.append(postCard(p, p.post_date && p.post_date < t));
    if (posted.length) {
      v.append(h("div", { class: "sec-title" }, h("h2", {}, "Posted")));
      for (const p of posted.slice(0, 5)) v.append(postCard(p));
    }
    v.append(followersCard());
    v.append(sourcesCard());
  }
  function postCard(p, late) {
    const posted = p.status === "Posted";
    return h("div", { class: "post", style: posted ? "opacity:.65" : late ? "border-color:rgba(251,191,36,.5)" : "" },
      h("div", { class: "meta" }, h("b", {}, p.post_date ? dayLabel(p.post_date) : "Anytime"), statusPill(p.status), p.kind ? h("span", { class: "pill st-Draft" }, p.kind) : null,
        ...(p.platforms || []).map(x => h("span", { class: "pill st-Confirmed" }, x)), late ? h("span", { class: "pill st-Requested" }, "Overdue") : null),
      p.visual ? h("span", { class: "muted small" }, "📷 " + p.visual) : null,
      h("p", { style: "display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden" }, p.caption),
      h("div", { class: "row-btns" },
        posted ? null : h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: () => postNowSheet(p) }, icon("share", 18), "Post now"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => composeSheet(p) }, icon("edit", 18), "Edit"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => markPosted(p, !posted, e.currentTarget) }, posted ? "Not posted" : "Mark posted")));
  }
  async function markPosted(p, yes, btn) {
    const ok = await run(btn, async () => { replaceIn(S.posts, await api.savePost({ id: p.id, status: yes ? "Posted" : "Draft" })); });
    if (ok) { toast(yes ? "Marked posted 🎉" : "Moved back to planned"); softRender(); }
    return ok;
  }
  function composeSheet(post, templateKey) {
    openSheet(post ? "Edit post" : "New post", (body) => {
      const tpl = templateKey && TEMPLATES[templateKey], made = tpl ? tpl.make() : {};
      const p = post || { post_date: today(), platforms: ["Instagram", "TikTok"], kind: tpl ? tpl.kind : "Promo", caption: made.caption || "", hashtags: CFG.social.hashtags, visual: made.visual || "", status: "Draft" };
      const platforms = chipPicker(SOC.map(s => [s.label, s.label]), p.platforms || [], true);
      const date = h("input", { type: "date", value: p.post_date || "" });
      const kind = chipPicker(POST_KINDS, p.kind || "Promo", false);
      const caption = h("textarea", { rows: "8", maxlength: "2200" }, p.caption || "");
      const count = h("div", { class: "counter" });
      const hashtags = h("textarea", { rows: "2", maxlength: "400" }, p.hashtags || "");
      const visual = h("input", { value: p.visual || "", maxlength: "200", placeholder: "Which photo or clip to use" });
      const upd = () => { count.textContent = caption.value.length + " / 2,200"; };
      caption.addEventListener("input", upd); upd();
      const err = h("div", { class: "err", hidden: true });
      const current = () => ({ ...(post ? { id: post.id } : {}), post_date: date.value || null, platforms: platforms.value(), kind: kind.value() || null, caption: caption.value.trim(), hashtags: hashtags.value.trim() || null, visual: visual.value.trim() || null, status: post ? post.status : "Draft" });
      const saveBtn = h("button", { class: "btn btn-ghost", type: "button" }, icon("cal", 18), post ? "Save" : "Save for later");
      const postBtn = h("button", { class: "btn btn-primary", type: "button" }, icon("share", 18), "Post now");
      const valid = () => { if (!caption.value.trim()) { err.textContent = "Write a caption first."; err.hidden = false; return false; } err.hidden = true; return true; };
      saveBtn.addEventListener("click", async () => {
        if (!valid()) return;
        const ok = await run(saveBtn, async () => { replaceIn(S.posts, await api.savePost(current())); });
        if (ok) { toast(post ? "Post saved" : "Saved to your plan"); softRender(); closeSheet(); }
      });
      postBtn.addEventListener("click", () => { if (valid()) replaceSheet("Post it", postNowBuilder(current())); });
      if (templateKey === "tip") body.append(h("button", { class: "link", type: "button", onclick: () => { caption.value = TEMPLATES.tip.make().caption; upd(); } }, "↻ Another tip"));
      body.append(field("Caption", caption), count, field("Hashtags", hashtags),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Where"), platforms),
        h("div", { class: "row2" }, field("Post on", date), field("Photo / video", visual)),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Type"), kind),
        h("div", { class: "note" }, "🔒 Blur license plates in photos and videos before posting."),
        err, h("div", { class: "row2" }, saveBtn, postBtn));
      if (post) body.append(sureBtn("btn btn-danger btn-sm", "Delete post", "Tap to delete", async (b) => {
        const ok = await run(b, async () => { await api.deletePost(post.id); S.posts = S.posts.filter(x => x.id !== post.id); });
        if (ok) { toast("Post deleted"); softRender(); closeSheet(); }
      }));
      if (S.missing.has("posts")) { saveBtn.disabled = true; body.prepend(missingNote("Saving posts")); }
    });
  }
  function postNowSheet(p) { openSheet("Post it", postNowBuilder(p)); }
  function postNowBuilder(p) {
    return (body) => {
      const text = p.caption + (p.hashtags ? "\n\n" + p.hashtags : "");
      const canFiles = !!(navigator.canShare && window.File);
      const file = h("input", { type: "file", accept: "image/*,video/*", style: "display:none" });
      const chosen = h("span", { class: "muted small" }, "No photo picked yet");
      const shareBtn = h("button", { class: "btn btn-primary btn-block", type: "button", disabled: true }, icon("share", 18), "Share to an app");
      let picked = null;
      file.addEventListener("change", () => {
        picked = file.files && file.files[0];
        chosen.textContent = picked ? picked.name : "No photo picked yet";
        shareBtn.disabled = !picked;
      });
      shareBtn.addEventListener("click", async () => {
        if (!picked) return;
        const data = { files: [picked], text };
        try {
          if (navigator.canShare(data)) await navigator.share(data);
          else if (navigator.canShare({ files: [picked] })) await navigator.share({ files: [picked] });
          else { toast("This phone can't share that file. Open the app below and post it there."); return; }
          toast("Shared · now mark it posted");
        } catch (e) { if (e && e.name !== "AbortError") toast("Couldn't open the share menu. Use the app buttons below."); }
      });
      const step = (n, title, ...kids) => h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", { style: "font-size:20px" }, n + ". " + title)), ...kids);
      body.append(...[
        step(1, "Copy the caption", h("div", { class: "quote", style: "max-height:140px;overflow:auto" }, text),
          h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: () => copyText(text, "Caption copied · paste it in the app") }, icon("copy", 18), "Copy caption")),
        canFiles ? step(2, "Pick the photo or video", h("p", { class: "muted small" }, "🔒 Blur license plates first." + (p.visual ? " Planned: " + p.visual : "")),
          h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: () => file.click() }, icon("image", 18), "Choose photo or video"), chosen, file, shareBtn) : null,
        step(canFiles ? 3 : 2, canFiles ? "Or open the app" : "Open the app and paste", h("div", { class: "grid-btns" }, SOC.filter(s => !(p.platforms || []).length || (p.platforms || []).includes(s.label))
          .map(s => h("a", { class: "btn btn-ghost btn-sm", href: s.open, target: "_blank", rel: "noopener", onclick: () => copyText(text, "Caption copied · paste it in " + s.label) }, icon(s.k, 18), s.label)))),
        p.id ? h("button", { class: "btn btn-ok btn-block", type: "button", onclick: async (e) => { if (await markPosted(p, true, e.currentTarget)) closeSheet(); } }, icon("check", 18), "Mark as posted")
          : h("button", { class: "btn btn-ok btn-block", type: "button", disabled: S.missing.has("posts"), onclick: async (e) => {
            const ok = await run(e.currentTarget, async () => { replaceIn(S.posts, await api.savePost({ ...p, status: "Posted" })); });
            if (ok) { toast("Logged as posted 🎉"); softRender(); closeSheet(); }
          } }, icon("check", 18), "Done · log it as posted")].filter(Boolean));
    };
  }
  function followersCard() {
    const stats = S.stats.slice().sort((a, b) => a.day.localeCompare(b.day)).slice(-12);
    const card = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", {}, "Followers"),
      h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: S.missing.has("stats"), onclick: statsSheet }, icon("plus", 18), "Log")));
    if (!stats.length) { card.append(h("p", { class: "muted small" }, "Log your follower counts once a week to see your growth here.")); return card; }
    const last = stats[stats.length - 1], prev = stats[stats.length - 2];
    card.append(h("div", { class: "kpis" }, SOC.filter(s => last[s.k] != null).map(s => {
      const d = prev && prev[s.k] != null ? last[s.k] - prev[s.k] : null;
      return kpi(s.label, Number(last[s.k]).toLocaleString(), d == null ? "logged " + fmtDate(last.day, { month: "short", day: "numeric" }) : (d >= 0 ? "+" : "") + d + " since last log");
    })));
    if (stats.length > 1) card.append(lineChart(stats));
    return card;
  }
  function lineChart(stats) {
    const W = 340, H = 140, P = { l: 8, r: 8, t: 10, b: 20 };
    const colors = { instagram: "var(--accent)", tiktok: "var(--fg)", facebook: "var(--warn)", google: "var(--ok)" };
    const ys = stats.flatMap(s => SOC.map(o => s[o.k]).filter(v => typeof v === "number"));
    const max = Math.max(10, ...ys), n = stats.length;
    const x = (i) => P.l + i * (W - P.l - P.r) / (n - 1), y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Follower growth over time">`;
    svg += `<line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" style="stroke:var(--line)"/>`;
    for (const o of SOC) {
      const pts = stats.map((s, i) => typeof s[o.k] === "number" ? x(i).toFixed(1) + "," + y(s[o.k]).toFixed(1) : null).filter(Boolean);
      if (pts.length > 1) svg += `<polyline style="fill:none;stroke:${colors[o.k] || "var(--dim)"}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" points="${pts.join(" ")}"/>`;
    }
    svg += `<text x="${P.l}" y="${H - 4}">${fmtDate(stats[0].day, { month: "short", day: "numeric" })}</text><text x="${W - P.r}" y="${H - 4}" text-anchor="end">${fmtDate(stats[n - 1].day, { month: "short", day: "numeric" })}</text></svg>`;
    const legend = h("div", { class: "chips", style: "gap:12px" }, SOC.filter(o => stats.some(s => typeof s[o.k] === "number")).map(o => h("span", { class: "small", style: "display:inline-flex;align-items:center;gap:6px;font-weight:700" }, h("i", { style: `width:10px;height:10px;border-radius:50%;background:${colors[o.k]}` }), o.label)));
    return h("div", { style: "display:grid;gap:8px" }, h("div", { html: svg }), legend);
  }
  function statsSheet() {
    openSheet("Log followers", (body) => {
      const last = S.stats.slice().sort((a, b) => a.day.localeCompare(b.day)).pop() || {};
      const day = h("input", { type: "date", value: today(), max: today() });
      const inputs = SOC.map(s => [s.k, h("input", { type: "number", inputmode: "numeric", min: "0", placeholder: last[s.k] != null ? String(last[s.k]) : "0" })]);
      const save = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Save counts");
      const form = h("form", { class: "form" }, field("Date", day), h("div", { class: "row2" }, inputs.map(([k, i]) => field(SOC.find(s => s.k === k).label, i))), save);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const rec = { day: day.value }; let any = false;
        for (const [k, i] of inputs) { if (i.value !== "") { rec[k] = Math.max(0, Math.round(Number(i.value) || 0)); any = true; } else rec[k] = last[k] != null ? last[k] : null; }
        if (!any) { toast("Enter at least one count"); return; }
        const ok = await run(save, async () => { const r = await api.logStats(rec); S.stats = S.stats.filter(s => s.day !== r.day).concat(r); });
        if (ok) { toast("Logged"); softRender(); closeSheet(); }
      });
      body.append(h("p", { class: "muted small" }, "Blank boxes keep last week's number."), form);
    });
  }
  function sourcesCard() {
    const counts = {};
    S.bookings.filter(b => b.status !== "Cancelled").forEach(b => { const k = b.source || "Not given"; counts[k] = (counts[k] || 0) + 1; });
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]), max = Math.max(1, ...rows.map(r => r[1]));
    return h("div", { class: "card" }, h("h3", {}, "Where bookings come from"),
      rows.length ? h("div", { class: "bars" }, rows.map(([k, n]) => h("div", { class: "bar-row" }, h("span", {}, k), h("span", { class: "trk" }, h("span", { class: "fill", style: `width:${(n / max) * 100}%` })), h("span", { class: "num" }, n))))
        : h("p", { class: "muted small" }, "Each website booking asks how they heard about you. Answers chart here so you can see which platform brings real jobs."));
  }

  // ===== More =====
  function vMore(v) {
    const pending = S.reviews.filter(r => !r.approved).length;
    const item = (ic, label, sub, onclick, extra) => h("button", { class: "item", type: "button", onclick }, h("div", { class: "avatar" }, icon(ic, 22)), h("div", { class: "main" }, h("b", {}, label), sub ? h("span", {}, sub) : null), extra || null, icon("chev", 20));
    const link = (ic, label, sub, href) => h("a", { class: "item", href, target: "_blank", rel: "noopener" }, h("div", { class: "avatar" }, icon(ic, 22)), h("div", { class: "main" }, h("b", {}, label), h("span", {}, sub)), icon("chev", 20));
    v.append(h("div", { class: "list" },
      item("money", "Money", "Earnings, tips, expenses, profit", () => go("money", true)),
      item("star", "Reviews", pending ? pending + " waiting for approval" : "Approve and share reviews", () => go("reviews", true), pending ? h("span", { class: "pill st-Requested" }, pending + " new") : null),
      item("gear", "Settings", "Prices, hours, days off, social links", () => go("settings", true))));
    v.append(h("div", { class: "list" },
      link("globe", "Open the website", CFG.site.url.replace(/^https:\/\//, ""), CFG.site.url),
      item("share", "Share booking link", "Send it to anyone, post it in your bio", shareBookingLink),
      install()));
    v.append(h("div", { class: "list" },
      S.mode === "demo" ? item("out", "Exit demo", "Back to sign in", exitDemo) : item("out", "Sign out", S.user && S.user.email ? S.user.email : "", signOut)));
    v.append(h("p", { class: "muted small", style: "text-align:center" }, CFG.brand.appName + " " + VERSION + " · " + CFG.brand.name));
  }
  function install() {
    if (standalone) return null;
    if (S.installEvt) return h("button", { class: "item", type: "button", onclick: async () => { S.installEvt.prompt(); await S.installEvt.userChoice.catch(() => {}); S.installEvt = null; render(false); } },
      h("div", { class: "avatar" }, icon("download", 22)), h("div", { class: "main" }, h("b", {}, "Install the app"), h("span", {}, "Adds " + CFG.brand.appName + " to your home screen")), icon("chev", 20));
    return h("button", { class: "item", type: "button", onclick: () => openSheet("Install the app", (body) => body.append(
      h("p", {}, isIOS ? "In Safari, tap the Share button, then “Add to Home Screen”." : "In Chrome, tap the ⋮ menu, then “Install app” or “Add to Home screen”."),
      h("p", { class: "muted small" }, "It opens full screen like a normal app, remembers your sign-in and works with weak signal.")
    )) }, h("div", { class: "avatar" }, icon("download", 22)), h("div", { class: "main" }, h("b", {}, "Install the app"), h("span", {}, "Put it on your home screen")), icon("chev", 20));
  }

  // ===== Money =====
  function vMoney(v) {
    const t = today(), r = S.moneyRange;
    const from = r === "week" ? weekStart(t) : r === "month" ? t.slice(0, 8) + "01" : r === "year" ? t.slice(0, 5) + "01-01" : "0000-01-01";
    const inRange = (d) => d >= from && d <= t;
    const done = S.bookings.filter(b => b.status === "Done" && inRange(b.date));
    const exp = S.expenses.filter(e => inRange(e.spent_on));
    const sales = done.reduce((n, b) => n + b.total, 0), tips = done.reduce((n, b) => n + b.tip, 0), costs = exp.reduce((n, e) => n + e.amount, 0);
    const label = { week: "this week", month: "this month", year: "this year", all: "all time" }[r];
    v.append(seg([["week", "Week"], ["month", "Month"], ["year", "Year"], ["all", "All time"]], r, (k) => { S.moneyRange = k; render(false); }));
    v.append(h("div", { class: "card" },
      h("small", { class: "muted", style: "font-weight:800;letter-spacing:1.5px;text-transform:uppercase;font-size:11px" }, "Earned " + label),
      h("div", { class: "big-num" }, money(sales + tips)),
      h("div", { style: "display:grid;gap:6px" },
        h("div", { class: "stat-line" }, h("span", {}, "Jobs done"), h("b", { class: "num" }, done.length)),
        h("div", { class: "stat-line" }, h("span", {}, "Average per job"), h("b", { class: "num" }, done.length ? money((sales + tips) / done.length) : "–")),
        h("div", { class: "stat-line" }, h("span", {}, "Tips"), h("b", { class: "num" }, money(tips))),
        h("div", { class: "stat-line" }, h("span", {}, "Expenses"), h("b", { class: "num down" }, "−" + money2(costs))),
        h("div", { class: "stat-line", style: "border-top:1px solid var(--line);padding-top:8px" }, h("span", { style: "color:var(--fg);font-weight:800" }, "Profit"), h("b", { class: "num " + (sales + tips - costs >= 0 ? "up" : "down") }, money2(sales + tips - costs))))));

    const ahead = S.bookings.filter(b => (b.status === "Confirmed" || b.status === "Requested") && b.date >= t);
    v.append(h("div", { class: "kpis" },
      kpi("Booked ahead", money(ahead.reduce((n, b) => n + b.total, 0)), ahead.length + " jobs coming"),
      kpi("Best package", (() => { const m = {}; done.forEach(b => m[b.package] = (m[b.package] || 0) + earned(b)); const top = Object.entries(m).sort((a, b) => b[1] - a[1])[0]; return top ? top[0].replace(/^The /, "") : "–"; })(), "by earnings")));

    // Last 8 weeks, Monday to Sunday
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
      const ws = addDays(weekStart(t), -7 * i), we = addDays(ws, 6);
      weeks.push({ label: fmtDate(ws, { month: "numeric", day: "numeric" }), value: S.bookings.filter(b => b.status === "Done" && b.date >= ws && b.date <= we).reduce((n, b) => n + earned(b), 0) });
    }
    v.append(h("div", { class: "card" }, h("h3", {}, "Last 8 weeks"), barChart(weeks)));

    const by = (key, list) => { const m = {}; list.forEach(b => { const k = b[key] || "Not recorded"; m[k] = (m[k] || 0) + earned(b); }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
    const barsCard = (title, rows) => { const max = Math.max(1, ...rows.map(r => r[1])); return h("div", { class: "card" }, h("h3", {}, title), rows.length ? h("div", { class: "bars" }, rows.map(([k, n]) => h("div", { class: "bar-row" }, h("span", {}, k), h("span", { class: "trk" }, h("span", { class: "fill", style: `width:${(n / max) * 100}%` })), h("span", { class: "num" }, money(n))))) : h("p", { class: "muted small" }, "No finished jobs " + label + ".")); };
    v.append(barsCard("By package", by("package", done)));
    v.append(barsCard("By payment", by("paid_with", done)));

    const expCard = h("div", { class: "card" }, h("div", { class: "card-head" }, h("h3", {}, "Expenses"), h("button", { class: "btn btn-ghost btn-sm", type: "button", disabled: S.missing.has("expenses"), onclick: () => expenseSheet() }, icon("plus", 18), "Add")));
    if (S.missing.has("expenses")) expCard.append(missingNote("Expense tracking"));
    else if (!exp.length) expCard.append(h("p", { class: "muted small" }, "Log supplies, gas and other costs to see real profit."));
    else expCard.append(h("div", { class: "list", style: "background:var(--panel2)" }, exp.slice(0, 50).map(e => h("button", { class: "item", type: "button", onclick: () => expenseSheet(e) },
      h("div", { class: "avatar" }, icon("receipt", 20)), h("div", { class: "main" }, h("b", {}, e.category), h("span", {}, [fmtDate(e.spent_on), e.note].filter(Boolean).join(" · "))), h("div", { class: "end" }, h("b", {}, money2(e.amount)))))));
    v.append(expCard);
  }
  function barChart(weeks) {
    const W = 340, H = 160, P = { l: 4, r: 4, t: 20, b: 22 }, max = Math.max(1, ...weeks.map(w => w.value)), bw = (W - P.l - P.r) / weeks.length;
    let svg = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Earnings for each of the last 8 weeks">`;
    weeks.forEach((w, i) => {
      const bh = (w.value / max) * (H - P.t - P.b), x = P.l + i * bw + 5, y = H - P.b - bh, last = i === weeks.length - 1;
      svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw - 10).toFixed(1)}" height="${Math.max(bh, 2).toFixed(1)}" rx="5" style="fill:var(--accent)" opacity="${last ? 1 : .5}"/>`;
      if (w.value) svg += `<text x="${(x + (bw - 10) / 2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${money(w.value)}</text>`;
      svg += `<text x="${(x + (bw - 10) / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle">${w.label}</text>`;
    });
    return h("div", { html: svg + "</svg>" });
  }
  function expenseSheet(e) {
    openSheet(e ? "Expense" : "Add expense", (body) => {
      if (e) {
        body.append(h("div", { class: "dl" }, [["Amount", money2(e.amount)], ["Type", e.category], ["Date", fmtDate(e.spent_on, { weekday: "long", month: "long", day: "numeric" })], ["Note", e.note]].filter(r => r[1]).map(([k, val]) => h("div", {}, h("span", { class: "k" }, k), h("span", { class: "v" }, val)))),
          sureBtn("btn btn-danger btn-block", "Delete expense", "Tap to delete", async (b) => {
            const ok = await run(b, async () => { await api.deleteExpense(e.id); S.expenses = S.expenses.filter(x => x.id !== e.id); });
            if (ok) { toast("Deleted"); softRender(); closeSheet(); }
          }));
        return;
      }
      const amount = h("input", { type: "number", inputmode: "decimal", min: "0.01", max: "10000", step: "0.01", placeholder: "0.00" });
      const cat = chipPicker(["Supplies", "Gas", "Equipment", "Marketing", "Other"].map(c => [c, c]), "Supplies", false);
      const day = h("input", { type: "date", value: today(), max: today() });
      const note = h("input", { maxlength: "200", placeholder: "e.g. Foam soap, towels" });
      const err = h("div", { class: "err", hidden: true });
      const save = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Save expense");
      amount.setAttribute("aria-label", "Amount");
      const form = h("form", { class: "form" }, field("Amount", h("div", { class: "money-in" }, amount)), h("div", { class: "field" }, h("span", { class: "lbl" }, "Type"), cat), field("Date", day), field("Note", note, "optional"), err, save);
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault(); err.hidden = true;
        const a = Math.round(Number(amount.value) * 100) / 100;
        if (!(a > 0 && a <= 10000)) { err.textContent = "Enter an amount between $0.01 and $10,000."; err.hidden = false; return; }
        const ok = await run(save, async () => { S.expenses.unshift(await api.addExpense({ amount: a, category: cat.value(), spent_on: day.value || today(), note: note.value.trim() || null })); S.expenses = S.expenses.map(x => ({ ...x, amount: Number(x.amount) })); });
        if (ok) { toast("Expense saved"); softRender(); closeSheet(); }
      });
      body.append(form);
    });
  }

  // ===== Reviews =====
  function vReviews(v) {
    const approved = S.reviews.filter(r => r.approved), pending = S.reviews.filter(r => !r.approved);
    const avg = approved.length ? approved.reduce((n, r) => n + r.stars, 0) / approved.length : 0;
    v.append(h("div", { class: "card" },
      h("div", { style: "display:flex;align-items:flex-end;gap:14px" }, h("div", { class: "big-num" }, approved.length ? avg.toFixed(1) : "–"),
        h("div", { style: "padding-bottom:6px" }, h("div", { class: "stars", "aria-label": avg.toFixed(1) + " out of 5" }, "★".repeat(Math.round(avg)) + "☆".repeat(5 - Math.round(avg))), h("span", { class: "muted small" }, approved.length + " on the website"))),
      h("div", { class: "row2" },
        h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: reviewAskSheet }, icon("msg", 18), "Ask a customer"),
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => copyText(CFG.site.reviewUrl, "Review link copied") }, icon("copy", 18), "Copy link"))));
    if (pending.length) { v.append(h("div", { class: "sec-title" }, h("h2", {}, "Waiting for you"))); pending.forEach(r => v.append(reviewCard(r))); }
    v.append(h("div", { class: "sec-title" }, h("h2", {}, "On the website")));
    if (!approved.length) v.append(empty("No reviews showing yet", "Approve one above, or ask a happy customer to leave one."));
    approved.forEach(r => v.append(reviewCard(r)));
  }
  function reviewCard(r) {
    return h("div", { class: "post", style: r.approved ? "" : "border-color:rgba(251,191,36,.5)" },
      h("div", { class: "meta" }, h("span", { class: "stars" }, "★".repeat(r.stars)), h("b", {}, r.name || "Customer"), h("span", { class: "muted small" }, r.created_at ? fmtDate(String(r.created_at).slice(0, 10)) : "")),
      h("p", {}, r.text),
      h("div", { class: "row-btns" },
        r.approved ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: (e) => setReview(r, false, e.currentTarget) }, "Hide from website")
          : h("button", { class: "btn btn-primary btn-sm", type: "button", onclick: (e) => setReview(r, true, e.currentTarget) }, icon("check", 18), "Approve"),
        r.approved && r.stars >= 4 ? h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => composeSheet(null, "review") }, icon("megaphone", 18), "Post it") : null,
        sureBtn("btn btn-danger btn-sm", "Delete", "Tap to delete", async (b) => {
          const ok = await run(b, async () => { await api.deleteReview(r.id); S.reviews = S.reviews.filter(x => x.id !== r.id); });
          if (ok) { toast("Review deleted"); render(false); }
        })));
  }
  async function setReview(r, approved, btn) {
    const ok = await run(btn, async () => { replaceIn(S.reviews, await api.setReview(r.id, approved)); });
    if (ok) { toast(approved ? "Live on the website ⭐" : "Hidden from the website"); haptic(15); render(false); }
  }

  // ===== Settings (writes the same site_settings row the website reads) =====
  function vSettings(v) {
    const st = clone(S.settings);
    const dirty = () => { S.dirty = true; saveBtn.disabled = false; };
    const timeList = (key) => {
      const box = h("div", { class: "chips" });
      const add = h("input", { type: "time", step: "900", class: "input", style: "width:auto;min-height:40px;padding:6px 10px", "aria-label": "Add a start time" });
      const draw = () => box.replaceChildren(...st[key].slice().sort().map(t => h("span", { class: "chip-x" }, fmtTime(t),
        h("button", { type: "button", "aria-label": "Remove " + fmtTime(t), onclick: () => { if (st[key].length > 1) { st[key] = st[key].filter(x => x !== t); draw(); dirty(); } else toast("Keep at least one start time"); } }, "×"))), add,
        h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const t = parseTime(add.value); if (t && !st[key].includes(t)) { st[key].push(t); draw(); dirty(); } add.value = ""; } }, "Add"));
      draw(); return box;
    };
    const offBox = h("div", { class: "chips" });
    const offIn = h("input", { type: "date", min: today(), class: "input", style: "width:auto;min-height:40px;padding:6px 10px", "aria-label": "Add a day off" });
    const drawOff = () => offBox.replaceChildren(...st.daysOff.filter(d => d >= today()).sort().map(d => h("span", { class: "chip-x" }, fmtDate(d),
      h("button", { type: "button", "aria-label": "Remove " + fmtDate(d), onclick: () => { st.daysOff = st.daysOff.filter(x => x !== d); drawOff(); dirty(); } }, "×"))), offIn,
      h("button", { class: "btn btn-ghost btn-sm", type: "button", onclick: () => { const d = offIn.value; if (/^\d{4}-\d{2}-\d{2}$/.test(d) && !st.daysOff.includes(d)) { st.daysOff.push(d); drawOff(); dirty(); } offIn.value = ""; } }, "Add"));
    drawOff();
    const num = (val, label, on) => { const i = h("input", { type: "number", inputmode: "numeric", min: "0", max: "1000", value: String(val), "aria-label": label }); i.addEventListener("input", () => { on(Number(i.value)); dirty(); }); return h("div", { class: "money-in" }, i); };
    const phone = h("input", { type: "tel", inputmode: "tel", value: st.phone });
    const deal = h("input", { type: "date", value: st.dealEnds || "" });
    const start = h("input", { type: "date", value: st.startDate || "" });
    const socials = SOC.map(s => [s.k, h("input", { type: "url", inputmode: "url", placeholder: "https://…", value: st.socials[s.k] || "" })]);
    const err = h("div", { class: "err", role: "alert", hidden: true });
    const saveBtn = h("button", { class: "btn btn-primary btn-block", type: "submit", disabled: true }, icon("check", 18), "Save · updates the website");
    const section = (title, ...kids) => h("div", { class: "card" }, h("h3", {}, title), ...kids);
    const form = h("form", { class: "form", style: "gap:16px" },
      h("div", { class: "note" }, "Saving here changes the live website right away: prices, open times, days off and links."),
      section("Contact", field("Phone customers call or text", phone)),
      section("Launch deal", field("Deal ends (last day)", deal), h("p", { class: "muted small" }, "After that day the website switches to regular prices by itself. Clear it to end the deal now.")),
      section("Prices", ...st.packages.map(p => h("div", { class: "field" }, h("span", { class: "lbl" }, p.name),
        h("div", { class: "row2" }, h("div", { class: "field" }, h("small", {}, "Deal price"), num(p.deal, p.name + " deal price", (x) => p.deal = x)), h("div", { class: "field" }, h("small", {}, "Regular price"), num(p.regular, p.name + " regular price", (x) => p.regular = x)))))),
      section("Vehicle sizes & extras", h("p", { class: "muted small" }, "Added on top of the package price."), ...[...st.sizes, ...st.addons].map(a => h("div", { class: "row2", style: "align-items:center" }, h("span", { style: "font-weight:700" }, a.label), num(a.price, a.label + " price", (x) => a.price = x)))),
      section("Open times", field("First day taking appointments", start),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Weekday start times"), timeList("slotsWeekday")),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Weekend start times"), timeList("slotsWeekend")),
        h("div", { class: "field" }, h("span", { class: "lbl" }, "Days off (hidden from booking)"), offBox)),
      section("Social links", h("p", { class: "muted small" }, "Shown on the website and on the Social tab."), ...socials.map(([k, i]) => field(SOC.find(s => s.k === k).label, i))),
      err, saveBtn);
    for (const i of [phone, deal, start, ...socials.map(s => s[1])]) i.addEventListener("input", dirty);
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); err.hidden = true;
      const next = clone(st);
      next.phone = fmtPhone(phone.value);
      next.dealEnds = deal.value || "";
      next.startDate = start.value || "";
      next.daysOff = st.daysOff.filter(d => d >= today()).sort();
      for (const [k, i] of socials) next.socials[k] = i.value.trim();
      const problems = [];
      if (digits10(next.phone).length !== 10) problems.push("the phone needs 10 digits");
      for (const p of next.packages) if (!(p.deal >= 0 && p.deal <= 1000 && p.regular >= 0 && p.regular <= 1000)) problems.push(p.name + " prices must be $0–$1,000");
      for (const a of [...next.sizes, ...next.addons]) if (!(a.price >= 0 && a.price <= 1000)) problems.push(a.label + " must be $0–$1,000");
      for (const [k, val] of Object.entries(next.socials)) if (val && !/^https:\/\/[^\s"'<>]+$/.test(val)) problems.push(SOC.find(s => s.k === k).label + " link must start with https://");
      if (problems.length) { err.textContent = "Fix first: " + problems.join("; ") + "."; err.hidden = false; haptic([20, 40, 20]); return; }
      const ok = await run(saveBtn, async () => { S.settings = mergeSettings(CFG.defaults, await api.saveSettings(next)); });
      if (ok) { S.dirty = false; toast("Saved · the website is updated"); haptic(20); render(false); }
    });
    v.append(form);
    v.append(h("div", { class: "card" }, h("h3", {}, "Account"),
      h("p", { class: "muted small" }, S.mode === "demo" ? "Demo mode. Nothing is saved." : "Signed in as " + ((S.user && S.user.email) || "")),
      S.mode === "demo" ? h("button", { class: "btn btn-ghost", type: "button", onclick: exitDemo }, icon("out", 18), "Exit demo") : h("button", { class: "btn btn-ghost", type: "button", onclick: signOut }, icon("out", 18), "Sign out")));
  }

  // ===== Refresh, polling, new-booking alerts =====
  async function refresh(manual) {
    if (S.loading) return;
    S.loading = true;
    if (manual) { $("ptr").classList.add("spin"); }
    try {
      const d = await api.loadAll();
      applyData(d);
      S.loadedAt = Date.now(); S.offline = false;
      if (S.mode === "live" && S.user) store(CACHE_KEY, { user: S.user.id, at: S.loadedAt, data: d });
      noticeNew();
      if (manual) toast("Up to date");
    } catch (e) {
      if (e.message === "offline" || isNetwork(e)) { S.offline = true; if (manual) toast("No connection. Showing your last saved data."); }
      else if (/jwt|token|session/i.test(e.message || "") || e.code === "PGRST301") { await signOut(); renderAuth("signin", { error: "Your sign-in expired. Sign in again." }); return; }
      else toast(niceError(e));
    } finally {
      S.loading = false; S.ready = true;
      $("offlineStrip").hidden = !S.offline;
      $("ptr").classList.remove("spin"); $("ptr").style.cssText = "";
      if (S.mode) softRender();
    }
  }
  function noticeNew() {
    const reqs = S.bookings.filter(b => b.status === "Requested" && b.date >= today());
    if (S.mode === "live") {
      const seen = load(SEEN_KEY);
      if (Array.isArray(seen)) {
        const fresh = reqs.filter(b => !seen.includes(b.id));
        if (fresh.length) { toast(fresh.length === 1 ? "New booking request from " + fresh[0].name : fresh.length + " new booking requests"); haptic([30, 60, 30]); }
      }
      store(SEEN_KEY, S.bookings.map(b => b.id).slice(-2000));
    }
    try { if (navigator.setAppBadge) reqs.length ? navigator.setAppBadge(reqs.length) : navigator.clearAppBadge(); } catch (e) {}
  }
  function startPolling() {
    setInterval(() => { if (!document.hidden && S.mode === "live") refresh(); }, 45000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden && S.mode && Date.now() - S.loadedAt > 15000) refresh(); });
    window.addEventListener("online", () => { S.offline = false; $("offlineStrip").hidden = true; if (!sb) location.reload(); else if (S.mode) refresh(); });
    window.addEventListener("offline", () => { S.offline = true; $("offlineStrip").hidden = false; });
  }
  // Pull down at the top of a screen to refresh, like a native app.
  function pullToRefresh() {
    const v = $("view"), ptr = $("ptr");
    let y0 = null, dy = 0;
    v.addEventListener("touchstart", (e) => { y0 = v.scrollTop <= 0 && $("sheet").hidden ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    v.addEventListener("touchmove", (e) => {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy > 0 && v.scrollTop <= 0) { const p = Math.min(dy, 110); ptr.style.opacity = String(Math.min(1, p / 70)); ptr.style.transform = `translateY(${p / 2 - 40}px) rotate(${p * 3}deg)`; }
    }, { passive: true });
    v.addEventListener("touchend", () => {
      if (y0 != null && dy > 75) { haptic(10); ptr.style.transform = "translateY(10px)"; refresh(true); }
      else ptr.style.cssText = "";
      y0 = null; dy = 0;
    });
  }

  // ===== Auth =====
  function renderAuth(mode, info) {
    const i = info || {};
    $("boot").hidden = true; $("shell").hidden = true;
    const a = $("auth"); a.hidden = false; a.replaceChildren();
    const words = CFG.brand.name.split(" "), lastWord = words.pop();
    a.append(h("div", { class: "auth-brand" }, h("span", { class: "tile big" }, h("span", { html: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="${CFG.brand.colors.accentInk}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS.car}</svg>` })),
      h("h1", {}, words.join(" ") + " ", h("span", {}, lastWord)), h("p", { class: "muted" }, "Owner app · jobs, clients, social, money")));
    const card = h("div", { class: "auth-card" });
    const msg = (text, kind) => text ? h("div", { class: "note" + (kind ? " " + kind : "") }, text) : null;
    const email = h("input", { type: "email", autocomplete: "username", inputmode: "email", required: true, value: i.email || "" });
    const pass = (ac) => h("input", { type: "password", autocomplete: ac, required: true, minlength: "8" });
    const demoBtn = h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: () => { history.replaceState(null, "", "?demo#/today"); startDemo(); } }, icon("spark", 18), "Try the demo");
    const authErr = (e) => {
      const m = String((e && e.message) || "");
      if (/invalid login/i.test(m)) return "That email and password don't match.";
      if (/not confirmed/i.test(m)) return "Confirm your email first: open the link we sent you, then sign in.";
      if (/already registered|already exists/i.test(m)) return "That email already has an account. Sign in instead.";
      if (/rate limit|too many/i.test(m)) return "Too many tries. Wait a minute and try again.";
      if (/password/i.test(m) && /characters|short|weak/i.test(m)) return "Use a longer password (8+ characters).";
      if (isNetwork(e)) return "No connection. Check your signal and try again.";
      return m || "Something went wrong. Try again.";
    };
    const submitWith = (btn, fn) => async (e) => { e.preventDefault(); btn.disabled = true; try { await fn(); } catch (x) { renderAuth(mode, { email: email.value, error: authErr(x) }); } };

    if (mode === "signin") {
      const pw = pass("current-password"), btn = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Sign in");
      const f = h("form", { class: "form" }, msg(i.error, "bad"), msg(i.ok), field("Email", email), field("Password", pw), btn,
        h("div", { style: "display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap" },
          h("button", { class: "link", type: "button", onclick: () => renderAuth("signup", { email: email.value }) }, "Create owner account"),
          h("button", { class: "link", type: "button", onclick: () => renderAuth("forgot", { email: email.value }) }, "Forgot password?")));
      f.addEventListener("submit", submitWith(btn, async () => {
        if (!sb) throw new Error("offline");
        const { data, error } = await sb.auth.signInWithPassword({ email: email.value.trim(), password: pw.value });
        if (error) throw error;
        await enter(data.user);
      }));
      card.append(f, h("div", { class: "muted small", style: "text-align:center" }, "or"), demoBtn);
    } else if (mode === "signup") {
      const pw = pass("new-password"), pw2 = pass("new-password"), btn = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Create account");
      const f = h("form", { class: "form" }, msg(i.error, "bad"),
        msg("Only the owner's email gets access to customer data. Any other account sees nothing."), field("Email", email), field("Password", pw, "8+ characters"), field("Password again", pw2), btn,
        h("button", { class: "link", type: "button", onclick: () => renderAuth("signin", { email: email.value }) }, "← Back to sign in"));
      f.addEventListener("submit", submitWith(btn, async () => {
        if (pw.value.length < 8) throw new Error("Password should be at least 8 characters");
        if (pw.value !== pw2.value) { renderAuth("signup", { email: email.value, error: "The two passwords don't match." }); return; }
        const { data, error } = await sb.auth.signUp({ email: email.value.trim(), password: pw.value, options: { emailRedirectTo: location.origin + location.pathname } });
        if (error) throw error;
        if (data.session) await enter(data.user);
        else renderAuth("signin", { email: email.value, ok: "Almost done: open the confirmation email we just sent, then sign in here." });
      }));
      card.append(f);
    } else if (mode === "forgot") {
      const btn = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Send reset link");
      const f = h("form", { class: "form" }, msg(i.error, "bad"), msg("We'll email you a link to set a new password."), field("Email", email), btn,
        h("button", { class: "link", type: "button", onclick: () => renderAuth("signin", { email: email.value }) }, "← Back to sign in"));
      f.addEventListener("submit", submitWith(btn, async () => {
        const { error } = await sb.auth.resetPasswordForEmail(email.value.trim(), { redirectTo: location.origin + location.pathname });
        if (error) throw error;
        renderAuth("signin", { email: email.value, ok: "Check your email for the reset link." });
      }));
      card.append(f);
    } else if (mode === "reset") {
      const pw = pass("new-password"), btn = h("button", { class: "btn btn-primary btn-block", type: "submit" }, "Save new password");
      const f = h("form", { class: "form" }, msg(i.error, "bad"), field("New password", pw, "8+ characters"), btn);
      f.addEventListener("submit", submitWith(btn, async () => {
        const { data, error } = await sb.auth.updateUser({ password: pw.value });
        if (error) throw error;
        toast("Password updated"); await enter(data.user);
      }));
      card.append(f);
    } else if (mode === "notowner") {
      card.append(msg("You're signed in as " + ((S.user && S.user.email) || "this account") + ", but it isn't set up as the owner yet, so customer data stays hidden.", "warn"),
        h("p", { class: "muted small" }, "Ask Claude to add this email as the Letts Get Clean owner. If you just signed up, make sure you clicked the link in the confirmation email."),
        h("button", { class: "btn btn-primary btn-block", type: "button", onclick: async () => { const u = (await sb.auth.getUser()).data.user; if (u) enter(u); } }, icon("refresh", 18), "Check again"),
        h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: async () => { await signOut(); } }, "Sign out"), demoBtn);
    } else if (mode === "setup") {
      card.append(msg("One step left: the app's database update hasn't been applied yet. Ask Claude to apply the Letts owner_app migration, then tap Check again.", "warn"),
        h("button", { class: "btn btn-primary btn-block", type: "button", onclick: async () => { const u = (await sb.auth.getUser()).data.user; if (u) enter(u); } }, icon("refresh", 18), "Check again"),
        demoBtn, h("button", { class: "btn btn-ghost btn-block", type: "button", onclick: signOut }, "Sign out"));
    } else if (mode === "nolib") {
      card.append(msg("Couldn't reach the server. Check your connection and try again.", "warn"),
        h("button", { class: "btn btn-primary btn-block", type: "button", onclick: () => location.reload() }, icon("refresh", 18), "Try again"), demoBtn);
    }
    a.append(card);
    const first = a.querySelector("input"); if (first && !first.value) setTimeout(() => first.focus(), 50);
  }
  async function checkOwner() {
    const { data, error } = await sb.rpc("is_owner");
    if (error) throw sbErr(error);
    return data === true;
  }
  async function enter(user) {
    S.user = user;
    let owner;
    try { owner = await checkOwner(); }
    catch (e) {
      if (MISSING.has(e.code)) { renderAuth("setup"); return; }
      const cache = load(CACHE_KEY);
      if (isNetwork(e) && cache && cache.user === user.id) { S.offline = true; startApp("live", cache.data); return; }
      renderAuth("signin", { error: niceError(e) }); return;
    }
    if (!owner) { renderAuth("notowner"); return; }
    const cache = load(CACHE_KEY);
    startApp("live", cache && cache.user === user.id ? cache.data : null);
  }
  function startApp(mode, data) {
    const first = !S.mode;
    S.mode = mode; api = mode === "demo" ? demo : live;
    if (data) { applyData(data); S.ready = true; }
    $("boot").hidden = true; $("auth").hidden = true; $("shell").hidden = false;
    $("demoStrip").hidden = mode !== "demo";
    $("offlineStrip").hidden = !S.offline;
    S.route = routeFromHash();
    history.replaceState(history.state, "", (mode === "demo" ? "?demo" : location.pathname) + "#/" + S.route);
    render(true);
    refresh();
    if (first) { startPolling(); pullToRefresh(); }
  }
  function startDemo() { S.user = { id: "demo", email: "demo" }; startApp("demo", null); }
  function exitDemo() { location.href = location.pathname; }
  async function signOut() {
    try { if (sb) await sb.auth.signOut(); } catch (e) {}
    store(CACHE_KEY, null); store(SEEN_KEY, null);
    try { navigator.clearAppBadge && navigator.clearAppBadge(); } catch (e) {}
    location.href = location.pathname;
  }

  // ===== Boot =====
  function registerSW() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
  }
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); S.installEvt = e; if (S.route === "more") render(false); });
  $("sheetClose").replaceChildren(icon("x", 24));
  $("sheetClose").addEventListener("click", closeSheet);
  $("scrim").addEventListener("click", closeSheet);
  $("demoExit").addEventListener("click", exitDemo);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && SH.stack.length) closeSheet(); });
  // A stale sheet entry in history (e.g. after a reload) shouldn't leave an invisible sheet level behind.
  if (history.state && history.state.sheet) history.replaceState(null, "", location.href);

  async function boot() {
    registerSW();
    if (new URLSearchParams(location.search).has("demo")) { startDemo(); return; }
    if (!window.supabase || !window.supabase.createClient) {
      // First visit offline (the library comes from a CDN); after one good load the service worker has it.
      const cache = load(CACHE_KEY);
      if (cache) { S.offline = true; S.user = { id: cache.user }; startApp("live", cache.data); }
      else renderAuth("nolib");
      return;
    }
    sb = window.supabase.createClient(CFG.supabase.url, CFG.supabase.key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "lgcpro.auth" } });
    let recovering = /type=recovery/.test(location.hash);
    sb.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") { recovering = true; renderAuth("reset"); } });
    let session = null;
    try { session = (await sb.auth.getSession()).data.session; } catch (e) {}
    if (recovering) { renderAuth("reset"); return; }
    if (!session) { renderAuth("signin"); return; }
    enter(session.user);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
