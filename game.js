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


const state = {
  selected: 'earth',
  viewMode: 'surface',
  // Spielerbestand: Nur hier landen Rohstoffe, die tatsächlich abgebaut wurden.
  stone: 0,
  coal: 0,
  gas: 0,
  co2: 0,
  carbon: 0,
  oxygen: 0,
  crudeOil: 0,
  polymers: 0,
  electronics: 0,
  iron: 0,
  steel: 0,
  batteries: 0,
  buildingMaterials: 0,
  uranium: 0,
  processedUranium: 0,
  nuclearFuel: 0,
  chips: 0,
  concrete: 0,
  bauxite: 0,
  aluminiumOxide: 0,
  aluminium: 0,
  water: 0,
  grain: 0,
  vegetables: 0,
  food: 0,
  buildings: {
    steelworks: 0,
    stoneQuarry: 0,
    buildingMaterialsFactory: 0,
    coalMine: 0,
    gasPlant: 0,
    co2ProcessingPlant: 0,
    orbitalCo2Extractor: 0,
    researchSatellite: 0,
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
    rocketFactory: 0,
    landingPad: 0,
    coalPowerPlant: 0,
    researchLab: 0,
    moonBase: 0,
    crudeOilPump: 0,
    polymerFactory: 0,
    electronicsFactory: 0,
    uraniumMine: 0,
    uraniumProcessingPlant: 0,
    nuclearFuelPlant: 0,
    nuclearReactor: 0,
    chipFactory: 0,
    solarSail: 0,
    solarSatellite: 0,
    solarProbe: 0,
    bauxiteMine: 0,
    aluminiumOxideRefinery: 0,
    aluminiumSmelter: 0,
    hydroelectricPlant: 0,
    greenhouse: 0,
    foodFactory: 0
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
  co2Extraction: { name: 'CO₂-Extraktionsanlage', icon: '🌫️', resource: 'co2', rate: 0.25, cost: 25, text: 'extrahiert 0,25 t CO₂/s aus der Atmosphäre · nur auf Venus' },
  co2ProcessingPlant: { name: 'CO₂-Verarbeitung', icon: '⚗️', resource: null, rate: 0, cost: 50, text: 'verarbeitet 0,2 t CO₂/s → 0,1 t Kohlenstoff + 0,1 t Sauerstoff · auf allen Planeten außer der Sonne' },
  orbitalCo2Extractor: { name: 'Orbitaler CO₂-Extraktor', icon: '🛰️', resource: null, rate: 0, cost: 0, text: 'Gewinnt 0,5 t CO₂/s aus der Atmosphäre und lagert es im Orbit-Lager ein · nur im Orbit' },
  researchSatellite: { name: 'Forschungssatellit', icon: '🛰️', resource: null, rate: 0, cost: 800, text: 'Erzeugt 1 Forschungspunkt/s · kein Stromverbrauch · maximal 1 Forschungssatellit pro Orbit · Baukosten: 800 t Stahl, 120 t Elektronik, 80 t Chips, 100 t Glas' },
  ironMine: { name: 'Eisenmine', icon: '🧲', resource: 'iron', rate: 0.1, cost: 20, text: '0,1 t Eisen/s' },
  titanMine: { name: 'Titanmine', icon: '⛏️', resource: 'titanOre', rate: 0.2, cost: 150, text: '0,2 t Titanerz/s · 150 t Stahl, 50 t Maschinen, 30 t Elektronik · nur auf Merkur' },
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
  moonBase: { name: 'Mondbasis', icon: '🌙', resource: null, rate: 0, cost: 300, text: '300 t Stahl · 100 t Baustoffe · Forschung erforderlich' },
  solarPlant: { name: 'Solaranlage', icon: '☀️', resource: null, rate: 0, cost: 30, text: '20 MW Strom/s · 30 t Stahl · 10 t Baustoffe · 20 t Elektronik · Forschung erforderlich' },
  crudeOilPump: { name: 'Rohölpumpe', icon: '🛢️', resource: 'crudeOil', rate: 0.01, cost: 0, text: '0,01 Liter Rohöl/s · verbraucht 2 MW/s · nur auf der Erde' },
  polymerFactory: { name: 'Polymerfabrik', icon: '🧪', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,001 L Rohöl/s · produziert 0,0005 t Polymere/s · 500 t Stahl · 500 t Baustoffe · 200 t Elektronik · Forschung erforderlich' },
  electronicsFactory: { name: 'Elektronikfabrik', icon: '💻', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,05 t Kupfer/s + 0,07 t Chips/s + 0,02 t Lithium/s · produziert 0,03 t Elektronik/s · 500 t Stahl · 300 t Baustoffe' },
  uraniumMine: { name: 'Uranmine', icon: '☢️', resource: 'uranium', rate: 0.01, cost: 300, text: '0,01 t Uran/s · 300 t Stahl · 200 t Baustoffe' },
  uraniumProcessingPlant: { name: 'Uranaufbereitungsanlage', icon: '⚗️', resource: null, rate: 0, cost: 500, text: 'verbraucht 0,02 t Uran/s · produziert 0,015 t aufbereitetes Uran/s · 500 t Stahl · 300 t Baustoffe' },
  nuclearFuelPlant: { name: 'Kernbrennstoffanlage', icon: '☢️', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,01 t aufbereitetes Uran/s · produziert 0,008 t Kernbrennstoff/s · 1.000 t Stahl · 600 t Baustoffe · 100 t Elektronik' },
  nuclearReactor: { name: 'Kernreaktor', icon: '☢️', resource: null, rate: 0, cost: 5000, text: 'verbraucht 0,01 t Kernbrennstoff/s · erzeugt 1.000 MW Strom/s · 5.000 t Stahl · 7.000 t Baustoffe · 2.000 t Elektronik' },
  chipFactory: { name: 'Chipfabrik', icon: '💾', resource: null, rate: 0, cost: 1000, text: 'verbraucht 0,1 t Lithium/s + 0,3 t Kupfer/s · produziert 0,015 t Chips/s · 1.000 t Beton · 2.000 t Baustoffe · 600 t Elektronik' },
  solarSail: { name: 'Sonnensegel', icon: '☀️', resource: null, rate: 0, cost: 5000, text: 'senkt die Temperatur von Merkur/Venus um 10 °C · 5.000 t Stahl · 10.000 t Baustoffe · 5.000 t Glas · 2.000 t Chips · 1.000 t Elektronik' },
  solarSatellite: { name: 'Solar-Satellit', icon: '🛰️', resource: null, rate: 0, cost: 20000, text: 'wird auf der Erde gebaut und anschließend mit einer Sonnensonde in den Sonnenorbit gebracht · 20.000 t Stahl · 20.000 t Baustoffe · 10.000 t Glas · 5.000 t Elektronik · 5.000 t Batterien' },
  solarProbe: { name: 'Sonnensonde', icon: '🚀', resource: null, rate: 0, cost: 15000, text: 'transportiert Solar-Satelliten von der Erde in den Sonnenorbit · 15.000 t Stahl · 5.000 t Elektronik · 2.000 t Batterien' },
  hydroelectricPlant: { name: 'Wasserkraftwerk', icon: '💧', resource: null, rate: 0, cost: 700, text: 'verbraucht 3 MW Strom · erzeugt 0,1 Liter Wasser/s aus dem Wasservorkommen der Erde · 700 t Stahl · 100 t Maschinen · 50 t Elektronik · Forschung erforderlich' },
  greenhouse: { name: 'Gewächshaus', icon: '🌱', resource: null, rate: 0, cost: 500, text: 'verbraucht 2 MW Strom und 0,01 Liter Wasser/s · produziert 0,2 t Getreide/s und 0,2 t Gemüse/s · 500 t Stahl · 20 t Polymere · 300 t Baustoffe · Forschung erforderlich' },
  foodFactory: { name: 'Lebensmittelfabrik', icon: '🥫', resource: null, rate: 0, cost: 1900, text: 'verbraucht 5 MW Strom, 0,1 t Getreide/s und 0,05 L Wasser/s · produziert 0,08 t Lebensmittel/s · Forschung erforderlich' }
};

const rocketTypes = {
  hercules1: { name: 'Herkules 1', icon: '🚀', cost: 45, capacity: 120 },
  hercules2: { name: 'Herkules 2', icon: '🚀', costSteel: 300, costBatteries: 50, costAluminium: 50, capacity: 300, compartments: 3 },
  atlas1: { name: 'Atlas 1', icon: '🚀', costSteel: 340, costChips: 150, costBatteries: 200, costAluminium: 100, capacity: 500, compartments: 3 },
  titan1: { name: 'Titan 1', icon: '🚀', costSteel: 2000, costAluminium: 300, costChips: 250, costBatteries: 200, costTitanium: 120, capacity: 1500, compartments: 3, buildTime: 120 }
};

const flightTimes = {
  mercury: 10,
  venus: 15,
  earth: 5,
  mars: 20,
  jupiter: 30,
  neptune: 60,
  luna: 10
};

function atlasFlightTime(destination) { return Math.max(1, (flightTimes[destination] || 20) - 1); }
function hasPlanetSurface(id) { return id !== 'jupiter' && id !== 'neptune' && id !== 'sun'; }
function rocketCanLand(id) { return hasPlanetSurface(id); }

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
let rocketCargoSlots = [
  { resource: 'stone', amount: 0 },
  { resource: 'iron', amount: 0 },
  { resource: 'steel', amount: 0 }
];
let planetResourcesOpen = false;

const bodies = {
  sun: { name: 'Sonne', type: 'Stern', className: 'sun', temperature: 'ca. 5.500 °C Oberfläche', resources: {}, storage: {}, buildings: { solarSatellite: 0 }, orbit: 0 },
  mercury: { name: 'Merkur', type: 'Planet', className: 'mercury', temperature: '430 °C', resources: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000, titanOre: 5000000 }, storage: {}, orbit: 150 },
  venus: { name: 'Venus', type: 'Planet', className: 'venus', temperature: '490 °C', resources: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000, co2: 100000000000000 }, atmosphere: { co2Initial: 100000000000000, pressureInitial: 92 }, storage: {}, orbit: 235 },
  earth: { name: 'Erde', type: 'Startplanet', className: 'earth', temperature: 'ca. 15 °C Durchschnitt', resources: { stone: 20000000, coal: 15000000, gas: 20000000, iron: 200000000, lithium: 2000000, crudeOil: 6000000, copperOre: 10000000, uranium: 1000000, bauxite: 10000000, water: 1000000000 }, storage: null, orbit: 320 },
  luna: { name: 'Luna', type: 'Mond der Erde', className: 'luna', temperature: 'ca. -20 °C Durchschnitt', resources: { stone: 3000000, iron: 2000000, silicon: 4000000, lithium: 6000000, helium3: 10000000, uranium: 3000000, bauxite: 10000000 }, storage: {}, orbit: 0, moonOf: 'earth', moonOrbit: 55 },
  mars: { name: 'Mars', type: 'Planet', className: 'mars', temperature: 'ca. -63 °C Durchschnitt', resources: { stone: 20000, coal: 20000, gas: 40000, uranium: 10000000, bauxite: 10000000 }, storage: {}, orbit: 405 },
  jupiter: { name: 'Jupiter', type: 'Gasplanet', className: 'jupiter', temperature: 'ca. -110 °C Wolkenobergrenze', resources: { helium3: 500000000, hydrogen: 5000000000, co2: 100000000 }, storage: {}, orbit: 515 },
  neptune: { name: 'Neptun', type: 'Reiner Gasplanet', className: 'neptune', temperature: 'ca. -200 °C Wolkenobergrenze', resources: { hydrogen: 0, helium: 0 }, atmosphere: { pressure: 108 }, storage: {}, orbit: 610 }
};

const resourceNames = { titanOre: 'Titanerz', processedTitan: 'Aufbereitetes Titan', titanium: 'Titan', bauxite: 'Bauxit', aluminiumOxide: 'Aluminiumoxid', aluminium: 'Aluminium', co2: 'CO₂', carbon: 'Kohlenstoff', oxygen: 'Sauerstoff', concrete: 'Beton', stone: 'Stein', coal: 'Kohle', gas: 'Gas', iron: 'Eisen', silicon: 'Silizium', lithium: 'Lithium', copperOre: 'Kupfererz', copper: 'Kupfer', batteries: 'Batterien', buildingMaterials: 'Baustoffe', machines: 'Maschinen', glass: 'Glas', electronics: 'Elektronik', steel: 'Stahl', hydrogen: 'Wasserstoff', helium: 'Helium', helium3: 'Helium-3', crudeOil: 'Rohöl', polymers: 'Polymere', uranium: 'Uran', processedUranium: 'Aufbereitetes Uran', nuclearFuel: 'Kernbrennstoff', chips: 'Chips', water: 'Wasser', grain: 'Getreide', vegetables: 'Gemüse', food: 'Lebensmittel' };
const resourceIcons = { titanOre: '⚙️', processedTitan: '⚗️', titanium: '🔩', bauxite: '🪨', aluminiumOxide: '⚗️', aluminium: '🥈', co2: '🌫️', carbon: '⚫', oxygen: '🫧', concrete: '🏗️', stone: '🪨', coal: '⚫', gas: '🔥', iron: '🧲', silicon: '🔷', lithium: '🔋', copperOre: '🟠', copper: '🟤', batteries: '🔋', buildingMaterials: '🧱', machines: '⚙️', glass: '🪟', electronics: '💻', steel: '🔩', hydrogen: '💨', helium: '💨', helium3: '🧪', crudeOil: '🛢️', polymers: '🧬', uranium: '☢️', processedUranium: '🧪', nuclearFuel: '⚛️', chips: '💾', water: '💧', grain: '🌾', vegetables: '🥦', food: '🥫' };

function formatTons(value) { return `${value.toFixed(2)} t`; }
function formatLargeTons(value) {
  const n = Number(value || 0);
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Billionen t`;
  return formatTons(n);
}
function venusCo2Remaining() { return Math.max(0, Number(bodies.venus?.resources?.co2 || 0)); }
function venusAtmosphericPressure() { return Math.max(0, 92 * venusCo2Remaining() / 100000000000000); }
function venusPressurePercent() { return Math.max(0, Math.min(100, venusAtmosphericPressure() / 92 * 100)); }
function venusCo2ExtractionRate(id='venus') { return Number(getBuildingsOnPlanet(id).co2Extraction || 0) * 0.25; }

function getBuildingsOnPlanet(id) {
  if (id === 'earth') return state.buildings;
  if (!bodies[id].buildings) {
    bodies[id].buildings = { foodFactory: 0, steelworks: 0, stoneQuarry: 0, buildingMaterialsFactory: 0, coalMine: 0, gasPlant: 0, co2Extraction: 0, co2ProcessingPlant: 0, orbitalCo2Extractor: 0, researchSatellite: 0, ironMine: 0, siliconMine: 0, lithiumMine: 0, copperMine: 0, copperSmelter: 0, lithiumRefinery: 0, machineFactory: 0, glassFactory: 0, heliumExtractor: 0, fusionReactor: 0, outpost: 0, coalPowerPlant: 0, solarPlant: 0, researchLab: 0, moonBase: 0, crudeOilPump: 0, polymerFactory: 0, electronicsFactory: 0, uraniumMine: 0, uraniumProcessingPlant: 0, nuclearFuelPlant: 0, nuclearReactor: 0, chipFactory: 0, solarSail: 0, solarSatellite: 0, solarProbe: 0, bauxiteMine: 0, titanMine: 0, titanProcessing: 0, titanRefinery: 0, aluminiumOxideRefinery: 0, aluminiumSmelter: 0, hydroelectricPlant: 0, greenhouse: 0 }
  }
  if (bodies[id].buildings.electronicsFactory === undefined) bodies[id].buildings.electronicsFactory = 0;
  if (bodies[id].buildings.researchSatellite === undefined) bodies[id].buildings.researchSatellite = 0;
  return bodies[id].buildings;
}
function getPlanetStorage(id) {
  if (id === 'earth') return state;
  if (!bodies[id].storage) bodies[id].storage = {};
  return bodies[id].storage;
}
function getOrbitStorage(id) {
  if (!bodies[id]) return {};
  if (!bodies[id].orbitStorage) bodies[id].orbitStorage = {};
  return bodies[id].orbitStorage;
}
function storageAmount(id, resource) { return Number(getPlanetStorage(id)[resource] || 0); }
function formatStorage(id) {
  const st = getPlanetStorage(id);
  const keys = ['stone','coal','gas','co2','carbon','oxygen','crudeOil','polymers','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','glass','electronics','steel','hydrogen','helium','helium3','uranium','processedUranium','nuclearFuel','chips','concrete','bauxite','aluminiumOxide','aluminium','titanOre','processedTitan','titanium','water','grain','vegetables','food'];
  const rows = keys.filter(k => Number(st[k] || 0) > 0.000001).map(k => `<div class="stat"><span>${resourceIcons[k] || ''} ${resourceNames[k] || k}</span><strong>${k === 'co2' ? formatLargeTons(st[k]) : k === 'water' ? Number(st[k]).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L' : formatTons(st[k])}</strong></div>`);
  return rows.length ? rows.join('') : '<p class="hint">Lager ist leer.</p>';
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
  const demand = Number(b.hydroelectricPlant || 0) * 3 + Number(b.greenhouse || 0) * 2 + foodFactoryElectricityUse(id) + crudeOilElectricityUse(id);
  return demand > 0 ? Math.min(1, electricityProduction(id) / demand) : 1;
}
function solarSatelliteElectricityProduction() { return Number(bodies.sun?.buildings?.solarSatellite || 0) * 10000; }
function electricityProduction(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 20 + fusionElectricityProduction(id) + solarElectricityProduction(id) + nuclearReactorElectricityProduction(id) + solarSatelliteElectricityProduction(); }
function coalPowerUse(id = state.selected) { return getBuildingsOnPlanet(id).coalPowerPlant * 0.0002; }
function crudeOilProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 0.01; }
function crudeOilElectricityUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).crudeOilPump || 0) * 2; }
function polymerProduction(id = state.selected) { return Number(getBuildingsOnPlanet(id).polymerFactory || 0) * 0.0005; }
function polymerOilUse(id = state.selected) { return Number(getBuildingsOnPlanet(id).polymerFactory || 0) * 0.001; }
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

function mercuryTemperature() { return Math.max(50, 430 - Number(getBuildingsOnPlanet('mercury').solarSail || 0) * 10); }
function venusTemperature() { return Math.max(50, 490 - Number(getBuildingsOnPlanet('venus').solarSail || 0) * 10); }

function totalBuildingsOnPlanet(id) { return Object.values(getBuildingsOnPlanet(id)).reduce((a, b) => a + b, 0); }


const researchTypes = {
  hydroelectricPlant: { name: 'Wasserkraftwerk', icon: '💧', category: 'Industrielle Grundlagen', cost: 800, time: 180, text: 'Schaltet das Wasserkraftwerk frei. Es verbraucht 3 MW Strom und erzeugt 0,1 Liter Wasser/s aus dem Wasservorkommen der Erde.' },
  greenhouse: { name: 'Gewächshaus', icon: '🌱', category: 'Industrielle Grundlagen', cost: 1500, time: 240, text: 'Schaltet das Gewächshaus frei. Es benötigt Strom und Wasser und produziert Getreide sowie Gemüse.' },
  foodFactory: { name: 'Lebensmittelfabrik', icon: '🥫', category: 'Industrielle Grundlagen', cost: 2500, time: 300, text: 'Schaltet die Lebensmittelfabrik frei. Verarbeitet Getreide und Wasser mit Strom zu Lebensmitteln.' },
  solarPlant: {
    name: 'Solaranlage',
    icon: '☀️',
    category: 'Industrielle Grundlagen',
    cost: 100,
    time: 120,
    text: 'Schaltet die Solaranlage frei. Die Solaranlage bleibt im Baumenü sichtbar, bis diese Forschung abgeschlossen ist.'
  },
  polymerFactory: { name: 'Polymerfabrik', icon: '🧪', category: 'Industrielle Grundlagen', cost: 2500, time: 300, text: 'Schaltet die Polymerfabrik frei. Verarbeitet Rohöl direkt zu Polymeren.' },
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
    name: 'Orbitaler CO₂-Extraktor', icon: '🛰️', category: 'Weltraumforschung', cost: 5000, time: 600,
    text: 'Schaltet den orbitalen CO₂-Extraktor frei. Er gewinnt CO₂ aus der Atmosphäre und lagert es im Orbit-Lager ein.'
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
  const groups = [
    { id: 'intro', label: '🎯 Einführung', keys: Object.keys(taskTypes).filter(key => !taskTypes[key].group) },
    { id: 'moon', label: '🌙 Griff nach dem Mond', keys: Object.keys(taskTypes).filter(key => taskTypes[key].group === 'moon') }
  ];
  const activeGroup = panel.dataset.activeTaskGroup || 'intro';
  const keys = groups.find(group => group.id === activeGroup)?.keys || groups[0].keys;
  panel.innerHTML = `
    <div class="task-tabs" role="tablist" aria-label="Aufgabengruppen">
      ${groups.map(group => `<button type="button" class="task-tab ${group.id === activeGroup ? 'active' : ''}" data-task-group="${group.id}" role="tab" aria-selected="${group.id === activeGroup}">${group.label}</button>`).join('')}
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
          <div class="task-progress-text"><span>Fortschritt</span><strong>${displayProgress} / ${target} ${t.unit}</strong></div>
          <div class="task-progress"><i style="width:${Math.min(100, progress / t.target * 100)}%"></i></div>
        </div>`;
      }).join('')}
    </div>`;
  panel.querySelectorAll('[data-task-group]').forEach(button => button.addEventListener('click', () => {
    panel.dataset.activeTaskGroup = button.dataset.taskGroup;
    renderTasks();
  }));
}
function taskProgressUpdate() {
  const changed = updateTasks();
  const panel = document.querySelector('#tasks-panel');
  if (panel && !panel.hidden) renderTasks();
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

function renderResearch() {
  const panel = document.querySelector('#research-content');
  if (!panel) return;
  const completed = state.research?.completed || {};
  const active = state.research?.active;
  const activeDef = active ? researchTypes[active.key] : null;
  const running = !!active;
  const researchedSolar = !!completed.solarPlant;
  const researchedHydroelectric = !!completed.hydroelectricPlant;
  const researchedGreenhouse = !!completed.greenhouse;
  const researchedFusion = !!completed.fusionReactor;
  const researchedNuclear = !!completed.nuclearReactor;
  const researchedCo2Processing = !!completed.co2ProcessingPlant;
  const researchedAtlas1 = !!completed.atlas1;
  const researchedTitan1 = !!completed.titan1;
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
  const remaining = active && activeDef
    ? Math.max(0, activeDef.time - (performance.now() - active.started) / 1000)
    : 0;
  const progress = active && activeDef
    ? Math.min(100, ((performance.now() - active.started) / (activeDef.time * 1000)) * 100)
    : 0;

  const orbitRows = Object.entries(bodies).map(([id, body]) => {
    const count = Number(getBuildingsOnPlanet(id).researchSatellite || 0);
    const status = count > 0 ? 'Satellit vorhanden' : (completed.researchSatellite ? 'Orbit frei' : 'Forschung erforderlich');
    return `<button type="button" class="orbit-research-row" data-orbit-target="${id}">
      <span class="orbit-research-icon">🛰️</span><span class="orbit-research-name"><strong>${body.name}</strong><small>${status}</small></span>
      <span class="orbit-research-rate ${count ? 'good' : ''}">${count ? '+1 FP/s' : '0 FP/s'}</span>
    </button>`;
  }).join('');
  panel.innerHTML = `<section class="orbit-research-overview">
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
  ${active && activeDef ? `<div class="research-active"><strong>${activeDef.icon} ${activeDef.name}</strong><small>${formatResearchTime(remaining)} verbleiben</small><div class="research-progress"><i style="width:${progress}%"></i></div></div>` : ''}

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

  <h3>4️⃣ Weltraumforschung</h3>
  <div class="research-tree">
    <div class="research-card ${!!completed.orbitalCo2Extractor ? 'research-done' : ''}">
      <div><strong>🛰️ Forschung: Orbitaler CO₂-Extraktor</strong><small>Gewinnt 0,5 t CO₂/s aus der Atmosphäre und lagert es im Orbit-Lager ein.</small><small>🧪 5.000 Forschungspunkte · ⏱️ 10:00 Minuten</small></div>
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

  panel.querySelectorAll('.research-button').forEach(btn =>
    btn.addEventListener('click', () => startResearch(btn.dataset.research))
  );
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

function startResearch(key) {
  if (!researchAvailable() || !researchTypes[key] || state.research.active || state.research.completed[key]) return;
  const r = researchTypes[key];
  if (Number(state.research.points || 0) < r.cost) return;
  if (r.chipCost && Number(state.chips || 0) < r.chipCost) return;
  state.research.points -= r.cost;
  if (r.chipCost) state.chips -= r.chipCost;
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
    version: 2,
    savedAt: new Date().toISOString(),
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
    rocketDestination
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

    Object.assign(state, data.state);
    state.buildings = { ...state.buildings, ...(data.state.buildings || {}) };
    state.bauxite = Math.max(0, Number(state.bauxite || 0));
    state.aluminiumOxide = Math.max(0, Number(state.aluminiumOxide || 0));
    state.aluminium = Math.max(0, Number(state.aluminium || 0));
    state.viewMode = data.state.viewMode === 'orbit' ? 'orbit' : 'surface';
    state.batteries = Number(data.state.batteries || 0);
    state.co2 = Number(data.state.co2 || 0);
    state.research = data.state.research || { points: 0, active: null, completed: {} };
    state.research.completed = state.research.completed || {};
    state.tasks = data.state.tasks || { completed: {}, ironMined: 0, steelProduced: 0 };
    state.tasks.completed = state.tasks.completed || {};
    state.tasks.ironMined = Number(state.tasks.ironMined || 0);
    state.tasks.steelProduced = Number(state.tasks.steelProduced || 0);
    state.tasks.lunaFlights = Number(state.tasks.lunaFlights || 0);
    state.lastUpdate = performance.now();
    Object.assign(bodies, data.bodies);
    orbitMissions.splice(0, orbitMissions.length, ...(Array.isArray(data.orbitMissions) ? data.orbitMissions : []));
    orbitMissionCounter = Math.max(1, Number(data.orbitMissionCounter) || 1);
    // Laufende Missionen werden aus gespeicherten Zeitstempeln rekonstruiert, nicht neu gestartet.
    orbitMissions.forEach(m => { if (m.status === 'outbound' || m.status === 'returning') m.lastTick = Date.now(); });
    // Neue Rohstoffvorkommen aus späteren Spielversionen auch in alten Spielständen ergänzen.
    const defaultResources = {
      mercury: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000 },
      earth: { coal: 15000000, gas: 20000000, lithium: 30000, copperOre: 10000000, crudeOil: 6000000, uranium: 1000000, bauxite: 10000000, water: 1000000000 },
      luna: { stone: 3000000, lithium: 6000000, helium3: 10000000, uranium: 3000000, bauxite: 10000000 },
      venus: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000, co2: 100000000000000 },
      jupiter: { helium3: 500000000, hydrogen: 5000000000, co2: 100000000 },
      mars: { uranium: 10000000, bauxite: 10000000 }
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
    // Erd-Rohstoffvorkommen auf neue Gesamtmengen migrieren und bereits abgebaute Mengen erhalten.
    if (bodies.earth?.resources && !bodies.earth.resourceDepositUpgrade20261010) {
      const earthDeposits = [
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
    state.buildings.uraniumMine = Number(state.buildings.uraniumMine || 0);
    state.buildings.uraniumProcessingPlant = Number(state.buildings.uraniumProcessingPlant || 0);
    state.buildings.nuclearFuelPlant = Number(state.buildings.nuclearFuelPlant || 0);
    state.buildings.nuclearReactor = Number(state.buildings.nuclearReactor || 0);
    state.buildings.chipFactory = Number(state.buildings.chipFactory || 0);
    state.buildings.solarSail = Number(state.buildings.solarSail || 0);
    state.buildings.solarSatellite = Number(state.buildings.solarSatellite || 0);
    state.buildings.researchSatellite = Number(state.buildings.researchSatellite || 0);
    state.buildings.solarProbe = Number(state.buildings.solarProbe || 0);
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
       body.buildings.co2Extraction = Number(body.buildings.co2Extraction || 0);
      body.buildings.co2ProcessingPlant = Number(body.buildings.co2ProcessingPlant || 0);
       body.buildings.heliumExtractor = Number(body.buildings.heliumExtractor || 0);
       body.buildings.fusionReactor = Number(body.buildings.fusionReactor || 0);
       body.buildings.researchLab = Number(body.buildings.researchLab || 0);
       body.buildings.solarPlant = Number(body.buildings.solarPlant || 0);
       body.buildings.outpost = Number(body.buildings.outpost || 0);
       body.buildings.moonBase = Number(body.buildings.moonBase || 0);
       body.buildings.crudeOilPump = Number(body.buildings.crudeOilPump || 0);
       body.buildings.polymerFactory = Number(body.buildings.polymerFactory || 0);
       body.buildings.uraniumMine = Number(body.buildings.uraniumMine || 0);
       body.buildings.uraniumProcessingPlant = Number(body.buildings.uraniumProcessingPlant || 0);
       body.buildings.nuclearFuelPlant = Number(body.buildings.nuclearFuelPlant || 0);
       body.buildings.nuclearReactor = Number(body.buildings.nuclearReactor || 0);
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
      ? data.rocketCargoSlots.slice(0, 3).map(s => ({ resource: s.resource || 'stone', amount: Number(s.amount) || 0 }))
      : [{ resource: 'stone', amount: 0 }, { resource: 'iron', amount: 0 }, { resource: 'steel', amount: 0 }];
    while (rocketCargoSlots.length < 3) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
    rocketDestination = data.rocketDestination || 'mars';

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

function restartGame() {
  localStorage.removeItem(SAVE_KEY);
  localStorage.removeItem(LEGACY_SAVE_KEY);
  localStorage.removeItem(BACKUP_SAVE_KEY);
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
  const angles = { sun: 0, mercury: 25, venus: 150, earth: 250, mars: 70, jupiter: 145, neptune: 210 };
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
  const a = id === 'luna' ? 225 * Math.PI / 180 : (({ mercury:25, venus:150, earth:250, mars:70, jupiter:145 }[id] || 0) * Math.PI / 180);
  const offset = id === 'luna' ? 28 : Math.max(34, Number(bodies[id]?.className === 'jupiter' ? 42 : 30));
  return { x: p.x + Math.cos(a) * offset, y: p.y + Math.sin(a) * offset };
}

function updateRocketVisuals(now = performance.now()) {
  const layer = document.querySelector('#rocket-layer');
  if (!layer) return;
  layer.innerHTML = '';
  for (const rocket of rockets) {
    if (rocket.status === 'returned') continue;
    const fromId = rocket.status === 'returning' ? (rocket.fromReturn || rocket.from) : rocket.from;
    const toId = rocket.to;
    if (!bodies[fromId] || !bodies[toId]) continue;

    let start = rocketBodyPoint(fromId);
    let end = rocketOrbitPoint(toId);
    let progress = 1;
    if (rocket.status === 'outbound' || rocket.status === 'returning') {
      const elapsed = Math.max(0, now - Number(rocket.started || now));
      progress = Math.min(1, rocket.duration > 0 ? elapsed / rocket.duration : 1);
      if (rocket.status === 'returning') {
        start = rocketOrbitPoint(fromId);
        end = rocketBodyPoint(toId);
      }
    } else if (rocket.status === 'landed') {
      end = rocketBodyPoint(toId);
    }

    const x = start.x + (end.x - start.x) * progress;
    const y = start.y + (end.y - start.y) * progress;
    const el = document.createElement('div');
    el.className = `rocket-marker rocket-${rocket.status}`;
    el.textContent = rocket.type === 'atlas1' ? '🚀' : '🚀';
    el.title = `${rocket.name}: ${bodies[fromId].name} → ${bodies[toId].name}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    layer.appendChild(el);
  }
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

  const angles = { sun: 0, mercury: 25, venus: 150, earth: 250, mars: 70, jupiter: 145, neptune: 210 };

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

  const rocketLayer = document.createElement('div');
  rocketLayer.id = 'rocket-layer';
  rocketLayer.setAttribute('aria-label', 'Raketenverkehr');
  solarSystem.appendChild(rocketLayer);
  updateRocketVisuals();

  // Das Baumenü wird nur geöffnet, wenn der Spieler auf das 🏗️-Symbol tippt.
  if (state.selected !== 'sun' && state.buildMenuOpen) {
    const menu = document.createElement('div');
    menu.className = 'planet-build-menu';
    menu.innerHTML = `<div class="planet-build-header"><div class="planet-build-title">🏗️ Gebäude auf ${bodies[state.selected].name}</div><button type="button" class="build-menu-close" id="close-build-menu" aria-label="Gebäudemenü schließen">✕</button></div>
      <div class="build-card steelworks-card"><div><strong>🏭 Stahlwerk</strong><small>0,2 t Stahl/s · verbraucht 0,2 t Eisen/s · ${state.selected === 'earth' ? '1. kostenlos · 2. und 3. je 4 t Stahl · ab dem 4. je 20 t Stahl' : 'erstes kostenlos · weitere 20 t Stahl'}</small></div><button class="build-resource" id="build-steelworks-floating" ${(Number(getPlanetStorage(state.selected).steel || 0) >= (state.selected === 'earth' ? (getBuildingsOnPlanet(state.selected).steelworks === 0 ? 0 : getBuildingsOnPlanet(state.selected).steelworks < 3 ? 4 : 20) : (getBuildingsOnPlanet(state.selected).steelworks === 0 ? 0 : 20))) ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).steelworks})</button></div>
      ${buildButton('stoneQuarry')}
      ${buildButton('buildingMaterialsFactory')}
      ${buildButton('coalMine')}
      ${buildButton('gasPlant')}
      ${buildButton('co2Extraction')}
      ${buildButton('co2ProcessingPlant')}
      ${buildButton('ironMine')}
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
      ${buildButton('foodFactory')}
      ${buildButton('moonBase')}
      ${buildButton('crudeOilPump')}
      ${buildButton('uraniumMine')}
      ${buildButton('uraniumProcessingPlant')}
      ${buildButton('nuclearFuelPlant')}
      ${buildButton('nuclearReactor')}
      ${buildButton('chipFactory')}
      ${buildButton('electronicsFactory')}
      ${buildButton('solarSail')}
      ${state.selected === 'earth' ? buildButton('solarSatellite') : ''}
      ${state.selected === 'earth' ? buildButton('solarProbe') : ''}
      ${state.selected === 'earth' ? `<div class="build-card research-lab-card"><div><strong>🔬 Forschungslabor</strong><small>Nur auf der Erde · benötigt Baustoffe, Glas und Elektronik · Kostenmengen werden noch festgelegt</small></div><button class="build-resource" id="build-research-lab" ${getBuildingsOnPlanet('earth').researchLab ? 'disabled' : ''}>${getBuildingsOnPlanet('earth').researchLab ? 'Gebaut' : 'Bauen'}</button></div>` : ''}
      <div class="build-card"><div><strong>⚡ Kohlekraftwerk</strong><small>20 MW Strom/s · verbraucht 0,0002 t Kohle/s · 90 t Stahl</small></div><button class="build-resource" id="build-coal-power" ${Number(getPlanetStorage(state.selected).steel || 0) >= 90 ? '' : 'disabled'}>Bauen (${getBuildingsOnPlanet(state.selected).coalPowerPlant})</button></div>
      <div class="build-card rocket-factory-card"><div><strong>🏭 Raketenfabrik</strong><small>1.000 t Stahl · 2.000 t Baustoffe · 60 Sekunden Bauzeit · Voraussetzung für alle Raketen · Produktionswarteschlange</small>${rocketFactoryBuildQueue[state.selected] ? `<div class="rocket-progress"><i style="width:${Math.min(100,(performance.now()-(rocketFactoryBuildStarted[state.selected]||performance.now()))/60000*100)}%"></i></div><small>Fertigstellung: ${Math.max(0,60-(performance.now()-(rocketFactoryBuildStarted[state.selected]||performance.now()))/1000).toFixed(1)} s</small>` : ''}</div><button class="build-resource" id="build-rocket-factory" ${getBuildingsOnPlanet(state.selected).rocketFactory || rocketFactoryBuildQueue[state.selected] || !isBuildingAllowed('rocketFactory', state.selected) || Number(getPlanetStorage(state.selected).steel || 0) < 1000 || Number(getPlanetStorage(state.selected).buildingMaterials || 0) < 2000 ? 'disabled' : ''}>${getBuildingsOnPlanet(state.selected).rocketFactory ? 'Gebaut' : rocketFactoryBuildQueue[state.selected] ? 'Im Bau' : 'Bauen'}</button></div>
      <div class="build-card landing-pad-card"><div><strong>🛬 Start- & Landerampe</strong><small>2.000 t Stahl · 3.000 t Baustoffe · 500 t Maschinen · 300 t Batterien · eine Rampe pro gleichzeitig möglichem Start/Landung · auf allen Planeten</small></div><button class="build-resource" id="build-landing-pad" ${!isBuildingAllowed('landingPad', state.selected) || Number(getPlanetStorage(state.selected).steel || 0) < 2000 || Number(getPlanetStorage(state.selected).buildingMaterials || 0) < 3000 || Number(getPlanetStorage(state.selected).machines || 0) < 500 || Number(getPlanetStorage(state.selected).batteries || 0) < 300 ? 'disabled' : ''}>Bauen (${getBuildingsOnPlanet(state.selected).landingPad || 0})</button></div>
      <div class="build-card outpost-card"><div><strong>🛰️ Außenposten</strong><small>100 t Stahl · 60 Sekunden Bauzeit · maximal 1 pro Planet · Voraussetzung für weitere Gebäude auf allen Außenplaneten</small></div><button class="build-resource" id="build-outpost" ${getBuildingsOnPlanet(state.selected).outpost || outpostBuildQueue[state.selected] || Number(getPlanetStorage(state.selected).steel || 0) < 100 ? 'disabled' : ''}>Bauen (${getBuildingsOnPlanet(state.selected).outpost ? 'Gebaut' : 'Bauen'})</button></div>
      `;

    // Gebäudeübersicht Konzept 1.1: planetenabhängige, durchsuchbare Kategorien.
    const buildCategories = [
      { title: '⛏️ Rohstoffgewinnung', keys: ['titanMine','ironMine','stoneQuarry','coalMine','gasPlant','siliconMine','lithiumMine','copperMine','heliumExtractor','crudeOilPump','uraniumMine','bauxiteMine'] },
      { title: '🌱 Landwirtschaft & Versorgung', keys: ['greenhouse','hydroelectricPlant'] },
      { title: '🏭 Verarbeitung & Industrie', keys: ['titanProcessing','titanRefinery','steelworks','buildingMaterialsFactory','co2ProcessingPlant','aluminiumOxideRefinery','aluminiumSmelter','copperSmelter','lithiumRefinery','machineFactory','glassFactory','electronicsFactory','chipFactory','polymerFactory','foodFactory','uraniumProcessingPlant','nuclearFuelPlant'] },
      { title: '⚡ Energie & Forschung', keys: ['coalPowerPlant','solarPlant','fusionReactor','nuclearReactor','researchLab'] },
      { title: '🚀 Raumfahrt & Infrastruktur', keys: ['co2Extraction','moonBase','solarSail','outpost','rocketFactory','landingPad','solarSatellite','solarProbe'] },
      { title: '🛰️ Orbit-Gebäude', keys: ['orbitalCo2Extractor','researchSatellite'] }
    ];
    const specialKeys = {
      'build-steelworks-floating':'steelworks', 'build-coal-power':'coalPowerPlant',
      'build-research-lab':'researchLab', 'build-rocket-factory':'rocketFactory',
      'build-landing-pad':'landingPad', 'build-outpost':'outpost'
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
      if (key && !isBuildingAllowed(key, state.selected)) {
        card.classList.add('build-unavailable');
        card.dataset.unavailable = 'true';
        const small = card.querySelector('small');
        if (small && !small.textContent.includes('Auf diesem Planeten nicht verfügbar')) small.textContent += ' · Auf diesem Planeten nicht verfügbar';
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
        const detail = document.createElement('div'); detail.className = 'building-details'; detail.hidden = true;
        const timeMatch = desc.match(/(?:Bauzeit|Bauzeit:?)\s*([^·]+)/i);
        const reqMatch = desc.match(/(?:Voraussetzung|benötigt|nur auf|nur Erde|nur Venus|nur Merkur|nur auf der Erde)[^·]*/i);
        detail.innerHTML = `<div><strong>Bauzeit:</strong> ${timeMatch ? timeMatch[1].trim() : 'Keine separate Bauzeit in den Gebäudedaten hinterlegt.'}</div><div><strong>Voraussetzungen:</strong> ${reqMatch ? reqMatch[0].trim() : (card.dataset.unavailable ? 'Auf diesem Planeten nicht verfügbar.' : 'Keine zusätzliche Voraussetzung in der Gebäudebeschreibung angegeben.')}</div><div><strong>Beschreibung:</strong> ${desc || 'Keine Beschreibung hinterlegt.'}</div><div><strong>Ausbau & Skalierung:</strong> Bestehende Produktions- und Verbrauchsregeln bleiben unverändert; weitere Angaben werden nur angezeigt, wenn sie in den vorhandenen Gebäudedaten hinterlegt sind.</div>`;
        const actions = document.createElement('div'); actions.className = 'building-card-actions';
        const buildBtn = card.querySelector('.build-resource');
        const detailsBtn = document.createElement('button'); detailsBtn.type = 'button'; detailsBtn.className = 'building-details-toggle'; detailsBtn.textContent = 'Details';
        detailsBtn.addEventListener('click', () => { detail.hidden = !detail.hidden; detailsBtn.textContent = detail.hidden ? 'Details' : 'Details schließen'; });
        if (buildBtn) { buildBtn.classList.add('building-build-action'); actions.appendChild(buildBtn); }
        actions.appendChild(detailsBtn);
        const demolishBtn = document.createElement('button');
        demolishBtn.type = 'button'; demolishBtn.className = 'building-demolish-action'; demolishBtn.textContent = 'Abriss (50 %)';
        demolishBtn.disabled = !key || Number(getBuildingsOnPlanet(state.selected)[key] || 0) < 1;
        demolishBtn.title = 'Gebäude abreißen; 50 % der hinterlegten Baukosten gehen zurück ins Lager dieses Planeten.';
        demolishBtn.addEventListener('click', () => {
          if (!key) { alert('Für dieses Gebäude ist kein Abriss hinterlegt.'); return; }
          demolishBuilding(key, state.selected);
        });
        actions.appendChild(demolishBtn);
        card.appendChild(actions); card.appendChild(detail); content.appendChild(card);
      });
      heading.addEventListener('click', () => {
        const opening = content.hidden;
        groups.forEach(g => { g.content.hidden = true; g.heading.setAttribute('aria-expanded','false'); g.heading.querySelector('.building-category-arrow').textContent = '▸'; });
        content.hidden = !opening; heading.setAttribute('aria-expanded', String(opening)); heading.querySelector('.building-category-arrow').textContent = opening ? '▾' : '▸';
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
    [search, production, consumption, showUnavailable].forEach(el => el.addEventListener('input', updateBuildingFilters));
    [production, consumption, showUnavailable].forEach(el => el.addEventListener('change', updateBuildingFilters));
    updateBuildingFilters();
    if (groups.length) { groups[0].content.hidden = false; groups[0].heading.setAttribute('aria-expanded','true'); groups[0].heading.querySelector('.building-category-arrow').textContent = '▾'; }

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
    menu.querySelector('#build-rocket-factory').addEventListener('click', buildRocketFactory);
    menu.querySelector('#build-landing-pad').addEventListener('click', buildLandingPad);
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
        'stone','coal','gas','crudeOil','polymers','co2','carbon','oxygen','iron','steel','silicon','lithium',
        'copperOre','copper','batteries','buildingMaterials','machines',
        'glass','electronics','hydrogen','helium','helium3','uranium','processedUranium','nuclearFuel','bauxite','aluminiumOxide','aluminium','titanOre','processedTitan','titanium','water','grain','vegetables','food'
      ];
      const makeEntries = (store, isOrbit) => resourceKeys
        .filter(key => Number(store[key] || 0) > 0.000001)
        .map(key => {
          const amount = store[key];
          const isLiquid = key === 'crudeOil' || key === 'water';
          const value = isLiquid
            ? Number(amount).toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L'
            : formatTons(Number(amount));
          return `<span class="planet-resource-value" data-resource-key="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}: <strong>${value}</strong></span>`;
        }).join('');
      const entries = makeEntries(storage, false);
      const orbitStorage = getOrbitStorage(id);
      const orbitEntries = makeEntries(orbitStorage, true);
      if (!entries && !orbitEntries) return '';

      return `${entries ? `<div class="planet-resource-line" data-planet-id="${id}"><strong class="planet-resource-name">🪐 ${body.name} · Planetlager</strong><div class="planet-resource-values">${entries}</div></div>` : ''}
      ${orbitEntries ? `<div class="planet-resource-line" data-planet-id="${id}" data-orbit-storage="true"><strong class="planet-resource-name">🛰️ ${body.name} · Orbit-Lager</strong><div class="planet-resource-values">${orbitEntries}</div></div>` : ''}`;
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

function refreshTopResourceValues() {
  const table = document.querySelector('#planet-resources-dropdown .planet-resource-table');
  if (!table) return;

  table.querySelectorAll('.planet-resource-line').forEach(line => {
    const id = line.dataset.planetId;
    if (!id || !bodies[id]) return;
    const storage = line.dataset.orbitStorage === 'true' ? getOrbitStorage(id) : getPlanetStorage(id);
    line.querySelectorAll('[data-resource-key]').forEach(el => {
      const key = el.dataset.resourceKey;
      const amount = Number(storage[key] || 0);
      if (amount <= 0.000001) {
        el.hidden = true;
        return;
      }
      el.hidden = false;
      const isLiquid = key === 'crudeOil' || key === 'water';
      const value = isLiquid
        ? amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L'
        : formatTons(amount);
      const strong = el.querySelector('strong');
      if (strong) strong.textContent = value;
    });
  });
}

function resourceRows(body) {
  const entries = Object.entries(body.resources);
  if (!entries.length) return '<p class="hint">Keine abbaubaren Rohstoffe.</p>';
  return entries.map(([key, amount]) => `<div class="stat"><span>${resourceIcons[key] || ''} ${resourceNames[key] || key}</span><strong>${['crudeOil','water'].includes(key) ? amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' L' : amount.toLocaleString('de-DE', { maximumFractionDigits: 2 }) + ' t'}</strong></div>`).join('');
}

function buildingCost(key, planetId = state.selected) {
  const b = buildingTypes[key];
  const count = Number(getBuildingsOnPlanet(planetId)[key] || 0);
  // Erde: Eisenminen 1–5 kosten je 3 t Stahl, ab der 6. Mine je 20 t.
  if (key === 'ironMine' && planetId === 'earth') return count < 5 ? 3 : 20;
  return b.cost;
}

function isBuildingAllowed(key, planetId = state.selected) {
  // Merkur und Venus bleiben bis 50 °C vollständig gesperrt; nur Sonnensegel sind vorher erlaubt.
  if (planetId === 'mercury' && mercuryTemperature() > 50 && key !== 'solarSail' && key !== 'co2ProcessingPlant') return false;
  if (planetId === 'venus' && venusTemperature() > 50 && key !== 'solarSail' && key !== 'co2Extraction' && key !== 'co2ProcessingPlant') return false;
  // Sonnensegel gibt es auf Merkur und Venus.
  if (key === 'solarSail' && !['mercury','venus'].includes(planetId)) return false;
  if (key === 'co2Extraction' && planetId !== 'venus') return false;
  if (key === 'orbitalCo2Extractor') {
    if (state.viewMode !== 'orbit' && hasPlanetSurface(planetId)) return false;
    if (Number(bodies[planetId]?.resources?.co2 || 0) <= 0) return false;
  }
  if (key === 'researchSatellite') {
    if (state.viewMode !== 'orbit') return false;
    if (Number(getBuildingsOnPlanet(planetId).researchSatellite || 0) >= 1) return false;
    if (!state.research?.completed?.researchSatellite) return false;
  }
  if (key === 'bauxiteMine' && !['earth','luna','mars'].includes(planetId)) return false;
  if (key === 'titanMine' && planetId !== 'mercury') return false;
  if (['aluminiumOxideRefinery','aluminiumSmelter'].includes(key) && planetId === 'sun') return false;
  // CO₂-Verarbeitung kann auf allen Planeten außer der Sonne gebaut werden.
  if (key === 'co2ProcessingPlant' && planetId === 'sun') return false;
  if (key === 'co2ProcessingPlant' && !state.research?.completed?.co2ProcessingPlant) return false;
  if (key === 'polymerFactory' && !state.research?.completed?.polymerFactory) return false;
  if ((key === 'solarSatellite' || key === 'solarProbe') && planetId !== 'earth') return false;
  // Die Mondbasis darf auf allen Planeten außer Sonne und Erde gebaut werden.
  if (key === 'moonBase' && ['sun', 'earth'].includes(planetId)) return false;
  if (planetId === 'sun') return false;
  if (key === 'landingPad') return planetId !== 'sun';
  if (key !== 'nuclearReactor' && key !== 'orbitalCo2Extractor' && key !== 'researchSatellite' && planetId !== 'earth' && key !== 'outpost' && Number(getBuildingsOnPlanet(planetId).outpost || 0) < 1) return false;
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
  const b = buildingTypes[key];
  const count = getBuildingsOnPlanet(state.selected)[key];
  const storage = getPlanetStorage(state.selected);

  if (key === 'polymerFactory') {
    const researched = !!state.research?.completed?.polymerFactory;
    const affordable = researched && Number(storage.steel || 0) >= 500 && Number(storage.buildingMaterials || 0) >= 500 && Number(storage.electronics || 0) >= 200 && isBuildingAllowed(key);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Polymerfabrik“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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
    const affordable = isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · kostenlos (vorerst)</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
  }

  if (['titanMine','titanProcessing','titanRefinery'].includes(key)) {
    const costs = key === 'titanMine' ? {steel:150,machines:50,electronics:30} : key === 'titanProcessing' ? {steel:250,machines:100,electronics:50} : {steel:400,machines:150,electronics:100};
    const affordable = Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount) && isBuildingAllowed(key) && (key !== 'titanMine' || Number(bodies[state.selected]?.resources?.titanOre || 0) > 0);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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

  if (key === 'electronicsFactory') {
    const affordable = Number(storage.steel || 0) >= 500 &&
      Number(storage.buildingMaterials || 0) >= 300 && isBuildingAllowed(key);
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count})</button></div>`;
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
    const storage = getPlanetStorage(state.selected);
    const costs = { aluminium: 50, polymers: 40, chips: 20, steel: 190 };
    const affordable = researched && isBuildingAllowed(key) && Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount);
    const status = researched ? '' : ' · Voraussetzung: Forschung „Orbitaler CO₂-Extraktor“';
    return `<div class="build-card"><div><strong>${b.icon} ${b.name}</strong><small>${b.text} · Kosten: 50 t Aluminium, 40 t Polymere, 20 t Chips, 190 t Stahl${status}</small></div><button class="build-resource" data-building="${key}" ${affordable ? '' : 'disabled'}>Bauen (${count || 0})</button></div>`;
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
    ${body.atmosphere?.pressure ? `<div class="stat"><span>Atmosphärendruck</span><strong>${body.atmosphere.pressure} bar</strong></div>` : ''}
    ${renderPlanetViewSwitch()}
    <h3>🛰️ Orbitalstatus</h3>
    <div class="stat"><span>Raketen im Orbit</span><strong>${orbitalLanded.length}</strong></div>
    <div class="stat"><span>Raketen auf Oberfläche</span><strong>${landed.length}</strong></div>
    <div class="stat"><span>Gesamt im Raumverkehr</span><strong>${orbitalRockets.length}</strong></div>
    <div class="stat"><span>🛰️ Forschungssatellit</span><strong>${Number(getBuildingsOnPlanet(state.selected).researchSatellite || 0)}/1 · +${Number(getBuildingsOnPlanet(state.selected).researchSatellite || 0)} FP/s</strong></div>
    <hr><h3>🚀 Raumverkehr</h3>${rocketList}
    <hr>${renderRocketWindow(body)}`;
}

function renderInfo() {
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
    bindRocketControls();
    bindPlanetViewControls();
    applyLanguage();
    return;
  }
  infoPanel.innerHTML = `<h2>${state.selected === 'earth' ? '🌍' : '🪐'} ${body.name}</h2><p class="hint">${body.type}</p>${renderPlanetViewSwitch()}<div class="stat"><span>Temperatur</span><strong>${state.selected === 'mercury' ? mercuryTemperature().toFixed(0) + ' °C' : state.selected === 'venus' ? venusTemperature().toFixed(0) + ' °C' : body.temperature}</strong></div>${state.selected === 'venus' ? `<h3>🌫️ Venus-Atmosphäre</h3><div class="stat"><span>Atmosphärendruck</span><strong>${venusAtmosphericPressure().toFixed(1)} bar</strong></div><div class="stat"><span>CO₂ in Atmosphäre</span><strong>${formatLargeTons(venusCo2Remaining())}</strong></div><div class="atmosphere-bar" aria-label="Atmosphärendruck"><i style="width:${venusPressurePercent()}%"></i></div><div class="hint">Gasabbau senkt den Atmosphärendruck direkt.</div>` : ''}<h3>🌐 Rohstoffe auf dem Planeten</h3>${resourceRows(body)}<h3>📦 Lager auf ${body.name}</h3>${formatStorage(state.selected)}<hr><h3>🏭 Gebäude auf ${body.name}</h3><div class="stat"><span>Gebäude gesamt</span><strong>${totalBuildingsOnPlanet(state.selected)}</strong></div><div class="stat"><span>Eisenproduktion</span><strong>${formatTons(ironProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumproduktion</span><strong>${formatTons(siliconProduction(state.selected))}/s</strong></div><div class="stat"><span>Siliziumverbrauch</span><strong>${formatTons(siliconUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Lithiumproduktion (Mine)</span><strong>${formatTons(lithiumProduction(state.selected))}/s</strong></div><div class="stat"><span>🟠 Kupfererzproduktion (Mine)</span><strong>${formatTons(copperProduction(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch</span><strong>${formatTons(copperSmeltingUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferproduktion</span><strong>${formatTons(copperSmeltingProduction(state.selected))}/s</strong></div><div class="stat"><span>Lithiumverbrauch</span><strong>${formatTons(lithiumRefineryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch für Batterien</span><strong>${formatTons(lithiumRefineryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>🔋 Batterieproduktion</span><strong>${formatTons(batteryProduction(state.selected))}/s</strong></div><div class="stat"><span>🧱 Baustoffe im Lager</span><strong>${formatTons(Number(localStorage.buildingMaterials || 0))}</strong></div><div class="stat"><span>🧱 Baustoffproduktion</span><strong>${formatTons(buildingMaterialsProduction(state.selected))}/s</strong></div><div class="stat"><span>🪨 Baustoffverbrauch Stein</span><strong>${formatTons(buildingMaterialsStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactorySteelUse(state.selected))}/s</strong></div><div class="stat"><span>Kupferverbrauch Maschinenfabrik</span><strong>${formatTons(machineFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>Maschinenproduktion</span><strong>${formatTons(machineProduction(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Silizium</span><strong>${formatTons(glassFactorySiliconUse(state.selected))}/s</strong></div><div class="stat"><span>Glasverbrauch Stein</span><strong>${formatTons(glassFactoryStoneUse(state.selected))}/s</strong></div><div class="stat"><span>Glasproduktion</span><strong>${formatTons(glassProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranproduktion</span><strong>${formatTons(uraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Uranverbrauch Aufbereitung</span><strong>${formatTons(processedUraniumUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>🧪 Aufbereitetes Uran</span><strong>${formatTons(processedUraniumProduction(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffverbrauch</span><strong>${formatTons(nuclearFuelProcessedUraniumUse(state.selected))}/s</strong></div><div class="stat"><span>⚛️ Kernbrennstoffproduktion</span><strong>${formatTons(nuclearFuelProduction(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Verbrauch</span><strong>${formatTons(nuclearReactorNuclearFuelUse(state.selected))}/s</strong></div><div class="stat"><span>☢️ Kernreaktor-Strom</span><strong>${nuclearReactorElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>💾 Chipfabrik Lithiumverbrauch</span><strong>${formatTons(chipFactoryLithiumUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipfabrik Kupferverbrauch</span><strong>${formatTons(chipFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>💾 Chipproduktion</span><strong>${formatTons(chipProduction(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikproduktion</span><strong>${formatTons(electronicsProduction(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Kupferverbrauch</span><strong>${formatTons(electronicsFactoryCopperUse(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Chipverbrauch</span><strong>${formatTons(electronicsFactoryChipUse(state.selected))}/s</strong></div><div class="stat"><span>💻 Elektronikfabrik Lithiumverbrauch</span><strong>${formatTons(electronicsFactoryLithiumUse(state.selected))}/s</strong></div>${['mercury','venus'].includes(state.selected) ? `<div class="stat"><span>☀️ Sonnensegel</span><strong>${getBuildingsOnPlanet(state.selected).solarSail}</strong></div><div class="stat"><span>🌡️ Kühlung</span><strong>-${getBuildingsOnPlanet(state.selected).solarSail * 10} °C</strong></div><div class="stat"><span>🔒 Gebäude-Freigabe</span><strong>${(state.selected === 'mercury' ? mercuryTemperature() : venusTemperature()) <= 50 ? 'freigegeben' : 'nur Sonnensegel'}</strong></div>` : ''}<div class="stat"><span>Helium-3-Produktion</span><strong>${formatTons(helium3Production(state.selected))}/s</strong></div><div class="stat"><span>Helium-3-Verbrauch Fusionsreaktor</span><strong>${formatTons(fusionHelium3Use(state.selected))}/s</strong></div><div class="stat"><span>Fusionsstrom</span><strong>${fusionElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Solarstrom</span><strong>${solarElectricityProduction(state.selected).toFixed(2)} MW/s</strong></div>${state.selected === 'earth' ? `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse('earth'))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction('earth'))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction('earth').toFixed(2)} MW/s</strong></div><h3>☀️ Sonnenorbit-Programm</h3><div class="stat"><span>🛰️ Solar-Satelliten auf Erde</span><strong>${getBuildingsOnPlanet('earth').solarSatellite || 0}</strong></div><div class="stat"><span>🚀 Sonnensonden</span><strong>${getBuildingsOnPlanet('earth').solarProbe || 0}</strong></div><div class="stat"><span>🛰️ Im Sonnenorbit</span><strong>${bodies.sun.buildings?.solarSatellite || 0}</strong></div>${solarProbeFlights.length ? `<div class="stat"><span>🚀 Sonnensonden im Flug</span><strong>${solarProbeFlights.length}</strong></div>` : ''}<button id="launch-solar-satellite" ${getBuildingsOnPlanet('earth').solarSatellite > 0 && getBuildingsOnPlanet('earth').solarProbe > 0 && state.research?.completed?.solarSatellite && state.research?.completed?.solarProbe ? '' : 'disabled'}>🚀 Solar-Satellit zur Sonne starten</button>` : `<div class="stat"><span>Eisenverbrauch</span><strong>${formatTons(ironUse(state.selected))}/s</strong></div><div class="stat"><span>Stahlproduktion</span><strong>${formatTons(steelProduction(state.selected))}/s</strong></div><div class="stat"><span>Stromproduktion</span><strong>${electricityProduction(state.selected).toFixed(2)} MW/s</strong></div><div class="stat"><span>Rohölproduktion</span><strong>${crudeOilProduction(state.selected).toFixed(2)} L/s</strong></div><div class="stat"><span>Rohölverbrauch</span><strong>${polymerOilUse(state.selected).toFixed(3)} L/s</strong></div><div class="stat"><span>Polymerproduktion</span><strong>${formatTons(polymerProduction(state.selected))}/s</strong></div><div class="stat"><span>Rohölpumpen-Stromverbrauch</span><strong>${crudeOilElectricityUse(state.selected).toFixed(2)} MW/s</strong></div>`}<hr>${renderRocketWindow(body)}`;
  bindRocketControls();
  bindPlanetViewControls();
  const launchButton = document.querySelector('#launch-solar-satellite');
  if (launchButton) launchButton.addEventListener('click', launchSolarSatellite);
  applyLanguage();
}

function launchSolarSatellite() {
  const earth = getBuildingsOnPlanet('earth');
  if (!state.research?.completed?.solarSatellite || !state.research?.completed?.solarProbe) return;
  if (Number(earth.solarSatellite || 0) < 1 || Number(earth.solarProbe || 0) < 1) return;
  earth.solarSatellite--;
  earth.solarProbe--;
  solarProbeFlights.push({ started: Date.now(), duration: 60 });
  playUiSound('build');
  renderInfo(); renderTopResources(); saveAfterBuild();
}

function updateSolarProbeFlights() {
  const now = Date.now();
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

function demolishBuilding(key, planetId = state.selected) {
  const buildings = getBuildingsOnPlanet(planetId);
  const count = Number(buildings[key] || 0);
  if (!count) return;
  const name = buildingTypes[key]?.name || key;
  if (!confirm(`${name} auf ${bodies[planetId].name} abreißen?\n50 % der hinterlegten Baukosten werden in das Lager dieses Planeten zurückgezahlt.`)) return;

  const storage = getPlanetStorage(planetId);
  const refunds = {};
  const addRefund = (resource, amount) => {
    if (amount > 0) refunds[resource] = (refunds[resource] || 0) + amount * 0.5;
  };
  // Kosten werden anhand der tatsächlich verwendeten Bau-Logik zurückerstattet.
  const costs = {
    orbitalCo2Extractor: { aluminium: 50, polymers: 40, chips: 20, steel: 190 },
    researchSatellite: { steel: 800, electronics: 120, chips: 80, glass: 100 },
    polymerFactory: { steel: 500, buildingMaterials: 500, electronics: 200 },
    moonBase: { steel: 300, buildingMaterials: 100 },
    uraniumMine: { steel: 300, buildingMaterials: 200 },
    uraniumProcessingPlant: { steel: 500, buildingMaterials: 300 },
    nuclearFuelPlant: { steel: 1000, buildingMaterials: 600, electronics: 100 },
    electronicsFactory: { steel: 500, buildingMaterials: 300 },
    chipFactory: { concrete: 1000, buildingMaterials: 2000, electronics: 600 },
    solarSail: { steel: 5000, buildingMaterials: 10000, glass: 5000, chips: 2000, electronics: 1000 },
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
    steelworks: { steel: planetId === 'earth' ? (count <= 1 ? 0 : count <= 3 ? 4 : 20) : (count > 1 ? 20 : 0) },
    ironMine: { steel: planetId === 'earth' ? (count <= 5 ? 3 : 20) : 20 }
  };
  if (costs[key]) {
    for (const [resource, amount] of Object.entries(costs[key])) addRefund(resource, amount);
  } else {
    const cost = Number(buildingTypes[key]?.cost || 0);
    addRefund('steel', cost);
  }
  for (const [resource, amount] of Object.entries(refunds)) {
    storage[resource] = Number(storage[resource] || 0) + amount;
  }
  buildings[key] = Math.max(0, count - 1);
  if (key === 'rocketFactory') {
    delete rocketFactoryBuildQueue[planetId];
    delete rocketFactoryBuildStarted[planetId];
  }
  if (key === 'outpost') {
    delete outpostBuildQueue[planetId];
    delete outpostBuildStarted[planetId];
  }
  playUiSound('build');
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function buildResourceBuilding(key) {
  const planetId = state.selected;
  const bld = getBuildingsOnPlanet(planetId);
  const storage = getPlanetStorage(planetId);
  if (!isBuildingAllowed(key, planetId)) return;

  if (key === 'orbitalCo2Extractor') {
    if (!state.research?.completed?.orbitalCo2Extractor) return;
    const costs = { aluminium: 50, polymers: 40, chips: 20, steel: 190 };
    if (!Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
    bld.orbitalCo2Extractor = Number(bld.orbitalCo2Extractor || 0) + 1;
  } else if (key === 'researchSatellite') {
    const costs = { steel: 800, electronics: 120, chips: 80, glass: 100 };
    if (!state.research?.completed?.researchSatellite || !isBuildingAllowed(key, planetId) || Number(bld.researchSatellite || 0) >= 1 || !Object.entries(costs).every(([r, amount]) => Number(storage[r] || 0) >= amount)) return;
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
    if (key === 'titanMine' && Number(bodies[planetId]?.resources?.titanOre || 0) <= 0) return;
    for (const [r, amount] of Object.entries(costs)) storage[r] -= amount;
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
  } else if (key === 'electronicsFactory') {
    if (Number(storage.steel || 0) < 500 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500;
    storage.buildingMaterials -= 300;
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
  } else if (key === 'hydroelectricPlant') {
    if (!state.research?.completed?.hydroelectricPlant || planetId !== 'earth') return;
    if (Number(storage.steel || 0) < 700 || Number(storage.machines || 0) < 100 || Number(storage.electronics || 0) < 50) return;
    storage.steel -= 700; storage.machines -= 100; storage.electronics -= 50;
  } else if (key === 'greenhouse') {
    if (!state.research?.completed?.greenhouse) return;
    if (Number(storage.steel || 0) < 500 || Number(storage.polymers || 0) < 20 || Number(storage.buildingMaterials || 0) < 300) return;
    storage.steel -= 500; storage.polymers -= 20; storage.buildingMaterials -= 300;
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
  rocketFactoryBuildStarted[id] = performance.now();
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function buildLandingPad() {
  const id = state.selected;
  const bld = getBuildingsOnPlanet(id);
  const storage = getPlanetStorage(id);
  if (!isBuildingAllowed('landingPad', id)) return;
  if (Number(storage.steel || 0) < 2000 || Number(storage.buildingMaterials || 0) < 3000 || Number(storage.machines || 0) < 500 || Number(storage.batteries || 0) < 300) return;
  storage.steel -= 2000; storage.buildingMaterials -= 3000; storage.machines -= 500; storage.batteries -= 300;
  bld.landingPad = Number(bld.landingPad || 0) + 1;
  playUiSound('build');
  renderSystem(); renderInfo(); renderTopResources(); saveAfterBuild();
}

function rocketFactoryHasCapacity(id) { return Number(getBuildingsOnPlanet(id).rocketFactory || 0) > 0; }
function queueRocket(type, id = state.selected) {
  ensureRocketData(id);
  if (!rocketFactoryHasCapacity(id)) return;
  const costs = { hercules1:{steel:45}, hercules2:{steel:300,batteries:50,aluminium:50}, atlas1:{steel:340,chips:150,batteries:200,aluminium:100}, titan1:{steel:2000,aluminium:300,chips:250,batteries:200,titanium:120} }[type];
  if (type === 'titan1' && !state.research?.completed?.titan1) return;
  const storage=getPlanetStorage(id);
  for(const [r,c] of Object.entries(costs)) if(Number(storage[r]||0)<c) return;
  for(const [r,c] of Object.entries(costs)) storage[r]-=c;
  rocketFactoryQueue[id].push(type);
  if (!rocketFactoryStarted[id]) rocketFactoryStarted[id]=performance.now();
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
  outpostBuildStarted[source] = performance.now();
  renderSystem(); renderInfo(); renderTopResources();
  saveAfterBuild();
}

function buildHercules1() { queueRocket('hercules1'); }

function buildAtlas1() { if (!state.research?.completed?.atlas1) return; queueRocket('atlas1'); }
function buildTitan1() { if (!state.research?.completed?.titan1) return; queueRocket('titan1'); }

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
  quantity = Math.max(1, Math.min(Number(quantity) || 1, rocketStock[source] || 0));
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  if (!rocketStock[source]) { rocketLaunchError('Keine Herkules-1-Rakete am Startplanet verfügbar.'); return; }
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < quantity) { rocketLaunchError('Nicht genug Start- & Landerrampen für diesen Start.'); return; }

  const amountPerRocket = Math.max(0, Math.min(120, Number(rocketCargoAmount) || 0));
  const available = getPlayerResourceAmount(rocketCargoResource, source);
  const totalCargo = amountPerRocket * quantity;
  if (totalCargo > available + 0.000001) { rocketLaunchError('Nicht genug Fracht im Lager.'); return; }

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
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchHercules2(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  if (!rocketStock2[source]) { rocketLaunchError('Keine Herkules-2-Rakete am Startplanet verfügbar.'); return; }
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) { rocketLaunchError('Für den Start wird eine Start- & Landerrampe benötigt.'); return; }

  const cargo = (rocketCargoSlots || []).map(slot => ({
    resource: slot.resource,
    amount: Math.max(0, Number(slot.amount) || 0)
  })).filter(slot => slot.resource && slot.amount > 0);

  const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total > 300.000001) { rocketLaunchError('Die Fracht überschreitet 300 t Kapazität.'); return; }

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
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchAtlas1(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') { rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.'); return; }
  if (!rocketStockAtlas1[source]) { rocketLaunchError('Keine Atlas-1-Rakete am Startplanet verfügbar.'); return; }
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) { rocketLaunchError('Für den Start wird eine Start- & Landerrampe benötigt.'); return; }
  if (!state.research?.completed?.atlas1) { rocketLaunchError('Atlas 1 ist noch nicht erforscht.'); return; }
  const cargo = (rocketCargoSlots || []).map(slot => ({ resource: slot.resource, amount: Math.max(0, Number(slot.amount) || 0) })).filter(slot => slot.resource && slot.amount > 0);
  const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total > 500.000001) { rocketLaunchError('Die Fracht überschreitet 500 t Kapazität.'); return; }
  const sourceStorage = getPlanetStorage(source);
  for (const slot of cargo) if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return;
  for (const slot of cargo) { sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount; if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0; }
  rocketStockAtlas1[source]--;
  rockets.push({ id: Date.now() + Math.random(), name: rocketTypes.atlas1.name, type: 'atlas1', from: source, to: destination, started: performance.now(), duration: atlasFlightTime(destination) * 1000, status: 'outbound', capacity: 500, compartments: 3, cargo: cargo });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function launchTitan1(source, destination) {
  ensureRocketData(source);
  if (!bodies[destination] || destination === source || destination === 'sun') return rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.');
  if (!rocketStockTitan1[source]) return rocketLaunchError('Keine Titan-1-Rakete am Startplaneten verfügbar.');
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Für den Start wird eine Start- & Landerampe benötigt.');
  if (!state.research?.completed?.titan1) return rocketLaunchError('Schwerlastraketen (Titan 1) sind noch nicht erforscht.');
  const cargo = (rocketCargoSlots || []).map(slot => ({ resource: slot.resource, amount: Math.max(0, Number(slot.amount) || 0) })).filter(slot => slot.resource && slot.amount > 0);
  const total = cargo.reduce((sum, slot) => sum + slot.amount, 0);
  if (total <= 0 || total > 1500.000001) return rocketLaunchError('Die Fracht muss größer als 0 und darf höchstens 1.500 t/L betragen.');
  const sourceStorage = getPlanetStorage(source);
  for (const slot of cargo) if (Number(sourceStorage[slot.resource] || 0) + 0.000001 < slot.amount) return rocketLaunchError('Nicht genug Fracht im Lager.');
  for (const slot of cargo) { sourceStorage[slot.resource] = Number(sourceStorage[slot.resource] || 0) - slot.amount; if (Math.abs(sourceStorage[slot.resource]) < 0.000001) sourceStorage[slot.resource] = 0; }
  rocketStockTitan1[source]--;
  const duration = destination === 'luna' ? 20000 : (flightTimes[destination] || 20) * 1000;
  rockets.push({ id: Date.now() + Math.random(), name: rocketTypes.titan1.name, type: 'titan1', from: source, to: destination, started: performance.now(), duration, status: 'outbound', capacity: 1500, compartments: 3, cargo });
  recordLunaFlight(destination);
  renderInfo(); renderTopResources(); saveGame(false);
}

function returnRocket(rocketId, cargoResource = null, cargoAmount = 0) {
  const rocket = rockets.find(r => String(r.id) === String(rocketId));
  if (!rocket || !['orbit','landed'].includes(rocket.status)) return;
  const source = rocket.to;
  const destination = rocket.from;
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return;
  const duration = rocket.type === 'titan1' ? (rocket.from === 'luna' || rocket.to === 'luna' ? 20000 : (flightTimes[rocket.from] || flightTimes[rocket.to] || 20) * 1000) : rocket.type === 'atlas1' ? atlasFlightTime(rocket.from) * 1000 : (flightTimes[rocket.from] || flightTimes[rocket.to] || 20) * 1000;
  const storage = getPlanetStorage(source);
  const returnCapacity = rocket.type === 'titan1' ? 1500 : rocket.type === 'atlas1' ? 500 : rocket.type === 'hercules2' ? 300 : 120;
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
  const stockAtlas1 = rocketStockAtlas1[source] || 0;
  const stockTitan1 = rocketStockTitan1[source] || 0;
  const factoryQueue = Array.isArray(rocketFactoryQueue[source]) ? rocketFactoryQueue[source] : [];
  const activeBuildTime = factoryQueue.length && rocketFactoryQueue[source][0] === 'titan1' ? 120 : 60;
  const factoryRemaining = factoryQueue.length && rocketFactoryStarted[source] ? Math.max(0, activeBuildTime - (performance.now()-rocketFactoryStarted[source])/1000) : 0;
  const buildQueueAtlas1 = rocketBuildQueueAtlas1[source] || 0;
  const buildStartedAtlas1 = rocketBuildStartedAtlas1[source] || 0;

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
    const isAtlas1 = r.type === 'atlas1';
    const isTitan1 = r.type === 'titan1';
    const maxCapacity = isTitan1 ? 1500 : isAtlas1 ? 500 : (isH2 ? 300 : 120);
    const cargo = r.deliveredCargo || r.cargo;
    const cargoText = Array.isArray(cargo)
      ? (cargo.length ? cargo.map(c => `${resourceIcons[c.resource] || ''} ${resourceNames[c.resource] || c.resource}: ${c.amount.toFixed(2)} ${['crudeOil','water'].includes(c.resource) ? 'L' : 't'}`).join(' · ') : 'Keine Fracht')
      : (cargo && cargo.amount > 0 ? `${resourceIcons[cargo.resource] || ''} ${resourceNames[cargo.resource] || cargo.resource}: ${cargo.amount.toFixed(2)} ${['crudeOil','water'].includes(cargo.resource) ? 'L' : 't'}` : 'Keine Fracht');

    if (r.status === 'orbit' || r.status === 'landed') {
      const returnOptions = ['stone','coal','gas','crudeOil','water','grain','vegetables','food','polymers','co2','carbon','oxygen','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','electronics','uranium','processedUranium','nuclearFuel','steel','bauxite','aluminiumOxide','aluminium','titanium']
        .filter(k => Number(getPlanetStorage(r.to)[k] || 0) > 0.000001)
        .map(k => `<option value="${k}">${resourceIcons[k] || ''} ${resourceNames[k] || k}</option>`).join('');
      const phase = r.status === 'orbit' ? '🛰️ im Orbit' : '🛬 auf der Oberfläche';
      const landButton = r.status === 'orbit' && rocketCanLand(r.to) && getBuildingsOnPlanet(r.to).landingPad ? `<button class="rocket-land" data-rocket-id="${r.id}">🛬 Auf ${bodies[r.to].name} landen</button>` : '';
      const cargoState = r.status === 'orbit' ? '📦 Fracht an Bord' : '📦 Fracht entladen';
      return `<div class="rocket-flight arrived"><strong>🚀 ${r.name}</strong><span>📍 ${bodies[r.to].name} · ${phase}</span><div class="rocket-cargo">${cargoState}: ${cargoText}</div>${landButton}<div class="rocket-return-box"><select class="rocket-return-resource" data-rocket-id="${r.id}"><option value="">Keine Rückfracht</option>${returnOptions}</select><input class="rocket-return-amount" data-rocket-id="${r.id}" type="number" min="0" max="${maxCapacity}" step="0.01" value="0"><button class="rocket-return" data-rocket-id="${r.id}">↩️ Zurück nach ${bodies[r.from].name}</button></div><small>Rückflug ${bodies[r.to].name} → ${bodies[r.from].name}: ${r.type === 'titan1' && (r.from === 'luna' || r.to === 'luna') ? 20 : r.type === 'atlas1' ? atlasFlightTime(r.from) : (flightTimes[r.from] || flightTimes[r.to] || 20)} Sekunden · max. ${maxCapacity} t/L</small></div>`;
    }
    if (r.status === 'returning') return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>↩️ ${bodies[r.fromReturn || r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 Rückflug</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
    return `<div class="rocket-flight"><strong>🚀 ${r.name}</strong><span>🚀 ${bodies[r.from].name} → ${bodies[r.to].name}</span><div class="rocket-cargo">📦 ${cargoText}</div><div class="rocket-progress"><i style="width:${pct}%"></i></div><small>${remaining.toFixed(1)} s bis Ankunft</small></div>`;
  }).join('') : '<p class="hint">Keine aktiven Transporte mit diesem Planeten.</p>';

  const buildRemaining1 = buildQueue1 ? Math.max(0, 30 - (performance.now() - buildStarted1)/1000) : 0;
  const buildPct1 = buildQueue1 ? Math.min(100, (performance.now()-buildStarted1)/30000*100) : 0;
  const buildRemaining2 = buildQueue2 ? Math.max(0, 30 - (performance.now() - buildStarted2)/1000) : 0;
  const buildPct2 = buildQueue2 ? Math.min(100, (performance.now()-buildStarted2)/30000*100) : 0;
  const buildRemainingAtlas1 = buildQueueAtlas1 ? Math.max(0, 30 - (performance.now() - buildStartedAtlas1)/1000) : 0;
  const buildPctAtlas1 = buildQueueAtlas1 ? Math.min(100, (performance.now()-buildStartedAtlas1)/30000*100) : 0;
  const localSteel = getPlayerResourceAmount('steel', source);
  const localBatteries = getPlayerResourceAmount('batteries', source);
  const localChips = getPlayerResourceAmount('chips', source);
  const localAluminium = getPlayerResourceAmount('aluminium', source);

  const cargoOptions = ['stone','coal','gas','crudeOil','water','grain','vegetables','food','polymers','co2','carbon','oxygen','iron','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','electronics','uranium','processedUranium','nuclearFuel','steel','bauxite','aluminiumOxide','aluminium','titanium']
    .map(key => `<option value="${key}">${resourceIcons[key] || ''} ${resourceNames[key] || key}</option>`).join('');

  rocketCargoSlots = rocketCargoSlots.slice(0, 3);
  while (rocketCargoSlots.length < 3) rocketCargoSlots.push({ resource: 'stone', amount: 0 });
  rocketCargoSlots.forEach(slot => {
    const available = getPlayerResourceAmount(slot.resource, source);
    slot.amount = Math.max(0, Math.min(Number(slot.amount) || 0, available, 1500));
  });
  const h2Total = rocketCargoSlots.reduce((sum, s) => sum + Number(s.amount || 0), 0);
  const h2Possible = h2Total > 0 && h2Total <= 300.000001;

  const h2SlotsHtml = rocketCargoSlots.map((slot, i) => {
    const available = getPlayerResourceAmount(slot.resource, source);
    return `<div class="rocket-compartment"><strong>Frachtabteilung ${i+1}</strong><select class="rocket-h2-resource" data-slot="${i}">${cargoOptions.replace(`value="${slot.resource}"`, `value="${slot.resource}" selected`)}</select><input class="rocket-h2-amount" data-slot="${i}" type="number" min="0" max="${Math.min(1500, available)}" step="0.01" value="${Number(slot.amount || 0).toFixed(2)}"><small>Verfügbar: ${formatTons(available)}</small></div>`;
  }).join('');

  return `<section class="rocket-window"><h3>🚀 Transportzentrale</h3>
    <p class="hint"><strong>Startplanet:</strong> ${body.name} · Die Raketenfabrik produziert alle Raketentypen nacheinander. Start und Landung benötigen eine Start- & Landerampe.</p>
    <div class="rocket-factory-queue"><strong>🏭 Produktionswarteschlange:</strong> ${factoryQueue.length ? factoryQueue.map((t,i)=>`${i===0 && factoryRemaining>0?'⚙️ ':''}${rocketTypes[t]?.name || t}`).join(' → ') : 'leer'}${factoryRemaining>0 ? ` · nächste Fertigstellung in ${factoryRemaining.toFixed(1)} s` : ''}</div>

    <div class="rocket-build-box"><strong>🏗️ Herkules 1</strong><small>45 t Stahl · 30 Sekunden Bauzeit · 120 t/L Kapazität</small>${factoryQueue.length && factoryQueue[0]==='hercules1' ? `<div class="rocket-progress"><i style="width:${Math.min(100,(activeBuildTime-factoryRemaining)/activeBuildTime*100)}%"></i></div>` : ''}<button id="build-hercules" ${!rocketFactoryHasCapacity(source) || localSteel < 45 ? 'disabled' : ''}>🚀 Herkules 1 bauen – 45 t Stahl</button></div>
    <div class="rocket-stock">Herkules 1 verfügbar: <strong>${stock1}</strong></div>

    <div class="rocket-build-box hercules2-box"><strong>🚀 Herkules 2</strong><small>300 t Stahl + 50 t Batterien + 50 t Aluminium · 30 Sekunden Bauzeit · 300 t/L Kapazität · 3 Frachtabteilungen</small><button id="build-hercules2" ${!rocketFactoryHasCapacity(source) || localSteel < 300 || localBatteries < 50 || localAluminium < 50 ? 'disabled' : ''}>🚀 Herkules 2 bauen – 300 t Stahl + 50 t Batterien + 50 t Aluminium</button></div>
    <div class="rocket-stock">Herkules 2 verfügbar: <strong>${stock2}</strong></div>

    <div class="rocket-build-box atlas1-box"><strong>🚀 Atlas 1</strong><small>340 t Stahl + 150 t Chips + 200 t Batterien + 100 t Aluminium · 30 Sekunden Bauzeit · 500 t/L Kapazität · 3 Frachtabteilungen · Forschung erforderlich</small><button id="build-atlas1" ${!rocketFactoryHasCapacity(source) || localSteel < 340 || localChips < 150 || localBatteries < 200 || localAluminium < 100 || !state.research?.completed?.atlas1 ? 'disabled' : ''}>🚀 Atlas 1 bauen – 340 t Stahl + 150 t Chips + 200 t Batterien + 100 t Aluminium</button></div>
    <div class="rocket-stock">Atlas 1 verfügbar: <strong>${stockAtlas1}</strong></div>

    <div class="rocket-build-box titan1-box"><strong>🚀 Titan 1</strong><small>2.000 t Stahl + 300 t Aluminium + 250 t Chips + 200 t Batterien + 120 t Titan · 120 Sekunden Bauzeit · 1.500 t/L Kapazität · Forschung Schwerlastraketen erforderlich</small><button id="build-titan1" ${!rocketFactoryHasCapacity(source) || localSteel < 2000 || localAluminium < 300 || localChips < 250 || localBatteries < 200 || getPlayerResourceAmount('titanium',source) < 120 || !state.research?.completed?.titan1 ? 'disabled' : ''}>🚀 Titan 1 bauen</button></div>
    <div class="rocket-stock">Titan 1 verfügbar: <strong>${stockTitan1}</strong></div>

    <div class="rocket-h2-launch titan1-launch"><strong>🚀 Titan 1 · Mehrere Frachtarten</strong><div class="rocket-capacity">Gesamtkapazität: <strong>1.500 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div><div class="rocket-compartments">${h2SlotsHtml}</div>${h2Total > 1500 ? '<small class="bad">Maximal 1.500 t/L pro Titan 1.</small>' : ''}<button class="rocket-launch" id="launch-titan1" ${stockTitan1 < 1 || h2Total <= 0 || h2Total > 1500.000001 || !state.research?.completed?.titan1 ? 'disabled' : ''}>🚀 Titan 1 nach ${bodies[target].name} starten</button><p class="hint">Flugzeit zur Luna: 20 Sekunden · mehrere Frachtarten pro Mission.</p></div>

    <div class="rocket-h2-launch atlas1-launch">
      <strong>🚀 Atlas 1 · Mehrere Frachtabteilungen</strong>
      <div class="rocket-capacity">Gesamtkapazität: <strong>500 t/L</strong> · Belegung: <strong>${h2Total.toFixed(2)} t/L</strong></div>
      <div class="rocket-compartments">${h2SlotsHtml}</div>
      ${h2Total > 500 ? '<small class="bad">Maximal 500 t/L pro Atlas 1.</small>' : ''}
      <button class="rocket-launch" id="launch-atlas1" ${stockAtlas1 < 1 || h2Total <= 0 || h2Total > 500.000001 || !state.research?.completed?.atlas1 ? 'disabled' : ''}>🚀 Atlas 1 nach ${bodies[target].name} starten</button>
      <p class="hint">Alle Planeten erreichbar · 1 Sekunde schneller als Herkules · 3 Frachtabteilungen.</p>
    </div>

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
    <hr><h3>🔁 Zyklische Orbitmissionen</h3>
    <p class="hint">Wähle Rakete, Ziel, Fracht und individuelle Wartezeit. Der Zyklus beginnt nach der Rückkehr. Bei fehlender Fracht pausiert die Mission und muss manuell fortgesetzt werden.</p>
    <div class="rocket-build-box"><label>Rakete <select id="mission-rocket-type"><option value="hercules1">Herkules 1 · 120 t/L</option><option value="hercules2">Herkules 2 · 300 t/L</option><option value="atlas1">Atlas 1 · 500 t/L</option><option value="titan1">Titan 1 · 1.500 t/L</option></select></label>
    <label>Zielplanet <select id="mission-destination">${destinations}</select></label>
    <label>Transportierter Rohstoff <select id="mission-resource">${cargoOptions}</select></label>
    <label>Gewünschte Frachtmenge (t/L) <input id="mission-amount" type="number" min="0.01" step="0.01" value="100" style="width:100%;padding:8px;border-radius:8px"></label>
    <label>Wartezeit nach Rückkehr (Sekunden) <input id="mission-wait" type="number" min="0" step="1" value="60" style="width:100%;padding:8px;border-radius:8px"></label>
    <button id="create-orbit-mission">➕ Zyklische Mission erstellen</button></div>
    <div id="orbit-missions-list">${renderOrbitMissions(source)}</div>
    <hr><h3>📡 Aktive Transporte</h3>${list}</section>`;
}

function renderOrbitMissions(planetId = state.selected) {
  const missions = orbitMissions.filter(m => m.source === planetId || m.destination === planetId);
  if (!missions.length) return '<p class="hint">Noch keine zyklischen Missionen für diesen Planeten.</p>';
  return missions.map(m => {
    const phase = m.status === 'paused' ? 'Pausiert – manuelle Fortsetzung erforderlich' : m.status === 'outbound' ? `Hinflug nach ${bodies[m.destination]?.name || m.destination}` : m.status === 'returning' ? 'Rückflug' : `Wartezeit: ${Math.max(0, Math.ceil((m.nextLaunchAt - Date.now()) / 1000))} s`;
    return `<div class="rocket-flight"><strong>🔁 Mission #${m.id} · ${rocketTypes[m.rocketType]?.name || m.rocketType}</strong><div>${bodies[m.source]?.name || m.source} → ${bodies[m.destination]?.name || m.destination}</div><div>${resourceNames[m.resource] || m.resource}: ${m.amount} t/L · Wartezeit ${m.waitSeconds} s</div><div class="hint">Status: ${phase}${m.message ? ` · ${m.message}` : ''}</div><div style="display:flex;gap:7px;flex-wrap:wrap;margin-top:7px">${m.status === 'paused' ? `<button class="mission-resume" data-mission-id="${m.id}">▶ Fortsetzen</button>` : (m.status === 'waiting' ? `<button class="mission-pause" data-mission-id="${m.id}">⏸ Pausieren</button>` : '<small>Pause erst nach Rückkehr möglich</small>')}<button class="mission-delete danger" data-mission-id="${m.id}">Mission löschen</button></div></div>`;
  }).join('');
}

function createOrbitMission() {
  const source = state.selected;
  const type = document.querySelector('#mission-rocket-type')?.value || 'hercules1';
  const destination = document.querySelector('#mission-destination')?.value;
  const resource = document.querySelector('#mission-resource')?.value || 'lithium';
  const amount = Math.max(0, Number(document.querySelector('#mission-amount')?.value) || 0);
  const waitSeconds = Math.max(0, Number(document.querySelector('#mission-wait')?.value) || 0);
  const capacity = type === 'titan1' ? 1500 : type === 'atlas1' ? 500 : type === 'hercules2' ? 300 : 120;
  if (!destination || destination === source || destination === 'sun') return rocketLaunchError('Bitte einen anderen Zielplaneten auswählen.');
  if (amount <= 0 || amount > capacity) return rocketLaunchError(`Frachtmenge muss zwischen 0 und ${capacity} t/L liegen.`);
  if (Number(getBuildingsOnPlanet(source).landingPad || 0) < 1) return rocketLaunchError('Am Startplaneten wird eine Start- & Landerampe benötigt. Das Ziel bleibt eine Orbitmission.');
  if (type === 'atlas1' && !state.research?.completed?.atlas1) return rocketLaunchError('Atlas 1 ist noch nicht erforscht.');
  if (type === 'titan1' && !state.research?.completed?.titan1) return rocketLaunchError('Schwerlastraketen (Titan 1) sind noch nicht erforscht.');
  ensureRocketData(source);
  const stocks = type === 'hercules1' ? rocketStock : type === 'hercules2' ? rocketStock2 : type === 'atlas1' ? rocketStockAtlas1 : rocketStockTitan1;
  if (Number(stocks[source] || 0) < 1) return rocketLaunchError(`Keine ${rocketTypes[type].name}-Rakete am Startplaneten verfügbar.`);
  stocks[source]--;
  const now = Date.now();
  orbitMissions.push({ id: orbitMissionCounter++, source, destination, rocketType: type, resource, amount, waitSeconds, status: 'waiting', createdAt: now, nextLaunchAt: now, message: '' });
  recordLunaFlight(destination);
  saveGame(false); renderInfo();
}

function bindOrbitMissionControls() {
  const create = infoPanel.querySelector('#create-orbit-mission');
  if (create) create.addEventListener('click', createOrbitMission);
  infoPanel.querySelectorAll('.mission-pause').forEach(btn => btn.addEventListener('click', () => {
    const m = orbitMissions.find(x => String(x.id) === btn.dataset.missionId); if (!m) return;
    m.status = 'paused'; m.message = 'Vom Spieler pausiert'; saveGame(false); renderInfo();
  }));
  infoPanel.querySelectorAll('.mission-resume').forEach(btn => btn.addEventListener('click', () => {
    const m = orbitMissions.find(x => String(x.id) === btn.dataset.missionId); if (!m) return;
    m.status = 'waiting'; m.message = ''; m.nextLaunchAt = Date.now(); saveGame(false); renderInfo();
  }));
  infoPanel.querySelectorAll('.mission-delete').forEach(btn => btn.addEventListener('click', () => {
    const i = orbitMissions.findIndex(x => String(x.id) === btn.dataset.missionId); if (i < 0) return;
    const m = orbitMissions[i];
    // Wenn die Rakete gerade fliegt, lässt die Mission den Flug sicher zu Ende laufen.
    if (m.status === 'outbound' || m.status === 'returning') { m.deleteAfterReturn = true; m.message = 'Wird nach Rückkehr gelöscht'; }
    else { const stocks = m.rocketType === 'hercules1' ? rocketStock : m.rocketType === 'hercules2' ? rocketStock2 : m.rocketType === 'atlas1' ? rocketStockAtlas1 : rocketStockTitan1; stocks[m.source] = Number(stocks[m.source] || 0) + 1; orbitMissions.splice(i,1); }
    saveGame(false); renderInfo();
  }));
}

function updateOrbitMissions(now = Date.now()) {
  let changed = false;
  for (const m of [...orbitMissions]) {
    if (m.status === 'paused') continue;
    if (m.status === 'waiting' && now >= Number(m.nextLaunchAt || 0)) {
      const storage = getPlanetStorage(m.source);
      const available = Math.max(0, Number(storage[m.resource] || 0));
      const capacity = m.rocketType === 'titan1' ? 1500 : m.rocketType === 'atlas1' ? 500 : m.rocketType === 'hercules2' ? 300 : 120;
      const loaded = Math.min(m.amount, capacity, available);
      if (loaded <= 0.000001) { m.status = 'paused'; m.message = `Kein ${resourceNames[m.resource] || m.resource} verfügbar – bitte manuell fortsetzen`; changed = true; continue; }
      storage[m.resource] = available - loaded;
      m.loadedAmount = loaded;
      m.message = loaded + 0.000001 < m.amount ? `Fracht unvollständig: ${loaded.toFixed(2)} von ${m.amount} geladen` : '';
      m.status = 'outbound'; m.startedAt = now;
      m.durationMs = (m.rocketType === 'titan1' && m.destination === 'luna' ? 20 : m.rocketType === 'atlas1' ? atlasFlightTime(m.destination) : (flightTimes[m.destination] || 20)) * 1000;
      changed = true;
    } else if (m.status === 'outbound' && now - m.startedAt >= m.durationMs) {
      const targetStorage = getPlanetStorage(m.destination);
      targetStorage[m.resource] = Number(targetStorage[m.resource] || 0) + Number(m.loadedAmount || 0);
      m.status = 'returning'; m.startedAt = now;
      m.durationMs = (m.rocketType === 'titan1' && (m.source === 'luna' || m.destination === 'luna') ? 20 : m.rocketType === 'atlas1' ? atlasFlightTime(m.source) : (flightTimes[m.source] || 20)) * 1000;
      changed = true;
    } else if (m.status === 'returning' && now - m.startedAt >= m.durationMs) {
      m.status = 'waiting'; m.returnedAt = now; m.nextLaunchAt = now + m.waitSeconds * 1000; m.loadedAmount = 0;
      if (m.deleteAfterReturn) { orbitMissions.splice(orbitMissions.findIndex(x => x.id === m.id), 1); const stocks = m.rocketType === 'hercules1' ? rocketStock : m.rocketType === 'hercules2' ? rocketStock2 : m.rocketType === 'atlas1' ? rocketStockAtlas1 : rocketStockTitan1; stocks[m.source] = Number(stocks[m.source] || 0) + 1; }
      changed = true;
    }
  }
  if (changed) { saveGame(false); renderInfo(); renderTopResources(); }
}

function bindRocketControls() {
  const b=infoPanel.querySelector('#build-hercules'); if(b)b.addEventListener('click',buildHercules1);
  const b2=infoPanel.querySelector('#build-hercules2'); if(b2)b2.addEventListener('click',buildHercules2);
  const ba=infoPanel.querySelector('#build-atlas1'); if(ba)ba.addEventListener('click',buildAtlas1);
  const bt=infoPanel.querySelector('#build-titan1'); if(bt)bt.addEventListener('click',buildTitan1);
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
    rocketCargoSlots[i].amount=Math.min(Number(rocketCargoSlots[i].amount)||0,available,1500);
    renderInfo();
  }));
  infoPanel.querySelectorAll('.rocket-h2-amount').forEach(el=>el.addEventListener('input',()=>{
    const i=Number(el.dataset.slot);
    rocketCargoSlots[i].amount=Math.max(0,Math.min(1500,Number(el.value)||0));
  }));
  const l=infoPanel.querySelector('#launch-hercules'); if(l)l.addEventListener('click',()=>launchHercules1(state.selected,rocketDestination,rocketQuantity));
  const l2=infoPanel.querySelector('#launch-hercules2'); if(l2)l2.addEventListener('click',()=>launchHercules2(state.selected,rocketDestination));
  const la=infoPanel.querySelector('#launch-atlas1'); if(la)la.addEventListener('click',()=>launchAtlas1(state.selected,rocketDestination));
  const lt=infoPanel.querySelector('#launch-titan1'); if(lt)lt.addEventListener('click',()=>launchTitan1(state.selected,rocketDestination));
  infoPanel.querySelectorAll('.rocket-land').forEach(x=>x.addEventListener('click',()=>{
    const r=rockets.find(r=>String(r.id)===String(x.dataset.rocketId));
    if(!r || r.status!=='orbit' || !rocketCanLand(r.to) || Number(getBuildingsOnPlanet(r.to).landingPad || 0) < 1) return;
    const targetStorage=getPlanetStorage(r.to);
    if(Array.isArray(r.cargo)){
      r.deliveredCargo=r.cargo.map(c=>({...c}));
      r.cargo.forEach(c=>{ if(c.amount>0) targetStorage[c.resource]=Number(targetStorage[c.resource]||0)+c.amount; c.amount=0; });
    } else if(r.cargo && r.cargo.amount>0){
      targetStorage[r.cargo.resource]=Number(targetStorage[r.cargo.resource]||0)+r.cargo.amount;
      r.deliveredCargo={...r.cargo}; r.cargo.amount=0;
    }
    r.status='landed'; r.landedAt=performance.now(); playUiSound('build'); renderInfo(); renderTopResources(); saveGame(false);
  }));
  infoPanel.querySelectorAll('.rocket-return').forEach(x=>x.addEventListener('click',()=>{
    const id=x.dataset.rocketId;
    const resourceEl=infoPanel.querySelector(`.rocket-return-resource[data-rocket-id="${id}"]`);
    const amountEl=infoPanel.querySelector(`.rocket-return-amount[data-rocket-id="${id}"]`);
    returnRocket(id, resourceEl?.value || null, Number(amountEl?.value) || 0);
  }));
  bindOrbitMissionControls();
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

