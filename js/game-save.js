/* Solar Frontier: Origins – zentrale Speicherverwaltung
 * Aus game.js ausgelagert. Muss vor game.js geladen werden.
 * Greift zur Laufzeit auf die globalen Spielvariablen und Speicher-Konstanten zu.
 */

// Spiel- und Speicherformatversion getrennt halten:
// appVersion = veröffentlichte Spielversion, schemaVersion = Struktur des JSON-Spielstands.
const SFO_APP_VERSION = '1.0.0';
const SFO_SAVE_SCHEMA_VERSION = 9;
const SFO_LAST_APP_VERSION_KEY = 'sfo_last_app_version_v1';

function sfoCompareVersions(a, b) {
  const aa = String(a || '0').split('.').map(n => parseInt(n, 10) || 0);
  const bb = String(b || '0').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
    const x = aa[i] || 0, y = bb[i] || 0;
    if (x !== y) return x - y;
  }
  return 0;
}

// Vor jeder strukturellen Migration wird eine unveränderte Kopie des Roh-Saves gesichert.
function sfoPreservePreMigrationSave(raw, backupKey) {
  if (!raw || !backupKey) return;
  try {
    const existing = localStorage.getItem(backupKey);
    if (!existing) localStorage.setItem(backupKey, raw);
    else {
      // Migration-Snapshot getrennt halten, damit ein älteres Backup nicht verloren geht.
      const migrationKey = `${backupKey}_pre_migration_v1`;
      if (!localStorage.getItem(migrationKey)) localStorage.setItem(migrationKey, raw);
    }
  } catch (error) {
    console.warn('Vor-Migrations-Backup konnte nicht angelegt werden:', error);
  }
}

// Zentrale, idempotente Migration des Speicherformats.
// Fachliche Altspielstand-Anpassungen (Ressourcen, Gebäude, Missionen usw.)
// bleiben zusätzlich in loadGame() bestehen und werden dort anhand ihrer Marker ausgeführt.
function sfoMigrateSaveData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Ungültiges Speicherformat: kein JSON-Objekt.');
  }
  const currentSchema = Number(data.schemaVersion || data.version || 1);
  if (!Number.isFinite(currentSchema) || currentSchema > SFO_SAVE_SCHEMA_VERSION) {
    throw new Error('Dieser Spielstand stammt aus einer neueren, nicht unterstützten Spielversion.');
  }

  let migrated = false;
  // v1-v3 verwendeten "version" ohne separates Schemafeld.
  // v5-v9 ergänzen Register, Planeten, 4t-Atmosphärenregel, erlaubte Gase, Gasplaneten-Atmosphären und Gaskraftwerk.
  if (currentSchema < SFO_SAVE_SCHEMA_VERSION) {
    data.schemaVersion = SFO_SAVE_SCHEMA_VERSION;
    data.version = SFO_SAVE_SCHEMA_VERSION;
    migrated = true;
  }
  if (!data.state || typeof data.state !== 'object' || Array.isArray(data.state)) {
    throw new Error('Ungültiger Spielstand: Spielstatus fehlt.');
  }
  if (!data.bodies || typeof data.bodies !== 'object' || Array.isArray(data.bodies)) {
    throw new Error('Ungültiger Spielstand: Planetendaten fehlen.');
  }
  // v7-v8: veraltete Atmosphärengase und Gaslager entfernen; Durchmesser ergänzen und Gasplaneten-Atmosphären neu initialisieren.
  const sfoDiameters = { mercury:2600, venus:7200, earth:6370, luna:1738, mars:3390, jupiter:69911, saturn:58232, uranus:25326, neptune:24622, pluto:1919, ceres:582, io:3643, nivaris:9842, noxaris:6400, themepatin:5190, pyrophor:3942, rethroxid:1988 };
  const allowedGases = new Set(['helium3','oxygen','hydrogen','co2','nitrogen']);
  for (const [planetId, body] of Object.entries(data.bodies)) {
    if (!body || typeof body !== 'object') continue;
    if (sfoDiameters[planetId]) body.diameterKm = sfoDiameters[planetId];
    for (const storage of [body.storage, body.orbitStorage]) {
      if (!storage || typeof storage !== 'object') continue;
      for (const key of ['gas','helium','argon','methane','carbonMonoxide','sulfurDioxide','sodium','potassium']) delete storage[key];
    }
    if (body.atmosphere && typeof body.atmosphere === 'object') {
      const old = body.atmosphere.gases && typeof body.atmosphere.gases === 'object' ? body.atmosphere.gases : {};
      body.atmosphere.gases = Object.fromEntries(Object.entries(old).filter(([key]) => allowedGases.has(key)));
      delete body.atmosphere.pressure;
      // Ältere Spielstände erhalten für Gasplaneten die korrigierte 4t/km²-Initialisierung.
      if (['jupiter','saturn','uranus','neptune'].includes(planetId)) {
        delete body.atmosphere.ruleVersion;
        body.atmosphere.totalGas = 0;
        body.atmosphere.oxygen = 0;
        body.atmosphere.gases = {};
      } else if (currentSchema < 7) {
        delete body.atmosphere.ruleVersion;
      }
    }
  }
  if (data.bodies.venus?.resources && typeof data.bodies.venus.resources === 'object') {
    // Die frühere Venus-CO₂-Ressource war eine alte Atmosphären-Massen-Sonderbehandlung.
    delete data.bodies.venus.resources.co2;
  }
  if (data.state && typeof data.state === 'object') {
    for (const key of ['gas','helium','argon','methane','carbonMonoxide','sulfurDioxide','sodium','potassium']) delete data.state[key];
  }
  if (data.market && typeof data.market === 'object') {
    for (const key of ['gas','helium','argon','methane','carbonMonoxide','sulfurDioxide','sodium','potassium']) delete data.market[key];
  }
  if (!data.market || typeof data.market !== 'object') data.market = {};
  if (!data.rockets || !Array.isArray(data.rockets)) data.rockets = [];
  if (!data.orbitMissions || !Array.isArray(data.orbitMissions)) data.orbitMissions = [];
  data.appVersion = String(data.appVersion || 'legacy');
  return { data, migrated };
}

