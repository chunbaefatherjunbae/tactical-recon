(() => {
  'use strict';

  const KEY = 'tr_baseline_records_v1';
  const ACTIVE_KEY = 'tr_baseline_active_session_v1';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function readRecords() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function readActive() {
    try {
      const value = JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null');
      return value && typeof value === 'object' ? value : null;
    } catch {
      return null;
    }
  }

  let records = readRecords();
  let active = readActive();

  function persistActive() {
    if (active) localStorage.setItem(ACTIVE_KEY, JSON.stringify(active));
    else localStorage.removeItem(ACTIVE_KEY);
    window.dispatchEvent(new CustomEvent('baseline-session-change',{detail:{session:clone(active)}}));
  }

  function persistRecords() {
    localStorage.setItem(KEY, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('baseline-records-change'));
  }

  function elapsedMs(session = active, now = Date.now()) {
    if (!session?.startedAt) return 0;
    const end = session.endedAt || now;
    const livePause = session.status === 'PAUSED' && session.pausedAt ? Math.max(0,end-session.pausedAt) : 0;
    return Math.max(0,end-session.startedAt-(Number(session.pauseMs)||0)-livePause);
  }

  function start(planSnapshot) {
    if (!planSnapshot?.destination || !planSnapshot?.start) return null;
    const now = Date.now();
    active = {
      id:'REC-' + now.toString(36) + '-' + Math.random().toString(36).slice(2,7),
      name:String(planSnapshot.name || '미저장 계획'),
      status:'RUNNING',
      startedAt:now,
      endedAt:null,
      pausedAt:null,
      pauseMs:0,
      laps:[],
      events:[{type:'START',at:now}],
      initialPlan:clone(planSnapshot),
      finalPlan:null
    };
    persistActive();
    return clone(active);
  }

  function pause() {
    if (!active || active.status !== 'RUNNING') return null;
    active.status='PAUSED';
    active.pausedAt=Date.now();
    active.events.push({type:'PAUSE',at:active.pausedAt});
    persistActive();
    return clone(active);
  }

  function resume() {
    if (!active || active.status !== 'PAUSED') return null;
    const now=Date.now();
    active.pauseMs += Math.max(0,now-(active.pausedAt || now));
    active.pausedAt=null;
    active.status='RUNNING';
    active.events.push({type:'RESUME',at:now});
    persistActive();
    return clone(active);
  }

  function lap(reference) {
    if (!active || !['RUNNING','PAUSED'].includes(active.status)) return null;
    const at=Date.now();
    const entry={
      index:active.laps.length+1,
      at,
      elapsedMs:elapsedMs(active,at),
      reference:reference ? clone(reference) : null
    };
    active.laps.push(entry);
    active.events.push({type:'LAP',at,index:entry.index});
    persistActive();
    return clone(entry);
  }

  function routeUpdated(planSnapshot) {
    if (!active) return;
    active.events.push({type:'ROUTE_UPDATED',at:Date.now()});
    active.finalPlan=clone(planSnapshot);
    persistActive();
  }

  function finish(finalPlan) {
    if (!active) return null;
    const now=Date.now();
    if (active.status === 'PAUSED' && active.pausedAt) {
      active.pauseMs += Math.max(0,now-active.pausedAt);
      active.pausedAt=null;
    }
    active.status='FINISHED';
    active.endedAt=now;
    active.events.push({type:'STOP',at:now});
    active.finalPlan=clone(finalPlan || active.finalPlan || active.initialPlan);
    active.elapsedMs=elapsedMs(active,now);
    records.unshift(clone(active));
    persistRecords();
    const finished=clone(active);
    active=null;
    persistActive();
    return finished;
  }

  function discardActive() {
    active=null;
    persistActive();
  }

  function getActive() { return clone(active); }
  function list() { return records.map(clone).sort((a,b)=>b.startedAt-a.startedAt); }
  function get(id) {
    const record=records.find(r=>String(r.id)===String(id));
    return record ? clone(record) : null;
  }

  window.BaselineRecordStore = Object.freeze({
    start,pause,resume,lap,routeUpdated,finish,discardActive,getActive,list,get,elapsedMs
  });
})();
