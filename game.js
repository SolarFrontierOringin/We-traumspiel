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
  crudeOil: 0,
  iron: 0,
  steel: 0,
  batteries: 0,
  buildingMaterials: 0,
  uranium: 0,
  processedUranium: 0,
  nuclearFuel: 0,
  chips: 0,
  concrete: 0,
  buildings: {
    steelworks: 0,
    stoneQuarry: 0,
    buildingMaterialsFactory: 0,
    coalMine: 0,
    gasPlant: 0,
    ironMine: 0,
    lithiumMine: 0,
    copperMine: 0,
    copperSmelter: 0,
    lithiumRefinery: 0,
    machineFactory: 0,
    glassFactory: 0,
    heliumExtractor: 0,
    fusionReactor: 0,
    outpost: 0,
    rocketStation: 0,
    coalPowerPlant: 0,
    researchLab: 0,
    moonBase: 0,
    crudeOilPump: 0,
    uraniumMine: 0,
    uraniumProcessingPlant: 0,
    nuclearFuelPlant: 0,
    nuclearReactor: 0,
    chipFactory: 0,
    solarSail: 0
  },
  lastUpdate: performance.now(),
  buildMenuOpen: false,
  research: {
    points: 0,
    active: null,
    completed: {}
  },
  tasks: {
    completed: {},
    ironMined: 0,
    steelProduced: 0
  }
};

