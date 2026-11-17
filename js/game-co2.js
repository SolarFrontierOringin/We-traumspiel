// Zentrale, erweiterungsfähige CO₂-Verwaltung je Planet.
// Gebäude werden über optionale Einträge in CO2_BUILDING_EMISSIONS registriert.
const CO2_BUILDING_EMISSIONS = {
  steelworks: 0.00001,          // Tonnen CO₂ je Ingame-Sekunde und Stahlwerk
  buildingMaterialsFactory: 0.00001, // Tonnen CO₂ je Ingame-Sekunde und Baustofffabrik
  goldRefinery: 0.00001,        // Tonnen CO₂ je Ingame-Sekunde und Scheideanstalt
  aluminiumOxideRefinery: 0.00002, // Aluminiumoxidraffinerie
  aluminiumSmelter: 0.00002,    // Aluminiumhütte
  copperSmelter: 0.00003,       // Kupferschmelze
  lithiumRefinery: 0.00004,     // Lithiumraffinerie
  machineFactory: 0.00002,      // Maschinenfabrik (Maschinenpark)
  glassFactory: 0.00003,        // Glasfabrik
  uraniumProcessingPlant: 0.00002 // Uranaufbereitungsanlage
};

function getPlanetCO2Management(planetId) {
  const planet = bodies[planetId];
  if (!planet || planetId === 'sun') return null;
  if (!planet.co2Management || typeof planet.co2Management !== 'object') {
    planet.co2Management = { emittedTotal: 0, lastRate: 0 };
  }
  planet.co2Management.emittedTotal = Math.max(0, Number(planet.co2Management.emittedTotal) || 0);
  planet.co2Management.lastRate = Math.max(0, Number(planet.co2Management.lastRate) || 0);
  return planet.co2Management;
}

function updatePlanetCO2Management(planetId, buildings, delta) {
  const management = getPlanetCO2Management(planetId);
  if (!management || !(delta > 0)) return;
  let emissionRate = 0;
  for (const [buildingKey, ratePerBuilding] of Object.entries(CO2_BUILDING_EMISSIONS)) {
    const count = Math.max(0, Number(buildings?.[buildingKey]) || 0);
    emissionRate += count * Math.max(0, Number(ratePerBuilding) || 0);
  }
  management.lastRate = emissionRate;
  const emitted = emissionRate * delta;
  if (!(emitted > 0)) return;
  const atmosphere = ensurePlanetAtmosphere(planetId);
  if (!atmosphere) return;
  atmosphere.gases.co2 = Math.max(0, Number(atmosphere.gases.co2) || 0) + emitted;
  atmosphere.totalGas = Math.max(0, Number(atmosphere.totalGas) || 0) + emitted;
  management.emittedTotal += emitted;
}
