/*───────────────────────────────
 * Unified Time + Upcoming Manager
 *───────────────────────────────*/

// Global configuration
const CONFIG = {
  timeFmt: { hour: "2-digit", minute: "2-digit", hour12: false },
  dateFmt: { month: "short", day: "numeric" },
  checkInterval: 30000,
  overlayCheckInterval: 10000,
  sessionEndDelay: 30000,
  nextSessionBuffer: 120000,
  timeDiffThreshold: 5000,
  defaultLimit: 3,
  loadDelay: 300,
  hideUpcomingAfter: 1800000
};

// Check if Luxon is available
const hasLuxon = typeof luxon !== 'undefined';

// Normalize "YYYY-MM-DD H:m[:ss]" → ISO
function normalizeToIso(str) {
  if (!str) return null;
  if (str.includes("T")) return str;
  const [d, t = "00:00"] = str.trim().split(/\s+/);
  let [h = "00", m = "00", s = "00"] = t.split(":");
  return `${d}T${h.padStart(2,"0")}:${m.padStart(2,"0")}:${s.padStart(2,"0")}`;
}

// Parse LA time and convert to local time
function parseLATime(str) {
  if (!str) return null;
  
  // Try Luxon first for all formats
  if (hasLuxon) {
    try {
      // For "October 16, 2025 9:10 AM" format
      if (str.match(/^[A-Za-z]+ \d+, \d{4} \d+:\d+ [AP]M$/)) {
        return luxon.DateTime.fromFormat(str, 'MMMM d, yyyy h:mm a', { 
          zone: 'America/Los_Angeles' 
        }).toJSDate();
      }
      
      // For ISO formats
      let iso = normalizeToIso(str);
      if (!/[Zz]|[+\-]\d{2}:?\d{2}$/.test(iso)) {
        // Treat as LA time if no timezone specified
        return luxon.DateTime.fromISO(iso, { zone: 'America/Los_Angeles' }).toJSDate();
      }
      return luxon.DateTime.fromISO(iso, { zone: 'America/Los_Angeles' }).toJSDate();
    } catch (e) {
      console.warn('Luxon parsing failed, using fallback:', e);
    }
  }
  
  // Fallback to original logic
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
  // Try Luxon with better abbreviation format
  if (hasLuxon) {
    try {
      // Try to get short abbreviation first
      const now = luxon.DateTime.now();
      const shortAbbr = now.toFormat('z');
      // If we get a meaningful abbreviation (not just offset), use it
      if (shortAbbr && !shortAbbr.match(/^[+-]\d{2}:\d{2}$/)) {
        return shortAbbr.replace(/_/g, ' ');
      }
      // Fallback to ZZZ format
      const mediumAbbr = now.toFormat('ZZZ');
      if (mediumAbbr && !mediumAbbr.match(/^[+-]\d{2}:\d{2}$/)) {
        return mediumAbbr.replace(/_/g, ' ');
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

// Global utility functions
function parseToUtcTimestamp(timeStr) {
  if (!timeStr) return null;
  const date = parseLATime(timeStr);
  return date ? date.getTime() : null;
}

function getCurrentSessionSlug() {
  const url = window.location.href;
  const match = url.match(/\/sessions\/([^\/\?]+)/);
  return match ? match[1] : null;
}

function setupContainerEventListeners(manager, updateMethod) {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMethod.call(manager);
  });
  window.addEventListener("load", () => {
    setTimeout(() => updateMethod.call(manager), CONFIG.loadDelay);
  });
}

function setupNestedEventListeners(manager, updateMethod) {
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) updateMethod.call(manager);
  });
  window.addEventListener("load", () => {
    setTimeout(() => updateMethod.call(manager), CONFIG.loadDelay);
  });
}

function createContainerUpdateInterval(manager, updateMethod, interval = CONFIG.checkInterval) {
  return setInterval(() => updateMethod.call(manager), interval);
}

function createNestedUpdateInterval(manager, updateMethod, interval = CONFIG.checkInterval) {
  return setInterval(() => updateMethod.call(manager), interval);
}

// Rendering functions
function updateText(el, val) { 
  if (el && el.textContent !== val) el.textContent = val; 
}

