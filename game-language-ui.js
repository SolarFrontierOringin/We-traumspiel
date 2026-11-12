// ==========================================
// MEHRSPRACHIGKEIT: Deutsch / English / Français
// ==========================================
const LANGUAGE_KEY = 'solarFrontierLanguage_v1';
const languageSelect = document.querySelector('#language-select');
const translations = {
  en: {
    'Weltraum Game':'Space Game','Sonnensystem · Rohstoffe · Aufbau · Transport':'Solar System · Resources · Development · Transport','Neuigkeiten':'News','Wirtschaft':'Economy','Forschung':'Research','Forschungsbaum':'Research Tree','Forschungslabor':'Research Lab','Forschungspunkte':'Research Points','Forschen':'Research','Abgeschlossen':'Completed','Spiel':'Game','Menü':'Menu','Einführung':'Introduction','Sprache':'Language','Willkommen bei Solar Frontier: Origins':'Welcome to Solar Frontier: Origins','Dein Ziel':'Your Goal','Planeten':'Planets','Raketen':'Rockets','Neuigkeiten & Updates':'News & Updates','Entwicklungsstand von Solar Frontier: Origins':'Development status of Solar Frontier: Origins','Aktuelle Ankündigung':'Current Announcement','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins is being developed further','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'The game is actively being developed. New content, tasks and technical improvements are being added step by step.','Aktuelle Version':'Current Version','Nächstes Update':'Next Update','Geplant':'Planned','Aktuelle Entwicklung':'Current Development','Was gerade im Spiel entsteht':'What is currently being developed','Weiterentwicklung des Sonnensystems':'Solar system development','Rohstoffabbau und Gebäude auf der Erde':'Resource extraction and buildings on Earth','Siliziummine und weitere Produktionsgebäude':'Silicon mine and additional production buildings','Raketenbau und interplanetarer Transport':'Rocket construction and interplanetary transport','Speichern und Laden des Spielstands':'Saving and loading the game','Hinweis für Spieler':'Player Notice','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'The game is actively in development. Changes and new updates may be added at any time.','Wirtschafts-Dashboard':'Economy Dashboard','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Overview of storage, production, consumption and buildings','Spielstand':'Save Game','Speichern':'Save','Laden':'Load','Neustart':'Restart','Sonne':'Sun','Merkur':'Mercury','Venus':'Venus','Erde':'Earth','Mars':'Mars','Jupiter':'Jupiter','Luna':'Moon','Stern':'Star','Planet':'Planet','Startplanet':'Starting Planet','Temperatur':'Temperature','Rohstoffe':'Resources','Lager':'Storage','Gebäude':'Buildings','Gebäude gesamt':'Total Buildings','Eisen':'Iron','Stahl':'Steel','Stein':'Stone','Kohle':'Coal','Gas':'Gas','CO₂':'CO₂','Atmosphärendruck':'Atmospheric Pressure','CO₂ in Atmosphäre':'CO₂ in Atmosphere','Gasabbau senkt den Atmosphärendruck direkt.':'Gas extraction directly lowers atmospheric pressure.','Silizium':'Silicon','Wasser':'Water','Metalle':'Metals','Gestein':'Rock','Energie':'Energy','Eisenproduktion':'Iron Production','Eisenverbrauch':'Iron Consumption','Stahlproduktion':'Steel Production','Siliziumproduktion':'Silicon Production','Batterien':'Batteries','Batterieproduktion':'Battery Production','Produktionskette: Batterien':'Battery Production Chain','Siliziumverbrauch':'Silicon Consumption','Stromproduktion':'Electricity Production','Bauen':'Build','kostenlos':'free','weitere':'additional','Steinbruch':'Stone Quarry','Kohlemine':'Coal Mine','Gasförderanlage':'Gas Plant','Eisenmine':'Iron Mine','Siliziummine':'Silicon Mine','Stahlwerk':'Steel Mill','Kohlekraftwerk':'Coal Power Plant','Raketenstation':'Rocket Station','Maschinenfabrik':'Machine Factory','Maschinen':'Machines','Transportzentrale':'Transport Center','Zielplanet':'Destination Planet','Anzahl':'Amount','Fracht pro Rakete':'Cargo per Rocket','Aktive Transporte':'Active Transports','Keine abbaubaren Rohstoffe.':'No extractable resources.','Noch keine Rohstoffe abgebaut':'No resources extracted yet','Bauzeit':'Build Time','Flugzeit':'Flight Time','Rückflug':'Return Flight','Hinflug':'Outbound Flight','Gesamtkapazität':'Total Capacity','verfügbar':'available','bis Ankunft':'until arrival','Sekunden':'seconds','t Stahl':'t steel','t Eisen':'t iron','t Stein':'t stone','t Kohle':'t coal','t Gas':'t gas','t Silizium':'t silicon','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'No return cargo','zurück':'back','Starten':'Launch','Schließen':'Close','Uran':'Uranium','Polymere':'Polymers','Polymerfabrik':'Polymer Factory','Uranmine':'Uranium Mine','Uranaufbereitungsanlage':'Uranium Processing Plant','Aufbereitetes Uran':'Processed Uranium','Kernbrennstoffanlage':'Nuclear Fuel Plant','Kernbrennstoff':'Nuclear Fuel','Kernreaktor':'Nuclear Reactor','Chipfabrik':'Chip Factory','Chips':'Chips','Sonnensegel':'Solar Sail','Aufgaben':'Tasks','Einführung · Ziele und Fortschritt':'Introduction · Goals and progress','Baue eine Start- und Landerampe':'Build a launch and landing pad','Baue deine erste Start- und Landerampe.':'Build your first launch and landing pad.','Baue eine Eisenmine':'Build an iron mine','Baue 1.000 t Eisenerz ab':'Mine 1,000 t iron ore','Baue ein Stahlwerk':'Build a steel mill','Produziere 1.000 t Stahl':'Produce 1,000 t steel','Baue deine erste Eisenmine.':'Build your first iron mine.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Mine a total of 1,000 t iron from planetary deposits.','Baue dein erstes Stahlwerk.':'Build your first steel mill.','Produziere insgesamt 1.000 t Stahl.':'Produce a total of 1,000 t steel.','Fortschritt':'Progress','Forschungspunkte':'Research Points'
  },
  fr: {
    'Weltraum Game':'Jeu spatial','Sonnensystem · Rohstoffe · Aufbau · Transport':'Système solaire · Ressources · Développement · Transport','Neuigkeiten':'Actualités','Wirtschaft':'Économie','Forschung':'Recherche','Forschungsbaum':'Arbre technologique','Forschungslabor':'Laboratoire de recherche','Forschungspunkte':'Points de recherche','Forschen':'Rechercher','Abgeschlossen':'Terminé','Spiel':'Jeu','Menü':'Menu','Einführung':'Introduction','Sprache':'Langue','Neuigkeiten & Updates':'Actualités & mises à jour','Entwicklungsstand von Solar Frontier: Origins':'État du développement de Solar Frontier: Origins','Aktuelle Ankündigung':'Annonce actuelle','Solar Frontier: Origins wird weiterentwickelt':'Solar Frontier: Origins continue son développement','Das Spiel befindet sich aktiv in Entwicklung. Neue Inhalte, Aufgaben und technische Erweiterungen werden nach und nach hinzugefügt.':'Le jeu est en développement actif. De nouveaux contenus, objectifs et améliorations techniques sont ajoutés progressivement.','Aktuelle Version':'Version actuelle','Nächstes Update':'Prochaine mise à jour','Geplant':'Prévu','Aktuelle Entwicklung':'Développement actuel','Was gerade im Spiel entsteht':'Développement en cours','Weiterentwicklung des Sonnensystems':'Développement du système solaire','Rohstoffabbau und Gebäude auf der Erde':'Extraction de ressources et bâtiments sur Terre','Siliziummine und weitere Produktionsgebäude':'Mine de silicium et autres bâtiments de production','Raketenbau und interplanetarer Transport':'Construction de fusées et transport interplanétaire','Speichern und Laden des Spielstands':'Sauvegarde et chargement de la partie','Hinweis für Spieler':'Information aux joueurs','Das Spiel befindet sich aktiv in Entwicklung. Änderungen und neue Updates können jederzeit hinzukommen.':'Le jeu est en développement actif. Des changements et mises à jour peuvent être ajoutés à tout moment.','Wirtschafts-Dashboard':'Tableau de bord économique','Überblick über Lager, Produktion, Verbrauch und Gebäude':'Aperçu du stockage, de la production, de la consommation et des bâtiments','Spielstand':'Sauvegarde','Speichern':'Sauvegarder','Laden':'Charger','Neustart':'Redémarrer','Sonne':'Soleil','Merkur':'Mercure','Venus':'Vénus','Erde':'Terre','Mars':'Mars','Jupiter':'Jupiter','Luna':'Lune','Stern':'Étoile','Planet':'Planète','Startplanet':'Planète de départ','Temperatur':'Température','Rohstoffe':'Ressources','Lager':'Stockage','Gebäude':'Bâtiments','Gebäude gesamt':'Bâtiments au total','Eisen':'Fer','Stahl':'Acier','Stein':'Pierre','Kohle':'Charbon','Gas':'Gaz','Silizium':'Silicium','Wasser':'Eau','Metalle':'Métaux','Gestein':'Roche','Energie':'Énergie','Eisenproduktion':'Production de fer','Eisenverbrauch':'Consommation de fer','Stahlproduktion':'Production d’acier','Siliziumproduktion':'Production de silicium','Batterien':'Batteries','Batterieproduktion':'Production de batteries','Produktionskette: Batterien':'Chaîne de production des batteries','Siliziumverbrauch':'Consommation de silicium','Stromproduktion':'Production d’électricité','Bauen':'Construire','kostenlos':'gratuit','weitere':'supplémentaire','Steinbruch':'Carrière de pierre','Kohlemine':'Mine de charbon','Gasförderanlage':'Installation de gaz','Eisenmine':'Mine de fer','Siliziummine':'Mine de silicium','Stahlwerk':'Aciérie','Kohlekraftwerk':'Centrale à charbon','Raketenstation':'Station de fusées','Maschinenfabrik':'Usine de machines','Maschinen':'Machines','Transportzentrale':'Centre de transport','Zielplanet':'Planète destination','Anzahl':'Quantité','Fracht pro Rakete':'Fret par fusée','Aktive Transporte':'Transports actifs','Keine abbaubaren Rohstoffe.':'Aucune ressource exploitable.','Noch keine Rohstoffe abgebaut':'Aucune ressource extraite','Bauzeit':'Temps de construction','Flugzeit':'Temps de vol','Rückflug':'Vol retour','Hinflug':'Vol aller','Gesamtkapazität':'Capacité totale','verfügbar':'disponible','bis Ankunft':'avant l’arrivée','Sekunden':'secondes','t Stahl':'t acier','t Eisen':'t fer','t Stein':'t pierre','t Kohle':'t charbon','t Gas':'t gaz','t Silizium':'t silicium','Herkules 1':'Hercules 1','Herkules 2':'Hercules 2','Frachtabteilung':'Cargo compartment','Gesamtkapazität':'Total capacity','Keine Rückfracht':'Aucun fret retour','zurück':'retour','Starten':'Lancer','Schließen':'Fermer','Uran':'Uranium','Uranmine':'Mine d’uranium','Uranaufbereitungsanlage':'Usine de traitement de l’uranium','Aufbereitetes Uran':'Uranium traité','Kernbrennstoffanlage':'Usine de combustible nucléaire','Kernbrennstoff':'Combustible nucléaire','Kernreaktor':'Réacteur nucléaire','Chipfabrik':'Usine de puces','Chips':'Puces','Sonnensegel':'Voile solaire','Aufgaben':'Tâches','Einführung · Ziele und Fortschritt':'Introduction · objectifs et progression','Baue eine Start- und Landerampe':'Construire une rampe de lancement et d’atterrissage','Baue deine erste Start- und Landerampe.':'Construire votre première rampe de lancement et d’atterrissage.','Baue eine Eisenmine':'Construire une mine de fer','Baue 1.000 t Eisenerz ab':'Extraire 1 000 t de minerai de fer','Baue ein Stahlwerk':'Construire une aciérie','Produziere 1.000 t Stahl':'Produire 1 000 t d’acier','Baue deine erste Eisenmine.':'Construire votre première mine de fer.','Baue insgesamt 1.000 t Eisen aus Planetenvorkommen ab.':'Extraire au total 1 000 t de fer des gisements planétaires.','Baue dein erstes Stahlwerk.':'Construire votre première aciérie.','Produziere insgesamt 1.000 t Stahl.':'Produire au total 1 000 t d’acier.','Fortschritt':'Progression'
  }
};
translations.en['Gebäude im Sonnensystem']='Buildings in the Solar System'; translations.en['GünniDollar']='GünniDollar'; translations.en['Einnahmen']='Income'; translations.fr['Gebäude im Sonnensystem']='Bâtiments dans le système solaire'; translations.fr['GünniDollar']='GünniDollar'; translations.fr['Einnahmen']='Revenus';
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


