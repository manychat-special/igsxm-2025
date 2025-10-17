/**
 * Next Session Overlay Manager
 * Shows overlay when session ends and redirects to next session
 */
class NextSessionOverlayManager {
    constructor() {
        this.overlayElement = null;
        this.currentTimer = null;
        this.checkInterval = null;
        this.progressTimer = null; // Progress bar timer
        this.shownSessions = new Set(); // Track shown sessions to prevent duplicates
        
        this.init();
    }
    
    init() {
        // Find overlay element on page
        this.overlayElement = document.querySelector('[data-next-redirect]');
        
        if (!this.overlayElement) {
            return;
        }
        
        // Hide overlay initially
        this.overlayElement.style.display = 'none';
        
        // Start checking every 10 seconds
        this.startChecking();
        
        // TEMPORARY: Show overlay immediately for testing
        // setTimeout(() => {
        //     this.testShowOverlay();
        // }, 2000);
    }
    
    startChecking() {
        this.checkInterval = setInterval(() => {
            this.checkForSessionEnd();
        }, 10000);
    }
    
    checkForSessionEnd() {
        const now = new Date();
        
        // Find all sessions on page
        const sessions = document.querySelectorAll('[data-agenda-item]');
        
        sessions.forEach(sessionElement => {
            const endTimeStr = sessionElement.getAttribute('data-end-time');
            if (!endTimeStr) return;
            
            const endTime = new Date(endTimeStr);
            const timeDiff = Math.abs(now.getTime() - endTime.getTime());
            
            // If difference is less than 5 seconds (session just ended)
            if (timeDiff <= 5000) {
                const sessionId = sessionElement.getAttribute('data-agenda-item');
                if (!this.shownSessions.has(sessionId)) {
                    this.shownSessions.add(sessionId);
                    this.showOverlay(sessionElement);
                }
            }
        });
    }
    
    getNextSession(endedSessionElement) {
        // Get all sessions on page
        const allSessions = document.querySelectorAll('[data-agenda-item]');
        const sessions = Array.from(allSessions).map(el => ({
            element: el,
            slug: el.getAttribute('data-agenda-item'),
            title: el.getAttribute('data-agenda-title') || 'Untitled Session',
            startTime: new Date(el.getAttribute('data-start-time')),
            endTime: new Date(el.getAttribute('data-end-time'))
        }));
        
        // Get the ended session's end time
        const endedSession = sessions.find(s => s.element === endedSessionElement);
        if (!endedSession) {
            return null;
        }
        
        const endedTime = endedSession.endTime;
        const now = new Date();
        
        // Find sessions that start exactly at the ended session's end time
        const futureSessions = sessions.filter(session => {
            // Skip the same session element
            if (session.element === endedSessionElement) {
                return false;
            }
            
            // Must start at or very close to the ended session's end time (within 2 minutes)
            const timeDiff = Math.abs(session.startTime.getTime() - endedTime.getTime());
            if (timeDiff > 120000) { // 2 minutes in milliseconds
                return false;
            }
            
            // Accept any session that starts at the right time (past, present, or future)
            return true;
        });
        
        // Sort by start time and return the earliest one
        futureSessions.sort((a, b) => a.startTime - b.startTime);
        
        return futureSessions[0] || null;
    }
    
