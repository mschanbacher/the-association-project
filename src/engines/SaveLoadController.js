/**
 * SaveLoadController.js
 * Orchestrates game save, load, and reset operations.
 * 
 * Delegates storage I/O to StorageEngine, handles error fallbacks
 * and event emission.
 * 
 * Note: The boot-time load sequence remains in index.html's init IIFE
 * since it runs before gameState exists. This controller handles
 * runtime saves and resets only.
 */
export class SaveLoadController {
    constructor({ gameState, engines, helpers }) {
        this.gameState = gameState;
        this.StorageEngine = engines.StorageEngine;
        this.eventBus = helpers.eventBus;
        this.GameEvents = helpers.GameEvents;
    }

    /** Save current game state (async, with emergency localStorage fallback) */
    save() {
        this.StorageEngine.save(this.gameState).then(result => {
            if (result.success) {
                console.log(`💾 Saved (${result.sizeKB}KB via ${result.storage})`);
                this.eventBus.emit(this.GameEvents.GAME_SAVED, { sizeKB: result.sizeKB, storage: result.storage });
            } else {
                console.error('❌ Save returned failure');
                this._emergencyFallback();
            }
        }).catch(err => {
            console.error('❌ Save error:', err);
            this._emergencyFallback();
        });
    }

    /** Download current save as a .json file */
    async downloadSave() {
        try {
            const data = await this.StorageEngine.load();
            if (!data) {
                alert('No save data found to download.');
                return;
            }

            const parsed = JSON.parse(data);
            const season = parsed.currentSeason || 'unknown';
            const filename = `association-save-${season}.json`;

            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log(`📥 Save downloaded: ${filename} (${Math.round(data.length / 1024)}KB)`);
        } catch (err) {
            console.error('❌ Download save failed:', err);
            alert('Error downloading save: ' + err.message);
        }
    }

    /** Upload a .json save file to replace current save */
    uploadSave() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parsed = JSON.parse(text);

                // Validate it's a real save
                if (!parsed.gameVersion || !parsed.currentSeason || !parsed.tier1Teams) {
                    alert('This doesn\'t appear to be a valid Association Project save file.');
                    return;
                }

                if (!confirm(`Import save from Season ${parsed.currentSeason}?\n\nThis will replace your current save. This cannot be undone.`)) {
                    return;
                }

                // Write to storage and reload
                await this.StorageEngine.save({ serialize: () => text }, 'autosave');
                console.log(`📤 Save imported: Season ${parsed.currentSeason} (${Math.round(text.length / 1024)}KB)`);
                location.reload();
            } catch (err) {
                console.error('❌ Import save failed:', err);
                alert('Error importing save: ' + err.message);
            }
        };

        input.click();
    }

    /** Reset game — clears all storage and reloads */
    reset() {
        if (confirm('Are you sure you want to reset? All progress will be lost.')) {
            this.StorageEngine.clearAll().then(() => {
                location.reload();
            }).catch(() => {
                // Fallback: clear localStorage manually and reload
                localStorage.removeItem('gbslMultiTierGameState');
                localStorage.removeItem('gbslSaveData');
                location.reload();
            });
        }
    }

    /** Emergency fallback: write directly to localStorage */
    _emergencyFallback() {
        try {
            const data = this.gameState.serialize ? this.gameState.serialize() : JSON.stringify(this.gameState);
            localStorage.setItem('gbslSaveData', data);
            console.log('🆘 Emergency save to localStorage:', Math.round(data.length / 1024), 'KB');
        } catch (e) {
            console.error('Emergency save also failed:', e);
        }
    }
}
