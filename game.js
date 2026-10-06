// ==========================================
// WELTRAUM GAME – Rohstoffabbau
// ==========================================
const solarSystem = document.querySelector('#solar-system');
const infoPanel = document.querySelector('#info-panel');
const topResources = document.querySelector('#top-resources');
const saveMenu = document.querySelector('#save-menu');
const saveStatus = document.querySelector('#save-status');
const SAVE_KEY = 'weltraumGameSave_v1';

const state = {
  selected: 'earth',
  // Spielerbestand: Nur hier landen Rohstoffe, die tatsächlich abgebaut wurden.
  stone: 0,
  coal: 0,
  gas: 0,
  iron: 0,
  steel: 0,
  buildings: {
    steelworks: 0,
    stoneQuarry: 0,
    coalMine: 0,
    gasPlant: 0,
    ironMine: 0,
    rocketStation: 0,
    coalPowerPlant: 0
  },
  lastUpdate: performance.now(),
  buildMenuOpen: false
};

const buildingTypes = {
  stoneQuarry: { name: 'Steinbruch', icon: '🪨', resource: 'stone', rate: 1, cost: 10, text: '1 t Stein/s' },
  coalMine: { name: 'Kohlemine', icon: '⛏️', resource: 'coal', rate: 0.5, cost: 15, text: '0,5 t Kohle/s' },
  gasPlant: { name: 'Gasförderanlage', icon: '🔥', resource: 'gas', rate: 0.25, cost: 25, text: '0,25 t Gas/s' },
  ironMine: { name: 'Eisenmine', icon: '🧲', resource: 'iron', rate: 0.1, cost: 20, text: '0,1 t Eisen/s' },
  siliconMine: { name: 'Siliziummine', icon: '🔷', resource: 'silicon', rate: 0.3, cost: 30, text: '0,3 t Silizium/s' }
};

const rocketTypes = {
  hercules1: { name: 'Herkules 1', icon: '🚀', cost: 45 }
};

const flightTimes = {
  mercury: 10,
  venus: 15,
  earth: 5,
  mars: 20,
  jupiter: 30,
  luna: 10
};

const rockets = [];
const rocketBuildQueue = {};
const rocketBuildStarted = {};
const rocketStock = {};
let rocketQuantity = 1;
let rocketCargoResource = 'stone';
let rocketCargoAmount = 0;
let rocketDestination = 'mars';

