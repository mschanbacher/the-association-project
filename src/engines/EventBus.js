// ═══════════════════════════════════════════════════════════════════
// EventBus — Central event system for The Association Project
// ═══════════════════════════════════════════════════════════════════
//
// The EventBus decouples game systems. Instead of function A directly
// calling function B, A emits an event and B listens for it. This
// allows new systems (news, coach reactions, board oversight) to hook
// into existing flows without modifying them.
//
// Usage:
//   EventBus.on('season.ended', (data) => handleSeasonEnd(data))
//   EventBus.emit('season.ended', { season: 2025, standings: {...} })
//
// Features:
//   - Named events with dot-notation namespacing
//   - Priority ordering (higher priority listeners fire first)
//   - One-time listeners (auto-remove after first call)
//   - Wildcard listeners ('season.*' catches all season events)
//   - Event history for debugging
//   - Async support (listeners can return promises)
//

export class EventBus {
    constructor() {
        this._listeners = new Map();    // event name → [{callback, priority, once, id}]
        this._history = [];             // last N events for debugging
        this._historyLimit = 100;
        this._nextId = 1;
        this._paused = false;
        this._queue = [];               // events queued while paused
    }

    // ─── Core API ───────────────────────────────────────────────────

    /**
     * Subscribe to an event
     * @param {string} event - Event name (supports wildcards: 'season.*')
     * @param {Function} callback - Handler function(data, eventName)
     * @param {Object} options - { priority: 0, once: false }
     * @returns {number} Listener ID for removal
     */
    on(event, callback, options = {}) {
        const { priority = 0, once = false } = options;
        const id = this._nextId++;

        if (!this._listeners.has(event)) {
            this._listeners.set(event, []);
        }

        this._listeners.get(event).push({ callback, priority, once, id });

        // Keep sorted by priority (highest first)
        this._listeners.get(event).sort((a, b) => b.priority - a.priority);

        return id;
    }

    /**
     * Subscribe to an event, auto-remove after first call
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    }

    /**
     * Remove a listener by ID
     */
    off(id) {
        for (const [event, listeners] of this._listeners) {
            const idx = listeners.findIndex(l => l.id === id);
            if (idx !== -1) {
                listeners.splice(idx, 1);
                if (listeners.length === 0) this._listeners.delete(event);
                return true;
            }
        }
        return false;
    }

    /**
     * Remove all listeners for an event (or all events if no arg)
     */
    offAll(event) {
        if (event) {
            this._listeners.delete(event);
        } else {
            this._listeners.clear();
        }
    }

    /**
     * Emit an event, calling all matching listeners
     * @param {string} event - Event name
     * @param {*} data - Payload passed to listeners
     * @returns {Array} Results from all listeners
     */
    emit(event, data = {}) {
        // Record in history
        this._history.push({
            event,
            data,
            timestamp: Date.now(),
            listenerCount: 0
        });
        if (this._history.length > this._historyLimit) {
            this._history.shift();
        }

        // If paused, queue the event
        if (this._paused) {
            this._queue.push({ event, data });
            console.log(`⏸️ EventBus: Queued "${event}" (paused)`);
            return [];
        }

        const results = [];
        const matchingListeners = this._getMatchingListeners(event);

        // Update history with listener count
        this._history[this._history.length - 1].listenerCount = matchingListeners.length;

        // Call each listener
        const toRemove = [];
        for (const { listener, sourceEvent } of matchingListeners) {
            try {
                const result = listener.callback(data, event);
                results.push(result);
            } catch (err) {
                console.error(`❌ EventBus: Error in listener for "${event}":`, err);
            }

            if (listener.once) {
                toRemove.push(listener.id);
            }
        }

        // Remove one-time listeners
        for (const id of toRemove) {
            this.off(id);
        }

        if (matchingListeners.length > 0) {
            console.log(`📡 EventBus: "${event}" → ${matchingListeners.length} listener(s)`);
        }

        return results;
    }

    // ─── Flow Control ───────────────────────────────────────────────

    /**
     * Pause event processing (events are queued)
     */
    pause() {
        this._paused = true;
    }

    /**
     * Resume and flush queued events
     */
    resume() {
        this._paused = false;
        const queued = [...this._queue];
        this._queue = [];
        for (const { event, data } of queued) {
            this.emit(event, data);
        }
    }

    // ─── Debugging ──────────────────────────────────────────────────

    /**
     * Get recent event history
     */
    getHistory(n = 20) {
        return this._history.slice(-n);
    }

    /**
     * Print event history to console
     */
    debugHistory(n = 20) {
        console.log('📜 EventBus History (last ' + n + '):');
        const history = this.getHistory(n);
        for (const entry of history) {
            const time = new Date(entry.timestamp).toLocaleTimeString();
            console.log(`  ${time} | ${entry.event} (${entry.listenerCount} listeners)`);
        }
    }

    /**
     * List all registered listeners
     */
    debugListeners() {
        console.log('👂 EventBus Listeners:');
        for (const [event, listeners] of this._listeners) {
            console.log(`  ${event}: ${listeners.length} listener(s)`);
            for (const l of listeners) {
                console.log(`    #${l.id} priority:${l.priority}${l.once ? ' (once)' : ''}`);
            }
        }
    }

    // ─── Internal ───────────────────────────────────────────────────

