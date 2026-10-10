/* Saving: everything stays in this browser (IndexedDB, else localStorage, else memory for this visit only).
   A backup file is the only way data leaves the browser, and only when someone presses the button. */
const Store = (() => {
  const DB = 'household-finance', KEY = 'state';
  let mode = 'memory', memory = null;
  function idb() {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('kv');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }
  async function load() {
    try {
      const db = await idb();
      const v = await new Promise((res, rej) => { const r = db.transaction('kv').objectStore('kv').get(KEY); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      mode = 'idb';
      return v ? JSON.parse(v) : null;
    } catch (e) { /* fall through */ }
    try {
      const v = localStorage.getItem(DB);
      mode = 'local';
      return v ? JSON.parse(v) : null;
    } catch (e) { mode = 'memory'; return memory; }
  }
  async function save(state) {
    const json = JSON.stringify(state);
    if (mode === 'idb') {
      try {
        const db = await idb();
        await new Promise((res, rej) => { const tx = db.transaction('kv', 'readwrite'); tx.objectStore('kv').put(json, KEY); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
        return true;
      } catch (e) { mode = 'local'; }
    }
    if (mode === 'local') {
      try { localStorage.setItem(DB, json); return true; } catch (e) { mode = 'memory'; }
    }
    memory = JSON.parse(json);
    return false;
  }
  return { load, save, mode: () => mode };
})();
