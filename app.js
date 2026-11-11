// X-Cite Flooring — admin app. All data is stored in this browser (localStorage).

// ---------- Default rate card (rates derived from X-Cite Flooring invoice) ----------
const DEFAULT_RATES = [
  // Italian
  ['Italian', 'Floor fitting', 85],
  ['Italian', 'Skirting fitting', 85],
  ['Italian', 'Moulding', 85],
  ['Italian', 'Beading', 85],
  ['Italian', 'Polish', 85],
  ['Italian', 'Riser', 170],
  ['Italian', 'Step / front step fitting', 170],
  ['Italian', 'Moulding (step/stair)', 170],
  ['Italian', 'Double moulding', 170],
  ['Italian', 'Double Italian fitting', 170],
  // Marble
  ['Marble', 'Floor fitting', 40],
  ['Marble', 'Skirting', 40],
  ['Marble', 'Moulding', 40],
  ['Marble', 'Double moulding', 80],
  ['Marble', 'Beading', 20],
  // Granite
  ['Granite', 'Floor fitting', 40],
  ['Granite', 'Riser', 80],
  ['Granite', 'Moulding', 40],
  ['Granite', 'Double moulding', 80],
  ['Granite', 'Beading', 40],
  ['Granite', 'Outdoor granite fitting', 80],
  ['Granite', 'Round / curved', 80],
  ['Granite', 'Ramp fitting', 80],
  // Tile & Bathroom
  ['Tile & Bathroom', 'Wall tiles', 50],
  ['Tile & Bathroom', 'Floor tiles', 50],
  ['Tile & Bathroom', 'Skirting', 50],
  ['Tile & Bathroom', '45° angle cut (per rft)', 100],
  ['Tile & Bathroom', 'Running feet / corner (per rft)', 50],
  ['Tile & Bathroom', 'Beading (per rft)', 50],
  // Stair
  ['Stair', 'Stair fitting', 170],
  ['Stair', 'Landing', 80],
  ['Stair', 'Riser', 170],
  ['Stair', 'Moulding', 170],
  ['Stair', 'Beading', 40],
  ['Stair', 'Skirting fitting', 85],
  ['Stair', 'Moulding (skirting)', 80],
  // Cladding
  ['Cladding', 'Cladding / Gladding', 120],
  ['Cladding', 'Pool side cladding', 120],
  // Outdoor & Exterior
  ['Outdoor & Exterior', 'Charupadi / verandah', 80],
  ['Outdoor & Exterior', 'Outside steps', 70],
  ['Outdoor & Exterior', 'Riser (outside steps)', 70],
  ['Outdoor & Exterior', 'Moulding (outside steps)', 70],
  ['Outdoor & Exterior', 'Skirting (outside)', 70],
  ['Outdoor & Exterior', 'Back step', 80],
  ['Outdoor & Exterior', 'Front step', 170],
  ['Outdoor & Exterior', 'Plant box riser', 170],
  ['Outdoor & Exterior', 'Washing area floor', 40],
  ['Outdoor & Exterior', 'Washing area wall', 40],
  ['Outdoor & Exterior', 'Garden granite fitting', 80],
  // Other
  ['Other', 'Store room tiles', 50],
  ['Other', 'Kitchen wall tiles', 50],
  ['Other', 'Work area wall tiles', 50],
  ['Other', 'Kotta stone polish', 80],
  ['Other', 'Athangudi tile', 40],
  ['Other', 'Floor plastering', 15],
];

const DEFAULT_SETTINGS = {
  company: 'X-CITE FLOORING',
  tagline: 'The innovative Flooring Solutions',
  phone: '8075438181',
  advance: 50000,
  terms: 'Water, Electricity and Accommodation should be provided by the client.\nAdvance of ₹50,000 must be given before the work is started.',
};

// ---------- Storage ----------
const KEY = 'xcite-data-v1';
let db = load();

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY));
    if (d) return d;
  } catch (e) {}
  return {
    rates: DEFAULT_RATES.map(([category, name, rate]) => ({ id: uid(), category, name, rate, unit: name.includes('rft') ? 'rft' : 'sq.ft' })),
    visits: [], quotes: [], jobs: [], workers: [],
    settings: { ...DEFAULT_SETTINGS },
    counters: { quote: 0, job: 0 },
  };
}
// ---------- Supabase ----------
const SB_URL = 'https://tjvuikerdkwnhdqhkkyz.supabase.co';
const SB_KEY = 'sb_publishable_c7p_NVsJGdCX2S8etOshnw_Oy2REkoY';
let sb = null;
let syncState = 'idle';   // idle | syncing | ok | error
let lastSyncTime = null;

function initSB() {
  try { sb = window.supabase?.createClient(SB_URL, SB_KEY) || null; } catch (e) { sb = null; }
}

function setSyncDot(state) {
  syncState = state;
  const el = document.getElementById('sync-dot');
  if (!el) return;
  el.className = 'sync-dot ' + state;
  el.title = { idle: 'Connecting…', syncing: 'Syncing…', ok: 'Synced ✓', error: 'Sync failed — offline mode' }[state] || '';
}

async function cloudSave() {
  if (!sb) return;
  setSyncDot('syncing');
  try {
    const { error } = await sb.from('xcite_data').upsert({ id: 'main', data: db }, { onConflict: 'id' });
    if (error) throw error;
    lastSyncTime = new Date();
    setSyncDot('ok');
  } catch (e) {
    console.warn('Cloud save failed:', e.message);
    setSyncDot('error');
  }
}

async function cloudLoad() {
  if (!sb) return;
  setSyncDot('syncing');
  try {
    const { data, error } = await sb.from('xcite_data').select('data').eq('id', 'main').maybeSingle();
    if (error) throw error;
    if (data?.data) {
      db = data.data;
      localStorage.setItem(KEY, JSON.stringify(db));
      lastSyncTime = new Date();
      setSyncDot('ok');
      render();
    } else {
      await cloudSave();   // first run — push local data up
    }
  } catch (e) {
    console.warn('Cloud load failed:', e.message);
    setSyncDot('error');
  }
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  cloudSave();   // async background sync, never blocks UI
}

// ---------- Helpers ----------
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '₹' + (Math.round(Number(n) || 0)).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const fmtDate = d => d ? new Date(d + 'T00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const num = v => Number(v) || 0;
const byId = (list, id) => db[list].find(x => x.id === id);
const badge = s => `<span class="badge ${esc(s).replace(/ /g, '-')}">${esc(s)}</span>`;

function itemsTotal(items) { return items.reduce((s, it) => s + num(it.qty) * num(it.rate), 0); }
function quoteTotal(q) { return Math.max(0, itemsTotal(q.items) - num(q.discount)); }
function jobPaid(j) { return j.payments.reduce((s, p) => s + num(p.amount), 0); }

function buildCustomerMap() {
  const map = new Map();
  const normalize = p => String(p || '').replace(/\D/g, '').slice(-10);
  const ckey = (phone, name) => normalize(phone) || (name || '').toLowerCase().trim();
  const upsert = (phone, name, address) => {
    const k = ckey(phone, name); if (!k) return null;
    if (!map.has(k)) map.set(k, { key: k, phone: phone || '', name: name || '', address: address || '', visits: [], quotes: [], jobs: [] });
    const c = map.get(k);
    if (name && name.length > c.name.length) c.name = name;
    if (address && !c.address) c.address = address;
    if (phone && !c.phone) c.phone = phone;
    return c;
  };
  db.visits.forEach(v => { const c = upsert(v.phone, v.name, v.address); if (c) c.visits.push(v); });
  db.quotes.forEach(q => { const c = upsert(q.client.phone, q.client.name, q.client.address); if (c) c.quotes.push(q); });
  db.jobs.forEach(j => { const c = upsert(j.client.phone, j.client.name, j.client.address); if (c) c.jobs.push(j); });
  return map;
}

function waLink(phone, text) {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.length === 10) p = '91' + p;
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

function openModal(html) { $('#modal-box').innerHTML = html; $('#modal').classList.remove('hidden'); window.scrollTo(0, 0); }
function closeModal() { $('#modal').classList.add('hidden'); $('#modal-box').innerHTML = ''; }
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });

