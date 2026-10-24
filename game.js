// ==========================================
// WELTRAUM GAME – Rohstoffabbau
// ==========================================
const solarSystem = document.querySelector('#solar-system');
const infoPanel = document.querySelector('#info-panel');
const topResources = document.querySelector('#top-resources');
const saveMenu = document.querySelector('#save-menu');
const saveStatus = document.querySelector('#save-status');
const SAVE_KEY = 'solarFrontierOriginsSave_v2';
const LEGACY_SAVE_KEY = 'weltraumGameSave_v1';
const BACKUP_SAVE_KEY = 'solarFrontierOriginsSave_backup_v2';

// Zweites Sonnensystem: Noxaris liegt auf der äußersten Umlaufbahn.
const futureSolarSystem = {
  id: 'system2', name: 'Sonnensystem 2',
  bodies: [{ id: 'noxaris', name: 'Noxaris', type: 'Mystischer Planet', className: 'noxaris', orbit: 1420, temperature: 'Unbekannt', resources: {}, storage: {} }]
};
let activeSolarSystemId = 'system1';

// ==========================================
// AUDIO
// ==========================================
const AUDIO_SETTINGS_KEY = 'solarFrontierAudio_v1';
const musicTracks = ['Ruskerdax - Pondering the Cosmos.mp3', 'humanstudioed-cyberpunk-techno-510219.mp3'];
let currentMusicTrack = 0;
const backgroundMusic = new Audio(musicTracks[currentMusicTrack]);
backgroundMusic.loop = false;
backgroundMusic.preload = 'auto';
backgroundMusic.addEventListener('ended', () => {
  currentMusicTrack = (currentMusicTrack + 1) % musicTracks.length;
  backgroundMusic.src = musicTracks[currentMusicTrack];
  if (audioSettings.musicEnabled && audioUnlocked) backgroundMusic.play().catch(()=>{});
});
let audioSettings = (() => {
  try { return Object.assign({ musicEnabled: true, musicVolume: 0.35, soundsEnabled: true }, JSON.parse(localStorage.getItem(AUDIO_SETTINGS_KEY) || '{}')); }
  catch { return { musicEnabled: true, musicVolume: 0.35, soundsEnabled: true }; }
})();
backgroundMusic.volume = Math.max(0, Math.min(1, Number(audioSettings.musicVolume) || 0));
let audioUnlocked = false;
let soundContext = null;

function unlockAudio(){
  audioUnlocked = true;
  if (audioSettings.musicEnabled) backgroundMusic.play().catch(()=>{});
}
function saveAudioSettings(){ localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(audioSettings)); }
function playUiSound(type='click'){
  if (!audioSettings.soundsEnabled || !audioUnlocked) return;
  try {
    soundContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (soundContext.state === 'suspended') soundContext.resume();
    const o = soundContext.createOscillator();
    const g = soundContext.createGain();
    const now = soundContext.currentTime;
    const cfg = type === 'research' ? {a:660,b:990,d:.18} : type === 'build' ? {a:440,b:660,d:.14} : {a:520,b:700,d:.08};
    o.type = 'sine'; o.frequency.setValueAtTime(cfg.a, now); o.frequency.exponentialRampToValueAtTime(cfg.b, now + cfg.d);
    g.gain.setValueAtTime(.0001, now); g.gain.exponentialRampToValueAtTime(.08, now + .015); g.gain.exponentialRampToValueAtTime(.0001, now + cfg.d);
    o.connect(g); g.connect(soundContext.destination); o.start(now); o.stop(now + cfg.d + .02);
  } catch {}
}
function setupAudio(){
  const toggle=document.querySelector('#music-toggle'), volume=document.querySelector('#music-volume'), value=document.querySelector('#music-volume-value'), soundToggle=document.querySelector('#sound-toggle');
  if(!toggle || !volume || !value || !soundToggle) return;
  volume.value=Math.round((Number(audioSettings.musicVolume)||0)*100); value.textContent=`${volume.value} %`;
  const refresh=()=>{ toggle.textContent=audioSettings.musicEnabled?'Ein':'Aus'; toggle.classList.toggle('off',!audioSettings.musicEnabled); soundToggle.textContent=audioSettings.soundsEnabled?'Ein':'Aus'; soundToggle.classList.toggle('off',!audioSettings.soundsEnabled); };
  refresh();
  toggle.addEventListener('click',()=>{ unlockAudio(); audioSettings.musicEnabled=!audioSettings.musicEnabled; if(audioSettings.musicEnabled) backgroundMusic.play().catch(()=>{}); else backgroundMusic.pause(); saveAudioSettings(); refresh(); });
  volume.addEventListener('input',()=>{ audioSettings.musicVolume=Number(volume.value)/100; backgroundMusic.volume=audioSettings.musicVolume; value.textContent=`${volume.value} %`; saveAudioSettings(); });
  soundToggle.addEventListener('click',()=>{ unlockAudio(); audioSettings.soundsEnabled=!audioSettings.soundsEnabled; saveAudioSettings(); refresh(); if(audioSettings.soundsEnabled) playUiSound('click'); });
}


// ==========================================
// ZENTRALE SPIELUHR – Galaktischer Standardkalender
// Start: 01.01.2027, 00:00:00; Spielzeit wird durch die gewählte Geschwindigkeit skaliert.
// ==========================================
const GAME_EPOCH_UTC = Date.UTC(2027, 0, 1, 0, 0, 0);
const GAME_SPEEDS = [1, 2, 3, 5, 10];
let gameClockElapsedMs = 0;
let gameClockLastReal = performance.now();
let gameSpeed = 1;
function gameNow() {
  const realNow = performance.now();
  const realDelta = Math.max(0, realNow - gameClockLastReal);
  // Mobile-Browser pausieren die Spielwelt im Hintergrund, statt beim Zurückkehren
  // einen großen Zeitsprung und einen unkontrollierten Verbrauchsschub auszulösen.
  if (typeof document !== 'undefined' && !document.hidden) {
    gameClockElapsedMs += realDelta * gameSpeed;
  }
  gameClockLastReal = realNow;
  return gameClockElapsedMs;
}
function setGameSpeed(value) {
  const now = gameNow();
  const next = Number(value);
  if (!GAME_SPEEDS.includes(next)) return;
  gameSpeed = next;
  gameClockLastReal = performance.now();
  updateGameClockDisplay(now);
  saveGame(false);
}
function updateGameClockDisplay(now = gameNow()) {
  const clock = document.querySelector('#game-clock-value');
  const speedLabel = document.querySelector('#game-clock-speed-label');
  if (clock) {
    const date = new Date(GAME_EPOCH_UTC + Math.max(0, now));
    const pad = n => String(n).padStart(2, '0');
    clock.textContent = `${pad(date.getUTCDate())}.${pad(date.getUTCMonth()+1)}.${date.getUTCFullYear()} · ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
  }
  if (speedLabel) speedLabel.textContent = `x${gameSpeed}`;
  document.querySelectorAll('[data-game-speed]').forEach(button => {
    const active = Number(button.dataset.gameSpeed) === gameSpeed;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}
function setupGameClockControls() {
  document.querySelectorAll('[data-game-speed]').forEach(button => {
    button.addEventListener('click', () => setGameSpeed(button.dataset.gameSpeed));
  });
  updateGameClockDisplay();
}


const MARKET_START_BUDGET = 10000000;
const MARKET_RESTOCK_INTERVAL_MS = 3 * 60 * 60 * 1000;
const MARKET_RESOURCES = {
 stone:{base:2,capacity:100000,initial:100000,unit:'t'}, ice:{base:8,capacity:30000,initial:20000,unit:'t'},
 coal:{base:5,capacity:60000,initial:60000,unit:'t'}, gas:{base:7,capacity:60000,initial:50000,unit:'t'},
 co2:{base:3,capacity:50000,initial:50000,unit:'t'}, carbon:{base:20,capacity:15000,initial:10000,unit:'t'},
 oxygen:{base:15,capacity:20000,initial:20000,unit:'t'}, crudeOil:{base:18,capacity:30000,initial:25000,unit:'L'},
 polymers:{base:40,capacity:15000,initial:12000,unit:'t'}, rubber:{base:55,capacity:12000,initial:8000,unit:'t'}, plastics:{base:65,capacity:10000,initial:6000,unit:'t'}, wood:{base:8,capacity:100000,initial:50000,unit:'t'}, biomass:{base:7,capacity:12000,initial:9000,unit:'t'}, iron:{base:10,capacity:100000,initial:100000,unit:'t'},
 steel:{base:25,capacity:50000,initial:40000,unit:'t'}, silicon:{base:12,capacity:50000,initial:45000,unit:'t'},
 lithium:{base:45,capacity:20000,initial:15000,unit:'t'}, copperOre:{base:12,capacity:30000,initial:30000,unit:'t'},
 copper:{base:24,capacity:20000,initial:15000,unit:'t'}, batteries:{base:70,capacity:12000,initial:8000,unit:'t'},
 buildingMaterials:{base:8,capacity:60000,initial:60000,unit:'t'}, machines:{base:90,capacity:10000,initial:6000,unit:'t'},
 glass:{base:20,capacity:20000,initial:16000,unit:'t'}, electronics:{base:100,capacity:10000,initial:6000,unit:'t'},
 hydrogen:{base:12,capacity:20000,initial:16000,unit:'t'}, helium:{base:30,capacity:10000,initial:7000,unit:'t'},
 helium3:{base:250,capacity:5000,initial:2500,unit:'t'}, uranium:{base:100,capacity:5000,initial:2500,unit:'t'},
 processedUranium:{base:180,capacity:3000,initial:1500,unit:'t'}, nuclearFuel:{base:350,capacity:1500,initial:700,unit:'t'},
 bauxite:{base:5,capacity:30000,initial:30000,unit:'t'}, aluminiumOxide:{base:16,capacity:12000,initial:9000,unit:'t'},
 aluminium:{base:35,capacity:12000,initial:9000,unit:'t'}, water:{base:2,capacity:100000,initial:100000,unit:'L'},
 grain:{base:6,capacity:20000,initial:15000,unit:'t'}, vegetables:{base:8,capacity:20000,initial:15000,unit:'t'},
 food:{base:20,capacity:20000,initial:15000,unit:'t'}, algaeBiomass:{base:7,capacity:12000,initial:9000,unit:'t'},
 chips:{base:180,capacity:6000,initial:3000,unit:'t'},
 titanOre:{base:50,capacity:10000,initial:5000,unit:'t'}, processedTitan:{base:100,capacity:6000,initial:3000,unit:'t'},
  titanium:{base:180,capacity:4000,initial:2000,unit:'t'},
  vehicles:{base:2500,capacity:5000,initial:1000,unit:'t'},
  cocoaBeans:{base:80,capacity:10000,initial:5000,unit:'t'}, chocolate:{base:160,capacity:5000,initial:2000,unit:'t'},
  luxuryFurniture:{base:300,capacity:4000,initial:1000,unit:'t'},
  liquidFuel:{base:4,capacity:100000,initial:50000,unit:'L'},
  nickelOre:{base:35,capacity:5000,initial:5000,unit:'t'}, graphite:{base:45,capacity:10000,initial:5000,unit:'t'}
};
let market = {budget:MARKET_START_BUDGET,lastRestockSlot:0,lastPriceUpdateMs:0,
 resources:Object.fromEntries(Object.entries(MARKET_RESOURCES).map(([k,c])=>[k,{stock:c.initial,soldStock:0,price:c.base,demand:0,supply:0}]))};
function ensureMarketHistory(){
 if(!market.priceHistory||typeof market.priceHistory!=='object') market.priceHistory={};
 if(!Array.isArray(market.tradeHistory)) market.tradeHistory=[];
 for(const k of Object.keys(MARKET_RESOURCES)){
  if(!Array.isArray(market.priceHistory[k])) market.priceHistory[k]=[];
  if(!market.resources[k]) market.resources[k]={stock:MARKET_RESOURCES[k].initial,soldStock:0,price:MARKET_RESOURCES[k].base,demand:0,supply:0};
  const item=market.resources[k];
  if(item && !item.priceDirection) item.priceDirection='flat';
 }
 return market;
}
function recordMarketPriceHistory(now=gameNow()){
 ensureMarketHistory();
 const cutoff=now-24*60*60*1000;
 for(const k of Object.keys(MARKET_RESOURCES)){
  const item=market.resources[k]; if(!item) continue;
  const arr=market.priceHistory[k];
  const last=arr[arr.length-1];
  // Preisprotokoll höchstens alle 10 Spielminuten aktualisieren.
  if(!last || now-last.time>=10*60*1000 || last.price!==Number(item.price)) arr.push({time:now,price:Number(item.price)||MARKET_RESOURCES[k].base});
  market.priceHistory[k]=arr.filter(x=>Number(x.time)>=cutoff).slice(-145);
 }
}
function recordMarketTrade(side,k,amount,unitPrice,total){
 ensureMarketHistory();
 market.tradeHistory.unshift({side,resource:k,name:resourceNames[k]||k,amount:Number(amount)||0,unitPrice:Number(unitPrice)||0,total:Number(total)||0,time:gameNow()});
 market.tradeHistory=market.tradeHistory.slice(0,100);
}
function marketMoney(v){return `${Number(v||0).toLocaleString('de-DE',{maximumFractionDigits:2})} GünniDolla`;}
function marketAmount(k,v){return `${Number(v||0).toLocaleString('de-DE',{maximumFractionDigits:2})} ${MARKET_RESOURCES[k]?.unit||'t'}`;}
function marketPrice(k,side='buy'){const c=MARKET_RESOURCES[k],i=market.resources[k];return Math.max(c.base*.25,Math.min(c.base*4,Number(i.price||c.base)))*(side==='buy'?1.05:.95);}
function updateMarket(now=gameNow()){
 // Entfernt einen eventuell noch gespeicherten Betonbestand aus älteren Spielständen.
 if (market.resources) delete market.resources.concrete;
 const slot=Math.floor(Math.max(0,now)/(3*60*60*1000));
 if(slot>Number(market.lastRestockSlot||0)){
  Object.entries(MARKET_RESOURCES).forEach(([k,c])=>{if(!market.resources[k]) market.resources[k]={stock:c.initial,soldStock:0,price:c.base,demand:0,supply:0}; const i=market.resources[k];i.stock=c.capacity;i.soldStock=0;i.demand*=.5;i.supply*=.5;});
  market.lastRestockSlot=slot; saveGame(false);
 }
 // Jeder Rohstoff erhält bei jeder Preisrunde eine eigene Marktbewegung.
 // Angebot und Nachfrage geben eine Tendenz vor; unabhängige Zufallsschwankungen
 // verhindern, dass alle Preise gleichzeitig steigen oder fallen.
 const ps=Math.floor(Math.max(0,now)/(10*60*1000));
 if(ps>Number(market.lastPriceUpdateMs||0)){
  Object.entries(MARKET_RESOURCES).forEach(([k,c])=>{
   const i=market.resources[k];
   const ratio=Math.max(0,Math.min(1,Number(i.stock||0)/c.capacity));
   const target=Math.max(c.base*.25,Math.min(c.base*4,
    c.base*(1.65-ratio*1.3+Math.min(.5,Number(i.demand||0)*.01)-Math.min(.5,Number(i.supply||0)*.01))));
   const current=Math.max(c.base*.25,Math.min(c.base*4,Number(i.price||c.base)));
   const marketPressure=Math.max(-.06,Math.min(.06,(target-current)/Math.max(c.base,current)*.35));
   // Meist 2–8 % Zufallsschwankung; gelegentlich sind 10–20 % möglich.
   const randomMove=Math.random()<.12
    ? (Math.random()<.5?-1:1)*(.10+Math.random()*.10)
    : (Math.random()*2-1)*(.02+Math.random()*.06);
   const change=Math.max(-.20,Math.min(.20,marketPressure+randomMove));
   i.previousPrice=current;
   i.price=Math.max(c.base*.25,Math.min(c.base*4,current*(1+change)));
   i.priceDirection=i.price>current?'up':i.price<current?'down':'flat';
   i.demand=Math.max(0,Number(i.demand||0)*.8);
   i.supply=Math.max(0,Number(i.supply||0)*.8);
  });
  market.lastPriceUpdateMs=ps;
  recordMarketPriceHistory(now);
 } else { recordMarketPriceHistory(now); }
}
function marketNotice(msg,good=true){const e=document.querySelector('#market-status');if(e){e.textContent=msg;e.className='market-status '+(good?'good':'warn');}}
function showMarketToast(message){
 let toast=document.querySelector('#market-toast');
 if(!toast){
  toast=document.createElement('div');
  toast.id='market-toast';
  toast.className='market-toast';
  toast.setAttribute('role','status');
  toast.setAttribute('aria-live','polite');
  document.body.appendChild(toast);
 }
 toast.className='market-toast';
 toast.textContent=message;
 toast.hidden=false;
 clearTimeout(showMarketToast.timer);
 showMarketToast.timer=setTimeout(()=>{toast.classList.add('market-toast-hide');setTimeout(()=>{toast.hidden=true;toast.classList.remove('market-toast-hide');},250);},3200);
}
function ensureCompanyFinance() {
  if (!state.companyFinance || typeof state.companyFinance !== 'object') {
    state.companyFinance = { incomeTotal: 0, expenseTotal: 0, recurringIncomeTotal: 0, recurringExpenseTotal: 0, history: [], periods: { days: {}, months: {}, years: {} } };
  }
  const finance = state.companyFinance;
  finance.incomeTotal = Math.max(0, Number(finance.incomeTotal) || 0);
  finance.expenseTotal = Math.max(0, Number(finance.expenseTotal) || 0);
  finance.recurringIncomeTotal = Math.max(0, Number(finance.recurringIncomeTotal) || 0);
  finance.recurringExpenseTotal = Math.max(0, Number(finance.recurringExpenseTotal) || 0);
  if (!Array.isArray(finance.history)) finance.history = [];
  if (!finance.periods || typeof finance.periods !== 'object') finance.periods = {};
  for (const periodType of ['days', 'months', 'years']) {
    if (!finance.periods[periodType] || typeof finance.periods[periodType] !== 'object') finance.periods[periodType] = {};
  }
  return finance;
}
function getCompanyFinancePeriodKeys() {
  const date = new Date(GAME_EPOCH_UTC + Math.max(0, gameNow()));
  const year = String(date.getUTCFullYear());
  const month = `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  const day = `${month}-${String(date.getUTCDate()).padStart(2, '0')}`;
  return { year, month, day, date: `${day} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}` };
}
function addCompanyFinancePeriodValue(period, type, amount) {
  if (!period || !Number.isFinite(amount) || amount <= 0) return;
  if (!Number.isFinite(Number(period.income))) period.income = 0;
  if (!Number.isFinite(Number(period.expense))) period.expense = 0;
  if (type === 'income') period.income += amount;
  else period.expense += amount;
}
function recordCompanyFinance(type, amount, description, addHistory = true) {
  const value = Math.max(0, Number(amount) || 0);
  if (!value) return;
  const finance = ensureCompanyFinance();
  if (type === 'income') finance.incomeTotal += value;
  else finance.expenseTotal += value;
  const label = String(description || (type === 'income' ? 'Einnahme' : 'Ausgabe')).slice(0, 100);
  if (label === 'Kolonisten-Einnahmen' || label.startsWith('Dividende:')) finance.recurringIncomeTotal += value;
  if (label === 'Habitat-Unterhalt') finance.recurringExpenseTotal += value;
  const periodKeys = getCompanyFinancePeriodKeys();
  for (const [periodType, key] of [['days', periodKeys.day], ['months', periodKeys.month], ['years', periodKeys.year]]) {
    const period = finance.periods[periodType][key] ||= { income: 0, expense: 0 };
    addCompanyFinancePeriodValue(period, type, value);
  }
  if (addHistory) {
    finance.history.unshift({
      type,
      amount: value,
      description: label,
      date: new Date().toISOString(),
      gameDate: periodKeys.date,
      gameDay: periodKeys.day,
      gameMonth: periodKeys.month,
      gameYear: periodKeys.year
    });
    finance.history = finance.history.slice(0, 30);
  } else if (type === 'income' && label === 'Kolonisten-Einnahmen') {
    // Laufende Einnahmen werden gesammelt statt pro Spieltick protokolliert.
    let entry = finance.history.find(item => item.type === 'income' && item.description === label);
    if (!entry) {
      entry = { type: 'income', amount: 0, description: label, date: new Date().toISOString() };
      finance.history.unshift(entry);
    }
    entry.amount = Math.max(0, Number(entry.amount) || 0) + value;
    entry.date = new Date().toISOString();
    entry.gameDate = periodKeys.date;
    entry.gameDay = periodKeys.day;
    entry.gameMonth = periodKeys.month;
    entry.gameYear = periodKeys.year;
    finance.history = finance.history.slice(0, 30);
  }
}
function marketTrade(side,k,amount){
 const c=MARKET_RESOURCES[k],i=market.resources[k],qty=Number(amount);
 if(!c||!i||!Number.isFinite(qty)||qty<=0)return marketNotice('Bitte eine gültige Menge eingeben.',false);
  if(k==='nickelOre' && !state.research?.completed?.nickelMining) return marketNotice('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.',false);
 const mode=state.viewMode==='orbit'?'orbit':'surface'; const storage=getLocationStorage(state.selected,mode),p=marketPrice(k,side); let successMessage=''; const fuelKey=liquidTankLocationKey(state.selected,mode); const isFuel=k==='liquidFuel'; const fuelAvailable=isFuel?liquidFuelAmount(state.selected,mode):Number(storage[k]||0); const fuelFree=isFuel?Math.max(0,liquidTankCapacity(state.selected,mode)-fuelAvailable):Infinity;
 if(side==='buy'){
  // Einkauf ist durch den verfügbaren Marktbestand und das Spielerguthaben begrenzt.
  const n=Math.min(qty,Math.max(0,Number(i.stock)||0),Math.floor((Number(state.gunniDollar||0)/p)*100)/100,isFuel?fuelFree:Infinity);
  if(n<=0)return marketNotice(isFuel&&fuelFree<=0?'Das Flüssiglager ist voll oder es wurde noch kein Tank gebaut.':Number(i.stock||0)<=0?'Der Marktbestand ist ausverkauft.':'Nicht genügend GünniDolla.',false);
  const cost=n*p;recordMarketTrade('buy',k,n,p,cost);i.stock=Math.max(0,Number(i.stock||0)-n);market.budget+=cost;state.gunniDollar=Math.max(0,Number(state.gunniDollar||0)-cost);recordCompanyFinance('expense',cost,`Markteinkauf: ${resourceNames[k]||k} (${marketAmount(k,n)})`); if(isFuel) ensureLiquidTankData(state.selected).liquidFuel[mode]=fuelAvailable+n; else storage[k]=Number(storage[k]||0)+n;i.demand+=n/Math.max(1,c.capacity*.01);
  successMessage=`✅ Kauf erfolgreich! ${marketAmount(k,n)} für ${marketMoney(cost)}.`; marketNotice(successMessage);
 }else{
  // Der Markt nimmt beliebige Mengen an. Das imaginäre Lager zählt ausschließlich verkaufte Waren.
  const avail=fuelAvailable,n=Math.min(qty,avail);
  if(n<=0)return marketNotice('Nicht genug Vorrat im ausgewählten Lager.',false);
  const revenue=n*p;recordMarketTrade('sell',k,n,p,revenue); if(isFuel) ensureLiquidTankData(state.selected).liquidFuel[mode]=avail-n; else storage[k]=avail-n;i.soldStock=Number(i.soldStock||0)+n;market.budget=Math.max(0,Number(market.budget||0)-revenue);state.gunniDollar=Number(state.gunniDollar||0)+revenue;recordCompanyFinance('income',revenue,`Marktverkauf: ${resourceNames[k]||k} (${marketAmount(k,n)})`);i.supply+=n/Math.max(1,c.capacity*.01);
  successMessage=`✅ Verkauf erfolgreich! ${marketAmount(k,n)} für ${marketMoney(revenue)}.`; marketNotice(successMessage);
 }
 renderMarket();renderTopResources();renderSystem();renderInfo();saveGame(false);showMarketToast(successMessage);
}
function renderMarket(){
 const panel=document.querySelector('#market-content');if(!panel)return;updateMarket(gameNow());ensureMarketHistory();
 const keys=Object.keys(MARKET_RESOURCES),selected=document.querySelector('#market-resource-select')?.value;
 keys.forEach(k=>{if(!market.resources[k]){const c=MARKET_RESOURCES[k];market.resources[k]={stock:c.initial,soldStock:0,price:c.base,demand:0,supply:0};}});
 const opts=keys.map(k=>`<option value="${k}" ${k===selected?'selected':''}>${resourceIcons[k]||'📦'} ${resourceNames[k]||k}</option>`).join('');
 const rows=keys.map(k=>{const c=MARKET_RESOURCES[k],i=market.resources[k],direction=i.priceDirection||'flat',trend=direction==='up'?'↑ Preis steigt':direction==='down'?'↓ Preis fällt':'↔ Preis stabil';
 return `<div class="market-row market-trend-${direction}"><span>${resourceIcons[k]||'📦'} ${resourceNames[k]||k}</span><strong>${marketMoney(i.price)}/${c.unit}</strong><span>Kaufbestand: ${marketAmount(k,i.stock)} / ${marketAmount(k,c.capacity)}</span><small>${trend} · Grundpreis: ${marketMoney(c.base)}/${c.unit} · Von dir verkauft: ${marketAmount(k,i.soldStock||0)}</small></div>`;}).join('');
 const history=market.tradeHistory.slice(0,30).map(t=>`<div class="market-history-row ${t.side==='buy'?'market-history-buy':'market-history-sell'}"><span>${t.side==='buy'?'🛒 Kauf':'💸 Verkauf'} · ${t.name||resourceNames[t.resource]||t.resource}</span><strong>${marketAmount(t.resource,t.amount)}</strong><small>${marketMoney(t.unitPrice)}/${MARKET_RESOURCES[t.resource]?.unit||'t'} · Gesamt ${marketMoney(t.total)} · ${new Date(GAME_EPOCH_UTC+Number(t.time||0)).toISOString().slice(0,16).replace('T',' ')}</small></div>`).join('')||'<p class="hint">Noch keine Handelsgeschäfte aufgezeichnet.</p>';
 const changes=keys.map(k=>{const arr=market.priceHistory[k]||[],old=arr[0]?.price??market.resources[k].price,now=Number(market.resources[k].price)||MARKET_RESOURCES[k].base;return {k,delta:old?((now-old)/old*100):0};}).sort((a,b)=>b.delta-a.delta);
 const winners=changes.slice(0,5),losers=[...changes].sort((a,b)=>a.delta-b.delta).slice(0,5);
 const rank=items=>items.map(x=>`<div class="market-opportunity-row market-trend-${x.delta>0?'up':x.delta<0?'down':'flat'}"><span>${resourceIcons[x.k]||'📦'} ${resourceNames[x.k]||x.k}</span><strong>${x.delta>0?'+':''}${x.delta.toFixed(1)}%</strong></div>`).join('');
 const chosen=selected||keys[0],pricePoints=(market.priceHistory[chosen]||[]).filter(p=>p.time>=gameNow()-24*60*60*1000);
 const values=pricePoints.map(p=>p.price); if(!values.length)values.push(Number(market.resources[chosen]?.price||MARKET_RESOURCES[chosen].base));
 const min=Math.min(...values),max=Math.max(...values),range=Math.max(.01,max-min);
 const poly=values.map((v,i)=>`${values.length<2?50:i/(values.length-1)*280+10},${85-(v-min)/range*65}`).join(' ');
 const chart=`<svg class="market-price-chart" viewBox="0 0 300 100" role="img" aria-label="Preisverlauf der letzten 24 Spielstunden"><line x1="10" y1="85" x2="290" y2="85"/><polyline points="${poly}"/><text x="10" y="12">${marketMoney(max)}</text><text x="10" y="98">${marketMoney(min)}</text></svg>`;
 panel.innerHTML=`<div class="market-summary"><div><span>💰 Dein Guthaben</span><strong>${marketMoney(state.gunniDollar)}</strong></div><div><span>🏦 Marktbudget</span><strong>${marketMoney(market.budget)}</strong></div><div><span>🪐 Handelsort</span><strong>${bodies[state.selected]?.name||state.selected} · ${state.viewMode==='orbit'?'Orbitlager':'Oberflächenlager'}</strong></div></div>
 <div class="market-trade-box"><label for="market-resource-select">Rohstoff</label><select id="market-resource-select">${opts}</select><label for="market-amount">Menge</label><input id="market-amount" type="number" min=".01" step=".01" value="10"><div id="market-price-preview" class="market-price-preview"></div>
 <div class="market-actions"><button id="market-buy" type="button">🛒 Kaufen</button><button id="market-sell" type="button">💸 Verkaufen</button></div><p id="market-status" class="market-status" aria-live="polite">Käufe kommen ins gewählte Lager. Das imaginäre Marktlager zählt nur verkaufte Waren.</p></div>
 <h3>📈 Preisverlauf · letzte 24 Spielstunden</h3><div class="market-chart-card"><strong id="market-chart-title">${resourceNames[chosen]||chosen}</strong>${chart}<small>Der Verlauf wird im eigenen Spielstand gespeichert. Frühere Daten beginnen ab dem Einbau dieser Funktion.</small></div>
 <h3>🏆 Marktchancen · Gewinner</h3><div class="market-opportunities">${rank(winners)}</div><h3>📉 Verlierer</h3><div class="market-opportunities">${rank(losers)}</div>
 <h3>🧾 Handelsgeschichte · letzte 30 Geschäfte</h3><div class="market-history">${history}</div><h3>📦 Marktpreise und Lagerbestände</h3><div class="market-list">${rows}</div>`;
 const preview=()=>{const k=document.querySelector('#market-resource-select').value,a=Math.max(0,Number(document.querySelector('#market-amount').value)||0),c=MARKET_RESOURCES[k];
 document.querySelector('#market-price-preview').innerHTML=`Kauf: <strong>${marketMoney(marketPrice(k,'buy')*a)}</strong> (${marketMoney(marketPrice(k,'buy'))}/${c.unit}) · Verkauf: <strong>${marketMoney(marketPrice(k,'sell')*a)}</strong> (${marketMoney(marketPrice(k,'sell'))}/${c.unit})`;
 document.querySelector('label[for="market-amount"]').textContent=`Menge (${c.unit})`;};
 document.querySelector('#market-resource-select').addEventListener('change',()=>{preview();renderMarket();});
 document.querySelector('#market-amount').addEventListener('input',preview);
 document.querySelector('#market-buy').addEventListener('click',()=>marketTrade('buy',document.querySelector('#market-resource-select').value,document.querySelector('#market-amount').value));
 document.querySelector('#market-sell').addEventListener('click',()=>marketTrade('sell',document.querySelector('#market-resource-select').value,document.querySelector('#market-amount').value));preview();
}

const state = {
  selected: 'earth',
  viewMode: 'surface',
  // Spielerbestand: Nur hier landen Rohstoffe, die tatsächlich abgebaut wurden.
  stone: 0,
  ice: 0,
  coal: 0,
  gas: 0,
  co2: 1000000,
  earthCo2StockV1Added: true,
  carbon: 0,
  oxygen: 0,
  crudeOil: 0,
  polymers: 0,
  rubber: 0,
  plastics: 0,
  wood: 0,
  biomass: 0,
  vehicles: 0,
  electronics: 0,
  iron: 0,
  steel: 0,
  batteries: 0,
  glass: 0,
  buildingMaterials: 0,
  uranium: 0,
  processedUranium: 0,
  nuclearFuel: 0,
  chips: 0,
  bauxite: 0,
  aluminiumOxide: 0,
  aluminium: 0,
  water: 0,
  grain: 0,
  vegetables: 0,
  food: 0,
  algaeBiomass: 0,
  cocoaBeans: 0,
  chocolate: 0,
  luxuryFurniture: 0,
  batteryStorageData: {}, // Ladestand und Hybridsteuerung je Planet
  // GünniDollar bleibt bis zur späteren Einführung der Kolonisten bei 0.
  gunniDollar: 0,
  companyName: '',
  companyOrders: { reputation: 0, offers: [], active: [], completed: [], failed: [], lastCycleSlot: null, nextId: 1, unlockedLevel: 1 },
  buildings: {
    companyHeadquarters: 0,
    gasCarbonStorage: 0,
    gasCarbonStorageOrbit: 0,
    steelworks: 0,
    stoneQuarry: 0,
    buildingMaterialsFactory: 0,
    coalMine: 0,
    gasPlant: 0,
    co2ProcessingPlant: 0,
    orbitalCo2Extractor: 0,
    researchSatellite: 0,
    ironMine: 0,
    nickelMine: 0,
    graphiteMine: 0,
    syntheticGraphitePlant: 0,
    lithiumMine: 0,
    copperMine: 0,
    copperSmelter: 0,
    lithiumRefinery: 0,
    machineFactory: 0,
    glassFactory: 0,
    heliumExtractor: 0,
    fusionReactor: 0,
    outpost: 0,
    rocketFactory: 0,
    landingPad: 0,
    coalPowerPlant: 0,
    researchLab: 0,
    observatory: 0,
    moonBase: 0,
    crudeOilPump: 0,
    refinery: 0,
    polymerFactory: 0,
    rubberFactory: 0,
    plasticFactory: 0,
    vehicleFactory: 0,
    electronicsFactory: 0,
    uraniumMine: 0,
    ioniumMine: 0,
    uraniumProcessingPlant: 0,
    nuclearFuelPlant: 0,
    nuclearReactor: 0,
    radioactiveStorageSurface: 0,
    radioactiveStorageOrbit: 0,
    chipFactory: 0,
    solarSail: 0,
    warmingSail: 0,
    solarSatellite: 0,
    solarProbe: 0,
    bauxiteMine: 0,
    aluminiumOxideRefinery: 0,
    aluminiumSmelter: 0,
    hydroelectricPlant: 0,
    greenhouse: 0,
    foodFactory: 0,
    iceProcessingPlant: 0,
    iceMine: 0,
    algaeFarm: 0,
    algaeFoodProcessor: 0,
    residentialHouse: 0,
    mediumResidentialHouse: 0,
    residentialComplex: 0,
    habitat: 0,
    cocoaPlantation: 0,
    chocolateFactory: 0,
    luxuryFurnitureFactory: 0,
    woodcutter: 0,
    forester: 0,
    atmosphereRegulator: 0
  },
  lastUpdate: gameNow(),
  buildMenuOpen: false,
  research: {
    points: 0,
    active: null,
    completed: {},
    orders: { active: null, completed: {}, asteroidObservationStarted: null, discoveredAsteroids: [] }
  },
  tasks: {
    completed: {},
    ironMined: 0,
    stoneMined: 0,
    steelProduced: 0,
    companyOrdersCompleted: 0,
    companyNameChosen: false
  }
};

const buildingTypes = {
  companyHeadquarters: { name: 'Unternehmenszentrale', icon: '🏢', resource: null, rate: 0, cost: 2000, text: 'Zentrales Firmengebäude · nur auf der Erde an der Oberfläche · Freischaltung nach „Gründe deine eigene Firma“ · Baukosten: 2.000 t Stahl, 1.000 t Baustoffe und 250 t Glas' },
  steelworks: { name: 'Stahlwerk', icon: '🏭', resource: null, rate: 0.2, cost: 0, text: 'Produziert 0,2 t Stahl/s und verbraucht 0,2 t Eisen/s · Baukosten abhängig von der Anzahl vorhandener Stahlwerke' },
  gasCarbonStorage: { name: 'Gas- und Kohlenstofflager', icon: '🛢️', resource: null, rate: 0, cost: 200, text: '100.000 t Kapazität je Rohstoff und Lagergebäude für Sauerstoff, CO₂, Wasserstoff und Gas · Oberfläche und Orbit · CO₂ kann nur in diesem Lager gespeichert werden · kein Stromverbrauch · keine Forschung · unbegrenzt baubar' },
  atmosphereRegulator: { name: 'Atmosphären-Regulator', icon: '🌐', resource: null, rate: 0, cost: 200, text: 'Gibt automatisch bis zu 0,2 t CO₂ pro Ingame-Sekunde aus dem lokalen Oberflächenlager in die Atmosphäre ab · gibt bei geringerem Lagerbestand nur die verfügbare Menge frei · pausiert bei leerem Lager und setzt automatisch fort, sobald CO₂ verfügbar ist · ohne Forschung · auf allen Planetenoberflächen außer der Sonne baubar · Bauzeit 10 Ingame-Sekunden · Baukosten: 200 t Stahl und 200 t Baustoffe' },
  woodcutter: { name: 'Sägewerk', icon: '🪵', resource: null, rate: 0, cost: 0, text: 'Verbraucht 1 MW Strom und 0,01 t Bäume/s · produziert 0,009 t Biomasse/s und 0,009 t Bretter/s · ohne Forschung · auf allen Planetenoberflächen baubar' },
  nickelMining: { name: 'Grabung nach Nickelerz', icon: '⛏️', category: 'Tiefengrabung', cost: 200, time: 2 * 60 * 60, text: 'Schaltet Nickelerz global frei: Abbau auf allen Planeten und nickelhaltigen Asteroiden sowie Handel und Transport werden erst nach Abschluss dieser Forschung ermöglicht.' },
  forester: { name: 'Förster', icon: '🌳', resource: null, rate: 0, cost: 0, text: 'Erhöht die Regeneration der Bäume auf der Erde um 0,5 % je gebautem, mit Strom versorgtem Förster · benötigt 2 MW · Bauzeit 2 Ingame-Minuten · Baukosten: 290 t Stahl, 100 t Polymere, 150 t Chips, 100 t Glas · nur auf Planeten unter 50 °C · unbegrenzt baubar' },
  residentialHouse: { name: 'Wohnhaus', icon: '🏠', resource: null, rate: 0, cost: 1900, text: '100 Wohnplätze · 1.900 t Stahl · 900 t Baustoffe · auf geeigneten Planetenoberflächen außer der Sonne baubar; Kolonisten benötigen mindestens 1,05 bar und 18–25 % Sauerstoff' },
  mediumResidentialHouse: { name: 'Mittleres Wohnhaus', icon: '🏘️', resource: null, rate: 0, cost: 180, text: '150 Wohnplätze · 180 t Stahl · 250 t Baustoffe · 40 t Glas · auf geeigneten Planetenoberflächen außer der Sonne baubar; Kolonisten benötigen mindestens 1,05 bar und 18–25 % Sauerstoff' },
  residentialComplex: { name: 'Wohnkomplex', icon: '🏢', resource: null, rate: 0, cost: 600, text: '500 Wohnplätze · 600 t Stahl · 800 t Baustoffe · 150 t Glas · auf geeigneten Planetenoberflächen außer der Sonne baubar; Kolonisten benötigen mindestens 1,05 bar und 18–25 % Sauerstoff' },
  habitat: { name: 'Habitat', icon: '🛖', resource: null, rate: 0, cost: 200, text: '150 Wohnplätze · 200 t Stahl · 250 t Baustoffe · auf allen Himmelskörpern außer Erde und Sonne' },
  stoneQuarry: { name: 'Steinbruch', icon: '🪨', resource: 'stone', rate: 0.1, cost: 30, text: 'Kein Verbrauch · produziert 0,1 t Stein/s pro Gebäude' },
  buildingMaterialsFactory: { name: 'Baustofffabrik', icon: '🧱', resource: null, rate: 0, cost: 40, text: 'verbraucht 0,20 t Stein/s · produziert 0,15 t Baustoffe/s' },
  coalMine: { name: 'Kohlemine', icon: '⛏️', resource: 'coal', rate: 0.5, cost: 15, text: '0,5 t Kohle/s' },
  gasPlant: { name: 'Gasförderanlage', icon: '🔥', resource: 'gas', rate: 0.25, cost: 25, text: '0,25 t Gas/s' },
  co2Extraction: { name: 'CO₂-Extraktionsanlage', icon: '🌫️', resource: 'co2', rate: 0.25, cost: 25, text: 'extrahiert 0,25 t CO₂/s aus der Atmosphäre · nur auf Venus' },
  co2ProcessingPlant: { name: 'CO₂-Verarbeitung', icon: '⚗️', resource: null, rate: 0, cost: 50, text: 'verarbeitet 0,2 t CO₂/s → 0,1 t Kohlenstoff + 0,1 t Sauerstoff · auf allen Planeten außer der Sonne' },
  orbitalCo2Extractor: { name: 'CO₂-Orbit-Extraktor', icon: '🛰️', resource: null, rate: 0, cost: 0, text: 'Fördert 0,2 t CO₂/s · kein Stromverbrauch · lagert CO₂ im jeweiligen Orbit-Lager ein · nur im Orbit' },
  researchSatellite: { name: 'Forschungssatellit', icon: '🛰️', resource: null, rate: 0, cost: 800, text: 'Erzeugt 1 Forschungspunkt/s · kein Stromverbrauch · maximal 1 Forschungssatellit pro Orbit · Baukosten: 800 t Stahl, 120 t Elektronik, 80 t Chips, 100 t Glas' },
  ironMine: { name: 'Eisenmine', icon: '🧲', resource: 'iron', rate: 0.1, cost: 20, text: '0,1 t Eisen/s' },
  nickelMine: { name: 'Nickelmine', icon: '🪨', resource: 'nickelOre', rate: 0.1, cost: 30, text: '0,1 t Nickelerz/s · benötigt 1 MW Strom · Baukosten: 30 t Stahl · nur auf Planetenoberflächen mit Nickelerzvorkommen und nach Abschluss der Forschung „Grabung nach Nickelerz“' },
  graphiteMine: { name: 'Graphitmine', icon: '⚫', resource: 'graphite', rate: 0.05, cost: 0, text: '0,05 t Graphit/s · benötigt 5 MW Strom · Baukosten: 800 t Stahl, 1.100 t Baustoffe und 100 t Glas · keine Forschung · nur auf Erde, Luna, Mars und Io mit Graphitvorkommen' },
  batteryStorage: { name: 'Batteriespeicher I', icon: '🔋', resource: null, rate: 0, cost: 0, text: '100 MWh Speicherkapazität je Gebäude · 10 MW maximale Lade- und Entladeleistung je Gebäude · Mindestreserve 30 % · Hybridbetrieb mit automatischen Regeln und manueller Steuerung · keine Forschung · unbegrenzt baubar' },
  syntheticGraphitePlant: { name: 'Synthetische Graphitproduktion', icon: '⚗️', resource: null, rate: 0.05, cost: 0, text: 'Produziert 0,05 t Graphit/s · verbraucht 0,7 L Rohöl/s und benötigt 10 MW Strom · Baukosten: 1.400 t Stahl, 1.600 t Baustoffe, 200 t Glas und 159 t Graphit · kein lokales Rohölvorkommen erforderlich; Rohöl kann per Rakete angeliefert werden · keine Forschung' },
  titanMine: { name: 'Titanmine', icon: '⛏️', resource: 'titanOre', rate: 0.2, cost: 150, text: '0,2 t Titanerz/s · 150 t Stahl, 50 t Maschinen, 30 t Elektronik · auf allen Planetenoberflächen baubar; fördert lokales Titanerzvorkommen' },
  titanProcessing: { name: 'Titanaufbereitung', icon: '⚗️', resource: null, rate: 0, cost: 250, text: 'verbraucht 0,2 t Titanerz/s · produziert 0,1 t aufbereitetes Titan/s · 250 t Stahl, 100 t Maschinen, 50 t Elektronik' },
  titanRefinery: { name: 'Titanraffinerie', icon: '🏭', resource: null, rate: 0, cost: 400, text: 'verbraucht 0,1 t aufbereitetes Titan/s · produziert 0,05 t Titan/s · 400 t Stahl, 150 t Maschinen, 100 t Elektronik' },
  bauxiteMine: { name: 'Bauxitmine', icon: '⛏️', resource: 'bauxite', rate: 0.5, cost: 40, text: '0,5 t Bauxit/s · kein Verbrauch · nur Erde, Luna und Mars' },
  aluminiumOxideRefinery: { name: 'Aluminiumoxidraffinerie', icon: '⚗️', resource: null, rate: 0, cost: 100, text: 'verbraucht 0,5 t Bauxit/s · produziert 0,25 t Aluminiumoxid/s' },
  aluminiumSmelter: { name: 'Aluminiumhütte', icon: '🏭', resource: null, rate: 0, cost: 200, text: 'verbraucht 0,25 t Aluminiumoxid/s · produziert 0,125 t Aluminium/s' },
  siliconMine: { name: 'Siliziummine', icon: '🔷', resource: 'silicon', rate: 0.3, cost: 30, text: '0,3 t Silizium/s' },
  lithiumMine: { name: 'Lithiummine', icon: '🔋', resource: 'lithium', rate: 0.05, cost: 30, text: '0,05 t Lithium/s pro Gebäude' },
  copperMine: { name: 'Kupfermine', icon: '🟠', resource: 'copperOre', rate: 0.05, cost: 30, text: '0,05 t Kupfererz/s pro Gebäude' },
  copperSmelter: { name: 'Kupferschmelze', icon: '🔥', resource: null, rate: 0, cost: 50, text: 'verbraucht 0,10 t Kupfererz/s · produziert 0,08 t Kupfer/s' },
  lithiumRefinery: { name: 'Lithiumraffinerie', icon: '🔋', resource: null, rate: 0, cost: 80, text: 'verbraucht 0,3 t Lithium/s + 0,3 t Kupfer/s · produziert 0,1 t Batterien/s' },
  machineFactory: { name: 'Maschinenfabrik', icon: '⚙️', resource: null, rate: 0, cost: 100, text: 'verbraucht 0,10 t Stahl/s + 0,05 t Kupfer/s · produziert 0,05 t Maschinen/s' },
  glassFactory: { name: 'Glasfabrik', icon: '🪟', resource: null, rate: 0, cost: 60, text: 'verbraucht 0,20 t Silizium/s + 0,10 t Stein/s · produziert 0,15 t Glas/s' },
  heliumExtractor: { name: 'Helium-Extraktor', icon: '🧪', resource: 'helium3', rate: 0.1, cost: 120, text: '0,1 t Helium-3/s · nur auf Luna, Venus und Jupiter' },
  fusionReactor: { name: 'Fusionsreaktor', icon: '⚛️', resource: null, rate: 0, cost: 250, text: 'verbraucht 0,02 t Helium-3/s · produziert 50 MW Strom/s' },
  rocketFactory: { name: 'Raketenfabrik', icon: '🏭', resource: null, rate: 0, cost: 1000, text: '1.000 t Stahl · 2.000 t Baustoffe · 60 Sekunden Bauzeit · Voraussetzung für den Bau aller Raketen' },
  landingPad: { name: 'Start- & Landerampe', icon: '🛬', resource: null, rate: 0, cost: 2000, text: '2.000 t Stahl · 3.000 t Baustoffe · 500 t Maschinen · 300 t Batterien · 1 Rampe je gleichzeitig möglichem Start/Landung' },
  researchLab: { name: 'Forschungslabor', icon: '🔬', resource: null, rate: 0, cost: 0, text: 'nur auf der Erde · benötigt Baustoffe, Glas und Elektronik' },
  observatory: { name: 'Observatorium', icon: '🔭', resource: null, rate: 0, cost: 1000, text: 'Astronomische Beobachtungsanlage · nur auf der Erdoberfläche · Baukosten: 1.000 t Stahl, 800 t Baustoffe, 250 t Elektronik und 200 t Glas' },
  moonBase: { name: 'Mondbasis', icon: '🌙', resource: null, rate: 0, cost: 300, text: '300 t Stahl · 100 t Baustoffe · Forschung erforderlich' },
  solarPlant: { name: 'Solaranlage', icon: '☀️', resource: null, rate: 0, cost: 30, text: '20 MW Strom/s · 30 t Stahl · 10 t Baustoffe · 20 t Elektronik · Forschung erforderlich' },
  crudeOilPump: { name: 'Rohölpumpe', icon: '🛢️', resource: 'crudeOil', rate: 0.01, cost: 40, text: '0,01 Liter Rohöl/s · verbraucht 2 MW/s · nur auf der Erde' },
  refinery: { name: 'Raffinerie', icon: '🏭', resource: null, rate: 0, cost: 0, text: 'Verbraucht 0,2 L Rohöl/s · produziert 0,4 L Treibstoff/s · keine Forschung · nur auf Planetenoberflächen unter 50 °C · Treibstoff wird ausschließlich im Flüssiglager gespeichert' },
  polymerFactory: { name: 'Polymerfabrik', icon: '🧪', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,001 L Rohöl/s · produziert 0,0005 t Polymere/s · 500 t Stahl · 500 t Baustoffe · 200 t Elektronik · Forschung erforderlich' },
  rubberFactory: { name: 'Gummifabrik', icon: '⚫', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,1 L Rohöl/s · produziert 0,1 t Gummi/s · 500 t Stahl · 50 t Chips · 100 t Glas · 800 t Baustoffe · keine Forschung erforderlich · auf allen Planeten baubar' },
  plasticFactory: { name: 'Kunststofffabrik', icon: '🧴', resource: null, rate: 0, cost: 400, text: 'verbraucht 0,1 t Gummi/s · produziert 0,05 t Kunststoff/s · 400 t Stahl · 40 t Chips · 80 t Glas · 600 t Baustoffe · keine Forschung erforderlich · auf allen Planeten baubar' },
  vehicleFactory: { name: 'Fahrzeugfabrik', icon: '🚗', resource: null, rate: 0, cost: 500, text: 'Produziert 0,003 t Fahrzeuge/s · verbraucht 0,1 t Stahl/s, 0,1 t Kunststoff/s, 0,05 t Gummi/s, 0,3 t Glas/s und 0,2 t Chips/s · benötigt 4 MW Strom · 500 t Stahl, 250 t Baustoffe, 100 t Elektronik, 200 t Chips · 120 Sekunden Bauzeit · Forschung erforderlich · auf allen Planeten außer der Sonne baubar' },
  electronicsFactory: { name: 'Elektronikfabrik', icon: '💻', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,05 t Kupfer/s + 0,07 t Chips/s + 0,02 t Lithium/s · produziert 0,03 t Elektronik/s · 500 t Stahl · 300 t Baustoffe' },
  uraniumMine: { name: 'Uranmine', icon: '☢️', resource: 'uranium', rate: 0.01, cost: 300, text: '0,01 t Uran/s' },
  ioniumMine: { name: 'Ionium-Mine', icon: '☢️', resource: 'ionium', rate: 0.01, cost: 300, text: '0,01 t Ionium/s · nur auf Io · benötigt ein Radioaktivstofflager zur sicheren Lagerung · 300 t Stahl · 200 t Baustoffe' },
  uraniumProcessingPlant: { name: 'Uranaufbereitungsanlage', icon: '⚗️', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,02 t Uran/s · produziert 0,015 t aufbereitetes Uran/s · 500 t Stahl · 300 t Baustoffe' },
  nuclearFuelPlant: { name: 'Kernbrennstoffanlage', icon: '☢️', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,01 t aufbereitetes Uran/s · produziert 0,008 t Kernbrennstoff/s · 1.000 t Stahl · 600 t Baustoffe · 100 t Elektronik' },
  nuclearReactor: { name: 'Kernreaktor', icon: '☢️', resource: null, rate: 0, cost: 5000, text: 'verbraucht 0,01 t Kernbrennstoff/s · erzeugt 1.000 MW Strom/s · 5.000 t Stahl · 7.000 t Baustoffe · 2.000 t Elektronik' },
  radioactiveStorageSurface: { name: 'Radioaktivstofflager', icon: '☢️', resource: null, rate: 0, cost: 500, text: 'Lagert bis zu 10.000 t radioaktive Materialien · Baukosten: 500 t Stahl, 500 t Baustoffe, 200 t Glas und 100 t Elektronik · nur auf der Oberfläche' },
  radioactiveStorageOrbit: { name: 'Radioaktivstofflager', icon: '☢️', resource: null, rate: 0, cost: 500, text: 'Lagert bis zu 10.000 t radioaktive Materialien · Baukosten: 500 t Stahl, 500 t Baustoffe, 200 t Glas und 100 t Elektronik · nur im Orbit' },
  chipFactory: { name: 'Chipfabrik', icon: '💾', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,1 t Lithium/s + 0,3 t Kupfer/s · produziert 0,015 t Chips/s · 2.000 t Baustoffe · 600 t Elektronik' },
  solarSail: { name: 'Sonnensegel', icon: '☀️', resource: null, rate: 0, cost: 5000, text: 'senkt im Orbit die Temperatur des zugehörigen Planeten um 10 °C (auch mehrfach) · auf Merkur/Venus zusätzlich an der Oberfläche baubar · 5.000 t Stahl · 10.000 t Baustoffe · 5.000 t Glas · 2.000 t Chips · 1.000 t Elektronik' },
  warmingSail: { name: 'Planetare Wärmesegel', icon: '🌞', resource: null, rate: 0, cost: 5000, text: 'erhöht im Orbit die Temperatur des zugehörigen Planeten um 10 °C pro Segel · nur im Orbit baubar · Baukosten wie Sonnensegel: 5.000 t Stahl, 10.000 t Baustoffe, 5.000 t Glas, 2.000 t Chips und 1.000 t Elektronik' },
  solarSatellite: { name: 'Solar-Satellit', icon: '🛰️', resource: null, rate: 0, cost: 20000, text: 'wird auf der Erde gebaut und anschließend mit einer Sonnensonde in den Sonnenorbit gebracht · 20.000 t Stahl · 20.000 t Baustoffe · 10.000 t Glas · 5.000 t Elektronik · 5.000 t Batterien' },
  solarProbe: { name: 'Sonnensonde', icon: '🚀', resource: null, rate: 0, cost: 15000, text: 'transportiert Solar-Satelliten von der Erde in den Sonnenorbit · 15.000 t Stahl · 5.000 t Elektronik · 2.000 t Batterien' },
  hydroelectricPlant: { name: 'Wasserkraftwerk', icon: '💧', resource: null, rate: 0, cost: 700, text: 'verbraucht 3 MW Strom · erzeugt 0,1 Liter Wasser/s aus dem Wasservorkommen der Erde · 700 t Stahl · 100 t Maschinen · 50 t Elektronik · Forschung erforderlich' },
  cocoaPlantation: { name: 'Kakao-Plantage', icon: '🌱', resource: null, rate: 0, cost: 500, text: 'Erzeugt 0,1 t Kakaobohnen/s · verbraucht 0,2 Liter Wasser/s · benötigt 5 MW Strom · 500 t Stahl und 300 t Baustoffe · Forschung erforderlich · auf allen Planetenoberflächen außer der Sonne baubar' },
  luxuryFurnitureFactory: { name: 'Luxusmöbelfabrik', icon: '🛋️', resource: null, rate: 0, cost: 1200, text: 'Verbraucht 5 MW Strom, 0,03 t Kunststoff/s und 0,006 t Bretter/s · produziert 0,02 t Luxusmöbel/s · Baukosten: 1.200 t Stahl, 800 t Baustoffe, 250 t Glas, 100 t Chips und 150 t Elektronik · Forschung erforderlich' },
  chocolateFactory: { name: 'Schokoladenfabrik', icon: '🍫', resource: null, rate: 0, cost: 500, text: 'Verbraucht 0,02 t Kakaobohnen/s · produziert 0,05 t Schokolade/s · benötigt 5 MW Strom · kein Wasserverbrauch · 500 t Stahl und 300 t Baustoffe · Forschung erforderlich · auf allen Planetenoberflächen außer der Sonne baubar' },
  greenhouse: { name: 'Gewächshaus', icon: '🌱', resource: null, rate: 0, cost: 500, text: 'verbraucht 2 MW Strom und 0,01 Liter Wasser/s · produziert 0,2 t Getreide/s und 0,2 t Gemüse/s · 500 t Stahl · 20 t Polymere · 300 t Baustoffe · Forschung erforderlich' },
  foodFactory: { name: 'Lebensmittelfabrik', icon: '🥫', resource: null, rate: 0, cost: 1900, text: 'verbraucht 5 MW Strom, 0,1 t Getreide/s und 0,05 L Wasser/s · produziert 0,08 t Lebensmittel/s · Forschung erforderlich' },
  iceMine: { name: 'Eismine', icon: '🧊', resource: 'ice', rate: 0.2, cost: 100, text: 'Fördert 0,2 t Eis/s · keine Forschung erforderlich · nur auf Planeten mit Eisvorkommen' },
  iceProcessingPlant: { name: 'Eisverarbeitungsanlage', icon: '🧊', resource: null, rate: 0, cost: 100, text: 'verbraucht 0,1 t Eis/s aus dem lokalen Lager · produziert 0,2 L Wasser/s · kein Stromverbrauch · auf allen Planeten außer der Sonne · Forschung erforderlich' },
  algaeFarm: { name: 'Algenfarm', icon: '🪴', resource: null, rate: 0, cost: 300, text: 'verbraucht 0,05 t Wasser/s (50 L/s) aus dem lokalen Lager · produziert 0,2 t Algenbiomasse/s · kein zusätzlicher Stromverbrauch · Forschung erforderlich' },
  algaeFoodProcessor: { name: 'Algenverarbeitungsanlage', icon: '🥫', resource: null, rate: 0, cost: 800, text: 'verbraucht 0,1 t Algenbiomasse/s · produziert 0,12 t Lebensmittel/s · Forschung erforderlich' }
};

const rocketTypes = {
  hercules1: { name: 'Herkules 1', icon: '🚀', cost: 45, capacity: 120 },
  hercules2: { name: 'Herkules 2', icon: '🚀', costSteel: 300, costBatteries: 50, costAluminium: 50, capacity: 300, compartments: 3 },
  atlas1: { name: 'Atlas 1', icon: '🚀', costSteel: 340, costChips: 150, costBatteries: 200, costAluminium: 100, capacity: 500, compartments: 3 },
  titan1: { name: 'Titan 1', icon: '🚀', costSteel: 2000, costAluminium: 300, costChips: 250, costBatteries: 200, costTitanium: 120, capacity: 1500, compartments: 3, buildTime: 120 },
  colonistShuttle: { name: 'Kolonisten-Shuttle', icon: '🧑‍🚀', capacity: 25, costSteel: 500, costElectronics: 200, costChips: 150, costPolymers: 100, buildTime: 60 },
  mobileMiner: { name: 'Mobile Minerrakete', icon: '⛏️', costSteel: 1900, costGlass: 600, costChips: 1400, costElectronics: 1100, costPolymers: 300, buildTime: 600 },
  tankRocket: { name: 'Tankrakete', icon: '🛢️', costSteel: 120, costBatteries: 30, costElectronics: 20, capacity: 10000, buildTime: 60 }
};

// Flugzeiten in Sekunden für Oberflächenziele; Ceres ist ein reguläres Flugziel. Orbitziele sind 3 Sekunden schneller.
const flightTimes = {
  mercury: 10,
  venus: 45,
  earth: 5,
  mars: 60,
  jupiter: 120,
  neptune: 120,
  pluto: 180,
  ceres: 150,
  io: 135,
  luna: 20
};

function flightDurationSeconds(destination, mode = 'surface') {
  const base = Number(flightTimes[destination] || 20);
  return mode === 'orbit' ? Math.max(1, base - 3) : base;
}
function getLocationStorage(id, mode = 'surface') {
  return mode === 'orbit' ? getOrbitStorage(id) : getPlanetStorage(id);
}
function hasPlanetSurface(id) { return id !== 'jupiter' && id !== 'neptune' && id !== 'sun'; }
function rocketCanLand(id) { return hasPlanetSurface(id); }
function getOrbitBuildings(id) {
  if (!bodies[id]) return {};
  if (!bodies[id].orbitBuildings || typeof bodies[id].orbitBuildings !== 'object') bodies[id].orbitBuildings = {};
  return bodies[id].orbitBuildings;
}
function getOrbitLandingPadCount(id) { return Math.max(0, Number(getOrbitBuildings(id).orbitLandingPad) || 0); }
function getOrbitRocketSlotsUsed(id) {
  const stored = ['hercules1','hercules2','atlas1','titan1'].reduce((sum,type) => sum + getRocketStockCount(type,id,'orbit'), 0);
  const assigned = orbitMissions.filter(m => m.source === id && m.sourceMode === 'orbit').length;
  return stored + assigned;
}
function getFreeOrbitRocketSlots(id) { return Math.max(0, getOrbitLandingPadCount(id) - getOrbitRocketSlotsUsed(id)); }
function orbitMissionFuelCost(m) {
  const factors = { hercules1: 1, hercules2: 2, atlas1: 3, titan1: 5 };
  return Math.ceil((flightDurationSeconds(m.destination, m.destinationMode || 'surface') + flightDurationSeconds(m.source, 'orbit')) * (factors[m.rocketType] || 1));
}

// Treibstoff wird beim Start einmal für Hin- und Rückflug abgerechnet.
function rocketRoundTripFuelCost(type, source, destination, sourceMode = 'surface', targetMode = 'surface') {
  const factors = { hercules1: 1, hercules2: 2, atlas1: 3, titan1: 5, colonistShuttle: 2 };
  const outbound = flightDurationSeconds(destination, targetMode);
  const inbound = flightDurationSeconds(source, sourceMode);
  return Math.ceil((outbound + inbound) * (factors[type] || 1));
}
function chargeRocketRoundTripFuel(type, source, destination, sourceMode = 'surface', targetMode = 'surface', count = 1) {
  const costPerRocket = rocketRoundTripFuelCost(type, source, destination, sourceMode, targetMode);
  const totalCost = costPerRocket * Math.max(1, Math.floor(Number(count) || 1));
  const available = liquidFuelAmount(source, sourceMode);
  if (available + 0.000001 < totalCost) {
    rocketLaunchError(`Nicht genügend Treibstoff im ${sourceMode === 'orbit' ? 'Orbit-Flüssiglager' : 'Oberflächen-Flüssiglager'}. Benötigt: ${totalCost.toLocaleString('de-DE')} L, vorhanden: ${available.toLocaleString('de-DE')} L.`);
    return false;
  }
  const tankData = ensureLiquidTankData(source);
  tankData.liquidFuel[sourceMode] = Math.max(0, available - totalCost);
  return true;
}
function reservedOrbitFuel(id) {
  return rockets.reduce((sum,r) => sum + (r.type === 'tankRocket' && r.to === id && r.targetMode === 'orbit' && !r.fuelDelivered ? Math.max(0, Number(r.fuelCargoLiters)||0) : 0), 0);
}

// Jede Start- & Landerampe auf einem Körper mit Oberfläche erhöht das systemweite Limit um 1.
function getRocketPlatformLimit() {
  return Object.keys(bodies).filter(id => hasPlanetSurface(id))
    .reduce((sum, id) => sum + Math.max(0, Number(getBuildingsOnPlanet(id).landingPad) || 0), 0);
}
function getActiveRocketCount() {
  const manualFlights = rockets.filter(rocket => rocket.status !== 'returned').length;
  // Eine zyklische Mission belegt dauerhaft einen Platz – auch während Wartezeit oder Pause.
  return manualFlights + orbitMissions.length;
}
function checkRocketLimit(additional = 1) {
  const limit = getRocketPlatformLimit();
  const active = getActiveRocketCount();
  if (active + additional <= limit) return true;
  rocketLaunchError(`Raketenlimit erreicht: ${active} von ${limit} Raketenplätzen belegt. Baue weitere Start- & Landeplattformen oder beende eine Mission.`);
  return false;
}
function getRocketStockHome(preferredId) {
  if (hasPlanetSurface(preferredId) && Number(getBuildingsOnPlanet(preferredId).landingPad || 0) > 0) return preferredId;
  return Object.keys(bodies).find(id => hasPlanetSurface(id) && Number(getBuildingsOnPlanet(id).landingPad || 0) > 0) || preferredId;
}
function addRocketToStock(type, preferredId, mode = 'surface') {
  const stockByType = { hercules1: rocketStock, hercules2: rocketStock2, atlas1: rocketStockAtlas1, titan1: rocketStockTitan1, colonistShuttle: rocketStockColonistShuttle, mobileMiner: rocketStockMobileMiner };
  const stock = stockByType[type];
  if (!stock) return;
  const home = mode === 'orbit' ? preferredId : getRocketStockHome(preferredId);
  ensureRocketData(home);
  const key = rocketStockKey(home, mode);
  stock[key] = Number(stock[key] || 0) + 1;
}

const rockets = [];
// Dauerhafte, zyklische Orbitmissionen; Zeitstempel in Echtzeit ermöglichen Fortsetzung nach Neustart.
const orbitMissions = [];
let orbitMissionCounter = 1;
const rocketBuildQueue = {};
const rocketBuildStarted = {};
const rocketStock = {};
const rocketStock2 = {};
const rocketBuildQueue2 = {};
const rocketBuildStarted2 = {};
const rocketStockAtlas1 = {};
const rocketBuildQueueAtlas1 = {};
const rocketBuildStartedAtlas1 = {};
const rocketStockTitan1 = {};
const rocketStockColonistShuttle = {};
const rocketStockMobileMiner = {};
const rocketStockTankRocket = {};
const liquidTankBuildQueue = {};
const liquidTankBuildStarted = {};
const orbitRocketStockSuffix = '__orbit';
function rocketStockKey(id, mode='surface') { return mode === 'orbit' ? `${id}${orbitRocketStockSuffix}` : id; }
function getRocketStockMap(type) { return ({hercules1:rocketStock,hercules2:rocketStock2,atlas1:rocketStockAtlas1,titan1:rocketStockTitan1,colonistShuttle:rocketStockColonistShuttle,mobileMiner:rocketStockMobileMiner,tankRocket:rocketStockTankRocket})[type] || null; }
function getRocketStockCount(type,id,mode='surface') { const map=getRocketStockMap(type); return Math.max(0,Number(map?.[rocketStockKey(id,mode)]||0)); }
function changeRocketStock(type,id,mode,delta) { const map=getRocketStockMap(type); if(!map)return; const key=rocketStockKey(id,mode); map[key]=Math.max(0,Number(map[key]||0)+Number(delta||0)); }
function ensureLiquidTankData(id) { if(!bodies[id])return null; if(!bodies[id].liquidTanks||typeof bodies[id].liquidTanks!=='object') bodies[id].liquidTanks={surface:0,orbit:0}; bodies[id].liquidTanks.surface=Math.max(0,Number(bodies[id].liquidTanks.surface)||0); bodies[id].liquidTanks.orbit=Math.max(0,Number(bodies[id].liquidTanks.orbit)||0); if(!bodies[id].liquidFuel||typeof bodies[id].liquidFuel!=='object') bodies[id].liquidFuel={surface:0,orbit:0}; bodies[id].liquidFuel.surface=Math.max(0,Number(bodies[id].liquidFuel.surface)||0); bodies[id].liquidFuel.orbit=Math.max(0,Number(bodies[id].liquidFuel.orbit)||0); return bodies[id]; }
function liquidTankCapacity(id,mode='surface') { const body=ensureLiquidTankData(id); return body ? body.liquidTanks[mode]*10000 : 0; }
function liquidFuelAmount(id,mode='surface') { const body=ensureLiquidTankData(id); return body ? body.liquidFuel[mode] : 0; }
function liquidTankLocationKey(id,mode='surface') { return `${id}:${mode}`; }
function startLiquidTankBuild(id,mode='surface') { if(!bodies[id]||id==='sun')return; const key=liquidTankLocationKey(id,mode); if(liquidTankBuildQueue[key]) return; const storage=getLocationStorage(id,mode); const costs={buildingMaterials:500,steel:500}; if(!Object.entries(costs).every(([r,n])=>Number(storage[r]||0)>=n)) { rocketLaunchError('Für einen Flüssigtank werden 500 t Baustoffe und 500 t Stahl benötigt.'); return; } Object.entries(costs).forEach(([r,n])=>storage[r]=Number(storage[r]||0)-n); liquidTankBuildQueue[key]=1; liquidTankBuildStarted[key]=gameNow(); playUiSound('build'); renderSystem(); renderInfo(); renderTopResources(); saveGame(false); }
const rocketFactoryQueue = {};
const rocketFactoryStarted = {};
const rocketFactoryBuildQueue = {};
const rocketFactoryBuildStarted = {};
const outpostBuildQueue = {};
const outpostBuildStarted = {};
const solarProbeFlights = [];
let rocketQuantity = 1;
let rocketCargoResource = 'stone';
let rocketCargoAmount = 0;
let rocketDestination = 'mars';
let rocketDestinationMode = 'surface';
let rocketCargoSlots = [
  { resource: 'stone', amount: 0 },
  { resource: 'iron', amount: 0 },
  { resource: 'steel', amount: 0 }
];
let planetResourcesOpen = false;
// Merkt sich die zuletzt geöffnete Gebäudekategorie über Neubauten hinweg.
let activeBuildingCategoryTitle = null;

const bodies = {
  sun: { name: 'Sonne', type: 'Stern', className: 'sun', temperature: 'ca. 5.500 °C Oberfläche', resources: {}, storage: {}, buildings: { solarSatellite: 0 }, orbit: 0 },
  mercury: { name: 'Merkur', type: 'Planet', className: 'mercury', temperature: '430 °C', resources: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000, titanOre: 5000000, water: 2000000000 }, storage: {}, orbit: 150 },
  venus: { name: 'Venus', type: 'Planet', className: 'venus', temperature: '490 °C', resources: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000, co2: 100000000000000 }, atmosphere: { co2Initial: 100000000000000, pressureInitial: 92 }, storage: {}, orbit: 235 },
  earth: { name: 'Erde', type: 'Startplanet', className: 'earth', temperature: 'ca. 15 °C Durchschnitt', resources: { stone: 20000000, coal: 15000000, gas: 20000000, co2: 1000000, iron: 200000000, nickelOre: 500000, graphite: 4000000, lithium: 2000000, crudeOil: 6000000, copperOre: 10000000, uranium: 1000000, bauxite: 10000000, water: 1000000000, trees: 10000 }, atmosphere: { totalGas: 1089213113205.7233, gases: { nitrogen: 850457598791.0288, oxygen: 228190147216.59903, argon: 10129681952.813227, co2: 435685245.2822893 }, oxygen: 228190147216.59903, composition: 'earth-standard-v1' }, storage: null, orbit: 320 },
  luna: { name: 'Luna', type: 'Mond der Erde', className: 'luna', temperature: 'ca. -20 °C Durchschnitt', resources: { stone: 3000000, ice: 1000000, iron: 2000000, silicon: 4000000, graphite: 10000000, lithium: 6000000, helium3: 10000000, uranium: 3000000, bauxite: 10000000 }, storage: {}, orbit: 0, moonOf: 'earth', moonOrbit: 55 },
  mars: { name: 'Mars', type: 'Planet', className: 'mars', temperature: 'ca. -63 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000, graphite: 15000000, uranium: 10000000, bauxite: 10000000 }, storage: {}, orbit: 405 },
  ceres: { name: 'Ceres', type: 'Zwergplanet', className: 'ceres', temperature: 'ca. -105 °C Durchschnitt', resources: { iron: 5000000, titanium: 4000000, stone: 6000000, water: 7000000 }, storage: {}, orbit: 460 },
  jupiter: { name: 'Jupiter', type: 'Gasplanet', className: 'jupiter', temperature: 'ca. -110 °C Wolkenobergrenze', resources: { helium3: 500000000, hydrogen: 5000000000, co2: 100000000 }, storage: {}, orbit: 515 },
  saturn: { name: 'Saturn', type: 'Gasplanet', className: 'saturn', temperature: 'ca. -140 °C Wolkenobergrenze', resources: { hydrogen: 0, helium: 0 }, storage: {}, orbit: 555 },
  uranus: { name: 'Uranus', type: 'Gasplanet', className: 'uranus', temperature: 'ca. -195 °C Wolkenobergrenze', resources: { hydrogen: 0, helium: 0 }, storage: {}, orbit: 595 },
  neptune: { name: 'Neptun', type: 'Gasplanet', className: 'neptune', temperature: 'ca. -200 °C Wolkenobergrenze', resources: { hydrogen: 0, helium: 0 }, atmosphere: { pressure: 108 }, storage: {}, orbit: 635 },
  pluto: { name: 'Pluto', type: 'Zwergplanet', className: 'pluto', temperature: 'ca. -230 °C Durchschnitt', resources: { iron: 20000000, uranium: 5000000, silicon: 20000000, copper: 40000000 }, storage: {}, orbit: 690 },
  io: { name: 'Io', type: 'Mond des Jupiter', className: 'io', temperature: 'ca. -110 °C Durchschnitt', resources: { iron: 20000000, silicon: 15000000, copperOre: 20000000, graphite: 70000000, bauxite: 19000000, ionium: 1000000 }, storage: {}, orbit: 570, moonOf: 'jupiter' }
};

const resourceNames = { ice: 'Eis', titanOre: 'Titanerz', processedTitan: 'Aufbereitetes Titan', titanium: 'Titan', bauxite: 'Bauxit', aluminiumOxide: 'Aluminiumoxid', aluminium: 'Aluminium', co2: 'CO₂', carbon: 'Kohlenstoff', oxygen: 'Sauerstoff', stone: 'Stein', coal: 'Kohle', gas: 'Gas', iron: 'Eisen', silicon: 'Silizium', lithium: 'Lithium', copperOre: 'Kupfererz', copper: 'Kupfer', batteries: 'Batterien', buildingMaterials: 'Baustoffe', machines: 'Maschinen', glass: 'Glas', electronics: 'Elektronik', steel: 'Stahl', hydrogen: 'Wasserstoff', helium: 'Helium', helium3: 'Helium-3', crudeOil: 'Rohöl', polymers: 'Polymere', rubber: 'Gummi', plastics: 'Kunststoff', wood: 'Bretter', biomass: 'Biomasse', vehicles: 'Fahrzeuge', cocoaBeans: 'Kakaobohnen', chocolate: 'Schokolade', luxuryFurniture: 'Luxusmöbel', nickelOre: 'Nickelerz', graphite: 'Graphit', liquidFuel: 'Treibstoff', trees: 'Bäume', uranium: 'Uran', processedUranium: 'Aufbereitetes Uran', nuclearFuel: 'Kernbrennstoff', ionium: 'Ionium', chips: 'Chips', water: 'Wasser', grain: 'Getreide', vegetables: 'Gemüse', food: 'Lebensmittel', algaeBiomass: 'Algenbiomasse' };
const resourceIcons = { ice: '🧊', titanOre: '⚙️', processedTitan: '⚗️', titanium: '🔩', bauxite: '🪨', aluminiumOxide: '⚗️', aluminium: '🥈', co2: '🌫️', carbon: '⚫', oxygen: '🫧', stone: '🪨', coal: '⚫', gas: '🔥', iron: '🧲', silicon: '🔷', lithium: '🔋', copperOre: '🟠', copper: '🟤', batteries: '🔋', buildingMaterials: '🧱', machines: '⚙️', glass: '🪟', electronics: '💻', steel: '🔩', hydrogen: '💨', helium: '💨', helium3: '🧪', crudeOil: '🛢️', polymers: '🧬', rubber: '⚫', plastics: '🧴', wood: '🪵', biomass: '🌿', vehicles: '🚗', cocoaBeans: '🫘', chocolate: '🍫', luxuryFurniture: '🛋️', nickelOre: '🪨', graphite: '⚫', liquidFuel: '🛢️', trees: '🌳', uranium: '☢️', processedUranium: '🧪', nuclearFuel: '⚛️', ionium: '☢️', chips: '💾', water: '💧', grain: '🌾', vegetables: '🥦', food: '🥫', algaeBiomass: '🪴' };

function formatTons(value) { return `${value.toFixed(2)} t`; }
function formatLargeTons(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Billionen t`;
  return formatTons(n);
}
function venusCo2Remaining() { return Math.max(0, Number(bodies.venus?.resources?.co2 || 0)); }
function venusCo2ExtractedTotal() {
  const initial = Number(bodies.venus?.atmosphere?.co2Initial ?? 100000000000000);
  return Math.max(0, initial - venusCo2Remaining());
}
function formatAtmosphereTons(value) {
  return `${Math.max(0, Number(value) || 0).toLocaleString('de-DE', { maximumFractionDigits: 3 })} t`;
}
// Gemeinsames Atmosphärenmodell für alle Planeten.
// Die Grundformel berechnet den Oberflächendruck aus Atmosphärenmasse,
// Oberflächenschwerkraft und Planetenradius. Ein EINHEITLICHER Spielfaktor
// kalibriert das Modell auf Venus: 100 Billionen t CO₂ entsprechen dort 92 bar.
const PLANET_ATMOSPHERE_PHYSICS = {
  mercury: { radiusM: 2439700, gravity: 3.70 },
  venus:   { radiusM: 6051800, gravity: 8.87 },
  earth:   { radiusM: 6371000, gravity: 9.81 },
  luna:    { radiusM: 1737400, gravity: 1.62 },
  mars:    { radiusM: 3389500, gravity: 3.71 },
  jupiter: { radiusM: 69911000, gravity: 24.79 },
  saturn:  { radiusM: 58232000, gravity: 10.44 },
  uranus:  { radiusM: 25362000, gravity: 8.69 },
  neptune: { radiusM: 24622000, gravity: 11.15 },
  pluto:   { radiusM: 1188300, gravity: 0.62 },
  ceres:   { radiusM: 469600, gravity: 0.27 },
  io:      { radiusM: 1821600, gravity: 1.80 }
};
const VENUS_ATMOSPHERE_REFERENCE_TONS = 100000000000000;
const VENUS_ATMOSPHERE_REFERENCE_BAR = 92;
const ATMOSPHERE_GAME_SCALE = (() => {
  const venus = PLANET_ATMOSPHERE_PHYSICS.venus;
  const rawPressure = VENUS_ATMOSPHERE_REFERENCE_TONS * 1000 * venus.gravity /
    (4 * Math.PI * venus.radiusM * venus.radiusM * 100000);
  return VENUS_ATMOSPHERE_REFERENCE_BAR / rawPressure;
})();
function atmosphericPressureFromMass(planetId, massTons) {
  const planet = PLANET_ATMOSPHERE_PHYSICS[planetId];
  if (!planet) return 0;
  const massKg = Math.max(0, Number(massTons) || 0) * 1000;
  const pressurePa = massKg * planet.gravity / (4 * Math.PI * planet.radiusM * planet.radiusM);
  return pressurePa * ATMOSPHERE_GAME_SCALE / 100000;
}
function earthAtmosphericPressure() {
  return atmosphericPressureFromMass('earth', ensurePlanetAtmosphere('earth')?.totalGas || 0);
}
function venusAtmosphericPressure() {
  return atmosphericPressureFromMass('venus', ensurePlanetAtmosphere('venus')?.totalGas || 0);
}
function venusPressureChange() { return venusAtmosphericPressure() - Number(bodies.venus?.atmosphere?.pressureInitial ?? 92); }
function venusPressurePercent() { return Math.max(0, Math.min(100, venusAtmosphericPressure() / 92 * 100)); }

// Luna und alle weiteren Planeten verwenden dieselbe Formel; nur Radius und Schwerkraft variieren.
const ATMOSPHERE_RELEASE_GASES = {
  oxygen: { label: 'Sauerstoff', icon: '🫧' },
  co2: { label: 'CO₂', icon: '🌫️' },
  gas: { label: 'Gas', icon: '🔥' },
  hydrogen: { label: 'Wasserstoff', icon: '💨' },
  helium: { label: 'Helium', icon: '💨' },
  carbon: { label: 'Kohlenstoff', icon: '⚫' },
  nitrogen: { label: 'Stickstoff', icon: '🌬️' },
  argon: { label: 'Argon', icon: '🧪' },
  methane: { label: 'Methan (CH₄)', icon: '💨' },
  carbonMonoxide: { label: 'Kohlenstoffmonoxid (CO)', icon: '☁️' },
  sulfurDioxide: { label: 'Schwefeldioxid (SO₂)', icon: '🌋' },
  sodium: { label: 'Natrium', icon: '🧪' },
  potassium: { label: 'Kalium', icon: '🧪' }
};
const LUNA_RELEASE_GASES = ATMOSPHERE_RELEASE_GASES; // Kompatibilität mit bestehenden Spielständen/UI
function ensureLunaAtmosphere() { return ensurePlanetAtmosphere('luna'); }
function lunaAtmosphericPressure() { return atmosphericPressureFromMass('luna', ensurePlanetAtmosphere('luna')?.totalGas || 0); }
function releaseLunaAtmosphereGas() { return releasePlanetAtmosphereGas(); }
function releasePlanetAtmosphereGas() {
  const planetId = state.selected;
  if (!bodies[planetId] || planetId === 'sun') return;
  const resourceSelect = document.querySelector('#planet-atmosphere-gas');
  const amountInput = document.querySelector('#planet-atmosphere-amount');
  const status = document.querySelector('#planet-atmosphere-status');
  const key = resourceSelect?.value;
  const amount = Number(amountInput?.value);
  const storage = state.viewMode === 'orbit' ? getOrbitStorage(planetId) : getPlanetStorage(planetId);
  const gas = ATMOSPHERE_RELEASE_GASES[key];
  if (!gas || !Number.isFinite(amount) || amount <= 0) {
    if (status) status.textContent = 'Bitte eine gültige Gasmenge eingeben.';
    return;
  }
  const available = Math.max(0, Number(storage[key]) || 0);
  if (amount > available) {
    if (status) status.textContent = `Nicht genug ${gas.label} im Lager. Verfügbar: ${formatAtmosphereTons(available)}.`;
    return;
  }
  const atmosphere = ensurePlanetAtmosphere(planetId);
  storage[key] = Math.max(0, available - amount);
  atmosphere.gases[key] = Math.max(0, Number(atmosphere.gases[key]) || 0) + amount;
  atmosphere.totalGas = Math.max(0, Number(atmosphere.totalGas) || 0) + amount;
  if (key === 'oxygen') atmosphere.oxygen = Math.max(0, Number(atmosphere.oxygen) || 0) + amount;
  playUiSound('build');
  saveGame(false);
  renderInfo();
  renderTopResources();
  const nextStatus = document.querySelector('#planet-atmosphere-status');
  if (nextStatus) nextStatus.textContent = `${formatAtmosphereTons(amount)} ${gas.label} freigesetzt.`;
}
function renderAtmospherePanel(planetId) {
  if (!planetId || planetId === 'sun') return '';
  const atmosphere = ensurePlanetAtmosphere(planetId);
  const pressure = atmosphericPressureFromMass(planetId, atmosphere.totalGas);
  const gasAmount = key => planetId === 'venus' && key === 'co2'
    ? Math.max(0, Number(bodies.venus.resources?.co2) || 0) + Math.max(0, Number(atmosphere.gases.co2) || 0)
    : Math.max(0, Number(atmosphere.gases[key]) || 0);
  const compositionTotal = planetId === 'venus'
    ? Math.max(0, Number(bodies.venus.resources?.co2) || 0) + Object.values(atmosphere.gases).reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0)
    : Math.max(0, Number(atmosphere.totalGas) || 0);
  const gasRows = Object.entries(ATMOSPHERE_RELEASE_GASES)
    .filter(([key]) => gasAmount(key) > 0)
    .sort((a, b) => gasAmount(b[0]) - gasAmount(a[0]))
    .map(([key, gas]) => {
      const amount = gasAmount(key);
      const share = compositionTotal > 0 ? amount / compositionTotal * 100 : 0;
      return `<div class="stat atmosphere-gas-row"><span>${gas.icon} ${gas.label}</span><strong>${formatAtmosphereTons(amount)} · ${share.toLocaleString('de-DE', { maximumFractionDigits: 4 })} %</strong></div>`;
    }).join('');
  const oxygenAmount = gasAmount('oxygen');
  const oxygenShare = compositionTotal > 0 ? oxygenAmount / compositionTotal * 100 : 0;
  const atmosphereStatus = pressure <= 0.00001
    ? 'Praktisch keine Atmosphäre vorhanden.'
    : oxygenShare >= 18 && oxygenShare <= 25 && pressure >= 0.8 && pressure <= 1.5
      ? 'Sauerstoffanteil und Druck liegen im erdähnlichen Bereich.'
      : oxygenShare < 18
        ? 'Sauerstoffanteil zu niedrig für normale menschliche Atmung.'
        : oxygenShare > 25
          ? 'Hoher Sauerstoffanteil: erhöhte Brandgefahr.'
          : 'Atmosphärendruck liegt außerhalb des erdähnlichen Bereichs.';
  const colonistAtmosphere = getColonistAtmosphereStatus(planetId);
  const colonistStatusClass = colonistAtmosphere.normalHousingAllowed ? 'good' : colonistAtmosphere.habitatAllowed ? 'warn' : 'bad';
  const colonistStatusHtml = `<div class="colonist-atmosphere-status"><strong>👥 Kolonisten-Freigabe</strong><p class="${colonistStatusClass}">${colonistAtmosphere.label}</p><small>Normale Wohngebäude: ab 1,05 bar und 18–25 % O₂ · Habitat: ab 0,9 bar</small></div>`;
  const storage = getPlanetStorage(planetId);
  const gases = Object.entries(ATMOSPHERE_RELEASE_GASES).map(([key, gas]) =>
    `<option value="${key}">${gas.icon} ${gas.label} · Lager: ${formatAtmosphereTons(Number(storage[key] || 0))}</option>`).join('');
  return `<details class="planet-atmosphere-details"><summary>🌫️ Atmosphäre · ${pressure.toFixed(3)} bar</summary>
    <div class="planet-atmosphere-content">
      <div class="stat"><span>Atmosphärendruck</span><strong>${pressure.toFixed(3)} bar</strong></div>
      <div class="stat"><span>Gasmenge gesamt</span><strong>${formatAtmosphereTons(atmosphere.totalGas)}</strong></div>
      <div class="stat"><span>🫧 Sauerstoffanteil</span><strong>${oxygenShare.toLocaleString('de-DE', { maximumFractionDigits: 4 })} %</strong></div>
      <p class="hint atmosphere-status">${atmosphereStatus}</p>
      ${colonistStatusHtml}
      <h4 class="atmosphere-composition-title">Gaszusammensetzung</h4>
      ${gasRows || '<p class="hint">Keine messbaren Gase in der Atmosphäre erfasst.</p>'}
      <p class="hint">Massen und Prozentanteile werden aus den gespeicherten Atmosphärendaten berechnet.</p>
      <p class="hint">Gase aus dem lokalen Lager freisetzen. Alle Planeten verwenden dieselbe Druckformel.</p>
      <label for="planet-atmosphere-gas">Gas auswählen</label><select id="planet-atmosphere-gas">${gases}</select>
      <label for="planet-atmosphere-amount">Freizusetzende Menge (t)</label><input id="planet-atmosphere-amount" type="number" min="0.001" step="any" value="1000"/>
      <button id="planet-atmosphere-release" type="button">🌬️ Gas freisetzen</button>
      <p id="planet-atmosphere-status" class="hint" role="status"></p>
    </div></details>`;
}

function venusCo2ExtractionRate(id='venus') { return Number(getBuildingsOnPlanet(id).co2Extraction || 0) * 0.25; }

function getBuildingsOnPlanet(id) {
  if (id === 'earth') {
    if (state.buildings.companyHeadquarters === undefined) state.buildings.companyHeadquarters = 0;
    if (state.buildings.gasCarbonStorage === undefined) state.buildings.gasCarbonStorage = 0;
    if (state.buildings.gasCarbonStorageOrbit === undefined) state.buildings.gasCarbonStorageOrbit = 0;
    if (state.buildings.iceMine === undefined) state.buildings.iceMine = 0;
    if (state.buildings.iceProcessingPlant === undefined) state.buildings.iceProcessingPlant = 0;
    if (state.buildings.algaeFarm === undefined) state.buildings.algaeFarm = 0;
    if (state.buildings.algaeFoodProcessor === undefined) state.buildings.algaeFoodProcessor = 0;
    if (state.buildings.observatory === undefined) state.buildings.observatory = 0;
    if (state.buildings.forester === undefined) state.buildings.forester = 0;
    if (state.buildings.atmosphereRegulator === undefined) state.buildings.atmosphereRegulator = 0;
    if (state.buildings.refinery === undefined) state.buildings.refinery = 0;
    if (state.buildings.radioactiveStorageSurface === undefined) state.buildings.radioactiveStorageSurface = 0;
    if (state.buildings.radioactiveStorageOrbit === undefined) state.buildings.radioactiveStorageOrbit = 0;
    if (state.buildings.woodcutter === undefined) state.buildings.woodcutter = 0;
    if (state.buildings.nickelMine === undefined) state.buildings.nickelMine = 0;
    if (state.buildings.syntheticGraphitePlant === undefined) state.buildings.syntheticGraphitePlant = 0;
    return state.buildings;
  }
  if (!bodies[id].buildings) {
    bodies[id].buildings = { companyHeadquarters: 0, gasCarbonStorageOrbit: 0, iceMine: 0, residentialHouse: 0, mediumResidentialHouse: 0, residentialComplex: 0, habitat: 0, observatory: 0, foodFactory: 0, algaeFarm: 0, algaeFoodProcessor: 0, steelworks: 0, stoneQuarry: 0, buildingMaterialsFactory: 0, coalMine: 0, gasPlant: 0, co2Extraction: 0, co2ProcessingPlant: 0, orbitalCo2Extractor: 0, researchSatellite: 0, ironMine: 0, nickelMine: 0, graphiteMine: 0, syntheticGraphitePlant: 0, siliconMine: 0, lithiumMine: 0, copperMine: 0, copperSmelter: 0, lithiumRefinery: 0, machineFactory: 0, glassFactory: 0, heliumExtractor: 0, fusionReactor: 0, outpost: 0, coalPowerPlant: 0, solarPlant: 0, researchLab: 0, moonBase: 0, crudeOilPump: 0, refinery: 0, polymerFactory: 0, rubberFactory: 0, plasticFactory: 0, vehicleFactory: 0, electronicsFactory: 0, uraniumMine: 0, ioniumMine: 0, uraniumProcessingPlant: 0, nuclearFuelPlant: 0, nuclearReactor: 0, radioactiveStorageSurface: 0, radioactiveStorageOrbit: 0, chipFactory: 0, solarSail: 0, warmingSail: 0, solarSatellite: 0, solarProbe: 0, bauxiteMine: 0, titanMine: 0, titanProcessing: 0, titanRefinery: 0, aluminiumOxideRefinery: 0, aluminiumSmelter: 0, hydroelectricPlant: 0, greenhouse: 0, cocoaPlantation: 0, woodcutter: 0, forester: 0, atmosphereRegulator: 0 }
  }
  if (bodies[id].buildings.nickelMine === undefined) bodies[id].buildings.nickelMine = 0;
  if (bodies[id].buildings.syntheticGraphitePlant === undefined) bodies[id].buildings.syntheticGraphitePlant = 0;
  if (bodies[id].buildings.companyHeadquarters === undefined) bodies[id].buildings.companyHeadquarters = 0;
  if (bodies[id].buildings.gasCarbonStorage === undefined) bodies[id].buildings.gasCarbonStorage = 0;
  if (bodies[id].buildings.gasCarbonStorageOrbit === undefined) bodies[id].buildings.gasCarbonStorageOrbit = 0;
  if (bodies[id].buildings.observatory === undefined) bodies[id].buildings.observatory = 0;
  if (bodies[id].buildings.radioactiveStorageSurface === undefined) bodies[id].buildings.radioactiveStorageSurface = 0;
  if (bodies[id].buildings.radioactiveStorageOrbit === undefined) bodies[id].buildings.radioactiveStorageOrbit = 0;
  if (bodies[id].buildings.forester === undefined) bodies[id].buildings.forester = 0;
  if (bodies[id].buildings.atmosphereRegulator === undefined) bodies[id].buildings.atmosphereRegulator = 0;
  if (bodies[id].buildings.refinery === undefined) bodies[id].buildings.refinery = 0;
  if (bodies[id].buildings.woodcutter === undefined) bodies[id].buildings.woodcutter = 0;
  if (bodies[id].buildings.residentialHouse === undefined) bodies[id].buildings.residentialHouse = 0;
  if (bodies[id].buildings.mediumResidentialHouse === undefined) bodies[id].buildings.mediumResidentialHouse = 0;
  if (bodies[id].buildings.residentialComplex === undefined) bodies[id].buildings.residentialComplex = 0;
  if (bodies[id].buildings.habitat === undefined) bodies[id].buildings.habitat = 0;
  if (bodies[id].buildings.electronicsFactory === undefined) bodies[id].buildings.electronicsFactory = 0;
  if (bodies[id].buildings.algaeFarm === undefined) bodies[id].buildings.algaeFarm = 0;
  if (bodies[id].buildings.algaeFoodProcessor === undefined) bodies[id].buildings.algaeFoodProcessor = 0;
  if (bodies[id].buildings.vehicleFactory === undefined) bodies[id].buildings.vehicleFactory = 0;
  if (bodies[id].buildings.iceMine === undefined) bodies[id].buildings.iceMine = 0;
  if (bodies[id].buildings.iceProcessingPlant === undefined) bodies[id].buildings.iceProcessingPlant = 0;
  if (bodies[id].buildings.researchSatellite === undefined) bodies[id].buildings.researchSatellite = 0;
  if (bodies[id].buildings.cocoaPlantation === undefined) bodies[id].buildings.cocoaPlantation = 0;
  if (bodies[id].buildings.chocolateFactory === undefined) bodies[id].buildings.chocolateFactory = 0;
  if (bodies[id].buildings.luxuryFurnitureFactory === undefined) bodies[id].buildings.luxuryFurnitureFactory = 0;
  return bodies[id].buildings;
}
function ensureVehicleFactoryQueue(id) {
  if (!bodies[id] || id === 'sun') return [];
  if (!Array.isArray(bodies[id].vehicleFactoryBuildQueue)) bodies[id].vehicleFactoryBuildQueue = [];
  bodies[id].vehicleFactoryBuildQueue = bodies[id].vehicleFactoryBuildQueue.filter(item => Number.isFinite(Number(item?.started)));
  return bodies[id].vehicleFactoryBuildQueue;
}
function getPlanetStorage(id) {
  if (id === 'earth') {
    delete state.potassium; delete state.sodium; delete state.sulfurDioxide;
    return state;
  }
  if (!bodies[id].storage) bodies[id].storage = {};
  delete bodies[id].storage.potassium; delete bodies[id].storage.sodium; delete bodies[id].storage.sulfurDioxide;
  if (bodies[id].storage.glass === undefined) bodies[id].storage.glass = 0;
  if (bodies[id].storage.wood === undefined) bodies[id].storage.wood = 0;
  if (bodies[id].storage.biomass === undefined) bodies[id].storage.biomass = 0;
  return bodies[id].storage;
}
function getOrbitStorage(id) {
  if (!bodies[id]) return {};
  if (!bodies[id].orbitStorage) bodies[id].orbitStorage = {};
  delete bodies[id].orbitStorage.potassium; delete bodies[id].orbitStorage.sodium; delete bodies[id].orbitStorage.sulfurDioxide;
  if (bodies[id].orbitStorage.glass === undefined) bodies[id].orbitStorage.glass = 0;
  if (bodies[id].orbitStorage.wood === undefined) bodies[id].orbitStorage.wood = 0;
  if (bodies[id].orbitStorage.biomass === undefined) bodies[id].orbitStorage.biomass = 0;
  return bodies[id].orbitStorage;
}
// Gaslagerkapazität wird getrennt für Oberfläche und Orbit geführt.
// Jeder atmosphärische Gasbestand benötigt ein Gaslager; Kapazität: 100.000 t je Gas und Gebäude.
const ATMOSPHERIC_STORAGE_GASES = Object.keys(ATMOSPHERE_RELEASE_GASES).filter(key => !['potassium', 'sodium', 'sulfurDioxide'].includes(key));
function gasCarbonStorageCount(id, mode = 'surface') {
  const buildings = getBuildingsOnPlanet(id);
  return Math.max(0, Number(buildings[mode === 'orbit' ? 'gasCarbonStorageOrbit' : 'gasCarbonStorage']) || 0);
}
function gasCarbonStorageCapacity(id, mode = 'surface') {
  return gasCarbonStorageCount(id, mode) * 100000;
}
function addStoredAtmosphericGas(id, mode, key, amount) {
  const storage = mode === 'orbit' ? getOrbitStorage(id) : getPlanetStorage(id);
  if (!ATMOSPHERIC_STORAGE_GASES.includes(key)) return 0;
  const capacity = gasCarbonStorageCapacity(id, mode);
  const current = Math.min(capacity, Math.max(0, Number(storage[key]) || 0));
  const accepted = Math.min(Math.max(0, Number(amount) || 0), Math.max(0, capacity - current));
  storage[key] = current + accepted;
  return accepted;
}
function addStoredCO2(id, mode, amount) { return addStoredAtmosphericGas(id, mode, 'co2', amount); }
function enforceCO2StorageCapacity(id) {
  for (const mode of ['surface', 'orbit']) {
    const storage = mode === 'orbit' ? getOrbitStorage(id) : getPlanetStorage(id);
    const capacity = gasCarbonStorageCapacity(id, mode);
    for (const key of ATMOSPHERIC_STORAGE_GASES) {
      storage[key] = Math.min(capacity, Math.max(0, Number(storage[key]) || 0));
    }
  }
}
function storageAmount(id, resource) { return Number(getPlanetStorage(id)[resource] || 0); }
function radioactiveStorageCapacity(id, mode = 'surface') {
  const key = mode === 'orbit' ? 'radioactiveStorageOrbit' : 'radioactiveStorageSurface';
  return Math.max(0, Number(getBuildingsOnPlanet(id)[key] || 0)) * 10000;
}
function radioactiveStoredAmount(storage) { return ['uranium','processedUranium','nuclearFuel','ionium'].reduce((sum, key) => sum + Math.max(0, Number(storage[key] || 0)), 0); }
function refreshPlanetStorageDisplay() {
  const storageContent = document.querySelector('.planet-storage-content');
  if (!storageContent || !state.selected || !bodies[state.selected]) return;

  // Offene Unterbereiche (Flüssiglager, Radioaktivstofflager, Luxusgüter) beim
  // Aktualisieren offen lassen, damit die Ansicht beim Spielen nicht zuklappt.
  const openDetails = Array.from(storageContent.querySelectorAll('details')).map((details, index) => ({
    index,
    open: details.open
  }));
  storageContent.innerHTML = formatStorage(state.selected);
  storageContent.querySelectorAll('details').forEach((details, index) => {
    const previous = openDetails.find(item => item.index === index);
    if (previous) details.open = previous.open;
  });
}

function formatStorage(id) {
  const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  const st = mode === 'orbit' ? getOrbitStorage(id) : getPlanetStorage(id);
  const keys = ['stone','ice','coal','crudeOil','polymers','rubber','plastics','wood','biomass','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','steel','helium3','chips','bauxite','aluminiumOxide','aluminium','titanOre','processedTitan','titanium','nickelOre','graphite','water','grain','vegetables','food','algaeBiomass','cocoaBeans','chocolate'];
  const rows = keys.filter(k => Number(st[k] || 0) > 0.000001).map(k => `<div class="stat"><span>${resourceIcons[k] || ''} ${resourceNames[k] || k}</span><strong>${k === 'water' ? Number(st[k]).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L' : formatTons(st[k])}</strong></div>`);
  const gasCapacity = gasCarbonStorageCapacity(id, mode);
  const gasKeys = ATMOSPHERIC_STORAGE_GASES;
  const gasUsed = gasKeys.reduce((sum, key) => sum + Math.max(0, Number(st[key] || 0)), 0);
  const gasPct = gasCapacity > 0 ? Math.min(100, gasUsed / (gasCapacity * gasKeys.length) * 100) : 0;
  const gasRow = `<details class="planet-resource-section gas-storage-section"><summary>🌫️ Gaslager <strong>${formatTons(gasUsed)} / ${formatTons(gasCapacity * gasKeys.length)}</strong></summary><div class="planet-resource-list"><small class="hint">Je Gas 100.000 t Kapazität pro gebautem Gaslager · ${mode === 'orbit' ? 'Orbit' : 'Planetenoberfläche'}</small><div class="liquid-storage-meter"><div class="liquid-storage-meter-label"><span>Gesamtauslastung</span><strong>${gasPct.toFixed(1)} %</strong></div><div class="liquid-storage-progress"><i style="width:${gasPct}%"></i></div></div>${gasKeys.map(key => `<div class="stat"><span>${ATMOSPHERE_RELEASE_GASES[key].icon} ${ATMOSPHERE_RELEASE_GASES[key].label}</span><strong>${formatAtmosphereTons(Number(st[key] || 0))} / ${formatAtmosphereTons(gasCapacity)}</strong></div>`).join('')}${gasCapacity <= 0 ? '<p class="hint">Noch kein Gaslager an diesem Standort gebaut. Atmosphärische Gase können hier nicht gelagert werden.</p>' : ''}</div></details>`;
  const luxury = `<details class="planet-resource-section luxury-storage-section"><summary>💎 Luxusgüter</summary><div class="planet-resource-list"><div class="stat"><span>🚗 Fahrzeuge</span><strong>${formatTons(Number(st.vehicles || 0))}</strong></div><div class="stat"><span>🍫 Schokolade</span><strong>${formatTons(Number(st.chocolate || 0))}</strong></div><div class="stat"><span>🛋️ Luxusmöbel</span><strong>${formatTons(Number(st.luxuryFurniture || 0))}</strong></div></div></details>`;
  const radioactiveCapacity = radioactiveStorageCapacity(id, mode);
  const radioactiveUsed = radioactiveStoredAmount(st);
  const radioactiveSummary = `<details class="planet-resource-section radioactive-storage-section"><summary>☢️ Radioaktivstofflager <strong>${formatTons(radioactiveUsed)} / ${formatTons(radioactiveCapacity)}</strong></summary><div class="planet-resource-list"><small class="hint">Ionium und andere radioaktive Stoffe sind in diesem Lager abgeschirmt. Kapazität: 10.000 t je gebautem Radioaktivstofflager · ${mode === 'orbit' ? 'Orbit' : 'Oberfläche'}</small>${['uranium','processedUranium','nuclearFuel','ionium'].map(k => `<div class="stat"><span>${resourceIcons[k] || '☢️'} ${resourceNames[k] || k}</span><strong>${formatTons(Number(st[k] || 0))}</strong></div>`).join('')}${radioactiveCapacity <= 0 ? '<p class="hint">Noch kein Radioaktivstofflager an diesem Standort gebaut.</p>' : ''}</div></details>`;
  const fuel = liquidFuelAmount(id, mode);
  const fuelCapacity = liquidTankCapacity(id, mode);
  const fuelPct = fuelCapacity > 0 ? Math.min(100, fuel / fuelCapacity * 100) : 0;
  const fuelRow = `<details class="planet-resource-section liquid-storage-section"><summary>🛢️ Flüssiglager <strong>${fuel.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${fuelCapacity.toLocaleString('de-DE')} L</strong></summary><div class="planet-resource-list"><div class="liquid-storage-meter"><div class="liquid-storage-meter-label"><span>Füllstand</span><strong>${fuelPct.toFixed(1)} %</strong></div><div class="liquid-storage-progress"><i style="width:${fuelPct}%"></i></div></div><div class="stat liquid-storage-status"><span>⛽ Treibstoff</span><strong>${fuel.toLocaleString('de-DE', { maximumFractionDigits: 2 })} L</strong></div><div class="stat"><span>Tankkapazität</span><strong>${fuelCapacity.toLocaleString('de-DE')} L</strong></div><div class="hint liquid-storage-hint">${fuelCapacity > 0 ? 'Flüssiglager an diesem Standort vorhanden.' : 'Noch kein Flüssiglager gebaut.'}</div></div></details>`;
  return `${rows.length ? rows.join('') : '<p class="hint">Keine normalen Rohstoffe im Lager.</p>'}${gasRow}${fuelRow}${radioactiveSummary}${luxury}`;
}

const housingBuildingKeys = ['residentialHouse', 'mediumResidentialHouse', 'residentialComplex', 'habitat'];
const housingCapacities = { residentialHouse: 100, mediumResidentialHouse: 150, residentialComplex: 500, habitat: 150 };
const housingCosts = {
  residentialHouse: { steel: 1900, buildingMaterials: 900 },
  mediumResidentialHouse: { steel: 180, buildingMaterials: 250, glass: 40 },
  residentialComplex: { steel: 600, buildingMaterials: 800, glass: 150 },
  habitat: { steel: 200, buildingMaterials: 250 }
};

// Kolonisten-Atmosphärenregeln: normale Wohngebäude benötigen mindestens
// 1,05 bar und 18–25 % Sauerstoff. Habitate sind von der Außenatmosphäre unabhängig.
const COLONIST_ATMOSPHERE_MIN_PRESSURE = 1.05;
const COLONIST_HABITAT_MIN_PRESSURE = 0.9;
const COLONIST_OXYGEN_MIN_PERCENT = 18;
const COLONIST_OXYGEN_MAX_PERCENT = 25;

function getColonistAtmosphereStatus(id) {
  if (!id || id === 'sun' || !bodies[id]) {
    return { pressure: 0, oxygenPercent: 0, breathable: false, normalHousingAllowed: false, habitatAllowed: false, label: 'Kein bewohnbarer Planet' };
  }
  const atmosphere = ensurePlanetAtmosphere(id);
  const pressure = atmosphericPressureFromMass(id, atmosphere?.totalGas || 0);
  const gases = atmosphere?.gases || {};
  const total = Math.max(0, Number(atmosphere?.totalGas) || 0);
  const oxygen = Math.max(0, Number(gases.oxygen ?? atmosphere?.oxygen) || 0);
  const oxygenPercent = total > 0 ? oxygen / total * 100 : 0;
  const oxygenOk = oxygenPercent >= COLONIST_OXYGEN_MIN_PERCENT && oxygenPercent <= COLONIST_OXYGEN_MAX_PERCENT;
  const normalHousingAllowed = pressure >= COLONIST_ATMOSPHERE_MIN_PRESSURE && oxygenOk;
  const habitatAllowed = pressure >= COLONIST_HABITAT_MIN_PRESSURE;
  let label = normalHousingAllowed
    ? 'Sauerstoffanteil und Druck geeignet – normale Wohngebäude freigegeben.'
    : pressure < COLONIST_HABITAT_MIN_PRESSURE
      ? 'Kritisch: unter 0,9 bar. Kolonisten benötigen Habitate mit eigener Lebenserhaltung.'
      : !oxygenOk
        ? 'Sauerstoffanteil ungeeignet. Normale Wohngebäude bleiben gesperrt; Habitate sind erforderlich.'
        : 'Druck unter 1,05 bar. Kolonisten dürfen nur in Habitaten leben.';
  return { pressure, oxygenPercent, breathable: oxygenOk, normalHousingAllowed, habitatAllowed, label };
}
function canHouseColonistInBuilding(id, buildingKey) {
  return buildingKey === 'habitat' || getColonistAtmosphereStatus(id).normalHousingAllowed;
}

function ensureColonistData(id) {
  if (!bodies[id] || id === 'sun') return null;
  const body = bodies[id];
  body.colonists = Math.max(0, Math.floor(Number(body.colonists) || 0));
  body.colonistGrowthPercent = Math.max(0, Math.min(100, Number.isFinite(Number(body.colonistGrowthPercent)) ? Number(body.colonistGrowthPercent) : 100));
  body.colonistGrowthAccumulator = Math.max(0, Number(body.colonistGrowthAccumulator) || 0);
  if (body.vehicleLuxuryEnabled === undefined) body.vehicleLuxuryEnabled = true;
  if (body.chocolateLuxuryEnabled === undefined) body.chocolateLuxuryEnabled = true;
  if (body.furnitureLuxuryEnabled === undefined) body.furnitureLuxuryEnabled = true;
  body.colonistHousing ||= {};
  const bld = getBuildingsOnPlanet(id);
  for (const key of housingBuildingKeys) {
    const count = Math.max(0, Math.floor(Number(bld[key]) || 0));
    if (!Array.isArray(body.colonistHousing[key])) body.colonistHousing[key] = [];
    body.colonistHousing[key] = body.colonistHousing[key].slice(0, count);
    while (body.colonistHousing[key].length < count) body.colonistHousing[key].push(0);
    body.colonistHousing[key] = body.colonistHousing[key].map(v => Math.max(0, Math.min(housingCapacities[key], Math.floor(Number(v) || 0))));
  }
  let assigned = housingBuildingKeys.reduce((sum, key) => sum + body.colonistHousing[key].reduce((a, n) => a + n, 0), 0);
  // Migration of older saves or a future arrival event: assign any unallocated residents to available housing.
  let unassigned = Math.max(0, body.colonists - assigned);
  for (const key of housingBuildingKeys) {
    for (let i = 0; i < body.colonistHousing[key].length && unassigned > 0; i++) {
      const room = housingCapacities[key] - body.colonistHousing[key][i];
      const moved = Math.min(room, unassigned);
      body.colonistHousing[key][i] += moved;
      unassigned -= moved;
    }
  }
  assigned = housingBuildingKeys.reduce((sum, key) => sum + body.colonistHousing[key].reduce((a, n) => a + n, 0), 0);
  if (assigned < body.colonists) body.colonists = assigned;
  return body;
}
function colonistsOnPlanet(id) { return Number(ensureColonistData(id)?.colonists || 0); }
function totalColonists() { return Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + colonistsOnPlanet(id), 0); }
function colonistIncomeRate() { return totalColonists() * 0.0002; }
function housingCapacity(id) {
  const bld = getBuildingsOnPlanet(id);
  return housingBuildingKeys.reduce((sum, key) => sum + Math.max(0, Number(bld[key]) || 0) * housingCapacities[key], 0);
}
function housingOccupied(id) { return colonistsOnPlanet(id); }
function colonistsReservedForArrival(id) { return rockets.reduce((sum, rocket) => { const reserving = rocket.type === 'colonistShuttle' && rocket.to === id && !rocket.passengersDelivered && ['outbound', 'orbit', 'returning'].includes(rocket.status); return sum + (reserving ? Math.max(0, Number(rocket.passengers) || 0) : 0); }, 0); }
function housingFree(id) { return Math.max(0, housingCapacity(id) - housingOccupied(id) - colonistsReservedForArrival(id)); }
function addColonistsFromShuttle(id, amount) {
  const body = ensureColonistData(id);
  if (!body) return 0;
  let remaining = Math.min(Math.max(0, Math.floor(Number(amount) || 0)), Math.max(0, housingCapacity(id) - body.colonists));
  const requested = remaining;
  for (const key of housingBuildingKeys) {
    if (!canHouseColonistInBuilding(id, key)) continue;
    const slots = body.colonistHousing[key];
    for (let i = 0; i < slots.length && remaining > 0; i++) {
      const moved = Math.min(remaining, housingCapacities[key] - slots[i]);
      if (moved > 0) { slots[i] += moved; remaining -= moved; body.colonists += moved; }
    }
  }
  return requested - remaining;
}
function addColonistToHousing(id) {
  const body = ensureColonistData(id);
  if (!body || housingFree(id) < 1) return false;
  for (const key of housingBuildingKeys) {
    if (!canHouseColonistInBuilding(id, key)) continue;
    const slots = body.colonistHousing[key];
    for (let i = 0; i < slots.length; i++) {
      if (slots[i] < housingCapacities[key]) {
        slots[i]++;
        body.colonists++;
        return true;
      }
    }
  }
  return false;
}
function removeColonistsFromHousing(id, amount) {
  const body = ensureColonistData(id);
  if (!body) return 0;
  let remaining = Math.min(body.colonists, Math.max(0, Math.floor(Number(amount) || 0)));
  const requested = remaining;
  for (const key of [...housingBuildingKeys].reverse()) {
    const slots = body.colonistHousing[key];
    for (let i = slots.length - 1; i >= 0 && remaining > 0; i--) {
      const removed = Math.min(slots[i], remaining);
      slots[i] -= removed;
      remaining -= removed;
    }
  }
  body.colonists = Math.max(0, body.colonists - (requested - remaining));
  return requested - remaining;
}
function processColonists(id, delta) {
  const body = ensureColonistData(id);
  if (!body || body.colonists <= 0 || delta <= 0) return;
  const storage = getPlanetStorage(id);
  const colonistIncome = body.colonists * 0.0002 * delta;
  state.gunniDollar = Math.max(0, Number(state.gunniDollar) || 0) + colonistIncome;
  recordCompanyFinance('income', colonistIncome, 'Kolonisten-Einnahmen', false);
  const foodNeed = body.colonists * 0.00001 * delta; // t Lebensmittel/s je Kolonist
  const waterNeedLitres = body.colonists * 0.01 * delta; // 0,00001 t Wasser = 0,01 Liter
  const foodAvailable = Math.max(0, Number(storage.food) || 0);
  const waterAvailable = Math.max(0, Number(storage.water) || 0);
  storage.food = Math.max(0, foodAvailable - Math.min(foodAvailable, foodNeed));
  storage.water = Math.max(0, waterAvailable - Math.min(waterAvailable, waterNeedLitres));
  const vehicleStockBefore = Math.max(0, Number(storage.vehicles || 0));
  const vehicleLuxuryActive = body.vehicleLuxuryEnabled !== false && body.colonists > 0 && vehicleStockBefore > 1e-12;
  let luxurySeconds = 0;
  if (vehicleLuxuryActive) {
    const vehicleRate = body.colonists * 0.00002;
    luxurySeconds = vehicleRate > 0 ? Math.min(delta, vehicleStockBefore / vehicleRate) : 0;
    storage.vehicles = Math.max(0, vehicleStockBefore - vehicleRate * luxurySeconds);
  }
  const chocolateStockBefore = Math.max(0, Number(storage.chocolate || 0));
  const chocolateLuxuryActive = body.chocolateLuxuryEnabled !== false && body.colonists > 0 && chocolateStockBefore > 1e-12;
  let chocolateLuxurySeconds = 0;
  if (chocolateLuxuryActive) {
    const chocolateRate = body.colonists * 0.00002;
    chocolateLuxurySeconds = chocolateRate > 0 ? Math.min(delta, chocolateStockBefore / chocolateRate) : 0;
    storage.chocolate = Math.max(0, chocolateStockBefore - chocolateRate * chocolateLuxurySeconds);
  }
  const furnitureStockBefore = Math.max(0, Number(storage.luxuryFurniture || 0));
  const furnitureLuxuryActive = body.furnitureLuxuryEnabled !== false && body.colonists > 0 && furnitureStockBefore > 1e-12;
  let furnitureLuxurySeconds = 0;
  if (furnitureLuxuryActive) {
    const furnitureRate = body.colonists * 0.00002;
    furnitureLuxurySeconds = furnitureRate > 0 ? Math.min(delta, furnitureStockBefore / furnitureRate) : 0;
    storage.luxuryFurniture = Math.max(0, furnitureStockBefore - furnitureRate * furnitureLuxurySeconds);
  }
  const supplied = foodAvailable + 1e-12 >= foodNeed && waterAvailable + 1e-12 >= waterNeedLitres && Number(storage.food || 0) > 1e-12 && Number(storage.water || 0) > 1e-12;
  if (!supplied || body.colonistGrowthPercent <= 0 || housingFree(id) <= 0) {
    body.colonistGrowthAccumulator = 0;
    return;
  }
  // Der Fahrzeugbonus wirkt auf die Wachstumsrate (Multiplikator 1,10), nicht als separate Zeitverkürzung.
  const baseGrowthPerSecond = (body.colonistGrowthPercent / 100) / 30;
  const vehicleBonusSeconds = vehicleLuxuryActive ? luxurySeconds * 0.10 : 0;
  const chocolateBonusSeconds = chocolateLuxuryActive ? chocolateLuxurySeconds * 0.08 : 0;
  const furnitureBonusSeconds = furnitureLuxuryActive ? furnitureLuxurySeconds * 0.09 : 0;
  body.colonistGrowthAccumulator += baseGrowthPerSecond * (delta + vehicleBonusSeconds + chocolateBonusSeconds + furnitureBonusSeconds);
  while (body.colonistGrowthAccumulator >= 1 && housingFree(id) > 0) {
    if (!addColonistToHousing(id)) break;
    body.colonistGrowthAccumulator -= 1;
  }
  if (housingFree(id) <= 0) body.colonistGrowthAccumulator = 0;
}

function housingResidentsInDemolishedBuildings(id, key, amount) {
  const body = ensureColonistData(id);
  if (!body || !housingBuildingKeys.includes(key)) return 0;
  const slots = body.colonistHousing[key] || [];
  return slots.slice(Math.max(0, slots.length - amount)).reduce((sum, n) => sum + Number(n || 0), 0);
}
function addColonistsToPlanet(id, amount) {
  const body = ensureColonistData(id);
  if (!body) return 0;
  let added = 0;
  const requested = Math.max(0, Math.floor(Number(amount) || 0));
  while (added < requested && housingFree(id) > 0) {
    if (!addColonistToHousing(id)) break;
    added++;
  }
  if (added) { saveGame(false); renderTopResources(); if (!document.querySelector('#colonists-panel')?.hidden) renderColonistsPanel(); }
  return added;
}

function ironProduction(id = state.selected) {
  const available = Number(bodies[id]?.resources?.iron || 0);
  return available > 0 ? getBuildingsOnPlanet(id).ironMine * 0.1 : 0;
}
function steelProduction(id = state.selected) { return getBuildingsOnPlanet(id).steelworks * 0.2; }
function ironUse(id = state.selected) { return getBuildingsOnPlanet(id).steelworks * 0.2; }
function siliconProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).siliconMine || 0) * 0.3; }
function siliconUse(id = state.selected) { return 0; }
function lithiumProduction(id = state.selected) { return getBuildingsOnPlanet(id).lithiumMine * 0.05; }
function copperProduction(id = state.selected) { return getBuildingsOnPlanet(id).copperMine * 0.05; }
function copperSmeltingProduction(id = state.selected) { return getBuildingsOnPlanet(id).copperSmelter * 0.08; }
function copperSmeltingUse(id = state.selected) { return getBuildingsOnPlanet(id).copperSmelter * 0.10; }
function lithiumRefineryLithiumUse(id = state.selected) { return getBuildingsOnPlanet(id).lithiumRefinery * 0.3; }
function lithiumRefineryCopperUse(id = state.selected) { return getBuildingsOnPlanet(id).lithiumRefinery * 0.3; }
function batteryProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).lithiumRefinery || 0) * 0.1; }
function batteryProductionChain(id = state.selected) { return { lithium: lithiumRefineryLithiumUse(id), copper: lithiumRefineryCopperUse(id), batteries: batteryProduction(id) }; }
function buildingMaterialsStoneUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).buildingMaterialsFactory || 0) * 0.20; }
function buildingMaterialsProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).buildingMaterialsFactory || 0) * 0.15; }
function machineFactorySteelUse(id = state.selected) { return getBuildingsOnPlanet(id).machineFactory * 0.10; }
function machineFactoryCopperUse(id = state.selected) { return getBuildingsOnPlanet(id).machineFactory * 0.05; }
function machineProduction(id = state.selected) { return getBuildingsOnPlanet(id).machineFactory * 0.05; }
function glassFactorySiliconUse(id = state.selected) { return getBuildingsOnPlanet(id).glassFactory * 0.20; }
function glassFactoryStoneUse(id = state.selected) { return getBuildingsOnPlanet(id).glassFactory * 0.10; }
function glassProduction(id = state.selected) { return getBuildingsOnPlanet(id).glassFactory * 0.15; }
function helium3Production(id = state.selected) { return Number(getBuildingsOnPlanet(id).heliumExtractor || 0) * 0.1; }
function fusionHelium3Use(id = state.selected) { return Number(getBuildingsOnPlanet(id).fusionReactor || 0) * 0.02; }
function fusionElectricityProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).fusionReactor || 0) * 50; }
function solarElectricityProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).solarPlant || 0) * 20; }
function hydroelectricWaterProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).hydroelectricPlant || 0) * 0.1; }
function greenhouseWaterUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).greenhouse || 0) * 0.01; }
function greenhouseCropProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).greenhouse || 0) * 0.2; }
function foodFactoryGrainUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).foodFactory || 0) * 0.1; }
function foodFactoryWaterUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).foodFactory || 0) * 0.05; }
function foodFactoryProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).foodFactory || 0) * 0.08; }
function foodFactoryElectricityUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).foodFactory || 0) * 5; }
function newBuildingPowerFactor(id = state.selected) {
  const b = getBuildingsOnPlanet(id);
  const demand = Number(b.hydroelectricPlant || 0) * 3 + Number(b.greenhouse || 0) * 2 + Number(b.cocoaPlantation || 0) * 5 + Number(b.chocolateFactory || 0) * 5 + Number(b.luxuryFurnitureFactory || 0) * 5 + Number(b.forester || 0) * 2 + Number(b.woodcutter || 0) * 1 + Number(b.nickelMine || 0) * 1 + Number(b.graphiteMine || 0) * 5 + Number(b.syntheticGraphitePlant || 0) * 10 + foodFactoryElectricityUse(id) + crudeOilElectricityUse(id) + vehicleFactoryElectricityUse(id);
  // Bei Strommangel wird die verfügbare Leistung anteilig auf strompflichtige
  // Gebäude verteilt, statt sämtliche Produktion abrupt auf null zu setzen.
  if (demand <= 0) return 1;
  return Math.max(0, Math.min(1, electricityProduction(id) / demand));
}
function solarSatelliteElectricityProduction() { return Number(bodies.sun?.buildings?.solarSatellite || 0) * 10000; }
function baseElectricityProduction(id = state.selected) {
  // Lokale Stromnetze: Nur Kraftwerke auf diesem Planeten versorgen seine Gebäude.
  const b = getBuildingsOnPlanet(id);
  return Number(b.coalPowerPlant || 0) * 20
    + fusionElectricityProduction(id)
    + solarElectricityProduction(id)
    + nuclearReactorElectricityProduction(id);
}
function batteryDischargePower(id = state.selected) {
  const count = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
  if (!count) return 0;
  const d = ensureBatteryStorageData(id);
  if (d.mode === 'manual' && !['auto','discharge'].includes(d.manualAction)) return 0;
  const capacity = count * 100;
  const reserve = capacity * d.reservePercent / 100;
  const availableMWh = Math.max(0, d.chargeMWh - reserve);
  if (availableMWh <= 0) return 0;
  const deficit = Math.max(0, electricityConsumption(id) - baseElectricityProduction(id));
  return Math.min(count * 10, deficit, availableMWh * 0.9 * 3600);
}
function electricityProduction(id = state.selected) {
  return baseElectricityProduction(id) + batteryDischargePower(id);
}
function electricityProductionBreakdown(id = state.selected) {
  const b = getBuildingsOnPlanet(id);
  return [
    { key: 'coalPowerPlant', name: 'Kohlekraftwerk', icon: '🏭', mw: Number(b.coalPowerPlant || 0) * 20 },
    { key: 'solarPlant', name: 'Solaranlage', icon: '☀️', mw: solarElectricityProduction(id) },
    { key: 'fusionReactor', name: 'Fusionsreaktor', icon: '☢️', mw: fusionElectricityProduction(id) },
    { key: 'nuclearReactor', name: 'Kernkraftwerk', icon: '⚛️', mw: nuclearReactorElectricityProduction(id) }
  ].concat([{ key: 'batteryStorage', name: 'Batteriespeicher (Entladung)', icon: '🔋', mw: batteryDischargePower(id) }]).filter(source => source.mw > 0);
}
function electricityConsumptionBreakdown(id = state.selected) {
  const b = getBuildingsOnPlanet(id);
  return [
    { name: 'Wasserkraftwerk', count: Number(b.hydroelectricPlant || 0), perBuilding: 3 },
    { name: 'Gewächshaus', count: Number(b.greenhouse || 0), perBuilding: 2 },
    { name: 'Kakao-Plantage', count: Number(b.cocoaPlantation || 0), perBuilding: 5 },
    { name: 'Schokoladenfabrik', count: Number(b.chocolateFactory || 0), perBuilding: 5 },
    { name: 'Luxusmöbel-Fabrik', count: Number(b.luxuryFurnitureFactory || 0), perBuilding: 5 },
    { name: 'Förster', count: Number(b.forester || 0), perBuilding: 2 },
    { name: 'Holzfäller', count: Number(b.woodcutter || 0), perBuilding: 1 },
    { name: 'Nickelmine', count: Number(b.nickelMine || 0), perBuilding: 1 },
    { name: 'Graphitmine', count: Number(b.graphiteMine || 0), perBuilding: 5 },
    { name: 'Synthetische Graphitproduktion', count: Number(b.syntheticGraphitePlant || 0), perBuilding: 10 },
    { name: 'Lebensmittelfabrik', count: Number(b.foodFactory || 0), perBuilding: 5 },
    { name: 'Rohölpumpe', count: Number(b.crudeOilPump || 0), perBuilding: 2 },
    { name: 'Fahrzeugfabrik', count: vehicleFactoryCount(id), perBuilding: 4 }
  ].filter(item => item.count > 0).map(item => ({ ...item, mw: item.count * item.perBuilding }));
}
function electricityConsumption(id = state.selected) {
  return electricityConsumptionBreakdown(id).reduce((total, item) => total + item.mw, 0);
}
function formatElectricPower(mw) {
  const value = Number(mw) || 0;
  const abs = Math.abs(value);
  if (abs >= 1000000) return `${(value / 1000000).toLocaleString('de-DE', { maximumFractionDigits: 3 })} TW`;
  if (abs >= 1000) return `${(value / 1000).toLocaleString('de-DE', { maximumFractionDigits: 3 })} GW`;
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} MW`;
}
function ensureBatteryStorageData(id = state.selected) {
  if (!state.batteryStorageData || typeof state.batteryStorageData !== 'object') state.batteryStorageData = {};
  if (!state.batteryStorageData[id] || typeof state.batteryStorageData[id] !== 'object') {
    state.batteryStorageData[id] = { chargeMWh: 0, mode: 'hybrid', reservePercent: 30, manualAction: 'auto' };
  }
  const d = state.batteryStorageData[id];
  d.chargeMWh = Math.max(0, Number(d.chargeMWh) || 0);
  d.mode = ['automatic','hybrid','manual'].includes(d.mode) ? d.mode : 'hybrid';
  d.reservePercent = Math.max(0, Math.min(90, Number(d.reservePercent ?? 30) || 0));
  d.manualAction = ['auto','charge','discharge','hold'].includes(d.manualAction) ? d.manualAction : 'auto';
  const count = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
  d.chargeMWh = Math.min(d.chargeMWh, count * 100);
  return d;
}
function updateBatteryStorage(id, deltaSeconds) {
  const count = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
  if (!count || !(deltaSeconds > 0)) return;
  const d = ensureBatteryStorageData(id);
  const capacity = count * 100;
  const reserve = capacity * d.reservePercent / 100;
  const balance = baseElectricityProduction(id) - electricityConsumption(id);
  const maxChargeMW = count * 10;
  const maxDischargeMW = count * 10;
  const canAutoCharge = d.mode !== 'manual' || ['auto','charge'].includes(d.manualAction);
  const canAutoDischarge = d.mode !== 'manual' || ['auto','discharge'].includes(d.manualAction);
  if ((d.mode === 'manual' && d.manualAction === 'hold') || balance === 0) return;
  if (balance > 0 && canAutoCharge && d.chargeMWh < capacity) {
    const inputMW = Math.min(balance, maxChargeMW);
    const inputMWh = inputMW * deltaSeconds / 3600;
    d.chargeMWh = Math.min(capacity, d.chargeMWh + inputMWh * 0.9);
  } else if (balance < 0 && canAutoDischarge && d.chargeMWh > reserve) {
    const outputMW = Math.min(-balance, maxDischargeMW);
    const outputMWh = outputMW * deltaSeconds / 3600;
    const availableMWh = Math.max(0, d.chargeMWh - reserve);
    const energyUsed = Math.min(availableMWh, outputMWh / 0.9);
    d.chargeMWh = Math.max(reserve, d.chargeMWh - energyUsed);
  }
}
function batteryStorageControlsHtml(id) {
  const count = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
  if (!count) return '';
  const d = ensureBatteryStorageData(id);
  const capacity = count * 100;
  const charge = Math.min(capacity, d.chargeMWh);
  const pct = capacity ? charge / capacity * 100 : 0;
  const modeLabels = { automatic: 'Automatisch', hybrid: 'Hybrid', manual: 'Manuell' };
  return `<h4>🔋 Batteriespeicher</h4>
    <div class="battery-storage-controls">
      <div class="stat"><span>Gespeicherte Energie</span><strong>${charge.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${capacity} MWh (${pct.toFixed(1)} %)</strong></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div class="stat"><span>Reserve</span><strong>${d.reservePercent} % · ${(capacity*d.reservePercent/100).toLocaleString('de-DE')} MWh</strong></div>
      <div class="stat"><span>Max. Lade-/Entladeleistung</span><strong>${count*10} MW / ${count*10} MW</strong></div>
      <label class="battery-control-label">Betriebsmodus
        <select data-battery-setting="mode" data-planet="${id}">
          <option value="automatic" ${d.mode==='automatic'?'selected':''}>Automatisch</option>
          <option value="hybrid" ${d.mode==='hybrid'?'selected':''}>Hybrid</option>
          <option value="manual" ${d.mode==='manual'?'selected':''}>Manuell</option>
        </select>
      </label>
      <label class="battery-control-label">Mindestladung
        <select data-battery-setting="reservePercent" data-planet="${id}">
          ${[0,10,20,30,40,50,60,70,80,90].map(v=>`<option value="${v}" ${d.reservePercent===v?'selected':''}>${v} %</option>`).join('')}
        </select>
      </label>
      ${d.mode==='manual'?`<label class="battery-control-label">Manuelle Steuerung
        <select data-battery-setting="manualAction" data-planet="${id}">
          <option value="auto" ${d.manualAction==='auto'?'selected':''}>Automatisch nach Strombilanz</option>
          <option value="charge" ${d.manualAction==='charge'?'selected':''}>Nur laden</option>
          <option value="discharge" ${d.manualAction==='discharge'?'selected':''}>Nur entladen</option>
          <option value="hold" ${d.manualAction==='hold'?'selected':''}>Anhalten</option>
        </select>
      </label>`:''}
    </div>`;
}
document.addEventListener('change', event => {
  const control = event.target.closest('[data-battery-setting]');
  if (!control) return;
  const id = control.dataset.planet;
  const d = ensureBatteryStorageData(id);
  const setting = control.dataset.batterySetting;
  if (setting === 'reservePercent') d.reservePercent = Math.max(0, Math.min(90, Number(control.value) || 0));
  else if (setting === 'mode' && ['automatic','hybrid','manual'].includes(control.value)) d.mode = control.value;
  else if (setting === 'manualAction' && ['auto','charge','discharge','hold'].includes(control.value)) d.manualAction = control.value;
  saveGame(false);
  renderInfo();
});
function renderElectricityPanel(id = state.selected) {
  const production = electricityProduction(id);
  const consumption = electricityConsumption(id);
  const balance = production - consumption;
  const sources = electricityProductionBreakdown(id);
  const consumers = electricityConsumptionBreakdown(id);
  const sourceRows = sources.length
    ? sources.map(item => `<div class="stat"><span>${item.icon} ${item.name}</span><strong>${formatElectricPower(item.mw)}</strong></div>`).join('')
    : '<p class="hint">Noch keine Stromerzeugung auf diesem Planeten.</p>';
  const consumerRows = consumers.length
    ? consumers.map(item => `<div class="stat"><span>${item.name} · ${item.count} Gebäude</span><strong>${formatElectricPower(item.mw)}</strong></div>`).join('')
    : '<p class="hint">Aktuell kein erfasster Stromverbrauch.</p>';
  const status = balance < 0 ? 'bad' : 'good';
  const statusText = balance < 0 ? 'Strommangel' : balance === 0 ? 'Ausgeglichen' : 'Überschuss';
  return `<details class="planet-electricity-panel">
    <summary>⚡ Stromversorgung <span class="${status}">${formatElectricPower(balance)}</span></summary>
    <div class="planet-electricity-content">
      <div class="electricity-summary-grid">
        <div class="electricity-summary-card"><span>Erzeugung</span><strong class="good">${formatElectricPower(production)}</strong></div>
        <div class="electricity-summary-card"><span>Verbrauch</span><strong>${formatElectricPower(consumption)}</strong></div>
        <div class="electricity-summary-card"><span>Bilanz</span><strong class="${status}">${balance > 0 ? '+' : ''}${formatElectricPower(balance)}</strong></div>
        <div class="electricity-summary-card"><span>Status</span><strong class="${status}">${statusText}</strong></div>
      </div>
      <h4>⚡ Stromerzeugung nach Quelle</h4>${sourceRows}
      <h4>🔌 Stromverbrauch nach Gebäude</h4>${consumerRows}\n      ${batteryStorageControlsHtml(id)}
      <p class="hint electricity-note">Eigenes Stromnetz für ${bodies[id]?.name || id}. Strom anderer Planeten und Solar-Satelliten im Sonnenorbit werden nicht eingerechnet.</p>
    </div>
  </details>`;
}
function coalPowerUse(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 0.0002; }
function crudeOilProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 0.01; }
function crudeOilElectricityUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 2; }
function polymerProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).polymerFactory || 0) * 0.0005; }
function polymerOilUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).polymerFactory || 0) * 0.001; }
function rubberProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).rubberFactory || 0) * 0.1; }
function rubberOilUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).rubberFactory || 0) * 0.1; }
function syntheticGraphiteOilUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).syntheticGraphitePlant || 0) * 0.7; }
function plasticProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).plasticFactory || 0) * 0.05; }
function plasticRubberUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).plasticFactory || 0) * 0.1; }
function luxuryFurnitureFactoryCount(id = state.selected) { return Number(getBuildingsOnPlanet(id).luxuryFurnitureFactory || 0); }
function luxuryFurnitureFactoryProduction(id = state.selected) { return luxuryFurnitureFactoryCount(id) * 0.02; }
function luxuryFurnitureFactoryPlasticUse(id = state.selected) { return luxuryFurnitureFactoryCount(id) * 0.03; }
function luxuryFurnitureFactoryWoodUse(id = state.selected) { return luxuryFurnitureFactoryCount(id) * 0.006; }
function luxuryFurnitureFactoryElectricityUse(id = state.selected) { return luxuryFurnitureFactoryCount(id) * 5; }
function vehicleFactoryCount(id = state.selected) { return Number(getBuildingsOnPlanet(id).vehicleFactory || 0); }
function vehicleFactorySteelUse(id = state.selected) { return vehicleFactoryCount(id) * 0.1; }
function vehicleFactoryPlasticUse(id = state.selected) { return vehicleFactoryCount(id) * 0.1; }
function vehicleFactoryRubberUse(id = state.selected) { return vehicleFactoryCount(id) * 0.05; }
function vehicleFactoryGlassUse(id = state.selected) { return vehicleFactoryCount(id) * 0.3; }
function vehicleFactoryChipUse(id = state.selected) { return vehicleFactoryCount(id) * 0.2; }
function vehicleFactoryProduction(id = state.selected) { return vehicleFactoryCount(id) * 0.003; }
function vehicleFactoryElectricityUse(id = state.selected) { return vehicleFactoryCount(id) * 4; }
function electronicsFactoryCopperUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).electronicsFactory || 0) * 0.05; }
function electronicsFactoryChipUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).electronicsFactory || 0) * 0.07; }
function electronicsFactoryLithiumUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).electronicsFactory || 0) * 0.02; }
function electronicsProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).electronicsFactory || 0) * 0.03; }
function uraniumProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).uraniumMine || 0) * 0.01; }
function processedUraniumProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).uraniumProcessingPlant || 0) * 0.015; }
function processedUraniumUraniumUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).uraniumProcessingPlant || 0) * 0.02; }
function nuclearFuelProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).nuclearFuelPlant || 0) * 0.008; }
function nuclearFuelProcessedUraniumUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).nuclearFuelPlant || 0) * 0.01; }
function nuclearReactorNuclearFuelUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).nuclearReactor || 0) * 0.01; }
function nuclearReactorElectricityProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).nuclearReactor || 0) * 1000; }
function chipFactoryLithiumUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).chipFactory || 0) * 0.1; }
function chipFactoryCopperUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).chipFactory || 0) * 0.3; }
function chipProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).chipFactory || 0) * 0.015; }

function orbitalSolarSailCount(planetId) {
  const body = bodies[planetId];
  if (!body) return 0;
  if (!body.orbitBuildings || typeof body.orbitBuildings !== 'object') body.orbitBuildings = {};
  body.orbitBuildings.solarSail = Math.max(0, Number(body.orbitBuildings.solarSail) || 0);
  return body.orbitBuildings.solarSail;
}
function orbitalWarmingSailCount(planetId) {
  const body = bodies[planetId];
  if (!body) return 0;
  if (!body.orbitBuildings || typeof body.orbitBuildings !== 'object') body.orbitBuildings = {};
  body.orbitBuildings.warmingSail = Math.max(0, Number(body.orbitBuildings.warmingSail) || 0);
  return body.orbitBuildings.warmingSail;
}
function mercuryTemperature() { return Math.max(-273, 430 - (Number(getBuildingsOnPlanet('mercury').solarSail || 0) + orbitalSolarSailCount('mercury')) * 10 + orbitalWarmingSailCount('mercury') * 10); }
function venusTemperature() { return Math.max(-273, 490 - (Number(getBuildingsOnPlanet('venus').solarSail || 0) + orbitalSolarSailCount('venus')) * 10 + orbitalWarmingSailCount('venus') * 10); }

function totalBuildingsOnPlanet(id) { return Object.values(getBuildingsOnPlanet(id)).reduce((a, b) => a + b, 0); }


const researchTypes = {
  nickelMining: { name: 'Grabung nach Nickelerz', icon: '⛏️', category: 'Tiefengrabung', cost: 200, time: 2 * 60 * 60, text: 'Schaltet Nickelerz auf der Erde frei. Nickelerz liegt tief unter der Oberfläche und muss durch Tiefengrabung erschlossen werden.' },
  forester: { name: 'Förster', icon: '🌳', category: 'Umweltforschung', cost: 16000, time: 0, text: 'Schaltet das Gebäude Förster frei. Voraussetzung: Forschungsvertrag „Regenerative Veränderung“ abgeschlossen.' },
  hydroelectricPlant: { name: 'Wasserkraftwerk', icon: '💧', category: 'Industrielle Grundlagen', cost: 800, time: 180, text: 'Schaltet das Wasserkraftwerk frei. Es verbraucht 3 MW Strom und erzeugt 0,1 Liter Wasser/s aus dem Wasservorkommen der Erde.' },
  greenhouse: { name: 'Gewächshaus', icon: '🌱', category: 'Industrielle Grundlagen', cost: 1500, time: 240, text: 'Schaltet das Gewächshaus frei. Es benötigt Strom und Wasser und produziert Getreide sowie Gemüse.' },
  foodFactory: { name: 'Lebensmittelfabrik', icon: '🥫', category: 'Industrielle Grundlagen', cost: 2500, time: 300, text: 'Schaltet die Lebensmittelfabrik frei. Verarbeitet Getreide und Wasser mit Strom zu Lebensmitteln.' },
  iceProcessingPlant: { name: 'Eisverarbeitungsanlage', icon: '🧊', category: 'Industrielle Grundlagen', cost: 500, time: 120, text: 'Schaltet die Eisverarbeitungsanlage auf allen Planeten außer der Sonne frei. Sie benötigt 0,1 t Eis/s im lokalen Lager und erzeugt 0,2 Liter Wasser/s ohne Stromverbrauch.' },
  algaeFarm: { name: 'Algenfarm', icon: '🪴', category: 'Industrielle Grundlagen', cost: 2000, time: 300, text: 'Schaltet die Algenfarm frei. Sie verbraucht 0,05 t Wasser/s (50 L/s) aus dem lokalen Lager und erzeugt 0,2 t Algenbiomasse/s.' },
  algaeFoodProcessor: { name: 'Algenverarbeitungsanlage', icon: '🥫', category: 'Industrielle Grundlagen', cost: 3500, time: 360, text: 'Schaltet die Algenverarbeitungsanlage frei. Sie verarbeitet 0,1 t Algenbiomasse/s zu 0,12 t Lebensmitteln/s.' },
  cocoaPlantation: { name: 'Kakao-Plantage', icon: '🌱', category: 'Kolonistenversorgung', cost: 5000, time: 1200, text: 'Schaltet die Kakao-Plantage frei. Erzeugt 0,1 t Kakaobohnen/s, verbraucht 0,2 Liter Wasser/s und benötigt 5 MW Strom.' },
  chocolateFactory: { name: 'Schokoladenfabrik', icon: '🍫', category: 'Kolonistenversorgung', cost: 5000, time: 1200, text: 'Schaltet die Schokoladenfabrik frei. Verbraucht 0,02 t Kakaobohnen/s, produziert 0,05 t Schokolade/s, benötigt 5 MW Strom und kein Wasser.' },
  luxuryFurnitureFactory: { name: 'Luxusmöbelfabrik', icon: '🛋️', category: 'Kolonistenversorgung', cost: 6000, time: 12 * 60 * 60, text: 'Schaltet die Luxusmöbelfabrik frei. Verbraucht 0,03 t Kunststoff/s und 0,006 t Bretter/s, produziert 0,02 t Luxusmöbel/s und benötigt 5 MW Strom.' },
  solarPlant: {
    name: 'Solaranlage',
    icon: '☀️',
    category: 'Industrielle Grundlagen',
    cost: 100,
    time: 120,
    text: 'Schaltet die Solaranlage frei. Die Solaranlage bleibt im Baumenü sichtbar, bis diese Forschung abgeschlossen ist.'
  },
  polymerFactory: { name: 'Polymerfabrik', icon: '🧪', category: 'Industrielle Grundlagen', cost: 2500, time: 300, text: 'Schaltet die Polymerfabrik frei. Verarbeitet Rohöl direkt zu Polymeren.' },
  vehicleFactory: { name: 'Fahrzeugfabrik', icon: '🚗', category: 'Industrielle Grundlagen', cost: 1500, time: 300, text: 'Schaltet die Fahrzeugfabrik frei. Produziert 0,003 t Fahrzeuge/s und benötigt 4 MW Strom pro Fabrik.' },
  moonBase: {
    name: 'Mondbasis', icon: '🌙', category: 'Industrielle Grundlagen', cost: 1200, time: 300,
    text: 'Schaltet die Mondbasis frei. Die Mondbasis kann auf allen Planeten gebaut werden.'
  },
  atlas1: {
    name: 'Atlas 1', icon: '🚀', category: 'Raketentechnik', cost: 8000, time: 480,
    text: 'Schaltet den Bau und Einsatz der Atlas 1 frei. 500 t/L Kapazität, 3 Frachtabteilungen und 1 Sekunde kürzere Flugzeit als Herkules.'
  },
  titan1: {
    name: 'Schwerlastraketen – Titan 1', icon: '🚀', category: 'Raketentechnik', cost: 25000, time: 1200,
    text: 'Schaltet Titan 1 frei. 1.500 t/L Kapazität, 3 Frachtabteilungen und 20 Sekunden Flugzeit zur Luna.'
  },
  mobileMiner: {
    name: 'Mobile Minerrakete', icon: '⛏️', category: 'Raketentechnik', cost: 30000, time: 900,
    text: 'Schaltet den Bau der Mobilen Minerrakete für den automatisierten Asteroidenbergbau frei. Voraussetzung: Forschungsauftrag „Ah… Asteroiden sind nicht unerreichbar“ abgeschlossen.'
  },
  fusionReactor: {
    name: 'Fusionsreaktor', icon: '⚛️', category: 'Fortschrittliche Forschung', cost: 6000, time: 600,
    text: 'Schaltet den Fusionsreaktor frei. Der Fusionsreaktor bleibt im Baumenü sichtbar, ist aber bis zum Abschluss dieser Forschung gesperrt.'
  },
  nuclearReactor: {
    name: 'Kernreaktor', icon: '☢️', category: 'Fortschrittliche Forschung', cost: 10000, time: 600,
    text: 'Schaltet den Kernreaktor frei. Der Kernreaktor kann auf allen Planeten außer der Sonne gebaut werden.'
  },
  co2ProcessingPlant: {
    name: 'CO₂-Verarbeitung', icon: '⚗️', category: 'Industrielle Grundlagen', cost: 6000, time: 600, chipCost: 2000,
    text: 'Schaltet die CO₂-Verarbeitung frei. Sie kann auf allen Planeten außer der Sonne gebaut werden.'
  },
  orbitalCo2Extractor: {
    name: 'CO₂-Orbit-Extraktor', icon: '🛰️', category: 'Weltraumforschung', cost: 5000, time: 600,
    text: 'Schaltet den CO₂-Orbit-Extraktor frei. Er fördert 0,2 t CO₂/s ohne Stromverbrauch und lagert es im jeweiligen Orbit-Lager ein.'
  },
  researchSatellite: {
    name: 'Forschungssatellit', icon: '🛰️', category: 'Weltraumforschung', cost: 3500, time: 420,
    text: 'Schaltet den Forschungssatelliten frei. Er erzeugt 1 Forschungspunkt/s ohne Stromverbrauch; pro Orbit ist maximal ein Satellit erlaubt.'
  },
  solarSatellite: {
    name: 'Solar-Satellit', icon: '🛰️', category: 'Weltraumforschung', cost: 30000, time: 1800, chipCost: 5000,
    text: 'Schaltet den Bau von Solar-Satelliten frei. Ein Solar-Satellit erzeugt im Sonnenorbit 10.000 MW/s.'
  },
  solarProbe: {
    name: 'Sonnensonde', icon: '🚀', category: 'Weltraumforschung', cost: 50000, time: 2700, chipCost: 10000,
    text: 'Schaltet die Sonnensonde frei. Sie transportiert einen Solar-Satelliten von der Erde in den Sonnenorbit.'
  }
};

const taskTypes = {
  company_start_buildings: {
    group: 'companyStart',
    name: 'Der Weg zu deiner eigenen Firma',
    description: 'Baue insgesamt 10 Eisenminen und 5 Stahlwerke.',
    target: 15,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Math.min(10, totalIronMinesBuilt()) + Math.min(5, totalSteelworksBuilt()),
    isComplete: () => totalIronMinesBuilt() >= 10 && totalSteelworksBuilt() >= 5
  },
  company_start_name: {
    group: 'companyStart',
    name: 'Gründe deine eigene Firma',
    description: 'Gib deinem Unternehmen einen Namen. Dadurch wird das Unternehmensmenü freigeschaltet und du kannst die Unternehmenszentrale bauen.',
    target: 1,
    unit: 'Firmenname',
    reward: 0,
    getProgress: () => taskIsComplete('company_start_buildings') && state.tasks?.companyNameChosen && String(state.companyName || '').trim() ? 1 : 0,
    isComplete: () => taskIsComplete('company_start_buildings') && !!state.tasks?.companyNameChosen && !!String(state.companyName || '').trim()
  },
  company_start_mining: {
    group: 'companyStart',
    name: 'Aller Anfang ist schwer',
    description: 'Baue insgesamt 10.000 t Eisen und 10.000 t Stein ab. Danach werden Unternehmensaufträge der Stufe 1 freigeschaltet.',
    target: 20000,
    unit: 't',
    reward: 0,
    getProgress: () => taskIsComplete('company_start_name') ? Math.min(10000, Number(state.tasks?.ironMined || 0)) + Math.min(10000, Number(state.tasks?.stoneMined || 0)) : 0,
    isComplete: () => taskIsComplete('company_start_name') && Number(state.tasks?.ironMined || 0) >= 10000 && Number(state.tasks?.stoneMined || 0) >= 10000
  },
  company_start_orders: {
    group: 'companyStart',
    name: 'Bring das Unternehmen vorwärts',
    description: 'Schließe 5 Unternehmensaufträge der Stufe 1 erfolgreich ab.',
    target: 5,
    unit: 'Aufträge',
    reward: 0,
    getProgress: () => taskIsComplete('company_start_mining') ? Number(state.tasks?.companyOrdersCompleted || 0) : 0,
    isComplete: () => taskIsComplete('company_start_mining') && Number(state.tasks?.companyOrdersCompleted || 0) >= 5
  },
  intro_iron_mine: {
    name: 'Baue eine Eisenmine',
    description: 'Baue deine erste Eisenmine.',
    target: 1,
    unit: 'Gebäude',
    reward: 5,
    getProgress: () => totalIronMinesBuilt()
  },
  intro_iron_1000: {
    name: 'Baue 1.000 t Eisenerz ab',
    description: 'Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.',
    target: 1000,
    unit: 't',
    reward: 0,
    getProgress: () => Number(state.tasks?.ironMined || 0)
  },
  intro_steelworks: {
    name: 'Baue ein Stahlwerk',
    description: 'Baue dein erstes Stahlwerk.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => totalSteelworksBuilt()
  },
  intro_steel_1000: {
    name: 'Produziere 1.000 t Stahl',
    description: 'Produziere insgesamt 1.000 t Stahl.',
    target: 1000,
    unit: 't',
    reward: 0,
    getProgress: () => Number(state.tasks?.steelProduced || 0)
  },
  intro_iron_mines_3: {
    name: 'Besitze 3 Eisenminen',
    description: 'Baue insgesamt drei Eisenminen.',
    target: 3,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => totalIronMinesBuilt()
  },
  intro_building_materials_factory: {
    name: 'Baue 1 Baustofffabrik',
    description: 'Baue deine erste Baustofffabrik.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).buildingMaterialsFactory || 0), 0)
  },
  intro_rocket_factory: {
    name: 'Baue eine Raketenfabrik',
    description: 'Baue deine erste Raketenfabrik.',
    target: 1,
    unit: 'Gebäude',
    reward: 5,
    getProgress: () => Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).rocketFactory || 0), 0)
  },
  intro_landing_pad: {
    name: 'Baue eine Start- und Landerampe',
    description: 'Baue deine erste Start- und Landerampe.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).landingPad || 0), 0)
  },
  moon_flight_luna: {
    group: 'moon',
    name: 'Fliege zu Luna',
    description: 'Schicke eine Rakete zum Mond oder in den Mondorbit.',
    target: 1,
    unit: 'Flug',
    reward: 0,
    getProgress: () => Number(state.tasks?.lunaFlights || 0)
  },
  moon_outpost: {
    group: 'moon',
    name: 'Ganz schön heimisch',
    description: 'Baue 1 Außenposten auf Luna.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Number(getBuildingsOnPlanet('luna').outpost || 0)
  },
  luna_habitat: {
    group: 'lunaExpansion',
    name: 'Baue ein Habitat auf dem Mond',
    description: 'Errichte mindestens ein Habitat auf Luna.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Number(getBuildingsOnPlanet('luna').habitat || 0)
  },
  luna_colonists_1000: {
    group: 'lunaExpansion',
    name: '1.000 Kolonisten auf dem Mond',
    description: 'Sorge dafür, dass mindestens 1.000 Kolonisten auf Luna leben.',
    target: 1000,
    unit: 'Kolonisten',
    reward: 0,
    getProgress: () => Number(bodies.luna?.colonists || 0)
  },
  luna_colonists_10000: {
    group: 'lunaExpansion',
    name: '10.000 Kolonisten auf dem Mond',
    description: 'Baue die Mondkolonie auf mindestens 10.000 Kolonisten aus.',
    target: 10000,
    unit: 'Kolonisten',
    reward: 0,
    getProgress: () => Number(bodies.luna?.colonists || 0)
  },
  moon_water_processing: {
    group: 'moon',
    name: 'Ein Platz auf Dauer',
    description: 'Baue 2 Wasserverarbeitungsanlagen auf Luna.',
    target: 2,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Number(getBuildingsOnPlanet('luna').iceProcessingPlant || 0)
  },
  moon_algae_farms: {
    group: 'moon',
    name: 'Algenproduktion',
    description: 'Baue 2 Algenfarmen.',
    target: 2,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).algaeFarm || 0), 0)
  },
  moon_food_50: {
    group: 'moon',
    name: 'Was sollen wir essen',
    description: 'Produziere insgesamt 50 t Lebensmittel.',
    target: 50,
    unit: 't Lebensmittel',
    reward: 0,
    getProgress: () => Number(state.tasks?.foodProduced || 0)
  },
  colonists_water_300: {
    group: 'colonists',
    name: 'Ein bisschen Durst',
    description: 'Baue ein Wasserkraftwerk auf der Erde und produziere insgesamt 300 L Wasser.',
    target: 300,
    unit: 'L Wasser',
    reward: 0,
    getProgress: () => Number(getBuildingsOnPlanet('earth').hydroelectricPlant || 0) > 0 ? Number(state.tasks?.waterProduced || 0) : 0
  },
  colonists_research_greenhouse: {
    group: 'colonists',
    name: 'Der Teller ist voll',
    description: 'Schließe die Forschung „Gewächshaus“ ab.',
    target: 1,
    unit: 'Forschung',
    reward: 0,
    getProgress: () => state.research?.completed?.greenhouse ? 1 : 0
  },
  colonists_build_greenhouse: {
    group: 'colonists',
    name: 'Ein voller Teller und ein warmer Platz',
    description: 'Baue ein Gewächshaus.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).greenhouse || 0), 0)
  },
  colonists_research_food_factory: {
    group: 'colonists',
    name: 'Fülle die leeren Bäuche',
    description: 'Schließe die Forschung „Lebensmittelfabrik“ ab.',
    target: 1,
    unit: 'Forschung',
    reward: 0,
    getProgress: () => state.research?.completed?.foodFactory ? 1 : 0
  },
  colonists_food_50: {
    group: 'colonists',
    name: 'Etwas essen',
    description: 'Produziere insgesamt 50 t Lebensmittel.',
    target: 50,
    unit: 't Lebensmittel',
    reward: 0,
    getProgress: () => Number(state.tasks?.foodProduced || 0)
  },
  colonists_residential_house: {
    group: 'colonists',
    name: 'Ein Platz unter der Sonne',
    description: 'Baue ein Wohnhaus auf der Erde.',
    target: 1,
    unit: 'Gebäude',
    reward: 0,
    getProgress: () => Number(getBuildingsOnPlanet('earth').residentialHouse || 0)
  },
  colonists_arrival: {
    group: 'colonists',
    name: 'Wir sind da, 50 Kolonisten schließen sich dir an',
    description: 'Erledige alle sechs Aufgaben im Reiter „Die Kolonisten“, damit 50 Kolonisten zu deiner Kolonie stoßen.',
    target: 6,
    unit: 'Aufgaben',
    reward: 0,
    getProgress: () => ['colonists_water_300','colonists_research_greenhouse','colonists_build_greenhouse','colonists_research_food_factory','colonists_food_50','colonists_residential_house'].filter(key => taskIsComplete(key)).length
  }
};

function totalIronMinesBuilt() {
  return Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).ironMine || 0), 0);
}
function totalSteelworksBuilt() {
  return Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).steelworks || 0), 0);
}
function taskProgress(key) {
  const task = taskTypes[key];
  if (!task) return 0;
  return Math.min(task.target, Math.max(0, Number(task.getProgress()) || 0));
}
function taskIsComplete(key) {
  const task = taskTypes[key];
  if (!task) return false;
  if (state.tasks?.completed?.[key]) return true;
  if (typeof task.isComplete === 'function') return !!task.isComplete();
  return taskProgress(key) >= task.target;
}
const INTRO_TASK_KEYS = Object.keys(taskTypes).filter(key => !taskTypes[key].group);
function showIntroductionCompletePopup() {
  const popup = document.querySelector('#introduction-complete-popup');
  if (!popup) return;
  popup.hidden = false;
  popup.setAttribute('aria-hidden', 'false');
}
function closeIntroductionCompletePopup() {
  const popup = document.querySelector('#introduction-complete-popup');
  if (popup) {
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
  }
}
function showColonistsCompletePopup() {
  const popup = document.querySelector('#colonists-complete-popup');
  if (!popup) return;
  popup.hidden = false;
  popup.setAttribute('aria-hidden', 'false');
}
function closeColonistsCompletePopup() {
  const popup = document.querySelector('#colonists-complete-popup');
  if (popup) {
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
  }
}
function updateTasks() {
  if (!state.tasks) state.tasks = { completed: {}, ironMined: 0, stoneMined: 0, steelProduced: 0, foodProduced: 0, waterProduced: 0, companyOrdersCompleted: 0 };
  if (state.tasks.foodProduced === undefined) state.tasks.foodProduced = 0;
  if (state.tasks.stoneMined === undefined) state.tasks.stoneMined = 0;
  if (state.tasks.companyOrdersCompleted === undefined) state.tasks.companyOrdersCompleted = 0;
  if (state.tasks.companyNameChosen === undefined) state.tasks.companyNameChosen = false;
  if (state.tasks.waterProduced === undefined) state.tasks.waterProduced = 0;
  state.tasks.completed = state.tasks.completed || {};
  let changed = false;
  Object.keys(taskTypes).forEach(key => {
    if (!state.tasks.completed[key] && taskIsComplete(key)) {
      state.tasks.completed[key] = true;
      if (taskTypes[key].reward) state.research.points = Number(state.research.points || 0) + taskTypes[key].reward;
      if (key === 'colonists_arrival' && !state.tasks.colonistsArrivalRewarded) {
        let remaining = 50;
        const housingOrder = ['earth', ...Object.keys(bodies).filter(id => id !== 'sun' && id !== 'earth')];
        for (const id of housingOrder) {
          if (remaining <= 0) break;
          remaining -= addColonistsToPlanet(id, remaining);
        }
        state.tasks.colonistsArrivalRewarded = true;
        state.tasks.colonistsArrivalAdded = 50 - remaining;
        saveGame(false);
      }
      changed = true;
    }
  });
  const introductionNowComplete = INTRO_TASK_KEYS.every(key => !!state.tasks.completed[key]);
  if (introductionNowComplete && !state.tasks.introductionPopupShown) {
    state.tasks.introductionPopupShown = true;
    showIntroductionCompletePopup();
    saveGame(false);
  }
  const colonistsTaskKeys = Object.keys(taskTypes).filter(key => taskTypes[key].group === 'colonists');
  const colonistsNowComplete = colonistsTaskKeys.length > 0 && colonistsTaskKeys.every(key => !!state.tasks.completed[key]);
  if (colonistsNowComplete && !state.tasks.colonistsPopupShown) {
    state.tasks.colonistsPopupShown = true;
    showColonistsCompletePopup();
    saveGame(false);
  }
  return changed;
}
function renderTasks() {
  const panel = document.querySelector('#tasks-content');
  if (!panel) return;
  updateTasks();
  const groups = [
    { id: 'intro', label: '🎯 Einführung', keys: Object.keys(taskTypes).filter(key => !taskTypes[key].group) },
    { id: 'companyStart', label: '🏢 Der Weg zur Firma', keys: Object.keys(taskTypes).filter(key => taskTypes[key].group === 'companyStart') },
    { id: 'moon', label: '🌙 Griff nach dem Mond', keys: Object.keys(taskTypes).filter(key => taskTypes[key].group === 'moon') },
    { id: 'lunaExpansion', label: '🌕 Die Welt ist nicht genug', keys: Object.keys(taskTypes).filter(key => taskTypes[key].group === 'lunaExpansion') },
    { id: 'colonists', label: '👥 Die Kolonisten', keys: Object.keys(taskTypes).filter(key => taskTypes[key].group === 'colonists') }
  ];
  const activeGroup = panel.dataset.activeTaskGroup || 'intro';
  const keys = groups.find(group => group.id === activeGroup)?.keys || groups[0].keys;
  panel.innerHTML = `
    <div class="task-tabs" role="tablist" aria-label="Aufgabengruppen">
      ${groups.map(group => {
        const completedCount = group.keys.filter(taskIsComplete).length;
        const allComplete = group.keys.length > 0 && completedCount === group.keys.length;
        return `<button type="button" class="task-tab ${group.id === activeGroup ? 'active' : ''} ${allComplete ? 'task-tab-complete' : ''}" data-task-group="${group.id}" role="tab" aria-selected="${group.id === activeGroup}">
          <span class="task-tab-label">${group.label}</span>
          <span class="task-tab-count">${completedCount} / ${group.keys.length}</span>
        </button>`;
      }).join('')}
    </div>
    ${groups.map(group => `<div class="stat task-group-summary" ${group.id === activeGroup ? '' : 'hidden'}><span>${group.label}</span><strong>${group.keys.filter(taskIsComplete).length} / ${group.keys.length}</strong></div>`).join('')}
    <div class="tasks-list">
      ${keys.map(key => {
        const t = taskTypes[key];
        const progress = taskProgress(key);
        const done = taskIsComplete(key);
        const displayProgress = t.unit === 't' ? progress.toFixed(2) : progress.toFixed(0);
        const target = t.unit === 't' ? t.target.toFixed(0) : t.target;
        return `<div class="task-card ${done ? 'task-done' : ''}">
          <div class="task-title"><strong>${done ? '✅' : '⬜'} ${t.name}</strong>${t.reward ? `<span class="task-reward">+${t.reward} Forschungspunkte</span>` : ''}</div>
          <div class="hint">${t.description}</div>
          ${key === 'company_start_name' && taskIsComplete('company_start_buildings') && !taskIsComplete(key) ? '<button type="button" class="small-button" data-task-company-name>🏢 Firmennamen eingeben</button>' : ''}
          ${key === 'company_start_name' && taskIsComplete(key) ? `<div class="hint">Firmenname: <strong>${escapeCompanyText(state.companyName)}</strong></div>` : ''}
          <div class="task-progress-text"><span>Fortschritt</span><strong>${displayProgress} / ${target} ${t.unit}</strong></div>
          <div class="task-progress"><i style="width:${Math.min(100, progress / t.target * 100)}%"></i></div>
        </div>`;
      }).join('')}
    </div>`;
  panel.querySelectorAll('[data-task-group]').forEach(button => button.addEventListener('click', () => {
    panel.dataset.activeTaskGroup = button.dataset.taskGroup;
    renderTasks();
  }));
  panel.querySelector('[data-task-company-name]')?.addEventListener('click', () => {
    const name = prompt('Wie soll deine Firma heißen?');
    if (name !== null && name.trim()) {
      state.companyName = name.trim().slice(0, 60);
      state.tasks.companyNameChosen = true;
      saveGame(false);
      taskProgressUpdate();
      renderTasks();
    }
  });
}
function taskProgressUpdate() {
  const changed = updateTasks();
  const panel = document.querySelector('#tasks-panel');
  if (panel && !panel.hidden) renderTasks();
  updateCompanyHeadquartersMenu();
  if (changed) saveGame(false);
}

function researchLabCount() { return Number(getBuildingsOnPlanet('earth').researchLab || 0); }
function researchSatelliteCount() { return Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).researchSatellite || 0), 0); }
function researchPointProduction() { return researchLabCount() * 1 + researchSatelliteCount() * 1; }
function researchAvailable() { return researchLabCount() > 0; }

function formatResearchTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatGameDuration(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days} Tag${days === 1 ? '' : 'e'} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function renderResearch() {
  const panel = document.querySelector('#research-content');
  if (!panel) return;
  const activeTab = panel.dataset.activeResearchTab || 'tree';
  if (activeTab === 'orders') {
    renderResearchOrders(panel);
    return;
  }
  const completed = state.research?.completed || {};
  const active = state.research?.active;
  const activeDef = active ? researchTypes[active.key] : null;
  const running = !!active || !!ensureResearchOrders().active;
  const researchedSolar = !!completed.solarPlant;
  const researchedHydroelectric = !!completed.hydroelectricPlant;
  const researchedGreenhouse = !!completed.greenhouse;
  const researchedFusion = !!completed.fusionReactor;
  const researchedNuclear = !!completed.nuclearReactor;
  const researchedCo2Processing = !!completed.co2ProcessingPlant;
  const researchedAtlas1 = !!completed.atlas1;
  const researchedTitan1 = !!completed.titan1;
  const researchedMobileMiner = !!completed.mobileMiner;
  const mobileMinerOrderDone = !!ensureResearchOrders().completed.mobileMinerAsteroids;
  const canResearchMobileMiner = mobileMinerOrderDone && researchAvailable() && !running && !researchedMobileMiner && Number(state.research.points || 0) >= researchTypes.mobileMiner.cost;
  const researchedSolarSatellite = !!completed.solarSatellite;
  const researchedSolarProbe = !!completed.solarProbe;
  const enoughSolarPoints = Number(state.research.points || 0) >= researchTypes.solarPlant.cost;
  const enoughFusionPoints = Number(state.research.points || 0) >= researchTypes.fusionReactor.cost;
  const enoughNuclearPoints = Number(state.research.points || 0) >= researchTypes.nuclearReactor.cost;
  const enoughCo2Points = Number(state.research.points || 0) >= researchTypes.co2ProcessingPlant.cost;
  const enoughCo2Chips = Number(state.chips || 0) >= researchTypes.co2ProcessingPlant.chipCost;
  const canResearchSolar = researchAvailable() && !running && !researchedSolar && enoughSolarPoints;
  const canResearchFusion = researchAvailable() && !running && !researchedFusion && enoughFusionPoints;
  const canResearchNuclear = researchAvailable() && !running && !researchedNuclear && enoughNuclearPoints;
  const canResearchCo2Processing = researchAvailable() && !running && !researchedCo2Processing && enoughCo2Points && enoughCo2Chips;
  const enoughAtlasPoints = Number(state.research.points || 0) >= researchTypes.atlas1.cost;
  const canResearchAtlas1 = researchAvailable() && !running && !researchedAtlas1 && enoughAtlasPoints;
  const enoughTitan1Points = Number(state.research.points || 0) >= researchTypes.titan1.cost;
  const canResearchTitan1 = researchAvailable() && !running && !researchedTitan1 && enoughTitan1Points;
  const enoughSolarSatellitePoints = Number(state.research.points || 0) >= researchTypes.solarSatellite.cost;
  const enoughSolarSatelliteChips = Number(state.chips || 0) >= researchTypes.solarSatellite.chipCost;
  const enoughSolarProbePoints = Number(state.research.points || 0) >= researchTypes.solarProbe.cost;
  const enoughSolarProbeChips = Number(state.chips || 0) >= researchTypes.solarProbe.chipCost;
  const canResearchSolarSatellite = researchAvailable() && !running && !researchedSolarSatellite && enoughSolarSatellitePoints && enoughSolarSatelliteChips;
  const canResearchSolarProbe = researchAvailable() && !running && !researchedSolarProbe && enoughSolarProbePoints && enoughSolarProbeChips;
  const activeElapsedMs = active ? Math.max(0, gameNow() - Number(active.started || gameNow())) : 0;
  const remaining = active && activeDef
    ? Math.max(0, activeDef.time - activeElapsedMs / 1000)
    : 0;
  const progress = active && activeDef
    ? Math.min(100, (activeElapsedMs / (activeDef.time * 1000)) * 100)
    : 0;

  const orbitRows = Object.entries(bodies).map(([id, body]) => {
    const count = Number(getBuildingsOnPlanet(id).researchSatellite || 0);
    const status = count > 0 ? 'Satellit vorhanden' : (completed.researchSatellite ? 'Orbit frei' : 'Forschung erforderlich');
    return `<button type="button" class="orbit-research-row" data-orbit-target="${id}">
      <span class="orbit-research-icon">🛰️</span><span class="orbit-research-name"><strong>${body.name}</strong><small>${status}</small></span>
      <span class="orbit-research-rate ${count ? 'good' : ''}">${count ? '+1 FP/s' : '0 FP/s'}</span>
    </button>`;
  }).join('');
  panel.innerHTML = `<div class="research-tabs" role="tablist" aria-label="Forschungsansicht">
    <button type="button" class="research-tab" data-research-tab="tree" role="tab" aria-selected="true">Forschungsbaum</button>
    <button type="button" class="research-tab" data-research-tab="orders" role="tab" aria-selected="false">Forschungsaufträge</button>
  </div><section class="orbit-research-overview">
    <h3>🛰️ Orbit-Forschungsübersicht</h3>
    <div class="orbit-research-global"><small>Globales Forschungskonto</small><strong>${Number(state.research.points || 0).toLocaleString('de-DE', {maximumFractionDigits: 0})} FP</strong><span>+${researchPointProduction().toFixed(2)} FP/s insgesamt</span></div>
    <p class="hint">Jeder Forschungssatellit erzeugt dauerhaft 1 Forschungspunkt/s. Pro Orbit ist maximal ein Forschungssatellit erlaubt. Wähle einen Orbit, um dessen Ansicht zu öffnen.</p>
    <div class="orbit-research-list">${orbitRows}</div>
  </section>
  <div class="research-overview">
    <div class="stat"><span>🔬 Forschungslabor auf Erde</span><strong>${researchLabCount()}</strong></div>
    <div class="stat"><span>🧪 Forschungspunkte</span><strong>${Number(state.research.points || 0).toFixed(0)}</strong></div>
    <div class="stat"><span>📈 Forschungspunktproduktion</span><strong>${researchPointProduction().toFixed(2)} /s</strong></div>
    <div class="stat"><span>🛰️ Forschungssatelliten in Orbits</span><strong>${researchSatelliteCount()}</strong></div>
  </div>
  ${active && activeDef ? `<div class="research-active"><strong>${activeDef.icon} ${activeDef.name}</strong><small>${formatResearchTime(remaining)} verbleiben · ${formatResearchTime(activeElapsedMs / 1000)} bereits erforscht</small><div class="research-progress"><i style="width:${progress}%"></i></div><button type="button" class="research-cancel-tree danger">Forschung abbrechen und später fortsetzen</button></div>` : ''}

  <h3>1️⃣ Industrielle Grundlagen</h3>
  <div class="research-tree">
    <div class="research-card ${researchedHydroelectric ? 'research-done' : ''}">
      <div><strong>💧 Forschung: Wasserkraftwerk</strong><small>Erzeugt 0,1 Liter Wasser/s aus dem Wasservorkommen der Erde und benötigt 3 MW Strom.</small><small>🧪 800 Forschungspunkte · ⏱️ 3:00 Minuten</small></div>
      <button class="research-button" data-research="hydroelectricPlant" ${researchAvailable() && !running && !researchedHydroelectric && Number(state.research.points || 0) >= researchTypes.hydroelectricPlant.cost ? '' : 'disabled'}>${researchedHydroelectric ? 'Abgeschlossen' : active?.key === 'hydroelectricPlant' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedGreenhouse ? 'research-done' : ''}">
      <div><strong>🌱 Forschung: Gewächshaus</strong><small>Produziert Getreide und Gemüse bei ausreichender Strom- und Wasserversorgung.</small><small>🧪 1.500 Forschungspunkte · ⏱️ 4:00 Minuten</small></div>
      <button class="research-button" data-research="greenhouse" ${researchAvailable() && !running && !researchedGreenhouse && Number(state.research.points || 0) >= researchTypes.greenhouse.cost ? '' : 'disabled'}>${researchedGreenhouse ? 'Abgeschlossen' : active?.key === 'greenhouse' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.foodFactory ? 'research-done' : ''}">
      <div><strong>🥫 Forschung: Lebensmittelfabrik</strong><small>Verarbeitet Getreide und Wasser zu Lebensmitteln. Pro Fabrik: 0,1 t Getreide/s + 0,05 L Wasser/s + 5 MW Strom → 0,08 t Lebensmittel/s.</small><small>🧪 2.500 Forschungspunkte · ⏱️ 5:00 Minuten</small></div>
      <button class="research-button" data-research="foodFactory" ${researchAvailable() && !running && !completed.foodFactory && Number(state.research.points || 0) >= researchTypes.foodFactory.cost ? '' : 'disabled'}>${completed.foodFactory ? 'Abgeschlossen' : active?.key === 'foodFactory' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.iceProcessingPlant ? 'research-done' : ''}">
      <div><strong>🧊 Forschung: Eisverarbeitungsanlage</strong><small>Schaltet die Eisverarbeitungsanlage auf allen Planeten außer der Sonne frei. Verbraucht 0,1 t Eis/s und erzeugt 0,2 Liter Wasser/s je Anlage. Kein Stromverbrauch.</small><small>🧪 500 Forschungspunkte · ⏱️ 2:00 Minuten</small></div>
      <button class="research-button" data-research="iceProcessingPlant" ${researchAvailable() && !running && !completed.iceProcessingPlant && Number(state.research.points || 0) >= researchTypes.iceProcessingPlant.cost ? '' : 'disabled'}>${completed.iceProcessingPlant ? 'Abgeschlossen' : active?.key === 'iceProcessingPlant' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.algaeFarm ? 'research-done' : ''}">
      <div><strong>🪴 Forschung: Algenfarm</strong><small>Schaltet die Algenfarm frei. Verbraucht 0,05 t Wasser/s (50 L/s) und erzeugt 0,2 t Algenbiomasse/s je Anlage.</small><small>🧪 2.000 Forschungspunkte · ⏱️ 5:00 Minuten</small></div>
      <button class="research-button" data-research="algaeFarm" ${researchAvailable() && !running && !completed.algaeFarm && Number(state.research.points || 0) >= researchTypes.algaeFarm.cost ? '' : 'disabled'}>${completed.algaeFarm ? 'Abgeschlossen' : active?.key === 'algaeFarm' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.algaeFoodProcessor ? 'research-done' : ''}">
      <div><strong>🥫 Forschung: Algenverarbeitungsanlage</strong><small>Verarbeitet 0,1 t Algenbiomasse/s zu 0,12 t Lebensmitteln/s je Anlage.</small><small>🧪 3.500 Forschungspunkte · ⏱️ 6:00 Minuten</small></div>
      <button class="research-button" data-research="algaeFoodProcessor" ${researchAvailable() && !running && !completed.algaeFoodProcessor && Number(state.research.points || 0) >= researchTypes.algaeFoodProcessor.cost ? '' : 'disabled'}>${completed.algaeFoodProcessor ? 'Abgeschlossen' : active?.key === 'algaeFoodProcessor' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedSolar ? 'research-done' : ''}">
      <div>
        <strong>☀️ Forschung: Solaranlage</strong>
        <small>Schaltet die Solaranlage frei.</small>
        <small>🧪 100 Forschungspunkte · ⏱️ 2:00 Minuten</small>
        <small>Die Solaranlage ist bereits im Baumenü sichtbar, solange die Forschung noch benötigt wird.</small>
      </div>
      <button class="research-button" data-research="solarPlant" ${canResearchSolar ? '' : 'disabled'}>${researchedSolar ? 'Abgeschlossen' : active?.key === 'solarPlant' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.polymerFactory ? 'research-done' : ''}">
      <div>
        <strong>🧪 Forschung: Polymerfabrik</strong>
        <small>Schaltet die Polymerfabrik frei. Sie verarbeitet Rohöl direkt zu Polymeren.</small>
        <small>🧪 2.500 Forschungspunkte · ⏱️ 5:00 Minuten</small>
      </div>
      <button class="research-button" data-research="polymerFactory" ${researchAvailable() && !running && !completed.polymerFactory && Number(state.research.points || 0) >= researchTypes.polymerFactory.cost ? '' : 'disabled'}>${completed.polymerFactory ? 'Abgeschlossen' : active?.key === 'polymerFactory' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.vehicleFactory ? 'research-done' : ''}">
      <div><strong>🚗 Forschung: Fahrzeugfabrik</strong><small>Schaltet die Fahrzeugfabrik frei. Je Fabrik: 0,003 t Fahrzeuge/s; Verbrauch 0,1 t Stahl, 0,1 t Kunststoff, 0,05 t Gummi, 0,3 t Glas und 0,2 t Chips pro Sekunde sowie 4 MW Strom.</small><small>🧪 1.500 Forschungspunkte · ⏱️ 5:00 Minuten</small></div>
      <button class="research-button" data-research="vehicleFactory" ${researchAvailable() && !running && !completed.vehicleFactory && Number(state.research.points || 0) >= researchTypes.vehicleFactory.cost ? '' : 'disabled'}>${completed.vehicleFactory ? 'Abgeschlossen' : active?.key === 'vehicleFactory' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.moonBase ? 'research-done' : ''}">
      <div>
        <strong>🌙 Forschung: Mondbasis</strong>
        <small>Schaltet die Mondbasis frei. Sie kann auf allen Planeten gebaut werden.</small>
        <small>🧪 1.200 Forschungspunkte · ⏱️ 5:00 Minuten</small>
      </div>
      <button class="research-button" data-research="moonBase" ${researchAvailable() && !running && !completed.moonBase && Number(state.research.points || 0) >= researchTypes.moonBase.cost ? '' : 'disabled'}>${completed.moonBase ? 'Abgeschlossen' : active?.key === 'moonBase' ? 'Läuft …' : 'Forschen'}</button>
    </div>



  </div>

  <h3>👥 Kolonistenversorgung</h3>
  <p class="hint">${ensureResearchOrders().completed.kolonistenversorgung ? 'Forschungsauftrag abgeschlossen – die Projekte können erforscht werden.' : '🔒 Erst den Forschungsauftrag „Kolonistenversorgung“ unter Forschungsaufträge abschließen. Die Projekte bleiben bis dahin sichtbar, aber gesperrt.'}</p>
  <div class="research-tree">
    <div class="research-card ${!!completed.cocoaPlantation ? 'research-done' : ''}">
      <div><strong>🌱 Forschung: Kakao-Plantage</strong><small>Erzeugt 0,1 t Kakaobohnen/s, verbraucht 0,2 Liter Wasser/s und benötigt 5 MW Strom.</small><small>🧪 5.000 Forschungspunkte · ⏱️ 20:00 Minuten</small>${!ensureResearchOrders().completed.kolonistenversorgung ? '<small class="warn">🔒 Voraussetzung: Forschungsauftrag „Kolonistenversorgung“</small>' : ''}</div>
      <button class="research-button" data-research="cocoaPlantation" ${ensureResearchOrders().completed.kolonistenversorgung && researchAvailable() && !running && !completed.cocoaPlantation && Number(state.research.points || 0) >= researchTypes.cocoaPlantation.cost ? '' : 'disabled'}>${completed.cocoaPlantation ? 'Abgeschlossen' : active?.key === 'cocoaPlantation' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.chocolateFactory ? 'research-done' : ''}">
      <div><strong>🍫 Forschung: Schokoladenfabrik</strong><small>Verbraucht 0,02 t Kakaobohnen/s, produziert 0,05 t Schokolade/s, benötigt 5 MW Strom und kein Wasser. Schokolade ist ein Luxusgut mit +8 % Populationswachstum.</small><small>🧪 5.000 Forschungspunkte · ⏱️ 20:00 Minuten</small>${!ensureResearchOrders().completed.kolonistenversorgung ? '<small class="warn">🔒 Voraussetzung: Forschungsauftrag „Kolonistenversorgung“</small>' : ''}</div>
      <button class="research-button" data-research="chocolateFactory" ${ensureResearchOrders().completed.kolonistenversorgung && researchAvailable() && !running && !completed.chocolateFactory && Number(state.research.points || 0) >= researchTypes.chocolateFactory.cost ? '' : 'disabled'}>${completed.chocolateFactory ? 'Abgeschlossen' : active?.key === 'chocolateFactory' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.luxuryFurnitureFactory ? 'research-done' : ''}">
      <div><strong>🛋️ Forschung: Luxusmöbelfabrik</strong><small>Verbraucht 0,03 t Kunststoff/s und 0,006 t Bretter/s, produziert 0,02 t Luxusmöbel/s und benötigt 5 MW Strom. Luxusmöbel geben bei aktivem Luxusgut +9 % Bevölkerungswachstum.</small><small>🧪 6.000 Forschungspunkte · ⏱️ 12 Ingame-Stunden</small>${!ensureResearchOrders().completed.kolonistenversorgung ? '<small class="warn">🔒 Voraussetzung: Forschungsvertrag „Kolonistenversorgung“</small>' : ''}</div>
      <button class="research-button" data-research="luxuryFurnitureFactory" ${ensureResearchOrders().completed.kolonistenversorgung && researchAvailable() && !running && !completed.luxuryFurnitureFactory && Number(state.research.points || 0) >= researchTypes.luxuryFurnitureFactory.cost ? '' : 'disabled'}>${completed.luxuryFurnitureFactory ? 'Abgeschlossen' : active?.key === 'luxuryFurnitureFactory' ? 'Läuft …' : 'Forschen'}</button>
    </div>
  </div>

  <h3>🌳 Umweltforschung</h3>
  <div class="research-tree">
    <div class="research-card ${!!completed.forester ? 'research-done' : ''}">
      <div><strong>🌳 Forschung: Förster</strong><small>Schaltet den Förster frei. Jeder mit Strom versorgte Förster steigert die Regeneration der Bäume um 0,5 %. Bau auf Planeten unter 50 °C; unbegrenzt viele Gebäude möglich.</small><small>🧪 16.000 Forschungspunkte</small><small class="${ensureResearchOrders().completed.regenerativeChange ? 'good' : 'warn'}">${ensureResearchOrders().completed.regenerativeChange ? '✓ Forschungsvertrag „Regenerative Veränderung“ abgeschlossen' : '🔒 Voraussetzung: Forschungsvertrag „Regenerative Veränderung“ (30.000 FP, 20 Ingame-Minuten)'}</small></div>
      <button class="research-button" data-research="forester" ${ensureResearchOrders().completed.regenerativeChange && researchAvailable() && !running && !completed.forester && Number(state.research.points || 0) >= researchTypes.forester.cost ? '' : 'disabled'}>${completed.forester ? 'Abgeschlossen' : active?.key === 'forester' ? 'Läuft …' : 'Forschen'}</button>
    </div>
  </div>

  <h3>2️⃣ Raketentechnik</h3>
  <div class="research-tree">
    <div class="research-card ${researchedAtlas1 ? 'research-done' : ''}">
      <div>
        <strong>🚀 Forschung: Atlas 1</strong>
        <small>Schaltet die Atlas 1 frei. 500 t/L, 3 Frachtabteilungen, alle erreichbaren Planeten.</small>
        <small>🧪 8.000 Forschungspunkte · ⏱️ 8:00 Minuten</small>
      </div>
      <button class="research-button" data-research="atlas1" ${canResearchAtlas1 ? '' : 'disabled'}>${researchedAtlas1 ? 'Abgeschlossen' : active?.key === 'atlas1' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedTitan1 ? 'research-done' : ''}">
      <div><strong>🚀 Forschung: Schwerlastraketen – Titan 1</strong><small>Schaltet Titan 1 frei: 1.500 t/L Kapazität, mehrere Frachtarten pro Mission, 120 Sekunden Bauzeit und 20 Sekunden Flugzeit zur Luna.</small><small>🧪 25.000 Forschungspunkte · ⏱️ 20:00 Minuten</small></div>
      <button class="research-button" data-research="titan1" ${canResearchTitan1 ? '' : 'disabled'}>${researchedTitan1 ? 'Abgeschlossen' : active?.key === 'titan1' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedMobileMiner ? 'research-done' : ''}" style="${mobileMinerOrderDone || researchedMobileMiner ? '' : 'opacity:.58;filter:grayscale(1)'}">
      <div><strong>⛏️ Forschung: Mobile Minerrakete</strong>
        <small>Schaltet die Mobile Minerrakete in der Raketenfabrik frei.</small>
        <small>🧪 30.000 Forschungspunkte · ⏱️ 15:00 Minuten</small>
        <small class="${mobileMinerOrderDone ? 'good' : 'warn'}">${mobileMinerOrderDone ? '✓ Forschungsauftrag abgeschlossen' : '🔒 Forschung fehlt: Erst „Ah… Asteroiden sind nicht unerreichbar“ abschließen.'}</small>
      </div>
      <button class="research-button" data-research="mobileMiner" ${canResearchMobileMiner ? '' : 'disabled'}>${researchedMobileMiner ? 'Abgeschlossen' : active?.key === 'mobileMiner' ? 'Läuft …' : 'Forschen'}</button>
    </div>

  </div>

  <h3>3️⃣ Fortschrittliche Forschung</h3>
  <div class="research-tree">
    <div class="research-card ${researchedFusion ? 'research-done' : ''}">
      <div>
        <strong>⚛️ Forschung: Fusionsreaktor</strong>
        <small>Schaltet den Fusionsreaktor frei.</small>
        <small>🧪 6.000 Forschungspunkte · ⏱️ 10:00 Minuten</small>
        <small>Der Fusionsreaktor bleibt im Baumenü sichtbar, ist aber bis zum Abschluss der Forschung gesperrt.</small>
      </div>
      <button class="research-button" data-research="fusionReactor" ${canResearchFusion ? '' : 'disabled'}>${researchedFusion ? 'Abgeschlossen' : active?.key === 'fusionReactor' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedNuclear ? 'research-done' : ''}">
      <div>
        <strong>☢️ Forschung: Kernreaktor</strong>
        <small>Schaltet den Kernreaktor frei. Er kann auf allen Planeten außer der Sonne gebaut werden.</small>
        <small>🧪 10.000 Forschungspunkte · ⏱️ 10:00 Minuten</small>
        <small>Verbraucht 0,01 t Kernbrennstoff/s und erzeugt 1.000 MW Strom/s.</small>
      </div>
      <button class="research-button" data-research="nuclearReactor" ${canResearchNuclear ? '' : 'disabled'}>${researchedNuclear ? 'Abgeschlossen' : active?.key === 'nuclearReactor' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedCo2Processing ? 'research-done' : ''}">
      <div>
        <strong>⚗️ Forschung: CO₂-Verarbeitung</strong>
        <small>Schaltet die CO₂-Verarbeitung frei.</small>
        <small>🧪 6.000 Forschungspunkte · 💾 2.000 Chips · ⏱️ 10:00 Minuten</small>
        <small>Nach Abschluss kann die CO₂-Verarbeitung auf allen Planeten außer der Sonne gebaut werden.</small>
      </div>
      <button class="research-button" data-research="co2ProcessingPlant" ${canResearchCo2Processing ? '' : 'disabled'}>${researchedCo2Processing ? 'Abgeschlossen' : active?.key === 'co2ProcessingPlant' ? 'Läuft …' : 'Forschen'}</button>
    </div>
  </div>

  <h3>5️⃣ Tiefengrabung</h3>
  <div class="research-tree">
    <div class="research-card ${!!completed.nickelMining ? 'research-done' : ''}">
      <div><strong>⛏️ Grabung nach Nickelerz</strong><small>Nickelerz liegt tief unter der Erdoberfläche und muss durch Tiefengrabung erschlossen werden.</small><small>🧪 200 Forschungspunkte · ⏱️ 2 Ingame-Stunden</small></div>
      <button class="research-button" data-research="nickelMining" ${researchAvailable() && !running && !completed.nickelMining && Number(state.research.points || 0) >= researchTypes.nickelMining.cost ? '' : 'disabled'}>${completed.nickelMining ? 'Abgeschlossen' : active?.key === 'nickelMining' ? 'Läuft …' : 'Forschen'}</button>
    </div>
  </div>

  <h3>4️⃣ Weltraumforschung</h3>
  <div class="research-tree">
    <div class="research-card ${!!completed.orbitalCo2Extractor ? 'research-done' : ''}">
      <div><strong>🛰️ Forschung: CO₂-Orbit-Extraktor</strong><small>Fördert 0,2 t CO₂/s in jedem Planetenorbit ohne Stromverbrauch. Das CO₂ landet im jeweiligen Orbit-Lager und kann dort verarbeitet werden.</small><small>🧪 5.000 Forschungspunkte · ⏱️ 10:00 Minuten</small></div>
      <button class="research-button" data-research="orbitalCo2Extractor" ${researchAvailable() && !running && !completed.orbitalCo2Extractor && Number(state.research.points || 0) >= researchTypes.orbitalCo2Extractor.cost ? '' : 'disabled'}>${completed.orbitalCo2Extractor ? 'Abgeschlossen' : active?.key === 'orbitalCo2Extractor' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${!!completed.researchSatellite ? 'research-done' : ''}">
      <div><strong>🛰️ Forschung: Forschungssatellit</strong><small>Erzeugt dauerhaft 1 Forschungspunkt/s ohne Stromverbrauch. Pro Orbit ist maximal ein Forschungssatellit erlaubt.</small><small>🧪 3.500 Forschungspunkte · ⏱️ 7:00 Minuten</small></div>
      <button class="research-button" data-research="researchSatellite" ${researchAvailable() && !running && !completed.researchSatellite && Number(state.research.points || 0) >= researchTypes.researchSatellite.cost ? '' : 'disabled'}>${completed.researchSatellite ? 'Abgeschlossen' : active?.key === 'researchSatellite' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedSolarSatellite ? 'research-done' : ''}">
      <div>
        <strong>🛰️ Forschung: Solar-Satellit</strong>
        <small>Schaltet den Bau von Solar-Satelliten frei. Sie liefern im Sonnenorbit 10.000 MW/s.</small>
        <small>🧪 30.000 Forschungspunkte · 💾 5.000 Chips · ⏱️ 30:00 Minuten</small>
      </div>
      <button class="research-button" data-research="solarSatellite" ${canResearchSolarSatellite ? '' : 'disabled'}>${researchedSolarSatellite ? 'Abgeschlossen' : active?.key === 'solarSatellite' ? 'Läuft …' : 'Forschen'}</button>
    </div>
    <div class="research-card ${researchedSolarProbe ? 'research-done' : ''}">
      <div>
        <strong>🚀 Forschung: Sonnensonde</strong>
        <small>Schaltet die Sonnensonde frei. Sie transportiert Solar-Satelliten von der Erde in den Sonnenorbit.</small>
        <small>🧪 50.000 Forschungspunkte · 💾 10.000 Chips · ⏱️ 45:00 Minuten</small>
      </div>
      <button class="research-button" data-research="solarProbe" ${canResearchSolarProbe ? '' : 'disabled'}>${researchedSolarProbe ? 'Abgeschlossen' : active?.key === 'solarProbe' ? 'Läuft …' : 'Forschen'}</button>
    </div>
  </div>`;

  // Forschungsansicht strukturieren, ohne Forschungswerte oder Freischaltungen zu verändern.
  const tabs = panel.querySelector('.research-tabs');
  const activeResearchCard = panel.querySelector(':scope > .research-active');
  const overview = panel.querySelector(':scope > .research-overview');
  const orbitOverview = panel.querySelector(':scope > .orbit-research-overview');
  const categoryList = document.createElement('div');
  categoryList.className = 'research-categories';
  const categoryHead = document.createElement('div');
  categoryHead.className = 'research-section-heading';
  categoryHead.innerHTML = '<strong>Technologiebaum</strong><small>Kategorien öffnen, Voraussetzungen prüfen und Forschung starten</small>';
  const headings = Array.from(panel.querySelectorAll(':scope > h3'));
  headings.forEach((heading, index) => {
    const tree = heading.nextElementSibling;
    if (!tree || !tree.classList.contains('research-tree')) return;
    const category = document.createElement('details');
    category.className = 'research-category';
    const summary = document.createElement('summary');
    summary.className = 'research-category-summary';
    const cards = Array.from(tree.querySelectorAll('.research-card'));
    const doneCount = cards.filter(card => card.classList.contains('research-done')).length;
    const title = heading.textContent.trim();
    summary.innerHTML = `<span class="research-category-title">${title}</span><span class="research-category-count">${doneCount}/${cards.length} abgeschlossen</span>`;
    category.appendChild(summary);
    category.appendChild(tree);
    category.dataset.categoryTitle = title;
    categoryList.appendChild(category);
    heading.remove();
    if (index === 0) category.open = true;
    if (active && cards.some(card => card.querySelector(`[data-research="${active.key}"]`))) category.open = true;
  });
  const orbitDetails = document.createElement('details');
  orbitDetails.className = 'research-category research-orbit-details';
  const orbitSummary = document.createElement('summary');
  orbitSummary.className = 'research-category-summary';
  orbitSummary.innerHTML = '<span class="research-category-title">🛰️ Orbit-Forschungsübersicht</span><span class="research-category-count">Satelliten und FP-Produktion</span>';
  orbitDetails.appendChild(orbitSummary);
  if (orbitOverview) orbitDetails.appendChild(orbitOverview);
  if (tabs) {
    const ordered = [tabs];
    if (activeResearchCard) ordered.push(activeResearchCard);
    else {
      const idle = document.createElement('div');
      idle.className = 'research-idle-card';
      idle.innerHTML = '<span class="research-idle-icon">🔬</span><span><strong>Keine laufende Forschung</strong><small>Wähle unten eine verfügbare Technologie oder einen Forschungsauftrag.</small></span>';
      ordered.push(idle);
    }
    if (overview) ordered.push(overview);
    ordered.push(categoryHead, categoryList, orbitDetails);
    panel.replaceChildren(...ordered);
  }
  panel.querySelectorAll('[data-research-tab]').forEach(button => button.addEventListener('click', () => {
    panel.dataset.activeResearchTab = button.dataset.researchTab;
    renderResearch();
  }));
  panel.querySelectorAll('.research-button').forEach(btn =>
    btn.addEventListener('click', () => startResearch(btn.dataset.research))
  );
  panel.querySelector('.research-cancel-tree')?.addEventListener('click', cancelActiveTreeResearch);
  panel.querySelectorAll('[data-orbit-target]').forEach(btn => btn.addEventListener('click', () => {
    const target = btn.dataset.orbitTarget;
    if (!bodies[target]) return;
    state.selected = target;
    state.viewMode = 'orbit';
    const researchPanel = document.querySelector('#research-panel');
    if (researchPanel) researchPanel.hidden = true;
    renderSystem();
    renderInfo();
    saveGame(false);
  }));
}

const RESEARCH_ORDER_DEFS = {
  regenerativeChange: {
    name: 'Regenerative Veränderung',
    icon: '🌳',
    description: 'Forschungsvertrag zur Erforschung des Gebäudes Förster und der natürlichen Waldregeneration.',
    duration: 20 * 60,
    cost: 30000,
    rewardPoints: 0,
    prerequisite: 'Forschungslabor auf der Erde',
    unlock: 'Forschung „Förster“'
  },
  kolonistenversorgung: {
    name: 'Kolonistenversorgung',
    icon: '👥',
    description: 'Schaltet die Forschungsprojekte Kakao-Plantage und Schokoladenfabrik im Forschungsbaum frei.',
    duration: 20 * 60,
    cost: 500,
    rewardPoints: 0,
    prerequisite: 'Forschungslabor auf der Erde',
    unlock: 'Forschungsprojekte Kakao-Plantage, Schokoladenfabrik und Luxusmöbelfabrik'
  },
  skyObservation: {
    name: 'Himmelsbeobachtung',
    icon: '🔭',
    description: 'Werte wissenschaftliche Beobachtungen aus, um die systematische Asteroidenbeobachtung freizuschalten.',
    duration: 2 * 60 * 60,
    cost: 2000,
    rewardPoints: 500,
    prerequisite: 'Mindestens ein Forschungslabor und ein Observatorium auf der Erde',
    unlock: 'Asteroidenbeobachtung'
  },
  mobileMinerAsteroids: {
    name: 'Ah… Asteroiden sind nicht unerreichbar',
    icon: '⛏️',
    description: 'Entwickle eine spezialisierte Mobile Minerrakete für den dauerhaften, automatisierten Asteroidenbergbau.',
    duration: 10 * 60 * 60,
    cost: 40000,
    rewardPoints: 0,
    prerequisite: 'Forschungslabor auf der Erde',
    unlock: 'Forschung „Mobile Minerrakete“ unter Raketentechnik'
  },
  systemFailure: {
    name: 'Das System wird versagen',
    icon: '📡',
    description: 'Entschlüssele den rätselhaften Notruf aus dem All und finde die Koordinaten eines zweiten Sonnensystems.',
    duration: 3 * 24 * 60 * 60,
    cost: 3000000,
    rewardPoints: 0,
    prerequisite: 'Forschungslabor auf der Erde',
    unlock: 'Sonnensystem 2 für die spätere Erschließung'
  }
};

// Asteroiden-Archetypen verwenden vorhandene Rohstoffe.
// Pro Archetyp werden variable Mengen beim Entdecken einmal ausgewürfelt und gespeichert.
const ASTEROID_TYPES = [
  { key: 'iron', name: 'Eisen-Nickel-Asteroid', icon: '🪨', resources: [{ key: 'iron', min: 50000, max: 200000 }, { key: 'nickelOre', min: 3000, max: 17000 }] },
  { key: 'silicon', name: 'Silikat-Asteroid', icon: '💎', resources: [{ key: 'silicon', min: 20000, max: 100000 }] },
  { key: 'lithium', name: 'Lithium-Asteroid', icon: '🔋', resources: [{ key: 'lithium', min: 5000, max: 25000 }] },
  { key: 'ice', name: 'Eis-Asteroid', icon: '🧊', resources: [{ key: 'ice', min: 30000, max: 150000 }] },
  { key: 'rare-metals', name: 'Asteroid seltener Metalle', icon: '☄️', resources: [{ key: 'titanOre', min: 5000, max: 30000 }, { key: 'copperOre', min: 5000, max: 25000 }] },
  { key: 'uranium-metal', name: 'Uran-Metall-Asteroid', icon: '☢️', resources: [{ key: 'uranium', min: 60000, max: 160000 }, { key: 'iron', min: 240000, max: 240000 }] },
  { key: 'ionium', name: 'Ionium-Asteroid', icon: '☢️', resources: [{ key: 'ionium', min: 19000, max: 22000 }, { key: 'iron', min: 231000, max: 231000 }] }
];
const ASTEROID_LIFETIME_MS = 2 * 24 * 60 * 60 * 1000;
const ASTEROID_DISCOVERY_INTERVAL_MS = 2 * 60 * 60 * 1000;
const ASTEROID_MAX_ACTIVE = 5;
function asteroidTypeByKey(key) { return ASTEROID_TYPES.find(type => type.key === key) || ASTEROID_TYPES[0]; }
function randomAsteroidAmount(min, max) { return Math.round(min + Math.random() * (max - min)); }
function makeAsteroid(number, now, type) {
  const selectedType = type || ASTEROID_TYPES.find(candidate => !ensureResearchOrders().discoveredAsteroids.some(a => a.typeKey === candidate.key && Number(a.expiresAt || 0) > now)) || ASTEROID_TYPES[Math.floor(Math.random() * ASTEROID_TYPES.length)];
  const resources = Object.fromEntries(selectedType.resources.map(resource => [resource.key, randomAsteroidAmount(resource.min, resource.max)]));
  return { id: `asteroid-${Date.now()}-${number}-${Math.floor(Math.random()*100000)}`, number, name: `Asteroid ${String(number).padStart(3, '0')}`, typeKey: selectedType.key, discoveredAt: now, expiresAt: now + ASTEROID_LIFETIME_MS, resources };
}
function ensureResearchOrders() {
  if (!state.research) state.research = { points: 0, active: null, completed: {} };
  if (!state.research.progress || typeof state.research.progress !== 'object') state.research.progress = {}; 
  if (!state.research.orders) state.research.orders = { active: null, completed: {}, progress: {}, asteroidObservationStarted: null, lastAsteroidDiscoveryAt: null, nextAsteroidNumber: 1, discoveredAsteroids: [] };
  const o = state.research.orders;
  o.completed ||= {};
  if (!o.progress || typeof o.progress !== 'object') o.progress = {};
  if (o.systemFailureStoryShown === undefined) o.systemFailureStoryShown = false;
  if (!Array.isArray(o.discoveredAsteroids)) o.discoveredAsteroids = [];
  if (!Array.isArray(o.mobileMiners)) o.mobileMiners = [];
  if (o.asteroidObservationStarted === undefined) o.asteroidObservationStarted = null;
  if (o.lastAsteroidDiscoveryAt === undefined) o.lastAsteroidDiscoveryAt = null;
  // Reparatur älterer Spielstände: Ist die Asteroidenbeobachtung bereits
  // abgeschlossen, aber ihr Startzeitstempel fehlt, darf die Entdeckung nicht
  // dauerhaft blockiert bleiben. Ohne bisherige Asteroiden ist der erste Fund
  // sofort fällig; danach gilt wieder das normale Intervall von 2 Ingame-Stunden.
  if (o.completed.skyObservation && o.asteroidObservationStarted == null) {
    const lastKnownAsteroid = o.discoveredAsteroids[o.discoveredAsteroids.length - 1];
    o.asteroidObservationStarted = lastKnownAsteroid && Number.isFinite(Number(lastKnownAsteroid.discoveredAt))
      ? Number(lastKnownAsteroid.discoveredAt)
      : gameNow() - ASTEROID_DISCOVERY_INTERVAL_MS;
  }
  o.nextAsteroidNumber = Math.max(1, Number(o.nextAsteroidNumber) || (o.discoveredAsteroids.reduce((max, a) => Math.max(max, Number(a.number) || 0), 0) + 1));
  // Alte Spielstände bekommen für bereits entdeckte Asteroiden einen festen Typ,
  // gespeicherte Rohstoffmengen und eine Ablaufzeit, ohne andere Spielwerte zu ändern.
  o.discoveredAsteroids.forEach((asteroid, index) => {
    if (!asteroid.typeKey) asteroid.typeKey = ASTEROID_TYPES[index % ASTEROID_TYPES.length].key;
    const type = asteroidTypeByKey(asteroid.typeKey);
    if (!asteroid.resources || typeof asteroid.resources !== 'object') asteroid.resources = Object.fromEntries(type.resources.map(resource => [resource.key, randomAsteroidAmount(resource.min, resource.max)]));
    if (!Number.isFinite(Number(asteroid.discoveredAt))) asteroid.discoveredAt = gameNow();
    if (!Number.isFinite(Number(asteroid.expiresAt))) asteroid.expiresAt = Number(asteroid.discoveredAt) + ASTEROID_LIFETIME_MS;
    if (!asteroid.number) asteroid.number = index + 1;
    if (!asteroid.name) asteroid.name = `Asteroid ${String(asteroid.number).padStart(3, '0')}`;
    if (asteroid.vanished === undefined) asteroid.vanished = false;
  });
  if (o.lastAsteroidDiscoveryAt == null && o.discoveredAsteroids.length) o.lastAsteroidDiscoveryAt = Number(o.discoveredAsteroids[o.discoveredAsteroids.length - 1].discoveredAt) || gameNow();
  return o;
}
function formatAsteroidResources(asteroid) {
  const type = asteroidTypeByKey(asteroid.typeKey);
  return type.resources.map(resource => `${resourceIcons[resource.key] || '📦'} ${resourceNames[resource.key] || resource.key}: <strong>${Number(asteroid.resources?.[resource.key] || 0).toLocaleString('de-DE')} t</strong>`).join(' · ');
}

function renderResearchOrders(panel) {
  const orders = ensureResearchOrders();
  const active = orders.active;
  const skyActive = active?.key === 'skyObservation' ? active : null;
  const completed = !!orders.completed.skyObservation;
  const hasLab = researchLabCount() > 0;
  const hasObservatory = Number(getBuildingsOnPlanet('earth').observatory || 0) > 0;
  const hasPrerequisites = hasLab && hasObservatory;
  const hasResearchPoints = completed || !!skyActive || Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.skyObservation.cost;
  const elapsed = skyActive ? Math.max(0, (gameNow() - skyActive.started) / 1000) : 0;
  const remaining = skyActive ? Math.max(0, RESEARCH_ORDER_DEFS.skyObservation.duration - elapsed) : 0;
  const progress = skyActive ? Math.min(100, elapsed / RESEARCH_ORDER_DEFS.skyObservation.duration * 100) : 0;
  const now = gameNow();
  const nextDiscovery = orders.lastAsteroidDiscoveryAt == null
    ? Math.max(0, (ASTEROID_DISCOVERY_INTERVAL_MS - Math.max(0, now - Number(orders.asteroidObservationStarted || now))) / 1000)
    : Math.max(0, (ASTEROID_DISCOVERY_INTERVAL_MS - (now - Number(orders.lastAsteroidDiscoveryAt))) / 1000);
  const discovered = orders.discoveredAsteroids.filter(asteroid => !asteroid.vanished && Number(asteroid.expiresAt) > now).length;
  const asteroidCards = orders.discoveredAsteroids.filter(asteroid => !asteroid.vanished && Number(asteroid.expiresAt) > now).map(asteroid => {
    const type = asteroidTypeByKey(asteroid.typeKey);
    const remaining = Math.max(0, Math.ceil((Number(asteroid.expiresAt) - now) / 1000));
    return `<div class="asteroid-card"><div class="asteroid-card-head"><strong>${type.icon} ${asteroid.name} · ${type.name}</strong><span class="asteroid-time">⏳ ${formatResearchTime(remaining)}</span></div><div class="asteroid-resources">${formatAsteroidResources(asteroid)}</div><small class="hint">Verschwindet nach 6 Ingame-Stunden. Eingesetzte Minerraketen kehren mit bereits abgebauter Fracht zurück.</small></div>`;
  }).join('');
  panel.innerHTML = `<div class="research-tabs" role="tablist" aria-label="Forschungsansicht">
    <button type="button" class="research-tab" data-research-tab="tree" role="tab" aria-selected="false">Forschungsbaum</button>
    <button type="button" class="research-tab active" data-research-tab="orders" role="tab" aria-selected="true">Forschungsaufträge</button>
  </div>
  <section class="research-order-card ${orders.completed.regenerativeChange ? 'research-done' : ''}">
    <div class="research-order-title"><strong>🌳 Regenerative Veränderung</strong><span class="research-order-status">${orders.completed.regenerativeChange ? 'Abgeschlossen' : active?.key === 'regenerativeChange' ? 'Läuft' : hasLab ? 'Verfügbar' : 'Gesperrt'}</span></div>
    <p>Forschungsdauer: <strong>20 Ingame-Minuten</strong> · Forschungskosten: <strong>${RESEARCH_ORDER_DEFS.regenerativeChange.cost.toLocaleString('de-DE')} FP</strong></p>
    <p class="hint">Dieser Forschungsvertrag ist Voraussetzung für die separate Forschung „Förster“ mit 16.000 FP.</p>
    <div class="research-order-prereq ${hasLab ? 'good' : 'warn'}">${hasLab ? '✓' : '🔒'} Forschungslabor auf Erde: ${hasLab ? 'vorhanden' : 'fehlt'}</div>
    <div class="research-order-prereq ${Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.regenerativeChange.cost || orders.completed.regenerativeChange || active?.key === 'regenerativeChange' ? 'good' : 'warn'}">${orders.completed.regenerativeChange ? '✓ Vertrag abgeschlossen' : active?.key === 'regenerativeChange' ? '✓ Forschungskosten bezahlt' : `Forschungspunkte: ${Number(state.research.points || 0).toLocaleString('de-DE')} / ${RESEARCH_ORDER_DEFS.regenerativeChange.cost.toLocaleString('de-DE')} FP`}</div>
    ${active?.key === 'regenerativeChange' ? `<div class="research-active"><strong>🌳 Regenerative Veränderung</strong><small>${formatGameDuration(Math.max(0, RESEARCH_ORDER_DEFS.regenerativeChange.duration - (gameNow() - active.started) / 1000))} verbleiben</small><div class="research-progress"><i style="width:${Math.min(100, ((gameNow() - active.started) / (RESEARCH_ORDER_DEFS.regenerativeChange.duration * 1000)) * 100)}%"></i></div><button type="button" class="research-cancel-order">Auftrag abbrechen (Startkosten zurückerstatten)</button></div>` : ''}
    ${!orders.completed.regenerativeChange && active?.key !== 'regenerativeChange' ? `<button type="button" class="research-start-order" data-order-start="regenerativeChange" ${hasLab && Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.regenerativeChange.cost && !active && !state.research.active ? '' : 'disabled'}>Forschung starten</button>` : ''}
    ${orders.completed.regenerativeChange ? '<div class="research-unlock">✓ Freigeschaltet: Forschung „Förster“</div>' : ''}
  </section>
  <section class="research-order-card ${orders.completed.kolonistenversorgung ? 'research-done' : ''}">
    <div class="research-order-title"><strong>👥 Kolonistenversorgung</strong><span class="research-order-status">${orders.completed.kolonistenversorgung ? 'Abgeschlossen' : active?.key === 'kolonistenversorgung' ? 'Läuft' : 'Verfügbar'}</span></div>
    <p>Forschungsdauer: <strong>20 Ingame-Minuten</strong> · Forschungskosten: <strong>${RESEARCH_ORDER_DEFS.kolonistenversorgung.cost.toLocaleString('de-DE')} FP</strong></p>
    <p class="hint">Dieser Auftrag schaltet im Forschungsbaum die beiden Projekte „Kakao-Plantage“ und „Schokoladenfabrik“ frei. Die Projekte sind vorher sichtbar, aber gesperrt.</p>
    <div class="research-order-prereq ${Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.kolonistenversorgung.cost || orders.completed.kolonistenversorgung || active?.key === 'kolonistenversorgung' ? 'good' : 'warn'}">${orders.completed.kolonistenversorgung ? '✓ Auftrag abgeschlossen' : active?.key === 'kolonistenversorgung' ? '✓ Forschungskosten bezahlt' : `🔒 Forschungspunkte: ${Number(state.research.points || 0).toLocaleString('de-DE')} / ${RESEARCH_ORDER_DEFS.kolonistenversorgung.cost.toLocaleString('de-DE')} FP`}</div>
    ${active?.key === 'kolonistenversorgung' ? `<div class="research-active"><strong>👥 Kolonistenversorgung</strong><small>${formatResearchTime(Math.max(0, RESEARCH_ORDER_DEFS.kolonistenversorgung.duration - (gameNow() - active.started) / 1000))} verbleiben</small><div class="research-progress"><i style="width:${Math.min(100, ((gameNow() - active.started) / (RESEARCH_ORDER_DEFS.kolonistenversorgung.duration * 1000)) * 100)}%"></i></div><button type="button" class="research-cancel-order">Auftrag abbrechen (Startkosten zurückerstatten)</button></div>` : ''}
    ${!orders.completed.kolonistenversorgung && active?.key !== 'kolonistenversorgung' ? `<button type="button" class="research-start-order" data-order-start="kolonistenversorgung" ${Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.kolonistenversorgung.cost && !active && !state.research.active ? '' : 'disabled'}>Forschung starten</button>` : ''}
    ${orders.completed.kolonistenversorgung ? '<div class="research-unlock">✓ Freigeschaltet: Kakao-Plantage und Schokoladenfabrik im Forschungsbaum</div>' : ''}
  </section>
  <section class="research-order-card ${orders.completed.systemFailure ? 'research-done' : ''}">
    <div class="research-order-title"><strong>📡 Das System wird versagen</strong><span class="research-order-status">${orders.completed.systemFailure ? 'Abgeschlossen' : active?.key === 'systemFailure' ? 'Läuft' : hasLab ? 'Verfügbar' : 'Gesperrt'}</span></div>
    <p>Forschungsdauer: <strong>3 Ingame-Tage</strong> · Forschungskosten: <strong>${RESEARCH_ORDER_DEFS.systemFailure.cost.toLocaleString('de-DE')} FP</strong></p>
    <p class="hint">Entschlüssele den Notruf aus dem All. Die Nachricht enthält Hinweise auf ein bislang unbekanntes Sonnensystem.</p>
    <div class="research-order-prereq ${hasLab ? 'good' : 'warn'}">${hasLab ? '✓' : '🔒'} Forschungslabor auf Erde: ${hasLab ? 'vorhanden' : 'fehlt'}</div>
    <div class="research-order-prereq ${Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.systemFailure.cost || orders.completed.systemFailure || active?.key === 'systemFailure' ? 'good' : 'warn'}">${orders.completed.systemFailure ? '✓ Vertrag abgeschlossen' : active?.key === 'systemFailure' ? '✓ Forschungskosten bezahlt' : `Forschungspunkte: ${Number(state.research.points || 0).toLocaleString('de-DE')} / ${RESEARCH_ORDER_DEFS.systemFailure.cost.toLocaleString('de-DE')} FP`}</div>
    ${active?.key === 'systemFailure' ? `<div class="research-active"><strong>📡 Das System wird versagen</strong><small>${formatResearchTime(Math.max(0, RESEARCH_ORDER_DEFS.systemFailure.duration - (gameNow() - active.started) / 1000))} verbleiben</small><div class="research-progress"><i style="width:${Math.min(100, ((gameNow() - active.started) / (RESEARCH_ORDER_DEFS.systemFailure.duration * 1000)) * 100)}%"></i></div><button type="button" class="research-cancel-order">Auftrag abbrechen (Startkosten zurückerstatten)</button></div>` : ''}
    ${!orders.completed.systemFailure && active?.key !== 'systemFailure' ? `<button type="button" class="research-start-order" data-order-start="systemFailure" ${hasLab && Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.systemFailure.cost && !active && !state.research.active ? '' : 'disabled'}>Forschung starten</button>` : ''}
    ${orders.completed.systemFailure ? '<div class="research-unlock">✓ Freigeschaltet: Sonnensystem 2 (spätere Erschließung)</div>' : ''}
  </section>
  <section class="research-order-card ${orders.completed.mobileMinerAsteroids ? 'research-done' : ''}">
    <div class="research-order-title"><strong>⛏️ Ah… Asteroiden sind nicht unerreichbar</strong><span class="research-order-status">${orders.completed.mobileMinerAsteroids ? 'Abgeschlossen' : active?.key === 'mobileMinerAsteroids' ? 'Läuft' : hasLab ? 'Raketentechnik' : 'Gesperrt'}</span></div>
    <p>Forschungsbereich: <strong>2 · Raketentechnik</strong> · Forschungsdauer: <strong>10 Ingame-Stunden</strong> · Forschungskosten: <strong>${RESEARCH_ORDER_DEFS.mobileMinerAsteroids.cost.toLocaleString('de-DE')} FP</strong></p>
    <p class="hint">Entwickle eine Mobile Minerrakete, die ausgewählte Asteroidenrohstoffe parallel abbaut und bei vollem Frachtraum automatisch zur Entladung zurückkehrt.</p>
    <div class="research-order-prereq ${hasLab ? 'good' : 'warn'}">${hasLab ? '✓' : '🔒'} Forschungslabor auf Erde: ${hasLab ? 'vorhanden' : 'fehlt'}</div>
    <div class="research-order-prereq ${Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.mobileMinerAsteroids.cost || orders.completed.mobileMinerAsteroids || active?.key === 'mobileMinerAsteroids' ? 'good' : 'warn'}">${orders.completed.mobileMinerAsteroids ? '✓ Vertrag abgeschlossen' : active?.key === 'mobileMinerAsteroids' ? '✓ Forschungskosten bezahlt' : `Forschungspunkte: ${Number(state.research.points || 0).toLocaleString('de-DE')} / ${RESEARCH_ORDER_DEFS.mobileMinerAsteroids.cost.toLocaleString('de-DE')} FP`}</div>
    ${active?.key === 'mobileMinerAsteroids' ? `<div class="research-active"><strong>⛏️ Ah… Asteroiden sind nicht unerreichbar</strong><small>${formatResearchTime(Math.max(0, RESEARCH_ORDER_DEFS.mobileMinerAsteroids.duration - (gameNow() - active.started) / 1000))} verbleiben</small><div class="research-progress"><i style="width:${Math.min(100, ((gameNow() - active.started) / (RESEARCH_ORDER_DEFS.mobileMinerAsteroids.duration * 1000)) * 100)}%"></i></div><button type="button" class="research-cancel-order">Auftrag abbrechen (Startkosten zurückerstatten)</button></div>` : ''}
    ${!orders.completed.mobileMinerAsteroids && active?.key !== 'mobileMinerAsteroids' ? `<button type="button" class="research-start-order" data-order-start="mobileMinerAsteroids" ${hasLab && Number(state.research.points || 0) >= RESEARCH_ORDER_DEFS.mobileMinerAsteroids.cost && !active && !state.research.active ? '' : 'disabled'}>Forschung starten</button>` : ''}
    ${orders.completed.mobileMinerAsteroids ? '<div class="research-unlock">✓ Freigeschaltet: Forschung „Mobile Minerrakete“ unter Raketentechnik</div>' : ''}
  </section>
  <section class="research-order-card ${completed ? 'research-done' : ''}">
    <div class="research-order-title"><strong>🔭 Himmelsbeobachtung</strong><span class="research-order-status">${completed ? 'Abgeschlossen' : skyActive ? 'Läuft' : hasPrerequisites && hasResearchPoints ? 'Verfügbar' : 'Gesperrt'}</span></div>
    <p>Forschungsdauer: <strong>2 Ingame-Stunden</strong> · Forschungskosten: <strong>${RESEARCH_ORDER_DEFS.skyObservation.cost.toLocaleString('de-DE')} FP</strong> · Belohnung: <strong>500 Forschungspunkte</strong></p>
    <p class="hint">Freischaltung: Asteroidenbeobachtung. Nach Abschluss beginnt eine Beobachtungsphase. Nach jeweils 5 Ingame-Minuten wird eine weitere Entdeckung möglich, bis maximal fünf Asteroiden entdeckt wurden.</p>
    <div class="research-order-prereq ${hasPrerequisites ? 'good' : 'warn'}">${hasLab ? '✓' : '🔒'} Forschungslabor auf Erde: ${hasLab ? 'vorhanden' : 'fehlt'}</div>
    <div class="research-order-prereq ${hasObservatory ? 'good' : 'warn'}">${hasObservatory ? '✓' : '🔒'} Observatorium auf Erdoberfläche: ${hasObservatory ? 'vorhanden' : 'fehlt'}</div>
    <div class="research-order-prereq ${hasResearchPoints ? 'good' : 'warn'}">${hasResearchPoints ? '✓' : '🔒'} ${completed ? 'Forschungskosten erfüllt' : skyActive ? 'Forschungskosten bezahlt' : `Forschungspunkte: ${Number(state.research.points || 0).toLocaleString('de-DE')} / ${RESEARCH_ORDER_DEFS.skyObservation.cost.toLocaleString('de-DE')} FP`}</div>
    ${skyActive ? `<div class="research-active"><strong>Forschung läuft</strong><small>${formatResearchTime(remaining)} verbleiben</small><div class="research-progress"><i style="width:${progress}%"></i></div><button type="button" class="research-cancel-order">Auftrag abbrechen (Startkosten zurückerstatten)</button></div>` : ''}
    ${!completed && !skyActive ? `<button type="button" class="research-start-order" ${hasPrerequisites && hasResearchPoints && !state.research.active && !active ? '' : 'disabled'}>Forschung starten</button>` : ''}
    ${completed ? `<div class="research-unlock">✓ Freigeschaltet: Asteroidenbeobachtung</div><div class="research-observation"><strong>Asteroidenfeld</strong><p>${discovered} / ${ASTEROID_MAX_ACTIVE} aktive Asteroiden</p>${orders.asteroidObservationStarted == null ? '<span class="hint">Die Beobachtungsphase startet nach Abschluss der Forschung.</span>' : `<span class="hint">Nächste mögliche Entdeckung in ${formatResearchTime(nextDiscovery)} (Ingame-Zeit). Neue Asteroiden erscheinen, sobald weniger als fünf aktiv sind.</span>`}</div><div class="asteroid-list">${asteroidCards || '<p class="hint">Noch keine aktiven Asteroiden entdeckt.</p>'}</div>` : ''}
  </section>
  <p class="hint">Es kann nur ein Forschungsprojekt gleichzeitig laufen – auch aus dem Forschungsbaum. Bei einem Abbruch werden die eingesetzten Forschungspunkte vollständig zurückerstattet.</p>`;
  panel.querySelectorAll('[data-research-tab]').forEach(button => button.addEventListener('click', () => {
    panel.dataset.activeResearchTab = button.dataset.researchTab;
    renderResearch();
  }));
  panel.querySelectorAll('.research-button[data-research]').forEach(button => {
    button.addEventListener('click', () => startResearch(button.dataset.research));
  });
  panel.querySelectorAll('[data-order-start]').forEach(button => button.addEventListener('click', () => startResearchOrder(button.dataset.orderStart)));
  panel.querySelector('.research-start-order:not([data-order-start])')?.addEventListener('click', startSkyObservationResearch);
  panel.querySelector('.research-cancel-order')?.addEventListener('click', cancelSkyObservationResearch);
}

function startResearchOrder(key) {
  if (key === 'skyObservation') return startSkyObservationResearch();
  const orders = ensureResearchOrders();
  const def = RESEARCH_ORDER_DEFS[key];
  if (!def || !['kolonistenversorgung','regenerativeChange','systemFailure','mobileMinerAsteroids'].includes(key) || orders.active || orders.completed[key] || state.research.active || !researchAvailable() || Number(state.research.points || 0) < def.cost) return;
  if ((key === 'systemFailure' || key === 'mobileMinerAsteroids') && researchLabCount() < 1) return;
  state.research.points -= def.cost;
  const now = gameNow();
  const savedElapsedMs = Math.max(0, Number(orders.progress[key] || 0));
  orders.active = { key, started: now - savedElapsedMs };
  playUiSound('research');
  renderResearch();
  saveGame(false);
}

function startSkyObservationResearch() {
  const orders = ensureResearchOrders();
  const def = RESEARCH_ORDER_DEFS.skyObservation;
  const hasObservatory = Number(getBuildingsOnPlanet('earth').observatory || 0) > 0;
  if (orders.active || orders.completed.skyObservation || state.research.active || !researchAvailable() || researchLabCount() < 1 || !hasObservatory || Number(state.research.points || 0) < def.cost) return;
  state.research.points -= def.cost;
  const now = gameNow();
  const savedElapsedMs = Math.max(0, Number(orders.progress.skyObservation || 0));
  orders.active = { key: 'skyObservation', started: now - savedElapsedMs };
  playUiSound('research');
  renderResearch();
  saveGame(false);
}

function cancelSkyObservationResearch() {
  const orders = ensureResearchOrders();
  if (!orders.active) return;
  const active = orders.active;
  const def = RESEARCH_ORDER_DEFS[active.key];
  // Fortschritt separat speichern. Beim erneuten Start wird die bereits investierte
  // Ingame-Zeit angerechnet, statt den Auftrag von vorn beginnen zu lassen.
  orders.progress[active.key] = Math.min(
    Number(def?.duration || 0) * 1000,
    Math.max(0, gameNow() - Number(active.started || gameNow()))
  );
  // Die Startkosten werden wie bisher zurückerstattet; beim Neustart werden sie erneut bezahlt.
  if (def) state.research.points = Number(state.research.points || 0) + Number(def.cost || 0);
  orders.active = null;
  renderResearch();
  saveGame(false);
}

function updateResearchOrders(now) {
  const orders = ensureResearchOrders();
  if (orders.active) {
    const def = RESEARCH_ORDER_DEFS[orders.active.key];
    if (def && now - orders.active.started >= def.duration * 1000) {
      const completedKey = orders.active.key;
      orders.active = null;
      delete orders.progress[completedKey];
      if (!orders.completed[completedKey]) {
        orders.completed[completedKey] = true;
        state.research.points = Number(state.research.points || 0) + Number(def.rewardPoints || 0);
        if (completedKey === 'skyObservation') {
          orders.asteroidObservationStarted = now;
          orders.lastAsteroidDiscoveryAt = null;
        }
        if (completedKey === 'systemFailure') {
          refreshSystemFailureUnlock();
          showSystemFailureStory();
        }
        playUiSound('research');
        saveGame(false);
        renderResearch();
      }
    }
  }
  if (!orders.completed.skyObservation || orders.asteroidObservationStarted == null) return;

  let changed = false;
  // Asteroiden verschwinden nach sechs Ingame-Stunden. Dort arbeitende Minerraketen
  // kehren mit ihrer vorhandenen Fracht zurück; der restliche Rohstoffbestand geht verloren.
  orders.discoveredAsteroids.forEach(asteroid => {
    if (!asteroid.vanished && Number(asteroid.expiresAt) <= now) {
      asteroid.vanished = true;
      orders.mobileMiners.filter(miner => miner.asteroidId === asteroid.id && !['waiting','returning','unloading'].includes(miner.status)).forEach(miner => beginMinerReturn(miner, now, 'Asteroid verschwunden'));
      changed = true;
      notifyAsteroidEvent(`☄️ ${asteroid.name} ist verschwunden. Eingesetzte Minerraketen kehren zurück.`);
    }
  });
  const before = orders.discoveredAsteroids.length;
  orders.discoveredAsteroids = orders.discoveredAsteroids.filter(asteroid => !asteroid.vanished || orders.mobileMiners.some(miner => miner.asteroidId === asteroid.id && !['waiting'].includes(miner.status)));
  if (orders.discoveredAsteroids.length !== before) changed = true;

  const activeAsteroids = orders.discoveredAsteroids.filter(asteroid => !asteroid.vanished && Number(asteroid.expiresAt) > now);
  const lastDiscovery = orders.lastAsteroidDiscoveryAt == null ? Number(orders.asteroidObservationStarted) : Number(orders.lastAsteroidDiscoveryAt);
  if (activeAsteroids.length < ASTEROID_MAX_ACTIVE && now - lastDiscovery >= ASTEROID_DISCOVERY_INTERVAL_MS) {
    const number = orders.nextAsteroidNumber++;
    const activeTypes = new Set(activeAsteroids.map(asteroid => asteroid.typeKey));
    const availableTypes = ASTEROID_TYPES.filter(type => !activeTypes.has(type.key));
    const type = availableTypes[Math.floor(Math.random() * availableTypes.length)] || ASTEROID_TYPES[Math.floor(Math.random() * ASTEROID_TYPES.length)];
    const newAsteroid = makeAsteroid(number, now, type);
    orders.discoveredAsteroids.push(newAsteroid);
    orders.lastAsteroidDiscoveryAt = now;
    changed = true;
    playUiSound('research');
    notifyAsteroidEvent(`☄️ Neuer Asteroid entdeckt: ${newAsteroid.name} (${type.name})`);
  }
  if (changed) { saveGame(false); renderAsteroidVisuals(); if (!document.querySelector('#asteroids-panel')?.hidden) renderAsteroidsPanel(); }
}

const MOBILE_MINER_CAPACITY = 10000;
const MOBILE_MINER_RATE = 0.2;
const MOBILE_MINER_TRAVEL_SECONDS = 20;
function notifyAsteroidEvent(message) {
  let toast = document.getElementById('asteroid-notification');
  if (!toast) {
    toast = document.createElement('div'); toast.id = 'asteroid-notification'; toast.className = 'asteroid-notification';
    document.body.appendChild(toast);
  }
  toast.textContent = message; toast.hidden = false;
  clearTimeout(notifyAsteroidEvent.timer);
  notifyAsteroidEvent.timer = setTimeout(() => { toast.hidden = true; }, 6500);
}
function asteroidResourceKeys(asteroid) { return asteroidTypeByKey(asteroid.typeKey).resources.map(r => r.key).filter(key => Number(asteroid.resources?.[key] || 0) > 0); }
function beginMinerReturn(miner, now = gameNow(), reason = 'Rückruf') {
  if (!miner || ['returning','unloading','waiting'].includes(miner.status)) return;
  miner.status = 'returning'; miner.statusStarted = now; miner.duration = flightDurationSeconds(miner.destination, miner.destinationMode || 'surface') * 1000; miner.returnReason = reason; miner.paused = false;
}
function updateMobileMiners(now) {
  const orders = ensureResearchOrders();
  if (!state.research?.completed?.mobileMiner) return;
  let changed = false;
  for (const miner of orders.mobileMiners) {
    const asteroid = orders.discoveredAsteroids.find(a => a.id === miner.asteroidId);
    if (asteroid?.vanished && !['returning','unloading','waiting'].includes(miner.status)) beginMinerReturn(miner, now, 'Asteroid verschwunden');
    if (miner.status === 'approach' && now - Number(miner.statusStarted || now) >= Number(miner.duration || MOBILE_MINER_TRAVEL_SECONDS * 1000)) {
      if (!asteroid || asteroid.vanished) beginMinerReturn(miner, now, 'Asteroid nicht mehr verfügbar');
      else { miner.status = miner.paused ? 'paused' : 'mining'; miner.statusStarted = now; }
      changed = true;
    } else if (miner.status === 'returning' && now - Number(miner.statusStarted || now) >= Number(miner.duration || 1000)) {
      miner.status = 'unloading'; miner.statusStarted = now; miner.duration = 1000; changed = true;
    } else if (miner.status === 'unloading' && now - Number(miner.statusStarted || now) >= Number(miner.duration || 1000)) {
      const storage = getLocationStorage(miner.destination, miner.destinationMode || 'surface');
      Object.entries(miner.cargo || {}).forEach(([key, amount]) => { if (Number(amount) > 0) storage[key] = Number(storage[key] || 0) + Number(amount); });
      const returnedAsteroid = orders.discoveredAsteroids.find(a => a.id === miner.asteroidId);
      const canResumeMining = miner.returnReason === 'Frachtraum voll' && returnedAsteroid && !returnedAsteroid.vanished && Number(returnedAsteroid.expiresAt) > now && (miner.resourcesSelected || []).some(key => Number(returnedAsteroid.resources?.[key] || 0) > 0);
      miner.cargo = {};
      if (canResumeMining) {
        miner.status = 'approach'; miner.statusStarted = now; miner.duration = MOBILE_MINER_TRAVEL_SECONDS * 1000; miner.lastMineAt = now; miner.paused = false;
        notifyAsteroidEvent(`🚀 ${miner.name} hat entladen und fliegt zum Asteroiden zurück.`);
      } else {
        miner.status = 'waiting'; miner.statusStarted = now; miner.duration = 0; miner.asteroidId = null; miner.source = miner.destination;
        notifyAsteroidEvent(`📦 ${miner.name} hat entladen und wartet auf eine neue Asteroidenzuweisung.`);
      }
      miner.returnReason = ''; changed = true;
    } else if (miner.status === 'mining' && !miner.paused) {
      if (!asteroid || asteroid.vanished) { beginMinerReturn(miner, now, 'Asteroid verschwunden'); changed = true; continue; }
      const selected = (miner.resourcesSelected || []).filter(key => (key !== 'nickelOre' || state.research?.completed?.nickelMining) && Number(asteroid.resources?.[key] || 0) > 0);
      if (!selected.length) { beginMinerReturn(miner, now, 'Alle ausgewählten Rohstoffe erschöpft'); changed = true; continue; }
      const elapsed = Math.max(0, Math.min(1000, now - Number(miner.lastMineAt || now))) / 1000;
      miner.lastMineAt = now;
      const cargo = miner.cargo || (miner.cargo = {});
      let total = Object.values(cargo).reduce((sum, amount) => sum + Number(amount || 0), 0);
      const free = Math.max(0, MOBILE_MINER_CAPACITY - total);
      const share = selected.length ? free / selected.length : 0;
      for (const key of selected) {
        if (total >= MOBILE_MINER_CAPACITY - 0.000001) break;
        const amount = Math.min(Number(asteroid.resources[key] || 0), MOBILE_MINER_RATE * elapsed, share, MOBILE_MINER_CAPACITY - total);
        if (amount > 0) { asteroid.resources[key] = Math.max(0, Number(asteroid.resources[key]) - amount); cargo[key] = Number(cargo[key] || 0) + amount; total += amount; }
      }
      if (total >= MOBILE_MINER_CAPACITY - 0.001) { beginMinerReturn(miner, now, 'Frachtraum voll'); changed = true; }
      if (!selected.some(key => Number(asteroid.resources?.[key] || 0) > 0)) { beginMinerReturn(miner, now, 'Alle ausgewählten Rohstoffe erschöpft'); changed = true; }
    }
  }
  if (changed) { saveGame(false); if (!document.querySelector('#asteroids-panel')?.hidden) renderAsteroidsPanel(); }
}
function launchMobileMiners(asteroidId, source, quantity, selectedResources, destination, destinationMode) {
  const orders = ensureResearchOrders();
  if (!state.research?.completed?.mobileMiner) return;
  const asteroid = orders.discoveredAsteroids.find(a => a.id === asteroidId && !a.vanished && Number(a.expiresAt) > gameNow());
  quantity = Math.max(1, Math.min(100, Math.floor(Number(quantity) || 1)));
  if (!asteroid || !bodies[source] || source === 'sun' || !bodies[destination] || destination === 'sun') return;
  const stockAvailable = Number(rocketStockMobileMiner[source] || 0);
  const waitingMiners = orders.mobileMiners.filter(miner => miner.status === 'waiting' && miner.source === source);
  const available = stockAvailable + waitingMiners.length;
  const resources = [...new Set(selectedResources)].filter(key => (key !== 'nickelOre' || state.research?.completed?.nickelMining) && asteroidResourceKeys(asteroid).includes(key));
  if (!available || !resources.length) return;
  quantity = Math.min(quantity, available);
  const fromStock = Math.min(quantity, stockAvailable);
  rocketStockMobileMiner[source] = stockAvailable - fromStock;
  const now = gameNow();
  for (let i=0;i<quantity;i++) {
    const miner = i >= fromStock ? waitingMiners[i - fromStock] : null;
    if (miner) {
      Object.assign(miner, { source, asteroidId, destination, destinationMode: (destinationMode === 'orbit' || ['jupiter','neptune'].includes(destination)) ? 'orbit' : 'surface', resourcesSelected: resources.slice(), cargo: {}, status: 'approach', statusStarted: now, lastMineAt: now, duration: MOBILE_MINER_TRAVEL_SECONDS * 1000, paused: false, returnReason: '' });
    } else {
      orders.mobileMiners.push({ id: `mobile-miner-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, name: `Mobile Minerrakete ${String(orders.mobileMiners.length + 1).padStart(2,'0')}`, source, asteroidId, destination, destinationMode: (destinationMode === 'orbit' || ['jupiter','neptune'].includes(destination)) ? 'orbit' : 'surface', resourcesSelected: resources.slice(), cargo: {}, status: 'approach', statusStarted: now, lastMineAt: now, duration: MOBILE_MINER_TRAVEL_SECONDS * 1000, paused: false });
    }
  }
  saveGame(false); renderAsteroidsPanel(); renderInfo();
}
function controlMobileMiner(id, action) {
  const orders = ensureResearchOrders(); const miner = orders.mobileMiners.find(m => m.id === id); if (!miner) return;
  const now = gameNow();
  if (action === 'stop') { if (miner.status === 'mining') { miner.status = 'paused'; miner.paused = true; miner.statusStarted = now; } }
  if (action === 'resume') { if (miner.status === 'paused') { miner.status = 'mining'; miner.paused = false; miner.lastMineAt = now; } }
  if (action === 'return') beginMinerReturn(miner, now, 'Manueller Rückruf');
  if (action === 'start') { const asteroid = orders.discoveredAsteroids.find(a => a.id === miner.asteroidId && !a.vanished); if (miner.status === 'paused' && asteroid) { miner.status = 'mining'; miner.paused = false; miner.lastMineAt = now; } }
  saveGame(false); renderAsteroidsPanel();
}
function updateMobileMinerSettings(id, destination, destinationMode, resourcesSelected) {
  const miner = ensureResearchOrders().mobileMiners.find(m => m.id === id); if (!miner) return;
  if (bodies[destination] && destination !== 'sun') { miner.destination = destination; miner.destinationMode = (destinationMode === 'orbit' || ['jupiter','neptune'].includes(destination)) ? 'orbit' : 'surface'; if (miner.status === 'returning') { miner.statusStarted = gameNow(); miner.duration = flightDurationSeconds(miner.destination, miner.destinationMode) * 1000; } }
  const asteroid = ensureResearchOrders().discoveredAsteroids.find(a => a.id === miner.asteroidId && !a.vanished);
  if (asteroid && Array.isArray(resourcesSelected)) {
    miner.resourcesSelected = [...new Set(resourcesSelected)].filter(key => (key !== 'nickelOre' || state.research?.completed?.nickelMining) && asteroidResourceKeys(asteroid).includes(key));
    if (!miner.resourcesSelected.length && miner.status === 'mining') { miner.status = 'paused'; miner.paused = true; }
    else if (miner.resourcesSelected.length && miner.status === 'paused' && miner.paused && !asteroid.vanished) { miner.status = 'mining'; miner.paused = false; miner.lastMineAt = gameNow(); }
  }
  saveGame(false); renderAsteroidsPanel();
}
function updateAsteroidPanelLive() {
  const panel = document.querySelector('#asteroids-content'); if (!panel) return;
  const orders = ensureResearchOrders(); const fmt = n => Number(n || 0).toLocaleString('de-DE',{maximumFractionDigits:2});
  panel.querySelectorAll('[data-asteroid-resource]').forEach(node => {
    const [asteroidId, key] = node.dataset.asteroidResource.split(':'); const asteroid = orders.discoveredAsteroids.find(a => a.id === asteroidId); if (!asteroid) return;
    const amount = Math.max(0, Number(asteroid.resources?.[key] || 0)); node.textContent = `${fmt(amount)} t`;
    const type = asteroidTypeByKey(asteroid.typeKey); const max = Number(type.resources.find(r=>r.key===key)?.max || 1);
    const bar = panel.querySelector(`[data-asteroid-bar="${asteroidId}:${key}"]`); if (bar) bar.style.width = `${Math.max(0,Math.min(100,amount/max*100))}%`;
  });
  orders.mobileMiners.forEach(miner => {
    const total = Object.values(miner.cargo || {}).reduce((sum,n)=>sum+Number(n||0),0);
    const cargo = panel.querySelector(`[data-miner-cargo="${miner.id}"]`); if (cargo) cargo.textContent = `${fmt(total)} / ${fmt(MOBILE_MINER_CAPACITY)} t`;
    const free = panel.querySelector(`[data-miner-free="${miner.id}"]`); if (free) free.textContent = `${fmt(MOBILE_MINER_CAPACITY-total)} t frei`;
    const fill = panel.querySelector(`[data-miner-fill="${miner.id}"]`); if (fill) fill.style.width = `${Math.min(100,total/MOBILE_MINER_CAPACITY*100)}%`;
    const status = panel.querySelector(`[data-miner-status="${miner.id}"]`); if (status) status.textContent = ({approach:'Anflug',mining:'Abbau',paused:'Abbau gestoppt',returning:'Rückflug',unloading:'Entladen',waiting:'Wartet'}[miner.status] || miner.status);
  });
}

function renderAsteroidsPanel() {
  const panel = document.querySelector('#asteroids-content'); if (!panel) return;
  const orders = ensureResearchOrders(); const now = gameNow();
  const unlocked = !!state.research?.completed?.mobileMiner;
  const activeAsteroids = orders.discoveredAsteroids.filter(a => !a.vanished && Number(a.expiresAt) > now);
  const planetOptions = Object.keys(bodies).filter(id => id !== 'sun').map(id => `<option value="${id}">${bodies[id].name}</option>`).join('');
  const statusNames = {approach:'Anflug',mining:'Abbau',paused:'Abbau gestoppt',returning:'Rückflug',unloading:'Entladen',waiting:'Wartet'};
  const fmt = n => Number(n || 0).toLocaleString('de-DE',{maximumFractionDigits:2});
  const asteroidRows = activeAsteroids.map(asteroid => {
    const type = asteroidTypeByKey(asteroid.typeKey); const keys = asteroidResourceKeys(asteroid);
    const miners = orders.mobileMiners.filter(m => m.asteroidId === asteroid.id && m.status !== 'waiting');
    const resourceRows = type.resources.map(r => { const amount=Math.max(0,Number(asteroid.resources?.[r.key]||0)); const original=Number(r.max||1); return `<div class="asteroid-resource-row"><span>${resourceIcons[r.key]||'📦'} ${resourceNames[r.key]||r.key}</span><strong data-asteroid-resource="${asteroid.id}:${r.key}">${fmt(amount)} t</strong><div class="asteroid-resource-track"><i data-asteroid-bar="${asteroid.id}:${r.key}" style="width:${Math.max(0,Math.min(100,amount/original*100))}%"></i></div></div>`; }).join('');
    const resourceChecks = keys.map(key => { const locked = key === 'nickelOre' && !state.research?.completed?.nickelMining; return `<label class="asteroid-check"><input type="checkbox" class="miner-resource-choice" value="${key}" ${locked ? 'disabled' : 'checked'}> ${resourceIcons[key]||'📦'} ${resourceNames[key]||key}${locked ? ' 🔒 Forschung erforderlich' : ''}</label>`; }).join('');
    const stockOptions = Object.keys(bodies).filter(id => id !== 'sun' && (Number(rocketStockMobileMiner[id]||0) + orders.mobileMiners.filter(miner => miner.status === 'waiting' && miner.source === id).length)>0).map(id => { const count=Number(rocketStockMobileMiner[id]||0)+orders.mobileMiners.filter(miner=>miner.status==='waiting'&&miner.source===id).length; return `<option value="${id}">${bodies[id].name} (${count} verfügbar)</option>`; }).join('');
    return `<article class="asteroid-management-card"><div class="asteroid-management-head"><div><strong>${type.icon} ${asteroid.name} · ${type.name}</strong><small>Verbleibende Zeit: ${formatResearchTime(Math.max(0,(asteroid.expiresAt-now)/1000))}</small></div><span class="research-order-status">${miners.length} Raketen</span></div><div class="asteroid-resource-grid">${resourceRows}</div><details class="asteroid-dispatch"><summary>⛏️ Minerraketen zuweisen und starten</summary>${unlocked ? (stockOptions ? `<div class="asteroid-form-row"><label>Raketenbestand<select class="miner-source">${stockOptions}</select></label><label>Anzahl<input class="miner-quantity" type="number" min="1" max="100" value="1"></label></div><div class="asteroid-form-label">Abzubauende Rohstoffe</div><div class="asteroid-checks">${resourceChecks}</div><div class="asteroid-form-row"><label>Entladeplanet<select class="miner-destination">${planetOptions}</select></label><label>Entladeort<select class="miner-mode"><option value="surface">Oberfläche</option><option value="orbit">Orbit</option></select></label></div><button class="miner-launch" data-asteroid-id="${asteroid.id}">🚀 Ausgewählte Raketen starten</button>` : '<p class="hint">Keine verfügbaren Mobile Minerraketen im Bestand.</p>') : '<p class="hint">🔒 Forschung fehlt: Schließe den Forschungsauftrag ab und erforsche anschließend die Mobile Minerrakete unter Raketentechnik. Danach kannst du Mobile Minerraketen bauen und einsetzen.</p>'}</details><div class="asteroid-assigned-list">${miners.length ? miners.map(miner => { const total=Object.values(miner.cargo||{}).reduce((sum,n)=>sum+Number(n||0),0); const percent=Math.min(100,total/MOBILE_MINER_CAPACITY*100); const currentAsteroid=orders.discoveredAsteroids.find(a=>a.id===miner.asteroidId); const choices=(currentAsteroid ? asteroidResourceKeys(currentAsteroid) : (miner.resourcesSelected||[])).map(key=>{const locked=key==='nickelOre'&&!state.research?.completed?.nickelMining;return `<label class="asteroid-check"><input type="checkbox" class="miner-setting-resource" data-miner-id="${miner.id}" value="${key}" ${locked?'disabled':((miner.resourcesSelected||[]).includes(key)?'checked':'')}>${resourceNames[key]||key}${locked?' 🔒 Forschung erforderlich':''}</label>`;}).join(''); return `<div class="mobile-miner-row"><div class="mobile-miner-row-head"><strong>⛏️ ${miner.name}</strong><span class="miner-status" data-miner-status="${miner.id}">${statusNames[miner.status]||miner.status}</span></div><div class="mobile-miner-fill-label"><span>Frachtraum</span><strong data-miner-cargo="${miner.id}">${fmt(total)} / ${fmt(MOBILE_MINER_CAPACITY)} t</strong><span data-miner-free="${miner.id}">${fmt(MOBILE_MINER_CAPACITY-total)} t frei</span></div><div class="asteroid-resource-track miner-fill"><i data-miner-fill="${miner.id}" style="width:${percent}%"></i></div><small>Rohstoffe: ${(miner.resourcesSelected||[]).map(key=>resourceNames[key]||key).join(', ')||'Keine'} · Ziel: ${bodies[miner.destination]?.name||miner.destination}, ${miner.destinationMode==='orbit'?'Orbit':'Oberfläche'}</small><details class="miner-controls"><summary>Steuerung</summary><div class="asteroid-form-row"><label>Entladeplanet<select class="miner-setting-destination" data-miner-id="${miner.id}">${Object.keys(bodies).filter(id=>id!=='sun').map(id=>`<option value="${id}" ${id===miner.destination?'selected':''}>${bodies[id].name}</option>`).join('')}</select></label><label>Entladeort<select class="miner-setting-mode" data-miner-id="${miner.id}"><option value="surface" ${miner.destinationMode!=='orbit'?'selected':''}>Oberfläche</option><option value="orbit" ${miner.destinationMode==='orbit'?'selected':''}>Orbit</option></select></label></div><div class="asteroid-checks">${choices}</div><div class="miner-control-buttons">${miner.status==='paused'?`<button data-miner-action="resume" data-miner-id="${miner.id}">▶ Abbau fortsetzen</button>`:miner.status==='mining'?`<button data-miner-action="stop" data-miner-id="${miner.id}">⏸ Abbau stoppen</button>`:''}<button data-miner-action="return" data-miner-id="${miner.id}">↩ Rakete zurückrufen</button><button data-miner-action="apply" data-miner-id="${miner.id}">Einstellungen übernehmen</button></div></details></div>`; }).join('') : '<p class="hint">Noch keine Minerraketen diesem Asteroiden zugewiesen.</p>'}</div></article>`;
  }).join('');
  const fleet = orders.mobileMiners.filter(m => m.status === 'waiting' || !activeAsteroids.some(a=>a.id===m.asteroidId));
  panel.innerHTML = `${!unlocked ? '<div class="research-order-prereq warn">🔒 Asteroidenabbau wird nach dem Forschungsvertrag „Ah… Asteroiden sind nicht unerreichbar“ freigeschaltet.</div>' : '<p class="hint">Dynamischer Abbau: Du kannst beliebig viele verfügbare Raketen auf mehrere Asteroiden verteilen. Alle Abbauvorgänge laufen gleichzeitig. Frachtraum je Rakete: 10.000 t · Förderrate: 0,2 t/s je ausgewähltem Rohstoff.</p>'}<div class="asteroid-management-list">${asteroidRows || '<p class="hint">Aktuell keine Asteroiden verfügbar. Neue Entdeckungen erscheinen automatisch.</p>'}</div><section class="asteroid-fleet-waiting"><h3>🚀 Flotte unterwegs oder wartet</h3>${orders.mobileMiners.filter(m=>['returning','waiting','approach','unloading'].includes(m.status)).map(miner=>{const total=Object.values(miner.cargo||{}).reduce((sum,n)=>sum+Number(n||0),0);return `<div class="mobile-miner-row"><div class="mobile-miner-row-head"><strong>${miner.name}</strong><span class="miner-status" data-miner-status="${miner.id}">${statusNames[miner.status]||miner.status}</span></div><div class="mobile-miner-fill-label"><span>Frachtraum</span><strong>${fmt(total)} / 10.000 t</strong><span>${fmt(MOBILE_MINER_CAPACITY-total)} t frei</span></div><div class="asteroid-resource-track miner-fill"><i style="width:${Math.min(100,total/MOBILE_MINER_CAPACITY*100)}%"></i></div><details class="miner-controls fleet-miner-controls"><summary>Steuerung / Entladeziel ändern</summary><div class="asteroid-form-row"><label>Entladeplanet<select class="miner-setting-destination" data-miner-id="${miner.id}">${Object.keys(bodies).filter(id=>id!=='sun').map(id=>`<option value="${id}" ${id===miner.destination?'selected':''}>${bodies[id].name}</option>`).join('')}</select></label><label>Entladeort<select class="miner-setting-mode" data-miner-id="${miner.id}"><option value="surface" ${miner.destinationMode!=='orbit'?'selected':''}>Oberfläche</option><option value="orbit" ${miner.destinationMode==='orbit'?'selected':''}>Orbit</option></select></label></div><div class="miner-control-buttons"><button data-miner-action="apply" data-miner-id="${miner.id}">Entladeziel übernehmen</button>${miner.status!=='waiting' ? `<button data-miner-action="return" data-miner-id="${miner.id}">↩ Rakete zurückrufen</button>` : '<small>Wartet auf deine nächste Asteroiden-Zuweisung.</small>'}</div></details></div>`;}).join('')||'<p class="hint">Keine weiteren Raketen.</p>'}</section>`;
  panel.querySelectorAll('.miner-launch').forEach(button=>button.addEventListener('click',()=>{const card=button.closest('.asteroid-management-card');const resources=[...card.querySelectorAll('.miner-resource-choice:checked')].map(input=>input.value);launchMobileMiners(button.dataset.asteroidId,card.querySelector('.miner-source')?.value,card.querySelector('.miner-quantity')?.value,resources,card.querySelector('.miner-destination')?.value,card.querySelector('.miner-mode')?.value);}));
  panel.querySelectorAll('[data-miner-action]').forEach(button=>button.addEventListener('click',()=>{const id=button.dataset.minerId;const action=button.dataset.minerAction;if(action!=='apply'){controlMobileMiner(id,action);return;}const card=button.closest('.mobile-miner-row');const dest=card.querySelector('.miner-setting-destination')?.value;const mode=card.querySelector('.miner-setting-mode')?.value;const resourceInputs=[...card.querySelectorAll('.miner-setting-resource')];const resources=resourceInputs.length?[...card.querySelectorAll('.miner-setting-resource:checked')].map(input=>input.value):undefined;updateMobileMinerSettings(id,dest,mode,resources);}));
}

function startResearch(key) {
  if (!researchAvailable() || !researchTypes[key] || state.research.active || ensureResearchOrders().active || state.research.completed[key]) return;
  if ((key === 'cocoaPlantation' || key === 'chocolateFactory' || key === 'luxuryFurnitureFactory') && !ensureResearchOrders().completed.kolonistenversorgung) return;
  if (key === 'mobileMiner' && !ensureResearchOrders().completed.mobileMinerAsteroids) return;
  if (key === 'forester' && !ensureResearchOrders().completed.regenerativeChange) return;
  const r = researchTypes[key];
  if (Number(state.research.points || 0) < r.cost) return;
  if (r.chipCost && Number(state.chips || 0) < r.chipCost) return;
  state.research.points -= r.cost;
  if (r.chipCost) state.chips -= r.chipCost;
  if (Number(r.time || 0) <= 0) {
    state.research.completed[key] = true;
    playUiSound('research');
    renderResearch();
    saveGame(false);
    return;
  }
  const now = gameNow();
  const savedElapsedMs = Math.max(0, Number(state.research.progress[key] || 0));
  state.research.active = { key, started: now - savedElapsedMs };
  renderResearch();
  saveGame(false);
}

function cancelActiveTreeResearch() {
  const active = state.research?.active;
  if (!active) return;
  const def = researchTypes[active.key];
  if (!state.research.progress || typeof state.research.progress !== 'object') state.research.progress = {};
  state.research.progress[active.key] = Math.min(
    Number(def?.time || 0) * 1000,
    Math.max(0, gameNow() - Number(active.started || gameNow()))
  );
  // Wie bei bisherigen Abbrüchen werden die Startkosten zurückgegeben.
  if (def) {
    state.research.points = Number(state.research.points || 0) + Number(def.cost || 0);
    if (def.chipCost) state.chips = Number(state.chips || 0) + Number(def.chipCost || 0);
  }
  state.research.active = null;
  renderResearch();
  saveGame(false);
}

function updateResearch(now) {
  updateResearchOrders(now);
  if (!state.research?.active) return;
  const active = state.research.active;
  const r = researchTypes[active.key];
  if (!r) { state.research.active = null; return; }
  // Forschung läuft nur, solange mindestens ein geeignetes Labor vorhanden ist.
  if (!researchAvailable()) {
    if (active.pausedAt == null) active.pausedAt = now;
    return;
  }
  if (active.pausedAt != null) {
    active.started += Math.max(0, now - active.pausedAt);
    delete active.pausedAt;
  }
  if (now - active.started >= r.time * 1000) {
    state.research.completed[active.key] = true;
    if (state.research.progress) delete state.research.progress[active.key];
    playUiSound('research');
    state.research.active = null;
    renderResearch();
    saveGame(false);
  }
}

function showSaveStatus(message, good = true) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${good ? 'good' : 'bad'}`;
}

function getSaveData() {
  return {
    version: 3,
    market,
    savedAt: new Date().toISOString(),
    gameClock: { elapsedMs: gameNow(), speed: gameSpeed },
    state: { ...state, lastUpdate: undefined, buildMenuOpen: false, buildings: { ...state.buildings } },
    bodies,
    rockets,
    orbitMissions,
    orbitMissionCounter,
    rocketBuildQueue,
    rocketBuildStarted,
    rocketStock,
    rocketStock2,
    rocketBuildQueue2,
    rocketBuildStarted2,
    rocketStockAtlas1,
    rocketStockTitan1,
    rocketStockColonistShuttle,
    rocketStockMobileMiner,
    rocketStockTankRocket,
    liquidTankBuildQueue, liquidTankBuildStarted,
    rocketBuildQueueAtlas1,
    rocketBuildStartedAtlas1,
    rocketFactoryQueue,
    rocketFactoryStarted,
    rocketFactoryBuildQueue,
    rocketFactoryBuildStarted,
    outpostBuildQueue,
    outpostBuildStarted,
    solarProbeFlights,
    rocketQuantity,
    rocketCargoResource,
    rocketCargoAmount,
    rocketCargoSlots,
    rocketDestination,
    rocketDestinationMode
  };
}

function saveGame(showMessage = true) {
  try {
    const serialized = JSON.stringify(getSaveData());
    const previous = localStorage.getItem(SAVE_KEY);
    if (previous) localStorage.setItem(BACKUP_SAVE_KEY, previous);
    localStorage.setItem(SAVE_KEY, serialized);
    if (showMessage) showSaveStatus('Spielstand gespeichert.');
  } catch (error) {
    console.error(error);
    showSaveStatus('Speichern fehlgeschlagen.', false);
  }
}

function loadGame(showMessage = true) {
  try {
    let raw = localStorage.getItem(SAVE_KEY);
    let migratedLegacy = false;
    if (!raw) {
      const legacy = localStorage.getItem(LEGACY_SAVE_KEY);
      if (legacy) { raw = legacy; migratedLegacy = true; }
    }
    if (!raw) {
      const backup = localStorage.getItem(BACKUP_SAVE_KEY);
      if (backup) raw = backup;
    }
    if (!raw) {
      if (showMessage) showSaveStatus('Kein Spielstand vorhanden.', false);
      return false;
    }
    const data = JSON.parse(raw);
    if (!data || !data.state || !data.bodies) throw new Error('Ungültiger Spielstand');

    if (data.gameClock && Number.isFinite(Number(data.gameClock.elapsedMs))) {
      gameClockElapsedMs = Math.max(0, Number(data.gameClock.elapsedMs));
      const savedSpeed = Number(data.gameClock.speed);
      gameSpeed = GAME_SPEEDS.includes(savedSpeed) ? savedSpeed : 1;
    } else {
      gameClockElapsedMs = 0;
      gameSpeed = 1;
    }
    gameClockLastReal = performance.now();

    Object.assign(state, data.state);
    // Einmalige Migration für bestehende Spielstände:
    // Mindestens 1.000.000 t CO₂ als Rohstoff im Erd-Oberflächenlager.
    // Dieser Bestand gehört NICHT zur Atmosphäre und wird nicht doppelt addiert.
    if (data.state.earthCo2StockV1Added !== true) {
      state.co2 = Math.max(1000000, Math.max(0, Number(state.co2) || 0));
      state.earthCo2StockV1Added = true;
    }
    if (data.market) {
      market.budget = Math.max(0, Number(data.market.budget ?? MARKET_START_BUDGET));
      market.lastRestockSlot = Math.max(0, Number(data.market.lastRestockSlot) || 0);
      market.lastPriceUpdateMs = Math.max(0, Number(data.market.lastPriceUpdateMs) || 0);
      market.priceHistory = data.market.priceHistory && typeof data.market.priceHistory === 'object' ? data.market.priceHistory : {};
      market.tradeHistory = Array.isArray(data.market.tradeHistory) ? data.market.tradeHistory.slice(0,100) : [];
      Object.entries(MARKET_RESOURCES).forEach(([k,c]) => {
        const saved = data.market.resources?.[k] || {};
        market.resources[k] = {stock:Math.max(0,Math.min(c.capacity,Number(saved.stock ?? c.initial))),soldStock:Math.max(0,Number(saved.soldStock)||0),price:Math.max(c.base*.25,Math.min(c.base*4,Number(saved.price ?? c.base))),previousPrice:Number(saved.previousPrice ?? saved.price ?? c.base),priceDirection:['up','down','flat'].includes(saved.priceDirection)?saved.priceDirection:'flat',demand:Math.max(0,Number(saved.demand)||0),supply:Math.max(0,Number(saved.supply)||0)};
      });
    }
    state.buildings = { ...state.buildings, ...(data.state.buildings || {}) };
    state.bauxite = Math.max(0, Number(state.bauxite || 0));
    state.aluminiumOxide = Math.max(0, Number(state.aluminiumOxide || 0));
    state.aluminium = Math.max(0, Number(state.aluminium || 0));
    state.gunniDollar = Math.max(0, Number(data.state.gunniDollar || 0));
    state.viewMode = data.state.viewMode === 'orbit' ? 'orbit' : 'surface';
    state.batteries = Number(data.state.batteries || 0);
    state.co2 = Number(data.state.co2 || 0);
    state.research = data.state.research || { points: 0, active: null, completed: {} };
    state.research.completed = state.research.completed || {};
    ensureResearchOrders();
    state.tasks = data.state.tasks || { completed: {}, ironMined: 0, steelProduced: 0, foodProduced: 0, waterProduced: 0 };
    state.tasks.completed = state.tasks.completed || {};
    state.tasks.ironMined = Number(state.tasks.ironMined || 0);
    state.tasks.stoneMined = Number(state.tasks.stoneMined || 0);
    state.tasks.companyOrdersCompleted = Number(state.tasks.companyOrdersCompleted || 0);
    state.tasks.companyNameChosen = Boolean(state.tasks.companyNameChosen);
    state.tasks.steelProduced = Number(state.tasks.steelProduced || 0);
    state.tasks.foodProduced = Number(state.tasks.foodProduced || 0);
    state.tasks.waterProduced = Number(state.tasks.waterProduced || 0);
    state.tasks.lunaFlights = Number(state.tasks.lunaFlights || 0);
    state.lastUpdate = gameNow();
    Object.assign(bodies, data.bodies);
    // Atmosphären-Startwerte ergänzen, ohne gespeicherten Terraforming-Fortschritt zu überschreiben.
    if (!bodies.earth.atmosphere || !Number.isFinite(Number(bodies.earth.atmosphere.totalGas))) {
      bodies.earth.atmosphere = {
        totalGas: 1089213113205.7233,
        gases: {
          nitrogen: 850457598791.0288,
          oxygen: 228190147216.59903,
          argon: 10129681952.813227,
          co2: 435685245.2822893
        },
        oxygen: 228190147216.59903,
        composition: 'earth-standard-v1'
      };
    }
    if (!bodies.luna.atmosphere || typeof bodies.luna.atmosphere !== 'object') {
      bodies.luna.atmosphere = { totalGas: 0, oxygen: 0, gases: {} };
    }
    orbitMissions.splice(0, orbitMissions.length, ...(Array.isArray(data.orbitMissions) ? data.orbitMissions : []));
    orbitMissionCounter = Math.max(1, Number(data.orbitMissionCounter) || 1);
    // Laufende Missionen werden aus gespeicherten Zeitstempeln rekonstruiert, nicht neu gestartet.
    orbitMissions.forEach(m => { if (m.status === 'outbound' || m.status === 'returning') m.lastTick = gameNow(); });
    // Neue Rohstoffvorkommen aus späteren Spielversionen auch in alten Spielständen ergänzen.
    const defaultResources = {
      mercury: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000, titanOre: 5000000, water: 2000000000 },
      earth: { nickelOre: 500000, graphite: 4000000, coal: 15000000, gas: 20000000, co2: 1000000, lithium: 30000, copperOre: 10000000, crudeOil: 6000000, uranium: 1000000, bauxite: 10000000, water: 1000000000, trees: 10000 },
      luna: { stone: 3000000, ice: 1000000, graphite: 10000000, lithium: 6000000, helium3: 10000000, uranium: 3000000, bauxite: 10000000 },
      venus: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000, co2: 100000000000000 },
      jupiter: { helium3: 500000000, hydrogen: 5000000000, co2: 100000000 },
      mars: { graphite: 15000000, uranium: 10000000, bauxite: 10000000 },
      io: { graphite: 70000000, ionium: 1000000 }
    };
    Object.entries(defaultResources).forEach(([id, additions]) => {
      if (!bodies[id]) return;
      bodies[id].resources = bodies[id].resources || {};
      Object.entries(additions).forEach(([resource, amount]) => {
        if (bodies[id].resources[resource] === undefined) {
          bodies[id].resources[resource] = amount;
        }
      });
    });
    // Merkur-Wasservorkommen auf 2 Milliarden Tonnen aktualisieren, auch in bestehenden Spielständen.
    if (bodies.mercury && !bodies.mercury.mercuryWaterDepositUpgrade20261014) {
      bodies.mercury.resources = bodies.mercury.resources || {};
      bodies.mercury.resources.water = 2000000000;
      bodies.mercury.mercuryWaterDepositUpgrade20261014 = true;
    }
    // Luna-Eisvorkommen für ältere Spielstände einmalig ergänzen, auch wenn dort 0 gespeichert war.
    if (bodies.luna && !bodies.luna.lunaIceDepositUpgrade20261010) {
      bodies.luna.resources = bodies.luna.resources || {};
      if (Number(bodies.luna.resources.ice || 0) <= 0) bodies.luna.resources.ice = 1000000;
      bodies.luna.lunaIceDepositUpgrade20261010 = true;
    }
    // CO₂ auf der Erde ist ein Oberflächen-Rohstoffvorkommen, keine Atmosphäre.
    // Ein eigener Versionsmarker sorgt dafür, dass auch bestehende Spielstände den Eintrag erhalten.
    if (bodies.earth?.resources && !bodies.earth.earthCo2DepositUpgrade20261021) {
      bodies.earth.resources.co2 = 1000000;
      bodies.earth.earthCo2DepositUpgrade20261021 = true;
    }
    // Erd-Rohstoffvorkommen auf neue Gesamtmengen migrieren und bereits abgebaute Mengen erhalten.
    if (bodies.earth?.resources && !bodies.earth.resourceDepositUpgrade20261010) {
      const earthDeposits = [
        ['stone', 20000, 20000000],
        ['coal', 20000, 15000000],
        ['gas', 40000, 20000000],
        ['copperOre', 30000, 10000000]
      ];
      earthDeposits.forEach(([resource, oldTotal, newTotal]) => {
        const current = Number(bodies.earth.resources[resource]);
        if (!Number.isFinite(current)) {
          bodies.earth.resources[resource] = newTotal;
        } else if (current <= oldTotal) {
          const alreadyMined = Math.max(0, oldTotal - current);
          bodies.earth.resources[resource] = Math.max(0, newTotal - alreadyMined);
        }
      });
      bodies.earth.resourceDepositUpgrade20261010 = true;
    }
    // Erd-Stein auf 20.000.000 t aktualisieren, ohne bekannte frühere Abbaumengen zu verlieren.
    if (bodies.earth?.resources && !bodies.earth.stoneDepositUpgrade20261010) {
      const currentStone = Number(bodies.earth.resources.stone);
      if (!Number.isFinite(currentStone)) {
        bodies.earth.resources.stone = 20000000;
      } else if (currentStone <= 20000) {
        const alreadyMined = Math.max(0, 20000 - currentStone);
        bodies.earth.resources.stone = Math.max(0, 20000000 - alreadyMined);
      }
      bodies.earth.stoneDepositUpgrade20261010 = true;
    }
    // Eisen-Vorkommen der Erde auf die neue Gesamtmenge von 200.000.000 t anheben.
    // Bei alten Spielständen wird bereits abgebaute Menge berücksichtigt.
    if (bodies.earth?.resources) {
      const oldIron = Number(bodies.earth.resources.iron);
      if (Number.isFinite(oldIron) && oldIron >= 0 && oldIron <= 2000000) {
        const minedFromOldDeposit = Math.max(0, 2000000 - oldIron);
        bodies.earth.resources.iron = Math.max(0, 200000000 - minedFromOldDeposit);
      } else if (!Number.isFinite(oldIron)) {
        bodies.earth.resources.iron = 200000000;
      }
    }
    // Jupiter ist ausschließlich Gasressourcen vorbehalten. Alte Spielstände werden entsprechend bereinigt.
    if (bodies.jupiter) {
      bodies.jupiter.resources = {
        helium3: Number(bodies.jupiter.resources?.helium3 ?? 500000000),
        hydrogen: Number(bodies.jupiter.resources?.hydrogen ?? 5000000000),
        co2: Number(bodies.jupiter.resources?.co2 ?? 100000000)
      };
    }
    // Alte Venus-Vorkommen aus früheren Versionen entfernen.
    if (bodies.venus?.resources) {
      delete bodies.venus.resources.coal;
      delete bodies.venus.resources.gas;
    }
    bodies.venus.atmosphere = bodies.venus.atmosphere || { co2Initial: 100000000000000, pressureInitial: 92 };
    if (bodies.venus.atmosphere.co2Initial === undefined) bodies.venus.atmosphere.co2Initial = 100000000000000;
    if (bodies.venus.atmosphere.pressureInitial === undefined) bodies.venus.atmosphere.pressureInitial = 92;
    ensureLunaAtmosphere();
    state.buildings.ironMine = Math.max(0, Number(state.buildings.ironMine || 0));
    state.iron = Math.max(0, Number(state.iron || 0));
    state.buildings.lithiumMine = Number(state.buildings.lithiumMine || 0);
    state.buildings.copperMine = Number(state.buildings.copperMine || 0);
    state.buildings.copperSmelter = Number(state.buildings.copperSmelter || 0);
    state.buildings.lithiumRefinery = Number(state.buildings.lithiumRefinery || 0);
    state.buildings.machineFactory = Number(state.buildings.machineFactory || 0);
    state.buildings.glassFactory = Number(state.buildings.glassFactory || 0);
    state.buildings.co2ProcessingPlant = Number(state.buildings.co2ProcessingPlant || 0);
    state.buildings.heliumExtractor = Number(state.buildings.heliumExtractor || 0);
    state.buildings.fusionReactor = Number(state.buildings.fusionReactor || 0);
    state.buildings.researchLab = Number(state.buildings.researchLab || 0);
    state.buildings.observatory = Number(state.buildings.observatory || 0);
    state.buildings.solarPlant = Number(state.buildings.solarPlant || 0);
    state.buildings.hydroelectricPlant = Number(state.buildings.hydroelectricPlant || 0);
    state.buildings.greenhouse = Number(state.buildings.greenhouse || 0);
    state.water = Number(state.water || 0); state.grain = Number(state.grain || 0); state.vegetables = Number(state.vegetables || 0); state.food = Number(state.food || 0);
    state.buildings.foodFactory = Number(state.buildings.foodFactory || 0);
    bodies.earth.resources.water = Number(bodies.earth.resources.water ?? 1000000000);
    state.buildings.outpost = Number(state.buildings.outpost || 0);
    state.buildings.moonBase = Number(state.buildings.moonBase || 0);
    state.buildings.crudeOilPump = Number(state.buildings.crudeOilPump || 0);
    state.buildings.polymerFactory = Number(state.buildings.polymerFactory || 0);
    state.buildings.rubberFactory = Number(state.buildings.rubberFactory || 0);
    state.buildings.plasticFactory = Number(state.buildings.plasticFactory || 0);
    state.buildings.vehicleFactory = Number(state.buildings.vehicleFactory || 0);
    state.buildings.luxuryFurnitureFactory = Number(state.buildings.luxuryFurnitureFactory || 0);
    state.luxuryFurniture = Math.max(0, Number(state.luxuryFurniture || 0));
    state.vehicles = Math.max(0, Number(state.vehicles || 0));
    state.rubber = Number(state.rubber || 0);
    state.plastics = Number(state.plastics || 0);
    state.buildings.uraniumMine = Number(state.buildings.uraniumMine || 0);
    state.buildings.ioniumMine = Number(state.buildings.ioniumMine || 0);
    state.buildings.uraniumProcessingPlant = Number(state.buildings.uraniumProcessingPlant || 0);
    state.buildings.nuclearFuelPlant = Number(state.buildings.nuclearFuelPlant || 0);
    state.buildings.nuclearReactor = Number(state.buildings.nuclearReactor || 0);
    state.buildings.radioactiveStorageSurface = Number(state.buildings.radioactiveStorageSurface || 0);
    state.buildings.radioactiveStorageOrbit = Number(state.buildings.radioactiveStorageOrbit || 0);
    state.buildings.chipFactory = Number(state.buildings.chipFactory || 0);
    state.buildings.solarSail = Number(state.buildings.solarSail || 0);
    state.buildings.solarSatellite = Number(state.buildings.solarSatellite || 0);
    state.buildings.researchSatellite = Number(state.buildings.researchSatellite || 0);
    state.buildings.solarProbe = Number(state.buildings.solarProbe || 0);
    state.processedUranium = Number(state.processedUranium || 0);
    state.nuclearFuel = Number(state.nuclearFuel || 0);
    state.chips = Number(state.chips || 0);
    delete state.concrete;
    state.buildingMaterials = Number(state.buildingMaterials || 0);
    Object.values(bodies).forEach(body => {
      // Altstände migrieren: Beton existiert nicht mehr als Spielrohstoff.
      if (body.storage) delete body.storage.concrete;
      if (body.orbitStorage) delete body.orbitStorage.concrete;
      if (body.resources) delete body.resources.concrete;
      if (!body.buildings) return;
      body.buildings.forester = Number(body.buildings.forester || 0);
      body.buildings.lithiumMine = Number(body.buildings.lithiumMine || 0);
      body.buildings.copperMine = Number(body.buildings.copperMine || 0);
      body.buildings.copperSmelter = Number(body.buildings.copperSmelter || 0);
      body.buildings.lithiumRefinery = Number(body.buildings.lithiumRefinery || 0);
      body.buildings.machineFactory = Number(body.buildings.machineFactory || 0);
       body.buildings.glassFactory = Number(body.buildings.glassFactory || 0);
       body.buildings.co2Extraction = Number(body.buildings.co2Extraction || 0);
      body.buildings.co2ProcessingPlant = Number(body.buildings.co2ProcessingPlant || 0);
       body.buildings.heliumExtractor = Number(body.buildings.heliumExtractor || 0);
       body.buildings.fusionReactor = Number(body.buildings.fusionReactor || 0);
       body.buildings.researchLab = Number(body.buildings.researchLab || 0);
       body.buildings.observatory = Number(body.buildings.observatory || 0);
       body.buildings.solarPlant = Number(body.buildings.solarPlant || 0);
       body.buildings.outpost = Number(body.buildings.outpost || 0);
       body.buildings.moonBase = Number(body.buildings.moonBase || 0);
       body.buildings.crudeOilPump = Number(body.buildings.crudeOilPump || 0);
       body.buildings.polymerFactory = Number(body.buildings.polymerFactory || 0);
       body.buildings.rubberFactory = Number(body.buildings.rubberFactory || 0);
       body.buildings.plasticFactory = Number(body.buildings.plasticFactory || 0);
       body.buildings.vehicleFactory = Number(body.buildings.vehicleFactory || 0);
       body.buildings.uraniumMine = Number(body.buildings.uraniumMine || 0);
      body.buildings.ioniumMine = Number(body.buildings.ioniumMine || 0);
       body.buildings.uraniumProcessingPlant = Number(body.buildings.uraniumProcessingPlant || 0);
       body.buildings.nuclearFuelPlant = Number(body.buildings.nuclearFuelPlant || 0);
       body.buildings.nuclearReactor = Number(body.buildings.nuclearReactor || 0);
       body.buildings.radioactiveStorageSurface = Number(body.buildings.radioactiveStorageSurface || 0);
       body.buildings.radioactiveStorageOrbit = Number(body.buildings.radioactiveStorageOrbit || 0);
       body.buildings.chipFactory = Number(body.buildings.chipFactory || 0);
       body.buildings.solarSail = Number(body.buildings.solarSail || 0);
       body.buildings.solarSatellite = Number(body.buildings.solarSatellite || 0);
       body.buildings.researchSatellite = Number(body.buildings.researchSatellite || 0);
       body.buildings.solarProbe = Number(body.buildings.solarProbe || 0);
       body.buildings.rocketFactory = Number(body.buildings.rocketFactory || 0);
       body.buildings.landingPad = Number(body.buildings.landingPad || 0);
       body.buildings.bauxiteMine = Number(body.buildings.bauxiteMine || 0);
       body.buildings.aluminiumOxideRefinery = Number(body.buildings.aluminiumOxideRefinery || 0);
       body.buildings.aluminiumSmelter = Number(body.buildings.aluminiumSmelter || 0);
    });

    rockets.length = 0;
    (data.rockets || []).forEach(r => rockets.push(r));
    Object.keys(rocketBuildQueue).forEach(k => delete rocketBuildQueue[k]);
    Object.assign(rocketBuildQueue, data.rocketBuildQueue || {});
    Object.keys(rocketBuildStarted).forEach(k => delete rocketBuildStarted[k]);
    Object.assign(rocketBuildStarted, data.rocketBuildStarted || {});
    Object.keys(rocketStock).forEach(k => delete rocketStock[k]);
    Object.assign(rocketStock, data.rocketStock || {});
    Object.keys(rocketStock2).forEach(k => delete rocketStock2[k]);
    Object.assign(rocketStock2, data.rocketStock2 || {});
    Object.keys(rocketBuildQueue2).forEach(k => delete rocketBuildQueue2[k]);
    Object.assign(rocketBuildQueue2, data.rocketBuildQueue2 || {});
    Object.keys(rocketBuildStarted2).forEach(k => delete rocketBuildStarted2[k]);
    Object.assign(rocketBuildStarted2, data.rocketBuildStarted2 || {});
    Object.keys(rocketStockAtlas1).forEach(k => delete rocketStockAtlas1[k]);
    Object.assign(rocketStockAtlas1, data.rocketStockAtlas1 || {});
    Object.keys(rocketStockTitan1).forEach(k => delete rocketStockTitan1[k]);
    Object.assign(rocketStockTitan1, data.rocketStockTitan1 || {});
    Object.keys(rocketStockColonistShuttle).forEach(k => delete rocketStockColonistShuttle[k]);
    Object.assign(rocketStockColonistShuttle, data.rocketStockColonistShuttle || {});
    Object.keys(rocketStockMobileMiner).forEach(k => delete rocketStockMobileMiner[k]);
    Object.assign(rocketStockMobileMiner, data.rocketStockMobileMiner || {});
    Object.keys(rocketStockTankRocket).forEach(k => delete rocketStockTankRocket[k]);
    Object.assign(rocketStockTankRocket, data.rocketStockTankRocket || {});
    Object.keys(liquidTankBuildQueue).forEach(k=>delete liquidTankBuildQueue[k]); Object.assign(liquidTankBuildQueue,data.liquidTankBuildQueue||{});
    Object.keys(liquidTankBuildStarted).forEach(k=>delete liquidTankBuildStarted[k]); Object.assign(liquidTankBuildStarted,data.liquidTankBuildStarted||{});
    Object.keys(bodies).forEach(id=>ensureLiquidTankData(id));
    Object.keys(rocketBuildQueueAtlas1).forEach(k => delete rocketBuildQueueAtlas1[k]);
    Object.assign(rocketBuildQueueAtlas1, data.rocketBuildQueueAtlas1 || {});
    Object.keys(rocketBuildStartedAtlas1).forEach(k => delete rocketBuildStartedAtlas1[k]);
    Object.assign(rocketBuildStartedAtlas1, data.rocketBuildStartedAtlas1 || {});
    Object.keys(rocketFactoryQueue).forEach(k => delete rocketFactoryQueue[k]);
    Object.assign(rocketFactoryQueue, data.rocketFactoryQueue || {});
    Object.keys(rocketFactoryStarted).forEach(k => delete rocketFactoryStarted[k]);
    Object.assign(rocketFactoryStarted, data.rocketFactoryStarted || {});
    Object.keys(rocketFactoryBuildQueue).forEach(k => delete rocketFactoryBuildQueue[k]);
    Object.assign(rocketFactoryBuildQueue, data.rocketFactoryBuildQueue || {});
    Object.keys(rocketFactoryBuildStarted).forEach(k => delete rocketFactoryBuildStarted[k]);
    Object.assign(rocketFactoryBuildStarted, data.rocketFactoryBuildStarted || {});
    Object.keys(outpostBuildQueue).forEach(k => delete outpostBuildQueue[k]);
    Object.assign(outpostBuildQueue, data.outpostBuildQueue || {});
    Object.keys(outpostBuildStarted).forEach(k => delete outpostBuildStarted[k]);
    Object.assign(outpostBuildStarted, data.outpostBuildStarted || {});
    solarProbeFlights.length = 0;
    (data.solarProbeFlights || []).forEach(f => solarProbeFlights.push(f));
    rocketQuantity = Number(data.rocketQuantity) || 1;
    rocketCargoResource = data.rocketCargoResource || 'stone';
    rocketCargoAmount = Number(data.rocketCargoAmount) || 0;
    rocketCargoSlots = Array.isArray(data.rocketCargoSlots) && data.rocketCargoSlots.length
      ? data.rocketCargoSlots.slice(0, 20).map(s => ({ resource: s.resource || 'stone', amount: Number(s.amount) || 0 }))
      : [{ resource: 'stone', amount: 0 }, { resource: 'iron', amount: 0 }, { resource: 'steel', amount: 0 }];
    while (rocketCargoSlots.length < 3) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
    rocketDestination = data.rocketDestination || 'mars';
    rocketDestinationMode = data.rocketDestinationMode === 'orbit' ? 'orbit' : 'surface';

    // Alte Spielstände verwendeten verschiedene Echtzeit-Zeitstempel. Beim ersten
    // Laden werden laufende Timer auf die neue zentrale Spieluhr umgestellt.
    if (!data.gameClock) {
      const clockNow = gameNow();
      rockets.forEach(r => { if (r.status === 'outbound' || r.status === 'returning') r.started = clockNow; });
      [rocketBuildStarted, rocketBuildStarted2, rocketBuildStartedAtlas1, rocketFactoryStarted, rocketFactoryBuildStarted, outpostBuildStarted].forEach(group => Object.keys(group).forEach(k => { if (group[k]) group[k] = clockNow; }));
      if (state.research?.active) { state.research.active.started = clockNow; delete state.research.active.pausedAt; }
      solarProbeFlights.forEach(f => { f.started = clockNow; });
      orbitMissions.forEach(m => { if (m.status === 'outbound' || m.status === 'returning') m.startedAt = clockNow; if (m.status === 'waiting') m.nextLaunchAt = clockNow; });
    }

    renderSystem();
    renderInfo();
    renderTopResources();
    if (migratedLegacy) saveGame(false);
    if (showMessage) showSaveStatus(migratedLegacy ? 'Alter Spielstand übernommen und neu gespeichert.' : 'Spielstand geladen.');
    return true;
  } catch (error) {
    console.error(error);
    if (showMessage) showSaveStatus('Laden fehlgeschlagen.', false);
    return false;
  }
}

let restartingGame = false;

function restartGame() {
  // Verhindert, dass pagehide/visibilitychange beim Neuladen den alten Stand
  // direkt wieder in localStorage schreibt.
  restartingGame = true;
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(LEGACY_SAVE_KEY);
    localStorage.removeItem(BACKUP_SAVE_KEY);
  } catch (error) {
    console.error('Spielstand konnte nicht vollständig gelöscht werden:', error);
  }
  location.reload();
}

function setupSaveMenu() {
  const toggle = document.querySelector('#save-menu-button');
  const close = document.querySelector('#save-menu-close');
  const save = document.querySelector('#save-game');
  const load = document.querySelector('#load-game');
  const restart = document.querySelector('#restart-game');
  if (!toggle) return;

  toggle.addEventListener('click', () => {
    saveMenu.hidden = !saveMenu.hidden;
    const mainMenu=document.querySelector('#main-menu'); if(!saveMenu.hidden && mainMenu) mainMenu.hidden=true;
    if (!saveMenu.hidden) showSaveStatus('');
  });
  close.addEventListener('click', () => { saveMenu.hidden = true; });
  save.addEventListener('click', () => saveGame(true));
  load.addEventListener('click', () => loadGame(true));
  restart.addEventListener('click', () => {
    if (confirm('Spiel wirklich neu starten? Der gespeicherte Spielstand wird gelöscht.')) restartGame();
  });
}

function rocketBodyPoint(id) {
  // Asteroidengürtel im äußeren Bereich zwischen Mars und Jupiter.
  // Entdeckte Asteroiden bleiben hier sichtbar, bis sie verschwinden/ablaufen.
  const asteroidOrders = ensureResearchOrders();
  const visibleAsteroids = asteroidOrders.discoveredAsteroids.filter(a => !a.vanished && Number(a.expiresAt) > gameNow());
  const belt = document.createElement('div');
  belt.className = 'asteroid-belt-orbit';
  belt.setAttribute('aria-hidden', 'true');
  belt.style.width = '520px';
  belt.style.height = '520px';
  solarSystem.appendChild(belt);
  visibleAsteroids.forEach((asteroid, index) => {
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'asteroid-system-marker';
    marker.textContent = asteroidTypeByKey(asteroid.typeKey).icon || '☄️';
    marker.title = `${asteroid.name} · ${asteroidTypeByKey(asteroid.typeKey).name}`;
    marker.setAttribute('aria-label', marker.title);
    const angle = ((Number(asteroid.number) || index + 1) * 137.508 + 18) * Math.PI / 180;
    const radius = 250 + ((Number(asteroid.number) || index) % 5 - 2) * 13;
    marker.style.left = `calc(50% + ${Math.cos(angle) * radius}px)`;
    marker.style.top = `calc(50% + ${Math.sin(angle) * radius}px)`;
    marker.addEventListener('click', () => {
      const type = asteroidTypeByKey(asteroid.typeKey);
      const resourcesText = Object.entries(asteroid.resources || {}).map(([key, amount]) => `${resourceNames[key] || key}: ${Number(amount).toLocaleString('de-DE')} t`).join('<br>');
      infoPanel.innerHTML = `<h2>${type.icon} ${asteroid.name}</h2><div class="stat"><span>Typ</span><strong>${type.name}</strong></div><p>${resourcesText || 'Keine Rohstoffdaten verfügbar.'}</p><p class="hint">Asteroid im äußeren Asteroidengürtel.</p>`;
    });
    solarSystem.appendChild(marker);
  });

  const angles = { sun: 0, mercury: 25, venus: 150, earth: 250, mars: 70, ceres: 90, jupiter: 145, saturn: 200, uranus: 35, neptune: 275, pluto: 230, io: 315 };
  if (id === 'sun') return { x: 530, y: 530 };
  if (id === 'luna') {
    const earth = rocketBodyPoint('earth');
    const a = 225 * Math.PI / 180;
    return {
      x: earth.x + Math.cos(a) * Number(bodies.luna.moonOrbit || 55),
      y: earth.y + Math.sin(a) * Number(bodies.luna.moonOrbit || 55)
    };
  }
  const radius = Number(bodies[id]?.orbit || 0) / 2;
  const a = (angles[id] || 0) * Math.PI / 180;
  return { x: 530 + Math.cos(a) * radius, y: 530 + Math.sin(a) * radius };
}

function rocketOrbitPoint(id) {
  const p = rocketBodyPoint(id);
  if (id === 'sun') return p;
  const a = id === 'luna' ? 225 * Math.PI / 180 : (({ mercury:25, venus:150, earth:250, mars:70, jupiter:145, neptune:210, pluto:230, ceres:90 }[id] || 0) * Math.PI / 180);
  const offset = id === 'luna' ? 28 : Math.max(34, Number(bodies[id]?.className === 'jupiter' ? 42 : 30));
  return { x: p.x + Math.cos(a) * offset, y: p.y + Math.sin(a) * offset };
}

function updateRocketVisuals(now = gameNow()) {
  const layer = document.querySelector('#rocket-layer');
  if (!layer) return;
  layer.innerHTML = '';
  // Fluglinien liegen unter den Raketenmarkern und zeigen Start sowie Ziel.
  const svgNS = 'http://www.w3.org/2000/svg';
  const paths = document.createElementNS(svgNS, 'svg');
  paths.setAttribute('class', 'rocket-flight-paths');
  paths.setAttribute('viewBox', '0 0 1060 1060');
  paths.setAttribute('aria-hidden', 'true');
  layer.appendChild(paths);

  // Raketenankünfte erst vollständig verbuchen und die Oberfläche danach
  // höchstens einmal aktualisieren. So wird beim Eintreffen mehrerer Raketen
  // nicht mitten in der Verarbeitung wiederholt das komplette Planetenmenü gebaut.
  let rocketUiChanged = false;
  for (const rocket of rockets) {
    if (rocket.status === 'returned') continue;
    const returning = rocket.status === 'returning';
    const fromId = returning ? (rocket.fromReturn || rocket.from) : rocket.from;
    const toId = rocket.to;
    if (!bodies[fromId] || !bodies[toId]) continue;

    let start = rocket.fromMode === 'orbit' ? rocketOrbitPoint(fromId) : rocketBodyPoint(fromId);
    let end = rocket.targetMode === 'surface' && rocket.status === 'landed' ? rocketBodyPoint(toId) : rocketOrbitPoint(toId);
    let progress = 1;
    if (rocket.status === 'outbound' || returning) {
      const elapsed = Math.max(0, now - Number(rocket.started || now));
      progress = Math.min(1, rocket.duration > 0 ? elapsed / rocket.duration : 1);
      if (returning) {
        start = rocketOrbitPoint(fromId);
        end = rocket.returnMode === 'orbit' ? rocketOrbitPoint(toId) : rocketBodyPoint(toId);
      }
    } else if (rocket.status === 'landed') {
      end = rocketBodyPoint(toId);
    }

    const path = document.createElementNS(svgNS, 'line');
    path.setAttribute('x1', start.x);
    path.setAttribute('y1', start.y);
    path.setAttribute('x2', end.x);
    path.setAttribute('y2', end.y);
    path.setAttribute('class', `rocket-flight-line${returning ? ' returning' : ''}`);
    paths.appendChild(path);

    const x = start.x + (end.x - start.x) * progress;
    const y = start.y + (end.y - start.y) * progress;
    const el = document.createElement('div');
    el.className = `rocket-marker rocket-${rocket.status}${returning ? ' rocket-returning' : ''}`;
    el.setAttribute('aria-label', `${rocket.name}: ${bodies[fromId].name} nach ${bodies[toId].name}`);
    const emoji = document.createElement('span');
    emoji.className = 'rocket-marker-icon';
    emoji.textContent = '🚀';
    el.appendChild(emoji);
    const label = document.createElement('span');
    label.className = 'rocket-marker-label';
    label.textContent = `${returning ? '↩ ' : '→ '}${bodies[toId].name}`;
    el.appendChild(label);
    el.title = `${rocket.name}: ${bodies[fromId].name} → ${bodies[toId].name}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);
  }
}

function hasSurfaceBuildings(bodyId) {
  // Erde: state.buildings; andere Himmelskörper: bodies[id].buildings.
  const buildings = bodyId === 'earth' ? state.buildings : bodies[bodyId]?.buildings;
  if (!buildings || typeof buildings !== 'object') return false;
  return Object.values(buildings).some(count => Number(count) > 0);
}

function renderAsteroidVisuals() {
  if (!solarSystem || activeSolarSystemId !== 'system1') return;
  solarSystem.querySelectorAll('.solar-asteroid').forEach(node => node.remove());
  const orders = ensureResearchOrders();
  if (!orders.completed.skyObservation) return;
  const now = gameNow();
  const active = orders.discoveredAsteroids.filter(a => !a.vanished && Number(a.expiresAt) > now);
  const center = 530;
  // Asteroiden werden im äußeren Gürtel zwischen Mars und den äußeren Planeten verteilt.
  active.forEach((asteroid, index) => {
    const angle = ((Number(asteroid.number) * 137.508 + index * 31) % 360) * Math.PI / 180;
    const radius = 350 + (index % 3) * 28;
    const marker = document.createElement('button');
    marker.type = 'button';
    marker.className = 'solar-asteroid';
    marker.style.left = `${center + Math.cos(angle) * radius}px`;
    marker.style.top = `${center + Math.sin(angle) * radius}px`;
    marker.textContent = asteroidTypeByKey(asteroid.typeKey).icon || '☄️';
    marker.title = `${asteroid.name} · ${asteroidTypeByKey(asteroid.typeKey).name}`;
    marker.setAttribute('aria-label', marker.title);
    marker.addEventListener('click', event => {
      event.stopPropagation();
      const type = asteroidTypeByKey(asteroid.typeKey);
      infoPanel.innerHTML = `<h2>☄️ ${asteroid.name}</h2><div class="stat"><span>Typ</span><strong>${type.name}</strong></div><div class="stat"><span>Verbleibende Zeit</span><strong>${formatResearchTime(Math.max(0, Math.ceil((Number(asteroid.expiresAt) - gameNow()) / 1000)))}</strong></div><p>${formatAsteroidResources(asteroid)}</p><p class="hint">Der Asteroid befindet sich im äußeren Asteroidengürtel. Details und Minerraketen findest du unter „Asteroidenabbau“.</p>`;
    });
    solarSystem.appendChild(marker);
  });
}

function renderSystem() {
  // Scrollpositionen vor dem DOM-Neuaufbau sichern. Auf Mobilgeräten kann
  // sonst beim Bauen sowohl das Gebäudemenü als auch die Seite nach oben springen.
  const previousPageScrollX = window.scrollX || 0;
  const previousPageScrollY = window.scrollY || 0;
  const previousBuildMenu = document.querySelector('.planet-build-menu');
  if (previousBuildMenu) {
    const openCategory = previousBuildMenu.querySelector('.building-category-toggle[aria-expanded="true"]');
    if (openCategory) activeBuildingCategoryTitle = openCategory.querySelector('span')?.textContent || activeBuildingCategoryTitle;
  }
  const previousBuildMenuScrollTop = previousBuildMenu ? previousBuildMenu.scrollTop : 0;
  const previousBuildMenuScrollLeft = previousBuildMenu ? previousBuildMenu.scrollLeft : 0;
  // Zustand der Baumenü-Filter über den Neuaufbau hinweg erhalten.
  const previousBuildMenuState = previousBuildMenu ? {
    search: previousBuildMenu.querySelector('.building-search')?.value || '',
    production: !!previousBuildMenu.querySelector('.building-filter-production')?.checked,
    consumption: !!previousBuildMenu.querySelector('.building-filter-consumption')?.checked,
    showUnavailable: !!previousBuildMenu.querySelector('.building-show-unavailable')?.checked,
    category: previousBuildMenu.querySelector('.building-category-toggle[aria-expanded="true"] span')?.textContent || activeBuildingCategoryTitle
  } : null;
  // Das Menü aus dem gezoomten Sonnensystem herauslösen, damit es im Bildschirm zentriert bleibt.
  if (previousBuildMenu) previousBuildMenu.remove();
  // Im Baumenü die Planeten, ihre Beschriftungen und Umlaufbahnen ausblenden.
  solarSystem.classList.toggle('system2-expanded', activeSolarSystemId === 'system2');
  // Das Baumenü ist ein eigenständiges Fenster im Dokument und darf das Sonnensystem nicht ausblenden.
  solarSystem.classList.remove('building-menu-open');
  solarSystem.innerHTML = '';
  if (activeSolarSystemId === 'system2') {
    solarSystem.classList.remove('building-menu-open');
    const orbit = document.createElement('div');
    orbit.className = 'orbit noxaris-orbit';
    orbit.style.width = `${futureSolarSystem.bodies[0].orbit}px`;
    orbit.style.height = `${futureSolarSystem.bodies[0].orbit}px`;
    solarSystem.appendChild(orbit);

    const star = document.createElement('div');
    star.className = 'system2-star';
    star.setAttribute('aria-label', 'Unbekannter Stern');
    star.title = 'Unbekannter Stern';
    solarSystem.appendChild(star);

    const planet = document.createElement('button');
    planet.type = 'button';
    planet.className = 'body noxaris';
    planet.setAttribute('aria-label', 'Noxaris');
    planet.title = 'Noxaris';
    planet.style.left = `calc(50% + ${Math.cos(230 * Math.PI / 180) * futureSolarSystem.bodies[0].orbit / 2}px)`;
    planet.style.top = `calc(50% + ${Math.sin(230 * Math.PI / 180) * futureSolarSystem.bodies[0].orbit / 2}px)`;
    const label = document.createElement('span');
    label.className = 'body-label';
    label.textContent = 'Noxaris';
    planet.appendChild(label);
    planet.addEventListener('click', () => {
      infoPanel.innerHTML = `<h2>🌌 Noxaris</h2><div class="stat"><span>Typ</span><strong>Mystischer Planet</strong></div><div class="stat"><span>Temperatur</span><strong>Unbekannt</strong></div><p class="hint">Ein geheimnisvoller, dunkelblauer Planet, umgeben von violett-blauen kosmischen Nebeln. Seine Herkunft und seine Rohstoffe sind noch unerforscht.</p>`;
    });
    solarSystem.appendChild(planet);
    const buildMenuTriggerButton = document.querySelector('#open-build-menu-button');
    if (buildButton) { buildMenuTriggerButton.disabled = true; buildMenuTriggerButton.textContent = '🔒 Noxaris ist noch nicht erschlossen'; }
    infoPanel.innerHTML = `<h2>🌌 Sonnensystem 2</h2><p class="hint">Ein bislang unerforschtes System. Noxaris befindet sich auf der äußersten Umlaufbahn.</p><p>Wähle Noxaris aus, um mehr über den mystischen Planeten zu erfahren.</p>`;
    updateSolarSystemSelector();
    return;
  }
  updateSolarSystemSelector();
  const buildMenuTriggerButton = document.querySelector('#open-build-menu-button');
  if (buildButton && state.selected !== 'sun') { buildMenuTriggerButton.disabled = false; buildMenuTriggerButton.textContent = '🏗️ Gebäudeübersicht öffnen'; }
  Object.entries(bodies).forEach(([id, body]) => {
    if (body.orbit > 0 && id !== 'pluto') {
      const orbit = document.createElement('div');
      orbit.className = 'orbit';
      orbit.style.width = `${body.orbit * 2}px`;
      orbit.style.height = `${body.orbit * 2}px`;
      solarSystem.appendChild(orbit);
    }
  });

  const angles = { sun: 0, mercury: 25, venus: 150, earth: 250, mars: 70, ceres: 90, jupiter: 145, saturn: 200, uranus: 35, neptune: 275, pluto: 230, io: 315 };

  // Luna bekommt eine eigene Umlaufbahn um die Erde.
  const earthAngle = angles.earth * Math.PI / 180;
  const earthRadius = bodies.earth.orbit / 2;
  const earthX = Math.cos(earthAngle) * earthRadius;
  const earthY = Math.sin(earthAngle) * earthRadius;
  const moonOrbit = document.createElement('div');
  moonOrbit.className = 'moon-orbit';
  moonOrbit.style.left = `calc(50% + ${earthX}px)`;
  moonOrbit.style.top = `calc(50% + ${earthY}px)`;
  moonOrbit.style.width = `${bodies.luna.moonOrbit * 2}px`;
  moonOrbit.style.height = `${bodies.luna.moonOrbit * 2}px`;
  solarSystem.appendChild(moonOrbit);

  const moonSystem = document.createElement('div');
  moonSystem.className = 'moon-system';
  moonSystem.style.left = `calc(50% + ${earthX}px)`;
  moonSystem.style.top = `calc(50% + ${earthY}px)`;
  const moon = document.createElement('button');
  moon.className = `body luna${state.selected === 'luna' ? ' selected' : ''}`;
  moon.type = 'button';
  moon.setAttribute('aria-label', 'Luna');
  moon.title = 'Luna';
  const moonAngle = 225 * Math.PI / 180;
  moon.style.left = `${Math.cos(moonAngle) * bodies.luna.moonOrbit}px`;
  moon.style.top = `${Math.sin(moonAngle) * bodies.luna.moonOrbit}px`;
  moon.innerHTML = '<span class="body-label">Luna</span>';
  if (hasSurfaceBuildings('luna')) {
    const badge = document.createElement('span');
    badge.className = 'colonized-indicator';
    badge.textContent = '✓';
    badge.setAttribute('aria-label', 'Oberfläche bebaut');
    badge.title = 'Oberfläche bebaut';
    moon.appendChild(badge);
  }
  moon.addEventListener('click', (event) => {
    event.stopPropagation();
    state.selected = 'luna';
    state.buildMenuOpen = false;
    renderSystem();
    renderInfo();
  });
  moonSystem.appendChild(moon);
  solarSystem.appendChild(moonSystem);

  Object.entries(bodies).forEach(([id, body]) => {
    if (id === 'luna') return;
    const element = document.createElement('button');
    element.className = `body ${body.className}${state.selected === id ? ' selected' : ''}`;
    element.type = 'button';
    element.setAttribute('aria-label', body.name);
    element.title = body.name;
    if (id === 'sun') {
      element.style.left = '50%'; element.style.top = '50%';
    } else {
      const radius = body.orbit / 2;
      const rad = angles[id] * Math.PI / 180;
      element.style.left = `calc(50% + ${Math.cos(rad) * radius}px)`;
      element.style.top = `calc(50% + ${Math.sin(rad) * radius}px)`;
    }

    const label = document.createElement('span');
    label.className = 'body-label';
    label.textContent = body.name;
    element.appendChild(label);
    if (id !== 'sun' && hasSurfaceBuildings(id)) {
      const badge = document.createElement('span');
      badge.className = 'colonized-indicator';
      badge.textContent = '✓';
      badge.setAttribute('aria-label', 'Oberfläche bebaut');
      badge.title = 'Oberfläche bebaut';
      element.appendChild(badge);
    }

    element.addEventListener('click', () => {
      state.selected = id;
      state.buildMenuOpen = false;
      renderSystem();
      renderInfo();
    });
    solarSystem.appendChild(element);
  });

  renderAsteroidVisuals();

  const rocketLayer = document.createElement('div');
  rocketLayer.id = 'rocket-layer';
  rocketLayer.setAttribute('aria-label', 'Raketenverkehr');
  solarSystem.appendChild(rocketLayer);
  updateRocketVisuals();

  // Das Baumenü wird über den separaten Button unter der Sonnensystemansicht geöffnet.
  if (state.selected !== 'sun' && state.buildMenuOpen) {
    const menu = document.createElement('div');
    menu.className = 'planet-build-menu';
    // Sofort an den Dokumentkörper hängen: Wenn beim Erzeugen einer Gebäudekarte
    // ein einzelner Datenfehler auftritt, bleibt wenigstens ein sichtbares Fenster
    // statt eines scheinbar wirkungslosen Klicks zurück.
    menu.style.display = 'block';
    menu.style.visibility = 'visible';
    menu.style.opacity = '1';
    menu.innerHTML = `<div class="planet-build-header"><div class="planet-build-title">🏗️ Gebäudeübersicht</div><div class="planet-build-header-actions"><button type="button" class="build-menu-close" aria-label="Gebäudemenü schließen">✕</button></div></div><p class="hint">Gebäudeübersicht wird geladen …</p>`;
    document.body.appendChild(menu);
    try {
    menu.innerHTML = `<div class="planet-build-header"><div class="planet-build-title">🏗️ Gebäude auf ${bodies[state.selected].name}</div><div class="planet-build-header-actions"><button type="button" class="demolition-admin-open">Abrissverwaltung</button><button type="button" class="build-menu-close" id="close-build-menu" aria-label="Gebäudemenü schließen">✕</button></div></div>
      <div class="build-view-switch" role="group" aria-label="Bauort auswählen">
        <div class="build-view-switch-label">📍 WO MÖCHTEST DU BAUEN?</div>
        <div class="build-view-switch-buttons">
          ${hasPlanetSurface(state.selected) ? `<button type="button" class="build-view-btn ${state.viewMode === 'surface' ? 'active' : ''}" data-build-view="surface">🌍 OBERFLÄCHE</button>` : ''}
          <button type="button" class="build-view-btn ${state.viewMode === 'orbit' ? 'active' : ''}" data-build-view="orbit">🛰️ ORBIT</button>
        </div>
        <div class="build-view-switch-hint">${state.viewMode === 'orbit' ? 'Orbit-Gebäude werden unten angezeigt.' : 'Oberflächengebäude werden unten angezeigt. Für Satelliten und Orbit-Extraktoren auf ORBIT wechseln.'}</div>
      </div>
      <div class="build-card steelworks-card"><div><strong>🏭 Stahlwerk</strong><small>0,2 t Stahl/s · verbraucht 0,2 t Eisen/s · ${state.selected === 'earth' ? '1. kostenlos · 2. und 3. je 4 t Stahl · ab dem 4. je 20 t Stahl' : 'erstes kostenlos · weitere 20 t Stahl'}</small></div><button class="build-resource" id="build-steelworks-floating" ${(Number(getPlanetStorage(state.selected).steel || 0) >= (state.selected === 'earth' ? (getBuildingsOnPlanet(state.selected).steelworks === 0 ? 0 : getBuildingsOnPlanet(state.selected).steelworks < 3 ? 4 : 20) : (getBuildingsOnPlanet(state.selected).steelworks === 0 ? 0 : 20))) ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).steelworks})</button></div>
      ${state.selected === 'earth' && state.viewMode === 'surface' && taskIsComplete('company_start_name') ? buildButton('companyHeadquarters') : ''}
      ${buildButton('residentialHouse')}
      ${buildButton('mediumResidentialHouse')}
      ${buildButton('residentialComplex')}
      ${buildButton('habitat')}
      ${buildButton('gasCarbonStorage')}
      ${buildButton('stoneQuarry')}
      ${buildButton('buildingMaterialsFactory')}
      ${buildButton('coalMine')}
      ${buildButton('gasPlant')}
      ${buildButton('co2Extraction')}
      ${buildButton('co2ProcessingPlant')}
      ${buildButton('orbitalCo2Extractor')}
      ${buildButton('researchSatellite')}
      ${buildButton('ironMine')}
      ${buildButton('nickelMine')}
      ${buildButton('graphiteMine')}
      ${buildButton('bauxiteMine')}
      ${buildButton('aluminiumOxideRefinery')}
      ${buildButton('aluminiumSmelter')}
      ${buildButton('siliconMine')}
      ${buildButton('lithiumMine')}
      ${buildButton('copperMine')}
      ${buildButton('copperSmelter')}
      ${buildButton('lithiumRefinery')}
      ${buildButton('machineFactory')}
      ${buildButton('glassFactory')}
      ${buildButton('heliumExtractor')}
      ${buildButton('fusionReactor')}
      ${buildButton('solarPlant')}
      ${buildButton('hydroelectricPlant')}
      ${buildButton('greenhouse')}
      ${buildButton('woodcutter')}
      ${buildButton('forester')}
      ${buildButton('atmosphereRegulator')}
      ${buildButton('foodFactory')}
      ${buildButton('iceMine')}
      ${buildButton('iceProcessingPlant')}
      ${buildButton('algaeFarm')}
      ${buildButton('algaeFoodProcessor')}
      ${buildButton('cocoaPlantation')}
      ${buildButton('chocolateFactory')}
      ${buildButton('luxuryFurnitureFactory')}
      ${buildButton('moonBase')}
      ${buildButton('crudeOilPump')}
      ${buildButton('refinery')}
      ${buildButton('uraniumMine')}
      ${state.selected === 'io' && state.viewMode === 'surface' ? buildButton('ioniumMine') : ''}
      ${buildButton('uraniumProcessingPlant')}
      ${buildButton('nuclearFuelPlant')}
      ${buildButton('nuclearReactor')}
      ${buildButton(state.viewMode === 'orbit' ? 'radioactiveStorageOrbit' : 'radioactiveStorageSurface')}
      ${buildButton('chipFactory')}
      ${buildButton('electronicsFactory')}
      ${buildButton('polymerFactory')}
      ${buildButton('rubberFactory')}
      ${buildButton('plasticFactory')}
      ${buildButton('syntheticGraphitePlant')}
      ${buildButton('vehicleFactory')}
      ${buildButton('solarSail')}
      ${state.viewMode === 'orbit' ? buildButton('warmingSail') : ''}
      ${state.selected === 'earth' ? buildButton('solarSatellite') : ''}
      ${state.selected === 'earth' ? buildButton('solarProbe') : ''}
      ${state.selected === 'earth' ? `<div class="build-card research-lab-card"><div><strong>🔬 Forschungslabor</strong><small>Nur auf der Erde · benötigt Baustoffe, Glas und Elektronik · Kostenmengen werden noch festgelegt</small></div><button class="build-resource" id="build-research-lab" ${getBuildingsOnPlanet('earth').researchLab ? 'disabled' : ''}>${getBuildingsOnPlanet('earth').researchLab ? 'Gebaut' : 'Bauen'}</button></div>` : ''}
      ${state.selected === 'earth' && state.viewMode === 'surface' ? buildButton('observatory') : ''}
      <div class="build-card"><div><strong>⚡ Kohlekraftwerk</strong><small>20 MW Strom/s · verbraucht 0,0002 t Kohle/s · 90 t Stahl</small></div><button class="build-resource" id="build-coal-power" ${Number(getPlanetStorage(state.selected).steel || 0) >= 90 ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).coalPowerPlant})</button></div>
      ${(() => { const mode=state.viewMode==='orbit'?'orbit':'surface'; const body=ensureLiquidTankData(state.selected); const key=liquidTankLocationKey(state.selected,mode); const capacity=liquidTankCapacity(state.selected,mode); const fuel=liquidFuelAmount(state.selected,mode); const pct=capacity>0?Math.min(100,fuel/capacity*100):0; const queued=Number(liquidTankBuildQueue[key]||0)>0; const remaining=queued?Math.max(0,30-(gameNow()-Number(liquidTankBuildStarted[key]||gameNow()))/1000):0; const storage=getLocationStorage(state.selected,mode); const affordable=Number(storage.buildingMaterials||0)>=500&&Number(storage.steel||0)>=500; return `<div class="build-card liquid-tank-card"><div><strong>🛢️ Flüssiglager</strong><small>10.000 Liter Kapazität je Tank · 500 t Baustoffe · 500 t Stahl · 30 Sekunden Bauzeit · keine Forschung · unbegrenzt baubar · ${mode==='orbit'?'Orbit':'Oberfläche'}</small><div class="liquid-tank-summary"><span>${fuel.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${capacity.toLocaleString('de-DE')} L</span><strong>${pct.toFixed(1)} %</strong></div><div class="liquid-tank-progress"><i style="width:${pct}%"></i></div>${queued?`<small>Tank im Bau · noch ${remaining.toFixed(1)} Sekunden</small>`:''}</div><button class="build-resource" data-building="liquidStorage" ${queued||!affordable?'disabled':''}>${queued?'Im Bau':'Tank bauen'}</button></div>`; })()}
      <div class="build-card rocket-factory-card"><div><strong>🏭 Raketenfabrik</strong><small>1.000 t Stahl · 2.000 t Baustoffe · 60 Sekunden Bauzeit · Voraussetzung für alle Raketen · Produktionswarteschlange</small>${rocketFactoryBuildQueue[state.selected] ? `<div class="rocket-progress"><i style="width:${Math.min(100,(gameNow()-(rocketFactoryBuildStarted[state.selected]||gameNow()))/60000*100)}%"></i></div><small>Fertigstellung: ${Math.max(0,60-(gameNow()-(rocketFactoryBuildStarted[state.selected]||gameNow()))/1000).toFixed(1)} s</small>` : ''}</div><button class="build-resource" id="build-rocket-factory" ${getBuildingsOnPlanet(state.selected).rocketFactory || rocketFactoryBuildQueue[state.selected] || !isBuildingAllowed('rocketFactory', state.selected) || Number(getPlanetStorage(state.selected).steel || 0) < 1000 || Number(getPlanetStorage(state.selected).buildingMaterials || 0) < 2000 ? 'disabled' : ''}>${getBuildingsOnPlanet(state.selected).rocketFactory ? 'Gebaut' : rocketFactoryBuildQueue[state.selected] ? 'Im Bau' : 'Bauen'}</button></div>
      ${state.viewMode === 'orbit' ? (() => { const orbitStore=getOrbitStorage(state.selected); const padCount=getOrbitLandingPadCount(state.selected); const used=getOrbitRocketSlotsUsed(state.selected); const costs={steel:2000,buildingMaterials:3000,machines:500,batteries:300}; const affordable=Object.entries(costs).every(([r,n])=>Number(orbitStore[r]||0)>=n); return `<div class="build-card orbit-landing-pad-card"><div><strong>🛰️ Orbit-Start- und Landevorrichtung</strong><small>1 Stellplatz für eine Rakete in einer zyklischen Orbitmission · Betankung aus dem Orbit-Flüssiglager · Baukosten: 2.000 t Stahl, 3.000 t Baustoffe, 500 t Maschinen, 300 t Batterien</small><small>Stellplätze belegt: ${used} / ${padCount}</small></div><button class="build-resource" id="build-orbit-landing-pad" ${!isBuildingAllowed('orbitLandingPad', state.selected) || !affordable ? 'disabled' : ''}>Bauen (${padCount})</button></div>`; })() : ''}
       <div class="build-card landing-pad-card"><div><strong>🛬 Start- & Landerampe</strong><small>2.000 t Stahl · 3.000 t Baustoffe · 500 t Maschinen · 300 t Batterien · eine Rampe pro gleichzeitig möglichem Start/Landung · auf allen Planeten</small></div><button class="build-resource" id="build-landing-pad" ${!isBuildingAllowed('landingPad', state.selected) || Number(getPlanetStorage(state.selected).steel || 0) < 2000 || Number(getPlanetStorage(state.selected).buildingMaterials || 0) < 3000 || Number(getPlanetStorage(state.selected).machines || 0) < 500 || Number(getPlanetStorage(state.selected).batteries || 0) < 300 ? 'disabled' : ''}>Bauen (${getBuildingsOnPlanet(state.selected).landingPad || 0})</button></div>
      <div class="build-card outpost-card"><div><strong>🛰️ Außenposten</strong><small>100 t Stahl · 60 Sekunden Bauzeit · maximal 1 pro Planet · Voraussetzung für weitere Gebäude auf allen Außenplaneten</small></div><button class="build-resource" id="build-outpost" ${getBuildingsOnPlanet(state.selected).outpost || outpostBuildQueue[state.selected] || Number(getPlanetStorage(state.selected).steel || 0) < 100 ? 'disabled' : ''}>Bauen (${getBuildingsOnPlanet(state.selected).outpost ? 'Gebaut' : 'Bauen'})</button></div>
      `;
    } catch (buildMenuError) {
      console.error("Gebäudeübersicht konnte nicht aufgebaut werden:", buildMenuError);
      menu.innerHTML = `<div class="planet-build-header"><div class="planet-build-title">🏗️ Gebäudeübersicht</div><button type="button" class="build-menu-close" aria-label="Gebäudemenü schließen" onclick="document.querySelector('.planet-build-menu')?.remove()">✕</button></div><p class="bad">Fehler beim Laden der Gebäude: ${String(buildMenuError?.message || buildMenuError)}</p><p class="hint">Bitte sende diesen Fehlertext, falls er erneut erscheint.</p>`;
      menu.style.left = "50%"; menu.style.top = "calc(50% - 150px)";
      return;
    }

    // Gebäudeübersicht Konzept 1.1: planetenabhängige, durchsuchbare Kategorien.
    const buildCategories = [
      { title: '🏢 Unternehmensverwaltung', keys: ['companyHeadquarters'] },
      { title: '🌍 Terraforming', keys: ['atmosphereRegulator'] },
      { title: '🌲 Forstwirtschaft', keys: ['forester'] },
      { title: '🛢️ Verbrauch', keys: ['refinery'] },

      { title: '⛏️ Rohstoffgewinnung', keys: ['iceMine','titanMine','nickelMine','graphiteMine','ironMine','stoneQuarry','coalMine','gasPlant','siliconMine','lithiumMine','copperMine','heliumExtractor','crudeOilPump','uraniumMine','ioniumMine','bauxiteMine'] },
      { title: '🏠 Wohnraum & Kolonisten', keys: ['residentialHouse','mediumResidentialHouse','residentialComplex','habitat'] },
      { title: '🌱 Landwirtschaft & Versorgung', keys: ['greenhouse','hydroelectricPlant','cocoaPlantation','woodcutter'] },
      { title: '🍫 Kolonistenversorgung', keys: ['chocolateFactory','luxuryFurnitureFactory'] },
      { title: '🏭 Verarbeitung & Industrie', keys: ['syntheticGraphitePlant','titanProcessing','titanRefinery','steelworks','buildingMaterialsFactory','co2ProcessingPlant','aluminiumOxideRefinery','aluminiumSmelter','copperSmelter','lithiumRefinery','machineFactory','glassFactory','electronicsFactory','chipFactory','polymerFactory','rubberFactory','plasticFactory','vehicleFactory','foodFactory','iceProcessingPlant','algaeFarm','algaeFoodProcessor','uraniumProcessingPlant','nuclearFuelPlant','radioactiveStorageSurface','radioactiveStorageOrbit'] },
      { title: '⚡ Energie & Forschung', keys: ['batteryStorage','coalPowerPlant','solarPlant','fusionReactor','nuclearReactor','researchLab','observatory'] },
      { title: '📦 Lager', keys: ['gasCarbonStorage','liquidStorage'] },
      { title: '🚀 Raumfahrt & Infrastruktur', keys: ['co2Extraction','moonBase','solarSail','warmingSail','outpost','rocketFactory','landingPad','solarSatellite','solarProbe'] },
      { title: '🛰️ Orbit-Gebäude', keys: ['orbitLandingPad','orbitalCo2Extractor','researchSatellite'] }
    ];
    const specialKeys = {
      'build-steelworks-floating':'steelworks', 'build-coal-power':'coalPowerPlant',
      'build-research-lab':'researchLab', 'build-rocket-factory':'rocketFactory',
      'build-landing-pad':'landingPad', 'build-orbit-landing-pad':'orbitLandingPad', 'build-outpost':'outpost'
    };
    const cards = [...menu.querySelectorAll('.build-card')];
    const keyForCard = card => {
      const button = card.querySelector('[data-building],button[id^="build-"]');
      return button ? (button.dataset.building || specialKeys[button.id] || null) : null;
    };
    const unavailable = [];
    const categorized = new Map(buildCategories.map(c => [c.title, []]));
    const unknown = [];
    for (const card of cards) {
      const key = keyForCard(card);
      const foresterResearchLocked = key === 'forester' && (
        !ensureResearchOrders().completed.regenerativeChange || !state.research?.completed?.forester
      );
      if (key && (!isBuildingAllowed(key, state.selected) || foresterResearchLocked)) {
        card.classList.add('build-unavailable');
        card.dataset.unavailable = 'true';
        const small = card.querySelector('small');
        if (small && foresterResearchLocked && !small.textContent.includes('Nicht verfügbar: Forschung')) {
          small.textContent += ' · Nicht verfügbar: Forschungsvertrag „Regenerative Veränderung“ und Forschung Förster erforderlich';
        } else if (small && !small.textContent.includes('Auf diesem Planeten nicht verfügbar')) {
          small.textContent += ' · Auf diesem Planeten nicht verfügbar';
        }
        const button = card.querySelector('button');
        if (button) button.disabled = true;
        unavailable.push(card);
      }
      const category = buildCategories.find(c => c.keys.includes(key));
      if (category) categorized.get(category.title).push(card);
      else unknown.push(card);
    }

    const tools = document.createElement('div');
    tools.className = 'building-overview-tools';
    tools.innerHTML = `<input class="building-search" type="search" placeholder="🔎 Gebäude, Rohstoff oder Beschreibung suchen…" aria-label="Gebäude suchen"><div class="building-filter-row"><label><input type="checkbox" class="building-filter-production"> Produktion</label><label><input type="checkbox" class="building-filter-consumption"> Verbrauch</label><label><input type="checkbox" class="building-show-unavailable"> Nicht verfügbare anzeigen</label></div><div class="building-result-count" aria-live="polite"></div>`;
    menu.appendChild(tools);
    const groups = [];
    for (const category of buildCategories) {
      const entries = categorized.get(category.title);
      if (!entries.length) continue;
      const section = document.createElement('section');
      section.className = 'building-category';
      const heading = document.createElement('button');
      heading.type = 'button'; heading.className = 'building-category-toggle'; heading.setAttribute('aria-expanded', 'false');
      heading.innerHTML = `<span>${category.title}</span><span class="building-category-count">${entries.filter(c => !c.dataset.unavailable).length}</span><span class="building-category-arrow">▸</span>`;
      const content = document.createElement('div'); content.className = 'building-category-content'; content.hidden = true;
      entries.forEach(card => {
        const key = keyForCard(card);
        const small = card.querySelector('small');
        const desc = small ? small.textContent : '';
        const fullDesc = key === 'vehicleFactory' ? `${buildingTypes.vehicleFactory.text} · Baukosten: 500 t Stahl, 250 t Baustoffe, 100 t Elektronik und 200 t Chips` : desc;
        // Antippbare Kosten-, Verbrauchs- und Produktionskacheln. Die Werte
        // werden aus der vorhandenen Beschreibung gelesen; Mechaniken bleiben unberührt.
        const getInfoText = (kind) => {
          const parts = String(desc || '').split(/\s*[·•]\s*/).map(x => x.trim()).filter(Boolean);
          // Baukosten dieser Gebäude werden immer aus den aktiven Gebäudedaten gelesen.
          // So bleiben die Karten aktuell, wenn buildingTypes[key].cost geändert wird.
          if (key === 'habitat' && kind === 'cost') {
            return 'Baukosten: 200 t Stahl · 250 t Baustoffe · Laufender Unterhalt: 88 GD pro Ingame-Stunde je Habitat';
          }
          if (BUILDING_CARD_COST_KEYS.has(key)) {
            if (kind === 'cost') return buildingCardCostText(key, state.selected);
            if (kind === 'consumption') {
              if (key === 'graphiteMine') return 'Stromverbrauch: 5 MW pro Gebäude';
              const found = parts.filter(x => /verbraucht|verbrauch|stromverbrauch/i.test(x));
              return found.length ? found.join(' · ') : 'Kein laufender Rohstoff- oder Stromverbrauch hinterlegt.';
            }
            const building = buildingTypes[key];
            if (building?.resource && Number(building.rate) > 0) {
              const unit = building.resource === 'crudeOil' ? 'L' : 't';
              const rate = Number(building.rate).toLocaleString('de-DE', { maximumFractionDigits: 4 });
              return `Produktion: ${rate} ${unit} ${resourceNames[building.resource] || building.resource}/s pro Gebäude`;
            }
            return 'Keine Produktionsrate in den Gebäudedaten hinterlegt.';
          }
          if (kind === 'cost') {
            const found = parts.filter(x => /baukosten|kosten:/i.test(x));
            if (found.length) return found.join(' · ');
            if (key === 'steelworks') return state.selected === 'earth' ? '1. Gebäude kostenlos; 2. und 3. je 4 t Stahl; ab dem 4. je 20 t Stahl.' : 'Erstes Gebäude kostenlos; weitere je 20 t Stahl.';
            return 'Keine separat ausgewiesenen Baukosten in der Gebäudebeschreibung gefunden.';
          }
          if (kind === 'consumption') {
            const found = parts.filter(x => /verbraucht|verbrauch|benötigt [\d,.]+\s*MW|stromverbrauch/i.test(x));
            return found.length ? found.join(' · ') : 'Kein Verbrauch in der Gebäudebeschreibung angegeben.';
          }
          const found = parts.filter(x => /produziert|produktion|\/s\b/i.test(x) && !/verbraucht|verbrauch/i.test(x));
          return found.length ? found.join(' · ') : 'Keine Produktionsrate in der Gebäudebeschreibung angegeben.';
        };
        const infoTiles = document.createElement('div'); infoTiles.className = 'building-info-tiles';
        const infoPanels = document.createElement('div'); infoPanels.className = 'building-info-panels';
        [
          {kind:'cost', label:'Kosten', icon:'🟣', cls:'cost'},
          {kind:'consumption', label:'Verbrauch', icon:'🔴', cls:'consumption'},
          {kind:'production', label:'Produktion', icon:'🟢', cls:'production'}
        ].forEach(item => {
          const panel = document.createElement('div'); panel.className = `building-info-panel ${item.cls}`; panel.hidden = true;
          panel.textContent = getInfoText(item.kind);
          const tile = document.createElement('button'); tile.type = 'button'; tile.className = `building-info-tile ${item.cls}`;
          tile.setAttribute('aria-expanded', 'false'); tile.textContent = `${item.icon} ${item.label} ▾`;
          tile.addEventListener('click', () => {
            const opening = panel.hidden;
            panel.hidden = !opening; tile.setAttribute('aria-expanded', String(opening));
            tile.textContent = `${item.icon} ${item.label} ${opening ? '▴' : '▾'}`;
          });
          infoTiles.appendChild(tile); infoPanels.appendChild(panel);
        });
        card.appendChild(infoTiles); card.appendChild(infoPanels);

        const detail = document.createElement('div'); detail.className = 'building-details'; detail.hidden = true;
        const timeMatch = desc.match(/(?:Bauzeit|Bauzeit:?)\s*([^·]+)/i);
        const reqMatch = desc.match(/(?:Voraussetzung|benötigt|nur auf|nur Erde|nur Venus|nur Merkur|nur auf der Erde)[^·]*/i);
        detail.innerHTML = `<div><strong>Bauzeit:</strong> ${timeMatch ? timeMatch[1].trim() : 'Keine separate Bauzeit in den Gebäudedaten hinterlegt.'}</div><div><strong>Voraussetzungen:</strong> ${reqMatch ? reqMatch[0].trim() : (card.dataset.unavailable ? 'Auf diesem Planeten nicht verfügbar.' : 'Keine zusätzliche Voraussetzung in der Gebäudebeschreibung angegeben.')}</div><div><strong>Beschreibung:</strong> ${fullDesc || 'Keine Beschreibung hinterlegt.'}</div><div><strong>Ausbau & Skalierung:</strong> Bestehende Produktions- und Verbrauchsregeln bleiben unverändert; weitere Angaben werden nur angezeigt, wenn sie in den vorhandenen Gebäudedaten hinterlegt sind.</div>`;
        const infoDetail = document.createElement('div'); infoDetail.className = 'building-details building-information'; infoDetail.hidden = true;
        infoDetail.innerHTML = `<div><strong>Benötigte Forschung / Voraussetzungen:</strong> ${reqMatch ? reqMatch[0].trim() : (card.dataset.unavailable ? 'Auf diesem Planeten nicht verfügbar.' : 'Keine zusätzliche Forschungsanforderung in der Gebäudebeschreibung hinterlegt.')}</div><div><strong>Bauzeit:</strong> ${timeMatch ? timeMatch[1].trim() : 'Keine separate Bauzeit in den Gebäudedaten hinterlegt.'}</div><div><strong>Weitere Informationen:</strong> ${fullDesc || 'Keine Beschreibung hinterlegt.'}</div>`;
        const actions = document.createElement('div'); actions.className = 'building-card-actions';
        const buildBtn = card.querySelector('.build-resource');
        const detailsBtn = document.createElement('button'); detailsBtn.type = 'button'; detailsBtn.className = 'building-details-toggle'; detailsBtn.textContent = 'Details';
        detailsBtn.addEventListener('click', () => { detail.hidden = !detail.hidden; detailsBtn.textContent = detail.hidden ? 'Details' : 'Details schließen'; });
        const infoBtn = document.createElement('button'); infoBtn.type = 'button'; infoBtn.className = 'building-information-toggle'; infoBtn.textContent = 'Informationen';
        infoBtn.addEventListener('click', () => { infoDetail.hidden = !infoDetail.hidden; infoBtn.textContent = infoDetail.hidden ? 'Informationen' : 'Informationen schließen'; });
        if (buildBtn) { buildBtn.classList.add('building-build-action'); actions.appendChild(buildBtn); }
        actions.appendChild(detailsBtn); actions.appendChild(infoBtn);
        const demolishBtn = document.createElement('button');
        demolishBtn.type = 'button'; demolishBtn.className = 'building-demolish-action'; demolishBtn.textContent = 'Abriss (50 %)';
        demolishBtn.disabled = !key || Number(getBuildingsOnPlanet(state.selected)[key] || 0) < 1;
        demolishBtn.title = 'Gebäude abreißen; 50 % der hinterlegten Baukosten gehen zurück ins Lager dieses Planeten.';
        demolishBtn.addEventListener('click', () => {
          if (!key) { alert('Für dieses Gebäude ist kein Abriss hinterlegt.'); return; }
          demolishBuilding(key, state.selected);
        });
        actions.appendChild(demolishBtn);
        card.appendChild(actions); card.appendChild(detail); card.appendChild(infoDetail); content.appendChild(card);
      });
      heading.addEventListener('click', () => {
        const opening = content.hidden;
        groups.forEach(g => { g.content.hidden = true; g.heading.setAttribute('aria-expanded','false'); g.heading.querySelector('.building-category-arrow').textContent = '▸'; });
        content.hidden = !opening; heading.setAttribute('aria-expanded', String(opening)); heading.querySelector('.building-category-arrow').textContent = opening ? '▾' : '▸';
        activeBuildingCategoryTitle = opening ? category.title : null;
      });
      section.append(heading, content); menu.appendChild(section); groups.push({section,heading,content});
    }
    unknown.forEach(card => menu.appendChild(card));
    const search = tools.querySelector('.building-search');
    const production = tools.querySelector('.building-filter-production');
    const consumption = tools.querySelector('.building-filter-consumption');
    const showUnavailable = tools.querySelector('.building-show-unavailable');
    const allCards = [...menu.querySelectorAll('.build-card')];
    const updateBuildingFilters = () => {
      const term = search.value.trim().toLocaleLowerCase(); let visible = 0;
      allCards.forEach(card => {
        const text = card.textContent.toLocaleLowerCase();
        const unavailableCard = card.dataset.unavailable === 'true';
        const hasProduction = /produziert|produktion|\+\s*[\d,.]+\s*(t|mw|l|punkte)/i.test(text);
        const hasConsumption = /verbraucht|verbrauch|−|nimmt/i.test(text);
        const match = (!term || text.includes(term)) && (!production.checked || hasProduction) && (!consumption.checked || hasConsumption) && (showUnavailable.checked || !unavailableCard);
        card.hidden = !match; if (match) visible++;
      });
      groups.forEach(g => {
        const count = [...g.content.querySelectorAll('.build-card')].filter(c => !c.hidden).length;
        g.section.hidden = count === 0;
        if (term) { g.content.hidden = false; g.heading.setAttribute('aria-expanded','true'); g.heading.querySelector('.building-category-arrow').textContent = '▾'; }
      });
      tools.querySelector('.building-result-count').textContent = `${visible} Gebäude${visible === 1 ? '' : ''} angezeigt`;
    };
    // Filtereinstellungen bleiben nach jedem Bau erhalten, statt auf die
    // Standardansicht zurückzuspringen.
    if (previousBuildMenuState) {
      search.value = previousBuildMenuState.search;
      production.checked = previousBuildMenuState.production;
      consumption.checked = previousBuildMenuState.consumption;
      showUnavailable.checked = previousBuildMenuState.showUnavailable;
      activeBuildingCategoryTitle = previousBuildMenuState.category || activeBuildingCategoryTitle;
    }
    [search, production, consumption, showUnavailable].forEach(el => el.addEventListener('input', updateBuildingFilters));
    [production, consumption, showUnavailable].forEach(el => el.addEventListener('change', updateBuildingFilters));
    updateBuildingFilters();
    const orbitCategoryTitle = '🛰️ Orbit-Gebäude';
    const categoryToRestore = state.viewMode === 'orbit'
      ? (groups.find(g => g.heading.querySelector('span')?.textContent === orbitCategoryTitle) || groups.find(g => g.heading.querySelector('span')?.textContent === activeBuildingCategoryTitle) || groups[0])
      : (groups.find(g => g.heading.querySelector('span')?.textContent === activeBuildingCategoryTitle) || groups[0]);
    if (categoryToRestore) {
      categoryToRestore.content.hidden = false;
      categoryToRestore.heading.setAttribute('aria-expanded','true');
      categoryToRestore.heading.querySelector('.building-category-arrow').textContent = '▾';
      activeBuildingCategoryTitle = categoryToRestore.heading.querySelector('span')?.textContent || null;
    }

    menu.style.left = '50%';
    menu.style.top = 'calc(50% - 150px)';
    document.body.appendChild(menu);
    // Das Menü liegt direkt im Dokument, damit Zoom/Scrollen des Sonnensystems seine Position nicht verschiebt.
    // Absichtlich keine building-menu-open-Klasse am Sonnensystem setzen: Das Menü liegt separat auf dem Dokument.
    // Nach dem Bauen vertikale und horizontale Scrollposition wiederherstellen.
    menu.scrollTop = previousBuildMenuScrollTop;
    menu.scrollLeft = previousBuildMenuScrollLeft;
    const restoreBuildMenuScroll = () => {
      if (menu.isConnected) {
        menu.scrollTop = previousBuildMenuScrollTop;
        menu.scrollLeft = previousBuildMenuScrollLeft;
      }
      // Der Browser darf beim erneuten Einfügen des Menüs nicht die Seite
      // oder den sichtbaren Bereich zum Dokumentanfang verschieben.
      window.scrollTo(previousPageScrollX, previousPageScrollY);
    };
    restoreBuildMenuScroll();
    requestAnimationFrame(() => {
      restoreBuildMenuScroll();
      requestAnimationFrame(restoreBuildMenuScroll);
    });
    // Mobile-Browser korrigieren den Scrollbereich nach DOM-Updates teils
    // verzögert; nochmals nach Layout und Touch-Scroll-Anpassung fixieren.
    setTimeout(restoreBuildMenuScroll, 80);
    setTimeout(restoreBuildMenuScroll, 220);

    menu.querySelectorAll('[data-build-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.viewMode = btn.dataset.buildView === 'orbit' ? 'orbit' : 'surface';
        activeBuildingCategoryTitle = state.viewMode === 'orbit' ? '🛰️ Orbit-Gebäude' : '⛏️ Rohstoffgewinnung';
        renderSystem();
        renderInfo();
        saveGame(false);
      });
    });
    menu.querySelector('.demolition-admin-open').addEventListener('click', () => demolishBuilding(null, state.selected));
    menu.querySelector('#close-build-menu').addEventListener('click', () => {
      state.buildMenuOpen = false;
      renderSystem();
      renderInfo();
    });
    menu.querySelectorAll('.build-resource[data-building]').forEach(btn =>
      btn.addEventListener('click', () => buildResourceBuilding(btn.dataset.building))
    );
    menu.querySelector('#build-coal-power').addEventListener('click', buildCoalPowerPlant);
    menu.querySelector('#build-steelworks-floating').addEventListener('click', buildSteelworks);
    menu.querySelector('#build-rocket-factory').addEventListener('click', buildRocketFactory);
    menu.querySelector('#build-landing-pad').addEventListener('click', buildLandingPad);
    const orbitPadBtn = menu.querySelector('#build-orbit-landing-pad');
    if (orbitPadBtn) orbitPadBtn.addEventListener('click', buildOrbitLandingPad);
    const researchLabBtn = menu.querySelector('#build-research-lab');
    if (researchLabBtn) researchLabBtn.addEventListener('click', buildResearchLab);
    menu.querySelector('#build-outpost').addEventListener('click', buildOutpost);
  }
  const buildMenuTrigger = document.querySelector('#open-build-menu-button');
  if (buildMenuTrigger) {
    buildMenuTrigger.disabled = state.selected === 'sun';
    buildMenuTrigger.textContent = state.selected === 'sun'
      ? '🏗️ Erst einen Planeten auswählen'
      : `🏗️ Baumenü öffnen · ${bodies[state.selected].name}`;
    buildMenuTrigger.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (state.selected === 'sun') return;
      // Baumenü als eigenständiges Fenster öffnen; das Sonnensystem bleibt sichtbar.
      state.buildMenuOpen = true;
      renderSystem();
      renderInfo();
      const openedMenu = document.querySelector('body > .planet-build-menu');
      if (openedMenu) {
        openedMenu.hidden = false;
        openedMenu.style.display = 'block';
        openedMenu.style.visibility = 'visible';
        openedMenu.style.opacity = '1';
      }
    };
  }
  applyLanguage();
}

function renderTopResources() {
  // Diese Funktion wird während des Spiels regelmäßig aufgerufen.
  // Deshalb darf der Klick auf "Rohstofflager anzeigen" nicht durch
  // einen kompletten DOM-Neuaufbau verloren gehen.
  const miningBuildingKeys = ['ironMine','siliconMine','lithiumMine','copperMine','stoneQuarry','coalMine','gasPlant','iceMine','co2Extraction','orbitalCo2Extractor','crudeOilPump','uraniumMine','ioniumMine','bauxiteMine','titanMine','graphiteMine','heliumExtractor','woodcutter'];
  const planetRows = Object.entries(bodies)
    .filter(([id]) => id !== 'sun')
    .map(([id, body]) => ({ id, body, miningCount: miningBuildingKeys.reduce((sum, key) => sum + Math.max(0, Number(getBuildingsOnPlanet(id)[key] || 0)), 0) }))
    .filter(item => item.miningCount > 0)
    .sort((a, b) => b.miningCount - a.miningCount || a.body.name.localeCompare(b.body.name, 'de'))
    .map(({ id, body }) => {
      const storage = getPlanetStorage(id);
      // Das Erd-Lager ist gleichzeitig `state`. Daher nur echte Rohstoffe
      // anzeigen und interne Spielvariablen wie lastUpdate/buildMenuOpen ausblenden.
      const resourceKeys = [
        'stone','ice','coal','gas','crudeOil','polymers','rubber','plastics','wood','biomass','co2','carbon','oxygen','iron','steel','silicon','lithium',
        'copperOre','copper','batteries','buildingMaterials','machines',
        'glass','electronics','chips','hydrogen','helium','helium3','uranium','processedUranium','nuclearFuel','bauxite','aluminiumOxide','aluminium','titanOre','processedTitan','titanium','nickelOre','graphite','water','grain','vegetables','food','algaeBiomass','cocoaBeans'
      ];
      const makeEntries = (store, isOrbit) => resourceKeys
        .filter(key => Number(store[key] || 0) > 0.000001)
        .map(key => {
          const amount = store[key];
          const isLiquid = key === 'crudeOil' || key === 'water' || key === 'liquidFuel';
          const value = isLiquid
            ? Number(amount).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L'
            : formatTons(Number(amount));
          return `<span class="planet-resource-value" data-resource-key="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}: <strong>${value}</strong></span>`;
        }).join('');
      const entries = makeEntries(storage, false);
      const orbitStorage = getOrbitStorage(id);
      const orbitEntries = makeEntries(orbitStorage, true);
      const luxuryEntry = `<div class="planet-resource-section luxury-storage-section"><div class="luxury-storage-title">💎 Luxusgüter</div><div class="planet-resource-list"><span class="planet-resource-value" data-resource-key="vehicles"><strong>🚗 Fahrzeuge:</strong> <strong>${formatTons(Number(storage.vehicles || 0))}</strong></span><span class="planet-resource-value" data-resource-key="chocolate"><strong>🍫 Schokolade:</strong> <strong>${formatTons(Number(storage.chocolate || 0))}</strong></span><span class="planet-resource-value" data-resource-key="luxuryFurniture"><strong>🛋️ Luxusmöbel:</strong> <strong>${formatTons(Number(storage.luxuryFurniture || 0))}</strong></span></div></div>`;
      const orbitLuxuryEntry = `<div class="planet-resource-section luxury-storage-section"><div class="luxury-storage-title">💎 Luxusgüter</div><div class="planet-resource-list"><span class="planet-resource-value" data-resource-key="vehicles"><strong>🚗 Fahrzeuge:</strong> <strong>${formatTons(Number(orbitStorage.vehicles || 0))}</strong></span><span class="planet-resource-value" data-resource-key="chocolate"><strong>🍫 Schokolade:</strong> <strong>${formatTons(Number(orbitStorage.chocolate || 0))}</strong></span><span class="planet-resource-value" data-resource-key="luxuryFurniture"><strong>🛋️ Luxusmöbel:</strong> <strong>${formatTons(Number(orbitStorage.luxuryFurniture || 0))}</strong></span></div></div>`;
      const surfaceRadioactiveCapacity = radioactiveStorageCapacity(id, 'surface');
      const surfaceRadioactiveUsed = radioactiveStoredAmount(storage);
      const surfaceRadioactiveEntry = `<div class="planet-resource-section radioactive-storage-section"><div class="luxury-storage-title">☢️ Radioaktivlager · ${formatTons(surfaceRadioactiveUsed)} / ${formatTons(surfaceRadioactiveCapacity)}</div><div class="planet-resource-list">${['uranium','processedUranium','nuclearFuel','ionium'].map(k => `<span class="planet-resource-value" data-resource-key="${k}">${resourceIcons[k] || '☢️'} ${resourceNames[k] || k}: <strong>${formatTons(Number(storage[k] || 0))}</strong></span>`).join('')}</div></div>`;
      const orbitRadioactiveCapacity = radioactiveStorageCapacity(id, 'orbit');
      const orbitRadioactiveUsed = radioactiveStoredAmount(orbitStorage);
      const orbitRadioactiveEntry = `<div class="planet-resource-section radioactive-storage-section"><div class="luxury-storage-title">☢️ Radioaktivlager · ${formatTons(orbitRadioactiveUsed)} / ${formatTons(orbitRadioactiveCapacity)}</div><div class="planet-resource-list">${['uranium','processedUranium','nuclearFuel','ionium'].map(k => `<span class="planet-resource-value" data-resource-key="${k}">${resourceIcons[k] || '☢️'} ${resourceNames[k] || k}: <strong>${formatTons(Number(orbitStorage[k] || 0))}</strong></span>`).join('')}</div></div>`;
      const hasSurfaceRadioactive = surfaceRadioactiveCapacity > 0 || surfaceRadioactiveUsed > 0.000001;
      const hasOrbitRadioactive = orbitRadioactiveCapacity > 0 || orbitRadioactiveUsed > 0.000001;
      const hasSurfaceLuxury = Number(storage.vehicles || 0) > 0.000001 || Number(storage.chocolate || 0) > 0.000001 || Number(storage.luxuryFurniture || 0) > 0.000001;
      const hasOrbitLuxury = Number(orbitStorage.vehicles || 0) > 0.000001 || Number(orbitStorage.chocolate || 0) > 0.000001 || Number(orbitStorage.luxuryFurniture || 0) > 0.000001;
      const surfaceFuel = liquidFuelAmount(id, 'surface');
      const orbitFuel = liquidFuelAmount(id, 'orbit');
      const surfaceFuelCapacity = liquidTankCapacity(id, 'surface');
      const surfaceFuelPct = surfaceFuelCapacity > 0 ? Math.min(100, surfaceFuel / surfaceFuelCapacity * 100) : 0;
      const surfaceLiquidEntry = `<details class="planet-resource-section liquid-storage-section"><summary>🛢️ Flüssiglager <strong>${surfaceFuel.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${surfaceFuelCapacity.toLocaleString('de-DE')} L</strong></summary><div class="planet-resource-list"><div class="liquid-storage-meter"><div class="liquid-storage-meter-label"><span>Füllstand</span><strong>${surfaceFuelPct.toFixed(1)} %</strong></div><div class="liquid-storage-progress"><i style="width:${surfaceFuelPct}%"></i></div></div><span class="planet-resource-value">⛽ Treibstoff: <strong>${surfaceFuel.toLocaleString('de-DE',{maximumFractionDigits:2})} L</strong></span><span class="planet-resource-value">Tankkapazität: <strong>${surfaceFuelCapacity.toLocaleString('de-DE')} L</strong></span>${surfaceFuelCapacity <= 0 ? '<small class="hint">Noch kein Flüssiglager an der Oberfläche gebaut.</small>' : ''}</div></details>`;
      const orbitFuelCapacity = liquidTankCapacity(id, 'orbit');
      const orbitFuelPct = orbitFuelCapacity > 0 ? Math.min(100, orbitFuel / orbitFuelCapacity * 100) : 0;
      const orbitLiquidEntry = `<details class="planet-resource-section liquid-storage-section"><summary>🛢️ Orbit-Flüssiglager <strong>${orbitFuel.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${orbitFuelCapacity.toLocaleString('de-DE')} L</strong></summary><div class="planet-resource-list"><div class="liquid-storage-meter"><div class="liquid-storage-meter-label"><span>Füllstand</span><strong>${orbitFuelPct.toFixed(1)} %</strong></div><div class="liquid-storage-progress"><i style="width:${orbitFuelPct}%"></i></div></div><span class="planet-resource-value">⛽ Treibstoff: <strong>${orbitFuel.toLocaleString('de-DE',{maximumFractionDigits:2})} L</strong></span><span class="planet-resource-value">Tankkapazität: <strong>${orbitFuelCapacity.toLocaleString('de-DE')} L</strong></span>${orbitFuelCapacity <= 0 ? '<small class="hint">Noch kein Flüssiglager in diesem Orbit gebaut.</small>' : ''}</div></details>`;
      // Flüssiglager werden ausschließlich im normalen Lagerbereich angezeigt, nicht in der oberen Rohstoffübersicht.
      return `<div class="planet-resource-line" data-planet-id="${id}"><strong class="planet-resource-name">🪐 ${body.name} · Planetlager</strong><div class="planet-resource-values">${entries}</div>${hasSurfaceRadioactive ? surfaceRadioactiveEntry : ''}${luxuryEntry}</div>
      <div class="planet-resource-line" data-planet-id="${id}" data-orbit-storage="true"><strong class="planet-resource-name">🛰️ ${body.name} · Orbit-Lager</strong><div class="planet-resource-values">${orbitEntries}</div>${hasOrbitRadioactive ? orbitRadioactiveEntry : ''}${orbitLuxuryEntry}</div>`;
    }).join('');

  let toggle = document.querySelector('#toggle-planet-resources');
  let dropdown = document.querySelector('#planet-resources-dropdown');

  // Nur beim ersten Aufbau die DOM-Struktur erzeugen.
  if (!toggle || !dropdown) {
    topResources.innerHTML = `
      <button type="button" id="toggle-planet-resources" class="top-resource-toggle"
              aria-expanded="${planetResourcesOpen}">
        📦 ${planetResourcesOpen ? 'Rohstofflager ausblenden' : 'Rohstofflager anzeigen'}
      </button>
      <div id="planet-resources-dropdown" class="planet-resources-dropdown" ${planetResourcesOpen ? '' : 'hidden'}>
        <div class="planet-resources-title">
          <strong>📦 Aktuelle Rohstoffe in den Planetlagern</strong>
          <span class="hint">Nur vorhandene Lagerbestände</span>
        </div>
        <div class="planet-resource-table"></div>
      </div>`;

    toggle = document.querySelector('#toggle-planet-resources');
    dropdown = document.querySelector('#planet-resources-dropdown');

    if (toggle && dropdown) {
      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        planetResourcesOpen = !planetResourcesOpen;
        dropdown.hidden = !planetResourcesOpen;
        toggle.setAttribute('aria-expanded', String(planetResourcesOpen));
        toggle.textContent = planetResourcesOpen
          ? '📦 Rohstofflager ausblenden'
          : '📦 Rohstofflager anzeigen';
      });
    }
  }

  // Nur die aktuellen Mengen ersetzen. Der Button und das Dropdown
  // bleiben dasselbe DOM und können daher nicht durch den Refresh schließen.
  const table = dropdown?.querySelector('.planet-resource-table');
  if (table) {
    const openDetails = captureDetailsOpenState(table);
    table.innerHTML = planetRows ||
      '<p class="hint">Aktuell befinden sich keine Rohstoffe in Planetlagern.</p>';
    restoreDetailsOpenState(table, openDetails);
  }

  if (toggle && dropdown) {
    dropdown.hidden = !planetResourcesOpen;
    toggle.setAttribute('aria-expanded', String(planetResourcesOpen));
    toggle.textContent = planetResourcesOpen
      ? '📦 Rohstofflager ausblenden'
      : '📦 Rohstofflager anzeigen';
  }

  applyLanguage();
}

function refreshTopResourceValues() {
  const table = document.querySelector('#planet-resources-dropdown .planet-resource-table');
  if (!table) return;

  table.querySelectorAll('.planet-resource-line').forEach(line => {
    const id = line.dataset.planetId;
    if (!id || !bodies[id]) return;
    const storage = line.dataset.orbitStorage === 'true' ? getOrbitStorage(id) : getPlanetStorage(id);
    line.querySelectorAll('[data-resource-key]').forEach(el => {
      const key = el.dataset.resourceKey;
      const amount = key === 'liquidFuel' ? liquidFuelAmount(id, line.dataset.orbitStorage === 'true' ? 'orbit' : 'surface') : Number(storage[key] || 0);
      if (key !== 'vehicles' && key !== 'chocolate' && amount <= 0.000001) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      const isLiquid = key === 'crudeOil' || key === 'water' || key === 'liquidFuel';
      const value = isLiquid
        ? amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L'
        : formatTons(amount);
      const strongs = el.querySelectorAll('strong');
      const strong = strongs[strongs.length - 1];
      if (strong) strong.textContent = value;
    });
  });
}

function refreshPlanetDepositValues() {
  infoPanel.querySelectorAll('[data-deposit-resource]').forEach(el => {
    const key = el.dataset.depositResource;
    const amount = Number(bodies[state.selected]?.resources?.[key] || 0);
    const strong = el.querySelector('strong');
    if (!strong) return;
    const unit = key === 'crudeOil' || key === 'water' ? 'L' : 't';
    const locked = key === 'nickelOre' && !state.research?.completed?.nickelMining;
    const nextText = locked ? 'Global gesperrt – Forschung „Grabung nach Nickelerz“ erforderlich' : `${amount.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit}`;
    // Nur aktualisieren, wenn sich die sichtbare Zahl wirklich geändert hat.
    if (strong.textContent !== nextText) strong.textContent = nextText;
  });
}

function resourceRows(body) {
  const entries = Object.entries(body.resources);
  if (!entries.length) return '<p class="hint">Keine abbaubaren Rohstoffe.</p>';
  return entries.map(([key, amount]) => {
    const locked = key === 'nickelOre' && !state.research?.completed?.nickelMining;
    return `<div class="stat" data-deposit-resource="${key}"><span>${resourceIcons[key] || ''} ${resourceNames[key] || key}${locked ? ' 🔒' : ''}</span><strong>${locked ? 'Global gesperrt – Forschung „Grabung nach Nickelerz“ erforderlich' : (key === 'crudeOil' || key === 'water') ? amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L' : amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' t'}</strong></div>`;
  }).join('');
}

function buildingCost(key, planetId = state.selected) {
  const b = buildingTypes[key];
  const count = Number(getBuildingsOnPlanet(planetId)[key] || 0);
  // Erde: Die ersten zwei Eisenminen sind kostenlos; ab der dritten gilt der hinterlegte Stahlpreis.
  if (key === 'ironMine' && planetId === 'earth') return count < 2 ? 0 : Number(b?.cost || 0);
  return Number(b?.cost || 0);
}

// Gebäudekarten dieser Rohstoffgebäude greifen auf dieselbe Kostenquelle wie der Bauvorgang zu.
// Neue/angepasste Preise müssen dadurch nicht noch einmal in einer Karten-Texttabelle gepflegt werden.
const BUILDING_CARD_COST_KEYS = new Set([
  'stoneQuarry', 'coalMine', 'gasPlant', 'ironMine', 'nickelMine', 'graphiteMine', 'bauxiteMine',
  'siliconMine', 'lithiumMine', 'copperMine', 'crudeOilPump', 'uraniumMine'
]);

function buildingCardCostText(key, planetId = state.selected) {
  const steelCost = Math.max(0, Number(buildingCost(key, planetId)) || 0);
  const costs = {};
  if (steelCost > 0) costs.steel = steelCost;
  // Zusatzkosten werden direkt aus dieser Kostenfunktion in der Gebäudekarte angezeigt.
  if (key === 'uraniumMine') costs.buildingMaterials = 200;
  if (key === 'crudeOilPump') costs.buildingMaterials = 40;
  if (key === 'graphiteMine') { costs.buildingMaterials = 1100; costs.glass = 100; }
  if (key === 'habitat') costs.buildingMaterials = 250;

  if (!Object.keys(costs).length) {
    if (key === 'ironMine' && planetId === 'earth') return 'Baukosten: kostenlos (erste zwei Eisenminen auf der Erde)';
    return 'Baukosten: kostenlos';
  }

  const labels = { steel: 'Stahl', buildingMaterials: 'Baustoffe', glass: 'Glas' };
  const list = Object.entries(costs)
    .filter(([, amount]) => Number(amount) > 0)
    .map(([resource, amount]) => `${Number(amount).toLocaleString('de-DE')} t ${labels[resource] || resource}`)
    .join(', ');
  return `Baukosten: ${list}${key === 'ironMine' ? '' : ' pro Gebäude'}${key === 'habitat' ? ' · Laufender Unterhalt: 88 GD pro Ingame-Stunde' : ''}`;
}

function planetTemperatureCelsius(planetId) {
  if (planetId === 'mercury') return mercuryTemperature();
  if (planetId === 'venus') return venusTemperature();
  const raw = String(bodies[planetId]?.temperature || '');
  const match = raw.match(/-?\d+(?:[.,]\d+)?/);
  const baseTemperature = match ? Number(match[0].replace(',', '.')) : Infinity;
  return Number.isFinite(baseTemperature) ? Math.max(-273, baseTemperature - orbitalSolarSailCount(planetId) * 10 + orbitalWarmingSailCount(planetId) * 10) : baseTemperature;
}

function isBuildingAllowed(key, planetId = state.selected) {
  if (key === 'batteryStorage') return state.viewMode === 'surface' && planetId !== 'sun' && !!bodies[planetId];
  if (key === 'gasCarbonStorage') return planetId !== 'sun' && !!bodies[planetId] && ['surface','orbit'].includes(state.viewMode);
  // Orbit-Bauten werden unabhängig von Temperatur und Atmosphärendruck geprüft.
  // Die 50-°C- und 1-bar-Grenzen gelten ausschließlich für die Oberfläche.
  // Der orbitale CO₂-Extraktor braucht nur Orbit-Ansicht, einen Planeten (nicht die Sonne)
  // und die passende Forschung – niemals Oberflächenbedingungen.
  if (key === 'orbitalCo2Extractor') {
    return state.viewMode === 'orbit' &&
      planetId !== 'sun' &&
      !!state.research?.completed?.orbitalCo2Extractor;
  }

  // Gebäude mit Produktionsketten werden auf Oberflächen gebaut, niemals direkt im Orbit.
  // Kakao-Plantage und Schokoladenfabrik sind zusätzlich auf feste Oberflächen begrenzt.
  if (key === 'nickelMine') return state.viewMode === 'surface' && planetId !== 'sun' && !!state.research?.completed?.nickelMining && Number(bodies[planetId]?.resources?.nickelOre || 0) > 0;
  if (key === 'graphiteMine') return state.viewMode === 'surface' && ['earth','luna','mars','io'].includes(planetId) && Number(bodies[planetId]?.resources?.graphite || 0) > 0;
  if (key === 'syntheticGraphitePlant' && (state.viewMode !== 'surface' || planetId === 'sun' || !hasPlanetSurface(planetId))) return false;
  if (key === 'companyHeadquarters') return planetId === 'earth' && state.viewMode === 'surface' && taskIsComplete('company_start_name') && Number(getBuildingsOnPlanet('earth').companyHeadquarters || 0) < 1;
  if (key === 'atmosphereRegulator') return state.viewMode === 'surface' && planetId !== 'sun' && !!bodies[planetId];
  if (key === 'liquidStorage') return planetId !== 'sun';
  if (key === 'refinery') return state.viewMode === 'surface' && planetId !== 'sun' && hasPlanetSurface(planetId) && planetTemperatureCelsius(planetId) < 50;
  if (key === 'orbitLandingPad') return state.viewMode === 'orbit' && planetId !== 'sun';
  if (key === 'woodcutter' && (state.viewMode === 'orbit' || planetId === 'sun')) return false;
  if (key === 'radioactiveStorageSurface' && (state.viewMode !== 'surface' || planetId === 'sun')) return false;
  if (key === 'radioactiveStorageOrbit' && (state.viewMode !== 'orbit' || planetId === 'sun')) return false;
  if (key === 'chipFactory' && state.viewMode === 'orbit') return false;
  if (key === 'forester' && (state.viewMode === 'orbit' || planetId === 'sun' || planetTemperatureCelsius(planetId) >= 50)) return false;
  if (['cocoaPlantation','chocolateFactory'].includes(key) && (!['mercury','venus','earth','luna','mars','ceres'].includes(planetId) || state.viewMode === 'orbit')) return false;
  if (key === 'vehicleFactory') return planetId !== 'sun' && state.viewMode !== 'orbit' && !!state.research?.completed?.vehicleFactory;
  if (key === 'luxuryFurnitureFactory') return planetId !== 'sun' && state.viewMode !== 'orbit' && !!state.research?.completed?.luxuryFurnitureFactory && !!ensureResearchOrders().completed.kolonistenversorgung;
  if (key === 'ioniumMine' && (planetId !== 'io' || state.viewMode !== 'surface' || Number(getBuildingsOnPlanet(planetId).radioactiveStorageSurface || 0) < 1)) return false;
  if (key === 'observatory' && (planetId !== 'earth' || state.viewMode !== 'surface')) return false;
  if (housingBuildingKeys.includes(key)) {
    // Wohngebäude dürfen auf allen geeigneten Planetenoberflächen gebaut werden.
    // Die Atmosphärenregel entscheidet separat, ob Kolonisten darin wohnen dürfen.
    if (planetId === 'sun' || !hasPlanetSurface(planetId)) return false;
    if (key === 'habitat' && planetId === 'earth') return false;
    // Nicht hier freigeben: danach müssen weiterhin die Temperatur- und
    // sonstigen Oberflächenregeln des jeweiligen Planeten greifen.
  }
  // Temperaturgrenze gilt ausschließlich für die Planetenoberfläche, niemals für den Orbit.
  if (state.viewMode === 'surface' && planetId === 'mercury' && mercuryTemperature() > 50 && key !== 'solarSail' && key !== 'iceMine' && key !== 'co2ProcessingPlant' && key !== 'iceProcessingPlant' && key !== 'algaeFoodProcessor' && key !== 'radioactiveStorageSurface' && key !== 'cocoaPlantation' && key !== 'chocolateFactory' && key !== 'woodcutter' && !['titanMine','titanProcessing','titanRefinery'].includes(key)) return false;
  if (state.viewMode === 'surface' && planetId === 'venus' && venusTemperature() > 50 && key !== 'solarSail' && key !== 'iceMine' && key !== 'co2Extraction' && key !== 'co2ProcessingPlant' && key !== 'iceProcessingPlant' && key !== 'algaeFoodProcessor' && key !== 'radioactiveStorageSurface' && key !== 'cocoaPlantation' && key !== 'chocolateFactory' && key !== 'woodcutter' && !['titanMine','titanProcessing','titanRefinery'].includes(key)) return false;
  // Auf der Venusoberfläche ist der Bau erst unter 1,0 bar möglich.
  // CO₂-Extraktion bleibt als Weg zum Senken des Drucks erlaubt; im Orbit gilt die Sperre nicht.
  if (state.viewMode === 'surface' && planetId === 'venus' && venusAtmosphericPressure() >= 1 && !['solarSail','co2Extraction','radioactiveStorageSurface'].includes(key)) return false;
  // Sonnensegel dürfen in jedem Planetenorbit gebaut werden; an der Oberfläche weiterhin nur auf Merkur und Venus.
  if (key === 'solarSail' && (state.viewMode === 'orbit' ? planetId === 'sun' : !['mercury','venus'].includes(planetId))) return false;
  if (key === 'warmingSail' && (state.viewMode !== 'orbit' || planetId === 'sun')) return false;
  if (key === 'co2Extraction' && planetId !== 'venus') return false;
  if (key === 'iceMine' && (state.viewMode === 'orbit' || Number(bodies[planetId]?.resources?.ice || 0) <= 0)) return false;
  if (key === 'iceProcessingPlant' && (planetId === 'sun' || !state.research?.completed?.iceProcessingPlant)) return false;
  if (key === 'algaeFarm' && (planetId === 'sun' || !state.research?.completed?.algaeFarm)) return false;
  if (key === 'algaeFoodProcessor' && (planetId === 'sun' || !state.research?.completed?.algaeFoodProcessor)) return false;
  if (key === 'researchSatellite') {
    if (state.viewMode !== 'orbit') return false;
    if (Number(getBuildingsOnPlanet(planetId).researchSatellite || 0) >= 1) return false;
    if (!state.research?.completed?.researchSatellite) return false;
  }
  if (key === 'bauxiteMine' && !['earth','luna','mars'].includes(planetId)) return false;
  if (['aluminiumOxideRefinery','aluminiumSmelter'].includes(key) && planetId === 'sun') return false;
  // CO₂-Verarbeitung kann auf allen Planeten außer der Sonne gebaut werden.
  if (key === 'co2ProcessingPlant' && planetId === 'sun') return false;
  if (key === 'co2ProcessingPlant' && !state.research?.completed?.co2ProcessingPlant) return false;
  if (key === 'polymerFactory' && !state.research?.completed?.polymerFactory) return false;
  // Die Gummifabrik ist ohne Forschung auf allen Planeten außer der Sonne baubar. Der Rohölimport erfolgt über Raketen.
  if ((key === 'solarSatellite' || key === 'solarProbe') && planetId !== 'earth') return false;
  // Die Mondbasis darf auf allen Planeten außer Sonne und Erde gebaut werden.
  if (key === 'moonBase' && ['sun', 'earth'].includes(planetId)) return false;
  if (planetId === 'sun') return false;
  if (key === 'landingPad') return state.viewMode !== 'orbit' && planetId !== 'sun';
  if (key !== 'nuclearReactor' && key !== 'radioactiveStorageSurface' && key !== 'radioactiveStorageOrbit' && key !== 'orbitalCo2Extractor' && key !== 'researchSatellite' && key !== 'iceMine' && key !== 'iceProcessingPlant' && key !== 'algaeFoodProcessor' && key !== 'refinery' && key !== 'radioactiveStorageSurface' && key !== 'radioactiveStorageOrbit' && planetId !== 'earth' && key !== 'outpost' && key !== 'solarSail' && key !== 'warmingSail' && Number(getBuildingsOnPlanet(planetId).outpost || 0) < 1) return false;
  if (key === 'heliumExtractor' && !['luna','venus','jupiter'].includes(planetId)) return false;
   if (key === 'crudeOilPump' && planetId !== 'earth') return false;
  if (key === 'hydroelectricPlant' && planetId !== 'earth') return false;
  if (key === 'greenhouse' && !state.research?.completed?.greenhouse) return false;
  if (key === 'foodFactory' && !state.research?.completed?.foodFactory) return false;
  if ((key === 'uraniumMine' || key === 'uraniumProcessingPlant') && !['earth','luna','mars','mercury'].includes(planetId)) return false;
  if (key === 'uraniumProcessingPlant' && Number(bodies[planetId]?.resources?.uranium || 0) <= 0 && Number(getPlanetStorage(planetId).uranium || 0) <= 0) return false;
  return true;
}

function buildButton(key) {
  // Ein fehlerhafter Gebäudedatensatz darf nicht den gesamten Bau-Dialog blockieren.
  try {
    return buildButtonUnsafe(key);
  } catch (error) {
    console.error(`Fehler beim Erzeugen der Gebäudekarte "${key}":`, error);
    return `<div class="build-card build-card-error"><div><strong>⚠️ ${String(key)}</strong><small>Diese Gebäudekarte konnte nicht geladen werden. Die übrige Gebäudeübersicht bleibt verfügbar.</small></div></div>`;
  }
}

function buildButtonUnsafe(key) {
  if (key === 'gasCarbonStorage') {
    const b = buildingTypes[key];
    const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
    const buildings = getBuildingsOnPlanet(state.selected);
    const count = gasCarbonStorageCount(state.selected, mode);
    const storage = mode === 'orbit' ? getOrbitStorage(state.selected) : getPlanetStorage(state.selected);
    const costs = { steel: 200, buildingMaterials: 200 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const capacity = count * 100000;
    return `<div class="build-card gas-carbon-storage-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small><small>Standort: ${mode === 'orbit' ? 'Orbit' : 'Planetenoberfläche'} · Aktuelle Kapazität je Rohstoff: ${capacity.toLocaleString('de-DE')} t</small><small>Baukosten: 200 t Stahl · 200 t Baustoffe</small></div><button class="build-resource" data-building="gasCarbonStorage" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }
  if (key === 'batteryStorage') {
    const b = buildingTypes[key];
    const count = Number(getBuildingsOnPlanet(state.selected).batteryStorage || 0);
    const storage = getPlanetStorage(state.selected);
    const costs = { steel: 250, buildingMaterials: 300, batteries: 120, electronics: 80, graphite: 50 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const costText = `${costs.steel} t Stahl · ${costs.buildingMaterials} t Baustoffe · ${costs.batteries} t Batterien · ${costs.electronics} t Elektronik · ${costs.graphite} t Graphit`;
    return `<div class="build-card battery-storage-card"><div><strong>${b.icon} ${b.name}</strong><small>100 MWh je Speicher · 10 MW Ladeleistung · 10 MW Entladeleistung · 30 % Mindestreserve · keine Forschung · unbegrenzt baubar</small><small>Baukosten: ${costText}</small><small>Vorhanden: ${count} · Gesamtkapazität: ${count * 100} MWh · Lade-/Entladeleistung: ${count * 10} MW</small></div><button class="build-resource" data-building="batteryStorage" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }
  const b = buildingTypes[key];
  const count = key === 'solarSail' && state.viewMode === 'orbit' ? orbitalSolarSailCount(state.selected) : getBuildingsOnPlanet(state.selected)[key];
  const storage = (['gasCarbonStorage','solarSail','warmingSail','orbitalCo2Extractor','radioactiveStorageOrbit'].includes(key) && state.viewMode === 'orbit') ? getOrbitStorage(state.selected) : getPlanetStorage(state.selected);

  if (key === 'syntheticGraphitePlant') {
    const costs = { steel: 1400, buildingMaterials: 1600, glass: 200, graphite: 159 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="syntheticGraphitePlant" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'graphiteMine') {
    const costs = { steel: 800, buildingMaterials: 1100, glass: 100 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card graphite-mine-card"><div><strong>${b.icon} ${b.name}</strong></div><button class="build-resource" data-building="graphiteMine" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  // Flüssiglager ist ein Sondergebäude ohne regulären buildingTypes-Datensatz.
  // Eigenständige Karte in der Kategorie „Flüssiglager“ auf Oberfläche und Orbit.
  if (key === 'liquidStorage') {
    const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
    const tankKey = liquidTankLocationKey(state.selected, mode);
    const capacity = liquidTankCapacity(state.selected, mode);
    const fuel = liquidFuelAmount(state.selected, mode);
    const queued = Number(liquidTankBuildQueue[tankKey] || 0) > 0;
    const remaining = queued ? Math.max(0, 30 - (gameNow() - Number(liquidTankBuildStarted[tankKey] || gameNow())) / 1000) : 0;
    const affordable = Number(storage.buildingMaterials || 0) >= 500 && Number(storage.steel || 0) >= 500;
    const allowed = isBuildingAllowed(key, state.selected);
    const pct = capacity > 0 ? Math.min(100, fuel / capacity * 100) : 0;
    return `<div class="build-card liquid-tank-card"><div><strong>🛢️ Flüssiglager</strong><small>10.000 L Kapazität je Tank · Kosten: 500 t Baustoffe und 500 t Stahl · Bauzeit: 30 Sekunden · keine Forschung · ${mode === 'orbit' ? 'Orbit' : 'Planetenoberfläche'}</small><div class="liquid-tank-summary"><span>${fuel.toLocaleString('de-DE', { maximumFractionDigits: 2 })} / ${capacity.toLocaleString('de-DE')} L</span><strong>${pct.toFixed(1)} %</strong></div><div class="liquid-tank-progress"><i style="width:${pct}%"></i></div>${queued ? `<small>Tank im Bau · noch ${remaining.toFixed(1)} Sekunden</small>` : ''}${!capacity && !queued ? '<small>Noch kein Tank an diesem Standort gebaut.</small>' : ''}</div><button class="build-resource" data-building="liquidStorage" ${queued || !affordable || !allowed ? 'disabled' : ''}>${queued ? 'Im Bau' : 'Tank bauen'}</button></div>`;
  }

  if (key === 'syntheticGraphitePlant') {
    const costs = { steel: 1400, buildingMaterials: 1600, glass: 200, graphite: 159 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld.syntheticGraphitePlant = Number(bld.syntheticGraphitePlant || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  }

  if (key === 'graphiteMine') {
    const costs = { steel: 800, buildingMaterials: 1100, glass: 100 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) {
      storage[r] = Math.max(0, Number(storage[r] || 0) - amount);
    }
    bld.graphiteMine = Number(bld.graphiteMine || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  }

  if (key === 'gasCarbonStorage') {
    const costs = { steel: 200, buildingMaterials: 200 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    const countKey = state.viewMode === 'orbit' ? 'gasCarbonStorageOrbit' : 'gasCarbonStorage';
    bld[countKey] = Number(bld[countKey] || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  }

  if (key === 'companyHeadquarters') {
    const costs = { steel: 2000, buildingMaterials: 1000, glass: 250 };
    const affordable = Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const allowed = isBuildingAllowed(key, state.selected);
    const built = Number(count || 0) > 0;
    return `<div class="build-card company-headquarters-build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Nur einmal baubar</small></div><button class="build-resource" data-building="${key}" ${!allowed || !affordable || built ? 'disabled' : ''}>${built ? 'Gebaut' : 'Zentrale bauen'}</button></div>`;
  }

  if (key === 'atmosphereRegulator') {
    const costs = { steel: 200, buildingMaterials: 200 };
    const queue = ensureAtmosphereRegulatorBuildQueue(state.selected);
    const affordable = isBuildingAllowed(key, state.selected) &&
      Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const queuedText = queue.length
      ? `<small class="vehicle-factory-queue">${queue.length} Atmosphären-Regulator(en) im Bau · Bauzeit je Gebäude: 10 Ingame-Sekunden</small>`
      : '';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small>${queuedText}</div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'radioactiveStorageSurface' || key === 'radioactiveStorageOrbit') {
    const costs = { steel: 500, buildingMaterials: 500, glass: 200, electronics: 100 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const cap = Number(count || 0) * 10000;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Aktuelle Kapazität an diesem Standort: ${cap.toLocaleString('de-DE')} t</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (housingBuildingKeys.includes(key)) {
    const costs = housingCosts[key];
    const affordable = isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const costText = Object.entries(costs).map(([r, amount]) => `${amount.toLocaleString('de-DE')} t ${({steel:'Stahl',buildingMaterials:'Baustoffe',glass:'Glas'})[r] || r}`).join(' · ');
    const allowedText = isBuildingAllowed(key) ? '' : (key === 'habitat' ? ' · nur außerhalb von Erde und Sonne' : ' · nur auf der Erde');
    const upkeepText = key === 'habitat' ? ' · Unterhalt: 88 GD/Ingame-Stunde' : '';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: ${costText}${upkeepText}${allowedText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'woodcutter') {
    const costs = { steel: 380, glass: 200, buildingMaterials: 900 };
    const affordable = isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>🪵 Sägewerk</strong><small>Verbraucht 1 MW Strom und 0,01 t Bäume/s · produziert 0,009 t Biomasse/s und 0,009 t Bretter/s · ohne Forschung · auf allen Planetenoberflächen baubar · Baukosten: 380 t Stahl · 200 t Glas · 900 t Baustoffe</small></div><button class="build-resource" data-building="woodcutter" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'forester') {
    const costs = { steel: 290, polymers: 100, chips: 150, glass: 100 };
    const researched = !!state.research?.completed?.forester;
    const contractDone = !!ensureResearchOrders().completed.regenerativeChange;
    const queue = ensureForesterBuildQueue(state.selected);
    const affordable = researched && contractDone && isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = !contractDone ? ' · Voraussetzung: Forschungsvertrag „Regenerative Veränderung"' : !researched ? ' · Voraussetzung: Forschung Förster (16.000 FP)' : !isBuildingAllowed(key, state.selected) ? ' · Nur auf Planeten unter 50 °C und auf der Oberfläche baubar' : '';
    const queueText = queue.length ? `<small class="vehicle-factory-queue">${queue.length} Förster im Bau · Bauzeit je Gebäude: 2 Ingame-Minuten</small>` : '';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status} · Baukosten: 290 t Stahl · 100 t Polymere · 150 t Chips · 100 t Glas</small>${queueText}</div><button class="build-resource" data-building="forester" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'observatory') {
    const costs = { steel: 1000, buildingMaterials: 800, electronics: 250, glass: 200 };
    const affordable = Number(count || 0) < 1 && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>${Number(count || 0) ? 'Gebaut' : 'Bauen'}</button></div>`;
  }

  if (key === 'cocoaPlantation') {
    const costs = { steel: 500, buildingMaterials: 300 };
    const researched = !!ensureResearchOrders().completed.kolonistenversorgung && !!state.research?.completed?.cocoaPlantation;
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Kakao-Plantage“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'chocolateFactory') {
    const costs = { steel: 500, buildingMaterials: 300 };
    const researched = !!ensureResearchOrders().completed.kolonistenversorgung && !!state.research?.completed?.chocolateFactory;
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Schokoladenfabrik“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'polymerFactory') {
    const researched = !!state.research?.completed?.polymerFactory;
    const affordable = researched && Number(storage.steel || 0) >= 500 && Number(storage.buildingMaterials || 0) >= 500 && Number(storage.electronics || 0) >= 200 && isBuildingAllowed(key);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Polymerfabrik“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'rubberFactory') {
    const costs = { steel: 500, chips: 50, glass: 100, buildingMaterials: 800 };
    const affordable = isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 500 t Stahl · 50 t Chips · 100 t Glas · 800 t Baustoffe</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'plasticFactory') {
    const costs = { steel: 400, chips: 40, glass: 80, buildingMaterials: 600 };
    const affordable = isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 400 t Stahl · 40 t Chips · 80 t Glas · 600 t Baustoffe</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'luxuryFurnitureFactory') {
    const costs = { steel: 1200, buildingMaterials: 800, glass: 250, chips: 100, electronics: 150 };
    const researched = !!ensureResearchOrders().completed.kolonistenversorgung && !!state.research?.completed?.luxuryFurnitureFactory;
    const affordable = researched && isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Vertrag „Kolonistenversorgung“ und Forschung (6.000 FP, 12 Ingame-Stunden)';
    return `<div class="build-card"><div><strong>🛋️ Luxusmöbelfabrik</strong><small>${b.text}${status} · Baukosten: 1.200 t Stahl, 800 t Baustoffe, 250 t Glas, 100 t Chips, 150 t Elektronik</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'vehicleFactory') {
    const costs = { steel: 500, buildingMaterials: 250, electronics: 100, chips: 200 };
    const queue = ensureVehicleFactoryQueue(state.selected);
    const researched = !!state.research?.completed?.vehicleFactory;
    const affordable = researched && isBuildingAllowed(key, state.selected) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const queueText = queue.length ? `<small class="vehicle-factory-queue">${queue.length} Fahrzeugfabrik(en) im Bau · Bauzeit je Fabrik: 120 Sekunden</small>` : '';
    const status = researched ? '' : ' · Voraussetzung: Forschung Fahrzeugfabrik (1.500 FP, 5 Minuten)';
    return `<div class="build-card vehicle-factory-card"><div><strong>${b.icon} ${b.name}</strong><small>Produziert Fahrzeuge · benötigt 4 MW Strom · Bauzeit: 120 Sekunden${status}</small>${queueText}</div><button class="build-resource" data-building="vehicleFactory" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'solarSatellite' || key === 'solarProbe') {
    const researched = !!state.research?.completed?.[key];
    const affordable = researched && isBuildingAllowed(key) && (key === 'solarSatellite'
      ? Number(storage.steel || 0) >= 20000 && Number(storage.buildingMaterials || 0) >= 20000 && Number(storage.glass || 0) >= 10000 && Number(storage.electronics || 0) >= 5000 && Number(storage.batteries || 0) >= 5000
      : Number(storage.steel || 0) >= 15000 && Number(storage.electronics || 0) >= 5000 && Number(storage.batteries || 0) >= 2000);
    const status = researched ? '' : ` · Voraussetzung: Forschung „${b.name}“`;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'crudeOilPump') {
    const cost = buildingCost(key, state.selected);
    const affordable = isBuildingAllowed(key, state.selected) && Number(storage.steel || 0) >= cost && Number(storage.buildingMaterials || 0) >= 40;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${buildingCardCostText(key, state.selected).replace(/^Baukosten:\s*/i, '')}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (['titanMine','titanProcessing','titanRefinery'].includes(key)) {
    const costs = key === 'titanMine' ? {steel:150,machines:50,electronics:30} : key === 'titanProcessing' ? {steel:250,machines:100,electronics:50} : {steel:400,machines:150,electronics:100};
    const affordable = Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount) && isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'uraniumMine') {
    const costs = { steel: buildingCost(key, state.selected), buildingMaterials: 200 };
    const affordable = Object.entries(costs).every(([resource, amount]) => Number(storage[resource] || 0) >= amount) && isBuildingAllowed(key, state.selected);
    const allowedText = isBuildingAllowed(key) ? '' : ' · nur Erde/Luna/Mars/Merkur';
    const costText = Object.entries(costs).filter(([, amount]) => Number(amount) > 0).map(([resource, amount]) => `${Number(amount).toLocaleString('de-DE')} t ${{steel:'Stahl',buildingMaterials:'Baustoffe'}[resource]}`).join(', ');
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: ${costText}${allowedText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }
  if (key === 'ioniumMine') {
    const hasSafeStorage = Number(getBuildingsOnPlanet(state.selected).radioactiveStorageSurface || 0) > 0;
    const affordable = Number(storage.steel || 0) >= 300 && Number(storage.buildingMaterials || 0) >= 200 && isBuildingAllowed(key) && hasSafeStorage;
    const status = !hasSafeStorage ? ' · zuerst ein Radioaktivstofflager auf Io bauen' : (!isBuildingAllowed(key) ? ' · nur auf Io und nur an der Oberfläche' : '');
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }
  if (key === 'uraniumProcessingPlant') {
    const affordable = Number(storage.steel || 0) >= 500 && Number(storage.buildingMaterials || 0) >= 300 && isBuildingAllowed(key);
    const allowedText = isBuildingAllowed(key) ? '' : ' · nur auf Planeten mit Uranvorkommen';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${allowedText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }
  if (key === 'nuclearFuelPlant') {
    const affordable = Number(storage.steel || 0) >= 1000 && Number(storage.buildingMaterials || 0) >= 600 && Number(storage.electronics || 0) >= 100 && isBuildingAllowed(key);
    const allowedText = isBuildingAllowed(key) ? '' : ' · benötigt Uranaufbereitungsanlage oder aufbereitetes Uran';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${allowedText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'nuclearReactor') {
    const researched = !!state.research?.completed?.nuclearReactor;
    const affordable = Number(storage.steel || 0) >= 5000 &&
      Number(storage.buildingMaterials || 0) >= 7000 &&
      Number(storage.electronics || 0) >= 2000 &&
      isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Kernreaktor“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'electronicsFactory') {
    const affordable = Number(storage.steel || 0) >= 500 &&
      Number(storage.buildingMaterials || 0) >= 300 && isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'chipFactory') {
    const costs = { buildingMaterials: 2000, electronics: 600 };
    const allowed = isBuildingAllowed(key, state.selected);
    const affordable = allowed && Object.entries(costs).every(([resource, amount]) => Number(storage[resource] || 0) >= amount);
    const missing = Object.entries(costs)
      .filter(([resource, amount]) => Number(storage[resource] || 0) < amount)
      .map(([resource, amount]) => `${Math.max(0, amount - Number(storage[resource] || 0)).toLocaleString('de-DE')} t ${({ buildingMaterials: 'Baustoffe', electronics: 'Elektronik' })[resource]}`)
      .join(', ');
    const status = !allowed
      ? (state.viewMode === 'orbit' ? ' · Bau nur auf der Planetenoberfläche möglich' : ' · Auf diesem Planeten derzeit nicht baubar')
      : (missing ? ` · Es fehlen: ${missing}` : '');
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'solarSail') {
    const count = state.viewMode === 'orbit' ? orbitalSolarSailCount(state.selected) : Number(getBuildingsOnPlanet(state.selected).solarSail || 0);
    const temperature = planetTemperatureCelsius(state.selected);
    const affordable = Number(storage.steel || 0) >= 5000 &&
      Number(storage.buildingMaterials || 0) >= 10000 &&
      Number(storage.glass || 0) >= 5000 &&
      Number(storage.chips || 0) >= 2000 &&
      Number(storage.electronics || 0) >= 1000 &&
      isBuildingAllowed(key);
    const projected = Math.max(-273, temperature - 10);
    const locationText = state.viewMode === 'orbit' ? ` · ${bodies[state.selected].name}-Orbit: ${temperature.toFixed(0)} °C → ${projected.toFixed(0)} °C` : ` · Oberfläche: ${temperature.toFixed(0)} °C`;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${locationText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'warmingSail') {
    const count = orbitalWarmingSailCount(state.selected);
    const temperature = planetTemperatureCelsius(state.selected);
    const costs = { steel: 5000, buildingMaterials: 10000, glass: 5000, chips: 2000, electronics: 1000 };
    const affordable = state.viewMode === 'orbit' && state.selected !== 'sun' && Object.entries(costs).every(([resource, amount]) => Number(storage[resource] || 0) >= amount) && isBuildingAllowed(key);
    const projected = temperature + 10;
    const locationText = state.viewMode === 'orbit' ? ` · ${bodies[state.selected].name}-Orbit: ${temperature.toFixed(0)} °C → ${projected.toFixed(0)} °C` : ' · nur im Orbit baubar';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${locationText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'iceMine') {
    const costs = { steel: 100, buildingMaterials: 50 };
    const affordable = isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 100 t Stahl, 50 t Baustoffe</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'iceProcessingPlant') {
    const researched = !!state.research?.completed?.iceProcessingPlant;
    const costs = { steel: 100, buildingMaterials: 50, electronics: 20 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Eisverarbeitungsanlage“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 100 t Stahl, 50 t Baustoffe, 20 t Elektronik${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'algaeFarm') {
    const researched = !!state.research?.completed?.algaeFarm;
    const costs = { steel: 300, buildingMaterials: 150, electronics: 50 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Algenfarm“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 300 t Stahl, 150 t Baustoffe, 50 t Elektronik${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'algaeFoodProcessor') {
    const researched = !!state.research?.completed?.algaeFoodProcessor;
    const costs = { steel: 800, buildingMaterials: 500, electronics: 150, chips: 50 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Algenverarbeitungsanlage“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 800 t Stahl, 500 t Baustoffe, 150 t Elektronik, 50 t Chips${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'foodFactory') {
    const researched = !!state.research?.completed?.foodFactory;
    const costs = { steel: 1900, aluminium: 400, chips: 140, glass: 80, buildingMaterials: 1300 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Lebensmittelfabrik“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 1.900 t Stahl, 400 t Aluminium, 140 t Chips, 80 t Glas, 1.300 t Baustoffe${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'hydroelectricPlant' || key === 'greenhouse') {
    const researched = !!state.research?.completed?.[key];
    const costs = key === 'hydroelectricPlant' ? { steel: 700, machines: 100, electronics: 50 } : { steel: 500, polymers: 20, buildingMaterials: 300 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ` · Voraussetzung: Forschung „${b.name}“`;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'orbitalCo2Extractor') {
    const researched = !!state.research?.completed?.orbitalCo2Extractor;
    const storage = getOrbitStorage(state.selected);
    const costs = { aluminium: 50, polymers: 40, chips: 20, steel: 190 };
    const allowed = isBuildingAllowed(key, state.selected);
    const missing = Object.entries(costs)
      .filter(([resource, amount]) => Number(storage[resource] || 0) < amount)
      .map(([resource, amount]) => `${Math.max(0, amount - Number(storage[resource] || 0)).toLocaleString('de-DE')} t ${resourceNames[resource] || resource}`);
    const affordable = researched && allowed && missing.length === 0;
    const status = !researched
      ? ' · Voraussetzung: Forschung „Orbitaler CO₂-Extraktor“'
      : state.viewMode !== 'orbit'
        ? ' · Nur in der Orbit-Ansicht baubar'
        : state.selected === 'sun'
          ? ' · Im Sonnenorbit nicht baubar'
          : missing.length
            ? ` · Fehlende Materialien im Orbit-Lager: ${missing.join(', ')}`
            : ' · Forschung abgeschlossen und Materialien vorhanden';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Kosten aus dem Orbit-Lager: 50 t Aluminium, 40 t Polymere, 20 t Chips, 190 t Stahl${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
  }

  if (key === 'researchSatellite') {
    const researched = !!state.research?.completed?.researchSatellite;
    const costs = { steel: 800, electronics: 120, chips: 80, glass: 100 };
    const orbitHasSatellite = Number(getBuildingsOnPlanet(state.selected).researchSatellite || 0) >= 1;
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = !researched ? ' · Voraussetzung: Forschung „Forschungssatellit“' : orbitHasSatellite ? ' · Dieser Orbit hat bereits einen Forschungssatelliten' : state.viewMode !== 'orbit' ? ' · Nur in der Orbit-Ansicht baubar' : '';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0}/1)</button></div>`;
  }

  if (key === 'solarPlant') {
    const researched = !!state.research?.completed?.solarPlant;
    const affordable = Number(storage.steel || 0) >= 30 &&
      Number(storage.buildingMaterials || 0) >= 10 &&
      Number(storage.electronics || 0) >= 20 &&
      isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Solaranlage“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>20 MW Strom/s · 30 t Stahl · 10 t Baustoffe · 20 t Elektronik${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'solarSatellite') {
    if (!state.research?.completed?.solarSatellite) return;
    if (Number(storage.steel || 0) < 20000 || Number(storage.buildingMaterials || 0) < 20000 || Number(storage.glass || 0) < 10000 || Number(storage.electronics || 0) < 5000 || Number(storage.batteries || 0) < 5000) return;
    storage.steel -= 20000; storage.buildingMaterials -= 20000; storage.glass -= 10000; storage.electronics -= 5000; storage.batteries -= 5000;
  } else if (key === 'solarProbe') {
    if (!state.research?.completed?.solarProbe) return;
    if (Number(storage.steel || 0) < 15000 || Number(storage.electronics || 0) < 5000 || Number(storage.batteries || 0) < 2000) return;
    storage.steel -= 15000; storage.electronics -= 5000; storage.batteries -= 2000;
  } else if (key === 'moonBase') {
    const researched = !!state.research?.completed?.moonBase;
    const affordable = Number(storage.steel || 0) >= 300 && Number(storage.buildingMaterials || 0) >= 100 && isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Mondbasis“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'refinery') {
    const costs = { steel: 200, buildingMaterials: 200 };
    const allowed = isBuildingAllowed(key, state.selected);
    const affordable = allowed && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = allowed ? '' : (state.viewMode !== 'surface' ? ' · nur auf der Oberfläche baubar' : ` · nur auf Planeten unter 50 °C (aktuell ${planetTemperatureCelsius(state.selected).toFixed(0)} °C)`);
    const tankCapacity = liquidTankCapacity(state.selected, 'surface');
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Baukosten: 200 t Stahl, 200 t Baustoffe · Flüssiglagerkapazität: ${tankCapacity.toLocaleString('de-DE')} L${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${Number(count || 0)})</button></div>`;
  }

  if (key === 'fusionReactor') {
    const researched = !!state.research?.completed?.fusionReactor;
    const affordable = Number(storage.steel || 0) >= b.cost && isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Fusionsreaktor“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${b.cost} t Stahl${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  const cost = buildingCost(key, state.selected);
  const affordable = Number(storage.steel || 0) >= cost && isBuildingAllowed(key, state.selected);
  const costText = BUILDING_CARD_COST_KEYS.has(key)
    ? buildingCardCostText(key, state.selected).replace(/^Baukosten:\s*/i, '')
    : (cost === 0 ? 'kostenlos' : `${cost} t Stahl`);
  const extraText = key === 'ironMine' && state.selected !== 'earth' ? ' · nicht kostenlos' : '';
  const unavailableText = key === 'heliumExtractor' && !isBuildingAllowed(key) ? ' · nur Luna/Venus/Jupiter' : '';
  const co2Status = key === 'co2ProcessingPlant' && !isBuildingAllowed(key) ? ' · nur auf Venus' : '';
  return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${costText}${extraText}${unavailableText}${co2Status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
}

function setPlanetView(mode) {
  if (state.selected === 'sun' || !hasPlanetSurface(state.selected)) return;
  state.viewMode = mode === 'orbit' ? 'orbit' : 'surface';
  renderInfo();
}

function bindPlanetViewControls() {
  infoPanel.querySelectorAll('[data-planet-view]').forEach(btn => {
    btn.addEventListener('click', () => setPlanetView(btn.dataset.planetView));
  });
}

function renderPlanetViewSwitch() {
  if (!hasPlanetSurface(state.selected)) return `<div class="planet-view-switch"><button type="button" class="view-switch-btn active" disabled>🛰️ Nur Orbit – keine Oberfläche</button></div>`;
  return `<div class="planet-view-switch" role="group" aria-label="Ansicht wechseln">
    <button type="button" class="view-switch-btn ${state.viewMode === 'surface' ? 'active' : ''}" data-planet-view="surface">🌍 Oberfläche</button>
    <button type="button" class="view-switch-btn ${state.viewMode === 'orbit' ? 'active' : ''}" data-planet-view="orbit">🛰️ Orbit</button>
  </div>`;
}

function renderOrbitInfo(body) {
  const orbitalRockets = rockets.filter(r => r.status !== 'returned' && (r.to === state.selected || r.from === state.selected));
  const orbitalLanded = orbitalRockets.filter(r => r.status === 'orbit');
  const landed = orbitalRockets.filter(r => r.status === 'landed');
  const rocketList = orbitalRockets.length
    ? orbitalRockets.map(r => {
        const phase = r.status === 'orbit' ? '🛰️ Im Orbit' : r.status === 'landed' ? '🛬 Oberfläche' : r.status === 'returning' ? '↩️ Rückflug' : '🚀 Anflug';
        return `<div class="stat"><span>🚀 ${r.name}</span><strong>${phase}</strong></div>`;
      }).join('')
    : '<p class="hint">Keine Raketen in diesem Orbit.</p>';
  return `<h2>🛰️ ${body.name} – Orbit</h2>
    <p class="hint">Orbitalansicht · Raumverkehr und zukünftige Orbitalstationen</p>
    <div class="stat"><span>🌡️ Planetentemperatur</span><strong>${planetTemperatureCelsius(state.selected).toFixed(0)} °C</strong></div>
    <div class="stat"><span>☀️ Sonnensegel in diesem Orbit</span><strong>${orbitalSolarSailCount(state.selected)}</strong></div>
    <div class="stat"><span>❄️ Kühlung durch Sonnensegel</span><strong>-${orbitalSolarSailCount(state.selected) * 10} °C</strong></div>
    <div class="stat"><span>🌞 Planetare Wärmesegel</span><strong>${orbitalWarmingSailCount(state.selected)}</strong></div>
    <div class="stat"><span>🔥 Erwärmung durch Wärmesegel</span><strong>+${orbitalWarmingSailCount(state.selected) * 10} °C</strong></div>
    ${body.atmosphere?.pressure ? `<div class="stat"><span>Atmosphärendruck</span><strong>${body.atmosphere.pressure} bar</strong></div>` : ''}
    ${renderPlanetViewSwitch()}
    ${renderElectricityPanel(state.selected)}
    <details class="planet-storage-details"><summary>📦 Lager im Orbit · ${body.name}</summary><div class="planet-storage-content">${formatStorage(state.selected)}</div></details>
    <h3>🛰️ Orbitalstatus</h3>
    <div class="stat"><span>Raketen im Orbit</span><strong>${orbitalLanded.length}</strong></div>
    <div class="stat"><span>Raketen auf Oberfläche</span><strong>${landed.length}</strong></div>
    <div class="stat"><span>Gesamt im Raumverkehr</span><strong>${orbitalRockets.length}</strong></div>
    <div class="stat"><span>🛰️ Forschungssatellit</span><strong>${Number(getBuildingsOnPlanet(state.selected).researchSatellite || 0)}/1 · +${Number(getBuildingsOnPlanet(state.selected).researchSatellite || 0)} FP/s</strong></div>
    <hr>${renderAtmospherePanel(state.selected)}<h3>🚀 Raumverkehr</h3>${rocketList}
    <hr>`;
}

function captureDetailsOpenState(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll('details')).map((details, index) => ({
    index,
    signature: `${details.className || ''}|${(details.querySelector('summary')?.textContent || '').trim().replace(/\s+/g, ' ')}`,
    open: details.open
  }));
}
function restoreDetailsOpenState(container, snapshot) {
  if (!container || !Array.isArray(snapshot)) return;
  const detailsList = Array.from(container.querySelectorAll('details'));
  const used = new Set();
  snapshot.forEach(saved => {
    let target = detailsList.find((details, index) => !used.has(index) &&
      `${details.className || ''}|${(details.querySelector('summary')?.textContent || '').trim().replace(/\s+/g, ' ')}` === saved.signature);
    if (!target && detailsList[saved.index] && !used.has(saved.index)) target = detailsList[saved.index];
    if (target) {
      const index = detailsList.indexOf(target);
      used.add(index);
      target.open = saved.open;
    }
  });
}

const PLANET_RESOURCE_DETAILS_KEY = 'solarFrontierPlanetResourceDetails_v2';
function getPlanetResourceDetailsState() {
  try {
    const value = JSON.parse(localStorage.getItem(PLANET_RESOURCE_DETAILS_KEY) || '{}');
    return value && typeof value === 'object' ? value : {};
  } catch { return {}; }
}
function bindPlanetResourceDetails() {
  const saved = getPlanetResourceDetailsState();
  const planetId = state.selected;
  const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  const sections = [
    { selector: '.planet-resources-details', id: 'planet-resources', legacy: true },
    { selector: '.radioactive-storage-section', id: 'radioactive-storage' },
    { selector: '.luxury-storage-section', id: 'luxury-storage' }
  ];
  sections.forEach(({ selector, id, legacy }) => {
    document.querySelectorAll(selector).forEach(details => {
      const key = `${planetId}:${mode}:${id}`;
      // Die Rohstoffliste war bereits separat gespeichert; vorhandene Einstellungen bleiben erhalten.
      const initial = Object.prototype.hasOwnProperty.call(saved, key)
        ? saved[key] === true
        : (legacy && Object.prototype.hasOwnProperty.call(saved, planetId) ? saved[planetId] === true : false);
      details.open = initial;
      details.addEventListener('toggle', () => {
        const current = getPlanetResourceDetailsState();
        current[key] = details.open;
        try { localStorage.setItem(PLANET_RESOURCE_DETAILS_KEY, JSON.stringify(current)); } catch {}
      });
    });
  });
}

function renderInfo() {
  const openDetails = captureDetailsOpenState(infoPanel);
  // Werte und Fokus von Eingabefeldern bei Live-Updates (z. B. Raketenlieferungen)
  // erhalten. Ohne Fokus-Wiederherstellung verliert das ersetzte Eingabefeld
  // auf Mobilgeräten den Tastaturfokus und die Eingabe springt weg.
  const active = document.activeElement;
  const activeId = active && infoPanel.contains(active) ? active.id : '';
  const activeValue = activeId ? active.value : undefined;
  let selectionStart = null, selectionEnd = null, selectionDirection = 'none';
  if (activeId && typeof active.selectionStart === 'number') {
    selectionStart = active.selectionStart;
    selectionEnd = active.selectionEnd;
    selectionDirection = active.selectionDirection || 'none';
  }
  const atmosphereGas = infoPanel.querySelector('#planet-atmosphere-gas')?.value;
  const atmosphereAmount = infoPanel.querySelector('#planet-atmosphere-amount')?.value;
  renderInfoInternal();
  restoreDetailsOpenState(infoPanel, openDetails);
  const nextGas = infoPanel.querySelector('#planet-atmosphere-gas');
  const nextAmount = infoPanel.querySelector('#planet-atmosphere-amount');
  if (nextGas && atmosphereGas && [...nextGas.options].some(option => option.value === atmosphereGas)) {
    nextGas.value = atmosphereGas;
  }
  if (nextAmount && atmosphereAmount !== undefined) nextAmount.value = atmosphereAmount;
  if (activeId) {
    const nextActive = document.getElementById(activeId);
    if (nextActive && infoPanel.contains(nextActive)) {
      if (activeValue !== undefined) nextActive.value = activeValue;
      nextActive.focus({ preventScroll: true });
      if (selectionStart !== null && typeof nextActive.setSelectionRange === 'function') {
        try { nextActive.setSelectionRange(selectionStart, selectionEnd, selectionDirection); } catch {}
      }
    }
  }
}
function renderInfoInternal() {
  if (activeSolarSystemId === 'system2') return;
  const body = bodies[state.selected];
  if (!hasPlanetSurface(state.selected)) state.viewMode = 'orbit';
  if (state.selected === 'sun') {
    infoPanel.innerHTML = `<h2>☀️ Sonne</h2><p class="hint">${body.type}</p><div class="stat"><span>Temperatur</span><strong>${body.temperature}</strong></div><h3>🛰️ Sonnenorbit</h3><div class="stat"><span>Solar-Satelliten</span><strong>${Number(body.buildings?.solarSatellite || 0)}</strong></div><div class="stat"><span>Solarstrom</span><strong>${solarSatelliteElectricityProduction().toLocaleString('de-DE')} MW/s</strong></div><h3>🌐 Rohstoffe</h3><p class="hint">Keine abbaubaren Rohstoffe.</p>`;
    applyLanguage();
    return;
  }
  const bld = getBuildingsOnPlanet(state.selected);
  const localStorage = getPlanetStorage(state.selected);
  if (state.viewMode === 'orbit') {
    infoPanel.innerHTML = renderOrbitInfo(body);
    bindPlanetViewControls();
    bindPlanetResourceDetails();
    const atmosphereReleaseButton = document.querySelector('#planet-atmosphere-release');
    if (atmosphereReleaseButton) atmosphereReleaseButton.addEventListener('click', releasePlanetAtmosphereGas);
    applyLanguage();
    if (!document.querySelector("#flight-center-panel")?.hidden) renderFlightCenter();
    return;
  }
  const currentColonists = colonistsOnPlanet(state.selected);
  const currentHousingCapacity = housingCapacity(state.selected);
  const currentHousingFree = Math.max(0, currentHousingCapacity - currentColonists);
  infoPanel.innerHTML = `<h2>${state.selected === 'earth' ? '🌍' : '🪐'} ${body.name}</h2><p class="hint">${body.type}</p>${renderPlanetViewSwitch()}${renderElectricityPanel(state.selected)}<div class="stat"><span>Temperatur</span><strong>${planetTemperatureCelsius(state.selected).toFixed(0) + ' °C'}</strong></div><div class="stat colonists-planet-count"><span>👥 Kolonisten auf ${body.name}</span><strong data-planet-colonists="${state.selected}">${currentColonists.toLocaleString('de-DE')}</strong></div><div class="stat housing-planet-count"><span>🏠 Wohnraum</span><strong data-planet-housing="${state.selected}">${currentColonists.toLocaleString('de-DE')} / ${currentHousingCapacity.toLocaleString('de-DE')} · ${currentHousingFree.toLocaleString('de-DE')} frei</strong></div>${renderAtmospherePanel(state.selected)}<details class="planet-resources-details" data-planet-resources="${state.selected}"><summary><span>🌐 Rohstoffe auf dem Planeten</span></summary><div class="planet-resources-content">${resourceRows(body)}</div></details><details class="planet-storage-details"><summary>📦 Lager auf ${body.name}</summary><div class="planet-storage-content">${formatStorage(state.selected)}</div></details><hr><details class="planet-economy-details"><summary><span>🏭 Gebäude auf ${body.name}</span><strong>${totalBuildingsOnPlanet(state.selected)} Gebäude</strong></summary><div class="planet-economy-content"><div class="stat"><span>Gebäude gesamt</span><strong>${totalBuildingsOnPlanet(state.selected)}</strong></div><div class="stat"><span>Eisenproduktion</span><strong>${formatTons(ironProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumproduktion</span><strong>${formatTons(siliconProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumverbrauch</span><strong>${formatTons(siliconUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Lithiumproduktion (Mine)</span><strong>${formatTons(lithiumProduction(state.selected))}/s</strong></div><div class="stat"><span>🟠 Kupfererzproduktion (Mine)</span><strong>${formatTons(copperProduction(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch</span><strong>${formatTons(copperSmeltingUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferproduktion</span><strong>${formatTons(copperSmeltingProduction(state.selected))}/s</strong></div><div class="stat"><span>Lithiumverbrauch</span><strong>${formatTons(lithiumRefineryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch für Batterien</span><strong>${formatTons(lithiumRefineryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Batterieproduktion</span><strong>${formatTons(batteryProduction(state.selected))}/s</strong></div><div class="stat"><span>🧱 Baustoffe im Lager</span><strong>${formatTons(Number(localStorage.buildingMaterials || 0))}</strong></div><div class="stat"><span>🧱 Baustoffproduktion</span><strong>${formatTons(buildingMaterialsProduction(state.selected))}/s</strong></div><div class="stat"><span>🪨 Baustoffverbrauch Stein</span><strong>${formatTons(buildingMaterialsStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactorySteelUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>Maschinenproduktion</span><strong>${formatTons(machineProduction(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Silizium</span><strong>${formatTons(glassFactorySiliconUse(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Stein</span><strong>${formatTons(glassFactoryStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Glasproduktion</span><strong>${formatTons(glassProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranproduktion</span><strong>${formatTons(uraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranverbrauch Aufbereitung</span><strong>${formatTons(processedUraniumUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>🧪 Aufbereitetes Uran</span><strong>${formatTons(processedUraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffverbrauch</span><strong>${formatTons(nuclearFuelProcessedUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffproduktion</span><strong>${formatTons(nuclearFuelProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Verbrauch</span><strong>${formatTons(nuclearReactorNuclearFuelUse(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Strom</span><strong>${nuclearReactorElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>💾 Chipfabrik Lithiumverbrauch</span><strong>${formatTons(chipFactoryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipfabrik Kupferverbrauch</span><strong>${formatTons(chipFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipproduktion</span><strong>${formatTons(chipProduction(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikproduktion</span><strong>${formatTons(electronicsProduction(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Kupferverbrauch</span><strong>${formatTons(electronicsFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Chipverbrauch</span><strong>${formatTons(electronicsFactoryChipUse(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Lithiumverbrauch</span><strong>${formatTons(electronicsFactoryLithiumUse(state.selected))}/s</strong></div>${state.selected !== 'sun' ? `<div class="stat"><span>☀️ Sonnensegel im Orbit</span><strong>${orbitalSolarSailCount(state.selected)}</strong></div><div class="stat"><span>🌡️ Orbit-Kühlung</span><strong>-${orbitalSolarSailCount(state.selected) * 10} °C</strong></div><div class="stat"><span>🌞 Planetare Wärmesegel</span><strong>${orbitalWarmingSailCount(state.selected)}</strong></div><div class="stat"><span>🔥 Orbit-Erwärmung</span><strong>+${orbitalWarmingSailCount(state.selected) * 10} °C</strong></div>${['mercury','venus'].includes(state.selected) ? `<div class="stat"><span>☀️ Sonnensegel an der Oberfläche</span><strong>${getBuildingsOnPlanet(state.selected).solarSail}</strong></div><div class="stat"><span>🌡️ Gesamte Kühlung</span><strong>-${(getBuildingsOnPlanet(state.selected).solarSail + orbitalSolarSailCount(state.selected)) * 10} °C</strong></div><div class="stat"><span>🔥 Netto-Temperaturänderung</span><strong>${(orbitalWarmingSailCount(state.selected) - getBuildingsOnPlanet(state.selected).solarSail - orbitalSolarSailCount(state.selected)) * 10} °C</strong></div><div class="stat"><span>🔒 Gebäude-Freigabe</span><strong>${(state.selected === 'mercury' ? mercuryTemperature() : venusTemperature()) <= 50 ? 'freigegeben' : 'nur Sonnensegel'}</strong></div>` : ''}` : ''}<div class="stat"><span>Helium-3-Produktion</span><strong>${formatTons(helium3Production(state.selected))}/s</strong></div><div class="stat"><span>Helium-3-Verbrauch Fusionsreaktor</span><strong>${formatTons(fusionHelium3Use(state.selected))}/s</strong></div><div class="stat"><span>Fusionsstrom</span><strong>${fusionElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Solarstrom</span><strong>${solarElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div>${state.selected === 'earth' ? `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse('earth'))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction('earth'))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction('earth').toFixed(2)} MW/s</strong></div><h3>☀️ Sonnenorbit-Programm</h3><div class="stat"><span>🛰️ Solar-Satelliten auf Erde</span><strong>${getBuildingsOnPlanet('earth').solarSatellite || 0}</strong></div><div class="stat"><span>🚀 Sonnensonden</span><strong>${getBuildingsOnPlanet('earth').solarProbe || 0}</strong></div><div class="stat"><span>🛰️ Im Sonnenorbit</span><strong>${bodies.sun.buildings?.solarSatellite || 0}</strong></div>${solarProbeFlights.length ? `<div class="stat"><span>🚀 Sonnensonden im Flug</span><strong>${solarProbeFlights.length}</strong></div>` : ''}<button id="launch-solar-satellite" ${getBuildingsOnPlanet('earth').solarSatellite > 0 && getBuildingsOnPlanet('earth').solarProbe > 0 && state.research?.completed?.solarSatellite && state.research?.completed?.solarProbe ? '' : 'disabled'}>🚀 Solar-Satellit zur Sonne starten</button>` : `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction(state.selected))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Rohölproduktion</span><strong>${crudeOilProduction(state.selected).toFixed(2)} L/s</strong></div><div class="stat"><span>Rohölverbrauch</span><strong>${(polymerOilUse(state.selected) + rubberOilUse(state.selected)).toFixed(3)} L/s</strong></div><div class="stat"><span>Polymerproduktion</span><strong>${formatTons(polymerProduction(state.selected))}/s</strong></div><div class="stat"><span>Gummiproduktion</span><strong>${formatTons(rubberProduction(state.selected))}/s</strong></div><div class="stat"><span>Rohölpumpen-Stromverbrauch</span><strong>${crudeOilElectricityUse(state.selected).toFixed(2)} MW/s</strong></div>`}</div></details><hr>`;
  bindPlanetViewControls();
  bindPlanetResourceDetails();
  const atmosphereReleaseButton = document.querySelector('#planet-atmosphere-release');
  if (atmosphereReleaseButton) atmosphereReleaseButton.addEventListener('click', releasePlanetAtmosphereGas);
  const launchButton = document.querySelector('#launch-solar-satellite');
  if (launchButton) launchButton.addEventListener('click', launchSolarSatellite);
  applyLanguage();
  if (!document.querySelector("#flight-center-panel")?.hidden) renderFlightCenter();
}

function launchSolarSatellite() {
  const earth = getBuildingsOnPlanet('earth');
  if (!state.research?.completed?.solarSatellite || !state.research?.completed?.solarProbe) return;
  if (Number(earth.solarSatellite || 0) < 1 || Number(earth.solarProbe || 0) < 1) return;
  earth.solarSatellite--;
  earth.solarProbe--;
  solarProbeFlights.push({ started: gameNow(), duration: 60 });
  playUiSound('build');
  renderInfo(); renderTopResources(); saveAfterBuild();
}

function updateSolarProbeFlights() {
  const now = gameNow();
  let changed = false;
  for (let i = solarProbeFlights.length - 1; i >= 0; i--) {
    const f = solarProbeFlights[i];
    if (now - Number(f.started || now) >= Number(f.duration || 60) * 1000) {
      bodies.sun.buildings ||= {};
      bodies.sun.buildings.solarSatellite = Number(bodies.sun.buildings.solarSatellite || 0) + 1;
      solarProbeFlights.splice(i, 1);
      changed = true;
    }
  }
  if (changed) { playUiSound('build'); renderInfo(); renderTopResources(); saveGame(false); }
}

function saveAfterBuild() {
  saveGame(false);
}

function demolitionCostMap(key, planetId, currentCount) {
  const costs = {
    gasCarbonStorage: { steel: 200, buildingMaterials: 200 },
    companyHeadquarters: { steel: 2000, buildingMaterials: 1000, glass: 250 },
    residentialHouse: { steel: 1900, buildingMaterials: 900 },
    mediumResidentialHouse: { steel: 180, buildingMaterials: 250, glass: 40 },
    residentialComplex: { steel: 600, buildingMaterials: 800, glass: 150 },
    habitat: { steel: 200, buildingMaterials: 250 },
    orbitalCo2Extractor: { aluminium: 50, polymers: 40, chips: 20, steel: 190 },
    iceMine: { steel: 100, buildingMaterials: 50 },
    iceProcessingPlant: { steel: 100, buildingMaterials: 50, electronics: 20 },
    algaeFarm: { steel: 300, buildingMaterials: 150, electronics: 50 },
    algaeFoodProcessor: { steel: 800, buildingMaterials: 500, electronics: 150, chips: 50 },
    researchSatellite: { steel: 800, electronics: 120, chips: 80, glass: 100 },
    polymerFactory: { steel: 500, buildingMaterials: 500, electronics: 200 },
    refinery: { steel: 200, buildingMaterials: 200 },
    rubberFactory: { steel: 500, chips: 50, glass: 100, buildingMaterials: 800 },
    plasticFactory: { steel: 400, chips: 40, glass: 80, buildingMaterials: 600 },
    vehicleFactory: { steel: 500, buildingMaterials: 250, electronics: 100, chips: 200 },
    luxuryFurnitureFactory: { steel: 1200, buildingMaterials: 800, glass: 250, chips: 100, electronics: 150 },
    moonBase: { steel: 300, buildingMaterials: 100 },
    uraniumMine: { steel: Number(buildingTypes.uraniumMine?.cost || 0), buildingMaterials: 200 },
    ioniumMine: { steel: 300, buildingMaterials: 200 },
    radioactiveStorageSurface: { steel: 500, buildingMaterials: 500, glass: 200, electronics: 100 },
    radioactiveStorageOrbit: { steel: 500, buildingMaterials: 500, glass: 200, electronics: 100 },
    uraniumProcessingPlant: { steel: 500, buildingMaterials: 300 },
    nuclearFuelPlant: { steel: 1000, buildingMaterials: 600, electronics: 100 },
    electronicsFactory: { steel: 500, buildingMaterials: 300 },
    chipFactory: { buildingMaterials: 2000, electronics: 600 },
    solarSail: { steel: 5000, buildingMaterials: 10000, glass: 5000, chips: 2000, electronics: 1000 },
    warmingSail: { steel: 5000, buildingMaterials: 10000, glass: 5000, chips: 2000, electronics: 1000 },
    nuclearReactor: { steel: 5000, buildingMaterials: 7000, electronics: 2000 },
    solarPlant: { steel: 30, buildingMaterials: 10, electronics: 20 },
    hydroelectricPlant: { steel: 700, machines: 100, electronics: 50 },
    greenhouse: { steel: 500, polymers: 20, buildingMaterials: 300 },
    foodFactory: { steel: 1900, aluminium: 400, chips: 140, glass: 80, buildingMaterials: 1300 },
    coalPowerPlant: { steel: 90 },
    rocketFactory: { steel: 1000, buildingMaterials: 2000 },
    landingPad: { steel: 2000, buildingMaterials: 3000, machines: 500, batteries: 300 },
    outpost: { steel: 100 },
    researchLab: {},
    observatory: { steel: 1000, buildingMaterials: 800, electronics: 250, glass: 200 },
    solarSatellite: { steel: 20000, buildingMaterials: 20000, glass: 10000, electronics: 5000, batteries: 5000 },
    solarProbe: { steel: 15000, electronics: 5000, batteries: 2000 },
    steelworks: { steel: planetId === 'earth' ? (currentCount <= 1 ? 0 : currentCount <= 3 ? 4 : 20) : (currentCount > 1 ? 20 : 0) },
    ironMine: { steel: planetId === 'earth' ? (currentCount <= 2 ? 0 : Number(buildingTypes.ironMine?.cost || 0)) : Number(buildingTypes.ironMine?.cost || 0) },
    graphiteMine: { steel: 800, buildingMaterials: 1100, glass: 100 },
    syntheticGraphitePlant: { steel: 1400, buildingMaterials: 1600, glass: 200, graphite: 159 },
    stoneQuarry: { steel: Number(buildingTypes.stoneQuarry?.cost || 0) },
    coalMine: { steel: Number(buildingTypes.coalMine?.cost || 0) },
    gasPlant: { steel: Number(buildingTypes.gasPlant?.cost || 0) },
    co2Extraction: { steel: 25 }, co2ProcessingPlant: { steel: 50 },
    siliconMine: { steel: Number(buildingTypes.siliconMine?.cost || 0) },
    lithiumMine: { steel: Number(buildingTypes.lithiumMine?.cost || 0) },
    copperMine: { steel: Number(buildingTypes.copperMine?.cost || 0) },
    crudeOilPump: { steel: Number(buildingTypes.crudeOilPump?.cost || 0), buildingMaterials: 40 },
    copperSmelter: { steel: 50 }, lithiumRefinery: { steel: 80 }, machineFactory: { steel: 100 },
    glassFactory: { steel: 60 }, heliumExtractor: { steel: 120 }, fusionReactor: { steel: 250 },
    bauxiteMine: { steel: Number(buildingTypes.bauxiteMine?.cost || 0) }, aluminiumOxideRefinery: { steel: 100 },
    aluminiumSmelter: { steel: 200 }, titanMine: { steel: 150, machines: 50, electronics: 30 },
    titanProcessing: { steel: 250, machines: 100, electronics: 50 }, titanRefinery: { steel: 400, machines: 150, electronics: 100 }
  };
  return costs[key] || (buildingTypes[key]?.cost ? { steel: Number(buildingTypes[key].cost) } : {});
}

function demolitionRefundFor(key, planetId, amount) {
  const buildings = getBuildingsOnPlanet(planetId);
  const perBuildingCosts = demolitionCostMap(key, planetId, Number(buildings[key] || 0));
  const refunds = {};
  for (const [resource, cost] of Object.entries(perBuildingCosts)) {
    // Gesamtkosten der gewählten Menge berechnen, danach einmal 50 % und abrunden.
    const refund = Math.floor((Number(cost) * amount) / 2);
    if (refund > 0) refunds[resource] = refund;
  }
  return refunds;
}

function demolishBuilding(key = null, planetId = state.selected) {
  if (!bodies[planetId] || planetId === 'sun') return;
  const modalId = 'demolition-dialog';
  document.getElementById(modalId)?.remove();
  const overlay = document.createElement('div');
  overlay.id = modalId;
  overlay.className = 'demolition-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'demolition-title');

  const buildings = getBuildingsOnPlanet(planetId);
  const available = [...new Set([...Object.keys(buildingTypes), ...Object.keys(buildings)])]
    .filter(k => Number(buildings[k] || 0) > 0 && k !== 'liquidStorage')
    .sort((a,b) => (buildingTypes[a]?.name || (a === 'steelworks' ? 'Stahlwerk' : a)).localeCompare(buildingTypes[b]?.name || (b === 'steelworks' ? 'Stahlwerk' : b), 'de'));
  if (!available.length) { alert('Auf diesem Planeten gibt es keine Gebäude zum Abriss.'); return; }
  if (key && !available.includes(key)) key = available[0];

  overlay.innerHTML = `
    <section class="demolition-dialog">
      <div class="demolition-head">
        <div><h2 id="demolition-title">🏗️ Gebäudeabriss</h2><p>Planet: ${bodies[planetId].name}</p></div>
        <button type="button" class="icon-button" data-demolition-close aria-label="Schließen">✕</button>
      </div>
      <label for="demolition-building">Gebäude auswählen</label>
      <select id="demolition-building" class="demolition-select">${available.map(k => `<option value="${k}" ${k===key?'selected':''}>${buildingTypes[k]?.icon || '🏭'} ${buildingTypes[k]?.name || (k === 'steelworks' ? 'Stahlwerk' : k)} (${Number(buildings[k] || 0)})</option>`).join('')}</select>
      <div class="demolition-count-row"><label for="demolition-quantity">Anzahl zum Abriss</label><input id="demolition-quantity" type="number" min="1" step="1" value="1" inputmode="numeric"></div>
      <input id="demolition-slider" type="range" min="1" max="1" value="1" step="1" aria-label="Abrissmenge">
      <div class="demolition-count-row"><span>Vorhanden: <strong id="demolition-owned">0</strong></span><span>Danach: <strong id="demolition-remaining">0</strong></span></div>
      <div class="demolition-refund"><strong>Voraussichtliche Rückerstattung (50 %)</strong><div id="demolition-refund-list"></div><small>Materialien werden ins Lager dieses Planeten gelegt. Mengen werden je Material abgerundet.</small></div>
      <div id="demolition-colonist-choice" class="demolition-colonist-choice" hidden><label for="demolition-colonist-action">Bewohner der Wohngebäude</label><select id="demolition-colonist-action" class="demolition-select"><option value="relocate">Umsiedeln in übrigen Wohnraum</option><option value="remove">Kolonisten entfernen</option></select><small id="demolition-colonist-note"></small></div>
      <p id="demolition-warning" class="demolition-warning" hidden></p>
      <div class="demolition-actions"><button type="button" data-demolition-close class="secondary-action">Abbrechen</button><button type="button" id="demolition-confirm" class="danger">Abriss bestätigen</button></div>
    </section>`;
  document.body.appendChild(overlay);

  const select = overlay.querySelector('#demolition-building');
  const quantity = overlay.querySelector('#demolition-quantity');
  const slider = overlay.querySelector('#demolition-slider');
  const ownedLabel = overlay.querySelector('#demolition-owned');
  const remainingLabel = overlay.querySelector('#demolition-remaining');
  const refundList = overlay.querySelector('#demolition-refund-list');
  const warning = overlay.querySelector('#demolition-warning');
  const colonistChoice = overlay.querySelector('#demolition-colonist-choice');
  const colonistAction = overlay.querySelector('#demolition-colonist-action');
  const colonistNote = overlay.querySelector('#demolition-colonist-note');
  const confirmButton = overlay.querySelector('#demolition-confirm');

  const refresh = (fromSlider = false) => {
    const selectedKey = select.value;
    const owned = Number(getBuildingsOnPlanet(planetId)[selectedKey] || 0);
    slider.max = String(Math.max(1, owned));
    quantity.max = String(Math.max(1, owned));
    let amount = Number(fromSlider ? slider.value : quantity.value);
    if (!Number.isFinite(amount)) amount = 1;
    amount = Math.max(1, Math.min(owned, Math.floor(amount)));
    quantity.value = String(amount);
    slider.value = String(amount);
    ownedLabel.textContent = String(owned);
    remainingLabel.textContent = String(owned - amount);
    const refunds = demolitionRefundFor(selectedKey, planetId, amount);
    const resourceLabels = {steel:'Stahl',buildingMaterials:'Baustoffe',electronics:'Elektronik',chips:'Chips',glass:'Glas',machines:'Maschinen',batteries:'Batterien',polymers:'Polymere',aluminium:'Aluminium'};
    const rows = Object.entries(refunds).filter(([,v]) => v > 0).map(([r,v]) => `<div><span>${resourceLabels[r] || resourceNames[r] || r}</span><strong>${v.toLocaleString('de-DE')} t</strong></div>`);
    refundList.innerHTML = rows.length ? rows.join('') : '<span>Keine Materialrückerstattung für dieses Gebäude hinterlegt.</span>';
    const isHousing = housingBuildingKeys.includes(selectedKey);
    colonistChoice.hidden = !isHousing;
    if (isHousing) {
      const pop = colonistsOnPlanet(planetId);
      const capacityAfter = Math.max(0, housingCapacity(planetId) - amount * housingCapacities[selectedKey]);
      const residentsInRemoved = housingResidentsInDemolishedBuildings(planetId, selectedKey, amount);
      const relocateOption = colonistAction.querySelector('option[value="relocate"]');
      relocateOption.disabled = capacityAfter < pop;
      if (relocateOption.disabled && colonistAction.value === 'relocate') colonistAction.value = 'remove';
      const effectiveRemoval = Math.max(residentsInRemoved, Math.max(0, pop - capacityAfter));
      colonistNote.textContent = `Im ausgewählten Gebäudeteil wohnen derzeit ${residentsInRemoved} Kolonisten. ${capacityAfter < pop ? `Bei „Kolonisten entfernen“ werden mindestens ${effectiveRemoval} Kolonisten entfernt; eine vollständige Umsiedlung ist nicht möglich.` : `Verbleibender Wohnraum: ${capacityAfter} Plätze.`}`;
    }
    warning.hidden = true;
    confirmButton.disabled = owned < 1 || amount < 1;
  };
  select.addEventListener('change', () => { quantity.value = '1'; slider.value = '1'; refresh(); });
  quantity.addEventListener('input', () => refresh(false));
  slider.addEventListener('input', () => refresh(true));
  colonistAction.addEventListener('change', () => refresh());
  overlay.querySelectorAll('[data-demolition-close]').forEach(btn => btn.addEventListener('click', () => overlay.remove()));
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  overlay.querySelector('#demolition-confirm').addEventListener('click', () => {
    const selectedKey = select.value;
    const current = getBuildingsOnPlanet(planetId);
    const owned = Number(current[selectedKey] || 0);
    const amount = Math.floor(Number(quantity.value));
    if (!Number.isFinite(amount) || amount < 1 || amount > owned) {
      warning.textContent = 'Bitte eine gültige Abrissmenge auswählen.';
      warning.hidden = false;
      return;
    }
    const name = buildingTypes[selectedKey]?.name || selectedKey;
    const refunds = demolitionRefundFor(selectedKey, planetId, amount);
    const refundText = Object.entries(refunds).map(([r,v]) => `${v} ${resourceNames[r] || r}`).join(', ') || 'keine Materialien';
    const isHousing = housingBuildingKeys.includes(selectedKey);
    const colonistActionValue = isHousing ? colonistAction.value : null;
    const affectedResidents = isHousing ? housingResidentsInDemolishedBuildings(planetId, selectedKey, amount) : 0;
    const capacityAfter = isHousing ? Math.max(0, housingCapacity(planetId) - amount * housingCapacities[selectedKey]) : 0;
    if (isHousing && colonistActionValue === 'relocate' && capacityAfter < colonistsOnPlanet(planetId)) {
      warning.textContent = 'Nicht genügend freie Wohnplätze für die Umsiedlung. Wähle „Kolonisten entfernen“ oder brich den Abriss ab.';
      warning.hidden = false;
      return;
    }
    const effectiveRemoval = isHousing ? Math.max(affectedResidents, Math.max(0, colonistsOnPlanet(planetId) - capacityAfter)) : 0;
    const residentDecision = isHousing
      ? `\nKolonisten in den ausgewählten Gebäuden: ${affectedResidents}.\nVoraussichtlich entfernt: ${colonistActionValue === 'remove' ? effectiveRemoval : 0}.\nAktion: ${colonistActionValue === 'relocate' ? 'Umsiedeln' : 'Kolonisten entfernen'}.`
      : '';
    if (!confirm(`${amount} × ${name} auf ${bodies[planetId].name} sofort abreißen?${residentDecision}\nRückerstattung: ${refundText}.\nLaufende Raketenbau-Warteschlangen dieser Fabrik werden abgebrochen.`)) return;
    const storage = getPlanetStorage(planetId);
    if (isHousing) {
      const body = ensureColonistData(planetId);
      if (colonistActionValue === 'remove') body.colonists = Math.max(0, body.colonists - affectedResidents);
      body.colonistHousing[selectedKey] = (body.colonistHousing[selectedKey] || []).slice(0, Math.max(0, owned - amount));
    }
    for (const [resource, value] of Object.entries(refunds)) storage[resource] = Number(storage[resource] || 0) + value;
    current[selectedKey] = Math.max(0, owned - amount);
    if (isHousing) ensureColonistData(planetId);
    if (selectedKey === 'rocketFactory') {
      delete rocketFactoryQueue[planetId]; delete rocketFactoryStarted[planetId];
      delete rocketFactoryBuildQueue[planetId]; delete rocketFactoryBuildStarted[planetId];
      delete rocketBuildQueue[planetId]; delete rocketBuildStarted[planetId];
      delete rocketBuildQueue2[planetId]; delete rocketBuildStarted2[planetId];
      delete rocketBuildQueueAtlas1[planetId]; delete rocketBuildStartedAtlas1[planetId];
      delete rocketFactoryQueue[planetId];
    }
    if (selectedKey === 'outpost') { delete outpostBuildQueue[planetId]; delete outpostBuildStarted[planetId]; }
    overlay.remove();
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    if (!document.querySelector('#colonists-panel')?.hidden) renderColonistsPanel();
  });
  refresh();
}

function buildResourceBuilding(key) {
  const planetId = state.selected;
  if (key === 'batteryStorage') {
    const bld = getBuildingsOnPlanet(planetId);
    const storage = getPlanetStorage(planetId);
    const costs = { steel: 250, buildingMaterials: 300, batteries: 120, electronics: 80, graphite: 50 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld.batteryStorage = Number(bld.batteryStorage || 0) + 1;
    ensureBatteryStorageData(planetId);
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  }
  if (key === 'liquidStorage') { startLiquidTankBuild(planetId, state.viewMode === 'orbit' ? 'orbit' : 'surface'); return; }
  const bld = getBuildingsOnPlanet(planetId);
  const storage = (state.viewMode === 'orbit' && ['gasCarbonStorage','orbitalCo2Extractor','radioactiveStorageOrbit'].includes(key)) ? getOrbitStorage(planetId) : getPlanetStorage(planetId);
  if (!isBuildingAllowed(key, planetId)) return;

  if (key === 'companyHeadquarters') {
    const costs = { steel: 2000, buildingMaterials: 1000, glass: 250 };
    if (planetId !== 'earth' || state.viewMode !== 'surface' || !taskIsComplete('company_start_name') || Number(bld.companyHeadquarters || 0) >= 1 || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld.companyHeadquarters = 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    updateCompanyHeadquartersMenu();
    return;
  }

  if (key === 'atmosphereRegulator') {
    const costs = { steel: 200, buildingMaterials: 200 };
    if (!isBuildingAllowed(key, planetId) ||
        !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    ensureAtmosphereRegulatorBuildQueue(planetId).push({
      id: `atmosphere-regulator-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      started: gameNow()
    });
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue(); saveAfterBuild();
    return;
  }

  if (key === 'radioactiveStorageSurface' || key === 'radioactiveStorageOrbit') {
    const costs = { steel: 500, buildingMaterials: 500, glass: 200, electronics: 100 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld[key] = Number(bld[key] || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  }

  if (key === 'woodcutter') {
    const costs = { steel: 380, glass: 200, buildingMaterials: 900 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld.woodcutter = Number(bld.woodcutter || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue(); saveAfterBuild();
    return;
  }

  if (key === 'forester') {
    const costs = { steel: 290, polymers: 100, chips: 150, glass: 100 };
    if (!state.research?.completed?.forester || !ensureResearchOrders().completed.regenerativeChange || !isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    ensureForesterBuildQueue(planetId).push({ id: `forester-${Date.now()}-${Math.floor(Math.random() * 1000000)}`, started: gameNow() });
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue(); saveAfterBuild();
    return;
  }

  if (key === 'observatory') {
    const costs = { steel: 1000, buildingMaterials: 800, electronics: 250, glass: 200 };
    if (Number(bld.observatory || 0) >= 1 || planetId !== 'earth' || state.viewMode !== 'surface' || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld.observatory = Number(bld.observatory || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderResearch(); saveAfterBuild();
    return;
  }

  if (housingBuildingKeys.includes(key)) {
    const costs = housingCosts[key];
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
    bld[key] = Number(bld[key] || 0) + 1;
    ensureColonistData(planetId);
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    if (!document.querySelector('#colonists-panel')?.hidden) renderColonistsPanel();
    return;
  }

  if (key === 'refinery') {
    const costs = { steel: 200, buildingMaterials: 200 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] = Number(storage[r] || 0) - amount;
  } else if (key === 'iceMine') {
    const costs = { steel: 100, buildingMaterials: 50 };

    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.iceMine = Number(bld.iceMine || 0) + 1;
  } else if (key === 'iceProcessingPlant') {
    if (!state.research?.completed?.iceProcessingPlant || planetId === 'sun') return;
    const costs = { steel: 100, buildingMaterials: 50, electronics: 20 };
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.iceProcessingPlant = Number(bld.iceProcessingPlant || 0) + 1;
  } else if (key === 'algaeFarm') {
    if (!state.research?.completed?.algaeFarm || planetId === 'sun') return;
    const costs = { steel: 300, buildingMaterials: 150, electronics: 50 };
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.algaeFarm = Number(bld.algaeFarm || 0) + 1;
  } else if (key === 'algaeFoodProcessor') {
    if (!state.research?.completed?.algaeFoodProcessor || planetId === 'sun') return;
    const costs = { steel: 800, buildingMaterials: 500, electronics: 150, chips: 50 };
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.algaeFoodProcessor = Number(bld.algaeFoodProcessor || 0) + 1;
  } else if (key === 'orbitalCo2Extractor') {
    if (!state.research?.completed?.orbitalCo2Extractor) return;
    const costs = { aluminium: 50, polymers: 40, chips: 20, steel: 190 };
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.orbitalCo2Extractor = Number(bld.orbitalCo2Extractor || 0) + 1;
  } else if (key === 'researchSatellite') {
    const costs = { steel: 800, electronics: 120, chips: 80, glass: 100 };
    if (!state.research?.completed?.researchSatellite || !isBuildingAllowed(key, planetId) || Number(bld.researchSatellite || 0) >= 1 || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'rubberFactory') {
    const costs = { steel: 500, chips: 50, glass: 100, buildingMaterials: 800 };
    if (!isBuildingAllowed(key) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'plasticFactory') {
    const costs = { steel: 400, chips: 40, glass: 80, buildingMaterials: 600 };
    if (!isBuildingAllowed(key) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'polymerFactory') {
    if (!state.research?.completed?.polymerFactory) return;
    if (Number(storage.steel || 0) < 500 || Number(storage.buildingMaterials || 0) < 500 || Number(storage.electronics || 0) < 200) return;
    storage.steel -= 500; storage.buildingMaterials -= 500; storage.electronics -= 200;
  } else if (key === 'moonBase') {
    if (!state.research?.completed?.moonBase) return;
    if (Number(storage.steel || 0) < 300 || Number(storage.buildingMaterials || 0) < 100) return;
    storage.steel -= 300;
    storage.buildingMaterials -= 100;
  } else   if (key === 'fusionReactor') {
    if (!state.research?.completed?.fusionReactor) return;
    const cost = buildingCost(key, planetId);
    if (Number(storage.steel || 0) < cost) return;
    storage.steel -= cost;
  } else if (['titanMine','titanProcessing','titanRefinery'].includes(key)) {
    const costs = key === 'titanMine' ? {steel:150, machines:50, electronics:30} : key === 'titanProcessing' ? {steel:250, machines:100, electronics:50} : {steel:400, machines:150, electronics:100};
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'crudeOilPump') {
    const costs = { steel: buildingCost(key, planetId), buildingMaterials: 40 };
    if (!Object.entries(costs).every(([resource, amount]) => Number(storage[resource] || 0) >= amount)) return;
    for (const [resource, amount] of Object.entries(costs)) storage[resource] = Number(storage[resource] || 0) - amount;
  } else if (key === 'uraniumMine' || key === 'ioniumMine') {
    if (key === 'ioniumMine' && (!isBuildingAllowed(key, planetId) || Number(getBuildingsOnPlanet(planetId).radioactiveStorageSurface || 0) < 1)) return;
    const steelCost = buildingCost(key, planetId);
    const materialCost = 200;
    if (Number(storage.steel || 0) < steelCost || Number(storage.buildingMaterials || 0) < materialCost) return;
    storage.steel -= steelCost;
    storage.buildingMaterials -= materialCost;
  } else if (key === 'uraniumProcessingPlant') {
    if (Number(storage.steel || 0) < 500 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500;
    storage.buildingMaterials -= 300;
  } else if (key === 'nuclearFuelPlant') {
    if (Number(storage.steel || 0) < 1000 || Number(storage.buildingMaterials || 0) < 600 || Number(storage.electronics || 0) < 100) return;
    storage.steel -= 1000;
    storage.buildingMaterials -= 600;
    storage.electronics -= 100;
  } else if (key === 'electronicsFactory') {
    if (Number(storage.steel || 0) < 500 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500;
    storage.buildingMaterials -= 300;
  } else if (key === 'chipFactory') {
    const costs = { buildingMaterials: 2000, electronics: 600 };
    if (!isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([resource, amount]) => Number(storage[resource] || 0) >= amount)) return;
    for (const [resource, amount] of Object.entries(costs)) storage[resource] = Number(storage[resource] || 0) - amount;
  } else if (key === 'warmingSail') {
    if (state.viewMode !== 'orbit' || planetId === 'sun') return;
    const orbitStorage = getOrbitStorage(planetId);
    const costs = { steel: 5000, buildingMaterials: 10000, glass: 5000, chips: 2000, electronics: 1000 };
    if (!Object.entries(costs).every(([resource, amount]) => Number(orbitStorage[resource] || 0) >= amount)) return;
    for (const [resource, amount] of Object.entries(costs)) orbitStorage[resource] = Number(orbitStorage[resource] || 0) - amount;
    const body = bodies[planetId];
    if (!body.orbitBuildings || typeof body.orbitBuildings !== 'object') body.orbitBuildings = {};
    body.orbitBuildings.warmingSail = Number(body.orbitBuildings.warmingSail || 0) + 1;
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
    return;
  } else if (key === 'solarSail') {
    if (state.viewMode === 'orbit') {
      if (planetId === 'sun') return;
      const orbitStorage = getOrbitStorage(planetId);
      if (Number(orbitStorage.steel || 0) < 5000 ||
          Number(orbitStorage.buildingMaterials || 0) < 10000 ||
          Number(orbitStorage.glass || 0) < 5000 ||
          Number(orbitStorage.chips || 0) < 2000 ||
          Number(orbitStorage.electronics || 0) < 1000) return;
      orbitStorage.steel -= 5000;
      orbitStorage.buildingMaterials -= 10000;
      orbitStorage.glass -= 5000;
      orbitStorage.chips -= 2000;
      orbitStorage.electronics -= 1000;
      const body = bodies[planetId];
      if (!body.orbitBuildings || typeof body.orbitBuildings !== 'object') body.orbitBuildings = {};
      body.orbitBuildings.solarSail = Number(body.orbitBuildings.solarSail || 0) + 1;
      playUiSound('build');
      renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
      return;
    }
    if (!['mercury','venus'].includes(planetId)) return;
    if ((planetId === 'mercury' ? mercuryTemperature() : venusTemperature()) <= 50) return;
    if (Number(storage.steel || 0) < 5000 ||
        Number(storage.buildingMaterials || 0) < 10000 ||
        Number(storage.glass || 0) < 5000 ||
        Number(storage.chips || 0) < 2000 ||
        Number(storage.electronics || 0) < 1000) return;
    storage.steel -= 5000;
    storage.buildingMaterials -= 10000;
    storage.glass -= 5000;
    storage.chips -= 2000;
    storage.electronics -= 1000;
  } else if (key === 'nuclearReactor') {
    if (!state.research?.completed?.nuclearReactor) return;
    if (Number(storage.steel || 0) < 5000 || Number(storage.buildingMaterials || 0) < 7000 || Number(storage.electronics || 0) < 2000) return;
    storage.steel -= 5000;
    storage.buildingMaterials -= 7000;
    storage.electronics -= 2000;
  } else if (key === 'hydroelectricPlant') {
    if (!state.research?.completed?.hydroelectricPlant || planetId !== 'earth') return;
    if (Number(storage.steel || 0) < 700 || Number(storage.machines || 0) < 100 || Number(storage.electronics || 0) < 50) return;
    storage.steel -= 700; storage.machines -= 100; storage.electronics -= 50;
  } else if (key === 'greenhouse') {
    if (!state.research?.completed?.greenhouse) return;
    if (Number(storage.steel || 0) < 500 || Number(storage.polymers || 0) < 20 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500; storage.polymers -= 20; storage.buildingMaterials -= 300;
  } else if (key === 'cocoaPlantation') {
    const costs = { steel: 500, buildingMaterials: 300 };
    if (!ensureResearchOrders().completed.kolonistenversorgung || !state.research?.completed?.cocoaPlantation || !isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'luxuryFurnitureFactory') {
    const costs = { steel: 1200, buildingMaterials: 800, glass: 250, chips: 100, electronics: 150 };
    if (!ensureResearchOrders().completed.kolonistenversorgung || !state.research?.completed?.luxuryFurnitureFactory || !isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'chocolateFactory') {
    const costs = { steel: 500, buildingMaterials: 300 };
    if (!ensureResearchOrders().completed.kolonistenversorgung || !state.research?.completed?.chocolateFactory || !isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'foodFactory') {
    const costs = { steel: 1900, aluminium: 400, chips: 140, glass: 80, buildingMaterials: 1300 };
    if (!state.research?.completed?.foodFactory || !isBuildingAllowed(key, planetId) || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
  } else if (key === 'solarPlant') {
    if (!state.research?.completed?.solarPlant) return;
    if (Number(storage.steel || 0) < 30 ||
        Number(storage.buildingMaterials || 0) < 10 ||
        Number(storage.electronics || 0) < 20) return;
    storage.steel -= 30;
    storage.buildingMaterials -= 10;
    storage.electronics -= 20;
  } else {
    const cost = buildingCost(key, planetId);
    if (Number(storage.steel || 0) < cost) return;
    storage.steel -= cost;
  }

  bld[key]++;
  playUiSound('build');
  taskProgressUpdate();
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
}

function buildSteelworks() {
  const planetId = state.selected;
  const bld = getBuildingsOnPlanet(planetId);
  const storage = getPlanetStorage(planetId);
  const count = Number(bld.steelworks || 0);
  const cost = planetId === 'earth'
    ? (count === 0 ? 0 : count < 3 ? 4 : 20)
    : (count === 0 ? 0 : 20);
  if (Number(storage.steel || 0) < cost) return;
  storage.steel -= cost;
  bld.steelworks = count + 1;
  taskProgressUpdate();
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
}

function buildCoalPowerPlant() {
  const storage = getPlanetStorage(state.selected);
  if (Number(storage.steel || 0) < 90) return;
  storage.steel -= 90;
  getBuildingsOnPlanet(state.selected).coalPowerPlant++;
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
}

function buildRocketFactory() {
  const id = state.selected;
  const bld = getBuildingsOnPlanet(id);
  const storage = getPlanetStorage(id);
  if (!isBuildingAllowed('rocketFactory', id) || bld.rocketFactory > 0 || rocketFactoryBuildQueue[id]) return;
  if (Number(storage.steel || 0) < 1000 || Number(storage.buildingMaterials || 0) < 2000) return;
  storage.steel -= 1000;
  storage.buildingMaterials -= 2000;
  rocketFactoryBuildQueue[id] = 1;
  rocketFactoryBuildStarted[id] = gameNow();
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function buildLandingPad() {
  const id = state.selected;
  const bld = getBuildingsOnPlanet(id);
  const storage = getPlanetStorage(id);
  if (state.viewMode === 'orbit' || !isBuildingAllowed('landingPad', id)) return;
  if (Number(storage.steel || 0) < 2000 || Number(storage.buildingMaterials || 0) < 3000 || Number(storage.machines || 0) < 500 || Number(storage.batteries || 0) < 300) return;
  storage.steel -= 2000; storage.buildingMaterials -= 3000; storage.machines -= 500; storage.batteries -= 300;
  bld.landingPad = Number(bld.landingPad || 0) + 1;
  playUiSound('build');
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function buildOrbitLandingPad() {
  const id = state.selected;
  if (!isBuildingAllowed('orbitLandingPad', id)) return;
  const storage = getOrbitStorage(id);
  const costs = { steel: 2000, buildingMaterials: 3000, machines: 500, batteries: 300 };
  if (!Object.entries(costs).every(([r,n]) => Number(storage[r] || 0) >= n)) return rocketLaunchError('Für die Orbit-Start- und Landevorrichtung werden 2.000 t Stahl, 3.000 t Baustoffe, 500 t Maschinen und 300 t Batterien benötigt.');
  Object.entries(costs).forEach(([r,n]) => storage[r] = Number(storage[r] || 0) - n);
  const orbitBuildings = getOrbitBuildings(id);
  orbitBuildings.orbitLandingPad = Number(orbitBuildings.orbitLandingPad || 0) + 1;
  playUiSound('build');
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function rocketFactoryHasCapacity(id) { return Number(getBuildingsOnPlanet(id).rocketFactory || 0) > 0; }
function queueRocket(type, id = state.selected) {
  if (type === 'tankRocket' && state.viewMode === 'orbit') return rocketLaunchError('Tankraketen werden auf der Planetenoberfläche gebaut.');
  ensureRocketData(id);
  if (!rocketFactoryHasCapacity(id)) return;
  const costs = { hercules1:{steel:45}, hercules2:{steel:300,batteries:50,aluminium:50}, atlas1:{steel:340,chips:150,batteries:200,aluminium:100}, titan1:{steel:2000,aluminium:300,chips:250,batteries:200,titanium:120}, colonistShuttle:{steel:500,electronics:200,chips:150,polymers:100}, mobileMiner:{steel:1900,glass:600,chips:1400,electronics:1100,polymers:300}, tankRocket:{steel:120,batteries:30,electronics:20} }[type];
  if (type === 'titan1' && !state.research?.completed?.titan1) return;
  if (type === 'mobileMiner' && !ensureResearchOrders().completed.mobileMinerAsteroids) return;
  const storage=getPlanetStorage(id);
  for(const [r,c] of Object.entries(costs)) if(Number(storage[r]||0)<c) return;
  for(const [r,c] of Object.entries(costs)) storage[r]-=c;
  rocketFactoryQueue[id].push(type);
  if (!rocketFactoryStarted[id]) rocketFactoryStarted[id]=gameNow();
  renderInfo(); renderTopResources(); saveAfterBuild();
}


function buildResearchLab() {
  if (state.selected !== 'earth') return;
  const bld = getBuildingsOnPlanet('earth');
  if (bld.researchLab > 0) return;
  // Kostenmengen sind bewusst noch offen; daher wird das Gebäude zunächst ohne Abzug gebaut.
  bld.researchLab = 1;
  renderSystem(); renderInfo(); renderTopResources();
  renderResearch();
  saveAfterBuild();
}

function buildOutpost() {
  const source = state.selected;
  const bld = getBuildingsOnPlanet(source);
  if (source === 'sun' || bld.outpost > 0 || outpostBuildQueue[source]) return;
  const storage = getPlanetStorage(source);
  if (Number(storage.steel || 0) < 100) return;
  storage.steel -= 100;
  outpostBuildQueue[source] = 1;
  outpostBuildStarted[source] = gameNow();
  renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue();
  saveAfterBuild();
}

function buildHercules1() { queueRocket('hercules1'); }

function buildAtlas1() { if (!state.research?.completed?.atlas1) return; queueRocket('atlas1'); }
function buildTitan1() { if (!state.research?.completed?.titan1) return; queueRocket('titan1'); }
function buildMobileMiner() { if (!ensureResearchOrders().completed.mobileMinerAsteroids) return; queueRocket('mobileMiner'); }

function buildHercules2() { queueRocket('hercules2'); }

function getPlayerResourceAmount(resource, planetId = state.selected) { return Number(getPlanetStorage(planetId)[resource] || 0); }

function ensureRocketData(planetId) {
  if (rocketStock[planetId] === undefined) rocketStock[planetId] = 0;
  if (rocketBuildQueue[planetId] === undefined) rocketBuildQueue[planetId] = 0;
  if (rocketBuildStarted[planetId] === undefined) rocketBuildStarted[planetId] = 0;
  if (rocketStock2[planetId] === undefined) rocketStock2[planetId] = 0;
  if (rocketBuildQueue2[planetId] === undefined) rocketBuildQueue2[planetId] = 0;
  if (rocketBuildStarted2[planetId] === undefined) rocketBuildStarted2[planetId] = 0;
  if (rocketStockAtlas1[planetId] === undefined) rocketStockAtlas1[planetId] = 0;
  if (rocketStockTitan1[planetId] === undefined) rocketStockTitan1[planetId] = 0;
  if (rocketStockColonistShuttle[planetId] === undefined) rocketStockColonistShuttle[planetId] = 0;
  if (rocketStockMobileMiner[planetId] === undefined) rocketStockMobileMiner[planetId] = 0;
  if (rocketStockTankRocket[planetId] === undefined) rocketStockTankRocket[planetId] = 0;
  if (rocketBuildQueueAtlas1[planetId] === undefined) rocketBuildQueueAtlas1[planetId] = 0;
  if (rocketBuildStartedAtlas1[planetId] === undefined) rocketBuildStartedAtlas1[planetId] = 0;
  if (!Array.isArray(rocketFactoryQueue[planetId])) rocketFactoryQueue[planetId] = [];
  if (rocketFactoryStarted[planetId] === undefined) rocketFactoryStarted[planetId] = 0;
  if (rocketFactoryBuildQueue[planetId] === undefined) rocketFactoryBuildQueue[planetId] = 0;
  if (rocketFactoryBuildStarted[planetId] === undefined) rocketFactoryBuildStarted[planetId] = 0;
}

function rocketLaunchError(message) {
  if (typeof showSaveStatus === 'function') showSaveStatus('🚀 ' + message, false);
}

function recordLunaFlight(destination) {
  if (destination !== 'luna') return;
  if (!state.tasks) state.tasks = { completed: {}, ironMined: 0, steelProduced: 0, lunaFlights: 0 };
  state.tasks.lunaFlights = Number(state.tasks.lunaFlights || 0) + 1;
  taskProgressUpdate();
}

function launchHercules1(source, destination, quantity) {
  ensureRocketData(source);
  quantity = Math.max(1, Math.min(Number(quantity) || 1, getRocketStockCount('hercules1',source,state.viewMode==='orbit'?'orbit':'surface')));
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  const sourceMode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  if (getRocketStockCount('hercules1',source,sourceMode)<1) { rocketLaunchError('Keine Herkules-1-Rakete an diesem Startort verfügbar.'); return; }
  if (sourceMode === 'surface' && Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) { rocketLaunchError('Für den Start wird eine Start- & Landerampe am Startplaneten benötigt.'); return; }
  if (!checkRocketLimit(quantity)) return;

  if (rocketCargoResource === 'nickelOre' && !state.research?.completed?.nickelMining) { rocketLaunchError('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.'); return; }
  const amountPerRocket = Math.max(0, Math.min(120, Number(rocketCargoAmount) || 0));
  const available = Number(getLocationStorage(source, sourceMode)[rocketCargoResource] || 0);
  const totalCargo = amountPerRocket * quantity;
  if (totalCargo > available + 0.000001) { rocketLaunchError('Nicht genug Fracht im Lager.'); return; }

  const targetMode = rocketDestinationMode;
  if (!chargeRocketRoundTripFuel('hercules1', source, destination, sourceMode, targetMode, quantity)) return;
  const sourceStorage = getLocationStorage(source, sourceMode);
  sourceStorage[rocketCargoResource] = Number(sourceStorage[rocketCargoResource] || 0) - totalCargo;
  if (Math.abs(sourceStorage[rocketCargoResource]) < 0.000001) sourceStorage[rocketCargoResource] = 0;

  changeRocketStock('hercules1',source,sourceMode,-quantity);
  const duration = flightDurationSeconds(destination, targetMode) * 1000;
  for (let i = 0; i < quantity; i++) {
    rockets.push({
      id: Date.now() + Math.random(),
      name: rocketTypes.hercules1.name,
      type: 'hercules1',
      from: source,
      to: destination,
      fromMode: sourceMode,
      targetMode,
      started: gameNow(),
      duration,
      status: 'outbound',
      capacity: 120,
      cargo: { resource: rocketCargoResource, amount: amountPerRocket }
    });
  }
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchHercules2(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  const sourceMode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  if (getRocketStockCount('hercules2',source,sourceMode)<1) { rocketLaunchError('Keine Herkules-2-Rakete an diesem Startort verfügbar.'); return; }
  if (sourceMode === 'surface' && Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) { rocketLaunchError('Für den Start wird eine Start- & Landerrampe benötigt.'); return; }
  if (!checkRocketLimit(1)) return;

  const cargo = (rocketCargoSlots || []).map(slot => ({
    resource: slot.resource,
    amount: Math.max(0, Number(slot.amount) || 0)
  })).filter(slot => slot.resource && slot.amount > 0);

  if (cargo.some(slot => slot.resource === 'nickelOre') && !state.research?.completed?.nickelMining) { rocketLaunchError('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.'); return; }
  const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total > 300.000001) { rocketLaunchError('Die Fracht überschreitet 300 t Kapazität.'); return; }

  const targetMode = rocketDestinationMode;
  const sourceStorage = getLocationStorage(source, sourceMode);
  for (const slot of cargo) {
    if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return;
  }
  if (!chargeRocketRoundTripFuel('hercules2', source, destination, sourceMode, targetMode)) return;
  for (const slot of cargo) {
    sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount;
    if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0;
  }

  changeRocketStock('hercules2',source,sourceMode,-1);
  const duration = flightDurationSeconds(destination, targetMode) * 1000;
  rockets.push({
    id: Date.now() + Math.random(),
    name: rocketTypes.hercules2.name,
    type: 'hercules2',
    from: source,
    to: destination,
    fromMode: sourceMode,
    targetMode,
    started: gameNow(),
    duration,
    status: 'outbound',
    capacity: 300,
    compartments: 3,
    cargo: cargo
  });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchAtlas1(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  const sourceMode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  if (getRocketStockCount('atlas1',source,sourceMode)<1) { rocketLaunchError('Keine Atlas-1-Rakete an diesem Startort verfügbar.'); return; }
  if (sourceMode === 'surface' && Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) { rocketLaunchError('Für den Start wird eine Start- & Landerrampe benötigt.'); return; }
  if (!checkRocketLimit(1)) return;
  if (!state.research?.completed?.atlas1) { rocketLaunchError('Atlas 1 ist noch nicht erforscht.'); return; }
  const cargo = (rocketCargoSlots || []).map(slot => ({ resource: slot.resource, amount: Math.max(0, Number(slot.amount) || 0) })).filter(slot => slot.resource && slot.amount > 0);
  if (cargo.some(slot => slot.resource === 'nickelOre') && !state.research?.completed?.nickelMining) { rocketLaunchError('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.'); return; }
   const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total > 500.000001) { rocketLaunchError('Die Fracht überschreitet 500 t Kapazität.'); return; }
  const targetMode = rocketDestinationMode;
  if (!chargeRocketRoundTripFuel('atlas1', source, destination, sourceMode, targetMode)) return;
  const sourceStorage = getLocationStorage(source, sourceMode);
  for (const slot of cargo) if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return;
  for (const slot of cargo) { sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount; if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0; }
  changeRocketStock('atlas1',source,sourceMode,-1);
  rockets.push({ id: Date.now() + Math.random(), name: rocketTypes.atlas1.name, type: 'atlas1', from: source, to: destination, fromMode: sourceMode, targetMode, started: gameNow(), duration: flightDurationSeconds(destination, targetMode) * 1000, status: 'outbound', capacity: 500, compartments: 3, cargo: cargo });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchTitan1(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') return rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.');
  const sourceMode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  if (getRocketStockCount('titan1',source,sourceMode)<1) return rocketLaunchError('Keine Titan-1-Rakete an diesem Startort verfügbar.');
  if (sourceMode === 'surface' && Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Für den Start wird eine Start- & Landerampe benötigt.');
  if (!checkRocketLimit(1)) return;
  if (!state.research?.completed?.titan1) return rocketLaunchError('Schwerlastraketen (Titan 1) sind noch nicht erforscht.');
  const cargo = (rocketCargoSlots || []).map(slot => ({ resource: slot.resource, amount: Math.max(0, Number(slot.amount) || 0) })).filter(slot => slot.resource && slot.amount > 0);
  if (cargo.some(slot => slot.resource === 'nickelOre') && !state.research?.completed?.nickelMining) { rocketLaunchError('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.'); return; }
   const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total <= 0 || total > 1500.000001) return rocketLaunchError('Die Fracht muss größer als 0 und darf höchstens 1.500 t/L betragen.');
  const targetMode = rocketDestinationMode;
  if (!chargeRocketRoundTripFuel('titan1', source, destination, sourceMode, targetMode)) return;
  const sourceStorage = getLocationStorage(source, sourceMode);
  for (const slot of cargo) if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return rocketLaunchError('Nicht genug Fracht im Lager.');
  for (const slot of cargo) { sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount; if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0; }
  changeRocketStock('titan1',source,sourceMode,-1);
  const duration = flightDurationSeconds(destination, targetMode) * 1000;
  rockets.push({ id: Date.now() + Math.random(), name: rocketTypes.titan1.name, type: 'titan1', from: source, to: destination, fromMode: sourceMode, targetMode, started: gameNow(), duration, status: 'outbound', capacity: 1500, compartments: 3, cargo });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchTankRocket() {
  const source = state.selected;
  const destination = rocketDestination;
  const sourceFuel = liquidFuelAmount(source, 'surface');
  const targetCapacity = liquidTankCapacity(destination, 'orbit');
  const targetFuel = liquidFuelAmount(destination, 'orbit');
  const freeCapacity = Math.max(0, targetCapacity - targetFuel - reservedOrbitFuel(destination));
  const amount = Math.max(0, Math.floor(Number(document.querySelector('#tank-rocket-fuel-amount')?.value) || 0));
  const loadAmount = Math.min(10000, sourceFuel, freeCapacity);
  if (state.viewMode === 'orbit') return rocketLaunchError('Tankraketen starten von der Planetenoberfläche.');
  if (!bodies[destination] || destination === source || destination === 'sun') return rocketLaunchError('Bitte einen anderen Zielorbit auswählen.');
  if (Number(rocketStockTankRocket[source] || 0) < 1) return rocketLaunchError('Keine Tankrakete am Startort verfügbar.');
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Für den Tankraketenstart wird eine Oberflächen-Startrampe benötigt.');
  if (amount < 1 || amount > loadAmount) return rocketLaunchError(`Es können höchstens ${loadAmount.toLocaleString('de-DE')} L in den Orbit von ${bodies[destination].name} transportiert werden.`);
  if (!checkRocketLimit(1)) return;
  ensureLiquidTankData(source).liquidFuel.surface = Math.max(0, sourceFuel - amount);
  rocketStockTankRocket[source] = Math.max(0, Number(rocketStockTankRocket[source] || 0) - 1);
  rockets.push({ id: Date.now() + Math.random(), name: rocketTypes.tankRocket.name, type: 'tankRocket', from: source, to: destination, fromMode: 'surface', targetMode: 'orbit', started: gameNow(), duration: flightDurationSeconds(destination, 'orbit') * 1000, status: 'outbound', capacity: 10000, cargo: [], fuelCargoLiters: amount, fuelDelivered: false });
  renderInfo(); renderTopResources(); saveGame(false);
}
function launchColonistShuttle() {
  const source = state.selected;
  const destination = document.querySelector('#shuttle-destination')?.value;
  const passengers = Math.max(0, Math.min(25, Math.floor(Number(document.querySelector('#shuttle-passengers')?.value) || 0)));
  const food = Math.max(0, Math.min(5, Number(document.querySelector('#shuttle-food')?.value) || 0));
  const water = Math.max(0, Math.min(5000, Number(document.querySelector('#shuttle-water')?.value) || 0));
  ensureRocketData(source);
  const sourceStorage = getPlanetStorage(source);
  if (state.viewMode === 'orbit') return rocketLaunchError('Der Kolonisten-Shuttle muss von der Planetenoberfläche starten.');
  if (!bodies[destination] || destination === source || !hasPlanetSurface(destination) || flightTimes[destination] === undefined) return rocketLaunchError('Bitte einen gültigen Zielplaneten mit Oberfläche auswählen.');
  if (Number(rocketStockColonistShuttle[source] || 0) < 1) return rocketLaunchError('Am Startort ist kein Kolonisten-Shuttle verfügbar.');
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Am Startplaneten wird eine Start- & Landerampe benötigt.');
  if (Number(getBuildingsOnPlanet(destination).landingPad || 0) < 1) return rocketLaunchError('Am Zielplaneten wird eine Start- & Landerampe benötigt.');
  if (passengers < 1) return rocketLaunchError('Bitte mindestens einen Kolonisten für den Shuttleflug auswählen.');
  if (passengers > colonistsOnPlanet(source)) return rocketLaunchError('Am Startplaneten leben nicht genügend Kolonisten.');
  if (passengers > housingFree(destination)) return rocketLaunchError(`Auf ${bodies[destination].name} ist nicht genügend freier Wohnraum vorhanden. Benötigt: ${passengers} Plätze.`);
  if (food > Number(sourceStorage.food || 0) + 0.000001) return rocketLaunchError('Nicht genügend Lebensmittel im Oberflächenlager.');
  if (water > Number(sourceStorage.water || 0) + 0.000001) return rocketLaunchError('Nicht genügend Wasser im Oberflächenlager.');
  if (!checkRocketLimit(1)) return;
  if (!chargeRocketRoundTripFuel('colonistShuttle', source, destination, 'surface', 'surface')) return;

  const removed = removeColonistsFromHousing(source, passengers);
  if (removed !== passengers) return rocketLaunchError('Die Kolonisten konnten nicht vollständig ausgebucht werden.');
  sourceStorage.food = Math.max(0, Number(sourceStorage.food || 0) - food);
  sourceStorage.water = Math.max(0, Number(sourceStorage.water || 0) - water);
  rocketStockColonistShuttle[source]--;
  rockets.push({
    id: Date.now() + Math.random(), name: rocketTypes.colonistShuttle.name, type: 'colonistShuttle',
    from: source, to: destination, fromMode: 'surface', targetMode: 'surface',
    started: gameNow(), duration: flightDurationSeconds(destination, 'surface') * 1000,
    status: 'outbound', capacity: 25, passengers, cargo: [], supplyCargo: { food, water }, cargoDelivered: false
  });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function returnRocket(rocketId, cargoResource = null, cargoAmount = 0) {
  const rocket = rockets.find(r => String(r.id) === String(rocketId));
  if (!rocket || !['orbit','landed'].includes(rocket.status)) return;
  const source = rocket.to;
  const destination = rocket.from;
  const sourceMode = rocket.status === 'landed' ? 'surface' : 'orbit';
  const returnMode = rocket.fromMode === 'orbit' ? 'orbit' : 'surface';
  // Erstlandungs-Fracht darf auch von einer noch unerschlossenen Oberfläche zurückkehren.
  const duration = flightDurationSeconds(destination, returnMode) * 1000;
  const storage = getLocationStorage(source, sourceMode);
  const returnCapacity = rocket.type === 'colonistShuttle' ? 0 : rocket.type === 'titan1' ? 1500 : rocket.type === 'atlas1' ? 500 : rocket.type === 'hercules2' ? 300 : 120;
  const amount = Math.max(0, Math.min(returnCapacity, Number(cargoAmount) || 0));
  if (cargoResource && amount > 0) {
    const available = Number(storage[cargoResource] || 0);
    if (amount > available + 0.000001) return;
    storage[cargoResource] = available - amount;
    rocket.returnCargo = { resource: cargoResource, amount };
  } else {
    rocket.returnCargo = { resource: null, amount: 0 };
  }
  rocket.status = 'returning';
  rocket.returnMode = returnMode;
  rocket.returnTo = destination;
  rocket.fromReturn = source;
  rocket.to = destination;
  rocket.started = gameNow();
  rocket.duration = duration;
  renderInfo();
  renderTopResources();
  saveGame(false);
}

function renderRocketWindow(body) {
  const source = state.selected;
  ensureRocketData(source);
  if (source === 'sun') return '';

  if (!bodies[rocketDestination] || rocketDestination === source || rocketDestination === 'sun') {
    rocketDestination = Object.keys(bodies).find(id => id !== 'sun' && id !== source) || 'earth';
  }

  const sourceModeForStock=state.viewMode==='orbit'?'orbit':'surface';
  const stock1 = getRocketStockCount('hercules1',source,sourceModeForStock);
  const stock2 = getRocketStockCount('hercules2',source,sourceModeForStock);
  const buildQueue1 = rocketBuildQueue[source] || 0;
  const buildQueue2 = rocketBuildQueue2[source] || 0;
  const buildStarted1 = rocketBuildStarted[source] || 0;
  const buildStarted2 = rocketBuildStarted2[source] || 0;
  const stockAtlas1 = getRocketStockCount('atlas1',source,sourceModeForStock);
  const stockTitan1 = getRocketStockCount('titan1',source,sourceModeForStock);
  const stockColonistShuttle = state.viewMode==='orbit'?0:getRocketStockCount('colonistShuttle',source,'surface');
  const stockMobileMiner = getRocketStockCount('mobileMiner',source,sourceModeForStock);
  const factoryQueue = Array.isArray(rocketFactoryQueue[source]) ? rocketFactoryQueue[source] : [];
  const activeBuildTime = factoryQueue.length ? (rocketTypes[rocketFactoryQueue[source][0]]?.buildTime || 60) : 60;
  const factoryRemaining = factoryQueue.length && rocketFactoryStarted[source] ? Math.max(0, activeBuildTime - (gameNow()-rocketFactoryStarted[source])/1000) : 0;
  const buildQueueAtlas1 = rocketBuildQueueAtlas1[source] || 0;
  const buildStartedAtlas1 = rocketBuildStartedAtlas1[source] || 0;

  const destinations = Object.entries(bodies)
    .filter(([id]) => id !== 'sun' && id !== source && flightTimes[id] !== undefined)
    .map(([id, b]) => `<option value="${id}" ${rocketDestination === id ? 'selected' : ''}>${b.name}</option>`).join('');

  const qty = Math.max(1, Math.min(rocketQuantity, Math.max(1, stock1)));
  rocketQuantity = qty;
  // Zielplanet und Zielort bleiben zentrale Einstellungen für alle Raketen.
  // Falls ein alter Spielstand ein ungültiges Ziel enthält, auf das erste gültige Ziel zurückfallen.
  if (!Object.prototype.hasOwnProperty.call(bodies, rocketDestination) || rocketDestination === 'sun' || !flightTimes[rocketDestination]) {
    rocketDestination = Object.keys(bodies).find(id => id !== 'sun' && id !== source && flightTimes[id] !== undefined) || 'mercury';
  }
  const target = rocketDestination;
  if (!hasPlanetSurface(target)) rocketDestinationMode = 'orbit';
  const sec = flightDurationSeconds(target, rocketDestinationMode);

  const active = rockets.filter(r => r.status !== 'returned' && (r.from === source || r.to === source));
  const list = active.length ? active.map(r => {
    const now = gameNow();
    const elapsed = Math.max(0, (now - Number(r.started || now)) / 1000);
    const totalFlight = Math.max(0, Number(r.duration || 0) / 1000);
    const remaining = Math.max(0, totalFlight - elapsed);
    const pct = totalFlight > 0 ? Math.min(100, elapsed / totalFlight * 100) : 100;
    const flightTimeLabel = `Flugzeit: ${totalFlight.toFixed(1)} s · vergangen: ${Math.min(elapsed, totalFlight).toFixed(1)} s · Rest: ${remaining.toFixed(1)} s`;
    const isH2 = r.type === 'hercules2';
    const isAtlas1 = r.type === 'atlas1';
    const isTitan1 = r.type === 'titan1';
    const isShuttle = r.type === 'colonistShuttle';
    const isTankRocket = r.type === 'tankRocket';
    const maxCapacity = isShuttle || isTankRocket ? 0 : isTitan1 ? 1500 : isAtlas1 ? 500 : (isH2 ? 300 : 120);
    const cargo = r.deliveredCargo || r.cargo;
    const cargoText = isTankRocket ? `🛢️ ${Number(r.fuelCargoLiters||0).toLocaleString('de-DE')} L Treibstoff${r.fuelDelivered ? ' · geliefert' : ''}` : isShuttle ? `👥 ${Number(r.passengers||0)} Kolonisten · 🍲 ${Number(r.supplyCargo?.food||0).toLocaleString('de-DE')} t Lebensmittel · 💧 ${Number(r.supplyCargo?.water||0).toLocaleString('de-DE')} L Wasser` : Array.isArray(cargo)
      ? (cargo.length ? cargo.map(c => `${resourceIcons[c.resource] || ''} ${resourceNames[c.resource] || c.resource}: ${c.amount.toFixed(2)} ${['crudeOil','water'].includes(c.resource) ? 'L' : 't'}`).join(' · ') : 'Keine Fracht')
      : (cargo && cargo.amount > 0 ? `${resourceIcons[cargo.resource] || ''} ${resourceNames[cargo.resource] || cargo.resource}: ${cargo.amount.toFixed(2)} ${['crudeOil','water'].includes(cargo.resource) ? 'L' : 't'}` : 'Keine Fracht');

    if (r.status === 'orbit' || r.status === 'landed') {
      const returnOptions = (isTankRocket ? [] : ['stone','ice','coal','gas','crudeOil','water','grain','vegetables','food','algaeBiomass','polymers','rubber','plastics','wood','biomass','vehicles','co2','carbon','oxygen','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','uranium','processedUranium','nuclearFuel','steel','bauxite','aluminiumOxide','aluminium','titanium','nickelOre','graphite'])
        .filter(k => Number(getLocationStorage(r.to, r.status === 'landed' ? 'surface' : 'orbit')[k] || 0) > 0.000001)
        .map(k => `<option value="${k}">${resourceIcons[k] || ''} ${resourceNames[k] || k}</option>`).join('');
      const phase = r.status === 'orbit' ? '🛰️ im Orbit' : '🛬 auf der Oberfläche';
      const landButton = r.status === 'orbit' && r.targetMode !== 'orbit' && rocketCanLand(r.to) ? `<button class="rocket-land" data-rocket-id="${r.id}">${isShuttle ? '🛬 Shuttle landen' : `🛬 Auf ${bodies[r.to].name} landen`}</button>` : '';
      const cargoState = isShuttle ? (r.status === 'landed' ? '🧑‍🚀 Passagiere und Versorgung angekommen' : (r.message || '🧑‍🚀 Passagiere und Versorgung an Bord')) : r.status === 'orbit' && r.targetMode !== 'orbit' ? '📦 Fracht an Bord' : '📦 Fracht entladen';
      const returnControls = isShuttle ? '' : `<div class="rocket-return-box"><select class="rocket-return-resource" data-rocket-id="${r.id}"><option value="">Keine Rückfracht</option>${returnOptions}</select><input class="rocket-return-amount" data-rocket-id="${r.id}" type="number" min="0" max="${maxCapacity}" step="0.01" value="0"><button class="rocket-return" data-rocket-id="${r.id}">↩️ Zurück nach ${bodies[r.from].name}</button></div>`;
      const shuttleReturnButton = isShuttle ? `<button class="rocket-return" data-rocket-id="${r.id}">↩️ Shuttle zurück nach ${bodies[r.from].name}</button>` : '';
      return `<div class="rocket-flight arrived"><strong>🚀 ${r.name}</strong><span>📍 ${bodies[r.to].name} (${r.targetMode === 'orbit' ? 'Orbit' : 'Oberfläche erreichbar'}) · ${phase}</span><div class="rocket-cargo">${cargoState}: ${cargoText}</div>${landButton}${returnControls}${shuttleReturnButton}<small>${flightTimeLabel} · Rückflug ${bodies[r.to].name} → ${bodies[r.from].name}: ${flightDurationSeconds(r.from, r.fromMode === 'orbit' ? 'orbit' : 'surface')} Sekunden${isShuttle ? '' : ` · max. ${maxCapacity} t/L`}</small></div>`;
    }
    if (r.status === 'returning') return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>↩️ ${bodies[r.fromReturn || r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 Rückflug</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${flightTimeLabel}</small></div>`;
    return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>🚀 ${bodies[r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 ${cargoText}</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${flightTimeLabel}</small></div>`;
  }).join('') : '<p class="hint">Keine aktiven Transporte mit diesem Planeten.</p>';

  const buildRemaining1 = buildQueue1 ? Math.max(0, 30 - (gameNow() - buildStarted1)/1000) : 0;
  const buildPct1 = buildQueue1 ? Math.min(100, (gameNow()-buildStarted1)/30000*100) : 0;
  const buildRemaining2 = buildQueue2 ? Math.max(0, 30 - (gameNow() - buildStarted2)/1000) : 0;
  const buildPct2 = buildQueue2 ? Math.min(100, (gameNow()-buildStarted2)/30000*100) : 0;
  const buildRemainingAtlas1 = buildQueueAtlas1 ? Math.max(0, 30 - (gameNow() - buildStartedAtlas1)/1000) : 0;
  const buildPctAtlas1 = buildQueueAtlas1 ? Math.min(100, (gameNow()-buildStartedAtlas1)/30000*100) : 0;
  const localSteel = getPlayerResourceAmount('steel', source);
  const localBatteries = getPlayerResourceAmount('batteries', source);
  const localChips = getPlayerResourceAmount('chips', source);
  const localAluminium = getPlayerResourceAmount('aluminium', source);
  const localGlass = getPlayerResourceAmount('glass', source);
  const localElectronics = getPlayerResourceAmount('electronics', source);
  const localPolymers = getPlayerResourceAmount('polymers', source);
  const mobileMinerResearchDone = !!state.research?.completed?.mobileMiner;

  const cargoOptions = ['stone','ice','coal','gas','crudeOil','water','grain','vegetables','food','algaeBiomass','polymers','rubber','plastics','wood','biomass','vehicles','co2','carbon','oxygen','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','chips','uranium','processedUranium','nuclearFuel','steel','bauxite','aluminiumOxide','aluminium','titanium','nickelOre','graphite']
    .map(key => `<option value="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}</option>`).join('');

  rocketCargoSlots = rocketCargoSlots.slice(0, 20);
  if (!rocketCargoSlots.length) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
  rocketCargoSlots.forEach(slot => {
    const available = Number(getLocationStorage(source, state.viewMode === 'orbit' ? 'orbit' : 'surface')[slot.resource] || 0);
    slot.amount = Math.max(0, Math.min(Number(slot.amount) || 0, available, 1500));
  });
  const h2Total = rocketCargoSlots.reduce((sum, slot) => sum + Number(slot.amount || 0), 0);
  const h2Possible = h2Total > 0 && h2Total <= 300.000001;
  const h2SlotsHtml = rocketCargoSlots.map((slot, i) => {
    const available = Number(getLocationStorage(source, state.viewMode === 'orbit' ? 'orbit' : 'surface')[slot.resource] || 0);
    return `<div class="rocket-compartment dynamic-cargo-row"><div class="cargo-row-heading"><strong>Fracht ${i+1}</strong><button type="button" class="cargo-remove" data-slot="${i}" aria-label="Frachtzeile ${i+1} entfernen">✕</button></div><select class="rocket-h2-resource" data-slot="${i}">${cargoOptions.replace(`value="${slot.resource}"`, `value="${slot.resource}" selected`)}</select><label class="cargo-amount-label">Menge (${['crudeOil','water'].includes(slot.resource) ? 'L' : 't'})<input class="rocket-h2-amount" data-slot="${i}" type="number" min="0" max="${Math.min(1500, available)}" step="0.01" value="${Number(slot.amount || 0).toFixed(2)}"><input class="rocket-h2-range" data-slot="${i}" type="range" min="0" max="${Math.max(0, Math.min(1500, available))}" step="0.01" value="${Math.min(Number(slot.amount || 0), available, 1500)}" aria-label="Frachtmenge ${i+1}"></label><small>Verfügbar: ${formatTons(available)}</small></div>`;
  }).join('');

  const activeRocketCount = getActiveRocketCount();
  const rocketPlatformLimit = getRocketPlatformLimit();
  return `<section class="rocket-window"><h3>🚀 Transportzentrale</h3>
    <p class="hint"><strong>Startort:</strong> ${body.name} (${state.viewMode === 'orbit' ? 'Orbit' : 'Oberfläche'}) · Die Raketenfabrik produziert alle Raketentypen nacheinander.</p>
    <p class="rocket-limit-status"><strong>Systemweites Raketenlimit:</strong> ${activeRocketCount} / ${rocketPlatformLimit} aktiv · Jede Start- & Landeplattform auf einem Planeten mit Oberfläche zählt +1. Zyklische Missionen belegen ebenfalls einen Platz.</p>
    <div class="rocket-factory-queue"><strong>🏭 Produktionswarteschlange:</strong> ${factoryQueue.length ? factoryQueue.map((t,i)=>`${i===0 && factoryRemaining>0?'⚙️ ':''}${rocketTypes[t]?.name || t}`).join(' → ') : 'leer'}${factoryRemaining>0 ? ` · nächste Fertigstellung in ${factoryRemaining.toFixed(1)} s` : ''}</div>

    <details class="rocket-type-card"><summary>🏗️ Herkules 1 · Bau <span>120 t/L · Bestand: ${stock1}</span></summary><div class="rocket-type-content"><div class="rocket-build-box"><strong>🏗️ Herkules 1</strong><small>45 t Stahl · 30 Sekunden Bauzeit · 120 t/L Kapazität</small>${factoryQueue.length && factoryQueue[0]==='hercules1' ? `<div class="rocket-progress"><i style="width:${Math.min(100,(activeBuildTime-factoryRemaining)/activeBuildTime*100)}%"></i></div>` : ''}<button id="build-hercules" ${!rocketFactoryHasCapacity(source) || localSteel < 45 ? 'disabled' : ''}>🚀 Herkules 1 bauen – 45 t Stahl</button></div>
    <div class="rocket-stock">Herkules 1 verfügbar: <strong>${stock1}</strong></div></div></details>

    <details class="rocket-type-card"><summary>🏗️ Herkules 2 · Bau <span>300 t/L · Bestand: ${stock2}</span></summary><div class="rocket-type-content"><div class="rocket-build-box hercules2-box"><strong>🚀 Herkules 2</strong><small>300 t Stahl + 50 t Batterien + 50 t Aluminium · 30 Sekunden Bauzeit · 300 t/L Kapazität · 3 Frachtabteilungen</small><button id="build-hercules2" ${!rocketFactoryHasCapacity(source) || localSteel < 300 || localBatteries < 50 || localAluminium < 50 ? 'disabled' : ''}>🚀 Herkules 2 bauen – 300 t Stahl + 50 t Batterien + 50 t Aluminium</button></div>
    <div class="rocket-stock">Herkules 2 verfügbar: <strong>${stock2}</strong></div></div></details>

    <details class="rocket-type-card"><summary>🏗️ Atlas 1 · Bau <span>500 t/L · Bestand: ${stockAtlas1}</span></summary><div class="rocket-type-content"><div class="rocket-build-box atlas1-box"><strong>🚀 Atlas 1</strong><small>340 t Stahl + 150 t Chips + 200 t Batterien + 100 t Aluminium · 30 Sekunden Bauzeit · 500 t/L Kapazität · 3 Frachtabteilungen · Forschung erforderlich</small><button id="build-atlas1" ${!rocketFactoryHasCapacity(source) || localSteel < 340 || localChips < 150 || localBatteries < 200 || localAluminium < 100 || !state.research?.completed?.atlas1 ? 'disabled' : ''}>🚀 Atlas 1 bauen – 340 t Stahl + 150 t Chips + 200 t Batterien + 100 t Aluminium</button></div>
    <div class="rocket-stock">Atlas 1 verfügbar: <strong>${stockAtlas1}</strong></div></div></details>

    <details class="rocket-type-card"><summary>🏗️ Titan 1 · Bau <span>1.500 t/L · Bestand: ${stockTitan1}</span></summary><div class="rocket-type-content"><div class="rocket-build-box titan1-box"><strong>🚀 Titan 1</strong><small>2.000 t Stahl + 300 t Aluminium + 250 t Chips + 200 t Batterien + 120 t Titan · 120 Sekunden Bauzeit · 1.500 t/L Kapazität · Forschung Schwerlastraketen erforderlich</small><button id="build-titan1" ${!rocketFactoryHasCapacity(source) || localSteel < 2000 || localAluminium < 300 || localChips < 250 || localBatteries < 200 || getPlayerResourceAmount('titanium','nickelOre',source) < 120 || !state.research?.completed?.titan1 ? 'disabled' : ''}>🚀 Titan 1 bauen</button></div>
    <div class="rocket-stock">Titan 1 verfügbar: <strong>${stockTitan1}</strong></div></div></details>

    <details class="rocket-type-card"><summary>🧑‍🚀 Kolonisten-Shuttle · Bau <span>25 Kolonisten · Bestand: ${stockColonistShuttle}</span></summary><div class="rocket-type-content"><div class="rocket-build-box"><strong>🧑‍🚀 Kolonisten-Shuttle</strong><small>500 t Stahl · 200 t Elektronik · 150 t Chips · 100 t Polymere · 60 Sekunden Bauzeit · maximal 25 Kolonisten pro Flug</small>${factoryQueue.length && factoryQueue[0] === 'colonistShuttle' ? `<div class="rocket-progress"><i style="width:${Math.min(100,(activeBuildTime-factoryRemaining)/activeBuildTime*100)}%"></i></div>` : ''}<button id="build-colonist-shuttle" ${!rocketFactoryHasCapacity(source) || localSteel < 500 || localElectronics < 200 || localChips < 150 || localPolymers < 100 ? 'disabled' : ''}>🧑‍🚀 Kolonisten-Shuttle bauen</button></div><div class="rocket-stock">Kolonisten-Shuttles verfügbar: <strong>${stockColonistShuttle}</strong></div></div></details>

    <details class="rocket-type-card"><summary>⛏️ Mobile Minerrakete · Bau <span>Asteroidenbergbau · Bestand: ${stockMobileMiner}</span></summary><div class="rocket-type-content"><div class="rocket-build-box"><strong>⛏️ Mobile Minerrakete</strong><small>1.900 t Stahl · 600 t Glas · 1.400 t Chips · 1.100 t Elektronik · 300 t Polymere · 10 Ingame-Minuten Bauzeit · Forschung „Mobile Minerrakete“ erforderlich</small>${factoryQueue.length && factoryQueue[0] === 'mobileMiner' ? `<div class="rocket-progress"><i style="width:${Math.min(100,(activeBuildTime-factoryRemaining)/activeBuildTime*100)}%"></i></div>` : ''}<button id="build-mobile-miner" ${!rocketFactoryHasCapacity(source) || localSteel < 1900 || localGlass < 600 || localChips < 1400 || localElectronics < 1100 || localPolymers < 300 || !mobileMinerResearchDone ? 'disabled' : ''}>⛏️ Mobile Minerrakete bauen</button>${!mobileMinerResearchDone ? '<small class="warn">🔒 Forschung fehlt: Mobile Minerrakete.</small>' : ''}</div><div class="rocket-stock">Mobile Minerraketen verfügbar: <strong>${stockMobileMiner}</strong></div></div></details>

    <details class="rocket-type-card"><summary>🛢️ Tankrakete · Bau <span>10.000 L Kapazität · Bestand: ${Number(rocketStockTankRocket[source]||0)}</span></summary><div class="rocket-type-content"><div class="rocket-build-box"><strong>🛢️ Tankrakete</strong><small>120 t Stahl · 30 t Batterien · 20 t Elektronik · 60 Sekunden Bauzeit · bis zu 10.000 Liter Treibstoff pro Transport</small><button id="build-tank-rocket" ${state.viewMode==='orbit' || !rocketFactoryHasCapacity(source) || localSteel < 120 || localBatteries < 30 || localElectronics < 20 ? 'disabled' : ''}>🛢️ Tankrakete bauen</button></div><div class="rocket-stock">Tankraketen verfügbar: <strong>${Number(rocketStockTankRocket[source]||0)}</strong></div></div></details>

     <details class="rocket-type-card tank-rocket-launch-card"><summary>🛢️ Tankrakete · Treibstoff transportieren</summary><div class="rocket-type-content"><p class="hint">Nur von einer Planetenoberfläche in einen Orbit. Der Treibstoff wird aus dem Oberflächen-Flüssiglager entnommen und nach Ankunft in das getrennte Orbit-Flüssiglager übertragen.</p><label>Treibstoff (L)<input id="tank-rocket-fuel-amount" type="number" min="1" max="${Math.max(0,Math.min(10000,liquidFuelAmount(source,'surface'),liquidTankCapacity(target,'orbit')-liquidFuelAmount(target,'orbit')-reservedOrbitFuel(target)))}" step="1" value="${Math.max(0,Math.min(10000,liquidFuelAmount(source,'surface'),liquidTankCapacity(target,'orbit')-liquidFuelAmount(target,'orbit')-reservedOrbitFuel(target)))}" style="width:100%;padding:8px;border-radius:8px"></label><small class="hint">Oberfläche: ${liquidFuelAmount(source,'surface').toLocaleString('de-DE')} L · Freier Platz im Orbitlager ${bodies[target].name}: ${Math.max(0,liquidTankCapacity(target,'orbit')-liquidFuelAmount(target,'orbit')-reservedOrbitFuel(target)).toLocaleString('de-DE')} L</small><button id="launch-tank-rocket" ${state.viewMode==='orbit' || Number(rocketStockTankRocket[source]||0)<1 || Number(getBuildingsOnPlanet(source).landingPad||0)<1 || Math.min(10000,liquidFuelAmount(source,'surface'),liquidTankCapacity(target,'orbit')-liquidFuelAmount(target,'orbit')-reservedOrbitFuel(target))<1 ? 'disabled' : ''}>🛢️ Tankrakete zum Orbit von ${bodies[target].name} starten</button></div></details>

<section class="rocket-stationing"><h3>🛰️ Raketen stationieren</h3><p class="hint">Nur für zyklische Orbitmissionen: Jede stationierte Rakete belegt einen Stellplatz an einer Orbit-Start- und Landevorrichtung. Normale Flüge können einen Orbit weiterhin ohne Vorrichtung erreichen und weiterfliegen.</p><div class="rocket-stationing-row"><label>Rakete<select id="station-rocket-type"><option value="hercules1">Herkules 1 (${getRocketStockCount('hercules1',source,'surface')} an Oberfläche)</option><option value="hercules2">Herkules 2 (${getRocketStockCount('hercules2',source,'surface')} an Oberfläche)</option><option value="atlas1">Atlas 1 (${getRocketStockCount('atlas1',source,'surface')} an Oberfläche)</option><option value="titan1">Titan 1 (${getRocketStockCount('titan1',source,'surface')} an Oberfläche)</option></select></label><label>Anzahl<input id="station-rocket-count" type="number" min="1" step="1" value="1"></label></div><button type="button" id="station-rockets-to-orbit" ${state.viewMode==='orbit' || Number(getBuildingsOnPlanet(source).landingPad||0)<1 || getFreeOrbitRocketSlots(source)<1?'disabled':''}>🛰️ In diesen Orbit stationieren</button><small class="hint">Orbit-Stellplätze: ${getOrbitRocketSlotsUsed(source)} / ${getOrbitLandingPadCount(source)} belegt</small><div class="rocket-stationed-summary">Im Orbit stationiert: Herkules 1 <strong>${getRocketStockCount('hercules1',source,'orbit')}</strong> · Herkules 2 <strong>${getRocketStockCount('hercules2',source,'orbit')}</strong> · Atlas 1 <strong>${getRocketStockCount('atlas1',source,'orbit')}</strong> · Titan 1 <strong>${getRocketStockCount('titan1',source,'orbit')}</strong></div></section>
    <section class="transport-route"><h3>🎯 Flugziel für alle Raketen</h3><label for="rocket-destination"><strong>Zielplanet</strong></label><select id="rocket-destination">${destinations}</select>
    <label for="rocket-destination-mode"><strong>📍 Zielort</strong></label><select id="rocket-destination-mode"><option value="surface" ${rocketDestinationMode === 'surface' ? 'selected' : ''}>🌍 Oberfläche</option><option value="orbit" ${rocketDestinationMode === 'orbit' ? 'selected' : ''}>🛰️ Orbit</option></select>
    <small class="hint">Oberfläche: ${flightDurationSeconds(target, 'surface')} s · Orbit: ${flightDurationSeconds(target, 'orbit')} s</small></section>

        <details class="rocket-type-card rocket-cargo-card"><summary>📦 Titan 1 · Fracht <span>1.500 t/L · Beladung: ${h2Total.toFixed(0)} t/L</span></summary><div class="rocket-type-content"><div class="rocket-h2-launch titan1-launch"><strong>🚀 Titan 1 · Mehrere Frachtarten</strong><div class="rocket-capacity">Gesamtkapazität: <strong>1.500 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div><div class="rocket-compartments">${h2SlotsHtml}</div><button type="button" class="cargo-add" ${rocketCargoSlots.length>=20 || h2Total>=1500 ? "disabled" : ""}>＋ Fracht hinzufügen</button>${h2Total > 1500 ? '<small class="bad">Maximal 1.500 t/L pro Titan 1.</small>' : ''}<label class="rocket-count-label">Anzahl Raketen <input type="number" class="rocket-count" id="rocket-count-titan1" min="1" max="${stockTitan1}" value="1" inputmode="numeric"></label><button class="rocket-launch" id="launch-titan1" ${stockTitan1 < 1 || h2Total <= 0 || h2Total > 1500.000001 || !state.research?.completed?.titan1 ? 'disabled' : ''}>🚀 Titan 1 nach ${bodies[target].name} starten</button><p class="hint">Flugzeit zum Zielort: ${sec} Sekunden · mehrere Frachtarten pro Mission.</p></div></div></details>

    <details class="rocket-type-card rocket-cargo-card">
      <summary>📦 Atlas 1 · Fracht <span>500 t/L pro Rakete</span></summary><div class="rocket-type-content">
    <div class="rocket-h2-launch atlas1-launch">
      <strong>🚀 Atlas 1 · Mehrere Frachtabteilungen</strong>
      <div class="rocket-capacity">Gesamtkapazität: <strong>500 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div>
      <div class="rocket-compartments">${h2SlotsHtml}</div><button type="button" class="cargo-add" ${rocketCargoSlots.length>=20 || h2Total>=500 ? "disabled" : ""}>＋ Fracht hinzufügen</button>
      ${h2Total > 500 ? '<small class="bad">Maximal 500 t/L pro Atlas 1.</small>' : ''}
      <label class="rocket-count-label">Anzahl Raketen <input type="number" class="rocket-count" id="rocket-count-atlas1" min="1" max="${stockAtlas1}" value="1" inputmode="numeric"></label><button class="rocket-launch" id="launch-atlas1" ${stockAtlas1 < 1 || h2Total <= 0 || h2Total > 500.000001 || !state.research?.completed?.atlas1 ? 'disabled' : ''}>🚀 Atlas 1 starten → ${bodies[target].name}</button>
      <p class="hint">Alle Planeten erreichbar · 1 Sekunde schneller als Herkules · 3 Frachtabteilungen.</p>
    </div></div></details>



    <details class="rocket-type-card rocket-cargo-card">
      <summary>📦 Herkules 1 · Fracht <span>120 t/L pro Rakete</span></summary><div class="rocket-type-content">
    <div class="rocket-h1-launch">
      <strong>🚀 Herkules 1 · Einzelfracht</strong>
      <div class="rocket-quantity"><strong>Anzahl:</strong><button class="qty-btn" id="rocket-minus">−</button><span>${qty}</span><button class="qty-btn" id="rocket-plus">+</button></div>
      <div class="rocket-capacity">Gesamtkapazität: <strong>${qty*120} t/L</strong></div>
      <div class="rocket-cargo-box"><strong>📦 Fracht pro Rakete</strong><select id="rocket-cargo-resource">${cargoOptions.replace(`value="${rocketCargoResource}"`, `value="${rocketCargoResource}" selected`)}</select><div class="cargo-input-row"><input id="rocket-cargo-number" type="number" min="0" max="${Math.min(120,Number(getLocationStorage(source,state.viewMode === 'orbit' ? 'orbit' : 'surface')[rocketCargoResource] || 0))}" step="0.01" value="${Number(rocketCargoAmount||0).toFixed(2)}"></div></div>
      <button class="rocket-launch" id="launch-hercules" ${stock1 < qty || !(Number(rocketCargoAmount)>0) ? 'disabled' : ''}>🚀 ${qty} Herkules 1 nach ${bodies[target].name} starten</button>
    </div></div></details>

    <details class="rocket-type-card rocket-cargo-card">
      <summary>📦 Herkules 2 · Fracht <span>300 t/L pro Rakete</span></summary><div class="rocket-type-content">
    <div class="rocket-h2-launch">
      <strong>🚀 Herkules 2 · Mehrere Frachtabteilungen</strong>
      <div class="rocket-capacity">Gesamtkapazität: <strong>300 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div>
      <div class="rocket-compartments">${h2SlotsHtml}</div><button type="button" class="cargo-add" ${rocketCargoSlots.length>=20 || h2Total>=300 ? "disabled" : ""}>＋ Fracht hinzufügen</button>
      ${h2Total > 300 ? '<small class="bad">Maximal 300 t/L pro Herkules 2.</small>' : ''}
      <label class="rocket-count-label">Anzahl Raketen <input type="number" class="rocket-count" id="rocket-count-hercules2" min="1" max="${stock2}" value="1" inputmode="numeric"></label><button class="rocket-launch" id="launch-hercules2" ${stock2 < 1 || !h2Possible ? 'disabled' : ''}>🚀 Herkules 2 nach ${bodies[target].name} starten</button>
      <p class="hint">Gleiche Flugzeit wie Herkules 1 · kann alle erreichbaren Planeten anfliegen.</p>
    </div></div></details>

    <details class="rocket-type-card colonist-shuttle-card"><summary>🧑‍🚀 Kolonisten-Shuttle · Transport <span>25 Passagiere · Bestand: ${stockColonistShuttle}</span></summary><div class="rocket-type-content"><div class="rocket-h2-launch"><strong>🧑‍🚀 Kolonisten und Versorgung transportieren</strong><p class="hint">Startort: ${body.name} · Start nur von der Oberfläche. Das Shuttle landet automatisch, sofern genügend Wohnraum vorhanden ist. Während des Fluges benötigen die Kolonisten keine Nahrung und kein Wasser.</p><label>Zielplanet <select id="shuttle-destination">${Object.entries(bodies).filter(([id]) => id !== 'sun' && id !== source && hasPlanetSurface(id) && flightTimes[id] !== undefined).map(([id,b]) => `<option value="${id}" ${id === target ? 'selected' : ''}>${b.name}${Number(getBuildingsOnPlanet(id).landingPad || 0) > 0 ? '' : ' · keine Landerampe'}</option>`).join('')}</select></label><div class="shuttle-field"><label for="shuttle-passengers">Kolonisten: <strong id="shuttle-passengers-value">0</strong> / 25</label><input id="shuttle-passengers" type="range" min="0" max="${Math.min(25, colonistsOnPlanet(source))}" value="0" step="1"><small>Verfügbar am Startplaneten: ${colonistsOnPlanet(source)} · Freier Wohnraum am Ziel: <span id="shuttle-housing-free">wird bei Auswahl geprüft</span></small></div><div class="shuttle-field"><label for="shuttle-food">🍲 Lebensmittel (t, max. 5)</label><input id="shuttle-food" type="number" min="0" max="${Math.min(5, Number(getPlanetStorage(source).food || 0))}" step="0.01" value="0"><small>Verfügbar: ${Number(getPlanetStorage(source).food || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} t</small></div><div class="shuttle-field"><label for="shuttle-water">💧 Wasser (L, max. 5.000)</label><input id="shuttle-water" type="number" min="0" max="${Math.min(5000, Number(getPlanetStorage(source).water || 0))}" step="1" value="0"><small>Verfügbar: ${Number(getPlanetStorage(source).water || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} L</small></div><button type="button" id="launch-colonist-shuttle" ${stockColonistShuttle < 1 || colonistsOnPlanet(source) < 1 || Number(getBuildingsOnPlanet(source).landingPad || 0) < 1 || state.viewMode === 'orbit' ? 'disabled' : ''}>🚀 Kolonisten-Shuttle starten</button><small class="hint">Voraussetzung: Start- & Landerampe am Start- und Zielplaneten sowie ausreichend freier Wohnraum am Ziel.</small></div></div></details>

    <p class="hint">Flugzeit zum Zielort: ${sec} Sekunden. Bei Orbit-Zielen wird direkt ins Orbit-Lager entladen; bei Oberflächenzielen landet die Rakete nach Ankunft manuell, sofern eine Landerampe vorhanden ist.</p>
    <hr><h3>📡 Aktive Transporte</h3>${list}</section>`;
}

function renderOrbitMissions(planetId = state.selected) {
  const missions = orbitMissions.filter(m => m.source === planetId || m.destination === planetId);
  if (!missions.length) return '<p class="hint">Noch keine zyklischen Missionen für diesen Planeten.</p>';
  return missions.map(m => {
    const phase = m.status === 'paused' ? 'Pausiert – manuelle Fortsetzung erforderlich' : m.status === 'outbound' ? `Hinflug nach ${bodies[m.destination]?.name || m.destination}` : m.status === 'returning' ? 'Rückflug' : (m.message && /^Wartet auf|Orbit-Start- und Landevorrichtung fehlt/.test(m.message) ? m.message : `Wartezeit: ${Math.max(0, Math.ceil((m.nextLaunchAt - gameNow()) / 1000))} s`);
    return `<div class="rocket-flight"><strong>🔁 Mission #${m.id} · ${rocketTypes[m.rocketType]?.name || m.rocketType}</strong><div>${bodies[m.source]?.name || m.source} (${m.sourceMode === 'orbit' ? 'Orbit' : 'Oberfläche'}) → ${bodies[m.destination]?.name || m.destination} (${m.destinationMode === 'orbit' ? 'Orbit' : 'Oberfläche'})</div><div>${resourceNames[m.resource] || m.resource}: ${m.amount} t/L · Wartezeit ${m.waitSeconds} s</div><div class="hint">Status: ${phase}${m.message ? ` · ${m.message}` : ''}</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">${m.status === 'paused' ? `<button class="mission-resume" data-mission-id="${m.id}">▶ Fortsetzen</button>` : (m.status === 'waiting' ? `<button class="mission-pause" data-mission-id="${m.id}">⏸ Pausieren</button>` : '<small>Pause erst nach Rückkehr möglich</small>')}<button class="mission-delete danger" data-mission-id="${m.id}">Mission löschen</button></div></div>`;
  }).join('');
}

function createOrbitMission() {
  const source = document.querySelector('#mission-source')?.value || state.selected;
  const type = document.querySelector('#mission-rocket-type')?.value || 'hercules1';
  const destination = document.querySelector('#mission-destination')?.value;
  let destinationMode = document.querySelector('#mission-destination-mode')?.value === 'orbit' ? 'orbit' : 'surface';
  if (!hasPlanetSurface(destination)) destinationMode = 'orbit';
  const sourceMode = document.querySelector('#mission-source-mode')?.value === 'orbit' ? 'orbit' : (document.querySelector('#mission-source-mode') ? 'surface' : (state.viewMode === 'orbit' ? 'orbit' : 'surface'));
  const resource = document.querySelector('#mission-resource')?.value || 'lithium';
  const amount = Math.max(0, Number(document.querySelector('#mission-amount')?.value) || 0);
  const waitSeconds = Math.max(0, Number(document.querySelector('#mission-wait')?.value) || 0);
  const capacity = type === 'titan1' ? 1500 : type === 'atlas1' ? 500 : type === 'hercules2' ? 300 : 120;
  if (!destination || destination === source || destination === 'sun') return rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.');
  if (amount <= 0 || amount > capacity) return rocketLaunchError(`Frachtmenge muss zwischen 0 und ${capacity} t/L liegen.`);
  if (resource === 'nickelOre' && !state.research?.completed?.nickelMining) return rocketLaunchError('Nickelerz ist global gesperrt. Schließe zuerst „Grabung nach Nickelerz“ ab.');
  if (sourceMode === 'surface' && Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Am Startplaneten wird eine Start- & Landerampe benötigt.');
  if (sourceMode === 'orbit' && getOrbitLandingPadCount(source) < 1) return rocketLaunchError('Für eine zyklische Orbitmission wird eine Orbit-Start- und Landevorrichtung am Startorbit benötigt.');
  if (destinationMode === 'surface' && Number(getBuildingsOnPlanet(destination).landingPad || 0) < 1) return rocketLaunchError('Für zyklische Oberflächenlieferungen wird am Ziel eine Start- & Landerampe benötigt.');
  if (!checkRocketLimit(1)) return;
  if (type === 'atlas1' && !state.research?.completed?.atlas1) return rocketLaunchError('Atlas 1 ist noch nicht erforscht.');
  if (type === 'titan1' && !state.research?.completed?.titan1) return rocketLaunchError('Schwerlastraketen (Titan 1) sind noch nicht erforscht.');
  ensureRocketData(source);
  if (getRocketStockCount(type, source, sourceMode) < 1) return rocketLaunchError(`Keine ${rocketTypes[type].name}-Rakete am ${sourceMode === 'orbit' ? 'Orbit' : 'Startplaneten'} verfügbar.`);
  changeRocketStock(type, source, sourceMode, -1);
  const now = gameNow();
  orbitMissions.push({ id: orbitMissionCounter++, source, sourceMode, destination, destinationMode, rocketType: type, resource, amount, waitSeconds, status: 'waiting', createdAt: now, nextLaunchAt: now, message: '', flightCount: 0 });
  recordLunaFlight(destination);
  saveGame(false); renderInfo();
  if (!document.querySelector('#cyclic-missions-panel')?.hidden) renderCyclicMissionsPanel();
}

let rocketControlRoot = infoPanel;
function bindOrbitMissionControls(root = rocketControlRoot) {
  const create = root.querySelector('#create-orbit-mission');
  if (create) create.addEventListener('click', createOrbitMission);
  root.querySelectorAll('.mission-pause').forEach(btn => btn.addEventListener('click', () => {
    const m = orbitMissions.find(x => String(x.id) === btn.dataset.missionId); if (!m) return;
    m.status = 'paused'; m.message = 'Vom Spieler pausiert'; saveGame(false); renderInfo(); if (!document.querySelector('#cyclic-missions-panel')?.hidden) renderCyclicMissionsPanel();
  }));
  root.querySelectorAll('.mission-resume').forEach(btn => btn.addEventListener('click', () => {
    const m = orbitMissions.find(x => String(x.id) === btn.dataset.missionId); if (!m) return;
    m.status = 'waiting'; m.message = ''; m.nextLaunchAt = gameNow(); saveGame(false); renderInfo(); if (!document.querySelector('#cyclic-missions-panel')?.hidden) renderCyclicMissionsPanel();
  }));
  root.querySelectorAll('.mission-delete').forEach(btn => btn.addEventListener('click', () => {
    const i = orbitMissions.findIndex(x => String(x.id) === btn.dataset.missionId); if (i < 0) return;
    const m = orbitMissions[i];
    // Wenn die Rakete gerade fliegt, lässt die Mission den Flug sicher zu Ende laufen.
    if (m.status === 'outbound' || m.status === 'returning') { m.deleteAfterReturn = true; m.message = 'Wird nach Rückkehr gelöscht'; }
    else { addRocketToStock(m.rocketType, m.source, m.sourceMode || 'surface'); orbitMissions.splice(i,1); }
    saveGame(false); renderInfo(); if (!document.querySelector('#cyclic-missions-panel')?.hidden) renderCyclicMissionsPanel();
  }));
}

function updateOrbitMissions(now = gameNow()) {
  let changed = false;
  for (const m of [...orbitMissions]) {
    if (m.status === 'paused') continue;
    if (m.status === 'waiting' && now >= Number(m.nextLaunchAt || 0)) {
      const storage = getLocationStorage(m.source, m.sourceMode === 'orbit' ? 'orbit' : 'surface');
      let fuelCost = rocketRoundTripFuelCost(m.rocketType, m.source, m.destination, m.sourceMode || 'surface', m.destinationMode || 'surface');
      if (m.sourceMode === 'orbit' && getOrbitLandingPadCount(m.source) < 1) {
        const message = 'Orbit-Start- und Landevorrichtung fehlt';
        if (m.message !== message) { m.message = message; changed = true; }
        continue;
      }
      const fuelAvailable = liquidFuelAmount(m.source, m.sourceMode === 'orbit' ? 'orbit' : 'surface');
      if (fuelAvailable + 0.000001 < fuelCost) {
        const locationLabel = m.sourceMode === 'orbit' ? 'Orbit-Flüssiglager' : 'Oberflächen-Flüssiglager';
        const message = `Wartet auf ${fuelCost.toLocaleString('de-DE')} L Treibstoff im ${locationLabel}`;
        if (m.message !== message) { m.message = message; changed = true; }
        continue;
      }
      const available = Math.max(0, Number(storage[m.resource] || 0));
      const capacity = m.rocketType === 'titan1' ? 1500 : m.rocketType === 'atlas1' ? 500 : m.rocketType === 'hercules2' ? 300 : 120;
      const loaded = Math.min(m.amount, capacity, available);
      // Bei vorübergehend leerem Lager bleibt die Mission aktiv und versucht
      // es beim nächsten Tick erneut, statt sich dauerhaft selbst zu pausieren.
      if (loaded <= 0.000001) {
        const message = `Wartet auf ${resourceNames[m.resource] || m.resource} im ${m.sourceMode === 'orbit' ? 'Orbitlager' : 'Oberflächenlager'}`;
        if (m.message !== message) { m.message = message; changed = true; }
        continue;
      }
      storage[m.resource] = available - loaded;
      if (fuelCost > 0) {
        const fuelMode = m.sourceMode === 'orbit' ? 'orbit' : 'surface';
        const fuelAvailable = liquidFuelAmount(m.source, fuelMode);
        ensureLiquidTankData(m.source).liquidFuel[fuelMode] = Math.max(0, fuelAvailable - fuelCost);
        m.lastFuelCost = fuelCost;
      }
      m.loadedAmount = loaded;
      m.message = loaded + 0.000001 < m.amount ? `Fracht unvollständig: ${loaded.toFixed(2)} von ${m.amount} geladen` : '';
      m.status = 'outbound'; m.startedAt = now;
      m.durationMs = flightDurationSeconds(m.destination, m.destinationMode || 'surface') * 1000;
      changed = true;
    } else if (m.status === 'outbound' && now - m.startedAt >= m.durationMs) {
      const targetStorage = getLocationStorage(m.destination, m.destinationMode === 'orbit' ? 'orbit' : 'surface');
      targetStorage[m.resource] = Number(targetStorage[m.resource] || 0) + Number(m.loadedAmount || 0);
      m.status = 'returning'; m.startedAt = now;
      m.durationMs = flightDurationSeconds(m.source, m.sourceMode === 'orbit' ? 'orbit' : 'surface') * 1000;
      changed = true;
    } else if (m.status === 'returning' && now - m.startedAt >= m.durationMs) {
      m.status = 'waiting'; m.returnedAt = now; m.nextLaunchAt = now + m.waitSeconds * 1000; m.loadedAmount = 0; m.flightCount = Number(m.flightCount || 0) + 1;
      if (m.deleteAfterReturn) { orbitMissions.splice(orbitMissions.findIndex(x => x.id === m.id), 1); addRocketToStock(m.rocketType, m.source, m.sourceMode || 'surface'); }
      changed = true;
    }
  }
  if (changed) { saveGame(false); renderInfo(); renderTopResources(); if (!document.querySelector('#cyclic-missions-panel')?.hidden) renderCyclicMissionsPanel(); }
}

function bindRocketControls() {
  const root = rocketControlRoot;
  const stationBtn=root.querySelector('#station-rockets-to-orbit'); if(stationBtn) stationBtn.addEventListener('click',()=>{ const type=root.querySelector('#station-rocket-type')?.value; const count=Math.max(1,Math.floor(Number(root.querySelector('#station-rocket-count')?.value)||1)); if(state.viewMode==='orbit')return; if(Number(getBuildingsOnPlanet(state.selected).landingPad||0)<1)return rocketLaunchError('Für die Stationierung wird eine Oberflächen-Startrampe benötigt.'); if(!getOrbitLandingPadCount(state.selected))return rocketLaunchError('Für die Stationierung wird eine Orbit-Start- und Landevorrichtung benötigt.'); const map=getRocketStockMap(type); if(!map)return; const available=Math.max(0,Number(map[state.selected]||0)); if(count>available)return rocketLaunchError(`Nur ${available} passende Raketen an der Oberfläche verfügbar.`); const free=getFreeOrbitRocketSlots(state.selected); if(count>free)return rocketLaunchError(`Nur ${free} freie Orbit-Stellplätze verfügbar. Baue weitere Orbit-Start- und Landevorrichtungen.`); map[state.selected]=available-count; changeRocketStock(type,state.selected,'orbit',count); saveGame(false); renderInfo(); showSaveStatus(`${count} ${rocketTypes[type]?.name||'Rakete'} dem Orbit von ${bodies[state.selected]?.name||state.selected} zugewiesen.`,true); });
  const tankBuild=root.querySelector('#build-tank-rocket'); if(tankBuild) tankBuild.addEventListener('click',()=>queueRocket('tankRocket'));
  const tankLaunch=root.querySelector('#launch-tank-rocket'); if(tankLaunch) tankLaunch.addEventListener('click',launchTankRocket);
  const b=root.querySelector('#build-hercules'); if(b)b.addEventListener('click',buildHercules1);
  const b2=root.querySelector('#build-hercules2'); if(b2)b2.addEventListener('click',buildHercules2);
  const ba=root.querySelector('#build-atlas1'); if(ba)ba.addEventListener('click',buildAtlas1);
  const bt=root.querySelector('#build-titan1'); if(bt)bt.addEventListener('click',buildTitan1);
  const bcs=root.querySelector('#build-colonist-shuttle'); if(bcs)bcs.addEventListener('click',()=>queueRocket('colonistShuttle'));
  const shuttleLaunch=root.querySelector('#launch-colonist-shuttle'); if(shuttleLaunch)shuttleLaunch.addEventListener('click',launchColonistShuttle);
  const shuttlePassengers=root.querySelector('#shuttle-passengers');
  const shuttlePassengersValue=root.querySelector('#shuttle-passengers-value');
  const shuttleDestination=root.querySelector('#shuttle-destination');
  const refreshShuttleAvailability=()=>{
    const destination=shuttleDestination?.value;
    const free=destination ? housingFree(destination) : 0;
    const freeLabel=root.querySelector('#shuttle-housing-free'); if(freeLabel) freeLabel.textContent=`${free} Plätze`;
    if(shuttleLaunch) shuttleLaunch.disabled=state.viewMode==='orbit' || Number(rocketStockColonistShuttle[state.selected]||0)<1 || !destination || Number(getBuildingsOnPlanet(state.selected).landingPad||0)<1 || Number(getBuildingsOnPlanet(destination).landingPad||0)<1 || Number(shuttlePassengers?.value||0)<1 || Number(shuttlePassengers?.value||0)>colonistsOnPlanet(state.selected) || Number(shuttlePassengers?.value||0)>free;
  };
  if(shuttlePassengers) shuttlePassengers.addEventListener('input',()=>{if(shuttlePassengersValue)shuttlePassengersValue.textContent=shuttlePassengers.value;refreshShuttleAvailability();});
  if(shuttleDestination) shuttleDestination.addEventListener('change',refreshShuttleAvailability);
  refreshShuttleAvailability();
  const bmm=root.querySelector('#build-mobile-miner'); if(bmm)bmm.addEventListener('click',buildMobileMiner);
  const d=root.querySelector('#rocket-destination'); if(d)d.addEventListener('change',()=>{rocketDestination=d.value;renderInfo();});
  const dm=root.querySelector('#rocket-destination-mode'); if(dm)dm.addEventListener('change',()=>{rocketDestinationMode=dm.value === 'orbit' ? 'orbit' : 'surface';renderInfo();});
  const m=root.querySelector('#rocket-minus'); if(m)m.addEventListener('click',()=>{rocketQuantity=Math.max(1,rocketQuantity-1);renderInfo();});
  const p=root.querySelector('#rocket-plus'); if(p)p.addEventListener('click',()=>{rocketQuantity=Math.min(Math.max(1,getRocketStockCount('hercules1',state.selected,state.viewMode==='orbit'?'orbit':'surface')),rocketQuantity+1);renderInfo();});
  const resource=root.querySelector('#rocket-cargo-resource');
  if(resource) resource.addEventListener('change',()=>{rocketCargoResource=resource.value;rocketCargoAmount=Math.min(120,Number(getLocationStorage(state.selected,state.viewMode === 'orbit' ? 'orbit' : 'surface')[rocketCargoResource] || 0));renderInfo();});
  const number=root.querySelector('#rocket-cargo-number');
  if(number) number.addEventListener('input',()=>{rocketCargoAmount=Math.max(0,Math.min(Number(number.max),Number(number.value)||0));});

  root.querySelectorAll('.cargo-add').forEach(el=>el.addEventListener('click',()=>{
    if (rocketCargoSlots.length >= 20) return;
    const capacity = el.closest('.titan1-launch') ? 1500 : el.closest('.atlas1-launch') ? 500 : 300;
    const currentTotal = rocketCargoSlots.reduce((sum, slot) => sum + (Number(slot.amount)||0), 0);
    if (currentTotal >= capacity) return;
    rocketCargoSlots.push({resource:'stone',amount:0});
    renderInfo(); saveGame(false);
  }));
  root.querySelectorAll('.cargo-remove').forEach(el=>el.addEventListener('click',()=>{
    const i=Number(el.dataset.slot);
    if (rocketCargoSlots.length <= 1) rocketCargoSlots[0]={resource:'stone',amount:0};
    else rocketCargoSlots.splice(i,1);
    renderInfo(); saveGame(false);
  }));
  root.querySelectorAll('.rocket-h2-resource').forEach(el=>el.addEventListener('change',()=>{
    const i=Number(el.dataset.slot);
    rocketCargoSlots[i].resource=el.value;
    const available=getPlayerResourceAmount(el.value,state.selected);
    rocketCargoSlots[i].amount=Math.min(Number(rocketCargoSlots[i].amount)||0,available,1500);
    renderInfo();
  }));
  root.querySelectorAll('.rocket-h2-amount').forEach(el=>el.addEventListener('input',()=>{
    const i=Number(el.dataset.slot);
    const available=Number(getLocationStorage(state.selected, state.viewMode === 'orbit' ? 'orbit' : 'surface')[rocketCargoSlots[i]?.resource] || 0);
    rocketCargoSlots[i].amount=Math.max(0,Math.min(1500,available,Number(el.value)||0));
    const range=root.querySelector(`.rocket-h2-range[data-slot="${i}"]`);
    if(range) range.value=rocketCargoSlots[i].amount;
    const row=el.closest('.dynamic-cargo-row');
    const amountLabel=row?.querySelector('.cargo-amount-label');
    if(amountLabel) amountLabel.firstChild.textContent=`Menge (${['crudeOil','water'].includes(rocketCargoSlots[i].resource) ? 'L' : 't'})`;
  }));
  root.querySelectorAll('.rocket-h2-range').forEach(el=>el.addEventListener('input',()=>{
    const i=Number(el.dataset.slot);
    if(!rocketCargoSlots[i]) return;
    rocketCargoSlots[i].amount=Math.max(0,Math.min(1500,Number(el.max)||1500,Number(el.value)||0));
    const number=root.querySelector(`.rocket-h2-amount[data-slot="${i}"]`);
    if(number) number.value=rocketCargoSlots[i].amount.toFixed(2);
  }));
  const l=root.querySelector('#launch-hercules'); if(l)l.addEventListener('click',()=>launchHercules1(state.selected,rocketDestination,rocketQuantity));
  const launchFleet=(type, countId, launchFn)=>{
    const button=root.querySelector(`#launch-${type}`);
    if(!button) return;
    button.addEventListener('click',()=>{
      const countInput=root.querySelector(`#${countId}`);
      const count=Math.max(1,Math.min(99,Number(countInput?.value)||1));
      const stock=type==='hercules2'?(rocketStock2[state.selected]||0):type==='atlas1'?(rocketStockAtlas1[state.selected]||0):(rocketStockTitan1[state.selected]||0);
      if(count>stock){rocketLaunchError(`Du hast nur ${stock} Rakete(n) dieses Typs verfügbar.`);return;}
      if(!checkRocketLimit(count)) return;
      const original=rocketCargoSlots.map(slot=>({...slot}));
      const capacity=type==='hercules2'?300:type==='atlas1'?500:1500;
      const total=original.reduce((sum,slot)=>sum+Math.max(0,Number(slot.amount)||0),0);
      if(total>capacity*count+0.000001){rocketLaunchError(`Die Gesamtfracht überschreitet die Kapazität von ${count} Rakete(n).`);return;}
      rocketCargoSlots=original.map(slot=>({...slot,amount:(Number(slot.amount)||0)/count}));
      for(let n=0;n<count;n++){
        const before=type==='hercules2'?(rocketStock2[state.selected]||0):type==='atlas1'?(rocketStockAtlas1[state.selected]||0):(rocketStockTitan1[state.selected]||0);
        if(before<=0) break;
        launchFn(state.selected,rocketDestination);
      }
      rocketCargoSlots=original;
      renderInfo(); saveGame(false);
    });
  };
  launchFleet('hercules2','rocket-count-hercules2',launchHercules2);
  launchFleet('atlas1','rocket-count-atlas1',launchAtlas1);
  launchFleet('titan1','rocket-count-titan1',launchTitan1);
  root.querySelectorAll('.rocket-land').forEach(x=>x.addEventListener('click',()=>{
    const r=rockets.find(r=>String(r.id)===String(x.dataset.rocketId));
    if(!r || r.status!=='orbit' || !rocketCanLand(r.to)) return;
    const targetStorage=getPlanetStorage(r.to);
    if (r.type === 'colonistShuttle') {
      const passengerCount = Math.max(0, Number(r.passengers) || 0);
      if (housingCapacity(r.to) - colonistsOnPlanet(r.to) < passengerCount) { rocketLaunchError(`Auf ${bodies[r.to].name} werden noch ${passengerCount} freie Wohnplätze benötigt.`); return; }
      const delivered = addColonistsFromShuttle(r.to, passengerCount);
      if (delivered !== passengerCount) { rocketLaunchError('Die Kolonisten konnten nicht vollständig untergebracht werden.'); return; }
      targetStorage.food = Number(targetStorage.food || 0) + Number(r.supplyCargo?.food || 0);
      targetStorage.water = Number(targetStorage.water || 0) + Number(r.supplyCargo?.water || 0);
      r.passengersDelivered = true; r.supplyCargoDelivered = true; r.message = 'Kolonisten und Versorgung entladen';
    } else if(Array.isArray(r.cargo)){
      r.deliveredCargo=r.cargo.map(c=>({...c}));
      r.cargo.forEach(c=>{ if(c.amount>0) targetStorage[c.resource]=Number(targetStorage[c.resource]||0)+c.amount; c.amount=0; });
    } else if(r.cargo && r.cargo.amount>0){
      targetStorage[r.cargo.resource]=Number(targetStorage[r.cargo.resource]||0)+r.cargo.amount;
      r.deliveredCargo={...r.cargo}; r.cargo.amount=0;
    }
    r.status='landed'; r.landedAt=gameNow(); playUiSound('build'); renderInfo(); renderTopResources(); saveGame(false);
  }));
  root.querySelectorAll('.rocket-return').forEach(x=>x.addEventListener('click',()=>{
    const id=x.dataset.rocketId;
    const resourceEl=root.querySelector(`.rocket-return-resource[data-rocket-id="${id}"]`);
    const amountEl=root.querySelector(`.rocket-return-amount[data-rocket-id="${id}"]`);
    returnRocket(id, resourceEl?.value || null, Number(amountEl?.value) || 0);
  }));
  bindOrbitMissionControls();
  renderConstructionQueue();
}

function ensureForesterBuildQueue(id) {
  if (!bodies[id] || id === 'sun') return [];
  if (!Array.isArray(bodies[id].foresterBuildQueue)) bodies[id].foresterBuildQueue = [];
  bodies[id].foresterBuildQueue = bodies[id].foresterBuildQueue.filter(item => Number.isFinite(Number(item?.started)) && item.id != null);
  return bodies[id].foresterBuildQueue;
}

function ensureAtmosphereRegulatorBuildQueue(id) {
  if (!bodies[id] || id === 'sun') return [];
  if (!Array.isArray(bodies[id].atmosphereRegulatorBuildQueue)) bodies[id].atmosphereRegulatorBuildQueue = [];
  bodies[id].atmosphereRegulatorBuildQueue = bodies[id].atmosphereRegulatorBuildQueue.filter(
    item => Number.isFinite(Number(item?.started)) && item.id != null
  );
  return bodies[id].atmosphereRegulatorBuildQueue;
}

function renderConstructionQueue() {
  const panel = document.querySelector('#construction-queue-panel');
  const content = document.querySelector('#construction-queue-content');
  const planetLabel = document.querySelector('#construction-queue-planet');
  if (!panel || !content || !planetLabel) return;
  const id = state.selected;
  const name = bodies[id]?.name || id;
  planetLabel.textContent = `Bauaufträge auf ${name} · unabhängig pro Planet`;
  const now = gameNow();
  const jobs = [];
  if (Number(outpostBuildQueue[id] || 0) > 0) {
    const elapsed = Math.max(0, now - Number(outpostBuildStarted[id] || now));
    jobs.push({key:'outpost', name:'Außenposten', icon:'🛰️', elapsed, duration:60000, costs:{steel:100}});
  }
  if (Number(rocketFactoryBuildQueue[id] || 0) > 0) {
    const elapsed = Math.max(0, now - Number(rocketFactoryBuildStarted[id] || now));
    jobs.push({key:'rocketFactory', name:'Raketenfabrik', icon:'🚀', elapsed, duration:60000, costs:{steel:1000,buildingMaterials:2000}});
  }
  ensureAtmosphereRegulatorBuildQueue(id).forEach((item, index) => {
    const elapsed = Math.max(0, now - Number(item.started || now));
    jobs.push({key:`atmosphere-regulator-${index}`, name:'Atmosphären-Regulator', icon:'🌐', elapsed, duration:10000, costs:{steel:200,buildingMaterials:200}});
  });
  ensureForesterBuildQueue(id).forEach((item, index) => {
    const elapsed = Math.max(0, now - Number(item.started || now));
    jobs.push({key:`forester-${index}`, name:'Förster', icon:'🌳', elapsed, duration:120000, costs:{steel:290,polymers:100,chips:150,glass:100}});
  });
  if (!jobs.length) {
    content.innerHTML = '<p class="construction-queue-empty">Keine aktiven Bauaufträge auf diesem Planeten. Gebäude mit Bauzeit erscheinen hier automatisch.</p>';
    return;
  }
  content.innerHTML = `<div class="construction-queue-list">${jobs.map(job => {
    const pct = Math.min(100, Math.max(0, job.elapsed / job.duration * 100));
    const remaining = Math.max(0, Math.ceil((job.duration-job.elapsed)/1000));
    return `<div class="construction-queue-item"><div><strong>${job.icon} ${job.name}</strong><small>${pct.toFixed(0)} % · noch ${remaining} Spielsekunden</small><div class="construction-queue-progress"><i style="width:${pct}%"></i></div></div><button type="button" data-cancel-construction="${job.key}">Abbrechen · Erstattung</button></div>`;
  }).join('')}</div>`;
  content.querySelectorAll('[data-cancel-construction]').forEach(button => button.addEventListener('click', () => cancelTimedConstruction(id, button.dataset.cancelConstruction)));
}
function cancelTimedConstruction(id, key) {
  const storage = getPlanetStorage(id);
  if (key === 'outpost' && Number(outpostBuildQueue[id] || 0) > 0) {
    storage.steel = Number(storage.steel || 0) + 100;
    outpostBuildQueue[id] = 0; outpostBuildStarted[id] = 0;
  } else if (key === 'rocketFactory' && Number(rocketFactoryBuildQueue[id] || 0) > 0) {
    storage.steel = Number(storage.steel || 0) + 1000;
    storage.buildingMaterials = Number(storage.buildingMaterials || 0) + 2000;
    rocketFactoryBuildQueue[id] = 0; rocketFactoryBuildStarted[id] = 0;
  } else if (String(key).startsWith('atmosphere-regulator-')) {
    const index = Number(String(key).slice('atmosphere-regulator-'.length));
    const queue = ensureAtmosphereRegulatorBuildQueue(id);
    if (!Number.isInteger(index) || index < 0 || index >= queue.length) return;
    queue.splice(index, 1);
    storage.steel = Number(storage.steel || 0) + 200;
    storage.buildingMaterials = Number(storage.buildingMaterials || 0) + 200;
  } else if (String(key).startsWith('forester-')) {
    const index = Number(String(key).slice('forester-'.length));
    const queue = ensureForesterBuildQueue(id);
    if (!Number.isInteger(index) || index < 0 || index >= queue.length) return;
    queue.splice(index, 1);
    storage.steel = Number(storage.steel || 0) + 290;
    storage.polymers = Number(storage.polymers || 0) + 100;
    storage.chips = Number(storage.chips || 0) + 150;
    storage.glass = Number(storage.glass || 0) + 100;
  } else return;
  playUiSound('click');
  renderConstructionQueue(); renderTopResources(); renderSystem(); renderInfo(); saveGame(false);
}

function updateOutposts(now) {
  Object.keys(outpostBuildQueue).forEach(id => {
    if (outpostBuildQueue[id] > 0 && now - (outpostBuildStarted[id] || 0) >= 60000) {
      getBuildingsOnPlanet(id).outpost = 1;
      outpostBuildQueue[id] = 0;
      outpostBuildStarted[id] = 0;
      renderSystem(); renderInfo(); renderConstructionQueue();
    }
  });
}

function updateAtmosphereRegulatorConstruction(now) {
  let changed = false;
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    const queue = ensureAtmosphereRegulatorBuildQueue(id);
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - Number(queue[i].started || now) < 10000) continue;
      const buildings = getBuildingsOnPlanet(id);
      buildings.atmosphereRegulator = Number(buildings.atmosphereRegulator || 0) + 1;
      queue.splice(i, 1);
      changed = true;
    }
  });
  if (changed) {
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue();
    saveGame(false);
  }
}

function updateForesterConstruction(now) {
  let changed = false;
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    const queue = ensureForesterBuildQueue(id);
    for (let i = queue.length - 1; i >= 0; i--) {
      if (now - Number(queue[i].started || now) < 120000) continue;
      const bld = getBuildingsOnPlanet(id);
      bld.forester = Number(bld.forester || 0) + 1;
      queue.splice(i, 1);
      changed = true;
    }
  });
  if (changed) {
    playUiSound('build');
    renderSystem(); renderInfo(); renderTopResources(); renderConstructionQueue();
    saveGame(false);
  }
}

function updateRocketFactoryConstruction(now) {
  Object.keys(rocketFactoryBuildQueue).forEach(id => {
    if (rocketFactoryBuildQueue[id] > 0 && now - (rocketFactoryBuildStarted[id] || 0) >= 60000) {
      getBuildingsOnPlanet(id).rocketFactory = 1;
      rocketFactoryBuildQueue[id] = 0;
      rocketFactoryBuildStarted[id] = 0;
      playUiSound('build');
      renderSystem(); renderInfo(); renderConstructionQueue();
    }
  });
}

function updateRockets(now) {
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    ensureRocketData(id);
    for (const mode of ['surface','orbit']) { const key=liquidTankLocationKey(id,mode); if(Number(liquidTankBuildQueue[key]||0)>0 && now-Number(liquidTankBuildStarted[key]||now)>=30000) { ensureLiquidTankData(id).liquidTanks[mode]+=1; delete liquidTankBuildQueue[key]; delete liquidTankBuildStarted[key]; playUiSound('build'); renderSystem(); renderInfo(); renderTopResources(); saveGame(false); } }
    if (Array.isArray(rocketFactoryQueue[id]) && rocketFactoryQueue[id].length && now - (rocketFactoryStarted[id] || now) >= ((rocketTypes[rocketFactoryQueue[id][0]]?.buildTime || 60) * 1000)) {
      const type = rocketFactoryQueue[id].shift();
      if (type === 'hercules1') rocketStock[id] = (rocketStock[id] || 0) + 1;
      if (type === 'hercules2') rocketStock2[id] = (rocketStock2[id] || 0) + 1;
      if (type === 'atlas1') rocketStockAtlas1[id] = (rocketStockAtlas1[id] || 0) + 1;
      if (type === 'titan1') rocketStockTitan1[id] = (rocketStockTitan1[id] || 0) + 1;
      if (type === 'colonistShuttle') rocketStockColonistShuttle[id] = (rocketStockColonistShuttle[id] || 0) + 1;
      if (type === 'mobileMiner') { rocketStockMobileMiner[id] = (rocketStockMobileMiner[id] || 0) + 1; if (!document.querySelector('#asteroids-panel')?.hidden) renderAsteroidsPanel(); }
      if (type === 'tankRocket') rocketStockTankRocket[id] = (rocketStockTankRocket[id] || 0) + 1;
      rocketFactoryStarted[id] = rocketFactoryQueue[id].length ? now : 0;
      playUiSound('build'); renderInfo();
    }
    // Legacy-Warteschlangen aus älteren Spielständen noch fertigstellen.
    if (rocketBuildQueue[id] > 0 && now - rocketBuildStarted[id] >= 30000) { rocketStock[id] += rocketBuildQueue[id]; rocketBuildQueue[id]=0; rocketBuildStarted[id]=0; }
    if (rocketBuildQueue2[id] > 0 && now - rocketBuildStarted2[id] >= 30000) { rocketStock2[id] += rocketBuildQueue2[id]; rocketBuildQueue2[id]=0; rocketBuildStarted2[id]=0; }
    if (rocketBuildQueueAtlas1[id] > 0 && now - rocketBuildStartedAtlas1[id] >= 30000) { rocketStockAtlas1[id] += rocketBuildQueueAtlas1[id]; rocketBuildQueueAtlas1[id]=0; rocketBuildStartedAtlas1[id]=0; }
  });
  for (const rocket of rockets) {
    if (rocket.status === 'returned') continue;
    if ((rocket.status === 'outbound' || rocket.status === 'returning') && now - rocket.started >= rocket.duration) {
      if (rocket.status === 'outbound') {
        rocket.arrivedAt = now;
        if (rocket.type === 'colonistShuttle') {
          const targetStorage = getPlanetStorage(rocket.to);
          const passengerCount = Math.max(0, Number(rocket.passengers) || 0);
          if (housingCapacity(rocket.to) - colonistsOnPlanet(rocket.to) < passengerCount) {
            rocket.status = 'orbit';
            rocket.message = `Wartet auf ${passengerCount} freie Wohnplätze`;
          } else {
            const delivered = addColonistsFromShuttle(rocket.to, passengerCount);
            if (delivered !== passengerCount) {
              rocket.status = 'orbit';
              rocket.message = `Wartet auf ${passengerCount} freie Wohnplätze`;
            } else {
              targetStorage.food = Number(targetStorage.food || 0) + Number(rocket.supplyCargo?.food || 0);
              targetStorage.water = Number(targetStorage.water || 0) + Number(rocket.supplyCargo?.water || 0);
              rocket.supplyCargoDelivered = true;
              rocket.passengersDelivered = true;
              rocket.status = 'landed';
              rocket.message = 'Kolonisten und Versorgung entladen';
            }
          }
        } else {
          // Ankunftsort aus der beim Start gespeicherten Zielauswahl übernehmen.
          // Bisher wurden normale Frachtraketen unabhängig von targetMode immer im Orbit abgelegt.
          rocket.status = rocket.targetMode === 'surface' && hasPlanetSurface(rocket.to) ? 'landed' : 'orbit';
        }
        if (rocket.type !== 'colonistShuttle' && rocket.type !== 'tankRocket' && rocket.targetMode !== 'orbit' && rocket.status === 'landed') {
          const targetStorage = getLocationStorage(rocket.to, 'surface');
          if (!rocket.cargoDelivered) {
            if (Array.isArray(rocket.cargo)) {
              rocket.deliveredCargo = rocket.cargo.map(c => ({...c}));
              rocket.cargo.forEach(c => { if (c.amount > 0) targetStorage[c.resource] = Number(targetStorage[c.resource] || 0) + c.amount; c.amount = 0; });
            } else if (rocket.cargo && rocket.cargo.amount > 0) {
              targetStorage[rocket.cargo.resource] = Number(targetStorage[rocket.cargo.resource] || 0) + rocket.cargo.amount;
              rocket.deliveredCargo = {...rocket.cargo}; rocket.cargo.amount = 0;
            }
            rocket.cargoDelivered = true;
          }
        }
        if (rocket.type === 'tankRocket' && rocket.targetMode === 'orbit' && !rocket.fuelDelivered) {
          const tankData = ensureLiquidTankData(rocket.to);
          const fuelAmount = Math.max(0, Number(rocket.fuelCargoLiters) || 0);
          const freeFuelCapacity = Math.max(0, liquidTankCapacity(rocket.to, 'orbit') - liquidFuelAmount(rocket.to, 'orbit'));
          if (fuelAmount > freeFuelCapacity + 0.000001) {
            rocket.status = 'orbit';
            rocket.message = 'Orbit-Flüssiglager hat nicht genügend freien Platz; Treibstoff bleibt an Bord';
          } else {
            tankData.liquidFuel.orbit = Number(tankData.liquidFuel.orbit || 0) + fuelAmount;
            rocket.fuelDelivered = true;
            rocket.message = 'Treibstoff ins Orbitlager geliefert';
          }
        }
        if (rocket.targetMode === 'orbit' && rocket.type !== 'colonistShuttle' && rocket.type !== 'tankRocket') {
          const targetStorage = getLocationStorage(rocket.to, 'orbit');
          if (!rocket.cargoDelivered) {
            if (Array.isArray(rocket.cargo)) {
              rocket.deliveredCargo = rocket.cargo.map(c => ({...c}));
              rocket.cargo.forEach(c => { if (c.amount > 0) targetStorage[c.resource] = Number(targetStorage[c.resource] || 0) + c.amount; c.amount = 0; });
            } else if (rocket.cargo && rocket.cargo.amount > 0) {
              targetStorage[rocket.cargo.resource] = Number(targetStorage[rocket.cargo.resource] || 0) + rocket.cargo.amount;
              rocket.deliveredCargo = {...rocket.cargo}; rocket.cargo.amount = 0;
            }
            rocket.cargoDelivered = true;
          }
        }
      } else if (rocket.status === 'returning') {
        // Rückkehr immer vollständig abschließen: Rückfracht verbuchen UND Rakete
        // wieder dem Bestand ihres ursprünglichen Startortes gutschreiben.
        rocket.status = 'returned';
        rocket.returnedAt = now;
        if (rocket.returnCargo && rocket.returnCargo.resource && rocket.returnCargo.amount > 0) {
          const targetStorage = getLocationStorage(rocket.to, rocket.returnMode === 'orbit' ? 'orbit' : 'surface');
          targetStorage[rocket.returnCargo.resource] = Number(targetStorage[rocket.returnCargo.resource] || 0) + rocket.returnCargo.amount;
        }
        if (rocket.type === 'tankRocket' && !rocket.fuelDelivered && Number(rocket.fuelCargoLiters || 0) > 0) {
          const fuelData = ensureLiquidTankData(rocket.to);
          const freeSurfaceCapacity = Math.max(0, liquidTankCapacity(rocket.to, 'surface') - liquidFuelAmount(rocket.to, 'surface'));
          const returnedFuel = Math.min(freeSurfaceCapacity, Number(rocket.fuelCargoLiters) || 0);
          fuelData.liquidFuel.surface = Number(fuelData.liquidFuel.surface || 0) + returnedFuel;
          if (returnedFuel + 0.000001 < Number(rocket.fuelCargoLiters || 0)) rocket.message = 'Nicht der gesamte nicht gelieferte Treibstoff passte zurück ins Oberflächen-Flüssiglager.';
        }
        if (rocket.type === 'colonistShuttle' && !rocket.passengersDelivered) {
          const restored = addColonistsFromShuttle(rocket.to, Number(rocket.passengers) || 0);
          if (restored < Number(rocket.passengers || 0)) rocket.message = `Nicht alle Kolonisten konnten zurückkehren (${restored}/${rocket.passengers}).`;
          const sourceStorage = getPlanetStorage(rocket.to);
          if (!rocket.supplyCargoDelivered) { sourceStorage.food = Number(sourceStorage.food || 0) + Number(rocket.supplyCargo?.food || 0); sourceStorage.water = Number(sourceStorage.water || 0) + Number(rocket.supplyCargo?.water || 0); }
        }
        addRocketToStock(rocket.type, rocket.from, rocket.fromMode || 'surface');
      }
      saveGame(false);
      rocketUiChanged = true;
    }
  }
  if (rocketUiChanged) {
    renderInfo();
    renderTopResources();
  }
}

function updateVehicleFactoryConstruction(now = gameNow()) {
  let completedAny = false;
  for (const id of Object.keys(bodies)) {
    if (id === 'sun') continue;
    const queue = ensureVehicleFactoryQueue(id);
    const ready = queue.filter(item => now - Number(item.started) >= 120000);
    if (!ready.length) continue;
    const bld = getBuildingsOnPlanet(id);
    bld.vehicleFactory = Number(bld.vehicleFactory || 0) + ready.length;
    const readySet = new Set(ready);
    bodies[id].vehicleFactoryBuildQueue = queue.filter(item => !readySet.has(item));
    completedAny = true;
  }
  if (completedAny) {
    playUiSound('build');
    const menu = document.querySelector('.planet-build-menu');
    const scrollTop = menu?.scrollTop || 0;
    const scrollLeft = menu?.scrollLeft || 0;
    renderSystem();
    const nextMenu = document.querySelector('.planet-build-menu');
    if (nextMenu) { nextMenu.scrollTop = scrollTop; nextMenu.scrollLeft = scrollLeft; }
    renderInfo(); renderTopResources();
    saveGame(false);
  }
}

function totalPoweredForesters() {
  return Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => {
    const count = Math.max(0, Number(getBuildingsOnPlanet(id).forester) || 0);
    return sum + Math.floor(count * newBuildingPowerFactor(id) + 1e-9);
  }, 0);
}

function updateForestRegeneration(delta) {
  if (!bodies.earth || !(delta > 0)) return;
  const resources = bodies.earth.resources || (bodies.earth.resources = {});
  if (!Number.isFinite(Number(resources.trees))) resources.trees = 10000;
  const current = Math.max(0, Number(resources.trees) || 0);
  const hourlyBase = current / 1000;
  const foresterBonus = totalPoweredForesters() * 0.005;
  resources.trees = current + hourlyBase * (1 + foresterBonus) * (delta / 3600);
}

function atmosphereMassForPressure(planetId, pressureBar) {
  const planet = PLANET_ATMOSPHERE_PHYSICS[planetId];
  if (!planet || !(pressureBar > 0)) return 0;
  return pressureBar * 100000 * (4 * Math.PI * planet.radiusM * planet.radiusM) /
    (planet.gravity * 1000 * ATMOSPHERE_GAME_SCALE);
}
function ensurePlanetAtmosphere(planetId) {
  const planet = bodies[planetId];
  if (!planet || planetId === 'sun') return null;
  const hadAtmosphere = !!(planet.atmosphere && typeof planet.atmosphere === 'object');
  if (!hadAtmosphere) planet.atmosphere = {};
  const atmosphere = planet.atmosphere;
  if (!atmosphere.gases || typeof atmosphere.gases !== 'object') atmosphere.gases = {};
  // Erstinitialisierung: bestehende Erdatmosphäre bleibt erhalten, Venus behält ihr
  // CO₂ als Atmosphäre, Gasriesen starten mit deutlich höherem Druck.
  if (!Number.isFinite(Number(atmosphere.totalGas))) {
    const initialPressure = { jupiter: 1000, saturn: 1000, uranus: 100, neptune: 108, mars: 0.006, mercury: 0.000, luna: 0, ceres: 0, pluto: 0, io: 0 };
    if (planetId === 'venus') {
      atmosphere.totalGas = Math.max(0, Number(planet.resources?.co2) || Number(atmosphere.co2Initial) || 0);
      atmosphere.gases.co2 = 0;
    } else {
      atmosphere.totalGas = atmosphereMassForPressure(planetId, initialPressure[planetId] || 0);
      const initialMixes = {
        mercury: { oxygen: 0.42, sodium: 0.29, hydrogen: 0.18, helium: 0.07, potassium: 0.04 },
        mars: { co2: 0.953, nitrogen: 0.027, argon: 0.016, oxygen: 0.0013, carbonMonoxide: 0.0027 },
        jupiter: { hydrogen: 0.90, helium: 0.10 },
        saturn: { hydrogen: 0.96, helium: 0.035, methane: 0.005 },
        uranus: { hydrogen: 0.83, helium: 0.15, methane: 0.02 },
        neptune: { hydrogen: 0.80, helium: 0.19, methane: 0.01 },
        io: { sulfurDioxide: 0.90, co2: 0.05, oxygen: 0.05 },
        pluto: { nitrogen: 0.98, methane: 0.015, carbonMonoxide: 0.005 }
      };
      const mix = initialMixes[planetId];
      if (mix && atmosphere.totalGas > 0) {
        for (const [gasKey, fraction] of Object.entries(mix)) {
          if (ATMOSPHERE_RELEASE_GASES[gasKey]) atmosphere.gases[gasKey] = atmosphere.totalGas * fraction;
        }
      }
    }
  }
  atmosphere.totalGas = Math.max(0, Number(atmosphere.totalGas) || 0);
  // Ältere Spielstände mit vorhandener Gesamtmasse, aber ohne Gasverteilung erhalten
  // eine passende Startzusammensetzung, ohne vorhandene Terraforming-Gase zu überschreiben.
  if (atmosphere.totalGas > 0 && Object.values(atmosphere.gases).every(amount => !(Number(amount) > 0))) {
    const savedMixes = {
      mercury: { oxygen: 0.42, hydrogen: 0.18, helium: 0.07 },
      venus: { co2: 0.965, nitrogen: 0.035 },
      mars: { co2: 0.953, nitrogen: 0.027, argon: 0.016, oxygen: 0.0013, carbonMonoxide: 0.0027 },
      jupiter: { hydrogen: 0.90, helium: 0.10 },
      saturn: { hydrogen: 0.96, helium: 0.035, methane: 0.005 },
      uranus: { hydrogen: 0.83, helium: 0.15, methane: 0.02 },
      neptune: { hydrogen: 0.80, helium: 0.19, methane: 0.01 },
      io: { sulfurDioxide: 0.90, co2: 0.05, oxygen: 0.05 },
      pluto: { nitrogen: 0.98, methane: 0.015, carbonMonoxide: 0.005 }
    };
    const mix = savedMixes[planetId];
    if (mix) for (const [gasKey, fraction] of Object.entries(mix)) {
      if (ATMOSPHERE_RELEASE_GASES[gasKey]) atmosphere.gases[gasKey] = atmosphere.totalGas * fraction;
    }
  }
  // Migration: ältere Spielstände können eine leere Erdatmosphäre gespeichert
  // haben. Nur wenn keinerlei Gasdaten existieren, Startatmosphäre ergänzen.
  if (planetId === 'earth' && atmosphere.totalGas <= 0 &&
      Object.values(atmosphere.gases).every(amount => !(Number(amount) > 0))) {
    atmosphere.totalGas = 1089213113205.7233;
    atmosphere.gases.nitrogen = 850457598791.0288;
    atmosphere.gases.oxygen = 228190147216.59903;
    atmosphere.gases.argon = 10129681952.813227;
    atmosphere.gases.co2 = 435685245.2822893;
    atmosphere.oxygen = atmosphere.gases.oxygen;
    atmosphere.composition = 'earth-standard-v1';
  }
  for (const key of Object.keys(ATMOSPHERE_RELEASE_GASES)) {
    atmosphere.gases[key] = Math.max(0, Number(atmosphere.gases[key]) || 0);
  }
  atmosphere.oxygen = Math.max(0, Number(atmosphere.oxygen ?? atmosphere.gases.oxygen) || 0);
  if (planetId === 'venus') {
    // Die noch vorhandene Venus-CO₂-Ressource ist Teil ihrer Atmosphäre.
    const remainingCo2 = Math.max(0, Number(planet.resources?.co2) || 0);
    const releasedGas = Object.values(atmosphere.gases).reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
    atmosphere.totalGas = remainingCo2 + releasedGas;
  }
  return atmosphere;
}

function updateAtmosphereRegulators(planetId, storage, buildings, delta) {
  const count = Math.max(0, Number(buildings.atmosphereRegulator) || 0);
  if (!count || !(delta > 0)) return;
  const atmosphere = ensurePlanetAtmosphere(planetId);
  if (!atmosphere) return;
  // Jeder Regulator überführt bis zu 0,2 t CO₂ pro Ingame-Sekunde
  // aus dem lokalen Oberflächenlager in die Atmosphäre.
  const requested = 0.2 * count * delta;
  const available = Math.max(0, Number(storage.co2) || 0);
  const transferred = Math.min(requested, available);
  if (!(transferred > 0)) return;
  storage.co2 = Math.max(0, available - transferred);
  atmosphere.gases.co2 = Math.max(0, Number(atmosphere.gases.co2) || 0) + transferred;
  atmosphere.totalGas = Math.max(0, Number(atmosphere.totalGas) || 0) + transferred;
  if (planetId === 'luna') {
    // Der Mond-Druck liest totalGas; halte zusätzlich das bisherige CO₂-Feld aktuell.
    atmosphere.totalGas = Math.max(0, Number(atmosphere.totalGas) || 0);
  }
}

function updateResources() {
  const now = gameNow();
  updateMarket(now);
  updateCompanyOrders(now);
  updateAICompanies(now);
  updateStockMarket(now);
  updateStockDividends(now);
  updateSolarProbeFlights();
  const delta = Math.max(0, (now - state.lastUpdate) / 1000);
  state.lastUpdate = now;
  updateForestRegeneration(delta);
  updateVehicleFactoryConstruction(now);
  updateForesterConstruction(now);
  updateAtmosphereRegulatorConstruction(now);

  Object.entries(bodies).forEach(([id, planet]) => {
    if (id === 'sun') return;
    const bld = getBuildingsOnPlanet(id);
    enforceCO2StorageCapacity(id);
    const storage = getPlanetStorage(id);
    updateBatteryStorage(id, delta);
    updateAtmosphereRegulators(id, storage, bld, delta);
    // Kupfer wird auf jedem Planeten fair auf alle gleichzeitig kupferverbrauchenden
    // Produktionsgebäude verteilt. Die gleiche Versorgungsquote verhindert, dass
    // die zuerst ausgeführten Produktionsblöcke das Kupfer vollständig aufbrauchen.
    const totalCopperNeed = (
      lithiumRefineryCopperUse(id) +
      machineFactoryCopperUse(id) +
      chipFactoryCopperUse(id) +
      electronicsFactoryCopperUse(id)
    ) * delta;
    const availableCopperAtTickStart = Math.max(0, Number(storage.copper || 0));
    const copperAllocationFactor = totalCopperNeed > 0
      ? Math.min(1, availableCopperAtTickStart / totalCopperNeed)
      : 1;
    // Kupfer wird auf jedem Planeten fair auf alle gleichzeitig kupferverbrauchenden
    // Produktionsgebäude verteilt. Die gleiche Versorgungsquote verhindert, dass
    // die zuerst ausgeführten Produktionsblöcke das Kupfer vollständig aufbrauchen.
    // Sägewerk: verbraucht lokale Bäume und Strom; Biomasse und Bretter landen im Oberflächenlager.
    if (Number(bld.woodcutter || 0) > 0) {
      const powerFactor = newBuildingPowerFactor(id);
      const treesAvailable = Math.max(0, Number(planet.resources?.trees || 0));
      const neededTrees = 0.01 * Number(bld.woodcutter) * delta;
      const treeFactor = neededTrees > 0 ? Math.min(1, treesAvailable / neededTrees) : 0;
      const factor = Math.min(powerFactor, treeFactor);
      if (factor > 0) {
        planet.resources.trees = Math.max(0, treesAvailable - neededTrees * factor);
        storage.biomass = Number(storage.biomass || 0) + 0.009 * Number(bld.woodcutter) * delta * factor;
        storage.wood = Number(storage.wood || 0) + 0.009 * Number(bld.woodcutter) * delta * factor;
      }
    }
    // Kakao-Plantage: nur mit Strom und lokal vorhandenem Wasser; Erzeugung in Kakaobohnen.
    if (Number(bld.cocoaPlantation || 0) > 0) {
      const powerFactor = newBuildingPowerFactor(id);
      const waterNeed = 0.2 * Number(bld.cocoaPlantation) * delta;
      const availableWater = Math.max(0, Number(storage.water || 0));
      const waterFactor = waterNeed > 0 ? Math.min(1, availableWater / waterNeed) : 0;
      const factor = Math.min(powerFactor, waterFactor);
      if (factor > 0) {
        storage.water = Math.max(0, availableWater - waterNeed * factor);
        storage.cocoaBeans = Number(storage.cocoaBeans || 0) + 0.1 * Number(bld.cocoaPlantation) * delta * factor;
      }
    }
    // Schokoladenfabrik: wandelt lokale Kakaobohnen mit Strom in Schokolade um.
    if (Number(bld.chocolateFactory || 0) > 0) {
      const factories = Number(bld.chocolateFactory || 0);
      const poweredFactories = Math.floor(factories * newBuildingPowerFactor(id) + 1e-9);
      const cocoaNeed = 0.02 * poweredFactories * delta;
      const cocoaAvailable = Math.max(0, Number(storage.cocoaBeans || 0));
      const factor = cocoaNeed > 0 ? Math.min(1, cocoaAvailable / cocoaNeed) : 0;
      if (factor > 0) {
        storage.cocoaBeans = Math.max(0, cocoaAvailable - cocoaNeed * factor);
        storage.chocolate = Number(storage.chocolate || 0) + 0.05 * poweredFactories * delta * factor;
      }
    }
    // Luxusmöbelfabrik: verarbeitet Kunststoff und Bretter mit Strom zu Luxusmöbeln.
    if (Number(bld.luxuryFurnitureFactory || 0) > 0) {
      const factories = Number(bld.luxuryFurnitureFactory || 0);
      const powerFactor = newBuildingPowerFactor(id);
      const plasticNeed = 0.03 * factories * delta;
      const woodNeed = 0.006 * factories * delta;
      const plasticAvailable = Math.max(0, Number(storage.plastics || 0));
      const woodAvailable = Math.max(0, Number(storage.wood || 0));
      const inputFactor = Math.min(plasticNeed > 0 ? plasticAvailable / plasticNeed : 1, woodNeed > 0 ? woodAvailable / woodNeed : 1, 1);
      const factor = Math.min(powerFactor, inputFactor);
      if (factor > 0) {
        storage.plastics = Math.max(0, plasticAvailable - plasticNeed * factor);
        storage.wood = Math.max(0, woodAvailable - woodNeed * factor);
        storage.luxuryFurniture = Number(storage.luxuryFurniture || 0) + 0.02 * factories * delta * factor;
      }
    }

    // Graphitmine: fördert Graphit aus den lokalen Vorkommen, sofern sie mit Strom versorgt wird.
    if (Number(bld.graphiteMine || 0) > 0 && ['earth','luna','mars','io'].includes(id)) {
      const powerFactor = newBuildingPowerFactor(id);
      const availableGraphite = Math.max(0, Number(planet.resources.graphite || 0));
      const minedGraphite = Math.min(availableGraphite, 0.05 * Number(bld.graphiteMine) * delta * powerFactor);
      if (minedGraphite > 0) {
        planet.resources.graphite = availableGraphite - minedGraphite;
        storage.graphite = Number(storage.graphite || 0) + minedGraphite;
      }
    }

    // Titanmine: fördert Titanerz aus dem lokalen Vorkommen in das lokale Oberflächenlager.
    // Die Mine ist auf allen Planetenoberflächen baubar; ohne lokales Vorkommen produziert sie nichts.
    if (Number(bld.titanMine || 0) > 0) {
      const availableTitanOre = Math.max(0, Number(planet.resources.titanOre || 0));
      const minedTitanOre = Math.min(availableTitanOre, 0.2 * Number(bld.titanMine) * delta);
      if (minedTitanOre > 0) {
        planet.resources.titanOre = availableTitanOre - minedTitanOre;
        storage.titanOre = Number(storage.titanOre || 0) + minedTitanOre;
      }
    }

    // Ioniumabbau ausschließlich auf Io. Ohne Radioaktivstofflager bleibt die Mine inaktiv;
    // die Förderung stoppt außerdem, sobald die lokale Lagerkapazität erreicht ist.
    if (id === 'io' && Number(bld.ioniumMine || 0) > 0) {
      const capacity = radioactiveStorageCapacity(id, 'surface');
      const used = radioactiveStoredAmount(storage);
      const availableIonium = Math.max(0, Number(planet.resources.ionium || 0));
      const minedIonium = capacity > used ? Math.min(availableIonium, 0.01 * Number(bld.ioniumMine) * delta, capacity - used) : 0;
      if (minedIonium > 0) {
        planet.resources.ionium = availableIonium - minedIonium;
        storage.ionium = Number(storage.ionium || 0) + minedIonium;
      }
    }

    // Eisenabbau auf allen Planetenoberflächen:
    // Das abgebaute Eisen landet immer im lokalen Oberflächenlager des jeweiligen Körpers.
    // Auf der Erde ist dieses Lager `state`; auf allen anderen Körpern `bodies[id].storage`.
    if (Number(bld.ironMine || 0) > 0) {
      const availableIron = Math.max(0, Number(planet.resources.iron || 0));
      const minedIron = Math.min(availableIron, 0.1 * Number(bld.ironMine) * delta);
      if (minedIron > 0) {
        planet.resources.iron = availableIron - minedIron;
        storage.iron = Number(storage.iron || 0) + minedIron;
        state.tasks.ironMined = Number(state.tasks.ironMined || 0) + minedIron;
      }
    }

    // Nickelabbau: 0,1 t/s je Mine, begrenzt durch das lokale Vorkommen und die Stromversorgung.
    if (Number(bld.nickelMine || 0) > 0 && state.research?.completed?.nickelMining && id !== 'sun') {
      const powerFactor = newBuildingPowerFactor(id);
      const availableNickel = Math.max(0, Number(planet.resources.nickelOre || 0));
      const minedNickel = Math.min(availableNickel, 0.1 * Number(bld.nickelMine) * delta * powerFactor);
      if (minedNickel > 0) {
        planet.resources.nickelOre = availableNickel - minedNickel;
        storage.nickelOre = Number(storage.nickelOre || 0) + minedNickel;
      }
    }

    Object.entries(buildingTypes).forEach(([key, b]) => {
      // Diese Gebäude werden unten separat verarbeitet.
      if (key === 'ironMine' || key === 'nickelMine' || key === 'graphiteMine' || key === 'titanMine' || key === 'crudeOilPump' || key === 'lithiumMine' || key === 'copperMine' || key === 'ioniumMine') return;
      if (!b.resource) return;

      const resourceKey = b.resource;
      // Wasser ist auf Merkur wegen der Oberflächentemperatur ab 50 °C nicht abbaubar.
      if (resourceKey === 'water' && id === 'mercury' && mercuryTemperature() >= 50) return;
      const available = Number(planet.resources[resourceKey] || 0);
      let amount = Math.min(available, Number(b.rate || 0) * Number(bld[key] || 0) * delta);
      if (resourceKey === 'co2') {
        const capacity = gasCarbonStorageCapacity(id, 'surface');
        const stored = Math.min(capacity, Math.max(0, Number(storage.co2) || 0));
        amount = Math.min(amount, Math.max(0, capacity - stored));
      }
      if (amount > 0) {
        planet.resources[resourceKey] = available - amount;
        storage[resourceKey] = Number(storage[resourceKey] || 0) + amount;
        if (resourceKey === 'iron') state.tasks.ironMined = Number(state.tasks.ironMined || 0) + amount;
        if (resourceKey === 'stone') state.tasks.stoneMined = Number(state.tasks.stoneMined || 0) + amount;
      }
    });

    // Eisverarbeitung auf allen Planeten außer der Sonne: 0,1 t Eis/s je Anlage -> 0,2 Liter Wasser/s.
    // Es wird ausschließlich Eis aus dem jeweiligen lokalen Lager verbraucht; Wasser geht ins gleiche Lager. Kein Stromverbrauch.
    if (Number(bld.iceProcessingPlant || 0) > 0) {
      const neededIce = 0.1 * Number(bld.iceProcessingPlant) * delta;
      const availableIce = Number(storage.ice || 0);
      const factor = neededIce > 0 ? Math.min(1, availableIce / neededIce) : 0;
      if (factor > 0) {
        storage.ice = Math.max(0, availableIce - neededIce * factor);
        storage.water = Number(storage.water || 0) + 0.2 * Number(bld.iceProcessingPlant) * delta * factor;
      }
    }

    // Algenfarm: 0,05 t Wasser/s entsprechen 50 Litern/s im Wasserlager.
    // Die Produktion läuft nur mit tatsächlich vorhandenem Wasser; kein zusätzlicher Stromverbrauch.
    if (Number(bld.algaeFarm || 0) > 0) {
      const neededWater = 50 * Number(bld.algaeFarm) * delta;
      const availableWater = Math.max(0, Number(storage.water || 0));
      const factor = neededWater > 0 && availableWater > 0 ? Math.min(1, availableWater / neededWater) : 0;
      if (availableWater > 0 && factor > 0) {
        const consumedWater = Math.min(availableWater, neededWater);
        storage.water = Math.max(0, availableWater - consumedWater);
        storage.algaeBiomass = Number(storage.algaeBiomass || 0) + 0.2 * Number(bld.algaeFarm) * delta * (consumedWater / neededWater);
      }
    }

    // Orbitaler CO₂-Extraktor: Die Fördermenge wird mit voller Genauigkeit
    // separat aufsummiert. Bei sehr großen Atmosphärenbeständen (z. B. 100 Billionen t
    // auf Venus) verliert direktes wiederholtes Subtrahieren kleiner Mengen Genauigkeit.
    // Der Planetenbestand wird deshalb aus dem Startbestand minus kumulierter Förderung
    // berechnet; im Orbitlager landet exakt dieselbe tatsächlich entnommene Menge.
    if (Number(bld.orbitalCo2Extractor || 0) > 0) {
      if (!Number.isFinite(Number(planet.co2OrbitExtractionBase))) {
        planet.co2OrbitExtractionBase = Math.max(0, Number(planet.resources.co2 || 0));
        planet.co2OrbitExtracted = 0;
      }
      const baseCo2 = Math.max(0, Number(planet.co2OrbitExtractionBase) || 0);
      const alreadyExtracted = Math.max(0, Number(planet.co2OrbitExtracted) || 0);
      const availableCo2 = Math.max(0, baseCo2 - alreadyExtracted);
      const requestedCo2 = 0.2 * Number(bld.orbitalCo2Extractor) * delta;
      const extracted = Math.min(availableCo2, requestedCo2);
      if (extracted > 0) {
        planet.co2OrbitExtracted = alreadyExtracted + extracted;
        planet.resources.co2 = Math.max(0, baseCo2 - planet.co2OrbitExtracted);
        const accepted = addStoredCO2(id, 'orbit', extracted);
        // Nur tatsächlich eingelagertes CO₂ gilt als gefördert.
        planet.co2OrbitExtracted = Math.max(0, alreadyExtracted + accepted);
        planet.resources.co2 = Math.max(0, baseCo2 - planet.co2OrbitExtracted);
      }
    }

    // Wasserkraftwerk: fördert Wasser aus dem endlichen Wasservorkommen der Erde ins lokale Lager.
    if (Number(bld.hydroelectricPlant || 0) > 0 && id === 'earth') {
      const powerFactor = newBuildingPowerFactor(id);
      const availableWater = Number(planet.resources.water || 0);
      const produced = Math.min(availableWater, hydroelectricWaterProduction(id) * delta * powerFactor);
      if (produced > 0) {
        planet.resources.water = availableWater - produced;
        storage.water = Number(storage.water || 0) + produced;
        state.tasks.waterProduced = Number(state.tasks.waterProduced || 0) + produced;
      }
    }

    // Gewächshaus: benötigt Strom und Wasser, um Getreide und Gemüse zu produzieren.
    if (Number(bld.greenhouse || 0) > 0) {
      const powerFactor = newBuildingPowerFactor(id);
      const neededWater = greenhouseWaterUse(id) * delta * powerFactor;
      const availableWater = Number(storage.water || 0);
      const waterFactor = neededWater > 0 ? Math.min(1, availableWater / neededWater) : 0;
      if (waterFactor > 0) {
        storage.water = Math.max(0, availableWater - neededWater * waterFactor);
        const output = greenhouseCropProduction(id) * delta * powerFactor * waterFactor;
        storage.grain = Number(storage.grain || 0) + output;
        storage.vegetables = Number(storage.vegetables || 0) + output;
      }
    }

    // Lebensmittelfabrik: verarbeitet Getreide und Wasser, skaliert mit Stromversorgung.
    if (Number(bld.foodFactory || 0) > 0) {
      const powerFactor = newBuildingPowerFactor(id);
      const grainNeeded = foodFactoryGrainUse(id) * delta * powerFactor;
      const waterNeeded = foodFactoryWaterUse(id) * delta * powerFactor;
      const grainAvailable = Number(storage.grain || 0);
      const waterAvailable = Number(storage.water || 0);
      const inputFactor = Math.min(1, grainNeeded > 0 ? grainAvailable / grainNeeded : 0, waterNeeded > 0 ? waterAvailable / waterNeeded : 0);
      if (inputFactor > 0) {
        storage.grain = Math.max(0, grainAvailable - grainNeeded * inputFactor);
        storage.water = Math.max(0, waterAvailable - waterNeeded * inputFactor);
        const foodMade = foodFactoryProduction(id) * delta * powerFactor * inputFactor;
        storage.food = Number(storage.food || 0) + foodMade;
        state.tasks.foodProduced = Number(state.tasks.foodProduced || 0) + foodMade;
      }
    }

    // Algenverarbeitungsanlage: 0,1 t Algenbiomasse/s -> 0,12 t Lebensmittel/s.
    // Die Produktion wird durch den tatsächlich verfügbaren Biomassebestand begrenzt.
    if (Number(bld.algaeFoodProcessor || 0) > 0) {
      const neededBiomass = 0.1 * Number(bld.algaeFoodProcessor) * delta;
      const availableBiomass = Math.max(0, Number(storage.algaeBiomass || 0));
      const factor = neededBiomass > 0 ? Math.min(1, availableBiomass / neededBiomass) : 0;
      if (factor > 0) {
        const consumedBiomass = neededBiomass * factor;
        const foodMade = 0.12 * Number(bld.algaeFoodProcessor) * delta * factor;
        storage.algaeBiomass = Math.max(0, availableBiomass - consumedBiomass);
        storage.food = Number(storage.food || 0) + foodMade;
        state.tasks.foodProduced = Number(state.tasks.foodProduced || 0) + foodMade;
      }
    }

    // CO₂-Verarbeitung: 0,2 t CO₂/s werden in 0,1 t Kohlenstoff und 0,1 t Sauerstoff umgewandelt.
    if (Number(bld.co2ProcessingPlant || 0) > 0) {
      const availableCO2 = Number(storage.co2 || 0);
      const capacity = 0.2 * Number(bld.co2ProcessingPlant || 0) * delta;
      const processed = Math.min(availableCO2, capacity);
      if (processed > 0) {
        storage.co2 = availableCO2 - processed;
        storage.carbon = Number(storage.carbon || 0) + processed * 0.5;
        storage.oxygen = Number(storage.oxygen || 0) + processed * 0.5;
      }
    }

    // Lithiummine: 0,05 t Lithium/s je Mine.
    // Das Lithium wird direkt vom Planetenvorkommen ins Planetlager abgebaut.
    if (Number(bld.lithiumMine || 0) > 0) {
      const availableLithium = Number(planet.resources.lithium || 0);
      const amountLithium = Math.min(
        availableLithium,
        lithiumProduction(id) * delta
      );
      if (amountLithium > 0) {
        planet.resources.lithium = availableLithium - amountLithium;
        storage.lithium = Number(storage.lithium || 0) + amountLithium;
      }
    }

    // Kupfermine: 0,05 t Kupfererz/s je Mine.
    // Das Kupfererz wird direkt vom Planetenvorkommen ins Planetlager abgebaut.
    if (Number(bld.copperMine || 0) > 0) {
      const availableCopperOre = Number(planet.resources.copperOre || 0);
      const amountCopperOre = Math.min(
        availableCopperOre,
        copperProduction(id) * delta
      );
      if (amountCopperOre > 0) {
        planet.resources.copperOre = availableCopperOre - amountCopperOre;
        storage.copperOre = Number(storage.copperOre || 0) + amountCopperOre;
      }
    }
    if (bld.crudeOilPump > 0) {
      const neededPower = crudeOilElectricityUse(id) * delta;
      const availablePower = electricityProduction(id);
      const powerFactor = newBuildingPowerFactor(id);
      const availableOil = Number(planet.resources.crudeOil || 0);
      const amount = Math.min(availableOil, crudeOilProduction(id) * delta * powerFactor);
      if (amount > 0) { planet.resources.crudeOil -= amount; storage.crudeOil = Number(storage.crudeOil || 0) + amount; }
    }

    // Rohöl wird auf diesem Planeten proportional auf alle Verbraucher verteilt.
    // Dadurch erhalten Raffinerie, Polymerfabrik und Gummifabrik bei Knappheit denselben Versorgungsanteil.
    const sharedOilAvailable = Math.max(0, Number(storage.crudeOil || 0));
    const refineryCount = Number(bld.refinery || 0);
    const refineryOilNeed = 0.2 * refineryCount * delta;
    const polymerNeededOil = polymerOilUse(id) * delta;
    const rubberNeededOil = rubberOilUse(id) * delta;
    const syntheticGraphiteNeededOil = syntheticGraphiteOilUse(id) * delta;
    const sharedOilNeed = refineryOilNeed + polymerNeededOil + rubberNeededOil + syntheticGraphiteNeededOil;
    const sharedOilFactor = sharedOilNeed > 0 ? Math.min(1, sharedOilAvailable / sharedOilNeed) : 0;

    // Raffinerie: Rohöl aus dem lokalen Oberflächenlager wird in Treibstoff umgewandelt.
    // Treibstoff bleibt ausschließlich im Flüssiglager; ohne freien Tankplatz pausiert die Produktion.
    if (refineryCount > 0) {
      const tankCapacity = Math.max(0, Number(liquidTankCapacity(id, 'surface')) || 0);
      const fuelInTank = Math.max(0, Number(liquidFuelAmount(id, 'surface')) || 0);
      const freeFuelCapacity = Math.max(0, tankCapacity - fuelInTank);
      const fuelOutputCapacity = 0.4 * refineryCount * delta;
      const tankFactor = fuelOutputCapacity > 0 ? Math.min(1, freeFuelCapacity / fuelOutputCapacity) : 0;
      const inputFactor = tankCapacity > 0 && freeFuelCapacity > 0
        ? Math.min(sharedOilFactor, tankFactor)
        : 0;
      if (inputFactor > 0) {
        const oilUsed = refineryOilNeed * inputFactor;
        const fuelProduced = fuelOutputCapacity * inputFactor;
        storage.crudeOil = Math.max(0, Number(storage.crudeOil || 0) - oilUsed);
        const liquidData = ensureLiquidTankData(id);
        liquidData.liquidFuel.surface = Math.min(tankCapacity, fuelInTank + fuelProduced);
      }
    }

    if (bld.steelworks > 0 && storage.iron > 0) {
      const needed = ironUse(id) * delta;
      const used = Math.min(storage.iron, needed);
      storage.iron -= used;
      const steelMade = steelProduction(id) * delta * (needed ? used / needed : 0);
      storage.steel = Number(storage.steel || 0) + steelMade;
      state.tasks.steelProduced = Number(state.tasks.steelProduced || 0) + steelMade;
    }
    // Aluminiumkette: Bauxit -> Aluminiumoxid -> Aluminium.
    if (Number(bld.aluminiumOxideRefinery || 0) > 0) {
      const neededBauxite = 0.5 * Number(bld.aluminiumOxideRefinery) * delta;
      const availableBauxite = Number(storage.bauxite || 0);
      const factor = neededBauxite > 0 ? Math.min(1, availableBauxite / neededBauxite) : 0;
      if (factor > 0) {
        storage.bauxite = Math.max(0, availableBauxite - neededBauxite * factor);
        storage.aluminiumOxide = Number(storage.aluminiumOxide || 0) + 0.25 * Number(bld.aluminiumOxideRefinery) * delta * factor;
      }
    }
    if (Number(bld.aluminiumSmelter || 0) > 0) {
      const neededAluminiumOxide = 0.25 * Number(bld.aluminiumSmelter) * delta;
      const availableAluminiumOxide = Number(storage.aluminiumOxide || 0);
      const factor = neededAluminiumOxide > 0 ? Math.min(1, availableAluminiumOxide / neededAluminiumOxide) : 0;
      if (factor > 0) {
        storage.aluminiumOxide = Math.max(0, availableAluminiumOxide - neededAluminiumOxide * factor);
        storage.aluminium = Number(storage.aluminium || 0) + 0.125 * Number(bld.aluminiumSmelter) * delta * factor;
      }
    }
    // Titanaufbereitung: Titanerz -> aufbereitetes Titan.
    if (Number(bld.titanProcessing || 0) > 0) {
      const needed = 0.2 * Number(bld.titanProcessing) * delta;
      const available = Number(storage.titanOre || 0);
      const factor = needed > 0 ? Math.min(1, available / needed) : 0;
      if (factor > 0) {
        storage.titanOre = Math.max(0, available - needed * factor);
        storage.processedTitan = Number(storage.processedTitan || 0) + 0.1 * Number(bld.titanProcessing) * delta * factor;
      }
    }
    if (Number(bld.titanRefinery || 0) > 0) {
      const needed = 0.1 * Number(bld.titanRefinery) * delta;
      const available = Number(storage.processedTitan || 0);
      const factor = needed > 0 ? Math.min(1, available / needed) : 0;
      if (factor > 0) {
        storage.processedTitan = Math.max(0, available - needed * factor);
        storage.titanium = Number(storage.titanium || 0) + 0.05 * Number(bld.titanRefinery) * delta * factor;
      }
    }

    // Polymer- und Gummifabrik verwenden ihren proportional zugeteilten Rohölanteil.
    if (Number(bld.polymerFactory || 0) > 0 && polymerNeededOil > 0) {
      const oilUsed = polymerNeededOil * sharedOilFactor;
      storage.crudeOil = Math.max(0, Number(storage.crudeOil || 0) - oilUsed);
      storage.polymers = Number(storage.polymers || 0) + polymerProduction(id) * delta * sharedOilFactor;
    }

    if (Number(bld.rubberFactory || 0) > 0 && rubberNeededOil > 0) {
      const oilUsed = rubberNeededOil * sharedOilFactor;
      storage.crudeOil = Math.max(0, Number(storage.crudeOil || 0) - oilUsed);
      storage.rubber = Number(storage.rubber || 0) + rubberProduction(id) * delta * sharedOilFactor;
    }

    // Synthetische Graphitproduktion: Rohöl aus dem lokalen Lager wird mit Strom zu Graphit verarbeitet.
    // Importiertes Rohöl aus Raketen funktioniert genauso wie lokal gefördertes Rohöl.
    if (Number(bld.syntheticGraphitePlant || 0) > 0 && syntheticGraphiteNeededOil > 0) {
      const powerFactor = newBuildingPowerFactor(id);
      const factor = Math.min(sharedOilFactor, powerFactor);
      const oilUsed = syntheticGraphiteNeededOil * factor;
      storage.crudeOil = Math.max(0, Number(storage.crudeOil || 0) - oilUsed);
      storage.graphite = Number(storage.graphite || 0) + 0.05 * Number(bld.syntheticGraphitePlant) * delta * factor;
    }

    // Kunststofffabrik: verarbeitet lokal gelagertes Gummi zu Kunststoff.
    // Bei Gummimangel wird die Produktion proportional gedrosselt.
    if (Number(bld.plasticFactory || 0) > 0) {
      const neededRubber = plasticRubberUse(id) * delta;
      const availableRubber = Number(storage.rubber || 0);
      const factor = neededRubber > 0 ? Math.min(1, availableRubber / neededRubber) : 0;
      if (factor > 0) {
        storage.rubber = Math.max(0, availableRubber - neededRubber * factor);
        storage.plastics = Number(storage.plastics || 0) + plasticProduction(id) * delta * factor;
      }
    }

    // Fahrzeugfabrik: Verbrauch und Produktion skalieren linear mit der Anzahl fertiger Fabriken.
    // Jede Fabrik benötigt 4 MW; bei unzureichender Gesamtleistung pausieren alle Fahrzeugfabriken dieses Körpers.
    const vehicleFactories = vehicleFactoryCount(id);
    // Fahrzeugfabriken laufen wie alle anderen strompflichtigen Gebäude nur,
    // wenn die komplette lokale Stromnachfrage gedeckt ist.
    const poweredVehicleFactories = newBuildingPowerFactor(id) > 0 ? vehicleFactories : 0;
    if (poweredVehicleFactories > 0 && delta > 0) {
      const inputs = [
        ['steel', poweredVehicleFactories * 0.1],
        ['plastics', poweredVehicleFactories * 0.1],
        ['rubber', poweredVehicleFactories * 0.05],
        ['glass', poweredVehicleFactories * 0.3],
        ['chips', poweredVehicleFactories * 0.2]
      ];
      const factor = inputs.reduce((current, [key, rate]) => {
        const needed = rate * delta;
        return needed > 0 ? Math.min(current, Math.max(0, Number(storage[key] || 0)) / needed) : current;
      }, 1);
      if (factor > 0) {
        inputs.forEach(([key, rate]) => { storage[key] = Math.max(0, Number(storage[key] || 0) - rate * delta * factor); });
        storage.vehicles = Number(storage.vehicles || 0) + poweredVehicleFactories * 0.003 * delta * factor;
      }
    }

    if (bld.coalPowerPlant > 0) {
      const neededCoal = coalPowerUse(id) * delta;
      const usedCoal = Math.min(Number(storage.coal || 0), neededCoal);
      storage.coal = Number(storage.coal || 0) - usedCoal;
    }
    if (bld.copperSmelter > 0) {
      const neededCopperOre = copperSmeltingUse(id) * delta;
      const availableCopperOre = Number(storage.copperOre || 0);
      const usedCopperOre = Math.min(availableCopperOre, neededCopperOre);
      if (usedCopperOre > 0 && neededCopperOre > 0) {
        storage.copperOre = availableCopperOre - usedCopperOre;
        storage.copper = Number(storage.copper || 0) + copperSmeltingProduction(id) * delta * (usedCopperOre / neededCopperOre);
      }
    }
    if (bld.lithiumRefinery > 0) {
      const neededLithium = lithiumRefineryLithiumUse(id) * delta;
      const neededCopper = lithiumRefineryCopperUse(id) * delta;
      const availableLithium = Number(storage.lithium || 0);
      const availableCopper = Number(storage.copper || 0);
      const lithiumFactor = neededLithium > 0 ? Math.min(1, availableLithium / neededLithium) : 0;
      const copperFactor = neededCopper > 0 ? copperAllocationFactor : 0;
      const factor = Math.min(lithiumFactor, copperFactor);
      if (factor > 0) {
        storage.lithium = availableLithium - neededLithium * factor;
        storage.copper = availableCopper - neededCopper * factor;
        storage.batteries = Number(storage.batteries || 0) + batteryProduction(id) * delta * factor;
      }
    }
    // Baustofffabrik: 0,20 t Stein/s je Fabrik -> 0,15 t Baustoffe/s je Fabrik.
    // Es wird nur tatsächlich abgebauter Stein aus dem Planetenlager verbraucht.
    if (Number(bld.buildingMaterialsFactory || 0) > 0) {
      const neededStone = buildingMaterialsStoneUse(id) * delta;
      const availableStone = Number(storage.stone || 0);
      const factor = neededStone > 0 ? Math.min(1, availableStone / neededStone) : 0;

      if (factor > 0) {
        const usedStone = neededStone * factor;
        const producedMaterials = buildingMaterialsProduction(id) * delta * factor;
        storage.stone = Math.max(0, availableStone - usedStone);
        storage.buildingMaterials = Number(storage.buildingMaterials || 0) + producedMaterials;
      }
    }
    if (bld.glassFactory > 0) {
      const neededSilicon = glassFactorySiliconUse(id) * delta;
      const neededStone = glassFactoryStoneUse(id) * delta;
      const availableSilicon = Number(storage.silicon || 0);
      const availableStone = Number(storage.stone || 0);
      const siliconFactor = neededSilicon > 0 ? Math.min(1, availableSilicon / neededSilicon) : 0;
      const stoneFactor = neededStone > 0 ? Math.min(1, availableStone / neededStone) : 0;
      const factor = Math.min(siliconFactor, stoneFactor);
      if (factor > 0) {
        storage.silicon = availableSilicon - neededSilicon * factor;
        storage.stone = availableStone - neededStone * factor;
        storage.glass = Number(storage.glass || 0) + glassProduction(id) * delta * factor;
      }
    }
    if (bld.machineFactory > 0) {
      const neededSteel = machineFactorySteelUse(id) * delta;
      const neededCopper = machineFactoryCopperUse(id) * delta;
      const availableSteel = Number(storage.steel || 0);
      const availableCopper = Number(storage.copper || 0);
      const steelFactor = neededSteel > 0 ? Math.min(1, availableSteel / neededSteel) : 0;
      const copperFactor = neededCopper > 0 ? copperAllocationFactor : 0;
      const factor = Math.min(steelFactor, copperFactor);
      if (factor > 0) {
        storage.steel = availableSteel - neededSteel * factor;
        storage.copper = availableCopper - neededCopper * factor;
        storage.machines = Number(storage.machines || 0) + machineProduction(id) * delta * factor;
      }
    }
    if (Number(bld.uraniumProcessingPlant || 0) > 0) {
      const neededUranium = processedUraniumUraniumUse(id) * delta;
      const availableUranium = Number(storage.uranium || 0);
      const factor = neededUranium > 0 ? Math.min(1, availableUranium / neededUranium) : 0;
      if (factor > 0) {
        storage.uranium = availableUranium - neededUranium * factor;
        storage.processedUranium = Number(storage.processedUranium || 0) + processedUraniumProduction(id) * delta * factor;
      }
    }
    if (Number(bld.nuclearFuelPlant || 0) > 0) {
      const neededProcessed = nuclearFuelProcessedUraniumUse(id) * delta;
      const availableProcessed = Number(storage.processedUranium || 0);
      const factor = neededProcessed > 0 ? Math.min(1, availableProcessed / neededProcessed) : 0;
      if (factor > 0) {
        storage.processedUranium = availableProcessed - neededProcessed * factor;
        storage.nuclearFuel = Number(storage.nuclearFuel || 0) + nuclearFuelProduction(id) * delta * factor;
      }
    }

    if (bld.chipFactory > 0) {
      const neededLithium = chipFactoryLithiumUse(id) * delta;
      const neededCopper = chipFactoryCopperUse(id) * delta;
      const availableLithium = Number(storage.lithium || 0);
      const availableCopper = Number(storage.copper || 0);
      const lithiumFactor = neededLithium > 0 ? Math.min(1, availableLithium / neededLithium) : 0;
      const copperFactor = neededCopper > 0 ? copperAllocationFactor : 0;
      const factor = Math.min(lithiumFactor, copperFactor);
      if (factor > 0) {
        storage.lithium = availableLithium - neededLithium * factor;
        storage.copper = availableCopper - neededCopper * factor;
        storage.chips = Number(storage.chips || 0) + chipProduction(id) * delta * factor;
      }
    }

    // Elektronikfabrik: Kupfer, Chips und Lithium werden zu Elektronik verarbeitet.
    if (Number(bld.electronicsFactory || 0) > 0) {
      const neededCopper = electronicsFactoryCopperUse(id) * delta;
      const neededChips = electronicsFactoryChipUse(id) * delta;
      const neededLithium = electronicsFactoryLithiumUse(id) * delta;
      const availableCopper = Number(storage.copper || 0);
      const availableChips = Number(storage.chips || 0);
      const availableLithium = Number(storage.lithium || 0);
      const copperFactor = neededCopper > 0 ? copperAllocationFactor : 0;
      const chipsFactor = neededChips > 0 ? Math.min(1, availableChips / neededChips) : 0;
      const lithiumFactor = neededLithium > 0 ? Math.min(1, availableLithium / neededLithium) : 0;
      const factor = Math.min(copperFactor, chipsFactor, lithiumFactor);
      if (factor > 0) {
        storage.copper = Math.max(0, availableCopper - neededCopper * factor);
        storage.chips = Math.max(0, availableChips - neededChips * factor);
        storage.lithium = Math.max(0, availableLithium - neededLithium * factor);
        storage.electronics = Number(storage.electronics || 0) + electronicsProduction(id) * delta * factor;
      }
    }

    if (bld.nuclearReactor > 0) {
      const neededFuel = nuclearReactorNuclearFuelUse(id) * delta;
      const availableFuel = Number(storage.nuclearFuel || 0);
      const factor = neededFuel > 0 ? Math.min(1, availableFuel / neededFuel) : 0;
      if (factor > 0) {
        storage.nuclearFuel = availableFuel - neededFuel * factor;
      }
    }

    if (bld.fusionReactor > 0) {
      const neededHelium3 = fusionHelium3Use(id) * delta;
      const availableHelium3 = Number(storage.helium3 || 0);
      const usedHelium3 = Math.min(availableHelium3, neededHelium3);
      // Strom ist ein Produktionswert wie beim bestehenden Kohlekraftwerk;
      // Helium-3 wird nur dann verbraucht, wenn es tatsächlich vorhanden ist.
      if (usedHelium3 > 0) {
        storage.helium3 = availableHelium3 - usedHelium3;
      }
    }
  });

  // Luxusgüterverbrauch und Bevölkerungswachstum werden nach der lokalen Produktion verarbeitet.
  // Jedes Habitat kostet 88 GD pro Ingame-Stunde.
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    processColonists(id, delta);
    const habitatCount = Math.max(0, Number(getBuildingsOnPlanet(id).habitat) || 0);
    const upkeepDue = habitatCount * (88 / 3600) * delta;
    if (upkeepDue > 0) {
      const balance = Math.max(0, Number(state.gunniDollar) || 0);
      const paid = Math.min(balance, upkeepDue);
      state.gunniDollar = balance - paid;
      if (paid > 0) recordCompanyFinance('expense', paid, 'Habitat-Unterhalt', false);
    }
  });

  // Das Lager der Erde ist gleichzeitig das Spieler-/Hauptlager.
  updateOutposts(now); renderConstructionQueue();
  updateRocketFactoryConstruction(now);
  updateRockets(now);
  updateOrbitMissions(gameNow());
  // Forschungspunkte werden durch das Forschungslabor auf der Erde erzeugt.
  // 1 Forschungspunkt pro Sekunde je Forschungslabor.
  const researchPointsDelta = researchPointProduction() * delta;
  if (researchPointsDelta > 0) {
    state.research.points = Number(state.research.points || 0) + researchPointsDelta;
  }

  updateResearch(now);
  updateMobileMiners(now);
  taskProgressUpdate();

  // Forschungs-Timer sichtbar und synchron im Sekundenrhythmus aktualisieren.
  if (!updateResources.lastResearchUiUpdate || now - updateResources.lastResearchUiUpdate >= 250) {
    const researchPanel = document.querySelector('#research-panel');
    const asteroidPanel = document.querySelector('#asteroids-panel');
    if (asteroidPanel && !asteroidPanel.hidden) updateAsteroidPanelLive();
    if (!updateResources.lastHeadquartersUiUpdate || now - updateResources.lastHeadquartersUiUpdate >= 1000) {
      updateResources.lastHeadquartersUiUpdate = now;
      const headquartersPanel = document.querySelector('#company-headquarters-panel');
      if (headquartersPanel && !headquartersPanel.hidden) renderCompanyHeadquarters();
    }
    if (researchPanel && !researchPanel.hidden && (state.research?.active || state.research?.orders?.active || state.research?.orders?.completed?.skyObservation)) {
      updateResources.lastResearchUiUpdate = now;
      renderResearch();
    }
  }

  // Alle 5 Sekunden werden die aktuellen Lagerstände, Gebäude,
  // Forschungspunkte und laufenden Spielzustände automatisch gespeichert.
  // Die Produktion selbst läuft weiterhin kontinuierlich über requestAnimationFrame.
  const realNowForSave = performance.now();
  if (!updateResources.lastStorageSyncReal || realNowForSave - updateResources.lastStorageSyncReal >= 5000) {
    updateResources.lastStorageSyncReal = realNowForSave;
    saveGame(false);
  }

  // Wichtig: Während des laufenden Spiels NICHT ständig renderInfo()/renderSystem()
  // aufrufen. Das würde das scrollbare Gebäudemenü jede Sekunde neu erzeugen
  // und auf dem Handy wieder nach oben springen lassen.
  // Die Rohstoffanzeige oben wird direkt aus dem aktuellen Planetlager aktualisiert.
  // Dadurch bleibt sie synchron, auch wenn die Produktionswerte schneller steigen
  // als ein kompletter UI-Renderzyklus.
  refreshTopResourceValues();
  refreshPlanetDepositValues();
  // Die untere Lageransicht wird gezielt einmal pro Sekunde aktualisiert,
  // ohne renderInfo() aufzurufen oder das gesamte Planetenmenü neu aufzubauen.
  const realNowForStorageUi = performance.now();
  if (!updateResources.lastStorageUiUpdate || realNowForStorageUi - updateResources.lastStorageUiUpdate >= 1000) {
    updateResources.lastStorageUiUpdate = realNowForStorageUi;
    refreshPlanetStorageDisplay();
  }


  // Raketen werden unabhängig vom restlichen UI animiert, damit der Flugweg
  // zwischen Startplanet und Zielorbit auf dem Sonnensystem sichtbar bleibt.
  updateRocketVisuals(now);
  refreshColonistsPanelLive();
  if (!updateResources.lastClockUiUpdate || now - updateResources.lastClockUiUpdate >= 200) {
    updateResources.lastClockUiUpdate = now;
    updateGameClockDisplay(now);
  }

  requestAnimationFrame(updateResources);
}


// ==========================================
// NEUIGKEITEN & WIRTSCHAFT – Buttons
// ==========================================
function renderColonistsPanel() {
  const panel = document.querySelector('#colonists-content');
  if (!panel) return;
  const ids = Object.keys(bodies).filter(id => id !== 'sun');
  const allColonists = ids.reduce((sum, id) => sum + colonistsOnPlanet(id), 0);
  const foodNeed = allColonists * 0.00001;
  const waterNeed = allColonists * 0.01;
  panel.innerHTML = `
    <div class="colonists-summary">
      <div class="colonists-summary-card"><span>👥 Kolonisten gesamt</span><strong data-colonists-total>${allColonists.toLocaleString('de-DE')}</strong></div>
      <div class="colonists-summary-card"><span>💵 GünniDollar-Einnahmen</span><strong data-colonists-income>${(allColonists * 0.0002).toLocaleString('de-DE', {maximumFractionDigits:6})}/s</strong></div>
      <div class="colonists-summary-card"><span>🍲 Lebensmittelbedarf</span><strong data-food-need>${foodNeed.toLocaleString('de-DE',{maximumFractionDigits:6})} t/s</strong></div>
      <div class="colonists-summary-card"><span>💧 Wasserbedarf</span><strong data-water-need>${waterNeed.toLocaleString('de-DE',{maximumFractionDigits:4})} L/s</strong></div>
    </div>
    <p class="hint">Kolonisten starten bei 0. Die ersten ziehen nach Abschluss eines später festgelegten Auftrags ein. Bei 100 % Wachstum entsteht durchschnittlich alle 30 Sekunden ein neuer Kolonist, sofern Wohnraum, Lebensmittel und Wasser vorhanden sind.</p>
    <div class="colonists-planet-list">
      ${ids.map(id => {
        const body = ensureColonistData(id);
        const storage = getPlanetStorage(id);
        const pop = Number(body?.colonists || 0);
        const capacity = housingCapacity(id);
        const free = Math.max(0, capacity - pop);
        const supplied = pop <= 0 || (Number(storage.food || 0) > 0 && Number(storage.water || 0) > 0);
        const housingText = housingBuildingKeys.filter(key => Number(getBuildingsOnPlanet(id)[key] || 0) > 0).map(key => `${buildingTypes[key].name}: ${getBuildingsOnPlanet(id)[key]}`).join(' · ') || 'Keine Wohngebäude';
        return `<article class="colonists-planet-card">
          <div class="colonists-planet-head"><h3>${body.name}</h3><strong data-pop="${id}">${pop.toLocaleString('de-DE')} Kolonisten</strong></div>
          <div class="stat"><span>Wohnraum</span><strong data-housing="${id}">${pop} / ${capacity} · ${free} frei</strong></div>
          <div class="stat"><span>Lebensmittel im Oberflächenlager</span><strong data-food="${id}">${Number(storage.food || 0).toLocaleString('de-DE',{maximumFractionDigits:4})} t</strong></div>
          <div class="stat"><span>Wasser im Oberflächenlager</span><strong data-water="${id}">${Number(storage.water || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} L</strong></div>
          <div class="stat"><span>Fahrzeuge im Oberflächenlager</span><strong data-vehicles="${id}">${formatTons(Number(storage.vehicles || 0))}</strong></div>
          <div class="stat"><span>Luxusgut Fahrzeuge</span><strong data-vehicle-luxury-status="${id}" class="${body.vehicleLuxuryEnabled ? 'good' : 'warn'}">${body.vehicleLuxuryEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${Number(storage.vehicles || 0) > 0 ? '+10 % Populationseffekt' : 'kein Bonus (Lager leer)'}</strong></div>
          <button type="button" data-toggle-vehicle-luxury="${id}" class="settings-toggle ${body.vehicleLuxuryEnabled ? '' : 'off'}">Fahrzeuge ${body.vehicleLuxuryEnabled ? 'ausschalten' : 'einschalten'}</button>
          <div class="stat"><span>Luxusgut Schokolade</span><strong data-chocolate-luxury-status="${id}" class="${body.chocolateLuxuryEnabled ? 'good' : 'warn'}">${body.chocolateLuxuryEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${Number(storage.chocolate || 0) > 1e-12 ? '+8 % Populationswachstum' : 'kein Bonus (Lager leer)'}</strong></div>
          <button type="button" data-toggle-chocolate-luxury="${id}" class="settings-toggle ${body.chocolateLuxuryEnabled ? '' : 'off'}">Schokolade ${body.chocolateLuxuryEnabled ? 'ausschalten' : 'einschalten'}</button>
          <div class="stat"><span>Luxusgut Luxusmöbel</span><strong data-furniture-luxury-status="${id}" class="${body.furnitureLuxuryEnabled ? 'good' : 'warn'}">${body.furnitureLuxuryEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${Number(storage.luxuryFurniture || 0) > 1e-12 ? '+9 % Populationswachstum' : 'kein Bonus (Lager leer)'}</strong></div>
          <button type="button" data-toggle-furniture-luxury="${id}" class="settings-toggle ${body.furnitureLuxuryEnabled ? '' : 'off'}">Luxusmöbel ${body.furnitureLuxuryEnabled ? 'ausschalten' : 'einschalten'}</button>
          <div class="stat"><span>Versorgungsstatus</span><strong data-supply="${id}" class="${supplied ? 'good' : 'warn'}">${pop === 0 ? 'Noch keine Kolonisten' : supplied ? 'Versorgung vorhanden' : 'Wachstum gestoppt: Nahrung oder Wasser fehlt'}</strong></div>
          <div class="stat"><span>Wohngebäude</span><strong>${housingText}</strong></div>
          <label class="colonists-growth-label" for="colonist-growth-${id}">Bevölkerungswachstum: <strong data-growth-value="${id}">${body.colonistGrowthPercent}%</strong></label>
          <input id="colonist-growth-${id}" class="colonist-growth-slider" type="range" min="0" max="100" step="1" value="${body.colonistGrowthPercent}" data-growth-planet="${id}">
          <div class="colonists-remove-row"><label for="colonist-remove-${id}">Kolonisten entfernen</label><input id="colonist-remove-${id}" type="number" min="1" max="${pop}" step="1" value="1" data-remove-amount="${id}" ${pop > 0 ? '' : 'disabled'}><button type="button" data-remove-colonists="${id}" ${pop > 0 ? '' : 'disabled'}>Entfernen</button></div>
        </article>`;
      }).join('')}
    </div>`;
  panel.querySelectorAll('[data-growth-planet]').forEach(input => {
    input.addEventListener('input', () => {
      const id = input.dataset.growthPlanet;
      ensureColonistData(id).colonistGrowthPercent = Math.max(0, Math.min(100, Number(input.value) || 0));
      const output = panel.querySelector(`[data-growth-value="${id}"]`);
      if (output) output.textContent = `${input.value}%`;
    });
    input.addEventListener('change', () => saveGame(false));
  });
  panel.querySelectorAll('[data-toggle-vehicle-luxury]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.toggleVehicleLuxury;
    const body = ensureColonistData(id);
    body.vehicleLuxuryEnabled = body.vehicleLuxuryEnabled === false;
    saveGame(false);
    renderColonistsPanel();
  }));
  panel.querySelectorAll('[data-toggle-furniture-luxury]').forEach(button => button.addEventListener('click', () => {
    const body = ensureColonistData(button.dataset.toggleFurnitureLuxury);
    body.furnitureLuxuryEnabled = body.furnitureLuxuryEnabled === false;
    renderColonistsPanel(); saveGame(false);
  }));
  panel.querySelectorAll('[data-toggle-chocolate-luxury]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.toggleChocolateLuxury;
    const body = ensureColonistData(id);
    body.chocolateLuxuryEnabled = body.chocolateLuxuryEnabled === false;
    saveGame(false);
    renderColonistsPanel();
  }));
  panel.querySelectorAll('[data-remove-colonists]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.removeColonists;
    const input = panel.querySelector(`[data-remove-amount="${id}"]`);
    const amount = Math.floor(Number(input?.value) || 0);
    const current = colonistsOnPlanet(id);
    if (amount < 1 || amount > current) { alert(`Bitte eine Zahl zwischen 1 und ${current} eingeben.`); return; }
    if (!confirm(`${amount} Kolonisten auf ${bodies[id].name} wirklich entfernen?`)) return;
    removeColonistsFromHousing(id, amount);
    saveGame(false);
    renderColonistsPanel();
    renderInfo();
  }));
}

function refreshColonistsPanelLive() {
  const selectedHousing = infoPanel.querySelector(`[data-planet-housing="${state.selected}"]`);
  if (selectedHousing && bodies[state.selected]) {
    const population = colonistsOnPlanet(state.selected);
    const capacity = housingCapacity(state.selected);
    selectedHousing.textContent = `${population.toLocaleString('de-DE')} / ${capacity.toLocaleString('de-DE')} · ${Math.max(0, capacity - population).toLocaleString('de-DE')} frei`;
  }
  const selectedPopulation = infoPanel.querySelector(`[data-planet-colonists="${state.selected}"]`);
  if (selectedPopulation) selectedPopulation.textContent = colonistsOnPlanet(state.selected).toLocaleString('de-DE');
  const panel = document.querySelector('#colonists-panel');
  if (!panel || panel.hidden) return;
  const ids = Object.keys(bodies).filter(id => id !== 'sun');
  const total = ids.reduce((sum, id) => sum + colonistsOnPlanet(id), 0);
  const setText = (selector, value) => { const el = panel.querySelector(selector); if (el) el.textContent = value; };
  const planetCount = infoPanel.querySelector(`[data-planet-colonists="${state.selected}"]`);
  if (planetCount) planetCount.textContent = colonistsOnPlanet(state.selected).toLocaleString('de-DE');
  setText('[data-colonists-total]', total.toLocaleString('de-DE'));
  setText('[data-colonists-income]', `${(total * 0.0002).toLocaleString('de-DE',{maximumFractionDigits:6})}/s`);
  setText('[data-food-need]', `${(total * 0.00001).toLocaleString('de-DE',{maximumFractionDigits:6})} t/s`);
  setText('[data-water-need]', `${(total * 0.01).toLocaleString('de-DE',{maximumFractionDigits:4})} L/s`);
  for (const id of ids) {
    const pop = colonistsOnPlanet(id), capacity = housingCapacity(id), storage = getPlanetStorage(id);
    const supplied = pop <= 0 || (Number(storage.food || 0) > 0 && Number(storage.water || 0) > 0);
    setText(`[data-pop="${id}"]`, `${pop.toLocaleString('de-DE')} Kolonisten`);
    setText(`[data-housing="${id}"]`, `${pop} / ${capacity} · ${Math.max(0,capacity-pop)} frei`);
    setText(`[data-food="${id}"]`, `${Number(storage.food || 0).toLocaleString('de-DE',{maximumFractionDigits:4})} t`);
    setText(`[data-water="${id}"]`, `${Number(storage.water || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} L`);
    setText(`[data-vehicles="${id}"]`, formatTons(Number(storage.vehicles || 0)));
    const luxuryStatus = panel.querySelector(`[data-vehicle-luxury-status="${id}"]`);
    if (luxuryStatus) { luxuryStatus.textContent = `${ensureColonistData(id).vehicleLuxuryEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${ensureColonistData(id).vehicleLuxuryEnabled && Number(storage.vehicles || 0) > 1e-12 ? '+10 % Populationseffekt' : 'kein Bonus'}`; luxuryStatus.classList.toggle('good', ensureColonistData(id).vehicleLuxuryEnabled && Number(storage.vehicles || 0) > 1e-12); luxuryStatus.classList.toggle('warn', !ensureColonistData(id).vehicleLuxuryEnabled || Number(storage.vehicles || 0) <= 1e-12); }
    const luxuryToggle = panel.querySelector(`[data-toggle-vehicle-luxury="${id}"]`);
    if (luxuryToggle) { luxuryToggle.textContent = `Luxusgut pro Kopf ${ensureColonistData(id).vehicleLuxuryEnabled ? 'ausschalten' : 'einschalten'}`; luxuryToggle.classList.toggle('off', !ensureColonistData(id).vehicleLuxuryEnabled); }
    const chocolateLuxuryEnabled = ensureColonistData(id).chocolateLuxuryEnabled !== false;
    const chocolateLuxuryStatus = panel.querySelector(`[data-chocolate-luxury-status="${id}"]`);
    if (chocolateLuxuryStatus) {
      const chocolateAvailable = Number(storage.chocolate || 0) > 1e-12;
      chocolateLuxuryStatus.textContent = `${chocolateLuxuryEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${chocolateAvailable ? '+8 % Populationswachstum' : 'kein Bonus (Lager leer)'}`;
      chocolateLuxuryStatus.classList.toggle('good', chocolateLuxuryEnabled && chocolateAvailable);
      chocolateLuxuryStatus.classList.toggle('warn', !chocolateLuxuryEnabled || !chocolateAvailable);
    }
    const chocolateLuxuryToggle = panel.querySelector(`[data-toggle-chocolate-luxury="${id}"]`);
    if (chocolateLuxuryToggle) {
      chocolateLuxuryToggle.textContent = `Schokolade ${chocolateLuxuryEnabled ? 'ausschalten' : 'einschalten'}`;
      chocolateLuxuryToggle.classList.toggle('off', !chocolateLuxuryEnabled);
    }
    const furnitureEnabled = ensureColonistData(id).furnitureLuxuryEnabled !== false;
    const furnitureAvailable = Number(storage.luxuryFurniture || 0) > 1e-12;
    const furnitureStatus = panel.querySelector(`[data-furniture-luxury-status="${id}"]`);
    if (furnitureStatus) {
      furnitureStatus.textContent = `${furnitureEnabled ? 'Eingeschaltet' : 'Ausgeschaltet'} · ${furnitureAvailable ? '+9 % Populationswachstum' : 'kein Bonus (Lager leer)'}`;
      furnitureStatus.classList.toggle('good', furnitureEnabled && furnitureAvailable);
      furnitureStatus.classList.toggle('warn', !furnitureEnabled || !furnitureAvailable);
    }
    const furnitureToggle = panel.querySelector(`[data-toggle-furniture-luxury="${id}"]`);
    if (furnitureToggle) {
      furnitureToggle.textContent = `Luxusmöbel ${furnitureEnabled ? 'ausschalten' : 'einschalten'}`;
      furnitureToggle.classList.toggle('off', !furnitureEnabled);
    }
    const status = panel.querySelector(`[data-supply="${id}"]`);
    if (status) {
      status.textContent = pop === 0 ? 'Noch keine Kolonisten' : supplied ? 'Versorgung vorhanden' : 'Wachstum gestoppt: Nahrung oder Wasser fehlt';
      status.classList.toggle('good', supplied);
      status.classList.toggle('warn', !supplied);
    }
    const removeInput = panel.querySelector(`[data-remove-amount="${id}"]`);
    const removeButton = panel.querySelector(`[data-remove-colonists="${id}"]`);
    if (removeInput) { removeInput.max = String(pop); if (Number(removeInput.value) > pop) removeInput.value = String(Math.max(1,pop)); removeInput.disabled = pop <= 0; }
    if (removeButton) removeButton.disabled = pop <= 0;
  }
}


// ==========================================
// KI-UNTERNEHMEN – unabhängige Simulation
// Drei Konkurrenten mit eigenem Geld, Lager, Forschung und Expansion.
// Die KI handelt direkt mit dem gemeinsamen Markt, niemals mit dem Spielerlager.
// ==========================================
const AI_COMPANY_CONFIG = [
  { id: 'helios', name: 'Helios Industries', style: 'Industrie & Produktion', color: 'blue', focus: 'Produktion' },
  { id: 'nova', name: 'Nova Dynamics', style: 'Forschung & Expansion', color: 'violet', focus: 'Expansion' },
  { id: 'nasga', name: 'Nasga', style: 'Rohstoffe & Handel', color: 'green', focus: 'Handel' }
];
const AI_TICK_INTERVAL_MS = 5 * 60 * 1000; // fünf Spielminuten zwischen strategischen Entscheidungen
const AI_RESOURCE_NAMES = {
  iron: 'Eisen', steel: 'Stahl', stone: 'Stein', buildingMaterials: 'Baustoffe',
  glass: 'Glas', electronics: 'Elektronik', silicon: 'Silizium', chips: 'Chips',
  batteries: 'Batterien', machines: 'Maschinen', nickelOre: 'Nickelerz',
  graphite: 'Graphit', crudeOil: 'Rohöl', polymers: 'Polymere', copper: 'Kupfer'
};
function ensureAICompanies() {
  if (!state.aiCompanies || typeof state.aiCompanies !== 'object') state.aiCompanies = {};
  AI_COMPANY_CONFIG.forEach((cfg, index) => {
    let company = state.aiCompanies[cfg.id];
    if (!company || typeof company !== 'object') {
      company = {
        id: cfg.id, name: cfg.name, style: cfg.style, focus: cfg.focus,
        cash: 250000, research: 0, buildings: { ironMine: 1, stoneQuarry: 1 },
        inventory: { iron: 500, steel: 900, stone: 500, buildingMaterials: 500, glass: 150, electronics: 120, silicon: 200, chips: 50, batteries: 30, machines: 30, copper: 80, nickelOre: 0, graphite: 0, crudeOil: 0, polymers: 0 },
        planets: ['earth'], activeResearch: index === 0 ? 'Industrielle Grundlagen' : 'Raumfahrttechnik',
        researchProgress: 0, totalTrades: 0, lastDecisionMs: 0, lastProductionMs: gameNow(),
        log: ['Unternehmen gegründet und auf der Erde gestartet.'], lastAction: 'Start auf der Erde',
        expansions: 0, rockets: 0, marketValue: 0
      };
      state.aiCompanies[cfg.id] = company;
    }
    company.cash = Math.max(0, Number(company.cash) || 0);
    company.research = Math.max(0, Number(company.research) || 0);
    company.buildings = company.buildings && typeof company.buildings === 'object' ? company.buildings : {};
    company.inventory = company.inventory && typeof company.inventory === 'object' ? company.inventory : {};
    company.planets = Array.isArray(company.planets) && company.planets.length ? company.planets : ['earth'];
    company.log = Array.isArray(company.log) ? company.log.slice(0, 6) : [];
    company.lastDecisionMs = Math.max(0, Number(company.lastDecisionMs) || 0);
    company.lastProductionMs = Number.isFinite(Number(company.lastProductionMs)) ? Number(company.lastProductionMs) : gameNow();
  });
  return state.aiCompanies;
}
function aiLog(company, message) {
  company.log.unshift(`${new Date(GAME_EPOCH_UTC + Math.max(0, gameNow())).toISOString().slice(0,16).replace('T',' ')} · ${message}`);
  company.log = company.log.slice(0, 6);
  company.lastAction = message;
}
function aiInventory(company, key) { return Math.max(0, Number(company.inventory[key]) || 0); }
function aiMarketTrade(company, side, key, amount) {
  const config = MARKET_RESOURCES[key];
  if (!config || !(amount > 0)) return false;
  ensureMarketHistory();
  const item = market.resources[key];
  const price = marketPrice(key, side);
  if (side === 'buy') {
    const affordable = Math.min(amount, company.cash / Math.max(0.01, price), item.stock);
    if (affordable < 0.01) return false;
    const total = affordable * price;
    company.cash -= total;
    company.inventory[key] = aiInventory(company, key) + affordable;
    item.stock = Math.max(0, item.stock - affordable);
    item.demand = Math.max(0, Number(item.demand) || 0) + affordable / Math.max(1, config.capacity) * 100;
    company.totalTrades = (Number(company.totalTrades) || 0) + 1;
    recordMarketTrade('buy', key, affordable, price, total);
    market.tradeHistory[0].name = `${company.name}: ${AI_RESOURCE_NAMES[key] || resourceNames[key] || key}`;
    return true;
  }
  const available = aiInventory(company, key);
  const sold = Math.min(amount, available, Math.max(0, config.capacity - item.stock));
  if (sold < 0.01) return false;
  const total = sold * price;
  company.inventory[key] = available - sold;
  company.cash += total;
  item.stock = Math.min(config.capacity, item.stock + sold);
  item.soldStock = Math.max(0, Number(item.soldStock) || 0) + sold;
  item.supply = Math.max(0, Number(item.supply) || 0) + sold / Math.max(1, config.capacity) * 100;
  company.totalTrades = (Number(company.totalTrades) || 0) + 1;
  recordMarketTrade('sell', key, sold, price, total);
  market.tradeHistory[0].name = `${company.name}: ${AI_RESOURCE_NAMES[key] || resourceNames[key] || key}`;
  return true;
}
function aiTryBuy(company, key, target) {
  const missing = Math.max(0, target - aiInventory(company, key));
  if (missing < 1 || company.cash < 100) return false;
  return aiMarketTrade(company, 'buy', key, missing);
}
function aiBuild(company, key, cost, outputMessage) {
  if (company.cash < (cost.money || 0)) return false;
  for (const [resource, amount] of Object.entries(cost.resources || {})) {
    if (aiInventory(company, resource) < amount) return false;
  }
  Object.entries(cost.resources || {}).forEach(([resource, amount]) => {
    company.inventory[resource] = aiInventory(company, resource) - amount;
  });
  company.cash -= Number(cost.money || 0);
  company.buildings[key] = Math.max(0, Number(company.buildings[key]) || 0) + 1;
  aiLog(company, outputMessage || `Neues Gebäude errichtet: ${key}.`);
  return true;
}
function aiRunProduction(company, deltaSeconds) {
  if (!(deltaSeconds > 0)) return;
  const b = company.buildings, inv = company.inventory;
  const add = (key, amount) => { inv[key] = aiInventory(company, key) + Math.max(0, amount); };
  const take = (key, amount) => {
    const available = aiInventory(company, key);
    const used = Math.min(available, Math.max(0, amount));
    inv[key] = available - used;
    return amount > 0 ? used / amount : 1;
  };
  // Erde: Basisrohstoffe, Stahl und Baustoffe. Keine Spielerbestände werden berührt.
  add('iron', (Number(b.ironMine) || 0) * 0.1 * deltaSeconds);
  add('stone', (Number(b.stoneQuarry) || 0) * 0.1 * deltaSeconds);
  const steelRate = (Number(b.steelworks) || 0) * 0.2;
  if (steelRate > 0) {
    const ratio = take('iron', steelRate * deltaSeconds);
    add('steel', steelRate * deltaSeconds * ratio);
  }
  const materialRate = (Number(b.buildingMaterialsFactory) || 0) * 0.15;
  if (materialRate > 0) {
    const ratio = take('stone', (Number(b.buildingMaterialsFactory) || 0) * 0.2 * deltaSeconds);
    add('buildingMaterials', materialRate * deltaSeconds * ratio);
  }
  const labCount = Number(b.researchLab) || 0;
  company.research += labCount * deltaSeconds;
  // Kleine laufende Betriebskosten halten die Geldwirtschaft relevant, ohne sofort zu ruinieren.
  const upkeep = ((Number(b.ironMine)||0) + (Number(b.stoneQuarry)||0) + (Number(b.steelworks)||0) + (Number(b.researchLab)||0)) * 0.15 * deltaSeconds;
  company.cash = Math.max(0, company.cash - upkeep);
  // Überschüsse werden auf dem gemeinsamen Markt verkauft, sofern das Lager groß genug ist.
  ['iron','steel','stone','buildingMaterials'].forEach(key => {
    if (aiInventory(company, key) > (key === 'steel' ? 700 : 1000)) aiMarketTrade(company, 'sell', key, aiInventory(company, key) - (key === 'steel' ? 700 : 1000));
  });
}
function aiStrategyStep(company, cfg) {
  const b = company.buildings;
  // KI handelt mit dem gemeinsamen Markt, um fehlende Baurohstoffe zu beschaffen.
  if (aiInventory(company, 'steel') < 250) aiTryBuy(company, 'steel', 900);
  if (aiInventory(company, 'buildingMaterials') < 180) aiTryBuy(company, 'buildingMaterials', 500);
  if (aiInventory(company, 'glass') < 80) aiTryBuy(company, 'glass', 180);
  if (aiInventory(company, 'electronics') < 60) aiTryBuy(company, 'electronics', 150);
  if (aiInventory(company, 'iron') < 100) aiTryBuy(company, 'iron', 500);
  if (aiInventory(company, 'stone') < 150) aiTryBuy(company, 'stone', 400);

  if (cfg.id === 'helios') {
    if (!b.steelworks && aiInventory(company, 'iron') >= 150 && aiInventory(company, 'steel') >= 100) {
      if (aiBuild(company, 'steelworks', { money: 12000, resources: { steel: 100 } }, 'Stahlwerk gebaut – Helios stärkt die Industrie.')) return;
    }
    if (!b.buildingMaterialsFactory && aiInventory(company, 'stone') >= 250 && aiInventory(company, 'steel') >= 80) {
      if (aiBuild(company, 'buildingMaterialsFactory', { money: 10000, resources: { steel: 80 } }, 'Baustofffabrik gebaut.')) return;
    }
    if ((Number(b.ironMine)||0) < 4 && aiInventory(company, 'steel') >= 80) {
      if (aiBuild(company, 'ironMine', { money: 8000, resources: { steel: 80 } }, 'Neue Eisenmine eröffnet.')) return;
    }
    if ((Number(b.stoneQuarry)||0) < 3 && aiInventory(company, 'steel') >= 60) {
      if (aiBuild(company, 'stoneQuarry', { money: 6000, resources: { steel: 60 } }, 'Steinbruch erweitert.')) return;
    }
  } else {
    if (!b.researchLab && aiInventory(company, 'steel') >= 150 && aiInventory(company, 'buildingMaterials') >= 100 && aiInventory(company, 'glass') >= 40) {
      if (aiBuild(company, 'researchLab', { money: 18000, resources: { steel: 150, buildingMaterials: 100, glass: 40 } }, 'Forschungslabor eröffnet – Nova startet ein Forschungsprogramm.')) return;
    }
    if ((Number(b.ironMine)||0) < 3 && aiInventory(company, 'steel') >= 80) {
      if (aiBuild(company, 'ironMine', { money: 8000, resources: { steel: 80 } }, 'Eisenabbau ausgebaut.')) return;
    }
    if (!b.steelworks && aiInventory(company, 'iron') >= 150 && aiInventory(company, 'steel') >= 100) {
      if (aiBuild(company, 'steelworks', { money: 12000, resources: { steel: 100 } }, 'Stahlwerk errichtet.')) return;
    }
    if (company.research >= 1800 && !b.rocketFactory && aiInventory(company, 'steel') >= 500 && aiInventory(company, 'buildingMaterials') >= 500) {
      if (aiBuild(company, 'rocketFactory', { money: 35000, resources: { steel: 500, buildingMaterials: 500 } }, 'Raketenfabrik gebaut – Expansion wird vorbereitet.')) return;
    }
  }

  // Gemeinsame Forschungsziele: Technologiepunkte aus Laboren und langfristige Investitionen.
  if (company.research >= 600 && !b.researchLab && aiInventory(company, 'steel') >= 150 && aiInventory(company, 'buildingMaterials') >= 100 && aiInventory(company, 'glass') >= 40) {
    if (aiBuild(company, 'researchLab', { money: 18000, resources: { steel: 150, buildingMaterials: 100, glass: 40 } }, 'Forschungslabor gebaut.')) return;
  }
  if (company.research >= 1200 && company.planets.length < 2 && company.cash >= 50000 && aiInventory(company, 'steel') >= 700 && aiInventory(company, 'buildingMaterials') >= 500) {
    company.cash -= 50000;
    company.inventory.steel = aiInventory(company, 'steel') - 700;
    company.inventory.buildingMaterials = aiInventory(company, 'buildingMaterials') - 500;
    company.planets.push('luna');
    company.expansions = (Number(company.expansions)||0) + 1;
    company.rockets = (Number(company.rockets)||0) + 1;
    aiLog(company, 'Erste Expansion nach Luna – Außenposten und Transportmission simuliert.');
    return;
  }
  if (company.cash > 100000 && aiInventory(company, 'steel') > 500) {
    aiMarketTrade(company, 'buy', 'silicon', 100);
  }
}
function updateAICompanies(now = gameNow()) {
  const companies = ensureAICompanies();
  AI_COMPANY_CONFIG.forEach(cfg => {
    const company = companies[cfg.id];
    const previous = Math.max(0, Number(company.lastProductionMs) || now);
    const deltaSeconds = Math.min(600, Math.max(0, (now - previous) / 1000));
    company.lastProductionMs = now;
    aiRunProduction(company, deltaSeconds);
    const lastDecision = Math.max(0, Number(company.lastDecisionMs) || 0);
    if (now - lastDecision >= AI_TICK_INTERVAL_MS) {
      company.lastDecisionMs = now;
      aiStrategyStep(company, cfg);
    }
    const stockValue = Object.entries(company.inventory).reduce((sum, [key, amount]) => sum + Math.max(0, Number(amount)||0) * (MARKET_RESOURCES[key]?.base || 1), 0);
    company.marketValue = Math.max(0, company.cash) + stockValue + Object.values(company.buildings).reduce((sum, count) => sum + Math.max(0, Number(count)||0) * 5000, 0) + company.planets.length * 50000;
  });
}

const STOCK_COMPANY_CONFIG = {
  helios: { startPrice: 100, policy: 'Industrie priorisieren: Produktionsanlagen und stabile Umsätze ausbauen.' },
  nova: { startPrice: 80, policy: 'Forschung priorisieren: Technologie entwickeln und neue Welten erschließen.' },
  nasga: { startPrice: 60, policy: 'Rohstoffe und Handel priorisieren: Lagerbestände und Marktchancen nutzen.' }
};
function ensureStockMarket() {
  if (!state.stockMarket || typeof state.stockMarket !== 'object') state.stockMarket = {};
  if (!state.stockMarket.companies || typeof state.stockMarket.companies !== 'object') state.stockMarket.companies = {};
  if (!Array.isArray(state.stockMarket.history)) state.stockMarket.history = [];
  if (!Number.isFinite(Number(state.stockMarket.lastUpdateSlot))) state.stockMarket.lastUpdateSlot = 0;
  // Dividenden werden einmal pro Ingame-Tag ausgezahlt. Alte Spielstände starten
  // mit dem aktuellen Tag, damit keine rückwirkenden Ausschüttungen entstehen.
  if (!Number.isFinite(Number(state.stockMarket.lastDividendDay))) {
    state.stockMarket.lastDividendDay = Math.floor(Math.max(0, gameNow()) / (24 * 60 * 60 * 1000));
  }
  if (!Array.isArray(state.stockMarket.dividendHistory)) state.stockMarket.dividendHistory = [];
  for (const cfg of AI_COMPANY_CONFIG) {
    const stockCfg = STOCK_COMPANY_CONFIG[cfg.id];
    const item = state.stockMarket.companies[cfg.id] ||= {
      price: stockCfg.startPrice, totalShares: 1000, availableShares: 1000,
      playerShares: 0, lastPrice: stockCfg.startPrice,
      lastCompanyValue: null, priceHistory: []
    };
    item.totalShares = 1000;
    item.playerShares = Math.max(0, Math.min(1000, Number(item.playerShares) || 0));
    item.availableShares = Math.max(0, Math.min(1000 - item.playerShares, Number(item.availableShares ?? 1000)));
    item.price = Math.max(stockCfg.startPrice * 0.25, Math.min(stockCfg.startPrice * 4, Number(item.price) || stockCfg.startPrice));
    item.lastPrice = Math.max(1, Number(item.lastPrice) || item.price);
    if (!Array.isArray(item.priceHistory)) item.priceHistory = [];
    if (!item.priceHistory.length) item.priceHistory.push({time: gameNow(), price: item.price});
    item.priceHistory = item.priceHistory.filter(point => Number(point.time) >= gameNow() - 24 * 60 * 60 * 1000).slice(-145);
  }
  return state.stockMarket;
}
// Aktienkurse ändern sich alle 10 Spielminuten unabhängig voneinander.
// Unternehmensentwicklung beeinflusst die Tendenz; zufällige Marktbewegungen sorgen für Schwankungen.
function updateStockMarket(now = gameNow()) {
  const sm = ensureStockMarket();
  const slot = Math.floor(Math.max(0, now) / (10 * 60 * 1000));
  if (slot <= Number(sm.lastUpdateSlot || 0)) return false;
  const companies = ensureAICompanies();
  for (const cfg of AI_COMPANY_CONFIG) {
    const stock = sm.companies[cfg.id];
    const company = companies[cfg.id];
    const currentValue = Math.max(0, Number(company.marketValue) || 0);
    let performancePressure = 0;
    if (Number.isFinite(Number(stock.lastCompanyValue)) && Number(stock.lastCompanyValue) > 0) {
      const performance = (currentValue - Number(stock.lastCompanyValue)) / Number(stock.lastCompanyValue);
      performancePressure = Math.max(-0.04, Math.min(0.04, performance * 0.35));
    }
    const currentPrice = stock.price;
    const randomMove = Math.random() < 0.10
      ? (Math.random() < 0.5 ? -1 : 1) * (0.10 + Math.random() * 0.05)
      : (Math.random() * 2 - 1) * (0.02 + Math.random() * 0.05);
    const change = Math.max(-0.18, Math.min(0.18, performancePressure + randomMove));
    stock.lastPrice = currentPrice;
    stock.price = Math.max(STOCK_COMPANY_CONFIG[cfg.id].startPrice * 0.25,
      Math.min(STOCK_COMPANY_CONFIG[cfg.id].startPrice * 4, currentPrice * (1 + change)));
    stock.lastCompanyValue = currentValue;
    stock.priceDirection = stock.price > currentPrice ? 'up' : stock.price < currentPrice ? 'down' : 'flat';
    stock.priceHistory.push({time: now, price: stock.price});
    stock.priceHistory = stock.priceHistory.filter(point => Number(point.time) >= now - 24 * 60 * 60 * 1000).slice(-145);
  }
  sm.lastUpdateSlot = slot;
  saveGame(false);
  const panel = document.querySelector('#ai-companies-panel');
  if (panel && !panel.hidden) renderAICompaniesPanel();
  return true;
}
// Dividenden werden täglich aus dem verfügbaren Firmenkapital bezahlt.
// Die Ausschüttung entspricht 1 % des Firmenkapitals; der Spieler erhält
// davon den Anteil seiner Aktien. Ohne eigene Aktien gibt es keine Auszahlung.
function updateStockDividends(now = gameNow()) {
  const sm = ensureStockMarket();
  const currentDay = Math.floor(Math.max(0, now) / (24 * 60 * 60 * 1000));
  const lastDay = Number(sm.lastDividendDay) || 0;
  if (currentDay <= lastDay) return false;
  const companies = ensureAICompanies();
  let paidAny = false;
  for (let day = lastDay + 1; day <= currentDay; day++) {
    for (const cfg of AI_COMPANY_CONFIG) {
      const stock = sm.companies[cfg.id];
      const company = companies[cfg.id];
      const ownedShares = Math.max(0, Math.min(stock.totalShares, Number(stock.playerShares) || 0));
      if (!ownedShares) continue;
      const availableCash = Math.max(0, Number(company.cash) || 0);
      const dividendPool = availableCash * 0.01;
      const payout = Math.min(availableCash, dividendPool * ownedShares / stock.totalShares);
      if (!(payout > 0)) continue;
      company.cash = Math.max(0, availableCash - payout);
      state.gunniDollar = Math.max(0, Number(state.gunniDollar) || 0) + payout;
      stock.totalDividendsPaid = Math.max(0, Number(stock.totalDividendsPaid) || 0) + payout;
      stock.lastDividendAmount = payout;
      stock.lastDividendDay = day;
      const entry = {
        companyId: cfg.id, companyName: cfg.name, amount: payout,
        shares: ownedShares, perShare: dividendPool / stock.totalShares,
        day, time: day * 24 * 60 * 60 * 1000
      };
      sm.dividendHistory.unshift(entry);
      recordCompanyFinance('income', payout, `Dividende: ${cfg.name}`);
      paidAny = true;
    }
  }
  sm.dividendHistory = sm.dividendHistory.slice(0, 100);
  sm.lastDividendDay = currentDay;
  if (paidAny) {
    saveGame(false);
    renderTopResources();
    const hq = document.querySelector('#company-headquarters-panel');
    if (hq && !hq.hidden) renderCompanyHeadquarters();
    showMarketToast('Dividende ausgezahlt und in der Unternehmenszentrale verbucht.');
  }
  return paidAny;
}
function stockMoney(value) {
  return `${Number(value || 0).toLocaleString('de-DE', {maximumFractionDigits: 2})} GD`;
}
function tradeCompanyShares(companyId, side, quantity) {
  const cfg = AI_COMPANY_CONFIG.find(x => x.id === companyId);
  if (!cfg) return;
  const stock = ensureStockMarket().companies[companyId];
  const amount = Math.floor(Number(quantity));
  if (!Number.isFinite(amount) || amount < 1) return showMarketToast('Bitte mindestens 1 Aktie auswählen.');
  const price = stock.price * (side === 'buy' ? 1.01 : 0.99);
  if (side === 'buy') {
    if (amount > stock.availableShares) return showMarketToast('Nicht genügend Aktien verfügbar.');
    const cost = amount * price;
    if (Number(state.gunniDollar || 0) < cost) return showMarketToast('Nicht genügend GünniDollars für diesen Kauf.');
    state.gunniDollar = Math.max(0, Number(state.gunniDollar || 0) - cost);
    stock.availableShares -= amount;
    stock.playerShares += amount;
    ensureCompanyFinance();
    recordCompanyFinance('expense', cost, `Aktienkauf: ${cfg.name} (${amount} Aktien)`);
  } else {
    if (amount > stock.playerShares) return showMarketToast('Du besitzt nicht genügend Aktien zum Verkauf.');
    const revenue = amount * price;
    state.gunniDollar = Number(state.gunniDollar || 0) + revenue;
    stock.playerShares -= amount;
    stock.availableShares = Math.min(stock.totalShares - stock.playerShares, stock.availableShares + amount);
    ensureCompanyFinance();
    recordCompanyFinance('income', revenue, `Aktienverkauf: ${cfg.name} (${amount} Aktien)`);
  }
  ensureStockMarket().history.unshift({
    companyId, companyName: cfg.name, side, amount, price, total: amount * price, time: gameNow()
  });
  state.stockMarket.history = state.stockMarket.history.slice(0, 30);
  saveGame(false);
  renderTopResources();
  renderAICompaniesPanel();
  showMarketToast(`${side === 'buy' ? 'Gekauft' : 'Verkauft'}: ${amount} Aktien ${cfg.name} · ${stockMoney(amount * price)}.`);
}
function renderStockExchange() {
  const sm = ensureStockMarket();
  const cash = Number(state.gunniDollar || 0);
  const cards = AI_COMPANY_CONFIG.map(cfg => {
    const stock = sm.companies[cfg.id];
    const company = ensureAICompanies()[cfg.id];
    const marketCap = stock.price * stock.totalShares;
    const policy = STOCK_COMPANY_CONFIG[cfg.id].policy;
    const changePercent = stock.lastPrice > 0 ? ((stock.price - stock.lastPrice) / stock.lastPrice) * 100 : 0;
    const trendClass = changePercent > 0 ? 'stock-up' : changePercent < 0 ? 'stock-down' : 'stock-flat';
    const trendLabel = changePercent > 0 ? '▲' : changePercent < 0 ? '▼' : '●';
    const points = stock.priceHistory.slice(-24);
    const prices = points.map(point => Number(point.price) || stock.price);
    const minPrice = Math.min(...prices), maxPrice = Math.max(...prices);
    const polyline = prices.map((price, index) => {
      const x = prices.length < 2 ? 50 : index / (prices.length - 1) * 100;
      const y = maxPrice === minPrice ? 15 : 28 - ((price - minPrice) / (maxPrice - minPrice)) * 24;
      return `${x},${y}`;
    }).join(' ');
    return `<article class="stock-card">
      <div class="stock-card-head"><div><h3>${({helios:'🔷',nova:'🟣',nasga:'🟢'}[cfg.id] || '🏢')} ${cfg.name}</h3><span class="hint">${cfg.style}</span></div><div class="stock-price-wrap"><strong class="stock-price">${stockMoney(stock.price)}</strong><span class="stock-change ${trendClass}">${trendLabel} ${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('de-DE',{maximumFractionDigits:2})}%</span></div></div>
      <div class="stock-chart-wrap"><svg class="stock-chart ${trendClass}" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Kursverlauf der letzten 24 Spielstunden"><polyline points="${polyline}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg><small>Letzte 24 Spielstunden · Aktualisierung alle 10 Spielminuten</small></div>
      <div class="stock-metrics">
        <div><span>Aktienwert / Börsenwert</span><strong>${stockMoney(marketCap)}</strong></div>
        <div><span>Aktien gesamt</span><strong>${stock.totalShares.toLocaleString('de-DE')}</strong></div>
        <div><span>Verfügbar</span><strong>${stock.availableShares.toLocaleString('de-DE')}</strong></div>
        <div><span>Dein Depot</span><strong>${stock.playerShares.toLocaleString('de-DE')} Aktien · ${stockMoney(stock.playerShares * stock.price)}</strong></div>
      </div>
      <div class="stock-policy"><strong>🏛️ Unternehmenspolitik</strong><p>${policy}</p><small>Unternehmenswert laut Simulation: ${stockMoney(company.marketValue)}</small></div>
      <label class="stock-quantity-label" for="stock-qty-${cfg.id}">Anzahl Aktien</label>
      <input class="stock-quantity" id="stock-qty-${cfg.id}" type="number" min="1" step="1" value="1" inputmode="numeric">
      <div class="stock-actions"><button type="button" data-stock-action="buy" data-company-id="${cfg.id}">Kaufen</button><button type="button" class="stock-sell" data-stock-action="sell" data-company-id="${cfg.id}">Verkaufen</button></div>
    </article>`;
  }).join('');
  const history = sm.history.length ? `<div class="stock-history"><h3>Letzte Transaktionen</h3><ul>${sm.history.slice(0,8).map(x => `<li>${x.side === 'buy' ? 'Kauf' : 'Verkauf'} · ${escapeCompanyText(x.companyName)} · ${x.amount} Aktien · ${stockMoney(x.total)}</li>`).join('')}</ul></div>` : '<p class="hint">Noch keine Aktiengeschäfte durchgeführt.</p>';
  return `<section class="stock-exchange">
    <h3>📈 Börsenübersicht</h3>
    <div class="stock-overview">
      <div><span>Dein GünniDollar-Guthaben</span><strong>${stockMoney(cash)}</strong></div>
      <div><span>Wert deines Aktiendepots</span><strong>${stockMoney(AI_COMPANY_CONFIG.reduce((sum,cfg) => sum + sm.companies[cfg.id].playerShares * sm.companies[cfg.id].price, 0))}</strong></div>
      <div><span>Unternehmen an der Börse</span><strong>${AI_COMPANY_CONFIG.length}</strong></div>
    </div>
    <p class="hint">Sofortiger Handel zum Marktpreis. Beim Kauf fällt ein Aufschlag von 1 %, beim Verkauf ein Abschlag von 1 % an. Jede Firma startet mit 1.000 Aktien.</p>
    <div class="stock-grid">${cards}</div>${history}
  </section>`;
}

function renderAICompaniesPanel() {
  const panel = document.querySelector('#ai-companies-content');
  if (!panel) return;
  const companies = ensureAICompanies();
  const formatMoney = value => `${Number(value||0).toLocaleString('de-DE',{maximumFractionDigits:0})} GünniDollar`;
  const formatAmount = value => Number(value||0).toLocaleString('de-DE',{maximumFractionDigits:1});
  const cards = AI_COMPANY_CONFIG.map(cfg => {
    const c = companies[cfg.id];
    const buildingCount = Object.values(c.buildings).reduce((sum, count) => sum + Math.max(0, Number(count)||0), 0);
    const researchPercent = Math.min(100, (c.research % 2000) / 20);
    const buildingRows = Object.entries(c.buildings).filter(([,count]) => Number(count)>0).map(([key,count]) => `<span class="ai-company-chip">${({ironMine:'⛏️ Eisenmine',stoneQuarry:'🪨 Steinbruch',steelworks:'🏭 Stahlwerk',buildingMaterialsFactory:'🧱 Baustofffabrik',researchLab:'🔬 Forschungslabor',rocketFactory:'🚀 Raketenfabrik'}[key]||key)} ×${Number(count)}</span>`).join('');
    return `<article class="ai-company-card">
      <h3>${({helios:'🔷',nova:'🟣',nasga:'🟢'}[cfg.id]||'🏢')} ${cfg.name}</h3>
      <div class="ai-company-tagline">${cfg.style} · Startstandort Erde</div>
      <div class="ai-company-stats">
        <div class="ai-company-stat"><span>Unternehmenswert</span><strong>${formatMoney(c.marketValue)}</strong></div>
        <div class="ai-company-stat"><span>Geldbestand</span><strong>${formatMoney(c.cash)}</strong></div>
        <div class="ai-company-stat"><span>Forschung</span><strong>${formatAmount(c.research)} FP</strong></div>
        <div class="ai-company-stat"><span>Gebäude</span><strong>${buildingCount}</strong></div>
        <div class="ai-company-stat"><span>Erschlossene Welten</span><strong>${c.planets.length}</strong></div>
        <div class="ai-company-stat"><span>Markthandel</span><strong>${Number(c.totalTrades)||0} Aktionen</strong></div>
      </div>
      <div class="hint" style="margin-top:10px">Forschungsfortschritt</div><div class="ai-company-progress"><i style="width:${researchPercent}%"></i></div>
      <div class="ai-company-buildings">${buildingRows || '<span class="ai-company-chip">Noch keine Gebäude</span>'}</div>
      <p class="hint" style="margin:9px 0 0">Letzte Aktion: ${escapeCompanyText(c.lastAction || 'Start auf der Erde')}</p>
    </article>`;
  }).join('');
  const ranking = AI_COMPANY_CONFIG.map(cfg => ({...cfg, value: companies[cfg.id].marketValue})).sort((a,b)=>b.value-a.value);
  const logs = ranking.map((cfg,index) => `<li><strong>${index+1}. ${cfg.name}:</strong> ${escapeCompanyText(companies[cfg.id].lastAction || 'Plant die nächsten Schritte.')}</li>`).join('');
  panel.innerHTML = `<div class="ai-companies-grid">${cards}</div>
    ${renderStockExchange()}
    <div class="ai-company-log"><strong>📡 Unternehmensmeldungen</strong><ul>${logs}</ul><p class="hint">Die KI läuft lokal in deinem Spiel. Sie hat eigene Lager und Konten; nur ihre Handelsaktionen beeinflussen den gemeinsamen Markt. Forschung und Expansion werden simuliert und verändern nicht deinen Spielstand.</p></div>`;
}
function setupAICompanies() {
  const button = document.querySelector('#ai-companies-button');
  const panel = document.querySelector('#ai-companies-panel');
  const close = document.querySelector('#ai-companies-close');
  button?.addEventListener('click', () => {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#company-panel','#flight-center-panel','#cyclic-missions-panel','#company-headquarters-panel'].forEach(sel => {
        const el = document.querySelector(sel); if (el) el.hidden = true;
      });
      const menu = document.querySelector('#main-menu'); if (menu) menu.hidden = true;
      renderAICompaniesPanel();
    }
  });
  close?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  panel?.addEventListener('click', event => {
    const button = event.target.closest('[data-stock-action]');
    if (!button) return;
    const companyId = button.dataset.companyId;
    const quantity = panel.querySelector(`#stock-qty-${companyId}`)?.value;
    tradeCompanyShares(companyId, button.dataset.stockAction, quantity);
  });
  ['market-button','news-button','economy-button','company-button','colonists-button','research-button','tasks-button','introduction-button','settings-button','save-menu-button','flight-center-button','asteroids-button','cyclic-missions-button'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  });
}


const SOLAR_HELP_TOPICS = [
  {category:'Grundlagen',title:'Erste Schritte',keywords:'start spielbeginn anfang',body:'<p>Beginne mit den Aufgaben und baue die ersten benötigten Gebäude. Die Aufgaben helfen dir, wichtige Grundlagen Schritt für Schritt kennenzulernen.</p><ul><li>Prüfe zuerst die Aufgaben.</li><li>Wähle einen Planeten aus, um seine Informationen und Gebäude zu sehen.</li><li>Behalte Rohstoffe, Lager und Stromversorgung im Blick.</li></ul>'},
  {category:'Grundlagen',title:'Planeten und Rohstoffe',keywords:'planet erde luna mars merkur venus eisen nickel graphit rohstoff',body:'<p>Wähle einen Himmelskörper in der Sonnensystemansicht aus, um seine verfügbaren Rohstoffe und Informationen anzusehen. Nicht jeder Rohstoff ist auf jedem Planeten vorhanden.</p><p>Ein Rohstoffvorkommen ist begrenzt. Prüfe vor dem Bau, ob der passende Rohstoff am Standort verfügbar ist.</p>'},
  {category:'Gebäude & Produktion',title:'Gebäude bauen',keywords:'bau baumenü gebäude kosten bauzeit',body:'<p>Öffne bei einem Planeten die Gebäudeübersicht. Dort siehst du die verfügbaren Gebäude und – sofern angezeigt – Kosten, Voraussetzungen und Bauzeit.</p><p>Ein Gebäude kann Rohstoffe, Strom oder eine Freischaltung durch Forschung benötigen. Lies die Angaben auf der Gebäudekarte vor dem Bau.</p>'},
  {category:'Gebäude & Produktion',title:'Produktionsketten verstehen',keywords:'produktion verbrauch fabrik eisen stahl graphit nickel',body:'<p>Viele Produkte entstehen in mehreren Schritten. Ein weiterverarbeitendes Gebäude benötigt die passenden Einsatzstoffe aus dem Lager oder aus vorgelagerten Produktionsgebäuden.</p><ul><li>Prüfe die Produktion und den Verbrauch.</li><li>Stelle sicher, dass benötigte Rohstoffe vorhanden sind.</li><li>Wenn die Produktion stockt, kontrolliere Rohstoffbestand, Strom und Freischaltungen.</li></ul>'},
  {category:'Energie',title:'Strom und Stromspeicher',keywords:'strom energie mw megawatt speicher batterie ladeleistung entladeleistung',body:'<p>Stromerzeuger liefern Energie, Gebäude verbrauchen sie. Vergleiche die erzeugte Leistung mit dem aktuellen Verbrauch.</p><p>Stromspeicher verschieben Energie zeitlich: Sie können Strom aufnehmen und später wieder abgeben. Ein Speicher ersetzt keine dauerhafte Stromquelle, wenn über längere Zeit mehr verbraucht als erzeugt wird.</p>'},
  {category:'Forschung',title:'Forschung und Freischaltungen',keywords:'forschung forschungspunkte fp technologie nickelmine',body:'<p>Im Forschungsmenü findest du verfügbare Forschungsprojekte und ihre Voraussetzungen. Manche Gebäude oder Rohstoffe werden erst nach Abschluss einer passenden Forschung zugänglich.</p><p>Wenn etwas noch nicht gebaut werden kann, prüfe zuerst, ob eine Forschung oder Aufgabe fehlt.</p>'},
  {category:'Transport & Raumfahrt',title:'Raketen und Transporte',keywords:'rakete fracht flugzeit transport orbit flugzentrale',body:'<p>Die Flugzentrale verwaltet Raketen und Transporte. Prüfe vor dem Start Ziel, verfügbare Rakete, Fracht und Flugstatus.</p><p>Für einen Transport müssen passende Kapazität und verfügbare Ladung vorhanden sein. Achte darauf, ob eine Mission Hin- und Rückflug oder weitere Bedingungen verwendet.</p>'},
  {category:'Transport & Raumfahrt',title:'Asteroidenabbau',keywords:'asteroid asteroidenabbau miner ionium uran',body:'<p>Im Menü Asteroidenabbau findest du die verfügbaren Asteroiden und die dazugehörigen Abbauoptionen. Prüfe die enthaltenen Rohstoffe und die Voraussetzungen der eingesetzten Technik.</p>'},
  {category:'Wirtschaft',title:'Wirtschaft und Unternehmenszentrale',keywords:'wirtschaft geld günnidollar unternehmenszentrale einnahmen ausgaben',body:'<p>Das Wirtschaftsmenü zeigt wirtschaftliche Informationen deines Unternehmens. In der Unternehmenszentrale findest du zusätzliche Finanzübersichten, wenn sie für deinen Spielstand verfügbar ist.</p><p>Behalte Einnahmen und Ausgaben im Auge, damit laufende Kosten und geplante Investitionen zusammenpassen.</p>'},
  {category:'Wirtschaft',title:'KI-Unternehmen, Aktien und Dividenden',keywords:'ki unternehmen helios nova nasga aktien aktienmarkt umsatz dividende anteile',body:'<p>Im Menü <strong>KI-Unternehmen</strong> kannst du Informationen zu den KI-Firmen ansehen und – sofern der Handel verfügbar ist – Aktien kaufen oder verkaufen.</p><p>Dividenden hängen von den Regeln und der finanziellen Lage des jeweiligen Unternehmens ab. Der angezeigte voraussichtliche Betrag ist keine Garantie für eine künftige Auszahlung.</p><p>Aktienkurse können sich verändern. Kaufe daher nur, wenn du die möglichen Schwankungen einkalkulierst.</p>'},
  {category:'Wirtschaft',title:'Markt und Rohstoffpreise',keywords:'markt marktplatz preise kaufen verkaufen handel rohstoffe',body:'<p>Im Markt kannst du verfügbare Rohstoffe handeln. Preise können schwanken und Kauf- sowie Verkaufspreise voneinander abweichen.</p><p>Vergleiche den Preis mit deinem aktuellen Lagerbestand und deiner Produktionsplanung, bevor du handelst.</p>'},
  {category:'Kolonisten',title:'Kolonisten und Versorgung',keywords:'kolonisten bevölkerung habitat nahrung wasser wachstum atmosphäre druck sauerstoff',body:'<p>Kolonisten benötigen geeignete Lebensbedingungen, freien Wohnraum sowie Versorgung mit Nahrung und Wasser. Normale Wohngebäude benötigen mindestens 1,05 bar und 18–25 % Sauerstoff in der Atmosphäre. Habitate besitzen eine eigene Lebenserhaltung.</p><p>Wenn Kolonisten nicht einziehen oder sich die Bevölkerung nicht wie erwartet entwickelt, kontrolliere den Atmosphärenstatus, verfügbare Unterkünfte und die Versorgung des Standorts.</p>'},
  {category:'Spielverwaltung',title:'Speichern und Spielgeschwindigkeit',keywords:'speichern spielstand laden autosave geschwindigkeit x1 x2 x3 x5 x10',body:'<p>Nutze das Spielmenü für die verfügbaren Speicher- und Ladefunktionen. Das Spiel speichert außerdem bestimmte Änderungen automatisch.</p><p>Über die Spielgeschwindigkeit kannst du den Ablauf der Spielzeit beschleunigen. Bei höherer Geschwindigkeit laufen zeitbasierte Vorgänge entsprechend schneller ab.</p>'},
  {category:'Terraforming',title:'Terraforming und Atmosphäre aufbauen',keywords:'terraforming atmosphäre atmosphärendruck bar co2 sauerstoff stickstoff gas regulator planet luna venus kolonie kolonisten habitat',body:'<p><strong>Terraforming</strong> bedeutet, die Atmosphäre eines Himmelskörpers gezielt aufzubauen und ihre Zusammensetzung zu verbessern. Wähle den gewünschten Planeten oder Luna aus und öffne die Atmosphären-Ansicht auf der Oberfläche.</p><ol><li>Baue bei Bedarf ein <strong>Gas- und Kohlenstofflager</strong>, um freigegebene Gase lokal zu lagern.</li><li>Stelle die benötigten Gase her oder transportiere sie zum Zielkörper.</li><li>In der Atmosphären-Ansicht kannst du vorhandene Gase aus dem Oberflächenlager in die Atmosphäre abgeben. Prüfe vor jeder Freigabe die Gasart und Menge.</li><li>Der <strong>Atmosphären-Regulator</strong> gibt automatisch bis zu 0,2 t CO₂ pro Ingame-Sekunde aus dem lokalen Oberflächenlager ab. Ist kein CO₂ vorhanden, pausiert er und setzt fort, sobald wieder CO₂ im Lager liegt.</li><li>Kontrolliere danach den Atmosphärendruck und den Sauerstoffanteil in der Planetenansicht.</li></ol><p>Der Druck steigt abhängig von der freigegebenen Gasmenge und den Eigenschaften des Himmelskörpers. Ein höherer Druck allein bedeutet noch nicht, dass die Atmosphäre für normale Wohngebäude geeignet ist.</p>'},
  {category:'Terraforming',title:'Atmosphäre: Voraussetzungen für Kolonisten',keywords:'kolonisten kolonist wohngebäude habitat 1,05 bar 0,9 bar sauerstoff o2 18 25 prozent freigabe',body:'<p>Für <strong>normale Wohngebäude</strong> müssen beide Bedingungen gleichzeitig erfüllt sein:</p><ul><li><strong>Atmosphärendruck mindestens 1,05 bar</strong></li><li><strong>Sauerstoffanteil zwischen 18 % und 25 %</strong></li></ul><p>Wenn der Druck unter 1,05 bar liegt oder der Sauerstoffanteil außerhalb dieses Bereichs liegt, bleiben normale Wohngebäude für Kolonisten gesperrt.</p><p><strong>Habitate</strong> verfügen über eigene Lebenserhaltung und können unabhängig von der Freigabe normaler Wohngebäude genutzt werden. Die Spielanzeige markiert die Atmosphäre unter 0,9 bar als kritisch; prüfe den Status des jeweiligen Himmelskörpers vor der Ansiedlung.</p><p><strong>Tipp:</strong> Öffne die Atmosphären-Ansicht und beobachte sowohl den Druck in bar als auch den Sauerstoffanteil. Gib nicht einfach nur Sauerstoff ab, ohne die Gesamtgasmenge und den Anteil im Blick zu behalten.</p>'},
];

function setupHelpSystem(){
  const panel=document.querySelector('#help-panel');
  const menu=document.querySelector('#main-menu');
  const menuButton=document.querySelector('#help-button');
  const floatingButton=document.querySelector('#floating-help-button');
  const closeButton=document.querySelector('#help-close');
  const search=document.querySelector('#help-search');
  const categoryList=document.querySelector('#help-category-list');
  const articles=document.querySelector('#help-articles');
  const guide=document.querySelector('#help-guide-overlay');
  const guideTitle=document.querySelector('#help-guide-title');
  const guideContent=document.querySelector('#help-guide-step-content');
  const guideProgressText=document.querySelector('#help-guide-progress-text');
  const guideProgressBar=document.querySelector('#help-guide-progress-bar');
  const guideBack=document.querySelector('#help-guide-back');
  const guideNext=document.querySelector('#help-guide-next');
  if(!panel||!articles||!guide) return;
  const categories=['Alle Themen',...new Set(SOLAR_HELP_TOPICS.map(topic=>topic.category))];
  let selectedCategory='Alle Themen';
  const guideSteps=[
    {title:'1. Überblick gewinnen',body:'<p>Willkommen bei <strong>Solar Frontier: Origins</strong>! Dein Unternehmen wächst Schritt für Schritt. Du musst nicht alles auf einmal lernen.</p><p><strong>Dein erster Anlaufpunkt:</strong> Öffne das Menü und sieh dir die Aufgaben an. Sie geben dir konkrete nächste Ziele.</p>'},
    {title:'2. Planeten und Gebäude',body:'<p>Wähle einen Planeten in der Sonnensystemansicht aus. Prüfe die dortigen Rohstoffe und öffne die Gebäudeübersicht.</p><p>Bevor du baust, lies Kosten, Voraussetzungen und mögliche Forschungshinweise auf der Gebäudekarte.</p>'},
    {title:'3. Rohstoffe und Produktion',body:'<p>Gebäude können Rohstoffe abbauen oder verarbeiten. Achte darauf, welche Materialien eine Produktionsanlage benötigt und was sie herstellt.</p><p>Wenn etwas nicht produziert, prüfe Lagerbestand, Rohstoffvorkommen, Forschung und Strom.</p>'},
    {title:'4. Forschung und Energie',body:'<p>Mit Forschung schaltest du weitere Möglichkeiten frei. Öffne das Forschungsmenü, wenn ein Gebäude oder Rohstoff noch gesperrt ist.</p><p>Vergleiche bei der Energie die Stromerzeugung mit dem Verbrauch. Speicher helfen, Energie zu einem späteren Zeitpunkt zu nutzen.</p>'},
    {title:'5. Wirtschaft ausbauen',body:'<p>Später kannst du Transporte, Kolonistenversorgung, Markt und KI-Unternehmen nutzen. Kontrolliere regelmäßig deine Einnahmen, Ausgaben und Lagerbestände.</p><p>Aktienkurse können schwanken und Dividenden sind nicht garantiert. Nutze das Spielhandbuch jederzeit über das ❔-Symbol.</p><p><strong>Fertig!</strong> Du kannst den Assistenten später erneut starten.</p>'}
  ];
  function renderCategories(){
    categoryList.innerHTML='';
    categories.forEach(category=>{
      const button=document.createElement('button');button.type='button';button.className='help-category-button'+(category===selectedCategory?' active':'');button.textContent=category;
      button.addEventListener('click',()=>{selectedCategory=category;renderCategories();renderArticles();});categoryList.appendChild(button);
    });
  }
  function renderArticles(){
    const query=String(search?.value||'').trim().toLocaleLowerCase('de');
    const list=SOLAR_HELP_TOPICS.filter(topic=>(selectedCategory==='Alle Themen'||topic.category===selectedCategory)&&(!query||`${topic.title} ${topic.category} ${topic.keywords} ${topic.body.replace(/<[^>]*>/g,' ')}`.toLocaleLowerCase('de').includes(query)));
    articles.innerHTML='';
    if(!list.length){articles.innerHTML='<div class="help-empty">Keine passenden Themen gefunden. Versuche einen anderen Suchbegriff.</div>';return;}
    list.forEach((topic,index)=>{const details=document.createElement('details');details.className='help-article';if(query&&index===0)details.open=true;const summary=document.createElement('summary');summary.textContent=`${topic.title}`;const body=document.createElement('div');body.className='help-article-body';body.innerHTML=topic.body;details.append(summary,body);articles.appendChild(details);});
  }
  function openHelp(){
    panel.hidden=false;if(menu)menu.hidden=true;
    ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#company-panel','#company-headquarters-panel','#flight-center-panel','#cyclic-missions-panel','#asteroids-panel'].forEach(selector=>{const element=document.querySelector(selector);if(element)element.hidden=true;});
    renderCategories();renderArticles();panel.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function closeGuide(){guide.hidden=true;}
  let guideStep=0;
  function renderGuide(){
    const step=guideSteps[guideStep];guideTitle.textContent=step.title;guideContent.innerHTML=step.body;
    guideProgressText.textContent=`Schritt ${guideStep+1} von ${guideSteps.length}`;
    guideProgressBar.style.width=`${((guideStep+1)/guideSteps.length)*100}%`;
    guideBack.disabled=guideStep===0;guideNext.textContent=guideStep===guideSteps.length-1?'Fertig ✓':'Weiter →';
  }
  function startGuide(){openHelp();guideStep=0;renderGuide();guide.hidden=false;}
  menuButton?.addEventListener('click',openHelp);floatingButton?.addEventListener('click',openHelp);closeButton?.addEventListener('click',()=>{panel.hidden=true;});
  search?.addEventListener('input',renderArticles);
  document.querySelector('#help-show-all')?.addEventListener('click',()=>{selectedCategory='Alle Themen';if(search)search.value='';renderCategories();renderArticles();});
  document.querySelector('#help-guide-start')?.addEventListener('click',startGuide);
  document.querySelector('#help-guide-close')?.addEventListener('click',closeGuide);
  guideBack?.addEventListener('click',()=>{if(guideStep>0){guideStep--;renderGuide();}});
  guideNext?.addEventListener('click',()=>{if(guideStep<guideSteps.length-1){guideStep++;renderGuide();}else closeGuide();});
  guide?.addEventListener('click',event=>{if(event.target===guide)closeGuide();});
  renderCategories();renderArticles();
}


function setupMainMenu() {
  const menuButton = document.querySelector('#main-menu-button');
  const menu = document.querySelector('#main-menu');
  const menuClose = document.querySelector('#main-menu-close');
  const introButton = document.querySelector('#introduction-button');
  const introPanel = document.querySelector('#introduction-panel');
  const introClose = document.querySelector('#introduction-close');
  if (menuButton && menu) menuButton.onclick = () => { unlockAudio(); menu.hidden = !menu.hidden; if(!menu.hidden) applyLanguage(menu); };
  if (menuClose && menu) menuClose.onclick = () => { menu.hidden = true; };
  const settingsButton=document.querySelector('#settings-button'); const settingsPanel=document.querySelector('#settings-panel'); const settingsClose=document.querySelector('#settings-close');
  if(settingsButton && settingsPanel) settingsButton.addEventListener('click',()=>{ unlockAudio(); settingsPanel.hidden=!settingsPanel.hidden; if(!settingsPanel.hidden && menu) menu.hidden=true; const panels=['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel']; panels.forEach(sel=>{const el=document.querySelector(sel); if(el) el.hidden=true;}); applyLanguage(settingsPanel); });
  if(settingsClose && settingsPanel) settingsClose.addEventListener('click',()=>{settingsPanel.hidden=true;});
  setupAudio();
  if (introButton && introPanel) introButton.addEventListener('click', () => {
    introPanel.hidden = false; if (menu) menu.hidden = true;
    const newsPanel=document.querySelector('#news-panel'), economyPanel=document.querySelector('#economy-panel');
    if(newsPanel) newsPanel.hidden=true; if(economyPanel) economyPanel.hidden=true; applyLanguage(introPanel);
  });
  if (introClose && introPanel) introClose.addEventListener('click', () => { introPanel.hidden = true; });
}


let flightCenterActiveTab = 'fleet';

function organizeFlightCenterTabs() {
  const content = document.querySelector('#flight-center-content');
  const rocketWindow = content?.querySelector('.rocket-window');
  if (!content || !rocketWindow || rocketWindow.dataset.tabbed === 'true') return;
  rocketWindow.dataset.tabbed = 'true';

  const tabs = [
    { id: 'fleet', label: '🚀 Flotte', title: 'Raketenflotte' },
    { id: 'production', label: '🏭 Produktion', title: 'Raketenproduktion' },
    { id: 'flights', label: '🛰️ Flugkontrolle', title: 'Flugkontrolle' },
    { id: 'cargo', label: '📦 Fracht & Treibstoff', title: 'Fracht und Treibstoff' },
    { id: 'stationing', label: '📍 Stationierung', title: 'Raketen stationieren' }
  ];
  const panes = Object.fromEntries(tabs.map(tab => {
    const pane = document.createElement('section');
    pane.className = 'flight-center-tab-panel';
    pane.dataset.flightTabPanel = tab.id;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-label', tab.title);
    return [tab.id, pane];
  }));
  const nav = document.createElement('div');
  nav.className = 'flight-center-tabs';
  nav.setAttribute('role', 'tablist');
  nav.setAttribute('aria-label', 'Bereiche der Flugzentrale');
  tabs.forEach(tab => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'flight-center-tab';
    button.dataset.flightTab = tab.id;
    button.setAttribute('role', 'tab');
    button.textContent = tab.label;
    button.addEventListener('click', () => {
      flightCenterActiveTab = tab.id;
      content.querySelectorAll('[data-flight-tab]').forEach(item => {
        const active = item.dataset.flightTab === tab.id;
        item.classList.toggle('active', active);
        item.setAttribute('aria-selected', active ? 'true' : 'false');
        item.tabIndex = active ? 0 : -1;
      });
      content.querySelectorAll('[data-flight-tab-panel]').forEach(item => {
        item.hidden = item.dataset.flightTabPanel !== tab.id;
      });
    });
    nav.appendChild(button);
  });

  const stockTypes = [
    ['hercules1', 'Herkules 1'], ['hercules2', 'Herkules 2'], ['atlas1', 'Atlas 1'],
    ['titan1', 'Titan 1'], ['colonistShuttle', 'Kolonisten-Shuttle'],
    ['mobileMiner', 'Mobile Minerrakete'], ['tankRocket', 'Tankrakete']
  ];
  const source = state.selected;
  const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  const available = stockTypes.reduce((sum, [type]) => sum + Math.max(0, Number(getRocketStockCount(type, source, type === 'colonistShuttle' ? 'surface' : mode)) || 0), 0);
  const activeFlights = rockets.filter(rocket => rocket.status !== 'returned').length;
  const activeMissions = orbitMissions.filter(mission => mission.status !== 'completed' && mission.status !== 'deleted').length;
  const queue = Array.isArray(rocketFactoryQueue[source]) ? rocketFactoryQueue[source] : [];
  const overview = document.createElement('div');
  overview.className = 'flight-center-overview';
  overview.innerHTML = `
    <div class="flight-center-location"><span class="flight-center-kicker">AKTUELLER STANDORT</span><strong>📍 ${bodies[source]?.name || source}</strong><small>${mode === 'orbit' ? 'Orbit' : 'Oberfläche'} · Über die Planetenansicht änderbar</small></div>
    <div class="flight-center-metric"><span>Verfügbare Raketen</span><strong>${available.toLocaleString('de-DE')}</strong><small>am ausgewählten Standort</small></div>
    <div class="flight-center-metric"><span>Aktive Flüge</span><strong>${activeFlights.toLocaleString('de-DE')}</strong><small>im Sonnensystem</small></div>
    <div class="flight-center-metric"><span>Produktion</span><strong>${queue.length.toLocaleString('de-DE')}</strong><small>in der Warteschlange</small></div>
    <div class="flight-center-metric"><span>Zyklische Missionen</span><strong>${activeMissions.toLocaleString('de-DE')}</strong><small>angelegt</small></div>`;
  rocketWindow.prepend(overview);

  let currentFlightSection = false;
  const children = Array.from(rocketWindow.children).filter(node => node !== overview);
  for (const node of children) {
    const text = (node.textContent || '').trim();
    const lower = text.toLocaleLowerCase('de-DE');
    let destination = 'fleet';
    if (node.matches('.rocket-stationing')) destination = 'stationing';
    else if (node.matches('.rocket-factory-queue') || (node.matches('details.rocket-type-card') && /· bau/i.test(text))) destination = 'production';
    else if (node.matches('.transport-route')) destination = 'flights';
    else if (node.matches('details.rocket-cargo-card') || /· fracht/i.test(text) || node.matches('.tank-rocket-launch-card')) destination = 'cargo';
    else if (node.matches('details.rocket-type-card')) destination = 'flights';
    else if (node.matches('h3') && /zyklische orbitmissionen|aktive transporte/i.test(text)) {
      currentFlightSection = true;
      destination = 'flights';
    } else if (currentFlightSection) destination = 'flights';
    else if (node.matches('hr')) destination = 'flights';
    else if (node.matches('p') && /flugzeit zum zielort/i.test(text)) destination = 'flights';
    panes[destination].appendChild(node);
  }

  // Kompakte Flottenübersicht mit den vorhandenen Bestandswerten; keine neuen Bestände oder Mechaniken.
  const fleetCards = document.createElement('div');
  fleetCards.className = 'flight-center-fleet-list';
  fleetCards.innerHTML = stockTypes.map(([type, label]) => {
    const stockMode = type === 'colonistShuttle' ? 'surface' : mode;
    const count = Math.max(0, Number(getRocketStockCount(type, source, stockMode)) || 0);
    return `<div class="flight-center-fleet-card"><span class="flight-center-fleet-icon">${rocketTypes[type]?.icon || '🚀'}</span><span><strong>${label}</strong><small>${mode === 'orbit' && type === 'colonistShuttle' ? 'Nur Oberfläche' : `Standort: ${mode === 'orbit' ? 'Orbit' : 'Oberfläche'}`}</small></span><b>${count}</b></div>`;
  }).join('');
  panes.fleet.prepend(fleetCards);

  const intro = panes.fleet.querySelector('.hint');
  if (intro) intro.classList.add('flight-center-intro');
  const limit = panes.fleet.querySelector('.rocket-limit-status');
  if (limit) limit.classList.add('flight-center-limit');

  const tabBar = document.createElement('div');
  tabBar.className = 'flight-center-tab-layout';
  tabBar.append(nav);
  tabs.forEach(tab => {
    const heading = document.createElement('div');
    heading.className = 'flight-center-tab-heading';
    heading.innerHTML = `<span>${tab.label}</span><small>${tab.title}</small>`;
    panes[tab.id].prepend(heading);
    tabBar.append(panes[tab.id]);
  });
  rocketWindow.append(tabBar);
  const active = tabs.some(tab => tab.id === flightCenterActiveTab) ? flightCenterActiveTab : 'fleet';
  content.querySelector(`[data-flight-tab="${active}"]`)?.click();
}

// Interaktive Flugzentrale-Einführung: zeigt jeweils das Feld, das der Spieler selbst bedienen soll.
let flightTutorialState = { active: false, step: 0 };
const flightTutorialSteps = [
  { selector: '#rocket-destination', title: '1/5 · Zielplanet wählen', text: 'Wähle hier den Planeten aus, zu dem die Rakete fliegen soll. Die Auswahl gilt für die Raketensteuerung.' },
  { selector: '#rocket-destination-mode', title: '2/5 · Zielort festlegen', text: 'Entscheide, ob die Rakete im Orbit ankommen oder auf der Oberfläche landen soll. Für eine Landung muss die Oberfläche gewählt sein.' },
  { selector: '#rocket-cargo-resource', title: '3/5 · Fracht auswählen', text: 'Wähle den Rohstoff, den die Rakete transportieren soll. Du kannst nur Fracht verwenden, die am aktuellen Standort verfügbar ist.' },
  { selector: '#rocket-cargo-number', title: '4/5 · Frachtmenge eingeben', text: 'Gib die gewünschte Menge ein. Achte auf den angezeigten Lagerbestand und die Kapazität der Rakete.' },
  { selector: '#launch-hercules', title: '5/5 · Flug starten', text: 'Wenn eine Herkules 1 verfügbar ist und die Frachtmenge größer als null ist, kannst du hier starten. Ist die Schaltfläche grau, prüfe Raketenbestand, Fracht und nötige Infrastruktur. Das Tutorial startet keinen Flug für dich.' }
];
function startFlightTutorial() {
  const panel = document.querySelector('#flight-center-panel');
  if (panel) panel.hidden = false;
  const menu = document.querySelector('#main-menu'); if (menu) menu.hidden = true;
  flightTutorialState = { active: true, step: 0 };
  let box = document.querySelector('#flight-tutorial-box');
  if (!box) {
    box = document.createElement('section');
    box.id = 'flight-tutorial-box'; box.className = 'flight-tutorial-box';
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-live', 'polite');
    box.innerHTML = '<div class="flight-tutorial-box-head"><strong id="flight-tutorial-title"></strong><button type="button" id="flight-tutorial-close" aria-label="Tutorial schließen">✕</button></div><p id="flight-tutorial-text"></p><div class="flight-tutorial-actions"><button type="button" id="flight-tutorial-back">← Zurück</button><span id="flight-tutorial-count"></span><button type="button" id="flight-tutorial-next">Weiter →</button></div>';
    document.body.appendChild(box);
    box.querySelector('#flight-tutorial-close').addEventListener('click', stopFlightTutorial);
    box.querySelector('#flight-tutorial-back').addEventListener('click', () => { if (flightTutorialState.step > 0) { flightTutorialState.step--; updateFlightTutorialTarget(); } });
    box.querySelector('#flight-tutorial-next').addEventListener('click', () => {
      if (flightTutorialState.step >= flightTutorialSteps.length - 1) { stopFlightTutorial(); return; }
      flightTutorialState.step++; updateFlightTutorialTarget();
    });
  }
  updateFlightTutorialTarget();
}
function updateFlightTutorialTarget() {
  document.querySelectorAll('.flight-tutorial-highlight').forEach(el => el.classList.remove('flight-tutorial-highlight'));
  const box = document.querySelector('#flight-tutorial-box');
  if (!flightTutorialState.active || !box) return;
  const step = flightTutorialSteps[flightTutorialState.step];
  const target = document.querySelector(step.selector);
  box.hidden = false;
  box.querySelector('#flight-tutorial-title').textContent = step.title;
  box.querySelector('#flight-tutorial-text').textContent = step.text;
  box.querySelector('#flight-tutorial-count').textContent = `${flightTutorialState.step + 1} von ${flightTutorialSteps.length}`;
  box.querySelector('#flight-tutorial-back').disabled = flightTutorialState.step === 0;
  box.querySelector('#flight-tutorial-next').textContent = flightTutorialState.step === flightTutorialSteps.length - 1 ? 'Tutorial beenden ✓' : 'Weiter →';
  if (target) {
    target.classList.add('flight-tutorial-highlight');
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
  } else {
    box.querySelector('#flight-tutorial-text').textContent += ' Dieses Feld ist gerade nicht sichtbar. Prüfe, ob die passende Raketenkarte geöffnet ist, oder gehe zum nächsten Schritt.';
  }
}
function stopFlightTutorial() {
  flightTutorialState.active = false;
  document.querySelectorAll('.flight-tutorial-highlight').forEach(el => el.classList.remove('flight-tutorial-highlight'));
  const box = document.querySelector('#flight-tutorial-box'); if (box) box.hidden = true;
}

function renderFlightCenter() {
  const panel = document.querySelector('#flight-center-panel');
  const content = document.querySelector('#flight-center-content');
  if (!panel || !content) return;
  const body = bodies[state.selected];
  if (!body || state.selected === 'sun') {
    const next = Object.keys(bodies).find(id => id !== 'sun');
    if (next) state.selected = next;
  }
  const selectedBody = bodies[state.selected];
  const openDetails = captureDetailsOpenState(content);
  content.innerHTML = `<div class="flight-center-command-banner"><div><span class="flight-center-kicker">MISSION CONTROL</span><h3>Flotten- und Flugmanagement</h3><p>Raketen verwalten, Transporte steuern und Produktion überwachen.</p></div><div class="flight-center-banner-actions"><button type="button" id="flight-tutorial-start" class="flight-tutorial-start">🎓 Schritt-für-Schritt-Tutorial</button><span class="flight-center-signal"><i></i> SYSTEM ONLINE</span></div></div>${renderRocketWindow(selectedBody)}`;
  organizeFlightCenterTabs();
  restoreDetailsOpenState(content, openDetails);
  rocketControlRoot = content;
  bindRocketControls();
  const tutorialButton = content.querySelector('#flight-tutorial-start');
  if (tutorialButton) tutorialButton.addEventListener('click', startFlightTutorial);
  if (flightTutorialState.active) updateFlightTutorialTarget();
}

function renderCyclicMissionsPanel() {
  const openDetails = captureDetailsOpenState(document.querySelector('#cyclic-missions-content'));
  const panel = document.querySelector('#cyclic-missions-panel');
  const content = document.querySelector('#cyclic-missions-content');
  if (!panel || !content) return;
  const planetEntries = Object.entries(bodies).filter(([id]) => id !== 'sun');
  const sourceOptions = planetEntries.map(([id, body]) => `<option value="${id}" ${id === state.selected ? 'selected' : ''}>${body.name}</option>`).join('');
  const resourceKeys = ['stone','ice','coal','gas','crudeOil','water','grain','vegetables','food','algaeBiomass','polymers','rubber','plastics','wood','biomass','vehicles','co2','carbon','oxygen','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','chips','uranium','processedUranium','nuclearFuel','steel','bauxite','aluminiumOxide','aluminium','titanium','nickelOre','graphite'];
  const resourceOptions = resourceKeys.map(key => `<option value="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}</option>`).join('');
  const total = orbitMissions.length;
  const active = orbitMissions.filter(m => ['waiting','outbound','returning'].includes(m.status)).length;
  const waiting = orbitMissions.filter(m => m.status === 'waiting' && m.message).length;
  const grouped = new Map(planetEntries.map(([id, body]) => [id, {body, missions: orbitMissions.filter(m => m.source === id)}]));
  const statusText = m => m.status === 'paused' ? 'Pausiert' : m.status === 'outbound' ? `Hinflug nach ${bodies[m.destination]?.name || m.destination}` : m.status === 'returning' ? 'Rückflug' : (m.message && /^Wartet auf|Orbit-Start- und Landevorrichtung fehlt/.test(m.message) ? m.message : `Nächster Start in ${Math.max(0, Math.ceil((Number(m.nextLaunchAt || 0) - gameNow()) / 1000))} s`);
  const missionCard = m => `<article class="cyclic-mission-card">
      <div class="cyclic-mission-card-head"><div class="cyclic-mission-rocket">🚀</div><div class="cyclic-mission-card-title"><strong>${rocketTypes[m.rocketType]?.name || m.rocketType} → ${bodies[m.destination]?.name || m.destination}</strong><small>${m.sourceMode === 'orbit' ? 'Orbit' : 'Oberfläche'} → ${m.destinationMode === 'orbit' ? 'Orbit' : 'Oberfläche'} · Mission #${m.id}</small></div><span class="cyclic-mission-status ${m.status === 'paused' ? 'is-paused' : m.message ? 'is-waiting' : m.status === 'outbound' || m.status === 'returning' ? 'is-active' : ''}">${m.status === 'paused' ? 'Pausiert' : m.status === 'outbound' ? 'Hinflug' : m.status === 'returning' ? 'Rückflug' : m.message ? 'Wartet' : 'Bereit'}</span></div>
      <div class="cyclic-mission-route"><span>📍 ${bodies[m.source]?.name || m.source}</span><span class="cyclic-route-line">⟶</span><span>🎯 ${bodies[m.destination]?.name || m.destination}</span></div>
      <div class="cyclic-mission-details"><span>📦 ${resourceNames[m.resource] || m.resource}: <strong>${Number(m.amount || 0).toLocaleString('de-DE')} ${['crudeOil','water'].includes(m.resource) ? 'L' : 't'}</strong></span><span>🔁 ${Number(m.waitSeconds || 0)} s Pause</span><span>🧮 ${Number(m.flightCount || m.completedFlights || 0).toLocaleString('de-DE')} abgeschlossene Zyklen</span></div>
      <div class="cyclic-mission-state">Status: ${statusText(m)}${m.message && !statusText(m).includes(m.message) ? ` · ${m.message}` : ''}</div>
      <div class="cyclic-mission-actions">${m.status === 'paused' ? `<button class="mission-resume" data-mission-id="${m.id}">▶ Fortsetzen</button>` : (m.status === 'waiting' ? `<button class="mission-pause" data-mission-id="${m.id}">⏸ Pausieren</button>` : '<small>Pause nach Rückkehr möglich</small>')}<button class="mission-delete danger" data-mission-id="${m.id}">Mission löschen</button></div>
    </article>`;
  const planetGroups = planetEntries.map(([id, body]) => {
    const missions = grouped.get(id).missions;
    return `<details class="cyclic-planet-group" ${id === state.selected && missions.length ? 'open' : ''}><summary><span class="cyclic-planet-name">${id === 'earth' ? '🌍' : '🪐'} ${body.name}</span><span class="cyclic-planet-count">${missions.length} Mission${missions.length === 1 ? '' : 'en'}</span></summary><div class="cyclic-planet-missions">${missions.length ? missions.map(missionCard).join('') : `<div class="cyclic-empty-state">Noch keine zyklischen Missionen mit Start auf ${body.name}.</div>`}</div></details>`;
  }).join('');
  content.innerHTML = `<div class="flight-center-command-banner cyclic-mission-banner"><div><span class="flight-center-kicker">MISSION CONTROL / AUTOMATION</span><h3>Zyklische Missionen</h3><p>Alle wiederkehrenden Transporte nach Startplanet gruppiert – auch bei 100 oder mehr Missionen übersichtlich.</p></div><span class="flight-center-signal"><i></i> LIVE-ÜBERSICHT</span></div>
    <div class="cyclic-mission-overview"><div><small>Gesamt</small><strong>${total}</strong></div><div><small>Aktiv / wartend</small><strong>${active}</strong></div><div><small>Blockiert</small><strong>${waiting}</strong></div></div>
    <details class="cyclic-create-panel" open><summary>＋ Neue zyklische Mission einrichten</summary><div class="cyclic-create-grid">
      <label>Startplanet<select id="mission-source">${sourceOptions}</select></label>
      <label>Startort<select id="mission-source-mode"><option value="surface" ${state.viewMode === 'orbit' ? '' : 'selected'}>🌍 Oberfläche</option><option value="orbit" ${state.viewMode === 'orbit' ? 'selected' : ''}>🛰️ Orbit</option></select></label>
      <label>Rakete<select id="mission-rocket-type"><option value="hercules1">Herkules 1 · 120 t/L</option><option value="hercules2">Herkules 2 · 300 t/L</option><option value="atlas1">Atlas 1 · 500 t/L</option><option value="titan1">Titan 1 · 1.500 t/L</option></select></label>
      <label>Zielplanet<select id="mission-destination">${planetEntries.filter(([id]) => id !== state.selected && flightTimes[id] !== undefined).map(([id,b]) => `<option value="${id}">${b.name}</option>`).join('')}</select></label>
      <label>Zielort<select id="mission-destination-mode"><option value="surface">🌍 Oberfläche</option><option value="orbit">🛰️ Orbit</option></select></label>
      <label>Transportierter Rohstoff<select id="mission-resource">${resourceOptions}</select></label>
      <label>Frachtmenge (t/L)<input id="mission-amount" type="number" min="0.01" step="0.01" value="100"></label>
      <label>Wartezeit nach Rückkehr (Sekunden)<input id="mission-wait" type="number" min="0" step="1" value="60"></label>
      <button id="create-orbit-mission" class="cyclic-create-button">➕ Mission erstellen</button>
    </div><p class="hint">Vor jedem Zyklus werden die benötigte Fracht und der Treibstoff geprüft. Fehlt etwas, bleibt die Mission mit sichtbarem Wartegrund in der Übersicht.</p></details>
    <div class="cyclic-missions-list-head"><h3>🗂️ Missionen nach Startplanet</h3><span>${total} gespeichert</span></div>
    <div class="cyclic-missions-list">${planetGroups || '<div class="cyclic-empty-state">Noch keine zyklischen Missionen vorhanden. Lege oben deine erste Mission an.</div>'}</div>`;
  const sourceSelect = content.querySelector('#mission-source');
  const destSelect = content.querySelector('#mission-destination');
  const sourceModeSelect = content.querySelector('#mission-source-mode');
  const refreshDestinations = () => {
    if (!sourceSelect || !destSelect) return;
    const old = destSelect.value;
    destSelect.innerHTML = planetEntries.filter(([id]) => id !== sourceSelect.value && flightTimes[id] !== undefined).map(([id,b]) => `<option value="${id}">${b.name}</option>`).join('');
    if ([...destSelect.options].some(o => o.value === old)) destSelect.value = old;
    const mode = sourceModeSelect?.value || 'surface';
    if (sourceModeSelect) { const surfaceOption = sourceModeSelect.querySelector('option[value="surface"]'); if (surfaceOption) surfaceOption.disabled = !hasPlanetSurface(sourceSelect.value); if (!hasPlanetSurface(sourceSelect.value)) sourceModeSelect.value = 'orbit'; }
    const targetMode = content.querySelector('#mission-destination-mode');
    if (targetMode) { const surfaceOption = targetMode.querySelector('option[value="surface"]'); if (surfaceOption) surfaceOption.disabled = !hasPlanetSurface(destSelect.value); if (!hasPlanetSurface(destSelect.value)) targetMode.value = 'orbit'; }
  };
  sourceSelect?.addEventListener('change', refreshDestinations);
  destSelect?.addEventListener('change', refreshDestinations);
  sourceModeSelect?.addEventListener('change', refreshDestinations);
  refreshDestinations();
  bindOrbitMissionControls(content);
  restoreDetailsOpenState(content, openDetails);
}

function setupTopPanels() {
  const flightCenterButton = document.querySelector('#flight-center-button');
  const flightCenterPanel = document.querySelector('#flight-center-panel');
  const flightCenterClose = document.querySelector('#flight-center-close');
  const cyclicButton = document.querySelector('#cyclic-missions-button');
  const cyclicPanel = document.querySelector('#cyclic-missions-panel');
  const cyclicClose = document.querySelector('#cyclic-missions-close');
  if (cyclicButton && cyclicPanel) cyclicButton.addEventListener('click', () => {
    cyclicPanel.hidden = !cyclicPanel.hidden;
    if (!cyclicPanel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#introduction-panel','#settings-panel','#market-panel','#asteroids-panel','#company-panel','#company-headquarters-panel','#flight-center-panel'].forEach(sel => { const el=document.querySelector(sel); if(el) el.hidden=true; });
      const menu=document.querySelector('#main-menu'); if(menu) menu.hidden=true;
      renderCyclicMissionsPanel();
    }
  });
  if (cyclicClose && cyclicPanel) cyclicClose.addEventListener('click', () => { cyclicPanel.hidden = true; });
  if (flightCenterButton && flightCenterPanel) flightCenterButton.addEventListener('click', () => {
    flightCenterPanel.hidden = !flightCenterPanel.hidden;
    if (!flightCenterPanel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#introduction-panel','#settings-panel','#market-panel','#asteroids-panel','#company-panel','#company-headquarters-panel','#cyclic-missions-panel'].forEach(sel => { const el=document.querySelector(sel); if(el) el.hidden=true; });
      const menu=document.querySelector('#main-menu'); if(menu) menu.hidden=true;
      renderFlightCenter();
    } else { rocketControlRoot = infoPanel; }
  });
  if (flightCenterClose && flightCenterPanel) flightCenterClose.addEventListener('click', () => { flightCenterPanel.hidden=true; rocketControlRoot=infoPanel; });

  const newsButton = document.querySelector('#news-button');
  const newsPanel = document.querySelector('#news-panel');
  const newsClose = document.querySelector('#news-close');
  const economyButton = document.querySelector('#economy-button');
  const marketButton = document.querySelector('#market-button');
  const marketPanel = document.querySelector('#market-panel');
  const marketClose = document.querySelector('#market-close');
  if (marketButton && marketPanel) marketButton.addEventListener('click', () => {
    marketPanel.hidden = !marketPanel.hidden;
    if (!marketPanel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#introduction-panel','#settings-panel','#asteroids-panel','#cyclic-missions-panel'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.hidden=true;});
      const menu=document.querySelector('#main-menu');if(menu)menu.hidden=true;
      renderMarket();
    }
  });
  if (marketClose && marketPanel) marketClose.addEventListener('click',()=>{marketPanel.hidden=true;});

  const economyPanel = document.querySelector('#economy-panel');
  const economyClose = document.querySelector('#economy-close');
  const researchButton = document.querySelector('#research-button');
  const researchPanel = document.querySelector('#research-panel');
  const asteroidsButton = document.querySelector('#asteroids-button');
  const asteroidsPanel = document.querySelector('#asteroids-panel');
  const asteroidsClose = document.querySelector('#asteroids-close');
  if (asteroidsButton && asteroidsPanel) asteroidsButton.addEventListener('click', () => { asteroidsPanel.hidden = !asteroidsPanel.hidden; if (!asteroidsPanel.hidden) { ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#introduction-panel','#settings-panel','#market-panel','#company-panel','#company-headquarters-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.hidden=true;}); const menu=document.querySelector('#main-menu');if(menu)menu.hidden=true; renderAsteroidsPanel(); } });
  if (asteroidsClose && asteroidsPanel) asteroidsClose.addEventListener('click',()=>{asteroidsPanel.hidden=true;});
  const researchClose = document.querySelector('#research-close');
  const tasksButton = document.querySelector('#tasks-button');
  const tasksPanel = document.querySelector('#tasks-panel');
  const tasksClose = document.querySelector('#tasks-close');
  const settingsPanel = document.querySelector('#settings-panel');
  const colonistsButton = document.querySelector('#colonists-button');
  const colonistsPanel = document.querySelector('#colonists-panel');
  const colonistsClose = document.querySelector('#colonists-close');
  if (colonistsButton && colonistsPanel) colonistsButton.addEventListener('click', () => {
    colonistsPanel.hidden = !colonistsPanel.hidden;
    if (!colonistsPanel.hidden) {
      [newsPanel, economyPanel, researchPanel, tasksPanel, document.querySelector('#introduction-panel'), settingsPanel, document.querySelector('#asteroids-panel')].forEach(el => { if (el) el.hidden = true; });
      const mainMenu = document.querySelector('#main-menu'); if (mainMenu) mainMenu.hidden = true;
      renderColonistsPanel();
    }
  });
  if (colonistsClose && colonistsPanel) colonistsClose.addEventListener('click', () => { colonistsPanel.hidden = true; });

  if (newsButton && newsPanel) newsButton.addEventListener('click', () => {
    newsPanel.hidden = !newsPanel.hidden;
    if (!newsPanel.hidden && economyPanel) economyPanel.hidden = true;
    const introPanel=document.querySelector('#introduction-panel'), mainMenu=document.querySelector('#main-menu');
    if (!newsPanel.hidden && introPanel) introPanel.hidden=true; if(mainMenu) mainMenu.hidden=true;
    applyLanguage(newsPanel);
  });
  if (newsClose && newsPanel) newsClose.addEventListener('click', () => { newsPanel.hidden = true; });
  if (economyButton && economyPanel) economyButton.addEventListener('click', () => {
    economyPanel.hidden = !economyPanel.hidden;
    if (!economyPanel.hidden && newsPanel) newsPanel.hidden = true;
    const introPanel=document.querySelector('#introduction-panel'), mainMenu=document.querySelector('#main-menu');
    if (!economyPanel.hidden && introPanel) introPanel.hidden=true; if(mainMenu) mainMenu.hidden=true;
    renderEconomy();
    applyLanguage(economyPanel);
  });
  if (economyClose && economyPanel) economyClose.addEventListener('click', () => { economyPanel.hidden = true; });
  if (researchButton && researchPanel) researchButton.addEventListener('click', () => {
    researchPanel.hidden = !researchPanel.hidden;
    if (!researchPanel.hidden) {
      if (newsPanel) newsPanel.hidden = true;
      if (economyPanel) economyPanel.hidden = true;
      const asteroidPanel = document.querySelector('#asteroids-panel'); if (asteroidPanel) asteroidPanel.hidden = true;
      const introPanel=document.querySelector('#introduction-panel'), mainMenu=document.querySelector('#main-menu');
      if (introPanel) introPanel.hidden=true; if(mainMenu) mainMenu.hidden=true;
      renderResearch();
      applyLanguage(researchPanel);
    }
  });
  if (researchClose && researchPanel) researchClose.addEventListener('click', () => { researchPanel.hidden = true; });
  if (tasksButton && tasksPanel) tasksButton.addEventListener('click', () => {
    tasksPanel.hidden = !tasksPanel.hidden;
    if (!tasksPanel.hidden) {
      if (newsPanel) newsPanel.hidden = true;
      if (economyPanel) economyPanel.hidden = true;
      const asteroidPanel = document.querySelector('#asteroids-panel'); if (asteroidPanel) asteroidPanel.hidden = true;
      if (researchPanel) researchPanel.hidden = true;
      const introPanel=document.querySelector('#introduction-panel'), mainMenu=document.querySelector('#main-menu');
      if (introPanel) introPanel.hidden=true; if(mainMenu) mainMenu.hidden=true;
      renderTasks();
      applyLanguage(tasksPanel);
    }
  });
  if (tasksClose && tasksPanel) tasksClose.addEventListener('click', () => { tasksPanel.hidden = true; });
}

function co2ProcessingProduction(id='earth', output='carbon') {
  const count = Number(getBuildingsOnPlanet(id).co2ProcessingPlant || 0);
  return count * 0.1;
}


// ==========================================
// UNTERNEHMEN – fester Vermögenswert
// ==========================================
const COMPANY_RESOURCE_VALUES = {
  stone:1, iron:3, coal:2, gas:4, bauxite:4, titanOre:12,
  steel:8, silicon:6, copper:8, aluminiumOxide:7, aluminium:12, titanium:25,
  buildingMaterials:4, glass:8, polymers:15, rubber:18, plastics:20,
  electronics:35, chips:60, batteries:25, machines:30, vehicles:500,
  water:0.002, food:15, grain:5, vegetables:7, algaeBiomass:4, oxygen:8,
  hydrogen:10, helium:20, helium3:100, uranium:50, processedUranium:90,
  nuclearFuel:150, chocolate:50, ice:2, lithium:30, copperOre:5, crudeOil:1,
  co2:1, carbon:5, processedTitan:35, cocoaBeans:10
};
const COMPANY_RESOURCE_NAMES = {
  stone:'Stein', iron:'Eisen', coal:'Kohle', gas:'Gas', bauxite:'Bauxit', titanOre:'Titanerz',
  steel:'Stahl', silicon:'Silizium', copper:'Kupfer', aluminiumOxide:'Aluminiumoxid', aluminium:'Aluminium',
  titanium:'Titan', buildingMaterials:'Baustoffe', glass:'Glas', polymers:'Polymere',
  rubber:'Gummi', plastics:'Kunststoff', electronics:'Elektronik', chips:'Chips', batteries:'Batterien',
  machines:'Maschinen', vehicles:'Fahrzeuge', water:'Wasser', food:'Lebensmittel', grain:'Getreide',
  vegetables:'Gemüse', algaeBiomass:'Algenbiomasse', oxygen:'Sauerstoff', hydrogen:'Wasserstoff',
  helium:'Helium', helium3:'Helium-3', uranium:'Uran', processedUranium:'Aufbereitetes Uran',
  nuclearFuel:'Kernbrennstoff', chocolate:'Schokolade', ice:'Eis', lithium:'Lithium',
  copperOre:'Kupfererz', crudeOil:'Rohöl', co2:'CO₂', carbon:'Kohlenstoff',
  processedTitan:'Aufbereitetes Titan', cocoaBeans:'Kakaobohnen'
};
function companyFormat(value) {
  return `${Number(value || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} GünniDollar`;
}
function calculateCompanyValue() {
  let buildingsValue = 0, stockValue = 0, rocketValue = 0;
  const buildingBreakdown = [];
  for (const id of Object.keys(bodies)) {
    if (id === 'sun') continue;
    const buildingCounts = getBuildingsOnPlanet(id) || {};
    let planetBuildingCount = 0, planetBuildingValue = 0;
    const planetBuildings = [];
    for (const [key, countValue] of Object.entries(buildingCounts)) {
      const count = Math.min(100000, Math.max(0, Math.floor(Number(countValue) || 0)));
      if (!count) continue;
      planetBuildingCount += count;
      planetBuildings.push({ key, count, name: buildingTypes[key]?.name || key });
      for (let n = 1; n <= count; n++) {
        const costs = demolitionCostMap(key, id, n) || {};
        // Rohstoffmengen mit dem festen Unternehmenswert des jeweiligen
        // Materials bewerten, statt Materialmengen als GünniDollar zu addieren.
        for (const [resource, amountValue] of Object.entries(costs)) {
          const amount = Math.max(0, Number(amountValue) || 0);
          const unitValue = COMPANY_RESOURCE_VALUES[resource];
          if (unitValue !== undefined) planetBuildingValue += amount * unitValue;
        }
      }
    }
    buildingsValue += planetBuildingValue;
    if (planetBuildings.length) buildingBreakdown.push({
      id, name: bodies[id]?.name || id, count: planetBuildingCount,
      value: planetBuildingValue, buildings: planetBuildings.sort((a,b) => a.name.localeCompare(b.name, 'de'))
    });
    for (const storage of [getPlanetStorage(id), getOrbitStorage(id)]) {
      for (const [key, amountValue] of Object.entries(storage || {})) {
        const amount = Math.max(0, Number(amountValue) || 0);
        const rate = COMPANY_RESOURCE_VALUES[key];
        if (rate !== undefined) stockValue += amount * rate;
      }
    }
  }
  // Feste Unternehmenswerte je fertiger Rakete (keine Materialkosten-Bewertung).
  const rocketUnitValues = { hercules1: 1300, hercules2: 2100, atlas1: 3000, titan1: 4300, mobileMiner: 6500 };
  const rocketNames = { hercules1: 'Herkules 1', hercules2: 'Herkules 2', atlas1: 'Atlas 1', titan1: 'Titan 1', mobileMiner: 'Mobile Minerrakete' };
  const rocketStocks = [
    ['hercules1', rocketStock], ['hercules2', rocketStock2],
    ['atlas1', rocketStockAtlas1], ['titan1', rocketStockTitan1], ['mobileMiner', rocketStockMobileMiner]
  ];
  const rocketBreakdown = [];
  for (const [type, stock] of rocketStocks) {
    let count = 0;
    for (const amount of Object.values(stock || {})) count += Math.max(0, Number(amount) || 0);
    rocketValue += count * rocketUnitValues[type];
    rocketBreakdown.push({ type, name: rocketNames[type], count, unitValue: rocketUnitValues[type], value: count * rocketUnitValues[type] });
  }
  const cash = Math.max(0, Number(state.gunniDollar) || 0);
  const finance = ensureCompanyFinance();
  const debts = 0;
  return {
    buildingsValue, stockValue, rocketValue, cash, debts,
    total: buildingsValue + stockValue + rocketValue + cash - debts,
    buildingBreakdown, rocketBreakdown,
    incomeTotal: finance.incomeTotal, expenseTotal: finance.expenseTotal,
    profit: finance.incomeTotal - finance.expenseTotal,
    financeHistory: finance.history
  };
}

// ==========================================
// UNTERNEHMENSAUFTRÄGE – STUFE 1: LOKALE LIEFERUNGEN
// Drei Angebote pro 6 Ingame-Stunden, maximal zwei aktive Aufträge.
// Lieferung ausschließlich aus dem Oberflächenlager des Zielplaneten.
// ==========================================
const COMPANY_ORDER_CYCLE_MS = 6 * 60 * 60 * 1000;
const COMPANY_ORDER_MAX_ACTIVE = 2;
const COMPANY_ORDER_OFFER_COUNT = 3;
const COMPANY_ORDER_HISTORY_LIMIT = 30;
const COMPANY_ORDER_DEADLINE_OPTIONS_HOURS = [24, 48, 72];

function ensureCompanyOrders(now = gameNow()) {
  let changed = false;
  if (!state.companyOrders || typeof state.companyOrders !== 'object') {
    state.companyOrders = { reputation: 0, offers: [], active: [], completed: [], failed: [], lastCycleSlot: null, nextId: 1, unlockedLevel: 1 };
    changed = true;
  }
  const orders = state.companyOrders;
  orders.reputation = Math.max(0, Number(orders.reputation) || 0);
  for (const key of ['offers', 'active', 'completed', 'failed']) {
    if (!Array.isArray(orders[key])) { orders[key] = []; changed = true; }
  }
  // Firmenstufe 1 („Mond Startup“) darf Aufträge nur auf Erde und Luna erhalten.
  const levelOnePlanets = new Set(['earth', 'luna']);
  const invalidActiveOrders = orders.active.filter(order => !levelOnePlanets.has(order.planetId));
  if (invalidActiveOrders.length) {
    orders.failed.unshift(...invalidActiveOrders.map(order => ({
      ...order, status: 'cancelled', finishedAt: now,
      reason: 'Für Firmenstufe 1 nicht freigegeben (nur Erde und Luna)'
    })));
    orders.active = orders.active.filter(order => levelOnePlanets.has(order.planetId));
    changed = true;
  }
  const validOffers = orders.offers.filter(order => levelOnePlanets.has(order.planetId));
  if (validOffers.length !== orders.offers.length) changed = true;
  orders.offers = validOffers;
  orders.nextId = Math.max(1, Math.floor(Number(orders.nextId) || 1));
  orders.unlockedLevel = orders.reputation >= 100 ? 2 : 1;
  if (orders.lastCycleSlot == null || !Number.isFinite(Number(orders.lastCycleSlot))) {
    orders.lastCycleSlot = Math.floor(Math.max(0, now) / COMPANY_ORDER_CYCLE_MS);
    orders.offers = createCompanyOrderOffers(COMPANY_ORDER_OFFER_COUNT);
    changed = true;
  }
  return { orders, changed };
}

function companyOrderPlanetIds() {
  // Stufe 1 ist das „Mond Startup“: Aufträge gibt es ausschließlich auf Erde und Luna.
  return ['earth', 'luna'].filter(id => bodies[id] && hasPlanetSurface(id));
}

function createCompanyOrderOffers(count = COMPANY_ORDER_OFFER_COUNT) {
  const planets = companyOrderPlanetIds();
  const resources = Object.keys(MARKET_RESOURCES).filter(key => resourceNames[key] && MARKET_RESOURCES[key]);
  const combinations = [];
  for (const planetId of planets) {
    for (const resourceKey of resources) combinations.push({ planetId, resourceKey });
  }
  for (let i = combinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
  }
  const offers = [];
  const orders = state.companyOrders;
  for (const combo of combinations.slice(0, count)) {
    const config = MARKET_RESOURCES[combo.resourceKey];
    const unitPrice = Math.max(0.01, marketPrice(combo.resourceKey, 'buy'));
    const targetValues = [1000, 2500, 5000, 10000, 25000, 50000];
    const targetValue = targetValues[Math.floor(Math.random() * targetValues.length)] * (0.85 + Math.random() * 0.3);
    const quantity = Math.max(0.01, Math.round((targetValue / unitPrice) * 100) / 100);
    const reward = Math.round(quantity * unitPrice * 1.10 * 100) / 100;
    const deadlineHours = Math.random() < 0.5
      ? null
      : COMPANY_ORDER_DEADLINE_OPTIONS_HOURS[Math.floor(Math.random() * COMPANY_ORDER_DEADLINE_OPTIONS_HOURS.length)];
    let reputationReward = 5;
    if (reward >= 250000) reputationReward = 10;
    else if (reward >= 100000) reputationReward = 9;
    else if (reward >= 50000) reputationReward = 8;
    else if (reward >= 20000) reputationReward = 7;
    else if (reward >= 5000) reputationReward = 6;
    offers.push({
      id: orders.nextId++,
      planetId: combo.planetId,
      resourceKey: combo.resourceKey,
      quantity,
      unit: config.unit || 't',
      unitPriceAtCreation: unitPrice,
      reward,
      reputationReward,
      deadlineHours,
      createdAt: gameNow()
    });
  }
  return offers;
}

function companyOrderQuantity(value, unit) {
  return `${Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit || 't'}`;
}

function companyOrderTimeLeft(deadlineAt, now = gameNow()) {
  const remaining = Math.max(0, Number(deadlineAt || 0) - now);
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const extraHours = hours % 24;
    return extraHours ? `${days} T. ${extraHours} Std.` : `${days} Ingame-Tage`;
  }
  return `${hours} Ingame-Std.`;
}

function updateCompanyOrders(now = gameNow()) {
  const result = ensureCompanyOrders(now);
  const orders = result.orders;
  let changed = result.changed;
  const cycleSlot = Math.floor(Math.max(0, now) / COMPANY_ORDER_CYCLE_MS);
  if (cycleSlot > Number(orders.lastCycleSlot)) {
    orders.lastCycleSlot = cycleSlot;
    orders.offers = createCompanyOrderOffers(COMPANY_ORDER_OFFER_COUNT);
    changed = true;
  }
  const stillActive = [];
  for (const order of orders.active) {
    if (order.deadlineAt != null && Number(order.deadlineAt) <= now) {
      orders.failed.unshift({ ...order, status: 'failed', finishedAt: now, reason: 'Lieferfrist abgelaufen' });
      changed = true;
    } else {
      stillActive.push(order);
    }
  }
  orders.active = stillActive;
  if (orders.failed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.failed.length = COMPANY_ORDER_HISTORY_LIMIT;
  if (changed) {
    saveGame(false);
    if (!document.querySelector('#company-panel')?.hidden) renderCompanyPanel();
  }
}

function acceptCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  if (orders.active.length >= COMPANY_ORDER_MAX_ACTIVE) return;
  const index = orders.offers.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const offer = orders.offers.splice(index, 1)[0];
  const now = gameNow();
  orders.active.push({
    ...offer,
    acceptedAt: now,
    deadlineAt: offer.deadlineHours == null ? null : now + Number(offer.deadlineHours) * 60 * 60 * 1000
  });
  playUiSound('click');
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
}

function completeCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  const index = orders.active.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const order = orders.active[index];
  const storage = getPlanetStorage(order.planetId);
  const available = Math.max(0, Number(storage[order.resourceKey]) || 0);
  if (available + 1e-9 < Number(order.quantity)) {
    alert(`Nicht genügend ${resourceNames[order.resourceKey] || order.resourceKey} im Oberflächenlager von ${bodies[order.planetId]?.name || order.planetId}. Benötigt: ${companyOrderQuantity(order.quantity, order.unit)} · Vorhanden: ${companyOrderQuantity(available, order.unit)}.`);
    return;
  }
  storage[order.resourceKey] = Math.max(0, available - Number(order.quantity));
  state.gunniDollar = Math.max(0, Number(state.gunniDollar) || 0) + Number(order.reward || 0);
  orders.reputation = Math.max(0, Number(orders.reputation) || 0) + Number(order.reputationReward || 5);
  orders.unlockedLevel = orders.reputation >= 100 ? 2 : 1;
  orders.active.splice(index, 1);
  orders.completed.unshift({ ...order, status: 'completed', finishedAt: gameNow() });
  if (taskIsComplete('company_start_mining')) {
    state.tasks.companyOrdersCompleted = Number(state.tasks.companyOrdersCompleted || 0) + 1;
  }
  if (orders.completed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.completed.length = COMPANY_ORDER_HISTORY_LIMIT;
  recordCompanyFinance('income', Number(order.reward || 0), `Unternehmensauftrag #${order.id}: ${resourceNames[order.resourceKey] || order.resourceKey}`);
  playUiSound('research');
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
  taskProgressUpdate();
  renderTopResources();
  if (state.selected === order.planetId && state.viewMode !== 'orbit') renderInfo();
}

function cancelCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  const index = orders.active.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const order = orders.active.splice(index, 1)[0];
  orders.failed.unshift({ ...order, status: 'cancelled', finishedAt: gameNow(), reason: 'Vom Spieler abgebrochen' });
  if (orders.failed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.failed.length = COMPANY_ORDER_HISTORY_LIMIT;
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
}

function renderCompanyOrders() {
  if (!taskIsComplete('company_start_mining')) {
    return `<section class="company-orders-section">
      <div class="company-orders-heading"><div><h3>📋 Unternehmensaufträge · Stufe 1</h3><div class="hint">Noch gesperrt</div></div></div>
      <p class="hint">Schließe zuerst „Aller Anfang ist schwer“ ab: 10.000 t Eisen und 10.000 t Stein abbauen. Danach werden Unternehmensaufträge der Stufe 1 freigeschaltet.</p>
    </section>`;
  }
  const { orders } = ensureCompanyOrders();
  const now = gameNow();
  const nextCycleIn = Math.max(0, (Number(orders.lastCycleSlot) + 1) * COMPANY_ORDER_CYCLE_MS - now);
  const cycleHours = Math.ceil(nextCycleIn / (60 * 60 * 1000));
  const offerRows = orders.offers.map(order => {
    const planetName = bodies[order.planetId]?.name || order.planetId;
    const deadline = order.deadlineHours == null ? 'Keine Lieferfrist' : `${order.deadlineHours / 24} Ingame-Tage nach Annahme`;
    const activeFull = orders.active.length >= COMPANY_ORDER_MAX_ACTIVE;
    return `<article class="company-order-card">
      <div class="company-order-title"><strong>Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}</strong><span>${order.reputationReward} Ruf</span></div>
      <div class="company-order-details">Lieferung: <strong>${companyOrderQuantity(order.quantity, order.unit)}</strong><br>Planet: <strong>${escapeCompanyText(planetName)}</strong><br>Frist: <strong>${escapeCompanyText(deadline)}</strong></div>
      <div class="company-order-reward">Belohnung: <strong>${companyFormat(order.reward)}</strong></div>
      <button type="button" data-company-order-accept="${order.id}" ${activeFull ? 'disabled' : ''}>${activeFull ? '2 Aufträge aktiv' : 'Auftrag annehmen'}</button>
    </article>`;
  }).join('');
  const activeRows = orders.active.map(order => {
    const planetName = bodies[order.planetId]?.name || order.planetId;
    const storage = getPlanetStorage(order.planetId);
    const available = Math.max(0, Number(storage[order.resourceKey]) || 0);
    const enough = available + 1e-9 >= Number(order.quantity);
    const deadlineText = order.deadlineAt == null ? 'Keine Lieferfrist' : `Verbleibend: ${companyOrderTimeLeft(order.deadlineAt, now)}`;
    return `<article class="company-order-card company-order-active">
      <div class="company-order-title"><strong>Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}</strong><span>${order.reputationReward} Ruf</span></div>
      <div class="company-order-details">Zielplanet: <strong>${escapeCompanyText(planetName)}</strong><br>Benötigt: <strong>${companyOrderQuantity(order.quantity, order.unit)}</strong><br>Im Oberflächenlager: <strong class="${enough ? 'good' : 'warn'}">${companyOrderQuantity(available, order.unit)}</strong><br>${escapeCompanyText(deadlineText)}</div>
      <div class="company-order-reward">Belohnung: <strong>${companyFormat(order.reward)}</strong></div>
      <div class="company-order-actions"><button type="button" data-company-order-complete="${order.id}" ${enough ? '' : 'disabled'}>Liefern & abschließen</button><button type="button" class="danger" data-company-order-cancel="${order.id}">Abbrechen</button></div>
    </article>`;
  }).join('');
  const completedRows = orders.completed.slice(0, 10).map(order => `<div class="company-line"><span>✓ Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}<small>${escapeCompanyText(bodies[order.planetId]?.name || order.planetId)} · ${order.reputationReward} Ruf</small></span><strong class="good">+${companyFormat(order.reward)}</strong></div>`).join('');
  const failedRows = orders.failed.slice(0, 10).map(order => `<div class="company-line"><span>✕ Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}<small>${escapeCompanyText(order.reason || (order.status === 'cancelled' ? 'Abgebrochen' : 'Gescheitert'))}</small></span><strong>Keine Belohnung</strong></div>`).join('');
  const progress = Math.min(100, (orders.reputation / 100) * 100);
  const levelText = orders.reputation >= 100 ? 'Stufe 2 freigeschaltet' : `${Math.max(0, 100 - orders.reputation)} Ruf bis Stufe 2`;
  return `<section class="company-orders-section">
    <div class="company-orders-heading"><div><h3>📋 Unternehmensaufträge · Stufe 1</h3><div class="hint">🌙 Mond Startup · Aufträge nur auf Erde und Luna</div></div><span>${orders.active.length} / ${COMPANY_ORDER_MAX_ACTIVE} aktiv</span></div>
    <div class="company-reputation-card">
      <div class="company-order-title"><strong>🏅 Unternehmensruf</strong><strong>${orders.reputation} / 100</strong></div>
      <div class="company-reputation-track"><i style="width:${progress}%"></i></div>
      <div class="company-order-details">${escapeCompanyText(levelText)} · Stufe 2 bringt später planetenübergreifende Aufträge.</div>
    </div>
    <div class="company-order-section-title"><strong>Verfügbare Angebote (${orders.offers.length} / ${COMPANY_ORDER_OFFER_COUNT})</strong><small>Nächster Zyklus in ca. ${cycleHours} Ingame-Std.</small></div>
    ${orders.offers.length ? `<div class="company-order-list">${offerRows}</div>` : '<p class="hint">Keine Angebote verfügbar. Beim nächsten 6-Stunden-Zyklus kommen neue Angebote.</p>'}
    <div class="company-order-section-title"><strong>Aktive Aufträge (${orders.active.length} / ${COMPANY_ORDER_MAX_ACTIVE})</strong><small>Nur Oberflächenlager zählen.</small></div>
    ${orders.active.length ? `<div class="company-order-list">${activeRows}</div>` : '<p class="hint">Noch keine aktiven Aufträge. Nimm ein Angebot an, um zu beginnen.</p>'}
    <details class="company-subsection"><summary>✓ Erfolgreich abgeschlossen (${orders.completed.length})</summary><div class="company-stock-list">${completedRows || '<p class="hint">Noch keine abgeschlossenen Aufträge.</p>'}</div></details>
    <details class="company-subsection"><summary>✕ Gescheitert oder abgebrochen (${orders.failed.length})</summary><div class="company-stock-list">${failedRows || '<p class="hint">Keine gescheiterten oder abgebrochenen Aufträge.</p>'}</div></details>
    <p class="hint">Die Belohnung beträgt 110 % des beim Erstellen des Angebots geltenden Markt-Kaufpreises. Erfolgreiche Aufträge bringen 5–10 Rufpunkte. Lieferfristen beginnen erst mit der Annahme. Es werden nur Waren im Oberflächenlager des angegebenen Planeten angerechnet.</p>
  </section>`;
}

function setupCompanyOrderActions() {
  const panel = document.querySelector('#company-content');
  panel?.querySelectorAll('[data-company-order-accept]').forEach(button => button.addEventListener('click', () => acceptCompanyOrder(button.dataset.companyOrderAccept)));
  panel?.querySelectorAll('[data-company-order-complete]').forEach(button => button.addEventListener('click', () => completeCompanyOrder(button.dataset.companyOrderComplete)));
  panel?.querySelectorAll('[data-company-order-cancel]').forEach(button => button.addEventListener('click', () => cancelCompanyOrder(button.dataset.companyOrderCancel)));
}

function renderCompanyPanel() {
  const panel = document.querySelector('#company-content');
  if (!panel) return;
  const v = calculateCompanyValue();
  const resourceRows = Object.entries(COMPANY_RESOURCE_VALUES).map(([key, rate]) => {
    let amount = 0;
    for (const id of Object.keys(bodies)) {
      if (id === 'sun') continue;
      amount += Number(getPlanetStorage(id)[key] || 0) + Number(getOrbitStorage(id)[key] || 0);
    }
    if (amount <= 0) return '';
    const unit = key === 'water' || key === 'crudeOil' ? 'L' : 't';
    return `<div class="company-line"><span>${COMPANY_RESOURCE_NAMES[key] || key} <small>${amount.toLocaleString('de-DE',{maximumFractionDigits:2})} ${unit}</small></span><strong>${companyFormat(amount * rate)}</strong></div>`;
  }).join('');
  const buildingRows = v.buildingBreakdown.map(planet => `
    <details class="company-subsection">
      <summary>🪐 ${escapeCompanyText(planet.name)} · ${planet.count} Gebäude <span>${companyFormat(planet.value)}</span></summary>
      <div class="company-stock-list">${planet.buildings.map(b => `<div class="company-line"><span>${escapeCompanyText(b.name)}</span><strong>${b.count}×</strong></div>`).join('')}</div>
    </details>`).join('');
  const rocketRows = v.rocketBreakdown.map(r => `<div class="company-line"><span>🚀 ${r.name}<small>${companyFormat(r.unitValue)} pro fertiger Rakete</small></span><strong>${r.count}× · ${companyFormat(r.value)}</strong></div>`).join('');
  const financeRows = v.financeHistory.map(entry => {
    const date = entry.gameDate ? `Ingame ${entry.gameDate}` : (entry.date ? new Date(entry.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '');
    return `<div class="company-line"><span>${entry.type === 'income' ? '↗️' : '↘️'} ${escapeCompanyText(entry.description)}<small>${date}</small></span><strong class="${entry.type === 'income' ? 'good' : 'bad'}">${entry.type === 'income' ? '+' : '−'}${companyFormat(entry.amount)}</strong></div>`;
  }).join('');
  const financePeriods = ensureCompanyFinance().periods;
  const currentPeriodKeys = getCompanyFinancePeriodKeys();
  const financePeriodValue = period => {
    const income = Math.max(0, Number(period?.income) || 0);
    const expense = Math.max(0, Number(period?.expense) || 0);
    const balance = income - expense;
    return { income, expense, balance };
  };
  const financePeriodRows = (periods, currentKey, limit = Infinity, labelForKey = key => key) => {
    const keys = [...new Set([...Object.keys(periods || {}), currentKey])].sort().reverse().slice(0, limit);
    return keys.map(key => {
      const totals = financePeriodValue(periods?.[key]);
      const label = labelForKey(key);
      return `<div class="company-finance-period-row"><strong>${escapeCompanyText(label)}</strong><span class="good">+${companyFormat(totals.income)}</span><span class="bad">−${companyFormat(totals.expense)}</span><strong class="${totals.balance >= 0 ? 'good' : 'bad'}">${totals.balance >= 0 ? '+' : '−'}${companyFormat(Math.abs(totals.balance))}</strong></div>`;
    }).join('');
  };
  const dayRows = financePeriodRows(financePeriods.days, currentPeriodKeys.day, 30, key => key.split('-').reverse().join('.'));
  const monthRows = financePeriodRows(financePeriods.months, currentPeriodKeys.month, 24, key => {
    const [year, month] = key.split('-');
    return `${month}.${year}`;
  });
  const yearRows = financePeriodRows(financePeriods.years, currentPeriodKeys.year, Infinity, key => key);
  const companyOrdersHtml = renderCompanyOrders();
  panel.innerHTML = `<div class="company-summary">
    ${companyOrdersHtml}
    <div class="company-hero"><span>Unternehmen</span><strong>${escapeCompanyText(state.companyName || 'Unbenanntes Unternehmen')}</strong><button id="company-rename" type="button" class="small-button">Name ändern</button></div>
    <div class="company-total"><span>Geschätzter Unternehmenswert</span><strong>${companyFormat(v.total)}</strong></div>
    <div class="company-line"><span>Gebäudewerte <small>nach Rohstoffwerten der Baukosten</small></span><strong>${companyFormat(v.buildingsValue)}</strong></div>
    <div class="company-line"><span>Rohstoff- und Warenbestände</span><strong>${companyFormat(v.stockValue)}</strong></div>
    <div class="company-line"><span>Fertige Raketen</span><strong>${companyFormat(v.rocketValue)}</strong></div>
    <div class="company-line"><span>Geldbestand</span><strong>${companyFormat(v.cash)}</strong></div>
    <div class="company-line"><span>Schulden</span><strong>${companyFormat(v.debts)}</strong></div>
    <p class="hint">Raketen haben feste Unternehmenswerte. Lagerwerte nutzen feste Rohstoffwerte; Oberflächen- und Orbitlager werden berücksichtigt. Kredite sind derzeit nicht aktiviert.</p>
    <details class="company-subsection"><summary>🏭 Gebäude nach Planet</summary><div class="company-stock-list">${buildingRows || '<p class="hint">Noch keine Gebäude vorhanden.</p>'}</div></details>
    <details class="company-subsection"><summary>🚀 Raketenbestand und Einzelwerte</summary><div class="company-stock-list">${rocketRows}</div></details>
    <details class="company-subsection"><summary>💰 Finanzen und Ergebnis</summary>
      <div class="company-line"><span>Erfasste Einnahmen</span><strong class="good">${companyFormat(v.incomeTotal)}</strong></div>
      <div class="company-line"><span>Erfasste Ausgaben</span><strong class="bad">${companyFormat(v.expenseTotal)}</strong></div>
      <div class="company-line"><span>Saldo seit Erfassung</span><strong class="${v.profit >= 0 ? 'good' : 'bad'}">${v.profit >= 0 ? '+' : '−'}${companyFormat(Math.abs(v.profit))}</strong></div>
      <p class="hint">Die Periodenübersichten verwenden den Ingame-Kalender ab 01.01.2027. Einnahmen und Ausgaben werden je Ingame-Tag, -Monat und -Jahr dauerhaft zusammengefasst. Ältere Gesamtwerte aus Spielständen ohne Periodendaten lassen sich nicht zuverlässig einem früheren Ingame-Jahr zuordnen; sie werden deshalb nicht erfunden oder rückdatiert.</p>
      <details class="company-finance-periods" open><summary>📅 Ingame-Tagesübersicht · letzte 30 Tage</summary>
        <div class="company-finance-period-head"><span>Ingame-Tag</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${dayRows}</div>
      </details>
      <details class="company-finance-periods"><summary>🗓️ Ingame-Monatsübersicht · letzte 24 Monate</summary>
        <div class="company-finance-period-head"><span>Ingame-Monat</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${monthRows}</div>
      </details>
      <details class="company-finance-periods"><summary>📈 Ingame-Jahresübersicht · alle erfassten Jahre</summary>
        <div class="company-finance-period-head"><span>Ingame-Jahr</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${yearRows}</div>
      </details>
      <details><summary>Letzte Transaktionen (max. 30)</summary><div class="company-stock-list">${financeRows || '<p class="hint">Noch keine einzelnen Transaktionen erfasst.</p>'}</div></details>
    </details>
    <details class="company-subsection"><summary>📦 Vorhandene Lagerbestände mit Bewertungswert</summary><div class="company-stock-list">${resourceRows || '<p class="hint">Noch keine bewerteten Lagerbestände vorhanden.</p>'}</div></details>
  </div>`;
  setupCompanyOrderActions();
  document.querySelector('#company-rename')?.addEventListener('click', () => {
    const name = prompt('Neuen Firmennamen eingeben:', state.companyName || '');
    if (name !== null && name.trim()) { state.companyName = name.trim().slice(0,60); saveGame(false); if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters(); else renderCompanyPanel(); }
  });
}
function escapeCompanyText(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function updateCompanyHeadquartersMenu() {
  const button = document.querySelector('#company-headquarters-button');
  if (!button) return;
  const built = Number(getBuildingsOnPlanet('earth').companyHeadquarters || 0) > 0;
  button.hidden = !built;
}

function renderCompanyHeadquarters() {
  const panel = document.querySelector('#company-headquarters-content');
  if (!panel) return;
  if (Number(getBuildingsOnPlanet('earth').companyHeadquarters || 0) < 1) {
    panel.innerHTML = '<p class="hint">Die Unternehmenszentrale muss zuerst auf der Erde gebaut werden.</p>';
    return;
  }
  const companyValue = calculateCompanyValue();
  const finance = ensureCompanyFinance();
  // Nur regelmäßig wiederkehrende Einnahmen zählen für die Rate. Einmalige
  // Marktverkäufe, Auftragsbelohnungen und der Firmenwert werden nicht hochgerechnet.
  const colonistIncomePerSecond = Math.max(0, Number(totalColonists()) || 0) * 0.0002;
  const stockMarket = ensureStockMarket();
  const dividendPerDay = AI_COMPANY_CONFIG.reduce((sum, cfg) => {
    const stock = stockMarket.companies[cfg.id];
    const company = ensureAICompanies()[cfg.id];
    const shares = Math.max(0, Number(stock.playerShares) || 0);
    const dailyPool = Math.max(0, Number(company.cash) || 0) * 0.01;
    return sum + dailyPool * shares / Math.max(1, Number(stock.totalShares) || 1000);
  }, 0);
  const dividendPerSecond = dividendPerDay / 86400;
  const incomePerSecond = colonistIncomePerSecond + dividendPerSecond;
  const habitatCount = Object.keys(bodies).reduce((total, id) => {
    if (id === 'sun') return total;
    return total + Math.max(0, Number(getBuildingsOnPlanet(id).habitat) || 0);
  }, 0);
  const expensePerSecond = habitatCount * (88 / 3600); // 88 GD je Habitat und Ingame-Stunde.
  const fmt = amount => `${Number(amount || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar`;
  const level = Math.max(1, Number(state.companyOrders?.unlockedLevel) || 1);
  panel.innerHTML = `
    <section class="hq-level-card">
      <span>Aktuelle Unternehmensstufe</span>
      <strong>Stufe ${level}</strong>
      <small>${Number(state.companyOrders?.reputation || 0)} Rufpunkte</small>
    </section>
    <section class="hq-finance-card">
      <h3>💰 Finanzen</h3>
      <div class="hq-finance-stat hq-balance"><span>Kontostand</span><strong>${fmt(state.gunniDollar)}</strong></div>
      <div class="hq-finance-stat hq-company-value"><span>Firmenwert</span><strong>${fmt(companyValue.total)}</strong></div>
      <div class="hq-finance-rate hq-income">
        <h4>↗️ Regelmäßige Einnahmen</h4>
        <div><span>Kolonisten · pro Ingame-Sekunde</span><strong>${fmt(colonistIncomePerSecond)}</strong></div>
        <div><span>Dividenden · pro Ingame-Sekunde</span><strong>${fmt(dividendPerSecond)}</strong></div>
        <div><span>Gesamt · pro Ingame-Stunde</span><strong>${fmt(incomePerSecond * 3600)}</strong></div>
        <div><span>Gesamt · pro Ingame-Tag</span><strong>${fmt(incomePerSecond * 86400)}</strong></div>
        <small>Dividenden werden einmal pro Ingame-Tag ausgezahlt. Die angezeigte Dividendenrate ist eine Schätzung anhand der aktuellen Firmenkassen und deiner Aktienanteile. Einmalige Verkäufe und Auftragsbelohnungen zählen nicht dazu.</small>
      </div>
      <div class="hq-finance-rate hq-expenses">
        <h4>↘️ Regelmäßige Ausgaben</h4>
        <div><span>Pro Ingame-Sekunde</span><strong>${fmt(expensePerSecond)}</strong></div>
        <div><span>Pro Ingame-Stunde</span><strong>${fmt(expensePerSecond * 3600)}</strong></div>
        <div><span>Pro Ingame-Tag</span><strong>${fmt(expensePerSecond * 86400)}</strong></div>
        <small>Regelmäßige Ausgaben werden erst hochgerechnet, wenn sie als laufende Kosten separat erfasst werden.</small>
      </div>
    </section>
    <section id="hq-company-details" class="hq-company-details"></section>`;
  // Alle Inhalte aus „Unternehmen“ werden in die Unternehmenszentrale übernommen.
  // Das separate Menü verschwindet; bestehende Auftrags- und Umbenennungsaktionen bleiben erhalten.
  renderCompanyPanel();
  const source = document.querySelector('#company-content');
  const destination = document.querySelector('#hq-company-details');
  if (source && destination) {
    while (source.firstChild) destination.appendChild(source.firstChild);
  }
}
function setupCompanyHeadquarters() {
  const button = document.querySelector('#company-headquarters-button');
  const panel = document.querySelector('#company-headquarters-panel');
  const close = document.querySelector('#company-headquarters-close');
  updateCompanyHeadquartersMenu();
  button?.addEventListener('click', () => {
    if (!panel || Number(getBuildingsOnPlanet('earth').companyHeadquarters || 0) < 1) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#asteroids-panel','#company-panel','#ai-companies-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel => { const el = document.querySelector(sel); if (el) el.hidden = true; });
      const menu = document.querySelector('#main-menu'); if (menu) menu.hidden = true;
      renderCompanyHeadquarters();
    }
  });
  close?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  ['market-button','news-button','economy-button','company-button','colonists-button','research-button','tasks-button','introduction-button','settings-button','save-menu-button','flight-center-button','asteroids-button','cyclic-missions-button'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  });
}

function setupCompany() {
  const button = document.querySelector('#company-button');
  const panel = document.querySelector('#company-panel');
  const close = document.querySelector('#company-close');
  button?.addEventListener('click', () => {
    if (!panel) return;
    if (!taskIsComplete('company_start_name')) {
      alert('Das Unternehmensmenü wird erst nach Abschluss von „Gründe deine eigene Firma“ freigeschaltet. Erfülle zuerst die Aufgaben im Reiter „Der Weg zur Firma“.');
      return;
    }
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#asteroids-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel => { const el=document.querySelector(sel); if(el) el.hidden=true; });
      const menu=document.querySelector('#main-menu'); if(menu) menu.hidden=true;
      renderCompanyPanel();
    }
  });
  close?.addEventListener('click', () => { if(panel) panel.hidden=true; });
  ['market-button','news-button','economy-button','colonists-button','research-button','tasks-button','introduction-button','settings-button','save-menu-button','flight-center-button'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  });
}

function renderEconomy() {
  const panel = document.querySelector('#economy-content');
  if (!panel) return;
  // Kolonisten erzeugen 0,0002 GünniDollar pro Kopf und Ingame-Sekunde.
  const colonistCount = totalColonists();
  const gunniDollarIncome = colonistCount * 0.0002;
  const gunniDollarBalance = Math.max(0, Number(state.gunniDollar || 0));
  const formatGunniDollar = value => `${Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar`;
  const resources = [['stone','🪨','Stein'],['ice','🧊','Eis'],['coal','⚫','Kohle'],['gas','🔥','Gas'],['co2','🌫️','CO₂'],['carbon','⚫','Kohlenstoff'],['oxygen','🫧','Sauerstoff'],['hydrogen','💧','Wasserstoff'],['helium','🎈','Helium'],['crudeOil','🛢️','Rohöl'],['liquidFuel','⛽','Treibstoff'],['polymers','🧬','Polymere'],['rubber','⚫','Gummi'],['plastics','🧴','Kunststoff'],['wood','🪵','Bretter'],['biomass','🌿','Biomasse'],['trees','🌳','Baumbestand'],['iron','🧲','Eisen'],['steel','🔩','Stahl'],['silicon','🔷','Silizium'],['lithium','🔋','Lithium'],['copperOre','🟠','Kupfererz'],['copper','🟤','Kupfer'],['batteries','🔋','Batterien'],['buildingMaterials','🧱','Baustoffe'],['machines','⚙️','Maschinen'],['glass','🪟','Glas'],['electronics','💻','Elektronik'],['uranium','☢️','Uran'],['processedUranium','🧪','Aufbereitetes Uran'],['nuclearFuel','⚛️','Kernbrennstoff'],['ionium','☢️','Ionium'],['chips','💾','Chips'],['helium3','🧪','Helium-3'],['bauxite','🪨','Bauxit'],['aluminiumOxide','⚗️','Aluminiumoxid'],['aluminium','🥈','Aluminium'],['water','💧','Wasser'],['grain','🌾','Getreide'],['vegetables','🥦','Gemüse'],['food','🥫','Lebensmittel'],['algaeBiomass','🪴','Algenbiomasse'],['cocoaBeans','🫘','Kakaobohnen'],['chocolate','🍫','Schokolade'],['graphite','⚫','Graphit'],['titanOre','🪨','Titanerz'],['processedTitan','⚗️','Aufbereitetes Titan'],['titanium','nickelOre','🥈','Titan'],['vehicles','🚗','Fahrzeuge'],['luxuryFurniture','🛋️','Luxusmöbel']];
  const rows = resources.map(([key, icon, name]) => {
    const amount = key === 'liquidFuel' ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + liquidFuelAmount(id,'surface') + liquidFuelAmount(id,'orbit'), 0) : key === 'trees' ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(bodies[id].resources?.trees || 0), 0) : ['ice','co2','cocoaBeans','chocolate','wood','biomass','ionium','graphite'].includes(key) ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id)[key] || 0) + Number(getOrbitStorage(id)[key] || 0), 0) : getPlayerResourceAmount(key, 'earth');
    let production = 0, consumption = 0;
    if (key === 'ice') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).iceMine || 0) * 0.2, 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).iceProcessingPlant || 0) * 0.1, 0);
    }
    if (key === 'co2') {
      production = venusCo2ExtractionRate('venus') + Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).orbitalCo2Extractor || 0) * 0.2, 0);
    }
    if (key === 'carbon') { production = co2ProcessingProduction('earth', 'carbon'); consumption = 0; }
    if (key === 'oxygen') { production = co2ProcessingProduction('earth', 'oxygen'); consumption = 0; }
    if (key === 'wood' || key === 'biomass') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getBuildingsOnPlanet(id).woodcutter || 0) * 0.009 * newBuildingPowerFactor(id) * (Number(bodies[id].resources?.trees || 0) > 0 ? 1 : 0), 0); consumption = 0; }
    if (key === 'crudeOil') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + crudeOilProduction(id), 0); consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getBuildingsOnPlanet(id).polymerFactory || 0) * 0.001 + rubberOilUse(id) + syntheticGraphiteOilUse(id) + Number(getBuildingsOnPlanet(id).refinery || 0) * 0.2, 0); }
    if (key === 'graphite') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const b = getBuildingsOnPlanet(id); const mineRate = ['earth','luna','mars','io'].includes(id) && Number(bodies[id].resources?.graphite || 0) > 0 ? Number(b.graphiteMine || 0) * 0.05 : 0; const syntheticRate = Number(b.syntheticGraphitePlant || 0) * 0.05 * Math.min(newBuildingPowerFactor(id), Number(getPlanetStorage(id).crudeOil || 0) > 0 ? 1 : 0); return sum + mineRate * newBuildingPowerFactor(id) + syntheticRate; }, 0); consumption = 0; }
    if (key === 'liquidFuel') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getBuildingsOnPlanet(id).refinery || 0) * 0.4, 0); consumption = 0; }
    if (key === 'polymers') { production = Number(getBuildingsOnPlanet('earth').polymerFactory || 0) * 0.0005; consumption = 0; }
    if (key === 'rubber') { production = rubberProduction('earth'); consumption = plasticRubberUse('earth'); }
    if (key === 'plastics') { production = plasticProduction('earth'); consumption = 0; }
    if (key === 'iron') { production = ironProduction('earth'); consumption = ironUse('earth'); }
    if (key === 'steel') production = steelProduction('earth');
    if (key === 'silicon') production = siliconProduction('earth');
    if (key === 'lithium') { production = lithiumProduction('earth'); consumption = lithiumRefineryLithiumUse('earth') + chipFactoryLithiumUse('earth') + electronicsFactoryLithiumUse('earth'); }
    if (key === 'copperOre') { production = copperProduction('earth'); consumption = copperSmeltingUse('earth'); }
    if (key === 'copper') { production = copperSmeltingProduction('earth'); consumption = lithiumRefineryCopperUse('earth') + machineFactoryCopperUse('earth') + electronicsFactoryCopperUse('earth'); }
    if (key === 'batteries') production = batteryProduction('earth');
    if (key === 'buildingMaterials') {
      production = buildingMaterialsProduction('earth');
      consumption = 0;
    }
    if (key === 'machines') production = machineProduction('earth');
    if (key === 'glass') { production = glassProduction('earth'); consumption = vehicleFactoryGlassUse('earth'); }
    if (key === 'uranium') { production = uraniumProduction('earth'); consumption = processedUraniumUraniumUse('earth'); }
    if (key === 'ionium') production = Number(getBuildingsOnPlanet('io').ioniumMine || 0) * 0.01;
    if (key === 'processedUranium') { production = processedUraniumProduction('earth'); consumption = nuclearFuelProcessedUraniumUse('earth'); }
    if (key === 'nuclearFuel') { production = nuclearFuelProduction('earth'); consumption = nuclearReactorNuclearFuelUse('earth'); }
    if (key === 'chips') { production = chipProduction('earth'); consumption = electronicsFactoryChipUse('earth'); }
    if (key === 'electronics') { production = electronicsProduction('earth'); consumption = 0; }
    if (key === 'helium3') { production = helium3Production('earth'); consumption = fusionHelium3Use('earth'); }
    if (key === 'bauxite') production = Number(getBuildingsOnPlanet('earth').bauxiteMine || 0) * 0.5;
    if (key === 'titanOre') { production = Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).titanMine || 0) * 0.2, 0); consumption = Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).titanProcessing || 0) * 0.2, 0); }
    if (key === 'processedTitan') { production = Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).titanProcessing || 0) * 0.1, 0); consumption = Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).titanRefinery || 0) * 0.1, 0); }
    if (key === 'titanium') production = Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).titanRefinery || 0) * 0.05, 0);
    if (key === 'aluminiumOxide') { production = Number(getBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.25; consumption = Number(getBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.25; }
    if (key === 'aluminium') production = Number(getBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.125;
    if (key === 'bauxite') consumption = Number(getBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.5;
    if (key === 'coal') consumption = coalPowerUse('earth');
    if (key === 'water') { production = hydroelectricWaterProduction('earth') * newBuildingPowerFactor('earth'); consumption = greenhouseWaterUse('earth') + foodFactoryWaterUse('earth') * newBuildingPowerFactor('earth') + Number(getBuildingsOnPlanet('earth').cocoaPlantation || 0) * 0.2; }
    if (key === 'cocoaBeans') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const count = Number(getBuildingsOnPlanet(id).cocoaPlantation || 0);
        const water = Number(getPlanetStorage(id).water || 0);
        return sum + count * 0.1 * Math.min(newBuildingPowerFactor(id), water > 0 ? 1 : 0);
      }, 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const b = getBuildingsOnPlanet(id), st = getPlanetStorage(id);
        const powered = Math.floor(Number(b.chocolateFactory || 0) * newBuildingPowerFactor(id) + 1e-9);
        return sum + Math.min(powered * 0.02, Number(st.cocoaBeans || 0) > 0 ? powered * 0.02 : 0);
      }, 0);
    }
    if (key === 'chocolate') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const b = getBuildingsOnPlanet(id), st = getPlanetStorage(id);
        const powered = Math.floor(Number(b.chocolateFactory || 0) * newBuildingPowerFactor(id) + 1e-9);
        return sum + powered * 0.05 * (Number(st.cocoaBeans || 0) > 0 ? 1 : 0);
      }, 0);
      consumption = 0;
    }
    if (key === 'grain' || key === 'vegetables') production = greenhouseCropProduction('earth') * newBuildingPowerFactor('earth');
    if (key === 'grain') consumption = foodFactoryGrainUse('earth') * newBuildingPowerFactor('earth');
    if (key === 'food') production = foodFactoryProduction('earth') * newBuildingPowerFactor('earth');
    if (key === 'steel') consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + vehicleFactorySteelUse(id), 0);
    if (key === 'silicon') consumption = 0;
    if (key === 'vehicles') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + vehicleFactoryProduction(id), 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const body = ensureColonistData(id); return sum + (body?.vehicleLuxuryEnabled !== false && Number(getPlanetStorage(id).vehicles || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
    }
    if (key === 'luxuryFurniture') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + luxuryFurnitureFactoryProduction(id), 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const body = ensureColonistData(id); return sum + (body?.furnitureLuxuryEnabled !== false && Number(getPlanetStorage(id).luxuryFurniture || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
    }
    if (key === 'algaeBiomass') production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getBuildingsOnPlanet(id).algaeFarm || 0) * 0.1, 0);
    const balance = production - consumption;
    const balanceClass = Math.abs(balance) < 0.000001 ? 'balanced' : balance > 0 ? 'surplus' : 'shortage';
    const liquidResource = ['crudeOil','water','liquidFuel'].includes(key);
    const unit = liquidResource ? 'L/s' : 't/s';
    return `<div class="stat economy-resource-row ${balanceClass}" data-economy-resource="${key}"><span class="economy-resource-name">${icon} ${name}</span><strong class="economy-stock">${liquidResource ? amount.toLocaleString('de-DE', {maximumFractionDigits:2}) + ' L' : key === 'co2' ? formatLargeTons(amount) : formatTons(amount)}</strong><span class="economy-flow-value"><small>Produktion</small><strong>${production.toFixed(liquidResource ? 2 : 4)} ${unit}</strong></span><span class="economy-flow-value"><small>Verbrauch</small><strong>${consumption.toFixed(liquidResource ? 2 : 4)} ${unit}</strong></span></div>`;
  }).join('');
  const totalVehicleStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id).vehicles || 0) + Number(getOrbitStorage(id).vehicles || 0), 0);
  const totalVehicleProduction = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + vehicleFactoryProduction(id), 0);
  const totalVehicleConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => { const body = ensureColonistData(id); return sum + (body?.vehicleLuxuryEnabled !== false && Number(getPlanetStorage(id).vehicles || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
  const vehicleInputUse = { steel:0, plastics:0, rubber:0, glass:0, chips:0 };
  Object.keys(bodies).filter(id => id !== 'sun').forEach(id => { vehicleInputUse.steel += vehicleFactorySteelUse(id); vehicleInputUse.plastics += vehicleFactoryPlasticUse(id); vehicleInputUse.rubber += vehicleFactoryRubberUse(id); vehicleInputUse.glass += vehicleFactoryGlassUse(id); vehicleInputUse.chips += vehicleFactoryChipUse(id); });
  const totalChocolateStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id).chocolate || 0) + Number(getOrbitStorage(id).chocolate || 0), 0);
  const totalFurnitureStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+Number(getPlanetStorage(id).luxuryFurniture || 0),0);
  const totalFurnitureProduction = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+luxuryFurnitureFactoryProduction(id),0);
  const totalFurnitureConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>{ const body=ensureColonistData(id); return sum + (body?.furnitureLuxuryEnabled !== false && Number(getPlanetStorage(id).luxuryFurniture || 0)>1e-12 ? colonistsOnPlanet(id)*0.00002 : 0); },0);
  const totalChocolateConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => { const body = ensureColonistData(id); return sum + (body?.chocolateLuxuryEnabled !== false && Number(getPlanetStorage(id).chocolate || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
  const luxuryRows = `<div class="stat economy-resource-row"><span>🚗 Fahrzeuge</span><strong>${formatTons(totalVehicleStock)}</strong><small>${totalVehicleProduction.toFixed(4)} t/s Produktion · ${totalVehicleConsumption.toFixed(6)} t/s Kolonistenverbrauch</small></div><div class="stat economy-resource-row"><span>🍫 Schokolade</span><strong>${formatTons(totalChocolateStock)}</strong><small>${totalChocolateConsumption.toFixed(6)} t/s Kolonistenverbrauch · +8 % Populationswachstum bei aktivem Luxusgut und Vorrat</small></div><div class="stat economy-resource-row"><span>🛋️ Luxusmöbel</span><strong>${formatTons(totalFurnitureStock)}</strong><small>${totalFurnitureProduction.toFixed(4)} t/s Produktion · ${totalFurnitureConsumption.toFixed(6)} t/s Kolonistenverbrauch · +9 % Populationswachstum</small></div><div class="stat"><span>Fahrzeugfabriken im Sonnensystem</span><strong>${Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+vehicleFactoryCount(id),0)}</strong></div><div class="stat"><span>Stahlverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.steel.toFixed(3)} t/s</strong></div><div class="stat"><span>Kunststoffverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.plastics.toFixed(3)} t/s</strong></div><div class="stat"><span>Gummiverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.rubber.toFixed(3)} t/s</strong></div><div class="stat"><span>Glasverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.glass.toFixed(3)} t/s</strong></div><div class="stat"><span>Chipsverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.chips.toFixed(3)} t/s</strong></div>`;
  const b = getBuildingsOnPlanet('earth');
  const allPlanetBuildings = Object.keys(bodies).reduce((totals, planetId) => {
    for (const [key, count] of Object.entries(getBuildingsOnPlanet(planetId))) totals[key] = (totals[key] || 0) + Number(count || 0);
    return totals;
  }, {});
  const total = Object.values(allPlanetBuildings).reduce((a,v)=>a+Number(v||0),0);
  const chain = batteryProductionChain('earth');
  const dashboardResourceKeys = resources.map(([key]) => key);
  const resourceGroups = [
    { id:'stocks', title:'📦 Rohstoffe & Lager', keys:dashboardResourceKeys },
    { id:'production', title:'🏭 Produktion & Verbrauch', keys:dashboardResourceKeys }
  ];
  const rowByKey = Object.fromEntries([...rows.matchAll(/<div class="stat economy-resource-row(?: [^"]*)?" data-economy-resource="([^"]+)">[\s\S]*?<\/div>/g)].map(m=>[m[1],m[0]]));
  const stockRows = resourceGroups[0].keys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const productionKeys = dashboardResourceKeys;
  const productionRows = productionKeys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const buildingRows = Object.entries(allPlanetBuildings).map(([key,count])=>`<div class="stat economy-building-row"><span>${buildingTypes[key]?.icon || '🏭'} ${buildingTypes[key]?.name || key}</span><strong>${count}</strong></div>`).join('');
  const energyProduction = electricityProduction('earth');
  const energyConsumption = electricityConsumption('earth');
  const energyBalance = energyProduction - energyConsumption;
  panel.innerHTML = `
    <div class="economy-quick-overview">
      <div class="economy-quick-card"><span>Gebäude im Sonnensystem</span><strong>${total}</strong></div>
      <div class="economy-quick-card"><span>⛏️ Eisenproduktion</span><strong>${ironProduction('earth').toFixed(2)} t/s</strong></div>
      <div class="economy-quick-card"><span>🔩 Stahlproduktion</span><strong>${steelProduction('earth').toFixed(2)} t/s</strong></div>
      <div class="economy-quick-card"><span>💵 GünniDollar</span><strong>${formatGunniDollar(gunniDollarBalance)}</strong><small>${gunniDollarIncome.toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar/s Einnahmen</small></div>
    </div>
    <details class="economy-section"><summary>📦 Rohstoffe & Lager <span>Bestände aller Rohstoffe</span></summary><div class="economy-section-content">${stockRows}</div></details>
    <details class="economy-section"><summary>🏭 Produktion & Verbrauch <span>Förderung und Materialflüsse</span></summary><div class="economy-section-content">${productionRows}</div></details>
    <details class="economy-section"><summary>💎 Luxusgüter <span>Fahrzeuge im Oberflächen- und Orbitlager</span></summary><div class="economy-section-content">${luxuryRows}</div></details>
    <details class="economy-section"><summary>⚡ Energie <span>Erde · ${formatElectricPower(energyBalance)}</span></summary><div class="economy-section-content">${renderElectricityPanel('earth')}</div></details>
    <details class="economy-section"><summary>🏢 Gebäude im Sonnensystem <span>${total} Gebäude</span></summary><div class="economy-section-content">${buildingRows}</div></details>
    <details class="economy-section"><summary>🚀 Raketen & Transport <span>Transportübersicht</span></summary><div class="economy-section-content"><p class="hint">Öffne die Raketen- und Orbitansicht für Flüge, Fracht und Raketenbestände.</p></div></details>`;

}

// ==========================================
// MEHRSPRACHIGKEIT: Deutsch / English / Français
// ==========================================
const LANGUAGE_KEY = 'solarFrontierLanguage_v1';
const languageSelect = document.querySelector('#language-select');
const translations = {
  en: {
    'Weltraum Game':'Space Game','Sonnensystem · Rohstoffe · Aufbau · Transport':'Solar System · Resources · Development · Transport','Neuigkeiten':'News','Wirtschaft':'Economy','Forschung':'Research','Forschungsbaum':'Research Tree','Forschungslabor':'Research Lab','Forschungspunkte':'Research Points','Forschen':'Research','Abgeschlossen':'Completed','Spiel':'Game','Menü':'Menu','Einführung':'Introduction','Sprache':'Language','Willkommen bei Solar Frontier: Origins':'Welcome to Solar Frontier: Origins','Dein Ziel':'Your Goal','Planeten':'Planets','Raketen':'Rockets','Neuigkeiten & Updates':'News & Updates','Entwicklungsstand von Solar Frontier: Origins':'Development status of Solar Frontier: Origins','Aktuelle Ankündigung':'Current Announcement','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins is being developed further','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'The game is actively being developed. New content, tasks and technical improvements are being added step by step.','Aktuelle Version':'Current Version','Nächstes Update':'Next Update','Geplant':'Planned','Aktuelle Entwicklung':'Current Development','Was gerade im Spiel entsteht':'What is currently being developed','Weiterentwicklung des Sonnensystems':'Solar system development','Rohstoffabbau und Gebäude auf der Erde':'Resource extraction and buildings on Earth','Siliziummine und weitere Produktionsgebäude':'Silicon mine and additional production buildings','Raketenbau und interplanetarer Transport':'Rocket construction and interplanetary transport','Speichern und Laden des Spielstands':'Saving and loading the game','Hinweis für Spieler':'Player Notice','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'The game is actively in development. Changes and new updates may be added at any time.','Wirtschafts-Dashboard':'Economy Dashboard','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Overview of storage, production, consumption and buildings','Spielstand':'Save Game','Speichern':'Save','Laden':'Load','Neustart':'Restart','Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars','Jupiter':'Jupiter','Luna':'Moon','Stern':'Star','Planet':'Planet','Startplanet':'Starting Planet','Temperatur':'Temperature','Rohstoffe':'Resources','Lager':'Storage','Gebäude':'Buildings','Gebäude gesamt':'Total Buildings','Eisen':'Iron','Stahl':'Steel','Stein':'Stone','Kohle':'Coal','Gas':'Gas','CO₂':'CO₂','Atmosphärendruck':'Atmospheric Pressure','CO₂ in Atmosphäre':'CO₂ in Atmosphere','Gasabbau senkt den Atmosphärendruck direkt.':'Gas extraction directly lowers atmospheric pressure.','Silizium':'Silicon','Wasser':'Water','Metalle':'Metals','Gestein':'Rock','Energie':'Energy','Eisenproduktion':'Iron Production','Eisenverbrauch':'Iron Consumption','Stahlproduktion':'Steel Production','Siliziumproduktion':'Silicon Production','Batterien':'Batteries','Batterieproduktion':'Battery Production','Produktionskette: Batterien':'Battery Production Chain','Siliziumverbrauch':'Silicon Consumption','Stromproduktion':'Electricity Production','Bauen':'Build','kostenlos':'free','weitere':'additional','Steinbruch':'Stone Quarry','Kohlemine':'Coal Mine','Gasförderanlage':'Gas Plant','Eisenmine':'Iron Mine','Siliziummine':'Silicon Mine','Stahlwerk':'Steel Mill','Kohlekraftwerk':'Coal Power Plant','Raketenstation':'Rocket Station','Maschinenfabrik':'Machine Factory','Maschinen':'Machines','Transportzentrale':'Transport Center','Zielplanet':'Destination Planet','Anzahl':'Amount','Fracht pro Rakete':'Cargo per Rocket','Aktive Transporte':'Active Transports','Keine abbaubaren Rohstoffe.':'No extractable resources.','Noch keine Rohstoffe abgebaut':'No resources extracted yet','Bauzeit':'Build Time','Flugzeit':'Flight Time','Rückflug':'Return Flight','Hinflug':'Outbound Flight','Gesamtkapazität':'Total Capacity','verfügbar':'available','bis Ankunft':'until arrival','Sekunden':'seconds','t Stahl':'t steel','t Eisen':'t iron','t Stein':'t stone','t Kohle':'t coal','t Gas':'t gas','t Silizium':'t silicon','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'No return cargo','zurück':'back','Starten':'Launch','Schließen':'Close','Uran':'Uranium','Polymere':'Polymers','Polymerfabrik':'Polymer Factory','Uranmine':'Uranium Mine','Uranaufbereitungsanlage':'Uranium Processing Plant','Aufbereitetes Uran':'Processed Uranium','Kernbrennstoffanlage':'Nuclear Fuel Plant','Kernbrennstoff':'Nuclear Fuel','Kernreaktor':'Nuclear Reactor','Chipfabrik':'Chip Factory','Chips':'Chips','Sonnensegel':'Solar Sail','Aufgaben':'Tasks','Einführung · Ziele und Fortschritt':'Introduction · Goals and progress','Baue eine Start- und Landerampe':'Build a launch and landing pad','Baue deine erste Start- und Landerampe.':'Build your first launch and landing pad.','Baue eine Eisenmine':'Build an iron mine','Baue 1.000 t Eisenerz ab':'Mine 1,000 t iron ore','Baue ein Stahlwerk':'Build a steel mill','Produziere 1.000 t Stahl':'Produce 1,000 t steel','Baue deine erste Eisenmine.':'Build your first iron mine.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Mine a total of 1,000 t iron from planetary deposits.','Baue dein erstes Stahlwerk.':'Build your first steel mill.','Produziere insgesamt 1.000 t Stahl.':'Produce a total of 1,000 t steel.','Fortschritt':'Progress','Forschungspunkte':'Research Points'
  },
  fr: {
    'Weltraum Game':'Jeu spatial','Sonnensystem · Rohstoffe · Aufbau · Transport':'Système solaire · Ressources · Développement · Transport','Neuigkeiten':'Actualités','Wirtschaft':'Économie','Forschung':'Recherche','Forschungsbaum':'Arbre technologique','Forschungslabor':'Laboratoire de recherche','Forschungspunkte':'Points de recherche','Forschen':'Rechercher','Abgeschlossen':'Terminé','Spiel':'Jeu','Menü':'Menu','Einführung':'Introduction','Sprache':'Langue','Neuigkeiten & Updates':'Actualités & mises à jour','Entwicklungsstand von Solar Frontier: Origins':'État du développement de Solar Frontier: Origins','Aktuelle Ankündigung':'Annonce actuelle','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins continue son développement','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'Le jeu est en développement actif. De nouveaux contenus, objectifs et améliorations techniques sont ajoutés progressivement.','Aktuelle Version':'Version actuelle','Nächstes Update':'Prochaine mise à jour','Geplant':'Prévu','Aktuelle Entwicklung':'Développement actuel','Was gerade im Spiel entsteht':'Développement en cours','Weiterentwicklung des Sonnensystems':'Développement du système solaire','Rohstoffabbau und Gebäude auf der Erde':'Extraction de ressources et bâtiments sur Terre','Siliziummine und weitere Produktionsgebäude':'Mine de silicium et autres bâtiments de production','Raketenbau und interplanetarer Transport':'Construction de fusées et transport interplanétaire','Speichern und Laden des Spielstands':'Sauvegarde et chargement de la partie','Hinweis für Spieler':'Information aux joueurs','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'Le jeu est en développement actif. Des changements et mises à jour peuvent être ajoutés à tout moment.','Wirtschafts-Dashboard':'Tableau de bord économique','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Aperçu du stockage, de la production, de la consommation et des bâtiments','Spielstand':'Sauvegarde','Speichern':'Sauvegarder','Laden':'Charger','Neustart':'Redémarrer','Sonne':'Soleil','Merkur':'Mercure','Venus':'Vénus','Erde':'Terre','Mars':'Mars','Jupiter':'Jupiter','Luna':'Lune','Stern':'Étoile','Planet':'Planète','Startplanet':'Planète de départ','Temperatur':'Température','Rohstoffe':'Ressources','Lager':'Stockage','Gebäude':'Bâtiments','Gebäude gesamt':'Bâtiments au total','Eisen':'Fer','Stahl':'Acier','Stein':'Pierre','Kohle':'Charbon','Gas':'Gaz','Silizium':'Silicium','Wasser':'Eau','Metalle':'Métaux','Gestein':'Roche','Energie':'Énergie','Eisenproduktion':'Production de fer','Eisenverbrauch':'Consommation de fer','Stahlproduktion':'Production d’acier','Siliziumproduktion':'Production de silicium','Batterien':'Batteries','Batterieproduktion':'Production de batteries','Produktionskette: Batterien':'Chaîne de production des batteries','Siliziumverbrauch':'Consommation de silicium','Stromproduktion':'Production d’électricité','Bauen':'Construire','kostenlos':'gratuit','weitere':'supplémentaire','Steinbruch':'Carrière de pierre','Kohlemine':'Mine de charbon','Gasförderanlage':'Installation de gaz','Eisenmine':'Mine de fer','Siliziummine':'Mine de silicium','Stahlwerk':'Aciérie','Kohlekraftwerk':'Centrale à charbon','Raketenstation':'Station de fusées','Maschinenfabrik':'Usine de machines','Maschinen':'Machines','Transportzentrale':'Centre de transport','Zielplanet':'Planète destination','Anzahl':'Quantité','Fracht pro Rakete':'Fret par fusée','Aktive Transporte':'Transports actifs','Keine abbaubaren Rohstoffe.':'Aucune ressource exploitable.','Noch keine Rohstoffe abgebaut':'Aucune ressource extraite','Bauzeit':'Temps de construction','Flugzeit':'Temps de vol','Rückflug':'Vol retour','Hinflug':'Vol aller','Gesamtkapazität':'Capacité totale','verfügbar':'disponible','bis Ankunft':'avant l’arrivée','Sekunden':'secondes','t Stahl':'t acier','t Eisen':'t fer','t Stein':'t pierre','t Kohle':'t charbon','t Gas':'t gaz','t Silizium':'t silicium','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'Aucun fret retour','zurück':'retour','Starten':'Lancer','Schließen':'Fermer','Uran':'Uranium','Uranmine':'Mine d’uranium','Uranaufbereitungsanlage':'Usine de traitement de l’uranium','Aufbereitetes Uran':'Uranium traité','Kernbrennstoffanlage':'Usine de combustible nucléaire','Kernbrennstoff':'Combustible nucléaire','Kernreaktor':'Réacteur nucléaire','Chipfabrik':'Usine de puces','Chips':'Puces','Sonnensegel':'Voile solaire','Aufgaben':'Tâches','Einführung · Ziele und Fortschritt':'Introduction · objectifs et progression','Baue eine Start- und Landerampe':'Construire une rampe de lancement et d’atterrissage','Baue deine erste Start- und Landerampe.':'Construire votre première rampe de lancement et d’atterrissage.','Baue eine Eisenmine':'Construire une mine de fer','Baue 1.000 t Eisenerz ab':'Extraire 1 000 t de minerai de fer','Baue ein Stahlwerk':'Construire une aciérie','Produziere 1.000 t Stahl':'Produire 1 000 t d’acier','Baue deine erste Eisenmine.':'Construire votre première mine de fer.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Extraire au total 1 000 t de fer des gisements planétaires.','Baue dein erstes Stahlwerk.':'Construire votre première aciérie.','Produziere insgesamt 1.000 t Stahl.':'Produire au total 1 000 t d’acier.','Fortschritt':'Progression'
  }
};
translations.en['Gebäude im Sonnensystem']='Buildings in the Solar System'; translations.en['GünniDollar']='GünniDollar'; translations.en['Einnahmen']='Income'; translations.fr['Gebäude im Sonnensystem']='Bâtiments dans le système solaire'; translations.fr['GünniDollar']='GünniDollar'; translations.fr['Einnahmen']='Revenus';
translations.en['Solar-Satellit']='Solar Satellite'; translations.en['Sonnensonde']='Solar Probe'; translations.en['Solarstrom']='Solar Power'; translations.en['Sonnenorbit']='Solar Orbit'; translations.en['Solar-Satelliten auf Erde']='Solar Satellites on Earth'; translations.en['Sonnensonden']='Solar Probes'; translations.en['Im Sonnenorbit']='In Solar Orbit'; translations.en['Sonnensonden im Flug']='Solar Probes in Flight'; translations.en['Solar-Satellit zur Sonne starten']='Launch Solar Satellite to the Sun'; translations.en['Forschung: Solar-Satellit']='Research: Solar Satellite'; translations.en['Forschung: Sonnensonde']='Research: Solar Probe'; translations.en['CO₂']='CO₂'; translations.en['Atmosphärendruck']='Atmospheric Pressure'; translations.en['CO₂ in Atmosphäre']='CO₂ in Atmosphere'; translations.en['Gasabbau senkt den Atmosphärendruck direkt.']='Gas extraction directly lowers atmospheric pressure.'; translations.fr['Solar-Satellit']='Satellite solaire'; translations.fr['Sonnensonde']='Sonde solaire'; translations.fr['Solarstrom']='Énergie solaire'; translations.fr['Sonnenorbit']='Orbite solaire'; translations.fr['Solar-Satelliten auf Erde']='Satellites solaires sur Terre'; translations.fr['Sonnensonden']='Sondes solaires'; translations.fr['Im Sonnenorbit']='En orbite solaire'; translations.fr['Sonnensonden im Flug']='Sondes solaires en vol'; translations.fr['Solar-Satellit zur Sonne starten']='Lancer le satellite solaire vers le Soleil'; translations.fr['Forschung: Solar-Satellit']='Recherche : Satellite solaire'; translations.fr['Forschung: Sonnensonde']='Recherche : Sonde solaire'; translations.fr['CO₂']='CO₂'; translations.fr['Atmosphärendruck']='Pression atmosphérique'; translations.fr['CO₂ in Atmosphäre']='CO₂ dans l’atmosphère'; translations.fr['Gasabbau senkt den Atmosphärendruck direkt.']='L’extraction de gaz réduit directement la pression atmosphérique.';
translations.en['Bauxit']='Bauxite'; translations.en['Aluminiumoxid']='Aluminum oxide'; translations.en['Aluminium']='Aluminum'; translations.en['Bauxitmine']='Bauxite Mine'; translations.en['Aluminiumoxidraffinerie']='Aluminum Oxide Refinery'; translations.en['Aluminiumhütte']='Aluminum Smelter';
translations.fr['Bauxit']='Bauxite'; translations.fr['Aluminiumoxid']='Oxyde d’aluminium'; translations.fr['Aluminium']='Aluminium'; translations.fr['Bauxitmine']='Mine de bauxite'; translations.fr['Aluminiumoxidraffinerie']='Raffinerie d’oxyde d’aluminium'; translations.fr['Aluminiumhütte']='Fonderie d’aluminium';
translations.en['Einstellungen']='Settings'; translations.en['Musik und Spielsounds']='Music and Game Sounds'; translations.en['Hintergrundmusik']='Background Music'; translations.en['Lautstärke']='Volume'; translations.en['Spielsounds']='Game Sounds'; translations.en['Forschung, Gebäude und Raketenbau']='Research, Buildings and Rocket Construction'; translations.en['Ein']='On'; translations.en['Aus']='Off'; translations.en['Musik und Spielsounds']='Music and Game Sounds'; translations.fr['Einstellungen']='Paramètres'; translations.fr['Musik und Spielsounds']='Musique et sons du jeu'; translations.fr['Hintergrundmusik']='Musique de fond'; translations.fr['Lautstärke']='Volume'; translations.fr['Spielsounds']='Sons du jeu'; translations.fr['Forschung, Gebäude und Raketenbau']='Recherche, bâtiments et construction de fusées'; translations.fr['Ein']='Activé'; translations.fr['Aus']='Désactivé';

function applyLanguage(root=document.body){
  const lang = localStorage.getItem(LANGUAGE_KEY) || 'de';
  if (languageSelect && languageSelect.value !== lang) languageSelect.value = lang;
  if (lang === 'de') return;

  const map = translations[lang] || {};
  const entries = Object.entries(map).sort((a,b) => b[0].length - a[0].length);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) nodes.push(node);

  nodes.forEach(textNode => {
    // Keep one immutable German source per text node.
    // This prevents repeated renders from translating an already translated
    // word again (e.g. Temperatur -> Temperature -> Temperaturee...).
    if (!textNode.dataset.sfOriginal) textNode.dataset.sfOriginal = textNode.nodeValue;
    const sourceValue = textNode.dataset.sfOriginal;
    if (!sourceValue || !sourceValue.trim()) return;

    const leading = sourceValue.match(/^\s*/)?.[0] || '';
    const trailing = sourceValue.match(/\s*$/)?.[0] || '';
    const core = sourceValue.trim();

    if (Object.prototype.hasOwnProperty.call(map, core)) {
      textNode.nodeValue = leading + map[core] + trailing;
      return;
    }

    let translated = core;
    entries.forEach(([source, target]) => {
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'gu');
      translated = translated.replace(re, `$1${target}`);
    });
    textNode.nodeValue = leading + translated + trailing;
  });
}

function setLanguage(lang){
  localStorage.setItem(LANGUAGE_KEY, lang);
  // Reload from the original German HTML/JS strings. This gives every
  // language a clean source and makes switching between EN/FR reliable.
  location.reload();
}

if(languageSelect){
  languageSelect.value = localStorage.getItem(LANGUAGE_KEY) || 'de';
  languageSelect.addEventListener('change', () => setLanguage(languageSelect.value));
}


// Story-Einführung nur beim ersten Spielstart anzeigen; die Chronik bleibt im Menü erreichbar.
const STORY_INTRO_SEEN_KEY = 'solarFrontierOriginsStoryIntroSeen_v1';
const storyIntroPopup = document.querySelector('#story-intro-popup');
const storyIntroClose = document.querySelector('#story-intro-close');
const storyIntroStart = document.querySelector('#story-intro-start');
function closeStoryIntro() {
  if (storyIntroPopup) storyIntroPopup.hidden = true;
  try { localStorage.setItem(STORY_INTRO_SEEN_KEY, '1'); } catch {}
}
if (storyIntroPopup) {
  let storyIntroSeen = false;
  try { storyIntroSeen = localStorage.getItem(STORY_INTRO_SEEN_KEY) === '1'; } catch {}
  if (!storyIntroSeen) storyIntroPopup.hidden = false;
  storyIntroClose?.addEventListener('click', closeStoryIntro);
  storyIntroStart?.addEventListener('click', closeStoryIntro);
}

// Navigation zwischen den beiden Sonnensystemen.
function updateSolarSystemSelector() {
  const current = document.querySelector('.solar-system-selector-current');
  const upcoming = document.querySelector('.solar-system-selector-upcoming');
  if (!current || !upcoming) return;
  current.classList.toggle('active', activeSolarSystemId === 'system1');
  upcoming.classList.toggle('active', activeSolarSystemId === 'system2');
  current.setAttribute('aria-current', activeSolarSystemId === 'system1' ? 'true' : 'false');
  upcoming.setAttribute('aria-current', activeSolarSystemId === 'system2' ? 'true' : 'false');
}
function setupSolarSystemSelector() {
  const current = document.querySelector('.solar-system-selector-current');
  const upcoming = document.querySelector('.solar-system-selector-upcoming');
  current?.addEventListener('click', () => { activeSolarSystemId = 'system1'; state.buildMenuOpen = false; renderSystem(); renderInfo(); });
  upcoming?.addEventListener('click', () => { activeSolarSystemId = 'system2'; state.buildMenuOpen = false; renderSystem(); });
  updateSolarSystemSelector();
}

// Storyabschluss des Forschungsauftrags „Das System wird versagen“.
function refreshSystemFailureUnlock() {
  const orders = ensureResearchOrders();
  const unlocked = !!orders.completed.systemFailure;
  const selector = document.querySelector('.solar-system-selector-upcoming');
  if (selector) {
    const label = selector.querySelector('span');
    if (label) label.textContent = unlocked ? 'Freigeschaltet – Erschließung folgt später.' : 'Dieses Sonnensystem wird später erschlossen.';
  }
  const chronicleEntry = document.querySelector('#chronicle-system2-story');
  if (chronicleEntry) chronicleEntry.hidden = !unlocked;
}
function showSystemFailureStory() {
  const popup = document.querySelector('#system-failure-story-popup');
  if (!popup) return;
  const orders = ensureResearchOrders();
  if (!orders.completed.systemFailure || orders.systemFailureStoryShown) return;
  refreshSystemFailureUnlock();
  popup.hidden = false;
  popup.setAttribute('aria-hidden', 'false');
}
function closeSystemFailureStory() {
  const popup = document.querySelector('#system-failure-story-popup');
  if (popup) {
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
  }
  const orders = ensureResearchOrders();
  orders.systemFailureStoryShown = true;
  saveGame(false);
}
document.querySelector('#introduction-complete-close')?.addEventListener('click', closeIntroductionCompletePopup);
document.querySelector('#introduction-complete-confirm')?.addEventListener('click', closeIntroductionCompletePopup);
document.querySelector('#colonists-complete-close')?.addEventListener('click', closeColonistsCompletePopup);
document.querySelector('#colonists-complete-confirm')?.addEventListener('click', closeColonistsCompletePopup);
document.querySelector('#system-failure-story-close')?.addEventListener('click', closeSystemFailureStory);
document.querySelector('#system-failure-story-confirm')?.addEventListener('click', closeSystemFailureStory);

// Start-Intro: zwei Sekunden zeigen, danach das Updatefenster öffnen.
const startupIntro = document.querySelector('#startup-intro');
const updatePopup = document.querySelector('#update-popup');
if (startupIntro) {
  window.setTimeout(() => {
    startupIntro.hidden = true;
    if (updatePopup) { updatePopup.hidden = false; updatePopup.setAttribute('aria-hidden', 'false'); }
  }, 2000);
}
// Updatefenster: erscheint bei jedem Seitenstart erneut und wird nur über X geschlossen.

const updatePopupClose = document.querySelector('#update-popup-close');
if (updatePopup) {
  const pageButtons = [...updatePopup.querySelectorAll('[data-update-page]')];
  const pageContents = [...updatePopup.querySelectorAll('[data-update-page-content]')];
  pageButtons.forEach(button => button.addEventListener('click', () => {
    const page = button.dataset.updatePage;
    pageButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    pageContents.forEach(content => { content.hidden = content.dataset.updatePageContent !== page; });
    const card = updatePopup.querySelector('.update-popup-card');
    if (card) card.scrollTop = 0;
  }));
}
if (updatePopup && updatePopupClose) {
  updatePopupClose.addEventListener('click', () => {
    updatePopup.hidden = true;
    updatePopup.setAttribute('aria-hidden', 'true');
  });
}

setupMainMenu();
setupHelpSystem();
setupGameClockControls();
document.querySelector('#construction-queue-refresh')?.addEventListener('click', renderConstructionQueue);
setupSaveMenu();
setupTopPanels();
loadGame(false);
setupCompany();
setupAICompanies();
ensureAICompanies();
setupCompanyHeadquarters();
refreshSystemFailureUnlock();
if (ensureResearchOrders().completed.systemFailure && !ensureResearchOrders().systemFailureStoryShown) showSystemFailureStory();
setupSolarSystemSelector();
renderSystem();
renderInfo();
renderTopResources();
renderTasks();
const solarViewport = document.querySelector('#solar-system-viewport');
if (solarViewport) {
  requestAnimationFrame(() => {
    solarViewport.scrollLeft = Math.max(0, (solarSystem.offsetWidth - solarViewport.clientWidth) / 2);
    solarViewport.scrollTop = Math.max(0, (solarSystem.offsetHeight - solarViewport.clientHeight) / 2);
  });
}
requestAnimationFrame(updateResources);
// Zusätzlich zum 5-Sekunden-Autosave den aktuellen Stand beim Verlassen sichern.
// pagehide funktioniert auch bei Navigation/Neuladen; visibilitychange sichert,
// wenn der Browser-Tab in den Hintergrund wechselt. beforeunload ist ein zusätzlicher Fallback.
function saveGameOnExit() {
  if (restartingGame) return;
  saveGame(false);
}
window.addEventListener('pagehide', saveGameOnExit);
window.addEventListener('beforeunload', saveGameOnExit);
document.addEventListener('visibilitychange', () => {
  if (!restartingGame && document.visibilityState === 'hidden') saveGame(false);
});


// Sonnensystem: zwei Finger zum Verschieben/Zoomen; ein Finger zum normalen Schwenken.
(function setupSolarSystemGestures(){
  const viewport = document.querySelector('#solar-system-viewport');
  const system = document.querySelector('#solar-system');
  if (!viewport || !system) return;
  let zoom = 1;
  let gesture = null;
  let oneFingerMoved = false;
  const dist = (a,b) => Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
  const mid = (a,b) => ({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const point = t => ({clientX:t.clientX,clientY:t.clientY});
  viewport.addEventListener('touchstart', e => {
    // Das Gebäudemenü besitzt eigenes natives Touch-Scrolling. Diese Gesten
    // dürfen nicht vom Pan-/Zoom-System des Sonnensystems abgefangen werden.
    if (e.target.closest('.planet-build-menu')) {
      gesture = null;
      oneFingerMoved = false;
      return;
    }
    if (e.touches.length === 1) {
      const t=e.touches[0];
      gesture={kind:'pan',x:t.clientX,y:t.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
      oneFingerMoved=false;
    } else if (e.touches.length >= 2) {
      const a=point(e.touches[0]), b=point(e.touches[1]), m=mid(a,b);
      gesture={kind:'pinch',distance:Math.max(1,dist(a,b)),zoom,midX:m.x,midY:m.y,
        scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
    }
  }, {passive:true});
  viewport.addEventListener('touchmove', e => {
    if (!gesture) return;
    if (e.touches.length >= 2 && gesture.kind==='pinch') {
      e.preventDefault();
      const a=point(e.touches[0]), b=point(e.touches[1]), m=mid(a,b);
      const nextZoom=Math.max(0.6,Math.min(2.2,gesture.zoom*dist(a,b)/gesture.distance));
      const ratio=nextZoom/gesture.zoom;
      zoom=nextZoom;
      system.style.zoom=String(zoom);
      viewport.scrollLeft=Math.max(0,(gesture.scrollLeft+gesture.midX-viewport.getBoundingClientRect().left)*ratio-(m.x-viewport.getBoundingClientRect().left));
      viewport.scrollTop=Math.max(0,(gesture.scrollTop+gesture.midY-viewport.getBoundingClientRect().top)*ratio-(m.y-viewport.getBoundingClientRect().top));
    } else if (e.touches.length===1 && gesture.kind==='pan') {
      const t=e.touches[0], dx=t.clientX-gesture.x, dy=t.clientY-gesture.y;
      if (Math.abs(dx)+Math.abs(dy)>6) oneFingerMoved=true;
      if (oneFingerMoved) {
        e.preventDefault();
        viewport.scrollLeft=gesture.scrollLeft-dx;
        viewport.scrollTop=gesture.scrollTop-dy;
      }
    }
  }, {passive:false});
  const reset=()=>{gesture=null;};
  viewport.addEventListener('touchend', e => {
    if (e.touches.length===1) {
      const t=e.touches[0];
      gesture={kind:'pan',x:t.clientX,y:t.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
    } else if (e.touches.length===0) reset();
  }, {passive:true});
  viewport.addEventListener('touchcancel', reset, {passive:true});
  viewport.setAttribute('aria-description','Mit einem Finger verschieben oder Planeten auswählen; mit zwei Fingern verschieben und zoomen.');
})(); 

['pointerdown','touchstart','keydown'].forEach(evt=>document.addEventListener(evt, unlockAudio, {once:true, passive:true}));
