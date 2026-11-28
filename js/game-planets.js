// Planetendaten für Solar Frontier: Origins.
// Wird vor den Spielmodulen geladen; bestehende Werte bleiben unverändert.
const bodies = {
  sun: { name: 'Sonne', type: 'Stern', className: 'sun', temperature: 'ca. 5.500 °C Oberfläche', resources: {}, storage: {}, buildings: { solarSatellite: 0 }, orbit: 0 },
  mercury: { name: 'Merkur', type: 'Planet', className: 'mercury', diameterKm: 2600, temperature: '430 °C', resources: { stone: 20000, iron: 10000000, silicon: 8000000, lithium: 2000000, copperOre: 30000, uranium: 30000000, titanOre: 5000000, water: 2000000000 }, storage: {}, orbit: 130 },
  venus: { name: 'Venus', type: 'Planet', className: 'venus', diameterKm: 7200, temperature: '490 °C', resources: { stone: 10000000, iron: 50000000, silicon: 30000000, lithium: 5000000, copperOre: 3000000, uranium: 20000000, helium3: 20000000 }, storage: {}, orbit: 210 },
  earth: { name: 'Erde', type: 'Startplanet', className: 'earth', diameterKm: 6370, temperature: 'ca. 15 °C Durchschnitt', resources: { goldOre: 5000000, stone: 20000000, coal: 15000000, gas: 20000000, co2: 1000000, iron: 200000000, nickelOre: 500000, graphite: 4000000, lithium: 2000000, crudeOil: 15000000, copperOre: 10000000, uranium: 1000000, bauxite: 10000000, water: 1000000000, trees: 10000 }, atmosphere: {}, storage: null, orbit: 380 },
  luna: { name: 'Luna', type: 'Mond der Erde', className: 'luna', diameterKm: 1738, temperature: 'ca. -20 °C Durchschnitt', resources: { goldOre: 7000000, stone: 3000000, ice: 1000000, iron: 2000000, silicon: 4000000, graphite: 10000000, lithium: 6000000, helium3: 10000000, uranium: 3000000, bauxite: 10000000 }, storage: {}, orbit: 0, moonOf: 'earth', moonOrbit: 55 },
  mars: { name: 'Mars', type: 'Planet', className: 'mars', diameterKm: 3390, temperature: 'ca. -63 °C Durchschnitt', resources: { goldOre: 11000000, stone: 20000, coal: 20000, gas: 40000, graphite: 15000000, uranium: 10000000, bauxite: 10000000 }, storage: {}, orbit: 500 },
  ceres: { name: 'Ceres', type: 'Zwergplanet', className: 'ceres', diameterKm: 582, temperature: 'ca. -105 °C Durchschnitt', resources: { iron: 5000000, titanium: 4000000, stone: 6000000, water: 7000000 }, storage: {}, orbit: 640 },
  jupiter: { name: 'Jupiter', type: 'Gasplanet', className: 'jupiter', diameterKm: 69911, temperature: 'ca. -110 °C Wolkenobergrenze', resources: { helium3: 500000000, hydrogen: 5000000000, co2: 100000000 }, storage: {}, orbit: 820 },
  saturn: { name: 'Saturn', type: 'Gasplanet', className: 'saturn', diameterKm: 58232, temperature: 'ca. -140 °C Wolkenobergrenze', resources: { hydrogen: 0 }, storage: {}, orbit: 1340 },
  uranus: { name: 'Uranus', type: 'Gasplanet', className: 'uranus', diameterKm: 25326, temperature: 'ca. -195 °C Wolkenobergrenze', resources: { hydrogen: 0 }, storage: {}, orbit: 1460 },
  neptune: { name: 'Neptun', type: 'Gasplanet', className: 'neptune', diameterKm: 24622, temperature: 'ca. -200 °C Wolkenobergrenze', resources: { hydrogen: 0 }, storage: {}, orbit: 1500 },
  pluto: { name: 'Pluto', type: 'Zwergplanet', className: 'pluto', diameterKm: 1919, temperature: 'ca. -230 °C Durchschnitt', resources: { iron: 20000000, uranium: 5000000, silicon: 20000000, copper: 40000000 }, storage: {}, orbit: 1580 },
  nivaris: { name: 'Nivaris', type: 'Mystischer Eisplanet', className: 'nivaris', diameterKm: 9842, temperature: '-500 °C', description: 'Ein mystischer, kalter Planet. Er wurde erst 2027 durch ein Teleskop entdeckt. Wie lange er bereits existiert, ist nicht bekannt.', resources: { ice: 1000000000, iron: 3000000, stone: 2000000, ionium: 2000000 }, storage: {}, orbit: 1660 },
  io: { name: 'Io', type: 'Mond des Jupiter', className: 'io', diameterKm: 3643, temperature: 'ca. -110 °C Durchschnitt', resources: { iron: 20000000, silicon: 15000000, copperOre: 20000000, graphite: 70000000, bauxite: 19000000, ionium: 1000000 }, storage: {}, orbit: 1420, moonOf: 'jupiter'  },
  europa: { name: 'Europa', type: 'Mond des Jupiter', className: 'europa', diameterKm: 3122, temperature: '-100 °C', resources: { ice: 70000000, iron: 3000000, stone: 3000000, goldOre: 10000000, copperOre: 1000000 }, storage: {}, orbit: 820, moonOf: 'jupiter', sharedOrbitWith: 'jupiter' }
};

