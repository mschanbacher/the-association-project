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

export class StorageEngine {

    static _db = null;
    static _ready = false;
    static _useIndexedDB = false; // Only true on http(s):// with working IndexedDB

    // ─── Initialization ─────────────────────────────────────────

    static async init() {
        if (StorageEngine._ready) return true;

        // Detect protocol — IndexedDB is unreliable on file://
        const isFileProtocol = window.location.protocol === 'file:';

        if (isFileProtocol) {
            console.log('📦 StorageEngine: file:// detected — using localStorage (IndexedDB unreliable on file://)');
            StorageEngine._useIndexedDB = false;
            StorageEngine._ready = true;
            return true;
        }

        // On http(s)://, try IndexedDB
        if (!window.indexedDB) {
            console.log('📦 StorageEngine: IndexedDB not available — using localStorage');
            StorageEngine._useIndexedDB = false;
            StorageEngine._ready = true;
            return true;
        }

        try {
            StorageEngine._db = await StorageEngine._openDB();
            StorageEngine._useIndexedDB = true;
            StorageEngine._ready = true;
            console.log('✅ StorageEngine: IndexedDB initialized (http origin)');

            // Migrate localStorage → IndexedDB if needed
            await StorageEngine._migrateToIndexedDB();
            return true;
        } catch (err) {
            console.warn('⚠️ StorageEngine: IndexedDB failed, using localStorage', err);
            StorageEngine._useIndexedDB = false;
            StorageEngine._ready = true;
            return true;
        }
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

            // ALWAYS write to localStorage (primary for file://, backup for http)
            try {
                localStorage.setItem(LS_KEYS.SAVE_DATA, data);
            } catch (lsErr) {
                if (lsErr.message && lsErr.message.includes('quota')) {
                    console.warn(`⚠️ StorageEngine: localStorage quota exceeded (${sizeKB}KB)`);
                    // If we have IndexedDB, we can still save there
                    if (!StorageEngine._useIndexedDB) {
                        return { success: false, sizeKB, storage: 'none', error: 'quota' };
                    }
                }
            }

            // Also write to IndexedDB if available
            if (StorageEngine._useIndexedDB) {
                try {
                    await StorageEngine._put(STORES.SAVES, {
                        slot,
                        data,
                        timestamp: Date.now(),
                        season: gameState.currentSeason || gameState._currentSeason,
                        sizeKB
                    });
                } catch (idbErr) {
                    console.warn('⚠️ StorageEngine: IndexedDB write failed, localStorage still has data', idbErr);
                }
            }

            return { success: true, sizeKB, storage: StorageEngine._useIndexedDB ? 'indexeddb+localStorage' : 'localStorage' };
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
        const data = localStorage.getItem(LS_KEYS.SAVE_DATA);
        if (data) {
            console.log(`📂 StorageEngine: Loaded from localStorage (${Math.round(data.length/1024)}KB)`);
            return data;
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
            console.log('📜 StorageEngine: Season history requires IndexedDB (http origin)');
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

    // ─── Migration (localStorage → IndexedDB, http only) ────────

    static async _migrateToIndexedDB() {
        if (!StorageEngine._useIndexedDB) return;

        const meta = await StorageEngine._get(STORES.META, 'migration');
        if (meta && meta.completed) return;

        const data = localStorage.getItem(LS_KEYS.SAVE_DATA)
            || localStorage.getItem(LS_KEYS.LEGACY);

        if (!data) {
            await StorageEngine._put(STORES.META, { key: 'migration', completed: true, timestamp: Date.now() });
            return;
        }

        try {
            const sizeKB = Math.round(data.length / 1024);
            console.log(`🔄 StorageEngine: Copying ${sizeKB}KB to IndexedDB (keeping localStorage copy)...`);

            await StorageEngine._put(STORES.SAVES, {
                slot: 'autosave',
                data,
                timestamp: Date.now(),
                sizeKB
            });

            await StorageEngine._put(STORES.META, { key: 'migration', completed: true, timestamp: Date.now() });

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
