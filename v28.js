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
    const sources = ['SITE', 'GPS', 'TEMP', 'LAST_FIX', 'HOME', 'RETICLE', 'INPUT', 'IMPORT'];
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
        if (typeof p.lat !== 'number' || typeof p.lon !== 'number' || !isFinite(p.lat) || !isFinite(p.lon) || p.lat < -90 || p.lat > 90 || p.lon < -180 || p.lon > 180) return false;
        if (!isValidTimestamp(p.timestamp)) return false;
        if (p.accuracyM !== undefined) {
           if (typeof p.accuracyM !== 'number' || !isFinite(p.accuracyM) || p.accuracyM < 0) return false;
        }
      }
      return true;
    } else if (seg.kind === 'ESTIMATED') {
      if (!['TEMP_BRIDGE', 'GPS_REACQUIRE'].includes(seg.reason)) return false;
      if (!seg.from || typeof seg.from !== 'object' || !seg.to || typeof seg.to !== 'object') return false;
      
      const checkPt = (pt, allowedSources) => {
         if (typeof pt.lat !== 'number' || typeof pt.lon !== 'number' || !isFinite(pt.lat) || !isFinite(pt.lon) || pt.lat < -90 || pt.lat > 90 || pt.lon < -180 || pt.lon > 180) return false;
         if (pt.timestamp !== undefined && !isValidTimestamp(pt.timestamp)) return false;
         if (!allowedSources.includes(pt.source)) return false;
         return true;
      };
      
      if (!checkPt(seg.from, ['GPS', 'TEMP', 'LAST_FIX'])) return false;
      if (!checkPt(seg.to, ['GPS', 'TEMP'])) return false;
      
      return true;
    }
    return false;
  }

  function validatePlanV1(plan) {
    if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return false;
    if (plan.schemaVersion !== 1) return false;
    if (!isValidString(plan.id)) return false;
    if (!isValidString(plan.name)) return false;
    if (!isValidTimestamp(plan.createdAt) || !isValidTimestamp(plan.updatedAt)) return false;
    
    if (plan.objective !== undefined) {
      if (!isValidPlanPoint(plan.objective)) return false;
      if (plan.objective.role !== 'OBJECTIVE') return false;
    }
    if (plan.startPoint !== undefined) {
      if (!isValidPlanPoint(plan.startPoint)) return false;
      if (plan.startPoint.role !== 'START') return false;
    }
    if (plan.endPoint !== undefined) {
      if (!isValidPlanPoint(plan.endPoint)) return false;
      if (plan.endPoint.role !== 'END') return false;
    }
    if (Array.isArray(plan.viaPoints)) {
      if (!plan.viaPoints.every(p => isValidPlanPoint(p) && p.role === 'VIA')) return false;
    } else return false;
    if (!Array.isArray(plan.routeSegments) || !plan.routeSegments.every(seg => Array.isArray(seg) && seg.every(isValidCoords))) return false;
    if (!Array.isArray(plan.overlaySegments) || !plan.overlaySegments.every(seg => Array.isArray(seg) && seg.every(isValidCoords))) return false;
    if (!Array.isArray(plan.trackIds) || !plan.trackIds.every(isValidString)) return false;
    if (plan.legacy !== undefined) {
      if (!plan.legacy || typeof plan.legacy !== 'object') return false;
      if (!['LOCAL_SITE', 'REGISTERED_SITE', 'ROUTE_IMPORT'].includes(plan.legacy.source)) return false;
      if (plan.legacy.sourceId !== undefined && !isValidString(plan.legacy.sourceId)) return false;
    }
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
    
    if (track.planId !== undefined && !isValidString(track.planId)) return false;
    if (track.objectiveSnapshot !== undefined) {
       if (!isValidPlanPoint(track.objectiveSnapshot)) return false;
       if (track.objectiveSnapshot.role !== 'OBJECTIVE') return false;
    }
    if (track.interrupted !== undefined && typeof track.interrupted !== 'boolean') return false;

    return true;
  }

  // --- Sanitizers (for user input / building) ---
  function sanitizeCoords(coords) {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lat = Number(coords[0]), lon = Number(coords[1]);
    if (isNaN(lat) || isNaN(lon) || !isFinite(lat) || !isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
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
    let src = sanitizeString(point.source) || 'INPUT';
    const validSources = ['SITE', 'GPS', 'TEMP', 'LAST_FIX', 'HOME', 'RETICLE', 'INPUT', 'IMPORT'];
    if (!validSources.includes(src)) src = 'IMPORT';
    return {
      id: sanitizeString(point.id) || generateId(),
      role: sanitizeString(point.role) || 'VIA',
      name: sanitizeString(point.name) || 'POINT',
      coords: coords,
      source: src,
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
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lon) && isFinite(p.lat) && isFinite(p.lon) && p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180) : []
      };
    } else if (seg.kind === 'ESTIMATED') {
      const sanitizeEstimatedEndpoint = (pt) => {
        if (!pt || typeof pt !== 'object') return undefined;
        const endpoint = {
          lat: Number(pt.lat),
          lon: Number(pt.lon),
          source: sanitizeString(pt.source)
        };
        if (Object.prototype.hasOwnProperty.call(pt, 'timestamp')) {
          endpoint.timestamp = pt.timestamp;
        }
        return endpoint;
      };
      return {
        kind: 'ESTIMATED',
        reason: sanitizeString(seg.reason),
        from: sanitizeEstimatedEndpoint(seg.from),
        to: sanitizeEstimatedEndpoint(seg.to)
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
    if (!validatePlanV1(sanitized)) return false;
    
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
         console.warn('V28 Plan Save Error: Storage is not a valid object, aborting save to prevent data loss.');
         return false;
      }
      parsed[sanitized.id] = sanitized;
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(parsed));
      return true;
    } catch (e) {
      console.warn('V28 Plan Save Error:', e);
      return false;
    }
  }

  function resolveRegisteredTarget(targetId) {
    if (typeof RECON_TARGETS !== 'undefined' && Array.isArray(RECON_TARGETS)) {
      const found = RECON_TARGETS.find(t => t && String(t.id) === String(targetId));
      if (found) {
        const coords = sanitizeCoords(found.coords);
        if (coords) {
          return {
            id: String(found.id),
            name: found.name || 'Target ' + targetId,
            coords: coords,
            source: 'SITE'
          };
        }
      }
    }
    return null;
  }

  function resolveLocalTarget(targetId) {
    try {
      const raw = localStorage.getItem(INTEL_V2_STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr)) {
        const found = arr.find(t => t && String(t.id) === String(targetId));
        if (found && Array.isArray(found.coords) && found.coords.length === 2 && isFinite(found.coords[0]) && isFinite(found.coords[1])) {
          return { id: String(found.id), name: found.name || 'Target ' + targetId, coords: [found.coords[0], found.coords[1]], source: 'SITE' };
        }
      }
    } catch(e) {}
    return null;
  }

  function getV27PlansAsV28() {
    const migrated = {};
    const validSources = ['SITE', 'GPS', 'TEMP', 'LAST_FIX', 'HOME', 'RETICLE', 'INPUT', 'IMPORT'];
    
    function mapPoint(pt, role) {
      if (!pt || !pt.coords) return undefined;
      const c = sanitizeCoords(pt.coords);
      if (!c) return undefined;
      const ptId = pt.id || `${role}-${c[0].toFixed(5)}-${c[1].toFixed(5)}`;
      let src = pt.source || 'IMPORT';
      if (!validSources.includes(src)) {
         if (['LOCAL_SITE', 'REGISTERED_SITE'].includes(src)) src = 'SITE';
         else src = 'IMPORT';
      }
      return {
        id: ptId,
        role: role,
        name: pt.name || role,
        coords: c,
        source: src,
        address: pt.address || undefined
      };
    }

    try {
      const rawReg = localStorage.getItem(ROUTE_PLAN_STORAGE_KEY);
      const v27Plans = rawReg ? JSON.parse(rawReg) : {};
      if (typeof v27Plans === 'object' && !Array.isArray(v27Plans) && v27Plans !== null) {
        for (const [targetId, v27Plan] of Object.entries(v27Plans)) {
          if (!v27Plan) continue;
          
          const tgt = resolveRegisteredTarget(targetId);
          let objective = undefined;
          let planName = `V27 Route for ${targetId}`;
          if (tgt) {
            objective = {
              id: tgt.id,
              role: 'OBJECTIVE',
              name: tgt.name,
              coords: tgt.coords,
              source: tgt.source
            };
            planName = tgt.name;
          }

          const updatedAt = v27Plan.updatedAt ? new Date(v27Plan.updatedAt).getTime() : 1;
          const mappedPlan = {
            schemaVersion: 1,
            id: `v27-reg-${targetId}`,
            name: planName,
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
            const tgt = resolveLocalTarget(item.id);
            let objective = undefined;
            let planName = `V27 Route for ${item.id}`;
            if (tgt) {
              objective = {
                id: tgt.id,
                role: 'OBJECTIVE',
                name: tgt.name,
                coords: tgt.coords,
                source: tgt.source
              };
              planName = tgt.name;
            }

            const updatedAt = v27Plan.updatedAt ? new Date(v27Plan.updatedAt).getTime() : 1;
            const mappedPlan = {
              schemaVersion: 1,
              id: `v27-loc-${item.id}`,
              name: planName,
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

  // --- Phase 2 PLAN repository helpers ---
  function getPlanById(planId) {
    if (!isValidString(String(planId || ''))) return null;
    return getAllPlans()[String(planId)] || null;
  }

  function objectiveSnapshotFrom(target) {
    if (!target || typeof target !== 'object') return undefined;
    const coords = sanitizeCoords(target.coords);
    if (!coords) return undefined;
    const source = ['SITE', 'GPS', 'TEMP', 'LAST_FIX', 'HOME', 'RETICLE', 'INPUT', 'IMPORT'].includes(target.source)
      ? target.source
      : 'SITE';
    return sanitizePlanPoint({
      id: String(target.id || target.siteId || generateId()),
      role: 'OBJECTIVE',
      name: sanitizeString(target.name) || 'OBJECTIVE',
      coords,
      source,
      siteId: target.siteId || target.id || undefined,
      address: target.address
    }) || undefined;
  }

  function createPlan(options = {}) {
    const now = Date.now();
    const objective = objectiveSnapshotFrom(options.objective);
    const plan = {
      schemaVersion: 1,
      id: sanitizeString(options.id) || generateId(),
      name: sanitizeString(options.name) || (objective?.name || 'Unnamed Plan'),
      createdAt: now,
      updatedAt: now,
      objective,
      startPoint: undefined,
      viaPoints: [],
      endPoint: undefined,
      routeSegments: [],
      overlaySegments: [],
      trackIds: []
    };
    if (!saveV28Plan(plan)) return null;
    activePlanId = plan.id;
    return getV28Plans()[plan.id] || plan;
  }

  function setPlanObjective(planId, target) {
    const current = getPlanById(planId);
    const objective = objectiveSnapshotFrom(target);
    if (!current || !objective) return null;
    const next = { ...current, objective, updatedAt: Date.now() };
    if (!saveV28Plan(next)) return null;
    activePlanId = String(planId);
    return getV28Plans()[String(planId)] || next;
  }

  function clearPlanObjective(planId) {
    const current = getPlanById(planId);
    if (!current) return null;
    const next = { ...current, objective: undefined, updatedAt: Date.now() };
    if (!saveV28Plan(next)) return null;
    activePlanId = String(planId);
    return getV28Plans()[String(planId)] || next;
  }

  function parseLegacyDeleteBacking(plan) {
    if (!plan?.legacy?.source || !plan.legacy.sourceId) return { kind:'NONE' };
    const sourceId = String(plan.legacy.sourceId);

    if (plan.legacy.source === 'REGISTERED_SITE') {
      try {
        const raw = localStorage.getItem(ROUTE_PLAN_STORAGE_KEY);
        if (!raw) return { kind:'REGISTERED', sourceId, parsed:{} };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return { kind:'REGISTERED', sourceId, parsed };
      } catch (e) {
        console.warn('V28 Legacy Registered PLAN Delete Validation Error:', e);
        return null;
      }
    }

    if (plan.legacy.source === 'LOCAL_SITE') {
      try {
        const raw = localStorage.getItem(INTEL_V2_STORAGE_KEY);
        if (!raw) return { kind:'LOCAL', sourceId, parsed:[] };
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return null;
        return { kind:'LOCAL', sourceId, parsed };
      } catch (e) {
        console.warn('V28 Legacy Local PLAN Delete Validation Error:', e);
        return null;
      }
    }

    return { kind:'NONE' };
  }

  function deletePlan(planId) {
    const id = String(planId || '');
    const plan = getPlanById(id);
    if (!plan) return false;

    let v28Parsed = {};
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw) {
        v28Parsed = JSON.parse(raw);
        if (!v28Parsed || typeof v28Parsed !== 'object' || Array.isArray(v28Parsed)) return false;
      }
    } catch (e) {
      console.warn('V28 PLAN Delete Validation Error:', e);
      return false;
    }

    const backing = parseLegacyDeleteBacking(plan);
    if (!backing) return false;

    try {
      if (backing.kind === 'REGISTERED') {
        if (Object.prototype.hasOwnProperty.call(backing.parsed, backing.sourceId)) {
          delete backing.parsed[backing.sourceId];
          localStorage.setItem(ROUTE_PLAN_STORAGE_KEY, JSON.stringify(backing.parsed));
        }
      } else if (backing.kind === 'LOCAL') {
        const idx = backing.parsed.findIndex(item => item && String(item.id) === backing.sourceId);
        if (idx >= 0 && Object.prototype.hasOwnProperty.call(backing.parsed[idx], 'routePlan')) {
          const nextItem = { ...backing.parsed[idx] };
          delete nextItem.routePlan;
          backing.parsed[idx] = nextItem;
          localStorage.setItem(INTEL_V2_STORAGE_KEY, JSON.stringify(backing.parsed));
        }
      }

      if (Object.prototype.hasOwnProperty.call(v28Parsed, id)) {
        delete v28Parsed[id];
        localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(v28Parsed));
      }
      if (activePlanId === id) activePlanId = null;
      return true;
    } catch (e) {
      console.warn('V28 PLAN Delete Error:', e);
      return false;
    }
  }

  function isPersistedPlan(planId) {
    return Boolean(getV28Plans()[String(planId || '')]);
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
    if (!validateTrackV2(sanitized)) return false;
    
    try {
      const raw = localStorage.getItem(TRACK_V2_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
         console.warn('V28 Track Save Error: Storage is not a valid object, aborting save to prevent data loss.');
         return false;
      }
      parsed[sanitized.id] = sanitized;
      localStorage.setItem(TRACK_V2_STORAGE_KEY, JSON.stringify(parsed));
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
          }).filter(p => p !== null && !isNaN(p.lat) && !isNaN(p.lon) && isFinite(p.lat) && isFinite(p.lon) && p.lat >= -90 && p.lat <= 90 && p.lon >= -180 && p.lon <= 180);
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


  // --- Phase 2 browser integration / UI ---
  let phase2UiReady = false;
  let phase2AutosaveTimer = null;
  let phase2ObjectiveRefreshTimer = null;
  let objectivePickMode = false;

  function langV28() {
    return typeof document !== 'undefined' && document.documentElement.lang === 'en' ? 'en' : 'ko';
  }

  function tV28(ko, en) {
    return langV28() === 'en' ? en : ko;
  }

  function currentObjectivePlan() {
    return activePlanId ? getPlanById(activePlanId) : null;
  }

  function syncObjectivePickerUi() {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('wpDrawer');
    const drawerHead = drawer?.querySelector('.drawer-head');
    const drawerTitle = drawerHead?.querySelector('div');
    let hint = document.getElementById('v28ObjectivePickHint');
    const targetSet = document.getElementById('btnTargetSet');

    if (!objectivePickMode) {
      hint?.remove();
      if (drawerTitle) drawerTitle.textContent = tV28('거점', 'SITES');
      if (targetSet) targetSet.textContent = tV28('[ 목표 지정 ]', '[ SET OBJECTIVE ]');
      return;
    }

    if (drawerTitle) drawerTitle.textContent = tV28('목표 선택', 'SELECT OBJECTIVE');
    if (!hint && drawerHead) {
      hint = document.createElement('div');
      hint.id = 'v28ObjectivePickHint';
      hint.className = 'v28-objective-pick-hint';
      drawerHead.insertAdjacentElement('afterend', hint);
    }
    if (hint) {
      hint.textContent = tV28(
        '목표로 사용할 거점을 선택한 뒤 [이 거점을 목표로 지정]을 누르세요.',
        'SELECT A SITE, THEN CHOOSE [SET THIS SITE AS OBJECTIVE].'
      );
    }
    if (targetSet) {
      targetSet.textContent = tV28('[ 이 거점을 목표로 지정 ]', '[ SET THIS SITE AS OBJECTIVE ]');
    }
  }

  function clearObjectivePickerMode() {
    objectivePickMode = false;
    syncObjectivePickerUi();
  }

  function openObjectiveSitePicker() {
    if (!currentObjectivePlan()) {
      openRoutesSheet();
      return;
    }
    closePhase2Sheets();
    if (typeof closeFieldControls === 'function') closeFieldControls();
    objectivePickMode = true;
    if (typeof openWpDrawer === 'function') openWpDrawer();
    syncObjectivePickerUi();
  }

  function setObjectiveAtReticle() {
    const plan = currentObjectivePlan();
    if (!plan) {
      openRoutesSheet();
      return;
    }
    const center = typeof map !== 'undefined' && map?.getCenter ? map.getCenter() : null;
    if (!center || !Number.isFinite(Number(center.lat)) || !Number.isFinite(Number(center.lng))) {
      alert(tV28('조준점 좌표를 확인할 수 없습니다.', 'RETICLE POSITION UNAVAILABLE.'));
      return;
    }
    const next = setPlanObjective(plan.id, {
      id:'RETICLE-' + Date.now(),
      name:tV28('조준점 목표', 'RETICLE OBJECTIVE'),
      coords:[Number(center.lat), Number(center.lng)],
      source:'RETICLE'
    });
    if (!next) {
      alert(tV28('목표 지정에 실패했습니다.', 'OBJECTIVE UPDATE FAILED.'));
      return;
    }
    clearObjectivePickerMode();
    openPlanInEditor(next.id);
  }

  function closePhase2Sheets() {
    if (typeof document === 'undefined') return;
    document.getElementById('v28RoutesSheet')?.classList.remove('open');
    document.getElementById('v28ObjectiveSheet')?.classList.remove('open');
    document.body.classList.remove('v28-sheet-open');
  }

  function phase2PlanCoords(plan) {
    const coords = [];
    const add = (value) => {
      const c = sanitizeCoords(value);
      if (c) coords.push(c);
    };
    add(plan?.objective?.coords);
    add(plan?.startPoint?.coords);
    (plan?.viaPoints || []).forEach(p => add(p?.coords));
    add(plan?.endPoint?.coords);
    (plan?.routeSegments || []).forEach(seg => (seg || []).forEach(add));
    return coords;
  }

  function cloneEditorPoint(point, role) {
    if (!point?.coords) return undefined;
    return sanitizePlanPoint({
      id: point.id || generateId(),
      role,
      name: point.name || role,
      coords: point.coords,
      source: point.source || 'IMPORT',
      siteId: point.siteId,
      address: point.address
    }) || undefined;
  }

  function saveActivePlanFromEditor() {
    if (typeof document === 'undefined' || !activePlanId || !targetModeActive) return false;
    const current = getPlanById(activePlanId);
    if (!current) return false;

    const next = {
      ...current,
      updatedAt: Date.now(),
      objective: current.objective ? cloneEditorPoint(current.objective, 'OBJECTIVE') : undefined,
      startPoint: routeStartPoint ? cloneEditorPoint(routeStartPoint, 'START') : undefined,
      viaPoints: Array.isArray(routeViaPoints) ? routeViaPoints.map(p => cloneEditorPoint(p, 'VIA')).filter(Boolean) : [],
      endPoint: routeEndPoint ? cloneEditorPoint(routeEndPoint, 'END') : undefined,
      routeSegments: Array.isArray(routeDraftSegments)
        ? routeDraftSegments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(seg => seg.length)
        : [],
      overlaySegments: Array.isArray(routeMarkSegments)
        ? routeMarkSegments.map(seg => Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : []).filter(seg => seg.length)
        : [],
      trackIds: Array.isArray(current.trackIds) ? current.trackIds.slice() : []
    };

    if (!saveV28Plan(next)) return false;
    routeDirty = false;
    renderPhase2Routes();
    renderPhase2Objective();
    return true;
  }

  function openPlanInEditor(planId) {
    if (typeof document === 'undefined') return false;
    const id = String(planId || '');
    const plan = getPlanById(id);
    if (!plan) return false;

    if (targetModeActive && activePlanId && routeDirty) {
      if (!saveActivePlanFromEditor()) return false;
    } else if (targetModeActive && !activePlanId && typeof preserveActivePlan === 'function') {
      if (!preserveActivePlan()) return false;
    }

    closePhase2Sheets();
    if (typeof closeRouteLocate === 'function') closeRouteLocate();
    if (typeof closeRoutePoints === 'function') closeRoutePoints();
    if (typeof closeNavOptic === 'function') closeNavOptic();
    if (typeof stopNavElapsed === 'function') stopNavElapsed();
    if ((typeof trackRecording !== 'undefined' && trackRecording) || (typeof pendingTrackStart !== 'undefined' && pendingTrackStart)) {
      if (typeof stopTrackRecording === 'function') stopTrackRecording(true, true);
    }
    if (typeof clearActiveTrack === 'function') clearActiveTrack();

    activePlanId = id;
    targetModeTarget = plan.objective ? {
      id: plan.objective.siteId || plan.objective.id,
      name: plan.objective.name,
      coords: [...plan.objective.coords],
      source: plan.objective.source,
      __v28Objective: true
    } : null;
    targetModeActive = true;
    targetModePhase = 'PLAN';
    pendingNavStart = false;
    navPanelCollapsed = false;
    gpsFollowEnabled = false;
    routeDraftSegments = (plan.routeSegments || []).map(seg => seg.map(c => [c[0], c[1]]));
    routeMarkSegments = (plan.overlaySegments || []).map(seg => seg.map(c => [c[0], c[1]]));
    routeViaPoints = (plan.viaPoints || []).map(p => ({ ...p, coords:[...p.coords] }));
    routeStartPoint = plan.startPoint ? { ...plan.startPoint, coords:[...plan.startPoint.coords] } : null;
    routeEndPoint = plan.endPoint ? { ...plan.endPoint, coords:[...plan.endPoint.coords] } : null;
    routeDrawKind = 'ROUTE';
    navLegIndex = 0;
    backtrackActive = false;
    routeDirty = false;

    if (typeof closeFieldControls === 'function') closeFieldControls();
    if (typeof closeWpDrawer === 'function') closeWpDrawer();
    if (typeof closeSitrep === 'function') closeSitrep();
    if (typeof setMapRouteDrawInteraction === 'function') setMapRouteDrawInteraction(false);
    if (typeof renderRouteDraft === 'function') renderRouteDraft();
    if (typeof syncMarkerVisibility === 'function') syncMarkerVisibility();
    if (typeof syncGpsMarkerVisibility === 'function') syncGpsMarkerVisibility();
    if (typeof syncTargetReferenceLine === 'function') syncTargetReferenceLine();

    const coords = phase2PlanCoords(plan);
    try {
      if (coords.length > 1 && typeof L !== 'undefined' && map) {
        map.fitBounds(L.latLngBounds(coords), { padding:[54,54], maxZoom:14, animate:false });
      } else if (coords.length === 1 && map) {
        map.setView(coords[0], Math.max(map.getZoom(), 14), { animate:false });
      }
    } catch (e) {
      console.warn('V28 PLAN viewport update failed:', e);
    }

    if (typeof updateReticleTelemetry === 'function') updateReticleTelemetry();
    if (typeof updateTargetModePanel === 'function') updateTargetModePanel();
    renderPhase2Routes();
    renderPhase2Objective();
    return true;
  }

  function renderPhase2Routes() {
    if (typeof document === 'undefined') return;
    const list = document.getElementById('v28PlanList');
    if (!list) return;

    const all = Object.values(getAllPlans()).sort((a,b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    if (!all.length) {
      list.innerHTML = '<div class="v28-empty">' + tV28('저장된 계획이 없습니다.', 'NO SAVED PLANS') + '</div>';
      return;
    }

    list.textContent = '';
    all.forEach(plan => {
      const row = document.createElement('div');
      row.className = 'v28-plan-row' + (activePlanId === plan.id ? ' active' : '');
      const objective = plan.objective?.name || tV28('목표 없음', 'NO OBJECTIVE');
      const routeKm = (() => {
        try {
          let total = 0;
          (plan.routeSegments || []).forEach(seg => {
            for (let i=1;i<seg.length;i++) {
              total += calcDistanceKmRaw(seg[i-1][0], seg[i-1][1], seg[i][0], seg[i][1]);
            }
          });
          return total;
        } catch (e) { return 0; }
      })();
      const legacy = Boolean(plan.legacy?.source);
      row.innerHTML =
        '<div class="v28-plan-main">' +
          '<div class="v28-plan-title"></div>' +
          '<div class="v28-plan-meta"></div>' +
        '</div>' +
        '<div class="v28-plan-actions">' +
          '<button type="button" class="v28-mini v28-open">' + tV28('열기', 'OPEN') + '</button>' +
          '<button type="button" class="v28-mini v28-delete">' + tV28('삭제', 'DELETE') + '</button>' +
        '</div>';
      row.querySelector('.v28-plan-title').textContent = plan.name;
      row.querySelector('.v28-plan-meta').textContent =
        (legacy ? 'LEGACY · ' : '') +
        tV28('목표 ', 'OBJ ') + objective + ' · ' +
        tV28('경로 ', 'ROUTE ') + routeKm.toFixed(1) + ' KM · ' +
        (plan.viaPoints?.length || 0) + tV28(' 경유', ' VIA');
      row.querySelector('.v28-open').addEventListener('click', () => openPlanInEditor(plan.id));
      row.querySelector('.v28-delete').addEventListener('click', () => {
        const msg = legacy
          ? tV28('이 계획과 연결된 기존 V27 경로 기록도 삭제합니다. 거점 자체는 유지됩니다. 계속할까요?', 'DELETE THIS PLAN AND ITS LEGACY V27 ROUTE DATA? THE SITE WILL REMAIN.')
          : tV28('이 계획을 삭제할까요?', 'DELETE THIS PLAN?');
        if (!confirm(msg)) return;
        if (activePlanId === plan.id && targetModeActive && typeof exitTargetMode === 'function') {
          exitTargetMode(true);
        }
        if (!deletePlan(plan.id)) {
          alert(tV28('계획 삭제에 실패했습니다.', 'PLAN DELETE FAILED.'));
          return;
        }
        renderPhase2Routes();
        renderPhase2Objective();
      });
      list.appendChild(row);
    });
  }

  function objectiveTelemetry(plan) {
    const objective = plan?.objective;
    if (!objective?.coords) return null;
    try {
      const ref = typeof getReferencePosition === 'function' ? getReferencePosition() : null;
      if (!ref?.coords) return { ref:null, distance:null, bearing:null };
      const d = calcDistanceKmRaw(ref.coords[0], ref.coords[1], objective.coords[0], objective.coords[1]);
      let distance = d.toFixed(1) + ' KM';
      if (typeof formatNavDistance === 'function') {
        const fd = formatNavDistance(d);
        if (fd?.value && fd?.unit) distance = fd.value + ' ' + fd.unit;
      }
      const bearing = typeof calcBearing === 'function'
        ? calcBearing(ref.coords[0], ref.coords[1], objective.coords[0], objective.coords[1])
        : null;
      return { ref, distance, bearing };
    } catch (e) {
      return { ref:null, distance:null, bearing:null };
    }
  }

  function renderPhase2Objective() {
    if (typeof document === 'undefined') return;
    const body = document.getElementById('v28ObjectiveBody');
    const siteBtn = document.getElementById('v28ObjectiveSiteBtn');
    const reticleBtn = document.getElementById('v28ObjectiveReticleBtn');
    const clearBtn = document.getElementById('v28ObjectiveClearBtn');
    if (!body) return;

    const plan = currentObjectivePlan();
    const setActions = (hasPlan, hasObjective) => {
      if (siteBtn) {
        siteBtn.disabled = !hasPlan;
        siteBtn.textContent = hasObjective
          ? tV28('거점에서 변경', 'CHANGE FROM SITES')
          : tV28('거점에서 선택', 'SELECT FROM SITES');
      }
      if (reticleBtn) {
        reticleBtn.disabled = !hasPlan;
        reticleBtn.textContent = hasObjective
          ? tV28('조준점으로 변경', 'USE RETICLE')
          : tV28('조준점 지정', 'SET FROM RETICLE');
      }
      if (clearBtn) {
        clearBtn.disabled = !hasObjective;
        clearBtn.textContent = tV28('목표 해제', 'CLEAR OBJECTIVE');
      }
    };

    if (!plan) {
      body.innerHTML =
        '<div class="v28-objective-empty">' +
          '<strong>' + tV28('활성 계획 없음', 'NO ACTIVE PLAN') + '</strong>' +
          '<span>' + tV28('계획을 먼저 만들거나 열어주세요.', 'CREATE OR OPEN A PLAN FIRST.') + '</span>' +
        '</div>';
      setActions(false, false);
      return;
    }

    const obj = plan.objective;
    if (!obj) {
      body.innerHTML =
        '<div class="v28-objective-empty">' +
          '<strong>' + tV28('목표 미지정', 'OBJECTIVE NOT SET') + '</strong>' +
          '<span>' + tV28(
            '항법을 사용하려면 이 계획의 목표를 지정하세요. 목표 없이 경로만 작성해도 됩니다.',
            'SET AN OBJECTIVE TO USE NAV. ROUTE-ONLY PLANS ARE ALSO ALLOWED.'
          ) + '</span>' +
          '<small class="v28-objective-plan"></small>' +
        '</div>';
      body.querySelector('.v28-objective-plan').textContent =
        tV28('계획 · ', 'PLAN · ') + plan.name;
      setActions(true, false);
      return;
    }

    const tel = objectiveTelemetry(plan);
    const refLabel = tel?.ref?.type ? String(tel.ref.type).replace('LAST_GPS','LAST FIX') : '--';
    body.innerHTML =
      '<div class="v28-objective-card">' +
        '<div class="v28-objective-name"></div>' +
        '<div class="v28-objective-coords"></div>' +
        '<div class="v28-objective-grid">' +
          '<div><span>DIST</span><strong>' + (tel?.distance || '--') + '</strong></div>' +
          '<div><span>BRG</span><strong>' + (tel?.bearing || '---') + '</strong></div>' +
          '<div><span>REF</span><strong>' + refLabel + '</strong></div>' +
          '<div><span>' + tV28('계획', 'PLAN') + '</span><strong class="v28-plan-name-cell"></strong></div>' +
        '</div>' +
      '</div>';
    body.querySelector('.v28-objective-name').textContent = obj.name;
    body.querySelector('.v28-objective-coords').textContent =
      obj.coords[0].toFixed(6) + ', ' + obj.coords[1].toFixed(6);
    body.querySelector('.v28-plan-name-cell').textContent = plan.name;
    setActions(true, true);
  }

  function openRoutesSheet() {
    if (typeof document === 'undefined') return;
    clearObjectivePickerMode();
    closePhase2Sheets();
    if (typeof closeFieldControls === 'function') closeFieldControls();
    renderPhase2Routes();
    document.getElementById('v28RoutesSheet')?.classList.add('open');
    document.body.classList.add('v28-sheet-open');
  }

  function openObjectiveSheet() {
    if (typeof document === 'undefined') return;
    clearObjectivePickerMode();
    closePhase2Sheets();
    if (typeof closeFieldControls === 'function') closeFieldControls();
    renderPhase2Objective();
    document.getElementById('v28ObjectiveSheet')?.classList.add('open');
    document.body.classList.add('v28-sheet-open');
  }

  function syncPhase2BottomLabels() {
    if (typeof document === 'undefined') return;
    const labels = [
      ['v28RoutesBtn', tV28('계획', 'PLANS')],
      ['v28SitesBtn', tV28('거점', 'SITES')],
      ['v28MenuBtn', tV28('메뉴', 'MENU')]
    ];
    labels.forEach(([id,label]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = label;
    });
    const routesTitle = document.getElementById('v28RoutesTitle');
    const objectiveTitle = document.getElementById('v28ObjectiveTitle');
    if (routesTitle) routesTitle.textContent = tV28('계획', 'PLANS');
    if (objectiveTitle) objectiveTitle.textContent = tV28('목표 설정', 'OBJECTIVE');
    const newBtn = document.getElementById('v28NewPlanBtn');
    if (newBtn) newBtn.textContent = tV28('새 계획', 'NEW PLAN');
    const createBtn = document.getElementById('v28CreatePlanBtn');
    if (createBtn) createBtn.textContent = tV28('만들기', 'CREATE');
    const cancelBtn = document.getElementById('v28CancelPlanBtn');
    if (cancelBtn) cancelBtn.textContent = tV28('취소', 'CANCEL');
    const planObjectiveBtn = document.getElementById('v28PlanObjectiveBtn');
    if (planObjectiveBtn) planObjectiveBtn.textContent = tV28('목표', 'OBJECTIVE');
    const targetSet = document.getElementById('btnTargetSet');
    if (targetSet && !objectivePickMode) targetSet.textContent = tV28('[ 목표 지정 ]', '[ SET OBJECTIVE ]');
    const sitesTitle = document.querySelector('#wpDrawer .drawer-head > div');
    if (sitesTitle && !objectivePickMode) sitesTitle.textContent = tV28('거점', 'SITES');
    renderPhase2Routes();
    renderPhase2Objective();
    syncObjectivePickerUi();
  }

  function initPhase2Ui() {
    if (phase2UiReady || typeof document === 'undefined') return;
    const cluster = document.querySelector('.mfd-bottom-bar .v26-main-cluster');
    if (!cluster) return;
    phase2UiReady = true;

    cluster.classList.add('v28-main-cluster');
    cluster.innerHTML =
      '<button class="osb-btn v26-primary" id="v28RoutesBtn" type="button"></button>' +
      '<button class="osb-btn v26-primary" id="v28SitesBtn" type="button"></button>' +
      '<button class="osb-btn v26-primary" id="v28MenuBtn" type="button"></button>';

    const toolbar = document.getElementById('targetModeToolbar');
    if (toolbar) {
      const exitButton = Array.from(toolbar.querySelectorAll('.plan-main-only')).find(el =>
        String(el.getAttribute('onclick') || '').includes('exitTargetMode')
      );
      if (exitButton) exitButton.id = 'planExitBtn';
      if (!document.getElementById('v28PlanObjectiveBtn')) {
        const objectiveButton = document.createElement('button');
        objectiveButton.className = 'osb-btn plan-main-only';
        objectiveButton.id = 'v28PlanObjectiveBtn';
        objectiveButton.type = 'button';
        objectiveButton.addEventListener('click', openObjectiveSheet);
        toolbar.insertBefore(objectiveButton, document.getElementById('planSearchBtn') || toolbar.firstChild);
      }
    }

    const routesSheet = document.createElement('div');
    routesSheet.id = 'v28RoutesSheet';
    routesSheet.className = 'v28-sheet';
    routesSheet.innerHTML =
      '<div class="v28-sheet-shell">' +
        '<div class="v28-sheet-head"><div><small>TACTICAL RECON // V28</small><strong id="v28RoutesTitle"></strong></div><button class="v28-sheet-close" type="button">×</button></div>' +
        '<div class="v28-new-plan">' +
          '<button class="osb-btn active" id="v28NewPlanBtn" type="button"></button>' +
          '<div class="v28-new-plan-form" id="v28NewPlanForm">' +
            '<input id="v28PlanNameInput" type="text" maxlength="60" autocomplete="off" />' +
            '<button class="osb-btn active" id="v28CreatePlanBtn" type="button">CREATE</button>' +
            '<button class="osb-btn" id="v28CancelPlanBtn" type="button">CANCEL</button>' +
          '</div>' +
        '</div>' +
        '<div class="v28-plan-list" id="v28PlanList"></div>' +
      '</div>';
    document.body.appendChild(routesSheet);

    const objectiveSheet = document.createElement('div');
    objectiveSheet.id = 'v28ObjectiveSheet';
    objectiveSheet.className = 'v28-sheet';
    objectiveSheet.innerHTML =
      '<div class="v28-sheet-shell v28-objective-shell">' +
        '<div class="v28-sheet-head"><div><small>TACTICAL RECON // V28</small><strong id="v28ObjectiveTitle"></strong></div><button class="v28-sheet-close" type="button">×</button></div>' +
        '<div id="v28ObjectiveBody"></div>' +
        '<div class="v28-objective-actions">' +
          '<button class="osb-btn active" id="v28ObjectiveSiteBtn" type="button"></button>' +
          '<button class="osb-btn" id="v28ObjectiveReticleBtn" type="button"></button>' +
          '<button class="osb-btn v28-danger" id="v28ObjectiveClearBtn" type="button"></button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(objectiveSheet);

    document.getElementById('v28RoutesBtn')?.addEventListener('click', openRoutesSheet);
    document.getElementById('v28SitesBtn')?.addEventListener('click', () => {
      clearObjectivePickerMode();
      closePhase2Sheets();
      if (typeof closeFieldControls === 'function') closeFieldControls();
      if (typeof openWpDrawer === 'function') openWpDrawer();
    });
    document.getElementById('v28MenuBtn')?.addEventListener('click', () => {
      clearObjectivePickerMode();
      closePhase2Sheets();
      if (typeof openFieldControls === 'function') openFieldControls('menu');
    });

    document.querySelectorAll('.v28-sheet-close').forEach(btn => btn.addEventListener('click', closePhase2Sheets));
    [routesSheet, objectiveSheet].forEach(sheet => sheet.addEventListener('click', e => {
      if (e.target === sheet) closePhase2Sheets();
    }));

    const newForm = document.getElementById('v28NewPlanForm');
    const nameInput = document.getElementById('v28PlanNameInput');
    document.getElementById('v28NewPlanBtn')?.addEventListener('click', () => {
      newForm?.classList.add('open');
      if (nameInput) {
        nameInput.placeholder = tV28('계획 이름', 'PLAN NAME');
        nameInput.value = '';
        setTimeout(() => nameInput.focus(), 0);
      }
    });
    document.getElementById('v28CancelPlanBtn')?.addEventListener('click', () => newForm?.classList.remove('open'));
    const createFromInput = () => {
      const name = String(nameInput?.value || '').trim();
      if (!name) {
        nameInput?.focus();
        nameInput?.setAttribute('aria-invalid','true');
        return;
      }
      nameInput?.removeAttribute('aria-invalid');
      const plan = createPlan({ name });
      if (!plan) {
        alert(tV28('계획 생성에 실패했습니다.', 'PLAN CREATE FAILED.'));
        return;
      }
      newForm?.classList.remove('open');
      if (openPlanInEditor(plan.id)) setTimeout(openObjectiveSheet, 0);
    };
    document.getElementById('v28CreatePlanBtn')?.addEventListener('click', createFromInput);
    nameInput?.addEventListener('keydown', e => {
      if (e.key === 'Enter') createFromInput();
      if (e.key === 'Escape') newForm?.classList.remove('open');
    });

    document.getElementById('v28ObjectiveSiteBtn')?.addEventListener('click', openObjectiveSitePicker);
    document.getElementById('v28ObjectiveReticleBtn')?.addEventListener('click', setObjectiveAtReticle);
    const drawerCloseButton = document.querySelector('#wpDrawer .drawer-head .btn-close-osd');
    drawerCloseButton?.addEventListener('click', () => {
      if (objectivePickMode) clearObjectivePickerMode();
    }, true);

    const previousOpenSitrepV28 = typeof openSitrep === 'function' ? openSitrep : null;
    if (previousOpenSitrepV28) {
      openSitrep = function() {
        const out = previousOpenSitrepV28.apply(this, arguments);
        if (objectivePickMode) syncObjectivePickerUi();
        return out;
      };
    }
    const previousCloseSitrepV28 = typeof closeSitrep === 'function' ? closeSitrep : null;
    if (previousCloseSitrepV28) {
      closeSitrep = function() {
        const wasPicking = objectivePickMode;
        const out = previousCloseSitrepV28.apply(this, arguments);
        if (wasPicking) clearObjectivePickerMode();
        return out;
      };
    }
    const previousRenderWpDrawerListV28 = typeof renderWpDrawerList === 'function' ? renderWpDrawerList : null;
    if (previousRenderWpDrawerListV28) {
      renderWpDrawerList = function() {
        const out = previousRenderWpDrawerListV28.apply(this, arguments);
        if (objectivePickMode) syncObjectivePickerUi();
        return out;
      };
    }

    document.getElementById('v28ObjectiveClearBtn')?.addEventListener('click', () => {
      if (!activePlanId) return;
      const plan = getPlanById(activePlanId);
      if (!plan?.objective) return;
      if (!confirm(tV28('이 계획의 목표를 해제할까요? 경로 데이터는 유지됩니다.', 'CLEAR THIS PLAN OBJECTIVE? ROUTE DATA WILL REMAIN.'))) return;
      if (targetModeActive && routeDirty && !saveActivePlanFromEditor()) return;
      const next = clearPlanObjective(activePlanId);
      if (!next) return;
      if (targetModeActive) {
        targetModeTarget = null;
        if (typeof syncTargetReferenceLine === 'function') syncTargetReferenceLine();
        if (typeof updateTargetModePanel === 'function') updateTargetModePanel();
      }
      renderPhase2Objective();
      renderPhase2Routes();
    });

    const legacySaveTargetRoute = typeof saveTargetRoute === 'function' ? saveTargetRoute : null;
    saveTargetRoute = function() {
      if (activePlanId && targetModeActive) return saveActivePlanFromEditor();
      return legacySaveTargetRoute ? legacySaveTargetRoute() : false;
    };

    openPlanShortcut = openRoutesSheet;

    enterTargetMode = function(target) {
      if (!target?.coords) return;
      const reuseCurrentPlan = Boolean(activePlanId && (targetModeActive || objectivePickMode));
      let plan = reuseCurrentPlan ? getPlanById(activePlanId) : null;
      if (plan) {
        plan = setPlanObjective(plan.id, target);
      } else {
        plan = createPlan({ name: target.name || tV28('새 계획', 'NEW PLAN'), objective: target });
      }
      if (plan) {
        clearObjectivePickerMode();
        openPlanInEditor(plan.id);
      }
    };

    enterTargetModeFromSitrep = function() {
      if (!currentActiveTarget) return;
      const list = typeof getLocalIntel === 'function' ? getLocalIntel() : [];
      const stored = Array.isArray(list) ? list.find(item => String(item.id) === String(currentActiveTarget.id)) : null;
      let registered = null;
      if (typeof RECON_TARGETS !== 'undefined' && Array.isArray(RECON_TARGETS)) {
        registered = RECON_TARGETS.find(item => String(item.id) === String(currentActiveTarget.id)) || null;
      }
      const target = stored || registered || currentActiveTarget;
      if (!target?.coords) {
        alert(tV28('목표로 사용할 수 없는 거점입니다.', 'THIS SITE CANNOT BE USED AS AN OBJECTIVE.'));
        return;
      }
      enterTargetMode(target);
    };

    const previousUpdateTargetModePanel = typeof updateTargetModePanel === 'function' ? updateTargetModePanel : null;
    if (previousUpdateTargetModePanel) {
      updateTargetModePanel = function() {
        previousUpdateTargetModePanel();
        if (!activePlanId || !targetModeActive || targetModePhase !== 'PLAN') return;
        const plan = getPlanById(activePlanId);
        if (!plan) return;
        const kicker = document.querySelector('.target-mode-kicker');
        const name = document.getElementById('targetModeName');
        const hint = document.getElementById('planNavHint');
        const trigger = document.getElementById('planInfoTrigger');
        if (kicker) kicker.textContent = plan.objective
          ? tV28('계획 // 목표 설정됨', 'PLAN // OBJECTIVE SET')
          : tV28('계획 // 목표 미지정', 'PLAN // NO OBJECTIVE');
        if (name) name.textContent = plan.name;
        if (!plan.objective) {
          if (hint) hint.textContent = tV28('목표 미지정 · [목표]에서 지정', 'NO OBJECTIVE · USE OBJECTIVE');
          trigger?.setAttribute('aria-disabled','true');
        }
        if (objectivePickMode) syncObjectivePickerUi();
      };
    }

    const previousStartTargetNavigation = typeof startTargetNavigation === 'function' ? startTargetNavigation : null;
    if (previousStartTargetNavigation) {
      startTargetNavigation = function() {
        if (activePlanId) {
          const plan = getPlanById(activePlanId);
          if (!plan?.objective) {
            openObjectiveSheet();
            return;
          }
        }
        return previousStartTargetNavigation();
      };
    }

    phase2AutosaveTimer = setInterval(() => {
      if (!activePlanId || !targetModeActive || !routeDirty) return;
      if (typeof routePointerId !== 'undefined' && routePointerId !== null) return;
      if (typeof routeCurrentSegment !== 'undefined' && routeCurrentSegment?.length) return;
      saveActivePlanFromEditor();
    }, 900);

    phase2ObjectiveRefreshTimer = setInterval(() => {
      if (document.getElementById('v28ObjectiveSheet')?.classList.contains('open')) {
        renderPhase2Objective();
      }
    }, 1000);

    new MutationObserver(syncPhase2BottomLabels).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
    syncPhase2BottomLabels();
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
    plans: {
      get: getPlanById,
      create: createPlan,
      setObjective: setPlanObjective,
      clearObjective: clearPlanObjective,
      delete: deletePlan,
      isPersisted: isPersistedPlan
    },
    ui: {
      initPhase2: initPhase2Ui,
      openRoutes: openRoutesSheet,
      openObjective: openObjectiveSheet,
      openPlan: openPlanInEditor,
      saveActive: saveActivePlanFromEditor
    },
    state: {
      get activePlanId() { return activePlanId; },
      set activePlanId(id) { activePlanId = id; },
      get activeTrackId() { return activeTrackId; },
      set activeTrackId(id) { activeTrackId = id; }
    }
  };
})();

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.v28?.ui?.initPhase2(), { once:true });
  } else {
    window.v28?.ui?.initPhase2();
  }
}