function formData(form) {
  const o = {};
  new FormData(form).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
  return o;
}

// ---------- Navigation ----------
const TABS = [
  ['home',      '🏠', 'Home'],
  ['visits',    '📍', 'Visits'],
  ['quotes',    '🧾', 'Quotes'],
  ['jobs',      '🛠️', 'Jobs'],
  ['crm',       '👥', 'CRM'],
  ['reminders', '🔔', 'Remind'],
  ['reports',   '📊', 'Reports'],
  ['workers',   '👷', 'Workers'],
  ['rates',     '📋', 'Rates'],
];
let tab = location.hash.slice(1) || 'home';
let filter = 'all';
let search = '';

function go(t) { tab = t; filter = 'all'; search = ''; location.hash = t; render(); }
window.addEventListener('hashchange', () => { const t = location.hash.slice(1); if (t && t !== tab) { tab = t; render(); } });

function render() {
  $('#tabs').innerHTML = TABS.map(([k, i, l]) =>
    `<button class="${tab === k ? 'on' : ''}" onclick="go('${k}')"><span class="i">${i}</span>${l}</button>`).join('');
  const views = { home: viewHome, visits: viewVisits, quotes: viewQuotes, jobs: viewJobs, crm: viewCRM, reminders: viewReminders, reports: viewReports, workers: viewWorkers, rates: viewRates, settings: viewSettings };
  $('#view').innerHTML = (views[tab] || viewHome)();
}

function chips(options) {
  return `<div class="chips">${['all', ...options].map(o =>
    `<button class="${filter === o ? 'on' : ''}" onclick="filter='${o}';render()">${o}</button>`).join('')}</div>`;
}
function searchBox(ph) {
  return `<input class="search" placeholder="${ph}" value="${esc(search)}" oninput="search=this.value;renderList()">`;
}
let renderList = () => {};
function matches(obj) {
  if (!search) return true;
  return JSON.stringify(obj).toLowerCase().includes(search.toLowerCase());
}

// ---------- Home ----------
function dueReminders() {
  const now = today();
  return [
    ...db.visits.filter(v => v.followUp && v.followUp <= now && v.status !== 'cancelled' && v.status !== 'quoted'),
    ...db.quotes.filter(q => q.followUp && q.followUp <= now && q.status !== 'accepted' && q.status !== 'rejected'),
  ];
}

function viewHome() {
  const activeJobs = db.jobs.filter(j => j.status !== 'completed' && j.status !== 'cancelled');
  const pendingBal = db.jobs.filter(j => j.status !== 'cancelled').reduce((s, j) => s + Math.max(0, j.total - jobPaid(j)), 0);
  const upcoming = db.visits.filter(v => v.status === 'new' && v.date >= today()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 5);
  const month = today().slice(0, 7);
  const received = db.jobs.flatMap(j => j.payments).filter(p => (p.date || '').startsWith(month)).reduce((s, p) => s + num(p.amount), 0);
  const due = dueReminders();
  return `
    <h2>Dashboard <button class="btn sec sm" onclick="go('settings')">⚙️ Settings</button></h2>
    ${due.length ? `<div class="alert-bar" onclick="go('reminders')">🔔 ${due.length} follow-up reminder${due.length > 1 ? 's' : ''} due — tap to view</div>` : ''}
    <div class="stats">
      <div class="stat"><b>${upcoming.length}</b>Upcoming visits</div>
      <div class="stat"><b>${db.quotes.filter(q => q.status === 'draft' || q.status === 'sent').length}</b>Open quotes</div>
      <div class="stat"><b>${activeJobs.length}</b>Active jobs</div>
      <div class="stat"><b>${money(received)}</b>Received this month</div>
      <div class="stat"><b>${money(pendingBal)}</b>Balance to collect</div>
    </div>
    <div class="btns" style="margin-bottom:12px">
      <button class="btn" onclick="editVisit()">+ Site visit</button>
      <button class="btn" onclick="editQuote()">+ Quote / Estimate</button>
    </div>
    <h3>Upcoming site visits</h3>
    ${upcoming.length ? upcoming.map(visitCard).join('') : '<div class="card mut">No upcoming visits</div>'}
    <h3>Active jobs</h3>
    ${activeJobs.length ? activeJobs.map(jobCard).join('') : '<div class="card mut">No active jobs</div>'}`;
}

// ---------- Site visits ----------
const VISIT_STATUS = ['new', 'visited', 'quoted', 'cancelled'];

function visitCard(v) {
  return `<div class="card click" onclick="editVisit('${v.id}')">
    <div class="row"><span class="big">${esc(v.name)}</span>${badge(v.status)}</div>
    <div class="mut">📅 ${fmtDate(v.date)} ${esc(v.time)} · 📞 ${esc(v.phone)}</div>
    <div class="mut">📍 ${esc(v.address)}</div>
    ${v.service ? `<div class="mut">🔧 ${esc(v.service)}${v.area ? ` · approx ${esc(v.area)} sq.ft` : ''}</div>` : ''}
  </div>`;
}

function viewVisits() {
  renderList = () => {
    const list = db.visits.filter(v => (filter === 'all' || v.status === filter) && matches(v))
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    $('#list').innerHTML = list.length ? list.map(visitCard).join('') : '<div class="empty">No site visits</div>';
  };
  setTimeout(renderList);
  return `<h2>Site Visits <button class="btn sm" onclick="editVisit()">+ New</button></h2>
    ${chips(VISIT_STATUS)}${searchBox('Search name, phone, place…')}<div id="list"></div>`;
}

