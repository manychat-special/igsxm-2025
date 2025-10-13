/**
 * Session Visibility Manager for Live Events
 * Manages visibility of session elements based on local time and session datetime
 */

class SessionVisibilityManager {
    constructor() {
        this.sessions = [];
        this.updateInterval = null;
        this.checkInterval = 30000; // 30 seconds
        
        // Data attributes for different session states
        this.attributes = {
            before: 'data-before-session',
            during: 'data-during-session', 
            after: 'data-after-session'
        };
        
        this.init();
    }
    
    init() {
        this.findSessions();
        this.findNestedCollections();
        this.updateAllSessions();
        this.startPeriodicUpdates();
        
        // Update immediately when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateAllSessions();
            }
        });
    }
    
    updateCountdownTimers() {
        this.sessions.forEach(session => {
            const countdownElements = session.element.querySelectorAll('[data-session-countdown]');
            
            countdownElements.forEach(element => {
                const now = new Date();
                const timeDiff = session.startTime.getTime() - now.getTime();
                
                if (timeDiff > 0) {
                    const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    // Show only one unit - most relevant
                    let countdownText = '';
                    if (days > 0) {
                        countdownText = `${days} day${days > 1 ? 's' : ''}`;
                    } else if (hours > 0) {
                        countdownText = `${hours} hour${hours > 1 ? 's' : ''}`;
                    } else if (minutes > 0) {
                        countdownText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
                    } else {
                        countdownText = 'Starting now';
                    }
                    
                    element.textContent = countdownText;
                } else {
                    element.textContent = 'Starting now'; // Session has started
                }
            });
        });
    }
    
    findSessions() {
        const sessionElements = document.querySelectorAll('[data-agenda-item]');
        
        sessionElements.forEach(element => {
            const startTime = element.getAttribute('data-start-time');
            const endTime = element.getAttribute('data-end-time');
            
            if (startTime && endTime) {
                this.sessions.push({
                    element: element,
                    startTime: new Date(startTime),
                    endTime: new Date(endTime)
                });
            }
        });
        
        console.log(`Found ${this.sessions.length} sessions to manage`);
    }
    
    findNestedCollections() {
        const collectionLists = document.querySelectorAll('[data-agenda-next]');
        
        collectionLists.forEach(collectionList => {
            const parentSessionId = collectionList.getAttribute('data-agenda-next');
            const parentSession = this.sessions.find(s => 
                s.element.getAttribute('data-agenda-item') === parentSessionId
            );
            
            if (parentSession) {
                const childSessions = collectionList.querySelectorAll('[data-agenda-item]');
                this.filterNestedSessions(collectionList, childSessions, parentSession);
            }
        });
    }
    
    filterNestedSessions(collectionList, childSessions, parentSession) {
        const parentStartTime = parentSession.startTime.getTime();
        const parentEndTime = parentSession.endTime.getTime();
        
        // Show sessions that are:
        // 1. Running simultaneously (overlapping with parent session)
        // 2. Starting after parent session (within 30 minutes)
        const relevantSessions = [];
        
        childSessions.forEach(childElement => {
            const startTime = childElement.getAttribute('data-start-time');
            const endTime = childElement.getAttribute('data-end-time');
            
            if (startTime && endTime) {
                const childStartTime = new Date(startTime).getTime();
                const childEndTime = new Date(endTime).getTime();
                
                // Check if session is relevant (only compare with parent session)
                const isSimultaneous = (childStartTime <= parentEndTime && childEndTime >= parentStartTime);
                const startsAfter = (childStartTime >= parentStartTime && childStartTime <= parentEndTime + (30 * 60 * 1000)); // 30 minutes after parent ends
                
                if (isSimultaneous || startsAfter) {
                    relevantSessions.push(childElement);
                } else {
                    childElement.style.display = 'none';
                }
            }
        });
        
        // Show relevant sessions
        relevantSessions.forEach(session => {
            session.style.display = '';
        });
        
        console.log(`Filtered nested collection: showing ${relevantSessions.length} of ${childSessions.length} sessions`);
    }
    
    getSessionState(session) {
        const now = new Date();
        const { startTime, endTime } = session;
        
        if (now < startTime) {
            return 'before';
        } else if (now >= startTime && now <= endTime) {
            return 'during';
        } else {
            return 'after';
        }
    }
    
    updateSessionVisibility(session) {
        const state = this.getSessionState(session);
        const { element } = session;
        
        // Hide all state-specific elements first
        Object.values(this.attributes).forEach(attr => {
            const stateElements = element.querySelectorAll(`[${attr}]`);
            stateElements.forEach(el => {
                el.style.display = 'none';
            });
        });
        
        // Show elements for current state
        const currentStateAttr = this.attributes[state];
        const currentStateElements = element.querySelectorAll(`[${currentStateAttr}]`);
        currentStateElements.forEach(el => {
            el.style.display = '';
        });
        
        // Add/remove state classes for additional styling
        element.classList.remove('session-before', 'session-during', 'session-after');
        element.classList.add(`session-${state}`);
        
        // Update countdown if in 'before' state
        if (state === 'before') {
            this.updateCountdown(element, session.startTime);
        }
    }
    
    updateCountdown(element, targetTime) {
        const countdownElements = element.querySelectorAll('[data-countdown]');
        
        countdownElements.forEach(countdownEl => {
            const now = new Date();
            const timeDiff = targetTime.getTime() - now.getTime();
            
            if (timeDiff > 0) {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
                
                // Format countdown display
                let countdownText = '';
                if (days > 0) {
                    countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                } else if (hours > 0) {
                    countdownText = `${hours}h ${minutes}m ${seconds}s`;
                } else if (minutes > 0) {
                    countdownText = `${minutes}m ${seconds}s`;
                } else {
                    countdownText = `${seconds}s`;
                }
                
                countdownEl.textContent = countdownText;
                
                // Add data attributes for individual time units
                countdownEl.setAttribute('data-days', days);
                countdownEl.setAttribute('data-hours', hours);
                countdownEl.setAttribute('data-minutes', minutes);
                countdownEl.setAttribute('data-seconds', seconds);
            } else {
                countdownEl.textContent = 'Starting now...';
            }
        });
    }
    
    updateAllSessions() {
        this.sessions.forEach(session => {
            this.updateSessionVisibility(session);
        });
        this.updateCountdownTimers();
        this.updateNestedCollections();
    }
    
    updateNestedCollections() {
        const collectionLists = document.querySelectorAll('[data-agenda-next]');
        
        collectionLists.forEach(collectionList => {
            const parentSessionId = collectionList.getAttribute('data-agenda-next');
            const parentSession = this.sessions.find(s => 
                s.element.getAttribute('data-agenda-item') === parentSessionId
            );
            
            if (parentSession) {
                const childSessions = collectionList.querySelectorAll('[data-agenda-item]');
                this.filterNestedSessions(collectionList, childSessions, parentSession);
            }
        });
    }
    
    startPeriodicUpdates() {
        // Update countdown every second for active countdowns
        setInterval(() => {
            this.sessions.forEach(session => {
                const state = this.getSessionState(session);
                if (state === 'before') {
                    this.updateCountdown(session.element, session.startTime);
                }
            });
            this.updateCountdownTimers();
        }, 1000);
        
        // Check for state changes every 30 seconds
        this.updateInterval = setInterval(() => {
            this.updateAllSessions();
        }, this.checkInterval);
    }
    
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
    
    // Public method to manually refresh sessions (useful for dynamic content)
    refresh() {
        this.sessions = [];
        this.findSessions();
        this.updateAllSessions();
    }
    
    // Public method to get current session state
    getCurrentState(sessionElement) {
        const session = this.sessions.find(s => s.element === sessionElement);
        return session ? this.getSessionState(session) : null;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sessionManager = new SessionVisibilityManager();
});

// Also initialize if script loads after DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.sessionManager) {
            window.sessionManager = new SessionVisibilityManager();
        }
    });
} else {
    window.sessionManager = new SessionVisibilityManager();
}
