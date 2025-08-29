// Nation Incremental - rebuilt clean implementation
// ASCII only to avoid encoding issues

const SAVE_KEY = 'nation-incremental-save-v3';

// -------------------- Utilities --------------------
const now = () => Date.now();
function format(n, digits = 2){
  if (!isFinite(n)) return '0';
  const neg = n < 0; n = Math.abs(n);
  if (n < 1000) return (neg? '-' : '') + (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : n.toFixed(0));
  const units = ['K','M','B','T','Qa','Qi'];
  let u = -1;
  while (n >= 1000 && u < units.length - 1){ n /= 1000; u++; }
  return (neg? '-' : '') + n.toFixed(digits) + units[u];
}

// -------------------- Data --------------------
const COUNTRIES = [
  { id:'usa', name:'United States', flag:'US', boosts:{ global:1.05, prod:{ tech:1.15, finance:1.10 } } },
  { id:'chn', name:'China', flag:'CN', boosts:{ global:1.00, prod:{ factory:1.20 }, cost:{ factory:0.95 } } },
  { id:'jpn', name:'Japan', flag:'JP', boosts:{ global:1.00, prod:{ tech:1.15, energy:1.05 } } },
  { id:'deu', name:'Germany', flag:'DE', boosts:{ global:1.00, prod:{ factory:1.15 } } },
  { id:'ind', name:'India', flag:'IN', boosts:{ global:1.00, prod:{ farm:1.25, tech:1.05 } } },
  { id:'gbr', name:'United Kingdom', flag:'UK', boosts:{ global:1.05, prod:{ finance:1.15 } } },
  { id:'fra', name:'France', flag:'FR', boosts:{ global:1.00, prod:{ finance:1.10, farm:1.10 } } },
  { id:'ita', name:'Italy', flag:'IT', boosts:{ global:1.00, prod:{ farm:1.10 } } },
  { id:'can', name:'Canada', flag:'CA', boosts:{ global:1.00, prod:{ energy:1.15, farm:1.10 } } },
  { id:'kor', name:'South Korea', flag:'KR', boosts:{ global:1.00, prod:{ tech:1.20, factory:1.05 } } },
];

const INDUSTRIES = [
  { id:'farm',     name:'Agriculture',  desc:'Basic food production',        baseCost: 10,      costMult: 1.15, baseGps: 0.10 },
  { id:'factory',  name:'Manufacturing',desc:'Mass production of goods',     baseCost: 100,     costMult: 1.17, baseGps: 1.00 },
  { id:'tech',     name:'Technology',   desc:'Software and innovation',      baseCost: 1_000,   costMult: 1.18, baseGps: 8.00 },
  { id:'finance',  name:'Finance',      desc:'Capital and markets',          baseCost: 10_000,  costMult: 1.19, baseGps: 50.0 },
  { id:'energy',   name:'Energy',       desc:'Power generation',             baseCost: 50_000,  costMult: 1.20, baseGps: 200. },
  { id:'research', name:'R&D',          desc:'Long-term breakthroughs',      baseCost: 250_000, costMult: 1.21, baseGps: 900. },
];

const ACHIEVEMENTS = [
  { id:'a_country', name:'Nation Chosen',      desc:'Select a country',              test:()=>!!G.countryId },
  { id:'a_first_buy', name:'First Investment',  desc:'Buy your first industry',       test:()=>Object.values(G.industries).some(s=>s.count>0) },
  { id:'a_10_gps', name:'Humming Economy',     desc:'Reach 10 GPS',                  test:()=>totalGps()>=10 },
  { id:'a_1m_gdp', name:'Millionaire Nation',  desc:'Earn 1,000,000 total GDP',      test:()=>G.totalGained>=1_000_000 },
  { id:'a_100_any', name:'Industrialist',      desc:'Own 100 of any industry',       test:()=>Object.values(G.industries).some(s=>s.count>=100) },
];