function sfoCheckForGameUpdate() {
  try {
    const previous = localStorage.getItem(SFO_LAST_APP_VERSION_KEY);
    if (previous && sfoCompareVersions(SFO_APP_VERSION, previous) > 0) {
      console.info(`Solar Frontier: Origins aktualisiert: ${previous} → ${SFO_APP_VERSION}`);
      return { updated: true, previous, current: SFO_APP_VERSION };
    }
    return { updated: false, previous, current: SFO_APP_VERSION };
  } catch (error) {
    console.warn('Update-Prüfung nicht verfügbar:', error);
    return { updated: false, previous: null, current: SFO_APP_VERSION };
  }
}

function sfoRecordCurrentGameVersion() {
  try { localStorage.setItem(SFO_LAST_APP_VERSION_KEY, SFO_APP_VERSION); }
  catch (error) { console.warn('Spielversion konnte nicht gespeichert werden:', error); }
}

function showSaveStatus(message, good = true) {
  if (!saveStatus) return;
  saveStatus.textContent = message;
  saveStatus.className = `save-status ${good ? 'good' : 'bad'}`;
}

function getSaveData() {
  return {
    version: 4,
    appVersion: SFO_APP_VERSION,
    schemaVersion: SFO_SAVE_SCHEMA_VERSION,
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
    const keys = getSaveSlotKeys();
    const previous = localStorage.getItem(keys.save);
    if (previous) localStorage.setItem(keys.backup, previous);
    localStorage.setItem(keys.save, serialized);
    sfoRecordCurrentGameVersion();

    // Nach erfolgreicher Übernahme in Slot 1 alte Einzelspeicher entfernen,
    // damit ein späterer Neustart den alten Stand nicht versehentlich zurückholt.
    if (activeSaveSlot === 1) {
      localStorage.removeItem(LEGACY_SAVE_KEY_V2);
      localStorage.removeItem(LEGACY_SAVE_KEY);
      localStorage.removeItem(LEGACY_BACKUP_SAVE_KEY);
    }
    if (showMessage) showSaveStatus(`Spielstand ${activeSaveSlot} automatisch gespeichert.`);
    return true;
  } catch (error) {
    console.error(error);
    showSaveStatus('Speichern fehlgeschlagen.', false);
    return false;
  }
}

