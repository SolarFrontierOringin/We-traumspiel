// ==========================================
// NEUIGKEITEN & WIRTSCHAFT – Buttons
// ==========================================
function getColonistHourlyGrowthEstimate(id) {
  const body = ensureColonistData(id);
  const pop = colonistsOnPlanet(id);
  const storage = getPlanetStorage(id);
  if (!body || pop <= 0 || body.colonistGrowthPercent <= 0 || housingFree(id) <= 0 ||
      Number(storage.food || 0) <= 0 || Number(storage.water || 0) <= 0 ||
      !getColonistAtmosphereStatus(id).normalHousingAllowed) return 0;
  const [count, interval] = pop >= 90000 ? [7, 60] : pop >= 50000 ? [5, 45] : pop >= 20000 ? [4, 45] : pop >= 10000 ? [2, 45] : [1, 45];
  const activeBonuses = (body.vehicleLuxuryEnabled !== false && Number(storage.vehicles || 0) > 0 ? 1 : 0) +
    (body.chocolateLuxuryEnabled !== false && Number(storage.chocolate || 0) > 0 ? 1 : 0) +
    (body.furnitureLuxuryEnabled !== false && Number(storage.luxuryFurniture || 0) > 0 ? 1 : 0);
  return count / interval * (body.colonistGrowthPercent / 100) * 3600 * (1 + activeBonuses * 0.1);
}