const PREMIUM_DEFS = [
  { id:'p_global1', name:'Permanent Growth', cost:5, desc:'+10% global production (permanent)' },
  { id:'p_click1', name:'Executive Drive',  cost:3, desc:'+50% click power (permanent)' },
  { id:'p_eventShield', name:'Crisis Management', cost:4, desc:'Negative events softened (min 0.85x)' },
  { id:'p_discount', name:'Industrial Policy', cost:5, desc:'-5% industry costs (permanent)' },
  { id:'p_start1', name:'Sovereign Wealth Fund', cost:2, desc:'Start each run with $50,000' },
];

const EVENT_DEFS = [
  { id:'pandemic', name:'Pandemic', desc:'Public health crisis reduces output temporarily (-25%).', mult:0.75, dur:15 },
  { id:'war', name:'Regional Conflict', desc:'Instability reduces output (-35%).', mult:0.65, dur:12 },
  { id:'tech_boom', name:'Tech Boom', desc:'Innovation surge increases output (+30%).', mult:1.30, dur:12 },
  { id:'resource_boom', name:'Commodity Windfall', desc:'Resource prices spike (+20%).', mult:1.20, dur:10 },
  { id:'financial_crisis', name:'Financial Crisis', desc:'Markets tumble (-30%).', mult:0.70, dur:10 },
];

// -------------------- State --------------------
let G = {
  version: 3,
  gdp: 0,
  totalGained: 0,
  countryId: null,
  lastTick: now(),
  clickBase: 1,
  industries: {}, // id -> {count, mult}
  upgradesBought: {},
  achievements: {},
  // prestige
  prestigePoints: 0,
  premiumBought: {},
  // time
  currentYear: 1970,
  endGame: false,
  // events
  activeEvent: null,
  nextEventAt: null,
  // debug
  debug: false,
};
for (const ind of INDUSTRIES) G.industries[ind.id] = {count:0, mult:1};

