// =============================
// Agenda Timezone Switcher
// =============================

document.addEventListener("DOMContentLoaded", function () {
    const timeEls = document.querySelectorAll('[data-timezone="time"]');
    const tzLabelEls = document.querySelectorAll('[data-timezone="timezone"]');
    const userTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const PDT_OFFSET_HOURS = 7; // fixed PDT (UTC-7)
  
    // Format Date object into "hh:mm am/pm"
    function formatTimeLower(date, tz) {
      if (!(date instanceof Date) || isNaN(date)) return "";
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: tz,
      })
        .format(date)
        .replace("AM", "am")
        .replace("PM", "pm");
    }
  
    // Convert PDT string (from Webflow) to UTC Date object
    function pdtLocalToUTC(raw) {
      if (!raw) return null;
      const m = raw.match(
        /^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})\s*(am|pm)$/i
      );
      if (!m) return null;
      let [_, y, mo, d, hh, mm, mer] = m;
      y = Number(y);
      mo = Number(mo);
      d = Number(d);
      hh = Number(hh);
      mm = Number(mm);
      mer = mer.toLowerCase();
      if (mer === "pm" && hh < 12) hh += 12;
      if (mer === "am" && hh === 12) hh = 0;
      const utcMs =
        Date.UTC(y, mo - 1, d, hh, mm) + PDT_OFFSET_HOURS * 3600 * 1000;
      return new Date(utcMs);
    }
  
    // Initialize times
    timeEls.forEach((el) => {
      const raw = el.getAttribute("data-datetime");
      const utcDate = pdtLocalToUTC(raw);
      if (!utcDate) {
        console.warn("Invalid datetime:", raw);
        return;
      }
      el.dataset.pdtDisplay = formatTimeLower(utcDate, "America/Los_Angeles");
      el.dataset.localDisplay = formatTimeLower(utcDate, userTZ);
      el.textContent = el.dataset.pdtDisplay; // default to PDT
    });
  
    // Initialize timezone labels
    tzLabelEls.forEach((el) => {
      el.dataset.pdtLabel = "\u00A0PDT"; // &nbsp;PDT
      el.dataset.localLabel = "\u00A0Local"; // &nbsp;Local
      el.textContent = el.dataset.pdtLabel;
    });
  
    // Collect all switcher buttons
    const switchers = document.querySelectorAll("button[data-timezone]");
  
    // Event delegation for clicks (handles nested divs inside buttons)
    document.addEventListener("click", function (e) {
      const btn = e.target.closest("button[data-timezone]");
      if (!btn) return;
  
      e.preventDefault();
      const mode = btn.getAttribute("data-timezone");
  
      // Update times
      timeEls.forEach((el) => {
        el.textContent =
          mode === "local" ? el.dataset.localDisplay : el.dataset.pdtDisplay;
      });
  
      // Update timezone labels
      tzLabelEls.forEach((el) => {
        el.textContent =
          mode === "local" ? el.dataset.localLabel : el.dataset.pdtLabel;
      });
  
      // Update active class
      switchers.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });