/**
 * Simple Next Session Overlay Manager
 * Простой скрипт для показа оверлея когда сессия заканчивается
 */
class NextSessionOverlayManager {
    constructor() {
        this.overlayElement = null;
        this.currentTimer = null;
        this.checkInterval = null;
        
        this.init();
    }
    
    init() {
        // Находим оверлей на странице
        this.overlayElement = document.querySelector('[data-next-redirect]');
        
        if (!this.overlayElement) {
            console.log('No overlay element found with [data-next-redirect]');
            return;
        }
        
        // Скрываем оверлей изначально
        this.overlayElement.style.display = 'none';
        
        // Начинаем проверку каждые 5 секунд
        this.startChecking();
    }
    
    startChecking() {
        this.checkInterval = setInterval(() => {
            this.checkForSessionEnd();
        }, 5000);
    }
    
    checkForSessionEnd() {
        const now = new Date();
        
        // Ищем все сессии на странице
        const sessions = document.querySelectorAll('[data-agenda-item]');
        
        sessions.forEach(sessionElement => {
            const endTimeStr = sessionElement.getAttribute('data-end-time');
            if (!endTimeStr) return;
            
            const endTime = new Date(endTimeStr);
            const timeDiff = Math.abs(now.getTime() - endTime.getTime());
            
            // Если разница меньше 5 секунд (сессия только что закончилась)
            if (timeDiff <= 5000) {
                this.showOverlay();
            }
        });
    }
    
    showOverlay() {
        if (!this.overlayElement) return;
        
        // Скрываем оверлей
        this.overlayElement.style.display = 'none';
        
        // Показываем оверлей
        this.overlayElement.style.display = 'block';
        
        // Получаем время показа из атрибута data-next-redirect (по умолчанию 15 секунд)
        const displayTime = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
        const displayTimeMs = displayTime * 1000;
        
        console.log(`Overlay shown - session ended, will hide in ${displayTime} seconds`);
        
        // Автоматически скрываем через указанное время
        this.currentTimer = setTimeout(() => {
            this.hideOverlay();
        }, displayTimeMs);
    }
    
    hideOverlay() {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
            const displayTime = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
            console.log(`Overlay hidden after ${displayTime} seconds`);
        }
        
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
            this.currentTimer = null;
        }
    }
    
    destroy() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        if (this.currentTimer) {
            clearTimeout(this.currentTimer);
        }
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.nextSessionOverlayManager = new NextSessionOverlayManager();
});

// Также инициализируем если скрипт загружается после DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.nextSessionOverlayManager) {
            window.nextSessionOverlayManager = new NextSessionOverlayManager();
        }
    });
} else {
    window.nextSessionOverlayManager = new NextSessionOverlayManager();
}