// Zweites Sonnensystem: Elyndra im Zentrum; Themepatin/Rethroxid teilen 1120 px, Noxaris/Pyrophor teilen 1420 px.
const futureSolarSystem = {
  id: 'system2', name: 'Sonnensystem 2',
  bodies: [
    { id: 'elyndra', name: 'Elyndra', type: 'Mystischer Gesteinsplanet', className: 'elyndra', diameterKm: 25000, orbit: 0, rotationHours: 96, temperature: 'Unbekannt', description: 'Ein gewaltiger mystischer Gesteinsplanet im Zentrum des Systems. Seine violett-rosa Oberfläche wird von hellblauen Energieadern durchzogen.', resources: { nickelOre: 10000000 }, atmosphere: { gases: { helium3: 0, oxygen: 0, hydrogen: 0, co2: 0, nitrogen: 0 }, totalGas: 0, oxygen: 0, ruleVersion: '4t-km2-v1' }, storage: {}, orbitStorage: {} },
    { id: 'themepatin', name: 'Themepatin', type: 'Gesteinsplanet', className: 'themepatin', diameterKm: 5190, orbit: 1120, temperature: 'Unbekannt', resources: { stone: 1000000, copperOre: 2000000, uranium: 10000000 }, storage: {}, atmosphere: { gases: { helium3: 0, oxygen: 0, hydrogen: 0, co2: 0, nitrogen: 0 }, totalGas: 0, oxygen: 0, ruleVersion: '4t-km2-v1' }, orbitStorage: {} },
    { id: 'rethroxid', name: 'Rethroxid', type: 'Roter Gesteinsplanet', className: 'rethroxid', diameterKm: 1988, orbit: 1120, temperature: 'Unbekannt', resources: { copperOre: 10000000, germanium: 2000000 }, storage: {}, atmosphere: { gases: { helium3: 0, oxygen: 0, hydrogen: 0, co2: 0, nitrogen: 0 }, totalGas: 0, oxygen: 0, ruleVersion: '4t-km2-v1' }, orbitStorage: {} },
    { id: 'noxaris', name: 'Noxaris', type: 'Mystischer Planet', className: 'noxaris', diameterKm: 6400, orbit: 1420, temperature: 'Unbekannt', resources: { iron: 2000000, stone: 1000000, ionium: 500000, germanium: 1000000 }, storage: {}, atmosphere: { gases: { helium3: 0, oxygen: 0, hydrogen: 0, co2: 0, nitrogen: 0 }, totalGas: 0, oxygen: 0, ruleVersion: '4t-km2-v1' }, orbitStorage: {} },
    { id: 'pyrophor', name: 'Pyrophor', type: 'Vulkanischer Gesteinsplanet', className: 'pyrophor', diameterKm: 3942, orbit: 1420, temperature: '1.200 °C', resources: { uranium: 8000000, stone: 12000000, ionium: 2000000 }, storage: {}, atmosphere: { gases: { helium3: 0, oxygen: 0, hydrogen: 0, co2: 0, nitrogen: 0 }, totalGas: 0, oxygen: 0, ruleVersion: '4t-km2-v1' }, orbitStorage: {} }
  ]
};
// Elyndra wird wie die übrigen Planeten in die gemeinsame Planetenverwaltung eingebunden.
bodies.elyndra = futureSolarSystem.bodies.find(body => body.id === 'elyndra');

