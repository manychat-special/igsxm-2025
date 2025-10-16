/**
 * Simple Next Session Overlay Manager
 * Простой скрипт для показа оверлея когда сессия заканчивается
 */
class NextSessionOverlayManager {
    constructor() {
        this.overlayElement = null;
        this.currentTimer = null;
        this.checkInterval = null;
        this.progressTimer = null; // Таймер для прогресс-бара
        
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
            title: el.getAttribute('data-agenda-title') || 'Untitled Session', // Получаем название сессии
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
        
        // Настраиваем ссылку и название только если есть следующая сессия
        const linkElement = this.overlayElement.querySelector('[data-next-redirect-link]');
        const titleElement = this.overlayElement.querySelector('[data-next-redirect-title]');
        
        if (nextSession) {
            // Настраиваем ссылку
            if (linkElement) {
                // Берем текущий URL и заменяем только slug в конце
                const currentUrl = window.location.href;
                const urlParts = currentUrl.split('/');
                urlParts[urlParts.length - 1] = nextSession.slug; // Заменяем последнюю часть на новый slug
                const newUrl = urlParts.join('/');
                
                linkElement.href = newUrl;
                linkElement.style.display = '';
                console.log(`Next session link set to: ${newUrl}`);
            }
            
            // Настраиваем название
            if (titleElement) {
                titleElement.textContent = nextSession.title;
                titleElement.style.display = '';
                console.log(`Next session title set to: ${nextSession.title}`);
            }
        } else {
            // Скрываем элементы если нет следующей сессии
            if (linkElement) {
                linkElement.style.display = 'none';
            }
            if (titleElement) {
                titleElement.style.display = 'none';
            }
            console.log('No next session found, hiding link and title');
        }
        
        // Скрываем оверлей
        this.overlayElement.style.display = 'none';
        
        // Показываем оверлей
        this.overlayElement.style.display = 'block';
        
        // Настраиваем кнопку отмены
        this.setupCancelButton();
        
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
        
        // Устанавливаем начальное состояние (iOS drawer стиль)
        gsap.set(this.overlayElement, {
            y: '100%', // Полностью ниже экрана
            scale: 0.95 // Легкое уменьшение для эффекта глубины
        });
        
        // Анимация появления снизу (iOS drawer стиль)
        gsap.to(this.overlayElement, {
            y: '0%',
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
            delay: 0.1
        });
        
        console.log('Overlay animation started (iOS drawer style)');
    }
    
    setupCancelButton() {
        const cancelButton = this.overlayElement.querySelector('[data-next-redirect-cancel]');
        
        if (!cancelButton) {
            console.log('No cancel button found with [data-next-redirect-cancel]');
            return;
        }
        
        // Удаляем предыдущие обработчики
        cancelButton.onclick = null;
        
        // Добавляем новый обработчик
        cancelButton.onclick = () => {
            console.log('Cancel button clicked - hiding overlay');
            this.hideOverlayWithAnimation();
        };
        
        console.log('Cancel button setup complete');
    }
    
    hideOverlayWithAnimation() {
        // Проверяем, что GSAP доступен
        if (typeof gsap === 'undefined') {
            console.log('GSAP not available, hiding overlay without animation');
            this.hideOverlay();
            return;
        }
        
        // Анимация скрытия вниз (iOS drawer стиль)
        gsap.to(this.overlayElement, {
            y: '100%', // Полностью уходит вниз
            scale: 0.95, // Легкое уменьшение
            duration: 0.4,
            ease: "power2.in",
            onComplete: () => {
                this.hideOverlay();
            }
        });
        
        console.log('Overlay hide animation started (iOS drawer style)');
    }
    
    startProgressBar(durationMs, linkElement) {
        const progressElement = this.overlayElement.querySelector('[data-next-redirect-progress]');
        
        if (!progressElement) {
            console.log('No progress bar found with [data-next-redirect-progress]');
            return;
        }
        
        // Всегда сбрасываем прогресс-бар до 0
        progressElement.style.width = '0%';
        progressElement.style.transition = 'none'; // Отключаем CSS transitions
        
        // Небольшая задержка перед началом анимации
        this.progressTimer = setTimeout(() => {
            // Включаем плавную анимацию
            progressElement.style.transition = `width ${durationMs}ms linear`;
            progressElement.style.width = '100%';
            
            // Таймер для редиректа
            this.progressTimer = setTimeout(() => {
                console.log('Progress bar completed - redirecting...');
                if (linkElement && linkElement.href) {
                    window.location.href = linkElement.href;
                }
            }, durationMs);
        }, 100);
        
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
        
        // Очищаем все таймеры
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
