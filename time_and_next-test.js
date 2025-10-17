/* ────────────────────────────────────────────────
 *  TIMEZONE & UPCOMING SESSIONS MANAGER (Unified)
 *  — локализует время в элементе
 *  — синхронно фильтрует ближайшие N сессий
 *  — полностью автономен и работает в любой зоне
 * ──────────────────────────────────────────────── */

document.addEventListener("DOMContentLoaded", function () {
  /*───────────────────────────────────────────────
   *  1. Вспомогательные функции для времени
   *───────────────────────────────────────────────*/
  const timeFmt = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateFmt = { month: "short", day: "numeric" };

  function normalizeToIso(str) {
    if (!str) return null;
    if (str.includes("T")) return str;
    const [d, t = "00:00"] = str.trim().split(/\s+/);
    let [h = "00", m = "00", s = "00"] = t.split(":");
    return `${d}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}`;
  }

  // Parse string as PDT (UTC−07:00)
  function parseAsPDT(str) {
    if (!str) return null;
    let iso = normalizeToIso(str);
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00";
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  // Timezone abbreviation
  function getUserTzAbbr() {
    const tzIana = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tzIana.startsWith("Europe/")) {
      if (tzIana === "Europe/London" || tzIana === "Europe/Dublin") return "BST";
      if (tzIana === "Europe/Lisbon") return "WEST";
      if (tzIana === "Europe/Moscow") return "MSK";
      if (tzIana === "Atlantic/Reykjavik") return "GMT";
      return "CEST";
    }
    if (tzIana === "Asia/Kuala_Lumpur") return "MYT";
    if (tzIana === "Asia/Singapore") return "SGT";
    if (tzIana === "Asia/Seoul") return "KST";
    if (tzIana === "Asia/Tokyo") return "JST";
    if (tzIana === "Asia/Hong_Kong") return "HKT";
    if (tzIana === "Asia/Shanghai") return "CST";
    if (tzIana === "Asia/Bangkok" || tzIana === "Asia/Ho_Chi_Minh") return "ICT";
    if (tzIana === "Asia/Dubai") return "GST";
    if (tzIana === "Asia/Kolkata") return "IST";
    if (tzIana === "America/Los_Angeles") return "PDT";
    if (tzIana === "America/New_York" || tzIana === "America/Toronto") return "EDT";
    if (tzIana === "America/Chicago") return "CDT";
    if (tzIana === "America/Denver") return "MDT";
    if (tzIana.startsWith("Australia/")) return "AEDT";
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    const offsetLabel = `GMT${offset >= 0 ? "+" + offset : offset}`;
    const city = tzIana.split("/")[1]?.replace("_", " ") || "";
    return city ? `${offsetLabel} (${city})` : offsetLabel;
  }

  /*───────────────────────────────────────────────
   *  2. Отображение времени (локализация)
   *───────────────────────────────────────────────*/
  function updateText(el, val) {
    if (el && el.textContent !== val) el.textContent = val;
  }

  function renderOne(session) {
    const startAttr = session.getAttribute("data-start-time");
    const endAttr = session.getAttribute("data-end-time");
    let start = parseAsPDT(startAttr);
    let end = parseAsPDT(endAttr);
    if (!start || !end) return;

    const startTime = start.toLocaleTimeString([], timeFmt);
    const endTime = end.toLocaleTimeString([], timeFmt);
    const dateText = start.toLocaleDateString(undefined, dateFmt);
    const tzAbbr = getUserTzAbbr();

    updateText(session.querySelector('[data-time-copy="start"]'), startTime);
    updateText(session.querySelector('[data-time-copy="end"]'), endTime);
    updateText(session.querySelector('[data-time-copy="date"]'), dateText);
    updateText(session.querySelector('[data-time-copy="tz"]'), `\u00A0${tzAbbr}`);
  }

  function renderAllSessions() {
    document.querySelectorAll("[data-agenda-item]").forEach(renderOne);
  }

  // Делаем доступным глобально
  window.renderAllSessions = renderAllSessions;
  window.parseAsPDT = parseAsPDT;

  // Первичная отрисовка
  renderAllSessions();
  window.addEventListener("load", () => {
    renderAllSessions();
    setTimeout(renderAllSessions, 300);
    setTimeout(renderAllSessions, 1500);
  });

  /*───────────────────────────────────────────────
   *  3. Upcoming Sessions Manager (фильтрация)
   *───────────────────────────────────────────────*/
  class UpcomingSessionsManager {
    constructor() {
      this.containers = [];
      this.interval = null;
      this.checkInterval = 30000;
      this.init();
    }

    init() {
      this.findContainers();
      this.updateAllContainers();
      this.startPeriodicUpdates();

      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) this.updateAllContainers();
      });

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

    parseTimeToUTC(timeStr) {
      if (!timeStr) return null;
      const iso = timeStr.replace(" ", "T") + "-07:00";
      const date = new Date(iso);
      return isNaN(date) ? null : date.getTime();
    }

    updateContainer(container) {
      const sessions = Array.from(container.el.querySelectorAll("[data-agenda-item]"));
      const nowUTC = new Date().getTime();

      const upcoming = sessions
        .map(s => ({
          el: s,
          startUTC: this.parseTimeToUTC(s.getAttribute("data-start-time"))
        }))
        .filter(x => x.startUTC && x.startUTC > nowUTC)
        .sort((a, b) => a.startUTC - b.startUTC)
        .map(x => x.el);

      sessions.forEach(s => (s.style.display = "none"));
      upcoming.slice(0, container.limit).forEach(s => (s.style.display = ""));

      // 🔁 После любого обновления — пересчитать локальное время
      if (window.renderAllSessions) window.renderAllSessions();
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

  // Запуск
  window.upcomingManager = new UpcomingSessionsManager();
});
