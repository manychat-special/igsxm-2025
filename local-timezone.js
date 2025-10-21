document.addEventListener("DOMContentLoaded", function () {
  const timeFmt = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateFmt = { month: "short", day: "numeric" };

  // Check if Luxon is available
  const hasLuxon = typeof luxon !== 'undefined';

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
    
    // Try Luxon first
    if (hasLuxon) {
      try {
        let iso = normalizeToIso(str);
        if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00";
        return luxon.DateTime.fromISO(iso, { zone: 'America/Los_Angeles' }).toJSDate();
      } catch (e) {
        console.warn('Luxon parsing failed, using fallback:', e);
      }
    }
    
    // Fallback to original logic
    let iso = normalizeToIso(str);
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00";
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  // Make parseAsPDT available globally for other scripts
  window.parseAsPDT = parseAsPDT;

  // Return local timezone abbreviation with Luxon fallback
  function getUserTzAbbr() {
    // Try Luxon with ZZZZ format
    if (hasLuxon) {
      try {
        const now = luxon.DateTime.now();
        const abbr = now.toFormat('ZZZZ');
        // Use ZZZZ result (either short abbreviation or full IANA name)
        if (abbr && !abbr.match(/^[+-]\d{2}:\d{2}$/)) {
          return abbr;
        }
      } catch (e) {
        console.warn('Luxon timezone detection failed, using fallback:', e);
      }
    }
    
    // Fallback to original hardcoded logic
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
    if (tzIana === "Australia/Brisbane" || tzIana === "Australia/Lindeman") return "AEST";
    if (tzIana === "Australia/Adelaide") return "ACDT";
    if (tzIana === "Australia/Perth") return "AWST";
    if (tzIana === "Australia/Darwin") return "ACST";
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

  // Render one session with Luxon support
  function renderOne(session) {
    const startAttr = session.getAttribute("data-start-time");
    const endAttr   = session.getAttribute("data-end-time");
    
    let start, end;
    
    // Try Luxon first for better timezone handling
    if (hasLuxon) {
      try {
        if (startAttr && startAttr.includes('October')) {
          // Handle October format with Luxon
          const isoStart = startAttr.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
          const [datePart, timePart] = isoStart.split(' ');
          const [month, day] = datePart.split(' ');
          const formattedStart = `2025-10-${day.padStart(2, '0')}T${timePart}`;
          start = luxon.DateTime.fromISO(formattedStart, { zone: 'America/Los_Angeles' }).toJSDate();
        } else {
          start = parseAsPDT(startAttr);
        }
        
        if (endAttr && endAttr.includes('October')) {
          // Handle October format with Luxon
          const isoEnd = endAttr.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
          const [datePart, timePart] = isoEnd.split(' ');
          const [month, day] = datePart.split(' ');
          const formattedEnd = `2025-10-${day.padStart(2, '0')}T${timePart}`;
          end = luxon.DateTime.fromISO(formattedEnd, { zone: 'America/Los_Angeles' }).toJSDate();
        } else {
          end = parseAsPDT(endAttr);
        }
      } catch (e) {
        console.warn('Luxon rendering failed, using fallback:', e);
        // Fall through to original logic
      }
    }
    
    // Fallback to original logic if Luxon failed or not available
    if (!start || !end) {
      if (startAttr && startAttr.includes('October')) {
        // For October format, manually add PDT timezone
        const isoStart = startAttr.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
        const [datePart, timePart] = isoStart.split(' ');
        const [month, day] = datePart.split(' ');
        const formattedStart = `2025-10-${day.padStart(2, '0')}T${timePart}-07:00`;
        start = new Date(formattedStart);
      } else {
        start = parseAsPDT(startAttr);
      }
      
      if (endAttr && endAttr.includes('October')) {
        // For October format, manually add PDT timezone
        const isoEnd = endAttr.replace('October', '2025-10').replace(' AM', '').replace(' PM', '');
        const [datePart, timePart] = isoEnd.split(' ');
        const [month, day] = datePart.split(' ');
        const formattedEnd = `2025-10-${day.padStart(2, '0')}T${timePart}-07:00`;
        end = new Date(formattedEnd);
      } else {
        end = parseAsPDT(endAttr);
      }
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