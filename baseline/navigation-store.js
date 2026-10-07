(() => {
  'use strict';

  const PLAN_KEY = 'tr_baseline_plans_v1';
  const SESSION_KEY = 'tr_baseline_nav_sessions_v1';
  const DRAFT_KEY = 'tr_baseline_nav_draft_v1';

  const readArray = key => {
    try { const v = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  const readObject = key => {
    try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v && typeof v === 'object' ? v : null; }
    catch { return null; }
  };
  const clone = value => JSON.parse(JSON.stringify(value));
  const blankDraft = () => ({
    id: null,
    name: '',
    start: null,
    vias: [],
    destination: null,
    sketches: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  let plans = readArray(PLAN_KEY);
  let sessions = readArray(SESSION_KEY);
  let draft = readObject(DRAFT_KEY) || blankDraft();
  let runtime = {
    status: 'READY',
    runStartedAt: null,
    elapsedBeforeRun: 0,
    laps: [],
    sessionId: null
  };

  function emit(reason) {
    window.dispatchEvent(new CustomEvent('baseline-navigation-change', { detail: { reason } }));
  }

  function persistDraft() {
    draft.updatedAt = Date.now();
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    emit('draft');
  }

  function point(input, label, source) {
    if (!input) return null;
    const lat = Number(input.lat ?? input.coords?.[0]);
    const lon = Number(input.lon ?? input.coords?.[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      lat,
      lon,
      label: String(label || input.label || input.name || source || '지점'),
      source: String(source || input.source || 'MANUAL'),
      refId: input.id ? String(input.id) : null
    };
  }

  function snapshot() {
    return { draft: clone(draft), runtime: clone(runtime), plans: clone(plans), sessions: clone(sessions) };
  }

  function setStart(value) { draft.start = value ? clone(value) : null; persistDraft(); }
  function setDestination(value) { draft.destination = value ? clone(value) : null; persistDraft(); }
  function addVia(value) { if (value) draft.vias.push(clone(value)); persistDraft(); }
  function setVia(index, value) { if (index >= 0 && index < draft.vias.length && value) { draft.vias[index] = clone(value); persistDraft(); } }
  function removeVia(index) { if (index >= 0 && index < draft.vias.length) { draft.vias.splice(index, 1); persistDraft(); } }
  function moveVia(index, direction) {
    const target = index + direction;
    if (index < 0 || target < 0 || index >= draft.vias.length || target >= draft.vias.length) return;
    [draft.vias[index], draft.vias[target]] = [draft.vias[target], draft.vias[index]];
    persistDraft();
  }
  function setSketches(sketches) { draft.sketches = Array.isArray(sketches) ? clone(sketches) : []; persistDraft(); }

  function newDraft() {
    draft = blankDraft();
    runtime = { status:'READY', runStartedAt:null, elapsedBeforeRun:0, laps:[], sessionId:null };
    persistDraft();
    emit('runtime');
  }

  function savePlan(name) {
    const clean = String(name || '').trim();
    if (!clean) throw new Error('NAME_REQUIRED');
    const now = Date.now();
    const id = draft.id || ('PLAN-' + now);
    const prior = plans.find(item => item.id === id);
    const plan = {
      ...clone(draft),
      id,
      name: clean,
      createdAt: prior?.createdAt || draft.createdAt || now,
      savedAt: now,
      updatedAt: now
    };
    plans = [plan, ...plans.filter(item => item.id !== id)];
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
    draft = clone(plan);
    persistDraft();
    emit('plans');
    return clone(plan);
  }

  function loadPlan(id) {
    const plan = plans.find(item => item.id === id);
    if (!plan) return null;
    draft = { ...clone(plan), updatedAt:Date.now() };
    runtime = { status:'READY', runStartedAt:null, elapsedBeforeRun:0, laps:[], sessionId:null };
    persistDraft();
    emit('runtime');
    return clone(draft);
  }

  function deletePlan(id) {
    plans = plans.filter(item => item.id !== id);
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
    emit('plans');
  }

  function importPlan(raw) {
    const source = raw?.format === 'TACTICAL_RECON_PLAN' ? raw.plan : raw?.plan || raw;
    if (!source || typeof source !== 'object' || !source.start || !source.destination) {
      throw new Error('INVALID_PLAN');
    }
    const now = Date.now();
    const imported = {
      ...blankDraft(),
      ...clone(source),
      id: 'PLAN-' + now,
      name: String(source.name || '가져온 계획').trim() || '가져온 계획',
      createdAt: now,
      savedAt: now,
      updatedAt: now,
      vias: Array.isArray(source.vias) ? clone(source.vias) : [],
      sketches: Array.isArray(source.sketches) ? clone(source.sketches) : []
    };
    plans = [imported, ...plans];
    localStorage.setItem(PLAN_KEY, JSON.stringify(plans));
    emit('plans');
    return clone(imported);
  }

  function elapsedMs(now = Date.now()) {
    return runtime.elapsedBeforeRun +
      (runtime.status === 'RUNNING' && runtime.runStartedAt ? Math.max(0, now - runtime.runStartedAt) : 0);
  }

  function start() {
    if (!draft.start || !draft.destination) throw new Error('ROUTE_REQUIRED');
    if (runtime.status === 'RUNNING') return;
    runtime.runStartedAt = Date.now();
    runtime.status = 'RUNNING';
    if (!runtime.sessionId) runtime.sessionId = 'NAV-' + runtime.runStartedAt;
    emit('runtime');
  }

  function pause() {
    if (runtime.status !== 'RUNNING') return;
    runtime.elapsedBeforeRun = elapsedMs();
    runtime.runStartedAt = null;
    runtime.status = 'PAUSED';
    emit('runtime');
  }

  function resume() {
    if (runtime.status !== 'PAUSED') return;
    runtime.runStartedAt = Date.now();
    runtime.status = 'RUNNING';
    emit('runtime');
  }

  function lap(reference) {
    if (!['RUNNING','PAUSED'].includes(runtime.status)) return null;
    const entry = {
      number: runtime.laps.length + 1,
      at: Date.now(),
      elapsedMs: elapsedMs(),
      position: reference ? clone(reference) : null
    };
    runtime.laps.push(entry);
    emit('runtime');
    return clone(entry);
  }

  function stop() {
    if (!['RUNNING','PAUSED'].includes(runtime.status)) return null;
    const elapsed = elapsedMs();
    const endedAt = Date.now();
    const session = {
      id: runtime.sessionId || ('NAV-' + endedAt),
      planId: draft.id || null,
      planName: draft.name || '',
      route: clone(draft),
      startedAt: endedAt - elapsed,
      endedAt,
      elapsedMs: elapsed,
      laps: clone(runtime.laps)
    };
    sessions = [session, ...sessions];
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessions));
    runtime = {
      status:'FINISHED',
      runStartedAt:null,
      elapsedBeforeRun:elapsed,
      laps:clone(runtime.laps),
      sessionId:session.id
    };
    emit('sessions');
    emit('runtime');
    return clone(session);
  }

  function resetRuntime() {
    runtime = { status:'READY', runStartedAt:null, elapsedBeforeRun:0, laps:[], sessionId:null };
    emit('runtime');
  }

  window.BaselineNavigation = {
    snapshot, point, setStart, setDestination, addVia, setVia, removeVia, moveVia,
    setSketches, newDraft, savePlan, loadPlan, deletePlan, importPlan,
    start, pause, resume, lap, stop, resetRuntime, elapsedMs
  };
})();