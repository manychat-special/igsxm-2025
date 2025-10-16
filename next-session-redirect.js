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
        
        // Анимация появления снизу с баунсом через GSAP
        this.animateOverlayIn();
        
        // Получаем время показа из атрибута data-next-redirect (по умолчанию 15 секунд)
        const displayTime = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
        const displayTimeMs = displayTime * 1000;
        
        console.log(`Overlay shown - session ended, will hide in ${displayTime} seconds`);
        
        // Запускаем прогресс-бар и автоматический редирект
        this.startProgressBar(displayTimeMs, linkElement);
    }
    
    animateOverlayIn() {
        // Проверяем, что GSAP доступен
        if (typeof gsap === 'undefined') {
            console.log('GSAP not available, skipping animation');
            return;
        }
        
        // Устанавливаем начальное состояние
        gsap.set(this.overlayElement, {
            y: 100,
            opacity: 0,
            scale: 0.9
        });
        
        // Анимация появления снизу с баунсом
        gsap.to(this.overlayElement, {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.6,
            ease: "back.out(1.7)",
            delay: 0.1
        });
        
        console.log('Overlay animation started');
    }
    
    startProgressBar(durationMs, linkElement) {
        const progressElement = this.overlayElement.querySelector('[data-next-redirect-progress]');
        
        if (!progressElement) {
            console.log('No progress bar found with [data-next-redirect-progress]');
            return;
        }
        
        // Сбрасываем прогресс-бар
        progressElement.style.width = '0%';
        
        // Анимация прогресс-бара через requestAnimationFrame (более плавная для прогресс-бара)
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / durationMs) * 100, 100);
            
            progressElement.style.width = `${progress}%`;
            
            if (progress < 100) {
                requestAnimationFrame(animate);
            } else {
                // Прогресс-бар достиг 100% - делаем редирект
                console.log('Progress bar completed - redirecting...');
                if (linkElement && linkElement.href) {
                    window.location.href = linkElement.href;
                }
            }
        };
        
        // Запускаем анимацию
        requestAnimationFrame(animate);
        
        console.log(`Progress bar started for ${durationMs}ms`);
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