function updateRocketFactoryConstruction(now) {
  Object.keys(rocketFactoryBuildQueue).forEach(id => {
    if (rocketFactoryBuildQueue[id] > 0 && now - (rocketFactoryBuildStarted[id] || 0) >= 60000) {
      getBuildingsOnPlanet(id).rocketFactory = 1;
      rocketFactoryBuildQueue[id] = 0;
      rocketFactoryBuildStarted[id] = 0;
      playUiSound('build');
      renderSystem(); renderInfo();
    }
  });
}

function updateRockets(now) {
  Object.keys(bodies).forEach(id => {
    if (id === 'sun') return;
    ensureRocketData(id);
    if (Array.isArray(rocketFactoryQueue[id]) && rocketFactoryQueue[id].length && now - (rocketFactoryStarted[id] || now) >= (rocketFactoryQueue[id][0] === 'titan1' ? 120000 : 60000)) {
      const type = rocketFactoryQueue[id].shift();
      if (type === 'hercules1') rocketStock[id] = (rocketStock[id] || 0) + 1;
      if (type === 'hercules2') rocketStock2[id] = (rocketStock2[id] || 0) + 1;
      if (type === 'atlas1') rocketStockAtlas1[id] = (rocketStockAtlas1[id] || 0) + 1;
      if (type === 'titan1') rocketStockTitan1[id] = (rocketStockTitan1[id] || 0) + 1;
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
    if (now - rocket.started >= rocket.duration) {
      if (rocket.status === 'outbound') {
        rocket.status = 'orbit';
        rocket.arrivedAt = now;
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
  updateSolarProbeFlights();
  const delta = Math.min((now - state.lastUpdate) / 1000, 0.25);
  state.lastUpdate = now;

  Object.entries(bodies).forEach(([id, planet]) => {
    if (id === 'sun') return;
    const bld = getBuildingsOnPlanet(id);
    const storage = getPlanetStorage(id);
    // Eisenabbau auf der Erde bewusst separat verarbeiten.
    // Dadurch wird das zentrale Erd-Lager `state.iron` direkt und eindeutig
    // erhöht und kann nicht durch eine andere Lager-Logik aus dem Takt geraten.
    if (id === 'earth') {
      const ironMines = Math.max(0, Number(bld.ironMine || 0));
      const availableIron = Math.max(0, Number(planet.resources.iron || 0));
      const ironRate = 0.1 * ironMines;
      const minedIron = Math.min(availableIron, ironRate * delta);
      if (minedIron > 0) {
        planet.resources.iron = availableIron - minedIron;
        state.iron = Math.max(0, Number(state.iron || 0)) + minedIron;
        state.tasks.ironMined = Number(state.tasks.ironMined || 0) + minedIron;
      }
    }

    Object.entries(buildingTypes).forEach(([key, b]) => {
      // Diese Gebäude werden unten separat verarbeitet.
      if (key === 'ironMine' || key === 'titanMine' || key === 'crudeOilPump' || key === 'lithiumMine' || key === 'copperMine') return;
      if (!b.resource) return;

      const resourceKey = b.resource;
      const available = Number(planet.resources[resourceKey] || 0);
      const amount = Math.min(available, Number(b.rate || 0) * Number(bld[key] || 0) * delta);
      if (amount > 0) {
        planet.resources[resourceKey] = available - amount;
        storage[resourceKey] = Number(storage[resourceKey] || 0) + amount;
        if (resourceKey === 'iron') state.tasks.ironMined = Number(state.tasks.ironMined || 0) + amount;
      }
    });

    // Orbitaler CO₂-Extraktor: zieht CO₂ aus der Atmosphäre und lagert es separat im Orbit.
    if (Number(bld.orbitalCo2Extractor || 0) > 0) {
      const atmosphericCO2 = Math.max(0, Number(planet.resources.co2 || 0));
      const extracted = Math.min(atmosphericCO2, 0.5 * Number(bld.orbitalCo2Extractor) * delta);
      if (extracted > 0) {
        planet.resources.co2 = atmosphericCO2 - extracted;
        const orbitStorage = getOrbitStorage(id);
        orbitStorage.co2 = Number(orbitStorage.co2 || 0) + extracted;
      }
    }

    // Wasserkraftwerk: fördert Wasser aus dem endlichen Wasservorkommen der Erde ins lokale Lager.
    if (Number(bld.hydroelectricPlant || 0) > 0 && id === 'earth') {
      const powerFactor = newBuildingPowerFactor(id);
      const availableWater = Number(planet.resources.water || 0);
      const produced = Math.min(availableWater, hydroelectricWaterProduction(id) * delta * powerFactor);
      if (produced > 0) { planet.resources.water = availableWater - produced; storage.water = Number(storage.water || 0) + produced; }
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
        storage.food = Number(storage.food || 0) + foodFactoryProduction(id) * delta * powerFactor * inputFactor;
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

    // Polymerfabrik: verarbeitet vorhandenes Rohöl direkt zu Polymeren.
    if (Number(bld.polymerFactory || 0) > 0) {
      const neededOil = polymerOilUse(id) * delta;
      const availableOil = Number(storage.crudeOil || 0);
      const factor = neededOil > 0 ? Math.min(1, availableOil / neededOil) : 0;
      if (factor > 0) {
        storage.crudeOil = Math.max(0, availableOil - neededOil * factor);
        storage.polymers = Number(storage.polymers || 0) + polymerProduction(id) * delta * factor;
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

    // Elektronikfabrik: Kupfer, Chips und Lithium werden zu Elektronik verarbeitet.
    if (Number(bld.electronicsFactory || 0) > 0) {
      const neededCopper = electronicsFactoryCopperUse(id) * delta;
      const neededChips = electronicsFactoryChipUse(id) * delta;
      const neededLithium = electronicsFactoryLithiumUse(id) * delta;
      const availableCopper = Number(storage.copper || 0);
      const availableChips = Number(storage.chips || 0);
      const availableLithium = Number(storage.lithium || 0);
      const copperFactor = neededCopper > 0 ? Math.min(1, availableCopper / neededCopper) : 0;
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

  // Das Lager der Erde ist gleichzeitig das Spieler-/Hauptlager.
  updateOutposts(now);
  updateRocketFactoryConstruction(now);
  updateRockets(now);
  updateOrbitMissions(Date.now());
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
  // Die Rohstoffanzeige oben wird direkt aus dem aktuellen Planetlager aktualisiert.
  // Dadurch bleibt sie synchron, auch wenn die Produktionswerte schneller steigen
  // als ein kompletter UI-Renderzyklus.
  refreshTopResourceValues();
  if (!updateResources.lastUiUpdate || now - updateResources.lastUiUpdate >= 500) {
    updateResources.lastUiUpdate = now;
    renderTopResources();
  }

  // Raketen werden unabhängig vom restlichen UI animiert, damit der Flugweg
  // zwischen Startplanet und Zielorbit auf dem Sonnensystem sichtbar bleibt.
  updateRocketVisuals(now);

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
  if (menuButton && menu) menuButton.onclick = () => { unlockAudio(); menu.hidden = !menu.hidden; if(!menu.hidden) applyLanguage(menu); };
  if (menuClose && menu) menuClose.onclick = () => { menu.hidden = true; };
  const settingsButton=document.querySelector('#settings-button'); const settingsPanel=document.querySelector('#settings-panel'); const settingsClose=document.querySelector('#settings-close');
  if(settingsButton && settingsPanel) settingsButton.addEventListener('click',()=>{ unlockAudio(); settingsPanel.hidden=!settingsPanel.hidden; if(!settingsPanel.hidden && menu) menu.hidden=true; const panels=['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel']; panels.forEach(sel=>{const el=document.querySelector(sel); if(el) el.hidden=true;}); applyLanguage(settingsPanel); });
  if(settingsClose && settingsPanel) settingsClose.addEventListener('click',()=>{settingsPanel.hidden=true;});
  setupAudio();
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
  const settingsPanel = document.querySelector('#settings-panel');

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

function co2ProcessingProduction(id='earth', output='carbon') {
  const count = Number(getBuildingsOnPlanet(id).co2ProcessingPlant || 0);
  return count * 0.1;
}

function renderEconomy() {
  const panel = document.querySelector('#economy-content');
  if (!panel) return;
  const resources = [['stone','🪨','Stein'],['coal','⚫','Kohle'],['gas','🔥','Gas'],['co2','🌫️','CO₂'],['carbon','⚫','Kohlenstoff'],['oxygen','🫧','Sauerstoff'],['crudeOil','🛢️','Rohöl'],['polymers','🧬','Polymere'],['iron','🧲','Eisen'],['steel','🔩','Stahl'],['silicon','🔷','Silizium'],['lithium','🔋','Lithium'],['copperOre','🟠','Kupfererz'],['copper','🟤','Kupfer'],['batteries','🔋','Batterien'],['buildingMaterials','🧱','Baustoffe'],['machines','⚙️','Maschinen'],['electronics','💻','Elektronik'],['uranium','☢️','Uran'],['processedUranium','🧪','Aufbereitetes Uran'],['nuclearFuel','⚛️','Kernbrennstoff'],['chips','💾','Chips'],['helium3','🧪','Helium-3'],['bauxite','🪨','Bauxit'],['aluminiumOxide','⚗️','Aluminiumoxid'],['aluminium','🥈','Aluminium'],['water','💧','Wasser'],['grain','🌾','Getreide'],['vegetables','🥦','Gemüse'],['food','🥫','Lebensmittel']];
  const rows = resources.map(([key, icon, name]) => {
    const amount = key === 'co2' ? Object.keys(bodies).reduce((sum, id) => sum + storageAmount(id, 'co2') + Number(getOrbitStorage(id).co2 || 0), 0) : getPlayerResourceAmount(key, 'earth');
    let production = 0, consumption = 0;
    if (key === 'co2') {
      production = venusCo2ExtractionRate('venus') + Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).orbitalCo2Extractor || 0) * 0.5, 0);
    }
    if (key === 'carbon') { production = co2ProcessingProduction('earth', 'carbon'); consumption = 0; }
    if (key === 'oxygen') { production = co2ProcessingProduction('earth', 'oxygen'); consumption = 0; }
    if (key === 'crudeOil') { production = crudeOilProduction('earth'); consumption = Number(getBuildingsOnPlanet('earth').polymerFactory || 0) * 0.001; }
    if (key === 'polymers') { production = Number(getBuildingsOnPlanet('earth').polymerFactory || 0) * 0.0005; consumption = 0; }
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
    if (key === 'uranium') { production = uraniumProduction('earth'); consumption = processedUraniumUraniumUse('earth'); }
    if (key === 'processedUranium') { production = processedUraniumProduction('earth'); consumption = nuclearFuelProcessedUraniumUse('earth'); }
    if (key === 'nuclearFuel') { production = nuclearFuelProduction('earth'); consumption = nuclearReactorNuclearFuelUse('earth'); }
    if (key === 'chips') { production = chipProduction('earth'); consumption = electronicsFactoryChipUse('earth'); }
    if (key === 'electronics') { production = electronicsProduction('earth'); consumption = 0; }
    if (key === 'helium3') { production = helium3Production('earth'); consumption = fusionHelium3Use('earth'); }
    if (key === 'bauxite') production = Number(getBuildingsOnPlanet('earth').bauxiteMine || 0) * 0.5;
    if (key === 'titanOre') { production = Number(getBuildingsOnPlanet('mercury').titanMine || 0) * 0.2; consumption = Number(getBuildingsOnPlanet('mercury').titanProcessing || 0) * 0.2; }
    if (key === 'processedTitan') { production = Number(getBuildingsOnPlanet('mercury').titanProcessing || 0) * 0.1; consumption = Number(getBuildingsOnPlanet('mercury').titanRefinery || 0) * 0.1; }
    if (key === 'titanium') production = Number(getBuildingsOnPlanet('mercury').titanRefinery || 0) * 0.05;
    if (key === 'aluminiumOxide') { production = Number(getBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.25; consumption = Number(getBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.25; }
    if (key === 'aluminium') production = Number(getBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.125;
    if (key === 'bauxite') consumption = Number(getBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.5;
    if (key === 'coal') consumption = coalPowerUse('earth');
    if (key === 'water') { production = hydroelectricWaterProduction('earth') * newBuildingPowerFactor('earth'); consumption = greenhouseWaterUse('earth') + foodFactoryWaterUse('earth') * newBuildingPowerFactor('earth'); }
    if (key === 'grain' || key === 'vegetables') production = greenhouseCropProduction('earth') * newBuildingPowerFactor('earth');
    if (key === 'grain') consumption = foodFactoryGrainUse('earth') * newBuildingPowerFactor('earth');
    if (key === 'food') production = foodFactoryProduction('earth') * newBuildingPowerFactor('earth');
    return `<div class="stat economy-resource-row" data-economy-resource="${key}"><span>${icon} ${name}</span><strong>${['crudeOil','water'].includes(key) ? amount.toLocaleString('de-DE', {maximumFractionDigits:2}) + ' L' : key === 'co2' ? formatLargeTons(amount) : formatTons(amount)}</strong><small>${production.toFixed(2)} ${['crudeOil','water'].includes(key) ? 'L/s' : 't/s'} Produktion · ${consumption.toFixed(['crudeOil','water'].includes(key) ? 2 : 4)} ${['crudeOil','water'].includes(key) ? 'L/s' : 't/s'} Verbrauch</small></div>`;
  }).join('');
  const b = getBuildingsOnPlanet('earth');
  const total = Object.values(b).reduce((a,v)=>a+Number(v||0),0);
  const chain = batteryProductionChain('earth');
  const resourceGroups = [
    { id:'stocks', title:'📦 Rohstoffe & Lager', keys:['stone','coal','gas','co2','carbon','oxygen','crudeOil','polymers','iron','steel','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','electronics','uranium','processedUranium','nuclearFuel','chips','helium3','bauxite','aluminiumOxide','aluminium','water','grain','vegetables','food'] },
    { id:'production', title:'🏭 Produktion & Verbrauch', keys:['iron','steel','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','electronics','uranium','processedUranium','nuclearFuel','chips','helium3','bauxite','aluminiumOxide','aluminium','water','grain','vegetables','food','crudeOil','polymers','coal','co2','carbon','oxygen'] }
  ];
  const rowByKey = Object.fromEntries([...rows.matchAll(/<div class="stat economy-resource-row" data-economy-resource="([^"]+)">[\s\S]*?<\/div>/g)].map(m=>[m[1],m[0]]));
  const stockRows = resourceGroups[0].keys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const productionKeys = ['iron','steel','silicon','lithium','copperOre','copper','batteries','buildingMaterials','machines','electronics','uranium','processedUranium','nuclearFuel','chips','helium3','bauxite','aluminiumOxide','aluminium','water','grain','vegetables','food','crudeOil','polymers','coal','co2','carbon','oxygen'];
  const productionRows = productionKeys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const buildingRows = Object.entries(b).map(([key,count])=>`<div class="stat economy-building-row"><span>${buildingTypes[key]?.icon || '🏭'} ${buildingTypes[key]?.name || key}</span><strong>${count}</strong></div>`).join('');
  const energyProduction = electricityProduction('earth');
  const energyConsumption = Number(b.hydroelectricPlant || 0) * 3 + Number(b.greenhouse || 0) * 2 + foodFactoryElectricityUse('earth') + crudeOilElectricityUse('earth');
  const energyBalance = energyProduction - energyConsumption;
  panel.innerHTML = `
    <div class="economy-quick-overview">
      <div class="economy-quick-card"><span>Gebäude gesamt</span><strong>${total}</strong></div>
      <div class="economy-quick-card"><span>⛏️ Eisenproduktion</span><strong>${ironProduction('earth').toFixed(2)} t/s</strong></div>
      <div class="economy-quick-card"><span>🔩 Stahlproduktion</span><strong>${steelProduction('earth').toFixed(2)} t/s</strong></div>
    </div>
    <details class="economy-section"><summary>📦 Rohstoffe & Lager <span>Bestände aller Rohstoffe</span></summary><div class="economy-section-content">${stockRows}</div></details>
    <details class="economy-section"><summary>🏭 Produktion & Verbrauch <span>Förderung und Materialflüsse</span></summary><div class="economy-section-content">${productionRows}</div></details>
    <details class="economy-section"><summary>🔋 Produktionskette: Batterien <span>Details anzeigen</span></summary><div class="economy-section-content"><div class="stat"><span>🔋 Lithium →</span><strong>${formatTons(chain.lithium)}/s</strong></div><div class="stat"><span>🟤 Kupfer →</span><strong>${formatTons(chain.copper)}/s</strong></div><div class="stat"><span>🔋 Batterien</span><strong>${formatTons(chain.batteries)}/s</strong></div></div></details>
    <details class="economy-section"><summary>⚡ Energie <span>Strombilanz anzeigen</span></summary><div class="economy-section-content"><div class="stat"><span>Stromproduktion</span><strong>${energyProduction.toFixed(2)} MW</strong></div><div class="stat"><span>Stromverbrauch</span><strong>${energyConsumption.toFixed(2)} MW</strong></div><div class="stat"><span>Bilanz</span><strong class="${energyBalance < 0 ? 'bad' : 'good'}">${energyBalance.toFixed(2)} MW</strong></div></div></details>
    <details class="economy-section"><summary>🏢 Gebäude auf Erde <span>${total} Gebäude</span></summary><div class="economy-section-content">${buildingRows}</div></details>
    <details class="economy-section"><summary>🚀 Raketen & Transport <span>Transportübersicht</span></summary><div class="economy-section-content"><p class="hint">Öffne die Raketen- und Orbitansicht für Flüge, Fracht und Raketenbestände.</p></div></details>`;

}

// ==========================================
// MEHRSPRACHIGKEIT: Deutsch / English / Français
// ==========================================
const LANGUAGE_KEY = 'solarFrontierLanguage_v1';
const languageSelect = document.querySelector('#language-select');
const translations = {
  en: {
    'Weltraum Game':'Space Game','Sonnensystem · Rohstoffe · Aufbau · Transport':'Solar System · Resources · Development · Transport','Neuigkeiten':'News','Wirtschaft':'Economy','Forschung':'Research','Forschungsbaum':'Research Tree','Forschungslabor':'Research Lab','Forschungspunkte':'Research Points','Forschen':'Research','Abgeschlossen':'Completed','Spiel':'Game','Menü':'Menu','Einführung':'Introduction','Sprache':'Language','Willkommen bei Solar Frontier: Origins':'Welcome to Solar Frontier: Origins','Dein Ziel':'Your Goal','Planeten':'Planets','Raketen':'Rockets','Neuigkeiten & Updates':'News & Updates','Entwicklungsstand von Solar Frontier: Origins':'Development status of Solar Frontier: Origins','Aktuelle Ankündigung':'Current Announcement','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins is being developed further','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'The game is actively being developed. New content, tasks and technical improvements are being added step by step.','Aktuelle Version':'Current Version','Nächstes Update':'Next Update','Geplant':'Planned','Aktuelle Entwicklung':'Current Development','Was gerade im Spiel entsteht':'What is currently being developed','Weiterentwicklung des Sonnensystems':'Solar system development','Rohstoffabbau und Gebäude auf der Erde':'Resource extraction and buildings on Earth','Siliziummine und weitere Produktionsgebäude':'Silicon mine and additional production buildings','Raketenbau und interplanetarer Transport':'Rocket construction and interplanetary transport','Speichern und Laden des Spielstands':'Saving and loading the game','Hinweis für Spieler':'Player Notice','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'The game is actively in development. Changes and new updates may be added at any time.','Wirtschafts-Dashboard':'Economy Dashboard','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Overview of storage, production, consumption and buildings','Spielstand':'Save Game','Speichern':'Save','Laden':'Load','Neustart':'Restart','Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars','Jupiter':'Jupiter','Luna':'Moon','Stern':'Star','Planet':'Planet','Startplanet':'Starting Planet','Temperatur':'Temperature','Rohstoffe':'Resources','Lager':'Storage','Gebäude':'Buildings','Gebäude gesamt':'Total Buildings','Eisen':'Iron','Stahl':'Steel','Stein':'Stone','Kohle':'Coal','Gas':'Gas','CO₂':'CO₂','Atmosphärendruck':'Atmospheric Pressure','CO₂ in Atmosphäre':'CO₂ in Atmosphere','Gasabbau senkt den Atmosphärendruck direkt.':'Gas extraction directly lowers atmospheric pressure.','Silizium':'Silicon','Wasser':'Water','Metalle':'Metals','Gestein':'Rock','Energie':'Energy','Eisenproduktion':'Iron Production','Eisenverbrauch':'Iron Consumption','Stahlproduktion':'Steel Production','Siliziumproduktion':'Silicon Production','Batterien':'Batteries','Batterieproduktion':'Battery Production','Produktionskette: Batterien':'Battery Production Chain','Siliziumverbrauch':'Silicon Consumption','Stromproduktion':'Electricity Production','Bauen':'Build','kostenlos':'free','weitere':'additional','Steinbruch':'Stone Quarry','Kohlemine':'Coal Mine','Gasförderanlage':'Gas Plant','Eisenmine':'Iron Mine','Siliziummine':'Silicon Mine','Stahlwerk':'Steel Mill','Kohlekraftwerk':'Coal Power Plant','Raketenstation':'Rocket Station','Maschinenfabrik':'Machine Factory','Maschinen':'Machines','Transportzentrale':'Transport Center','Zielplanet':'Destination Planet','Anzahl':'Amount','Fracht pro Rakete':'Cargo per Rocket','Aktive Transporte':'Active Transports','Keine abbaubaren Rohstoffe.':'No extractable resources.','Noch keine Rohstoffe abgebaut':'No resources extracted yet','Bauzeit':'Build Time','Flugzeit':'Flight Time','Rückflug':'Return Flight','Hinflug':'Outbound Flight','Gesamtkapazität':'Total Capacity','verfügbar':'available','bis Ankunft':'until arrival','Sekunden':'seconds','t Stahl':'t steel','t Eisen':'t iron','t Stein':'t stone','t Kohle':'t coal','t Gas':'t gas','t Silizium':'t silicon','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'No return cargo','zurück':'back','Starten':'Launch','Schließen':'Close','Uran':'Uranium','Polymere':'Polymers','Polymerfabrik':'Polymer Factory','Uranmine':'Uranium Mine','Uranaufbereitungsanlage':'Uranium Processing Plant','Aufbereitetes Uran':'Processed Uranium','Kernbrennstoffanlage':'Nuclear Fuel Plant','Kernbrennstoff':'Nuclear Fuel','Kernreaktor':'Nuclear Reactor','Chipfabrik':'Chip Factory','Chips':'Chips','Beton':'Concrete','Sonnensegel':'Solar Sail','Aufgaben':'Tasks','Einführung · Ziele und Fortschritt':'Introduction · Goals and progress','Baue eine Eisenmine':'Build an iron mine','Baue 1.000 t Eisenerz ab':'Mine 1,000 t iron ore','Baue ein Stahlwerk':'Build a steel mill','Produziere 1.000 t Stahl':'Produce 1,000 t steel','Baue deine erste Eisenmine.':'Build your first iron mine.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Mine a total of 1,000 t iron from planetary deposits.','Baue dein erstes Stahlwerk.':'Build your first steel mill.','Produziere insgesamt 1.000 t Stahl.':'Produce a total of 1,000 t steel.','Fortschritt':'Progress','Forschungspunkte':'Research Points'
  },
  fr: {
    'Weltraum Game':'Jeu spatial','Sonnensystem · Rohstoffe · Aufbau · Transport':'Système solaire · Ressources · Développement · Transport','Neuigkeiten':'Actualités','Wirtschaft':'Économie','Forschung':'Recherche','Forschungsbaum':'Arbre technologique','Forschungslabor':'Laboratoire de recherche','Forschungspunkte':'Points de recherche','Forschen':'Rechercher','Abgeschlossen':'Terminé','Spiel':'Jeu','Menü':'Menu','Einführung':'Introduction','Sprache':'Langue','Neuigkeiten & Updates':'Actualités & mises à jour','Entwicklungsstand von Solar Frontier: Origins':'État du développement de Solar Frontier: Origins','Aktuelle Ankündigung':'Annonce actuelle','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins continue son développement','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'Le jeu est en développement actif. De nouveaux contenus, objectifs et améliorations techniques sont ajoutés progressivement.','Aktuelle Version':'Version actuelle','Nächstes Update':'Prochaine mise à jour','Geplant':'Prévu','Aktuelle Entwicklung':'Développement actuel','Was gerade im Spiel entsteht':'Développement en cours','Weiterentwicklung des Sonnensystems':'Développement du système solaire','Rohstoffabbau und Gebäude auf der Erde':'Extraction de ressources et bâtiments sur Terre','Siliziummine und weitere Produktionsgebäude':'Mine de silicium et autres bâtiments de production','Raketenbau und interplanetarer Transport':'Construction de fusées et transport interplanétaire','Speichern und Laden des Spielstands':'Sauvegarde et chargement de la partie','Hinweis für Spieler':'Information aux joueurs','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'Le jeu est en développement actif. Des changements et mises à jour peuvent être ajoutés à tout moment.','Wirtschafts-Dashboard':'Tableau de bord économique','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Aperçu du stockage, de la production, de la consommation et des bâtiments','Spielstand':'Sauvegarde','Speichern':'Sauvegarder','Laden':'Charger','Neustart':'Redémarrer','Sonne':'Soleil','Merkur':'Mercure','Venus':'Vénus','Erde':'Terre','Mars':'Mars','Jupiter':'Jupiter','Luna':'Lune','Stern':'Étoile','Planet':'Planète','Startplanet':'Planète de départ','Temperatur':'Température','Rohstoffe':'Ressources','Lager':'Stockage','Gebäude':'Bâtiments','Gebäude gesamt':'Bâtiments au total','Eisen':'Fer','Stahl':'Acier','Stein':'Pierre','Kohle':'Charbon','Gas':'Gaz','Silizium':'Silicium','Wasser':'Eau','Metalle':'Métaux','Gestein':'Roche','Energie':'Énergie','Eisenproduktion':'Production de fer','Eisenverbrauch':'Consommation de fer','Stahlproduktion':'Production d’acier','Siliziumproduktion':'Production de silicium','Batterien':'Batteries','Batterieproduktion':'Production de batteries','Produktionskette: Batterien':'Chaîne de production des batteries','Siliziumverbrauch':'Consommation de silicium','Stromproduktion':'Production d’électricité','Bauen':'Construire','kostenlos':'gratuit','weitere':'supplémentaire','Steinbruch':'Carrière de pierre','Kohlemine':'Mine de charbon','Gasförderanlage':'Installation de gaz','Eisenmine':'Mine de fer','Siliziummine':'Mine de silicium','Stahlwerk':'Aciérie','Kohlekraftwerk':'Centrale à charbon','Raketenstation':'Station de fusées','Maschinenfabrik':'Usine de machines','Maschinen':'Machines','Transportzentrale':'Centre de transport','Zielplanet':'Planète destination','Anzahl':'Quantité','Fracht pro Rakete':'Fret par fusée','Aktive Transporte':'Transports actifs','Keine abbaubaren Rohstoffe.':'Aucune ressource exploitable.','Noch keine Rohstoffe abgebaut':'Aucune ressource extraite','Bauzeit':'Temps de construction','Flugzeit':'Temps de vol','Rückflug':'Vol retour','Hinflug':'Vol aller','Gesamtkapazität':'Capacité totale','verfügbar':'disponible','bis Ankunft':'avant l’arrivée','Sekunden':'secondes','t Stahl':'t acier','t Eisen':'t fer','t Stein':'t pierre','t Kohle':'t charbon','t Gas':'t gaz','t Silizium':'t silicium','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'Aucun fret retour','zurück':'retour','Starten':'Lancer','Schließen':'Fermer','Uran':'Uranium','Uranmine':'Mine d’uranium','Uranaufbereitungsanlage':'Usine de traitement de l’uranium','Aufbereitetes Uran':'Uranium traité','Kernbrennstoffanlage':'Usine de combustible nucléaire','Kernbrennstoff':'Combustible nucléaire','Kernreaktor':'Réacteur nucléaire','Chipfabrik':'Usine de puces','Chips':'Puces','Beton':'Béton','Sonnensegel':'Voile solaire','Aufgaben':'Tâches','Einführung · Ziele und Fortschritt':'Introduction · objectifs et progression','Baue eine Eisenmine':'Construire une mine de fer','Baue 1.000 t Eisenerz ab':'Extraire 1 000 t de minerai de fer','Baue ein Stahlwerk':'Construire une aciérie','Produziere 1.000 t Stahl':'Produire 1 000 t d’acier','Baue deine erste Eisenmine.':'Construire votre première mine de fer.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Extraire au total 1 000 t de fer des gisements planétaires.','Baue dein erstes Stahlwerk.':'Construire votre première aciérie.','Produziere insgesamt 1.000 t Stahl.':'Produire au total 1 000 t d’acier.','Fortschritt':'Progression'
  }
};
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
// Zusätzlich zum 5-Sekunden-Autosave den aktuellen Stand beim Verlassen sichern.
window.addEventListener('pagehide', () => saveGame(false));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveGame(false); });

['pointerdown','touchstart','keydown'].forEach(evt=>document.addEventListener(evt, unlockAudio, {once:true, passive:true}));