const buildingTypes = {
  stoneQuarry: { name: 'Steinbruch', icon: '🪨', resource: 'stone', rate: 0.1, cost: 30, text: '0,1 t Stein/s pro Gebäude' },
  buildingMaterialsFactory: { name: 'Baustofffabrik', icon: '🧱', resource: null, rate: 0, cost: 40, text: 'verbraucht 0,20 t Stein/s · produziert 0,15 t Baustoffe/s' },
  coalMine: { name: 'Kohlemine', icon: '⛏️', resource: 'coal', rate: 0.5, cost: 15, text: '0,5 t Kohle/s' },
  gasPlant: { name: 'Gasförderanlage', icon: '🔥', resource: 'gas', rate: 0.25, cost: 25, text: '0,25 t Gas/s' },
  ironMine: { name: 'Eisenmine', icon: '🧲', resource: 'iron', rate: 0.1, cost: 20, text: '0,1 t Eisen/s' },
  siliconMine: { name: 'Siliziummine', icon: '🔷', resource: 'silicon', rate: 0.3, cost: 30, text: '0,3 t Silizium/s' },
  lithiumMine: { name: 'Lithiummine', icon: '🔋', resource: 'lithium', rate: 0.05, cost: 30, text: '0,05 t Lithium/s pro Gebäude' },
  copperMine: { name: 'Kupfermine', icon: '🟠', resource: 'copperOre', rate: 0.05, cost: 30, text: '0,05 t Kupfererz/s pro Gebäude' },
  copperSmelter: { name: 'Kupferschmelze', icon: '🔥', resource: null, rate: 0, cost: 50, text: 'verbraucht 0,10 t Kupfererz/s · produziert 0,08 t Kupfer/s' },
  lithiumRefinery: { name: 'Lithiumraffinerie', icon: '🔋', resource: null, rate: 0, cost: 80, text: 'verbraucht 0,3 t Lithium/s + 0,3 t Kupfer/s · produziert 0,1 t Batterien/s' },
  machineFactory: { name: 'Maschinenfabrik', icon: '⚙️', resource: null, rate: 0, cost: 100, text: 'verbraucht 0,10 t Stahl/s + 0,05 t Kupfer/s · produziert 0,05 t Maschinen/s' },
  glassFactory: { name: 'Glasfabrik', icon: '🪟', resource: null, rate: 0, cost: 60, text: 'verbraucht 0,20 t Silizium/s + 0,10 t Stein/s · produziert 0,15 t Glas/s' },
  heliumExtractor: { name: 'Helium-Extraktor', icon: '🧪', resource: 'helium3', rate: 0.1, cost: 120, text: '0,1 t Helium-3/s · nur auf Luna, Venus und Jupiter' },
  fusionReactor: { name: 'Fusionsreaktor', icon: '⚛️', resource: null, rate: 0, cost: 250, text: 'verbraucht 0,02 t Helium-3/s · produziert 50 MW Strom/s' },
  researchLab: { name: 'Forschungslabor', icon: '🔬', resource: null, rate: 0, cost: 0, text: 'nur auf der Erde · benötigt Baustoffe, Glas und Elektronik' },
  moonBase: { name: 'Mondbasis', icon: '🌙', resource: null, rate: 0, cost: 300, text: '300 t Stahl · 100 t Baustoffe · Forschung erforderlich' },
  solarPlant: { name: 'Solaranlage', icon: '☀️', resource: null, rate: 0, cost: 30, text: '20 MW Strom/s · 30 t Stahl · 10 t Baustoffe · 20 t Elektronik · Forschung erforderlich' },
  crudeOilPump: { name: 'Rohölpumpe', icon: '🛢️', resource: 'crudeOil', rate: 0.01, cost: 0, text: '0,01 Liter Rohöl/s · verbraucht 2 MW/s · nur auf der Erde' },
  uraniumMine: { name: 'Uranmine', icon: '☢️', resource: 'uranium', rate: 0.01, cost: 300, text: '0,01 t Uran/s · 300 t Stahl · 200 t Baustoffe' },
  uraniumProcessingPlant: { name: 'Uranaufbereitungsanlage', icon: '⚗️', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,02 t Uran/s · produziert 0,015 t aufbereitetes Uran/s · 500 t Stahl · 300 t Baustoffe' },
  nuclearFuelPlant: { name: 'Kernbrennstoffanlage', icon: '☢️', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,01 t aufbereitetes Uran/s · produziert 0,008 t Kernbrennstoff/s · 1.000 t Stahl · 600 t Baustoffe · 100 t Elektronik' },
  nuclearReactor: { name: 'Kernreaktor', icon: '☢️', resource: null, rate: 0, cost: 5000, text: 'verbraucht 0,01 t Kernbrennstoff/s · erzeugt 1.000 MW Strom/s · 5.000 t Stahl · 7.000 t Baustoffe · 2.000 t Elektronik' },
  chipFactory: { name: 'Chipfabrik', icon: '💾', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,1 t Lithium/s + 0,3 t Kupfer/s · produziert 0,015 t Chips/s · 1.000 t Beton · 2.000 t Baustoffe · 600 t Elektronik' },
  solarSail: { name: 'Sonnensegel', icon: '☀️', resource: null, rate: 0, cost: 5000, text: 'senkt die Temperatur von Merkur/Venus um 10 °C · 5.000 t Stahl · 10.000 t Baustoffe · 5.000 t Glas · 2.000 t Chips · 1.000 t Elektronik' }
};

const rocketTypes = {
  hercules1: { name: 'Herkules 1', icon: '🚀', cost: 45, capacity: 120 },
  hercules2: { name: 'Herkules 2', icon: '🚀', costSteel: 300, costBatteries: 50, capacity: 300, compartments: 3 }
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
const rocketStock2 = {};
const rocketBuildQueue2 = {};
const rocketBuildStarted2 = {};
const outpostBuildQueue = {};
const outpostBuildStarted = {};
let rocketQuantity = 1;
let rocketCargoResource = 'stone';
let rocketCargoAmount = 0;
let rocketDestination = 'mars';
let rocketCargoSlots = [
  { resource: 'stone', amount: 0 },
  { resource: 'iron', amount: 0 },
  { resource: 'steel', amount: 0 }
];
let planetResourcesOpen = false;

const bodies = {
  sun: { name: 'Sonne', type: 'Stern', className: 'sun', temperature: 'ca. 5.500 °C Oberfläche', resources: {}, storage: {}, orbit: 0 },
  mercury: { name: 'Merkur', type: 'Planet', className: 'mercury', temperature: '430 °C', resources: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000 }, storage: {}, orbit: 150 },
  venus: { name: 'Venus', type: 'Planet', className: 'venus', temperature: '490 °C', resources: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000 }, storage: {}, orbit: 235 },
  earth: { name: 'Erde', type: 'Startplanet', className: 'earth', temperature: 'ca. 15 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000, iron: 2000000, lithium: 30000, crudeOil: 6000000, copperOre: 30000, uranium: 1000000 }, storage: null, orbit: 320 },
  luna: { name: 'Luna', type: 'Mond der Erde', className: 'luna', temperature: 'ca. -20 °C Durchschnitt', resources: { stone: 3000000, iron: 2000000, silicon: 4000000, lithium: 6000000, helium3: 10000000, uranium: 3000000 }, storage: {}, orbit: 0, moonOf: 'earth', moonOrbit: 55 },
  mars: { name: 'Mars', type: 'Planet', className: 'mars', temperature: 'ca. -63 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000, uranium: 10000000 }, storage: {}, orbit: 405 },
  jupiter: { name: 'Jupiter', type: 'Gasplanet', className: 'jupiter', temperature: 'ca. -110 °C Wolkenobergrenze', resources: { hydrogen: 100000, helium: 50000, helium3: 40000000 }, storage: {}, orbit: 515 }
};

const resourceNames = { concrete: 'Beton', stone: 'Stein', coal: 'Kohle', gas: 'Gas', iron: 'Eisen', silicon: 'Silizium', lithium: 'Lithium', copperOre: 'Kupfererz', copper: 'Kupfer', batteries: 'Batterien', buildingMaterials: 'Baustoffe', machines: 'Maschinen', glass: 'Glas', electronics: 'Elektronik', steel: 'Stahl', hydrogen: 'Wasserstoff', helium: 'Helium', helium3: 'Helium-3', crudeOil: 'Rohöl', uranium: 'Uran', processedUranium: 'Aufbereitetes Uran', nuclearFuel: 'Kernbrennstoff' };
const resourceIcons = { concrete: '🏗️', stone: '🪨', coal: '⚫', gas: '🔥', iron: '🧲', silicon: '🔷', lithium: '🔋', copperOre: '🟠', copper: '🟤', batteries: '🔋', buildingMaterials: '🧱', machines: '⚙️', glass: '🪟', electronics: '💻', steel: '🔩', hydrogen: '💨', helium: '💨', helium3: '🧪', crudeOil: '🛢️', uranium: '☢️', processedUranium: '🧪', nuclearFuel: '⚛️' };

function formatTons(value) { return `${value.toFixed(2)} t`; }

function getBuildingsOnPlanet(id) {
  if (id === 'earth') return state.buildings;
  if (!bodies[id].buildings) {
    bodies[id].buildings = { steelworks: 0, stoneQuarry: 0, buildingMaterialsFactory: 0, coalMine: 0, gasPlant: 0, ironMine: 0, siliconMine: 0, lithiumMine: 0, copperMine: 0, copperSmelter: 0, lithiumRefinery: 0, machineFactory: 0, glassFactory: 0, heliumExtractor: 0, fusionReactor: 0, outpost: 0, rocketStation: 0, coalPowerPlant: 0, solarPlant: 0, researchLab: 0, moonBase: 0, crudeOilPump: 0, uraniumMine: 0, uraniumProcessingPlant: 0, nuclearFuelPlant: 0, nuclearReactor: 0, chipFactory: 0, solarSail: 0 }
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
  const keys = ['stone','coal','gas','crudeOil','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','steel','hydrogen','helium','helium3','uranium','processedUranium','nuclearFuel','chips','concrete'];
  const rows = keys.filter(k => Number(st[k] || 0) > 0.000001).map(k => `<div class="stat"><span>${resourceIcons[k] || ''} ${resourceNames[k] || k}</span><strong>${formatTons(st[k])}</strong></div>`);
  return rows.length ? rows.join('') : '<p class="hint">Lager ist leer.</p>';
}

function ironProduction(id = state.selected) { return getBuildingsOnPlanet(id).ironMine * 0.1; }
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
function electricityProduction(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 20 + fusionElectricityProduction(id) + solarElectricityProduction(id) + nuclearReactorElectricityProduction(id); }
function coalPowerUse(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 0.0002; }
function crudeOilProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 0.01; }
function crudeOilElectricityUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 2; }
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

function mercuryTemperature() { return Math.max(50, 430 - Number(getBuildingsOnPlanet('mercury').solarSail || 0) * 10); }
function venusTemperature() { return Math.max(50, 490 - Number(getBuildingsOnPlanet('venus').solarSail || 0) * 10); }

function totalBuildingsOnPlanet(id) { return Object.values(getBuildingsOnPlanet(id)).reduce((a, b) => a + b, 0); }


const researchTypes = {
  solarPlant: {
    name: 'Solaranlage',
    icon: '☀️',
    category: 'Industrielle Grundlagen',
    cost: 100,
    time: 120,
    text: 'Schaltet die Solaranlage frei. Die Solaranlage bleibt im Baumenü sichtbar, bis diese Forschung abgeschlossen ist.'
  },
  moonBase: {
    name: 'Mondbasis', icon: '🌙', category: 'Industrielle Grundlagen', cost: 1200, time: 300,
    text: 'Schaltet die Mondbasis frei. Die Mondbasis kann auf allen Planeten gebaut werden.'
  },
  fusionReactor: {
    name: 'Fusionsreaktor', icon: '⚛️', category: 'Fortschrittliche Forschung', cost: 6000, time: 600,
    text: 'Schaltet den Fusionsreaktor frei. Der Fusionsreaktor bleibt im Baumenü sichtbar, ist aber bis zum Abschluss dieser Forschung gesperrt.'
  },
  nuclearReactor: {
    name: 'Kernreaktor', icon: '☢️', category: 'Fortschrittliche Forschung', cost: 10000, time: 600,
    text: 'Schaltet den Kernreaktor frei. Der Kernreaktor kann auf allen Planeten außer der Sonne gebaut werden.'
  }
};

const taskTypes = {
  intro_iron_mine: {
    name: 'Baue eine Eisenmine',
    description: 'Baue deine erste Eisenmine.',
    target: 1,
    unit: 'Gebäude',
    reward: 5,
    getProgress: () => totalIronMinesBuilt()
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
  return !!state.tasks?.completed?.[key] || taskProgress(key) >= taskTypes[key].target;
}
function updateTasks() {
  if (!state.tasks) state.tasks = { completed: {}, ironMined: 0, steelProduced: 0 };
  state.tasks.completed = state.tasks.completed || {};
  let changed = false;
  Object.keys(taskTypes).forEach(key => {
    if (!state.tasks.completed[key] && taskProgress(key) >= taskTypes[key].target) {
      state.tasks.completed[key] = true;
      if (taskTypes[key].reward) state.research.points = Number(state.research.points || 0) + taskTypes[key].reward;
      changed = true;
    }
  });
  return changed;
}
function renderTasks() {
  const panel = document.querySelector('#tasks-content');
  if (!panel) return;
  updateTasks();
  const keys = Object.keys(taskTypes);
  const completedCount = keys.filter(taskIsComplete).length;
  panel.innerHTML = `
    <div class="stat"><span>🎯 Einführung</span><strong>${completedCount} / ${keys.length}</strong></div>
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
          <div class="task-progress-text"><span>Fortschritt</span><strong>${displayProgress} / ${target} ${t.unit}</strong></div>
          <div class="task-progress"><i style="width:${Math.min(100, progress / t.target * 100)}%"></i></div>
        </div>`;
      }).join('')}
    </div>`;
}
function taskProgressUpdate() {
  const changed = updateTasks();
  const panel = document.querySelector('#tasks-panel');
  if (panel && !panel.hidden) renderTasks();
  if (changed) saveGame(false);
}

function researchLabCount() { return Number(getBuildingsOnPlanet('earth').researchLab || 0); }
function researchPointProduction() { return researchLabCount() * 1; }
function researchAvailable() { return researchLabCount() > 0; }

function formatResearchTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function renderResearch() {
  const panel = document.querySelector('#research-content');
  if (!panel) return;
  const completed = state.research?.completed || {};
  const active = state.research?.active;
  const activeDef = active ? researchTypes[active.key] : null;
  const running = !!active;
  const researchedSolar = !!completed.solarPlant;
  const researchedFusion = !!completed.fusionReactor;
  const researchedNuclear = !!completed.nuclearReactor;
  const enoughSolarPoints = Number(state.research.points || 0) >= researchTypes.solarPlant.cost;
  const enoughFusionPoints = Number(state.research.points || 0) >= researchTypes.fusionReactor.cost;
  const enoughNuclearPoints = Number(state.research.points || 0) >= researchTypes.nuclearReactor.cost;
  const canResearchSolar = researchAvailable() && !running && !researchedSolar && enoughSolarPoints;
  const canResearchFusion = researchAvailable() && !running && !researchedFusion && enoughFusionPoints;
  const canResearchNuclear = researchAvailable() && !running && !researchedNuclear && enoughNuclearPoints;
  const remaining = active && activeDef
    ? Math.max(0, activeDef.time - (performance.now() - active.started) / 1000)
    : 0;
  const progress = active && activeDef
    ? Math.min(100, ((performance.now() - active.started) / (activeDef.time * 1000)) * 100)
    : 0;

  panel.innerHTML = `<div class="research-overview">
    <div class="stat"><span>🔬 Forschungslabor auf Erde</span><strong>${researchLabCount()}</strong></div>
    <div class="stat"><span>🧪 Forschungspunkte</span><strong>${Number(state.research.points || 0).toFixed(0)}</strong></div>
    <div class="stat"><span>📈 Forschungspunktproduktion</span><strong>${researchPointProduction().toFixed(2)} /s</strong></div>
  </div>
  ${active && activeDef ? `<div class="research-active"><strong>${activeDef.icon} ${activeDef.name}</strong><small>${formatResearchTime(remaining)} verbleiben</small><div class="research-progress"><i style="width:${progress}%"></i></div></div>` : ''}

  <h3>1️⃣ Industrielle Grundlagen</h3>
  <div class="research-tree">
    <div class="research-card ${researchedSolar ? 'research-done' : ''}">
      <div>
        <strong>☀️ Forschung: Solaranlage</strong>
        <small>Schaltet die Solaranlage frei.</small>
        <small>🧪 100 Forschungspunkte · ⏱️ 2:00 Minuten</small>
        <small>Die Solaranlage ist bereits im Baumenü sichtbar, solange die Forschung noch benötigt wird.</small>
      </div>
      <button class="research-button" data-research="solarPlant" ${canResearchSolar ? '' : 'disabled'}>${researchedSolar ? 'Abgeschlossen' : active?.key === 'solarPlant' ? 'Läuft …' : 'Forschen'}</button>
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

  <h3>2️⃣ Raketentechnik</h3>
  <div class="research-empty"><p class="hint">Aktuell leer – weitere Forschungen werden später ergänzt.</p></div>

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
  </div>`;

  panel.querySelectorAll('.research-button').forEach(btn =>
    btn.addEventListener('click', () => startResearch(btn.dataset.research))
  );
}

function startResearch(key) {
  if (!researchAvailable() || !researchTypes[key] || state.research.active || state.research.completed[key]) return;
  const r = researchTypes[key];
  if (Number(state.research.points || 0) < r.cost) return;
  state.research.points -= r.cost;
  state.research.active = { key, started: performance.now() };
  renderResearch();
  saveGame(false);
}

function updateResearch(now) {
  if (!state.research?.active) return;
  const active = state.research.active;
  const r = researchTypes[active.key];
  if (!r) { state.research.active = null; return; }
  if (now - active.started >= r.time * 1000) {
    state.research.completed[active.key] = true;
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
    version: 1,
    state: {
      selected: state.selected,
      stone: state.stone,
      coal: state.coal,
      gas: state.gas,
      crudeOil: state.crudeOil,
      iron: state.iron,
      steel: state.steel,
      batteries: state.batteries,
      uranium: state.uranium,
      processedUranium: state.processedUranium,
      nuclearFuel: state.nuclearFuel,
      chips: state.chips,
      concrete: state.concrete,
      buildings: state.buildings,
      buildMenuOpen: false,
      research: state.research,
      tasks: state.tasks
    },
    bodies,
    rockets,
    rocketBuildQueue,
    rocketBuildStarted,
    rocketStock,
    rocketStock2,
    rocketBuildQueue2,
    rocketBuildStarted2,
    outpostBuildQueue,
    outpostBuildStarted,
    rocketQuantity,
    rocketCargoResource,
    rocketCargoAmount,
    rocketCargoSlots,
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
    state.batteries = Number(data.state.batteries || 0);
    state.research = data.state.research || { points: 0, active: null, completed: {} };
    state.research.completed = state.research.completed || {};
    state.tasks = data.state.tasks || { completed: {}, ironMined: 0, steelProduced: 0 };
    state.tasks.completed = state.tasks.completed || {};
    state.tasks.ironMined = Number(state.tasks.ironMined || 0);
    state.tasks.steelProduced = Number(state.tasks.steelProduced || 0);
    state.lastUpdate = performance.now();
    Object.assign(bodies, data.bodies);
    // Neue Rohstoffvorkommen aus späteren Spielversionen auch in alten Spielständen ergänzen.
    const defaultResources = {
      mercury: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000 },
      earth: { lithium: 30000, copperOre: 30000, crudeOil: 6000000, uranium: 1000000 },
      luna: { stone: 3000000, lithium: 6000000, helium3: 10000000, uranium: 3000000 },
      venus: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000 },
      jupiter: { helium3: 40000000 },
      mars: { uranium: 10000000 }
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
    // Alte Venus-Vorkommen aus früheren Versionen entfernen.
    if (bodies.venus?.resources) {
      delete bodies.venus.resources.coal;
      delete bodies.venus.resources.gas;
    }
    state.buildings.lithiumMine = Number(state.buildings.lithiumMine || 0);
    state.buildings.copperMine = Number(state.buildings.copperMine || 0);
    state.buildings.copperSmelter = Number(state.buildings.copperSmelter || 0);
    state.buildings.lithiumRefinery = Number(state.buildings.lithiumRefinery || 0);
    state.buildings.machineFactory = Number(state.buildings.machineFactory || 0);
    state.buildings.glassFactory = Number(state.buildings.glassFactory || 0);
    state.buildings.heliumExtractor = Number(state.buildings.heliumExtractor || 0);
    state.buildings.fusionReactor = Number(state.buildings.fusionReactor || 0);
    state.buildings.researchLab = Number(state.buildings.researchLab || 0);
    state.buildings.solarPlant = Number(state.buildings.solarPlant || 0);
    state.buildings.outpost = Number(state.buildings.outpost || 0);
    state.buildings.moonBase = Number(state.buildings.moonBase || 0);
    state.buildings.crudeOilPump = Number(state.buildings.crudeOilPump || 0);
    state.buildings.uraniumMine = Number(state.buildings.uraniumMine || 0);
    state.buildings.uraniumProcessingPlant = Number(state.buildings.uraniumProcessingPlant || 0);
    state.buildings.nuclearFuelPlant = Number(state.buildings.nuclearFuelPlant || 0);
    state.buildings.nuclearReactor = Number(state.buildings.nuclearReactor || 0);
    state.buildings.chipFactory = Number(state.buildings.chipFactory || 0);
    state.buildings.solarSail = Number(state.buildings.solarSail || 0);
    state.processedUranium = Number(state.processedUranium || 0);
    state.nuclearFuel = Number(state.nuclearFuel || 0);
    state.chips = Number(state.chips || 0);
    state.concrete = Number(state.concrete || 0);
    state.buildingMaterials = Number(state.buildingMaterials || 0);
    Object.values(bodies).forEach(body => {
      if (!body.buildings) return;
      body.buildings.lithiumMine = Number(body.buildings.lithiumMine || 0);
      body.buildings.copperMine = Number(body.buildings.copperMine || 0);
      body.buildings.copperSmelter = Number(body.buildings.copperSmelter || 0);
      body.buildings.lithiumRefinery = Number(body.buildings.lithiumRefinery || 0);
      body.buildings.machineFactory = Number(body.buildings.machineFactory || 0);
       body.buildings.glassFactory = Number(body.buildings.glassFactory || 0);
       body.buildings.heliumExtractor = Number(body.buildings.heliumExtractor || 0);
       body.buildings.fusionReactor = Number(body.buildings.fusionReactor || 0);
       body.buildings.researchLab = Number(body.buildings.researchLab || 0);
       body.buildings.solarPlant = Number(body.buildings.solarPlant || 0);
       body.buildings.outpost = Number(body.buildings.outpost || 0);
       body.buildings.moonBase = Number(body.buildings.moonBase || 0);
       body.buildings.crudeOilPump = Number(body.buildings.crudeOilPump || 0);
       body.buildings.uraniumMine = Number(body.buildings.uraniumMine || 0);
       body.buildings.uraniumProcessingPlant = Number(body.buildings.uraniumProcessingPlant || 0);
       body.buildings.nuclearFuelPlant = Number(body.buildings.nuclearFuelPlant || 0);
       body.buildings.nuclearReactor = Number(body.buildings.nuclearReactor || 0);
       body.buildings.chipFactory = Number(body.buildings.chipFactory || 0);
       body.buildings.solarSail = Number(body.buildings.solarSail || 0);
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
    Object.keys(outpostBuildQueue).forEach(k => delete outpostBuildQueue[k]);
    Object.assign(outpostBuildQueue, data.outpostBuildQueue || {});
    Object.keys(outpostBuildStarted).forEach(k => delete outpostBuildStarted[k]);
    Object.assign(outpostBuildStarted, data.outpostBuildStarted || {});
    rocketQuantity = Number(data.rocketQuantity) || 1;
    rocketCargoResource = data.rocketCargoResource || 'stone';
    rocketCargoAmount = Number(data.rocketCargoAmount) || 0;
    rocketCargoSlots = Array.isArray(data.rocketCargoSlots) && data.rocketCargoSlots.length
      ? data.rocketCargoSlots.slice(0, 3).map(s => ({ resource: s.resource || 'stone', amount: Number(s.amount) || 0 }))
      : [{ resource: 'stone', amount: 0 }, { resource: 'iron', amount: 0 }, { resource: 'steel', amount: 0 }];
    while (rocketCargoSlots.length < 3) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
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
      <div class="build-card steelworks-card"><div><strong>🏭 Stahlwerk</strong><small>0,2 t Stahl/s · verbraucht 0,2 t Eisen/s · erstes kostenlos · weitere 20 t Stahl</small></div><button class="build-resource" id="build-steelworks-floating" ${(getBuildingsOnPlanet(state.selected).steelworks === 0 || getPlanetStorage(state.selected).steel >= 20) ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).steelworks})</button></div>
      ${buildButton('stoneQuarry')}
      ${buildButton('buildingMaterialsFactory')}
      ${buildButton('coalMine')}
      ${buildButton('gasPlant')}
      ${buildButton('ironMine')}
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
      ${buildButton('moonBase')}
      ${buildButton('crudeOilPump')}
      ${buildButton('uraniumMine')}
      ${buildButton('uraniumProcessingPlant')}
      ${buildButton('nuclearFuelPlant')}
      ${buildButton('nuclearReactor')}
      ${buildButton('chipFactory')}
      ${buildButton('solarSail')}
      ${state.selected === 'earth' ? `<div class="build-card research-lab-card"><div><strong>🔬 Forschungslabor</strong><small>Nur auf der Erde · benötigt Baustoffe, Glas und Elektronik · Kostenmengen werden noch festgelegt</small></div><button class="build-resource" id="build-research-lab" ${getBuildingsOnPlanet('earth').researchLab ? 'disabled' : ''}>${getBuildingsOnPlanet('earth').researchLab ? 'Gebaut' : 'Bauen'}</button></div>` : ''}
      <div class="build-card"><div><strong>⚡ Kohlekraftwerk</strong><small>20 MW Strom/s · verbraucht 0,0002 t Kohle/s · 90 t Stahl</small></div><button class="build-resource" id="build-coal-power" ${Number(getPlanetStorage(state.selected).steel || 0) >= 90 ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).coalPowerPlant})</button></div>
      <div class="build-card outpost-card"><div><strong>🛰️ Außenposten</strong><small>100 t Stahl · 60 Sekunden Bauzeit · maximal 1 pro Planet · Voraussetzung für weitere Gebäude auf allen Außenplaneten</small></div><button class="build-resource" id="build-outpost" ${getBuildingsOnPlanet(state.selected).outpost || outpostBuildQueue[state.selected] || (state.selected !== 'luna' && getBuildingsOnPlanet(state.selected).rocketStation === 0) || Number(getPlanetStorage(state.selected).steel || 0) < 100 ? 'disabled' : ''}>Bauen (${getBuildingsOnPlanet(state.selected).outpost ? 'Gebaut' : 'Bauen'})</button></div>
      <div class="build-card rocket-station-card"><div><strong>🚀 Raketenstation</strong><small>Startet Herkules-1-Raketen · Rakete kostet 45 t Stahl</small></div><button class="build-resource" id="build-rocket-station" ${getBuildingsOnPlanet(state.selected).rocketStation || !isBuildingAllowed('rocketStation', state.selected) ? 'disabled' : ''}>${getBuildingsOnPlanet(state.selected).rocketStation ? 'Gebaut' : 'Bauen'}</button></div>`;

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
    const researchLabBtn = menu.querySelector('#build-research-lab');
    if (researchLabBtn) researchLabBtn.addEventListener('click', buildResearchLab);
    menu.querySelector('#build-outpost').addEventListener('click', buildOutpost);
  }
  applyLanguage();
}

