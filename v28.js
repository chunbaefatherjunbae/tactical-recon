window.v28 = (function() {
  const PLAN_STORAGE_KEY = 'tactical_recon_plans_v1';
  const TRACK_V2_STORAGE_KEY = 'tactical_recon_track_logs_v2';
  const TRACK_V1_STORAGE_KEY = 'tactical_recon_track_logs_v1';
  const ROUTE_PLAN_STORAGE_KEY = 'tactical_recon_registered_routes_v1';
  const INTEL_V2_STORAGE_KEY = 'tactical_recon_intel_v2';
  
  let activePlanId = null;
  let activeTrackId = null;

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  // --- Strict Validators (for stored data) ---
  function isValidCoords(coords) {
    if (!Array.isArray(coords) || coords.length !== 2) return false;
    const lat = coords[0], lon = coords[1];
    return typeof lat === 'number' && typeof lon === 'number' &&
           !isNaN(lat) && !isNaN(lon) && isFinite(lat) && isFinite(lon) &&
           lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  }

  function isValidTimestamp(ts) {
    return typeof ts === 'number' && !isNaN(ts) && isFinite(ts) && ts > 0;
  }

  function isValidString(str) {
    return typeof str === 'string' && str.length > 0;
  }

  function isValidPlanPoint(point) {
    if (!point || typeof point !== 'object') return false;
    if (!isValidString(point.id)) return false;
    if (!['OBJECTIVE', 'START', 'VIA', 'END'].includes(point.role)) return false;
    if (!isValidCoords(point.coords)) return false;
    const sources = ['SITE', 'GPS', 'TEMP', 'LAST_FIX', 'HOME', 'RETICLE', 'INPUT', 'IMPORT', 'MAP_CLICK', 'CURRENT_POS', 'REGISTERED', 'LOCAL_SITE', 'REGISTERED_SITE', 'ROUTE_IMPORT'];
    if (!sources.includes(point.source)) return false;
    return true;
  }

  function isValidTrackSegment(seg) {
    if (!seg || typeof seg !== 'object') return false;
    if (seg.kind === 'MEASURED') {
      if (seg.source !== 'GPS') return false;
      if (!Array.isArray(seg.points)) return false;
      for (const p of seg.points) {
        if (!p || typeof p !== 'object') return false;
        if (typeof p.lat !== 'number' || typeof p.lon !== 'number' || !isFinite(p.lat) || !isFinite(p.lon)) return false;
        if (!isValidTimestamp(p.timestamp)) return false;
      }
      return true;
    } else if (seg.kind === 'ESTIMATED') {
      if (!['TEMP_BRIDGE', 'GPS_REACQUIRE'].includes(seg.reason)) return false;
      if (!seg.from || typeof seg.from !== 'object' || !seg.to || typeof seg.to !== 'object') return false;
      if (typeof seg.from.lat !== 'number' || typeof seg.from.lon !== 'number' || !isFinite(seg.from.lat) || !isFinite(seg.from.lon)) return false;
      if (typeof seg.to.lat !== 'number' || typeof seg.to.lon !== 'number' || !isFinite(seg.to.lat) || !isFinite(seg.to.lon)) return false;
      if (!isValidTimestamp(seg.from.timestamp) || !isValidTimestamp(seg.to.timestamp)) return false;
      return true;
    }
    return false;
  }

  function validatePlanV1(plan) {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return false;
    if (plan.schemaVersion !== 1) return false;
    if (!isValidString(plan.id)) return false;
    if (!isValidTimestamp(plan.createdAt) || !isValidTimestamp(plan.updatedAt)) return false;
    if (plan.objective !== undefined && !isValidPlanPoint(plan.objective)) return false;
    if (plan.startPoint !== undefined && !isValidPlanPoint(plan.startPoint)) return false;
    if (plan.endPoint !== undefined && !isValidPlanPoint(plan.endPoint)) return false;
    if (Array.isArray(plan.viaPoints)) {
      if (!plan.viaPoints.every(isValidPlanPoint)) return false;
    } else return false;
    if (!Array.isArray(plan.routeSegments) || !Array.isArray(plan.overlaySegments)) return false;
    return true;
  }

  function validateTrackV2(track) {
    if (!track || typeof track !== 'object' || Array.isArray(track)) return false;
    if (track.schemaVersion !== 2) return false;
    if (!isValidString(track.id)) return false;
    if (!isValidTimestamp(track.startedAt)) return false;
    if (track.endedAt !== undefined && !isValidTimestamp(track.endedAt)) return false;
    if (!Array.isArray(track.segments) || !track.segments.every(isValidTrackSegment)) return false;
    if (!track.distance || typeof track.distance !== 'object') return false;
    if (typeof track.distance.measuredKm !== 'number' || !isFinite(track.distance.measuredKm) || track.distance.measuredKm < 0) return false;
    if (typeof track.distance.estimatedKm !== 'number' || !isFinite(track.distance.estimatedKm) || track.distance.estimatedKm < 0) return false;
    return true;
  }

  // --- Sanitizers (for user input / building) ---
  function sanitizeCoords(coords) {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lat = Number(coords[0]), lon = Number(coords[1]);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return [lat, lon];
  }
  function sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str.slice(0, maxLength);
  }
  function sanitizeTimestamp(ts) {
    if (typeof ts === 'number' && isFinite(ts) && ts > 0) return ts;
    const date = new Date(ts);
    return isNaN(date.getTime()) ? Date.now() : date.getTime();
  }
  function sanitizePlanPoint(point) {
    if (!point || typeof point !== 'object') return null;
    const coords = sanitizeCoords(point.coords);
    if (!coords) return null;
    return {
      id: sanitizeString(point.id) || generateId(),
      role: sanitizeString(point.role) || 'VIA',
      name: sanitizeString(point.name) || 'POINT',
      coords: coords,
      source: sanitizeString(point.source) || 'INPUT',
      siteId: point.siteId ? sanitizeString(point.siteId) : undefined,
      address: point.address ? sanitizeString(point.address) : undefined
    };
  }
  function sanitizePlanV1(plan) {
    if (!plan || typeof plan !== 'object') return null;
    let legacyMeta = undefined;
    if (plan.legacy && typeof plan.legacy === 'object') {
       legacyMeta = {
         source: sanitizeString(plan.legacy.source),
         sourceId: plan.legacy.sourceId ? sanitizeString(plan.legacy.sourceId) : undefined
       };
    }
    const objective = plan.objective ? sanitizePlanPoint(plan.objective) : null;
    const startPoint = plan.startPoint ? sanitizePlanPoint(plan.startPoint) : null;
    const endPoint = plan.endPoint ? sanitizePlanPoint(plan.endPoint) : null;
    
    return {
      schemaVersion: 1,
      id: sanitizeString(plan.id) || generateId(),
      name: sanitizeString(plan.name) || 'Unnamed Plan',
      createdAt: sanitizeTimestamp(plan.createdAt),
      updatedAt: sanitizeTimestamp(plan.updatedAt),
      objective: objective || undefined,
      startPoint: startPoint || undefined,
      viaPoints: Array.isArray(plan.viaPoints) ? plan.viaPoints.map(sanitizePlanPoint).filter(Boolean) : [],
      endPoint: endPoint || undefined,
      routeSegments: Array.isArray(plan.routeSegments) ? plan.routeSegments.map(seg => (Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : [])).filter(seg => seg.length > 0) : [],
      overlaySegments: Array.isArray(plan.overlaySegments) ? plan.overlaySegments.map(seg => (Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : [])).filter(seg => seg.length > 0) : [],
      trackIds: Array.isArray(plan.trackIds) ? plan.trackIds.map(id => sanitizeString(id)).filter(Boolean) : [],
      legacy: legacyMeta
    };
  }
  function sanitizeTrackSegment(seg) {
    if (!seg || typeof seg !== 'object') return null;
    if (seg.kind === 'MEASURED') {
      return {
        kind: 'MEASURED',
        source: 'GPS',
        points: Array.isArray(seg.points) ? seg.points.map(p => {
          if (!p) return null;
          return {
            lat: Number(p.lat),
            lon: Number(p.lon),
            timestamp: sanitizeTimestamp(p.timestamp),
            accuracyM: p.accuracyM !== undefined && p.accuracyM !== null ? Number(p.accuracyM) : undefined
          };
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lon) && isFinite(p.lat) && isFinite(p.lon)) : []
      };
    } else if (seg.kind === 'ESTIMATED') {
      return {
        kind: 'ESTIMATED',
        reason: sanitizeString(seg.reason) || 'TEMP_BRIDGE',
        from: seg.from ? { lat: Number(seg.from.lat), lon: Number(seg.from.lon), timestamp: sanitizeTimestamp(seg.from.timestamp), source: sanitizeString(seg.from.source) || 'GPS' } : undefined,
        to: seg.to ? { lat: Number(seg.to.lat), lon: Number(seg.to.lon), timestamp: sanitizeTimestamp(seg.to.timestamp), source: sanitizeString(seg.to.source) || 'GPS' } : undefined
      };
    }
    return null;
  }
  function sanitizeTrackV2(track) {
    if (!track || typeof track !== 'object') return null;
    return {
      schemaVersion: 2,
      id: sanitizeString(track.id) || generateId(),
      planId: track.planId ? sanitizeString(track.planId) : undefined,
      objectiveSnapshot: track.objectiveSnapshot ? sanitizePlanPoint(track.objectiveSnapshot) : undefined,
      startedAt: sanitizeTimestamp(track.startedAt),
      endedAt: track.endedAt ? sanitizeTimestamp(track.endedAt) : undefined,
      interrupted: !!track.interrupted,
      segments: Array.isArray(track.segments) ? track.segments.map(sanitizeTrackSegment).filter(Boolean) : [],
      distance: {
        measuredKm: track.distance && typeof track.distance.measuredKm === 'number' && isFinite(track.distance.measuredKm) && track.distance.measuredKm >= 0 ? track.distance.measuredKm : 0,
        estimatedKm: track.distance && typeof track.distance.estimatedKm === 'number' && isFinite(track.distance.estimatedKm) && track.distance.estimatedKm >= 0 ? track.distance.estimatedKm : 0
      }
    };
  }

  // --- Storage Reads ---
  function getV28Plans() {
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) return {};
      const valid = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (validatePlanV1(v)) valid[k] = v;
      }
      return valid;
    } catch (e) {
      console.warn('V28 Plan Read Error:', e);
      return {};
    }
  }

  function saveV28Plan(plan) {
    const sanitized = sanitizePlanV1(plan);
    if (!sanitized) return false;
    try {
      const plans = getV28Plans();
      plans[sanitized.id] = sanitized;
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plans));
      return true;
    } catch (e) {
      console.warn('V28 Plan Save Error:', e);
      return false;
    }
  }

  function resolveTarget(targetId) {
    try {
      const raw = localStorage.getItem(INTEL_V2_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const found = arr.find(t => t && String(t.id) === String(targetId));
        if (found && Array.isArray(found.coords) && found.coords.length === 2 && isFinite(found.coords[0]) && isFinite(found.coords[1])) {
          return { id: String(found.id), name: found.name || 'Target ' + targetId, coords: [found.coords[0], found.coords[1]], source: 'LOCAL_SITE' };
        }
      }
    } catch(e) {}
    return null;
  }

  function getV27PlansAsV28() {
    const migrated = {};
    
    function mapPoint(pt, role) {
      if (!pt || !pt.coords) return undefined;
      const c = sanitizeCoords(pt.coords);
      if (!c) return undefined;
      const ptId = pt.id || `${role}-${c[0].toFixed(5)}-${c[1].toFixed(5)}`;
      return {
        id: ptId,
        role: role,
        name: pt.name || role,
        coords: c,
        source: pt.source || 'IMPORT',
        address: pt.address || undefined
      };
    }

    try {
      const rawReg = localStorage.getItem(ROUTE_PLAN_STORAGE_KEY);
      const v27Plans = rawReg ? JSON.parse(rawReg) : {};
      if (typeof v27Plans === 'object' && !Array.isArray(v27Plans) && v27Plans !== null) {
        for (const [targetId, v27Plan] of Object.entries(v27Plans)) {
          if (!v27Plan) continue;
          
          const tgt = resolveTarget(targetId);
          let objective = undefined;
          if (tgt) {
            objective = {
              id: tgt.id,
              role: 'OBJECTIVE',
              name: tgt.name,
              coords: tgt.coords,
              source: tgt.source
            };
          }

          const updatedAt = v27Plan.updatedAt ? new Date(v27Plan.updatedAt).getTime() : 1;
          const mappedPlan = {
            schemaVersion: 1,
            id: `v27-reg-${targetId}`,
            name: `V27 Route for ${targetId}`,
            createdAt: updatedAt,
            updatedAt: updatedAt,
            objective: objective,
            startPoint: mapPoint(v27Plan.startPoint, 'START'),
            viaPoints: Array.isArray(v27Plan.viaPoints) ? v27Plan.viaPoints.map(vp => mapPoint(vp, 'VIA')).filter(Boolean) : [],
            endPoint: mapPoint(v27Plan.endPoint, 'END'),
            routeSegments: Array.isArray(v27Plan.segments) ? v27Plan.segments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(s => s.length > 0) : [],
            overlaySegments: Array.isArray(v27Plan.markSegments) ? v27Plan.markSegments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(s => s.length > 0) : [],
            trackIds: [],
            legacy: { source: 'REGISTERED_SITE', sourceId: targetId }
          };
          if (validatePlanV1(mappedPlan)) migrated[mappedPlan.id] = mappedPlan;
        }
      }
    } catch(e) {}

    try {
      const rawIntel = localStorage.getItem(INTEL_V2_STORAGE_KEY);
      const localIntel = rawIntel ? JSON.parse(rawIntel) : [];
      if (Array.isArray(localIntel)) {
        for (const item of localIntel) {
          if (item && item.id && item.routePlan) {
            const v27Plan = item.routePlan;
            const tgt = (Array.isArray(item.coords) && item.coords.length === 2 && isFinite(item.coords[0]) && isFinite(item.coords[1])) 
              ? { id: String(item.id), name: item.name || 'Target ' + item.id, coords: [item.coords[0], item.coords[1]], source: 'LOCAL_SITE' } 
              : null;
            
            let objective = undefined;
            if (tgt) {
              objective = {
                id: tgt.id,
                role: 'OBJECTIVE',
                name: tgt.name,
                coords: tgt.coords,
                source: tgt.source
              };
            }

            const updatedAt = v27Plan.updatedAt ? new Date(v27Plan.updatedAt).getTime() : 1;
            const mappedPlan = {
              schemaVersion: 1,
              id: `v27-loc-${item.id}`,
              name: `V27 Route for ${item.id}`,
              createdAt: updatedAt,
              updatedAt: updatedAt,
              objective: objective,
              startPoint: mapPoint(v27Plan.startPoint, 'START'),
              viaPoints: Array.isArray(v27Plan.viaPoints) ? v27Plan.viaPoints.map(vp => mapPoint(vp, 'VIA')).filter(Boolean) : [],
              endPoint: mapPoint(v27Plan.endPoint, 'END'),
              routeSegments: Array.isArray(v27Plan.segments) ? v27Plan.segments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(s => s.length > 0) : [],
              overlaySegments: Array.isArray(v27Plan.markSegments) ? v27Plan.markSegments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(s => s.length > 0) : [],
              trackIds: [],
              legacy: { source: 'LOCAL_SITE', sourceId: String(item.id) }
            };
            if (validatePlanV1(mappedPlan)) migrated[mappedPlan.id] = mappedPlan;
          }
        }
      }
    } catch(e) {}

    return migrated;
  }

  function getAllPlans() {
    return { ...getV27PlansAsV28(), ...getV28Plans() };
  }

  function getV28Tracks() {
    try {
      const raw = localStorage.getItem(TRACK_V2_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) return {};
      const valid = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (validateTrackV2(v)) valid[k] = v;
      }
      return valid;
    } catch (e) {
      console.warn('V28 Track Read Error:', e);
      return {};
    }
  }

  function saveV28Track(track) {
    const sanitized = sanitizeTrackV2(track);
    if (!sanitized) return false;
    try {
      const tracks = getV28Tracks();
      tracks[sanitized.id] = sanitized;
      localStorage.setItem(TRACK_V2_STORAGE_KEY, JSON.stringify(tracks));
      return true;
    } catch (e) {
      console.warn('V28 Track Save Error:', e);
      return false;
    }
  }

  function getV27TracksAsV28() {
    function parseHistoricalTime(val) {
      if (typeof val === 'number' && isFinite(val) && val > 0) return val;
      if (typeof val === 'string') {
        const parsed = Date.parse(val);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      return null;
    }

    try {
      const raw = localStorage.getItem(TRACK_V1_STORAGE_KEY);
      const v27Tracks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(v27Tracks)) return [];
      
      const migrated = v27Tracks.map(t => {
        if (!t || typeof t !== 'object') return null;
        
        const startedAt = parseHistoricalTime(t.startedAt);
        const endedAt = parseHistoricalTime(t.endedAt) || undefined;
        if (!startedAt) return null;

        let points = [];
        if (Array.isArray(t.points)) {
          points = t.points.map(p => {
             if (!Array.isArray(p)) return null;
             let ts = parseHistoricalTime(p[2]);
             if (!ts) ts = startedAt;
             if (!ts) return null;
             return { lat: Number(p[0]), lon: Number(p[1]), timestamp: ts };
          }).filter(p => p !== null && !isNaN(p.lat) && !isNaN(p.lon) && isFinite(p.lat) && isFinite(p.lon));
        }

        const stableId = t.id ? `v27-${t.id}` : null;
        if (!stableId) return null;

        const trackV2 = {
          schemaVersion: 2,
          id: stableId,
          startedAt: startedAt,
          endedAt: endedAt,
          interrupted: false,
          segments: [{
            kind: 'MEASURED',
            source: 'GPS',
            points: points
          }],
          distance: {
            measuredKm: typeof t.distanceKm === 'number' && isFinite(t.distanceKm) && t.distanceKm >= 0 ? t.distanceKm : 0,
            estimatedKm: 0
          }
        };

        return validateTrackV2(trackV2) ? trackV2 : null;
      });

      return migrated.filter(Boolean);
    } catch (e) {
      console.warn('V27 Track Read Adapter Error:', e);
      return [];
    }
  }

  return {
    schemas: {
      sanitizePlanPoint,
      sanitizePlanV1,
      sanitizeTrackSegment,
      sanitizeTrackV2,
      validatePlanV1,
      validateTrackV2
    },
    storage: {
      getV28Plans,
      saveV28Plan,
      getV27PlansAsV28,
      getAllPlans,
      getV28Tracks,
      saveV28Track,
      getV27TracksAsV28
    },
    state: {
      get activePlanId() { return activePlanId; },
      set activePlanId(id) { activePlanId = id; },
      get activeTrackId() { return activeTrackId; },
      set activeTrackId(id) { activeTrackId = id; }
    }
  };
})();
