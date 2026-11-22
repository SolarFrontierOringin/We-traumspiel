// Ausgelagertes Forschungssystem – aus game.js extrahiert.
// Wird nach game.js geladen; nutzt die dort bereitgestellten Spielzustände und Hilfsfunktionen.

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
    text: 'Schaltet den Forschungssatelliten frei. Er erzeugt 0,5 Forschungspunkte/s ohne Stromverbrauch; pro Orbit ist maximal ein Satellit erlaubt.'
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

function researchLabCount() { return Number(getBuildingsOnPlanet('earth').researchLab || 0); }
function researchSatelliteCount() { return Object.keys(bodies).reduce((sum, id) => sum + Number(getBuildingsOnPlanet(id).researchSatellite || 0), 0); }
function researchPointProduction() { return researchLabCount() * 0.5 + researchSatelliteCount() * 0.5; }
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
      <span class="orbit-research-rate ${count ? 'good' : ''}">${count ? '+0,5 FP/s' : '0 FP/s'}</span>
    </button>`;
  }).join('');
  panel.innerHTML = `<div class="research-tabs" role="tablist" aria-label="Forschungsansicht">
    <button type="button" class="research-tab" data-research-tab="tree" role="tab" aria-selected="true">Forschungsbaum</button>
    <button type="button" class="research-tab" data-research-tab="orders" role="tab" aria-selected="false">Forschungsaufträge</button>
  </div><section class="orbit-research-overview">
    <h3>🛰️ Orbit-Forschungsübersicht</h3>
    <div class="orbit-research-global"><small>Globales Forschungskonto</small><strong>${Number(state.research.points || 0).toLocaleString('de-DE', {maximumFractionDigits: 0})} FP</strong><span>+${researchPointProduction().toFixed(2)} FP/s insgesamt</span></div>
    <p class="hint">Jeder Forschungssatellit erzeugt dauerhaft 0,5 Forschungspunkte/s. Pro Orbit ist maximal ein Forschungssatellit erlaubt. Wähle einen Orbit, um dessen Ansicht zu öffnen.</p>
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
      <div><strong>🛰️ Forschung: Forschungssatellit</strong><small>Erzeugt dauerhaft 0,5 Forschungspunkte/s ohne Stromverbrauch. Pro Orbit ist maximal ein Forschungssatellit erlaubt.</small><small>🧪 3.500 Forschungspunkte · ⏱️ 7:00 Minuten</small></div>
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

// Forschungsaufträge und zugehörige Auftragsverwaltung aus game.js ausgelagert.
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
/* Asteroiden-Definitionen werden aus js/game-asteroids.js geladen. */function ensureResearchOrders() {
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
