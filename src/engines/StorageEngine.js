// ═══════════════════════════════════════════════════════════════════
// StorageEngine — Persistence layer for The Association Project
// ═══════════════════════════════════════════════════════════════════
//
// Smart storage that uses the best available option:
//   - file:// protocol → localStorage only (IndexedDB unreliable)
//   - http(s):// → IndexedDB primary, localStorage backup
//
// Always maintains a localStorage copy as safety net, since the
// game is typically run as a single HTML file opened locally.
//
// Usage:
//   await StorageEngine.init()
//   await StorageEngine.save(gameState)
//   const data = await StorageEngine.load()
//

const DB_NAME = 'TheAssociationProject';
const DB_VERSION = 1;
const STORES = {
    SAVES: 'saves',
    HISTORY: 'history',
    META: 'meta'
};

const LS_KEYS = {
    SAVE_DATA: 'gbslSaveData',
    LEGACY: 'gbslMultiTierGameState'
};

// ─── Inline LZ compression for localStorage ────────────────────
// Minimal LZ-based compressor optimized for UTF-16 localStorage storage.
// No external dependencies. Achieves ~60-70% reduction on JSON save data.
const LZString = (() => {
    const f = String.fromCharCode;
    const keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
    const baseReverseDic = {};

    function getBaseValue(alphabet, character) {
        if (!baseReverseDic[alphabet]) {
            baseReverseDic[alphabet] = {};
            for (let i = 0; i < alphabet.length; i++) {
                baseReverseDic[alphabet][alphabet.charAt(i)] = i;
            }
        }
        return baseReverseDic[alphabet][character];
    }

    function _compress(uncompressed, bitsPerChar, getCharFromInt) {
        if (uncompressed == null) return "";
        let i, value, context_dictionary = {}, context_dictionaryToCreate = {},
            context_c = "", context_wc = "", context_w = "",
            context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2,
            context_data = [], context_data_val = 0, context_data_position = 0, ii;

        for (ii = 0; ii < uncompressed.length; ii++) {
            context_c = uncompressed.charAt(ii);
            if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
                context_dictionary[context_c] = context_dictSize++;
                context_dictionaryToCreate[context_c] = true;
            }
            context_wc = context_w + context_c;
            if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
                context_w = context_wc;
            } else {
                if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                    if (context_w.charCodeAt(0) < 256) {
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 8; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = value >> 1;
                        }
                    } else {
                        value = 1;
                        for (i = 0; i < context_numBits; i++) {
                            context_data_val = (context_data_val << 1) | value;
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = 0;
                        }
                        value = context_w.charCodeAt(0);
                        for (i = 0; i < 16; i++) {
                            context_data_val = (context_data_val << 1) | (value & 1);
                            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                            value = value >> 1;
                        }
                    }
                    context_enlargeIn--;
                    if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                    delete context_dictionaryToCreate[context_w];
                } else {
                    value = context_dictionary[context_w];
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                context_dictionary[context_wc] = context_dictSize++;
                context_w = String(context_c);
            }
        }
        if (context_w !== "") {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
        }
        value = 2;
        for (i = 0; i < context_numBits; i++) {
            context_data_val = (context_data_val << 1) | (value & 1);
            if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
            value = value >> 1;
        }
        while (true) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; } else context_data_position++;
        }
        return context_data.join('');
    }

    function _decompress(length, resetValue, getNextValue) {
        let dictionary = [], enlargeIn = 4, dictSize = 4, numBits = 3,
            entry = "", result = [], i, w, c, bits, resb, maxpower, power,
            data = { val: getNextValue(0), position: resetValue, index: 1 };

        for (i = 0; i < 3; i++) dictionary[i] = i;

        bits = 0; maxpower = Math.pow(2, 2); power = 1;
        while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }

        switch (bits) {
            case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1;
                while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                c = f(bits); break;
            case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1;
                while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                c = f(bits); break;
            case 2: return "";
        }
        dictionary[3] = c; w = c; result.push(c);

        while (true) {
            if (data.index > length) return "";
            bits = 0; maxpower = Math.pow(2, numBits); power = 1;
            while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
            switch (c = bits) {
                case 0: bits = 0; maxpower = Math.pow(2, 8); power = 1;
                    while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                    dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
                case 1: bits = 0; maxpower = Math.pow(2, 16); power = 1;
                    while (power != maxpower) { resb = data.val & data.position; data.position >>= 1; if (data.position == 0) { data.position = resetValue; data.val = getNextValue(data.index++); } bits |= (resb > 0 ? 1 : 0) * power; power <<= 1; }
                    dictionary[dictSize++] = f(bits); c = dictSize - 1; enlargeIn--; break;
                case 2: return result.join('');
            }
            if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            if (dictionary[c]) { entry = dictionary[c]; } else { if (c === dictSize) { entry = w + w.charAt(0); } else { return null; } }
            result.push(entry);
            dictionary[dictSize++] = w + entry.charAt(0);
            enlargeIn--;
            if (enlargeIn == 0) { enlargeIn = Math.pow(2, numBits); numBits++; }
            w = entry;
        }
    }

    return {
        compressToUTF16(input) {
            if (input == null) return "";
            return _compress(input, 15, n => f(n + 32)) + " ";
        },
        decompressFromUTF16(compressed) {
            if (compressed == null) return "";
            if (compressed === "") return null;
            return _decompress(compressed.length, 16384, index => compressed.charCodeAt(index) - 32);
        }
    };
})();
const COMPRESSED_PREFIX = 'LZ|'; // Prefix to detect compressed data