    /**
     * Find all listeners matching an event (including wildcards)
     */
    _getMatchingListeners(event) {
        const matched = [];

        for (const [pattern, listeners] of this._listeners) {
            if (this._matchesPattern(event, pattern)) {
                for (const listener of listeners) {
                    matched.push({ listener, sourceEvent: pattern });
                }
            }
        }

        // Sort by priority across all matching patterns
        matched.sort((a, b) => b.listener.priority - a.listener.priority);
        return matched;
    }

    /**
     * Check if an event name matches a pattern (supports wildcards)
     * 'season.ended' matches 'season.ended' and 'season.*' and '*'
     */
    _matchesPattern(event, pattern) {
        if (pattern === event) return true;
        if (pattern === '*') return true;

        // Wildcard matching: 'season.*' matches 'season.ended', 'season.started'
        if (pattern.endsWith('.*')) {
            const prefix = pattern.slice(0, -2);
            return event.startsWith(prefix + '.');
        }

        return false;
    }
}

// ═══════════════════════════════════════════════════════════════════
// EVENT CATALOG
// ═══════════════════════════════════════════════════════════════════
// Central reference for all events in the game. Use these constants
// instead of raw strings to prevent typos and enable autocomplete.
//
export const GameEvents = {

    // ─── Season Flow ────────────────────────────────────────────
    SEASON_STARTED:             'season.started',
    SEASON_DAY_SIMULATED:       'season.day.simulated',
    SEASON_GAME_COMPLETED:      'season.game.completed',
    SEASON_ALL_STAR:            'season.allStar',
    SEASON_TRADE_DEADLINE:      'season.tradeDeadline',
    SEASON_ENDED:               'season.ended',

    // ─── Postseason ─────────────────────────────────────────────
    PLAYOFFS_STARTED:           'playoffs.started',
    PLAYOFFS_ROUND_COMPLETED:   'playoffs.round.completed',
    PLAYOFFS_CHAMPIONSHIP:      'playoffs.championship',
    PLAYOFFS_ENDED:             'playoffs.ended',

    // ─── Promotion / Relegation ─────────────────────────────────
    PROMO_REL_CALCULATED:       'promoRel.calculated',
    TEAM_PROMOTED:              'promoRel.team.promoted',
    TEAM_RELEGATED:             'promoRel.team.relegated',
    PROMO_REL_COMPLETED:        'promoRel.completed',

    // ─── Offseason Flow ─────────────────────────────────────────
    OFFSEASON_STARTED:          'offseason.started',
    DRAFT_LOTTERY_COMPLETED:    'offseason.draft.lottery',
    DRAFT_STARTED:              'offseason.draft.started',
    DRAFT_PICK_MADE:            'offseason.draft.pick',
    DRAFT_COMPLETED:            'offseason.draft.completed',
    COLLEGE_FA_STARTED:         'offseason.collegeFA.started',
    COLLEGE_FA_COMPLETED:       'offseason.collegeFA.completed',
    DEVELOPMENT_STARTED:        'offseason.development.started',
    DEVELOPMENT_COMPLETED:      'offseason.development.completed',
    FREE_AGENCY_STARTED:        'offseason.freeAgency.started',
    PLAYER_SIGNED:              'offseason.freeAgency.playerSigned',
    FREE_AGENCY_COMPLETED:      'offseason.freeAgency.completed',
    ROSTER_CHECK_STARTED:       'offseason.rosterCheck.started',
    ROSTER_CHECK_COMPLETED:     'offseason.rosterCheck.completed',
    OFFSEASON_MANAGEMENT:       'offseason.management',
    OFFSEASON_COMPLETED:        'offseason.completed',

    // ─── Player Events ──────────────────────────────────────────
    PLAYER_TRADED:              'player.traded',
    PLAYER_INJURED:             'player.injured',
    PLAYER_RECOVERED:           'player.recovered',
    PLAYER_RETIRED:             'player.retired',
    PLAYER_DEVELOPED:           'player.developed',
    PLAYER_CONTRACT_EXPIRED:    'player.contract.expired',
    PLAYER_CONTRACT_SIGNED:     'player.contract.signed',

    // ─── Team Events ────────────────────────────────────────────
    TEAM_CHEMISTRY_CHANGED:     'team.chemistry.changed',
    TEAM_MORALE_CHANGED:        'team.morale.changed',
    TEAM_COACH_HIRED:           'team.coach.hired',
    TEAM_COACH_FIRED:           'team.coach.fired',
    TEAM_FINANCES_UPDATED:      'team.finances.updated',

    // ─── Trade Events ───────────────────────────────────────────
    TRADE_PROPOSED:             'trade.proposed',
    TRADE_ACCEPTED:             'trade.accepted',
    TRADE_REJECTED:             'trade.rejected',
    TRADE_AI_PROPOSAL:          'trade.ai.proposal',

    // ─── UI Events ──────────────────────────────────────────────
    MODAL_OPENED:               'ui.modal.opened',
    MODAL_CLOSED:               'ui.modal.closed',

    // ─── Save / Load ────────────────────────────────────────────
    GAME_SAVED:                 'game.saved',
    GAME_LOADED:                'game.loaded',
    GAME_RESET:                 'game.reset',
};

// ═══════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════
// The entire game shares one EventBus instance.

export const eventBus = new EventBus();
