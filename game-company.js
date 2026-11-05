// ==========================================
// UNTERNEHMEN – fester Vermögenswert
// ==========================================
const COMPANY_RESOURCE_VALUES = {
  stone:1, iron:3, coal:2, gas:4, bauxite:4, titanOre:12,
  steel:8, silicon:6, copper:8, aluminiumOxide:7, aluminium:12, titanium:25,
  buildingMaterials:4, glass:8, polymers:15, rubber:18, plastics:20,
  electronics:35, chips:60, batteries:25, machines:30, vehicles:500,
  water:0.002, food:15, grain:5, vegetables:7, algaeBiomass:4, oxygen:8,
  hydrogen:10, helium:20, helium3:100, uranium:50, processedUranium:90,
  nuclearFuel:150, chocolate:50, ice:2, lithium:30, copperOre:5, crudeOil:1,
  co2:1, carbon:5, processedTitan:35, cocoaBeans:10
};
const COMPANY_RESOURCE_NAMES = {
  stone:'Stein', iron:'Eisen', coal:'Kohle', gas:'Gas', bauxite:'Bauxit', titanOre:'Titanerz',
  steel:'Stahl', silicon:'Silizium', copper:'Kupfer', aluminiumOxide:'Aluminiumoxid', aluminium:'Aluminium',
  titanium:'Titan', buildingMaterials:'Baustoffe', glass:'Glas', polymers:'Polymere',
  rubber:'Gummi', plastics:'Kunststoff', electronics:'Elektronik', chips:'Chips', batteries:'Batterien',
  machines:'Maschinen', vehicles:'Fahrzeuge', water:'Wasser', food:'Lebensmittel', grain:'Getreide',
  vegetables:'Gemüse', algaeBiomass:'Algenbiomasse', oxygen:'Sauerstoff', hydrogen:'Wasserstoff',
  helium:'Helium', helium3:'Helium-3', uranium:'Uran', processedUranium:'Aufbereitetes Uran',
  nuclearFuel:'Kernbrennstoff', chocolate:'Schokolade', ice:'Eis', lithium:'Lithium',
  copperOre:'Kupfererz', crudeOil:'Rohöl', co2:'CO₂', carbon:'Kohlenstoff',
  processedTitan:'Aufbereitetes Titan', cocoaBeans:'Kakaobohnen'
};
function companyFormat(value) {
  return `${Number(value || 0).toLocaleString('de-DE',{maximumFractionDigits:2})} GünniDollar`;
}
function calculateCompanyValue() {
  let buildingsValue = 0, stockValue = 0, rocketValue = 0;
  const buildingBreakdown = [];
  for (const id of Object.keys(bodies)) {
    if (id === 'sun') continue;
    const buildingCounts = getBuildingsOnPlanet(id) || {};
    let planetBuildingCount = 0, planetBuildingValue = 0;
    const planetBuildings = [];
    for (const [key, countValue] of Object.entries(buildingCounts)) {
      const count = Math.min(100000, Math.max(0, Math.floor(Number(countValue) || 0)));
      if (!count) continue;
      planetBuildingCount += count;
      planetBuildings.push({ key, count, name: buildingTypes[key]?.name || key });
      for (let n = 1; n <= count; n++) {
        const costs = demolitionCostMap(key, id, n) || {};
        // Rohstoffmengen mit dem festen Unternehmenswert des jeweiligen
        // Materials bewerten, statt Materialmengen als GünniDollar zu addieren.
        for (const [resource, amountValue] of Object.entries(costs)) {
          const amount = Math.max(0, Number(amountValue) || 0);
          const unitValue = COMPANY_RESOURCE_VALUES[resource];
          if (unitValue !== undefined) planetBuildingValue += amount * unitValue;
        }
      }
    }
    buildingsValue += planetBuildingValue;
    if (planetBuildings.length) buildingBreakdown.push({
      id, name: bodies[id]?.name || id, count: planetBuildingCount,
      value: planetBuildingValue, buildings: planetBuildings.sort((a,b) => a.name.localeCompare(b.name, 'de'))
    });
    for (const storage of [getPlanetStorage(id), getOrbitStorage(id)]) {
      for (const [key, amountValue] of Object.entries(storage || {})) {
        const amount = Math.max(0, Number(amountValue) || 0);
        const rate = COMPANY_RESOURCE_VALUES[key];
        if (rate !== undefined) stockValue += amount * rate;
      }
    }
  }
  // Feste Unternehmenswerte je fertiger Rakete (keine Materialkosten-Bewertung).
  const rocketUnitValues = { hercules1: 1300, hercules2: 2100, atlas1: 3000, titan1: 4300, mobileMiner: 6500 };
  const rocketNames = { hercules1: 'Herkules 1', hercules2: 'Herkules 2', atlas1: 'Atlas 1', titan1: 'Titan 1', mobileMiner: 'Mobile Minerrakete' };
  const rocketStocks = [
    ['hercules1', rocketStock], ['hercules2', rocketStock2],
    ['atlas1', rocketStockAtlas1], ['titan1', rocketStockTitan1], ['mobileMiner', rocketStockMobileMiner]
  ];
  const rocketBreakdown = [];
  for (const [type, stock] of rocketStocks) {
    let count = 0;
    for (const amount of Object.values(stock || {})) count += Math.max(0, Number(amount) || 0);
    rocketValue += count * rocketUnitValues[type];
    rocketBreakdown.push({ type, name: rocketNames[type], count, unitValue: rocketUnitValues[type], value: count * rocketUnitValues[type] });
  }
  const cash = Math.max(0, Number(state.gunniDollar) || 0);
  const finance = ensureCompanyFinance();
  const debts = 0;
  return {
    buildingsValue, stockValue, rocketValue, cash, debts,
    total: buildingsValue + stockValue + rocketValue + cash - debts,
    buildingBreakdown, rocketBreakdown,
    incomeTotal: finance.incomeTotal, expenseTotal: finance.expenseTotal,
    profit: finance.incomeTotal - finance.expenseTotal,
    financeHistory: finance.history
  };
}

