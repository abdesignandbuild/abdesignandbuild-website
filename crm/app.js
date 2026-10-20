/* A&B Leads: the CRM app (lead list, lead page, tasks, AI WhatsApp drafts, settings). */
(() => {
  "use strict";

  const cfg = window.CRM_CONFIG || {};
  const DEMO = !cfg.supabaseUrl || !cfg.supabaseAnonKey || new URLSearchParams(location.search).has("demo");
  const FN_URL = cfg.supabaseUrl ? cfg.supabaseUrl.replace(/\/$/, "") + "/functions/v1/crm" : "";

  const STATUSES = [
    "New", "Contacted", "No answer", "Replied/Interested", "Site visit booked",
    "Quote sent", "Won", "Lost", "Not qualified",
  ];
  const CLOSED = ["Won", "Lost", "Not qualified"];
  const TASK_PRESETS = ["Call back", "Schedule site visit", "Site visit", "Send 3D design", "Send quote", "Follow up on WhatsApp"];
  const INSTRUCTION_EXAMPLE = "For example:\n- Don't sound like a bot. Write like I'm texting from my phone.\n- Only greet and thank them. Don't suggest meetings.\n- Never mention prices.";
  const DRAFT_PRESETS = ["Follow-up: no reply yet", "Make it shorter", "Offer a site visit this week", "Write it in Arabic"];

  // ---------- Icons ----------
  const svg = (p, extra = "") => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${p}</svg>`;
  const I = {
    back: svg('<path d="M19 12H5M11 18l-6-6 6-6"/>'),
    trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>'),
    chevron: svg('<path d="M6 9l6 6 6-6"/>'),
    phone: svg('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>'),
    wa: svg('<path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.4z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.4-1.6-1-2-2l1-1-1-2z" stroke-width="1.4"/>'),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    plus: svg('<path d="M12 5v14M5 12h14"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    check: svg('<path d="M5 12l5 5 9-10"/>', 'stroke-width="3"'),
    spark: svg('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 17l.7 1.8 1.8.7-1.8.7L19 22l-.7-1.8-1.8-.7 1.8-.7z" stroke-width="1.4"/>'),
    gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    send: svg('<path d="M4 12l16-8-6 16-2.5-6.5z"/>'),
    refresh: svg('<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4"/>'),
  };

  // ---------- Helpers ----------
  const $ = (s, el = document) => el.querySelector(s);
  const h = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const app = $("#app");

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    const day = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${day} at ${time}`;
  }

  function relTime(iso) {
    const diff = new Date(iso) - Date.now();
    const abs = Math.abs(diff);
    const m = Math.round(abs / 60000), hr = Math.round(abs / 3600000), d = Math.round(abs / 86400000);
    const span = m < 60 ? `${Math.max(m, 1)}m` : hr < 36 ? `${hr}h` : `${d}d`;
    return diff >= 0 ? `in ${span}` : `overdue ${span}`;
  }

  function agoShort(iso) {
    const abs = Date.now() - new Date(iso);
    const m = Math.round(abs / 60000), hr = Math.round(abs / 3600000), d = Math.round(abs / 86400000);
    if (m < 60) return `${Math.max(m, 1)}m ago`;
    if (hr < 24) return `${hr}h ago`;
    if (d < 7) return `${d}d ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function toLocalInput(date) {
    const d = new Date(date);
    return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  function waNumber(phone) {
    let d = String(phone || "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    else if (d.length === 10 && d.startsWith("0")) d = "971" + d.slice(1); // 050 123 4567
    else if (d.length === 9 && d.startsWith("5")) d = "971" + d;          // 50 123 4567
    return d;
  }

  const projectOf = (lead) => (lead.answers || []).find((a) => /project|service|interest/i.test(a.label))?.value || "";
  const openTasks = (lead) => (lead.tasks || []).filter((t) => !t.done).sort((a, b) => new Date(a.due_at) - new Date(b.due_at));
  const isOverdue = (t) => new Date(t.due_at) < Date.now();
  const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "there";

  // ---------- Data: live (Supabase) ----------
  function liveApi() {
    const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
    const must = ({ data, error }) => { if (error) throw new Error(error.message); return data; };
    async function fn(path, body, method = "POST") {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${FN_URL}/${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}`, apikey: cfg.supabaseAnonKey },
        body: method === "GET" ? undefined : JSON.stringify(body || {}),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(out.error || `Error ${res.status}`);
      return out;
    }
    return {
      async user() { const { data } = await sb.auth.getSession(); return data.session?.user?.email || null; },
      async signIn(email, password) { must(await sb.auth.signInWithPassword({ email, password })); },
      async signOut() { await sb.auth.signOut(); },
      async listLeads() { return must(await sb.from("leads").select("*, tasks(id,title,due_at,done)").order("created_at", { ascending: false }).limit(500)); },
      async getLead(id) { return must(await sb.from("leads").select("*, tasks(*)").eq("id", id).maybeSingle()); },
      async updateLead(id, patch) { must(await sb.from("leads").update(patch).eq("id", id)); },
      async deleteLead(id) { must(await sb.from("leads").delete().eq("id", id)); },
      async createLead(lead) { return must(await sb.from("leads").insert(lead).select().single()); },
      async addTask(task) { must(await sb.from("tasks").insert(task)); },
      async updateTask(id, patch) { must(await sb.from("tasks").update(patch).eq("id", id)); },
      async deleteTask(id) { must(await sb.from("tasks").delete().eq("id", id)); },
      async draft(lead_id, instruction) { return fn("draft", { lead_id, instruction }); },
      async pushKey() { return (await fn("push-key", null, "GET")).publicKey; },
      async testPush() { return fn("test-push"); },
      async savePush(sub, email) {
        const j = sub.toJSON();
        must(await sb.from("push_subscriptions").upsert({ endpoint: j.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, user_email: email }));
      },
      async leadKey() { return must(await sb.rpc("get_lead_key")); },
      async getInstructions() {
        const row = must(await sb.from("app_settings").select("value").eq("name", "ai_instructions").maybeSingle());
        return row?.value || "";
      },
      async siteUpdates() {
        return must(await sb.from("website_updates").select("title,url,category,published_at").order("published_at", { ascending: false }).limit(20));
      },
      async saveInstructions(value) {
        must(await sb.from("app_settings").upsert({ name: "ai_instructions", value, updated_at: new Date().toISOString() }));
      },
      async sendTestLead(key) {
        const res = await fetch(`${FN_URL}/lead`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-crm-key": key },
          body: JSON.stringify({
            full_name: "Test Lead", phone_number: "+971500000000", platform: "fb", form_name: "Test form",
            who_are_you: "I own the property", budget: "100k - 300k", project: "Landscaping / garden", timeline: "1-3 months",
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out.error || `Error ${res.status}`);
        return out;
      },
    };
  }

  // ---------- Data: demo (made-up leads, kept on this device only) ----------
  function demoApi() {
    const KEY = "ab-crm-demo-v1";
    const iso = (h) => new Date(Date.now() + h * 3600000).toISOString();
    const uid = () => Math.random().toString(36).slice(2, 10);
    const seed = () => ({
      leads: [
        { id: "d1", created_at: iso(-2), full_name: "Layla Haddad (demo)", phone: "+971500000001", source: "Instagram", form_name: "Free 3D garden design", status: "New",
          answers: [{ label: "Who", value: "I own the property" }, { label: "Budget", value: "300k – 500k" }, { label: "Project", value: "Swimming pool" }, { label: "Timeline", value: "Within 1 month" }, { label: "Area", value: "Arabian Ranches" }],
          qualification: "Qualified", qualification_reason: "Owner with a strong budget and a short timeline.", ai_draft: null, notes: "" },
        { id: "d2", created_at: iso(-50), full_name: "James Whitfield (demo)", phone: "+971500000002", source: "Facebook", form_name: "Free 3D garden design", status: "Replied/Interested",
          answers: [{ label: "Who", value: "I own the property" }, { label: "Budget", value: "100k – 300k" }, { label: "Project", value: "Landscaping / garden" }, { label: "Timeline", value: "1–3 months" }],
          qualification: "Qualified", ai_draft: "Hi James,\n\nThank you for your enquiry about your garden. A 1–3 month timeline works well for us, and we'd love to come and see the space.\n\nWe can visit, listen to what you have in mind and put together a free 3D design concept for you.\n\nWhat day and time suits you for a quick visit this week?\n\nBanu, A&B Design & Build", notes: "" },
        { id: "d3", created_at: iso(-120), full_name: "Fatima Rahman (demo)", phone: "+971500000003", source: "Website", form_name: "Website contact form", status: "Quote sent",
          answers: [{ label: "Who", value: "I'm the tenant" }, { label: "Budget", value: "Under 100k" }, { label: "Project", value: "Interior fit-out" }, { label: "Timeline", value: "3–6 months" }],
          qualification: "Maybe", ai_draft: null, notes: "Landlord approval pending." },
      ],
      tasks: [
        { id: "t1", lead_id: "d2", title: "Schedule site visit", due_at: iso(21), done: false },
        { id: "t2", lead_id: "d2", title: "Call back", due_at: iso(-30), done: true },
        { id: "t3", lead_id: "d3", title: "Follow up on WhatsApp", due_at: iso(-3), done: false },
      ],
    });
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || seed(); } catch { return seed(); } };
    let db = load();
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch { /* private mode */ } };
    const withTasks = (l) => ({ ...l, tasks: db.tasks.filter((t) => t.lead_id === l.id) });
    return {
      async user() { return "demo@abdesignandbuild.ae"; },
      async signIn() {}, async signOut() {},
      async listLeads() { return db.leads.map(withTasks).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); },
      async getLead(id) { const l = db.leads.find((x) => x.id === id); return l ? withTasks(l) : null; },
      async updateLead(id, patch) { Object.assign(db.leads.find((x) => x.id === id), patch); save(); },
      async deleteLead(id) { db.leads = db.leads.filter((x) => x.id !== id); db.tasks = db.tasks.filter((t) => t.lead_id !== id); save(); },
      async createLead(lead) { const l = { id: uid(), created_at: new Date().toISOString(), status: "New", answers: [], ...lead }; db.leads.push(l); save(); return l; },
      async addTask(t) { db.tasks.push({ id: uid(), done: false, ...t }); save(); },
      async updateTask(id, patch) { Object.assign(db.tasks.find((x) => x.id === id), patch); save(); },
      async deleteTask(id) { db.tasks = db.tasks.filter((x) => x.id !== id); save(); },
      async draft(lead_id, instruction) {
        const l = db.leads.find((x) => x.id === lead_id);
        const project = (projectOf(l) || "project").toLowerCase();
        const followUp = /follow/i.test(instruction || "") || l.last_contacted_at;
        const draft = followUp
          ? `Hi ${firstName(l.full_name)},\n\nJust following up on your ${project} enquiry. No rush at all. If it helps, we can pop over for a quick look and talk through ideas.\n\nWould later this week work for you?\n\nBanu, A&B Design & Build`
          : `Hi ${firstName(l.full_name)},\n\nThank you for getting in touch about your ${project}. We'd love to hear what you have in mind.\n\nWe can visit, see the space and prepare a free 3D design concept for you.\n\nWhat day and time would suit you for a quick call or visit?\n\nBanu, A&B Design & Build`;
        await new Promise((r) => setTimeout(r, 700));
        l.ai_draft = draft; save();
        return { draft };
      },
      async pushKey() { throw new Error("Notifications work once the CRM is connected to Supabase."); },
      async testPush() { throw new Error("Not available in demo mode."); },
      async savePush() {},
      async leadKey() { return "(appears here once connected)"; },
      async getInstructions() { return db.instructions || ""; },
      async siteUpdates() {
        return [{ title: "How much does a swimming pool cost in Dubai? (demo)", url: "https://www.abdesignandbuild.ae/journal/swimming-pool-cost-dubai.html", category: "Pools", published_at: iso(-5) }];
      },
      async saveInstructions(value) { db.instructions = value; save(); },
      async sendTestLead() {
        await this.createLead({ full_name: "Test Lead", phone: "+971500000000", source: "Facebook", form_name: "Test form",
          answers: [{ label: "Who are you", value: "I own the property" }, { label: "Budget", value: "100k - 300k" }, { label: "Project", value: "Landscaping / garden" }, { label: "Timeline", value: "1-3 months" }] });
        return { ok: true };
      },
      reset() { db = seed(); save(); },
    };
  }

  const api = DEMO ? demoApi() : liveApi();
  const state = {
    email: null,
    leads: [],
    filter: sessionGet("filter") || "Active",
    q: "",
    showDone: false,
  };

  function sessionGet(k) { try { return sessionStorage.getItem("crm-" + k); } catch { return null; } }
  function sessionSet(k, v) { try { sessionStorage.setItem("crm-" + k, v); } catch { /* ignore */ } }

  // ---------- Bottom sheet ----------
  function openSheet(html, onMount) {
    const root = $("#sheet-root");
    root.innerHTML = `<div class="backdrop" data-act="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    onMount && onMount($(".sheet", root));
  }
  function closeSheet() { $("#sheet-root").innerHTML = ""; }

  // ---------- Views ----------
  function viewLogin(error = "") {
    app.innerHTML = `
      <div class="wrap login">
        <img class="logo" src="icons/icon-192.png" alt="">
        <h1>A&amp;B Leads</h1>
        <p>Sign in to see your leads.</p>
        <form id="login-form">
          <label class="field"><span>Email</span><input name="email" type="email" autocomplete="username" required></label>
          <label class="field"><span>Password</span><input name="password" type="password" autocomplete="current-password" required></label>
          ${error ? `<div class="err">${h(error)}</div>` : ""}
          <button class="btn dark full" type="submit">Sign in</button>
        </form>
      </div>`;
    $("#login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector("button");
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await api.signIn(String(f.get("email")).trim(), String(f.get("password")));
        state.email = await api.user();
        route();
      } catch (err) {
        viewLogin(/invalid/i.test(err.message) ? "That email or password isn't right." : err.message);
      }
    });
  }

  const FILTERS = {
    Active: (l) => !CLOSED.includes(l.status),
    "To do": (l) => l.status === "New" || openTasks(l).some(isOverdue),
    New: (l) => l.status === "New",
    "Replied/Interested": (l) => l.status === "Replied/Interested",
    "Site visit booked": (l) => l.status === "Site visit booked",
    "Quote sent": (l) => l.status === "Quote sent",
    Won: (l) => l.status === "Won",
    Closed: (l) => CLOSED.includes(l.status),
    All: () => true,
  };

  async function viewList() {
    if (!app.querySelector(".lead-list-view")) {
      app.innerHTML = `<div class="wrap lead-list-view"><div class="empty"><span class="spinner"></span></div></div>`;
    }
    try { state.leads = await api.listLeads(); } catch (e) { toast(e.message); }
    renderList();
  }

  function renderList() {
    const q = state.q.trim().toLowerCase();
    const matches = (l) => !q || [l.full_name, l.phone, l.email, projectOf(l)].some((v) => String(v || "").toLowerCase().includes(q));
    const shown = state.leads.filter(FILTERS[state.filter] || FILTERS.All).filter(matches);
    const chips = Object.keys(FILTERS).map((f) => {
      const n = state.leads.filter(FILTERS[f]).length;
      return `<button class="chip" data-act="filter" data-f="${h(f)}" aria-pressed="${f === state.filter}">${h(f)}<span class="n">${n}</span></button>`;
    }).join("");

    const rows = shown.map((l) => {
      const next = openTasks(l)[0];
      return `
        <a class="lead-row" href="#/lead/${h(l.id)}">
          <div class="top">
            <div>
              <div class="name">${l.status === "New" ? '<span class="dot-new"></span>' : ""}${h(l.full_name)}</div>
              <div class="meta">${h([projectOf(l), l.source, agoShort(l.created_at)].filter(Boolean).join(" · "))}</div>
            </div>
            <span class="pill" data-s="${h(l.status)}">${h(l.status)}</span>
          </div>
          ${next ? `<div class="task ${isOverdue(next) ? "overdue" : ""}">${I.clock}${h(next.title)} · ${h(relTime(next.due_at))}</div>` : ""}
        </a>`;
    }).join("");

    const list = app.querySelector(".lead-list-view");
    const hadFocus = document.activeElement?.id === "search";
    list.innerHTML = `
      ${DEMO ? `<div class="demo-banner"><strong>Demo mode:</strong> these are made-up leads so you can try the app. Real leads appear once it's connected.</div>` : ""}
      <div class="topbar">
        <div class="brand"><img src="icons/icon-192.png" alt=""><h1>Leads</h1></div>
        <a class="icon-btn" href="#/settings" aria-label="Settings">${I.gear}</a>
      </div>
      ${tabsHtml("leads")}
      <input id="search" class="search" type="search" placeholder="Search name, phone or project" value="${h(state.q)}" autocomplete="off">
      <div class="chips" role="toolbar" aria-label="Filter leads">${chips}</div>
      ${rows || `<div class="empty"><h2>No leads here</h2><p>${state.leads.length ? "Try another filter." : "New leads from your ads will appear here."}</p></div>`}
      <button class="fab" data-act="new-lead" aria-label="Add a lead">${I.plus}</button>`;
    const s = $("#search");
    s.addEventListener("input", () => { state.q = s.value; renderList(); });
    if (hadFocus) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
  }

  function tabsHtml(active) {
    const tab = (key, href, label) => `<a class="tab" href="${href}" aria-current="${active === key ? "page" : "false"}">${label}</a>`;
    return `<nav class="tabs" aria-label="Sections">${tab("leads", "#/", "Leads")}${tab("articles", "#/articles", "Articles")}</nav>`;
  }

  async function viewArticles() {
    app.innerHTML = `
      <div class="wrap">
        <div class="topbar">
          <div class="brand"><img src="icons/icon-192.png" alt=""><h1>Articles</h1></div>
          <a class="icon-btn" href="#/settings" aria-label="Settings">${I.gear}</a>
        </div>
        ${tabsHtml("articles")}
        <p class="hint" style="margin:4px 2px 12px">Published on www.abdesignandbuild.ae, newest first.</p>
        <div id="articles"><div class="empty"><span class="spinner"></span></div></div>
      </div>`;
    const box = $("#articles");
    try {
      const items = await api.siteUpdates();
      box.innerHTML = items.length
        ? items.map((u) => `
            <a class="lead-row" href="${h(/^https:\/\//.test(u.url) ? u.url : "#")}" target="_blank" rel="noopener">
              <div class="top">
                <div class="name">${h(u.title)}</div>
                ${u.category ? `<span class="pill">${h(u.category)}</span>` : ""}
              </div>
              <div class="meta">Published ${h(new Date(u.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))} · tap to open</div>
            </a>`).join("")
        : `<div class="empty"><h2>No articles yet</h2><p>New articles appear here when they go live.</p></div>`;
    } catch (e) { box.innerHTML = `<div class="empty"><p>${h(e.message)}</p></div>`; }
  }

  async function viewLead(id) {
    app.innerHTML = `<div class="wrap"><div class="empty"><span class="spinner"></span></div></div>`;
    let lead;
    try { lead = await api.getLead(id); } catch (e) { toast(e.message); }
    if (!lead) { app.innerHTML = `<div class="wrap"><a class="back" href="#/">${I.back} Back</a><div class="empty"><h2>Lead not found</h2></div></div>`; return; }
    state.lead = lead;
    renderLead();
  }

  function renderLead() {
    const l = state.lead;
    const wa = waNumber(l.phone);
    const open = openTasks(l);
    const done = (l.tasks || []).filter((t) => t.done).sort((a, b) => new Date(b.done_at || b.due_at) - new Date(a.done_at || a.due_at));
    const info = [...(l.answers || [])];
    if (l.email) info.unshift({ label: "Email", value: l.email });
    if (l.qualification) info.push({ label: "Qualification status", value: l.qualification });
    if (l.campaign) info.push({ label: "Campaign", value: l.campaign });

    const taskHtml = (t) => `
      <div class="task-card ${t.done ? "done" : ""}">
        <button class="check ${t.done ? "on" : ""}" data-act="toggle-task" data-id="${h(t.id)}" aria-label="${t.done ? "Mark not done" : "Mark done"}">${I.check}</button>
        <button class="task-body" data-act="edit-task" data-id="${h(t.id)}">
          <div class="task-title">${h(t.title)}</div>
          <div class="task-when ${!t.done && isOverdue(t) ? "overdue" : ""}">${I.clock}${t.done ? "Done" : h(relTime(t.due_at))} · ${h(fmtDate(t.due_at))}</div>
        </button>
        <button class="x-btn" data-act="delete-task" data-id="${h(t.id)}" aria-label="Delete task">${I.x}</button>
      </div>`;

    app.innerHTML = `
      <div class="wrap">
        <div class="topbar">
          <a class="back" href="#/">${I.back} Back</a>
          <button class="icon-btn danger" data-act="delete-lead" aria-label="Delete lead">${I.trash}</button>
        </div>

        <div class="card">
          <h2 class="lead-name">${h(l.full_name)}</h2>
          ${l.phone ? `<div class="lead-phone">${h(l.phone)}</div>` : ""}
          <div class="lead-sub">${h([l.source, l.form_name].filter(Boolean).join(" · "))}<br>${h(fmtDate(l.created_at))}</div>
          <button class="status-box" data-act="status">
            <span><span class="lbl">STATUS</span><span class="val">${h(l.status)}</span></span>
            <span class="chg">Change ${I.chevron}</span>
          </button>
          <div class="actions">
            <a class="big-btn call" href="tel:${h(l.phone || "")}" data-act="contacted" aria-disabled="${!l.phone}">${I.phone} Call</a>
            <a class="big-btn wa" href="https://wa.me/${h(wa)}" target="_blank" rel="noopener" data-act="contacted" aria-disabled="${!wa}">${I.wa} WhatsApp</a>
          </div>
        </div>

        <div class="card ai-card">
          <div class="ai-head">
            <span class="t">${I.spark} Suggested WhatsApp reply</span>
            ${l.ai_draft ? `<button class="btn outline" data-act="rewrite" style="min-height:36px;padding:0 12px;font-size:14px">${I.refresh} Rewrite</button>` : ""}
          </div>
          ${l.ai_draft
            ? `<textarea id="draft" class="ai-text" aria-label="WhatsApp message">${h(l.ai_draft)}</textarea>
               <div class="ai-row"><a id="send-wa" class="btn primary grow" href="#" data-act="send-draft" aria-disabled="${!wa}">${I.send} Send on WhatsApp</a></div>
               <p class="hint">Check it, change anything you like, then tap Send. WhatsApp opens with the message ready.</p>`
            : `<p class="hint" style="margin-top:0">No reply drafted yet.</p>
               <button class="btn dark full" data-act="draft" style="margin-top:10px">${I.spark} Write a reply for me</button>`}
          ${l.qualification_reason ? `<div class="qual"><strong>AI view:</strong> ${h(l.qualification || "")}. ${h(l.qualification_reason)}</div>` : ""}
        </div>

        <div class="section-label"><span>${open.length > 1 ? "Next tasks" : "Next task"}</span>${done.length ? `<button data-act="show-done">Done · ${done.length}</button>` : ""}</div>
        ${open.map(taskHtml).join("")}
        <button class="add-task" data-act="add-task">${I.plus} ${open.length ? "Add another task" : "Add a task"}</button>
        ${state.showDone && done.length ? `<div class="section-label"><span>Done</span></div>${done.map(taskHtml).join("")}` : ""}

        ${info.length ? `
        <div class="card info" style="margin-top:22px">
          <div class="section-label" style="margin:0 0 4px">Submitted info</div>
          <dl>${info.map((a) => `<div class="row"><dt>${h(a.label)}</dt><dd>${h(a.value)}</dd></div>`).join("")}</dl>
        </div>` : ""}

        <div class="card" style="${info.length ? "" : "margin-top:22px"}">
          <div class="section-label" style="margin:0 0 10px">Private notes</div>
          <textarea id="notes" class="notes" placeholder="Anything to remember about this client">${h(l.notes || "")}</textarea>
        </div>
      </div>`;

    const draft = $("#draft");
    if (draft) {
      draft.addEventListener("change", () => api.updateLead(l.id, { ai_draft: draft.value }).catch((e) => toast(e.message)));
      draft.addEventListener("input", () => { l.ai_draft = draft.value; });
    }
    const notes = $("#notes");
    notes.addEventListener("change", async () => {
      try { await api.updateLead(l.id, { notes: notes.value }); l.notes = notes.value; toast("Notes saved"); } catch (e) { toast(e.message); }
    });
  }

  async function viewSettings() {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    const pushOk = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    const perm = pushOk ? Notification.permission : "unsupported";
    app.innerHTML = `
      <div class="wrap">
        <div class="topbar"><a class="back" href="#/">${I.back} Back</a></div>
        <h1 style="font-family:var(--serif);font-weight:500;font-size:30px;margin:0 0 16px">Settings</h1>

        ${!standalone ? `
        <div class="card settings-item">
          <h4>Put the app on your home screen</h4>
          <p>In Safari, tap the <strong>Share</strong> button (square with an arrow), then <strong>Add to Home Screen</strong>. Open the app from there from now on. Reminders only work that way.</p>
        </div>` : ""}

        <div class="card settings-item">
          <h4>Reminders on this phone</h4>
          <p>${perm === "granted" ? "Notifications are on for this phone." : perm === "denied" ? "Notifications are blocked. Turn them on in iPhone Settings → Notifications → A&B Leads." : pushOk ? "Get a notification when a new lead arrives and when a task is due." : "Open the app from your home screen first, then come back here."}</p>
          <div class="ai-row">
            ${pushOk && perm !== "denied" ? `<button class="btn dark grow" data-act="enable-push">${perm === "granted" ? "Re-connect this phone" : "Turn on notifications"}</button>` : ""}
            ${perm === "granted" ? `<button class="btn ghost" data-act="test-push">Test</button>` : ""}
          </div>
        </div>


        <div class="card settings-item">
          <h4>AI instructions</h4>
          <p>Tell the AI how to write your WhatsApp replies, in your own words. It follows these every time.</p>
          <textarea id="ai-instructions" class="notes" rows="6" placeholder="${h(INSTRUCTION_EXAMPLE)}" disabled>Loading…</textarea>
          <button class="btn dark full" style="margin-top:10px" data-act="save-instructions">Save instructions</button>
        </div>

        <div class="card settings-item">
          <h4>Try it with a test lead</h4>
          <p>Adds a pretend lead called "Test Lead" exactly as if it came from a Meta ad. Delete it afterwards.</p>
          <button class="btn ghost full" data-act="test-lead">Send a test lead</button>
        </div>

        <div class="card settings-item">
          <h4>Make.com connection</h4>
          <p>Copy these into the HTTP step in Make (see the setup guide).</p>
          <p style="margin-bottom:4px"><strong>URL</strong></p>
          <div class="code">${h(FN_URL ? FN_URL + "/lead" : "(appears once connected)")}</div>
          <p style="margin:12px 0 4px"><strong>Header name:</strong> x-crm-key &nbsp; <strong>Value:</strong></p>
          <div class="code" id="lead-key">Loading…</div>
        </div>

        <div class="card settings-item">
          <h4>Reminder timer (one-time setup)</h4>
          <p>Copy this, paste it into Supabase → SQL Editor, and press Run. It checks for due tasks every 5 minutes.</p>
          <div class="code">${h(cronSql())}</div>
          <button class="btn outline full" style="margin-top:10px" data-act="copy-cron">Copy</button>
        </div>

        <div class="card settings-item">
          <h4>Account</h4>
          <p>Signed in as ${h(state.email || "")}</p>
          ${DEMO ? `<button class="btn outline full" data-act="reset-demo">Reset demo leads</button>` : `<button class="btn outline full" data-act="sign-out">Sign out</button>`}
        </div>
      </div>`;
    try { $("#lead-key").textContent = (await api.leadKey()) || "(not available)"; } catch (e) { $("#lead-key").textContent = e.message; }
    const box = $("#ai-instructions");
    try { box.value = await api.getInstructions(); box.disabled = false; } catch (e) { box.value = ""; box.placeholder = e.message; }
  }

  function cronSql() {
    const url = FN_URL ? FN_URL + "/reminders" : "https://YOUR-PROJECT-REF.supabase.co/functions/v1/crm/reminders";
    return `create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('crm-reminders', '*/5 * * * *', $$
  select net.http_post(
    url := '${url}',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-crm-key', (select value from public.app_secrets where name = 'cron_key')),
    body := '{}'::jsonb);
$$);`;
  }

  // ---------- Sheets ----------
  function sheetStatus() {
    const l = state.lead;
    openSheet(`<h3>Change status</h3>${STATUSES.map((s) => `<button class="opt" data-act="set-status" data-s="${h(s)}">${h(s)}${s === l.status ? I.check : ""}</button>`).join("")}`);
  }

  function sheetTask(task) {
    const l = state.lead;
    const tomorrow9 = new Date(); tomorrow9.setDate(tomorrow9.getDate() + 1); tomorrow9.setHours(9, 0, 0, 0);
    const due = task ? new Date(task.due_at) : tomorrow9;
    openSheet(`
      <h3>${task ? "Edit task" : "New task"}</h3>
      <div class="presets">${TASK_PRESETS.map((p) => `<button class="chip" type="button" data-preset="${h(p)}">${h(p)}</button>`).join("")}</div>
      <form id="task-form">
        <label class="field"><span>What needs doing?</span><input name="title" required value="${h(task?.title || "")}" placeholder="e.g. Schedule site visit"></label>
        <div class="when-row">
          <button class="chip" type="button" data-when="1h">In 1 hour</button>
          <button class="chip" type="button" data-when="tom">Tomorrow 9am</button>
          <button class="chip" type="button" data-when="3d">In 3 days</button>
        </div>
        <label class="field"><span>When</span><input name="due" type="datetime-local" required value="${toLocalInput(due)}"></label>
        <button class="btn dark full" type="submit">${task ? "Save" : "Add task"}</button>
      </form>`, (sheet) => {
      const form = $("#task-form", sheet);
      sheet.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { form.title.value = b.dataset.preset; }));
      sheet.querySelectorAll("[data-when]").forEach((b) => b.addEventListener("click", () => {
        const d = new Date();
        if (b.dataset.when === "1h") d.setHours(d.getHours() + 1, d.getMinutes(), 0, 0);
        if (b.dataset.when === "tom") { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); }
        if (b.dataset.when === "3d") { d.setDate(d.getDate() + 3); d.setHours(9, 0, 0, 0); }
        form.due.value = toLocalInput(d);
      }));
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = { title: form.title.value.trim(), due_at: new Date(form.due.value).toISOString() };
        try {
          if (task) await api.updateTask(task.id, { ...data, notified_at: null });
          else await api.addTask({ ...data, lead_id: l.id });
          closeSheet();
          await viewLead(l.id);
          toast(task ? "Task updated" : "Task added");
        } catch (err) { toast(err.message); }
      });
    });
  }

  function sheetRewrite() {
    openSheet(`
      <h3>Rewrite the reply</h3>
      <div class="presets">${DRAFT_PRESETS.map((p) => `<button class="chip" type="button" data-preset="${h(p)}">${h(p)}</button>`).join("")}</div>
      <form id="rewrite-form">
        <label class="field"><span>Anything to change? (optional)</span><textarea name="instruction" rows="3" placeholder="e.g. Mention we can visit on Saturday morning"></textarea></label>
        <button class="btn dark full" type="submit">${I.spark} Write it</button>
      </form>`, (sheet) => {
      const form = $("#rewrite-form", sheet);
      sheet.querySelectorAll("[data-preset]").forEach((b) => b.addEventListener("click", () => { form.instruction.value = b.dataset.preset; }));
      form.addEventListener("submit", (e) => { e.preventDefault(); closeSheet(); runDraft(form.instruction.value.trim()); });
    });
  }

  function sheetNewLead() {
    openSheet(`
      <h3>Add a lead</h3>
      <p class="hint" style="margin:-6px 0 14px">For enquiries that came by phone, referral or Instagram message.</p>
      <form id="new-lead-form">
        <label class="field"><span>Name</span><input name="full_name" required></label>
        <label class="field"><span>Phone (with country code)</span><input name="phone" type="tel" placeholder="+971 50 123 4567"></label>
        <label class="field"><span>Where did they come from?</span>
          <select name="source"><option>Phone call</option><option>Referral</option><option>Instagram message</option><option>Website</option><option>Walk-in</option><option>Other</option></select></label>
        <label class="field"><span>Project</span><input name="project" placeholder="e.g. Pool and garden"></label>
        <label class="field"><span>Notes</span><textarea name="notes" rows="2"></textarea></label>
        <button class="btn dark full" type="submit">Add lead</button>
      </form>`, (sheet) => {
      const form = $("#new-lead-form", sheet);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = new FormData(form);
        try {
          const lead = await api.createLead({
            full_name: f.get("full_name").trim(), phone: f.get("phone").trim() || null, source: f.get("source"),
            answers: f.get("project").trim() ? [{ label: "Project", value: f.get("project").trim() }] : [],
            notes: f.get("notes").trim() || null,
          });
          closeSheet();
          location.hash = `#/lead/${lead.id}`;
        } catch (err) { toast(err.message); }
      });
    });
  }

  // ---------- Actions ----------
  async function runDraft(instruction) {
    const l = state.lead;
    const card = $(".ai-card");
    if (card) card.innerHTML = `<div class="ai-head"><span class="t">${I.spark} Writing a reply…</span><span class="spinner"></span></div><p class="hint">This takes a few seconds.</p>`;
    try {
      const out = await api.draft(l.id, instruction);
      await viewLead(l.id);
      if (out.draft) toast("Reply ready. Check it before sending.");
    } catch (e) {
      toast(e.message);
      renderLead();
    }
  }

  async function markContacted() {
    const l = state.lead;
    const patch = { last_contacted_at: new Date().toISOString() };
    if (l.status === "New") patch.status = "Contacted";
    try {
      await api.updateLead(l.id, patch);
      Object.assign(l, patch);
      if (patch.status) { renderLead(); toast("Status changed to Contacted"); }
    } catch (e) { toast(e.message); }
  }

  function urlB64ToUint8(base64) {
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  }

  async function enablePush() {
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { toast("Notifications were not allowed"); return viewSettings(); }
      const reg = await navigator.serviceWorker.ready;
      const key = await api.pushKey();
      const old = await reg.pushManager.getSubscription();
      if (old) await old.unsubscribe();
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8(key) });
      await api.savePush(sub, state.email);
      toast("Notifications are on");
      viewSettings();
    } catch (e) { toast(e.message); }
  }

  const actions = {
    "close-sheet": closeSheet,
    filter(el) { state.filter = el.dataset.f; sessionSet("filter", state.filter); renderList(); },
    "new-lead": sheetNewLead,
    status: sheetStatus,
    async "set-status"(el) {
      const s = el.dataset.s;
      closeSheet();
      try { await api.updateLead(state.lead.id, { status: s }); state.lead.status = s; renderLead(); toast(`Status: ${s}`); } catch (e) { toast(e.message); }
    },
    contacted(el, e) { if (el.getAttribute("aria-disabled") === "true") { e.preventDefault(); return; } markContacted(); },
    "send-draft"(el, e) {
      e.preventDefault();
      const l = state.lead;
      const text = $("#draft").value;
      api.updateLead(l.id, { ai_draft: text }).catch(() => {});
      window.open(`https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      markContacted();
    },
    draft() { runDraft(); },
    rewrite: sheetRewrite,
    "add-task"() { sheetTask(null); },
    "edit-task"(el) { sheetTask(state.lead.tasks.find((t) => t.id === el.dataset.id)); },
    async "toggle-task"(el) {
      const t = state.lead.tasks.find((x) => x.id === el.dataset.id);
      const patch = { done: !t.done, done_at: !t.done ? new Date().toISOString() : null };
      try { await api.updateTask(t.id, patch); Object.assign(t, patch); renderLead(); if (patch.done) toast("Task done ✓"); } catch (e) { toast(e.message); }
    },
    async "delete-task"(el) {
      if (!confirm("Delete this task?")) return;
      try { await api.deleteTask(el.dataset.id); state.lead.tasks = state.lead.tasks.filter((t) => t.id !== el.dataset.id); renderLead(); } catch (e) { toast(e.message); }
    },
    "show-done"() { state.showDone = !state.showDone; renderLead(); },
    async "delete-lead"() {
      if (!confirm(`Delete ${state.lead.full_name} and all their tasks? This can't be undone.`)) return;
      try { await api.deleteLead(state.lead.id); location.hash = "#/"; toast("Lead deleted"); } catch (e) { toast(e.message); }
    },
    "enable-push": enablePush,
    async "save-instructions"(el) {
      el.disabled = true;
      try { await api.saveInstructions($("#ai-instructions").value.trim()); toast("Instructions saved. New replies will follow them."); }
      catch (e) { toast(e.message); }
      el.disabled = false;
    },
    async "test-push"() { try { const r = await api.testPush(); toast(r.sent ? "Sent. Check your notifications." : "No phones connected yet"); } catch (e) { toast(e.message); } },
    async "test-lead"(el) {
      el.disabled = true;
      try {
        const key = await api.leadKey();
        await api.sendTestLead(key);
        toast("Test lead added");
        location.hash = "#/";
      } catch (e) { toast(e.message); el.disabled = false; }
    },
    async "copy-cron"() { try { await navigator.clipboard.writeText(cronSql()); toast("Copied"); } catch { toast("Press and hold the text to copy it"); } },
    async "sign-out"() { await api.signOut(); state.email = null; location.hash = "#/"; route(); },
    "reset-demo"() { api.reset(); toast("Demo leads reset"); location.hash = "#/"; },
  };

  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-act]");
    if (!el || !actions[el.dataset.act]) return;
    if (el.tagName === "BUTTON") e.preventDefault();
    actions[el.dataset.act](el, e);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  // ---------- Router ----------
  async function route() {
    closeSheet();
    if (!state.email) state.email = await api.user();
    if (!state.email) return viewLogin();
    const hash = location.hash || "#/";
    const m = hash.match(/^#\/lead\/(.+)$/);
    window.scrollTo(0, 0);
    if (m) return viewLead(decodeURIComponent(m[1]));
    if (hash === "#/settings") return viewSettings();
    if (hash === "#/articles") return viewArticles();
    state.showDone = false;
    return viewList();
  }

  window.addEventListener("hashchange", route);
  // Refresh when the app is reopened from the home screen.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !state.email) return;
    if ((location.hash || "#/") === "#/") viewList();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    // A tapped notification asks the open app to show a page (e.g. the new lead).
    navigator.serviceWorker.addEventListener("message", (e) => {
      if (e.data?.type === "open" && typeof e.data.hash === "string" && e.data.hash.startsWith("#/")) location.hash = e.data.hash;
    });
  }
  route();
})();
