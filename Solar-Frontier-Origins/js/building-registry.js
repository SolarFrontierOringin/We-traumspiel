/* Solar Frontier: Origins – zentrales Gebäuderegister.
 * Neue Gebäudedefinitionen werden automatisch aus buildingTypes erkannt.
 */
function sfoGetBuildingRegistry() {
  if (typeof buildingTypes === 'undefined' || !buildingTypes) return [];
  return Object.keys(buildingTypes);
}

// Ergänzt fehlende Zähler in bestehenden Spielständen, ohne vorhandene
// Gebäudezahlen zu verändern. Planetare und globale Zähler bleiben getrennt.
function sfoNormalizeBuildingSave(savedState, savedBodies) {
  const knownBuildings = sfoGetBuildingRegistry();
  if (savedState && typeof savedState === 'object') {
    if (!savedState.buildings || typeof savedState.buildings !== 'object') savedState.buildings = {};
    knownBuildings.forEach(buildingId => {
      if (!Object.prototype.hasOwnProperty.call(savedState.buildings, buildingId)) {
        savedState.buildings[buildingId] = 0;
      }
    });
  }
  if (savedBodies && typeof savedBodies === 'object') {
    Object.values(savedBodies).forEach(body => {
      if (!body || typeof body !== 'object') return;
      if (!body.buildings || typeof body.buildings !== 'object') body.buildings = {};
      knownBuildings.forEach(buildingId => {
        if (!Object.prototype.hasOwnProperty.call(body.buildings, buildingId)) {
          body.buildings[buildingId] = 0;
        }
      });
    });
  }
}