// -------------------- DOM --------------------
const el = {
  gdp: document.getElementById('gdp'),
  gps: document.getElementById('gps'),
  clickPower: document.getElementById('clickPower'),
  countryName: document.getElementById('countryName'),
  countryFlag: document.getElementById('countryFlag'),
  yearStat: document.getElementById('yearStat'),
  prestigeStat: document.getElementById('prestigeStat'),
  industries: document.getElementById('industries'),
  upgrades: document.getElementById('upgrades'),
  achievements: document.getElementById('achievements'),
  prestigePoints: document.getElementById('prestigePoints'),
  prestigeMult: document.getElementById('prestigeMult'),
  prestigeGain: document.getElementById('prestigeGain'),
  prestigeBtn: document.getElementById('prestigeBtn'),
  prestigeShop: document.getElementById('prestigeShop'),
  saveBtn: document.getElementById('saveBtn'),
  exportBtn: document.getElementById('exportBtn'),
  importBtn: document.getElementById('importBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),
  saveNote: document.getElementById('saveNote'),
  countryModal: document.getElementById('countryModal'),
  countryGrid: document.getElementById('countryGrid'),
  eventBanner: document.getElementById('eventBanner'),
  eventTitle: document.getElementById('eventTitle'),
  eventDesc: document.getElementById('eventDesc'),
  eventTimer: document.getElementById('eventTimer'),
  eventClose: document.getElementById('eventClose'),
  eventPrestigeNow: document.getElementById('eventPrestigeNow'),
  debugToggle: document.getElementById('debugToggle'),
  debugTools: document.getElementById('debugTools'),
  dbgAddMoney: document.getElementById('dbgAddMoney'),
  dbgAdvanceYear: document.getElementById('dbgAdvanceYear'),
  dbgTriggerEvent: document.getElementById('dbgTriggerEvent'),
  dbgUnlockUpgrades: document.getElementById('dbgUnlockUpgrades'),
  dbgFast10s: document.getElementById('dbgFast10s'),
  debugInfo: document.getElementById('debugInfo'),
};

// -------------------- Core calcs --------------------
function getCountry(){ return COUNTRIES.find(c=>c.id===G.countryId)||null; }
function countryProdMult(id){
  const c = getCountry();
  let m = 1;
  if (c && c.boosts && c.boosts.prod && c.boosts.prod[id]) m *= c.boosts.prod[id];
  if (c && c.boosts && c.boosts.global) m *= c.boosts.global;
  return m;
}
function countryCostMult(id){
  const c = getCountry();
  if (c && c.boosts && c.boosts.cost && c.boosts.cost[id]) return c.boosts.cost[id];
  return 1;
}
function industryGps(id){
  const ind = INDUSTRIES.find(i=>i.id===id); const st = G.industries[id];
  if (!ind || !st) return 0;
  return ind.baseGps * st.count * st.mult * countryProdMult(id);
}
function prestigeMult(){ return 1 + (G.prestigePoints||0) * 0.05; }
function totalGps(){
  let sum = 0;
  for (const ind of INDUSTRIES) sum += industryGps(ind.id);
  // Achievements: +1% per achievement
  let ach = 0; for (const v of Object.values(G.achievements)) if (v) ach++;
  sum *= 1 + ach * 0.01;
  // Event multiplier
  if (G.activeEvent && typeof G.activeEvent.mult === 'number'){
    let m = G.activeEvent.mult;
    if (m < 1 && G.premiumBought.p_eventShield) m = Math.max(m, 0.85);
    sum *= m;
  }
  // Premium global
  if (G.premiumBought.p_global1) sum *= 1.10;
  // Prestige
  sum *= prestigeMult();
  if (!isFinite(sum) || isNaN(sum)) sum = 0;
  return sum;
}
function clickPower(){
  let v = Math.max(1, G.clickBase) + totalGps() * 0.01;
  if (G.premiumBought.p_click1) v *= 1.5;
  if (!isFinite(v) || isNaN(v)) v = 1;
  return v;
}
function nextCost(id){
  const ind = INDUSTRIES.find(i=>i.id===id); const st = G.industries[id];
  let cost = ind.baseCost * Math.pow(ind.costMult, st.count);
  cost *= countryCostMult(id);
  if (G.premiumBought.p_discount) cost *= 0.95;
  return Math.ceil(cost);
}

// -------------------- Upgrades --------------------
const UPGRADE_DEFS = [];
for (const ind of INDUSTRIES){
  for (const milestone of [10,25,50,100]){
    UPGRADE_DEFS.push({
      id:`u_${ind.id}_${milestone}`,
      name:`${ind.name} x2 @ ${milestone}`,
      desc:`Double ${ind.name} output once you own ${milestone}.`,
      cost: Math.floor(ind.baseCost * Math.pow(ind.costMult, milestone) * 5),
      visible: ()=> G.industries[ind.id].count >= milestone * 0.7,
      canBuy: ()=> G.industries[ind.id].count >= milestone,
      buy: ()=> { G.industries[ind.id].mult *= 2; }
    });
  }
}
UPGRADE_DEFS.push(
  { id:'u_global_1', name:'Economic Reforms', desc:'All production +10%', cost:50_000, visible:()=>G.totalGained>=10_000, canBuy:()=>true, buy:()=>{ for (const ind of INDUSTRIES) G.industries[ind.id].mult *= 1.10; } },
  { id:'u_click_1', name:'Digitalization Drive', desc:'Click power +100%', cost:30_000, visible:()=>G.totalGained>=5_000, canBuy:()=>true, buy:()=>{ G.clickBase *= 2; } },
  { id:'u_global_2', name:'Free Trade Network', desc:'All production +20%', cost:1_000_000, visible:()=>G.totalGained>=250_000, canBuy:()=>true, buy:()=>{ for (const ind of INDUSTRIES) G.industries[ind.id].mult *= 1.20; } }
);

// -------------------- Rendering --------------------
for (const btn of document.querySelectorAll('.tab')){
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    btn.classList.add('active'); document.getElementById(`view-${btn.dataset.tab}`).classList.add('active');
  });
}