// Breaking News: beim Start eines neuen Spielablaufs einmalig zeigen, danach über Aufgaben erneut abspielbar.
const BREAKING_NEWS_SEEN_KEY = 'solarFrontierOriginsBreakingNewsSeen_v1';
const breakingNewsPopup = document.querySelector('#breaking-news-popup');
function openBreakingNews() {
  if (!breakingNewsPopup) return;
  breakingNewsPopup.hidden = false;
  breakingNewsPopup.setAttribute('aria-hidden', 'false');
}
function closeBreakingNews() {
  if (breakingNewsPopup) {
    breakingNewsPopup.hidden = true;
    breakingNewsPopup.setAttribute('aria-hidden', 'true');
  }
  try { localStorage.setItem(BREAKING_NEWS_SEEN_KEY, '1'); } catch {}
}
document.querySelector('#breaking-news-close')?.addEventListener('click', closeBreakingNews);
document.querySelector('#breaking-news-start')?.addEventListener('click', closeBreakingNews);
document.addEventListener('click', event => {
  if (event.target.closest('[data-replay-breaking-news]')) openBreakingNews();
});

// Navigation zwischen den beiden Sonnensystemen.
function updateSolarSystemSelector() {
  const current = document.querySelector('.solar-system-selector-current');
  const upcoming = document.querySelector('.solar-system-selector-upcoming');
  if (!current || !upcoming) return;
  current.classList.toggle('active', activeSolarSystemId === 'system1');
  upcoming.classList.toggle('active', activeSolarSystemId === 'system2');
  current.setAttribute('aria-current', activeSolarSystemId === 'system1' ? 'true' : 'false');
  upcoming.setAttribute('aria-current', activeSolarSystemId === 'system2' ? 'true' : 'false');
}
function setupSolarSystemSelector() {
  const current = document.querySelector('.solar-system-selector-current');
  const upcoming = document.querySelector('.solar-system-selector-upcoming');
  current?.addEventListener('click', () => { activeSolarSystemId = 'system1'; state.buildMenuOpen = false; renderSystem(); renderInfo(); });
  upcoming?.addEventListener('click', () => { activeSolarSystemId = 'system2'; state.buildMenuOpen = false; renderSystem(); });
  updateSolarSystemSelector();
}