export class StorageEngine {

    static _db = null;
    static _ready = false;
    static _useIndexedDB = false; // True when IndexedDB is successfully opened

    // ─── Initialization ─────────────────────────────────────────

    static async init() {
        if (StorageEngine._ready) return true;

        // Always try IndexedDB first — it works on file:// in modern browsers
        // and has effectively unlimited storage (critical for Hall of Fame data)
        if (window.indexedDB) {
            try {
                StorageEngine._db = await StorageEngine._openDB();
                StorageEngine._useIndexedDB = true;
                StorageEngine._ready = true;
                console.log(`✅ StorageEngine: IndexedDB initialized (${window.location.protocol})`);

                // Migrate localStorage → IndexedDB if needed
                await StorageEngine._migrateToIndexedDB();
                return true;
            } catch (err) {
                console.warn('⚠️ StorageEngine: IndexedDB failed, falling back to localStorage', err);
            }
        }

        // Fallback: localStorage only (compressed)
        console.log('📦 StorageEngine: Using localStorage with LZ compression');
        StorageEngine._useIndexedDB = false;
        StorageEngine._ready = true;
        return true;
    }

        // ─── Save ───────────────────────────────────────────────────

    static async save(gameState, slot = 'autosave') {
        StorageEngine._ensureReady();

        try {
            // Serialize
            let data;
            if (gameState && typeof gameState.serialize === 'function') {
                data = gameState.serialize();
            } else {
                data = JSON.stringify(gameState);
            }

            const sizeKB = Math.round(data.length / 1024);
            let idbSuccess = false;
            let lsSuccess = false;

            // PRIMARY: Write to IndexedDB (no size limit)
            if (StorageEngine._useIndexedDB) {
                try {
                    await StorageEngine._put(STORES.SAVES, {
                        slot,
                        data,
                        timestamp: Date.now(),
                        season: gameState.currentSeason || gameState._currentSeason,
                        sizeKB
                    });
                    idbSuccess = true;
                } catch (idbErr) {
                    console.warn('⚠️ StorageEngine: IndexedDB write failed', idbErr);
                }
            }

            // BACKUP: Write compressed to localStorage
            // LZ compression is expensive on large saves (2-4MB), so:
            // - If IndexedDB succeeded, defer compression to avoid blocking UI
            // - Throttle to at most once every 30 seconds
            // - If IndexedDB failed, compress synchronously (it's our only storage)
            const now = Date.now();
            const LS_THROTTLE_MS = 30000;
            if (idbSuccess) {
                // Deferred + throttled — don't block the UI
                if (!StorageEngine._lastLsBackup || (now - StorageEngine._lastLsBackup) > LS_THROTTLE_MS) {
                    StorageEngine._lastLsBackup = now;
                    setTimeout(() => {
                        try {
                            const compressed = COMPRESSED_PREFIX + LZString.compressToUTF16(data);
                            localStorage.setItem(LS_KEYS.SAVE_DATA, compressed);
                        } catch (e) { /* best effort */ }
                    }, 50);
                }
                lsSuccess = true; // optimistic — IndexedDB is primary anyway
            } else {
                // No IndexedDB — must compress synchronously
                try {
                    const compressed = COMPRESSED_PREFIX + LZString.compressToUTF16(data);
                    const compressedKB = Math.round(compressed.length * 2 / 1024);
                    localStorage.setItem(LS_KEYS.SAVE_DATA, compressed);
                    lsSuccess = true;
                    console.log(`💾 localStorage: ${sizeKB}KB → ${compressedKB}KB compressed`);
                } catch (lsErr) {
                    if (lsErr.message && lsErr.message.includes('quota')) {
                        console.warn(`⚠️ StorageEngine: localStorage quota exceeded (${sizeKB}KB raw)`);
                    } else {
                        console.warn('⚠️ StorageEngine: localStorage write failed', lsErr);
                    }
                }
            }

            // Success if at least one store worked
            if (idbSuccess || lsSuccess) {
                const storage = idbSuccess ? 'indexeddb' : 'localStorage';
                return { success: true, sizeKB, storage };
            }

            return { success: false, sizeKB, storage: 'none', error: 'all-stores-failed' };
        } catch (err) {
            console.error('❌ StorageEngine: Save failed:', err);
            return { success: false, sizeKB: 0, storage: 'none' };
        }
    }

