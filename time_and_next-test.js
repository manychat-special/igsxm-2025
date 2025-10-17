/*───────────────────────────────
 * Unified Time + Upcoming Manager
 *───────────────────────────────*/

document.addEventListener("DOMContentLoaded", function () {
  const timeFmt = { hour: "2-digit", minute: "2-digit", hour12: false };
  const dateFmt = { month: "short", day: "numeric" };

  // Normalize "YYYY-MM-DD H:m[:ss]" → ISO
  function normalizeToIso(str) {
    if (!str) return null;
    if (str.includes("T")) return str;
    const [d, t = "00:00"] = str.trim().split(/\s+/);
    let [h = "00", m = "00", s = "00"] = t.split(":");
    return `${d}T${h.padStart(2,"0")}:${m.padStart(2,"0")}:${s.padStart(2,"0")}`;
  }

  // Parse as fixed PDT (UTC−07:00)
  function parseAsPDT(str) {
    if (!str) return null;
    let iso = normalizeToIso(str);
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00"; // add only if absent
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  // Timezone abbreviation
  function getUserTzAbbr() {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const map = {
      "Asia/Kuala_Lumpur": "MYT", "Asia/Singapore": "SGT", "Asia/Seoul": "KST",
      "Asia/Tokyo": "JST", "Asia/Hong_Kong": "HKT", "Asia/Shanghai": "CST",
      "Asia/Bangkok": "ICT", "Asia/Ho_Chi_Minh": "ICT", "Asia/Dubai": "GST",
      "Asia/Kolkata": "IST", "America/Los_Angeles": "PDT", "America/New_York": "EDT",
      "America/Chicago": "CDT", "America/Denver": "MDT"
    };
    if (map[tz]) return map[tz];
    const offset = -new Date().getTimezoneOffset()/60;
    return `GMT${offset>=0?`+${offset}`:offset}`;
  }

  /*───────────────────────────────
   * Render local time for session
   *───────────────────────────────*/
  function updateText(el,val){ if(el && el.textContent!==val) el.textContent=val; }

  function renderOne(session){
    const startAttr=session.getAttribute("data-start-time");
    const endAttr=session.getAttribute("data-end-time");
    const start=parseAsPDT(startAttr);
    const end=parseAsPDT(endAttr);
    if(!start||!end)return;
    const startTime=start.toLocaleTimeString([],timeFmt);
    const endTime=end.toLocaleTimeString([],timeFmt);
    const dateText=start.toLocaleDateString(undefined,dateFmt);
    const tz=getUserTzAbbr();
    updateText(session.querySelector('[data-time-copy="start"]'),startTime);
    updateText(session.querySelector('[data-time-copy="end"]'),endTime);
    updateText(session.querySelector('[data-time-copy="date"]'),dateText);
    updateText(session.querySelector('[data-time-copy="tz"]'),`\u00A0${tz}`);
  }

  function renderAllSessions(){
    document.querySelectorAll("[data-agenda-item]").forEach(renderOne);
  }

  window.renderAllSessions=renderAllSessions;
  window.parseAsPDT=parseAsPDT;

  renderAllSessions();
  window.addEventListener("load",()=>{renderAllSessions();setTimeout(renderAllSessions,300);});

  /*───────────────────────────────
   * Upcoming Sessions (UTC compare)
   *───────────────────────────────*/
  class UpcomingSessionsManager{
    constructor(){
      this.containers=[];
      this.interval=null;
      this.checkInterval=30000;
      this.init();
    }

    init(){
      this.findContainers();
      this.updateAllContainers();
      this.startPeriodicUpdates();
      document.addEventListener("visibilitychange",()=>{if(!document.hidden)this.updateAllContainers();});
      window.addEventListener("load",()=>{setTimeout(()=>this.updateAllContainers(),300);});
    }

    findContainers(){
      this.containers=Array.from(document.querySelectorAll("[data-upcoming-sessions]")).map(el=>({
        el,limit:parseInt(el.getAttribute("data-upcoming-sessions"))||3
      }));
    }

    // Only for comparison, not display
    parseToUtcTimestamp(timeStr){
      if(!timeStr)return null;
      const date=parseAsPDT(timeStr); // ✅ use same logic, returns PDT Date
      return date?date.getTime():null; // convert to UTC timestamp
    }

    updateContainer(container){
      const sessions=Array.from(container.el.querySelectorAll("[data-agenda-item]"));
      const nowUtc=Date.now();

      const upcoming=sessions
        .map(s=>({el:s,startUtc:this.parseToUtcTimestamp(s.getAttribute("data-start-time"))}))
        .filter(x=>x.startUtc && x.startUtc>nowUtc)
        .sort((a,b)=>a.startUtc-b.startUtc)
        .map(x=>x.el);

      sessions.forEach(s=>s.style.display="none");
      upcoming.slice(0,container.limit).forEach(s=>s.style.display="");

      // после фильтрации — пересчёт времени
      window.renderAllSessions();
    }

    updateAllContainers(){ this.containers.forEach(c=>this.updateContainer(c)); }
    startPeriodicUpdates(){ this.interval=setInterval(()=>this.updateAllContainers(),this.checkInterval); }
  }

  window.upcomingManager=new UpcomingSessionsManager();
});
