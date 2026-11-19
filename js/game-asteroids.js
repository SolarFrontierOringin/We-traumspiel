// Asteroiden-Archetypen und Erzeugungsfunktionen.
// Benötigt die globalen Forschungs-/Spielzustände aus game.js zur Laufzeit.
const ASTEROID_TYPES = [
  { key: 'iron', name: 'Eisen-Nickel-Asteroid', icon: '🪨', resources: [{ key: 'iron', min: 50000, max: 200000 }, { key: 'nickelOre', min: 3000, max: 17000 }] },
  { key: 'silicon', name: 'Silikat-Asteroid', icon: '💎', resources: [{ key: 'silicon', min: 20000, max: 100000 }] },
  { key: 'lithium', name: 'Lithium-Asteroid', icon: '🔋', resources: [{ key: 'lithium', min: 5000, max: 25000 }] },
  { key: 'ice', name: 'Eis-Asteroid', icon: '🧊', resources: [{ key: 'ice', min: 30000, max: 150000 }] },
  { key: 'rare-metals', name: 'Asteroid seltener Metalle', icon: '☄️', resources: [{ key: 'titanOre', min: 5000, max: 30000 }, { key: 'copperOre', min: 5000, max: 25000 }] },
  { key: 'uranium-metal', name: 'Uran-Metall-Asteroid', icon: '☢️', resources: [{ key: 'uranium', min: 60000, max: 160000 }, { key: 'iron', min: 240000, max: 240000 }] },
  { key: 'ionium', name: 'Ionium-Asteroid', icon: '☢️', resources: [{ key: 'ionium', min: 19000, max: 22000 }, { key: 'iron', min: 231000, max: 231000 }] }
];
const ASTEROID_LIFETIME_MS = 5 * 24 * 60 * 60 * 1000;
const ASTEROID_DISCOVERY_INTERVAL_MS = 2 * 60 * 60 * 1000;
const ASTEROID_MAX_ACTIVE = 5;
function asteroidTypeByKey(key) { return ASTEROID_TYPES.find(type => type.key === key) || ASTEROID_TYPES[0]; }
function randomAsteroidAmount(min, max) { return Math.round(min + Math.random() * (max - min)); }
function makeAsteroid(number, now, type) {
  const selectedType = type || ASTEROID_TYPES.find(candidate => !ensureResearchOrders().discoveredAsteroids.some(a => a.typeKey === candidate.key && Number(a.expiresAt || 0) > now)) || ASTEROID_TYPES[Math.floor(Math.random() * ASTEROID_TYPES.length)];
  const resources = Object.fromEntries(selectedType.resources.map(resource => [resource.key, randomAsteroidAmount(resource.min, resource.max)]));
  return { id: `asteroid-${Date.now()}-${number}-${Math.floor(Math.random()*100000)}`, number, name: `Asteroid ${String(number).padStart(3, '0')}`, typeKey: selectedType.key, discoveredAt: now, expiresAt: now + ASTEROID_LIFETIME_MS, resources };
}
