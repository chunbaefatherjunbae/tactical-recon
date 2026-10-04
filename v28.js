window.v28 = (function() {
  const PLAN_STORAGE_KEY = 'tactical_recon_plans_v1';
  const TRACK_V2_STORAGE_KEY = 'tactical_recon_track_logs_v2';
  const TRACK_V1_STORAGE_KEY = 'tactical_recon_track_logs_v1';
  const ROUTE_PLAN_STORAGE_KEY = 'tactical_recon_registered_routes_v1';
  
  let activePlanId = null;
  let activeTrackId = null;

  function generateId() {
    return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 9);
  }

  function sanitizeCoords(coords) {
    if (!Array.isArray(coords) || coords.length < 2) return null;
    const lat = Number(coords[0]);
    const lon = Number(coords[1]);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    return [lat, lon];
  }

  function sanitizeString(str, maxLength = 255) {
    if (typeof str !== 'string') return '';
    return str.slice(0, maxLength);
  }

  function sanitizeTimestamp(ts) {
    if (typeof ts === 'number') return ts;
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
    
    return {
      schemaVersion: 1,
      id: sanitizeString(plan.id) || generateId(),
      name: sanitizeString(plan.name) || 'Unnamed Plan',
      createdAt: sanitizeTimestamp(plan.createdAt),
      updatedAt: sanitizeTimestamp(plan.updatedAt),
      objective: plan.objective ? sanitizePlanPoint(plan.objective) : undefined,
      startPoint: plan.startPoint ? sanitizePlanPoint(plan.startPoint) : undefined,
      viaPoints: Array.isArray(plan.viaPoints) ? plan.viaPoints.map(sanitizePlanPoint).filter(Boolean) : [],
      endPoint: plan.endPoint ? sanitizePlanPoint(plan.endPoint) : undefined,
      routeSegments: Array.isArray(plan.routeSegments) ? plan.routeSegments.map(seg => (Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : [])).filter(seg => seg.length > 0) : [],
      overlaySegments: Array.isArray(plan.overlaySegments) ? plan.overlaySegments.map(seg => (Array.isArray(seg) ? seg.map(sanitizeCoords).filter(Boolean) : [])).filter(seg => seg.length > 0) : [],
      trackIds: Array.isArray(plan.trackIds) ? plan.trackIds.map(id => sanitizeString(id)).filter(Boolean) : [],
      legacy: !!plan.legacy
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
        }).filter(p => !isNaN(p.lat) && !isNaN(p.lon)) : []
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
        measuredKm: track.distance && typeof track.distance.measuredKm === 'number' && !isNaN(track.distance.measuredKm) ? track.distance.measuredKm : 0,
        estimatedKm: track.distance && typeof track.distance.estimatedKm === 'number' && !isNaN(track.distance.estimatedKm) ? track.distance.estimatedKm : 0
      }
    };
  }

  function getV28Plans() {
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {};
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

  function getV27PlansAsV28() {
    try {
      const raw = localStorage.getItem(ROUTE_PLAN_STORAGE_KEY);
      const v27Plans = raw ? JSON.parse(raw) : {};
      if (typeof v27Plans !== 'object' || Array.isArray(v27Plans) || v27Plans === null) return {};
      
      const migrated = {};
      for (const [targetId, v27Plan] of Object.entries(v27Plans)) {
        if (!v27Plan) continue;
        
        const fallbackCoords = Array.isArray(v27Plan.startPoint) ? v27Plan.startPoint : [0,0];
        
        const mappedPlan = sanitizePlanV1({
          id: `v27-${targetId}`,
          name: `V27 Route for ${targetId}`,
          createdAt: Date.now(),
          updatedAt: v27Plan.updatedAt ? new Date(v27Plan.updatedAt).getTime() : Date.now(),
          objective: {
            id: targetId,
            role: 'OBJECTIVE',
            name: `Target ${targetId}`,
            coords: fallbackCoords,
            source: 'IMPORT'
          },
          startPoint: v27Plan.startPoint ? { coords: v27Plan.startPoint, role: 'START' } : undefined,
          viaPoints: Array.isArray(v27Plan.viaPoints) ? v27Plan.viaPoints.map(vp => ({ coords: vp, role: 'VIA' })) : [],
          endPoint: v27Plan.endPoint ? { coords: v27Plan.endPoint, role: 'END' } : undefined,
          routeSegments: v27Plan.segments || [],
          overlaySegments: v27Plan.markSegments || [],
          legacy: true
        });
        if (mappedPlan) {
          migrated[mappedPlan.id] = mappedPlan;
        }
      }
      return migrated;
    } catch (e) {
      console.warn('V27 Plan Read Adapter Error:', e);
      return {};
    }
  }

  function getAllPlans() {
    return { ...getV27PlansAsV28(), ...getV28Plans() };
  }

  function getV28Tracks() {
    try {
      const raw = localStorage.getItem(TRACK_V2_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null ? parsed : {};
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
    try {
      const raw = localStorage.getItem(TRACK_V1_STORAGE_KEY);
      const v27Tracks = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(v27Tracks)) return [];
      
      return v27Tracks.map(t => {
        if (!t) return null;
        
        let points = [];
        if (Array.isArray(t.points)) {
          points = t.points.map(p => {
             if (!Array.isArray(p)) return null;
             return { lat: Number(p[0]), lon: Number(p[1]), timestamp: Number(p[2]) || Date.now() };
          }).filter(p => !isNaN(p.lat) && !isNaN(p.lon));
        }

        return sanitizeTrackV2({
          id: `v27-${t.id || generateId()}`,
          startedAt: t.timestamp || Date.now(),
          endedAt: t.timestamp || Date.now(),
          distance: { measuredKm: Number(t.distanceKm) || 0, estimatedKm: 0 },
          segments: [{
            kind: 'MEASURED',
            source: 'GPS',
            points: points
          }]
        });
      }).filter(Boolean);
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
      sanitizeTrackV2
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