        // ─── Load ───────────────────────────────────────────────────

    static async load(slot = 'autosave') {
        StorageEngine._ensureReady();

        // Try IndexedDB first (if available and on http)
        if (StorageEngine._useIndexedDB) {
            try {
                const record = await StorageEngine._get(STORES.SAVES, slot);
                if (record && record.data) {
                    console.log(`📂 StorageEngine: Loaded from IndexedDB "${slot}" (${record.sizeKB}KB)`);
                    return record.data;
                }
            } catch (err) {
                console.warn('⚠️ StorageEngine: IndexedDB read failed, trying localStorage', err);
            }
        }

        // localStorage (primary for file://, fallback for http)
        let data = localStorage.getItem(LS_KEYS.SAVE_DATA);
        if (data) {
            // Detect and decompress LZ-compressed data
            if (data.startsWith(COMPRESSED_PREFIX)) {
                const decompressed = LZString.decompressFromUTF16(data.slice(COMPRESSED_PREFIX.length));
                if (decompressed) {
                    console.log(`📂 StorageEngine: Loaded from localStorage (compressed ${Math.round(data.length*2/1024)}KB → ${Math.round(decompressed.length/1024)}KB)`);
                    return decompressed;
                } else {
                    console.error('❌ StorageEngine: Failed to decompress localStorage data');
                }
            } else {
                // Uncompressed (legacy) — return as-is
                console.log(`📂 StorageEngine: Loaded from localStorage (${Math.round(data.length/1024)}KB uncompressed)`);
                return data;
            }
        }

        // Legacy format
        const legacy = localStorage.getItem(LS_KEYS.LEGACY);
        if (legacy) {
            console.log(`📂 StorageEngine: Loaded legacy format from localStorage`);
            return legacy;
        }

        console.log('📂 StorageEngine: No save data found');
        return null;
    }

    // ─── Delete / Reset ─────────────────────────────────────────

    static async deleteSave(slot = 'autosave') {
        StorageEngine._ensureReady();
        localStorage.removeItem(LS_KEYS.SAVE_DATA);
        localStorage.removeItem(LS_KEYS.LEGACY);
        if (StorageEngine._useIndexedDB) {
            await StorageEngine._delete(STORES.SAVES, slot);
        }
    }

    static async clearAll() {
        StorageEngine._ensureReady();
        localStorage.removeItem(LS_KEYS.SAVE_DATA);
        localStorage.removeItem(LS_KEYS.LEGACY);
        localStorage.removeItem('tap_storage');
        if (StorageEngine._useIndexedDB) {
            await StorageEngine._clearStore(STORES.SAVES);
            await StorageEngine._clearStore(STORES.HISTORY);
            await StorageEngine._clearStore(STORES.META);
        }
        console.log('🗑️ StorageEngine: All data cleared');
    }

    // ─── Save Slots ─────────────────────────────────────────────

    static async listSaves() {
        StorageEngine._ensureReady();

        const saves = [];

        // Check localStorage
        const lsData = localStorage.getItem(LS_KEYS.SAVE_DATA);
        if (lsData) {
            saves.push({
                slot: 'autosave',
                storage: 'localStorage',
                sizeKB: Math.round(lsData.length / 1024),
                timestamp: Date.now()
            });
        }

        // Check IndexedDB
        if (StorageEngine._useIndexedDB) {
            const idbSaves = await StorageEngine._getAll(STORES.SAVES);
            for (const s of idbSaves) {
                // Don't duplicate if already found in localStorage
                if (!saves.find(x => x.slot === s.slot)) {
                    saves.push({
                        slot: s.slot,
                        storage: 'indexeddb',
                        sizeKB: s.sizeKB,
                        season: s.season,
                        timestamp: s.timestamp
                    });
                }
            }
        }

        return saves;
    }

    // ─── Season History (IndexedDB only) ────────────────────────

    static async saveSeasonSnapshot(season, snapshot) {
        StorageEngine._ensureReady();
        if (!StorageEngine._useIndexedDB) {
            console.log('📜 StorageEngine: Season history requires IndexedDB (not available)');
            return;
        }
        await StorageEngine._put(STORES.HISTORY, {
            season,
            timestamp: Date.now(),
            ...snapshot
        });
        console.log(`📜 StorageEngine: Saved season ${season} snapshot`);
    }

    static async getSeasonSnapshot(season) {
        StorageEngine._ensureReady();
        if (!StorageEngine._useIndexedDB) return null;
        return StorageEngine._get(STORES.HISTORY, season);
    }

    static async getSeasonSnapshots() {
        StorageEngine._ensureReady();
        if (!StorageEngine._useIndexedDB) return [];
        const all = await StorageEngine._getAll(STORES.HISTORY);
        return all.sort((a, b) => a.season - b.season);
    }

    // ─── Diagnostics ────────────────────────────────────────────

    static async getStorageInfo() {
        StorageEngine._ensureReady();

        const info = {
            engine: StorageEngine._useIndexedDB ? 'indexeddb+localStorage' : 'localStorage',
            protocol: window.location.protocol,
            saves: 0,
            totalSizeKB: 0,
            historyCount: 0
        };

        const lsData = localStorage.getItem(LS_KEYS.SAVE_DATA);
        if (lsData) {
            info.saves++;
            info.totalSizeKB += Math.round(lsData.length / 1024);
            info.localStorageKB = Math.round(lsData.length / 1024);
        }

        if (StorageEngine._useIndexedDB) {
            const idbSaves = await StorageEngine._getAll(STORES.SAVES);
            info.indexedDBSaves = idbSaves.length;
            info.indexedDBSizeKB = idbSaves.reduce((sum, s) => sum + (s.sizeKB || 0), 0);
            const history = await StorageEngine._getAll(STORES.HISTORY);
            info.historyCount = history.length;
        }

        return info;
    }

    // ─── Migration (localStorage → IndexedDB) ────────────────────

    static async _migrateToIndexedDB() {
        if (!StorageEngine._useIndexedDB) return;

        const meta = await StorageEngine._get(STORES.META, 'migration_v2');
        if (meta && meta.completed) return;

        let rawData = localStorage.getItem(LS_KEYS.SAVE_DATA)
            || localStorage.getItem(LS_KEYS.LEGACY);

        if (!rawData) {
            await StorageEngine._put(STORES.META, { key: 'migration_v2', completed: true, timestamp: Date.now() });
            return;
        }

        try {
            // Decompress if needed before storing in IDB (IDB stores raw JSON)
            let data = rawData;
            if (rawData.startsWith(COMPRESSED_PREFIX)) {
                const decompressed = LZString.decompressFromUTF16(rawData.slice(COMPRESSED_PREFIX.length));
                if (decompressed) {
                    data = decompressed;
                    console.log(`🔄 StorageEngine: Decompressed localStorage data for IDB migration`);
                }
            }

            const sizeKB = Math.round(data.length / 1024);
            console.log(`🔄 StorageEngine: Copying ${sizeKB}KB to IndexedDB (keeping localStorage copy)...`);

            await StorageEngine._put(STORES.SAVES, {
                slot: 'autosave',
                data,
                timestamp: Date.now(),
                sizeKB
            });

            await StorageEngine._put(STORES.META, { key: 'migration_v2', completed: true, timestamp: Date.now() });

            // NOTE: We do NOT delete from localStorage — it stays as backup
            console.log(`✅ StorageEngine: Migration complete (data in both stores)`);
        } catch (err) {
            console.error('❌ StorageEngine: Migration failed (localStorage still intact)', err);
        }
    }

    // ─── IndexedDB Primitives ───────────────────────────────────