// Storyabschluss des Forschungsauftrags „Das System wird versagen“.
function refreshSystemFailureUnlock() {
  const orders = ensureResearchOrders();
  const unlocked = !!orders.completed.systemFailure;
  const selector = document.querySelector('.solar-system-selector-upcoming');
  if (selector) {
    const label = selector.querySelector('span');
    if (label) label.textContent = unlocked ? 'Freigeschaltet – Erschließung folgt später.' : 'Dieses Sonnensystem wird später erschlossen.';
  }
  const chronicleEntry = document.querySelector('#chronicle-system2-story');
  if (chronicleEntry) chronicleEntry.hidden = !unlocked;
}
function showSystemFailureStory() {
  const popup = document.querySelector('#system-failure-story-popup');
  if (!popup) return;
  const orders = ensureResearchOrders();
  if (!orders.completed.systemFailure || orders.systemFailureStoryShown) return;
  refreshSystemFailureUnlock();
  popup.hidden = false;
  popup.setAttribute('aria-hidden', 'false');
}
function closeSystemFailureStory() {
  const popup = document.querySelector('#system-failure-story-popup');
  if (popup) {
    popup.hidden = true;
    popup.setAttribute('aria-hidden', 'true');
  }
  const orders = ensureResearchOrders();
  orders.systemFailureStoryShown = true;
  saveGame(false);
}
document.querySelector('#introduction-complete-close')?.addEventListener('click', closeIntroductionCompletePopup);
document.querySelector('#introduction-complete-confirm')?.addEventListener('click', closeIntroductionCompletePopup);
document.querySelector('#colonists-complete-close')?.addEventListener('click', closeColonistsCompletePopup);
document.querySelector('#colonists-complete-confirm')?.addEventListener('click', closeColonistsCompletePopup);
document.querySelector('#system-failure-story-close')?.addEventListener('click', closeSystemFailureStory);
document.querySelector('#system-failure-story-confirm')?.addEventListener('click', closeSystemFailureStory);