    showOverlay(endedSessionElement) {
        if (!this.overlayElement) return;
        
        // Find next session
        const nextSession = this.getNextSession(endedSessionElement);
        
        // If no next session found, don't show overlay at all
        if (!nextSession) {
            return;
        }
        
        // Setup link and title
        const linkElement = this.overlayElement.querySelector('[data-next-redirect-link]');
        const titleElement = this.overlayElement.querySelector('[data-next-redirect-title]');
        
        // Setup link
        if (linkElement) {
            // Get current URL and replace only slug at the end
            const currentUrl = window.location.href;
            const urlParts = currentUrl.split('/');
            urlParts[urlParts.length - 1] = nextSession.slug;
            const newUrl = urlParts.join('/');
            
            linkElement.href = newUrl;
            linkElement.style.display = '';
        }
        
        // Setup title
        if (titleElement) {
            titleElement.textContent = nextSession.title;
            titleElement.style.display = '';
        }
        
        // Hide overlay
        this.overlayElement.style.display = 'none';
        
        // Show overlay
        this.overlayElement.style.display = 'flex';
        
        // Setup cancel button
        this.setupCancelButton();
        
        // Animate overlay appearance from bottom with bounce
        this.animateOverlayIn();
        
        // Get display time from data-next-redirect attribute (default 15 seconds)
        const displayTime = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
        const displayTimeMs = displayTime * 1000;
        
        // Start progress bar and automatic redirect
        this.startProgressBar(displayTimeMs, linkElement);
    }
    
    animateOverlayIn() {
        // Check if GSAP is available
        if (typeof gsap === 'undefined') {
            return;
        }
        
        // Set initial state 
        gsap.set(this.overlayElement, {
            y: '100%', // Completely below screen
            scale: 0.95 // Slight reduction for depth effect
        });
        
        // Animate appearance from bottom 
        gsap.to(this.overlayElement, {
            y: '0%',
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            delay: 0.1
        });
    }
    
    setupCancelButton() {
        const cancelButton = this.overlayElement.querySelector('[data-next-redirect-cancel]');
        
        if (!cancelButton) {
            return;
        }
        
        // Remove previous handlers
        cancelButton.onclick = null;
        
        // Add new handler
        cancelButton.onclick = () => {
            this.hideOverlayWithAnimation();
        };
    }
    
    hideOverlayWithAnimation() {
        // Check if GSAP is available
        if (typeof gsap === 'undefined') {
            this.hideOverlay();
            return;
        }
        
        // Hide animation down 
        gsap.to(this.overlayElement, {
            y: '100%', // Completely goes down
            scale: 0.95, // Slight reduction
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => {
                this.hideOverlay();
            }
        });
    }
    
    startProgressBar(durationMs, linkElement) {
        const progressElement = this.overlayElement.querySelector('[data-next-redirect-progress]');
        const countElement = this.overlayElement.querySelector('[data-next-redirect-count]');
        
        if (!progressElement) {
            return;
        }
        
        // Always reset progress bar to 0
        progressElement.style.width = '0%';
        progressElement.style.transition = 'none'; // Disable CSS transitions
        
        // Setup countdown
        const totalSeconds = Math.ceil(durationMs / 1000);
        let remainingSeconds = totalSeconds;
        
        // Update counter
        const updateCountdown = () => {
            if (countElement) {
                countElement.textContent = `${remainingSeconds}S`;
            }
            remainingSeconds--;
        };
        
        // Show initial value
        updateCountdown();
        
        // Start countdown every second
        const countdownInterval = setInterval(() => {
            updateCountdown();
            if (remainingSeconds < 0) {
                clearInterval(countdownInterval);
            }
        }, 1000);
        
        // Small delay before starting animation
        this.progressTimer = setTimeout(() => {
            // Enable smooth animation
            progressElement.style.transition = `width ${durationMs}ms linear`;
            progressElement.style.width = '100%';
            
            // Timer for redirect
            this.progressTimer = setTimeout(() => {
                clearInterval(countdownInterval);
                if (linkElement && linkElement.href) {
                    window.location.href = linkElement.href;
                }
            }, durationMs);
        }, 100);
    }
    
    // TEMPORARY: Method for testing - force show overlay
    testShowOverlay() {
        // Find first session for testing
        const firstSession = document.querySelector('[data-agenda-item]');
        if (firstSession) {
            this.showOverlay(firstSession);
        }
    }
    
    hideOverlay() {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
        }
        