function renderCountries(){
  el.countryGrid.innerHTML = '';
  for (const c of COUNTRIES){
    const boosts = [];
    if (c.boosts.global && c.boosts.global !== 1) boosts.push(`Global x${c.boosts.global.toFixed(2)}`);
    if (c.boosts.prod) for (const [k,v] of Object.entries(c.boosts.prod)) boosts.push(`${(INDUSTRIES.find(i=>i.id===k)||{name:k}).name} x${v.toFixed(2)}`);
    if (c.boosts.cost) for (const [k,v] of Object.entries(c.boosts.cost)) boosts.push(`${(INDUSTRIES.find(i=>i.id===k)||{name:k}).name} cost x${v.toFixed(2)}`);
    const btn = document.createElement('button');
    btn.className = 'card country';
    btn.innerHTML = `<div class="title">[${c.flag}] ${c.name}</div><div class="muted">${boosts.join(' | ')||'Balanced economy'}</div>`;
    btn.addEventListener('click', ()=>{ chooseCountry(c.id); });
    el.countryGrid.appendChild(btn);
  }
}
function chooseCountry(id){
  G.countryId = id; el.countryModal.style.display = 'none'; updateHeader(); checkAchievements(); saveGame();
}

function renderIndustries(){
  el.industries.innerHTML = '';
  for (const ind of INDUSTRIES){
    const st = G.industries[ind.id]; const cost = nextCost(ind.id);
    const row = document.createElement('div'); row.className = 'card industry';
    row.innerHTML = `
      <div class="meta">
        <div class="name">${ind.name}</div>
        <div class="desc">${ind.desc}</div>
        <div class="small">Owned: <strong>${st.count}</strong> | Output each: <strong>$${format(ind.baseGps * st.mult * countryProdMult(ind.id))}</strong>/s</div>
      </div>
      <div class="actions">
        <div class="price">$${format(cost)}</div>
        <button class="btn buy" data-id="${ind.id}">Buy</button>
      </div>`;
    el.industries.appendChild(row);
  }
  el.industries.querySelectorAll('button.buy').forEach(b=> b.addEventListener('click', ()=> buyIndustry(b.dataset.id)));
}
function buyIndustry(id){
  const cost = nextCost(id); if (G.gdp < cost) return; G.gdp -= cost; G.industries[id].count++; renderIndustries(); renderUpgrades(); checkAchievements(); updateHeader(); saveSoon();
}

function renderUpgrades(){
  el.upgrades.innerHTML = '';
  for (const u of UPGRADE_DEFS){
    if (G.upgradesBought[u.id]) continue; if (!u.visible()) continue;
    const card = document.createElement('div'); card.className='upgrade';
    card.innerHTML = `<div><div><strong>${u.name}</strong></div><div class="small">${u.desc}</div></div><div><div class="price">$${format(u.cost)}</div><button class="btn" data-id="${u.id}">Buy</button></div>`;
    const btn = card.querySelector('button');
    btn.addEventListener('click', ()=>{ if (G.gdp < u.cost || !u.canBuy()) return; G.gdp -= u.cost; u.buy(); G.upgradesBought[u.id]=true; renderIndustries(); renderUpgrades(); updateHeader(); saveSoon(); });
    if (G.gdp < u.cost || !u.canBuy()) btn.disabled = true;
    el.upgrades.appendChild(card);
  }
}

function renderAchievements(){
  el.achievements.innerHTML = '';
  for (const a of ACHIEVEMENTS){
    const unlocked = !!G.achievements[a.id];
    const row = document.createElement('div'); row.className='achievement';
    row.innerHTML = `<div><div><strong>${a.name}</strong></div><div class="small">${a.desc} ${unlocked? '- Bonus: +1% global' : ''}</div></div><div>${unlocked? '[✓]':'[ ]'}</div>`;
    el.achievements.appendChild(row);
  }
}
function checkAchievements(){
  let changed = false; for (const a of ACHIEVEMENTS){ if (!G.achievements[a.id] && a.test()) { G.achievements[a.id]=true; changed=true; } }
  if (changed) renderAchievements();
}

