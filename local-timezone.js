document.addEventListener("DOMContentLoaded", function () {
  const timeFmt = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateFmt = { month: "short", day: "numeric" };

  // Normalize "YYYY-MM-DD H:m[:ss]" → "YYYY-MM-DDTHH:mm:ss"
  function normalizeToIso(str) {
    if (!str) return null;
    if (str.includes("T")) return str;
    const [d, t = "00:00"] = str.trim().split(/\s+/);
    let [h = "00", m = "00", s = "00"] = t.split(":");
    return `${d}T${h.padStart(2,"0")}:${m.padStart(2,"0")}:${s.padStart(2,"0")}`;
  }

  // Parse as fixed PDT (UTC−07:00) if no timezone provided
  function parseAsPDT(str) {
    if (!str) return null;
    let iso = normalizeToIso(str);
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00";
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  // Make parseAsPDT available globally for other scripts
  window.parseAsPDT = parseAsPDT;

  // Return local timezone abbreviation (fixed for Oct 22–23, 2025)
  function getUserTzAbbr() {
    const tzIana = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Europe (DST still active in late Oct)
    if (tzIana.startsWith("Europe/")) {
      if (tzIana === "Europe/London" || tzIana === "Europe/Dublin") return "BST";
      if (tzIana === "Europe/Lisbon") return "WEST";
      if (tzIana === "Europe/Moscow") return "MSK";
      if (tzIana === "Atlantic/Reykjavik") return "GMT";
      return "CEST";
    }

    // Asia (no DST)
    if (tzIana === "Asia/Kuala_Lumpur") return "MYT";
    if (tzIana === "Asia/Singapore") return "SGT";
    if (tzIana === "Asia/Seoul") return "KST";
    if (tzIana === "Asia/Tokyo") return "JST";
    if (tzIana === "Asia/Hong_Kong") return "HKT";
    if (tzIana === "Asia/Shanghai") return "CST";
    if (tzIana === "Asia/Bangkok" || tzIana === "Asia/Ho_Chi_Minh") return "ICT";
    if (tzIana === "Asia/Dubai") return "GST";
    if (tzIana === "Asia/Kolkata") return "IST";

    // North America (DST active until early Nov)
    if (tzIana === "America/Los_Angeles") return "PDT";
    if (tzIana === "America/New_York" || tzIana === "America/Toronto") return "EDT";
    if (tzIana === "America/Chicago") return "CDT";
    if (tzIana === "America/Denver") return "MDT";

    // Australia (DST active in some regions)
    if (tzIana.startsWith("Australia/")) return "AEDT";

    // Fallback: GMT±X (City)
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    const offsetLabel = `GMT${offset >= 0 ? "+" + offset : offset}`;
    const city = tzIana.split("/")[1]?.replace("_", " ") || "";
    return city ? `${offsetLabel} (${city})` : offsetLabel;
  }

  // Update text only if value changed
  function updateText(el, val) {
    if (el && el.textContent !== val) el.textContent = val;
  }

  // Render one session
  function renderOne(session) {
    const startAttr = session.getAttribute("data-start-time");
    const endAttr   = session.getAttribute("data-end-time");
    
    // Use new Date() for October format, parseAsPDT for YYYY-MM-DD format
    let start, end;
    if (startAttr && startAttr.includes('October')) {
      start = new Date(startAttr);
    } else {
      start = parseAsPDT(startAttr);
    }
    
    if (endAttr && endAttr.includes('October')) {
      end = new Date(endAttr);
    } else {
      end = parseAsPDT(endAttr);
    }
    
    if (!start || !end) return;

    const startTime = start.toLocaleTimeString([], timeFmt);
    const endTime   = end.toLocaleTimeString([], timeFmt);
    const dateText  = start.toLocaleDateString(undefined, dateFmt);
    const tzAbbr    = getUserTzAbbr();

    updateText(session.querySelector('[data-time-copy="start"]'), startTime);
    updateText(session.querySelector('[data-time-copy="end"]'),   endTime);
    updateText(session.querySelector('[data-time-copy="date"]'),  dateText);
    updateText(session.querySelector('[data-time-copy="tz"]'),    `\u00A0${tzAbbr}`);
  }

  // Render all sessions
  function renderAll() {
    document.querySelectorAll("[data-agenda-item]").forEach(renderOne);
  }

  // Initial and delayed renders for Webflow dynamic loading
  renderAll();
  window.addEventListener("load", () => {
    renderAll();
    setTimeout(renderAll, 200);
    setTimeout(renderAll, 1000);
  });
});