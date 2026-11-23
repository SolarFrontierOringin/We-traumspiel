/* Solar Frontier: Origins – Supabase Cloud / Phase 3
 * Authentifizierung, Geräteverwaltung und Cloud-Upload aktiver Spielstände.
 * Lokale Spielstände bleiben immer erhalten; Cloud-Saves werden je Slot getrennt.
 */
(function (global) {
  'use strict';

  const CONFIG = Object.freeze({
    url: 'https://efgoiyuvfwtlyiccvrdh.supabase.co',
    publishableKey: 'sb_publishable_tljfyGmDKeMw116j4eXPcQ_NiM1RzCi'
  });
  const DEVICE_STORAGE_KEY = 'sfo_cloud_device_id_v1';
  let client = null;
  let authSubscription = null;
  let registeredUserId = null;
  let autoSyncTimer = null;
  let syncInProgress = false;
  const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000;

  function getClient() {
    if (client) return client;
    if (!global.supabase || typeof global.supabase.createClient !== 'function') {
      throw new Error('Supabase-Bibliothek wurde nicht geladen.');
    }
    client = global.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: global.localStorage }
    });
    return client;
  }

  function getDeviceId() {
    let id = global.localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!id) {
      id = global.crypto && typeof global.crypto.randomUUID === 'function'
        ? global.crypto.randomUUID()
        : 'sfo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      global.localStorage.setItem(DEVICE_STORAGE_KEY, id);
    }
    return id;
  }

  function getDeviceName() {
    const ua = global.navigator.userAgent || '';
    if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android-Smartphone' : 'Android-Tablet';
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Windows/i.test(ua)) return 'Windows-PC';
    if (/Macintosh|Mac OS/i.test(ua)) return 'Mac';
    if (/Linux/i.test(ua)) return 'Linux-Gerät';
    return 'Unbekanntes Gerät';
  }

  async function registerDevice() {
    const sb = getClient();
    const { data: userData, error: userError } = await sb.auth.getUser();
    if (userError) throw userError;
    const user = userData.user;
    if (!user) throw new Error('Bitte zuerst anmelden.');

    const device = {
      user_id: user.id,
      device_id: getDeviceId(),
      device_name: getDeviceName(),
      last_seen_at: new Date().toISOString()
    };
    const { error } = await sb.from('game_devices').upsert(device, { onConflict: 'user_id,device_id' });
    if (error) {
      if (/Maximum of 3 devices reached/i.test(error.message || '')) {
        throw new Error('Dein Konto ist bereits auf drei Geräten registriert. Entferne zuerst ein altes Gerät.');
      }
      throw error;
    }
    registeredUserId = user.id;
    return device;
  }

  async function listDevices() {
    const sb = getClient();
    const { data, error } = await sb.from('game_devices')
      .select('id, device_id, device_name, created_at, last_seen_at')
      .order('last_seen_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  async function removeDevice(rowId) {
    if (!rowId) throw new Error('Geräte-ID fehlt.');
    const { error } = await getClient().from('game_devices').delete().eq('id', rowId);
    if (error) throw error;
    if (registeredUserId) {
      const currentId = getDeviceId();
      const remaining = await listDevices();
      if (!remaining.some(item => item.device_id === currentId)) registeredUserId = null;
    }
    return true;
  }

  async function initialize() {
    const sb = getClient();
    const result = await sb.auth.getSession();
    if (result.error) throw result.error;
    if (!authSubscription) {
      const listener = sb.auth.onAuthStateChange((event, session) => {
        global.dispatchEvent(new CustomEvent('sfo:cloud-auth', {
          detail: { event, user: session ? session.user : null }
        }));
        if (session && session.user) {
          // Nicht im Auth-Callback auf Supabase warten: verhindert Auth-Lock-Deadlocks.
          Promise.resolve().then(() => registerDevice()).then(() => {
            startAutoSync();
            updateSyncUi();
            return refreshDevicePanel();
          }).catch(error => { setStatus(error.message, true); });
        } else {
          registeredUserId = null;
          stopAutoSync();
          updateSyncUi();
          refreshDevicePanel();
        }
      });
      authSubscription = listener.data.subscription;
    }
    if (result.data.session && result.data.session.user) {
      await registerDevice();
      startAutoSync();
    } else {
      stopAutoSync();
    }
    updateSyncUi();
    return { ready: true, user: result.data.session ? result.data.session.user : null };
  }

  async function signUp(email, password) {
    if (!email || !password) throw new Error('E-Mail und Passwort sind erforderlich.');
    const { data, error } = await getClient().auth.signUp({ email: String(email).trim(), password: String(password) });
    if (error) throw error;
    return data;
  }
  async function signInWithPassword(email, password) {
    if (!email || !password) throw new Error('E-Mail und Passwort sind erforderlich.');
    const { data, error } = await getClient().auth.signInWithPassword({ email: String(email).trim(), password: String(password) });
    if (error) throw error;
    return data;
  }
  async function signInWithGoogle() {
    const { data, error } = await getClient().auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: global.location.href.split('#')[0] }
    });
    if (error) throw error;
    return data;
  }
  async function signOut() {
    const { error } = await getClient().auth.signOut();
    if (error) throw error;
  }
  async function getCurrentUser() {
    const { data, error } = await getClient().auth.getUser();
    if (error) throw error;
    return data.user || null;
  }

  function getActiveSlot() {
    return (typeof activeSaveSlot !== 'undefined' && Number(activeSaveSlot) === 2) ? 2 : 1;
  }

  function updateSyncUi() {
    const button = document.getElementById('cloud-upload-now');
    const restoreButton = document.getElementById('cloud-restore-now');
    const slotLabel = document.getElementById('cloud-active-slot');
    if (slotLabel) slotLabel.textContent = String(getActiveSlot());
    if (button) button.disabled = !registeredUserId || syncInProgress;
    if (restoreButton) restoreButton.disabled = !registeredUserId || syncInProgress;
    const last = document.getElementById('cloud-last-sync');
    if (last) {
      const slot = getActiveSlot();
      const raw = global.localStorage.getItem('sfo_cloud_last_upload_slot' + slot);
      if (raw) {
        try {
          const info = JSON.parse(raw);
          last.textContent = 'Zuletzt hochgeladen: ' + new Date(info.at).toLocaleString('de-DE');
        } catch (_) { last.textContent = 'Cloud-Sicherung vorhanden'; }
      } else {
        last.textContent = 'Dieser Speicherplatz wurde noch nicht hochgeladen';
      }
    }
  }

  async function uploadActiveSave(source = 'manual') {
    if (syncInProgress) return false;
    const user = await getCurrentUser();
    if (!user) throw new Error('Bitte zuerst bei deinem Cloud-Konto anmelden.');
    if (typeof saveGame !== 'function' || typeof getSaveSlotKeys !== 'function') {
      throw new Error('Die lokale Speicherverwaltung ist noch nicht bereit.');
    }
    syncInProgress = true;
    updateSyncUi();
    const button = document.getElementById('cloud-upload-now');
    const oldLabel = button ? button.textContent : '';
    if (button) button.textContent = 'Speichere in der Cloud …';
    try {
      // Erst den aktuellen Spielzustand lokal sichern. Die lokale Datei bleibt führend erhalten.
      if (saveGame(false) === false) throw new Error('Der lokale Spielstand konnte nicht gesichert werden.');
      const slot = getActiveSlot();
      const keys = getSaveSlotKeys(slot);
      const raw = global.localStorage.getItem(keys.save);
      if (!raw) throw new Error('Für Speicherplatz ' + slot + ' ist noch kein Spielstand vorhanden.');
      const saveData = JSON.parse(raw);
      if (!saveData || typeof saveData !== 'object' || !saveData.state || !saveData.bodies) {
        throw new Error('Der lokale Spielstand ist unvollständig und wurde nicht hochgeladen.');
      }
      const { data, error } = await getClient().rpc('sfo_save_game_slot', {
        p_save_slot: slot,
        p_save_data: saveData,
        p_app_version: String(saveData.appVersion || '1.0.4'),
        p_schema_version: Number(saveData.schemaVersion || saveData.version || 1),
        p_device_id: getDeviceId()
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const savedAt = row && row.saved_at ? row.saved_at : new Date().toISOString();
      global.localStorage.setItem('sfo_cloud_last_upload_slot' + slot, JSON.stringify({ at: savedAt, revision: row && row.revision || null }));
      setStatus('Spielstand ' + slot + ' wurde erfolgreich in der Cloud gespeichert' + (row && row.revision ? ' (Version ' + row.revision + ').' : '.'), false);
      updateSyncUi();
      return true;
    } catch (error) {
      setStatus(error.message || 'Cloud-Speicherung fehlgeschlagen. Dein lokaler Spielstand bleibt erhalten.', true);
      throw error;
    } finally {
      syncInProgress = false;
      if (button) button.textContent = oldLabel || '☁️ Jetzt in Cloud speichern';
      updateSyncUi();
    }
  }

  async function restoreActiveSave() {
    if (syncInProgress) return false;
    const user = await getCurrentUser();
    if (!user) throw new Error('Bitte zuerst bei deinem Cloud-Konto anmelden.');

    const slot = getActiveSlot();
    const keys = getSaveSlotKeys(slot);
    const sb = getClient();
    syncInProgress = true;
    updateSyncUi();
    const button = document.getElementById('cloud-restore-now');
    const oldLabel = button ? button.textContent : '';
    if (button) button.textContent = 'Lade Cloud-Spielstand …';

    try {
      const { data: cloudSave, error } = await sb
        .from('game_saves')
        .select('save_data, app_version, schema_version, revision, saved_at')
        .eq('user_id', user.id)
        .eq('save_slot', slot)
        .maybeSingle();
      if (error) throw error;
      if (!cloudSave) throw new Error('Für Speicherplatz ' + slot + ' ist noch kein Cloud-Spielstand vorhanden.');

      const remote = cloudSave.save_data;
      if (!remote || typeof remote !== 'object' || Array.isArray(remote) ||
          !remote.state || typeof remote.state !== 'object' ||
          !remote.bodies || typeof remote.bodies !== 'object') {
        throw new Error('Der Cloud-Spielstand ist unvollständig. Dein lokaler Spielstand wurde nicht verändert.');
      }
      const remoteSchema = Number(cloudSave.schema_version || remote.schemaVersion || remote.version || 1);
      if (typeof SFO_SAVE_SCHEMA_VERSION !== 'undefined' && remoteSchema > SFO_SAVE_SCHEMA_VERSION) {
        throw new Error('Der Cloud-Spielstand benötigt eine neuere Spielversion. Bitte aktualisiere Solar Frontier zuerst.');
      }

      const currentRaw = global.localStorage.getItem(keys.save);
      const backupRaw = global.localStorage.getItem(keys.backup);
      if (currentRaw) {
        // Vor dem Ersetzen den bisherigen lokalen Spielstand als Wiederherstellungs-Backup sichern.
        if (backupRaw) {
          global.localStorage.setItem(keys.backup + '_before_cloud_restore', backupRaw);
        }
        global.localStorage.setItem(keys.backup, currentRaw);
      }

      // Cloud-Daten werden erst nach vollständiger Validierung in den aktiven lokalen Slot geschrieben.
      global.localStorage.setItem(keys.save, JSON.stringify(remote));
      global.localStorage.setItem('sfo_cloud_last_restore_slot' + slot, JSON.stringify({
        at: cloudSave.saved_at || new Date().toISOString(),
        revision: cloudSave.revision || null
      }));
      setStatus('Cloud-Spielstand ' + slot + ' (Version ' + (cloudSave.revision || '?') + ') wurde geladen. Das Spiel wird neu gestartet.', false);
      // Verhindert, dass pagehide/beforeunload den alten In-Memory-Spielstand
      // beim Neuladen über die soeben wiederhergestellten Cloud-Daten schreibt.
      global.SFOCloudRestoreInProgress = true;
      stopAutoSync();
      global.location.reload();
      return true;
    } catch (error) {
      setStatus(error.message || 'Cloud-Spielstand konnte nicht geladen werden. Dein lokaler Spielstand bleibt erhalten.', true);
      throw error;
    } finally {
      syncInProgress = false;
      if (button) button.textContent = oldLabel || '☁️ Cloud-Spielstand wiederherstellen';
      updateSyncUi();
    }
  }

  function startAutoSync() {
    if (autoSyncTimer) global.clearInterval(autoSyncTimer);
    autoSyncTimer = global.setInterval(() => {
      if (!registeredUserId || syncInProgress || global.document.hidden) return;
      uploadActiveSave('automatic').catch(error => {
        console.warn('Automatische Cloud-Sicherung fehlgeschlagen:', error);
      });
    }, AUTO_SYNC_INTERVAL_MS);
  }

  function stopAutoSync() {
    if (autoSyncTimer) global.clearInterval(autoSyncTimer);
    autoSyncTimer = null;
  }

  function setStatus(message, isError) {
    const el = document.getElementById('cloud-status');
    if (el) {
      el.textContent = message || '';
      el.classList.toggle('is-error', !!isError);
    }
  }

  async function refreshDevicePanel() {
    const list = document.getElementById('cloud-device-list');
    const account = document.getElementById('cloud-account-status');
    if (!list) return;
    try {
      const user = await getCurrentUser();
      if (!user) {
        if (account) account.textContent = 'Nicht angemeldet';
        list.innerHTML = '<p class="hint">Melde dich an, um deine registrierten Geräte zu sehen.</p>';
        return;
      }
      if (account) account.textContent = 'Angemeldet: ' + (user.email || 'Google-Konto');
      const devices = await listDevices();
      list.replaceChildren();
      if (!devices.length) {
        list.innerHTML = '<p class="hint">Noch keine Geräte registriert.</p>';
        return;
      }
      devices.forEach(device => {
        const row = document.createElement('div');
        row.className = 'cloud-device-row';
        const details = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = device.device_name || 'Unbekanntes Gerät';
        const meta = document.createElement('small');
        meta.textContent = 'Zuletzt aktiv: ' + (device.last_seen_at ? new Date(device.last_seen_at).toLocaleString('de-DE') : 'unbekannt');
        details.append(name, meta);
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'small-button danger';
        remove.textContent = 'Entfernen';
        remove.addEventListener('click', async () => {
          if (!global.confirm('Dieses Gerät aus deinem Konto entfernen? Der Cloud-Spielstand wird nicht gelöscht.')) return;
          remove.disabled = true;
          try {
            await removeDevice(device.id);
            setStatus('Gerät wurde entfernt. Der Cloud-Spielstand bleibt erhalten.', false);
            await refreshDevicePanel();
          } catch (error) {
            setStatus(error.message || 'Gerät konnte nicht entfernt werden.', true);
            remove.disabled = false;
          }
        });
        row.append(details, remove);
        list.append(row);
      });
    } catch (error) {
      setStatus(error.message || 'Geräte konnten nicht geladen werden.', true);
    }
  }

  function bindAuthUi() {
    const form = document.getElementById('cloud-auth-form');
    const google = document.getElementById('cloud-google-login');
    const logout = document.getElementById('cloud-logout');
    const upload = document.getElementById('cloud-upload-now');
    const restore = document.getElementById('cloud-restore-now');
    if (restore) restore.addEventListener('click', async () => {
      const slot = getActiveSlot();
      if (!global.confirm('Cloud-Spielstand ' + slot + ' herunterladen und den lokalen Spielstand dieses Speicherplatzes ersetzen? Der bisherige lokale Stand wird als Backup gesichert.')) return;
      try { await restoreActiveSave(); }
      catch (error) { console.warn('Cloud-Wiederherstellung fehlgeschlagen:', error); }
    });
    if (upload) upload.addEventListener('click', async () => {
      try { await uploadActiveSave('manual'); }
      catch (error) { console.warn('Manueller Cloud-Upload fehlgeschlagen:', error); }
    });
    if (form) form.addEventListener('submit', async event => {
      event.preventDefault();
      const email = document.getElementById('cloud-email')?.value;
      const password = document.getElementById('cloud-password')?.value;
      const mode = document.querySelector('input[name="cloud-auth-mode"]:checked')?.value || 'login';
      try {
        setStatus('Anmeldung wird verarbeitet …', false);
        if (mode === 'register') {
          const result = await signUp(email, password);
          setStatus(result.session ? 'Konto erstellt und angemeldet.' : 'Konto erstellt. Bitte bestätige deine E-Mail-Adresse.', false);
        } else {
          await signInWithPassword(email, password);
          setStatus('Erfolgreich angemeldet.', false);
        }
        await refreshDevicePanel();
      } catch (error) { setStatus(error.message || 'Anmeldung fehlgeschlagen.', true); }
    });
    if (google) google.addEventListener('click', async () => {
      try { setStatus('Google-Anmeldung wird geöffnet …', false); await signInWithGoogle(); }
      catch (error) { setStatus(error.message || 'Google-Anmeldung fehlgeschlagen.', true); }
    });
    if (logout) logout.addEventListener('click', async () => {
      try { await signOut(); registeredUserId = null; stopAutoSync(); updateSyncUi(); setStatus('Abgemeldet. Dein lokaler Spielstand bleibt erhalten.', false); await refreshDevicePanel(); }
      catch (error) { setStatus(error.message || 'Abmeldung fehlgeschlagen.', true); }
    });
    refreshDevicePanel();
    updateSyncUi();
  }

  global.SFOCloud = Object.freeze({
    initialize, signUp, signInWithPassword, signInWithGoogle, signOut, getCurrentUser,
    registerDevice, listDevices, removeDevice, refreshDevicePanel, uploadActiveSave, restoreActiveSave,
    isConfigured: true, syncEnabled: true, autoSyncIntervalMs: AUTO_SYNC_INTERVAL_MS
  });

  function boot() {
    bindAuthUi();
    initialize().then(() => refreshDevicePanel()).catch(error => {
      console.warn('SFO Cloud nicht verfügbar; lokaler Spielbetrieb bleibt aktiv.', error);
      setStatus('Cloud nicht erreichbar. Das lokale Spiel bleibt verfügbar.', true);
    });
  }
  if (global.document.readyState === 'loading') global.document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})(window);