// Startseite: bleibt beim Laden sichtbar, bis der Spieler eine Auswahl trifft.
const startupIntro = document.querySelector('#startup-intro');
if (startupIntro) startupIntro.hidden = false;
const startupPlay = document.querySelector('#startup-play');
const startupUpdates = document.querySelector('#startup-updates');
const updatePopup = document.querySelector('#update-popup');
if (startupPlay && startupIntro) {
  startupPlay.addEventListener('click', () => {
    startupIntro.hidden = true;
    let seen = false;
    try { seen = localStorage.getItem(BREAKING_NEWS_SEEN_KEY) === '1'; } catch {}
    if (!seen) openBreakingNews();
  });
}
if (startupUpdates && startupIntro && updatePopup) {
  startupUpdates.addEventListener('click', () => {
    updatePopup.hidden = false;
    updatePopup.setAttribute('aria-hidden', 'false');
  });
}

// Updatefenster: erscheint bei jedem Seitenstart erneut und wird nur über X geschlossen.

const updatePopupClose = document.querySelector('#update-popup-close');
if (updatePopup) {
  const pageButtons = [...updatePopup.querySelectorAll('[data-update-page]')];
  const pageContents = [...updatePopup.querySelectorAll('[data-update-page-content]')];
  pageButtons.forEach(button => button.addEventListener('click', () => {
    const page = button.dataset.updatePage;
    pageButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      if (active) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    pageContents.forEach(content => { content.hidden = content.dataset.updatePageContent !== page; });
    const card = updatePopup.querySelector('.update-popup-card');
    if (card) card.scrollTop = 0;
  }));
}
if (updatePopup && updatePopupClose) {
  updatePopupClose.addEventListener('click', () => {
    updatePopup.hidden = true;
    updatePopup.setAttribute('aria-hidden', 'true');
  });
}