const bodies = {
  sun: { name: 'Sonne', type: 'Stern', className: 'sun', temperature: 'ca. 5.500 °C Oberfläche', resources: {}, storage: {}, orbit: 0 },
  mercury: { name: 'Merkur', type: 'Planet', className: 'mercury', temperature: 'ca. 167 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000 }, storage: {}, orbit: 150 },
  venus: { name: 'Venus', type: 'Planet', className: 'venus', temperature: 'ca. 464 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000 }, storage: {}, orbit: 235 },
  earth: { name: 'Erde', type: 'Startplanet', className: 'earth', temperature: 'ca. 15 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000, iron: 2000000 }, storage: null, orbit: 320 },
  luna: { name: 'Luna', type: 'Mond der Erde', className: 'luna', temperature: 'ca. -20 °C Durchschnitt', resources: { iron: 2000000, silicon: 4000000 }, storage: {}, orbit: 0, moonOf: 'earth', moonOrbit: 55 },
  mars: { name: 'Mars', type: 'Planet', className: 'mars', temperature: 'ca. -63 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000 }, storage: {}, orbit: 405 },
  jupiter: { name: 'Jupiter', type: 'Gasplanet', className: 'jupiter', temperature: 'ca. -110 °C Wolkenobergrenze', resources: { hydrogen: 100000, helium: 50000 }, storage: {}, orbit: 515 }
};

const resourceNames = { stone: 'Stein', coal: 'Kohle', gas: 'Gas', iron: 'Eisen', silicon: 'Silizium', steel: 'Stahl', hydrogen: 'Wasserstoff', helium: 'Helium' };
const resourceIcons = { stone: '🪨', coal: '⚫', gas: '🔥', iron: '🧲', silicon: '🔷', steel: '🔩', hydrogen: '💨', helium: '💨' };

function formatTons(value) { return `${value.toFixed(2)} t`; }

function getBuildingsOnPlanet(id) {
  if (id === 'earth') return state.buildings;
  if (!bodies[id].buildings) {
    bodies[id].buildings = { steelworks: 0, stoneQuarry: 0, coalMine: 0, gasPlant: 0, ironMine: 0, siliconMine: 0, rocketStation: 0, coalPowerPlant: 0 };
  }
  return bodies[id].buildings;
}
function getPlanetStorage(id) {
  if (id === 'earth') return state;
  if (!bodies[id].storage) bodies[id].storage = {};
  return bodies[id].storage;
}
function storageAmount(id, resource) { return Number(getPlanetStorage(id)[resource] || 0); }
function formatStorage(id) {
  const st = getPlanetStorage(id);
  const keys = ['stone','coal','gas','iron','silicon','steel','hydrogen','helium'];
  const rows = keys.filter(k => Number(st[k] || 0) > 0.000001).map(k => `<div class="stat"><span>${resourceIcons[k] || ''} ${resourceNames[k] || k}</span><strong>${formatTons(st[k])}</strong></div>`);
  return rows.length ? rows.join('') : '<p class="hint">Lager ist leer.</p>';
}

function ironProduction(id = state.selected) { return getBuildingsOnPlanet(id).ironMine * 0.1; }
function steelProduction(id = state.selected) { return getBuildingsOnPlanet(id).steelworks * 0.2; }
function ironUse(id = state.selected) { return getBuildingsOnPlanet(id).steelworks * 0.2; }
function siliconProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).siliconMine || 0) * 0.3; }
function siliconUse(id = state.selected) { return 0; }
function electricityProduction(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 20; }
function coalPowerUse(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 0.0002; }

function totalBuildingsOnPlanet(id) { return Object.values(getBuildingsOnPlanet(id)).reduce((a, b) => a + b, 0); }

function showSaveStatus(message, good = true) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${good ? 'good' : 'bad'}`;
}

function getSaveData() {
  return {
    version: 1,
    state: {
      selected: state.selected,
      stone: state.stone,
      coal: state.coal,
      gas: state.gas,
      iron: state.iron,
      steel: state.steel,
      buildings: state.buildings,
      buildMenuOpen: false
    },
    bodies,
    rockets,
    rocketBuildQueue,
    rocketBuildStarted,
    rocketStock,
    rocketQuantity,
    rocketCargoResource,
    rocketCargoAmount,
    rocketDestination
  };
}

function saveGame(showMessage = true) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(getSaveData()));
    if (showMessage) showSaveStatus('Spielstand gespeichert.');
  } catch (error) {
    console.error(error);
    showSaveStatus('Speichern fehlgeschlagen.', false);
  }
}

function loadGame(showMessage = true) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      if (showMessage) showSaveStatus('Kein Spielstand vorhanden.', false);
      return false;
    }
    const data = JSON.parse(raw);
    if (!data || !data.state || !data.bodies) throw new Error('Ungültiger Spielstand');

    Object.assign(state, data.state);
    state.lastUpdate = performance.now();
    Object.assign(bodies, data.bodies);

    rockets.length = 0;
    (data.rockets || []).forEach(r => rockets.push(r));
    Object.keys(rocketBuildQueue).forEach(k => delete rocketBuildQueue[k]);
    Object.assign(rocketBuildQueue, data.rocketBuildQueue || {});
    Object.keys(rocketBuildStarted).forEach(k => delete rocketBuildStarted[k]);
    Object.assign(rocketBuildStarted, data.rocketBuildStarted || {});
    Object.keys(rocketStock).forEach(k => delete rocketStock[k]);
    Object.assign(rocketStock, data.rocketStock || {});
    rocketQuantity = Number(data.rocketQuantity) || 1;
    rocketCargoResource = data.rocketCargoResource || 'stone';
    rocketCargoAmount = Number(data.rocketCargoAmount) || 0;
    rocketDestination = data.rocketDestination || 'mars';

    renderSystem();
    renderInfo();
    renderTopResources();
    if (showMessage) showSaveStatus('Spielstand geladen.');
    return true;
  } catch (error) {
    console.error(error);
    if (showMessage) showSaveStatus('Laden fehlgeschlagen.', false);
    return false;
  }
}

function restartGame() {
  localStorage.removeItem(SAVE_KEY);
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
    if (!saveMenu.hidden) showSaveStatus('');
  });
  close.addEventListener('click', () => { saveMenu.hidden = true; });
  save.addEventListener('click', () => saveGame(true));
  load.addEventListener('click', () => loadGame(true));
  restart.addEventListener('click', () => {
    if (confirm('Spiel wirklich neu starten? Der gespeicherte Spielstand wird gelöscht.')) restartGame();
  });
}

function renderSystem() {
  solarSystem.innerHTML = '';
  Object.values(bodies).forEach(body => {
    if (body.orbit > 0) {
      const orbit = document.createElement('div');
      orbit.className = 'orbit';
      orbit.style.width = `${body.orbit * 2}px`;
      orbit.style.height = `${body.orbit * 2}px`;
      solarSystem.appendChild(orbit);
    }
  });

  const angles = { sun: 0, mercury: 25, venus: 150, earth: 250, mars: 70, jupiter: 145 };

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
  moon.innerHTML = '<span class="body-label">Luna</span>' +
    `<span class="building-badge moon-building-badge" role="button" tabindex="0" title="Gebäudemenü öffnen">${totalBuildingsOnPlanet('luna') > 0 ? `🏭 ${totalBuildingsOnPlanet('luna')}` : '🏗️'}</span>`;
  const moonBuildingBadge = moon.querySelector('.moon-building-badge');
  moonBuildingBadge.addEventListener('click', (event) => {
    event.stopPropagation();
    state.selected = 'luna';
    state.buildMenuOpen = true;
    renderSystem();
    renderInfo();
  });
  moonBuildingBadge.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      state.selected = 'luna';
      state.buildMenuOpen = true;
      renderSystem();
      renderInfo();
    }
  });
  moon.addEventListener('click', (event) => {
    if (event.target === moonBuildingBadge || moonBuildingBadge.contains(event.target)) return;
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

    if (id !== 'sun') {
      const badge = document.createElement('button');
      badge.className = 'building-badge';
      badge.type = 'button';
      badge.title = 'Gebäudemenü öffnen';
      badge.textContent = totalBuildingsOnPlanet(id) > 0
        ? `🏭 ${totalBuildingsOnPlanet(id)}`
        : '🏗️';
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        if (state.selected !== id) {
          state.selected = id;
          state.buildMenuOpen = true;
        } else {
          state.buildMenuOpen = !state.buildMenuOpen;
        }
        renderSystem();
        renderInfo();
      });
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

  // Das Baumenü wird nur geöffnet, wenn der Spieler auf das 🏗️-Symbol tippt.
  if (state.selected !== 'sun' && state.buildMenuOpen) {
    const menu = document.createElement('div');
    menu.className = 'planet-build-menu';
    menu.innerHTML = `<div class="planet-build-header"><div class="planet-build-title">🏗️ Gebäude auf ${bodies[state.selected].name}</div><button type="button" class="build-menu-close" id="close-build-menu" aria-label="Gebäudemenü schließen">✕</button></div>
      <div class="build-card steelworks-card"><div><strong>🏭 Stahlwerk</strong><small>0,2 t Stahl/s · verbraucht 0,2 t Eisen/s · erstes kostenlos · weitere 20 t Stahl</small></div><button class="build-resource" id="build-steelworks-floating" ${(getBuildingsOnPlanet(state.selected).steelworks === 0 || state.steel >= 20) ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).steelworks})</button></div>
      ${buildButton('stoneQuarry')}
      ${buildButton('coalMine')}
      ${buildButton('gasPlant')}
      ${buildButton('ironMine')}
      <div class="build-card"><div><strong>⚡ Kohlekraftwerk</strong><small>20 MW Strom/s · verbraucht 0,0002 t Kohle/s · 90 t Stahl</small></div><button class="build-resource" id="build-coal-power" ${state.steel >= 90 ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).coalPowerPlant})</button></div>
      <div class="build-card rocket-station-card"><div><strong>🚀 Raketenstation</strong><small>Startet Herkules-1-Raketen · Rakete kostet 45 t Stahl</small></div><button class="build-resource" id="build-rocket-station" ${getBuildingsOnPlanet(state.selected).rocketStation ? 'disabled' : ''}>${getBuildingsOnPlanet(state.selected).rocketStation ? 'Gebaut' : 'Bauen'}</button></div>`;

    menu.style.left = '50%';
    menu.style.top = 'calc(50% - 150px)';
    solarSystem.appendChild(menu);

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
    menu.querySelector('#build-rocket-station').addEventListener('click', buildRocketStation);
  }
  applyLanguage();
}

function renderTopResources() {
  // Oben werden nur Rohstoffe angezeigt, die der Spieler bereits abgebaut hat.
  const mined = [
    ['stone', '🪨', 'Stein'],
    ['coal', '⚫', 'Kohle'],
    ['gas', '🔥', 'Gas'],
    ['iron', '🧲', 'Eisen']
  ].filter(([key]) => state[key] > 0.000001);

  const parts = mined.map(([key, icon, name]) =>
    `${icon} ${name}: <strong>${formatTons(state[key])}</strong>`
  );

  // Stahl und Strom sind Produktionswerte/Bestände und werden separat angezeigt.
  if (state.steel > 0.000001) parts.push(`🔩 Stahl: <strong>${formatTons(state.steel)}</strong>`);
  if (electricityProduction('earth') > 0) parts.push(`⚡ Strom: <strong>${electricityProduction('earth').toFixed(0)} MW/s</strong>`);

  topResources.innerHTML = parts.length
    ? parts.join(' &nbsp;|&nbsp; ')
    : '<span class="hint">Noch keine Rohstoffe abgebaut</span>';
  applyLanguage();
}

function resourceRows(body) {
  const entries = Object.entries(body.resources);
  if (!entries.length) return '<p class="hint">Keine abbaubaren Rohstoffe.</p>';
  return entries.map(([key, amount]) => `<div class="stat"><span>${resourceIcons[key] || ''} ${resourceNames[key] || key}</span><strong>${amount.toLocaleString('de-DE', { maximumFractionDigits: 2 })} t</strong></div>`).join('');
}

function buildingCost(key, planetId = state.selected) {
  const b = buildingTypes[key];
  const count = getBuildingsOnPlanet(planetId)[key];
  // Nur die erste Eisenmine ist kostenlos. Jede weitere kostet 20 t Stahl.
  if (key === 'ironMine' && planetId === 'earth' && count === 0) return 0;
  return b.cost;
}

function buildButton(key) {
  const b = buildingTypes[key];
  const count = getBuildingsOnPlanet(state.selected)[key];
  const cost = buildingCost(key);
  const affordable = state.steel >= cost;
  const costText = cost === 0 ? 'kostenlos' : `${cost} t Stahl`;
  const extraText = key === 'ironMine' && state.selected !== 'earth' ? ' · nicht kostenlos' : '';
  return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${costText}${extraText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
}

function renderInfo() {
  const body = bodies[state.selected];
  if (state.selected === 'sun') {
    infoPanel.innerHTML = `<h2>☀️ Sonne</h2><p class="hint">${body.type}</p><div class="stat"><span>Temperatur</span><strong>${body.temperature}</strong></div><h3>🌐 Rohstoffe</h3><p class="hint">Keine abbaubaren Rohstoffe.</p>`;
    applyLanguage();
    return;
  }
  const bld = getBuildingsOnPlanet(state.selected);
  const localStorage = getPlanetStorage(state.selected);
  infoPanel.innerHTML = `<h2>${state.selected === 'earth' ? '🌍' : '🪐'} ${body.name}</h2><p class="hint">${body.type}</p><div class="stat"><span>Temperatur</span><strong>${body.temperature}</strong></div><h3>🌐 Rohstoffe auf dem Planeten</h3>${resourceRows(body)}<h3>📦 Lager auf ${body.name}</h3>${formatStorage(state.selected)}<hr><h3>🏭 Gebäude auf ${body.name}</h3><div class="stat"><span>Gebäude gesamt</span><strong>${totalBuildingsOnPlanet(state.selected)}</strong></div><div class="stat"><span>Eisenproduktion</span><strong>${formatTons(ironProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumproduktion</span><strong>${formatTons(siliconProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumverbrauch</span><strong>${formatTons(siliconUse(state.selected))}/s</strong></div>${state.selected === 'earth' ? `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse('earth'))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction('earth'))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction('earth').toFixed(2)} MW/s</strong></div>` : `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction(state.selected))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction(state.selected).toFixed(2)} MW/s</strong></div>`}<hr>${renderRocketWindow(body)}`;
  bindRocketControls();
  applyLanguage();
}

function buildResourceBuilding(key) {
  const bld = getBuildingsOnPlanet(state.selected);
  const cost = buildingCost(key);
  if (state.steel < cost) return;
  // Schutz gegen unbeabsichtigtes mehrfaches kostenloses Bauen der Eisenmine.
  if (key === 'ironMine' && state.selected !== 'earth' && state.steel < 20) return;
  state.steel -= cost;
  bld[key]++;
  renderSystem(); renderInfo(); renderTopResources();
}

function buildSteelworks() {
  const bld = getBuildingsOnPlanet(state.selected);
  if (bld.steelworks === 0) {
    bld.steelworks = 1;
  } else {
    if (state.steel < 20) return;
    state.steel -= 20;
    bld.steelworks++;
  }
  renderSystem(); renderInfo(); renderTopResources();
}

function buildCoalPowerPlant() {
  if (state.steel < 90) return;
  state.steel -= 90;
  getBuildingsOnPlanet(state.selected).coalPowerPlant++;
  renderSystem(); renderInfo(); renderTopResources();
}

function buildRocketStation() {
  const bld = getBuildingsOnPlanet(state.selected);
  if (bld.rocketStation > 0) return;
  bld.rocketStation = 1;
  renderSystem(); renderInfo();
}

function buildHercules1() {
  const source = state.selected;
  ensureRocketData(source);
  if (source === 'sun' || !getBuildingsOnPlanet(source).rocketStation || rocketBuildQueue[source] > 0) return;
  const storage = getPlanetStorage(source);
  if (Number(storage.steel || 0) < 45) return;
  storage.steel -= 45;
  rocketBuildQueue[source] = 1;
  rocketBuildStarted[source] = performance.now();
  renderInfo(); renderTopResources();
}

function getPlayerResourceAmount(resource, planetId = state.selected) { return Number(getPlanetStorage(planetId)[resource] || 0); }

function ensureRocketData(planetId) {
  if (rocketStock[planetId] === undefined) rocketStock[planetId] = 0;
  if (rocketBuildQueue[planetId] === undefined) rocketBuildQueue[planetId] = 0;
  if (rocketBuildStarted[planetId] === undefined) rocketBuildStarted[planetId] = 0;
}

function launchHercules1(source, destination, quantity) {
  ensureRocketData(source);
  if (!getBuildingsOnPlanet(source).rocketStation || !rocketStock[source] || !bodies[destination] || destination === source || destination === 'sun') return;
  quantity = Math.max(1, Math.min(quantity, rocketStock[source]));

  const amountPerRocket = Math.max(0, Math.min(120, Number(rocketCargoAmount) || 0));
  const available = getPlayerResourceAmount(rocketCargoResource, source);
  const totalCargo = amountPerRocket * quantity;
  if (amountPerRocket <= 0 || totalCargo > available + 0.000001) return;

  const sourceStorage = getPlanetStorage(source);
  sourceStorage[rocketCargoResource] = Number(sourceStorage[rocketCargoResource] || 0) - totalCargo;
  if (Math.abs(sourceStorage[rocketCargoResource]) < 0.000001) sourceStorage[rocketCargoResource] = 0;

  rocketStock[source] -= quantity;
  const duration = (flightTimes[destination] || 20) * 1000;
  for (let i = 0; i < quantity; i++) {
    rockets.push({
      id: Date.now() + Math.random(),
      name: rocketTypes.hercules1.name,
      from: source,
      to: destination,
      started: performance.now(),
      duration,
      status: 'outbound',
      capacity: 120,
      cargo: { resource: rocketCargoResource, amount: amountPerRocket }
    });
  }
  renderInfo(); renderTopResources();
}

function returnRocket(rocketId, cargoResource = null, cargoAmount = 0) {
  const rocket = rockets.find(r => String(r.id) === String(rocketId));
  if (!rocket || rocket.status !== 'arrived') return;
  const source = rocket.to;
  const destination = rocket.from;
  const duration = (flightTimes[rocket.from] || flightTimes[rocket.to] || 20) * 1000;
  const storage = getPlanetStorage(source);
  const amount = Math.max(0, Math.min(120, Number(cargoAmount) || 0));
  if (cargoResource && amount > 0) {
    const available = Number(storage[cargoResource] || 0);
    if (amount > available + 0.000001) return;
    storage[cargoResource] = available - amount;
    rocket.returnCargo = { resource: cargoResource, amount };
  } else {
    rocket.returnCargo = { resource: null, amount: 0 };
  }
  rocket.status = 'returning';
  rocket.returnTo = destination;
  rocket.fromReturn = source;
  rocket.to = destination;
  rocket.started = performance.now();
  rocket.duration = duration;
  renderInfo();
  renderTopResources();
}

function renderRocketWindow(body) {
  const source = state.selected;
  ensureRocketData(source);
  if (source === 'sun') return '';

  if (!bodies[rocketDestination] || rocketDestination === source || rocketDestination === 'sun') {
    rocketDestination = Object.keys(bodies).find(id => id !== 'sun' && id !== source) || 'earth';
  }
  const stock = rocketStock[source] || 0;
  const buildQueue = rocketBuildQueue[source] || 0;
  const buildStarted = rocketBuildStarted[source] || 0;
  const destinations = Object.entries(bodies)
    .filter(([id]) => id !== 'sun' && id !== source && flightTimes[id] !== undefined)
    .map(([id, b]) => `<option value="${id}" ${rocketDestination === id ? 'selected' : ''}>${b.name} · ${flightTimes[id] || 20} s</option>`).join('');

  const qty = Math.max(1, Math.min(rocketQuantity, Math.max(1, stock)));
  rocketQuantity = qty;
  const target = rocketDestination;
  const sec = flightTimes[target] || 20;
  const active = rockets.filter(r => r.status !== 'returned' && (r.from === source || r.to === source));
  const list = active.length ? active.map(r => {
    const elapsed = performance.now() - r.started;
    const remaining = Math.max(0, (r.duration - elapsed) / 1000);
    const pct = Math.min(100, elapsed / r.duration * 100);
    const cargo = r.deliveredCargo || r.cargo;
    const cargoText = cargo && cargo.amount > 0
      ? `${resourceIcons[cargo.resource] || ''} ${resourceNames[cargo.resource] || cargo.resource}: ${cargo.amount.toFixed(2)} t`
      : 'Keine Fracht';
    if (r.status === 'arrived') {
      const returnOptions = ['stone','coal','gas','iron','silicon','steel'].filter(k => Number(getPlanetStorage(r.to)[k] || 0) > 0.000001)
        .map(k => `<option value="${k}">${resourceIcons[k] || ''} ${resourceNames[k] || k}</option>`).join('');
      return `<div class="rocket-flight arrived"><strong>🚀 ${r.name}</strong><span>📍 ${bodies[r.to].name} · angekommen</span><div class="rocket-cargo">📦 Hinflug: ${cargoText}</div><div class="rocket-return-box"><select class="rocket-return-resource" data-rocket-id="${r.id}"><option value="">Keine Rückfracht</option>${returnOptions}</select><input class="rocket-return-amount" data-rocket-id="${r.id}" type="number" min="0" max="120" step="0.01" value="0"><button class="rocket-return" data-rocket-id="${r.id}">↩️ Zurück nach ${bodies[r.from].name}</button></div><small>Rückflug ${bodies[r.to].name} → ${bodies[r.from].name}: ${flightTimes[r.from] || flightTimes[r.to] || 20} Sekunden · max. 120 t</small></div>`;
    }
    if (r.status === 'returning') return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>↩️ ${bodies[r.fromReturn || r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 Rückflug</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
    return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>🚀 ${bodies[r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 ${cargoText}</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
  }).join('') : '<p class="hint">Keine aktiven Transporte mit diesem Planeten.</p>';

  const buildRemaining = buildQueue ? Math.max(0, 30 - (performance.now() - buildStarted)/1000) : 0;
  const buildPct = buildQueue ? Math.min(100, (performance.now()-buildStarted)/30000*100) : 0;
  const localSteel = getPlayerResourceAmount('steel', source);
  const cargoOptions = ['stone','coal','gas','iron','silicon','steel'].map(key => `<option value="${key}" ${rocketCargoResource === key ? 'selected' : ''}>${resourceIcons[key] || ''} ${resourceNames[key] || key} (${formatTons(getPlayerResourceAmount(key, source))})</option>`).join('');
  const cargoMax = Math.min(120, getPlayerResourceAmount(rocketCargoResource, source));
  const cargoAmount = Math.min(cargoMax, Math.max(0, Number(rocketCargoAmount) || 0));
  rocketCargoAmount = cargoAmount;
  const totalCargo = cargoAmount * qty;
  const cargoPossible = totalCargo <= getPlayerResourceAmount(rocketCargoResource, source) + 0.000001 && cargoAmount > 0;

  return `<section class="rocket-window"><h3>🚀 Transportzentrale</h3>
    <p class="hint"><strong>Startplanet:</strong> ${body.name} · Raketen und Fracht werden aus dem Lager dieses Planeten genommen.</p>
    <div class="rocket-stock">Herkules 1 verfügbar: <strong>${stock}</strong> · Kapazität: <strong>120 t/Rakete</strong></div>
    <div class="rocket-build-box"><strong>🏗️ Raketenbau auf ${body.name}</strong><small>45 t Stahl · 30 Sekunden Bauzeit · ${buildQueue ? buildRemaining.toFixed(1)+' s verbleiben' : 'bereit'}</small>${buildQueue ? `<div class="rocket-progress"><i style="width:${buildPct}%"></i></div>` : ''}<button id="build-hercules" ${buildQueue || localSteel < 45 ? 'disabled' : ''}>🚀 1 Herkules 1 bauen – 45 t Stahl</button></div>
    <div class="transport-route"><label for="rocket-destination"><strong>🎯 Zielplanet</strong></label><select id="rocket-destination">${destinations}</select></div>
    <div class="rocket-quantity"><strong>Anzahl:</strong><button class="qty-btn" id="rocket-minus">−</button><span>${qty}</span><button class="qty-btn" id="rocket-plus">+</button></div>
    <div class="rocket-capacity">Gesamtkapazität: <strong>${qty*120} t</strong></div>
    <div class="rocket-cargo-box"><strong>📦 Fracht pro Rakete</strong><select id="rocket-cargo-resource">${cargoOptions}</select><div class="cargo-input-row"><input id="rocket-cargo-range" type="range" min="0" max="${cargoMax}" step="0.01" value="${cargoAmount}"><input id="rocket-cargo-number" type="number" min="0" max="${cargoMax}" step="0.01" value="${cargoAmount.toFixed(2)}"></div><div class="rocket-cargo-summary">${resourceIcons[rocketCargoResource] || ''} ${formatTons(cargoAmount)} pro Rakete · <strong>${formatTons(totalCargo)}</strong> insgesamt</div>${cargoPossible ? '' : '<small class="bad">Nicht genug Fracht im Lager oder Menge ist 0 t.</small>'}</div>
    <button class="rocket-launch" id="launch-hercules" ${stock < qty || !cargoPossible ? 'disabled' : ''}>🚀 ${qty} Herkules 1 nach ${bodies[target].name} starten</button>
    <p class="hint">Flugzeit: ${sec} Sekunden · Fracht wird bei Ankunft ins Lager von ${bodies[target].name} gelegt.</p>
    <hr><h3>📡 Aktive Transporte</h3>${list}</section>`;
}

function bindRocketControls() {
  const b=infoPanel.querySelector('#build-hercules'); if(b)b.addEventListener('click',buildHercules1);
  const d=infoPanel.querySelector('#rocket-destination'); if(d)d.addEventListener('change',()=>{rocketDestination=d.value;renderInfo();});
  const m=infoPanel.querySelector('#rocket-minus'); if(m)m.addEventListener('click',()=>{rocketQuantity=Math.max(1,rocketQuantity-1);renderInfo();});
  const p=infoPanel.querySelector('#rocket-plus'); if(p)p.addEventListener('click',()=>{rocketQuantity=Math.min(Math.max(1,rocketStock[state.selected] || 1),rocketQuantity+1);renderInfo();});
  const resource=infoPanel.querySelector('#rocket-cargo-resource');
  if(resource) resource.addEventListener('change',()=>{rocketCargoResource=resource.value;rocketCargoAmount=Math.min(120,getPlayerResourceAmount(rocketCargoResource,state.selected));renderInfo();});
  const range=infoPanel.querySelector('#rocket-cargo-range');
  const number=infoPanel.querySelector('#rocket-cargo-number');
  if(range && number){
    range.addEventListener('input',()=>{rocketCargoAmount=Math.max(0,Math.min(Number(range.max),Number(range.value)||0));number.value=rocketCargoAmount.toFixed(2);renderInfo();});
    number.addEventListener('input',()=>{rocketCargoAmount=Math.max(0,Math.min(Number(number.max),Number(number.value)||0));range.value=rocketCargoAmount;renderInfo();});
  }
  const l=infoPanel.querySelector('#launch-hercules'); if(l)l.addEventListener('click',()=>launchHercules1(state.selected,rocketDestination,rocketQuantity));
  infoPanel.querySelectorAll('.rocket-return').forEach(x=>x.addEventListener('click',()=>{
    const id=x.dataset.rocketId;
    const resourceEl=infoPanel.querySelector(`.rocket-return-resource[data-rocket-id="${id}"]`);
    const amountEl=infoPanel.querySelector(`.rocket-return-amount[data-rocket-id="${id}"]`);
    returnRocket(id, resourceEl?.value || null, Number(amountEl?.value) || 0);
  }));
}

function updateRockets(now) {
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    ensureRocketData(id);
    if (rocketBuildQueue[id] > 0 && now - rocketBuildStarted[id] >= 30000) {
      rocketStock[id] += rocketBuildQueue[id];
      rocketBuildQueue[id] = 0;
      rocketBuildStarted[id] = 0;
      renderInfo();
    }
  });
  for (const rocket of rockets) {
    if (rocket.status === 'returned') continue;
    if (now - rocket.started >= rocket.duration) {
      if (rocket.status === 'outbound') {
        rocket.status = 'arrived';
        rocket.arrivedAt = now;
        if (rocket.cargo && rocket.cargo.amount > 0) {
          const targetStorage = getPlanetStorage(rocket.to);
          targetStorage[rocket.cargo.resource] = Number(targetStorage[rocket.cargo.resource] || 0) + rocket.cargo.amount;
          rocket.deliveredCargo = { ...rocket.cargo };
          rocket.cargo.amount = 0;
        }
      } else if (rocket.status === 'returning') {
        rocket.status = 'returned';
        rocket.returnedAt = now;
        if (rocket.returnCargo && rocket.returnCargo.resource && rocket.returnCargo.amount > 0) {
          const targetStorage = getPlanetStorage(rocket.to);
          targetStorage[rocket.returnCargo.resource] = Number(targetStorage[rocket.returnCargo.resource] || 0) + rocket.returnCargo.amount;
        }
      }
      renderInfo();
    }
  }
}

function updateResources(now) {
  const delta = Math.min((now - state.lastUpdate) / 1000, 0.25);
  state.lastUpdate = now;

  Object.entries(bodies).forEach(([id, planet]) => {
    if (id === 'sun') return;
    const bld = getBuildingsOnPlanet(id);
    const storage = getPlanetStorage(id);
    Object.entries(buildingTypes).forEach(([key, b]) => {
      const available = Number(planet.resources[b.resource] || 0);
      const amount = Math.min(available, b.rate * bld[key] * delta);
      if (amount > 0) {
        planet.resources[b.resource] -= amount;
        storage[b.resource] = Number(storage[b.resource] || 0) + amount;
      }
    });
    if (bld.steelworks > 0 && storage.iron > 0) {
      const needed = ironUse(id) * delta;
      const used = Math.min(storage.iron, needed);
      storage.iron -= used;
      storage.steel = Number(storage.steel || 0) + steelProduction(id) * delta * (needed ? used / needed : 0);
    }
    if (bld.coalPowerPlant > 0) {
      const neededCoal = coalPowerUse(id) * delta;
      const usedCoal = Math.min(Number(storage.coal || 0), neededCoal);
      storage.coal = Number(storage.coal || 0) - usedCoal;
    }
  });

  // Das Lager der Erde ist gleichzeitig das Spieler-/Hauptlager.
  updateRockets(now);

  // Wichtig: Während des laufenden Spiels NICHT ständig renderInfo()/renderSystem()
  // aufrufen. Das würde das scrollbare Gebäudemenü jede Sekunde neu erzeugen
  // und auf dem Handy wieder nach oben springen lassen.
  if (!updateResources.lastUiUpdate || now - updateResources.lastUiUpdate >= 250) {
    updateResources.lastUiUpdate = now;
    renderTopResources();
  }

  requestAnimationFrame(updateResources);
}


// ==========================================
// MEHRSPRACHIGKEIT: Deutsch / English / Français
// ==========================================
const LANGUAGE_KEY = 'solarFrontierLanguage_v1';
const languageSelect = document.querySelector('#language-select');
const translations = {
  en: {
    'Weltraum Game':'Space Game','Sonnensystem · Rohstoffe · Aufbau · Transport':'Solar System · Resources · Development · Transport','Neuigkeiten':'News','Wirtschaft':'Economy','Spiel':'Game','Neuigkeiten & Updates':'News & Updates','Entwicklungsstand von Solar Frontier: Origins':'Development status of Solar Frontier: Origins','Aktuelle Version':'Current Version','Nächstes Update':'Next Update','Geplant':'Planned','Aktuelle Entwicklung':'Current Development','Was gerade im Spiel entsteht':'What is currently being developed','Weiterentwicklung des Sonnensystems':'Solar system development','Rohstoffabbau und Gebäude auf der Erde':'Resource extraction and buildings on Earth','Siliziummine und weitere Produktionsgebäude':'Silicon mine and additional production buildings','Raketenbau und interplanetarer Transport':'Rocket construction and interplanetary transport','Speichern und Laden des Spielstands':'Saving and loading the game','Hinweis für Spieler':'Player Notice','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'The game is actively in development. Changes and new updates may be added at any time.','Wirtschafts-Dashboard':'Economy Dashboard','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Overview of storage, production, consumption and buildings','Spielstand':'Save Game','Speichern':'Save','Laden':'Load','Neustart':'Restart','Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars','Jupiter':'Jupiter','Luna':'Moon','Stern':'Star','Planet':'Planet','Startplanet':'Starting Planet','Temperatur':'Temperature','Rohstoffe':'Resources','Lager':'Storage','Gebäude':'Buildings','Gebäude gesamt':'Total Buildings','Eisen':'Iron','Stahl':'Steel','Stein':'Stone','Kohle':'Coal','Gas':'Gas','Silizium':'Silicon','Wasser':'Water','Metalle':'Metals','Gestein':'Rock','Energie':'Energy','Eisenproduktion':'Iron Production','Eisenverbrauch':'Iron Consumption','Stahlproduktion':'Steel Production','Siliziumproduktion':'Silicon Production','Siliziumverbrauch':'Silicon Consumption','Stromproduktion':'Electricity Production','Bauen':'Build','kostenlos':'free','weitere':'additional','Steinbruch':'Stone Quarry','Kohlemine':'Coal Mine','Gasförderanlage':'Gas Plant','Eisenmine':'Iron Mine','Siliziummine':'Silicon Mine','Stahlwerk':'Steel Mill','Kohlekraftwerk':'Coal Power Plant','Raketenstation':'Rocket Station','Transportzentrale':'Transport Center','Zielplanet':'Destination Planet','Anzahl':'Amount','Fracht pro Rakete':'Cargo per Rocket','Aktive Transporte':'Active Transports','Keine abbaubaren Rohstoffe.':'No extractable resources.','Noch keine Rohstoffe abgebaut':'No resources extracted yet','Bauzeit':'Build Time','Flugzeit':'Flight Time','Rückflug':'Return Flight','Hinflug':'Outbound Flight','Gesamtkapazität':'Total Capacity','verfügbar':'available','bis Ankunft':'until arrival','Sekunden':'seconds','t Stahl':'t steel','t Eisen':'t iron','t Stein':'t stone','t Kohle':'t coal','t Gas':'t gas','t Silizium':'t silicon','Herkules 1':'Hercules 1','Keine Rückfracht':'No return cargo','zurück':'back','Starten':'Launch','Schließen':'Close'
  },
  fr: {
    'Weltraum Game':'Jeu spatial','Sonnensystem · Rohstoffe · Aufbau · Transport':'Système solaire · Ressources · Développement · Transport','Neuigkeiten':'Actualités','Wirtschaft':'Économie','Spiel':'Jeu','Neuigkeiten & Updates':'Actualités & mises à jour','Entwicklungsstand von Solar Frontier: Origins':'État du développement de Solar Frontier: Origins','Aktuelle Version':'Version actuelle','Nächstes Update':'Prochaine mise à jour','Geplant':'Prévu','Aktuelle Entwicklung':'Développement actuel','Was gerade im Spiel entsteht':'Développement en cours','Weiterentwicklung des Sonnensystems':'Développement du système solaire','Rohstoffabbau und Gebäude auf der Erde':'Extraction de ressources et bâtiments sur Terre','Siliziummine und weitere Produktionsgebäude':'Mine de silicium et autres bâtiments de production','Raketenbau und interplanetarer Transport':'Construction de fusées et transport interplanétaire','Speichern und Laden des Spielstands':'Sauvegarde et chargement de la partie','Hinweis für Spieler':'Information aux joueurs','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'Le jeu est en développement actif. Des changements et mises à jour peuvent être ajoutés à tout moment.','Wirtschafts-Dashboard':'Tableau de bord économique','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Aperçu du stockage, de la production, de la consommation et des bâtiments','Spielstand':'Sauvegarde','Speichern':'Sauvegarder','Laden':'Charger','Neustart':'Redémarrer','Sonne':'Soleil','Merkur':'Mercure','Venus':'Vénus','Erde':'Terre','Mars':'Mars','Jupiter':'Jupiter','Luna':'Lune','Stern':'Étoile','Planet':'Planète','Startplanet':'Planète de départ','Temperatur':'Température','Rohstoffe':'Ressources','Lager':'Stockage','Gebäude':'Bâtiments','Gebäude gesamt':'Bâtiments au total','Eisen':'Fer','Stahl':'Acier','Stein':'Pierre','Kohle':'Charbon','Gas':'Gaz','Silizium':'Silicium','Wasser':'Eau','Metalle':'Métaux','Gestein':'Roche','Energie':'Énergie','Eisenproduktion':'Production de fer','Eisenverbrauch':'Consommation de fer','Stahlproduktion':'Production d’acier','Siliziumproduktion':'Production de silicium','Siliziumverbrauch':'Consommation de silicium','Stromproduktion':'Production d’électricité','Bauen':'Construire','kostenlos':'gratuit','weitere':'supplémentaire','Steinbruch':'Carrière de pierre','Kohlemine':'Mine de charbon','Gasförderanlage':'Installation de gaz','Eisenmine':'Mine de fer','Siliziummine':'Mine de silicium','Stahlwerk':'Aciérie','Kohlekraftwerk':'Centrale à charbon','Raketenstation':'Station de fusées','Transportzentrale':'Centre de transport','Zielplanet':'Planète destination','Anzahl':'Quantité','Fracht pro Rakete':'Fret par fusée','Aktive Transporte':'Transports actifs','Keine abbaubaren Rohstoffe.':'Aucune ressource exploitable.','Noch keine Rohstoffe abgebaut':'Aucune ressource extraite','Bauzeit':'Temps de construction','Flugzeit':'Temps de vol','Rückflug':'Vol retour','Hinflug':'Vol aller','Gesamtkapazität':'Capacité totale','verfügbar':'disponible','bis Ankunft':'avant l’arrivée','Sekunden':'secondes','t Stahl':'t acier','t Eisen':'t fer','t Stein':'t pierre','t Kohle':'t charbon','t Gas':'t gaz','t Silizium':'t silicium','Herkules 1':'Hercules 1','Keine Rückfracht':'Aucun fret retour','zurück':'retour','Starten':'Lancer','Schließen':'Fermer'
  }
};
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
    let value = textNode.nodeValue;
    if (!value || !value.trim()) return;

    const leading = value.match(/^\s*/)?.[0] || '';
    const trailing = value.match(/\s*$/)?.[0] || '';
    const core = value.trim();

    // Exact match first. This is important for labels such as
    // "Temperatur" -> "Temperature" and prevents repeated additions.
    if (Object.prototype.hasOwnProperty.call(map, core)) {
      textNode.nodeValue = leading + map[core] + trailing;
      return;
    }

    // Replace only complete German words/phrases.
    // This prevents "Temperatur" from matching inside English "Temperature".
    let translated = core;
    const placeholders = [];
    entries.forEach(([source, target], index) => {
      const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const token = `\\uE000${index}\\uE001`;
      const re = new RegExp(`(^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'gu');
      if (!re.test(translated)) return;
      re.lastIndex = 0;
      placeholders.push([token, target]);
      translated = translated.replace(re, `$1${token}`);
    });
    placeholders.forEach(([token, target]) => {
      translated = translated.split(token).join(target);
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

setupSaveMenu();
loadGame(false);
renderSystem();
renderInfo();
renderTopResources();
const solarViewport = document.querySelector('#solar-system-viewport');
if (solarViewport) {
  requestAnimationFrame(() => {
    solarViewport.scrollLeft = Math.max(0, (solarSystem.offsetWidth - solarViewport.clientWidth) / 2);
    solarViewport.scrollTop = Math.max(0, (solarSystem.offsetHeight - solarViewport.clientHeight) / 2);
  });
}
requestAnimationFrame(updateResources);
