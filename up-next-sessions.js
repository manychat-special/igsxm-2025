/**
 * Upcoming Sessions Manager (PDT comparison version)
 * — сравнивает текущее локальное время, переведённое в PDT (UTC−7)
 * — показывает ближайшие N сессий, которые ещё не начались
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

  // переводим локальное время в PDT
  getNowInPDT() {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    // PDT = UTC−7 => -7 * 60 * 60 * 1000
    return new Date(utc - 7 * 60 * 60 * 1000);
  }

  parseSessionTime(str) {
    // используем уже существующую функцию, если она есть
    if (window.parseAsPDT) return window.parseAsPDT(str);
    // иначе парсим ISO с фиксированным смещением -07:00
    if (!str) return null;
    let iso = str.includes("T") ? str : str.replace(" ", "T");
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00";
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  updateContainer(container) {
    const sessions = Array.from(container.el.querySelectorAll("[data-agenda-item]"));
    const nowPDT = this.getNowInPDT();

    // отфильтруем сессии, которые ещё не начались
    const upcoming = sessions
      .map(s => ({
        el: s,
        start: this.parseSessionTime(s.getAttribute("data-start-time"))
      }))
      .filter(x => x.start && x.start > nowPDT)
      .sort((a, b) => a.start - b.start)
      .map(x => x.el);

    // скрываем всё
    sessions.forEach(s => (s.style.display = "none"));
    // показываем только N ближайших
    upcoming.slice(0, container.limit).forEach(s => (s.style.display = ""));
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
