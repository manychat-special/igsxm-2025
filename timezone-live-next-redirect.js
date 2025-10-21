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
    
    // Handle "October 16, 2025 9:10 AM" format
    if (str.includes("October") || str.includes("November") || str.includes("December") || 
        str.includes("January") || str.includes("February") || str.includes("March") ||
        str.includes("April") || str.includes("May") || str.includes("June") ||
        str.includes("July") || str.includes("August") || str.includes("September")) {
      // Parse as PDT by adding timezone offset
      const d = new Date(str + " PDT");
      if (!isNaN(d)) return d;
    }
    
    let iso = normalizeToIso(str);
    if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) iso += "-07:00"; // add only if absent
    const d = new Date(iso);
    return isNaN(d) ? null : d;
  }

  // Timezone abbreviation
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
    if (tzIana === "Australia/Brisbane" || tzIana === "Australia/Lindeman") return "AEST";
    if (tzIana.startsWith("Australia/")) return "AEDT";

    // Fallback: GMT±X (City)
    const now = new Date();
    const offset = -now.getTimezoneOffset() / 60;
    const offsetLabel = `GMT${offset >= 0 ? "+" + offset : offset}`;
    const city = tzIana.split("/")[1]?.replace("_", " ") || "";
    return city ? `${offsetLabel} (${city})` : offsetLabel;
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
      const toShow=upcoming.slice(0,container.limit);
      toShow.forEach(s=>s.style.display="");

      // toggle container visibility when empty
      container.el.style.display = toShow.length ? "" : "none";

      // после фильтрации — пересчёт времени
      window.renderAllSessions();
    }

    updateAllContainers(){ this.containers.forEach(c=>this.updateContainer(c)); }
    startPeriodicUpdates(){ this.interval=setInterval(()=>this.updateAllContainers(),this.checkInterval); }
  }

  window.upcomingManager=new UpcomingSessionsManager();
  
  /*───────────────────────────────
   * Live Sessions (start <= now < end)
   *───────────────────────────────*/
  class LiveSessionsManager{
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
      this.containers=Array.from(document.querySelectorAll("[data-live-sessions]")).map(el=>({
        el,limit:parseInt(el.getAttribute("data-live-sessions"))||3
      }));
    }

    parseToUtcTimestamp(timeStr){
      if(!timeStr)return null;
      const date=parseAsPDT(timeStr);
      return date?date.getTime():null;
    }

    updateContainer(container){
      const sessions=Array.from(container.el.querySelectorAll("[data-agenda-item]"));
      const nowUtc=Date.now();

      const live=sessions
        .map(s=>({
          el:s,
          startUtc:this.parseToUtcTimestamp(s.getAttribute("data-start-time")),
          endUtc:this.parseToUtcTimestamp(s.getAttribute("data-end-time"))
        }))
        .filter(x=>x.startUtc!=null && x.endUtc!=null && x.startUtc<=nowUtc && nowUtc<x.endUtc)
        .sort((a,b)=>a.startUtc-b.startUtc)
        .map(x=>x.el);

      sessions.forEach(s=>s.style.display="none");
      const toShow=live.slice(0,container.limit);
      toShow.forEach(s=>s.style.display="");

      // toggle container visibility when empty
      container.el.style.display = toShow.length ? "" : "none";

      // после фильтрации — пересчёт времени
      window.renderAllSessions();
    }

    updateAllContainers(){ this.containers.forEach(c=>this.updateContainer(c)); }
    startPeriodicUpdates(){ this.interval=setInterval(()=>this.updateAllContainers(),this.checkInterval); }
  }

  window.liveManager=new LiveSessionsManager();
  
  /*───────────────────────────────
   * Next Session Overlay (UTC compare via parseAsPDT)
   *───────────────────────────────*/
  class NextSessionOverlayManager{
    constructor(){
      this.overlayElement=null;
      this.currentTimer=null;
      this.checkInterval=null;
      this.progressTimer=null;
      this.shownSessions=new Set();
      this.init();
    }

    init(){
      this.overlayElement=document.querySelector('[data-next-redirect]');
      if(!this.overlayElement)return;
      this.overlayElement.style.display='none';
      this.startChecking();
    }

    startChecking(){
      this.checkInterval=setInterval(()=>{this.checkForSessionEnd();},10000);
    }

    parseToUtcTimestamp(str){
      const d=parseAsPDT(str);
      return d?d.getTime():null;
    }

    checkForSessionEnd(){
      const currentSlug=this.getCurrentSessionSlug();
      if(!currentSlug)return;
      const currentSessionElement=document.querySelector(`[data-agenda-item="${currentSlug}"]`);
      if(!currentSessionElement)return;
      const endTimeStr=currentSessionElement.getAttribute('data-end-time');
      if(!endTimeStr)return;
      const nowUtc=Date.now();
      const endUtc=this.parseToUtcTimestamp(endTimeStr);
      if(endUtc==null)return;
      const timeDiff=Math.abs(nowUtc-endUtc);
      if(timeDiff<=5000){
        const sessionId=currentSessionElement.getAttribute('data-agenda-item');
        if(!this.shownSessions.has(sessionId)){
          this.shownSessions.add(sessionId);
          this.showOverlay(currentSessionElement);
        }
      }
    }

    getCurrentSessionSlug(){
      const url=window.location.href;
      const match=url.match(/\/sessions\/([^\/\?]+)/);
      return match?match[1]:null;
    }

    getNextSession(endedSessionElement){
      const allSessions=document.querySelectorAll('[data-agenda-item]');
      const sessions=Array.from(allSessions).map(el=>({
        element:el,
        slug:el.getAttribute('data-agenda-item'),
        title:el.getAttribute('data-agenda-title')||'Untitled Session',
        startUtc:this.parseToUtcTimestamp(el.getAttribute('data-start-time')),
        endUtc:this.parseToUtcTimestamp(el.getAttribute('data-end-time'))
      }));

      const endedSession=sessions.find(s=>s.element===endedSessionElement);
      if(!endedSession||endedSession.endUtc==null)return null;
      const endedUtc=endedSession.endUtc;

      const futureSessions=sessions.filter(session=>{
        if(session.element===endedSessionElement)return false;
        if(session.startUtc==null)return false;
        const diff=Math.abs(session.startUtc-endedUtc);
        return diff<=120000; // within 2 minutes
      });

      futureSessions.sort((a,b)=>a.startUtc-b.startUtc);
      return futureSessions[0]||null;
    }

    showOverlay(endedSessionElement){
      if(!this.overlayElement)return;
      const nextSession=this.getNextSession(endedSessionElement);
      if(!nextSession)return;
      const linkElement=this.overlayElement.querySelector('[data-next-redirect-link]');
      const titleElement=this.overlayElement.querySelector('[data-next-redirect-title]');

      if(linkElement){
        const currentUrl=window.location.href;
        const urlParts=currentUrl.split('/');
        urlParts[urlParts.length-1]=nextSession.slug;
        const newUrl=urlParts.join('/');
        linkElement.href=newUrl;
        linkElement.style.display='';
      }
      if(titleElement){
        titleElement.textContent=nextSession.title;
        titleElement.style.display='';
      }

      this.overlayElement.style.display='none';
      this.overlayElement.style.display='flex';
      this.setupCancelButton();
      this.animateOverlayIn();

      const displayTime=parseInt(this.overlayElement.getAttribute('data-next-redirect'))||15;
      const displayTimeMs=displayTime*1000;
      this.startProgressBar(displayTimeMs,linkElement);
    }

    animateOverlayIn(){
      if(typeof gsap==='undefined')return;
      gsap.set(this.overlayElement,{y:'100%',scale:0.95});
      gsap.to(this.overlayElement,{y:'0%',scale:1,duration:0.5,ease:"power2.out",delay:0.1});
    }

    setupCancelButton(){
      const cancelButton=this.overlayElement.querySelector('[data-next-redirect-cancel]');
      if(!cancelButton)return;
      cancelButton.onclick=null;
      cancelButton.onclick=()=>{this.hideOverlayWithAnimation();};
    }

    hideOverlayWithAnimation(){
      if(typeof gsap==='undefined'){this.hideOverlay();return;}
      gsap.to(this.overlayElement,{y:'100%',scale:0.95,duration:0.4,ease:"power2.in",onComplete:()=>{this.hideOverlay();}});
    }

    startProgressBar(durationMs,linkElement){
      const progressElement=this.overlayElement.querySelector('[data-next-redirect-progress]');
      const countElement=this.overlayElement.querySelector('[data-next-redirect-count]');
      if(!progressElement)return;
      progressElement.style.width='0%';
      progressElement.style.transition='none';
      const totalSeconds=Math.ceil(durationMs/1000);
      let remainingSeconds=totalSeconds;
      const updateCountdown=()=>{
        if(countElement){countElement.textContent=`${remainingSeconds}S`;}
        remainingSeconds--;
      };
      updateCountdown();
      const countdownInterval=setInterval(()=>{
        updateCountdown();
        if(remainingSeconds<0){clearInterval(countdownInterval);} 
      },1000);
      this.progressTimer=setTimeout(()=>{
        progressElement.style.transition=`width ${durationMs}ms linear`;
        progressElement.style.width='100%';
        this.progressTimer=setTimeout(()=>{
          clearInterval(countdownInterval);
          if(linkElement&&linkElement.href){window.location.href=linkElement.href;}
        },durationMs);
      },100);
    }

    hideOverlay(){
      if(this.overlayElement){this.overlayElement.style.display='none';}
      if(this.currentTimer){clearTimeout(this.currentTimer);this.currentTimer=null;}
      if(this.progressTimer){clearTimeout(this.progressTimer);this.progressTimer=null;}
    }

    destroy(){
      if(this.checkInterval){clearInterval(this.checkInterval);} 
      if(this.currentTimer){clearTimeout(this.currentTimer);} 
      if(this.progressTimer){clearTimeout(this.progressTimer);} 
    }
  }

  /*───────────────────────────────
   * Additional Session Overlays (UTC compare via parseAsPDT)
   *───────────────────────────────*/
  class AdditionalSessionOverlayManager{
    constructor(){
      this.sessionEndedOverlay=null;
      this.sessionOndemandOverlay=null;
      this.checkInterval=null;
      this.shownSessions=new Set();
      this.init();
    }

    init(){
      this.sessionEndedOverlay=document.querySelector('[data-session-ended]');
      this.sessionOndemandOverlay=document.querySelector('[data-session-ondemand]');
      if(!this.sessionEndedOverlay && !this.sessionOndemandOverlay)return;
      this.startChecking();
      this.checkForSessionEnd();
    }

    startChecking(){
      this.checkInterval=setInterval(()=>{this.checkForSessionEnd();},10000);
    }

    parseToUtcTimestamp(str){
      const d=parseAsPDT(str);
      return d?d.getTime():null;
    }

    checkForSessionEnd(){
      const currentSlug=this.getCurrentSessionSlug();
      if(!currentSlug)return;
      const currentSessionElement=document.querySelector(`[data-agenda-item="${currentSlug}"]`);
      if(!currentSessionElement)return;
      const endTimeStr=currentSessionElement.getAttribute('data-end-time');
      if(!endTimeStr)return;
      const endUtc=this.parseToUtcTimestamp(endTimeStr);
      if(endUtc==null)return;
      const nowUtc=Date.now();
      const timeSinceEnd=nowUtc-endUtc;
      const sessionId=currentSessionElement.getAttribute('data-agenda-item');

      if(this.sessionEndedOverlay && timeSinceEnd>=30000){
        if(!this.shownSessions.has(sessionId+'-ended')){
          this.shownSessions.add(sessionId+'-ended');
          this.sessionEndedOverlay.classList.remove('hide');
        }
      }

      if(this.sessionOndemandOverlay && timeSinceEnd>0){
        const ondemandDelay=this.sessionOndemandOverlay.getAttribute('data-session-ondemand');
        if(ondemandDelay){
          const delayMinutes=parseInt(ondemandDelay);
          if(!isNaN(delayMinutes)){
            const delayMs=delayMinutes*60*1000;
            if(timeSinceEnd>=delayMs){
              if(!this.shownSessions.has(sessionId+'-ondemand')){
                this.shownSessions.add(sessionId+'-ondemand');
                this.sessionOndemandOverlay.classList.remove('hide');
              }
            }
          }
        }
      }
    }

    getCurrentSessionSlug(){
      const url=window.location.href;
      const match=url.match(/\/sessions\/([^\/\?]+)/);
      return match?match[1]:null;
    }

    destroy(){
      if(this.checkInterval){clearInterval(this.checkInterval);} 
    }
  }

  // Initialize overlay managers
  window.nextSessionOverlayManager=new NextSessionOverlayManager();
  window.additionalSessionOverlayManager=new AdditionalSessionOverlayManager();
});