function renderColonistsPanel() {
  const panel = document.querySelector('#colonists-content');
  if (!panel) return;
  const ids = Object.keys(bodies).filter(id => id !== 'sun').sort((a, b) => { const priority = id => id === 'earth' ? 0 : id === 'luna' ? 1 : 2; return priority(a) - priority(b) || String(bodies[a]?.name || a).localeCompare(String(bodies[b]?.name || b), 'de'); });
  const openPlanetIds = new Set([...panel.querySelectorAll('.colonists-planet-card[open]')].map(card => card.dataset.planetId));
  const allColonists = ids.reduce((sum, id) => sum + colonistsOnPlanet(id), 0);
  const foodNeed = allColonists * (0.001 / 86400);
  const waterNeed = allColonists * (2 / 86400);
  panel.innerHTML = `
    <div class="colonists-summary">
      <div class="colonists-summary-card"><span>👥 Kolonisten gesamt</span><strong data-colonists-total>${allColonists.toLocaleString('de-DE')}</strong></div>
      <div class="colonists-summary-card"><span>💵 GünniDollar-Einnahmen</span><strong data-colonists-income>${(allColonists * 0.0002).toLocaleString('de-DE', {maximumFractionDigits:6})}/s</strong></div>
      <div class="colonists-summary-card"><span>🍲 Lebensmittelbedarf</span><strong data-food-need>${foodNeed.toLocaleString('de-DE',{maximumFractionDigits:6})} t/s</strong></div>
      <div class="colonists-summary-card"><span>💧 Wasserbedarf</span><strong data-water-need>${waterNeed.toLocaleString('de-DE',{maximumFractionDigits:4})} L/s</strong></div>
    </div>
    <p class="hint">Kolonisten starten bei 0. Die ersten ziehen nach Abschluss eines später festgelegten Auftrags ein. Bei 100 % Wachstum: bis 10.000 Kolonisten 1 je 45 Sekunden, ab 10.000: 2, ab 20.000: 4, ab 50.000: 5 je 45 Sekunden; ab 90.000: 7 je Ingame-Minute. Wohnraum, Lebensmittel und Wasser erforderlich.</p>
    <div class="colonists-planet-list">
      ${ids.map(id => {
        const body = ensureColonistData(id);
        const storage = getPlanetStorage(id);
        const pop = Number(body?.colonists || 0);
        const capacity = housingCapacity(id);
        const free = Math.max(0, capacity - pop);
        const supplied = pop <= 0 || (Number(storage.food || 0) > 0 && Number(storage.water || 0) > 0);
        const housingText = housingBuildingKeys.filter(key => Number(getBuildingsOnPlanet(id)[key] || 0) > 0).map(key => `${buildingTypes[key].name}: ${getBuildingsOnPlanet(id)[key]}`).join(' · ') || 'Keine Wohngebäude';
        return `<details class="colonists-planet-card" data-planet-id="${id}" ${openPlanetIds.has(id) ? 'open' : ''}>
          <summary class="colonists-planet-head"><h3>${body.name}</h3><span><strong data-pop="${id}">${pop.toLocaleString('de-DE')} Kolonisten</strong><span class="colonists-expand-hint"> · Details</span></span></summary>
          <div class="stat"><span>Wohnraum</span><strong data-housing="${id}">${pop} / ${capacity} · ${free} frei</strong></div>
          <div class="stat"><span>Lebensmittel im Oberflächenlager</span><strong data-food="${id}">${Number(storage.food || 0).toLocaleString('de-DE',{maximumFractionDigits:4})} t</strong></div>
          <div class="stat"><span>Wasser im Oberflächenlager</span><strong data-water="${id}">${Number(storage.water || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} L</strong></div>
          <div class="stat"><span>Fahrzeuge im Oberflächenlager</span><strong data-vehicles="${id}">${formatTons(Number(storage.vehicles || 0))}</strong></div>
          <div class="luxury-controls" aria-label="Luxusgüter für ${body.name}">
            <div class="luxury-control"><button type="button" data-toggle-vehicle-luxury="${id}" class="luxury-switch ${body.vehicleLuxuryEnabled ? 'is-on' : 'is-off'}" aria-pressed="${body.vehicleLuxuryEnabled ? 'true' : 'false'}">🚗 Fahrzeuge<br><span>${body.vehicleLuxuryEnabled ? 'EIN' : 'AUS'}</span></button><small data-vehicle-luxury-status="${id}">${Number(storage.vehicles || 0) > 1e-12 ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus'}</small></div>
            <div class="luxury-control"><button type="button" data-toggle-chocolate-luxury="${id}" class="luxury-switch ${body.chocolateLuxuryEnabled ? 'is-on' : 'is-off'}" aria-pressed="${body.chocolateLuxuryEnabled ? 'true' : 'false'}">🍫 Schokolade<br><span>${body.chocolateLuxuryEnabled ? 'EIN' : 'AUS'}</span></button><small data-chocolate-luxury-status="${id}">${Number(storage.chocolate || 0) > 1e-12 ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus'}</small></div>
            <div class="luxury-control"><button type="button" data-toggle-furniture-luxury="${id}" class="luxury-switch ${body.furnitureLuxuryEnabled ? 'is-on' : 'is-off'}" aria-pressed="${body.furnitureLuxuryEnabled ? 'true' : 'false'}">🛋️ Luxusmöbel<br><span>${body.furnitureLuxuryEnabled ? 'EIN' : 'AUS'}</span></button><small data-furniture-luxury-status="${id}">${Number(storage.luxuryFurniture || 0) > 1e-12 ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus'}</small></div>
          </div>
          <div class="stat"><span>Versorgungsstatus</span><strong data-supply="${id}" class="${supplied ? 'good' : 'warn'}">${pop === 0 ? 'Noch keine Kolonisten' : supplied ? 'Versorgung vorhanden' : 'Wachstum gestoppt: Nahrung oder Wasser fehlt'}</strong></div>
          <div class="stat"><span>Wohngebäude</span><strong>${housingText}</strong></div>
          <div class="stat"><span>Zugewinn pro Stunde</span><strong data-growth-rate="${id}">${getColonistHourlyGrowthEstimate(id).toLocaleString('de-DE',{maximumFractionDigits:2})} Kolonisten</strong></div>
          <label class="colonists-growth-label" for="colonist-growth-${id}">Bevölkerungswachstum: <strong data-growth-value="${id}">${body.colonistGrowthPercent}%</strong></label>
          <input id="colonist-growth-${id}" class="colonist-growth-slider" type="range" min="0" max="100" step="1" value="${body.colonistGrowthPercent}" data-growth-planet="${id}">
          <div class="colonists-release-row"><label for="colonist-release-${id}">In freie Bevölkerung freigeben</label><input id="colonist-release-${id}" type="number" min="1" max="${pop}" step="1" value="1" data-release-amount="${id}" ${pop > 0 && id !== 'earth' && canReleaseFreePopulation(id) ? '' : 'disabled'}><button type="button" data-release-colonists="${id}" ${pop > 0 && id !== 'earth' && canReleaseFreePopulation(id) ? '' : 'disabled'}>Freigeben</button><small>${id === 'earth' ? 'Erde ist vorerst ausgenommen.' : getFreePopulationReleaseStatus(id)}</small></div>
          <div class="colonists-remove-row"><label for="colonist-remove-${id}">Kolonisten entfernen</label><input id="colonist-remove-${id}" type="number" min="1" max="${pop}" step="1" value="1" data-remove-amount="${id}" ${pop > 0 ? '' : 'disabled'}><button type="button" data-remove-colonists="${id}" ${pop > 0 ? '' : 'disabled'}>Entfernen</button></div>
        </details>`;
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
  panel.querySelectorAll('[data-release-colonists]').forEach(button => button.addEventListener('click', () => {
    const id = button.dataset.releaseColonists;
    const input = panel.querySelector(`[data-release-amount="${id}"]`);
    const amount = Math.floor(Number(input?.value) || 0);
    if (id === 'earth' || !canReleaseFreePopulation(id)) { alert(getFreePopulationReleaseStatus(id)); return; }
    const available = colonistsOnPlanet(id);
    if (amount < 1 || amount > available) { alert(`Bitte eine Zahl zwischen 1 und ${available} eingeben.`); return; }
    const removed = removeColonistsFromHousing(id, amount);
    if (removed > 0) {
      const body = ensureFreePopulationData(id);
      body.freePopulation += removed;
      body.freePopulationFacilities ||= { farm: true, waterWell: true };
      saveGame(false);
      renderColonistsPanel();
      renderFreePopulationPanel();
      renderInfo();
    }
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
  setText('[data-food-need]', `${(total * (0.001 / 86400)).toLocaleString('de-DE',{maximumFractionDigits:8})} t/s`);
  setText('[data-water-need]', `${(total * (2 / 86400)).toLocaleString('de-DE',{maximumFractionDigits:8})} L/s`);
  for (const id of ids) {
    const pop = colonistsOnPlanet(id), capacity = housingCapacity(id), storage = getPlanetStorage(id);
    const supplied = pop <= 0 || (Number(storage.food || 0) > 0 && Number(storage.water || 0) > 0);
    setText(`[data-pop="${id}"]`, `${pop.toLocaleString('de-DE')} Kolonisten`);
    setText(`[data-growth-rate="${id}"]`, `${getColonistHourlyGrowthEstimate(id).toLocaleString('de-DE',{maximumFractionDigits:2})} Kolonisten`);
    setText(`[data-housing="${id}"]`, `${pop} / ${capacity} · ${Math.max(0,capacity-pop)} frei`);
    setText(`[data-food="${id}"]`, `${Number(storage.food || 0).toLocaleString('de-DE',{maximumFractionDigits:4})} t`);
    setText(`[data-water="${id}"]`, `${Number(storage.water || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} L`);
    setText(`[data-vehicles="${id}"]`, formatTons(Number(storage.vehicles || 0)));
    const luxuryStatus = panel.querySelector(`[data-vehicle-luxury-status="${id}"]`);
    if (luxuryStatus) { luxuryStatus.textContent = Number(storage.vehicles || 0) > 1e-12 ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus'; luxuryStatus.classList.toggle('good', ensureColonistData(id).vehicleLuxuryEnabled && Number(storage.vehicles || 0) > 1e-12); luxuryStatus.classList.toggle('warn', !ensureColonistData(id).vehicleLuxuryEnabled || Number(storage.vehicles || 0) <= 1e-12); }
    const luxuryToggle = panel.querySelector(`[data-toggle-vehicle-luxury="${id}"]`);
    if (luxuryToggle) { const on = ensureColonistData(id).vehicleLuxuryEnabled; luxuryToggle.innerHTML = `🚗 Fahrzeuge<br><span>${on ? 'EIN' : 'AUS'}</span>`; luxuryToggle.classList.toggle('is-on', on); luxuryToggle.classList.toggle('is-off', !on); luxuryToggle.setAttribute('aria-pressed', String(on)); }
    const chocolateLuxuryEnabled = ensureColonistData(id).chocolateLuxuryEnabled !== false;
    const chocolateLuxuryStatus = panel.querySelector(`[data-chocolate-luxury-status="${id}"]`);
    if (chocolateLuxuryStatus) {
      const chocolateAvailable = Number(storage.chocolate || 0) > 1e-12;
      chocolateLuxuryStatus.textContent = chocolateAvailable ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus';
      chocolateLuxuryStatus.classList.toggle('good', chocolateLuxuryEnabled && chocolateAvailable);
      chocolateLuxuryStatus.classList.toggle('warn', !chocolateLuxuryEnabled || !chocolateAvailable);
    }
    const chocolateLuxuryToggle = panel.querySelector(`[data-toggle-chocolate-luxury="${id}"]`);
    if (chocolateLuxuryToggle) {
      chocolateLuxuryToggle.innerHTML = `🍫 Schokolade<br><span>${chocolateLuxuryEnabled ? 'EIN' : 'AUS'}</span>`;
      chocolateLuxuryToggle.classList.toggle('is-on', chocolateLuxuryEnabled); chocolateLuxuryToggle.classList.toggle('is-off', !chocolateLuxuryEnabled); chocolateLuxuryToggle.setAttribute('aria-pressed', String(chocolateLuxuryEnabled));
    }
    const furnitureEnabled = ensureColonistData(id).furnitureLuxuryEnabled !== false;
    const furnitureAvailable = Number(storage.luxuryFurniture || 0) > 1e-12;
    const furnitureStatus = panel.querySelector(`[data-furniture-luxury-status="${id}"]`);
    if (furnitureStatus) {
      furnitureStatus.textContent = furnitureAvailable ? 'Lager: ausreichend · +10 %' : 'Lager: leer · kein Bonus';
      furnitureStatus.classList.toggle('good', furnitureEnabled && furnitureAvailable);
      furnitureStatus.classList.toggle('warn', !furnitureEnabled || !furnitureAvailable);
    }
    const furnitureToggle = panel.querySelector(`[data-toggle-furniture-luxury="${id}"]`);
    if (furnitureToggle) {
      furnitureToggle.innerHTML = `🛋️ Luxusmöbel<br><span>${furnitureEnabled ? 'EIN' : 'AUS'}</span>`;
      furnitureToggle.classList.toggle('is-on', furnitureEnabled); furnitureToggle.classList.toggle('is-off', !furnitureEnabled); furnitureToggle.setAttribute('aria-pressed', String(furnitureEnabled));
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




// Freie Bevölkerung: getrennt vom noch nicht freigegebenen Kolonistenbestand.
function ensureFreePopulationData(id) {
  const body = bodies[id];
  if (!body || id === 'sun') return null;
  body.freePopulation = Math.max(0, Math.floor(Number(body.freePopulation) || 0));
  body.freePopulationGrowthAccumulator = Math.max(0, Number(body.freePopulationGrowthAccumulator) || 0);
  if (body.freePopulationFacilities === undefined) body.freePopulationFacilities = { farm: false, waterWell: false };
  return body;
}
function freePopulationOnPlanet(id) { return Number(ensureFreePopulationData(id)?.freePopulation || 0); }
function freePopulationConditionsMet(id) {
  if (!id || id === 'earth' || id === 'sun' || !bodies[id]) return false;
  const temp = planetTemperatureCelsius(id);
  const atmosphere = getColonistAtmosphereStatus(id);
  return Number.isFinite(temp) && temp >= -10 && temp <= 50 && atmosphere.pressure >= 0.8 && atmosphere.pressure <= 2 && atmosphere.oxygenPercent >= 15 && atmosphere.oxygenPercent <= 25;
}
function canReleaseFreePopulation(id) { return id !== 'earth' && colonistsOnPlanet(id) > 0 && freePopulationConditionsMet(id); }
function getFreePopulationReleaseStatus(id) {
  if (id === 'earth') return 'Erde: Bevölkerungszahl wird später separat eingeführt.';
  const temp = planetTemperatureCelsius(id);
  const atmosphere = getColonistAtmosphereStatus(id);
  if (temp < -10 || temp > 50) return `Temperatur muss −10 bis +50 °C betragen (aktuell ${temp.toFixed(0)} °C).`;
  if (atmosphere.pressure < 0.8 || atmosphere.pressure > 2) return `Druck muss 0,8–2 bar betragen (aktuell ${atmosphere.pressure.toFixed(2)} bar).`;
  if (atmosphere.oxygenPercent < 15 || atmosphere.oxygenPercent > 25) return `Sauerstoff muss 15–25 % betragen (aktuell ${atmosphere.oxygenPercent.toFixed(1)} %).`;
  if (colonistsOnPlanet(id) <= 0) return 'Zuerst müssen Kolonisten auf diesem Planeten leben.';
  return 'Freigabe möglich.';
}
function freePopulationGrowthPerInterval(population) {
  return population >= 15000 ? 7 : population >= 12000 ? 6 : population >= 8000 ? 5 : population >= 5000 ? 4 : population >= 1000 ? 3 : population >= 500 ? 2 : 1;
}
function processFreePopulation(id, delta) {
  const body = ensureFreePopulationData(id);
  if (!body || id === 'earth' || body.freePopulation <= 0 || delta <= 0) return;
  if (!freePopulationConditionsMet(id)) return; // population stays; only growth pauses
  body.freePopulationGrowthAccumulator += delta;
  while (body.freePopulationGrowthAccumulator >= 20) {
    body.freePopulation += freePopulationGrowthPerInterval(body.freePopulation);
    body.freePopulationGrowthAccumulator -= 20;
  }
}
function renderFreePopulationPanel() {
  const content = document.querySelector('#free-population-content');
  if (!content) return;
  const ids = Object.keys(bodies).filter(id => id !== 'sun').sort((a,b) => freePopulationOnPlanet(b)-freePopulationOnPlanet(a) || String(bodies[a].name).localeCompare(String(bodies[b].name),'de'));
  const total = ids.reduce((sum,id)=>sum+freePopulationOnPlanet(id),0);
  content.innerHTML = `<div class="colonists-summary"><div class="colonists-summary-card"><span>🏘️ Freie Bevölkerung gesamt</span><strong>${total.toLocaleString('de-DE')}</strong></div><div class="colonists-summary-card"><span>📈 Wachstum</span><strong>Alle 20 Ingame-Sekunden</strong></div></div><p class="hint">Planeten mit freier Bevölkerung stehen zuerst. Ab 500 / 1.000 / 5.000 / 8.000 / 12.000 / 15.000 Bewohnern steigen die Zuwächse je Intervall auf 2 / 3 / 4 / 5 / 6 / 7 Personen. Bei ungeeigneter Temperatur, Druck oder Sauerstoff pausiert nur das Wachstum.</p><div class="colonists-planet-list">${ids.map(id=>{ const pop=freePopulationOnPlanet(id); const body=ensureFreePopulationData(id); const status=id==='earth'?'Erde ist vorerst ausgenommen.':freePopulationConditionsMet(id)?'Lebensbedingungen geeignet · Wachstum aktiv':'Lebensbedingungen ungeeignet · Wachstum pausiert'; return `<article class="colonists-planet-card"><div class="colonists-planet-head"><h3>${bodies[id].name}</h3><strong>${pop.toLocaleString('de-DE')} freie Bevölkerung</strong></div><p class="hint">${status}</p>${pop>0?`<div class="free-population-facilities">🏡 Bauernhof: vorhanden · 💧 Wasserbrunnen: vorhanden</div>`:''}</article>`; }).join('')}</div>`;
}