        // Clear all timers
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }
        
        if (this.progressTimer) {
            clearTimeout(this.progressTimer);
            this.progressTimer = null;
        }
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
        }
        if (this.progressTimer) {
            clearTimeout(this.progressTimer);
        }
    }
}

// Initialize both managers
document.addEventListener('DOMContentLoaded', () => {
    window.nextSessionOverlayManager = new NextSessionOverlayManager();
    window.additionalSessionOverlayManager = new AdditionalSessionOverlayManager();
});

// Also initialize if script loads after DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.nextSessionOverlayManager) {
            window.nextSessionOverlayManager = new NextSessionOverlayManager();
        }
        if (!window.additionalSessionOverlayManager) {
            window.additionalSessionOverlayManager = new AdditionalSessionOverlayManager();
        }
    });
} else {
    window.nextSessionOverlayManager = new NextSessionOverlayManager();
    window.additionalSessionOverlayManager = new AdditionalSessionOverlayManager();
}

/**
 * Additional Session Overlay Manager
 * Manages session-ended and session-ondemand overlays
 */
class AdditionalSessionOverlayManager {
    constructor() {
        this.sessionEndedOverlay = null;
        this.sessionOndemandOverlay = null;
        this.checkInterval = null;
        this.shownSessions = new Set(); // Track shown sessions to prevent duplicates
        
        this.init();
    }
    
    init() {
        // Find overlay elements
        this.sessionEndedOverlay = document.querySelector('[data-session-ended]');
        this.sessionOndemandOverlay = document.querySelector('[data-session-ondemand]');
        
        if (!this.sessionEndedOverlay && !this.sessionOndemandOverlay) {
            return;
        }
        
        // Start checking every 10 seconds (same as original)
        this.startChecking();
    }
    
    startChecking() {
        this.checkInterval = setInterval(() => {
            this.checkForSessionEnd();
        }, 10000);
        
        // Check immediately when page loads
        this.checkForSessionEnd();
    }
    
    checkForSessionEnd() {
        const now = new Date();
        
        // Find all sessions on page (same as original)
        const sessions = document.querySelectorAll('[data-agenda-item]');
        
        sessions.forEach(sessionElement => {
            const endTimeStr = sessionElement.getAttribute('data-end-time');
            if (!endTimeStr) return;
            
            const endTime = new Date(endTimeStr);
            const timeSinceEnd = now.getTime() - endTime.getTime();
            const sessionId = sessionElement.getAttribute('data-agenda-item');
            
            // Check session-ended overlay (1 minute after session ends)
            if (this.sessionEndedOverlay && timeSinceEnd >= 60000) {
                if (!this.shownSessions.has(sessionId + '-ended')) {
                    this.shownSessions.add(sessionId + '-ended');
                    this.sessionEndedOverlay.classList.remove('hide');
                }
            }
            
            // Check ondemand overlay (only if session has ended and delay is positive)
            if (this.sessionOndemandOverlay) {
                const ondemandDelay = this.sessionOndemandOverlay.getAttribute('data-session-ondemand');
                console.log(`Session ${sessionId}: timeSinceEnd=${timeSinceEnd}, ondemandDelay=${ondemandDelay}`);
                
                if (timeSinceEnd > 0 && ondemandDelay) {
                    const delayMinutes = parseInt(ondemandDelay);
                    if (!isNaN(delayMinutes) && delayMinutes > 0) {
                        const delayMs = delayMinutes * 60 * 1000;
                        console.log(`Session ${sessionId}: delayMs=${delayMs}, timeSinceEnd >= delayMs: ${timeSinceEnd >= delayMs}`);
                        if (timeSinceEnd >= delayMs) {
                            if (!this.shownSessions.has(sessionId + '-ondemand')) {
                                this.shownSessions.add(sessionId + '-ondemand');
                                this.sessionOndemandOverlay.classList.remove('hide');
                                console.log(`Showing ondemand overlay for session ${sessionId}`);
                            }
                        }
                    }
                }
            }
        });
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
    }
}

