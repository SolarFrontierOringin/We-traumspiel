/* =========================================================
   SOLAR FRONTIER: ORIGINS – ZENTRALE ARBEITSKRÄFTEVERWALTUNG
   Eigenständiges, erweiterbares Modul.
   Gebäude werden erst registriert, wenn ihr Arbeitskräftebedarf
   später ausdrücklich festgelegt wird.
   ========================================================= */
(function (global) {
  'use strict';

  const VERSION = 2;

  // Testintegration: Eine Raffinerie benötigt vier Arbeitskräfte je Gebäude.
  const BUILDING_WORKFORCE_REQUIREMENTS = Object.freeze({ refinery: 4, lithiumBatteryFactory: 30 });

  function number(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
  }

  function ensurePlanet(planetId, planet) {
    if (!planet || planetId === 'sun') return null;

    if (!planet.workforce || typeof planet.workforce !== 'object') {
      planet.workforce = {
        version: VERSION,
        totalWorkers: 0,
        assignedWorkers: 0,
        freeWorkers: 0,
        buildings: {}
      };
    }

    const workforce = planet.workforce;
    workforce.version = VERSION;
    workforce.totalWorkers = number(workforce.totalWorkers);
    if (!workforce.buildings || typeof workforce.buildings !== 'object') {
      workforce.buildings = {};
    }

    recalculate(workforce);
    return workforce;
  }

  function recalculate(workforce) {
    if (!workforce) return null;

    let remaining = number(workforce.totalWorkers);
    let assigned = 0;

    // Die Reihenfolge der Registrierung bestimmt bei Knappheit die Priorität.
    for (const entry of Object.values(workforce.buildings)) {
      if (!entry || typeof entry !== 'object') continue;
      const count = number(entry.count);
      const workersPerBuilding = number(entry.workersPerBuilding);
      const productionPercent = Math.min(100, number(entry.productionPercent, 100));
      const powerFactor = Math.min(1, number(entry.powerFactor, 1));
      const effectivePercent = productionPercent * powerFactor;
      const requested = count * workersPerBuilding * (effectivePercent / 100);
      const allocated = Math.min(remaining, requested);

      entry.requiredWorkers = requested;
      entry.assignedWorkers = allocated;
      entry.unfilledWorkers = Math.max(0, requested - allocated);
      entry.powerFactor = powerFactor;
      entry.effectiveProductionPercent = requested > 0
        ? Math.min(effectivePercent, (allocated / (count * workersPerBuilding)) * 100)
        : effectivePercent;

      remaining -= allocated;
      assigned += allocated;
    }

    workforce.assignedWorkers = assigned;
    workforce.freeWorkers = Math.max(0, number(workforce.totalWorkers) - assigned);
    return workforce;
  }

  function initializeAll(planets) {
    if (!planets || typeof planets !== 'object') return;
    for (const [planetId, planet] of Object.entries(planets)) {
      ensurePlanet(planetId, planet);
    }
  }

  function setPopulation(planetId, planet, workerCount) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce) return null;
    workforce.totalWorkers = Math.floor(number(workerCount));
    return recalculate(workforce);
  }

  // Synchronisiert die registrierten Gebäude mit dem tatsächlichen Gebäudebestand.
  // Für den aktuellen Test ist ausschließlich die Raffinerie mit 4 Arbeitern hinterlegt.
  function syncBuildings(planetId, planet, buildings, performance = {}, powerFactors = {}) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce || !buildings || typeof buildings !== 'object') return null;

    for (const [buildingKey, workersPerBuilding] of Object.entries(BUILDING_WORKFORCE_REQUIREMENTS)) {
      const count = number(buildings[buildingKey]);
      const previous = workforce.buildings[buildingKey] || {};
      const rawPercent = Number(performance?.[buildingKey]);
      const productionPercent = Math.min(100, Math.max(0,
        Number.isFinite(rawPercent) ? rawPercent : number(previous.productionPercent, 100)
      ));
      workforce.buildings[buildingKey] = {
        count,
        workersPerBuilding,
        productionPercent,
        powerFactor: Math.min(1, number(powerFactors?.[buildingKey], number(previous.powerFactor, 1))),
        requiredWorkers: 0,
        assignedWorkers: 0,
        unfilledWorkers: 0,
        effectiveProductionPercent: 0
      };
    }
    return recalculate(workforce);
  }

  // Ausschließlich echte Kolonisten zählen als Arbeitskräfte.
  // Freie Bevölkerung wird bewusst nicht gelesen oder übernommen.
  function syncColonistPopulation(planetId, planet) {
    const previous = number(planet?.workforce?.totalWorkers);
    const result = setPopulation(planetId, planet, planet?.colonists);
    const panel = typeof document !== 'undefined' ? document.getElementById('workforce-panel') : null;
    if (panel && !panel.hidden && previous !== number(planet?.colonists)) renderPanel();
    return result;
  }

  function renderPanel() {
    if (typeof document === 'undefined' || typeof bodies === 'undefined') return;
    const root = document.getElementById('workforce-content');
    if (!root) return;

    const priority = id => id === 'earth' ? 0 : id === 'luna' ? 1 : id === 'mercury' ? 2 : id === 'venus' ? 3 : id === 'mars' ? 4 : 5;
    const ids = Object.keys(bodies)
      .filter(id => id !== 'sun')
      .sort((a, b) => priority(a) - priority(b) || String(bodies[a]?.name || a).localeCompare(String(bodies[b]?.name || b), 'de'));

    const totals = ids.reduce((sum, id) => {
      const workforce = ensurePlanet(id, bodies[id]);
      sum.total += workforce?.totalWorkers || 0;
      sum.assigned += workforce?.assignedWorkers || 0;
      sum.free += workforce?.freeWorkers || 0;
      return sum;
    }, { total: 0, assigned: 0, free: 0 });

    const fmt = value => Math.floor(number(value)).toLocaleString('de-DE');
    root.innerHTML = `
      <div class="workforce-summary">
        <article class="workforce-summary-card"><span>Kolonisten gesamt</span><strong>${fmt(totals.total)}</strong></article>
        <article class="workforce-summary-card"><span>Beschäftigt</span><strong>${fmt(totals.assigned)}</strong></article>
        <article class="workforce-summary-card"><span>Freie Arbeitskräfte</span><strong>${fmt(totals.free)}</strong></article>
      </div>
      <p class="hint workforce-note">Arbeitskräfte sind ausschließlich Kolonisten. Die freie Bevölkerung wird nicht mitgerechnet. Im Test benötigt jede Raffinerie vier Arbeitskräfte; weitere Gebäudebedarfe folgen schrittweise.</p>
      <div class="workforce-planet-list">
        ${ids.map(id => {
          const planet = bodies[id];
          const workforce = ensurePlanet(id, planet);
          const registered = Object.entries(workforce?.buildings || {}).filter(([, entry]) => number(entry.count) > 0);
          return `<details class="workforce-planet-card">
            <summary><strong>${String(planet.name || id)}</strong><span>${fmt(workforce?.totalWorkers)} Kolonisten · ${fmt(workforce?.freeWorkers)} verfügbar</span></summary>
            <div class="workforce-planet-stats">
              <div class="stat"><span>Kolonisten insgesamt</span><strong>${fmt(workforce?.totalWorkers)}</strong></div>
              <div class="stat"><span>Beschäftigte Arbeitskräfte</span><strong>${fmt(workforce?.assignedWorkers)}</strong></div>
              <div class="stat"><span>Freie Arbeitskräfte</span><strong>${fmt(workforce?.freeWorkers)}</strong></div>
              ${registered.length ? registered.map(([key, entry]) => `<div class="stat"><span>${key}</span><strong>${fmt(entry.assignedWorkers)} / ${fmt(entry.requiredWorkers)} · ${Math.round(number(entry.effectiveProductionPercent))}% Leistung</strong></div>`).join('') : '<p class="hint">Noch keine Gebäude mit Arbeitskräftebedarf registriert.</p>'}
            </div>
          </details>`;
        }).join('')}
      </div>`;
  }

  function setupWorkforcePanel() {
    // Die Arbeitskräfteübersicht ist als dritter Reiter in der Bevölkerungszentrale eingebettet.
    // Das Umschalten der Reiter übernimmt die zentrale Bevölkerungsnavigation.
  }

  function registerBuilding(planetId, planet, buildingKey, count, workersPerBuilding) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce || !buildingKey) return null;

    const previous = workforce.buildings[buildingKey] || {};
    workforce.buildings[buildingKey] = {
      count: number(count),
      workersPerBuilding: number(workersPerBuilding),
      productionPercent: Math.min(100, number(previous.productionPercent, 100)),
      requiredWorkers: 0,
      assignedWorkers: 0,
      unfilledWorkers: 0,
      effectiveProductionPercent: 0
    };
    return recalculate(workforce);
  }

  function setBuildingCount(planetId, planet, buildingKey, count) {
    const workforce = ensurePlanet(planetId, planet);
    const entry = workforce?.buildings?.[buildingKey];
    if (!entry) return null;
    entry.count = number(count);
    return recalculate(workforce);
  }

  function setProductionPercent(planetId, planet, buildingKey, percent) {
    const workforce = ensurePlanet(planetId, planet);
    const entry = workforce?.buildings?.[buildingKey];
    if (!entry) return null;
    entry.productionPercent = Math.min(100, number(percent));
    return recalculate(workforce);
  }

  // Übernimmt den tatsächlichen Strom-Versorgungsfaktor aus der Energieverwaltung.
  // Dadurch wird der Personalbedarf für jedes registrierte Gebäude sofort angepasst.
  function setPowerFactor(planetId, planet, buildingKey, factor) {
    const workforce = ensurePlanet(planetId, planet);
    const entry = workforce?.buildings?.[buildingKey];
    if (!entry) return null;
    entry.powerFactor = Math.min(1, number(factor, 1));
    return recalculate(workforce);
  }

  function syncPowerFactors(planetId, planet, powerFactors = {}) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce) return null;
    for (const [buildingKey, entry] of Object.entries(workforce.buildings)) {
      if (!entry || typeof entry !== 'object') continue;
      const raw = Number(powerFactors?.[buildingKey]);
      entry.powerFactor = Number.isFinite(raw)
        ? Math.min(1, Math.max(0, raw))
        : 1;
    }
    return recalculate(workforce);
  }

  function unregisterBuilding(planetId, planet, buildingKey) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce || !workforce.buildings[buildingKey]) return null;
    delete workforce.buildings[buildingKey];
    return recalculate(workforce);
  }

  function getSummary(planetId, planet) {
    const workforce = ensurePlanet(planetId, planet);
    if (!workforce) return null;
    return {
      totalWorkers: workforce.totalWorkers,
      assignedWorkers: workforce.assignedWorkers,
      freeWorkers: workforce.freeWorkers,
      registeredBuildings: Object.keys(workforce.buildings).length
    };
  }

  function getBuilding(planetId, planet, buildingKey) {
    const workforce = ensurePlanet(planetId, planet);
    const entry = workforce?.buildings?.[buildingKey];
    return entry ? { ...entry } : null;
  }

  global.SolarFrontierWorkforce = Object.freeze({
    version: VERSION,
    initializeAll,
    ensurePlanet,
    setPopulation,
    syncColonistPopulation,
    syncBuildings,
    registerBuilding,
    setBuildingCount,
    setProductionPercent,
    setPowerFactor,
    syncPowerFactors,
    unregisterBuilding,
    getSummary,
    getBuilding,
    renderPanel,
    recalculate
  });

  // Legt die Verwaltung für alle vorhandenen Planeten an.
  // Die Kolonisten werden im regulären Spieltick als Arbeitskräftebestand synchronisiert.
  // Gebäude-Bedarfe werden erst ergänzt, wenn sie später ausdrücklich definiert werden.
  if (typeof bodies !== 'undefined') initializeAll(bodies);
  setupWorkforcePanel();
})(window);
