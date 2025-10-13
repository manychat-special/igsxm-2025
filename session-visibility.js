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
                    
                    // Format: days .. hours minutes
                    let countdownText = '';
                    if (days > 0) {
                        countdownText = `${days} : ${hours} : ${minutes}`;
                    } else {
                        countdownText = `${hours} : ${minutes}`;
                    }
                    
                    element.textContent = countdownText;
                } else {
                    element.textContent = '0 .. 0 0'; // Session has started
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
