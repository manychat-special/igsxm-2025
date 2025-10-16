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
        
        // ВРЕМЕННО: Показываем оверлей сразу для тестирования
        setTimeout(() => {
            this.testShowOverlay();
        }, 2000);
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
                this.showOverlay(sessionElement);
            }
        });
    }
    
    getNextSession(currentSessionElement) {
        // Получаем все сессии на странице
        const allSessions = document.querySelectorAll('[data-agenda-item]');
        const sessions = Array.from(allSessions).map(el => ({
            element: el,
            slug: el.getAttribute('data-agenda-item'),
            startTime: new Date(el.getAttribute('data-start-time'))
        }));
        
        // Сортируем по времени начала
        sessions.sort((a, b) => a.startTime - b.startTime);
        
        // Находим индекс текущей сессии
        const currentIndex = sessions.findIndex(s => s.element === currentSessionElement);
        
        // Возвращаем следующую сессию (если есть)
        return sessions[currentIndex + 1] || null;
    }
    
    showOverlay(currentSessionElement) {
        if (!this.overlayElement) return;
        
        // Находим следующую сессию
        const nextSession = this.getNextSession(currentSessionElement);
        
        // Настраиваем ссылку только если есть следующая сессия
        const linkElement = this.overlayElement.querySelector('[data-next-redirect-link]');
        if (linkElement) {
            if (nextSession) {
                // Берем текущий URL и заменяем только slug в конце
                const currentUrl = window.location.href;
                const urlParts = currentUrl.split('/');
                urlParts[urlParts.length - 1] = nextSession.slug; // Заменяем последнюю часть на новый slug
                const newUrl = urlParts.join('/');
                
                linkElement.href = newUrl;
                linkElement.style.display = '';
                console.log(`Next session link set to: ${newUrl}`);
            } else {
                linkElement.style.display = 'none';
                console.log('No next session found, hiding link');
            }
        }
        
        // Скрываем оверлей
        this.overlayElement.style.display = 'none';
        
        // Показываем оверлей
        this.overlayElement.style.display = 'block';
        
        // Получаем время показа из атрибута data-next-redirect (по умолчанию 15 секунд)
        const displayTime = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
        const displayTimeMs = displayTime * 1000;
        
        console.log(`Overlay shown - session ended, will hide in ${displayTime} seconds`);
        
        // ВРЕМЕННО ОТКЛЮЧЕНО: Автоматически скрываем через указанное время
        // this.currentTimer = setTimeout(() => {
        //     this.hideOverlay();
        // }, displayTimeMs);
    }
    
    // ВРЕМЕННО: Метод для тестирования - принудительно показать оверлей
    testShowOverlay() {
        console.log('Testing overlay display...');
        
        // Находим первую сессию для тестирования
        const firstSession = document.querySelector('[data-agenda-item]');
        if (firstSession) {
            this.showOverlay(firstSession);
        } else {
            console.log('No sessions found for testing');
        }
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
