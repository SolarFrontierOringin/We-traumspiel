/* Solar Frontier: Origins – zentrales Rohstoffregister.
 * Quelle der handelbaren Rohstoffe ist MARKET_RESOURCES. Planetenvorkommen und
 * Fördergebäude werden zusätzlich berücksichtigt. Fachliche Produktionsrezepte
 * bleiben bewusst in den jeweiligen Spieldaten/-funktionen definiert.
 */
function sfoGetResourceRegistry() {
  const resources = new Set();
  if (typeof MARKET_RESOURCES !== 'undefined' && MARKET_RESOURCES) {
    Object.keys(MARKET_RESOURCES).forEach(key => resources.add(key));
  }
  if (typeof buildingTypes !== 'undefined' && buildingTypes) {
    Object.values(buildingTypes).forEach(definition => {
      if (definition && typeof definition.resource === 'string' && definition.resource) resources.add(definition.resource);
    });
  }
  if (typeof bodies !== 'undefined' && bodies) {
    Object.values(bodies).forEach(body => Object.keys(body?.resources || {}).forEach(key => resources.add(key)));
  }
  return Array.from(resources);
}

// Sorgt dafür, dass neue Rohstoffschlüssel im Spielerinventar existieren.
// Vorhandene Mengen (auch 0) werden niemals überschrieben.
function sfoNormalizePlayerResourceSave(savedState) {
  if (!savedState || typeof savedState !== 'object') return;
  sfoGetResourceRegistry().forEach(key => {
    if (!Object.prototype.hasOwnProperty.call(savedState, key)) savedState[key] = 0;
    else if (!Number.isFinite(Number(savedState[key]))) savedState[key] = 0;
  });
}

// Übernimmt neue Planeten und neue Rohstoffvorkommen in alte Spielstände.
// Gespeicherte Werte haben Vorrang, insbesondere bereits abgebaute 0-Bestände.
function sfoMergeBodyResourceDefaults(savedBodies) {
  if (!savedBodies || typeof savedBodies !== 'object' || typeof bodies === 'undefined') return;
  Object.entries(bodies).forEach(([planetId, currentBody]) => {
    const savedBody = savedBodies[planetId];
    if (!savedBody || typeof savedBody !== 'object') {
      savedBodies[planetId] = JSON.parse(JSON.stringify(currentBody));
      return;
    }
    savedBody.resources = { ...(currentBody.resources || {}), ...(savedBody.resources || {}) };
    savedBody.buildings = { ...(currentBody.buildings || {}), ...(savedBody.buildings || {}) };
    // Neue Planeten übernehmen auch ihre weiteren Standarddaten, ohne den
    // gespeicherten Zustand (z. B. Atmosphäre, Lager, Gebäude) zu verlieren.
    Object.entries(currentBody).forEach(([key, value]) => {
      if (key === 'resources' || key === 'buildings') return;
      if (!Object.prototype.hasOwnProperty.call(savedBody, key)) {
        savedBody[key] = value && typeof value === 'object' ? JSON.parse(JSON.stringify(value)) : value;
      }
    });
  });
}
