/**
 * Next Session Overlay Manager
 * Независимый скрипт для управления оверлеями следующих сессий
 */
class NextSessionOverlayManager {
    constructor() {
        this.activeOverlays = new Map(); // sessionId -> overlay data
        this.countdownTimers = new Map(); // sessionId -> timer
        this.sessionManager = null;
        
        this.init();
    }
    
    init() {
        // Ждем, пока SessionVisibilityManager будет готов
        this.waitForSessionManager();
    }
    
    waitForSessionManager() {
        if (window.sessionManager) {
            this.sessionManager = window.sessionManager;
            this.setupEventListeners();
        } else {
            // Проверяем каждые 100мс
            setTimeout(() => this.waitForSessionManager(), 100);
        }
    }
    
    setupEventListeners() {
        // Слушаем изменения состояния сессий
        const originalUpdateSessionVisibility = this.sessionManager.updateSessionVisibility.bind(this.sessionManager);
        
        this.sessionManager.updateSessionVisibility = (session) => {
            // Вызываем оригинальный метод
            originalUpdateSessionVisibility(session);
            
            // Добавляем нашу логику
            this.handleSessionStateChange(session);
        };
    }
    
    handleSessionStateChange(session) {
        const sessionId = session.element.getAttribute('data-agenda-item');
        const currentState = this.sessionManager.getCurrentState(session.element);
        const previousState = session.element.getAttribute('data-previous-state');
        
        // Проверяем, изменилось ли состояние с 'during' на 'after'
        if (previousState === 'during' && currentState === 'after') {
            this.showOverlayForSession(session);
        }
        
        // Сохраняем текущее состояние
        session.element.setAttribute('data-previous-state', currentState);
    }
    
    showOverlayForSession(session) {
        const sessionId = session.element.getAttribute('data-agenda-item');
        const overlayElement = session.element.querySelector('[data-next-redirect]');
        
        // Проверяем, включен ли оверлей для этой сессии
        if (!overlayElement) {
            return;
        }
        
        // Получаем доступные следующие сессии
        const nextSessions = this.getAvailableNextSessions(session);
        
        if (nextSessions.length === 0) {
            console.log('No next sessions available for', sessionId);
            return;
        }
        
        // Случайный выбор
        const randomSession = nextSessions[Math.floor(Math.random() * nextSessions.length)];
        
        console.log('Showing overlay for', sessionId, '->', randomSession.element.getAttribute('data-agenda-item'));
        
        // Настраиваем оверлей
        this.setupOverlay(session, randomSession, overlayElement);
    }
    
    getAvailableNextSessions(currentSession) {
        const now = new Date();
        return this.sessionManager.sessions.filter(session => {
            // Исключаем текущую сессию
            if (session === currentSession) return false;
            
            // Только сессии, которые еще не начались или начались недавно
            const timeDiff = session.startTime.getTime() - now.getTime();
            return timeDiff >= 0 || timeDiff >= -300000; // 5 минут буфер
        });
    }
    
    setupOverlay(currentSession, nextSession, overlayElement) {
        const sessionId = currentSession.element.getAttribute('data-agenda-item');
        const linkElement = overlayElement.querySelector('[data-next-redirect-link]');
        const cancelButton = overlayElement.querySelector('[data-next-redirect-cancel]');
        
        // Сначала скрываем оверлей
        overlayElement.style.display = 'none';
        
        // Настраиваем ссылку
        const nextSessionLink = nextSession.element.querySelector('a');
        if (nextSessionLink) {
            linkElement.href = nextSessionLink.href;
            linkElement.textContent = `Перейти к "${nextSessionLink.textContent.trim()}"`;
        }
        
        // Показываем оверлей
        overlayElement.style.display = 'block';
        
        // Обработчик отмены
        cancelButton.onclick = () => this.cancelOverlay(sessionId);
        
        // Сохраняем данные оверлея
        this.activeOverlays.set(sessionId, {
            element: overlayElement,
            nextSession: nextSession
        });
        
        console.log('Overlay shown for session:', sessionId, '-> next session:', nextSession.element.getAttribute('data-agenda-item'));
    }
    
    // startCountdown - временно отключен для тестирования
    // startCountdown(session, countdownElement) {
    //     const sessionId = session.element.getAttribute('data-agenda-item');
    //     const overlayElement = session.element.querySelector('[data-next-redirect]');
    //     const countdownTime = parseInt(overlayElement.getAttribute('data-next-redirect') || '15');
    //     let remaining = countdownTime;
    //     
    //     countdownElement.textContent = remaining;
    //     
    //     const timer = setInterval(() => {
    //         remaining--;
    //         countdownElement.textContent = remaining;
    //         
    //         if (remaining <= 0) {
    //             clearInterval(timer);
    //             this.redirectToNextSession(sessionId);
    //         }
    //     }, 1000);
    //     
    //     this.countdownTimers.set(sessionId, timer);
    // }
    
    cancelOverlay(sessionId) {
        const overlayData = this.activeOverlays.get(sessionId);
        if (overlayData) {
            overlayData.element.style.display = 'none';
            this.activeOverlays.delete(sessionId);
            console.log('Overlay cancelled for session:', sessionId);
        }
        
        // Очищаем таймеры если есть
        if (this.countdownTimers.has(sessionId)) {
            clearInterval(this.countdownTimers.get(sessionId));
            this.countdownTimers.delete(sessionId);
        }
    }
    
    redirectToNextSession(sessionId) {
        const overlayData = this.activeOverlays.get(sessionId);
        if (overlayData && overlayData.nextSession) {
            const nextSessionLink = overlayData.nextSession.element.querySelector('a');
            if (nextSessionLink) {
                window.location.href = nextSessionLink.href;
            }
        }
    }
    
    // Публичные методы для тестирования
    getActiveOverlays() {
        return Array.from(this.activeOverlays.keys());
    }
    
    forceShowOverlay(sessionId) {
        const session = this.sessionManager.sessions.find(s => 
            s.element.getAttribute('data-agenda-item') === sessionId
        );
        if (session) {
            this.showOverlayForSession(session);
        }
    }
    
    destroy() {
        // Очищаем все таймеры
        this.countdownTimers.forEach(timer => clearInterval(timer));
        this.countdownTimers.clear();
        this.activeOverlays.clear();
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
