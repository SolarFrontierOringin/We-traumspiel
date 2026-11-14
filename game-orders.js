// ==========================================
// UNTERNEHMENSAUFTRÄGE – STUFE 1: LOKALE LIEFERUNGEN
// Drei Angebote pro 6 Ingame-Stunden, maximal zwei aktive Aufträge.
// Lieferung ausschließlich aus dem Oberflächenlager des Zielplaneten.
// ==========================================
const COMPANY_ORDER_CYCLE_MS = 6 * 60 * 60 * 1000;
const COMPANY_ORDER_MAX_ACTIVE = 2;
const COMPANY_ORDER_OFFER_COUNT = 3;
const COMPANY_ORDER_HISTORY_LIMIT = 30;
const COMPANY_ORDER_DEADLINE_OPTIONS_HOURS = [24, 48, 72];

function ensureCompanyOrders(now = gameNow()) {
  let changed = false;
  if (!state.companyOrders || typeof state.companyOrders !== 'object') {
    state.companyOrders = { reputation: 0, offers: [], active: [], completed: [], failed: [], lastCycleSlot: null, nextId: 1, unlockedLevel: 1 };
    changed = true;
  }
  const orders = state.companyOrders;
  orders.reputation = Math.max(0, Number(orders.reputation) || 0);
  for (const key of ['offers', 'active', 'completed', 'failed']) {
    if (!Array.isArray(orders[key])) { orders[key] = []; changed = true; }
  }
  // Firmenstufe 1 („Mond Startup“) darf Aufträge nur auf Erde und Luna erhalten.
  const levelOnePlanets = new Set(['earth', 'luna']);
  const invalidActiveOrders = orders.active.filter(order => !levelOnePlanets.has(order.planetId));
  if (invalidActiveOrders.length) {
    orders.failed.unshift(...invalidActiveOrders.map(order => ({
      ...order, status: 'cancelled', finishedAt: now,
      reason: 'Für Firmenstufe 1 nicht freigegeben (nur Erde und Luna)'
    })));
    orders.active = orders.active.filter(order => levelOnePlanets.has(order.planetId));
    changed = true;
  }
  const validOffers = orders.offers.filter(order => levelOnePlanets.has(order.planetId));
  if (validOffers.length !== orders.offers.length) changed = true;
  orders.offers = validOffers;
  orders.nextId = Math.max(1, Math.floor(Number(orders.nextId) || 1));
  orders.unlockedLevel = orders.reputation >= 100 ? 2 : 1;
  if (orders.lastCycleSlot == null || !Number.isFinite(Number(orders.lastCycleSlot))) {
    orders.lastCycleSlot = Math.floor(Math.max(0, now) / COMPANY_ORDER_CYCLE_MS);
    orders.offers = createCompanyOrderOffers(COMPANY_ORDER_OFFER_COUNT);
    changed = true;
  }
  return { orders, changed };
}

function companyOrderPlanetIds() {
  // Stufe 1 ist das „Mond Startup“: Aufträge gibt es ausschließlich auf Erde und Luna.
  return ['earth', 'luna'].filter(id => bodies[id] && hasPlanetSurface(id));
}

function createCompanyOrderOffers(count = COMPANY_ORDER_OFFER_COUNT) {
  const planets = companyOrderPlanetIds();
  const resources = Object.keys(MARKET_RESOURCES).filter(key => resourceNames[key] && MARKET_RESOURCES[key]);
  const combinations = [];
  for (const planetId of planets) {
    for (const resourceKey of resources) combinations.push({ planetId, resourceKey });
  }
  for (let i = combinations.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combinations[i], combinations[j]] = [combinations[j], combinations[i]];
  }
  const offers = [];
  const orders = state.companyOrders;
  for (const combo of combinations.slice(0, count)) {
    const config = MARKET_RESOURCES[combo.resourceKey];
    const unitPrice = Math.max(0.01, marketPrice(combo.resourceKey, 'buy'));
    const targetValues = [1000, 2500, 5000, 10000, 25000, 50000];
    const targetValue = targetValues[Math.floor(Math.random() * targetValues.length)] * (0.85 + Math.random() * 0.3);
    const quantity = Math.max(0.01, Math.round((targetValue / unitPrice) * 100) / 100);
    const reward = Math.round(quantity * unitPrice * 1.10 * 100) / 100;
    const deadlineHours = Math.random() < 0.5
      ? null
      : COMPANY_ORDER_DEADLINE_OPTIONS_HOURS[Math.floor(Math.random() * COMPANY_ORDER_DEADLINE_OPTIONS_HOURS.length)];
    let reputationReward = 5;
    if (reward >= 250000) reputationReward = 10;
    else if (reward >= 100000) reputationReward = 9;
    else if (reward >= 50000) reputationReward = 8;
    else if (reward >= 20000) reputationReward = 7;
    else if (reward >= 5000) reputationReward = 6;
    offers.push({
      id: orders.nextId++,
      planetId: combo.planetId,
      resourceKey: combo.resourceKey,
      quantity,
      unit: config.unit || 't',
      unitPriceAtCreation: unitPrice,
      reward,
      reputationReward,
      deadlineHours,
      createdAt: gameNow()
    });
  }
  return offers;
}

function companyOrderQuantity(value, unit) {
  return `${Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit || 't'}`;
}

function companyOrderTimeLeft(deadlineAt, now = gameNow()) {
  const remaining = Math.max(0, Number(deadlineAt || 0) - now);
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const extraHours = hours % 24;
    return extraHours ? `${days} T. ${extraHours} Std.` : `${days} Ingame-Tage`;
  }
  return `${hours} Ingame-Std.`;
}

function updateCompanyOrders(now = gameNow()) {
  const result = ensureCompanyOrders(now);
  const orders = result.orders;
  let changed = result.changed;
  const cycleSlot = Math.floor(Math.max(0, now) / COMPANY_ORDER_CYCLE_MS);
  if (cycleSlot > Number(orders.lastCycleSlot)) {
    orders.lastCycleSlot = cycleSlot;
    orders.offers = createCompanyOrderOffers(COMPANY_ORDER_OFFER_COUNT);
    changed = true;
  }
  const stillActive = [];
  for (const order of orders.active) {
    if (order.deadlineAt != null && Number(order.deadlineAt) <= now) {
      orders.failed.unshift({ ...order, status: 'failed', finishedAt: now, reason: 'Lieferfrist abgelaufen' });
      changed = true;
    } else {
      stillActive.push(order);
    }
  }
  orders.active = stillActive;
  if (orders.failed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.failed.length = COMPANY_ORDER_HISTORY_LIMIT;
  if (changed) {
    saveGame(false);
    if (!document.querySelector('#company-panel')?.hidden) renderCompanyPanel();
  }
}

function acceptCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  if (orders.active.length >= COMPANY_ORDER_MAX_ACTIVE) return;
  const index = orders.offers.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const offer = orders.offers.splice(index, 1)[0];
  const now = gameNow();
  orders.active.push({
    ...offer,
    acceptedAt: now,
    deadlineAt: offer.deadlineHours == null ? null : now + Number(offer.deadlineHours) * 60 * 60 * 1000
  });
  playUiSound('click');
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
}

function completeCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  const index = orders.active.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const order = orders.active[index];
  const storage = getPlanetStorage(order.planetId);
  const available = Math.max(0, Number(storage[order.resourceKey]) || 0);
  if (available + 1e-9 < Number(order.quantity)) {
    alert(`Nicht genügend ${resourceNames[order.resourceKey] || order.resourceKey} im Oberflächenlager von ${bodies[order.planetId]?.name || order.planetId}. Benötigt: ${companyOrderQuantity(order.quantity, order.unit)} · Vorhanden: ${companyOrderQuantity(available, order.unit)}.`);
    return;
  }
  storage[order.resourceKey] = Math.max(0, available - Number(order.quantity));
  state.gunniDollar = Math.max(0, Number(state.gunniDollar) || 0) + Number(order.reward || 0);
  orders.reputation = Math.max(0, Number(orders.reputation) || 0) + Number(order.reputationReward || 5);
  orders.unlockedLevel = orders.reputation >= 100 ? 2 : 1;
  orders.active.splice(index, 1);
  orders.completed.unshift({ ...order, status: 'completed', finishedAt: gameNow() });
  if (taskIsComplete('company_start_mining')) {
    state.tasks.companyOrdersCompleted = Number(state.tasks.companyOrdersCompleted || 0) + 1;
  }
  if (orders.completed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.completed.length = COMPANY_ORDER_HISTORY_LIMIT;
  recordCompanyFinance('income', Number(order.reward || 0), `Unternehmensauftrag #${order.id}: ${resourceNames[order.resourceKey] || order.resourceKey}`);
  playUiSound('research');
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
  taskProgressUpdate();
  renderTopResources();
  if (state.selected === order.planetId && state.viewMode !== 'orbit') renderInfo();
}

function cancelCompanyOrder(id) {
  const { orders } = ensureCompanyOrders();
  const index = orders.active.findIndex(order => Number(order.id) === Number(id));
  if (index < 0) return;
  const order = orders.active.splice(index, 1)[0];
  orders.failed.unshift({ ...order, status: 'cancelled', finishedAt: gameNow(), reason: 'Vom Spieler abgebrochen' });
  if (orders.failed.length > COMPANY_ORDER_HISTORY_LIMIT) orders.failed.length = COMPANY_ORDER_HISTORY_LIMIT;
  saveGame(false);
  if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters();
  else renderCompanyPanel();
}

function renderCompanyOrders() {
  if (!taskIsComplete('company_start_mining')) {
    return `<section class="company-orders-section">
      <div class="company-orders-heading"><div><h3>📋 Unternehmensaufträge · Stufe 1</h3><div class="hint">Noch gesperrt</div></div></div>
      <p class="hint">Schließe zuerst „Aller Anfang ist schwer“ ab: 10.000 t Eisen und 10.000 t Stein abbauen. Danach werden Unternehmensaufträge der Stufe 1 freigeschaltet.</p>
    </section>`;
  }
  const { orders } = ensureCompanyOrders();
  const now = gameNow();
  const nextCycleIn = Math.max(0, (Number(orders.lastCycleSlot) + 1) * COMPANY_ORDER_CYCLE_MS - now);
  const cycleHours = Math.ceil(nextCycleIn / (60 * 60 * 1000));
  const offerRows = orders.offers.map(order => {
    const planetName = bodies[order.planetId]?.name || order.planetId;
    const deadline = order.deadlineHours == null ? 'Keine Lieferfrist' : `${order.deadlineHours / 24} Ingame-Tage nach Annahme`;
    const activeFull = orders.active.length >= COMPANY_ORDER_MAX_ACTIVE;
    return `<article class="company-order-card">
      <div class="company-order-title"><strong>Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}</strong><span>${order.reputationReward} Ruf</span></div>
      <div class="company-order-details">Lieferung: <strong>${companyOrderQuantity(order.quantity, order.unit)}</strong><br>Planet: <strong>${escapeCompanyText(planetName)}</strong><br>Frist: <strong>${escapeCompanyText(deadline)}</strong></div>
      <div class="company-order-reward">Belohnung: <strong>${companyFormat(order.reward)}</strong></div>
      <button type="button" data-company-order-accept="${order.id}" ${activeFull ? 'disabled' : ''}>${activeFull ? '2 Aufträge aktiv' : 'Auftrag annehmen'}</button>
    </article>`;
  }).join('');
  const activeRows = orders.active.map(order => {
    const planetName = bodies[order.planetId]?.name || order.planetId;
    const storage = getPlanetStorage(order.planetId);
    const available = Math.max(0, Number(storage[order.resourceKey]) || 0);
    const enough = available + 1e-9 >= Number(order.quantity);
    const deadlineText = order.deadlineAt == null ? 'Keine Lieferfrist' : `Verbleibend: ${companyOrderTimeLeft(order.deadlineAt, now)}`;
    return `<article class="company-order-card company-order-active">
      <div class="company-order-title"><strong>Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}</strong><span>${order.reputationReward} Ruf</span></div>
      <div class="company-order-details">Zielplanet: <strong>${escapeCompanyText(planetName)}</strong><br>Benötigt: <strong>${companyOrderQuantity(order.quantity, order.unit)}</strong><br>Im Oberflächenlager: <strong class="${enough ? 'good' : 'warn'}">${companyOrderQuantity(available, order.unit)}</strong><br>${escapeCompanyText(deadlineText)}</div>
      <div class="company-order-reward">Belohnung: <strong>${companyFormat(order.reward)}</strong></div>
      <div class="company-order-actions"><button type="button" data-company-order-complete="${order.id}" ${enough ? '' : 'disabled'}>Liefern & abschließen</button><button type="button" class="danger" data-company-order-cancel="${order.id}">Abbrechen</button></div>
    </article>`;
  }).join('');
  const completedRows = orders.completed.slice(0, 10).map(order => `<div class="company-line"><span>✓ Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}<small>${escapeCompanyText(bodies[order.planetId]?.name || order.planetId)} · ${order.reputationReward} Ruf</small></span><strong class="good">+${companyFormat(order.reward)}</strong></div>`).join('');
  const failedRows = orders.failed.slice(0, 10).map(order => `<div class="company-line"><span>✕ Auftrag #${order.id} · ${escapeCompanyText(resourceNames[order.resourceKey] || order.resourceKey)}<small>${escapeCompanyText(order.reason || (order.status === 'cancelled' ? 'Abgebrochen' : 'Gescheitert'))}</small></span><strong>Keine Belohnung</strong></div>`).join('');
  const progress = Math.min(100, (orders.reputation / 100) * 100);
  const levelText = orders.reputation >= 100 ? 'Stufe 2 freigeschaltet' : `${Math.max(0, 100 - orders.reputation)} Ruf bis Stufe 2`;
  return `<section class="company-orders-section">
    <div class="company-orders-heading"><div><h3>📋 Unternehmensaufträge · Stufe 1</h3><div class="hint">🌙 Mond Startup · Aufträge nur auf Erde und Luna</div></div><span>${orders.active.length} / ${COMPANY_ORDER_MAX_ACTIVE} aktiv</span></div>
    <div class="company-reputation-card">
      <div class="company-order-title"><strong>🏅 Unternehmensruf</strong><strong>${orders.reputation} / 100</strong></div>
      <div class="company-reputation-track"><i style="width:${progress}%"></i></div>
      <div class="company-order-details">${escapeCompanyText(levelText)} · Stufe 2 bringt später planetenübergreifende Aufträge.</div>
    </div>
    <div class="company-order-section-title"><strong>Verfügbare Angebote (${orders.offers.length} / ${COMPANY_ORDER_OFFER_COUNT})</strong><small>Nächster Zyklus in ca. ${cycleHours} Ingame-Std.</small></div>
    ${orders.offers.length ? `<div class="company-order-list">${offerRows}</div>` : '<p class="hint">Keine Angebote verfügbar. Beim nächsten 6-Stunden-Zyklus kommen neue Angebote.</p>'}
    <div class="company-order-section-title"><strong>Aktive Aufträge (${orders.active.length} / ${COMPANY_ORDER_MAX_ACTIVE})</strong><small>Nur Oberflächenlager zählen.</small></div>
    ${orders.active.length ? `<div class="company-order-list">${activeRows}</div>` : '<p class="hint">Noch keine aktiven Aufträge. Nimm ein Angebot an, um zu beginnen.</p>'}
    <details class="company-subsection"><summary>✓ Erfolgreich abgeschlossen (${orders.completed.length})</summary><div class="company-stock-list">${completedRows || '<p class="hint">Noch keine abgeschlossenen Aufträge.</p>'}</div></details>
    <details class="company-subsection"><summary>✕ Gescheitert oder abgebrochen (${orders.failed.length})</summary><div class="company-stock-list">${failedRows || '<p class="hint">Keine gescheiterten oder abgebrochenen Aufträge.</p>'}</div></details>
    <p class="hint">Die Belohnung beträgt 110 % des beim Erstellen des Angebots geltenden Markt-Kaufpreises. Erfolgreiche Aufträge bringen 5–10 Rufpunkte. Lieferfristen beginnen erst mit der Annahme. Es werden nur Waren im Oberflächenlager des angegebenen Planeten angerechnet.</p>
  </section>`;
}