function renderPrestigeShop(){
  el.prestigeShop.innerHTML = '';
  for (const p of PREMIUM_DEFS){
    const owned = !!G.premiumBought[p.id];
    const card = document.createElement('div'); card.className='upgrade';
    card.innerHTML = `<div><div><strong>${p.name}</strong> ${owned?'[Owned]':''}</div><div class="small">${p.desc}</div></div><div><div class="price">${owned? 'Owned' : (p.cost+' influence')}</div>${owned?'':`<button class="btn" data-id="${p.id}">Buy</button>`}</div>`;
    if (!owned){
      const btn = card.querySelector('button'); btn.disabled = G.prestigePoints < p.cost;
      btn.addEventListener('click', ()=>{ if (G.prestigePoints < p.cost) return; G.prestigePoints -= p.cost; G.premiumBought[p.id]=true; flash('Purchased: '+p.name); renderPrestigeShop(); updateHeader(); saveSoon(); });
    }
    el.prestigeShop.appendChild(card);
  }
}

function updateHeader(){
  el.gdp.textContent = '$' + format(G.gdp, 2);
  const gps = totalGps();
  el.gps.textContent = '$' + format(gps, 2) + '/s';
  el.clickPower.textContent = format(clickPower(), 2);
  const c = getCountry();
  el.countryName.textContent = c? c.name : 'No Country';
  el.countryFlag.textContent = c? '['+c.flag+']' : '[ ]';
  el.yearStat.textContent = Math.floor(G.currentYear)+'';
  el.prestigeStat.textContent = 'x' + prestigeMult().toFixed(2);
  el.prestigePoints.textContent = (G.prestigePoints|0)+'';
  el.prestigeMult.textContent = 'x' + prestigeMult().toFixed(2);
  el.prestigeGain.textContent = prestigeGain()+'';
  // Affordability
  el.industries.querySelectorAll('.industry').forEach((row,i)=>{
    const id = INDUSTRIES[i].id; const btn = row.querySelector('button.buy'); if (btn) btn.disabled = G.gdp < nextCost(id);
  });
  el.upgrades.querySelectorAll('.upgrade').forEach(card=>{
    const id = card.querySelector('button')?.dataset.id; if (!id) return; const def = UPGRADE_DEFS.find(u=>u.id===id); const btn = card.querySelector('button'); if (btn) btn.disabled = (G.gdp < def.cost || !def.canBuy());
  });
}

// -------------------- Settings & Save --------------------
function flash(msg){ el.saveNote.textContent = msg; setTimeout(()=>{ if (el.saveNote.textContent === msg) el.saveNote.textContent=''; }, 3000); }
let saveTimer=null; function saveSoon(){ clearTimeout(saveTimer); saveTimer = setTimeout(saveGame, 800); }
function saveGame(){ G.lastTick = now(); localStorage.setItem(SAVE_KEY, JSON.stringify(G)); }
function loadGame(){
  try{
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false;
    const data = JSON.parse(raw); mergeLoad(data); return true;
  }catch{return false}
}
function mergeLoad(data){
  G.gdp = data.gdp||0; G.totalGained=data.totalGained||0; G.countryId=data.countryId||null; G.lastTick=data.lastTick||now();
  G.clickBase=data.clickBase||1; G.upgradesBought=data.upgradesBought||{}; G.achievements=data.achievements||{};
  G.prestigePoints=data.prestigePoints||0; G.premiumBought=data.premiumBought||{};
  G.currentYear=data.currentYear||1970; G.endGame=!!data.endGame; G.activeEvent=data.activeEvent||null; G.nextEventAt=data.nextEventAt||null; G.debug=!!data.debug;
  for (const ind of INDUSTRIES){ const v = (data.industries&&data.industries[ind.id])||{count:0,mult:1}; G.industries[ind.id]={count: v.count|0, mult: Number(v.mult)||1}; }
  // offline progress
  const dt = Math.max(0, now() - (G.lastTick||now())); const sec = dt/1000;
  const gps = totalGps(); G.gdp += gps * sec; G.totalGained += gps * sec;
  // offline time advance
  const yearsAdd = YEARS_PER_SECOND * sec; G.currentYear += yearsAdd; if (G.currentYear >= 2020){ G.currentYear = 2020; G.endGame=true; onEndGame(); }
}

