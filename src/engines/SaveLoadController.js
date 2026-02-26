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
