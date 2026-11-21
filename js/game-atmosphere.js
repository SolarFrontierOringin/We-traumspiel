// Solar Frontier: Origins – gemeinsames Atmosphären- und CO₂-Modul.
// CO₂-Verwaltungsfenster bleibt sichtbar, seine alten Einträge/Emissionen sind deaktiviert.
const ATMOSPHERE_TONS_PER_KM2_PER_BAR = 4;
const PLANET_DIAMETERS_KM = {mercury:2600,venus:7200,earth:6370,luna:1738,mars:3390,jupiter:69911,saturn:58232,uranus:25326,neptune:24622,pluto:1919,ceres:582,io:3643,nivaris:9842,noxaris:6400,themepatin:5190,pyrophor:3942,rethroxid:1988};
function planetSurfaceAreaKm2(id){const d=Number(bodies[id]?.diameterKm||PLANET_DIAMETERS_KM[id]||0);return d>0?4*Math.PI*(d/2)**2:0;}
function atmosphericPressureFromMass(id,mass){const a=planetSurfaceAreaKm2(id);return a>0?Math.max(0,Number(mass)||0)/(a*ATMOSPHERE_TONS_PER_KM2_PER_BAR):0;}
function atmosphereMassForPressure(id,bar){const a=planetSurfaceAreaKm2(id);return a>0&&bar>0?a*ATMOSPHERE_TONS_PER_KM2_PER_BAR*bar:0;}
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
 helium3:{label:'Helium-3',icon:'🧪'}, oxygen:{label:'Sauerstoff',icon:'🫧'},
 hydrogen:{label:'Wasserstoff',icon:'💨'}, co2:{label:'CO₂',icon:'🌫️'},
 nitrogen:{label:'Stickstoff',icon:'🌬️'}
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
  if (!planetId || !bodies[planetId] || planetId === 'sun') return '';
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
    : oxygenShare >= 15 && oxygenShare <= 25 && pressure >= 0.8 && pressure <= 2.0
      ? 'Atmosphäre erfüllt die Freigaberegel für normale Wohngebäude und Bevölkerungswachstum.'
      : oxygenShare < 15
        ? 'Sauerstoffanteil unter 15 % – keine Freigabe für normale Wohngebäude.'
        : oxygenShare > 25
          ? 'Hoher Sauerstoffanteil: erhöhte Brandgefahr.'
          : 'Atmosphärendruck liegt außerhalb des Freigabebereichs von 0,8–2,0 bar.';
  const colonistAtmosphere = getColonistAtmosphereStatus(planetId);
  const colonistStatusClass = colonistAtmosphere.normalHousingAllowed ? 'good' : colonistAtmosphere.habitatAllowed ? 'warn' : 'bad';
  const colonistStatusHtml = `<div class="colonist-atmosphere-status"><strong>👥 Kolonisten-Freigabe</strong><p class="${colonistStatusClass}">${colonistAtmosphere.label}</p><small>Normale Wohngebäude und Vermehrung: 0,8–2,0 bar und 15–25 % O₂ · außerhalb des Bereichs keine neue Belegung/Vermehrung, bestehende Kolonisten bleiben · Habitat: eigene Lebenserhaltung</small></div>`;
  const storage = state.viewMode === 'orbit' ? getOrbitStorage(planetId) : getPlanetStorage(planetId);
  const gases = Object.entries(ATMOSPHERE_RELEASE_GASES).map(([key, gas]) =>
    `<option value="${key}">${gas.icon} ${gas.label} · Lager: ${formatAtmosphereTons(Number(storage[key] || 0))}</option>`).join('');
  return `<details class="planet-atmosphere-details"><summary>🌫️ Atmosphäre · ${pressure.toFixed(3)} bar</summary>
    <div class="planet-atmosphere-content">
      <div class="stat"><span>Atmosphärendruck</span><strong>${pressure.toFixed(3)} bar</strong></div>
      <div class="stat"><span>Gasmenge gesamt</span><strong>${formatAtmosphereTons(atmosphere.totalGas)}</strong></div>
      <div class="co2-management-panel" aria-label="CO₂-Verwaltung"><h4>CO₂-Verwaltung</h4></div>
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


function updatePlanetCO2Management() {
  // Absichtlich leer: CO₂ wird nur noch als eines der fünf Atmosphärengase geführt.
}

function ensurePlanetAtmosphere(planetId) {
 const planet=bodies[planetId]; if(!planet||planetId==='sun') return null;
 const atmosphere=planet.atmosphere&&typeof planet.atmosphere==='object'?planet.atmosphere:(planet.atmosphere={});
 const allowed=Object.keys(ATMOSPHERE_RELEASE_GASES), old=atmosphere.gases&&typeof atmosphere.gases==='object'?atmosphere.gases:{}, gases={};
 allowed.forEach(k=>gases[k]=Math.max(0,Number(old[k])||0)); atmosphere.gases=gases;
 const starts={earth:1,jupiter:90,saturn:45,uranus:40,neptune:60};
 const gasPlanet=['jupiter','saturn','uranus','neptune'].includes(planetId);
 const targetRuleVersion=gasPlanet?'4t-km2-v2':'4t-km2-v1';
 if(atmosphere.ruleVersion!==targetRuleVersion){
  const total=atmosphereMassForPressure(planetId,starts[planetId]||0); let mix={};
  if(planetId==='earth') mix={hydrogen:.79,oxygen:.20,co2:.01};
  else if(planetId==='jupiter') mix={hydrogen:.88,helium3:.10,nitrogen:.01,co2:.01};
  else if(planetId==='saturn') mix={hydrogen:.90,helium3:.08,nitrogen:.01,co2:.01};
  else if(planetId==='uranus'||planetId==='neptune') mix={hydrogen:.84,helium3:.14,nitrogen:.01,co2:.01};
  allowed.forEach(k=>gases[k]=total*(mix[k]||0)); atmosphere.totalGas=total;
  atmosphere.oxygen=gases.oxygen; atmosphere.ruleVersion=targetRuleVersion;
 } else { atmosphere.totalGas=allowed.reduce((s,k)=>s+gases[k],0); atmosphere.oxygen=gases.oxygen; }
 return atmosphere;
}

function updateAtmosphereRegulators(planetId, storage, buildings, delta) {
  const count = Math.max(0, Number(buildings.atmosphereRegulator) || 0);
  if (!count || !(delta > 0) || !hasPlanetSurface(planetId)) return;
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