    static _openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(STORES.SAVES)) {
                    db.createObjectStore(STORES.SAVES, { keyPath: 'slot' });
                }
                if (!db.objectStoreNames.contains(STORES.HISTORY)) {
                    db.createObjectStore(STORES.HISTORY, { keyPath: 'season' });
                }
                if (!db.objectStoreNames.contains(STORES.META)) {
                    db.createObjectStore(STORES.META, { keyPath: 'key' });
                }
            };
            request.onsuccess = (event) => resolve(event.target.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    static _put(store, value) {
        return new Promise((resolve, reject) => {
            const tx = StorageEngine._db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).put(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    static _get(store, key) {
        return new Promise((resolve, reject) => {
            const tx = StorageEngine._db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }

    static _getAll(store) {
        return new Promise((resolve, reject) => {
            const tx = StorageEngine._db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => reject(req.error);
        });
    }

    static _delete(store, key) {
        return new Promise((resolve, reject) => {
            const tx = StorageEngine._db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    static _clearStore(store) {
        return new Promise((resolve, reject) => {
            const tx = StorageEngine._db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    static _ensureReady() {
        if (!StorageEngine._ready) {
            throw new Error('StorageEngine not initialized. Call await StorageEngine.init() first.');
        }
    }

    // ─── Helpers ────────────────────────────────────────────────

    /**
     * Compact an awards object for storage (strip heavy data, keep names + stats)
     */
    static _compactAwards(awards) {
        if (!awards) return null;

        const compactPlayer = (p) => {
            if (!p) return null;
            return {
                name: p.player ? p.player.name : (p.name || 'Unknown'),
                position: p.player ? p.player.position : (p.position || ''),
                team: p.team ? p.team.name : '',
                teamId: p.team ? p.team.id : null,
                rating: p.player ? p.player.rating : (p.rating || 0),
                ppg: p.avgs ? p.avgs.pointsPerGame : 0,
                rpg: p.avgs ? p.avgs.reboundsPerGame : 0,
                apg: p.avgs ? p.avgs.assistsPerGame : 0,
                spg: p.avgs ? p.avgs.stealsPerGame : 0,
                bpg: p.avgs ? p.avgs.blocksPerGame : 0
            };
        };

        const compactTeamPlayer = (p) => {
            if (!p) return null;
            return {
                name: p.player ? p.player.name : (p.name || 'Unknown'),
                position: p.player ? p.player.position : (p.position || p.pos || ''),
                team: p.team ? p.team.name : ''
            };
        };

        // allLeague teams are objects {G1, G2, F1, F2, C}, not arrays
        const compactAllLeague = (team) => {
            if (!team) return [];
            if (Array.isArray(team)) return team.map(compactTeamPlayer);
            // Object format: {G1: {...}, G2: {...}, F1: {...}, F2: {...}, C: {...}}
            return Object.values(team).filter(Boolean).map(compactTeamPlayer);
        };

        return {
            mvp: compactPlayer(awards.mvp),
            dpoy: compactPlayer(awards.dpoy),
            roy: compactPlayer(awards.roy),
            sixthMan: compactPlayer(awards.sixthMan),
            mostImproved: compactPlayer(awards.mostImproved),
            allLeagueFirst: compactAllLeague(awards.allLeagueFirst),
            allLeagueSecond: compactAllLeague(awards.allLeagueSecond),
            statLeaders: awards.statLeaders ? {
                points: awards.statLeaders.points ? { name: awards.statLeaders.points.player?.name, team: awards.statLeaders.points.team?.name, value: awards.statLeaders.points.avgs?.pointsPerGame } : null,
                rebounds: awards.statLeaders.rebounds ? { name: awards.statLeaders.rebounds.player?.name, team: awards.statLeaders.rebounds.team?.name, value: awards.statLeaders.rebounds.avgs?.reboundsPerGame } : null,
                assists: awards.statLeaders.assists ? { name: awards.statLeaders.assists.player?.name, team: awards.statLeaders.assists.team?.name, value: awards.statLeaders.assists.avgs?.assistsPerGame } : null,
                steals: awards.statLeaders.steals ? { name: awards.statLeaders.steals.player?.name, team: awards.statLeaders.steals.team?.name, value: awards.statLeaders.steals.avgs?.stealsPerGame } : null,
                blocks: awards.statLeaders.blocks ? { name: awards.statLeaders.blocks.player?.name, team: awards.statLeaders.blocks.team?.name, value: awards.statLeaders.blocks.avgs?.blocksPerGame } : null
            } : null
        };
    }
}
