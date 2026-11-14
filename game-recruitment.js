// ==========================================
// PERSONALBESCHAFFUNG – planetare Stellenausschreibungen
// ==========================================
(function () {
  'use strict';

  const COST_PER_COLONIST = 1000;
  const RECRUITS_PER_INGAME_MINUTE = 5;
  const MAX_DURATION_MS = 2 * 24 * 60 * 60 * 1000;
  const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;

  function ensureRecruitmentState() {
    if (!state.recruitment || typeof state.recruitment !== 'object') state.recruitment = { planets: {} };
    if (!state.recruitment.planets || typeof state.recruitment.planets !== 'object') state.recruitment.planets = {};
    return state.recruitment;
  }

  function ensurePlanetRecruitment(planetId) {
    const data = ensureRecruitmentState();
    if (!data.planets[planetId] || typeof data.planets[planetId] !== 'object') {
      data.planets[planetId] = { active: null, cooldownUntil: 0, lastResult: null };
    }
    const entry = data.planets[planetId];
    if (!Number.isFinite(Number(entry.cooldownUntil))) entry.cooldownUntil = 0;
    if (entry.active && typeof entry.active !== 'object') entry.active = null;
    return entry;
  }

  function finishRecruitment(planetId, entry, finishedAt, reason) {
    const active = entry.active;
    if (!active) return;
    entry.lastResult = {
      target: Math.max(0, Math.floor(Number(active.target) || 0)),
      hired: Math.max(0, Math.floor(Number(active.hired) || 0)),
      reason,
      finishedAt
    };
    entry.active = null;
    entry.cooldownUntil = finishedAt + COOLDOWN_MS;
  }

  function process(planetId, delta, now) {
    if (!planetId || planetId === 'sun' || !bodies[planetId] || !(delta > 0)) return;
    const entry = ensurePlanetRecruitment(planetId);
    const active = entry.active;
    if (!active) return;

    const currentNow = Number.isFinite(Number(now)) ? Number(now) : gameNow();
    const startedAt = Number.isFinite(Number(active.startedAt)) ? Math.max(0, Number(active.startedAt)) : currentNow;
    const endsAt = Math.max(startedAt, Number(active.endsAt) || (startedAt + MAX_DURATION_MS));
    const tickStart = currentNow - delta * 1000;
    const activeStart = Math.max(tickStart, startedAt);
    const activeDelta = Math.max(0, Math.min(delta, (endsAt - activeStart) / 1000));
    const target = Math.max(0, Math.floor(Number(active.target) || 0));
    active.hired = Math.max(0, Math.floor(Number(active.hired) || 0));
    active.progressAccumulator = Math.max(0, Number(active.progressAccumulator) || 0);

    // Nur bei vorhandener freier Bevölkerung und freiem Wohnraum läuft die Bewerberrate.
    const availablePopulation = Math.max(0, Math.floor(Number(freePopulationOnPlanet(planetId)) || 0));
    const availableHousing = Math.max(0, Math.floor(Number(housingFree(planetId)) || 0));
    if (availablePopulation > 0 && availableHousing > 0 && activeDelta > 0 && active.hired < target) {
      active.progressAccumulator += activeDelta * RECRUITS_PER_INGAME_MINUTE / 60;
      const scheduled = Math.floor(active.progressAccumulator);
      const due = Math.min(
        scheduled,
        target - active.hired,
        availablePopulation,
        availableHousing
      );
      if (due > 0) {
        const added = Math.max(0, Math.floor(Number(addColonistsFromShuttle(planetId, due)) || 0));
        if (added > 0) {
          const population = ensureFreePopulationData(planetId);
          population.freePopulation = Math.max(0, Number(population.freePopulation || 0) - added);
          active.hired += added;
          if (typeof globalThis.SolarFrontierWorkforce?.syncColonistPopulation === 'function') {
            globalThis.SolarFrontierWorkforce.syncColonistPopulation(planetId, bodies[planetId]);
          }
        }
      }
      // Ganze Einstellungsgelegenheiten, die wegen fehlender freier Bevölkerung
      // oder Wohnplätze nicht genutzt werden konnten, verfallen; es entsteht
      // kein späterer Einstellungs-Burst. Der Bruchteil bleibt erhalten.
      if (scheduled > 0) active.progressAccumulator = Math.max(0, active.progressAccumulator - scheduled);
    }

    if (active.hired >= target && target > 0) {
      finishRecruitment(planetId, entry, currentNow, 'Ziel erreicht');
      saveGame(false);
      if (typeof renderRecruitmentPanel === 'function') renderRecruitmentPanel();
      return;
    }
    if (currentNow >= endsAt) {
      finishRecruitment(planetId, entry, endsAt, 'Laufzeit abgelaufen');
      saveGame(false);
      if (typeof renderRecruitmentPanel === 'function') renderRecruitmentPanel();
    }
  }

  function publish(planetId, targetValue) {
    const target = Math.floor(Number(targetValue) || 0);
    if (!bodies[planetId] || planetId === 'sun' || !FREE_POPULATION_PLANETS.has(planetId)) {
      alert('Für diesen Himmelskörper kann keine Ausschreibung veröffentlicht werden.');
      return false;
    }
    if (target < 1 || target > 1000000) {
      alert('Bitte eine Anzahl zwischen 1 und 1.000.000 Kolonisten eingeben.');
      return false;
    }
    const entry = ensurePlanetRecruitment(planetId);
    const now = gameNow();
    if (entry.active) {
      alert('Auf diesem Planeten läuft bereits eine Ausschreibung.');
      return false;
    }
    if (now < Number(entry.cooldownUntil || 0)) {
      alert(`Neue Ausschreibungen sind noch ${formatRecruitmentDuration(entry.cooldownUntil - now)} gesperrt.`);
      return false;
    }
    if (freePopulationOnPlanet(planetId) < 1) {
      alert('Auf diesem Planeten gibt es keine freie Bevölkerung. Erzeuge zuerst freie Bevölkerung, bevor du eine Ausschreibung veröffentlichst.');
      return false;
    }
    const cost = target * COST_PER_COLONIST;
    if (Number(state.gunniDollar || 0) < cost) {
      alert(`Nicht genügend GünniDollar. Benötigt werden ${cost.toLocaleString('de-DE')} GD.`);
      return false;
    }

    state.gunniDollar = Math.max(0, Number(state.gunniDollar || 0) - cost);
    recordCompanyFinance('expense', cost, `Stellenausschreibung: ${target.toLocaleString('de-DE')} Kolonisten auf ${bodies[planetId].name}`);
    entry.active = {
      target,
      hired: 0,
      startedAt: now,
      endsAt: now + MAX_DURATION_MS,
      progressAccumulator: 0
    };
    entry.lastResult = null;
    saveGame(false);
    renderRecruitmentPanel();
    renderTopResources();
    return true;
  }

  function formatRecruitmentDuration(milliseconds) {
    const seconds = Math.max(0, Math.ceil(Number(milliseconds || 0) / 1000));
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days) return `${days} Ingame-Tage ${hours} Std.`;
    if (hours) return `${hours} Std. ${minutes} Min.`;
    return `${minutes} Min.`;
  }

  function renderRecruitmentPanel() {
    if (typeof document === 'undefined') return;
    const root = document.querySelector('#hq-recruitment-content');
    if (!root || typeof bodies === 'undefined') return;
    const focusedControl = root.contains(document.activeElement) && document.activeElement.matches('[data-recruitment-planet], [data-recruitment-target]');
    if (focusedControl) return;
    const previousPlanet = root.querySelector('[data-recruitment-planet]')?.value || 'earth';
    const previousTarget = root.querySelector('[data-recruitment-target]')?.value ?? '100';
    const planetIds = [...FREE_POPULATION_PLANETS].filter(id => bodies[id]).sort((a, b) => {
      const priority = id => id === 'earth' ? 0 : id === 'luna' ? 1 : 2;
      return priority(a) - priority(b) || String(bodies[a]?.name || a).localeCompare(String(bodies[b]?.name || b), 'de');
    });
    const options = planetIds.map(id => `<option value="${id}" ${id === previousPlanet ? 'selected' : ''}>${String(bodies[id].name || id)} · ${freePopulationOnPlanet(id).toLocaleString('de-DE')} frei</option>`).join('');
    const details = planetIds.map(id => {
      const entry = ensurePlanetRecruitment(id);
      const active = entry.active;
      const remaining = active ? Math.max(0, Number(active.target) - Number(active.hired)) : 0;
      const percent = active && active.target ? Math.min(100, Number(active.hired) / Number(active.target) * 100) : 0;
      const cooldown = Math.max(0, Number(entry.cooldownUntil || 0) - gameNow());
      const housing = Math.max(0, Number(housingFree(id)) || 0);
      const population = freePopulationOnPlanet(id);
      let status = '<span class="recruitment-status">Keine aktive Ausschreibung</span>';
      if (active) status = `<span class="recruitment-status active">Läuft · noch ${remaining.toLocaleString('de-DE')} gesucht</span><div class="recruitment-progress"><i style="width:${percent}%"></i></div><small>${Number(active.hired).toLocaleString('de-DE')} / ${Number(active.target).toLocaleString('de-DE')} eingestellt · Restlaufzeit ${formatRecruitmentDuration(Number(active.endsAt) - gameNow())}</small><small>Freie Bevölkerung: ${population.toLocaleString('de-DE')} · Freier Wohnraum: ${housing.toLocaleString('de-DE')}</small>`;
      else if (cooldown > 0) status = `<span class="recruitment-status locked">Sperrzeit · ${formatRecruitmentDuration(cooldown)}</span>`;
      else if (entry.lastResult) status = `<span class="recruitment-status">Letzte Ausschreibung: ${Number(entry.lastResult.hired || 0).toLocaleString('de-DE')} / ${Number(entry.lastResult.target || 0).toLocaleString('de-DE')} · ${String(entry.lastResult.reason || '')}</span>`;
      return `<article class="recruitment-planet-card"><div class="recruitment-planet-head"><strong>${String(bodies[id].name || id)}</strong><span>${population.toLocaleString('de-DE')} freie Bevölkerung</span></div>${status}</article>`;
    }).join('');

    root.innerHTML = `<section class="recruitment-section"><div class="recruitment-title"><h3>📋 Stellenausschreibungen</h3><small>Personalbeschaffung · nur für die Unternehmenskolonien</small></div>
      <div class="recruitment-form"><label for="recruitment-planet">Planet</label><select id="recruitment-planet" data-recruitment-planet>${options}</select>
      <label for="recruitment-target">Gewünschte Kolonisten</label><input id="recruitment-target" data-recruitment-target type="number" min="1" max="1000000" step="1" value="${String(previousTarget).replace(/[^0-9]/g, '')}">
      <div class="recruitment-cost"><span>Einmalige Veröffentlichungsgebühr</span><strong data-recruitment-cost>100.000 GD</strong></div>
      <small>1.000 GD pro gewünschtem Kolonisten · bis zu 2 Ingame-Tage Laufzeit · 5 Einstellungen pro Ingame-Spielminute · keine Gehaltskosten</small>
      <button type="button" class="small-button" data-recruitment-submit>📢 Ausschreibung veröffentlichen</button></div>
      <div class="recruitment-planet-list">${details}</div></section>`;

    const targetInput = root.querySelector('[data-recruitment-target]');
    const costLabel = root.querySelector('[data-recruitment-cost]');
    const updateCost = () => {
      const amount = Math.max(0, Math.floor(Number(targetInput?.value) || 0));
      if (costLabel) costLabel.textContent = `${(amount * COST_PER_COLONIST).toLocaleString('de-DE')} GD`;
    };
    targetInput?.addEventListener('input', updateCost);
    root.querySelector('[data-recruitment-submit]')?.addEventListener('click', () => {
      publish(root.querySelector('[data-recruitment-planet]')?.value, targetInput?.value);
    });
    updateCost();
  }

  globalThis.SolarFrontierRecruitment = { process, publish, renderPanel: renderRecruitmentPanel };
  globalThis.renderRecruitmentPanel = renderRecruitmentPanel;
})();
