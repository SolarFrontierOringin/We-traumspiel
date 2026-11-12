// ==========================================
// KI-UNTERNEHMEN – unabhängige Simulation
// Drei Konkurrenten mit eigenem Geld, Lager, Forschung und Expansion.
// Die KI handelt direkt mit dem gemeinsamen Markt, niemals mit dem Spielerlager.
// ==========================================
const AI_COMPANY_CONFIG = [
  { id: 'helios', name: 'Helios Industries', style: 'Industrie & Produktion', color: 'blue', focus: 'Produktion' },
  { id: 'nova', name: 'Nova Dynamics', style: 'Forschung & Expansion', color: 'violet', focus: 'Expansion' },
  { id: 'nasga', name: 'Nasga', style: 'Rohstoffe & Handel', color: 'green', focus: 'Handel' },
  { id: 'spacey', name: 'SpaceY', style: 'Raumfahrt & Technologie', color: 'blue', focus: 'Raumfahrt' }
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
  // KI-Unternehmen handeln ausschließlich über die separate KI-Handelsbörse.
  const price = Number(MARKET_RESOURCES[key]?.base) || 1;
  if (!AI_EXCHANGE_RESOURCES.includes(key)) return false;
  exchangeAddOrder(company.id, side, key, Number(amount) || 0, price * (side === 'buy' ? 1.04 : 0.96));
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


// ==========================================
// KI-HANDELSBÖRSE – getrennte Auftragsbörse
// KI-Firmen handeln mit ihren eigenen Beständen. Die freie Bevölkerung
// handelt ausschließlich virtuell und verändert keine realen Warenlager.
// ==========================================
const AI_EXCHANGE_RESOURCES = ['iron','steel','stone','buildingMaterials','glass','electronics','silicon','chips','batteries','machines','copper'];
const AI_EXCHANGE_TICK_MS = 5 * 60 * 1000;
const AI_EXCHANGE_NAMES = {iron:'Eisen',steel:'Stahl',stone:'Stein',buildingMaterials:'Baustoffe',glass:'Glas',electronics:'Elektronik',silicon:'Silizium',chips:'Chips',batteries:'Batterien',machines:'Maschinen',copper:'Kupfer'};
const FREE_EXCHANGE_PLANETS = [{id:'luna',name:'Freie Bevölkerung – Luna'},{id:'mars',name:'Freie Bevölkerung – Mars'},{id:'venus',name:'Freie Bevölkerung – Venus'}];
function ensureAIExchange(){
  state.aiExchange = state.aiExchange && typeof state.aiExchange==='object' ? state.aiExchange : {};
  const ex=state.aiExchange;
  if(!Array.isArray(ex.orders))ex.orders=[];
  if(!Array.isArray(ex.history))ex.history=[];
  if(!Number.isFinite(Number(ex.lastTick)))ex.lastTick=0;
  if(!ex.virtualStocks || typeof ex.virtualStocks!=='object')ex.virtualStocks={};
  FREE_EXCHANGE_PLANETS.forEach((x,i)=>{
    if(!ex.virtualStocks[x.id]) ex.virtualStocks[x.id]=Object.fromEntries(AI_EXCHANGE_RESOURCES.map((k,j)=>[k,150+((i+2)*(j+7)*37)%650]));
  });
  ex.orders=ex.orders.filter(o=>o && o.status==='offen' && Number(o.amount)>0).slice(-150);
  ex.history=ex.history.slice(0,100);
  return ex;
}
function exchangeParticipant(id){
  const cfg=AI_COMPANY_CONFIG.find(x=>x.id===id);
  if(cfg){const c=ensureAICompanies()[id];return {id,name:cfg.name,cash:c.cash,inventory:c.inventory,virtual:false,company:c};}
  const planet=FREE_EXCHANGE_PLANETS.find(x=>x.id===id); if(!planet)return null;
  const body=ensureFreePopulationData(id); const stocks=ensureAIExchange().virtualStocks[id];
  return {id,name:planet.name,cash:Number(body?.freePopulationCash)||0,inventory:stocks,virtual:true,body};
}
function exchangeSetCash(participant,value){if(participant.virtual)participant.body.freePopulationCash=Math.max(0,value);else participant.company.cash=Math.max(0,value);}
function exchangeAddOrder(owner,side,key,amount,price){
  const ex=ensureAIExchange(),p=exchangeParticipant(owner),cfg=MARKET_RESOURCES[key];
  if(!p||!cfg||amount<1||price<=0)return;
  const already=ex.orders.filter(o=>o.status==='offen'&&o.owner===owner&&o.side===side&&o.key===key);
  const reserved=already.reduce((sum,o)=>sum+Math.max(0,Number(o.remaining)||0),0);
  const reservedCash=already.filter(o=>o.side==='buy').reduce((sum,o)=>sum+Math.max(0,Number(o.remaining)||0)*Math.max(0,Number(o.price)||0),0);
  const available=side==='sell'?Math.max(0,(Number(p.inventory[key])||0)-reserved):Math.max(0,(p.cash-reservedCash)/price);
  amount=Math.min(amount,available,5000); if(amount<1)return;
  // Pro Teilnehmer und Ressource bleibt höchstens ein offener Antrag je Handelsrichtung bestehen.
  const existing=already[0];
  if(existing){existing.remaining=Math.min(5000,existing.remaining+amount);existing.amount=existing.remaining;existing.price=side==='buy'?Math.max(existing.price,price):Math.min(existing.price,price);existing.expires=gameNow()+24*60*60*1000;return;}
  ex.orders.push({id:`${Math.floor(gameNow())}-${owner}-${key}-${side}-${Math.floor(Math.random()*99999)}`,owner,ownerName:p.name,side,key,amount,remaining:amount,price,created:gameNow(),expires:gameNow()+24*60*60*1000,status:'offen'});
}
function exchangeExecute(buyOrder,sellOrder,amount){
  const buyer=exchangeParticipant(buyOrder.owner),seller=exchangeParticipant(sellOrder.owner); if(!buyer||!seller||buyer.id===seller.id)return false;
  const key=buyOrder.key,price=(Number(buyOrder.price)+Number(sellOrder.price))/2,total=amount*price;
  if((Number(buyer.cash)||0)<total || (Number(seller.inventory[key])||0)<amount)return false;
  // Nur KI-Unternehmen bewegen echte KI-Bestände; freie Bevölkerung nutzt virtuelle Bestände.
  buyer.inventory[key]=(Number(buyer.inventory[key])||0)+amount;
  seller.inventory[key]=(Number(seller.inventory[key])||0)-amount;
  exchangeSetCash(buyer,Number(buyer.cash)-total); exchangeSetCash(seller,Number(seller.cash)+total);
  buyOrder.remaining-=amount;sellOrder.remaining-=amount;
  if(buyOrder.remaining<.01)buyOrder.status='erfüllt'; if(sellOrder.remaining<.01)sellOrder.status='erfüllt';
  const ex=ensureAIExchange();ex.history.unshift({time:gameNow(),buyer:buyer.name,seller:seller.name,key,amount,price,total});ex.history=ex.history.slice(0,100);
  if(!buyer.virtual)buyer.company.totalTrades=(Number(buyer.company.totalTrades)||0)+1;
  if(!seller.virtual)seller.company.totalTrades=(Number(seller.company.totalTrades)||0)+1;
  return true;
}
function runAIExchange(now=gameNow()){
  const ex=ensureAIExchange();
  if(now-ex.lastTick<AI_EXCHANGE_TICK_MS)return;
  ex.lastTick=now;
  // Virtuelle Handelsbestände der Bevölkerung entwickeln sich aus Einwohnerzahl und Zeit.
  FREE_EXCHANGE_PLANETS.forEach(({id})=>{const pop=freePopulationOnPlanet(id);if(pop<=0)return;const stocks=ex.virtualStocks[id];AI_EXCHANGE_RESOURCES.forEach((k,i)=>{stocks[k]=Math.min(50000,Math.max(0,Number(stocks[k])||0)+pop*(i%3===0?.002:.001));});});
  // KI-Unternehmen erzeugen Kauf- und Verkaufsanträge anhand ihrer echten Lagerbestände.
  AI_COMPANY_CONFIG.forEach(cfg=>{const c=ensureAICompanies()[cfg.id];AI_EXCHANGE_RESOURCES.forEach((key,i)=>{
    const stock=aiInventory(c,key),base=Number(MARKET_RESOURCES[key]?.base)||100;
    if(stock<120 && c.cash>base*50) exchangeAddOrder(cfg.id,'buy',key,Math.min(250,350-stock),base*(1.02+(i%3)*.01));
    else if(stock>900) exchangeAddOrder(cfg.id,'sell',key,Math.min(300,stock-650),base*(.96+(i%4)*.01));
  });});
  // Freie Bevölkerung handelt mit rein virtuellen Waren und dem jeweiligen Planetenkonto.
  FREE_EXCHANGE_PLANETS.forEach(({id})=>{const p=exchangeParticipant(id);if(!p||freePopulationOnPlanet(id)<=0)return;AI_EXCHANGE_RESOURCES.forEach((key,i)=>{
    const stock=Number(p.inventory[key])||0,base=Number(MARKET_RESOURCES[key]?.base)||100;
    if(stock<120 && p.cash>base*30)exchangeAddOrder(id,'buy',key,Math.min(120,180-stock),base*(1.04+(i%2)*.01));
    else if(stock>900)exchangeAddOrder(id,'sell',key,Math.min(150,stock-700),base*(.94+(i%3)*.01));
  });});
  // Gegenseitige Annahme: kompatible Kauf- und Verkaufsanträge werden automatisch ausgeführt.
  const buys=ex.orders.filter(o=>o.status==='offen'&&o.side==='buy'&&o.expires>now).sort((a,b)=>b.price-a.price);
  const sells=ex.orders.filter(o=>o.status==='offen'&&o.side==='sell'&&o.expires>now).sort((a,b)=>a.price-b.price);
  buys.forEach(b=>{sells.forEach(s=>{if(b.status!=='offen'||s.status!=='offen'||b.key!==s.key||b.owner===s.owner||b.price<s.price)return;const amount=Math.min(b.remaining,s.remaining);if(amount>0)exchangeExecute(b,s,amount);});});
  ex.orders=ex.orders.filter(o=>o.status==='offen'&&o.expires>now&&o.remaining>=.01).slice(-150);
}

function decideAIExchangeOrder(orderId, decision){
  const ex=ensureAIExchange();
  const order=ex.orders.find(o=>o.id===orderId && o.status==='offen');
  if(!order)return;
  if(decision==='accept'){
    order.playerDecision='angenommen';
    order.playerDecisionTime=gameNow();
    showMarketToast(`Antrag von ${order.ownerName} angenommen.`);
  }else if(decision==='reject'){
    order.status='abgelehnt';
    order.playerDecision='abgelehnt';
    order.playerDecisionTime=gameNow();
    ex.history.unshift({time:gameNow(),type:'decision',buyer:'—',seller:order.ownerName,key:order.key,amount:order.remaining,price:order.price,total:0,note:'Vom Spieler abgelehnt'});
    ex.history=ex.history.slice(0,100);
    showMarketToast(`Antrag von ${order.ownerName} abgelehnt.`);
  }
  saveGame(false);
  renderAIExchange();
}
window.acceptAIExchangeOrder = function(id){ decideAIExchangeOrder(String(id),'accept'); };
window.rejectAIExchangeOrder = function(id){ decideAIExchangeOrder(String(id),'reject'); };

function renderAIExchange(){
  const panel=document.querySelector('#ai-exchange-content');if(!panel)return;const ex=ensureAIExchange();
  const fmt=n=>Number(n||0).toLocaleString('de-DE',{maximumFractionDigits:2});
  const open=ex.orders.filter(o=>o.status==='offen');
  const rows=open.map(o=>`<div class="ai-exchange-order"><span><b>${o.side==='buy'?'🟢 Kaufgesuch':'🔴 Verkaufsangebot'}</b><br>${o.ownerName}<br><small>${o.playerDecision==='angenommen'?'✓ Von dir angenommen':'Wartet auf deine Entscheidung'}</small></span><span>${AI_EXCHANGE_NAMES[o.key]||o.key}<br><b>${fmt(o.remaining)} t</b></span><span>${fmt(o.price)} GD/t<br><small>bis ${new Date(GAME_EPOCH_UTC+o.expires).toISOString().slice(0,16).replace('T',' ')}</small><br><button type="button" class="ai-exchange-accept" onclick="acceptAIExchangeOrder('${String(o.id).replace(/'/g, '')}')">Annehmen</button> <button type="button" class="ai-exchange-reject" onclick="rejectAIExchangeOrder('${String(o.id).replace(/'/g, '')}')">Ablehnen</button></span></div>`).join('')||'<p class="hint">Noch keine offenen Anträge. Die Teilnehmer stellen mit der Zeit eigene Angebote ein.</p>';
  const history=ex.history.slice(0,30).map(h=>`<div class="market-history-row"><span>${h.seller} → ${h.buyer} · ${AI_EXCHANGE_NAMES[h.key]||h.key}</span><strong>${fmt(h.amount)} t</strong><small>${fmt(h.price)} GD/t · Gesamt ${fmt(h.total)} GD</small></div>`).join('')||'<p class="hint">Noch keine abgeschlossenen Geschäfte.</p>';
  const participantList=[...AI_COMPANY_CONFIG.map(c=>({id:c.id,name:c.name,kind:'KI-Unternehmen'})),...FREE_EXCHANGE_PLANETS.filter(p=>freePopulationOnPlanet(p.id)>0).map(p=>({id:p.id,name:p.name,kind:'Virtueller Handel'}))];
  const participants=participantList.map(x=>{const p=exchangeParticipant(x.id);return `<div class="ai-exchange-participant"><b>${x.name}</b><span>${x.kind}</span><strong>${fmt(p?.cash)} GD</strong></div>`;}).join('');
  panel.innerHTML=`<div class="market-summary"><div><span>📑 Offene Anträge</span><strong>${open.length}</strong></div><div><span>🤝 Abgeschlossene Geschäfte</span><strong>${ex.history.length}</strong></div><div><span>👥 Teilnehmer</span><strong>${participantList.length}</strong></div></div><p class="hint">Hier handeln ausschließlich die vier KI-Unternehmen und die freie Bevölkerung auf Luna, Mars und Venus. Kauf- und Verkaufsanträge werden automatisch geprüft und bei passenden Preisen angenommen. Die Waren der freien Bevölkerung sind rein virtuell und verändern keine echten Spielerlager.</p><h3>📋 Offene Kauf- und Verkaufsanträge</h3><div class="ai-exchange-orders">${rows}</div><h3>🏢 Teilnehmer und Kontostände</h3><div class="ai-exchange-participants">${participants}</div><h3>🧾 Handelschronik</h3><div class="market-history">${history}</div>`;
}

const STOCK_COMPANY_CONFIG = {
  helios: { startPrice: 100, policy: 'Industrie priorisieren: Produktionsanlagen und stabile Umsätze ausbauen.' },
  nova: { startPrice: 80, policy: 'Forschung priorisieren: Technologie entwickeln und neue Welten erschließen.' },
  nasga: { startPrice: 60, policy: 'Rohstoffe und Handel priorisieren: Lagerbestände und Marktchancen nutzen.' },
  spacey: { startPrice: 120, totalShares: 30000, policy: 'Raumfahrt priorisieren: Raketen, Transporte und neue Technologien entwickeln.' }
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
    const totalShares = Number(stockCfg.totalShares) || 1000;
    const item = state.stockMarket.companies[cfg.id] ||= {
      price: stockCfg.startPrice, totalShares, availableShares: totalShares,
      playerShares: 0, lastPrice: stockCfg.startPrice,
      lastCompanyValue: null, priceHistory: []
    };
    item.totalShares = totalShares;
    item.playerShares = Math.max(0, Math.min(totalShares, Number(item.playerShares) || 0));
    item.availableShares = Math.max(0, Math.min(totalShares - item.playerShares, Number(item.availableShares ?? totalShares)));
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
      <div class="stock-card-head"><div><h3>${({helios:'🔷',nova:'🟣',nasga:'🟢',spacey:'🚀'}[cfg.id] || '🏢')} ${cfg.name}</h3><span class="hint">${cfg.style}</span></div><div class="stock-price-wrap"><strong class="stock-price">${stockMoney(stock.price)}</strong><span class="stock-change ${trendClass}">${trendLabel} ${changePercent > 0 ? '+' : ''}${changePercent.toLocaleString('de-DE',{maximumFractionDigits:2})}%</span></div></div>
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
  {category:'Kolonisten',title:'Kolonisten und Versorgung',keywords:'kolonisten bevölkerung habitat nahrung wasser wachstum atmosphäre druck sauerstoff 0,8 2,0 bar 15 25 prozent',body:'<p>Kolonisten benötigen geeignete Lebensbedingungen, freien Wohnraum sowie Versorgung mit Nahrung und Wasser. Für normale Wohngebäude und die Vermehrung müssen der Atmosphärendruck zwischen 0,8 und 2,0 bar und der Sauerstoffanteil zwischen 15 % und 25 % liegen. Außerhalb dieses Bereichs vermehren sich Kolonisten nicht; bereits vorhandene Kolonisten sterben nicht und arbeiten weiter. Sobald beide Werte wieder passen, setzt die Vermehrung automatisch fort. Habitate besitzen eine eigene Lebenserhaltung.</p><p>Wenn Kolonisten nicht einziehen oder sich die Bevölkerung nicht wie erwartet entwickelt, kontrolliere den Atmosphärenstatus, verfügbare Unterkünfte und die Versorgung des Standorts.</p>'},
  {category:'Spielverwaltung',title:'Speichern und Spielgeschwindigkeit',keywords:'speichern spielstand laden autosave geschwindigkeit x1 x2 x3 x5 x10',body:'<p>Nutze das Spielmenü für die verfügbaren Speicher- und Ladefunktionen. Das Spiel speichert außerdem bestimmte Änderungen automatisch.</p><p>Über die Spielgeschwindigkeit kannst du den Ablauf der Spielzeit beschleunigen. Bei höherer Geschwindigkeit laufen zeitbasierte Vorgänge entsprechend schneller ab.</p>'},
  {category:'Terraforming',title:'Terraforming und Atmosphäre aufbauen',keywords:'terraforming atmosphäre atmosphärendruck bar co2 sauerstoff stickstoff gas regulator planet luna venus kolonie kolonisten habitat',body:'<p><strong>Terraforming</strong> bedeutet, die Atmosphäre eines Himmelskörpers gezielt aufzubauen und ihre Zusammensetzung zu verbessern. Wähle den gewünschten Planeten oder Luna aus und öffne die Atmosphären-Ansicht auf der Oberfläche.</p><ol><li>Baue bei Bedarf ein <strong>Gas- und Kohlenstofflager</strong>, um freigegebene Gase lokal zu lagern.</li><li>Stelle die benötigten Gase her oder transportiere sie zum Zielkörper.</li><li>In der Atmosphären-Ansicht kannst du vorhandene Gase aus dem Oberflächenlager in die Atmosphäre abgeben. Prüfe vor jeder Freigabe die Gasart und Menge.</li><li>Der <strong>Atmosphären-Regulator</strong> gibt automatisch bis zu 0,2 t CO₂ pro Ingame-Sekunde aus dem lokalen Oberflächenlager ab. Ist kein CO₂ vorhanden, pausiert er und setzt fort, sobald wieder CO₂ im Lager liegt.</li><li>Kontrolliere danach den Atmosphärendruck und den Sauerstoffanteil in der Planetenansicht.</li></ol><p>Der Druck steigt abhängig von der freigegebenen Gasmenge und den Eigenschaften des Himmelskörpers. Ein höherer Druck allein bedeutet noch nicht, dass die Atmosphäre für normale Wohngebäude geeignet ist.</p>'},
  {category:'Terraforming',title:'Atmosphäre: Voraussetzungen für Kolonisten',keywords:'kolonisten kolonist wohngebäude habitat 0,8 2,0 bar sauerstoff o2 15 25 prozent freigabe vermehrung',body:'<p>Für <strong>normale Wohngebäude und die Kolonistenvermehrung</strong> müssen beide Bedingungen gleichzeitig erfüllt sein:</p><ul><li><strong>Atmosphärendruck zwischen 0,8 und 2,0 bar</strong></li><li><strong>Sauerstoffanteil zwischen 15 % und 25 %</strong></li></ul><p>Wenn einer der Werte außerhalb dieses Bereichs liegt, können keine neuen Kolonisten in normalen Wohngebäuden untergebracht werden und die Vermehrung pausiert automatisch. Bereits vorhandene Kolonisten sterben nicht und arbeiten normal weiter. Sobald beide Werte wieder im Bereich liegen, setzt die Vermehrung automatisch fort.</p><p><strong>Habitate</strong> verfügen über eigene Lebenserhaltung und können unabhängig von der Freigabe normaler Wohngebäude genutzt werden. Sie können auf allen Planetenoberflächen außer der Sonne gebaut werden und sind durch ihre Spezialisolierung unabhängig von der Planetentemperatur.</p><p><strong>Tipp:</strong> Öffne die Atmosphären-Ansicht und beobachte sowohl den Druck in bar als auch den Sauerstoffanteil. Gib nicht einfach nur Sauerstoff ab, ohne die Gesamtgasmenge und den Anteil im Blick zu behalten.</p>'},
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
    ['titan1', 'Titan 1'], ['adler1', 'Adler 1'], ['colonistShuttle', 'Kolonisten-Shuttle'],
    ['mobileMiner', 'Mobile Minerrakete'], ['tankRocket', 'Tankrakete']
  ];
  const source = state.selected;
  const mode = state.viewMode === 'orbit' ? 'orbit' : 'surface';
  const available = stockTypes.reduce((sum, [type]) => sum + Math.max(0, Number(getRocketStockCount(type, source, type === 'colonistShuttle' ? 'surface' : mode)) || 0), 0);
  const activeFlights = (Array.isArray(rockets) ? rockets : []).filter(rocket =>
    rocket && typeof rocket === 'object' && rocket.status !== 'returned' && rocket.status !== 'error'
  ).length;
  const activeMissions = (Array.isArray(orbitMissions) ? orbitMissions : []).filter(mission =>
    mission && typeof mission === 'object' && mission.status !== 'completed' && mission.status !== 'deleted'
  ).length;
  const queue = Array.isArray(rocketFactoryQueue[source]) ? rocketFactoryQueue[source].filter(type =>
    typeof type === 'string' && Object.prototype.hasOwnProperty.call(rocketTypes, type)
  ) : [];
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
  const activeButton = content.querySelector(`[data-flight-tab="${active}"]`);
  if (!activeButton) throw new Error('Flugzentrale-Tabs konnten nicht vollständig aufgebaut werden.');
  activeButton.click();
  // Erst nach vollständig erfolgreichem Aufbau als organisiert markieren.
  rocketWindow.dataset.tabbed = 'true';
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


// ==========================================
// FLUGZENTRALE – PERSISTENTES DIAGNOSEPROTOKOLL
// Speichert technische Fehler lokal, ohne Spielmechaniken zu verändern.
// ==========================================
const FLIGHT_DIAG_STORAGE_KEY = 'solarFrontierFlightDiagnostics_v1';
function recordFlightDiagnostic(type, message, details = '') {
  try {
    let entries = [];
    try {
      const saved = JSON.parse(localStorage.getItem(FLIGHT_DIAG_STORAGE_KEY) || '[]');
      if (Array.isArray(saved)) entries = saved;
    } catch (_) {}
    const safeText = value => String(value ?? '').slice(0, 5000);
    let gameTime = '';
    try { gameTime = typeof gameNow === 'function' ? new Date(gameNow()).toISOString() : ''; } catch (_) {}
    let planet = '';
    try { planet = typeof state !== 'undefined' ? String(state.selected || '') : ''; } catch (_) {}
    let slot = '';
    try { slot = localStorage.getItem('solarFrontierOriginsActiveSlot_v1') || '1'; } catch (_) { slot = 'unbekannt'; }
    entries.push({
      timestamp: new Date().toISOString(),
      gameTime,
      slot,
      planet,
      area: 'Flugzentrale',
      type: safeText(type),
      message: safeText(message),
      details: safeText(details)
    });
    entries = entries.slice(-100);
    localStorage.setItem(FLIGHT_DIAG_STORAGE_KEY, JSON.stringify(entries));
  } catch (storageError) {
    console.warn('Flugzentrale-Diagnose konnte nicht gespeichert werden:', storageError);
  }
}
function getFlightDiagnostics() {
  try {
    const value = JSON.parse(localStorage.getItem(FLIGHT_DIAG_STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch (_) { return []; }
}
function exportFlightDiagnostics() {
  const payload = {
    exportedAt: new Date().toISOString(),
    game: 'Solar Frontier: Origins',
    diagnostics: getFlightDiagnostics()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Solar-Frontier-Flugzentrale-Diagnose-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function renderFlightDiagnostics() {
  const entries = getFlightDiagnostics().slice(-12).reverse();
  if (!entries.length) return '<p class="hint">Noch keine Fehler protokolliert. Das Diagnose-System ist bereit.</p>';
  return entries.map(entry => `<div class="flight-diagnostic-entry"><strong>${String(entry.type || 'Fehler').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</strong><small>${String(entry.timestamp || '')} · Planet: ${String(entry.planet || 'unbekannt')} · Spielstand: ${String(entry.slot || '?')}</small><p>${String(entry.message || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}</p></div>`).join('');
}
function bindFlightDiagnostics(content) {
  const toggle = content.querySelector('#flight-diagnostics-toggle');
  const box = content.querySelector('#flight-diagnostics-box');
  const output = content.querySelector('#flight-diagnostics-output');
  const exportButton = content.querySelector('#flight-diagnostics-export');
  const clearButton = content.querySelector('#flight-diagnostics-clear');
  if (toggle && box) toggle.addEventListener('click', () => {
    box.hidden = !box.hidden;
    if (output) output.innerHTML = renderFlightDiagnostics();
  });
  if (exportButton) exportButton.addEventListener('click', exportFlightDiagnostics);
  if (clearButton) clearButton.addEventListener('click', () => {
    try { localStorage.removeItem(FLIGHT_DIAG_STORAGE_KEY); } catch (_) {}
    if (output) output.innerHTML = renderFlightDiagnostics();
  });
}
if (typeof window !== 'undefined' && !window.__solarFlightDiagnosticsInstalled) {
  window.__solarFlightDiagnosticsInstalled = true;
  window.addEventListener('error', event => {
    if (document.querySelector('#flight-center-panel')?.hidden) return;
    recordFlightDiagnostic('JavaScript-Fehler', event.message || 'Unbekannter Fehler',
      `${event.filename || ''}:${event.lineno || 0}:${event.colno || 0}\n${event.error?.stack || ''}`);
  });
  window.addEventListener('unhandledrejection', event => {
    if (document.querySelector('#flight-center-panel')?.hidden) return;
    const reason = event.reason;
    recordFlightDiagnostic('Nicht behandelter Promise-Fehler',
      reason?.message || String(reason || 'Unbekannter Promise-Fehler'), reason?.stack || '');
  });
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
  try {
    content.innerHTML = `<div class="flight-center-command-banner"><div><span class="flight-center-kicker">MISSION CONTROL</span><h3>Flotten- und Flugmanagement</h3><p>Raketen verwalten, Transporte steuern und Produktion überwachen.</p></div><div class="flight-center-banner-actions"><button type="button" id="flight-tutorial-start" class="flight-tutorial-start">🎓 Schritt-für-Schritt-Tutorial</button><button type="button" id="flight-diagnostics-toggle" class="flight-diagnostics-button">🛠 Diagnoseprotokoll (${getFlightDiagnostics().length})</button><span class="flight-center-signal"><i></i> SYSTEM ONLINE</span></div></div><section id="flight-diagnostics-box" class="flight-diagnostics-box" hidden><div class="flight-diagnostics-head"><strong>Technisches Diagnoseprotokoll</strong><div><button type="button" id="flight-diagnostics-export">Protokoll exportieren</button><button type="button" id="flight-diagnostics-clear">Protokoll löschen</button></div></div><p class="hint">Fehler werden lokal auf diesem Gerät gespeichert (maximal 100 Einträge). Beim Export entsteht eine JSON-Datei, die du mir schicken kannst.</p><div id="flight-diagnostics-output">${renderFlightDiagnostics()}</div></section>${renderRocketWindow(selectedBody)}`;
    // Der Schutz umfasst den gesamten DOM-Aufbau, nicht nur das Erzeugen des HTML.
    organizeFlightCenterTabs();
    restoreDetailsOpenState(content, openDetails);
    rocketControlRoot = content;
    bindRocketControls();
    bindFlightDiagnostics(content);
    const tutorialButton = content.querySelector('#flight-tutorial-start');
    if (tutorialButton) tutorialButton.addEventListener('click', startFlightTutorial);
    if (flightTutorialState.active) updateFlightTutorialTarget();
  } catch (error) {
    recordFlightDiagnostic('Renderfehler Flugzentrale', error?.message || String(error), error?.stack || '');
    console.error('Fehler beim vollständigen Aufbau der Flugzentrale:', error);
    content.innerHTML = `<div class="flight-center-command-banner"><div><span class="flight-center-kicker">MISSION CONTROL</span><h3>Flotten- und Flugmanagement</h3><p>Die Flugzentrale konnte wegen eines fehlerhaften oder veralteten Datensatzes nicht vollständig aufgebaut werden. Das restliche Spiel bleibt davon getrennt.</p></div></div><section class="flight-diagnostics-box"><strong>Fehler wurde gespeichert.</strong><div id="flight-diagnostics-output">${renderFlightDiagnostics()}</div><button type="button" id="flight-diagnostics-export">Protokoll exportieren</button><button type="button" id="flight-center-retry" class="flight-tutorial-start">Flugzentrale erneut laden</button></section>`;
    content.querySelector('#flight-diagnostics-export')?.addEventListener('click', exportFlightDiagnostics);
    content.querySelector('#flight-center-retry')?.addEventListener('click', () => renderFlightCenter());
    rocketControlRoot = content;
  }
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
  const safeMissions = (Array.isArray(orbitMissions) ? orbitMissions : []).filter(m => m && typeof m === 'object' && !Array.isArray(m));
  const total = safeMissions.length;
  const active = safeMissions.filter(m => ['waiting','outbound','returning'].includes(m.status)).length;
  const waiting = safeMissions.filter(m => m.status === 'waiting' && m.message).length;
  const grouped = new Map(planetEntries.map(([id, body]) => [id, {body, missions: safeMissions.filter(m => m.source === id)}]));
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
  const normalTab=document.querySelector('#normal-market-tab'),exchangeTab=document.querySelector('#ai-exchange-tab'),normalContent=document.querySelector('#market-content'),exchangeContent=document.querySelector('#ai-exchange-content');
  const showMarketMode=(mode)=>{if(!normalContent||!exchangeContent)return;const normal=mode==='normal';normalContent.hidden=!normal;exchangeContent.hidden=normal;normalTab?.classList.toggle('active',normal);exchangeTab?.classList.toggle('active',!normal);if(normal)renderMarket();else renderAIExchange();};
  normalTab?.addEventListener('click',()=>showMarketMode('normal'));exchangeTab?.addEventListener('click',()=>showMarketMode('exchange'));

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
  const freePopulationButton = document.querySelector('#free-population-button');
  const freePopulationPanel = document.querySelector('#free-population-panel');
  const freePopulationClose = document.querySelector('#free-population-close');
  if (freePopulationButton && freePopulationPanel) freePopulationButton.addEventListener('click', () => {
    freePopulationPanel.hidden = !freePopulationPanel.hidden;
    if (!freePopulationPanel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#introduction-panel','#settings-panel','#asteroids-panel','#market-panel','#company-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel=>{const el=document.querySelector(sel);if(el)el.hidden=true;});
      const menu=document.querySelector('#main-menu'); if(menu) menu.hidden=true;
      renderFreePopulationPanel();
    }
  });
  if (freePopulationClose && freePopulationPanel) freePopulationClose.addEventListener('click',()=>{freePopulationPanel.hidden=true;});
  const populationTabs = document.querySelectorAll('.population-tab');
  function showPopulationSection(section) {
    const showFree = section === 'free';
    if (colonistsPanel) colonistsPanel.hidden = showFree;
    if (freePopulationPanel) freePopulationPanel.hidden = !showFree;
    populationTabs.forEach(tab => {
      const active = tab.dataset.populationTab === section;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    if (showFree) renderFreePopulationPanel();
    else renderColonistsPanel();
  }
  populationTabs.forEach(tab => tab.addEventListener('click', () => showPopulationSection(tab.dataset.populationTab)));
  [colonistsPanel, freePopulationPanel].forEach(panel => {
    if (!panel) return;
    let touchStartX = 0;
    panel.addEventListener('touchstart', event => { touchStartX = event.changedTouches[0]?.clientX || 0; }, { passive: true });
    panel.addEventListener('touchend', event => {
      const endX = event.changedTouches[0]?.clientX || 0;
      const delta = endX - touchStartX;
      if (Math.abs(delta) > 65) showPopulationSection(delta < 0 ? 'free' : 'colonists');
    }, { passive: true });
  });
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
  const count = Number(getOperationalBuildingsOnPlanet(id).co2ProcessingPlant || 0);
  return count * 0.1;
}


