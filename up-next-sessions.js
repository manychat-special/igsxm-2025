/**
 * Upcoming Sessions Manager (UTC comparison version)
 * — сравнивает время в UTC: текущее время vs время сессий (PDT = UTC-7)
 * — показывает ближайшие N сессий, которые ещё не начались
 * — работает корректно в любой временной зоне
 */

class UpcomingSessionsManager {
  constructor() {
    this.containers = [];
    this.interval = null;
    this.checkInterval = 30000; // каждые 30 сек
    this.init();
  }

  init() {
    this.findContainers();
    this.updateAllContainers();
    this.startPeriodicUpdates();

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) this.updateAllContainers();
    });

    // запасные вызовы после загрузки
    window.addEventListener("load", () => {
      setTimeout(() => this.updateAllContainers(), 300);
      setTimeout(() => this.updateAllContainers(), 1500);
    });
  }

  findContainers() {
    this.containers = Array.from(document.querySelectorAll("[data-upcoming-sessions]")).map(el => ({
      el,
      limit: parseInt(el.getAttribute("data-upcoming-sessions")) || 3
    }));
  }

  // Парсим время сессии в UTC timestamp (PDT = UTC-7)
  parseTimeToUTC(timeStr) {
    if (!timeStr) return null;
    // Добавляем PDT timezone: "2025-10-17 5:40" → "2025-10-17T5:40-07:00"
    const iso = timeStr.replace(" ", "T") + "-07:00";
    const date = new Date(iso);
    return isNaN(date) ? null : date.getTime(); // возвращаем UTC timestamp
  }

  updateContainer(container) {
    const sessions = Array.from(container.el.querySelectorAll("[data-agenda-item]"));
    const nowUTC = new Date().getTime(); // текущее время в UTC

    // отфильтруем сессии, которые ещё не начались
    const upcoming = sessions
      .map(s => ({
        el: s,
        startUTC: this.parseTimeToUTC(s.getAttribute("data-start-time"))
      }))
      .filter(x => x.startUTC && x.startUTC > nowUTC)
      .sort((a, b) => a.startUTC - b.startUTC)
      .map(x => x.el);

    // скрываем всё
    sessions.forEach(s => (s.style.display = "none"));
    // показываем только N ближайших и обновляем время
    upcoming.slice(0, container.limit).forEach(s => {
      s.style.display = "";
      // Обновляем время для этой сессии в локальном формате
      if (window.renderOne) window.renderOne(s);
    });
  }

  updateAllContainers() {
    this.containers.forEach(c => this.updateContainer(c));
  }

  startPeriodicUpdates() {
    this.interval = setInterval(() => this.updateAllContainers(), this.checkInterval);
  }

  destroy() {
    if (this.interval) clearInterval(this.interval);
  }
}

// запуск
document.addEventListener("DOMContentLoaded", () => {
  window.upcomingManager = new UpcomingSessionsManager();
});
