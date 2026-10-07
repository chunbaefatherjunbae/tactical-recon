/* Tactical Recon V28 integrated runtime: TRACK V2 / Hybrid / Recovery / GPX / BACKTRACK */
(function () {
  'use strict';

  const base = window.v28;
  if (!base) return;

  const TRACK_STORE_KEY = 'tactical_recon_track_logs_v2';
  const ACTIVE_TRACK_KEY = 'tactical_recon_active_track_v2';
  const MAX_GPS_ACCURACY_M = 65;
  const MIN_GPS_DISTANCE_M = 6;
  const MIN_GPS_INTERVAL_MS = 800;
  const FORCE_GPS_DISTANCE_M = 3;
  const FORCE_GPS_INTERVAL_MS = 5000;

  const session = {
    state: 'OFF',
    activeTrackId: null,
    lastAnchor: null,
    gpsGap: false,
    freshSegment: false,
    recovered: false,
    displayMode: 'LATEST',
    backtrackEstimated: false,
    renderedPlanId: null
  };

  function emitTrackLifecycle(kind, track) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
    try {
      window.dispatchEvent(new CustomEvent('ep-track-lifecycle', {
        detail:{
          kind:String(kind || ''),
          trackId:track?.id || session.activeTrackId || null,
          planId:track?.planId || null,
          startedAt:Number(track?.startedAt || 0) || null,
          endedAt:Number(track?.endedAt || 0) || null,
          state:session.state
        }
      }));
    } catch (e) {}
  }

  let trackLayer = null;
  let browserReady = false;
  let gapTimer = null;
  let planRenderTimer = null;

  function runtimeLang() {
    return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ko';
  }

  function tRuntime(ko, en) {
    return runtimeLang() === 'en' ? en : ko;
  }

  function syncTrackStaticLabels() {
    if (typeof document === 'undefined') return;
    const set = (id, ko, en) => {
      const el = document.getElementById(id);
      if (el) el.textContent = tRuntime(ko, en);
    };
    set('v28PlanTrackBtn', '궤적', 'TRACK');
    set('v28TrackTitle', '궤적 기록', 'TRACK LOG');
    set('v28TrackSessionLabel', '상태', 'SESSION');
    set('v28TrackDistanceLabel', '거리', 'DISTANCE');
    set('v28TrackRecord', '기록 시작', 'RECORD');
    set('v28TrackPause', '일시정지', 'PAUSE');
    set('v28TrackResume', '재개', 'RESUME');
    set('v28TrackStop', '기록 종료', 'STOP');
    set('v28TrackLatest', '최근', 'LATEST');
    set('v28TrackAll', '전체 궤적', 'ALL TRACKS');
    set('navSearchBtn', '위치검색', 'LOCATE');
    set('targetTrackRecBtn', '궤적 관리', 'TRACK MANAGE');
  }

  function validCoords(coords) {
    return Array.isArray(coords) && coords.length === 2 &&
      typeof coords[0] === 'number' && typeof coords[1] === 'number' &&
      Number.isFinite(coords[0]) && Number.isFinite(coords[1]) &&
      coords[0] >= -90 && coords[0] <= 90 &&
      coords[1] >= -180 && coords[1] <= 180;
  }

  function distanceKm(a, b) {
    if (!validCoords(a) || !validCoords(b)) return 0;
    const rad = Math.PI / 180;
    const dLat = (b[0] - a[0]) * rad;
    const dLon = (b[1] - a[1]) * rad;
    const lat1 = a[0] * rad;
    const lat2 = b[0] * rad;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function nowTs(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : Date.now();
  }

  function normalizeAnchor(anchor) {
    if (!anchor || !validCoords(anchor.coords)) return null;
    const source = ['GPS', 'TEMP', 'LAST_FIX'].includes(anchor.source) ? anchor.source : null;
    if (!source) return null;
    const out = { coords:[anchor.coords[0], anchor.coords[1]], source:source };
    if (Number.isFinite(Number(anchor.timestamp)) && Number(anchor.timestamp) > 0) {
      out.timestamp = Number(anchor.timestamp);
    }
    return out;
  }

  function endpoint(anchor, sourceOverride) {
    const a = normalizeAnchor(anchor);
    if (!a) return null;
    const out = {
      lat: a.coords[0],
      lon: a.coords[1],
      source: sourceOverride || a.source
    };
    if (a.timestamp !== undefined) out.timestamp = a.timestamp;
    return out;
  }

  function getTrack(trackId) {
    return base.storage.getV28Tracks()[String(trackId || '')] || null;
  }

  function getPlan(planId) {
    return base.plans.get(String(planId || ''));
  }

  function getPlanTracks(planId) {
    const id = String(planId || '');
    if (!id) return [];
    const plan = getPlan(id);
    const all = base.storage.getV28Tracks();
    const ids = new Set(Array.isArray(plan?.trackIds) ? plan.trackIds : []);
    Object.values(all).forEach(track => {
      if (track?.planId === id) ids.add(track.id);
    });
    return Array.from(ids)
      .map(trackId => all[trackId])
      .filter(track => track && track.planId === id)
      .sort((a,b) => Number(b.startedAt || 0) - Number(a.startedAt || 0));
  }

  function saveRecovery() {
    if (session.state === 'OFF' || !session.activeTrackId) {
      localStorage.removeItem(ACTIVE_TRACK_KEY);
      return;
    }
    const payload = {
      schemaVersion: 1,
      trackId: session.activeTrackId,
      state: session.state,
      updatedAt: Date.now(),
      lastAnchor: normalizeAnchor(session.lastAnchor) || undefined,
      gpsGap: Boolean(session.gpsGap),
      freshSegment: Boolean(session.freshSegment)
    };
    localStorage.setItem(ACTIVE_TRACK_KEY, JSON.stringify(payload));
  }

  function clearRecovery() {
    localStorage.removeItem(ACTIVE_TRACK_KEY);
  }

  function saveTrack(track) {
    if (!track || !base.storage.saveV28Track(track)) return false;
    saveRecovery();
    return true;
  }

  function linkTrackToPlan(planId, trackId) {
    const plan = getPlan(planId);
    if (!plan) return false;
    const ids = Array.isArray(plan.trackIds) ? plan.trackIds.slice() : [];
    if (!ids.includes(trackId)) ids.push(trackId);
    return base.storage.saveV28Plan({
      ...plan,
      updatedAt: Date.now(),
      trackIds: ids
    });
  }

  function unlinkTrackFromPlan(planId, trackId) {
    const plan = getPlan(planId);
    if (!plan) return true;
    const ids = (plan.trackIds || []).filter(id => String(id) !== String(trackId));
    return base.storage.saveV28Plan({
      ...plan,
      updatedAt: Date.now(),
      trackIds: ids
    });
  }

  function dropTrackRaw(trackId) {
    if (window.v29Storage?.deleteTrack) {
      return window.v29Storage.deleteTrack(trackId);
    }
    try {
      const raw = localStorage.getItem(TRACK_STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return false;
      delete parsed[String(trackId)];
      localStorage.setItem(TRACK_STORE_KEY, JSON.stringify(parsed));
      return true;
    } catch (e) {
      console.warn('V28 TRACK raw delete failed:', e);
      return false;
    }
  }

  function deleteTrack(trackId) {
    const id = String(trackId || '');
    if (!id || (session.state !== 'OFF' && session.activeTrackId === id)) return false;
    const track = getTrack(id);
    if (!track) return false;
    if (track.planId && !unlinkTrackFromPlan(track.planId, id)) return false;
    if (!dropTrackRaw(id)) return false;
    renderPlanTracks();
    renderTrackSheet();
    return true;
  }

  function currentTrack() {
    return session.activeTrackId ? getTrack(session.activeTrackId) : null;
  }

  function measuredSegment(track, forceNew) {
    const last = track.segments[track.segments.length - 1];
    if (!forceNew && last?.kind === 'MEASURED') return last;
    const seg = { kind:'MEASURED', source:'GPS', points:[] };
    track.segments.push(seg);
    return seg;
  }

  function addEstimated(track, reason, fromAnchor, toAnchor) {
    const from = endpoint(fromAnchor,
      fromAnchor?.source === 'GPS' && session.gpsGap ? 'LAST_FIX' : undefined);
    const to = endpoint(toAnchor);
    if (!from || !to) return false;
    if (!['GPS','TEMP','LAST_FIX'].includes(from.source)) return false;
    if (!['GPS','TEMP'].includes(to.source)) return false;

    const d = distanceKm([from.lat, from.lon], [to.lat, to.lon]);
    track.segments.push({
      kind:'ESTIMATED',
      reason:reason,
      from:from,
      to:to
    });
    track.distance.estimatedKm = Number(track.distance.estimatedKm || 0) + d;
    return true;
  }

  function acceptMeasuredPoint(seg, point) {
    const prev = seg.points[seg.points.length - 1];
    if (!prev) return { accept:true, distance:0 };
    const dKm = distanceKm([prev.lat, prev.lon], [point.lat, point.lon]);
    const movedM = dKm * 1000;
    const dt = point.timestamp - prev.timestamp;
    const accept = (movedM >= MIN_GPS_DISTANCE_M && dt >= MIN_GPS_INTERVAL_MS) ||
      (movedM >= FORCE_GPS_DISTANCE_M && dt >= FORCE_GPS_INTERVAL_MS);
    return { accept:accept, distance:dKm };
  }

  function recordGps(sample) {
    if (session.state !== 'RECORDING') return false;
    const track = currentTrack();
    if (!track || !sample) return false;

    const lat = Number(sample.lat);
    const lon = Number(sample.lon);
    const accuracyM = sample.accuracyM === undefined ? undefined : Number(sample.accuracyM);
    const timestamp = nowTs(sample.timestamp);
    if (!validCoords([lat,lon])) return false;
    if (accuracyM !== undefined && (!Number.isFinite(accuracyM) || accuracyM < 0 || accuracyM > MAX_GPS_ACCURACY_M)) return false;

    const anchor = { coords:[lat,lon], source:'GPS', timestamp:timestamp };
    const point = { lat:lat, lon:lon, timestamp:timestamp };
    if (accuracyM !== undefined) point.accuracyM = accuracyM;

    if (session.freshSegment || !session.lastAnchor) {
      const seg = measuredSegment(track, true);
      seg.points.push(point);
      session.lastAnchor = anchor;
      session.freshSegment = false;
      session.gpsGap = false;
      if (!saveTrack(track)) return false;
      renderPlanTracks();
      return true;
    }

    if (session.lastAnchor.source === 'TEMP' ||
        session.lastAnchor.source === 'LAST_FIX' ||
        session.gpsGap) {
      const from = session.gpsGap && session.lastAnchor.source === 'GPS'
        ? { ...session.lastAnchor, source:'LAST_FIX' }
        : session.lastAnchor;
      addEstimated(track, 'GPS_REACQUIRE', from, anchor);
      const seg = measuredSegment(track, true);
      seg.points.push(point);
      session.lastAnchor = anchor;
      session.gpsGap = false;
      if (!saveTrack(track)) return false;
      renderPlanTracks();
      return true;
    }

    const seg = measuredSegment(track, false);
    const decision = acceptMeasuredPoint(seg, point);
    if (!decision.accept) return false;
    seg.points.push(point);
    track.distance.measuredKm = Number(track.distance.measuredKm || 0) + decision.distance;
    session.lastAnchor = anchor;
    session.gpsGap = false;
    if (!saveTrack(track)) return false;
    renderPlanTracks();
    return true;
  }

  function recordTemp(coords, timestamp) {
    if (session.state !== 'RECORDING') return false;
    const c = [Number(coords?.[0]), Number(coords?.[1])];
    if (!validCoords(c)) return false;
    const track = currentTrack();
    if (!track) return false;

    const anchor = { coords:c, source:'TEMP', timestamp:nowTs(timestamp) };
    if (session.freshSegment || !session.lastAnchor) {
      session.lastAnchor = anchor;
      session.freshSegment = false;
      session.gpsGap = false;
      saveRecovery();
      return true;
    }

    if (session.lastAnchor.source === 'TEMP' &&
        distanceKm(session.lastAnchor.coords, c) < 0.001) {
      session.lastAnchor = anchor;
      saveRecovery();
      return false;
    }

    const from = session.gpsGap && session.lastAnchor.source === 'GPS'
      ? { ...session.lastAnchor, source:'LAST_FIX' }
      : session.lastAnchor;
    if (!addEstimated(track, 'TEMP_BRIDGE', from, anchor)) return false;
    session.lastAnchor = anchor;
    session.gpsGap = false;
    if (!saveTrack(track)) return false;
    renderPlanTracks();
    return true;
  }

  function markGpsGap() {
    if (session.state !== 'RECORDING') return false;
    if (!session.lastAnchor || session.lastAnchor.source !== 'GPS') return false;
    if (session.gpsGap) return false;
    session.gpsGap = true;
    saveRecovery();
    return true;
  }

  function startTrack(planId, seed) {
    if (session.state !== 'OFF') return currentTrack();
    const plan = getPlan(planId);
    if (!plan) return null;

    const now = Date.now();
    const track = {
      schemaVersion: 2,
      id: 'TRACK2-' + now.toString(36) + '-' + Math.random().toString(36).slice(2,8),
      planId: plan.id,
      objectiveSnapshot: plan.objective ? { ...plan.objective, coords:[...plan.objective.coords] } : undefined,
      startedAt: now,
      interrupted: false,
      segments: [],
      distance: { measuredKm:0, estimatedKm:0 }
    };
    if (!base.storage.saveV28Track(track)) return null;
    if (!linkTrackToPlan(plan.id, track.id)) {
      dropTrackRaw(track.id);
      return null;
    }

    session.state = 'RECORDING';
    session.activeTrackId = track.id;
    session.lastAnchor = null;
    session.gpsGap = false;
    session.freshSegment = true;
    session.recovered = false;
    base.state.activeTrackId = track.id;
    saveRecovery();

    if (seed?.kind === 'GPS') recordGps(seed);
    else if (seed?.kind === 'TEMP') recordTemp(seed.coords, seed.timestamp);

    renderPlanTracks();
    renderTrackSheet();
    syncBrowserTrackState();
    const started=getTrack(track.id);
    emitTrackLifecycle('START', started);
    return started;
  }

  function pauseTrack() {
    if (session.state !== 'RECORDING' || !currentTrack()) return false;
    session.state = 'PAUSED';
    session.lastAnchor = null;
    session.gpsGap = false;
    session.freshSegment = true;
    saveRecovery();
    syncBrowserTrackState();
    renderTrackSheet();
    emitTrackLifecycle('PAUSE', currentTrack());
    return true;
  }

  function resumeTrack(seed) {
    if (session.state !== 'PAUSED' || !currentTrack()) return false;
    session.state = 'RECORDING';
    session.lastAnchor = null;
    session.gpsGap = false;
    session.freshSegment = true;
    saveRecovery();
    if (seed?.kind === 'GPS') recordGps(seed);
    else if (seed?.kind === 'TEMP') recordTemp(seed.coords, seed.timestamp);
    syncBrowserTrackState();
    renderTrackSheet();
    emitTrackLifecycle('RESUME', currentTrack());
    return true;
  }

  function stopTrack() {
    if (session.state === 'OFF') return null;
    const track = currentTrack();
    if (!track) {
      session.state = 'OFF';
      session.activeTrackId = null;
      base.state.activeTrackId = null;
      clearRecovery();
      syncBrowserTrackState();
      return null;
    }

    track.endedAt = Date.now();
    if (!saveTrack(track)) return null;
    const finished = getTrack(track.id);
    session.state = 'OFF';
    session.activeTrackId = null;
    session.lastAnchor = null;
    session.gpsGap = false;
    session.freshSegment = false;
    session.recovered = false;
    base.state.activeTrackId = null;
    clearRecovery();
    syncBrowserTrackState();
    renderPlanTracks();
    renderTrackSheet();
    emitTrackLifecycle('STOP', finished);
    return finished;
  }

  function recoverActiveTrack() {
    let parsed;
    try {
      const raw = localStorage.getItem(ACTIVE_TRACK_KEY);
      if (!raw) return null;
      parsed = JSON.parse(raw);
    } catch (e) {
      clearRecovery();
      return null;
    }
    if (!parsed || parsed.schemaVersion !== 1 || typeof parsed.trackId !== 'string') {
      clearRecovery();
      return null;
    }
    const track = getTrack(parsed.trackId);
    if (!track || track.endedAt) {
      clearRecovery();
      return null;
    }

    track.interrupted = true;
    if (!base.storage.saveV28Track(track)) return null;
    session.state = 'PAUSED';
    session.activeTrackId = track.id;
    session.lastAnchor = null;
    session.gpsGap = false;
    session.freshSegment = true;
    session.recovered = true;
    base.state.activeTrackId = track.id;
    if (track.planId && getPlan(track.planId)) base.state.activePlanId = track.planId;
    saveRecovery();
    const recoveredTrack=getTrack(track.id);
    emitTrackLifecycle('RECOVER', recoveredTrack);
    return recoveredTrack;
  }

  function trackDurationMs(track) {
    const end = Number(track?.endedAt || Date.now());
    const start = Number(track?.startedAt || end);
    return Math.max(0, end - start);
  }

  function buildBacktrackNodes(track) {
    if (!track || !Array.isArray(track.segments)) return [];
    const nodes = [];
    const pushNode = (coords, edgeType) => {
      if (!validCoords(coords)) return;
      const last = nodes[nodes.length - 1];
      if (last && distanceKm(last.coords, coords) < 0.000001) {
        if (edgeType === 'ESTIMATED') last.edgeFromPrev = 'ESTIMATED';
        return;
      }
      nodes.push({ coords:[coords[0],coords[1]], edgeFromPrev:edgeType || null });
    };

    track.segments.forEach(seg => {
      if (seg?.kind === 'MEASURED') {
        (seg.points || []).forEach((p, i) => {
          const coords = [Number(p.lat), Number(p.lon)];
          const edge = i === 0 ? null : 'MEASURED';
          pushNode(coords, edge);
        });
      } else if (seg?.kind === 'ESTIMATED') {
        const from = [Number(seg.from?.lat), Number(seg.from?.lon)];
        const to = [Number(seg.to?.lat), Number(seg.to?.lon)];
        if (!nodes.length) pushNode(from, null);
        else if (validCoords(from) && distanceKm(nodes[nodes.length-1].coords, from) > 0.000001) {
          pushNode(from, null);
        }
        pushNode(to, 'ESTIMATED');
      }
    });
    return nodes;
  }

  function backtrackDestination(track, refCoords, step) {
    const nodes = buildBacktrackNodes(track);
    if (!nodes.length) return null;
    if (!validCoords(refCoords)) {
      return { coords:nodes[0].coords, estimated:false, index:0, name:'BACKTRACK START' };
    }
    let nearest = 0;
    let best = Infinity;
    nodes.forEach((node, i) => {
      const d = distanceKm(refCoords, node.coords);
      if (d < best) { best = d; nearest = i; }
    });
    const targetIndex = Math.max(0, nearest - Math.max(1, Number(step) || 8));
    let estimated = false;
    for (let i = targetIndex + 1; i <= nearest; i++) {
      if (nodes[i]?.edgeFromPrev === 'ESTIMATED') {
        estimated = true;
        break;
      }
    }
    return {
      coords:nodes[targetIndex].coords,
      estimated:estimated,
      index:targetIndex,
      name: targetIndex === 0
        ? (estimated ? 'BACKTRACK START · ESTIMATED' : 'BACKTRACK START')
        : (estimated ? 'BACKTRACK · ESTIMATED' : 'BACKTRACK')
    };
  }

  function xmlEscape(value) {
    return String(value ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&apos;');
  }

  function buildGpx(waypoints, legacyTracks, v2Tracks) {
    const wps = Array.isArray(waypoints) ? waypoints : [];
    const v1 = Array.isArray(legacyTracks) ? legacyTracks : [];
    const v2 = Array.isArray(v2Tracks) ? v2Tracks : [];

    let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
    gpx += '<gpx version="1.1" creator="TacticalReconFieldTerminal-V28" xmlns="http://www.topografix.com/GPX/1/1">\n';

    wps.forEach(wp => {
      if (!validCoords(wp?.coords)) return;
      gpx += '  <wpt lat="' + wp.coords[0] + '" lon="' + wp.coords[1] + '">\n';
      gpx += '    <name>' + xmlEscape(wp.name || 'SITE') + '</name>\n';
      if (wp.desc || wp.status) {
        gpx += '    <desc>' + xmlEscape((wp.status ? '[' + wp.status + '] ' : '') + (wp.desc || '')) + '</desc>\n';
      }
      gpx += '    <type>Waypoint</type>\n';
      gpx += '  </wpt>\n';
    });

    v1.forEach(log => {
      const points = Array.isArray(log?.points) ? log.points.filter(p =>
        Array.isArray(p) && validCoords([Number(p[0]),Number(p[1])])) : [];
      if (!points.length) return;
      gpx += '  <trk>\n';
      gpx += '    <name>' + xmlEscape('V27 TRACK ' + (log.targetName || log.targetId || '')) + '</name>\n';
      gpx += '    <trkseg>\n';
      points.forEach(p => {
        const lat = Number(p[0]), lon = Number(p[1]), ts = Number(p[2]);
        gpx += '      <trkpt lat="' + lat + '" lon="' + lon + '">';
        if (Number.isFinite(ts) && ts > 0) gpx += '<time>' + new Date(ts).toISOString() + '</time>';
        gpx += '</trkpt>\n';
      });
      gpx += '    </trkseg>\n';
      gpx += '  </trk>\n';
    });

    v2.forEach(track => {
      const measured = (track?.segments || []).filter(seg => seg?.kind === 'MEASURED' && Array.isArray(seg.points) && seg.points.length);
      if (!measured.length) return;
      gpx += '  <trk>\n';
      gpx += '    <name>' + xmlEscape('V28 TRACK ' + (track.planId || track.id || '')) + '</name>\n';
      gpx += '    <desc>' + xmlEscape(
        'Measured ' + Number(track.distance?.measuredKm || 0).toFixed(3) +
        ' km / Estimated omitted ' + Number(track.distance?.estimatedKm || 0).toFixed(3) + ' km'
      ) + '</desc>\n';
      measured.forEach(seg => {
        gpx += '    <trkseg>\n';
        seg.points.forEach(p => {
          if (!validCoords([Number(p.lat),Number(p.lon)])) return;
          gpx += '      <trkpt lat="' + Number(p.lat) + '" lon="' + Number(p.lon) + '">';
          if (Number.isFinite(Number(p.timestamp)) && Number(p.timestamp) > 0) {
            gpx += '<time>' + new Date(Number(p.timestamp)).toISOString() + '</time>';
          }
          gpx += '</trkpt>\n';
        });
        gpx += '    </trkseg>\n';
      });
      gpx += '  </trk>\n';
    });

    gpx += '</gpx>';
    return gpx;
  }

  function opticColor() {
    try {
      if (typeof getOpticColor === 'function') return getOpticColor();
    } catch (e) {}
    try {
      return getComputedStyle(document.documentElement).getPropertyValue('--field-text').trim() || 'currentColor';
    } catch (e) {
      return 'currentColor';
    }
  }

  function ensureTrackLayer() {
    if (trackLayer || typeof L === 'undefined' || typeof map === 'undefined' || !map) return trackLayer;
    trackLayer = L.layerGroup().addTo(map);
    return trackLayer;
  }

  function renderPlanTracks() {
    if (typeof document === 'undefined') return;
    const layer = ensureTrackLayer();
    if (!layer) return;
    layer.clearLayers();

    const planId = base.state.activePlanId;
    if (!planId) return;
    const tracks = getPlanTracks(planId);
    const visible = session.displayMode === 'ALL' ? tracks : tracks.slice(0,1);
    const color = opticColor();

    visible.slice().reverse().forEach(track => {
      (track.segments || []).forEach(seg => {
        if (seg.kind === 'MEASURED') {
          const pts = (seg.points || []).map(p => [p.lat,p.lon]).filter(validCoords);
          if (pts.length >= 2) {
            L.polyline(pts, {
              interactive:false,
              color:color,
              weight: track.id === session.activeTrackId ? 3.5 : 2.7,
              opacity: track.id === session.activeTrackId ? 0.98 : 0.72,
              lineCap:'round',
              lineJoin:'round'
            }).addTo(layer);
          }
        } else if (seg.kind === 'ESTIMATED') {
          const a = [Number(seg.from?.lat),Number(seg.from?.lon)];
          const b = [Number(seg.to?.lat),Number(seg.to?.lon)];
          if (validCoords(a) && validCoords(b)) {
            L.polyline([a,b], {
              interactive:false,
              color:color,
              weight:2,
              opacity:0.46,
              dashArray:'5 8',
              lineCap:'butt'
            }).addTo(layer);
          }
        }
      });
    });
  }

  function seedFromBrowser() {
    try {
      if (gpsPowerEnabled && hasGpsFix && latestGpsPosition?.coords) {
        return {
          kind:'GPS',
          lat:Number(latestGpsPosition.coords.latitude),
          lon:Number(latestGpsPosition.coords.longitude),
          timestamp:nowTs(latestGpsPosition.timestamp),
          accuracyM:Number.isFinite(Number(latestGpsPosition.coords.accuracy))
            ? Number(latestGpsPosition.coords.accuracy) : undefined
        };
      }
      if (tempMarkPoint?.coords) {
        return { kind:'TEMP', coords:[Number(tempMarkPoint.coords[0]),Number(tempMarkPoint.coords[1])], timestamp:Date.now() };
      }
    } catch (e) {}
    return null;
  }

  function syncLegacyTrackFlags() {
    if (typeof trackRecording !== 'undefined') trackRecording = session.state !== 'OFF';
    if (typeof pendingTrackStart !== 'undefined') pendingTrackStart = false;
    if (typeof trackStartedAt !== 'undefined') {
      const track = currentTrack();
      trackStartedAt = track?.startedAt ? new Date(track.startedAt).toISOString() : null;
    }
  }

  function syncBrowserTrackState() {
    if (typeof document === 'undefined') return;
    syncLegacyTrackFlags();
    document.body.classList.toggle('track-recording', session.state === 'RECORDING');
    syncTrackStaticLabels();

    const button = document.getElementById('targetTrackRecBtn');
    if (button) {
      button.textContent = tRuntime('궤적 관리', 'TRACK MANAGE');
      button.classList.toggle('active', session.state !== 'OFF');
    }

    const hud = document.getElementById('navHudTrack');
    const track = currentTrack();
    if (hud) {
      hud.classList.add('v28-track-access');
      hud.setAttribute('role','button');
      hud.setAttribute('tabindex','0');
      const m = Number(track?.distance?.measuredKm || 0).toFixed(1);
      const e = Number(track?.distance?.estimatedKm || 0).toFixed(1);
      const isOn = session.state !== 'OFF';
      hud.setAttribute('aria-pressed', String(isOn));
      if (session.state === 'OFF') {
        hud.setAttribute('aria-label', tRuntime('궤적 기록 켜기', 'START TRACK'));
        hud.title = tRuntime('탭하여 궤적 기록 시작', 'TAP TO START TRACK');
        hud.textContent = tRuntime('궤적 OFF', 'TRACK OFF');
        hud.classList.remove('track-recording','track-paused');
      } else if (session.state === 'PAUSED') {
        hud.setAttribute('aria-label', tRuntime('궤적 기록 재개', 'RESUME TRACK'));
        hud.title = tRuntime('탭하여 궤적 기록 재개', 'TAP TO RESUME TRACK');
        hud.textContent = tRuntime('궤적 일시정지', 'TRACK PAUSED');
        hud.classList.remove('track-recording');
        hud.classList.add('track-paused');
      } else {
        hud.setAttribute('aria-label', tRuntime('궤적 기록 일시정지', 'PAUSE TRACK'));
        hud.title = tRuntime('탭하여 궤적 기록 일시정지', 'TAP TO PAUSE TRACK');
        hud.textContent = tRuntime('궤적 기록 중 · ', 'TRACK RECORDING · ') + m + ' KM';
        if (Number(e) > 0) hud.title += tRuntime(' · 추정 ', ' · EST ') + e + ' KM';
        hud.classList.add('track-recording');
        hud.classList.remove('track-paused');
      }
    }
  }

  function renderTrackSheet() {
    if (typeof document === 'undefined') return;
    syncTrackStaticLabels();
    const stateEl = document.getElementById('v28TrackState');
    const statsEl = document.getElementById('v28TrackStats');
    const listEl = document.getElementById('v28TrackList');
    const rec = document.getElementById('v28TrackRecord');
    const pause = document.getElementById('v28TrackPause');
    const resume = document.getElementById('v28TrackResume');
    const stop = document.getElementById('v28TrackStop');
    const latest = document.getElementById('v28TrackLatest');
    const all = document.getElementById('v28TrackAll');
    if (!stateEl || !statsEl || !listEl) return;

    const track = currentTrack();
    const stateLabel = session.state === 'RECORDING'
      ? tRuntime('기록 중', 'RECORDING')
      : session.state === 'PAUSED'
        ? tRuntime('일시정지', 'PAUSED')
        : tRuntime('대기', 'OFF');
    stateEl.textContent = session.recovered && session.state === 'PAUSED'
      ? tRuntime('복원됨 · 일시정지', 'RECOVERED · PAUSED')
      : stateLabel;
    statsEl.textContent = track
      ? tRuntime('실측 ', 'MEASURED ') + Number(track.distance?.measuredKm || 0).toFixed(2) +
        ' KM · ' + tRuntime('추정 ', 'EST ') + Number(track.distance?.estimatedKm || 0).toFixed(2) + ' KM'
      : tRuntime('실측 0.00 KM · 추정 0.00 KM', 'MEASURED 0.00 KM · EST 0.00 KM');

    if (rec) rec.disabled = session.state !== 'OFF' || !base.state.activePlanId;
    if (pause) pause.disabled = session.state !== 'RECORDING';
    if (resume) resume.disabled = session.state !== 'PAUSED';
    if (stop) stop.disabled = session.state === 'OFF';
    if (latest) latest.classList.toggle('active', session.displayMode === 'LATEST');
    if (all) all.classList.toggle('active', session.displayMode === 'ALL');

    const tracks = base.state.activePlanId ? getPlanTracks(base.state.activePlanId) : [];
    listEl.textContent = '';
    if (!tracks.length) {
      listEl.innerHTML = '<div class="v28-empty">' +
        tRuntime('저장된 궤적이 없습니다.', 'NO TRACKS') + '</div>';
      return;
    }

    tracks.forEach(item => {
      const row = document.createElement('div');
      row.className = 'v28-track-row' + (item.id === session.activeTrackId ? ' active' : '');
      const date = new Date(item.startedAt).toLocaleString(runtimeLang() === 'ko' ? 'ko-KR' : undefined);
      const durationMin = Math.round(trackDurationMs(item) / 60000);
      row.innerHTML =
        '<div class="v28-track-copy"><strong></strong><span></span></div>' +
        '<button class="v28-mini v28-track-delete" type="button"></button>';
      row.querySelector('strong').textContent =
        (item.endedAt ? tRuntime('궤적', 'TRACK') : tRuntime('기록 중', 'ACTIVE')) + ' · ' + date;
      row.querySelector('span').textContent =
        tRuntime('실측 ', '') + Number(item.distance?.measuredKm || 0).toFixed(2) + ' KM · ' +
        tRuntime('추정 ', 'EST ') + Number(item.distance?.estimatedKm || 0).toFixed(2) + ' KM · ' +
        durationMin + tRuntime('분', ' MIN');
      const del = row.querySelector('.v28-track-delete');
      del.textContent = tRuntime('삭제', 'DELETE');
      del.disabled = item.id === session.activeTrackId && session.state !== 'OFF';
      del.addEventListener('click', () => {
        if (!confirm(tRuntime('이 궤적을 삭제할까요?', 'DELETE THIS TRACK?'))) return;
        deleteTrack(item.id);
      });
      listEl.appendChild(row);
    });
  }

  function toggleHudTrack() {
    if (session.state === 'OFF') startBrowserTrack();
    else if (session.state === 'PAUSED') resumeBrowserTrack();
    else pauseTrack();
    syncBrowserTrackState();
    renderPlanTracks();
    if (document.getElementById('v28TrackSheet')?.classList.contains('open')) renderTrackSheet();
  }

  function openTrackSheet() {
    if (typeof document === 'undefined') return;
    if (typeof closeNavMore === 'function') closeNavMore();
    renderTrackSheet();
    document.getElementById('v28TrackSheet')?.classList.add('open');
    document.body.classList.add('v28-sheet-open');
  }

  function closeTrackSheet() {
    if (typeof document === 'undefined') return;
    document.getElementById('v28TrackSheet')?.classList.remove('open');
    document.body.classList.remove('v28-sheet-open');
  }

  function startBrowserTrack() {
    const planId = base.state.activePlanId;
    if (!planId) return null;
    return startTrack(planId, seedFromBrowser());
  }

  function resumeBrowserTrack() {
    return resumeTrack(seedFromBrowser());
  }

  function exportBrowserGpx() {
    const waypoints = typeof getWaypoints === 'function' ? getWaypoints('ALL') : [];
    const legacy = typeof getTrackLogs === 'function' ? getTrackLogs() : [];
    const v2 = Object.values(base.storage.getV28Tracks());
    if (!waypoints.length && !legacy.length && !v2.length) {
      alert(tRuntime('내보낼 거점 또는 궤적 기록이 없습니다.', 'NO SITES OR TRACK LOGS TO EXPORT.'));
      return;
    }
    const gpx = buildGpx(waypoints, legacy, v2);
    const blob = new Blob([gpx], { type:'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TACTICAL_RECON_V28_' + new Date().toISOString().slice(0,10) + '.gpx';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function selectedBacktrackTrack() {
    const planId = base.state.activePlanId;
    if (!planId) return null;
    const preferred = window.v29?.backtrack?.get?.(planId);
    if (preferred && buildBacktrackNodes(preferred).length) return preferred;
    const active = currentTrack();
    if (active?.planId === planId && buildBacktrackNodes(active).length) return active;
    return getPlanTracks(planId).find(track => buildBacktrackNodes(track).length) || null;
  }

  function installBrowserOverrides() {
    if (browserReady || typeof document === 'undefined') return;
    browserReady = true;
    document.body.classList.add('v28-integrated');

    ['navSearchBtn','targetTrackRecBtn','navHudTrack'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.dataset.v28TextOwner = '1';
    });

    const navTrackAccess = document.getElementById('navHudTrack');
    if (navTrackAccess && navTrackAccess.dataset.v28TrackAccess !== '1') {
      navTrackAccess.dataset.v28TrackAccess = '1';
      navTrackAccess.addEventListener('click', event => {
        event.stopPropagation();
        toggleHudTrack();
      });
      navTrackAccess.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        toggleHudTrack();
      });
    }

    const toolbar = document.getElementById('targetModeToolbar');
    if (toolbar && !document.getElementById('v28PlanTrackBtn')) {
      const button = document.createElement('button');
      button.className = 'osb-btn plan-main-only';
      button.id = 'v28PlanTrackBtn';
      button.type = 'button';
      button.textContent = tRuntime('궤적', 'TRACK');
      button.addEventListener('click', openTrackSheet);
      const exitButton = document.getElementById('planExitBtn') ||
        Array.from(toolbar.querySelectorAll('.plan-main-only')).find(el =>
          String(el.getAttribute('onclick') || '').includes('exitTargetMode')
        );
      if (exitButton) exitButton.id = 'planExitBtn';
      toolbar.insertBefore(button, exitButton || null);
    }

    const sheet = document.createElement('div');
    sheet.id = 'v28TrackSheet';
    sheet.className = 'v28-sheet';
    sheet.innerHTML =
      '<div class="v28-sheet-shell v28-track-shell">' +
        '<div class="v28-sheet-head"><div><small>TACTICAL RECON // V28</small><strong id="v28TrackTitle"></strong></div><button class="v28-sheet-close" id="v28TrackClose" type="button">×</button></div>' +
        '<div class="v28-track-status"><div><span id="v28TrackSessionLabel"></span><strong id="v28TrackState"></strong></div><div><span id="v28TrackDistanceLabel"></span><strong id="v28TrackStats"></strong></div></div>' +
        '<div class="v28-track-controls">' +
          '<button class="osb-btn active" id="v28TrackRecord" type="button"></button>' +
          '<button class="osb-btn" id="v28TrackPause" type="button"></button>' +
          '<button class="osb-btn" id="v28TrackResume" type="button"></button>' +
          '<button class="osb-btn v28-danger" id="v28TrackStop" type="button"></button>' +
        '</div>' +
        '<div class="v28-track-display"><button class="osb-btn active" id="v28TrackLatest" type="button"></button><button class="osb-btn" id="v28TrackAll" type="button"></button></div>' +
        '<div class="v28-track-list" id="v28TrackList"></div>' +
      '</div>';
    document.body.appendChild(sheet);
    syncTrackStaticLabels();

    document.getElementById('v28TrackClose')?.addEventListener('click', closeTrackSheet);
    sheet.addEventListener('click', event => {
      if (event.target === sheet) closeTrackSheet();
    });
    document.getElementById('v28TrackRecord')?.addEventListener('click', () => {
      startBrowserTrack();
      renderTrackSheet();
    });
    document.getElementById('v28TrackPause')?.addEventListener('click', () => {
      pauseTrack();
      renderTrackSheet();
    });
    document.getElementById('v28TrackResume')?.addEventListener('click', () => {
      resumeBrowserTrack();
      renderTrackSheet();
    });
    document.getElementById('v28TrackStop')?.addEventListener('click', () => {
      stopTrack();
      renderTrackSheet();
    });
    document.getElementById('v28TrackLatest')?.addEventListener('click', () => {
      session.displayMode = 'LATEST';
      renderPlanTracks();
      renderTrackSheet();
    });
    document.getElementById('v28TrackAll')?.addEventListener('click', () => {
      session.displayMode = 'ALL';
      renderPlanTracks();
      renderTrackSheet();
    });

    const legacyApplyGpsPosition = typeof applyGpsPosition === 'function' ? applyGpsPosition : null;
    if (legacyApplyGpsPosition) {
      applyGpsPosition = function(pos) {
        const wasInterrupted = !gpsPowerEnabled || !hasGpsFix ||
          gpsLockState === 'SIGNAL LOST' || gpsLockState === 'NO FIX' || gpsLockState === 'OFF';
        if (wasInterrupted) markGpsGap();
        return legacyApplyGpsPosition.apply(this, arguments);
      };
    }

    recordTrackPoint = function(pos) {
      if (!pos?.coords) return;
      recordGps({
        lat:Number(pos.coords.latitude),
        lon:Number(pos.coords.longitude),
        timestamp:nowTs(pos.timestamp),
        accuracyM:Number.isFinite(Number(pos.coords.accuracy)) ? Number(pos.coords.accuracy) : undefined
      });
      syncBrowserTrackState();
      renderTrackSheet();
    };

    startTrackRecording = function() {
      return startBrowserTrack();
    };

    stopTrackRecording = function() {
      return stopTrack();
    };

    toggleTrackRecording = function() {
      openTrackSheet();
    };

    const legacySetTempMark = typeof setTempMark === 'function' ? setTempMark : null;
    if (legacySetTempMark) {
      setTempMark = function(coords, name) {
        const result = legacySetTempMark.apply(this, arguments);
        const liveGps = gpsPowerEnabled && hasGpsFix;
        if (!liveGps && tempMarkPoint?.coords) {
          recordTemp(tempMarkPoint.coords, Date.now());
          syncBrowserTrackState();
          renderTrackSheet();
        }
        return result;
      };
    }

    stopGpsTracking = function() {
      markGpsGap();
      gpsSessionId++;
      if (gpsWatchId !== null) {
        try { navigator.geolocation.clearWatch(gpsWatchId); } catch (e) {}
        gpsWatchId = null;
      }
      gpsPowerEnabled = false;
      hasGpsFix = false;
      gpsLockState = 'OFF';
      gpsFollowEnabled = false;
      pendingNavStart = false;
      pendingTrackStart = false;
      currentGpsAltitude = null;
      latestGpsPosition = null;
      refreshPositionState();
      syncBrowserTrackState();
    };

    toggleBacktrack = function() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      if (!backtrackActive) {
        const track = selectedBacktrackTrack();
        if (!track || buildBacktrackNodes(track).length < 2) {
          alert(tRuntime('역추적에 사용할 궤적 기록이 없습니다.', 'NO TRACK AVAILABLE FOR BACKTRACK.'));
          return;
        }
      }
      backtrackActive = !backtrackActive;
      gpsFollowEnabled = false;
      session.backtrackEstimated = false;
      updateGpsTelemetry();
      updateTargetModePanel();
    };

    getBacktrackDestination = function() {
      const track = selectedBacktrackTrack();
      if (!track) return null;
      const ref = typeof getReferencePosition === 'function' ? getReferencePosition() : null;
      const result = backtrackDestination(track, ref?.coords || null, 8);
      session.backtrackEstimated = Boolean(result?.estimated);
      return result ? { name:result.name, coords:result.coords } : null;
    };

    exportToGPX = exportBrowserGpx;

    const previousUpdateTargetModePanel = typeof updateTargetModePanel === 'function' ? updateTargetModePanel : null;
    if (previousUpdateTargetModePanel) {
      updateTargetModePanel = function() {
        previousUpdateTargetModePanel.apply(this, arguments);
        syncBrowserTrackState();
        if (backtrackActive && session.backtrackEstimated) {
          const leg = document.getElementById('navHudLeg');
          const label = document.getElementById('navHudDistanceLabel');
          if (leg) leg.textContent = 'BACKTRACK · ESTIMATED BOUNDARY';
          if (label) label.textContent = 'DIRECT TO ESTIMATED ANCHOR';
        }
      };
    }

    new MutationObserver(() => {
      syncTrackStaticLabels();
      syncBrowserTrackState();
      if (document.getElementById('v28TrackSheet')?.classList.contains('open')) renderTrackSheet();
    }).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });

    recoverActiveTrack();
    syncBrowserTrackState();
    renderPlanTracks();

    gapTimer = setInterval(() => {
      if (session.state === 'RECORDING') {
        if (!gpsPowerEnabled || !hasGpsFix || gpsLockState === 'SIGNAL LOST' || gpsLockState === 'NO FIX') {
          markGpsGap();
        }
      }
    }, 1500);

    let lastPlanId = base.state.activePlanId;
    planRenderTimer = setInterval(() => {
      if (lastPlanId !== base.state.activePlanId) {
        lastPlanId = base.state.activePlanId;
        session.renderedPlanId = lastPlanId;
        renderPlanTracks();
        renderTrackSheet();
      }
    }, 1500);
  }

  const api = {
    constants: {
      TRACK_STORE_KEY:TRACK_STORE_KEY,
      ACTIVE_TRACK_KEY:ACTIVE_TRACK_KEY
    },
    get state() { return session.state; },
    get activeTrackId() { return session.activeTrackId; },
    get recovered() { return session.recovered; },
    list: getPlanTracks,
    get: getTrack,
    start: startTrack,
    pause: pauseTrack,
    resume: resumeTrack,
    stop: stopTrack,
    delete: deleteTrack,
    recordGps: recordGps,
    recordTemp: recordTemp,
    markGpsGap: markGpsGap,
    recover: recoverActiveTrack,
    render: renderPlanTracks,
    buildBacktrackNodes: buildBacktrackNodes,
    backtrackDestination: backtrackDestination,
    buildGpx: buildGpx,
    openControl: openTrackSheet
  };

  base.track = api;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installBrowserOverrides, { once:true });
    } else {
      installBrowserOverrides();
    }
  }
})();
