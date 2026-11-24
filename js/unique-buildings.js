/* Solar Frontier: Origins 1.1.0 – Einzigartige Gebäude / Hauptquartier Forschung */
(() => {
  'use strict';

  const DEPARTMENTS = [
    { id: 'nuclear', title: 'Forscher für Nukleartechnik', description: 'Kernenergie, Kernreaktoren und zukünftige Nuklearforschung' },
    { id: 'space', title: 'Forscher für Weltraumtechnik', description: 'Raketen, Antriebe und Raumfahrt' },
    { id: 'atmosphere', title: 'Forscher für Atmosphärenwissenschaft', description: 'Atmosphäre, Klimaforschung und Terraforming' },
    { id: 'probes', title: 'Forscher für Sondentechnik', description: 'Planetensonden und Erkundung' }
  ];
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WAGE_PER_RESEARCHER_DAY = 120;
  const TRAINING_MS = 2 * DAY_MS;
  let lastObservedGameTime = 0;

  function ensureHQ() {
    if (!state.uniqueBuildings || typeof state.uniqueBuildings !== 'object') state.uniqueBuildings = {};
    let hq = state.uniqueBuildings.researchHQ;
    if (!hq || typeof hq !== 'object') {
      hq = state.uniqueBuildings.researchHQ = {};
    }
    hq.built = Boolean(hq.built);
    hq.everBuilt = Boolean(hq.everBuilt || hq.built);
    hq.researchers = Math.max(0, Math.floor(Number(hq.researchers) || 0));
    if (!Array.isArray(hq.trainingQueue)) hq.trainingQueue = [];
    if (!hq.departments || typeof hq.departments !== 'object') hq.departments = {};
    if (!hq.active || typeof hq.active !== 'object') hq.active = {};
    for (const department of DEPARTMENTS) {
      hq.departments[department.id] = Math.max(0, Math.floor(Number(hq.departments[department.id]) || 0));
      hq.active[department.id] = Boolean(hq.active[department.id]);
    }
    hq.lastSalaryDay = Math.max(0, Math.floor(Number(hq.lastSalaryDay) || 0));
    hq.unpaidWages = Math.max(0, Number(hq.unpaidWages) || 0);
    return hq;
  }

  function fmt(value, digits = 0) {
    return Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: digits });
  }
  function totalTraining() {
    return ensureHQ().trainingQueue.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.count) || 0)), 0);
  }
  function assignedTotal(hq = ensureHQ()) {
    return DEPARTMENTS.reduce((sum, d) => sum + hq.departments[d.id], 0);
  }
  function freeResearchers(hq = ensureHQ()) {
    return Math.max(0, hq.researchers - assignedTotal(hq));
  }
  function currentDay(now = gameNow()) {
    return Math.floor(Math.max(0, now) / DAY_MS);
  }
  function earthPopulation() {
    return Math.max(0, Math.floor(Number(ensureColonistData('earth')?.colonists) || 0));
  }
  function notify(message, good = true) {
    if (typeof showMarketToast === 'function') showMarketToast(message, good);
    else if (!good) alert(message);
  }

  function buildResearchHQ() {
    const hq = ensureHQ();
    if (hq.built) return;
    const storage = getPlanetStorage('earth');
    const costs = { steel: 10000, buildingMaterials: 12000 };
    const missing = Object.entries(costs).filter(([key, amount]) => Number(storage[key] || 0) < amount);
    const researchPoints = Number(state.research?.points || 0);
    if (missing.length || researchPoints < 10000) {
      const parts = [];
      if (Number(storage.steel || 0) < costs.steel) parts.push(`${fmt(costs.steel - Number(storage.steel || 0))} t Stahl`);
      if (Number(storage.buildingMaterials || 0) < costs.buildingMaterials) parts.push(`${fmt(costs.buildingMaterials - Number(storage.buildingMaterials || 0))} t Baustoffe`);
      if (researchPoints < 10000) parts.push(`${fmt(10000 - researchPoints)} Forschungspunkte`);
      return notify(`Nicht genügend Bauressourcen. Es fehlen: ${parts.join(', ')}.`, false);
    }
    storage.steel = Number(storage.steel || 0) - costs.steel;
    storage.buildingMaterials = Number(storage.buildingMaterials || 0) - costs.buildingMaterials;
    state.research.points = researchPoints - 10000;
    hq.built = true;
    hq.everBuilt = true;
    hq.lastSalaryDay = currentDay();
    saveGame(false);
    renderUniqueBuildings();
    notify('Hauptquartier Forschung wurde auf der Erde errichtet.');
  }

  function demolishResearchHQ() {
    const hq = ensureHQ();
    if (!hq.built) return;
    if (hq.researchers > 0 || totalTraining() > 0 || assignedTotal(hq) > 0) {
      return notify('Das Hauptquartier kann nicht abgerissen werden, solange Forscher vorhanden oder in Ausbildung sind.', false);
    }
    if (!confirm('Hauptquartier Forschung wirklich abreißen? Du erhältst 75 % der Baukosten zurück und kannst es später erneut bauen.')) return;

    // 75 % Rückerstattung aller ursprünglichen Baukosten.
    const storage = getPlanetStorage('earth');
    const refund = {
      steel: 7500,
      buildingMaterials: 9000,
      researchPoints: 7500
    };
    storage.steel = Number(storage.steel || 0) + refund.steel;
    storage.buildingMaterials = Number(storage.buildingMaterials || 0) + refund.buildingMaterials;
    state.research = state.research || {};
    state.research.points = Number(state.research.points || 0) + refund.researchPoints;

    hq.built = false;
    Object.keys(hq.active).forEach(id => hq.active[id] = false);
    hq.lastSalaryDay = currentDay();
    saveGame(false);
    renderAll();
    notify('Hauptquartier abgerissen. Erstattet: 7.500 t Stahl, 9.000 t Baustoffe und 7.500 Forschungspunkte.');
  }

  function startTraining(amount) {
    const hq = ensureHQ();
    const count = Math.floor(Number(amount));
    if (!hq.built) return notify('Baue zuerst das Hauptquartier Forschung.', false);
    if (!Number.isFinite(count) || count < 1) return notify('Bitte eine gültige Anzahl Forscher eingeben.', false);
    if (count > earthPopulation()) return notify('Es gibt nicht genügend Kolonisten auf der Erde.', false);
    const cost = count * 10000;
    if (Number(state.gunniDollar || 0) < cost) return notify(`Nicht genügend GünniDollar. Benötigt werden ${fmt(cost)} GD.`, false);

    const earth = ensureColonistData('earth');
    earth.colonists = Math.max(0, Math.floor(Number(earth.colonists) || 0) - count);
    state.gunniDollar = Number(state.gunniDollar || 0) - cost;
    const now = gameNow();
    hq.trainingQueue.push({
      id: `researcher-training-${now}-${hq.trainingQueue.length + 1}`,
      count,
      startedAt: now,
      completesAt: now + TRAINING_MS
    });
    if (typeof recordCompanyFinance === 'function') {
      recordCompanyFinance('expense', cost, 'Forscher-Ausbildung');
    }
    saveGame(false);
    renderAll();
    notify(`${fmt(count)} Kolonisten befinden sich jetzt in der Forscherausbildung.`);
  }

  function assignResearchers(departmentId, value) {
    const hq = ensureHQ();
    if (!DEPARTMENTS.some(d => d.id === departmentId)) return;
    const requested = Math.max(0, Math.floor(Number(value) || 0));
    const otherAssigned = assignedTotal(hq) - hq.departments[departmentId];
    const maximum = Math.max(0, hq.researchers - otherAssigned);
    const next = Math.min(requested, maximum);
    hq.departments[departmentId] = next;
    saveGame(false);
    renderUniqueBuildings();
  }

  function toggleDepartment(departmentId) {
    const hq = ensureHQ();
    if (!DEPARTMENTS.some(d => d.id === departmentId)) return;
    hq.active[departmentId] = !hq.active[departmentId];
    saveGame(false);
    renderUniqueBuildings();
  }

  function processTime(now) {
    const hq = ensureHQ();
    if (!hq.built) return;
    let changed = false;

    const finished = hq.trainingQueue.filter(item => Number(item.completesAt) <= now);
    if (finished.length) {
      const newlyTrained = finished.reduce((sum, item) => sum + Math.max(0, Math.floor(Number(item.count) || 0)), 0);
      hq.researchers += newlyTrained;
      hq.trainingQueue = hq.trainingQueue.filter(item => Number(item.completesAt) > now);
      // Neue Forscher werden ab dem nächsten vollständigen Ingame-Tag bezahlt.
      if (hq.researchers === newlyTrained) hq.lastSalaryDay = currentDay(now);
      changed = true;
      notify(`${fmt(newlyTrained)} neue Forscher haben ihre Ausbildung abgeschlossen.`);
    }

    const day = currentDay(now);
    if (day > hq.lastSalaryDay) {
      const elapsedDays = day - hq.lastSalaryDay;
      const wages = hq.researchers * WAGE_PER_RESEARCHER_DAY * elapsedDays;
      if (wages > 0) {
        const available = Math.max(0, Number(state.gunniDollar) || 0);
        const paid = Math.min(available, wages);
        state.gunniDollar = available - paid;
        hq.unpaidWages += wages - paid;
        if (typeof recordCompanyFinance === 'function') {
          recordCompanyFinance('expense', wages, elapsedDays > 1 ? `Forschergehälter (${elapsedDays} Ingame-Tage)` : 'Forschergehälter');
        }
      }
      hq.lastSalaryDay = day;
      changed = true;
    }

    // Offene Gehälter werden aus später verfügbaren Mitteln beglichen.
    if (hq.unpaidWages > 0 && Number(state.gunniDollar || 0) > 0) {
      const paidArrears = Math.min(hq.unpaidWages, Number(state.gunniDollar) || 0);
      state.gunniDollar = Math.max(0, Number(state.gunniDollar) - paidArrears);
      hq.unpaidWages = Math.max(0, hq.unpaidWages - paidArrears);
      changed = true;
    }

    if (changed) {
      saveGame(false);
      renderAll();
    }
  }

  function renderUniqueBuildings() {
    const root = document.querySelector('#unique-buildings-content');
    if (!root) return;
    const hq = ensureHQ();
    const built = hq.built;
    const pending = totalTraining();
    const dailyWages = hq.researchers * WAGE_PER_RESEARCHER_DAY;
    root.innerHTML = `
      <section class="unique-building-card">
        <div class="unique-building-card-head">
          <div><span class="unique-building-kicker">EINZIGARTIGES GEBÄUDE · ERDE</span><h3>🏛️ Hauptquartier Forschung</h3>
          <p class="hint">Zentrale Ausbildungs- und Personalverwaltung für die vier Forschungsabteilungen.</p></div>
          <div class="unique-building-actions">${built
            ? `<span class="unique-building-status is-built">Gebaut</span><button type="button" class="danger-button" data-demolish-research-hq>Abriss</button>`
            : `<button type="button" class="primary-button" data-build-research-hq>Bauen</button>`}</div>
        </div>
        <div class="unique-building-meta">
          <div><span>Bauort</span><strong>Erde</strong></div>
          <div><span>Bauanzahl</span><strong>Maximal 1 gleichzeitig</strong></div>
          <div><span>Baukosten</span><strong>10.000 t Stahl</strong></div>
          <div><span></span><strong>12.000 t Baustoffe</strong></div>
          <div><span></span><strong>10.000 Forschungspunkte</strong></div>
        </div>
        ${built ? `<div class="unique-building-summary">
          <div><span>Forscher insgesamt</span><strong>${fmt(hq.researchers)}</strong></div>
          <div><span>Frei verfügbar</span><strong>${fmt(freeResearchers(hq))}</strong></div>
          <div><span>In Ausbildung</span><strong>${fmt(pending)}</strong></div>
          <div><span>Gehälter / Ingame-Tag</span><strong>${fmt(dailyWages)} GD</strong></div>
        </div>
        <button type="button" class="primary-button unique-open-hq" data-open-research-hq>Forschungshauptquartier öffnen</button>` :
          `<p class="unique-building-note">Das Hauptquartier ist noch nicht gebaut. Nach einem Abriss können 75 % der Baukosten erstattet und das Gebäude erneut errichtet werden.</p>`}
      </section>
      <p class="hint unique-building-footnote">Weitere einzigartige Gebäude können später in diesem Menü ergänzt werden.</p>`;
  }

  function renderHQWindow() {
    const root = document.querySelector('#research-hq-window');
    if (!root) return;
    // Das Fenster wird regelmäßig aktualisiert. Während ein Eingabefeld fokussiert
    // ist, darf innerHTML nicht ersetzt werden: Android verliert sonst den Fokus
    // und schließt unmittelbar die Bildschirmtastatur.
    if (root.contains(document.activeElement) &&
        document.activeElement.matches('input, textarea, select')) return;
    const hq = ensureHQ();
    if (!hq.built) {
      root.innerHTML = '<p class="hint">Das Hauptquartier Forschung wurde noch nicht auf der Erde gebaut.</p>';
      return;
    }
    const openDepartments = new Set(Array.from(root.querySelectorAll('details.research-department-card[open]')).map(node => node.dataset.departmentId));
    const now = gameNow();
    const population = earthPopulation();
    const free = freeResearchers(hq);
    const salaryPerDay = hq.researchers * WAGE_PER_RESEARCHER_DAY;
    const queue = hq.trainingQueue.map((item, index) => {
      const count = Math.max(0, Number(item.count) || 0);
      const start = Number(item.startedAt) || 0;
      const end = Number(item.completesAt) || start + TRAINING_MS;
      const progress = Math.max(0, Math.min(100, (now - start) / Math.max(1, end - start) * 100));
      const remaining = Math.max(0, end - now);
      const remainingDays = remaining / DAY_MS;
      return `<div class="research-training-item">
        <div class="research-training-head"><strong>Ausbildungsgruppe ${index + 1} · ${fmt(count)} Kolonisten</strong><span>${fmt(progress, 1)} %</span></div>
        <div class="research-training-track"><span style="width:${progress}%"></span></div>
        <small>Noch ${fmt(remainingDays, 2)} Ingame-Tage · Abschluss nach 2 Ingame-Tagen</small>
      </div>`;
    }).join('');
    const departments = DEPARTMENTS.map(department => {
      const count = hq.departments[department.id];
      const active = hq.active[department.id];
      const maximum = hq.researchers - (assignedTotal(hq) - count);
      return `<details class="research-department-card" data-department-id="${department.id}" ${openDepartments.has(department.id) ? 'open' : ''}>
        <summary><span><strong>${department.title}</strong><small>${count} Forscher zugewiesen</small></span><span class="research-department-state">${active ? 'Aktiv' : 'Inaktiv'}</span></summary>
        <div class="research-department-body">
          <p>${department.description}</p>
          <label for="research-assignment-${department.id}">Forscher in dieser Abteilung</label>
          <div class="research-assignment-row">
            <input id="research-assignment-${department.id}" type="number" min="0" max="${maximum}" step="1" value="${count}" data-research-assignment="${department.id}">
            <button type="button" data-assign-researchers="${department.id}">Zuweisen</button>
          </div>
          <div class="research-department-placeholder">Forschungsbonus: Noch keiner festgelegt</div>
          <button type="button" class="research-activate-button ${active ? 'is-active' : ''}" data-toggle-research="${department.id}">${active ? 'Forschung deaktivieren' : 'Forschung aktivieren'}</button>
        </div>
      </details>`;
    }).join('');

    root.innerHTML = `
      <section class="research-hq-dashboard">
        <div class="research-hq-heading"><div><span class="unique-building-kicker">PERSONAL- UND FORSCHUNGSVERWALTUNG</span><h3>🏛️ Hauptquartier Forschung</h3></div><span class="unique-building-status is-built">Gebaut · Erde</span></div>
        <div class="research-hq-stats">
          <div><span>Forscher</span><strong>${fmt(hq.researchers)}</strong></div>
          <div><span>Frei verfügbar</span><strong>${fmt(free)}</strong></div>
          <div><span>In Ausbildung</span><strong>${fmt(totalTraining())}</strong></div>
          <div><span>Gehälter / Tag</span><strong>${fmt(salaryPerDay)} GD</strong></div>
        </div>
        ${hq.unpaidWages > 0 ? `<div class="research-wage-warning">Offene Forschergehälter: ${fmt(hq.unpaidWages)} GD. Sie werden aus später verfügbaren Mitteln beglichen.</div>` : ''}
      </section>
      <section class="research-training-panel">
        <h3>👨‍🚀 Kolonisten zu Forschern ausbilden</h3>
        <p class="hint">Nur Kolonisten von der Erde können ausgebildet werden. Die Kolonisten wechseln nach Abschluss dauerhaft in den Forscherbestand.</p>
        <div class="research-hq-stats research-hq-training-stats">
          <div><span>Kolonisten auf der Erde</span><strong>${fmt(population)}</strong></div>
          <div><span>Kosten je Forscher</span><strong>10.000 GD</strong></div>
          <div><span>Ausbildungsdauer</span><strong>2 Ingame-Tage</strong></div>
        </div>
        <div class="research-training-controls">
          <label for="research-training-count">Anzahl Kolonisten</label>
          <input id="research-training-count" type="number" min="1" max="${population}" step="1" value="${population > 0 ? Math.min(10, population) : 1}" ${population < 1 ? 'disabled' : ''}>
          <button type="button" data-start-research-training ${population < 1 ? 'disabled' : ''}>Ausbildung starten</button>
        </div>
        ${queue ? `<h4>Laufende Ausbildungsgruppen</h4>${queue}` : '<p class="hint">Aktuell läuft keine Ausbildung. Mehrere Ausbildungsgruppen können gleichzeitig laufen.</p>'}
      </section>
      <section class="research-departments-panel">
        <h3>🔬 Forschungsabteilungen</h3>
        <p class="hint">Forscher können jederzeit kostenlos zwischen den Abteilungen verschoben werden. Die Aktivierung hat aktuell noch keinen Forschungsbonus.</p>
        ${departments}
      </section>`;
  }

  function renderPopulationOverview() {
    const root = document.querySelector('#colonists-content');
    if (!root) return;
    const hq = ensureHQ();
    const existing = root.querySelector('.researcher-population-overview');
    if (existing) existing.remove();
    const card = document.createElement('section');
    card.className = 'colonists-summary-card researcher-population-overview';
    card.innerHTML = `<span>🔬 Forscher auf der Erde</span><strong>${fmt(hq.researchers)}</strong><small>In Ausbildung: ${fmt(totalTraining())} · Keine Verwaltungsfunktionen</small>`;
    const summary = root.querySelector('.colonists-summary');
    if (summary) summary.appendChild(card);
    const earthCard = root.querySelector('.colonists-planet-card[data-planet-id="earth"]');
    if (earthCard) {
      const details = earthCard.querySelector('.stat[data-researcher-overview]');
      if (details) details.remove();
      const row = document.createElement('div');
      row.className = 'stat';
      row.dataset.researcherOverview = 'true';
      row.innerHTML = `<span>Forscher (separate Belegschaft)</span><strong>${fmt(hq.researchers)} · ${fmt(totalTraining())} in Ausbildung</strong>`;
      const firstStat = earthCard.querySelector('.stat');
      if (firstStat) firstStat.insertAdjacentElement('afterend', row);
      else earthCard.appendChild(row);
    }
  }

  function renderAll() {
    renderUniqueBuildings();
    renderHQWindow();
    if (typeof renderColonistsPanel === 'function' && document.querySelector('#colonists-panel') && !document.querySelector('#colonists-panel').hidden) {
      renderColonistsPanel();
    } else {
      renderPopulationOverview();
    }
    if (typeof renderTopResources === 'function') renderTopResources();
    if (typeof renderEconomy === 'function' && document.querySelector('#economy-panel') && !document.querySelector('#economy-panel').hidden) renderEconomy();
    if (document.querySelector('#company-headquarters-panel') && !document.querySelector('#company-headquarters-panel').hidden &&
        typeof renderCompanyHeadquarters === 'function') renderCompanyHeadquarters();
  }

  function openHQWindow() {
    const panel = document.querySelector('#research-hq-panel');
    if (!panel) return;
    const uniquePanel = document.querySelector('#unique-buildings-panel');
    if (uniquePanel) uniquePanel.hidden = true;
    panel.hidden = false;
    renderHQWindow();
  }

  function setup() {
    ensureHQ();
    const menuButton = document.querySelector('#unique-buildings-button');
    const panel = document.querySelector('#unique-buildings-panel');
    const close = document.querySelector('#unique-buildings-close');
    menuButton?.addEventListener('click', () => {
      if (!panel) return;
      const shouldOpen = panel.hidden;
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#colonists-panel','#free-population-panel','#company-panel','#company-headquarters-panel','#flight-center-panel','#introduction-panel','#settings-panel','#asteroids-panel','#cyclic-missions-panel','#market-panel','#research-hq-panel'].forEach(selector => {
        const other = document.querySelector(selector);
        if (other) other.hidden = true;
      });
      const menu = document.querySelector('#main-menu');
      if (menu) menu.hidden = true;
      panel.hidden = !shouldOpen;
      if (shouldOpen) renderUniqueBuildings();
    });
    close?.addEventListener('click', () => { if (panel) panel.hidden = true; });
    document.querySelector('#research-hq-close')?.addEventListener('click', () => {
      const hqPanel = document.querySelector('#research-hq-panel');
      if (hqPanel) hqPanel.hidden = true;
    });
    document.addEventListener('click', event => {
      const build = event.target.closest('[data-build-research-hq]');
      if (build) return buildResearchHQ();
      const demolish = event.target.closest('[data-demolish-research-hq]');
      if (demolish) return demolishResearchHQ();
      if (event.target.closest('[data-open-research-hq]')) return openHQWindow();
      const train = event.target.closest('[data-start-research-training]');
      if (train) return startTraining(document.querySelector('#research-training-count')?.value);
      const assign = event.target.closest('[data-assign-researchers]');
      if (assign) {
        const id = assign.dataset.assignResearchers;
        return assignResearchers(id, document.querySelector(`[data-research-assignment="${id}"]`)?.value);
      }
      const toggle = event.target.closest('[data-toggle-research]');
      if (toggle) return toggleDepartment(toggle.dataset.toggleResearch);
    });
    // Andere Menüeinträge schließen auch das Spezialgebäudemenü.
    ['economy-button','company-headquarters-button','colonists-button','research-button','asteroids-button','flight-center-button','cyclic-missions-button','tasks-button','save-menu-button','introduction-button'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => {
        if (panel) panel.hidden = true;
        const hqPanel = document.querySelector('#research-hq-panel');
        if (hqPanel) hqPanel.hidden = true;
      });
    });

    // Forscherübersicht in der Bevölkerungszentrale: reine Anzeige, keine Eingriffe.
    const originalColonistsRender = window.renderColonistsPanel;
    if (typeof originalColonistsRender === 'function' && !originalColonistsRender.__researcherWrapped) {
      const wrapped = function(...args) {
        const result = originalColonistsRender.apply(this, args);
        renderPopulationOverview();
        return result;
      };
      wrapped.__researcherWrapped = true;
      window.renderColonistsPanel = wrapped;
    }

    // Das separate Funktionsfenster wird als eigenständiges Panel angelegt.
    const hqPanel = document.querySelector('#research-hq-panel');
    if (hqPanel) hqPanel.hidden = true;
    renderAll();
    lastObservedGameTime = gameNow();
    window.setInterval(() => {
      const now = gameNow();
      if (now !== lastObservedGameTime) {
        lastObservedGameTime = now;
        processTime(now);
        renderHQWindow();
      }
    }, 1000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, { once: true });
  else setup();

  // Öffentliche Refresh-Schnittstelle für andere Spielmodule.
  window.SolarFrontierUniqueBuildings = {
    render: renderAll,
    getResearcherCount: () => ensureHQ().researchers,
    getDailyWages: () => ensureHQ().researchers * WAGE_PER_RESEARCHER_DAY,
    isResearchHQBuilt: () => ensureHQ().built
  };
})();