function editVisit(id) {
  const v = id ? byId('visits', id) : { date: today(), time: '', status: 'new' };
  const services = [...new Set(db.rates.map(r => r.category))];
  openModal(`
    <h2>${id ? 'Site Visit' : 'New Site Visit'} <button class="btn sec sm" onclick="closeModal()">✕</button></h2>
    <form id="f">
      <label>Customer name *</label><input name="name" required value="${esc(v.name)}">
      <div class="grid2">
        <div><label>Phone *</label><input name="phone" type="tel" required value="${esc(v.phone)}"></div>
        <div><label>Status</label><select name="status">${VISIT_STATUS.map(s => `<option ${v.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label>Visit date</label><input name="date" type="date" value="${esc(v.date)}"></div>
        <div><label>Time</label><input name="time" type="time" value="${esc(v.time)}"></div>
      </div>
      <label>Site address</label><textarea name="address">${esc(v.address)}</textarea>
      <div class="grid2">
        <div><label>Service needed</label><input name="service" list="svc" value="${esc(v.service)}">
          <datalist id="svc">${services.map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
        <div><label>Approx area (sq.ft)</label><input name="area" type="number" value="${esc(v.area)}"></div>
      </div>
      <label>Notes / measurements</label><textarea name="notes">${esc(v.notes)}</textarea>
      <label>Follow-up reminder date</label><input name="followUp" type="date" value="${esc(v.followUp)}">
      <div class="btns">
        <button class="btn">Save</button>
        ${id ? `<button type="button" class="btn sec" onclick="quoteFromVisit('${id}')">Create quote</button>
          <a class="btn sec" href="tel:${esc(v.phone)}">📞 Call</a>
          <a class="btn sec" target="_blank" href="https://maps.google.com/?q=${encodeURIComponent(v.address || '')}">🗺️ Map</a>
          <button type="button" class="btn red" onclick="del('visits','${id}')">Delete</button>` : ''}
      </div>
    </form>`);
  $('#f').onsubmit = e => {
    e.preventDefault();
    const d = formData(e.target);
    if (id) Object.assign(v, d); else db.visits.push({ id: uid(), created: today(), ...d });
    save(); closeModal(); render();
  };
}

function quoteFromVisit(id) {
  const v = byId('visits', id);
  v.status = 'quoted'; save();
  editQuote(null, { client: { name: v.name, phone: v.phone, address: v.address }, visitId: id, notes: v.notes || '' });
}

function del(list, id) {
  if (!confirm('Delete this record?')) return;
  db[list] = db[list].filter(x => x.id !== id);
  save(); closeModal(); render();
}

// ---------- Quotes / Estimates ----------
const QUOTE_STATUS = ['draft', 'sent', 'accepted', 'rejected'];

function quoteCard(q) {
  return `<div class="card click" onclick="editQuote('${q.id}')">
    <div class="row"><span class="big">${esc(q.client.name)}</span>${badge(q.status)}</div>
    <div class="row"><span class="mut">Q-${q.no} · ${fmtDate(q.date)} · ${q.items.length} item(s)</span><b>${money(quoteTotal(q))}</b></div>
  </div>`;
}

function viewQuotes() {
  renderList = () => {
    const list = db.quotes.filter(q => (filter === 'all' || q.status === filter) && matches(q)).sort((a, b) => b.no - a.no);
    $('#list').innerHTML = list.length ? list.map(quoteCard).join('') : '<div class="empty">No quotes yet</div>';
  };
  setTimeout(renderList);
  return `<h2>Quotes & Estimates <button class="btn sm" onclick="editQuote()">+ New</button></h2>
    ${chips(QUOTE_STATUS)}${searchBox('Search customer, phone…')}<div id="list"></div>`;
}

let draft = null; // quote being edited

function rateOptions(selected) {
  const cats = [...new Set(db.rates.map(r => r.category))];
  return `<option value="">— custom item —</option>` + cats.map(c =>
    `<optgroup label="${esc(c)}">${db.rates.filter(r => r.category === c).map(r =>
      `<option value="${r.id}" ${r.id === selected ? 'selected' : ''}>${esc(r.name)} (${money(r.rate)})</option>`).join('')}</optgroup>`).join('');
}

function editQuote(id, preset) {
  const q = id ? byId('quotes', id) : null;
  draft = JSON.parse(JSON.stringify(q || {
    date: today(), status: 'draft', discount: 0, notes: '', followUp: '', advance: null,
    client: { name: '', phone: '', address: '' },
    items: [{ rateId: '', name: '', qty: '', rate: '', unit: 'sq.ft' }],
    ...preset,
  }));
  const job = q && db.jobs.find(j => j.quoteId === q.id);
  openModal(`
    <h2>${q ? 'Quote Q-' + q.no : 'New Quote / Estimate'} <button class="btn sec sm" onclick="closeModal()">✕</button></h2>
    <div class="grid2">
      <div><label>Customer name *</label><input id="qn" value="${esc(draft.client.name)}"></div>
      <div><label>Phone</label><input id="qp" type="tel" value="${esc(draft.client.phone)}"></div>
      <div><label>Date</label><input id="qd" type="date" value="${esc(draft.date)}"></div>
      <div><label>Status</label><select id="qs">${QUOTE_STATUS.map(s => `<option ${draft.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    </div>
    <label>Site address</label><textarea id="qa">${esc(draft.client.address)}</textarea>
    <h3>Work items</h3>
    <div style="overflow-x:auto"><table class="items" id="items"></table></div>
    <button class="btn sec sm" style="margin-top:8px" onclick="addItem()">+ Add item</button>
    <div class="grid2">
      <div><label>Discount (₹)</label><input id="qdisc" type="number" value="${esc(draft.discount)}" oninput="draft.discount=this.value;drawTotal()"></div>
      <div><div class="total" id="qtotal"></div></div>
    </div>
    <label>Notes (shown on quote)</label><textarea id="qnotes">${esc(draft.notes)}</textarea>
    <label>Follow-up reminder date</label><input id="qfu" type="date" value="${esc(draft.followUp)}">
    <div class="adv-box">
      <b>💰 Advance Received</b> <span class="mut">(leave blank if none)</span>
      <div class="grid2" style="margin-top:8px">
        <div><label>Amount (₹)</label><input id="qadva" type="number" placeholder="0" value="${esc(draft.advance?.amount || '')}"></div>
        <div><label>Date</label><input id="qadvd" type="date" value="${esc(draft.advance?.date || today())}"></div>
        <div><label>Mode</label><select id="qadvm">${['Cash','UPI','Bank','Cheque'].map(m=>`<option${(draft.advance?.mode||'Cash')===m?' selected':''}>${m}</option>`).join('')}</select></div>
        <div><label>Note</label><input id="qadvn" value="${esc(draft.advance?.note||'Advance')}"></div>
      </div>
    </div>
    <div class="btns">
      <button class="btn" onclick="saveQuote('${id || ''}')">Save</button>
      ${q ? `
        <button class="btn sec" onclick="saveQuote('${id}', true);printDoc('quote','${id}')">🖨️ Print / PDF</button>
        <button class="btn sec" onclick="saveQuote('${id}', true);shareQuote('${id}')">💬 WhatsApp</button>
        ${job ? `<button class="btn sec" onclick="closeModal();go('jobs');editJob('${job.id}')">Open job J-${job.no}</button>`
              : `<button class="btn sec" onclick="saveQuote('${id}', true);jobFromQuote('${id}')">✅ Convert to job</button>`}
        <button class="btn red" onclick="del('quotes','${id}')">Delete</button>` : ''}
    </div>`);
  drawItems();
}

function drawItems() {
  $('#items').innerHTML = `<tr><th>Service</th><th>Description</th><th class="n">Qty</th><th>Unit</th><th class="n">Rate ₹</th><th class="n">Amount</th><th></th></tr>` +
    draft.items.map((it, i) => `<tr>
      <td><select style="min-width:140px" onchange="pickRate(${i}, this.value)">${rateOptions(it.rateId)}</select></td>
      <td><input style="min-width:140px" value="${esc(it.name)}" oninput="draft.items[${i}].name=this.value"></td>
      <td><input style="width:80px" type="number" step="any" value="${esc(it.qty)}" oninput="draft.items[${i}].qty=this.value;drawTotal()"></td>
      <td><input style="width:65px" value="${esc(it.unit)}" oninput="draft.items[${i}].unit=this.value"></td>
      <td><input style="width:80px" type="number" step="any" value="${esc(it.rate)}" oninput="draft.items[${i}].rate=this.value;drawTotal()"></td>
      <td class="n" id="amt${i}">${money(num(it.qty) * num(it.rate))}</td>
      <td><button class="btn red sm" onclick="draft.items.splice(${i},1);drawItems()">✕</button></td>
    </tr>`).join('');
  drawTotal();
}
function drawTotal() {
  draft.items.forEach((it, i) => { const c = $('#amt' + i); if (c) c.textContent = money(num(it.qty) * num(it.rate)); });
  const sub = itemsTotal(draft.items);
  $('#qtotal').innerHTML = `<div class="mut">Subtotal ${money(sub)}</div>Total ${money(Math.max(0, sub - num(draft.discount)))}`;
}
function addItem() { draft.items.push({ rateId: '', name: '', qty: '', rate: '', unit: 'sq.ft' }); drawItems(); }
function pickRate(i, rateId) {
  const r = db.rates.find(x => x.id === rateId);
  const it = draft.items[i];
  it.rateId = rateId;
  if (r) {
    it.name = `${r.category} – ${r.name}`;
    it.rate = r.rate;
    it.unit = r.name.includes('rft') ? 'rft' : r.unit;
  }
  drawItems();
}

function saveQuote(id, keepOpen) {
  draft.client = { name: $('#qn').value.trim(), phone: $('#qp').value.trim(), address: $('#qa').value.trim() };
  draft.date = $('#qd').value; draft.status = $('#qs').value; draft.notes = $('#qnotes').value;
  draft.followUp = $('#qfu').value; draft.discount = num($('#qdisc').value);
  const advAmt = num($('#qadva').value);
  draft.advance = advAmt ? { amount: advAmt, date: $('#qadvd').value, mode: $('#qadvm').value, note: $('#qadvn').value.trim() || 'Advance' } : null;
  draft.items = draft.items.filter(it => it.name || num(it.qty) || num(it.rate));
  if (!draft.client.name) { alert('Enter customer name'); return; }
  if (id) Object.assign(byId('quotes', id), draft);
  else { draft.id = uid(); draft.no = ++db.counters.quote; db.quotes.push(draft); id = draft.id; }
  save();
  if (keepOpen) return;
  closeModal(); render();
}

function shareQuote(id) {
  const q = byId('quotes', id), s = db.settings;
  const lines = q.items.map(it => `• ${it.name}: ${it.qty} ${it.unit} × ₹${it.rate} = ${money(num(it.qty) * num(it.rate))}`);
  const text = `*${s.company}* – Quotation Q-${q.no}\nDate: ${fmtDate(q.date)}\nCustomer: ${q.client.name}\n\n${lines.join('\n')}\n` +
    (num(q.discount) ? `Discount: -${money(q.discount)}\n` : '') +
    `*Total: ${money(quoteTotal(q))}*\n\n${q.notes ? q.notes + '\n\n' : ''}${s.terms}\n\n📞 ${s.phone}`;
  if (q.status === 'draft') { q.status = 'sent'; save(); }
  window.open(waLink(q.client.phone, text), '_blank');
}

// ---------- Jobs ----------
const JOB_STATUS = ['scheduled', 'in progress', 'completed', 'cancelled'];

function jobFromQuote(qid) {
  const q = byId('quotes', qid);
  q.status = 'accepted';
  const payments = q.advance && num(q.advance.amount)
    ? [{ date: q.advance.date || today(), amount: q.advance.amount, mode: q.advance.mode, note: q.advance.note }]
    : [];
  const j = {
    id: uid(), no: ++db.counters.job, quoteId: q.id, client: { ...q.client },
    items: JSON.parse(JSON.stringify(q.items)), discount: q.discount, total: quoteTotal(q),
    status: 'scheduled', start: today(), end: '', workers: [], payments, notes: '',
  };
  db.jobs.push(j); save(); closeModal(); go('jobs'); editJob(j.id);
}

function jobCard(j) {
  const paid = jobPaid(j), bal = j.total - paid;
  const pct = j.total ? Math.min(100, Math.round(paid / j.total * 100)) : 0;
  return `<div class="card click" onclick="${tab === 'jobs' ? '' : "go('jobs');"}editJob('${j.id}')">
    <div class="row"><span class="big">${esc(j.client.name)}</span>${badge(j.status)}</div>
    <div class="mut">J-${j.no} · Start ${fmtDate(j.start)} · 👷 ${j.workers.length} worker(s)</div>
    <div class="row"><span class="mut">Paid ${money(paid)} of ${money(j.total)}</span><b style="color:${bal > 0 ? 'var(--red)' : 'var(--g)'}">Bal ${money(bal)}</b></div>
    <div style="background:#eee;height:6px;border-radius:3px;margin-top:6px"><div style="background:var(--g);height:6px;border-radius:3px;width:${pct}%"></div></div>
  </div>`;
}

function viewJobs() {
  renderList = () => {
    const list = db.jobs.filter(j => (filter === 'all' || j.status === filter) && matches(j)).sort((a, b) => b.no - a.no);
    $('#list').innerHTML = list.length ? list.map(jobCard).join('') : '<div class="empty">No jobs yet. Accept a quote to create a job.</div>';
  };
  setTimeout(renderList);
  return `<h2>Jobs</h2>${chips(JOB_STATUS)}${searchBox('Search customer, phone…')}<div id="list"></div>`;
}

function editJob(id) {
  const j = byId('jobs', id);
  const paid = jobPaid(j);
  const advOk = paid >= num(db.settings.advance);
  openModal(`
    <h2>Job J-${j.no} <button class="btn sec sm" onclick="closeModal()">✕</button></h2>
    <div class="card">
      <div class="big">${esc(j.client.name)}</div>
      <div class="mut">📞 ${esc(j.client.phone)} · 📍 ${esc(j.client.address)}</div>
      <div class="mut">From quote Q-${byId('quotes', j.quoteId)?.no ?? '-'}</div>
    </div>
    <div class="grid2">
      <div><label>Status</label><select id="js">${JOB_STATUS.map(s => `<option ${j.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <div><label>Job total (₹)</label><input id="jt" type="number" value="${j.total}"></div>
      <div><label>Start date</label><input id="jst" type="date" value="${esc(j.start)}"></div>
      <div><label>End date</label><input id="jen" type="date" value="${esc(j.end)}"></div>
    </div>

    <h3>Workers assigned</h3>
    ${db.workers.length ? db.workers.map(w => `<label style="display:flex;gap:8px;align-items:center;color:#333;font-size:15px">
      <input type="checkbox" style="width:auto" class="jw" value="${w.id}" ${j.workers.includes(w.id) ? 'checked' : ''}> ${esc(w.name)} <span class="mut">${esc(w.skill)}</span></label>`).join('')
      : '<div class="mut">No workers added yet — add them in the Workers tab.</div>'}

    <h3>Payments</h3>
    ${!advOk && j.status !== 'cancelled' ? `<div class="card" style="background:#fff3e0">⚠️ Advance of ${money(db.settings.advance)} not yet received</div>` : ''}
    <table>
      <tr><th>Date</th><th>Mode</th><th>Note</th><th class="n">Amount</th><th></th></tr>
      ${j.payments.map((p, i) => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.mode)}</td><td>${esc(p.note)}</td><td class="n">${money(p.amount)}</td>
        <td><button class="btn red sm" onclick="delPayment('${id}',${i})">✕</button></td></tr>`).join('')}
    </table>
    <div class="grid2" style="grid-template-columns:1fr 1fr 1fr 1fr auto;gap:6px;align-items:end">
      <div><label>Date</label><input id="pd" type="date" value="${today()}"></div>
      <div><label>Amount</label><input id="pa" type="number"></div>
      <div><label>Mode</label><select id="pm"><option>Cash</option><option>UPI</option><option>Bank</option><option>Cheque</option></select></div>
      <div><label>Note</label><input id="pn" placeholder="Advance / part"></div>
      <div><button class="btn sm" onclick="addPayment('${id}')">Add</button></div>
    </div>
    <div class="total">Paid ${money(paid)} · Balance ${money(j.total - paid)}</div>

    <label>Job notes</label><textarea id="jnotes">${esc(j.notes)}</textarea>
    <div class="btns">
      <button class="btn" onclick="saveJob('${id}')">Save</button>
      <button class="btn sec" onclick="saveJob('${id}',true);printDoc('invoice','${id}')">🖨️ Invoice / PDF</button>
      <button class="btn sec" onclick="saveJob('${id}',true);shareJob('${id}')">💬 WhatsApp balance</button>
      <button class="btn red" onclick="del('jobs','${id}')">Delete</button>
    </div>`);
}

function saveJob(id, keepOpen) {
  const j = byId('jobs', id);
  j.status = $('#js').value; j.total = num($('#jt').value); j.start = $('#jst').value; j.end = $('#jen').value;
  j.notes = $('#jnotes').value;
  j.workers = [...document.querySelectorAll('.jw:checked')].map(c => c.value);
  save();
  if (!keepOpen) { closeModal(); render(); }
}
function addPayment(id) {
  const amount = num($('#pa').value);
  if (!amount) { alert('Enter amount'); return; }
  saveJob(id, true);
  byId('jobs', id).payments.push({ date: $('#pd').value, amount, mode: $('#pm').value, note: $('#pn').value.trim() });
  save(); editJob(id); render();
}
function delPayment(id, i) {
  if (!confirm('Remove this payment?')) return;
  saveJob(id, true);
  byId('jobs', id).payments.splice(i, 1); save(); editJob(id); render();
}
function shareJob(id) {
  const j = byId('jobs', id), s = db.settings, paid = jobPaid(j);
  const text = `*${s.company}*\nJob J-${j.no} – ${j.client.name}\nTotal: ${money(j.total)}\nReceived: ${money(paid)}\n*Balance: ${money(j.total - paid)}*\n\nThank you!\n📞 ${s.phone}`;
  window.open(waLink(j.client.phone, text), '_blank');
}

// ---------- Workers ----------
function viewWorkers() {
  const activeJobsFor = w => db.jobs.filter(j => j.workers.includes(w.id) && (j.status === 'scheduled' || j.status === 'in progress'));
  return `<h2>Workers <button class="btn sm" onclick="editWorker()">+ New</button></h2>
    ${db.workers.length ? db.workers.map(w => {
      const jobs = activeJobsFor(w);
      return `<div class="card click" onclick="editWorker('${w.id}')">
        <div class="row"><span class="big">${esc(w.name)}</span><span class="mut">${w.wage ? money(w.wage) + '/day' : ''}</span></div>
        <div class="mut">${esc(w.skill)} · 📞 ${esc(w.phone)}</div>
        <div class="mut">${jobs.length ? 'On: ' + jobs.map(j => `J-${j.no} ${esc(j.client.name)}`).join(', ') : 'Free'}</div>
      </div>`;
    }).join('') : '<div class="empty">No workers yet</div>'}`;
}
function editWorker(id) {
  const w = id ? byId('workers', id) : {};
  openModal(`
    <h2>${id ? 'Worker' : 'New Worker'} <button class="btn sec sm" onclick="closeModal()">✕</button></h2>
    <form id="f">
      <label>Name *</label><input name="name" required value="${esc(w.name)}">
      <div class="grid2">
        <div><label>Phone</label><input name="phone" type="tel" value="${esc(w.phone)}"></div>
        <div><label>Daily wage (₹)</label><input name="wage" type="number" value="${esc(w.wage)}"></div>
      </div>
      <label>Skill</label><input name="skill" placeholder="Marble fitter, polisher, helper…" value="${esc(w.skill)}">
      <div class="btns"><button class="btn">Save</button>
        ${id ? `<a class="btn sec" href="tel:${esc(w.phone)}">📞 Call</a><button type="button" class="btn red" onclick="del('workers','${id}')">Delete</button>` : ''}</div>
    </form>`);
  $('#f').onsubmit = e => {
    e.preventDefault();
    const d = formData(e.target);
    if (id) Object.assign(w, d); else db.workers.push({ id: uid(), ...d });
    save(); closeModal(); render();
  };
}

// ---------- Rate card + quick calculator ----------
function viewRates() {
  const cats = [...new Set(db.rates.map(r => r.category))];
  return `<h2>Rate Card <button class="btn sm" onclick="editRate()">+ Add</button></h2>
    <div class="card">
      <b>Quick estimate</b>
      <div class="grid2">
        <div><label>Service</label><select id="cr" onchange="calc()">${rateOptions(db.rates[0]?.id).replace('<option value="">— custom item —</option>', '')}</select></div>
        <div><label>Area (sq.ft)</label><input id="ca" type="number" oninput="calc()"></div>
      </div>
      <div class="total" id="cres">₹0</div>
    </div>
    ${cats.map(c => `<h3>${esc(c)}</h3><div class="card"><table>
      ${db.rates.filter(r => r.category === c).map(r => `<tr class="click" style="cursor:pointer" onclick="editRate('${r.id}')">
        <td>${esc(r.name)}</td><td class="n">${r.rate ? money(r.rate) + ' / ' + esc(r.unit) : '<span class="mut">On request</span>'}</td></tr>`).join('')}
    </table></div>`).join('')}
    <p class="mut">Tap a rate to edit it. Rates apply to new quotes only.</p>`;
}
function calc() {
  const r = db.rates.find(x => x.id === $('#cr').value);
  const a = num($('#ca').value);
  $('#cres').textContent = r ? `${a} ${r.unit} × ₹${r.rate} = ${money(a * r.rate)}` : '';
}
function editRate(id) {
  const r = id ? byId('rates', id) : { unit: 'sq.ft' };
  const cats = [...new Set(db.rates.map(x => x.category))];
  openModal(`
    <h2>${id ? 'Edit Rate' : 'New Rate'} <button class="btn sec sm" onclick="closeModal()">✕</button></h2>
    <form id="f">
      <label>Category *</label><input name="category" list="cats" required value="${esc(r.category)}">
      <datalist id="cats">${cats.map(c => `<option value="${esc(c)}">`).join('')}</datalist>
      <label>Service name *</label><input name="name" required value="${esc(r.name)}">
      <div class="grid2">
        <div><label>Rate (₹)</label><input name="rate" type="number" step="any" value="${esc(r.rate)}"></div>
        <div><label>Unit</label><input name="unit" value="${esc(r.unit)}" placeholder="sq.ft / rft / nos"></div>
      </div>
      <div class="btns"><button class="btn">Save</button>
        ${id ? `<button type="button" class="btn red" onclick="del('rates','${id}')">Delete</button>` : ''}</div>
    </form>`);
  $('#f').onsubmit = e => {
    e.preventDefault();
    const d = formData(e.target); d.rate = num(d.rate);
    if (id) Object.assign(r, d); else db.rates.push({ id: uid(), ...d });
    save(); closeModal(); render();
  };
}

// ---------- Reminders ----------
function viewReminders() {
  const now = today();
  const waFollow = (phone, name) => waLink(phone,
    `Hi ${name}, this is a follow-up from ${db.settings.company} regarding your flooring enquiry. Please let us know if you have any questions.\n\n📞 ${db.settings.phone}`);

  const allItems = [
    ...db.visits
      .filter(v => v.followUp && v.status !== 'cancelled' && v.status !== 'quoted')
      .map(v => ({ type: 'visit', date: v.followUp, id: v.id, label: v.name, phone: v.phone,
        sub: `📍 Site Visit · ${v.status}${v.service ? ' · ' + v.service : ''}` })),
    ...db.quotes
      .filter(q => q.followUp && q.status !== 'accepted' && q.status !== 'rejected')
      .map(q => ({ type: 'quote', date: q.followUp, id: q.id, label: q.client.name, phone: q.client.phone,
        sub: `🧾 Q-${q.no} · ${money(quoteTotal(q))} · ${q.status}` })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const card = x => {
    const isOverdue = x.date < now, isToday = x.date === now;
    const dot = isOverdue ? '🔴' : isToday ? '🟡' : '🟢';
    return `<div class="card">
      <div class="row">
        <span class="big">${dot} ${esc(x.label)}</span>
        <span class="mut">${fmtDate(x.date)}</span>
      </div>
      <div class="mut">${x.sub}</div>
      <div class="btns" style="margin-top:8px">
        <button class="btn sm sec" onclick="${x.type === 'visit' ? `editVisit('${x.id}')` : `editQuote('${x.id}')`}">Open</button>
        ${x.phone ? `<a class="btn sm sec" href="tel:${esc(x.phone)}">📞 Call</a>
          <a class="btn sm sec" target="_blank" href="${waFollow(x.phone, x.label)}">💬 WhatsApp</a>` : ''}
      </div>
    </div>`;
  };

  const overdue  = allItems.filter(x => x.date < now);
  const dueToday = allItems.filter(x => x.date === now);
  const upcoming = allItems.filter(x => x.date > now);

  const section = (title, list) => list.length
    ? `<h3>${title} (${list.length})</h3>${list.map(card).join('')}` : '';

  return `<h2>Reminders</h2>
    ${!allItems.length ? `<div class="empty">No reminders yet.<br><span class="mut">Set a follow-up date on any visit or quote.</span></div>` : ''}
    ${section('🔴 Overdue', overdue)}
    ${section('🟡 Due Today', dueToday)}
    ${section('🟢 Upcoming', upcoming)}`;
}

// ---------- Reports ----------
function viewReports() {
  const now = today();
  const activeJobs = db.jobs.filter(j => j.status !== 'cancelled');
  const totalValue     = activeJobs.reduce((s, j) => s + num(j.total), 0);
  const totalCollected = activeJobs.reduce((s, j) => s + jobPaid(j), 0);
  const pendingBal     = totalValue - totalCollected;
  const convPct = db.quotes.length ? Math.round(db.jobs.length / db.quotes.length * 100) : 0;

  // Last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
    const m = d.toISOString().slice(0, 7);
    const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const qCount  = db.quotes.filter(q => (q.date || '').startsWith(m)).length;
    const jCount  = db.jobs.filter(j => (j.start || '').startsWith(m)).length;
    const collected = db.jobs.flatMap(j => j.payments)
      .filter(p => (p.date || '').startsWith(m)).reduce((s, p) => s + num(p.amount), 0);
    months.push({ label, qCount, jCount, collected });
  }

  // Visit funnel
  const vTotal = db.visits.length || 1;
  const funnel = ['new', 'visited', 'quoted', 'cancelled'].map(s => {
    const n = db.visits.filter(v => v.status === s).length;
    return { s, n, pct: Math.round(n / vTotal * 100) };
  });

  // Top pending balances
  const pending = activeJobs
    .map(j => ({ j, bal: j.total - jobPaid(j) }))
    .filter(x => x.bal > 0)
    .sort((a, b) => b.bal - a.bal)
    .slice(0, 8);

  return `<h2>Reports</h2>
    <div class="stats">
      <div class="stat"><b>${money(totalValue)}</b>Total job value</div>
      <div class="stat"><b>${money(totalCollected)}</b>Collected</div>
      <div class="stat" style="border-color:var(--red)"><b style="color:var(--red)">${money(pendingBal)}</b>Balance due</div>
      <div class="stat"><b>${convPct}%</b>Quote → Job rate</div>
    </div>

    <h3>Monthly Activity (last 6 months)</h3>
    <div style="overflow-x:auto"><table>
      <tr><th>Month</th><th class="n">Quotes</th><th class="n">Jobs</th><th class="n">Collected</th></tr>
      ${months.map(m => `<tr>
        <td>${m.label}</td><td class="n">${m.qCount || '–'}</td>
        <td class="n">${m.jCount || '–'}</td>
        <td class="n">${m.collected ? money(m.collected) : '–'}</td>
      </tr>`).join('')}
    </table></div>

    <h3>Site Visits Funnel</h3>
    <div class="card"><table>
      ${funnel.map(f => `<tr>
        <td style="text-transform:capitalize;width:90px">${f.s}</td>
        <td class="n" style="width:40px"><b>${f.n}</b></td>
        <td><div class="bar-bg"><div class="bar-fill" style="width:${f.pct}%"></div></div></td>
        <td class="n mut" style="width:40px">${f.pct}%</td>
      </tr>`).join('')}
    </table></div>

    <h3>Outstanding Balances</h3>
    ${pending.length ? pending.map(({ j, bal }) => `<div class="card click" onclick="go('jobs');editJob('${j.id}')">
      <div class="row"><span>${esc(j.client.name)} <span class="mut">J-${j.no}</span></span><b style="color:var(--red)">${money(bal)}</b></div>
      <div class="mut">${badge(j.status)} · Total ${money(j.total)} · Paid ${money(jobPaid(j))}</div>
    </div>`).join('') : '<div class="card" style="color:var(--g)">✅ All balances cleared!</div>'}`;
}

// ---------- CRM ----------
function viewCRM() {
  const customers = [...buildCustomerMap().values()].sort((a, b) => a.name.localeCompare(b.name));
  renderList = () => {
    const list = customers.filter(c => !search || JSON.stringify(c).toLowerCase().includes(search.toLowerCase()));
    $('#list').innerHTML = list.length ? list.map(c => {
      const activeJobs = c.jobs.filter(j => j.status !== 'cancelled');
      const totalVal  = activeJobs.reduce((s, j) => s + num(j.total), 0);
      const totalPaid = activeJobs.reduce((s, j) => s + jobPaid(j), 0);
      const bal = totalVal - totalPaid;
      const balTag = bal > 0 ? `<b style="color:var(--red)">${money(bal)} due</b>`
                   : totalVal > 0  ? `<span style="color:var(--g)">✅ Cleared</span>` : '';
      return `<div class="card click" onclick="showCRMStatement('${esc(c.key)}')">
        <div class="row"><span class="big">${esc(c.name)}</span>${balTag}</div>
        <div class="mut">📞 ${esc(c.phone)}${c.address ? ' · ' + esc(c.address.split('\n')[0]) : ''}</div>
        <div class="mut">${c.visits.length} visit · ${c.quotes.length} quote · ${c.jobs.length} job
          ${totalVal ? ' · Value ' + money(totalVal) : ''}</div>
      </div>`;
    }).join('') : '<div class="empty">No customers yet</div>';
  };
  setTimeout(renderList);
  return `<h2>Customers / CRM</h2>${searchBox('Search name, phone, address…')}<div id="list"></div>`;
}

function showCRMStatement(key) {
  const c = buildCustomerMap().get(key);
  if (!c) return;
  const activeJobs  = c.jobs.filter(j => j.status !== 'cancelled');
  const totalVal    = activeJobs.reduce((s, j) => s + num(j.total), 0);
  const totalPaid   = activeJobs.reduce((s, j) => s + jobPaid(j), 0);
  const totalQuoted = c.quotes.reduce((s, q) => s + quoteTotal(q), 0);
  const bal = totalVal - totalPaid;
  const workerName = id => { const w = db.workers.find(x => x.id === id); return w ? w.name : id; };

  // Build unified chronological timeline
  const timeline = [
    ...c.visits.map(v => ({ kind: 'visit',  date: v.date  || '', obj: v })),
    ...c.quotes.map(q => ({ kind: 'quote',  date: q.date  || '', obj: q })),
    ...c.jobs  .map(j => ({ kind: 'job',    date: j.start || '', obj: j })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const renderEntry = ({ kind, date, obj }) => {
    if (kind === 'visit') {
      const v = obj;
      return `<div class="tl-entry">
        <div class="tl-dot tl-visit"></div>
        <div class="tl-card">
          <div class="tl-head">
            <span class="tl-type">📍 Site Visit</span>
            <span class="mut">${fmtDate(v.date)}${v.time ? ' ' + v.time : ''}</span>
            ${badge(v.status)}
            <button class="btn sm sec" onclick="closeModal();editVisit('${v.id}')">Edit</button>
          </div>
          ${v.service ? `<div class="mut">${esc(v.service)}${v.area ? ' · ' + v.area + ' sq.ft' : ''}</div>` : ''}
          ${v.address ? `<div class="mut">📍 ${esc(v.address)}</div>` : ''}
          ${v.notes   ? `<div class="mut" style="margin-top:4px">${esc(v.notes)}</div>` : ''}
          ${v.phone   ? `<div class="tl-actions">
            <a class="btn sm sec" href="tel:${esc(v.phone)}">📞 Call</a>
            <a class="btn sm sec" target="_blank" href="${waLink(v.phone,'Hi, following up on your flooring enquiry.\n\n' + db.settings.company + '\n📞 ' + db.settings.phone)}">💬 WhatsApp</a>
          </div>` : ''}
        </div>
      </div>`;
    }

    if (kind === 'quote') {
      const q = obj;
      const qt = quoteTotal(q);
      return `<div class="tl-entry">
        <div class="tl-dot tl-quote"></div>
        <div class="tl-card">
          <div class="tl-head">
            <span class="tl-type">🧾 Estimate</span>
            <b>Q-${q.no}</b>
            <span class="mut">${fmtDate(q.date)}</span>
            ${badge(q.status)}
            <b>${money(qt)}</b>
            <button class="btn sm sec" onclick="closeModal();editQuote('${q.id}')">Edit</button>
          </div>
          <table style="margin-top:8px;width:100%">
            <tr><th>Description</th><th class="n">Measurement</th><th class="n">Amount</th></tr>
            ${q.items.map(it => `<tr>
              <td>${esc(it.name)}</td>
              <td class="n mut">${esc(it.qty)} × ${esc(it.rate)}</td>
              <td class="n">${money(num(it.qty)*num(it.rate))}</td>
            </tr>`).join('')}
            ${num(q.discount) ? `<tr><td class="mut" colspan="2">Discount</td><td class="n mut">−${money(q.discount)}</td></tr>` : ''}
            <tr class="tl-total"><td colspan="2"><b>Total</b></td><td class="n"><b>${money(qt)}</b></td></tr>
          </table>
          ${q.advance && num(q.advance.amount) ? `<div class="tl-adv">💰 Advance received: <b>${money(q.advance.amount)}</b> · ${esc(q.advance.mode)} · ${fmtDate(q.advance.date)}</div>` : ''}
          ${q.notes ? `<div class="mut" style="margin-top:6px">${esc(q.notes)}</div>` : ''}
        </div>
      </div>`;
    }

    if (kind === 'job') {
      const j = obj;
      const paid = jobPaid(j), jbal = j.total - paid;
      const pct  = j.total ? Math.min(100, Math.round(paid / j.total * 100)) : 0;
      return `<div class="tl-entry">
        <div class="tl-dot tl-job"></div>
        <div class="tl-card">
          <div class="tl-head">
            <span class="tl-type">🛠️ Job / Invoice</span>
            <b>J-${j.no}</b>
            <span class="mut">${fmtDate(j.start)}</span>
            ${badge(j.status)}
            <button class="btn sm sec" onclick="closeModal();go('jobs');editJob('${j.id}')">Edit</button>
          </div>
          <table style="margin-top:8px;width:100%">
            <tr><th>Description</th><th class="n">Measurement</th><th class="n">Amount</th></tr>
            ${j.items.map(it => `<tr>
              <td>${esc(it.name)}</td>
              <td class="n mut">${esc(it.qty)} × ${esc(it.rate)}</td>
              <td class="n">${money(num(it.qty)*num(it.rate))}</td>
            </tr>`).join('')}
            <tr class="tl-total"><td colspan="2"><b>Job Total</b></td><td class="n"><b>${money(j.total)}</b></td></tr>
          </table>
          ${j.workers.length ? `<div class="mut" style="margin-top:6px">👷 ${j.workers.map(workerName).join(', ')}</div>` : ''}
          <table style="margin-top:10px;width:100%">
            <tr><th>Payment Date</th><th>Mode</th><th>Note</th><th class="n">Amount</th></tr>
            ${j.payments.length ? j.payments.map(p => `<tr>
              <td>${fmtDate(p.date)}</td><td>${esc(p.mode)}</td><td>${esc(p.note)}</td>
              <td class="n">${money(p.amount)}</td>
            </tr>`).join('') : `<tr><td colspan="4" class="mut">No payments yet</td></tr>`}
          </table>
          <div style="margin-top:8px">
            <div style="background:#e8f5e9;border-radius:4px;height:8px"><div style="background:var(--g);height:8px;border-radius:4px;width:${pct}%"></div></div>
            <div class="row" style="margin-top:4px">
              <span class="mut">Paid ${money(paid)} of ${money(j.total)}</span>
              <b style="color:${jbal>0?'var(--red)':'var(--g)'}">${jbal>0?'Balance '+money(jbal):'✅ Fully paid'}</b>
            </div>
          </div>
          ${j.notes ? `<div class="mut" style="margin-top:6px">${esc(j.notes)}</div>` : ''}
        </div>
      </div>`;
    }
  };

  openModal(`
    <div class="row" style="margin-bottom:8px">
      <h2 style="margin:0">${esc(c.name)}</h2>
      <div style="display:flex;gap:6px">
        <button class="btn sm sec" onclick="printCRMStatement('${esc(key)}')">🖨️ Print</button>
        <button class="btn sm sec" onclick="closeModal()">✕</button>
      </div>
    </div>
    <div class="mut" style="margin-bottom:12px">📞 ${esc(c.phone)}${c.address ? ' · 📍 ' + esc(c.address.split('\n')[0]) : ''}</div>
    <div class="stats" style="margin-bottom:16px">
      <div class="stat"><b>${money(totalQuoted)}</b>Estimated</div>
      <div class="stat"><b>${money(totalVal)}</b>Job value</div>
      <div class="stat"><b>${money(totalPaid)}</b>Collected</div>
      <div class="stat" style="${bal>0?'border-color:var(--red)':''}">
        <b style="color:${bal>0?'var(--red)':'var(--g)'}">${money(bal)}</b>Balance
      </div>
    </div>
    <div class="timeline">
      ${timeline.length ? timeline.map(renderEntry).join('') : '<div class="empty">No records yet</div>'}
    </div>
  `);
}

function printCRMStatement(key) {
  const c = buildCustomerMap().get(key);
  if (!c) return;
  const s = db.settings;
  const activeJobs = c.jobs.filter(j => j.status !== 'cancelled');
  const totalVal  = activeJobs.reduce((s, j) => s + num(j.total), 0);
  const totalPaid = activeJobs.reduce((s, j) => s + jobPaid(j), 0);
  const bal = totalVal - totalPaid;
  const workerName = id => { const w = db.workers.find(x => x.id === id); return w ? w.name : ''; };

  $('#print').innerHTML = `<div class="doc">
    <div class="hd">
      <div class="logo"><b>X-CITE</b> FLOORING</div>
      <div class="tag">${esc(s.tagline)}</div>
      <div class="ph">${esc(s.phone)}</div>
    </div>
    <div class="title">CUSTOMER STATEMENT</div>
    <table style="margin-bottom:14px;border:none"><tr>
      <td style="border:none"><b>${esc(c.name)}</b><br>${esc(c.phone)}${c.address ? '<br>' + esc(c.address) : ''}</td>
      <td style="border:none;text-align:right">Date: ${fmtDate(today())}</td>
    </tr></table>
    <table style="margin-bottom:12px">
      <tr><th>Total Job Value</th><th class="n">${money(totalVal)}</th></tr>
      <tr><th>Total Collected</th><th class="n">${money(totalPaid)}</th></tr>
      <tr class="totrow"><th>Balance Due</th><th class="n">${money(bal)}</th></tr>
    </table>
    ${c.jobs.map(j => {
      const paid = jobPaid(j), jbal = j.total - paid;
      return `<h3 style="margin:16px 0 6px;font-size:14px">Job J-${j.no} · ${fmtDate(j.start)} · ${j.status}</h3>
      ${j.workers.length ? `<p style="margin:0 0 6px;font-size:12px;color:#555">Workers: ${j.workers.map(workerName).join(', ')}</p>` : ''}
      <table>
        <tr><th>#</th><th>Description</th><th class="n">Measurement</th><th class="n">Amount (₹)</th></tr>
        ${j.items.map((it, i) => `<tr><td>${i+1}</td><td>${esc(it.name)}</td><td class="n">${esc(it.qty)} × ${esc(it.rate)}</td><td class="n">${money(num(it.qty)*num(it.rate))}</td></tr>`).join('')}
        <tr class="totrow"><td colspan="3" class="n">Job Total</td><td class="n">${money(j.total)}</td></tr>
      </table>
      <table style="margin-top:6px">
        <tr><th>Payment Date</th><th>Mode</th><th>Note</th><th class="n">Amount</th></tr>
        ${j.payments.map(p => `<tr><td>${fmtDate(p.date)}</td><td>${esc(p.mode)}</td><td>${esc(p.note)}</td><td class="n">${money(p.amount)}</td></tr>`).join('')}
        <tr class="totrow"><td colspan="3" class="n">Balance</td><td class="n">${money(jbal)}</td></tr>
      </table>`;
    }).join('')}
    <div class="note">${esc(s.terms).replace(/\n/g,'<br>')}</div>
    <div class="sign">For ${esc(s.company)}<br><br><br>Authorised Signatory</div>
  </div>`;
  setTimeout(() => window.print(), 100);
}

// ---------- Settings & backup ----------
function viewSettings() {
  const s = db.settings;
  return `<h2>Settings</h2>
    <form id="sf" class="card" onsubmit="event.preventDefault();saveSettings(this)">
      <label>Company name</label><input name="company" value="${esc(s.company)}">
      <label>Tagline</label><input name="tagline" value="${esc(s.tagline)}">
      <div class="grid2">
        <div><label>Phone</label><input name="phone" value="${esc(s.phone)}"></div>
        <div><label>Advance required (₹)</label><input name="advance" type="number" value="${esc(s.advance)}"></div>
      </div>
      <label>Terms (printed on quotes & invoices)</label><textarea name="terms" rows="4">${esc(s.terms)}</textarea>
      <div class="btns"><button class="btn">Save settings</button></div>
    </form>
    <h3>☁️ Cloud Sync (Supabase)</h3>
    <div class="card">
      <div class="row" style="margin-bottom:10px">
        <span>${syncState === 'ok' ? '✅ Synced' : syncState === 'syncing' ? '🔄 Syncing…' : syncState === 'error' ? '⚠️ Sync failed — working offline' : '⏳ Connecting…'}
          ${lastSyncTime ? `<span class="mut"> · ${lastSyncTime.toLocaleTimeString('en-IN')}</span>` : ''}</span>
        <button class="btn sm sec" onclick="cloudLoad()">🔄 Sync now</button>
      </div>
      <div class="mut" style="font-size:12px">All data auto-syncs to Supabase on every change. Use local backup below as extra safety.</div>
    </div>
    <h3>💾 Local Backup</h3>
    <div class="card">
      <p class="mut">Download a full backup file. Restore it on any device to migrate all data.</p>
      <div class="btns">
        <button class="btn sec" onclick="exportData()">⬇️ Download backup</button>
        <label class="btn sec" style="margin:0;color:var(--g);font-size:14px">⬆️ Restore from file<input type="file" accept=".json" style="display:none" onchange="importData(this.files[0])"></label>
        <button class="btn red" onclick="resetRates()">Reset rate card</button>
      </div>
    </div>`;
}
function saveSettings(f) { Object.assign(db.settings, formData(f)); db.settings.advance = num(db.settings.advance); save(); alert('Saved'); }
function exportData() {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' }));
  a.download = `xcite-backup-${today()}.json`; a.click();
}
function importData(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    try {
      const d = JSON.parse(rd.result);
      if (!d.rates || !d.quotes) throw new Error();
      if (!confirm('Replace all current data with this backup?')) return;
      db = d; save(); render(); alert('Backup restored');
    } catch (e) { alert('Not a valid backup file'); }
  };
  rd.readAsText(file);
}
function resetRates() {
  if (!confirm('Replace the rate card with the original PDF rates?')) return;
  db.rates = DEFAULT_RATES.map(([category, name, rate]) => ({ id: uid(), category, name, rate, unit: name.includes('rft') ? 'rft' : 'sq.ft' }));
  save(); render();
}

// ---------- Printable quote / invoice ----------
function printDoc(type, id) {
  const s = db.settings;
  const isQ = type === 'quote';
  const d = isQ ? byId('quotes', id) : byId('jobs', id);
  const sub = itemsTotal(d.items);
  const total = isQ ? quoteTotal(d) : d.total;
  const paid = isQ ? 0 : jobPaid(d);
  $('#print').innerHTML = `<div class="doc">
    <div class="hd">
      <div class="logo"><b>X-CITE</b> FLOORING</div>
      <div class="tag">${esc(s.tagline)}</div>
      <div class="ph">${esc(s.phone)}</div>
    </div>
    <div class="title">${isQ ? 'QUOTATION / ESTIMATE' : 'INVOICE'}</div>
    <table style="margin-bottom:14px;border:none"><tr>
      <td style="width:60%;border:none"><b>To:</b><br>${esc(d.client.name)}<br>${esc(d.client.phone)}${d.client.address ? '<br>' + esc(d.client.address).replace(/\n/g, '<br>') : ''}</td>
      <td style="border:none;text-align:right"><b>${isQ ? 'Q-' + d.no : 'INV-' + d.no}</b><br>${fmtDate(isQ ? d.date : today())}</td>
    </tr></table>
    <table>
      <tr><th>#</th><th>Description</th><th class="n">Measurement</th><th class="n">Amount (₹)</th></tr>
      ${d.items.map((it, i) => `<tr><td>${i + 1}</td><td>${esc(it.name)}</td>
        <td class="n">${esc(it.qty)} × ${esc(it.rate)}</td>
        <td class="n">${money(num(it.qty) * num(it.rate))}</td></tr>`).join('')}
      <tr><td colspan="3" class="n">Subtotal</td><td class="n">${money(sub)}</td></tr>
      ${num(d.discount) ? `<tr><td colspan="3" class="n">Discount</td><td class="n">-${money(d.discount)}</td></tr>` : ''}
      ${!isQ && total !== sub - num(d.discount) ? `<tr class="totrow"><td colspan="3" class="n">Adjusted Total</td><td class="n">${money(total)}</td></tr>` : ''}
      <tr class="totrow"><td colspan="3" class="n">Total</td><td class="n">${money(total)}</td></tr>
      ${!isQ ? `<tr><td colspan="3" class="n">Received</td><td class="n">${money(paid)}</td></tr>
        <tr class="totrow"><td colspan="3" class="n">Balance Due</td><td class="n">${money(total - paid)}</td></tr>` : ''}
    </table>
    ${d.notes ? `<p>${esc(d.notes).replace(/\n/g, '<br>')}</p>` : ''}
    <div class="note">Note: ${esc(s.terms).replace(/\n/g, '<br>')}</div>
    <div class="sign">For ${esc(s.company)}<br><br><br>Authorised Signatory</div>
  </div>`;
  setTimeout(() => window.print(), 100);
}

// ---------- Start ----------
render();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js');
initSB();
cloudLoad();