el.saveBtn.addEventListener('click', ()=>{ saveGame(); flash('Game saved.'); });
el.exportBtn.addEventListener('click', async ()=>{
  try{
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(G))));
    let copied=false;
    if (navigator.clipboard && window.isSecureContext){ await navigator.clipboard.writeText(data); copied=true; flash('Save copied to clipboard.'); }
    if (!copied){ el.importInput.value = data; el.importInput.focus(); el.importInput.select(); document.execCommand && document.execCommand('copy'); flash('Save in input (copied if allowed).');
      const blob = new Blob([data], {type:'text/plain'}); const a = document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='nation-incremental-save.txt'; document.body.appendChild(a); a.click(); a.remove(); }
  }catch{ flash('Export failed.'); }
});
el.importBtn.addEventListener('click', ()=>{
  try{ const txt = el.importInput.value.trim(); if (!txt) return; const data = JSON.parse(decodeURIComponent(escape(atob(txt)))); mergeLoad(data); renderAll(); flash('Save imported.'); saveSoon(); }catch{ flash('Import failed.'); }
});
// Develop click (manual income)
document.getElementById('developBtn').addEventListener('click', ()=>{
  const gain = clickPower();
  G.gdp += gain; G.totalGained += gain; updateHeader(); saveSoon();
});
el.resetBtn.addEventListener('click', ()=>{
  if (!confirm('Hard reset your progress? This clears ALL progress.')) return;
  if (!confirm('Are you absolutely sure? This cannot be undone.')) return;
  hardReset();
});
function hardReset(){
  localStorage.removeItem(SAVE_KEY);
  G = { version:3, gdp:0, totalGained:0, countryId:null, lastTick:now(), clickBase:1, industries:{}, upgradesBought:{}, achievements:{}, prestigePoints:0, premiumBought:{}, currentYear:1970, endGame:false, activeEvent:null, nextEventAt:null, debug:false };
  for (const ind of INDUSTRIES) G.industries[ind.id] = {count:0, mult:1};
  renderAll(); el.countryModal.style.display='flex'; flash('Progress wiped. Choose a new country.');
}

// -------------------- Prestige --------------------
function prestigeGain(){ return Math.max(0, Math.floor(Math.sqrt((G.totalGained||0)/1_000_000))); }
el.prestigeBtn.addEventListener('click', ()=>{
  const gain = prestigeGain(); if (gain<=0) return flash('Earn more GDP to prestige.');
  if (!confirm(`Prestige for ${gain} influence? This resets your economy.`)) return;
  doPrestige(gain);
});
function doPrestige(gain){
  G.prestigePoints = (G.prestigePoints||0) + (gain||0);
  // reset economy but keep country and achievements
  for (const ind of INDUSTRIES) G.industries[ind.id] = {count:0, mult:1};
  G.gdp=0; G.totalGained=0; G.clickBase=1; G.upgradesBought={}; G.endGame=false; G.currentYear=1970; G.activeEvent=null; G.nextEventAt=null;
  if (G.premiumBought.p_start1) G.gdp += 50_000;
  flash(`Prestiged. New multiplier: x${prestigeMult().toFixed(2)}`);
  renderAll(); saveSoon();
}

// -------------------- Time & Events --------------------
const YEARS_PER_SECOND = 0.5; // 0.5 in-game years per real second
function advanceTime(dt){ if (G.endGame) return; G.currentYear += YEARS_PER_SECOND * dt; if (G.currentYear >= 2020){ G.currentYear=2020; G.endGame=true; onEndGame(); } }
function onEndGame(){ const gain = prestigeGain(); showEventBanner('Run Complete', `The year is 2020. You generated $${format(G.totalGained)} total GDP. You can prestige for ${gain} influence and play again.`, 0, true); }

