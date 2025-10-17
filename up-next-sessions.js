/**
 * Upcoming Sessions Manager
 * Shows next N upcoming sessions based on start time
 * (Uses display: none/block like session-visibility.js)
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
        const containerElements = document.querySelectorAll('[data-upcoming-sessions]');
        
        containerElements.forEach(element => {
            const limit = parseInt(element.getAttribute('data-upcoming-sessions')) || 3;
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
        
        // Filter and sort upcoming sessions
        // Show any sessions that haven't started yet (no time limit)
        const upcomingSessions = Array.from(sessions).filter(session => {
            const startTime = session.getAttribute('data-start-time');
            if (!startTime) return false;
            
            // Use the same parsing logic as local-timezone.js
            let sessionStartTime;
            if (startTime.includes('October')) {
                // For October format, manually add PDT timezone
                const isoStart = startTime.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
                const [datePart, timePart] = isoStart.split(' ');
                const [month, day] = datePart.split(' ');
                const formattedStart = `2025-10-${day.padStart(2, '0')}T${timePart}-07:00`;
                sessionStartTime = new Date(formattedStart);
            } else {
                sessionStartTime = new Date(startTime);
            }
            
            // Show any sessions that haven't started yet
            return sessionStartTime > now;
        }).sort((a, b) => {
            const aStartTime = a.getAttribute('data-start-time');
            const bStartTime = b.getAttribute('data-start-time');
            
            let aTime, bTime;
            if (aStartTime.includes('October')) {
                const isoA = aStartTime.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
                const [datePartA, timePartA] = isoA.split(' ');
                const [monthA, dayA] = datePartA.split(' ');
                const formattedA = `2025-10-${dayA.padStart(2, '0')}T${timePartA}-07:00`;
                aTime = new Date(formattedA);
            } else {
                aTime = new Date(aStartTime);
            }
            
            if (bStartTime.includes('October')) {
                const isoB = bStartTime.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
                const [datePartB, timePartB] = isoB.split(' ');
                const [monthB, dayB] = datePartB.split(' ');
                const formattedB = `2025-10-${dayB.padStart(2, '0')}T${timePartB}-07:00`;
                bTime = new Date(formattedB);
            } else {
                bTime = new Date(bStartTime);
            }
            
            return aTime - bTime;
        });
        
        // Hide all sessions first (like in session-visibility.js)
        sessions.forEach(session => {
            session.style.display = 'none';
        });
        
        // Show only the first N upcoming sessions
        upcomingSessions.slice(0, container.limit).forEach(session => {
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
