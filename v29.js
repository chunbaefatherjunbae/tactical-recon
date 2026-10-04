/* Tactical Recon V29 core
 * FIELD REUSE + EMERGENCY NAV
 * WMM2025 coefficient data and geomagnetic synthesis are based on NOAA/NCEI
 * World Magnetic Model public-domain material (epoch 2025.0, degree/order 12).
 */
(() => {
  'use strict';

  const root = typeof window !== 'undefined' ? window : globalThis;
  const base = root.v28;
  if (!base) {
    if (typeof console !== 'undefined') console.warn('V29 core requires window.v28');
    return;
  }

  const OVERLAY_META_KEY = 'tactical_recon_v29_overlay_meta_v1';
  const BACKTRACK_PREF_KEY = 'tactical_recon_v29_backtrack_v1';
  const EMERGENCY_STATE_KEY = 'tactical_recon_v29_emergency_v1';
  const OVERLAY_TYPES = Object.freeze(['DANGER','REFERENCE','BLOCKED','OBSERVATION','OTHER']);

  const EARTH_KM = 6371.0088;
  const DEG = Math.PI / 180;
  const RAD = 180 / Math.PI;

  function validCoords(coords) {
    return Array.isArray(coords) && coords.length === 2 &&
      Number.isFinite(Number(coords[0])) && Number.isFinite(Number(coords[1])) &&
      Number(coords[0]) >= -90 && Number(coords[0]) <= 90 &&
      Number(coords[1]) >= -180 && Number(coords[1]) <= 180;
  }

  function cloneCoords(coords) {
    return validCoords(coords) ? [Number(coords[0]), Number(coords[1])] : null;
  }

  function clamp(value, lo, hi) {
    return Math.max(lo, Math.min(hi, value));
  }

  function normalize360(deg) {
    const value = Number(deg);
    if (!Number.isFinite(value)) return NaN;
    return ((value % 360) + 360) % 360;
  }

  function signed180(deg) {
    const v = normalize360(deg);
    return v > 180 ? v - 360 : v;
  }

  function haversineKm(a, b) {
    if (!validCoords(a) || !validCoords(b)) return NaN;
    const lat1 = Number(a[0]) * DEG;
    const lat2 = Number(b[0]) * DEG;
    const dLat = (Number(b[0]) - Number(a[0])) * DEG;
    const dLon = (Number(b[1]) - Number(a[1])) * DEG;
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return EARTH_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
  }

  function initialBearing(a, b) {
    if (!validCoords(a) || !validCoords(b)) return NaN;
    const p1 = Number(a[0]) * DEG;
    const p2 = Number(b[0]) * DEG;
    const dl = (Number(b[1]) - Number(a[1])) * DEG;
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) -
      Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return normalize360(Math.atan2(y, x) * RAD);
  }

  function pointSegmentDistanceMeters(point, a, b) {
    if (!validCoords(point) || !validCoords(a) || !validCoords(b)) return Infinity;
    const lat0 = Number(point[0]) * DEG;
    const cos = Math.max(0.01, Math.cos(lat0));
    const toXY = c => [
      (Number(c[1]) - Number(point[1])) * 111320 * cos,
      (Number(c[0]) - Number(point[0])) * 110540
    ];
    const A = toXY(a);
    const B = toXY(b);
    const vx = B[0] - A[0], vy = B[1] - A[1];
    const denom = vx * vx + vy * vy;
    if (!denom) return Math.hypot(A[0], A[1]);
    const t = clamp(-(A[0] * vx + A[1] * vy) / denom, 0, 1);
    return Math.hypot(A[0] + t * vx, A[1] + t * vy);
  }

  function simplifyCoords(points, toleranceMeters = 15) {
    const clean = Array.isArray(points)
      ? points.map(p => Array.isArray(p) ? [Number(p[0]), Number(p[1])] : null).filter(validCoords)
      : [];
    if (clean.length <= 2) return clean.map(p => [...p]);
    const tolerance = Math.max(0, Number(toleranceMeters) || 0);
    if (!tolerance) return clean.map(p => [...p]);

    function recurse(start, end, keep) {
      let max = -1;
      let index = -1;
      for (let i = start + 1; i < end; i++) {
        const d = pointSegmentDistanceMeters(clean[i], clean[start], clean[end]);
        if (d > max) { max = d; index = i; }
      }
      if (max > tolerance && index > start) {
        keep.add(index);
        recurse(start, index, keep);
        recurse(index, end, keep);
      }
    }

    const keep = new Set([0, clean.length - 1]);
    recurse(0, clean.length - 1, keep);
    return [...keep].sort((a,b) => a-b).map(i => [...clean[i]]);
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function measuredSegments(track) {
    if (!track || !Array.isArray(track.segments)) return [];
    return track.segments
      .filter(seg => seg?.kind === 'MEASURED' && Array.isArray(seg.points))
      .map(seg => seg.points
        .map(p => {
          const lat = Number(p?.lat);
          const lon = Number(p?.lon);
          return Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null;
        })
        .filter(validCoords))
      .filter(seg => seg.length >= 2);
  }

  function measuredTrackPoints(track) {
    return measuredSegments(track).flat();
  }

  function trackDurationMs(track) {
    if (!track) return 0;
    const start = Number(track.startedAt);
    const end = Number(track.endedAt || Date.now());
    return Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, end - start) : 0;
  }

  function trackMetrics(track) {
    const measuredKm = Math.max(0, Number(track?.distance?.measuredKm) || 0);
    const estimatedKm = Math.max(0, Number(track?.distance?.estimatedKm) || 0);
    const durationMs = trackDurationMs(track);
    const hours = durationMs / 3600000;
    return {
      id:String(track?.id || ''),
      startedAt:Number(track?.startedAt) || 0,
      endedAt:Number(track?.endedAt) || 0,
      measuredKm,
      estimatedKm,
      totalKm:measuredKm + estimatedKm,
      durationMs,
      averageMeasuredKph:hours > 0 ? measuredKm / hours : 0,
      measuredPoints:measuredTrackPoints(track).length
    };
  }

  function nearestPolylineMeters(point, line) {
    if (!validCoords(point) || !Array.isArray(line) || !line.length) return Infinity;
    if (line.length === 1) return haversineKm(point, line[0]) * 1000;
    let best = Infinity;
    for (let i = 1; i < line.length; i++) {
      best = Math.min(best, pointSegmentDistanceMeters(point, line[i - 1], line[i]));
    }
    return best;
  }

  function sampleLine(points, max = 120) {
    if (!Array.isArray(points) || points.length <= max) return points || [];
    const out = [];
    const step = (points.length - 1) / (max - 1);
    for (let i = 0; i < max; i++) out.push(points[Math.round(i * step)]);
    return out;
  }

  function compareTracks(trackA, trackB) {
    if (!trackA || !trackB) return null;
    const a = simplifyCoords(measuredTrackPoints(trackA), 8);
    const b = simplifyCoords(measuredTrackPoints(trackB), 8);
    let meanDeviationM = NaN;
    let maxDeviationM = NaN;
    if (a.length >= 2 && b.length >= 2) {
      const sa = sampleLine(a);
      const sb = sampleLine(b);
      const distances = [
        ...sa.map(p => nearestPolylineMeters(p, b)),
        ...sb.map(p => nearestPolylineMeters(p, a))
      ].filter(Number.isFinite);
      if (distances.length) {
        meanDeviationM = distances.reduce((x,y) => x + y, 0) / distances.length;
        maxDeviationM = Math.max(...distances);
      }
    }
    const ma = trackMetrics(trackA);
    const mb = trackMetrics(trackB);
    return {
      a:ma,
      b:mb,
      measuredDeltaKm:mb.measuredKm - ma.measuredKm,
      estimatedDeltaKm:mb.estimatedKm - ma.estimatedKm,
      durationDeltaMs:mb.durationMs - ma.durationMs,
      averageSpeedDeltaKph:mb.averageMeasuredKph - ma.averageMeasuredKph,
      meanDeviationM,
      maxDeviationM
    };
  }

  function createTrackRoute(trackId, options = {}) {
    const track = base.track?.get?.(trackId);
    if (!track) return null;
    const sourcePlan = track.planId ? base.plans.get(track.planId) : null;
    const tolerance = clamp(Number(options.toleranceMeters ?? 15) || 15, 0, 500);
    const segments = measuredSegments(track)
      .map(seg => simplifyCoords(seg, tolerance))
      .filter(seg => seg.length >= 2);
    if (!segments.length) return null;

    const objective = sourcePlan?.objective || track.objectiveSnapshot;
    const defaultName = (sourcePlan?.name || objective?.name || 'TRACK') + ' · TRACK ROUTE';
    const created = base.plans.create({
      name:String(options.name || defaultName).slice(0,120),
      objective
    });
    if (!created) return null;

    const first = segments[0][0];
    const lastSeg = segments[segments.length - 1];
    const last = lastSeg[lastSeg.length - 1];
    const next = {
      ...created,
      objective:created.objective,
      startPoint:{
        id:'V29-START-' + Date.now().toString(36),
        role:'START', name:'TRACK START', coords:[...first], source:'IMPORT'
      },
      viaPoints:[],
      endPoint:{
        id:'V29-END-' + Date.now().toString(36),
        role:'END', name:'TRACK END', coords:[...last], source:'IMPORT'
      },
      routeSegments:segments.map(seg => seg.map(c => [...c])),
      overlaySegments:[],
      trackIds:[],
      updatedAt:Date.now()
    };
    if (!base.storage.saveV28Plan(next)) return null;
    return base.plans.get(created.id);
  }

  function clonePlan(planId, options = {}) {
    const source = base.plans.get(planId);
    if (!source) return null;
    const objective = source.objective ? {
      id:source.objective.id,
      name:source.objective.name,
      coords:[...source.objective.coords],
      source:source.objective.source,
      siteId:source.objective.siteId,
      address:source.objective.address
    } : undefined;
    const created = base.plans.create({
      name:String(options.name || (source.name + ' · COPY')).slice(0,120),
      objective
    });
    if (!created) return null;
    const copyPoint = (p, role) => p && validCoords(p.coords) ? {
      id:'V29-' + role + '-' + Math.random().toString(36).slice(2,9),
      role,
      name:String(p.name || role),
      coords:[...p.coords],
      source:p.source || 'IMPORT',
      siteId:p.siteId,
      address:p.address
    } : undefined;
    const next = {
      ...created,
      objective:created.objective,
      startPoint:copyPoint(source.startPoint,'START'),
      viaPoints:(source.viaPoints || []).map(p => copyPoint(p,'VIA')).filter(Boolean),
      endPoint:copyPoint(source.endPoint,'END'),
      routeSegments:(source.routeSegments || []).map(seg => seg.filter(validCoords).map(c => [...c])).filter(seg => seg.length),
      overlaySegments:(source.overlaySegments || []).map(seg => seg.filter(validCoords).map(c => [...c])).filter(seg => seg.length),
      trackIds:[],
      updatedAt:Date.now()
    };
    if (!base.storage.saveV28Plan(next)) return null;

    const overlay = getOverlayMeta(planId);
    if (overlay.length) {
      const store = getOverlayStore();
      store[created.id] = overlay.map(item => ({...item}));
      writeJson(OVERLAY_META_KEY, store);
    }
    return base.plans.get(created.id);
  }

  function getOverlayStore() {
    const value = readJson(OVERLAY_META_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function getOverlayMeta(planId) {
    const plan = base.plans.get(planId);
    const count = Array.isArray(plan?.overlaySegments) ? plan.overlaySegments.length : 0;
    const raw = getOverlayStore()[String(planId)] || [];
    return Array.isArray(raw)
      ? raw.filter(item =>
          Number.isInteger(item?.segmentIndex) &&
          item.segmentIndex >= 0 && item.segmentIndex < count &&
          OVERLAY_TYPES.includes(item.type))
        .map(item => ({
          segmentIndex:item.segmentIndex,
          type:item.type,
          label:String(item.label || '').slice(0,80)
        }))
      : [];
  }

  function setOverlayMeta(planId, segmentIndex, type, label = '') {
    const plan = base.plans.get(planId);
    const count = Array.isArray(plan?.overlaySegments) ? plan.overlaySegments.length : 0;
    const index = Number(segmentIndex);
    const normalizedType = String(type || '').toUpperCase();
    if (!Number.isInteger(index) || index < 0 || index >= count || !OVERLAY_TYPES.includes(normalizedType)) return false;
    const store = getOverlayStore();
    const list = Array.isArray(store[String(planId)]) ? store[String(planId)].filter(x => x?.segmentIndex !== index) : [];
    list.push({segmentIndex:index,type:normalizedType,label:String(label || '').slice(0,80)});
    list.sort((a,b) => a.segmentIndex - b.segmentIndex);
    store[String(planId)] = list;
    return writeJson(OVERLAY_META_KEY, store);
  }

  function clearOverlayMeta(planId, segmentIndex) {
    const store = getOverlayStore();
    const key = String(planId);
    if (!Array.isArray(store[key])) return true;
    store[key] = store[key].filter(item => item?.segmentIndex !== Number(segmentIndex));
    if (!store[key].length) delete store[key];
    return writeJson(OVERLAY_META_KEY, store);
  }

  function getBacktrackPrefs() {
    const value = readJson(BACKTRACK_PREF_KEY, {});
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }

  function setBacktrackTrack(planId, trackId) {
    const track = base.track?.get?.(trackId);
    if (!track || String(track.planId || '') !== String(planId || '')) return false;
    if ((base.track?.buildBacktrackNodes?.(track) || []).length < 2) return false;
    const prefs = getBacktrackPrefs();
    prefs[String(planId)] = String(trackId);
    return writeJson(BACKTRACK_PREF_KEY, prefs);
  }

  function getBacktrackTrack(planId) {
    const prefs = getBacktrackPrefs();
    const id = prefs[String(planId)] || '';
    const track = id ? base.track?.get?.(id) : null;
    return track && String(track.planId || '') === String(planId || '') ? track : null;
  }

  const WMM_COF = `2025.0 WMM-2025 11/13/2024
1 0 -29351.8 0.0 12.0 0.0
1 1 -1410.8 4545.4 9.7 -21.5
2 0 -2556.6 0.0 -11.6 0.0
2 1 2951.1 -3133.6 -5.2 -27.7
2 2 1649.3 -815.1 -8.0 -12.1
3 0 1361.0 0.0 -1.3 0.0
3 1 -2404.1 -56.6 -4.2 4.0
3 2 1243.8 237.5 0.4 -0.3
3 3 453.6 -549.5 -15.6 -4.1
4 0 895.0 0.0 -1.6 0.0
4 1 799.5 278.6 -2.4 -1.1
4 2 55.7 -133.9 -6.0 4.1
4 3 -281.1 212.0 5.6 1.6
4 4 12.1 -375.6 -7.0 -4.4
5 0 -233.2 0.0 0.6 0.0
5 1 368.9 45.4 1.4 -0.5
5 2 187.2 220.2 0.0 2.2
5 3 -138.7 -122.9 0.6 0.4
5 4 -142.0 43.0 2.2 1.7
5 5 20.9 106.1 0.9 1.9
6 0 64.4 0.0 -0.2 0.0
6 1 63.8 -18.4 -0.4 0.3
6 2 76.9 16.8 0.9 -1.6
6 3 -115.7 48.8 1.2 -0.4
6 4 -40.9 -59.8 -0.9 0.9
6 5 14.9 10.9 0.3 0.7
6 6 -60.7 72.7 0.9 0.9
7 0 79.5 0.0 -0.0 0.0
7 1 -77.0 -48.9 -0.1 0.6
7 2 -8.8 -14.4 -0.1 0.5
7 3 59.3 -1.0 0.5 -0.8
7 4 15.8 23.4 -0.1 0.0
7 5 2.5 -7.4 -0.8 -1.0
7 6 -11.1 -25.1 -0.8 0.6
7 7 14.2 -2.3 0.8 -0.2
8 0 23.2 0.0 -0.1 0.0
8 1 10.8 7.1 0.2 -0.2
8 2 -17.5 -12.6 0.0 0.5
8 3 2.0 11.4 0.5 -0.4
8 4 -21.7 -9.7 -0.1 0.4
8 5 16.9 12.7 0.3 -0.5
8 6 15.0 0.7 0.2 -0.6
8 7 -16.8 -5.2 -0.0 0.3
8 8 0.9 3.9 0.2 0.2
9 0 4.6 0.0 -0.0 0.0
9 1 7.8 -24.8 -0.1 -0.3
9 2 3.0 12.2 0.1 0.3
9 3 -0.2 8.3 0.3 -0.3
9 4 -2.5 -3.3 -0.3 0.3
9 5 -13.1 -5.2 0.0 0.2
9 6 2.4 7.2 0.3 -0.1
9 7 8.6 -0.6 -0.1 -0.2
9 8 -8.7 0.8 0.1 0.4
9 9 -12.9 10.0 -0.1 0.1
10 0 -1.3 0.0 0.1 0.0
10 1 -6.4 3.3 0.0 0.0
10 2 0.2 0.0 0.1 -0.0
10 3 2.0 2.4 0.1 -0.2
10 4 -1.0 5.3 -0.0 0.1
10 5 -0.6 -9.1 -0.3 -0.1
10 6 -0.9 0.4 0.0 0.1
10 7 1.5 -4.2 -0.1 0.0
10 8 0.9 -3.8 -0.1 -0.1
10 9 -2.7 0.9 -0.0 0.2
10 10 -3.9 -9.1 -0.0 -0.0
11 0 2.9 0.0 0.0 0.0
11 1 -1.5 0.0 -0.0 -0.0
11 2 -2.5 2.9 0.0 0.1
11 3 2.4 -0.6 0.0 -0.0
11 4 -0.6 0.2 0.0 0.1
11 5 -0.1 0.5 -0.1 -0.0
11 6 -0.6 -0.3 0.0 -0.0
11 7 -0.1 -1.2 -0.0 0.1
11 8 1.1 -1.7 -0.1 -0.0
11 9 -1.0 -2.9 -0.1 0.0
11 10 -0.2 -1.8 -0.1 0.0
11 11 2.6 -2.3 -0.1 0.0
12 0 -2.0 0.0 0.0 0.0
12 1 -0.2 -1.3 0.0 -0.0
12 2 0.3 0.7 -0.0 0.0
12 3 1.2 1.0 -0.0 -0.1
12 4 -1.3 -1.4 -0.0 0.1
12 5 0.6 -0.0 -0.0 -0.0
12 6 0.6 0.6 0.1 -0.0
12 7 0.5 -0.1 -0.0 -0.0
12 8 -0.1 0.8 0.0 0.0
12 9 -0.4 0.1 0.0 -0.0
12 10 -0.2 -1.0 -0.1 -0.0
12 11 -1.3 0.1 -0.0 0.0
12 12 -0.7 0.2 -0.1 -0.1`;

  function matrix13() {
    return Array.from({length:13}, () => Array(13).fill(0));
  }

  function buildWmmModel() {
    const c = matrix13();
    const cd = matrix13();
    const k = matrix13();
    const fn = Array(13).fill(0);
    const fm = Array(13).fill(0);
    const rows = WMM_COF.trim().split(/\n+/);
    const header = rows.shift().trim().split(/\s+/);
    const epoch = Number(header[0]);
    rows.forEach(line => {
      const p = line.trim().split(/\s+/).map(Number);
      if (p.length < 6) return;
      const [n,m,g,h,dg,dh] = p;
      c[m][n] = g;
      cd[m][n] = dg;
      if (m !== 0) {
        c[n][m - 1] = h;
        cd[n][m - 1] = dh;
      }
    });

    const snorm = Array(169).fill(0);
    snorm[0] = 1;
    fm[0] = 0;
    for (let n = 1; n <= 12; n++) {
      snorm[n] = snorm[n - 1] * (2 * n - 1) / n;
      let j = 2;
      for (let m = 0; m <= n; m++) {
        k[m][n] = (((n - 1) * (n - 1)) - m * m) / ((2 * n - 1) * (2 * n - 3));
        if (m > 0) {
          const flnmj = ((n - m + 1) * j) / (n + m);
          snorm[n + m * 13] = snorm[n + (m - 1) * 13] * Math.sqrt(flnmj);
          j = 1;
          c[n][m - 1] *= snorm[n + m * 13];
          cd[n][m - 1] *= snorm[n + m * 13];
        }
        c[m][n] *= snorm[n + m * 13];
        cd[m][n] *= snorm[n + m * 13];
      }
      fn[n] = n + 1;
      fm[n] = n;
    }
    k[1][1] = 0;
    return {epoch,c,cd,k,fn,fm};
  }

  const WMM_MODEL = buildWmmModel();

  function decimalYear(value = new Date()) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const d = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(d.getTime())) return NaN;
    const y = d.getUTCFullYear();
    const start = Date.UTC(y,0,1);
    const end = Date.UTC(y + 1,0,1);
    return y + (d.getTime() - start) / (end - start);
  }

  function wmmField(lat, lon, altitudeKm = 0, date = new Date()) {
    lat = Number(lat); lon = Number(lon); altitudeKm = Number(altitudeKm) || 0;
    const year = decimalYear(date);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 360) return null;
    if (!Number.isFinite(year) || year < 2025 || year >= 2030) return {
      valid:false, reason:'MODEL_DATE_OUT_OF_RANGE', epoch:2025, validUntil:2030
    };

    const MAX = 12;
    const A = 6378.137, B = 6356.7523142, RE = 6371.2;
    const A2 = A*A, B2 = B*B, C2 = A2-B2, A4=A2*A2, B4=B2*B2, C4=A4-B4;
    const dt = year - WMM_MODEL.epoch;
    const rlon = lon * DEG, rlat = lat * DEG;
    const srlon=Math.sin(rlon), srlat=Math.sin(rlat), crlon=Math.cos(rlon), crlat=Math.cos(rlat);
    const srlat2=srlat*srlat, crlat2=crlat*crlat;

    const sp=Array(13).fill(0), cp=Array(13).fill(0), pp=Array(13).fill(0);
    const p=Array(169).fill(0), dp=matrix13(), tc=matrix13();
    p[0]=1; pp[0]=1; cp[0]=1; dp[0][0]=0;
    sp[1]=srlon; cp[1]=crlon;

    const q=Math.sqrt(A2-C2*srlat2);
    const q1=altitudeKm*q;
    const q2=((q1+A2)/(q1+B2))**2;
    const ct=srlat/Math.sqrt(q2*crlat2+srlat2);
    const st=Math.sqrt(Math.max(0,1-ct*ct));
    const r2=altitudeKm*altitudeKm+2*q1+(A4-C4*srlat2)/(q*q);
    const r=Math.sqrt(r2);
    const d=Math.sqrt(A2*crlat2+B2*srlat2);
    const ca=(altitudeKm+d)/r;
    const sa=C2*crlat*srlat/(r*d);

    for(let m=2;m<=MAX;m++){
      sp[m]=sp[1]*cp[m-1]+cp[1]*sp[m-1];
      cp[m]=cp[1]*cp[m-1]-sp[1]*sp[m-1];
    }

    const aor=RE/r;
    let ar=aor*aor, br=0, bt=0, bp=0, bpp=0;
    for(let n=1;n<=MAX;n++){
      ar*=aor;
      for(let m=0;m<=n;m++){
        const idx=n+m*13;
        if(n===m){
          p[idx]=st*p[n-1+(m-1)*13];
          dp[m][n]=st*dp[m-1][n-1]+ct*p[n-1+(m-1)*13];
        } else if(n===1 && m===0){
          p[idx]=ct*p[n-1+m*13];
          dp[m][n]=ct*dp[m][n-1]-st*p[n-1+m*13];
        } else if(n>1 && n!==m){
          if(m>n-2){ p[n-2+m*13]=0; dp[m][n-2]=0; }
          p[idx]=ct*p[n-1+m*13]-WMM_MODEL.k[m][n]*p[n-2+m*13];
          dp[m][n]=ct*dp[m][n-1]-st*p[n-1+m*13]-WMM_MODEL.k[m][n]*dp[m][n-2];
        }

        tc[m][n]=WMM_MODEL.c[m][n]+dt*WMM_MODEL.cd[m][n];
        if(m!==0) tc[n][m-1]=WMM_MODEL.c[n][m-1]+dt*WMM_MODEL.cd[n][m-1];
        const par=ar*p[idx];
        let temp1,temp2;
        if(m===0){
          temp1=tc[m][n]*cp[m];
          temp2=tc[m][n]*sp[m];
        } else {
          temp1=tc[m][n]*cp[m]+tc[n][m-1]*sp[m];
          temp2=tc[m][n]*sp[m]-tc[n][m-1]*cp[m];
        }
        bt-=ar*temp1*dp[m][n];
        bp+=WMM_MODEL.fm[m]*temp2*par;
        br+=WMM_MODEL.fn[n]*temp1*par;

        if(st===0 && m===1){
          if(n===1) pp[n]=pp[n-1];
          else pp[n]=ct*pp[n-1]-WMM_MODEL.k[m][n]*pp[n-2];
          bpp+=WMM_MODEL.fm[m]*temp2*ar*pp[n];
        }
      }
    }
    bp=st===0?bpp:bp/st;
    const x=-bt*ca-br*sa;
    const y=bp;
    const z=bt*sa-br*ca;
    const h=Math.hypot(x,y);
    const f=Math.hypot(h,z);
    const declination=Math.atan2(y,x)*RAD;
    const inclination=Math.atan2(z,h)*RAD;
    return {
      valid:true, model:'WMM-2025', epoch:2025, validUntil:2030, decimalYear:year,
      x,y,z,h,f,declination,inclination
    };
  }

  function utmZone(lon) {
    const value = Number(lon);
    if (!Number.isFinite(value)) return null;
    return clamp(Math.floor((value + 180) / 6) + 1, 1, 60);
  }

  function gridConvergence(lat, lon) {
    lat=Number(lat);lon=Number(lon);
    if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-80||lat>84) return NaN;
    const zone=utmZone(lon);
    const central=zone*6-183;
    const dl=(lon-central)*DEG;
    return Math.atan(Math.tan(dl)*Math.sin(lat*DEG))*RAD;
  }

  function bearingBundle(current, target, options = {}) {
    if (!validCoords(current) || !validCoords(target)) return null;
    const trueBearing=initialBearing(current,target);
    const convergence=gridConvergence(current[0],current[1]);
    const field=wmmField(current[0],current[1],Number(options.altitudeKm)||0,options.date||new Date());
    const declination=field?.valid?field.declination:NaN;
    return {
      distanceKm:haversineKm(current,target),
      trueBearing,
      convergence,
      gridBearing:Number.isFinite(convergence)?normalize360(trueBearing-convergence):NaN,
      declination,
      magneticBearing:Number.isFinite(declination)?normalize360(trueBearing-declination):NaN,
      zone:utmZone(current[1]),
      model:field
    };
  }

  function getEmergencyState() {
    const raw=readJson(EMERGENCY_STATE_KEY,{});
    return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};
  }

  function saveEmergencyState(state) {
    const clean={};
    if(validCoords(state?.current)) clean.current=[...state.current];
    if(validCoords(state?.target)) clean.target=[...state.target];
    if(state?.currentSource) clean.currentSource=String(state.currentSource).slice(0,30);
    if(state?.targetSource) clean.targetSource=String(state.targetSource).slice(0,30);
    clean.updatedAt=Date.now();
    return writeJson(EMERGENCY_STATE_KEY,clean);
  }

  function xmlEscape(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'
    }[ch]));
  }

  function estimatedAnchorCoords(value) {
    if (validCoords(value)) return [Number(value[0]),Number(value[1])];
    if (validCoords(value?.coords)) return [Number(value.coords[0]),Number(value.coords[1])];
    const lat=Number(value?.lat),lon=Number(value?.lon);
    return Number.isFinite(lat)&&Number.isFinite(lon)&&validCoords([lat,lon])?[lat,lon]:null;
  }

  function trkPointXml(p) {
    return '<trkpt lat="'+Number(p.lat).toFixed(7)+'" lon="'+Number(p.lon).toFixed(7)+'">'+
      (Number.isFinite(Number(p.timestamp))?'<time>'+new Date(Number(p.timestamp)).toISOString()+'</time>':'')+
      '</trkpt>';
  }

  function rtePointXml(coords, name) {
    return '<rtept lat="'+Number(coords[0]).toFixed(7)+'" lon="'+Number(coords[1]).toFixed(7)+'">'+
      (name?'<name>'+xmlEscape(name)+'</name>':'')+'</rtept>';
  }

  function buildSelectedGpx(options = {}) {
    const plan=options.planId?base.plans.get(options.planId):null;
    const ids=Array.isArray(options.trackIds)?options.trackIds.map(String):[];
    const tracks=ids.map(id=>base.track.get(id)).filter(Boolean);
    const includePlanRoute=options.includePlanRoute!==false;
    const includeEstimated=Boolean(options.includeEstimated);
    const parts=[
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<gpx version="1.1" creator="TACTICAL RECON V29" xmlns="http://www.topografix.com/GPX/1/1">',
      '<metadata><name>TACTICAL RECON V29 EXPORT</name><time>'+new Date().toISOString()+'</time></metadata>'
    ];

    if(plan?.objective?.coords) parts.push('<wpt lat="'+plan.objective.coords[0].toFixed(7)+'" lon="'+plan.objective.coords[1].toFixed(7)+'"><name>'+xmlEscape('OBJECTIVE · '+plan.objective.name)+'</name></wpt>');
    if(plan?.startPoint?.coords) parts.push('<wpt lat="'+plan.startPoint.coords[0].toFixed(7)+'" lon="'+plan.startPoint.coords[1].toFixed(7)+'"><name>'+xmlEscape(plan.startPoint.name||'START')+'</name></wpt>');
    (plan?.viaPoints||[]).forEach(v=>{if(validCoords(v.coords))parts.push('<wpt lat="'+v.coords[0].toFixed(7)+'" lon="'+v.coords[1].toFixed(7)+'"><name>'+xmlEscape(v.name||'VIA')+'</name></wpt>');});
    if(plan?.endPoint?.coords) parts.push('<wpt lat="'+plan.endPoint.coords[0].toFixed(7)+'" lon="'+plan.endPoint.coords[1].toFixed(7)+'"><name>'+xmlEscape(plan.endPoint.name||'END')+'</name></wpt>');

    if(plan && includePlanRoute){
      (plan.routeSegments||[]).forEach((seg,index)=>{
        const clean=seg.filter(validCoords);
        if(clean.length<2)return;
        parts.push('<rte><name>'+xmlEscape(plan.name+' · ROUTE '+(index+1))+'</name>');
        clean.forEach((c,i)=>parts.push(rtePointXml(c,i===0?'START':i===clean.length-1?'END':'')));
        parts.push('</rte>');
      });
    }

    tracks.forEach(track=>{
      const measured=(track.segments||[]).filter(seg=>seg?.kind==='MEASURED'&&Array.isArray(seg.points)&&seg.points.length);
      if(measured.length){
        parts.push('<trk><name>'+xmlEscape('TRACK · '+new Date(track.startedAt).toISOString())+'</name>');
        measured.forEach(seg=>{
          parts.push('<trkseg>');
          seg.points.forEach(p=>parts.push(trkPointXml(p)));
          parts.push('</trkseg>');
        });
        parts.push('</trk>');
      }

      if(includeEstimated){
        (track.segments||[]).filter(seg=>seg?.kind==='ESTIMATED').forEach((seg,index)=>{
          const from=estimatedAnchorCoords(seg.from);
          const to=estimatedAnchorCoords(seg.to);
          if(!from||!to)return;
          parts.push('<rte><name>'+xmlEscape('ESTIMATED · '+(seg.reason||'GAP')+' · '+(index+1))+'</name>');
          parts.push(rtePointXml(from,'EST FROM'));
          parts.push(rtePointXml(to,'EST TO'));
          parts.push('</rte>');
        });
      }
    });
    parts.push('</gpx>');
    return parts.join('');
  }

  const api = {
    constants:{OVERLAY_META_KEY,BACKTRACK_PREF_KEY,EMERGENCY_STATE_KEY,OVERLAY_TYPES,WMM_EPOCH:2025,WMM_VALID_UNTIL:2030},
    geo:{validCoords,haversineKm,initialBearing,normalize360,signed180,simplifyCoords,gridConvergence,utmZone,bearingBundle},
    reuse:{createTrackRoute,clonePlan},
    compare:{metrics:trackMetrics,tracks:compareTracks},
    overlays:{list:getOverlayMeta,set:setOverlayMeta,clear:clearOverlayMeta,types:OVERLAY_TYPES},
    backtrack:{set:setBacktrackTrack,get:getBacktrackTrack},
    magnetic:{decimalYear,wmmField},
    emergency:{getState:getEmergencyState,saveState:saveEmergencyState},
    gpx:{buildSelected:buildSelectedGpx}
  };

  root.v29 = api;
})();