function setupCompanyOrderActions() {
  const panel = document.querySelector('#company-content');
  panel?.querySelectorAll('[data-company-order-accept]').forEach(button => button.addEventListener('click', () => acceptCompanyOrder(button.dataset.companyOrderAccept)));
  panel?.querySelectorAll('[data-company-order-complete]').forEach(button => button.addEventListener('click', () => completeCompanyOrder(button.dataset.companyOrderComplete)));
  panel?.querySelectorAll('[data-company-order-cancel]').forEach(button => button.addEventListener('click', () => cancelCompanyOrder(button.dataset.companyOrderCancel)));
}

function renderCompanyPanel() {
  const panel = document.querySelector('#company-content');
  if (!panel) return;
  const v = calculateCompanyValue();
  const resourceRows = Object.entries(COMPANY_RESOURCE_VALUES).map(([key, rate]) => {
    let amount = 0;
    for (const id of Object.keys(bodies)) {
      if (id === 'sun') continue;
      amount += Number(getPlanetStorage(id)[key] || 0) + Number(getOrbitStorage(id)[key] || 0);
    }
    if (amount <= 0) return '';
    const unit = key === 'water' || key === 'crudeOil' ? 'L' : 't';
    return `<div class="company-line"><span>${COMPANY_RESOURCE_NAMES[key] || key} <small>${amount.toLocaleString('de-DE',{maximumFractionDigits:2})} ${unit}</small></span><strong>${companyFormat(amount * rate)}</strong></div>`;
  }).join('');
  const buildingRows = v.buildingBreakdown.map(planet => `
    <details class="company-subsection">
      <summary>🪐 ${escapeCompanyText(planet.name)} · ${planet.count} Gebäude <span>${companyFormat(planet.value)}</span></summary>
      <div class="company-stock-list">${planet.buildings.map(b => `<div class="company-line"><span>${escapeCompanyText(b.name)}</span><strong>${b.count}×</strong></div>`).join('')}</div>
    </details>`).join('');
  const rocketRows = v.rocketBreakdown.map(r => `<div class="company-line"><span>🚀 ${r.name}<small>${companyFormat(r.unitValue)} pro fertiger Rakete</small></span><strong>${r.count}× · ${companyFormat(r.value)}</strong></div>`).join('');
  const financeRows = v.financeHistory.map(entry => {
    const date = entry.gameDate ? `Ingame ${entry.gameDate}` : (entry.date ? new Date(entry.date).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }) : '');
    return `<div class="company-line"><span>${entry.type === 'income' ? '↗️' : '↘️'} ${escapeCompanyText(entry.description)}<small>${date}</small></span><strong class="${entry.type === 'income' ? 'good' : 'bad'}">${entry.type === 'income' ? '+' : '−'}${companyFormat(entry.amount)}</strong></div>`;
  }).join('');
  const financePeriods = ensureCompanyFinance().periods;
  const currentPeriodKeys = getCompanyFinancePeriodKeys();
  const financePeriodValue = period => {
    const income = Math.max(0, Number(period?.income) || 0);
    const expense = Math.max(0, Number(period?.expense) || 0);
    const balance = income - expense;
    return { income, expense, balance };
  };
  const financePeriodRows = (periods, currentKey, limit = Infinity, labelForKey = key => key) => {
    const keys = [...new Set([...Object.keys(periods || {}), currentKey])].sort().reverse().slice(0, limit);
    return keys.map(key => {
      const totals = financePeriodValue(periods?.[key]);
      const label = labelForKey(key);
      return `<div class="company-finance-period-row"><strong>${escapeCompanyText(label)}</strong><span class="good">+${companyFormat(totals.income)}</span><span class="bad">−${companyFormat(totals.expense)}</span><strong class="${totals.balance >= 0 ? 'good' : 'bad'}">${totals.balance >= 0 ? '+' : '−'}${companyFormat(Math.abs(totals.balance))}</strong></div>`;
    }).join('');
  };
  const dayRows = financePeriodRows(financePeriods.days, currentPeriodKeys.day, 30, key => key.split('-').reverse().join('.'));
  const monthRows = financePeriodRows(financePeriods.months, currentPeriodKeys.month, 24, key => {
    const [year, month] = key.split('-');
    return `${month}.${year}`;
  });
  const yearRows = financePeriodRows(financePeriods.years, currentPeriodKeys.year, Infinity, key => key);
  const companyOrdersHtml = renderCompanyOrders();
  panel.innerHTML = `<div class="company-summary">
    ${companyOrdersHtml}
    <div class="company-hero"><span>Unternehmen</span><strong>${escapeCompanyText(state.companyName || 'Unbenanntes Unternehmen')}</strong><button id="company-rename" type="button" class="small-button">Name ändern</button></div>
    <div class="company-total"><span>Geschätzter Unternehmenswert</span><strong>${companyFormat(v.total)}</strong></div>
    <div class="company-line"><span>Gebäudewerte <small>nach Rohstoffwerten der Baukosten</small></span><strong>${companyFormat(v.buildingsValue)}</strong></div>
    <div class="company-line"><span>Rohstoff- und Warenbestände</span><strong>${companyFormat(v.stockValue)}</strong></div>
    <div class="company-line"><span>Fertige Raketen</span><strong>${companyFormat(v.rocketValue)}</strong></div>
    <div class="company-line"><span>Geldbestand</span><strong>${companyFormat(v.cash)}</strong></div>
    <div class="company-line"><span>Schulden</span><strong>${companyFormat(v.debts)}</strong></div>
    <p class="hint">Raketen haben feste Unternehmenswerte. Lagerwerte nutzen feste Rohstoffwerte; Oberflächen- und Orbitlager werden berücksichtigt. Kredite sind derzeit nicht aktiviert.</p>
    <details class="company-subsection"><summary>🏭 Gebäude nach Planet</summary><div class="company-stock-list">${buildingRows || '<p class="hint">Noch keine Gebäude vorhanden.</p>'}</div></details>
    <details class="company-subsection"><summary>🚀 Raketenbestand und Einzelwerte</summary><div class="company-stock-list">${rocketRows}</div></details>
    <details class="company-subsection"><summary>💰 Finanzen und Ergebnis</summary>
      <div class="company-line"><span>Erfasste Einnahmen</span><strong class="good">${companyFormat(v.incomeTotal)}</strong></div>
      <div class="company-line"><span>Erfasste Ausgaben</span><strong class="bad">${companyFormat(v.expenseTotal)}</strong></div>
      <div class="company-line"><span>Saldo seit Erfassung</span><strong class="${v.profit >= 0 ? 'good' : 'bad'}">${v.profit >= 0 ? '+' : '−'}${companyFormat(Math.abs(v.profit))}</strong></div>
      <p class="hint">Die Periodenübersichten verwenden den Ingame-Kalender ab 01.01.2027. Einnahmen und Ausgaben werden je Ingame-Tag, -Monat und -Jahr dauerhaft zusammengefasst. Ältere Gesamtwerte aus Spielständen ohne Periodendaten lassen sich nicht zuverlässig einem früheren Ingame-Jahr zuordnen; sie werden deshalb nicht erfunden oder rückdatiert.</p>
      <details class="company-finance-periods" open><summary>📅 Ingame-Tagesübersicht · letzte 30 Tage</summary>
        <div class="company-finance-period-head"><span>Ingame-Tag</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${dayRows}</div>
      </details>
      <details class="company-finance-periods"><summary>🗓️ Ingame-Monatsübersicht · letzte 24 Monate</summary>
        <div class="company-finance-period-head"><span>Ingame-Monat</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${monthRows}</div>
      </details>
      <details class="company-finance-periods"><summary>📈 Ingame-Jahresübersicht · alle erfassten Jahre</summary>
        <div class="company-finance-period-head"><span>Ingame-Jahr</span><span>Einnahmen</span><span>Ausgaben</span><span>Saldo</span></div>
        <div class="company-finance-period-list">${yearRows}</div>
      </details>
      <details><summary>Letzte Transaktionen (max. 30)</summary><div class="company-stock-list">${financeRows || '<p class="hint">Noch keine einzelnen Transaktionen erfasst.</p>'}</div></details>
    </details>
    <details class="company-subsection"><summary>📦 Vorhandene Lagerbestände mit Bewertungswert</summary><div class="company-stock-list">${resourceRows || '<p class="hint">Noch keine bewerteten Lagerbestände vorhanden.</p>'}</div></details>
  </div>`;
  setupCompanyOrderActions();
  document.querySelector('#company-rename')?.addEventListener('click', () => {
    const name = prompt('Neuen Firmennamen eingeben:', state.companyName || '');
    if (name !== null && name.trim()) { state.companyName = name.trim().slice(0,60); saveGame(false); if (!document.querySelector('#company-headquarters-panel')?.hidden) renderCompanyHeadquarters(); else renderCompanyPanel(); }
  });
}
function escapeCompanyText(value) {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function updateCompanyHeadquartersMenu() {
  const button = document.querySelector('#company-headquarters-button');
  if (!button) return;
  // Der gemeinsame Menüpunkt bleibt sichtbar, damit auch KI-Unternehmen
  // unabhängig vom Bau der eigenen Unternehmenszentrale erreichbar sind.
  button.hidden = false;
}

function renderCompanyHeadquarters() {
  const panel = document.querySelector('#company-headquarters-content');
  if (!panel) return;
  if (Number(getBuildingsOnPlanet('earth').companyHeadquarters || 0) < 1) {
    panel.innerHTML = '<p class="hint">Die Unternehmenszentrale muss zuerst auf der Erde gebaut werden.</p>';
    const recruitmentPanel = document.querySelector('#hq-recruitment-content');
    if (recruitmentPanel) recruitmentPanel.innerHTML = '';
    return;
  }
  const companyValue = calculateCompanyValue();
  const finance = ensureCompanyFinance();
  // Nur regelmäßig wiederkehrende Einnahmen zählen für die Rate. Einmalige
  // Marktverkäufe, Auftragsbelohnungen und der Firmenwert werden nicht hochgerechnet.
  const colonistIncomePerSecond = Math.max(0, Number(totalColonists()) || 0) * 0.0002;
  const stockMarket = ensureStockMarket();
  const dividendPerDay = AI_COMPANY_CONFIG.reduce((sum, cfg) => {
    const stock = stockMarket.companies[cfg.id];
    const company = ensureAICompanies()[cfg.id];
    const shares = Math.max(0, Number(stock.playerShares) || 0);
    const dailyPool = Math.max(0, Number(company.cash) || 0) * 0.01;
    return sum + dailyPool * shares / Math.max(1, Number(stock.totalShares) || 1000);
  }, 0);
  const dividendPerSecond = dividendPerDay / 86400;
  const incomePerSecond = colonistIncomePerSecond + dividendPerSecond;
  const habitatCount = Object.keys(bodies).reduce((total, id) => {
    if (id === 'sun') return total;
    return total + Math.max(0, Number(getBuildingsOnPlanet(id).habitat) || 0);
  }, 0);
  const expensePerSecond = habitatCount * (88 / 3600); // 88 GD je Habitat und Ingame-Stunde.
  const fmt = amount => `${Number(amount || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar`;
  const level = Math.max(1, Number(state.companyOrders?.unlockedLevel) || 1);
  panel.innerHTML = `
    <section class="hq-level-card">
      <span>Aktuelle Unternehmensstufe</span>
      <strong>Stufe ${level}</strong>
      <small>${Number(state.companyOrders?.reputation || 0)} Rufpunkte</small>
    </section>
    <section class="hq-finance-card">
      <h3>💰 Finanzen</h3>
      <div class="hq-finance-stat hq-balance"><span>Kontostand</span><strong>${fmt(state.gunniDollar)}</strong></div>
      <div class="hq-finance-stat hq-company-value"><span>Firmenwert</span><strong>${fmt(companyValue.total)}</strong></div>
      <div class="hq-finance-rate hq-income">
        <h4>↗️ Regelmäßige Einnahmen</h4>
        <div><span>Kolonisten · pro Ingame-Sekunde</span><strong>${fmt(colonistIncomePerSecond)}</strong></div>
        <div><span>Dividenden · pro Ingame-Sekunde</span><strong>${fmt(dividendPerSecond)}</strong></div>
        <div><span>Gesamt · pro Ingame-Stunde</span><strong>${fmt(incomePerSecond * 3600)}</strong></div>
        <div><span>Gesamt · pro Ingame-Tag</span><strong>${fmt(incomePerSecond * 86400)}</strong></div>
        <small>Dividenden werden einmal pro Ingame-Tag ausgezahlt. Die angezeigte Dividendenrate ist eine Schätzung anhand der aktuellen Firmenkassen und deiner Aktienanteile. Einmalige Verkäufe und Auftragsbelohnungen zählen nicht dazu.</small>
      </div>
      <div class="hq-finance-rate hq-expenses">
        <h4>↘️ Regelmäßige Ausgaben</h4>
        <div><span>Pro Ingame-Sekunde</span><strong>${fmt(expensePerSecond)}</strong></div>
        <div><span>Pro Ingame-Stunde</span><strong>${fmt(expensePerSecond * 3600)}</strong></div>
        <div><span>Pro Ingame-Tag</span><strong>${fmt(expensePerSecond * 86400)}</strong></div>
        <small>Regelmäßige Ausgaben werden erst hochgerechnet, wenn sie als laufende Kosten separat erfasst werden.</small>
      </div>
    </section>
    <section id="hq-company-details" class="hq-company-details"></section>`;
  // Alle Inhalte aus „Unternehmen“ werden in die Unternehmenszentrale übernommen.
  // Das separate Menü verschwindet; bestehende Auftrags- und Umbenennungsaktionen bleiben erhalten.
  renderCompanyPanel();
  const source = document.querySelector('#company-content');
  const destination = document.querySelector('#hq-company-details');
  if (source && destination) {
    while (source.firstChild) destination.appendChild(source.firstChild);
  }
  if (typeof globalThis.SolarFrontierRecruitment?.renderPanel === 'function') {
    globalThis.SolarFrontierRecruitment.renderPanel();
  }
}
function setupCompanyHeadquarters() {
  const button = document.querySelector('#company-headquarters-button');
  const panel = document.querySelector('#company-headquarters-panel');
  const close = document.querySelector('#company-headquarters-close');
  const tabs = panel ? [...panel.querySelectorAll('[data-company-tab]')] : [];
  const setCompanyTab = tab => {
    tabs.forEach(item => {
      const active = item.dataset.companyTab === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panel?.querySelectorAll('[data-company-view]').forEach(view => {
      view.hidden = view.dataset.companyView !== tab;
    });
    if (tab === 'ai') renderAICompaniesPanel();
    else renderCompanyHeadquarters();
  };
  tabs.forEach(tab => tab.addEventListener('click', () => setCompanyTab(tab.dataset.companyTab)));
  updateCompanyHeadquartersMenu();
  button?.addEventListener('click', () => {
    if (!panel) return;
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#asteroids-panel','#company-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel => { const el = document.querySelector(sel); if (el) el.hidden = true; });
      const menu = document.querySelector('#main-menu'); if (menu) menu.hidden = true;
      setCompanyTab('headquarters');
    }
  });
  close?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  ['market-button','news-button','economy-button','company-button','colonists-button','research-button','tasks-button','introduction-button','settings-button','save-menu-button','flight-center-button','asteroids-button','cyclic-missions-button'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  });
}

function setupCompany() {
  const button = document.querySelector('#company-button');
  const panel = document.querySelector('#company-panel');
  const close = document.querySelector('#company-close');
  button?.addEventListener('click', () => {
    if (!panel) return;
    if (!taskIsComplete('company_start_name')) {
      alert('Das Unternehmensmenü wird erst nach Abschluss von „Gründe deine eigene Firma“ freigeschaltet. Erfülle zuerst die Aufgaben im Reiter „Der Weg zur Firma“.');
      return;
    }
    panel.hidden = !panel.hidden;
    if (!panel.hidden) {
      ['#news-panel','#economy-panel','#research-panel','#tasks-panel','#introduction-panel','#colonists-panel','#settings-panel','#market-panel','#asteroids-panel','#flight-center-panel','#cyclic-missions-panel'].forEach(sel => { const el=document.querySelector(sel); if(el) el.hidden=true; });
      const menu=document.querySelector('#main-menu'); if(menu) menu.hidden=true;
      renderCompanyPanel();
    }
  });
  close?.addEventListener('click', () => { if(panel) panel.hidden=true; });
  ['market-button','news-button','economy-button','colonists-button','research-button','tasks-button','introduction-button','settings-button','save-menu-button','flight-center-button'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => { if (panel) panel.hidden = true; });
  });
}