setupMainMenu();
setupHelpSystem();
setupGameClockControls();
document.querySelector('#construction-queue-refresh')?.addEventListener('click', renderConstructionQueue);
setupSaveMenu();
setupTopPanels();
loadGame(false);
setupCompany();
setupAICompanies();
ensureAICompanies();
setupCompanyHeadquarters();
refreshSystemFailureUnlock();
if (ensureResearchOrders().completed.systemFailure && !ensureResearchOrders().systemFailureStoryShown) showSystemFailureStory();
setupSolarSystemSelector();
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
// pagehide funktioniert auch bei Navigation/Neuladen; visibilitychange sichert,
// wenn der Browser-Tab in den Hintergrund wechselt. beforeunload ist ein zusätzlicher Fallback.
function saveGameOnExit() {
  if (restartingGame) return;
  saveGame(false);
}
window.addEventListener('pagehide', saveGameOnExit);
window.addEventListener('beforeunload', saveGameOnExit);
document.addEventListener('visibilitychange', () => {
  if (!restartingGame && document.visibilityState === 'hidden') saveGame(false);
});


// Sonnensystem: zwei Finger zum Verschieben/Zoomen; ein Finger zum normalen Schwenken.
(function setupSolarSystemGestures(){
  const viewport = document.querySelector('#solar-system-viewport');
  const system = document.querySelector('#solar-system');
  if (!viewport || !system) return;
  let zoom = 1;
  let gesture = null;
  let oneFingerMoved = false;
  const dist = (a,b) => Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
  const mid = (a,b) => ({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const point = t => ({clientX:t.clientX,clientY:t.clientY});
  viewport.addEventListener('touchstart', e => {
    // Das Gebäudemenü besitzt eigenes natives Touch-Scrolling. Diese Gesten
    // dürfen nicht vom Pan-/Zoom-System des Sonnensystems abgefangen werden.
    if (e.target.closest('.planet-build-menu')) {
      gesture = null;
      oneFingerMoved = false;
      return;
    }
    if (e.touches.length === 1) {
      const t=e.touches[0];
      gesture={kind:'pan',x:t.clientX,y:t.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
      oneFingerMoved=false;
    } else if (e.touches.length >= 2) {
      const a=point(e.touches[0]), b=point(e.touches[1]), m=mid(a,b);
      gesture={kind:'pinch',distance:Math.max(1,dist(a,b)),zoom,midX:m.x,midY:m.y,
        scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
    }
  }, {passive:true});
  viewport.addEventListener('touchmove', e => {
    if (!gesture) return;
    if (e.touches.length >= 2 && gesture.kind==='pinch') {
      e.preventDefault();
      const a=point(e.touches[0]), b=point(e.touches[1]), m=mid(a,b);
      const minZoom=system.classList.contains('system2-expanded')?0.25:0.6;
      const nextZoom=Math.max(minZoom,Math.min(2.2,gesture.zoom*dist(a,b)/gesture.distance));
      const ratio=nextZoom/gesture.zoom;
      zoom=nextZoom;
      system.style.zoom=String(zoom);
      viewport.scrollLeft=Math.max(0,(gesture.scrollLeft+gesture.midX-viewport.getBoundingClientRect().left)*ratio-(m.x-viewport.getBoundingClientRect().left));
      viewport.scrollTop=Math.max(0,(gesture.scrollTop+gesture.midY-viewport.getBoundingClientRect().top)*ratio-(m.y-viewport.getBoundingClientRect().top));
    } else if (e.touches.length===1 && gesture.kind==='pan') {
      const t=e.touches[0], dx=t.clientX-gesture.x, dy=t.clientY-gesture.y;
      if (Math.abs(dx)+Math.abs(dy)>6) oneFingerMoved=true;
      if (oneFingerMoved) {
        e.preventDefault();
        viewport.scrollLeft=gesture.scrollLeft-dx;
        viewport.scrollTop=gesture.scrollTop-dy;
      }
    }
  }, {passive:false});
  const reset=()=>{gesture=null;};
  viewport.addEventListener('touchend', e => {
    if (e.touches.length===1) {
      const t=e.touches[0];
      gesture={kind:'pan',x:t.clientX,y:t.clientY,scrollLeft:viewport.scrollLeft,scrollTop:viewport.scrollTop};
    } else if (e.touches.length===0) reset();
  }, {passive:true});
  viewport.addEventListener('touchcancel', reset, {passive:true});
  viewport.setAttribute('aria-description','Mit einem Finger verschieben oder Planeten auswählen; mit zwei Fingern verschieben und zoomen.');
})(); 

['pointerdown','touchstart','keydown'].forEach(evt=>document.addEventListener(evt, unlockAudio, {once:true, passive:true}));
