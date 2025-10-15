/**
 * Upcoming Sessions Manager
 * Shows next N upcoming sessions based on start time
 * (Removes past sessions from DOM completely)
 */

class UpcomingSessionsManager {
    constructor() {
        this.containers = [];
        this.updateInterval = null;
        this.checkInterval = 30000; // 30 seconds
        
        this.init();
    }
    
    init() {
        this.findContainers();
        this.updateAllContainers();
        this.startPeriodicUpdates();
        
        // Update when page becomes visible
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.updateAllContainers();
            }
        });
    }
    
    findContainers() {
        const containerElements = document.querySelectorAll('[data-agenda-next]');
        
        containerElements.forEach(element => {
            const limit = parseInt(element.getAttribute('data-agenda-next')) || 3;
            this.containers.push({
                element: element,
                limit: limit
            });
        });
        
        console.log(`Found ${this.containers.length} upcoming sessions containers`);
    }
    
    updateContainer(container) {
        const sessions = container.element.querySelectorAll('[data-agenda-item]');
        const now = new Date();

        // Remove past sessions from DOM
        sessions.forEach(session => {
            const startTime = session.getAttribute('data-start-time');
            if (!startTime) return;

            const sessionStartTime = window.parseAsPDT 
                ? window.parseAsPDT(startTime) 
                : new Date(startTime);

            if (sessionStartTime <= now) {
                const cardContainer = session.closest('.w-dyn-item');
                if (cardContainer) cardContainer.remove();
                else session.remove();
            }
        });

        // Re-query after removal
        const remainingSessions = container.element.querySelectorAll('[data-agenda-item]');
        
        // Sort future sessions
        const upcomingSessions = Array.from(remainingSessions).filter(session => {
            const startTime = session.getAttribute('data-start-time');
            if (!startTime) return false;
            
            const sessionStartTime = window.parseAsPDT 
                ? window.parseAsPDT(startTime) 
                : new Date(startTime);
            
            return sessionStartTime > now;
        }).sort((a, b) => {
            const aTime = window.parseAsPDT 
                ? window.parseAsPDT(a.getAttribute('data-start-time')) 
                : new Date(a.getAttribute('data-start-time'));
            const bTime = window.parseAsPDT 
                ? window.parseAsPDT(b.getAttribute('data-start-time')) 
                : new Date(b.getAttribute('data-start-time'));
            
            return aTime - bTime;
        });
        
        // Hide all remaining, then show only the first N
        remainingSessions.forEach(session => {
            const cardContainer = session.closest('.w-dyn-item');
            if (cardContainer) cardContainer.style.display = 'none';
            session.style.display = 'none';
        });
        
        upcomingSessions.slice(0, container.limit).forEach(session => {
            const cardContainer = session.closest('.w-dyn-item');
            if (cardContainer) cardContainer.style.display = '';
            session.style.display = '';
        });
        
        console.log(`Container updated: showing ${Math.min(upcomingSessions.length, container.limit)} upcoming sessions`);
    }
    
    updateAllContainers() {
        this.containers.forEach(container => this.updateContainer(container));
    }
    
    startPeriodicUpdates() {
        this.updateInterval = setInterval(() => this.updateAllContainers(), this.checkInterval);
    }
    
    destroy() {
        if (this.updateInterval) clearInterval(this.updateInterval);
    }
    
    refresh() {
        this.containers = [];
        this.findContainers();
        this.updateAllContainers();
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.upcomingManager = new UpcomingSessionsManager();
});

if (document.readyState !== 'loading' && !window.upcomingManager) {
    window.upcomingManager = new UpcomingSessionsManager();
}