function renderEconomy() {
  const panel = document.querySelector('#economy-content');
  if (!panel) return;
  // Kolonisten erzeugen 0,0002 GünniDollar pro Kopf und Ingame-Sekunde.
  const colonistCount = totalColonists();
  const gunniDollarIncome = colonistCount * 0.0002;
  const gunniDollarBalance = Math.max(0, Number(state.gunniDollar || 0));
  const formatGunniDollar = value => `${Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar`;
  const resources = [['stone','🪨','Stein'],['ice','🧊','Eis'],['coal','⚫','Kohle'],['gas','🔥','Gas'],['co2','🌫️','CO₂'],['carbon','⚫','Kohlenstoff'],['oxygen','🫧','Sauerstoff'],['hydrogen','💧','Wasserstoff'],['helium','🎈','Helium'],['crudeOil','🛢️','Rohöl'],['liquidFuel','⛽','Treibstoff'],['polymers','🧬','Polymere'],['rubber','⚫','Gummi'],['plastics','🧴','Kunststoff'],['wood','🪵','Bretter'],['biomass','🌿','Biomasse'],['trees','🌳','Baumbestand'],['iron','🧲','Eisen'],['goldOre','🟨','Golderz'],['gold','🪙','Gold'],['steel','🔩','Stahl'],['silicon','🔷','Silizium'],['lithium','🔋','Lithium'],['copperOre','🟠','Kupfererz'],['copper','🟤','Kupfer'],['batteries','🔋','Batterien'],['buildingMaterials','🧱','Baustoffe'],['machines','⚙️','Maschinen'],['glass','🪟','Glas'],['electronics','💻','Elektronik'],['uranium','☢️','Uran'],['processedUranium','🧪','Aufbereitetes Uran'],['nuclearFuel','⚛️','Kernbrennstoff'],['ionium','☢️','Ionium'],['chips','💾','Chips'],['helium3','🧪','Helium-3'],['bauxite','🪨','Bauxit'],['aluminiumOxide','⚗️','Aluminiumoxid'],['aluminium','🥈','Aluminium'],['water','💧','Wasser'],['grain','🌾','Getreide'],['vegetables','🥦','Gemüse'],['food','🥫','Lebensmittel'],['algaeBiomass','🪴','Algenbiomasse'],['cocoaBeans','🫘','Kakaobohnen'],['chocolate','🍫','Schokolade'],['graphite','⚫','Graphit'],['titanOre','🪨','Titanerz'],['processedTitan','⚗️','Aufbereitetes Titan'],['titanium','nickelOre','🥈','Titan'],['vehicles','🚗','Fahrzeuge'],['luxuryFurniture','🛋️','Luxusmöbel']];
  const rows = resources.map(([key, icon, name]) => {
    const amount = key === 'liquidFuel' ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + liquidFuelAmount(id,'surface') + liquidFuelAmount(id,'orbit'), 0) : key === 'trees' ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(bodies[id].resources?.trees || 0), 0) : ['ice','co2','cocoaBeans','chocolate','wood','biomass','ionium','graphite','goldOre','gold'].includes(key) ? Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id)[key] || 0) + Number(getOrbitStorage(id)[key] || 0), 0) : getPlayerResourceAmount(key, 'earth');
    let production = 0, consumption = 0;
    if (key === 'ice') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).iceMine || 0) * 0.2, 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).iceProcessingPlant || 0) * 0.1, 0);
    }
    if (key === 'co2') {
      production = venusCo2ExtractionRate('venus') + Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).orbitalCo2Extractor || 0) * 0.2, 0);
    }
    if (key === 'carbon') { production = co2ProcessingProduction('earth', 'carbon'); consumption = 0; }
    if (key === 'oxygen') { production = co2ProcessingProduction('earth', 'oxygen'); consumption = 0; }
    if (key === 'trees') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).treeNursery || 0) * (1 / 10800) * newBuildingPowerFactor(id), 0); consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).woodcutter || 0) * 0.01 * Math.min(newBuildingPowerFactor(id), Number(bodies[id].resources?.trees || 0) > 0 ? 1 : 0), 0); }
    if (key === 'wood' || key === 'biomass') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).woodcutter || 0) * 0.009 * newBuildingPowerFactor(id) * (Number(bodies[id].resources?.trees || 0) > 0 ? 1 : 0), 0); consumption = 0; }
    if (key === 'crudeOil') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + crudeOilProduction(id), 0); consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).polymerFactory || 0) * 0.001 + rubberOilUse(id) + syntheticGraphiteOilUse(id) + Number(getOperationalBuildingsOnPlanet(id).refinery || 0) * 0.2, 0); }
    if (key === 'graphite') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const b = getOperationalBuildingsOnPlanet(id); const mineRate = ['earth','luna','mars','io'].includes(id) && Number(bodies[id].resources?.graphite || 0) > 0 ? Number(b.graphiteMine || 0) * 0.05 : 0; const syntheticRate = Number(b.syntheticGraphitePlant || 0) * 0.05 * Math.min(newBuildingPowerFactor(id), Number(getPlanetStorage(id).crudeOil || 0) > 0 ? 1 : 0); return sum + mineRate * newBuildingPowerFactor(id) + syntheticRate; }, 0); consumption = 0; }
    if (key === 'liquidFuel') { production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).refinery || 0) * 0.4, 0); consumption = 0; }
    if (key === 'polymers') { production = Number(getOperationalBuildingsOnPlanet('earth').polymerFactory || 0) * 0.0005; consumption = 0; }
    if (key === 'rubber') { production = rubberProduction('earth'); consumption = plasticRubberUse('earth'); }
    if (key === 'plastics') { production = plasticProduction('earth'); consumption = 0; }
    if (key === 'iron') { production = ironProduction('earth'); consumption = ironUse('earth'); }
    if (key === 'stone') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const b=getOperationalBuildingsOnPlanet(id), st=getPlanetStorage(id); return sum + Number(b.goldRefinery || 0) * 0.1 * newBuildingPowerFactor(id) * (Number(st.goldOre || 0) > 0 ? 1 : 0); }, 0);
    }
    if (key === 'goldOre') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).goldMine || 0) * 0.05 * newBuildingPowerFactor(id) * (Number(bodies[id].resources?.goldOre || 0) > 0 ? 1 : 0), 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).goldRefinery || 0) * 0.1 * newBuildingPowerFactor(id) * (Number(getPlanetStorage(id).goldOre || 0) > 0 ? 1 : 0), 0);
    }
    if (key === 'gold') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const b=getOperationalBuildingsOnPlanet(id), st=getPlanetStorage(id); return sum + Number(b.goldRefinery || 0) * 0.09 * newBuildingPowerFactor(id) * (Number(st.goldOre || 0) > 0 ? 1 : 0); }, 0);
      consumption = 0;
    }
    if (key === 'steel') production = steelProduction('earth');
    if (key === 'silicon') production = siliconProduction('earth');
    if (key === 'lithium') { production = lithiumProduction('earth'); consumption = lithiumRefineryLithiumUse('earth') + chipFactoryLithiumUse('earth') + electronicsFactoryLithiumUse('earth'); }
    if (key === 'copperOre') { production = copperProduction('earth'); consumption = copperSmeltingUse('earth'); }
    if (key === 'copper') { production = copperSmeltingProduction('earth'); consumption = lithiumRefineryCopperUse('earth') + machineFactoryCopperUse('earth') + electronicsFactoryCopperUse('earth'); }
    if (key === 'batteries') production = batteryProduction('earth');
    if (key === 'buildingMaterials') {
      production = buildingMaterialsProduction('earth');
      consumption = 0;
    }
    if (key === 'machines') production = machineProduction('earth');
    if (key === 'glass') { production = glassProduction('earth'); consumption = vehicleFactoryGlassUse('earth'); }
    if (key === 'uranium') { production = uraniumProduction('earth'); consumption = processedUraniumUraniumUse('earth'); }
    if (key === 'ionium') production = Number(getOperationalBuildingsOnPlanet('io').ioniumMine || 0) * 0.01;
    if (key === 'processedUranium') { production = processedUraniumProduction('earth'); consumption = nuclearFuelProcessedUraniumUse('earth'); }
    if (key === 'nuclearFuel') { production = nuclearFuelProduction('earth'); consumption = nuclearReactorNuclearFuelUse('earth'); }
    if (key === 'chips') { production = chipProduction('earth'); consumption = electronicsFactoryChipUse('earth'); }
    if (key === 'electronics') { production = electronicsProduction('earth'); consumption = 0; }
    if (key === 'helium3') { production = helium3Production('earth'); consumption = fusionHelium3Use('earth'); }
    if (key === 'bauxite') production = Number(getOperationalBuildingsOnPlanet('earth').bauxiteMine || 0) * 0.5;
    if (key === 'titanOre') { production = Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).titanMine || 0) * 0.2, 0); consumption = Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).titanProcessing || 0) * 0.2, 0); }
    if (key === 'processedTitan') { production = Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).titanProcessing || 0) * 0.1, 0); consumption = Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).titanRefinery || 0) * 0.1, 0); }
    if (key === 'titanium') production = Object.keys(bodies).reduce((sum, id) => sum + Number(getOperationalBuildingsOnPlanet(id).titanRefinery || 0) * 0.05, 0);
    if (key === 'aluminiumOxide') { production = Number(getOperationalBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.25; consumption = Number(getOperationalBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.25; }
    if (key === 'aluminium') production = Number(getOperationalBuildingsOnPlanet('earth').aluminiumSmelter || 0) * 0.125;
    if (key === 'bauxite') consumption = Number(getOperationalBuildingsOnPlanet('earth').aluminiumOxideRefinery || 0) * 0.5;
    if (key === 'coal') consumption = coalPowerUse('earth');
    if (key === 'water') { production = hydroelectricWaterProduction('earth') * newBuildingPowerFactor('earth'); consumption = greenhouseWaterUse('earth') + foodFactoryWaterUse('earth') * newBuildingPowerFactor('earth') + Number(getOperationalBuildingsOnPlanet('earth').cocoaPlantation || 0) * 0.2; }
    if (key === 'cocoaBeans') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const count = Number(getOperationalBuildingsOnPlanet(id).cocoaPlantation || 0);
        const water = Number(getPlanetStorage(id).water || 0);
        return sum + count * 0.1 * Math.min(newBuildingPowerFactor(id), water > 0 ? 1 : 0);
      }, 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const b = getOperationalBuildingsOnPlanet(id), st = getPlanetStorage(id);
        const powered = Number(b.chocolateFactory || 0) * newBuildingPowerFactor(id);
        return sum + Math.min(powered * 0.02, Number(st.cocoaBeans || 0) > 0 ? powered * 0.02 : 0);
      }, 0);
    }
    if (key === 'chocolate') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => {
        const b = getOperationalBuildingsOnPlanet(id), st = getPlanetStorage(id);
        const powered = Number(b.chocolateFactory || 0) * newBuildingPowerFactor(id);
        return sum + powered * 0.05 * (Number(st.cocoaBeans || 0) > 0 ? 1 : 0);
      }, 0);
      consumption = 0;
    }
    if (key === 'grain' || key === 'vegetables') production = greenhouseCropProduction('earth') * newBuildingPowerFactor('earth');
    if (key === 'grain') consumption = foodFactoryGrainUse('earth') * newBuildingPowerFactor('earth');
    if (key === 'food') production = foodFactoryProduction('earth') * newBuildingPowerFactor('earth');
    if (key === 'steel') consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + vehicleFactorySteelUse(id), 0);
    if (key === 'silicon') consumption = 0;
    if (key === 'lithiumBatteries') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).lithiumBatteryFactory || 0) * 0.005 * getBuildingPowerFactor(id, 'lithiumBatteryFactory'), 0);
      consumption = 0;
    }
    if (key === 'vehicles') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + vehicleFactoryProduction(id), 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const body = ensureColonistData(id); return sum + (body?.vehicleLuxuryEnabled !== false && Number(getPlanetStorage(id).vehicles || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
    }
    if (key === 'luxuryFurniture') {
      production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + luxuryFurnitureFactoryProduction(id), 0);
      consumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => { const body = ensureColonistData(id); return sum + (body?.furnitureLuxuryEnabled !== false && Number(getPlanetStorage(id).luxuryFurniture || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
    }
    if (key === 'algaeBiomass') production = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getOperationalBuildingsOnPlanet(id).algaeFarm || 0) * 0.1, 0);
    const balance = production - consumption;
    const balanceClass = Math.abs(balance) < 0.000001 ? 'balanced' : balance > 0 ? 'surplus' : 'shortage';
    const liquidResource = ['crudeOil','water','liquidFuel'].includes(key);
    const unit = liquidResource ? 'L/s' : 't/s';
    return `<div class="stat economy-resource-row ${balanceClass}" data-economy-resource="${key}"><span class="economy-resource-name">${icon} ${name}</span><strong class="economy-stock">${liquidResource ? amount.toLocaleString('de-DE', {maximumFractionDigits:2}) + ' L' : key === 'co2' ? formatLargeTons(amount) : formatTons(amount)}</strong><span class="economy-flow-value"><small>Produktion</small><strong>${production.toFixed(liquidResource ? 2 : 4)} ${unit}</strong></span><span class="economy-flow-value"><small>Verbrauch</small><strong>${consumption.toFixed(liquidResource ? 2 : 4)} ${unit}</strong></span></div>`;
  }).join('');
  const totalLithiumBatteryStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + Number(getPlanetStorage(id).lithiumBatteries || 0) + Number(getOrbitStorage(id).lithiumBatteries || 0), 0);
  const totalVehicleStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id).vehicles || 0) + Number(getOrbitStorage(id).vehicles || 0), 0);
  const totalVehicleProduction = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + vehicleFactoryProduction(id), 0);
  const totalVehicleConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => { const body = ensureColonistData(id); return sum + (body?.vehicleLuxuryEnabled !== false && Number(getPlanetStorage(id).vehicles || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
  const vehicleInputUse = { steel:0, plastics:0, rubber:0, glass:0, chips:0 };
  Object.keys(bodies).filter(id => id !== 'sun').forEach(id => { vehicleInputUse.steel += vehicleFactorySteelUse(id); vehicleInputUse.plastics += vehicleFactoryPlasticUse(id); vehicleInputUse.rubber += vehicleFactoryRubberUse(id); vehicleInputUse.glass += vehicleFactoryGlassUse(id); vehicleInputUse.chips += vehicleFactoryChipUse(id); });
  const totalChocolateStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => sum + Number(getPlanetStorage(id).chocolate || 0) + Number(getOrbitStorage(id).chocolate || 0), 0);
  const totalFurnitureStock = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+Number(getPlanetStorage(id).luxuryFurniture || 0),0);
  const totalFurnitureProduction = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+luxuryFurnitureFactoryProduction(id),0);
  const totalFurnitureConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>{ const body=ensureColonistData(id); return sum + (body?.furnitureLuxuryEnabled !== false && Number(getPlanetStorage(id).luxuryFurniture || 0)>1e-12 ? colonistsOnPlanet(id)*0.00002 : 0); },0);
  const totalChocolateConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum, id) => { const body = ensureColonistData(id); return sum + (body?.chocolateLuxuryEnabled !== false && Number(getPlanetStorage(id).chocolate || 0) > 1e-12 ? colonistsOnPlanet(id) * 0.00002 : 0); }, 0);
  const luxuryRows = `<div class="stat economy-resource-row"><span>🚗 Fahrzeuge</span><strong>${formatTons(totalVehicleStock)}</strong><small>${totalVehicleProduction.toFixed(4)} t/s Produktion · ${totalVehicleConsumption.toFixed(6)} t/s Kolonistenverbrauch</small></div><div class="stat economy-resource-row"><span>🍫 Schokolade</span><strong>${formatTons(totalChocolateStock)}</strong><small>${totalChocolateConsumption.toFixed(6)} t/s Kolonistenverbrauch · +8 % Populationswachstum bei aktivem Luxusgut und Vorrat</small></div><div class="stat economy-resource-row"><span>🛋️ Luxusmöbel</span><strong>${formatTons(totalFurnitureStock)}</strong><small>${totalFurnitureProduction.toFixed(4)} t/s Produktion · ${totalFurnitureConsumption.toFixed(6)} t/s Kolonistenverbrauch · +9 % Populationswachstum</small></div><div class="stat"><span>Fahrzeugfabriken im Sonnensystem</span><strong>${Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id)=>sum+vehicleFactoryCount(id),0)}</strong></div><div class="stat"><span>Stahlverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.steel.toFixed(3)} t/s</strong></div><div class="stat"><span>Kunststoffverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.plastics.toFixed(3)} t/s</strong></div><div class="stat"><span>Gummiverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.rubber.toFixed(3)} t/s</strong></div><div class="stat"><span>Glasverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.glass.toFixed(3)} t/s</strong></div><div class="stat"><span>Chipsverbrauch der Fahrzeugfabriken</span><strong>${vehicleInputUse.chips.toFixed(3)} t/s</strong></div>`;
  const b = getBuildingsOnPlanet('earth');
  const allPlanetBuildings = Object.keys(bodies).reduce((totals, planetId) => {
    for (const [key, count] of Object.entries(getBuildingsOnPlanet(planetId))) totals[key] = (totals[key] || 0) + Number(count || 0);
    return totals;
  }, {});
  const total = Object.values(allPlanetBuildings).reduce((a,v)=>a+Number(v||0),0);
  const chain = batteryProductionChain('earth');
  const dashboardResourceKeys = resources.map(([key]) => key);
  const resourceGroups = [
    { id:'stocks', title:'📦 Rohstoffe & Lager', keys:dashboardResourceKeys },
    { id:'production', title:'🏭 Produktion & Verbrauch', keys:dashboardResourceKeys }
  ];
  const rowByKey = Object.fromEntries([...rows.matchAll(/<div class="stat economy-resource-row(?: [^"]*)?" data-economy-resource="([^"]+)">[\s\S]*?<\/div>/g)].map(m=>[m[1],m[0]]));
  const stockRows = resourceGroups[0].keys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const productionKeys = dashboardResourceKeys;
  const productionRows = productionKeys.map(k=>rowByKey[k]).filter(Boolean).join('');
  const buildingRows = Object.entries(allPlanetBuildings).map(([key,count])=>`<div class="stat economy-building-row"><span>${buildingTypes[key]?.icon || '🏭'} ${buildingTypes[key]?.name || key}</span><strong>${count}</strong></div>`).join('');
  const energyProduction = electricityProduction('earth');
  const energyConsumption = electricityConsumption('earth');
  const energyBalance = energyProduction - energyConsumption;
  const batteryPlanets = Object.keys(bodies).filter(id => id !== 'sun');
  const batteryOverview = batteryPlanets.reduce((totals, id) => {
    const count = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
    if (!count) return totals;
    const data = ensureBatteryStorageData(id);
    totals.count += count;
    totals.capacity += count * 100;
    totals.stored += Math.min(count * 100, Number(data.chargeMWh) || 0);
    totals.maxCharge += count * 10;
    totals.maxDischarge += count * 10;
    totals.planets.push(bodies[id]?.name || id);
    return totals;
  }, { count: 0, capacity: 0, stored: 0, maxCharge: 0, maxDischarge: 0, planets: [] });
  const batteryPercent = batteryOverview.capacity ? batteryOverview.stored / batteryOverview.capacity * 100 : 0;
  const batterySummary = `<div class="dashboard-battery-summary"><div class="dashboard-battery-heading"><strong>🔋 Gespeicherter Strom</strong><span>${batteryOverview.stored.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${batteryOverview.capacity.toLocaleString('de-DE')} MWh</span></div><div class="dashboard-battery-track"><i style="width:${batteryPercent}%"></i></div><div class="dashboard-battery-stats"><div><span>Füllstand</span><strong>${batteryPercent.toLocaleString('de-DE',{maximumFractionDigits:1})} %</strong></div><div><span>Speicher</span><strong>${batteryOverview.count} · ${batteryOverview.planets.length} Planeten</strong></div><div><span>Max. Laden</span><strong>${formatElectricPower(batteryOverview.maxCharge)}</strong></div><div><span>Max. Entladen</span><strong>${formatElectricPower(batteryOverview.maxDischarge)}</strong></div></div>${batteryOverview.count ? `<small>Standorte: ${batteryOverview.planets.join(', ')}</small>` : '<small>Noch keine Batteriespeicher gebaut.</small>'}</div>`;
  const forestPlanets = Object.keys(bodies).filter(id => id !== 'sun' && Number(bodies[id].resources?.trees || 0) > 0);
  const forestNumber = value => Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 4 });
  const forestRows = forestPlanets.map(id => {
    const treeStock = Math.max(0, Number(bodies[id].resources.trees) || 0);
    const naturalPerHour = treeStock / 1000;
    const temperature = planetTemperatureCelsius(id);
    const canRegenerate = Number.isFinite(temperature) && temperature >= -20 && temperature <= 50;
    const atmosphere = ensurePlanetAtmosphere(id);
    const pressure = atmosphere && PLANET_ATMOSPHERE_PHYSICS[id]
      ? atmosphericPressureFromMass(id, Number(atmosphere.totalGas) || 0) : 0;
    const pressureBonus = canRegenerate ? Math.min(1, Math.max(0, pressure)) : 0;
    const foresterBonus = canRegenerate ? poweredForestersOnPlanet(id) * 0.005 : 0;
    const pressurePerHour = naturalPerHour * pressureBonus;
    const foresterPerHour = naturalPerHour * (1 + pressureBonus) * foresterBonus;
    const totalPerHour = canRegenerate ? naturalPerHour * (1 + pressureBonus) * (1 + foresterBonus) : 0;
    const totalBonusPercent = ((1 + pressureBonus) * (1 + foresterBonus) - 1) * 100;
    const status = canRegenerate ? '' : '<small class="forest-note">Außerhalb des Temperaturbereichs (-20 bis +50 °C): derzeit keine Regeneration</small>';
    return `<article class="forest-planet-card"><div class="forest-planet-head"><strong>🌳 ${bodies[id].name}</strong><span>${forestNumber(treeStock)} t Bäume</span></div><div class="stat"><span>Natürliche Regeneration</span><strong>${forestNumber(canRegenerate ? naturalPerHour : 0)} t/h</strong></div><div class="stat"><span>Atmosphärenbonus (${(pressureBonus * 100).toLocaleString('de-DE',{maximumFractionDigits:1})} %)</span><strong>+${forestNumber(pressurePerHour)} t/h</strong></div><div class="stat"><span>Försterbonus (${(foresterBonus * 100).toLocaleString('de-DE',{maximumFractionDigits:1})} %)</span><strong>+${forestNumber(foresterPerHour)} t/h</strong></div><div class="stat forest-total"><span>Gesamtregeneration</span><strong>${forestNumber(totalPerHour)} t/h</strong></div><div class="forest-bonus-total">Verbesserung gegenüber der natürlichen Regeneration: +${totalBonusPercent.toLocaleString('de-DE',{maximumFractionDigits:2})} %</div>${status}</article>`;
  }).join('');
  const forestOverview = `<details class="economy-section forest-overview"><summary>🌳 Forstübersicht <span>${forestPlanets.length} Planeten mit Waldbestand</span></summary><div class="economy-section-content">${forestRows || '<p class="hint">Aktuell hat kein Planet einen Waldbestand.</p>'}</div></details>`;

  const energyPlanetOrder = ['earth', 'luna', 'mercury', 'venus', 'mars', 'ceres', 'jupiter', 'io', 'saturn', 'uranus', 'neptune', 'pluto', 'nivaris'];
  const energyPlanetIds = energyPlanetOrder.filter(id => bodies[id] && id !== 'sun');
  Object.keys(bodies).forEach(id => { if (id !== 'sun' && !energyPlanetIds.includes(id)) energyPlanetIds.push(id); });
  const energyPlanetCards = energyPlanetIds.map(id => {
    const production = electricityProduction(id);
    const consumption = electricityConsumption(id);
    const balance = production - consumption;
    const batteryCount = Math.max(0, Number(getBuildingsOnPlanet(id).batteryStorage) || 0);
    const batteryData = ensureBatteryStorageData(id);
    const capacity = batteryCount * 100;
    const stored = Math.min(capacity, Math.max(0, Number(batteryData.chargeMWh) || 0));
    const percent = capacity ? stored / capacity * 100 : 0;
    const statusClass = balance < 0 ? 'bad' : 'good';
    const statusText = balance < 0 ? 'Strommangel' : balance === 0 ? 'Ausgeglichen' : 'Überschuss';
    return `<details class="energy-planet-card">
      <summary class="energy-planet-card-summary">
        <span class="energy-planet-card-title"><strong>${bodies[id]?.name || id}</strong><small class="${statusClass}">${statusText}</small></span>
        <span class="energy-planet-summary-values"><span>Erzeugung <strong class="good">${formatElectricPower(production)}</strong></span><span>Verbrauch <strong>${formatElectricPower(consumption)}</strong></span><span>Bilanz <strong class="${statusClass}">${balance > 0 ? '+' : ''}${formatElectricPower(balance)}</strong></span></span>
        <span class="energy-planet-chevron" aria-hidden="true">⌄</span>
      </summary>
      <div class="energy-planet-card-content">
        <div class="energy-planet-kpis">
          <div><span>Produktion</span><strong class="good">${formatElectricPower(production)}</strong></div>
          <div><span>Verbrauch</span><strong>${formatElectricPower(consumption)}</strong></div>
          <div><span>Bilanz</span><strong class="${statusClass}">${balance > 0 ? '+' : ''}${formatElectricPower(balance)}</strong></div>
        </div>
        <div class="energy-storage-block">
          <div class="energy-storage-head"><strong>🔋 Batteriespeicher</strong><span>${stored.toLocaleString('de-DE',{maximumFractionDigits:2})} / ${capacity.toLocaleString('de-DE')} MWh</span></div>
          <div class="dashboard-battery-track"><i style="width:${percent}%"></i></div>
          <div class="energy-storage-meta"><span>${percent.toLocaleString('de-DE',{maximumFractionDigits:1})} % geladen</span><span>${batteryCount} Speicher · ${formatElectricPower(batteryCount * 10)} Lade-/Entladeleistung</span></div>
          ${batteryCount ? '' : '<small class="hint">Noch kein Batteriespeicher auf diesem Planeten.</small>'}
        </div>
        ${renderElectricityPanel(id)}
      </div>
    </details>`;
  }).join('');
  const totalEnergyProduction = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + electricityProduction(id), 0);
  const totalEnergyConsumption = Object.keys(bodies).filter(id => id !== 'sun').reduce((sum,id) => sum + electricityConsumption(id), 0);
  const totalEnergyBalance = totalEnergyProduction - totalEnergyConsumption;
  const totalEnergyClass = totalEnergyBalance < 0 ? 'bad' : 'good';
  panel.innerHTML = `
    <div class="economy-tabs" role="tablist" aria-label="Wirtschafts-Dashboard">
      <button type="button" class="economy-tab active" data-economy-tab="overview" role="tab" aria-selected="true">📊 Übersicht</button>
      <button type="button" class="economy-tab" data-economy-tab="energy" role="tab" aria-selected="false">⚡ Energie</button>
    </div>
    <section class="economy-tab-panel" data-economy-panel="overview">
      <div class="economy-quick-overview">
        <div class="economy-quick-card"><span>Gebäude im Sonnensystem</span><strong>${total}</strong></div>
        <div class="economy-quick-card"><span>💵 GünniDollar</span><strong>${formatGunniDollar(gunniDollarBalance)}</strong><small>${gunniDollarIncome.toLocaleString('de-DE', { maximumFractionDigits: 2 })} GünniDollar/s Einnahmen</small></div>
      </div>
      <details class="economy-section"><summary>📦 Rohstoffe & Lager <span>Bestände aller Rohstoffe</span></summary><div class="economy-section-content">${stockRows}</div></details>
      <details class="economy-section"><summary>🏭 Produktion & Verbrauch <span>Förderung und Materialflüsse</span></summary><div class="economy-section-content">${productionRows}</div></details>
      <details class="economy-section"><summary>💎 Luxusgüter <span>Fahrzeuge im Oberflächen- und Orbitlager</span></summary><div class="economy-section-content">${luxuryRows}</div></details>
      <details class="economy-section"><summary>🏢 Gebäude im Sonnensystem <span>${total} Gebäude</span></summary><div class="economy-section-content">${buildingRows}</div></details>
      <details class="economy-section"><summary>🚀 Raketen & Transport <span>Transportübersicht</span></summary><div class="economy-section-content"><p class="hint">Öffne die Raketen- und Orbitansicht für Flüge, Fracht und Raketenbestände.</p></div></details>
      ${forestOverview}
    </section>
    <section class="economy-tab-panel" data-economy-panel="energy" hidden>
      <div class="energy-system-overview">
        <div class="energy-system-heading"><div><strong>⚡ Energieversorgung des Sonnensystems</strong><small>Jeder Planet besitzt ein eigenes Stromnetz.</small></div><span class="${totalEnergyClass}">${totalEnergyBalance > 0 ? '+' : ''}${formatElectricPower(totalEnergyBalance)}</span></div>
        <div class="energy-system-kpis">
          <div><span>Gesamtproduktion</span><strong class="good">${formatElectricPower(totalEnergyProduction)}</strong></div>
          <div><span>Gesamtverbrauch</span><strong>${formatElectricPower(totalEnergyConsumption)}</strong></div>
          <div><span>Gesamtbilanz</span><strong class="${totalEnergyClass}">${totalEnergyBalance > 0 ? '+' : ''}${formatElectricPower(totalEnergyBalance)}</strong></div>
        </div>
        <small>Die Gesamtwerte dienen nur der Übersicht. Überschüsse werden nicht zwischen Planeten übertragen.</small>
      </div>
      <div class="energy-planet-list">${energyPlanetCards}</div>
    </section>`;
  panel.querySelectorAll('[data-economy-tab]').forEach(button => {
    button.addEventListener('click', () => {
      const selectedTab = button.dataset.economyTab;
      panel.querySelectorAll('[data-economy-tab]').forEach(tab => {
        const active = tab.dataset.economyTab === selectedTab;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panel.querySelectorAll('[data-economy-panel]').forEach(tabPanel => {
        tabPanel.hidden = tabPanel.dataset.economyPanel !== selectedTab;
      });
    });
  });

}