function loadGame(showMessage = true) {
  try {
    const keys = getSaveSlotKeys();
    // Zuerst den gewählten Slot laden. Nur Slot 1 übernimmt einmalig den
    // bisherigen Einzelspielstand aus älteren Versionen.
    let raw = localStorage.getItem(keys.save);
    let migratedLegacy = false;
    if (!raw && activeSaveSlot === 1) {
      raw = localStorage.getItem(LEGACY_SAVE_KEY_V2);
      if (!raw) raw = localStorage.getItem(LEGACY_SAVE_KEY);
      if (!raw) raw = localStorage.getItem(LEGACY_BACKUP_SAVE_KEY);
      if (raw) migratedLegacy = true;
    }
    if (!raw) raw = localStorage.getItem(keys.backup);
    if (!raw) {
      if (showMessage) showSaveStatus(`Spielstand ${activeSaveSlot} ist noch leer. Ein neues Universum wird gestartet.`);
      return false;
    }
    const updateInfo = sfoCheckForGameUpdate();
    let data = JSON.parse(raw);
    if (!data || !data.state || !data.bodies) throw new Error('Ungültiger Spielstand');

    // Alte Speicherstände vor jeder Migration unverändert sichern.
    const originalSchema = Number(data.schemaVersion || data.version || 1);
    if (originalSchema < SFO_SAVE_SCHEMA_VERSION) {
      sfoPreservePreMigrationSave(raw, keys.backup);
    }
    const migrationResult = sfoMigrateSaveData(data);
    data = migrationResult.data;

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
    if (typeof sfoNormalizePlayerResourceSave === 'function') sfoNormalizePlayerResourceSave(state);
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
    if (typeof sfoMergeBodyResourceDefaults === 'function') sfoMergeBodyResourceDefaults(data.bodies);
    if (typeof sfoNormalizeBuildingSave === 'function') sfoNormalizeBuildingSave(data.state, data.bodies);
    Object.assign(bodies, data.bodies);
    // Neue Golderzvorkommen für bestehende Spielstände ergänzen, ohne bereits abgebaute Bestände aufzufüllen.
    for (const [planetId, initialGoldOre] of Object.entries({ earth: 5000000, luna: 7000000, mars: 11000000 })) {
      if (bodies[planetId] && bodies[planetId].resources && !Object.prototype.hasOwnProperty.call(bodies[planetId].resources, 'goldOre')) bodies[planetId].resources.goldOre = initialGoldOre;
    }
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
    // Alte/teilweise beschädigte Saves dürfen die Simulationsschleife nicht blockieren.
    // Ungültige Missionseinträge werden nicht gelöscht: reparierbare Objekte bleiben erhalten
    // und werden bei fehlenden Pflichtdaten pausiert, damit keine Fracht/Rakete verloren geht.
    const savedMissions = Array.isArray(data.orbitMissions) ? data.orbitMissions : [];
    const safeMissions = savedMissions.filter(m => m && typeof m === 'object' && !Array.isArray(m));
    orbitMissions.splice(0, orbitMissions.length, ...safeMissions);
    orbitMissionCounter = Math.max(1, Number(data.orbitMissionCounter) || 1);
    orbitMissions.forEach(m => {
      if (m.status === 'outbound' || m.status === 'returning') m.lastTick = gameNow();
      if (!bodies[m.source] || !bodies[m.destination] || !rocketTypes[m.rocketType] || typeof m.resource !== 'string') {
        m.status = 'paused';
        m.message = 'Mission pausiert: gespeicherte Missionsdaten sind unvollständig. Bitte Quelle, Ziel, Rakete und Fracht prüfen.';
      } else if (!['waiting', 'outbound', 'returning', 'paused', 'completed', 'deleted'].includes(m.status)) {
        m.status = 'paused';
        m.message = 'Mission pausiert: unbekannter Missionsstatus im Spielstand.';
      }
    });
    // Neue Rohstoffvorkommen aus späteren Spielversionen auch in alten Spielständen ergänzen.
    const defaultResources = {
      mercury: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000, titanOre: 5000000, water: 2000000000 },
      earth: { nickelOre: 500000, graphite: 4000000, coal: 15000000, gas: 20000000, co2: 1000000, lithium: 30000, copperOre: 10000000, crudeOil: 15000000, uranium: 1000000, bauxite: 10000000, water: 1000000000, trees: 10000 },
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
    // Erd-Rohölvorkommen einmalig auf 15.000.000 Liter erhöhen.
    // Bereits abgefördertes Rohöl aus dem alten 6-Mio.-Liter-Vorkommen bleibt berücksichtigt.
    if (bodies.earth?.resources && !bodies.earth.crudeOilDepositUpgrade20261107) {
      const currentCrudeOil = Number(bodies.earth.resources.crudeOil);
      if (!Number.isFinite(currentCrudeOil)) {
        bodies.earth.resources.crudeOil = 15000000;
      } else if (currentCrudeOil <= 6000000) {
        const alreadyMined = Math.max(0, 6000000 - currentCrudeOil);
        bodies.earth.resources.crudeOil = Math.max(0, 15000000 - alreadyMined);
      }
      bodies.earth.crudeOilDepositUpgrade20261107 = true;
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
    const savedRockets = Array.isArray(data.rockets) ? data.rockets : [];
    savedRockets.forEach(r => {
      if (!r || typeof r !== 'object' || Array.isArray(r)) {
        console.warn('Ungültiger Raketen-Datensatz im Spielstand übersprungen.');
        return;
      }
      // Unbekannte oder unvollständige aktive Flüge isolieren, ohne sie aus dem Save zu löschen.
      const validRocketStatuses = ['approach', 'error', 'landed', 'mining', 'orbit', 'outbound', 'paused', 'returned', 'returning', 'unloading', 'waiting'];
      if (typeof r.status !== 'string' || !validRocketStatuses.includes(r.status)) {
        r.status = 'error';
        r.message = r.message || 'Rakete isoliert: gespeicherter Status fehlt oder ist unbekannt.';
      } else if (['outbound', 'returning'].includes(r.status) &&
          (!bodies[r.from] || !bodies[r.to] || !Number.isFinite(Number(r.started)) || !Number.isFinite(Number(r.duration)))) {
        r.status = 'error';
        r.message = r.message || 'Rakete isoliert: Start, Ziel oder Flugdauer im Spielstand ist unvollständig.';
      }
      rockets.push(r);
    });
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
    Object.assign(rocketFactoryQueue, data.rocketFactoryQueue && typeof data.rocketFactoryQueue === 'object' ? data.rocketFactoryQueue : {});
    Object.keys(rocketFactoryQueue).forEach(id => {
      const queue = rocketFactoryQueue[id];
      if (!Array.isArray(queue)) {
        rocketFactoryQueue[id] = [];
        return;
      }
      rocketFactoryQueue[id] = queue.filter(type => {
        const valid = typeof type === 'string' && Object.prototype.hasOwnProperty.call(rocketTypes, type);
        if (!valid) console.warn('Ungültiger Raketenfabrik-Warteschlangeneintrag übersprungen:', id, type);
        return valid;
      });
    });
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
    if (migratedLegacy || migrationResult.migrated) saveGame(false);
    sfoRecordCurrentGameVersion();
    if (showMessage) {
      const baseMessage = migratedLegacy
        ? 'Bisheriger Spielstand wurde in Speicherplatz 1 übernommen.'
        : `Spielstand ${activeSaveSlot} geladen.`;
      showSaveStatus(updateInfo.updated
        ? `${baseMessage} Spielupdate ${updateInfo.previous} → ${updateInfo.current} erkannt; Speicherformat geprüft.`
        : baseMessage);
    }
    return true;
  } catch (error) {
    console.error(error);
    if (showMessage) showSaveStatus('Laden fehlgeschlagen.', false);
    return false;
  }
}

