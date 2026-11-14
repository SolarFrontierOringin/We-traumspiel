/* =========================================================
   SOLAR FRONTIER: ORIGINS – ZENTRALE ENERGIEVERWALTUNG
   Gebäudeverbraucher, Kraftwerksleistung und Auto-Prioritäten
   werden zentral registriert. Neue Gebäude können hier ergänzt
   werden, ohne die Verteilungslogik umzubauen.
   ========================================================= */
(function () {
  'use strict';

  window.SF_ENERGY_AUTO_PRIORITIES = Object.freeze({
    hydroelectricPlant: 1,
    greenhouse: 1,
    waterElectrolysis: 1,
    foodFactory: 2,
    crudeOilPump: 3,
    nickelMine: 3,
    goldMine: 3,
    goldRefinery: 3,
    graphiteMine: 3,
    woodcutter: 3,
    forester: 3,
    treeNursery: 3,
    cocoaPlantation: 3,
    syntheticGraphitePlant: 4,
    megaChipFactory: 4,
    vehicleFactory: 5,
    chocolateFactory: 5,
    luxuryFurnitureFactory: 5
  });

  // MW pro Gebäude. Alle Einträge werden planetarisch getrennt ausgewertet.
  window.SF_ENERGY_CONSUMERS = Object.freeze([
    { key: 'hydroelectricPlant', name: 'Wasserkraftwerk', perBuilding: 3, priority: 1 },
    { key: 'greenhouse', name: 'Gewächshaus', perBuilding: 2, priority: 1 },
    { key: 'cocoaPlantation', name: 'Kakao-Plantage', perBuilding: 5, priority: 3 },
    { key: 'chocolateFactory', name: 'Schokoladenfabrik', perBuilding: 5, priority: 5 },
    { key: 'luxuryFurnitureFactory', name: 'Luxusmöbel-Fabrik', perBuilding: 5, priority: 5 },
    { key: 'forester', name: 'Förster', perBuilding: 2, priority: 3 },
    { key: 'woodcutter', name: 'Sägewerk', perBuilding: 1, priority: 3 },
    { key: 'waterElectrolysis', name: 'Wasserelektrolyseanlage', perBuilding: 1, priority: 1 },
    { key: 'treeNursery', name: 'Baumschule I', perBuilding: 1, priority: 3 },
    { key: 'nickelMine', name: 'Nickelmine', perBuilding: 1, priority: 3 },
    { key: 'goldMine', name: 'Goldmine', perBuilding: 2, priority: 3 },
    { key: 'goldRefinery', name: 'Scheideanstalt', perBuilding: 2, priority: 3 },
    { key: 'megaChipFactory', name: 'MegaChipFabrik', perBuilding: 50, priority: 4 },
    { key: 'graphiteMine', name: 'Graphitmine', perBuilding: 5, priority: 3 },
    { key: 'syntheticGraphitePlant', name: 'Synthetische Graphitproduktion', perBuilding: 10, priority: 4 },
    { key: 'foodFactory', name: 'Lebensmittelfabrik', perBuilding: 5, priority: 2 },
    { key: 'crudeOilPump', name: 'Rohölpumpe', perBuilding: 2, priority: 3 },
    { key: 'vehicleFactory', name: 'Fahrzeugfabrik', perBuilding: 4, priority: 5, countType: 'vehicleFactory' }
  ]);

  // Lokale Stromerzeugung je Planet. Sonnenorbit-Satelliten bleiben separat.
  window.SF_ENERGY_GENERATORS = Object.freeze([
    { key: 'coalPowerPlant', name: 'Kohlekraftwerk', icon: '🏭', perBuilding: 20 },
    { key: 'solarPlant', name: 'Solaranlage', icon: '☀️', perBuilding: 20 },
    { key: 'fusionReactor', name: 'Fusionsreaktor', icon: '☢️', perBuilding: 50 },
    { key: 'nuclearReactor', name: 'Kernkraftwerk', icon: '⚛️', perBuilding: 1000 }
  ]);
})();