function renderTopResources() {
  // Diese Funktion wird während des Spiels regelmäßig aufgerufen.
  // Deshalb darf der Klick auf "Rohstofflager anzeigen" nicht durch
  // einen kompletten DOM-Neuaufbau verloren gehen.
  const planetRows = Object.entries(bodies)
    .filter(([id]) => id !== 'sun')
    .map(([id, body]) => {
      const storage = getPlanetStorage(id);
      // Das Erd-Lager ist gleichzeitig `state`. Daher nur echte Rohstoffe
      // anzeigen und interne Spielvariablen wie lastUpdate/buildMenuOpen ausblenden.
      const resourceKeys = [
        'stone','coal','gas','crudeOil','iron','steel','silicon','lithium',
        'copperOre','copper','batteries','buildingMaterials','machines',
        'glass','electronics','hydrogen','helium','helium3','uranium','processedUranium','nuclearFuel'
      ];
      const entries = resourceKeys
        .filter(key => Number(storage[key] || 0) > 0.000001)
        .map(key => {
          const amount = storage[key];
          const isOil = key === 'crudeOil';
          const value = isOil
            ? Number(amount).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L'
            : formatTons(Number(amount));
          return `<span class="planet-resource-value">${resourceIcons[key] || ''} ${resourceNames[key] || key}: <strong>${value}</strong></span>`;
        }).join('');

      if (!entries) return '';

      return `<div class="planet-resource-line">
        <strong class="planet-resource-name">🪐 ${body.name}</strong>
        <div class="planet-resource-values">${entries}</div>
      </div>`;
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
    table.innerHTML = planetRows ||
      '<p class="hint">Aktuell befinden sich keine Rohstoffe in Planetlagern.</p>';
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

function resourceRows(body) {
  const entries = Object.entries(body.resources);
  if (!entries.length) return '<p class="hint">Keine abbaubaren Rohstoffe.</p>';
  return entries.map(([key, amount]) => `<div class="stat"><span>${resourceIcons[key] || ''} ${resourceNames[key] || key}</span><strong>${key === 'crudeOil' ? amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L' : amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' t'}</strong></div>`).join('');
}

function buildingCost(key, planetId = state.selected) {
  const b = buildingTypes[key];
  const count = getBuildingsOnPlanet(planetId)[key];
  // Nur die erste Eisenmine ist kostenlos. Jede weitere kostet 20 t Stahl.
  if (key === 'ironMine' && planetId === 'earth' && count === 0) return 0;
  return b.cost;
}

function isBuildingAllowed(key, planetId = state.selected) {
  // Merkur und Venus bleiben bis 50 °C vollständig gesperrt; nur Sonnensegel sind vorher erlaubt.
  if (planetId === 'mercury' && mercuryTemperature() > 50 && key !== 'solarSail') return false;
  if (planetId === 'venus' && venusTemperature() > 50 && key !== 'solarSail') return false;
  // Sonnensegel gibt es auf Merkur und Venus.
  if (key === 'solarSail' && !['mercury','venus'].includes(planetId)) return false;
  // Die Mondbasis darf auf allen Planeten außer Sonne und Erde gebaut werden.
  if (key === 'moonBase' && ['sun', 'earth'].includes(planetId)) return false;
  if (planetId === 'sun') return false;
  if (key !== 'nuclearReactor' && planetId !== 'earth' && key !== 'outpost' && Number(getBuildingsOnPlanet(planetId).outpost || 0) < 1) return false;
  if (key === 'heliumExtractor' && !['luna','venus','jupiter'].includes(planetId)) return false;
   if (key === 'crudeOilPump' && planetId !== 'earth') return false;
  if ((key === 'uraniumMine' || key === 'uraniumProcessingPlant') && !['earth','luna','mars','mercury'].includes(planetId)) return false;
  if (key === 'uraniumProcessingPlant' && Number(bodies[planetId]?.resources?.uranium || 0) <= 0 && Number(getPlanetStorage(planetId).uranium || 0) <= 0) return false;
  return true;
}

function buildButton(key) {
  const b = buildingTypes[key];
  const count = getBuildingsOnPlanet(state.selected)[key];
  const storage = getPlanetStorage(state.selected);

  if (key === 'crudeOilPump') {
    const affordable = isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · kostenlos (vorerst)</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'uraniumMine') {
    const affordable = Number(storage.steel || 0) >= 300 && Number(storage.buildingMaterials || 0) >= 200 && isBuildingAllowed(key);
    const allowedText = isBuildingAllowed(key) ? '' : ' · nur Erde/Luna/Mars/Merkur';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${allowedText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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

  if (key === 'chipFactory') {
    const affordable = Number(storage.concrete || 0) >= 1000 &&
      Number(storage.buildingMaterials || 0) >= 2000 &&
      Number(storage.electronics || 0) >= 600 &&
      isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'solarSail') {
    const count = getBuildingsOnPlanet('mercury').solarSail;
    const temperature = mercuryTemperature();
    const affordable = Number(storage.steel || 0) >= 5000 &&
      Number(storage.buildingMaterials || 0) >= 10000 &&
      Number(storage.glass || 0) >= 5000 &&
      Number(storage.chips || 0) >= 2000 &&
      Number(storage.electronics || 0) >= 1000 &&
      isBuildingAllowed(key);
    const limitText = temperature <= 50 ? ' · Merkur hat bereits 50 °C erreicht' : ` · Merkur danach: ${Math.max(50, temperature - 10)} °C`;
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · aktueller Wert: ${temperature.toFixed(0)} °C${limitText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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

  if (key === 'moonBase') {
    const researched = !!state.research?.completed?.moonBase;
    const affordable = Number(storage.steel || 0) >= 300 && Number(storage.buildingMaterials || 0) >= 100 && isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Mondbasis“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (key === 'fusionReactor') {
    const researched = !!state.research?.completed?.fusionReactor;
    const affordable = Number(storage.steel || 0) >= b.cost && isBuildingAllowed(key) && researched;
    const status = researched ? '' : ' · Voraussetzung: Forschung „Fusionsreaktor“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${b.cost} t Stahl${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  const cost = buildingCost(key);
  const affordable = Number(storage.steel || 0) >= cost && isBuildingAllowed(key);
  const costText = cost === 0 ? 'kostenlos' : `${cost} t Stahl`;
  const extraText = key === 'ironMine' && state.selected !== 'earth' ? ' · nicht kostenlos' : '';
  const unavailableText = key === 'heliumExtractor' && !isBuildingAllowed(key) ? ' · nur Luna/Venus/Jupiter' : '';
  return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · ${costText}${extraText}${unavailableText}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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
  infoPanel.innerHTML = `<h2>${state.selected === 'earth' ? '🌍' : '🪐'} ${body.name}</h2><p class="hint">${body.type}</p><div class="stat"><span>Temperatur</span><strong>${state.selected === 'mercury' ? mercuryTemperature().toFixed(0) + ' °C' : state.selected === 'venus' ? venusTemperature().toFixed(0) + ' °C' : body.temperature}</strong></div><h3>🌐 Rohstoffe auf dem Planeten</h3>${resourceRows(body)}<h3>📦 Lager auf ${body.name}</h3>${formatStorage(state.selected)}<hr><h3>🏭 Gebäude auf ${body.name}</h3><div class="stat"><span>Gebäude gesamt</span><strong>${totalBuildingsOnPlanet(state.selected)}</strong></div><div class="stat"><span>Eisenproduktion</span><strong>${formatTons(ironProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumproduktion</span><strong>${formatTons(siliconProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumverbrauch</span><strong>${formatTons(siliconUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Lithiumproduktion (Mine)</span><strong>${formatTons(lithiumProduction(state.selected))}/s</strong></div><div class="stat"><span>🟠 Kupfererzproduktion (Mine)</span><strong>${formatTons(copperProduction(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch</span><strong>${formatTons(copperSmeltingUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferproduktion</span><strong>${formatTons(copperSmeltingProduction(state.selected))}/s</strong></div><div class="stat"><span>Lithiumverbrauch</span><strong>${formatTons(lithiumRefineryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch für Batterien</span><strong>${formatTons(lithiumRefineryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Batterieproduktion</span><strong>${formatTons(batteryProduction(state.selected))}/s</strong></div><div class="stat"><span>🧱 Baustoffe im Lager</span><strong>${formatTons(Number(localStorage.buildingMaterials || 0))}</strong></div><div class="stat"><span>🧱 Baustoffproduktion</span><strong>${formatTons(buildingMaterialsProduction(state.selected))}/s</strong></div><div class="stat"><span>🪨 Baustoffverbrauch Stein</span><strong>${formatTons(buildingMaterialsStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactorySteelUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>Maschinenproduktion</span><strong>${formatTons(machineProduction(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Silizium</span><strong>${formatTons(glassFactorySiliconUse(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Stein</span><strong>${formatTons(glassFactoryStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Glasproduktion</span><strong>${formatTons(glassProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranproduktion</span><strong>${formatTons(uraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranverbrauch Aufbereitung</span><strong>${formatTons(processedUraniumUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>🧪 Aufbereitetes Uran</span><strong>${formatTons(processedUraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffverbrauch</span><strong>${formatTons(nuclearFuelProcessedUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffproduktion</span><strong>${formatTons(nuclearFuelProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Verbrauch</span><strong>${formatTons(nuclearReactorNuclearFuelUse(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Strom</span><strong>${nuclearReactorElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>💾 Chipfabrik Lithiumverbrauch</span><strong>${formatTons(chipFactoryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipfabrik Kupferverbrauch</span><strong>${formatTons(chipFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipproduktion</span><strong>${formatTons(chipProduction(state.selected))}/s</strong></div>${['mercury','venus'].includes(state.selected) ? `<div class="stat"><span>☀️ Sonnensegel</span><strong>${getBuildingsOnPlanet(state.selected).solarSail}</strong></div><div class="stat"><span>🌡️ Kühlung</span><strong>-${getBuildingsOnPlanet(state.selected).solarSail * 10} °C</strong></div><div class="stat"><span>🔒 Gebäude-Freigabe</span><strong>${(state.selected === 'mercury' ? mercuryTemperature() : venusTemperature()) <= 50 ? 'freigegeben' : 'nur Sonnensegel'}</strong></div>` : ''}<div class="stat"><span>Helium-3-Produktion</span><strong>${formatTons(helium3Production(state.selected))}/s</strong></div><div class="stat"><span>Helium-3-Verbrauch Fusionsreaktor</span><strong>${formatTons(fusionHelium3Use(state.selected))}/s</strong></div><div class="stat"><span>Fusionsstrom</span><strong>${fusionElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Solarstrom</span><strong>${solarElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div>${state.selected === 'earth' ? `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse('earth'))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction('earth'))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction('earth').toFixed(2)} MW/s</strong></div>` : `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction(state.selected))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Rohölproduktion</span><strong>${crudeOilProduction(state.selected).toFixed(2)} L/s</strong></div><div class="stat"><span>Rohölverbrauch</span><strong>0,00 L/s</strong></div><div class="stat"><span>Rohölpumpen-Stromverbrauch</span><strong>${crudeOilElectricityUse(state.selected).toFixed(2)} MW/s</strong></div>`}<hr>${renderRocketWindow(body)}`;
  bindRocketControls();
  applyLanguage();
}

function saveAfterBuild() {
  saveGame(false);
}

function buildResourceBuilding(key) {
  const planetId = state.selected;
  const bld = getBuildingsOnPlanet(planetId);
  const storage = getPlanetStorage(planetId);
  if (!isBuildingAllowed(key, planetId)) return;

  if (key === 'moonBase') {
    if (!state.research?.completed?.moonBase) return;
    if (Number(storage.steel || 0) < 300 || Number(storage.buildingMaterials || 0) < 100) return;
    storage.steel -= 300;
    storage.buildingMaterials -= 100;
  } else   if (key === 'fusionReactor') {
    if (!state.research?.completed?.fusionReactor) return;
    const cost = buildingCost(key, planetId);
    if (Number(storage.steel || 0) < cost) return;
    storage.steel -= cost;
  } else if (key === 'uraniumMine') {
    if (Number(storage.steel || 0) < 300 || Number(storage.buildingMaterials || 0) < 200) return;
    storage.steel -= 300;
    storage.buildingMaterials -= 200;
  } else if (key === 'uraniumProcessingPlant') {
    if (Number(storage.steel || 0) < 500 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500;
    storage.buildingMaterials -= 300;
  } else if (key === 'nuclearFuelPlant') {
    if (Number(storage.steel || 0) < 1000 || Number(storage.buildingMaterials || 0) < 600 || Number(storage.electronics || 0) < 100) return;
    storage.steel -= 1000;
    storage.buildingMaterials -= 600;
    storage.electronics -= 100;
  } else if (key === 'chipFactory') {
    if (Number(storage.concrete || 0) < 1000 || Number(storage.buildingMaterials || 0) < 2000 || Number(storage.electronics || 0) < 600) return;
    storage.concrete -= 1000;
    storage.buildingMaterials -= 2000;
    storage.electronics -= 600;
  } else if (key === 'solarSail') {
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
  taskProgressUpdate();
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
}

function buildSteelworks() {
  const bld = getBuildingsOnPlanet(state.selected);
  const storage = getPlanetStorage(state.selected);
  if (bld.steelworks === 0) {
    bld.steelworks = 1;
  } else {
    if (Number(storage.steel || 0) < 20) return;
    storage.steel -= 20;
    bld.steelworks++;
  }
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

function buildRocketStation() {
  const bld = getBuildingsOnPlanet(state.selected);
  if (bld.rocketStation > 0) return;
  bld.rocketStation = 1;
  renderSystem(); renderInfo();
  saveAfterBuild();
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
  if (source !== 'luna' && !bld.rocketStation) return;
  const storage = getPlanetStorage(source);
  if (Number(storage.steel || 0) < 100) return;
  storage.steel -= 100;
  outpostBuildQueue[source] = 1;
  outpostBuildStarted[source] = performance.now();
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
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
  saveAfterBuild();
}

function buildHercules2() {
  const source = state.selected;
  ensureRocketData(source);
  if (source === 'sun' || !getBuildingsOnPlanet(source).rocketStation || rocketBuildQueue2[source] > 0) return;
  const storage = getPlanetStorage(source);
  if (Number(storage.steel || 0) < 300 || Number(storage.batteries || 0) < 50) return;
  storage.steel -= 300;
  storage.batteries -= 50;
  rocketBuildQueue2[source] = 1;
  rocketBuildStarted2[source] = performance.now();
  renderInfo(); renderTopResources();
  saveAfterBuild();
}

function getPlayerResourceAmount(resource, planetId = state.selected) { return Number(getPlanetStorage(planetId)[resource] || 0); }

function ensureRocketData(planetId) {
  if (rocketStock[planetId] === undefined) rocketStock[planetId] = 0;
  if (rocketBuildQueue[planetId] === undefined) rocketBuildQueue[planetId] = 0;
  if (rocketBuildStarted[planetId] === undefined) rocketBuildStarted[planetId] = 0;
  if (rocketStock2[planetId] === undefined) rocketStock2[planetId] = 0;
  if (rocketBuildQueue2[planetId] === undefined) rocketBuildQueue2[planetId] = 0;
  if (rocketBuildStarted2[planetId] === undefined) rocketBuildStarted2[planetId] = 0;
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
      type: 'hercules1',
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

function launchHercules2(source, destination) {
  ensureRocketData(source);
  if (!getBuildingsOnPlanet(source).rocketStation || !rocketStock2[source] || !bodies[destination] || destination === source || destination === 'sun') return;

  const cargo = (rocketCargoSlots || []).map(slot => ({
    resource: slot.resource,
    amount: Math.max(0, Number(slot.amount) || 0)
  })).filter(slot => slot.resource && slot.amount > 0);

  const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (!cargo.length || total > 300.000001) return;

  const sourceStorage = getPlanetStorage(source);
  for (const slot of cargo) {
    if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return;
  }
  for (const slot of cargo) {
    sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount;
    if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0;
  }

  rocketStock2[source]--;
  const duration = (flightTimes[destination] || 20) * 1000;
  rockets.push({
    id: Date.now() + Math.random(),
    name: rocketTypes.hercules2.name,
    type: 'hercules2',
    from: source,
    to: destination,
    started: performance.now(),
    duration,
    status: 'outbound',
    capacity: 300,
    compartments: 3,
    cargo: cargo
  });
  renderInfo(); renderTopResources();
}

function returnRocket(rocketId, cargoResource = null, cargoAmount = 0) {
  const rocket = rockets.find(r => String(r.id) === String(rocketId));
  if (!rocket || rocket.status !== 'arrived') return;
  const source = rocket.to;
  const destination = rocket.from;
  const duration = (flightTimes[rocket.from] || flightTimes[rocket.to] || 20) * 1000;
  const storage = getPlanetStorage(source);
  const returnCapacity = rocket.type === 'hercules2' ? 300 : 120;
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

  const stock1 = rocketStock[source] || 0;
  const stock2 = rocketStock2[source] || 0;
  const buildQueue1 = rocketBuildQueue[source] || 0;
  const buildQueue2 = rocketBuildQueue2[source] || 0;
  const buildStarted1 = rocketBuildStarted[source] || 0;
  const buildStarted2 = rocketBuildStarted2[source] || 0;

  const destinations = Object.entries(bodies)
    .filter(([id]) => id !== 'sun' && id !== source && flightTimes[id] !== undefined)
    .map(([id, b]) => `<option value="${id}" ${rocketDestination === id ? 'selected' : ''}>${b.name} · ${flightTimes[id] || 20} s</option>`).join('');

  const qty = Math.max(1, Math.min(rocketQuantity, Math.max(1, stock1)));
  rocketQuantity = qty;
  const target = rocketDestination;
  const sec = flightTimes[target] || 20;

  const active = rockets.filter(r => r.status !== 'returned' && (r.from === source || r.to === source));
  const list = active.length ? active.map(r => {
    const elapsed = performance.now() - r.started;
    const remaining = Math.max(0, (r.duration - elapsed) / 1000);
    const pct = Math.min(100, elapsed / r.duration * 100);
    const isH2 = r.type === 'hercules2';
    const cargo = r.deliveredCargo || r.cargo;
    const cargoText = Array.isArray(cargo)
      ? (cargo.length ? cargo.map(c => `${resourceIcons[c.resource] || ''} ${resourceNames[c.resource] || c.resource}: ${c.amount.toFixed(2)} ${c.resource === 'crudeOil' ? 'L' : 't'}`).join(' · ') : 'Keine Fracht')
      : (cargo && cargo.amount > 0 ? `${resourceIcons[cargo.resource] || ''} ${resourceNames[cargo.resource] || cargo.resource}: ${cargo.amount.toFixed(2)} ${cargo.resource === 'crudeOil' ? 'L' : 't'}` : 'Keine Fracht');

    if (r.status === 'arrived') {
      const returnOptions = ['stone','coal','gas','crudeOil','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','uranium','processedUranium','nuclearFuel','steel']
        .filter(k => Number(getPlanetStorage(r.to)[k] || 0) > 0.000001)
        .map(k => `<option value="${k}">${resourceIcons[k] || ''} ${resourceNames[k] || k}</option>`).join('');
      return `<div class="rocket-flight arrived"><strong>🚀 ${r.name}</strong><span>📍 ${bodies[r.to].name} · angekommen</span><div class="rocket-cargo">📦 Hinflug: ${cargoText}</div><div class="rocket-return-box"><select class="rocket-return-resource" data-rocket-id="${r.id}"><option value="">Keine Rückfracht</option>${returnOptions}</select><input class="rocket-return-amount" data-rocket-id="${r.id}" type="number" min="0" max="${isH2 ? 300 : 120}" step="0.01" value="0"><button class="rocket-return" data-rocket-id="${r.id}">↩️ Zurück nach ${bodies[r.from].name}</button></div><small>Rückflug ${bodies[r.to].name} → ${bodies[r.from].name}: ${flightTimes[r.from] || flightTimes[r.to] || 20} Sekunden · max. ${isH2 ? '300' : '120'} t/L</small></div>`;
    }
    if (r.status === 'returning') return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>↩️ ${bodies[r.fromReturn || r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 Rückflug</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
    return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>🚀 ${bodies[r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 ${cargoText}</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
  }).join('') : '<p class="hint">Keine aktiven Transporte mit diesem Planeten.</p>';

  const buildRemaining1 = buildQueue1 ? Math.max(0, 30 - (performance.now() - buildStarted1)/1000) : 0;
  const buildPct1 = buildQueue1 ? Math.min(100, (performance.now()-buildStarted1)/30000*100) : 0;
  const buildRemaining2 = buildQueue2 ? Math.max(0, 30 - (performance.now() - buildStarted2)/1000) : 0;
  const buildPct2 = buildQueue2 ? Math.min(100, (performance.now()-buildStarted2)/30000*100) : 0;
  const localSteel = getPlayerResourceAmount('steel', source);
  const localBatteries = getPlayerResourceAmount('batteries', source);

  const cargoOptions = ['stone','coal','gas','crudeOil','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','uranium','processedUranium','nuclearFuel','steel']
    .map(key => `<option value="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}</option>`).join('');

  rocketCargoSlots = rocketCargoSlots.slice(0, 3);
  while (rocketCargoSlots.length < 3) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
  rocketCargoSlots.forEach(slot => {
    const available = getPlayerResourceAmount(slot.resource, source);
    slot.amount = Math.max(0, Math.min(Number(slot.amount) || 0, available, 300));
  });
  const h2Total = rocketCargoSlots.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const h2Possible = h2Total > 0 && h2Total <= 300.000001;

  const h2SlotsHtml = rocketCargoSlots.map((slot, i) => {
    const available = getPlayerResourceAmount(slot.resource, source);
    return `<div class="rocket-compartment"><strong>Frachtabteilung ${i+1}</strong><select class="rocket-h2-resource" data-slot="${i}">${cargoOptions.replace(`value="${slot.resource}"`, `value="${slot.resource}" selected`)}</select><input class="rocket-h2-amount" data-slot="${i}" type="number" min="0" max="${Math.min(300, available)}" step="0.01" value="${Number(slot.amount || 0).toFixed(2)}"><small>Verfügbar: ${formatTons(available)}</small></div>`;
  }).join('');

  return `<section class="rocket-window"><h3>🚀 Transportzentrale</h3>
    <p class="hint"><strong>Startplanet:</strong> ${body.name} · Herkules 1 und 2 können von Raketenstationen gestartet werden.</p>

    <div class="rocket-build-box"><strong>🏗️ Herkules 1</strong><small>45 t Stahl · 30 Sekunden Bauzeit · 120 t/L Kapazität</small>${buildQueue1 ? `<div class="rocket-progress"><i style="width:${buildPct1}%"></i></div>` : ''}<button id="build-hercules" ${buildQueue1 || localSteel < 45 ? 'disabled' : ''}>🚀 Herkules 1 bauen – 45 t Stahl</button></div>
    <div class="rocket-stock">Herkules 1 verfügbar: <strong>${stock1}</strong></div>

    <div class="rocket-build-box hercules2-box"><strong>🚀 Herkules 2</strong><small>300 t Stahl + 50 t Batterien · 30 Sekunden Bauzeit · 300 t/L Kapazität · 3 Frachtabteilungen</small>${buildQueue2 ? `<div class="rocket-progress"><i style="width:${buildPct2}%"></i></div>` : ''}<button id="build-hercules2" ${buildQueue2 || localSteel < 300 || localBatteries < 50 ? 'disabled' : ''}>🚀 Herkules 2 bauen – 300 t Stahl + 50 t Batterien</button></div>
    <div class="rocket-stock">Herkules 2 verfügbar: <strong>${stock2}</strong></div>

    <div class="transport-route"><label for="rocket-destination"><strong>🎯 Zielplanet</strong></label><select id="rocket-destination">${destinations}</select></div>

    <div class="rocket-h1-launch">
      <strong>🚀 Herkules 1 · Einzelfracht</strong>
      <div class="rocket-quantity"><strong>Anzahl:</strong><button class="qty-btn" id="rocket-minus">−</button><span>${qty}</span><button class="qty-btn" id="rocket-plus">+</button></div>
      <div class="rocket-capacity">Gesamtkapazität: <strong>${qty*120} t/L</strong></div>
      <div class="rocket-cargo-box"><strong>📦 Fracht pro Rakete</strong><select id="rocket-cargo-resource">${cargoOptions.replace(`value="${rocketCargoResource}"`, `value="${rocketCargoResource}" selected`)}</select><div class="cargo-input-row"><input id="rocket-cargo-number" type="number" min="0" max="${Math.min(120,getPlayerResourceAmount(rocketCargoResource,source))}" step="0.01" value="${Number(rocketCargoAmount||0).toFixed(2)}"></div></div>
      <button class="rocket-launch" id="launch-hercules" ${stock1 < qty || !(Number(rocketCargoAmount)>0) ? 'disabled' : ''}>🚀 ${qty} Herkules 1 nach ${bodies[target].name} starten</button>
    </div>

    <div class="rocket-h2-launch">
      <strong>🚀 Herkules 2 · Mehrere Frachtabteilungen</strong>
      <div class="rocket-capacity">Gesamtkapazität: <strong>300 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div>
      <div class="rocket-compartments">${h2SlotsHtml}</div>
      ${h2Total > 300 ? '<small class="bad">Maximal 300 t/L pro Herkules 2.</small>' : ''}
      <button class="rocket-launch" id="launch-hercules2" ${stock2 < 1 || !h2Possible ? 'disabled' : ''}>🚀 Herkules 2 nach ${bodies[target].name} starten</button>
      <p class="hint">Gleiche Flugzeit wie Herkules 1 · kann alle erreichbaren Planeten anfliegen.</p>
    </div>

    <p class="hint">Flugzeit zum Ziel: ${sec} Sekunden. Die Fracht wird bei Ankunft in das Lager des Zielplaneten gelegt.</p>
    <hr><h3>📡 Aktive Transporte</h3>${list}</section>`;
}

function bindRocketControls() {
  const b=infoPanel.querySelector('#build-hercules'); if(b)b.addEventListener('click',buildHercules1);
  const b2=infoPanel.querySelector('#build-hercules2'); if(b2)b2.addEventListener('click',buildHercules2);
  const d=infoPanel.querySelector('#rocket-destination'); if(d)d.addEventListener('change',()=>{rocketDestination=d.value;renderInfo();});
  const m=infoPanel.querySelector('#rocket-minus'); if(m)m.addEventListener('click',()=>{rocketQuantity=Math.max(1,rocketQuantity-1);renderInfo();});
  const p=infoPanel.querySelector('#rocket-plus'); if(p)p.addEventListener('click',()=>{rocketQuantity=Math.min(Math.max(1,rocketStock[state.selected] || 1),rocketQuantity+1);renderInfo();});
  const resource=infoPanel.querySelector('#rocket-cargo-resource');
  if(resource) resource.addEventListener('change',()=>{rocketCargoResource=resource.value;rocketCargoAmount=Math.min(120,getPlayerResourceAmount(rocketCargoResource,state.selected));renderInfo();});
  const number=infoPanel.querySelector('#rocket-cargo-number');
  if(number) number.addEventListener('input',()=>{rocketCargoAmount=Math.max(0,Math.min(Number(number.max),Number(number.value)||0));});

  infoPanel.querySelectorAll('.rocket-h2-resource').forEach(el=>el.addEventListener('change',()=>{
    const i=Number(el.dataset.slot);
    rocketCargoSlots[i].resource=el.value;
    const available=getPlayerResourceAmount(el.value,state.selected);
    rocketCargoSlots[i].amount=Math.min(Number(rocketCargoSlots[i].amount)||0,available,300);
    renderInfo();
  }));
  infoPanel.querySelectorAll('.rocket-h2-amount').forEach(el=>el.addEventListener('input',()=>{
    const i=Number(el.dataset.slot);
    rocketCargoSlots[i].amount=Math.max(0,Math.min(300,Number(el.value)||0));
  }));
  const l=infoPanel.querySelector('#launch-hercules'); if(l)l.addEventListener('click',()=>launchHercules1(state.selected,rocketDestination,rocketQuantity));
  const l2=infoPanel.querySelector('#launch-hercules2'); if(l2)l2.addEventListener('click',()=>launchHercules2(state.selected,rocketDestination));
  infoPanel.querySelectorAll('.rocket-return').forEach(x=>x.addEventListener('click',()=>{
    const id=x.dataset.rocketId;
    const resourceEl=infoPanel.querySelector(`.rocket-return-resource[data-rocket-id="${id}"]`);
    const amountEl=infoPanel.querySelector(`.rocket-return-amount[data-rocket-id="${id}"]`);
    returnRocket(id, resourceEl?.value || null, Number(amountEl?.value) || 0);
  }));
}

function updateOutposts(now) {
  Object.keys(outpostBuildQueue).forEach(id => {
    if (outpostBuildQueue[id] > 0 && now - (outpostBuildStarted[id] || 0) >= 60000) {
      getBuildingsOnPlanet(id).outpost = 1;
      outpostBuildQueue[id] = 0;
      outpostBuildStarted[id] = 0;
      renderSystem(); renderInfo();
    }
  });
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
    if (rocketBuildQueue2[id] > 0 && now - rocketBuildStarted2[id] >= 30000) {
      rocketStock2[id] += rocketBuildQueue2[id];
      rocketBuildQueue2[id] = 0;
      rocketBuildStarted2[id] = 0;
      renderInfo();
    }
  });
  for (const rocket of rockets) {
    if (rocket.status === 'returned') continue;
    if (now - rocket.started >= rocket.duration) {
      if (rocket.status === 'outbound') {
        rocket.status = 'arrived';
        rocket.arrivedAt = now;
        if (Array.isArray(rocket.cargo)) {
          const targetStorage = getPlanetStorage(rocket.to);
          rocket.deliveredCargo = rocket.cargo.map(c => ({ ...c }));
          rocket.cargo.forEach(c => {
            if (c.amount > 0) {
              targetStorage[c.resource] = Number(targetStorage[c.resource] || 0) + c.amount;
              c.amount = 0;
            }
          });
        } else if (rocket.cargo && rocket.cargo.amount > 0) {
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
      // Diese Gebäude werden unten separat verarbeitet.
      if (key === 'crudeOilPump' || key === 'lithiumMine' || key === 'copperMine') return;
      if (!b.resource) return;

      const available = Number(planet.resources[b.resource] || 0);
      const amount = Math.min(available, Number(b.rate || 0) * Number(bld[key] || 0) * delta);
      if (amount > 0) {
        planet.resources[b.resource] = available - amount;
        storage[b.resource] = Number(storage[b.resource] || 0) + amount;
        if (b.resource === 'iron') state.tasks.ironMined = Number(state.tasks.ironMined || 0) + amount;
      }
    });

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
      const powerFactor = neededPower > 0 ? Math.min(1, availablePower / neededPower) : 0;
      const availableOil = Number(planet.resources.crudeOil || 0);
      const amount = Math.min(availableOil, crudeOilProduction(id) * delta * powerFactor);
      if (amount > 0) { planet.resources.crudeOil -= amount; storage.crudeOil = Number(storage.crudeOil || 0) + amount; }
    }

    if (bld.steelworks > 0 && storage.iron > 0) {
      const needed = ironUse(id) * delta;
      const used = Math.min(storage.iron, needed);
      storage.iron -= used;
      const steelMade = steelProduction(id) * delta * (needed ? used / needed : 0);
      storage.steel = Number(storage.steel || 0) + steelMade;
      state.tasks.steelProduced = Number(state.tasks.steelProduced || 0) + steelMade;
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
      const copperFactor = neededCopper > 0 ? Math.min(1, availableCopper / neededCopper) : 0;
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
      const copperFactor = neededCopper > 0 ? Math.min(1, availableCopper / neededCopper) : 0;
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
      const copperFactor = neededCopper > 0 ? Math.min(1, availableCopper / neededCopper) : 0;
      const factor = Math.min(lithiumFactor, copperFactor);
      if (factor > 0) {
        storage.lithium = availableLithium - neededLithium * factor;
        storage.copper = availableCopper - neededCopper * factor;
        storage.chips = Number(storage.chips || 0) + chipProduction(id) * delta * factor;
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

  // Das Lager der Erde ist gleichzeitig das Spieler-/Hauptlager.
  updateOutposts(now);
  updateRockets(now);
  // Forschungspunkte werden durch das Forschungslabor auf der Erde erzeugt.
  // 1 Forschungspunkt pro Sekunde je Forschungslabor.
  const researchPointsDelta = researchPointProduction() * delta;
  if (researchPointsDelta > 0) {
    state.research.points = Number(state.research.points || 0) + researchPointsDelta;
  }

  updateResearch(now);
  taskProgressUpdate();

  // Forschungs-Timer sichtbar und synchron im Sekundenrhythmus aktualisieren.
  if (!updateResources.lastResearchUiUpdate || now - updateResources.lastResearchUiUpdate >= 250) {
    const researchPanel = document.querySelector('#research-panel');
    if (researchPanel && !researchPanel.hidden && state.research?.active) {
      updateResources.lastResearchUiUpdate = now;
      renderResearch();
    }
  }

  // Alle 5 Sekunden werden die aktuellen Lagerstände, Gebäude,
  // Forschungspunkte und laufenden Spielzustände automatisch gespeichert.
  // Die Produktion selbst läuft weiterhin kontinuierlich über requestAnimationFrame.
  if (!updateResources.lastStorageSync || now - updateResources.lastStorageSync >= 5000) {
    updateResources.lastStorageSync = now;
    saveGame(false);
  }

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
// NEUIGKEITEN & WIRTSCHAFT – Buttons
// ==========================================
function setupMainMenu() {
  const menuButton = document.querySelector('#main-menu-button');
  const menu = document.querySelector('#main-menu');
  const menuClose = document.querySelector('#main-menu-close');
  const introButton = document.querySelector('#introduction-button');
  const introPanel = document.querySelector('#introduction-panel');
  const introClose = document.querySelector('#introduction-close');
  if (menuButton && menu) menuButton.addEventListener('click', () => { menu.hidden = !menu.hidden; });
  if (menuClose && menu) menuClose.addEventListener('click', () => { menu.hidden = true; });
  if (introButton && introPanel) introButton.addEventListener('click', () => {
    introPanel.hidden = false; if (menu) menu.hidden = true;
    const newsPanel=document.querySelector('#news-panel'), economyPanel=document.querySelector('#economy-panel');
    if(newsPanel) newsPanel.hidden=true; if(economyPanel) economyPanel.hidden=true; applyLanguage(introPanel);
  });
  if (introClose && introPanel) introClose.addEventListener('click', () => { introPanel.hidden = true; });
}

function setupTopPanels() {
  const newsButton = document.querySelector('#news-button');
  const newsPanel = document.querySelector('#news-panel');
  const newsClose = document.querySelector('#news-close');
  const economyButton = document.querySelector('#economy-button');
  const economyPanel = document.querySelector('#economy-panel');
  const economyClose = document.querySelector('#economy-close');
  const researchButton = document.querySelector('#research-button');
  const researchPanel = document.querySelector('#research-panel');
  const researchClose = document.querySelector('#research-close');
  const tasksButton = document.querySelector('#tasks-button');
  const tasksPanel = document.querySelector('#tasks-panel');
  const tasksClose = document.querySelector('#tasks-close');

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
      if (researchPanel) researchPanel.hidden = true;
      const introPanel=document.querySelector('#introduction-panel'), mainMenu=document.querySelector('#main-menu');
      if (introPanel) introPanel.hidden=true; if(mainMenu) mainMenu.hidden=true;
      renderTasks();
      applyLanguage(tasksPanel);
    }
  });
  if (tasksClose && tasksPanel) tasksClose.addEventListener('click', () => { tasksPanel.hidden = true; });
}

function renderEconomy() {
  const panel = document.querySelector('#economy-content');
  if (!panel) return;
  const resources = [['stone','🪨','Stein'],['coal','⚫','Kohle'],['gas','🔥','Gas'],['crudeOil','🛢️','Rohöl'],['iron','🧲','Eisen'],['steel','🔩','Stahl'],['silicon','🔷','Silizium'],['lithium','🔋','Lithium'],['copperOre','🟠','Kupfererz'],['copper','🟤','Kupfer'],['batteries','🔋','Batterien'],['buildingMaterials','🧱','Baustoffe'],['machines','⚙️','Maschinen'],['uranium','☢️','Uran'],['processedUranium','🧪','Aufbereitetes Uran'],['nuclearFuel','⚛️','Kernbrennstoff'],['chips','💾','Chips'],['helium3','🧪','Helium-3']];
  const rows = resources.map(([key, icon, name]) => {
    const amount = getPlayerResourceAmount(key, 'earth');
    let production = 0, consumption = 0;
    if (key === 'crudeOil') { production = crudeOilProduction('earth'); consumption = 0; }
    if (key === 'iron') { production = ironProduction('earth'); consumption = ironUse('earth'); }
    if (key === 'steel') production = steelProduction('earth');
    if (key === 'silicon') production = siliconProduction('earth');
    if (key === 'lithium') { production = lithiumProduction('earth'); consumption = lithiumRefineryLithiumUse('earth'); }
    if (key === 'copperOre') { production = copperProduction('earth'); consumption = copperSmeltingUse('earth'); }
    if (key === 'copper') { production = copperSmeltingProduction('earth'); consumption = lithiumRefineryCopperUse('earth') + machineFactoryCopperUse('earth'); }
    if (key === 'batteries') production = batteryProduction('earth');
    if (key === 'buildingMaterials') {
      production = buildingMaterialsProduction('earth');
      consumption = 0;
    }
    if (key === 'machines') production = machineProduction('earth');
    if (key === 'uranium') { production = uraniumProduction('earth'); consumption = processedUraniumUraniumUse('earth'); }
    if (key === 'processedUranium') { production = processedUraniumProduction('earth'); consumption = nuclearFuelProcessedUraniumUse('earth'); }
    if (key === 'nuclearFuel') { production = nuclearFuelProduction('earth'); consumption = nuclearReactorNuclearFuelUse('earth'); }
    if (key === 'chips') { production = chipProduction('earth'); consumption = 0; }
    if (key === 'helium3') production = helium3Production('earth'); consumption = fusionHelium3Use('earth');
    if (key === 'coal') consumption = coalPowerUse('earth');
    return `<div class="stat"><span>${icon} ${name}</span><strong>${key === 'crudeOil' ? amount.toLocaleString('de-DE', {maximumFractionDigits:2}) + ' L' : formatTons(amount)}</strong><small>${production.toFixed(2)} ${key === 'crudeOil' ? 'L/s' : 't/s'} Produktion · ${consumption.toFixed(key === 'crudeOil' ? 2 : 4)} ${key === 'crudeOil' ? 'L/s' : 't/s'} Verbrauch</small></div>`;
  }).join('');
  const b = getBuildingsOnPlanet('earth');
  const total = Object.values(b).reduce((a,v)=>a+Number(v||0),0);
  const chain = batteryProductionChain('earth');
  panel.innerHTML = `<div class="stat"><span>Gebäude gesamt</span><strong>${total}</strong></div><h3>📊 Produktionsübersicht</h3>${rows}<hr><h3>🔋 Produktionskette: Batterien</h3><div class="stat"><span>🔋 Lithium →</span><strong>${formatTons(chain.lithium)}/s</strong></div><div class="stat"><span>🟤 Kupfer →</span><strong>${formatTons(chain.copper)}/s</strong></div><div class="stat"><span>🔋 Batterien</span><strong>${formatTons(chain.batteries)}/s</strong></div><hr><h3>🏭 Gebäude</h3>${Object.entries(b).map(([key,count])=>`<div class="stat"><span>${buildingTypes[key]?.icon || '🏭'} ${buildingTypes[key]?.name || key}</span><strong>${count}</strong></div>`).join('')}`;
}

// ==========================================
// MEHRSPRACHIGKEIT: Deutsch / English / Français
// ==========================================
const LANGUAGE_KEY = 'solarFrontierLanguage_v1';
const languageSelect = document.querySelector('#language-select');
const translations = {
  en: {
    'Weltraum Game':'Space Game','Sonnensystem · Rohstoffe · Aufbau · Transport':'Solar System · Resources · Development · Transport','Neuigkeiten':'News','Wirtschaft':'Economy','Forschung':'Research','Forschungsbaum':'Research Tree','Forschungslabor':'Research Lab','Forschungspunkte':'Research Points','Forschen':'Research','Abgeschlossen':'Completed','Spiel':'Game','Menü':'Menu','Einführung':'Introduction','Sprache':'Language','Willkommen bei Solar Frontier: Origins':'Welcome to Solar Frontier: Origins','Dein Ziel':'Your Goal','Planeten':'Planets','Raketen':'Rockets','Neuigkeiten & Updates':'News & Updates','Entwicklungsstand von Solar Frontier: Origins':'Development status of Solar Frontier: Origins','Aktuelle Ankündigung':'Current Announcement','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins is being developed further','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'The game is actively being developed. New content, tasks and technical improvements are being added step by step.','Aktuelle Version':'Current Version','Nächstes Update':'Next Update','Geplant':'Planned','Aktuelle Entwicklung':'Current Development','Was gerade im Spiel entsteht':'What is currently being developed','Weiterentwicklung des Sonnensystems':'Solar system development','Rohstoffabbau und Gebäude auf der Erde':'Resource extraction and buildings on Earth','Siliziummine und weitere Produktionsgebäude':'Silicon mine and additional production buildings','Raketenbau und interplanetarer Transport':'Rocket construction and interplanetary transport','Speichern und Laden des Spielstands':'Saving and loading the game','Hinweis für Spieler':'Player Notice','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'The game is actively in development. Changes and new updates may be added at any time.','Wirtschafts-Dashboard':'Economy Dashboard','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Overview of storage, production, consumption and buildings','Spielstand':'Save Game','Speichern':'Save','Laden':'Load','Neustart':'Restart','Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars','Jupiter':'Jupiter','Luna':'Moon','Stern':'Star','Planet':'Planet','Startplanet':'Starting Planet','Temperatur':'Temperature','Rohstoffe':'Resources','Lager':'Storage','Gebäude':'Buildings','Gebäude gesamt':'Total Buildings','Eisen':'Iron','Stahl':'Steel','Stein':'Stone','Kohle':'Coal','Gas':'Gas','Silizium':'Silicon','Wasser':'Water','Metalle':'Metals','Gestein':'Rock','Energie':'Energy','Eisenproduktion':'Iron Production','Eisenverbrauch':'Iron Consumption','Stahlproduktion':'Steel Production','Siliziumproduktion':'Silicon Production','Batterien':'Batteries','Batterieproduktion':'Battery Production','Produktionskette: Batterien':'Battery Production Chain','Siliziumverbrauch':'Silicon Consumption','Stromproduktion':'Electricity Production','Bauen':'Build','kostenlos':'free','weitere':'additional','Steinbruch':'Stone Quarry','Kohlemine':'Coal Mine','Gasförderanlage':'Gas Plant','Eisenmine':'Iron Mine','Siliziummine':'Silicon Mine','Stahlwerk':'Steel Mill','Kohlekraftwerk':'Coal Power Plant','Raketenstation':'Rocket Station','Maschinenfabrik':'Machine Factory','Maschinen':'Machines','Transportzentrale':'Transport Center','Zielplanet':'Destination Planet','Anzahl':'Amount','Fracht pro Rakete':'Cargo per Rocket','Aktive Transporte':'Active Transports','Keine abbaubaren Rohstoffe.':'No extractable resources.','Noch keine Rohstoffe abgebaut':'No resources extracted yet','Bauzeit':'Build Time','Flugzeit':'Flight Time','Rückflug':'Return Flight','Hinflug':'Outbound Flight','Gesamtkapazität':'Total Capacity','verfügbar':'available','bis Ankunft':'until arrival','Sekunden':'seconds','t Stahl':'t steel','t Eisen':'t iron','t Stein':'t stone','t Kohle':'t coal','t Gas':'t gas','t Silizium':'t silicon','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'No return cargo','zurück':'back','Starten':'Launch','Schließen':'Close','Uran':'Uranium','Uranmine':'Uranium Mine','Uranaufbereitungsanlage':'Uranium Processing Plant','Aufbereitetes Uran':'Processed Uranium','Kernbrennstoffanlage':'Nuclear Fuel Plant','Kernbrennstoff':'Nuclear Fuel','Kernreaktor':'Nuclear Reactor','Chipfabrik':'Chip Factory','Chips':'Chips','Beton':'Concrete','Sonnensegel':'Solar Sail','Aufgaben':'Tasks','Einführung · Ziele und Fortschritt':'Introduction · Goals and progress','Baue eine Eisenmine':'Build an iron mine','Baue 1.000 t Eisenerz ab':'Mine 1,000 t iron ore','Baue ein Stahlwerk':'Build a steel mill','Produziere 1.000 t Stahl':'Produce 1,000 t steel','Baue deine erste Eisenmine.':'Build your first iron mine.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Mine a total of 1,000 t iron from planetary deposits.','Baue dein erstes Stahlwerk.':'Build your first steel mill.','Produziere insgesamt 1.000 t Stahl.':'Produce a total of 1,000 t steel.','Fortschritt':'Progress','Forschungspunkte':'Research Points'
  },
  fr: {
    'Weltraum Game':'Jeu spatial','Sonnensystem · Rohstoffe · Aufbau · Transport':'Système solaire · Ressources · Développement · Transport','Neuigkeiten':'Actualités','Wirtschaft':'Économie','Forschung':'Recherche','Forschungsbaum':'Arbre technologique','Forschungslabor':'Laboratoire de recherche','Forschungspunkte':'Points de recherche','Forschen':'Rechercher','Abgeschlossen':'Terminé','Spiel':'Jeu','Menü':'Menu','Einführung':'Introduction','Sprache':'Langue','Neuigkeiten & Updates':'Actualités & mises à jour','Entwicklungsstand von Solar Frontier: Origins':'État du développement de Solar Frontier: Origins','Aktuelle Ankündigung':'Annonce actuelle','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins continue son développement','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'Le jeu est en développement actif. De nouveaux contenus, objectifs et améliorations techniques sont ajoutés progressivement.','Aktuelle Version':'Version actuelle','Nächstes Update':'Prochaine mise à jour','Geplant':'Prévu','Aktuelle Entwicklung':'Développement actuel','Was gerade im Spiel entsteht':'Développement en cours','Weiterentwicklung des Sonnensystems':'Développement du système solaire','Rohstoffabbau und Gebäude auf der Erde':'Extraction de ressources et bâtiments sur Terre','Siliziummine und weitere Produktionsgebäude':'Mine de silicium et autres bâtiments de production','Raketenbau und interplanetarer Transport':'Construction de fusées et transport interplanétaire','Speichern und Laden des Spielstands':'Sauvegarde et chargement de la partie','Hinweis für Spieler':'Information aux joueurs','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'Le jeu est en développement actif. Des changements et mises à jour peuvent être ajoutés à tout moment.','Wirtschafts-Dashboard':'Tableau de bord économique','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Aperçu du stockage, de la production, de la consommation et des bâtiments','Spielstand':'Sauvegarde','Speichern':'Sauvegarder','Laden':'Charger','Neustart':'Redémarrer','Sonne':'Soleil','Merkur':'Mercure','Venus':'Vénus','Erde':'Terre','Mars':'Mars','Jupiter':'Jupiter','Luna':'Lune','Stern':'Étoile','Planet':'Planète','Startplanet':'Planète de départ','Temperatur':'Température','Rohstoffe':'Ressources','Lager':'Stockage','Gebäude':'Bâtiments','Gebäude gesamt':'Bâtiments au total','Eisen':'Fer','Stahl':'Acier','Stein':'Pierre','Kohle':'Charbon','Gas':'Gaz','Silizium':'Silicium','Wasser':'Eau','Metalle':'Métaux','Gestein':'Roche','Energie':'Énergie','Eisenproduktion':'Production de fer','Eisenverbrauch':'Consommation de fer','Stahlproduktion':'Production d’acier','Siliziumproduktion':'Production de silicium','Batterien':'Batteries','Batterieproduktion':'Production de batteries','Produktionskette: Batterien':'Chaîne de production des batteries','Siliziumverbrauch':'Consommation de silicium','Stromproduktion':'Production d’électricité','Bauen':'Construire','kostenlos':'gratuit','weitere':'supplémentaire','Steinbruch':'Carrière de pierre','Kohlemine':'Mine de charbon','Gasförderanlage':'Installation de gaz','Eisenmine':'Mine de fer','Siliziummine':'Mine de silicium','Stahlwerk':'Aciérie','Kohlekraftwerk':'Centrale à charbon','Raketenstation':'Station de fusées','Maschinenfabrik':'Usine de machines','Maschinen':'Machines','Transportzentrale':'Centre de transport','Zielplanet':'Planète destination','Anzahl':'Quantité','Fracht pro Rakete':'Fret par fusée','Aktive Transporte':'Transports actifs','Keine abbaubaren Rohstoffe.':'Aucune ressource exploitable.','Noch keine Rohstoffe abgebaut':'Aucune ressource extraite','Bauzeit':'Temps de construction','Flugzeit':'Temps de vol','Rückflug':'Vol retour','Hinflug':'Vol aller','Gesamtkapazität':'Capacité totale','verfügbar':'disponible','bis Ankunft':'avant l’arrivée','Sekunden':'secondes','t Stahl':'t acier','t Eisen':'t fer','t Stein':'t pierre','t Kohle':'t charbon','t Gas':'t gaz','t Silizium':'t silicium','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'Aucun fret retour','zurück':'retour','Starten':'Lancer','Schließen':'Fermer','Uran':'Uranium','Uranmine':'Mine d’uranium','Uranaufbereitungsanlage':'Usine de traitement de l’uranium','Aufbereitetes Uran':'Uranium traité','Kernbrennstoffanlage':'Usine de combustible nucléaire','Kernbrennstoff':'Combustible nucléaire','Kernreaktor':'Réacteur nucléaire','Chipfabrik':'Usine de puces','Chips':'Puces','Beton':'Béton','Sonnensegel':'Voile solaire','Aufgaben':'Tâches','Einführung · Ziele und Fortschritt':'Introduction · objectifs et progression','Baue eine Eisenmine':'Construire une mine de fer','Baue 1.000 t Eisenerz ab':'Extraire 1 000 t de minerai de fer','Baue ein Stahlwerk':'Construire une aciérie','Produziere 1.000 t Stahl':'Produire 1 000 t d’acier','Baue deine erste Eisenmine.':'Construire votre première mine de fer.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Extraire au total 1 000 t de fer des gisements planétaires.','Baue dein erstes Stahlwerk.':'Construire votre première aciérie.','Produziere insgesamt 1.000 t Stahl.':'Produire au total 1 000 t d’acier.','Fortschritt':'Progression'
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

setupMainMenu();
setupSaveMenu();
setupTopPanels();
loadGame(false);
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