function scheduleNextEvent(){ const min=20000, max=40000; G.nextEventAt = now() + (min + Math.random()*(max-min)); }
function handleEvents(){
  if (!G.nextEventAt) scheduleNextEvent();
  if (G.activeEvent && now() >= G.activeEvent.endTime){ G.activeEvent=null; hideEventBanner(); scheduleNextEvent(); }
  if (!G.activeEvent && !G.endGame && now() >= G.nextEventAt){ const def = EVENT_DEFS[Math.floor(Math.random()*EVENT_DEFS.length)]; triggerEvent(def); }
  if (G.activeEvent){ const sec = Math.max(0, Math.ceil((G.activeEvent.endTime - now())/1000)); el.eventTimer.textContent = String(sec); }
}
function triggerEvent(def){ G.activeEvent = { id:def.id, name:def.name, desc:def.desc, mult:def.mult, endTime: now()+def.dur*1000 }; showEventBanner(def.name, def.desc, def.dur); }
function showEventBanner(title, desc, seconds=10, sticky=false){ el.eventTitle.textContent=title; el.eventDesc.textContent=desc; el.eventBanner.style.display='flex'; el.eventTimer.textContent = sticky? '-' : String(seconds); el.eventPrestigeNow.style.display = sticky? 'inline-block':'none'; }
function hideEventBanner(){ el.eventBanner.style.display='none'; }
el.eventClose.addEventListener('click', hideEventBanner);
el.eventPrestigeNow.addEventListener('click', ()=>{ if (!G.endGame) return; const gain = prestigeGain(); if (gain<=0){ hideEventBanner(); return; } doPrestige(gain); hideEventBanner(); });

// -------------------- Debug --------------------
el.debugToggle.addEventListener('change', ()=>{ G.debug = el.debugToggle.checked; el.debugTools.style.display = G.debug? 'flex':'none'; el.debugInfo.style.display = G.debug? 'block':'none'; saveSoon(); renderDebugInfo(); });
el.dbgAddMoney.addEventListener('click', ()=>{ if(!G.debug) return; G.gdp += 1_000_000; G.totalGained += 1_000_000; updateHeader(); });
el.dbgAdvanceYear.addEventListener('click', ()=>{ if(!G.debug) return; G.currentYear = Math.min(2020, G.currentYear+1); updateHeader(); });
el.dbgTriggerEvent.addEventListener('click', ()=>{ if(!G.debug) return; triggerEvent(EVENT_DEFS[Math.floor(Math.random()*EVENT_DEFS.length)]); });
el.dbgUnlockUpgrades.addEventListener('click', ()=>{ if(!G.debug) return; for (const u of UPGRADE_DEFS){ if (!G.upgradesBought[u.id]){ u.buy(); G.upgradesBought[u.id]=true; } } renderUpgrades(); updateHeader(); });
el.dbgFast10s.addEventListener('click', ()=>{ if(!G.debug) return; const s=10; const gps = totalGps(); G.gdp += gps*s; G.totalGained += gps*s; updateHeader(); });
function renderDebugInfo(){ if (!G.debug) return; const lines=[]; lines.push('GPS: '+format(totalGps(),2)+'/s'); for (const ind of INDUSTRIES){ const st=G.industries[ind.id]; const each = ind.baseGps*st.mult*countryProdMult(ind.id); lines.push(`${ind.name}: ${st.count} x ${format(each)} = ${format(each*st.count)}`); } el.debugInfo.textContent = lines.join('\n'); }

// -------------------- Loop & Boot --------------------
function loop(){
  const t = now(); const dt = Math.min(1, (t - G.lastTick)/1000); G.lastTick = t;
  if (!G.endGame){ const gain = totalGps() * dt; G.gdp += gain; G.totalGained += gain; }
  advanceTime(dt); handleEvents(); updateHeader(); renderDebugInfo();
}

function renderAll(){ renderCountries(); renderIndustries(); renderUpgrades(); renderAchievements(); renderPrestigeShop(); updateHeader(); }

document.getElementById('year').textContent = new Date().getFullYear()+'';
renderCountries();
const hadSave = loadGame(); if (!hadSave) el.countryModal.style.display='flex';
renderAll();
setInterval(loop, 100);
setInterval(saveGame, 10000);