function renderOne(session) {
  const startAttr = session.getAttribute("data-start-time");
  const endAttr = session.getAttribute("data-end-time");
  const start = parseLATime(startAttr);
  const end = parseLATime(endAttr);
  if (!start || !end) return;
  const startTime = start.toLocaleTimeString([], CONFIG.timeFmt);
  const endTime = end.toLocaleTimeString([], CONFIG.timeFmt);
  const dateText = start.toLocaleDateString(undefined, CONFIG.dateFmt);
  const tz = getUserTzAbbr();
  updateText(session.querySelector('[data-time-copy="start"]'), startTime);
  updateText(session.querySelector('[data-time-copy="end"]'), endTime);
  updateText(session.querySelector('[data-time-copy="date"]'), dateText);
  updateText(session.querySelector('[data-time-copy="tz"]'), `\u00A0${tz}`);
}

function renderAllSessions() {
  document.querySelectorAll("[data-agenda-item]").forEach(renderOne);
}

// Expose global functions
window.parseLATime = parseLATime;
window.parseAsPDT = parseLATime;
window.parseToUtcTimestamp = parseToUtcTimestamp;
window.getCurrentSessionSlug = getCurrentSessionSlug;
window.renderAllSessions = renderAllSessions;

document.addEventListener("DOMContentLoaded", function () {

  renderAllSessions();
  window.addEventListener("load",()=>{renderAllSessions();setTimeout(renderAllSessions,CONFIG.loadDelay);});

  /*───────────────────────────────
   * Base Container Manager
   *───────────────────────────────*/
  class BaseContainerManager {
    constructor(selector, checkInterval = CONFIG.checkInterval) {
      this.containers = [];
      this.interval = null;
      this.checkInterval = checkInterval;
      this.selector = selector;
      this.init();
    }

    init() {
      this.findContainers();
      this.updateAllContainers();
      this.startPeriodicUpdates();
      setupContainerEventListeners(this, this.updateAllContainers);
    }

    findContainers() {
      this.containers = Array.from(document.querySelectorAll(this.selector)).map(el => ({
        el,
        limit: parseInt(el.getAttribute(this.selector.replace(/[\[\]]/g, '')) || CONFIG.defaultLimit)
      }));
    }

    parseToUtcTimestamp(timeStr) {
      return parseToUtcTimestamp(timeStr);
    }

    updateAllContainers() { 
      this.containers.forEach(c => this.updateContainer(c)); 
    }

    startPeriodicUpdates() { 
      this.interval = createContainerUpdateInterval(this, this.updateAllContainers, this.checkInterval); 
    }

    destroy() {
      if (this.interval) {
        clearInterval(this.interval);
      }
    }
  }

  /*───────────────────────────────
   * Upcoming Sessions (UTC compare)
   *───────────────────────────────*/
  class UpcomingSessionsManager extends BaseContainerManager {
    constructor() {
      super("[data-upcoming-sessions]");
    }

    updateContainer(container) {
      const sessions = Array.from(container.el.querySelectorAll("[data-agenda-item]"));
      const nowUtc = Date.now();

      const upcoming = sessions
        .map(s => ({ el: s, startUtc: this.parseToUtcTimestamp(s.getAttribute("data-start-time")) }))
        .filter(x => x.startUtc && x.startUtc > nowUtc)
        .sort((a, b) => a.startUtc - b.startUtc)
        .map(x => x.el);

      sessions.forEach(s => s.style.display = "none");
      const toShow = upcoming.slice(0, container.limit);
      toShow.forEach(s => s.style.display = "");

      // toggle container visibility when empty
      container.el.style.display = toShow.length ? "" : "none";

      // после фильтрации — пересчёт времени
      renderAllSessions();
    }
  }

  window.upcomingManager=new UpcomingSessionsManager();
  
  /*───────────────────────────────
   * Live Sessions (start <= now < end)
   *───────────────────────────────*/
  class LiveSessionsManager extends BaseContainerManager {
    constructor() {
      super("[data-live-sessions]");
    }

    updateContainer(container) {
      const sessions = Array.from(container.el.querySelectorAll("[data-agenda-item]"));
      const nowUtc = Date.now();

      const live = sessions
        .map(s => ({
          el: s,
          startUtc: this.parseToUtcTimestamp(s.getAttribute("data-start-time")),
          endUtc: this.parseToUtcTimestamp(s.getAttribute("data-end-time"))
        }))
        .filter(x => x.startUtc != null && x.endUtc != null && x.startUtc <= nowUtc && nowUtc < x.endUtc)
        .sort((a, b) => a.startUtc - b.startUtc)
        .map(x => x.el);

      sessions.forEach(s => s.style.display = "none");
      const toShow = live.slice(0, container.limit);
      toShow.forEach(s => s.style.display = "");

      // toggle container visibility when empty
      container.el.style.display = toShow.length ? "" : "none";

      // после фильтрации — пересчёт времени
      renderAllSessions();
    }
  }

  window.liveManager=new LiveSessionsManager();
  
  /*───────────────────────────────
   * Next Session Overlay (UTC compare via parseLATime)
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
      this.checkInterval=setInterval(()=>{this.checkForSessionEnd();},CONFIG.overlayCheckInterval);
    }

    parseToUtcTimestamp(str) {
      return parseToUtcTimestamp(str);
    }

    getCurrentSessionSlug() {
      return getCurrentSessionSlug();
    }

    checkForSessionEnd() {
      const currentSlug = this.getCurrentSessionSlug();
      if (!currentSlug) return;
      const currentSessionElement = document.querySelector(`[data-agenda-item="${currentSlug}"]`);
      if (!currentSessionElement) return;
      const endTimeStr = currentSessionElement.getAttribute('data-end-time');
      if (!endTimeStr) return;
      const nowUtc = Date.now();
      const endUtc = this.parseToUtcTimestamp(endTimeStr);
      if (endUtc == null) return;
      
      // Get seconds before end from data-next-redirect attribute
      const secondsBeforeEnd = parseInt(this.overlayElement.getAttribute('data-next-redirect')) || 15;
      const showTimeUtc = endUtc - (secondsBeforeEnd * 1000);
      
      if (nowUtc >= showTimeUtc && nowUtc < endUtc) {
        const sessionId = currentSessionElement.getAttribute('data-agenda-item');
        if (!this.shownSessions.has(sessionId)) {
          this.shownSessions.add(sessionId);
          this.showOverlay(currentSessionElement);
        }
      }
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
        return diff <= CONFIG.nextSessionBuffer; // within 2 minutes
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
          // Automatic redirect disabled - user can click manually
          // if(linkElement&&linkElement.href){window.location.href=linkElement.href;}
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
   * Additional Session Overlays (UTC compare via parseLATime)
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
      this.checkInterval=setInterval(()=>{this.checkForSessionEnd();},CONFIG.overlayCheckInterval);
    }

    parseToUtcTimestamp(str) {
      return parseToUtcTimestamp(str);
    }

    getCurrentSessionSlug() {
      return getCurrentSessionSlug();
    }

    checkForSessionEnd() {
      const currentSlug = this.getCurrentSessionSlug();
      if (!currentSlug) return;
      const currentSessionElement = document.querySelector(`[data-agenda-item="${currentSlug}"]`);
      if (!currentSessionElement) return;
      const endTimeStr = currentSessionElement.getAttribute('data-end-time');
      if (!endTimeStr) return;
      const endUtc = this.parseToUtcTimestamp(endTimeStr);
      if (endUtc == null) return;
      const nowUtc = Date.now();
      const timeSinceEnd = nowUtc - endUtc;
      const sessionId = currentSessionElement.getAttribute('data-agenda-item');

      if (this.sessionEndedOverlay && timeSinceEnd >= CONFIG.sessionEndDelay) {
        if (!this.shownSessions.has(sessionId + '-ended')) {
          this.shownSessions.add(sessionId + '-ended');
          this.sessionEndedOverlay.classList.remove('hide');
        }
      }

      if (this.sessionOndemandOverlay && timeSinceEnd > 0) {
        const ondemandDelay = this.sessionOndemandOverlay.getAttribute('data-session-ondemand');
        if (ondemandDelay) {
          const delayMinutes = parseInt(ondemandDelay);
          if (!isNaN(delayMinutes)) {
            const delayMs = delayMinutes * 60 * 1000;
            if (timeSinceEnd >= delayMs) {
              if (!this.shownSessions.has(sessionId + '-ondemand')) {
                this.shownSessions.add(sessionId + '-ondemand');
                this.sessionOndemandOverlay.classList.remove('hide');
              }
            }
          }
        }
      }
    }

    destroy(){
      if(this.checkInterval){clearInterval(this.checkInterval);} 
    }
  }

  /*───────────────────────────────
   * Nested Collections Manager (data-agenda-next)
   *───────────────────────────────*/
  class NestedCollectionsManager{
    constructor(){
      this.sessions=[];
      this.updateInterval=null;
      this.checkInterval=30000;
      this.init();
    }

    init(){
      this.findSessions();
      this.findNestedCollections();
      this.updateAllSessions();
      this.startPeriodicUpdates();
      setupNestedEventListeners(this, this.updateAllSessions);
    }

    findSessions(){
      const sessionElements=document.querySelectorAll('[data-agenda-item]');
      
      sessionElements.forEach(element=>{
        const startTime=element.getAttribute('data-start-time');
        const endTime=element.getAttribute('data-end-time');
        
        if(startTime&&endTime){
          this.sessions.push({
            element:element,
            startTime:parseLATime(startTime),
            endTime:parseLATime(endTime)
          });
        }
      });
      
    }

    findNestedCollections(){
      const collectionLists=document.querySelectorAll('[data-agenda-next]');
      
      collectionLists.forEach((collectionList,index)=>{
        const parentSessionId=collectionList.getAttribute('data-agenda-next');
        const parentSession=this.sessions.find(s=>
          s.element.getAttribute('data-agenda-item')===parentSessionId
        );
        
        if(parentSession){
          const childSessions=collectionList.querySelectorAll('[data-agenda-item]');
          this.filterNestedSessions(collectionList,childSessions,parentSession);
        }
      });
    }

    filterNestedSessions(collectionList,childSessions,parentSession){
      const parentStartTime=parentSession.startTime.getTime();
      const parentEndTime=parentSession.endTime.getTime();
      
      // Show sessions that are:
      // 1. Simultaneous (running at the same time as parent)
      // 2. Starting after parent session ends (within 30 minutes)
      const relevantSessions=[];
      
      childSessions.forEach(childElement=>{
        const startTime=childElement.getAttribute('data-start-time');
        const endTime=childElement.getAttribute('data-end-time');
        
        if(startTime&&endTime){
          const childStartTime=parseLATime(startTime).getTime();
          const childEndTime=parseLATime(endTime).getTime();
          
          // Check if session is relevant
          const isSimultaneous=(childStartTime<parentEndTime&&childEndTime>parentStartTime);
          const startsAfterWithBuffer=(childStartTime>=parentEndTime&&childStartTime<=parentEndTime+(30*60*1000)); // 30 minutes buffer
          
          
          if(isSimultaneous||startsAfterWithBuffer){
            relevantSessions.push(childElement);
          }else{
            childElement.style.display='none';
          }
        }
      });
      
      // Show relevant sessions
      relevantSessions.forEach(session=>{
        session.style.display='';
      });
      
      // Check if parent session ended more than configured time ago
      const now = Date.now();
      const timeSinceParentEnded = now - parentEndTime;

      // Hide data-live-upcoming-sessions if no relevant sessions found
      const liveUpcomingElement = document.querySelector('[data-live-upcoming-sessions]');
      if (liveUpcomingElement) {
        if (timeSinceParentEnded > CONFIG.hideUpcomingAfter) {
          liveUpcomingElement.style.display = 'none';
        } else {
          liveUpcomingElement.style.display = relevantSessions.length > 0 ? '' : 'none';
        }
      }
      
    }

    updateAllSessions(){
      this.sessions.forEach(session=>{
        this.updateSessionVisibility(session);
      });
      this.updateCountdownTimers();
      this.updateNestedCollections();
    }

    updateNestedCollections(){
      const collectionLists=document.querySelectorAll('[data-agenda-next]');
      
      collectionLists.forEach(collectionList=>{
        const parentSessionId=collectionList.getAttribute('data-agenda-next');
        const parentSession=this.sessions.find(s=>
          s.element.getAttribute('data-agenda-item')===parentSessionId
        );
        
        if(parentSession){
          const childSessions=collectionList.querySelectorAll('[data-agenda-item]');
          this.filterNestedSessions(collectionList,childSessions,parentSession);
        }
      });
    }

    updateSessionVisibility(session){
      const now=new Date();
      const {startTime,endTime,element}=session;
      
      // Check data-during-session attribute on child elements
      const duringElement=element.querySelector('[data-during-session]');
      const duringOffset=duringElement?duringElement.getAttribute('data-during-session'):null;
      const duringMinutes=duringOffset?parseInt(duringOffset):0;
      
      // Check data-after-session attribute on child elements
      const afterElement=element.querySelector('[data-after-session]');
      const afterOffset=afterElement?afterElement.getAttribute('data-after-session'):null;
      const afterMinutes=afterOffset?parseInt(afterOffset):0;
      
      // Calculate time with offset
      let adjustedStartTime=startTime;
      let duringEndTime=endTime;
      
      if(duringMinutes<0){
        // Negative offset - start earlier
        adjustedStartTime=new Date(startTime.getTime()+(duringMinutes*60*1000));
      }
      
      let state;
      if(now<adjustedStartTime){
        state='before';
      }else if(now>=adjustedStartTime&&now<=duringEndTime){
        state='during';
      }else{
        state='after';
      }
      
      // Hide all state-specific elements first
      const attributes={
        before:'data-before-session',
        during:'data-during-session',
        after:'data-after-session'
      };
      
      Object.values(attributes).forEach(attr=>{
        const stateElements=element.querySelectorAll(`[${attr}]`);
        stateElements.forEach(el=>{
          el.style.display='none';
        });
      });
      
      // Show elements for current state
      const currentStateAttr=attributes[state];
      const currentStateElements=element.querySelectorAll(`[${currentStateAttr}]`);
      currentStateElements.forEach(el=>{
        el.style.display='';
      });
      
      // Handle data-agenda-live elements (only during real session time, no offset)
      const liveElements=element.querySelectorAll('[data-agenda-live]');
      const isRealSessionTime=now>=session.startTime&&now<=session.endTime;
      
      liveElements.forEach(el=>{
        if(isRealSessionTime){
          el.style.display='flex';
        }else{
          el.style.display='none';
        }
      });
      
      // Handle data-after-session elements (with offset support)
      const afterElements=element.querySelectorAll('[data-after-session]');
      afterElements.forEach(el=>{
        const afterOffset=el.getAttribute('data-after-session');
        const afterMinutes=afterOffset?parseInt(afterOffset):0;
        
        if(afterMinutes>0){
          // Show after specified delay
          const afterTime=new Date(session.endTime.getTime()+(afterMinutes*60*1000));
          if(now>=afterTime){
            el.style.display='';
          }else{
            el.style.display='none';
          }
        }else{
          // Show immediately after session ends
          if(now>session.endTime){
            el.style.display='';
          }else{
            el.style.display='none';
          }
        }
      });
      
      // Add/remove state classes for additional styling
      element.classList.remove('session-before','session-during','session-after');
      element.classList.add(`session-${state}`);
      
      // Update countdown if in 'before' state
      if (state === 'before') {
        this.updateCountdown(element, session.startTime);
      }
    }

    updateCountdownTimers() {
      this.sessions.forEach(session => {
        const countdownElements = session.element.querySelectorAll('[data-session-countdown]');
        
        countdownElements.forEach(element => {
          const now = new Date();
          const timeDiff = session.startTime.getTime() - now.getTime();
          
          if (timeDiff > 0) {
            const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            // Show only one unit - most relevant
            let countdownText = '';
            if (days > 0) {
              countdownText = `${days} day${days > 1 ? 's' : ''}`;
            } else if (hours > 0) {
              countdownText = `${hours} hour${hours > 1 ? 's' : ''}`;
            } else if (minutes > 0) {
              countdownText = `${minutes} minute${minutes > 1 ? 's' : ''}`;
            } else {
              countdownText = 'Starting now';
            }
            
            element.textContent = countdownText;
          } else {
            element.textContent = 'Starting now'; // Session has started
          }
        });
      });
    }

    updateCountdown(element, targetTime) {
      const countdownElements = element.querySelectorAll('[data-countdown]');
      
      countdownElements.forEach(countdownEl => {
        const now = new Date();
        const timeDiff = targetTime.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
          
          // Format countdown display
          let countdownText = '';
          if (days > 0) {
            countdownText = `${days}d ${hours}h ${minutes}m ${seconds}s`;
          } else if (hours > 0) {
            countdownText = `${hours}h ${minutes}m ${seconds}s`;
          } else if (minutes > 0) {
            countdownText = `${minutes}m ${seconds}s`;
          } else {
            countdownText = `${seconds}s`;
          }
          
          countdownEl.textContent = countdownText;
          
          // Add data attributes for individual time units
          countdownEl.setAttribute('data-days', days);
          countdownEl.setAttribute('data-hours', hours);
          countdownEl.setAttribute('data-minutes', minutes);
          countdownEl.setAttribute('data-seconds', seconds);
        } else {
          countdownEl.textContent = 'Starting now...';
        }
      });
    }

    startPeriodicUpdates(){
      // Update countdown every second for active countdowns
      setInterval(() => {
        this.sessions.forEach(session => {
          const state = this.getSessionState(session);
          if (state === 'before') {
            this.updateCountdown(session.element, session.startTime);
          }
        });
        this.updateCountdownTimers();
      }, 1000);
      
      // Check for state changes every 30 seconds
      this.updateInterval=createNestedUpdateInterval(this, this.updateAllSessions, this.checkInterval);
    }

    destroy(){
      if(this.updateInterval){
        clearInterval(this.updateInterval);
      }
    }

    // Public method to manually refresh sessions (useful for dynamic content)
    refresh(){
      this.sessions=[];
      this.findSessions();
      this.updateAllSessions();
    }

    // Public method to get current session state
    getCurrentState(sessionElement){
      const session=this.sessions.find(s=>s.element===sessionElement);
      return session?this.getSessionState(session):null;
    }

    getSessionState(session){
      const now=new Date();
      const {startTime,endTime,element}=session;
      
      // Check data-during-session attribute on child elements
      const duringElement=element.querySelector('[data-during-session]');
      const duringOffset=duringElement?duringElement.getAttribute('data-during-session'):null;
      const duringMinutes=duringOffset?parseInt(duringOffset):0;
      
      // Check data-after-session attribute on child elements
      const afterElement=element.querySelector('[data-after-session]');
      const afterOffset=afterElement?afterElement.getAttribute('data-after-session'):null;
      const afterMinutes=afterOffset?parseInt(afterOffset):0;
      
      // Calculate time with offset
      let adjustedStartTime=startTime;
      let duringEndTime=endTime;
      
      if(duringMinutes<0){
        // Negative offset - start earlier
        adjustedStartTime=new Date(startTime.getTime()+(duringMinutes*60*1000));
      }
      
      if(now<adjustedStartTime){
        return 'before';
      }else if(now>=adjustedStartTime&&now<=duringEndTime){
        return 'during';
      }else{
        return 'after';
      }
    }
  }

  /*───────────────────────────────
   * Start Countdown Manager (data-start-countdown)
   *───────────────────────────────*/
  class StartCountdownManager {
    constructor() {
      this.countdownElement = null;
      this.updateInterval = null;
      this.init();
    }

    init() {
      this.countdownElement = document.querySelector('[data-start-countdown]');
      if (!this.countdownElement) return;
      
      this.updateCountdown();
      this.startPeriodicUpdates();
    }

    startPeriodicUpdates() {
      // Update every 10 seconds for more accurate countdown
      this.updateInterval = setInterval(() => {
        this.updateCountdown();
      }, CONFIG.overlayCheckInterval);
    }

    updateCountdown() {
      if (!this.countdownElement) return;
      
      // Find all sessions and get the first upcoming one
      const allSessions = document.querySelectorAll('[data-agenda-item]');
      const sessions = Array.from(allSessions).map(el => ({
        element: el,
        startUtc: parseToUtcTimestamp(el.getAttribute('data-start-time'))
      }));

      const upcomingSessions = sessions
        .filter(s => s.startUtc && s.startUtc > Date.now())
        .sort((a, b) => a.startUtc - b.startUtc);

      if (upcomingSessions.length === 0) {
        this.countdownElement.style.display = 'none';
        return;
      }

      const firstSession = upcomingSessions[0];
      const nowUtc = Date.now();
      const timeDiff = firstSession.startUtc - nowUtc;

      // Hide if less than 30 seconds remaining
      if (timeDiff <= 30000) {
        this.countdownElement.style.display = 'none';
        return;
      }

      // Show countdown
      this.countdownElement.style.display = '';
      
      const hours = Math.floor(timeDiff / (1000 * 60 * 60));
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      let countdownText = '';
      if (hours > 0) {
        countdownText = `We start in ${hours}h ${minutes}m.&nbsp;`;
      } else if (minutes > 0) {
        countdownText = `We start in ${minutes}m.&nbsp;`;
      } else {
        countdownText = 'We start in <1m.&nbsp;';
      }

      this.countdownElement.innerHTML = countdownText;
      
      // Update next session cover
      this.updateNextSessionCover(upcomingSessions[0]);
    }
    
    updateNextSessionCover(nextSessionElement) {
      if (!nextSessionElement) return;
      
      // Find image in the next session
      const imgElement = nextSessionElement.querySelector('img');
      if (!imgElement) return;
      
      // Update cover element
      const coverElement = document.querySelector('[data-next-session-cover]');
      if (coverElement) {
        coverElement.src = imgElement.src;
        coverElement.alt = imgElement.alt || 'Next session';
      }
    }

    destroy() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
    }
  }

  /*───────────────────────────────
   * Feedback Manager (data-session-feedback)
   *───────────────────────────────*/
  class FeedbackManager {
    constructor() {
      this.feedbackElement = null;
      this.checkInterval = null;
      this.init();
    }

    init() {
      this.feedbackElement = document.querySelector('[data-session-feedback]');
      if (!this.feedbackElement) return;
      
      // Check time first, then decide whether to hide or show
      this.updateFeedbackVisibility();
      this.startChecking();
    }

    startChecking() {
      this.checkInterval = setInterval(() => {
        this.updateFeedbackVisibility();
      }, CONFIG.checkInterval);
    }

    updateFeedbackVisibility() {
      if (!this.feedbackElement) return;
      
      const currentSlug = getCurrentSessionSlug();
      if (!currentSlug) {
        this.feedbackElement.classList.add('hide');
        return;
      }
      
      const sessionElement = document.querySelector(`[data-agenda-item="${currentSlug}"]`);
      if (!sessionElement) {
        this.feedbackElement.classList.add('hide');
        return;
      }
      
      const endTimeStr = sessionElement.getAttribute('data-end-time');
      if (!endTimeStr) {
        this.feedbackElement.classList.add('hide');
        return;
      }
      
      const endUtc = parseToUtcTimestamp(endTimeStr);
      if (!endUtc) {
        this.feedbackElement.classList.add('hide');
        return;
      }
      
      const minutesBeforeEnd = parseInt(this.feedbackElement.getAttribute('data-session-feedback')) || 10;
      const showTimeUtc = endUtc - (minutesBeforeEnd * 60 * 1000);
      const nowUtc = Date.now();
      
      if (nowUtc >= showTimeUtc) {
        this.feedbackElement.classList.remove('hide');
      } else {
        this.feedbackElement.classList.add('hide');
      }
    }

    destroy() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
    }
  }

  // Initialize overlay managers
  window.nextSessionOverlayManager=new NextSessionOverlayManager();
  window.additionalSessionOverlayManager=new AdditionalSessionOverlayManager();
  window.nestedCollectionsManager=new NestedCollectionsManager();
  window.feedbackManager=new FeedbackManager();
  window.startCountdownManager=new StartCountdownManager();
});
