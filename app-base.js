/* Tactical Recon legacy/base runtime.
 * Stable foundation only. Current behavior layers load after this file.
 */
window.__reconRotateUnavailable = true;

/* 엄선 거점 DB */
    const RECON_TARGETS = [
      { id: "T-01", opCode: "OP-MAWANG-01", name: "청계산 망경대 마왕굴 & 은거지", cat: "옛길/비경", coords: [37.4261, 127.0494], desc: "고려 멸망 후 충신 조견·이색 등이 은거한 암벽 동굴. 능선 동측 50m 평탄면에 옛 주춧돌 잔해와 각자 바위 보존.", tips: "망경대 군사시설 펜스 우회 시 급경사 암릉 실족 주의." },
      { id: "T-02", opCode: "OP-DALRAE-02", name: "청계산 달래내고개 삼남길 주막터", cat: "옛길/주막", coords: [37.4112, 127.0681], desc: "조선시대 한양과 삼남지방을 잇던 삼남대로 고갯길. 주막과 행인들의 쉼터가 있던 길목으로 토기/사기그릇 파편 다수 매몰 구역.", tips: "경부고속도로 달래내고개 하부 구 도로변 사면 수색." },
      { id: "T-03", opCode: "OP-NAMHAN-03", name: "남한산성 서흔흔암 & 비밀 암문", cat: "군사/성곽", coords: [37.4789, 127.1852], desc: "병자호란 당시 삼전도 출성 전 결사 항전이 벌어졌던 군사 관측 암문. 성벽 외벽 사면에 옛 치성 및 은밀 출입구 잔해 보존.", tips: "정규 탐방로 외벽 비탈길 접근 시 미끄럼 방지화 필수." },
      { id: "T-04", opCode: "OP-HOROGORU-04", name: "연천 호로고루 고구려 국경성", cat: "군사/유적", coords: [37.9942, 126.9157], desc: "임진강 천연 절벽을 활용한 삼국시대 고구려 최전방 요새. 성벽 하부 현무암 주상절리와 강안 모래톱의 도하 통제 거점.", tips: "강안 저지대는 군사작전 지역 인접하므로 일몰 전 퇴출 권장." },
      { id: "T-05", opCode: "OP-GAMAK-05", name: "파주 감악산 설마리 참호 & 임꺽정굴", cat: "격전지/진지", coords: [37.9482, 126.9385], desc: "6.25 전쟁 당시 영국군 글로스터 연대 고립 방어 격전지 및 조선 명종대 임꺽정 은신 설화 굴. 능선부 개인호 참호선 잔해 보존.", tips: "북측 암릉 지대 비포장 구간 낙석 주의." },
      { id: "T-06", opCode: "OP-HWAAK-06", name: "가평 화악산 옛 군사 레이더 임도", cat: "오지/임도", coords: [38.0267, 127.5381], desc: "경기도 최고봉 자락의 옛 군용 작전도로. 해발 1,000m 이상의 쌈지공원과 운무 전망, 폐쇄된 구 초소 및 진지 흔적.", tips: "동절기 및 우천 시 노면 결빙 및 비포장 낙석 빈번." },
      { id: "T-07", opCode: "OP-JORYEONG-07", name: "문경새재 제3관문 조령관 옛 고갯길", cat: "옛길/주막", coords: [36.7825, 128.0673], desc: "영남대로 최고 험로인 조령 정상부. 영남과 기호지방의 경계 관문 및 성황당터, 과거 길손들의 주막터 초석 잔존.", tips: "충북 괴산-경북 문경 경계 안부 능선 옛 성벽 라인 추적." },
      { id: "T-08", opCode: "OP-DOSOL-08", name: "양구 펀치볼 도솔산 지구 능선 참호", cat: "격전지/진지", coords: [38.2588, 128.1189], desc: "한국전쟁 피의 능선·단장의 능선 전초기지. 해안분지 운해를 굽어보는 칼날 능선에 잔존하는 U자형 교통호 및 벙커 흔적.", tips: "미확인 지뢰지대 경고 표지판 구역 절대 진입 금지." },
      { id: "T-09", opCode: "OP-BAEKAM-09", name: "화천 백암산 비목 발원지 & 옛 참호", cat: "격전지/진지", coords: [38.2045, 127.8182], desc: "가곡 '비목(碑木)'의 모태가 된 무명용사 녹슨 철모와 돌무덤이 발견된 해발 1,178m 격전 고지. 당시 참호 흔적 잔존.", tips: "군사분계선 남방 한계선 인접구역. 지정 임도만 이동 가능." },
      { id: "T-10", opCode: "OP-CHEORWON-10", name: "철원 금강산 철도 끊어진 교각", cat: "폐공간/유적", coords: [38.2912, 127.2081], desc: "일제강점기 철원에서 금강산 내금강까지 달리던 전기철도 교각 흔적. 한탄강 지류를 가로지르던 거대한 콘크리트 교각의 세월감.", tips: "교각 상부 접근 금지. 강변 천변에서 교각 구조물 관측." },
      { id: "T-11", opCode: "OP-DAEGWAN-11", name: "대관령 옛길 반정 주막터", cat: "옛길/주막", coords: [37.6974, 128.7758], desc: "신사임당과 율곡 이이가 넘던 영동 옛길의 중간 쉼터. 대관령 상제에서 강릉 시내를 조망하던 옛 주막 마당 초석 보존.", tips: "구 영동고속도로 비포장 옛길과 연결되는 보행자 임도." },
      { id: "T-12", opCode: "OP-MANHANG-12", name: "정선 함백산 만항재 옛 운탄고도", cat: "오지/임도", coords: [37.1523, 128.9135], desc: "해발 1,330m 남한 최고 높이의 포장 고갯길 및 과거 석탄을 운반하던 해발 1,100m 비포장 운탄고도. 폐광 폐석 더미와 설경 비경.", tips: "비포장 임도 탐방 시 4륜 구동 또는 도보 추천." },
      { id: "T-13", opCode: "OP-INJE-13", name: "인제 원대리 응봉산 화전민 숯가마터", cat: "폐공간/유적", coords: [38.0124, 128.1672], desc: "자작나무숲 깊은 골짜기 안쪽에 숨겨진 1960년대 이전 화전민 주거지 및 돌로 쌓아 올린 전통 숯가마 원형 구조물 잔존 구역.", tips: "계곡 합수부 둔덕 주변 석축 집중 탐색." },
      { id: "T-14", opCode: "OP-BOBAL-14", name: "단양 소백산 보발재 비포장 구 고갯길", cat: "오지/임도", coords: [37.0142, 128.4589], desc: "단양 가곡면과 영춘면을 잇던 굽이치는 옛 산간 고갯길. 도로 신설 이전의 산악 지형 굴곡과 계곡 합수부 옛 쉼터.", tips: "가을 단풍철 시야 확보 용이. 급경사 헤어핀 커브." },
      { id: "T-15", opCode: "OP-OKCHEON-15", name: "옥천 금강 수몰지구 폐교 & 옛길", cat: "폐공간/유적", coords: [36.3312, 127.6041], desc: "대청호 수몰로 갈수기(갈수철)에만 물 밖으로 모습을 드러내는 옛 아스팔트 도로, 콘크리트 교량, 분교 터 초석.", tips: "수위 변동에 따라 접근 가능 구역 변동. 진흙 갯벌 진입 금지." },
      { id: "T-16", opCode: "OP-NOGEUN-16", name: "영동 노근리 구 경부선 쌍굴다리", cat: "격전지/진지", coords: [36.1738, 127.8542], desc: "1950년 7월 한국전쟁 당시 피란민 학살의 비극이 서린 구 경부선 철도 개천 굴다리. 콘크리트 벽면에 박힌 수백 발의 기관총 탄흔.", tips: "역사 유적 보존 구역으로 훼손 절대 금지." },
      { id: "T-17", opCode: "OP-GUNSAN-17", name: "군산 옥구 옛 염전 & 곡물 수탈 창고", cat: "폐공간/유적", coords: [35.9412, 126.6621], desc: "일제강점기 쌀과 소금을 수탈하던 서해안 옛 갯벌 둑길 및 붉은 벽돌 창고 흔적. 갈대밭으로 변한 폐염전 수로망.", tips: "간조 시 갯벌 둑길 바람 강함. 방풍 장비 추천." },
      { id: "T-18", opCode: "OP-CHILSUN-18", name: "지리산 칠선계곡 비트 & 화전민터", cat: "오지/비경", coords: [35.3489, 127.6412], desc: "지리산 최후의 원시림 골짜기. 한국전쟁 당시 빨치산 남부군 총사령부 비밀 은신처(비트) 및 1970년대 철거된 마지막 화전민 집터.", tips: "국립공원 특별보호구역으로 출입 허가 일정 확인 필수." },
      { id: "T-19", opCode: "OP-GADUK-19", name: "부산 가덕도 외양포 일본군 포대 진지", cat: "군사/유적", coords: [35.0195, 128.8284], desc: "1904년 러일전쟁 당시 일본군 진해만요새사령부가 구축한 280mm 유탄포 포대 원형 진지, 지하 화약고, 탄약고 벽체 보존.", tips: "지하 벙커 내부 조명 없음. 전술 손전등 지참." },
      { id: "T-20", opCode: "OP-HOMI-20", name: "포항 호미곶 옛 봉수대 & 해양 감시초소", cat: "군사/유적", coords: [36.0792, 129.5694], desc: "동해안으로 침투하는 왜구를 감시하던 조선시대 영일 장기 봉수대 터 및 일제 해양 감시 콘크리트 초소 잔해.", tips: "해안 암초 절벽 사면 강풍 주의." },
      { id: "T-21", opCode: "OP-GYODONG-21", name: "강화 교동도 난정리 망향대 & 연산군 적거지", cat: "옛길/유적", coords: [37.7841, 126.2482], desc: "북한 연백평야가 손에 잡힐 듯 보이는 최전방 섬. 조선 연산군 위리안치(가시울타리 유배) 터 및 실향민들의 제단.", tips: "민간인 출입 통제선 지역으로 교동대교 진입 시 신분증 확인." },
      { id: "T-22", opCode: "OP-SEOSAN-22", name: "서산 삼길포 봉수대 & 폐염전 둑길", cat: "지형/비경", coords: [37.0012, 126.4521], desc: "아산만 입구를 지키던 해안 요충 봉수대와 간척 이전 갯벌을 막았던 옛 방조제 석축 잔해.", tips: "해무 발생 시 시야 제한. 갯바위 실족 주의." },
      { id: "T-23", opCode: "OP-GEOJE-23", name: "거제 지세포진성 & 태평양전쟁 대공포 진지", cat: "군사/성곽", coords: [34.8512, 128.6945], desc: "조선시대 수군 만호진 성벽과 태평양전쟁 말기 일본군이 미군 폭격기에 대응해 구축했던 콘크리트 대공포 원형 진지.", tips: "성벽 능선부 라벤더밭 배후 대나무숲 안쪽 수색." },
      { id: "T-24", opCode: "OP-JUNGNYEONG-24", name: "영주 소백산 죽령 옛길 조선 객사터", cat: "옛길/주막", coords: [36.9124, 128.4876], desc: "신라 아달라왕 5년에 개척된 2,000년 역사의 죽령 옛길. 주막거리와 나그네들이 머물던 객사 초석, 성황당 터 보존.", tips: "죽령마루 휴게소 뒤편 구 도로 오솔길 진입." }
    ];

    /* 지도 초기화 */
    let baseLocation = [37.4267, 127.0544];
    let selectedRadius = 'all';
    let currentActiveTarget = null;
    let markersLayer = null;
    let radiusCircle = null;
    let currentGpsAltitude = null;
    let gpsWatchId = null;
    let gpsSessionId = 0;
    let gpsLockState = 'NO FIX';
    let hasGpsFix = false;
    let currentOpticMode = 'NVG-G';
    let gpsMarker = null;
    let gpsFollowEnabled = false;
    let navMapOrientation = 'NORTH';
    let latestGpsPosition = null;
    let lastTrackSample = null;
    let lastTrackHeading = null;
    let lastTrackHeadingAt = 0;
    const TRACK_MIN_SPEED_MPS = 0.8;
    const TRACK_MAX_ACCURACY_M = 45;
    const TRACK_HEADING_DEADZONE_DEG = 1.8;
    const TRACK_HEADING_MIN_INTERVAL_MS = 80;
    let lastGpsFollowPanAt = 0;
    let lastRadarDistanceUpdateAt = 0;
    let lastRadarDistanceOrigin = null;
    let waypointFilter = 'ALL';
    let selectedAddressResult = null;
    const registeredDistanceCache = new Map();
    const markerRegistry = new Map();
    const markerLayerVisibility = {
      REGISTERED: true,
      UNEXPLORED: true,
      SECURED: true,
      USER: true
    };

    // TARGET MODE / ROUTE PLAN state
    let targetModeActive = false;
    let targetModeTarget = null;
    let targetModeShowGps = false;
    let targetModePhase = 'PLAN';
    let pendingNavStart = false;
    let navPanelCollapsed = false;
    let routeDrawEnabled = false;
    let routePointerId = null;
    const routeActivePointers = new Map();
    let routeGestureMode = false;
    let routeGestureAwaitRelease = false;
    let routeGestureLastCenter = null;
    let routeGestureLastDistance = 0;
    let routeCurrentSegment = null;
    let routeCurrentPolyline = null;
    let routeDraftSegments = [];
    let routeMarkSegments = [];
    let routeDrawKind = 'ROUTE';
    let routeDraftLayer = null;
    let routeViaPoints = [];
    let routeStartPoint = null;
    let routeEndPoint = null;
    let routeStartMarker = null;
    let routeEndMarker = null;
    let navLegIndex = 0;
    let backtrackActive = false;
    let navStartedAt = null;
    let navLegStartedAt = null;
    let navElapsedTimer = null;
    let navLegTimes = [];
    let routeViaLayer = null;
    let routeLocateSelected = null;
    let routeLocateRole = 'VIA';
    let routeLocateSearchToken = 0;
    let targetReferenceLine = null;
    let routeDirty = false;
    const ROUTE_PLAN_STORAGE_KEY = 'tactical_recon_registered_routes_v1';

    // Actual movement TRACK LOG state (separate from planned ROUTE).
    const TRACK_LOG_STORAGE_KEY = 'tactical_recon_track_logs_v1';
    const TRACK_LOG_MIN_DISTANCE_M = 6;
    const TRACK_LOG_MIN_INTERVAL_MS = 800;
    const TRACK_LOG_FORCE_INTERVAL_MS = 5000;
    let trackRecording = false;
    let pendingTrackStart = false;
    let trackStartedAt = null;
    let trackLogPoints = [];
    let trackLastAccepted = null;
    let trackLiveLayer = null;
    let trackLivePolyline = null;

    // V26 field-reference / offline-friendly state
    const HOME_POINT_STORAGE_KEY = 'tactical_recon_home_point_v1';
    let gpsPowerEnabled = false;
    let tempMarkPoint = null;
    let tempMarkMarker = null;
    let homeMarker = null;
    let roadBoostEnabled = false;
    let baseTileLayer = null;
    let roadBoostLayer = null;

    const ROTATION_AVAILABLE = Boolean(!window.__reconRotateUnavailable && L?.Map?.prototype && typeof L.Map.prototype.setBearing === 'function');
    const mapOptions = { center:baseLocation, zoom:12, zoomControl:false, zoomSnap:0.25, zoomDelta:0.5 };
    if (ROTATION_AVAILABLE) {
      Object.assign(mapOptions, {
        rotate:true, bearing:0, dragRotate:false, touchRotate:false, shiftKeyRotate:false,
        rotateControl:false, preventPageGestures:false
      });
    }
    const map = L.map('map', mapOptions);

    baseTileLayer = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      maxNativeZoom:17, maxZoom:19, attribution:'Map data © OpenStreetMap contributors · Map style © OpenTopoMap'
    }).addTo(map);
    roadBoostLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      minZoom:10, maxZoom:19, attribution:'© OpenStreetMap contributors'
    });

    function syncNetworkBasemap(){
      const preferred=roadBoostEnabled?roadBoostLayer:baseTileLayer;
      const inactive=roadBoostEnabled?baseTileLayer:roadBoostLayer;
      if(inactive&&map.hasLayer(inactive))map.removeLayer(inactive);

      const localMapActive=document.body.classList.contains('r16-light-map');
      if(localMapActive){
        if(preferred&&map.hasLayer(preferred))map.removeLayer(preferred);
        return;
      }
      if(preferred&&!map.hasLayer(preferred))preferred.addTo(map);
    }
    markersLayer = L.layerGroup().addTo(map);
    // 큰 NEARBY 원은 SVG보다 Canvas 렌더러가 iOS Safari 이동/줌에서 훨씬 가볍다.
    const radarRenderer = L.canvas({ padding: 0.25 });
    const routeRenderer = L.canvas({ padding: 0.35 });
    routeDraftLayer = L.layerGroup().addTo(map);
    routeViaLayer = L.layerGroup().addTo(map);
    trackLiveLayer = L.layerGroup().addTo(map);

    // Dynamic viewport/keyboard/PWA changes do not always emit a window resize on iOS.
    let mapSizeFrame = 0;
    function refreshMapSize() {
      cancelAnimationFrame(mapSizeFrame);
      mapSizeFrame = requestAnimationFrame(() => map.invalidateSize({ animate:false, pan:false }));
    }
    if (window.ResizeObserver) new ResizeObserver(refreshMapSize).observe(map.getContainer());
    window.visualViewport?.addEventListener('resize', refreshMapSize);
    window.addEventListener('pageshow', refreshMapSize);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshMapSize(); });

    /* 10계단 MGRS 계산 엔진 */
    function calcMGRS(lat, lon) {
      if (typeof window.mgrs !== 'undefined' && window.mgrs.forward) {
        try {
          const raw = window.mgrs.forward([lon, lat], 5);
          const m = raw.match(/^(\d{1,2}[A-Z])([A-Z]{2})(\d{5})(\d{5})$/);
          if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
          return raw;
        } catch (e) {}
      }
      return 'MGRS UNAVAILABLE';
    }

    function calcDistanceKmRaw(lat1, lon1, lat2, lon2) {
      const R = 6371;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * (Math.sin(dLon / 2) ** 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function calcDistanceKm(lat1, lon1, lat2, lon2) {
      return calcDistanceKmRaw(lat1, lon1, lat2, lon2).toFixed(1);
    }

    function calcBearingDegrees(lat1, lon1, lat2, lon2) {
      const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
      const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
      return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    function calcBearing(lat1, lon1, lat2, lon2) {
      const y = Math.sin((lon2 - lon1) * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180);
      const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
                Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos((lon2 - lon1) * Math.PI / 180);
      let brng = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
      const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
      return `${Math.round(brng).toString().padStart(3, '0')}° ${dirs[Math.round(brng / 45) % 8]}`;
    }

    function updateGpsTelemetry() {
      const elevEl = document.getElementById('gpsElev');
      const lockEl = document.getElementById('gpsLockState');
      const followEl = document.getElementById('gpsFollowState');
      const accEl = document.getElementById('gpsAcc');
      if (!elevEl || !lockEl) return;
      const alt = (typeof currentGpsAltitude === 'number' && Number.isFinite(currentGpsAltitude)) ? currentGpsAltitude : null;
      const acc = Number(latestGpsPosition?.coords?.accuracy);
      lockEl.innerText = gpsPowerEnabled ? gpsLockState : 'OFF';
      elevEl.innerText = alt === null ? '--- MSL' : `${Math.round(alt)} M MSL`;
      if (followEl) followEl.innerText = gpsFollowEnabled ? 'ON' : 'OFF';
      if (accEl) accEl.innerText = gpsPowerEnabled && Number.isFinite(acc) ? `±${Math.round(acc)} M` : '---';
      refreshGpsPowerUi();
    }

    function updateReticlePositionLite() {
      const center = map.getCenter();
      document.getElementById('reticleLat').innerText = center.lat.toFixed(5);
      document.getElementById('reticleLon').innerText = center.lng.toFixed(5);
      document.getElementById('reticleZoom').innerText = `LVL ${map.getZoom().toFixed(0)}`;
    }

    function updateReticleTelemetry() {
      const center = map.getCenter();
      updateReticlePositionLite();
      document.getElementById('reticleMgrs').innerText = calcMGRS(center.lat, center.lng);
    }

    // 10-DIGIT MGRS도 이동 중 갱신하되 120ms로 제한해 정밀 조정감과 성능을 같이 확보한다.
    let reticleTelemetryTimer = null;
    function scheduleReticleTelemetry() {
      if (reticleTelemetryTimer) return;
      reticleTelemetryTimer = setTimeout(() => {
        reticleTelemetryTimer = null;
        updateReticleTelemetry();
      }, 120);
    }
    function flushReticleTelemetry() {
      if (reticleTelemetryTimer) {
        clearTimeout(reticleTelemetryTimer);
        reticleTelemetryTimer = null;
      }
      updateReticleTelemetry();
      updateMapScale();
    }
    map.on('move', scheduleReticleTelemetry);
    map.on('zoom', scheduleReticleTelemetry);
    map.on('moveend', flushReticleTelemetry);
    map.on('zoomend', flushReticleTelemetry);
    updateReticleTelemetry();

    function chooseScaleDistance(maxMeters) {
      if (!Number.isFinite(maxMeters) || maxMeters <= 0) return 0;
      const exponent = Math.pow(10, Math.floor(Math.log10(maxMeters)));
      const steps = [1, 2, 2.5, 5, 10];
      let best = exponent;
      for (const step of steps) {
        const candidate = step * exponent;
        if (candidate <= maxMeters) best = candidate;
      }
      if (best > maxMeters) best /= 10;
      return best;
    }

    function formatScaleDistance(meters) {
      if (meters >= 1000) {
        const km = meters / 1000;
        return `${Number.isInteger(km) ? km.toFixed(0) : km.toFixed(1)} KM`;
      }
      return `${Math.round(meters)} M`;
    }

    function updateMapScale() {
      const line = document.getElementById('mapScaleLine');
      const label = document.getElementById('mapScaleLabel');
      if (!line || !label || !map) return;
      const size = map.getSize();
      if (!size.x || !size.y) return;
      const maxPx = Math.max(72, Math.min(124, size.x * 0.28));
      const cx = size.x / 2;
      const cy = size.y / 2;
      const a = map.containerPointToLatLng([cx - maxPx / 2, cy]);
      const b = map.containerPointToLatLng([cx + maxPx / 2, cy]);
      const maxMeters = map.distance(a, b);
      const distance = chooseScaleDistance(maxMeters);
      if (!distance) return;
      const width = Math.max(34, Math.min(maxPx, maxPx * (distance / maxMeters)));
      line.style.width = `${width.toFixed(1)}px`;
      label.innerText = formatScaleDistance(distance);
    }

    updateMapScale();

    async function writeClipboardText(text) {
      if (!text) return false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          return true;
        }
      } catch (e) {}
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus({preventScroll:true});
        ta.select();
        ta.setSelectionRange(0, ta.value.length);
        const ok = document.execCommand('copy');
        ta.remove();
        return ok;
      } catch (e) {
        return false;
      }
    }

    async function copyReticleMGRS(btn) {
      const valElem = document.getElementById('reticleMgrs');
      const text = valElem.innerText;
      if (!text || text.includes('CALCULATING') || text.includes('UNAVAILABLE')) return;
      const ok = await writeClipboardText(text);
      if (!ok) return;
      const orig = valElem.innerText;
      valElem.innerText = 'COPIED TO CLIPBOARD!';
      setTimeout(() => { if (valElem.innerText === 'COPIED TO CLIPBOARD!') valElem.innerText = orig; }, 1200);
    }

    setInterval(() => {
      const now = new Date();
      document.getElementById('hudUtcClock').innerText = now.toISOString().substring(11, 19) + 'Z';
    }, 1000);

    function updateLinkState() {
      const el = document.getElementById('hudLinkState');
      if (!el) return;
      const online = navigator.onLine;
      el.innerText = online ? 'ONLINE' : 'OFFLINE';
      el.dataset.state = online ? 'online' : 'offline';
    }
    window.addEventListener('online', updateLinkState);
    window.addEventListener('offline', updateLinkState);
    updateLinkState();

    /* 영구 저장소 (LocalStorage) */
    const STORAGE_KEY = "tactical_recon_intel_v2";

    function getLocalIntel() {
      try {
        const d = localStorage.getItem(STORAGE_KEY);
        if (!d) return [];
        const parsed = JSON.parse(d);
        return Array.isArray(parsed) ? parsed.filter(item => item && Array.isArray(item.coords) && item.coords.length === 2 && item.coords.every(Number.isFinite)) : [];
      } catch (e) {
        console.warn('POINTS 저장 데이터 읽기 실패:', e);
        return [];
      }
    }

    function saveLocalIntel(list) {
      if (!Array.isArray(list)) throw new TypeError('POINTS 데이터는 배열이어야 합니다.');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      updateWpCounter();
      renderAllMarkers();
    }

    const waypointGroupsCollapsed = { REGISTERED:true, UNEXPLORED:true, SECURED:true, USER_PLACED:true };

    function getWaypoints(filter = 'ALL') {
      const list = getLocalIntel().filter(item =>
        item.status === 'UNEXPLORED' || item.status === 'SECURED' || item.source === 'USER_PLACED'
      );
      if (filter === 'ALL') return list;
      return list.filter(item => filter === 'USER_PLACED' ? item.source === 'USER_PLACED' : item.status === filter);
    }

    function getWaypointEntries(filter = waypointFilter) {
      const registered = RECON_TARGETS.map(item => ({ ...item, __kind:'REGISTERED' }));
      const local = getWaypoints('ALL').map(item => ({ ...item }));
      const userItems = local.filter(item => item.source === 'USER_PLACED');
      const fieldItems = local.filter(item => item.source !== 'USER_PLACED');

      if (filter === 'ALL') return {
        REGISTERED: registered,
        UNEXPLORED: fieldItems.filter(item => item.status === 'UNEXPLORED'),
        SECURED: fieldItems.filter(item => item.status === 'SECURED'),
        USER_PLACED: userItems
      };
      if (filter === 'REGISTERED') return { REGISTERED:registered, UNEXPLORED:[], SECURED:[], USER_PLACED:[] };
      if (filter === 'UNEXPLORED') return { REGISTERED:[], UNEXPLORED:local.filter(item => item.status === 'UNEXPLORED'), SECURED:[], USER_PLACED:[] };
      if (filter === 'SECURED') return { REGISTERED:[], UNEXPLORED:[], SECURED:local.filter(item => item.status === 'SECURED'), USER_PLACED:[] };
      if (filter === 'USER_PLACED') return { REGISTERED:[], UNEXPLORED:[], SECURED:[], USER_PLACED:userItems };
      return { REGISTERED:[], UNEXPLORED:[], SECURED:[], USER_PLACED:[] };
    }

    function updateWpCounter() {
      const count = getWaypoints('ALL').length;
      const counter = document.getElementById('btnWpCount');
      if (counter) counter.innerText = count > 0 ? `POINTS (${count})` : 'POINTS';
    }

    function setWaypointFilter(filter, btn) {
      waypointFilter = filter;
      document.querySelectorAll('.wp-filter-btn').forEach(b => b.classList.remove('active'));
      if (btn) btn.classList.add('active');
      if (filter !== 'ALL') waypointGroupsCollapsed[filter] = false;
      renderWpDrawerList();
    }

    function toggleWaypointGroup(group) {
      waypointGroupsCollapsed[group] = !waypointGroupsCollapsed[group];
      renderWpDrawerList();
    }

    function markerTypeFor(item) {
      if (item.status === 'SECURED') return 'SECURED';
      if (item.source === 'USER_PLACED') return 'USER';
      return 'UNEXPLORED';
    }

    function markerSvg(type) {
      const commonOpen = '<rect class="marker-bg" x="4.8" y="4.8" width="14.4" height="14.4" rx="0.2"></rect>';
      if (type === 'REGISTERED') {
        return `<svg class="marker-symbol marker-registered" viewBox="0 0 24 24" aria-hidden="true">
          <polygon class="marker-bg" points="12,4.2 19.8,12 12,19.8 4.2,12"></polygon>
          <polygon class="marker-frame" points="12,4.2 19.8,12 12,19.8 4.2,12"></polygon>
          <circle class="marker-core" cx="12" cy="12" r="1.35"></circle>
        </svg>`;
      }
      if (type === 'SECURED') {
        return `<svg class="marker-symbol marker-secured" viewBox="0 0 24 24" aria-hidden="true">
          <polygon class="marker-bg" points="12,4.2 19.8,12 12,19.8 4.2,12"></polygon>
          <polygon class="marker-frame" points="12,4.2 19.8,12 12,19.8 4.2,12"></polygon>
          <polygon class="marker-core" points="12,9.3 14.7,12 12,14.7 9.3,12"></polygon>
        </svg>`;
      }
      if (type === 'USER') {
        return `<svg class="marker-symbol marker-user" viewBox="0 0 24 24" aria-hidden="true">
          <rect class="marker-bg" x="5.2" y="5.2" width="13.6" height="13.6"></rect>
          <rect class="marker-frame" x="5.2" y="5.2" width="13.6" height="13.6"></rect>
          <circle class="marker-core" cx="12" cy="12" r="1.45"></circle>
        </svg>`;
      }
      return `<svg class="marker-symbol marker-unexplored" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="marker-bg" cx="12" cy="12" r="7.3"></circle>
        <circle class="marker-frame" cx="12" cy="12" r="7.3"></circle>
        <circle class="marker-core" cx="12" cy="12" r="1.05" opacity=".72"></circle>
      </svg>`;
    }

    function makeMarkerIcon(type) {
      return L.divIcon({
        className: 'tactical-pin-wrapper',
        html: markerSvg(type),
        iconSize: [28,28],
        iconAnchor: [14,14]
      });
    }

    function gpsMarkerSvg() {
      return `<svg class="marker-symbol marker-gps" viewBox="0 0 24 24" aria-hidden="true">
        <circle class="marker-bg" cx="12" cy="12" r="7.1"></circle>
        <circle class="marker-frame" cx="12" cy="12" r="7.1"></circle>
        <path class="marker-detail" d="M12 2.8V5 M12 19V21.2 M2.8 12H5 M19 12H21.2"></path>
        <circle class="marker-core" cx="12" cy="12" r="2.05"></circle>
      </svg>`;
    }

    function markerLayerKey(entry) {
      if (entry.source === 'REGISTERED') return 'REGISTERED';
      if (entry.type === 'SECURED') return 'SECURED';
      if (entry.type === 'USER') return 'USER';
      return 'UNEXPLORED';
    }

    function updateRegisteredDistanceCache(force = false) {
      if (!hasGpsFix) return false;
      const now = Date.now();
      const movedKm = lastRadarDistanceOrigin
        ? calcDistanceKmRaw(lastRadarDistanceOrigin[0], lastRadarDistanceOrigin[1], baseLocation[0], baseLocation[1])
        : Infinity;
      if (!force && movedKm < 0.05 && (now - lastRadarDistanceUpdateAt) < 5000) return false;

      registeredDistanceCache.clear();
      RECON_TARGETS.forEach(t => {
        registeredDistanceCache.set(String(t.id), calcDistanceKmRaw(baseLocation[0], baseLocation[1], t.coords[0], t.coords[1]));
      });
      lastRadarDistanceOrigin = [...baseLocation];
      lastRadarDistanceUpdateAt = now;
      return true;
    }

    function markerVisible(entry) {
      if (targetModeActive && targetModeTarget) {
        return String(entry.data?.id ?? '') === String(targetModeTarget.id);
      }
      const layerKey = markerLayerKey(entry);
      if (!markerLayerVisibility[layerKey]) return false;
      // NEARBY는 REGISTERED DB에만 적용. 저장된 POINTS는 거리와 무관하게 유지.
      if (layerKey !== 'REGISTERED') return true;
      if (selectedRadius === 'all' || !hasGpsFix) return true;
      const id = String(entry.data?.id || '');
      const d = registeredDistanceCache.get(id);
      return Number.isFinite(d) ? d <= selectedRadius : true;
    }

    function getOpticColor() {
      return getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#9de3a4';
    }

    function syncRadiusCircleStyle() {
      if (!radiusCircle) return;
      const color = getOpticColor();
      radiusCircle.setStyle({ color, fillColor: color });
    }

    function syncRadiusCirclePosition() {
      const shouldShowRadius = !targetModeActive && selectedRadius !== 'all' && hasGpsFix && markerLayerVisibility.REGISTERED;
      if (!shouldShowRadius) {
        if (radiusCircle && map.hasLayer(radiusCircle)) map.removeLayer(radiusCircle);
        return;
      }
      if (!radiusCircle) {
        radiusCircle = L.circle(baseLocation, {
          renderer: radarRenderer,
          interactive: false,
          radius: selectedRadius * 1000,
          color:getOpticColor(), fillColor:getOpticColor(),
          fillOpacity:0.025, weight:1, dashArray:'3, 6'
        });
      }
      radiusCircle.setLatLng(baseLocation);
      radiusCircle.setRadius(selectedRadius * 1000);
      if (!map.hasLayer(radiusCircle)) radiusCircle.addTo(map);
    }

    function syncMarkerVisibility() {
      markerRegistry.forEach(entry => {
        const visible = markerVisible(entry);
        const shown = markersLayer.hasLayer(entry.marker);
        if (visible !== shown) {
          if (visible) markersLayer.addLayer(entry.marker);
          else markersLayer.removeLayer(entry.marker);
        }
      });
      syncRadiusCirclePosition();
    }

    function syncAllMarkers() {
      const localList = getLocalIntel();
      const wanted = new Set();

      RECON_TARGETS.forEach(t => {
        const key = `REGISTERED:${t.id}`;
        wanted.add(key);
        if (!markerRegistry.has(key)) {
          const marker = L.marker(t.coords, { icon: makeMarkerIcon('REGISTERED'), zIndexOffset: 0 });
          marker.on('click', () => openSitrep(t, 'REGISTERED'));
          markerRegistry.set(key, { marker, coords:t.coords, source:'REGISTERED', data:t });
        }
      });

      localList.forEach(item => {
        const key = `LOCAL:${item.id}`;
        wanted.add(key);
        const type = markerTypeFor(item);
        const existing = markerRegistry.get(key);
        if (!existing) {
          const marker = L.marker(item.coords, { icon: makeMarkerIcon(type), zIndexOffset: 10 });
          marker.on('click', () => {
            const latest = markerRegistry.get(key);
            if (latest?.data) openSitrep(latest.data, latest.data.status || 'UNEXPLORED');
          });
          markerRegistry.set(key, { marker, coords:item.coords, source:'LOCAL', data:item, type });
        } else {
          existing.coords = item.coords;
          existing.data = item;
          if (existing.type !== type) {
            existing.marker.setIcon(makeMarkerIcon(type));
            existing.type = type;
          }
        }
      });

      Array.from(markerRegistry.keys()).forEach(key => {
        if (!wanted.has(key)) {
          const entry = markerRegistry.get(key);
          if (markersLayer.hasLayer(entry.marker)) markersLayer.removeLayer(entry.marker);
          markerRegistry.delete(key);
        }
      });

      syncMarkerVisibility();
    }

    function renderAllMarkers() {
      syncAllMarkers();
    }

    function uniqueAddressParts(parts) {
      const seen = new Set();
      return parts.filter(value => {
        const clean = String(value || '').trim();
        if (!clean || clean === '대한민국' || /^\d{5}$/.test(clean)) return false;
        if (seen.has(clean)) return false;
        seen.add(clean);
        return true;
      }).map(value => String(value).trim());
    }

    function normalizeKoreanAddress(data, fallback) {
      const a = data?.address || {};
      const province = a.state || a.province || a.region;
      const city = a.city || a.municipality;
      const district = a.city_district || a.borough || a.county;
      const locality = a.town || a.village || a.suburb || a.quarter || a.neighbourhood;
      const road = a.road || a.pedestrian || a.residential || a.path;
      const house = a.house_number;
      const building = a.building || a.amenity || a.shop || a.tourism;

      let parts = uniqueAddressParts([province, city, district]);
      if (road) parts = uniqueAddressParts([...parts, road, house]);
      else parts = uniqueAddressParts([...parts, locality, building]);

      if (parts.length >= 2) return parts.join(' ');
      const display = String(data?.display_name || '')
        .split(',')
        .map(v => v.trim())
        .filter(v => v && v !== '대한민국' && !/^\d{5}$/.test(v));
      return display.length ? display.reverse().join(' ') : fallback;
    }

    /* POINT INFO 패널 제어 */
    function updateActiveTargetNavigation() {
      const distEl = document.getElementById('sitrepDist');
      const brgEl = document.getElementById('sitrepBrg');
      const hudEl = document.getElementById('hudBearing');
      const hudLabel = document.getElementById('hudPrimaryLabel');
      const ref = getReferencePosition();
      const refShort = ref?.type === 'LAST_FIX' ? 'LAST' : (ref?.type === 'TEMP' ? 'TEMP' : (ref?.type === 'GPS' ? 'GPS' : (ref?.type || 'NONE')));
      if (!currentActiveTarget || !ref?.coords) {
        if (distEl) distEl.innerText = 'DIST: --';
        if (brgEl) brgEl.innerText = 'BRG: ---° --';
        if (hudLabel) hudLabel.innerText = 'REF';
        if (hudEl) hudEl.innerText = refShort;
        return;
      }
      const dist = calcDistanceKm(ref.coords[0], ref.coords[1], currentActiveTarget.coords[0], currentActiveTarget.coords[1]);
      const brg = calcBearing(ref.coords[0], ref.coords[1], currentActiveTarget.coords[0], currentActiveTarget.coords[1]);
      if (distEl) distEl.innerText = `DIST: ${dist} KM · ${referenceLabel(ref.type)}`;
      if (brgEl) brgEl.innerText = `BRG: ${brg}`;
      if (hudLabel) hudLabel.innerText = 'BRG';
      if (hudEl) hudEl.innerText = brg;
    }

    function cleanLegacyIntelText(value) {
      const raw = String(value ?? '');
      const withoutTags = raw.replace(/<[^>]*>/g, ' ');
      return withoutTags
        .replace(/\s+/g, ' ')
        .replace(/^\s*\[(?:개척지 보고|인텔 브리핑)\]\s*/i, '')
        .trim();
    }

    function renderSitrepIntel(target) {
      const el = document.getElementById('sitrepDesc');
      if (!el) return;
      el.textContent = '';
      const label = document.createElement('strong');
      label.textContent = target.status === 'SECURED' ? '[개척지 보고]' : '[인텔 브리핑]';
      el.appendChild(label);
      el.appendChild(document.createTextNode(` ${cleanLegacyIntelText(target.desc) || '현장 정보 없음'}`));
      if (target.tips) {
        el.appendChild(document.createElement('br'));
        const tip = document.createElement('span');
        tip.style.color = 'var(--text-dim)';
        tip.style.fontSize = '10px';
        tip.textContent = `⚠️ ${String(target.tips)}`;
        el.appendChild(tip);
      }
    }

    function openSitrep(target, statusType) {
      sitrepAddressToken++;
      currentActiveTarget = target;

      const panel = document.getElementById('sitrepPanel');
      const mgrs = calcMGRS(target.coords[0], target.coords[1]);
      const latLon = `${target.coords[0].toFixed(5)}, ${target.coords[1].toFixed(5)}`;

      document.getElementById('sitrepCode').innerText = `SEC-KOR // ${target.opCode}`;
      document.getElementById('sitrepName').innerText = target.name;
      document.getElementById('sitrepMgrs').innerText = mgrs;
      document.getElementById('sitrepLatLon').innerText = latLon;
      document.querySelectorAll('.coord-copy-feedback').forEach(el => { el.textContent = ''; });
      renderSitrepIntel(target);
      updateActiveTargetNavigation();

      const statusBadge = document.getElementById('sitrepStatus');
      const btnPromote = document.getElementById('btnPromote');
      const btnTargetSet = document.getElementById('btnTargetSet');

      statusBadge.style.color = 'var(--accent)';
      statusBadge.style.borderColor = 'var(--accent)';
      if (statusType === 'UNEXPLORED') {
        statusBadge.innerText = 'UNEXPLORED';
        statusBadge.dataset.status = 'UNEXPLORED';
        btnPromote.style.display = 'flex';
        if (btnTargetSet) btnTargetSet.style.display = 'flex';
      } else if (statusType === 'SECURED') {
        statusBadge.innerText = 'SECURED';
        statusBadge.dataset.status = 'SECURED';
        btnPromote.style.display = 'none';
        if (btnTargetSet) btnTargetSet.style.display = 'flex';
      } else {
        statusBadge.innerText = 'REGISTERED';
        statusBadge.dataset.status = 'REGISTERED';
        btnPromote.style.display = 'none';
        if (btnTargetSet) btnTargetSet.style.display = 'flex';
      }

      const addressValue = document.getElementById('sitrepAddressValue');
      const addressCopy = document.getElementById('sitrepAddressCopy');
      addressCopy.innerText = 'COPY';
      if (target.address) {
        addressValue.innerText = target.address;
        addressValue.dataset.copyValue = target.address;
      } else {
        addressValue.innerText = '주소 조회 중...';
        delete addressValue.dataset.copyValue;
        resolveSitrepAddress(target.coords[0], target.coords[1]);
      }

      panel.style.display = 'flex';
      map.setView(target.coords, 14, { animate:false });
      refreshMapSize();
    }

    let sitrepAddressToken = 0;

    async function resolveSitrepAddress(lat, lon) {
      const token = ++sitrepAddressToken;
      const target = currentActiveTarget;
      const isCurrent = () => token === sitrepAddressToken && currentActiveTarget === target && target?.coords?.[0] === lat && target?.coords?.[1] === lon;
      const valueEl = document.getElementById('sitrepAddressValue');
      if (!valueEl) return;
      const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=ko`, {
          headers: { 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error('geocoding failed');
        const data = await res.json();
        const address = normalizeKoreanAddress(data, fallback);
        if (!isCurrent()) return;
        valueEl.innerText = address;
        valueEl.dataset.copyValue = address;
      } catch (e) {
        if (!isCurrent()) return;
        valueEl.innerText = fallback;
        valueEl.dataset.copyValue = fallback;
      }
    }

    async function copySitrepAddress(btn) {
      const valueEl = document.getElementById('sitrepAddressValue');
      const copyEl = document.getElementById('sitrepAddressCopy');
      if (!valueEl) return;
      const value = valueEl.dataset.copyValue || valueEl.innerText;
      if (!value || value === '주소 조회 중...') return;
      const copied = await writeClipboardText(value);
      if (!copied) return;
      if (copyEl) {
        copyEl.innerText = 'COPIED';
        setTimeout(() => { if (copyEl) copyEl.innerText = 'COPY'; }, 1200);
      }
    }

    async function copyPointCoordinate(id) {
      const target = currentActiveTarget;
      const valueEl = document.getElementById(id);
      const text = valueEl?.textContent;
      if (!target || !text || text === '--' || text.includes('UNAVAILABLE')) return;
      if (!await writeClipboardText(text) || currentActiveTarget !== target) return;
      const feedback = valueEl.parentElement.querySelector('.coord-copy-feedback');
      feedback.textContent = 'COPIED';
      clearTimeout(feedback.copyTimer);
      feedback.copyTimer = setTimeout(() => { feedback.textContent = ''; }, 1000);
    }

    function closeSitrep() {
      sitrepAddressToken++;
      document.getElementById('sitrepPanel').style.display = 'none';
      const addressValue = document.getElementById('sitrepAddressValue');
      const addressCopy = document.getElementById('sitrepAddressCopy');
      if (addressValue) { addressValue.innerText = '주소 조회 중...'; delete addressValue.dataset.copyValue; }
      if (addressCopy) addressCopy.innerText = 'COPY';
      currentActiveTarget = null;
      updateActiveTargetNavigation();
    }

    let pointPlacementAddressToken = 0;

    function openPointPlacement() {
      closeFieldControls();
      closeWpDrawer();
      const center = map.getCenter();
      document.getElementById('pointMgrsReadout').innerText = calcMGRS(center.lat, center.lng);
      document.getElementById('pointLatLonReadout').innerText = `${center.lat.toFixed(5)}, ${center.lng.toFixed(5)}`;
      document.getElementById('pointAddressReadout').innerText = '조회 중...';
      document.getElementById('pointNameInput').value = '';
      document.getElementById('pointMemoInput').value = '';
      document.getElementById('pointPlacementBackdrop').style.display = 'flex';
      resolvePointPlacementAddress(center.lat, center.lng);
      setTimeout(() => document.getElementById('pointNameInput').focus(), 80);
    }

    function closePointPlacement() {
      pointPlacementAddressToken++;
      document.getElementById('pointPlacementBackdrop').style.display = 'none';
    }

    async function resolvePointPlacementAddress(lat, lon) {
      const token = ++pointPlacementAddressToken;
      const el = document.getElementById('pointAddressReadout');
      const fallback = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=18&addressdetails=1&accept-language=ko`, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error('geocoding failed');
        const data = await res.json();
        if (token === pointPlacementAddressToken) el.innerText = normalizeKoreanAddress(data, fallback);
      } catch (e) {
        if (token === pointPlacementAddressToken) el.innerText = fallback;
      }
    }

    function savePointPlacement() {
      const center = map.getCenter();
      const name = document.getElementById('pointNameInput').value.trim();
      const memo = document.getElementById('pointMemoInput').value.trim();
      if (!name) {
        alert('거점 명칭을 입력하십시오.');
        document.getElementById('pointNameInput').focus();
        return;
      }
      const now = Date.now();
      const point = {
        id: `WP-${now}`,
        opCode: `OP-USER-${String(now).slice(-6)}`,
        name,
        coords: [center.lat, center.lng],
        desc: memo || '사용자가 지도 중앙 조준점에서 직접 지정한 정찰 거점.',
        tips: '',
        status: 'UNEXPLORED',
        createdAt: new Date(now).toISOString(),
        source: 'USER_PLACED',
        address: document.getElementById('pointAddressReadout')?.innerText || ''
      };
      try {
        const list = getLocalIntel();
        list.unshift(point);
        saveLocalIntel(list);
        closePointPlacement();
        openSitrep(point, 'UNEXPLORED');
      } catch (e) {
        alert('거점 저장에 실패했습니다. 브라우저 저장 공간을 확인하십시오.');
      }
    }

    let addressSearchToken = 0;

    function openAddressSearch() {
      addressSearchToken++;
      document.getElementById('addressSearchButton').disabled = false;
      closeFieldControls();
      closeWpDrawer();
      selectedAddressResult = null;
      const backdrop = document.getElementById('addressSearchBackdrop');
      const input = document.getElementById('addressSearchInput');
      const results = document.getElementById('addressSearchResults');
      if (results) results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
      setAddressSearchActionsEnabled(false);
      backdrop.style.display = 'flex';
      setTimeout(() => input?.focus(), 80);
    }

    function closeAddressSearch() {
      addressSearchToken++;
      document.getElementById('addressSearchBackdrop').style.display = 'none';
      selectedAddressResult = null;
    }

    function setAddressSearchActionsEnabled(enabled) {
      const moveBtn = document.getElementById('addressMoveButton');
      const saveBtn = document.getElementById('addressSaveButton');
      const tempBtn = document.getElementById('addressTempButton');
      if (moveBtn) moveBtn.disabled = !enabled;
      if (saveBtn) saveBtn.disabled = !enabled;
      if (tempBtn) tempBtn.disabled = !enabled;
    }

    function selectAddressResult(result, button) {
      selectedAddressResult = result;
      document.querySelectorAll('.address-search-item').forEach(el => el.classList.remove('selected'));
      if (button) button.classList.add('selected');
      setAddressSearchActionsEnabled(true);
    }

    async function searchKoreanAddress() {
      const input = document.getElementById('addressSearchInput');
      const resultsEl = document.getElementById('addressSearchResults');
      const button = document.getElementById('addressSearchButton');
      const query = input?.value.trim();
      if (!query) { input?.focus(); return; }
      const token = ++addressSearchToken;
      selectedAddressResult = null;
      setAddressSearchActionsEnabled(false);
      resultsEl.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
      if (button) button.disabled = true;
      try {
        const direct = parseDirectRouteLocation(query);
        if (direct) {
          const result = { lat:direct.lat, lon:direct.lon, name:`${direct.source} POSITION`, address:'', source:direct.source };
          resultsEl.innerHTML = '';
          const item = document.createElement('button');
          item.type='button'; item.className='address-search-item selected';
          const name=document.createElement('span'); name.className='address-search-name'; name.textContent=`${direct.source} COORDINATE`;
          const coords=document.createElement('span'); coords.className='address-search-coords'; coords.textContent=`${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}`;
          item.append(name,coords); item.onclick=()=>selectAddressResult(result,item); resultsEl.appendChild(item);
          selectAddressResult(result,item);
          return;
        }
        if (!navigator.onLine) {
          resultsEl.innerHTML = '<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS 좌표를 입력하십시오.</div>';
          return;
        }
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers:{ 'Accept':'application/json' } });
        if (!res.ok) throw new Error('address search failed');
        const data = await res.json();
        if (token !== addressSearchToken) return;
        resultsEl.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
          resultsEl.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
          return;
        }
        data.forEach(row => {
          const lat = Number(row.lat), lon = Number(row.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const normalized = normalizeKoreanAddress(row, row.display_name || query);
          const result = { lat, lon, name: normalized || query, address: normalized || row.display_name || query, raw: row, source:'ADDRESS' };
          const item = document.createElement('button'); item.type='button'; item.className='address-search-item';
          const name = document.createElement('span'); name.className='address-search-name'; name.textContent=result.address;
          const coords = document.createElement('span'); coords.className='address-search-coords'; coords.textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat, lon)}`;
          item.append(name, coords); item.onclick=()=>selectAddressResult(result,item); resultsEl.appendChild(item);
        });
      } catch (e) {
        if (token !== addressSearchToken) return;
        console.warn('위치 검색 실패:', e);
        resultsEl.innerHTML = '<div class="address-search-empty">검색에 실패했습니다. 주소는 네트워크가 필요하며 좌표/MGRS는 오프라인에서도 사용할 수 있습니다.</div>';
      } finally { if (button && token === addressSearchToken) button.disabled = false; }
    }

    function moveToSelectedAddress() {
      if (!selectedAddressResult) return;
      const result = { ...selectedAddressResult };
      closeAddressSearch();
      map.setView([result.lat, result.lon], Math.max(map.getZoom(), 16), { animate:false });
      flushReticleTelemetry();
    }

    function saveSelectedAddressAsWaypoint() {
      if (!selectedAddressResult) return;
      const r = selectedAddressResult;
      const now = Date.now();
      const point = {
        id:`WP-${now}`,
        opCode:`OP-USER-${String(now).slice(-6)}`,
        name:r.name || '주소 지정 거점',
        coords:[r.lat, r.lon],
        address:r.address || '',
        desc:`주소 검색으로 지정한 거점. ${r.address || ''}`.trim(),
        tips:'',
        status:'UNEXPLORED',
        createdAt:new Date(now).toISOString(),
        source:'USER_PLACED'
      };
      try {
        const list = getLocalIntel();
        list.unshift(point);
        saveLocalIntel(list);
        closeAddressSearch();
        openSitrep(point, 'UNEXPLORED');
      } catch (e) {
        alert('거점 저장에 실패했습니다. 브라우저 저장 공간을 확인하십시오.');
      }
    }

    function deployRegisteredRecon() {
      if (selectedRadius !== 'all' && !hasGpsFix) {
        alert('거리 기반 거점 탐색은 GPS FIX 이후 사용할 수 있습니다.');
        return;
      }
      if (selectedRadius !== 'all') updateRegisteredDistanceCache(true);
      const pool = RECON_TARGETS.filter(t => {
        if (selectedRadius === 'all') return true;
        const d = registeredDistanceCache.get(String(t.id));
        return Number.isFinite(d) && d <= selectedRadius;
      });

      if (pool.length === 0) {
        alert("선택된 반경 내 등록된 거점이 없습니다.");
        return;
      }
      const pick = pool[Math.floor(Math.random() * pool.length)];
      openSitrep(pick, 'REGISTERED');
    }

    function deployWildRecon() {
      if (selectedRadius !== 'all' && !hasGpsFix) {
        alert('거리 기반 미개척 정찰은 GPS FIX 이후 사용할 수 있습니다.');
        return;
      }
      let lat, lon;
      if (selectedRadius !== 'all') {
        const maxDist = selectedRadius;
        const r = (Math.random() * 0.75 + 0.25) * (maxDist / 111);
        const theta = Math.random() * 2 * Math.PI;
        lat = baseLocation[0] + r * Math.cos(theta);
        lon = baseLocation[1] + (r * Math.sin(theta)) / Math.cos(baseLocation[0] * Math.PI / 180);
      } else {
        const mountainZones = [
          { minLat: 37.6, maxLat: 38.2, minLon: 127.3, maxLon: 128.6 },
          { minLat: 36.8, maxLat: 37.4, minLon: 128.0, maxLon: 128.9 },
          { minLat: 35.3, maxLat: 36.0, minLon: 127.4, maxLon: 128.4 }
        ];
        const z = mountainZones[Math.floor(Math.random() * mountainZones.length)];
        lat = z.minLat + Math.random() * (z.maxLat - z.minLat);
        lon = z.minLon + Math.random() * (z.maxLon - z.minLon);
      }

      const secNum = Math.floor(1000 + Math.random() * 9000);
      const wildSpot = {
        id: `WILD-${Date.now()}`,
        opCode: `WILD-SEC-${secNum}`,
        name: `미개척 구릉 탐색지 [SEC-${secNum}]`,
        cat: "미개척지",
        coords: [lat, lon],
        desc: "미상의 내륙 산악 구릉 지점. 지형 등고선 및 위성 영상을 분석해 미지의 안부 고갯길 또는 계곡 합수부를 직접 정찰하십시오.",
        tips: "비포장 오지. 일몰 전 퇴출로 확보 필수.",
        status: "UNEXPLORED",
        savedAt: new Date().toISOString().substring(0, 16).replace('T', ' ')
      };

      try {
        const list = getLocalIntel();
        list.unshift(wildSpot);
        saveLocalIntel(list);
      } catch (e) {
        console.warn('미개척 거점 저장 실패:', e);
        alert('미개척 거점 저장에 실패했습니다. 브라우저 저장 공간을 확인하십시오.');
        return;
      }
      openSitrep(wildSpot, 'UNEXPLORED');
      closeFieldControls();
    }

    function validCoordinates(coords) {
      return Array.isArray(coords) && coords.length >= 2 &&
        typeof coords[0] === 'number' && typeof coords[1] === 'number' &&
        Number.isFinite(coords[0]) && Number.isFinite(coords[1]) &&
        Math.abs(coords[0]) <= 90 && Math.abs(coords[1]) <= 180;
    }

    function cloneRouteSegments(value) {
      if (!Array.isArray(value)) return [];
      return value.map(segment => Array.isArray(segment)
        ? segment.filter(validCoordinates).map(pt => [pt[0], pt[1]])
        : []
      ).filter(segment => segment.length >= 2);
    }

    function cloneRouteViaPoints(value) {
      if (!Array.isArray(value)) return [];
      return value.slice(0, 100).map((item, index) => {
        const lat = Number(item?.coords?.[0]), lon = Number(item?.coords?.[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
        return {
          id:String(item?.id || `VIA-${index+1}`),
          name:String(item?.name || `VIA ${index+1}`).slice(0,60),
          coords:[lat,lon],
          address:String(item?.address || '').slice(0,500),
          source:String(item?.source || 'ROUTE')
        };
      }).filter(Boolean);
    }

    function isRegisteredTarget(target) {
      if (!target?.id) return false;
      const localExists = getLocalIntel().some(item => String(item.id) === String(target.id));
      if (localExists) return false;
      return RECON_TARGETS.some(item => String(item.id) === String(target.id));
    }

    function getRegisteredRoutePlans() {
      try {
        const raw = localStorage.getItem(ROUTE_PLAN_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      } catch (e) {
        console.warn('REGISTERED ROUTE 저장소 읽기 실패:', e);
        return {};
      }
    }

    function saveRegisteredRoutePlan(target, routePlan) {
      const plans = getRegisteredRoutePlans();
      plans[String(target.id)] = routePlan;
      localStorage.setItem(ROUTE_PLAN_STORAGE_KEY, JSON.stringify(plans));
    }

    function getTargetRoutePlan(target) {
      if (!target) return null;
      if (isRegisteredTarget(target)) return getRegisteredRoutePlans()[String(target.id)] || null;
      return target.routePlan || null;
    }

    function routeLengthKm(segments = routeDraftSegments) {
      let total = 0;
      segments.forEach(segment => {
        for (let i = 1; i < segment.length; i++) {
          total += calcDistanceKmRaw(segment[i-1][0], segment[i-1][1], segment[i][0], segment[i][1]);
        }
      });
      return total;
    }

    function angleDifference(a, b) {
      return Math.abs((((a - b) + 540) % 360) - 180);
    }

    function stopTrackUpRotation(resetNorth = true) {
      if (!ROTATION_AVAILABLE) return;
      try {
        if (typeof map.setHeading === 'function') map.setHeading(null);
        if (typeof map.stopHeadingUp === 'function') map.stopHeadingUp();
        if (resetNorth && typeof map.setBearing === 'function') map.setBearing(0);
      } catch (e) { console.warn('TRACK UP reset failed:', e); }
    }

    function resumeTrackUpRotation() {
      if (!ROTATION_AVAILABLE || !targetModeActive || targetModePhase !== 'NAV' || navMapOrientation !== 'TRACK' || !gpsFollowEnabled) return;
      if (!Number.isFinite(lastTrackHeading) || typeof map.setHeading !== 'function') return;
      try { map.setHeading(lastTrackHeading, { ease:0.72, deadzone:0.25 }); } catch (e) {}
    }

    function setNavMapOrientation(mode) {
      navMapOrientation = mode === 'TRACK' ? 'TRACK' : 'NORTH';
      if (navMapOrientation === 'NORTH') stopTrackUpRotation(true);
      else resumeTrackUpRotation();
      updateTargetModePanel();
    }

    function toggleNavMapOrientation() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      if (!ROTATION_AVAILABLE) {
        alert('TRACK UP 회전 모듈을 불러오지 못했습니다. 앱은 NORTH UP으로 계속 사용할 수 있습니다.');
        return;
      }
      setNavMapOrientation(navMapOrientation === 'TRACK' ? 'NORTH' : 'TRACK');
    }

    function updateTrackUpFromGps(pos) {
      latestGpsPosition = pos || latestGpsPosition;
      if (!pos || !ROTATION_AVAILABLE || !targetModeActive || targetModePhase !== 'NAV' || navMapOrientation !== 'TRACK' || !gpsFollowEnabled) return;
      if (typeof map.setHeading !== 'function') return;
      const now = Number(pos.timestamp) || Date.now();
      const lat = Number(pos.coords?.latitude);
      const lon = Number(pos.coords?.longitude);
      const accuracy = Number(pos.coords?.accuracy);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (Number.isFinite(accuracy) && accuracy > TRACK_MAX_ACCURACY_M) {
        lastTrackSample = { lat, lon, time:now };
        return;
      }

      let speed = Number(pos.coords?.speed);
      let heading = Number(pos.coords?.heading);
      if (!Number.isFinite(speed) || speed < 0) speed = null;
      if (!Number.isFinite(heading) || heading < 0) heading = null;

      if (lastTrackSample) {
        const dt = Math.max(0.001, (now - lastTrackSample.time) / 1000);
        const movedM = calcDistanceKmRaw(lastTrackSample.lat, lastTrackSample.lon, lat, lon) * 1000;
        const derivedSpeed = movedM / dt;
        if (speed === null) speed = derivedSpeed;
        if (heading === null && movedM >= 3 && dt <= 15) heading = calcBearingDegrees(lastTrackSample.lat, lastTrackSample.lon, lat, lon);
      }
      lastTrackSample = { lat, lon, time:now };

      if (!Number.isFinite(speed) || speed < TRACK_MIN_SPEED_MPS || !Number.isFinite(heading)) return;
      heading = ((heading % 360) + 360) % 360;
      if (Number.isFinite(lastTrackHeading) && angleDifference(heading, lastTrackHeading) < TRACK_HEADING_DEADZONE_DEG) return;
      if (now - lastTrackHeadingAt < TRACK_HEADING_MIN_INTERVAL_MS) return;

      if (Number.isFinite(lastTrackHeading)) {
        const delta = ((((heading - lastTrackHeading) + 540) % 360) - 180);
        heading = (lastTrackHeading + delta * 0.72 + 360) % 360;
      }
      lastTrackHeading = heading;
      lastTrackHeadingAt = now;
      try { map.setHeading(heading, { ease:0.72, deadzone:0.25 }); } catch (e) {}
      updateTargetModePanel();
    }

    function toggleNavPanelCollapse(event) {
      if (event) { event.preventDefault(); event.stopPropagation(); }
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      navPanelCollapsed = !navPanelCollapsed;
      updateTargetModePanel();
      updateMapScale();
    }

    function formatNavDistance(km) {
      const value = Number(km);
      if (!Number.isFinite(value)) return { value:'--.-', unit:'KM' };
      if (value < 1) return { value:String(Math.max(0, Math.round(value * 100) * 10)), unit:'M' };
      return { value:value.toFixed(value >= 100 ? 0 : 1), unit:'KM' };
    }

    function updateTargetModePanel() {
      const panel = document.getElementById('targetModePanel');
      const kicker = document.querySelector('.target-mode-kicker');
      const name = document.getElementById('targetModeName');
      const stats = document.getElementById('targetModeStats');
      const draw = document.getElementById('targetDrawBtn');
      const myPos = document.getElementById('targetMyPosBtn');
      const save = document.getElementById('targetSaveBtn');
      const navStart = document.getElementById('targetNavStartBtn');
      const recenter = document.getElementById('targetRecenterBtn');
      const orient = document.getElementById('targetOrientationBtn');
      const trackBtn = document.getElementById('targetTrackRecBtn');
      const collapseBtn = document.getElementById('targetPanelCollapseBtn');
      const drawKindBtn = document.getElementById('targetDrawKindBtn');
      const nextLegBtn = document.getElementById('targetNextLegBtn');
      const backtrackBtn = document.getElementById('targetBacktrackBtn');
      const isNav = targetModeActive && targetModePhase === 'NAV';

      if (panel) panel.classList.toggle('active', targetModeActive);
      if (kicker) kicker.innerText = 'TARGET MODE // ROUTE PLAN';
      if (name) name.innerText = targetModeTarget?.name || 'NO TARGET';
      if (stats) stats.innerHTML = `ROUTE ${routeLengthKm().toFixed(1)} KM<br>${routeDraftSegments.length} SEG · ${routeViaPoints.length} VIA · ${routeMarkSegments.length} OVERLAY`;

      const navTarget = document.getElementById('navHudTarget');
      const navOrient = document.getElementById('navHudOrient');
      const navDistance = document.getElementById('navHudDistance');
      const navUnit = document.getElementById('navHudUnit');
      const navBearing = document.getElementById('navHudBearing');
      const navGps = document.getElementById('navHudGps');
      const navTrack = document.getElementById('navHudTrack');

      const navDest = getCurrentNavDestination();
      const navRef = getReferencePosition();
      if (navTarget) navTarget.innerText = navDest?.name || targetModeTarget?.name || 'NO TARGET';
      if (navOrient) navOrient.innerText = !ROTATION_AVAILABLE
        ? 'NORTH UP'
        : (navMapOrientation === 'TRACK' ? (gpsFollowEnabled ? 'TRACK UP' : 'TRACK PAUSED') : 'NORTH UP');

      if (isNav && navDest && navRef?.coords) {
        const dRaw = calcDistanceKmRaw(navRef.coords[0], navRef.coords[1], navDest.coords[0], navDest.coords[1]);
        const fd = formatNavDistance(dRaw);
        if (navDistance) navDistance.innerText = fd.value;
        if (navUnit) navUnit.innerText = fd.unit;
        if (navBearing) navBearing.innerText = `BRG ${calcBearing(navRef.coords[0], navRef.coords[1], navDest.coords[0], navDest.coords[1])}`;
      } else {
        if (navDistance) navDistance.innerText = '--.-';
        if (navUnit) navUnit.innerText = 'KM';
        if (navBearing) navBearing.innerText = 'BRG ---°';
      }

      const navLeg = document.getElementById('navHudLeg');
      const navElapsed = document.getElementById('navHudElapsed');
      const navRefEl = document.getElementById('navHudRef');
      const navDistanceLabel = document.getElementById('navHudDistanceLabel');
      if (navLeg) navLeg.innerText = backtrackActive ? 'BACKTRACK · REVERSE TRACK' : (navLegIndex === 0 ? 'LEG 1 · TARGET' : 'LEG 2 · END');
      if (navDistanceLabel) navDistanceLabel.innerText = backtrackActive ? 'DIRECT TO TRACK POINT' : (navLegIndex === 0 ? 'DIRECT TO TARGET' : 'DIRECT TO END');
      if (navElapsed) { const now=Date.now(); navElapsed.innerText = `TOTAL ${formatElapsed(navStartedAt ? now-navStartedAt : 0)} · LEG ${formatElapsed(navLegStartedAt ? now-navLegStartedAt : 0)}`; }
      if (navRefEl) navRefEl.innerText = `REF ${referenceLabel(navRef?.type)}`;
      if (navGps) navGps.innerText = gpsPowerEnabled ? `GPS ${gpsLockState}${gpsFollowEnabled ? ' · FOLLOW' : ''}` : 'GPS OFF';
      if (navTrack) {
        const dist = trackLogDistanceKm();
        navTrack.classList.toggle('track-recording', trackRecording || pendingTrackStart);
        navTrack.innerText = pendingTrackStart
          ? 'TRACK ACQUIRING'
          : (trackRecording
              ? `TRACK REC · ${dist.toFixed(1)} KM`
              : (trackLogPoints.length >= 2 ? `TRACK SAVED · ${dist.toFixed(1)} KM` : 'TRACK OFF'));
      }

      if (draw) {
        draw.classList.toggle('active', routeDrawEnabled);
        draw.innerText = routeDrawEnabled ? 'DRAW ON' : 'DRAW';
        draw.title = routeDrawEnabled ? '1 finger: draw / 2 fingers: pan & zoom' : 'ROUTE DRAW';
      }
      if (myPos) {
        myPos.classList.toggle('active', targetModeShowGps);
        myPos.innerText = targetModeShowGps ? 'MY POS ON' : 'MY POS';
      }
      if (save) save.classList.toggle('route-save-dirty', routeDirty);
      if (navStart) navStart.disabled = pendingNavStart;
      if (recenter) {
        recenter.classList.remove('active');
        recenter.innerText = 'RECENTER';
      }
      if (orient) {
        orient.style.display = ROTATION_AVAILABLE ? '' : 'none';
        const paused = navMapOrientation === 'TRACK' && !gpsFollowEnabled;
        orient.classList.toggle('active', navMapOrientation === 'TRACK' && gpsFollowEnabled);
        orient.innerText = navMapOrientation === 'TRACK' ? (paused ? 'TRACK PAUSED' : 'TRACK UP') : 'NORTH UP';
      }
      if (trackBtn) {
        trackBtn.classList.toggle('active', trackRecording || pendingTrackStart);
        trackBtn.innerText = pendingTrackStart ? 'TRACK WAIT' : (trackRecording ? 'TRACK STOP' : 'TRACK REC');
      }
      if (collapseBtn) collapseBtn.innerText = navPanelCollapsed ? 'SHOW' : 'HIDE';
      if (drawKindBtn) {
        drawKindBtn.innerText = routeDrawKind === 'MARK' ? 'OVERLAY · SOLID' : 'ROUTE · DASH';
        drawKindBtn.classList.toggle('active', routeDrawKind === 'MARK');
      }
      if (nextLegBtn) nextLegBtn.disabled = !routeEndPoint || navLegIndex >= 1 || backtrackActive;
      if (backtrackBtn) backtrackBtn.classList.toggle('active', backtrackActive);

      document.body.classList.toggle('target-mode', targetModeActive);
      document.body.classList.toggle('target-nav', isNav);
      document.body.classList.toggle('nav-panel-collapsed', isNav && navPanelCollapsed);
      document.body.classList.toggle('route-drawing', targetModeActive && routeDrawEnabled);
      document.body.classList.toggle('route-marking', targetModeActive && routeDrawEnabled && routeDrawKind === 'MARK');
      document.body.classList.toggle('track-recording', isNav && (trackRecording || pendingTrackStart));
    }

    function routeStyle() {
      return { renderer:routeRenderer, interactive:false, color:getOpticColor(), weight:2, opacity:0.82, dashArray:'7,6', lineCap:'square', lineJoin:'miter' };
    }

    function routeMarkStyle() {
      return { renderer:routeRenderer, interactive:false, color:getOpticColor(), weight:2.2, opacity:0.92, lineCap:'round', lineJoin:'round' };
    }

    function trackStyle() {
      return { renderer:routeRenderer, interactive:false, color:getOpticColor(), weight:3, opacity:0.98, lineCap:'round', lineJoin:'round' };
    }

    function getTrackLogs() {
      try {
        const raw = localStorage.getItem(TRACK_LOG_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.warn('TRACK LOG 저장소 읽기 실패:', e);
        return [];
      }
    }

    function trackLogDistanceKm(points = trackLogPoints) {
      let total = 0;
      for (let i = 1; i < points.length; i++) {
        total += calcDistanceKmRaw(points[i-1][0], points[i-1][1], points[i][0], points[i][1]);
      }
      return total;
    }

    function renderActiveTrack() {
      if (!trackLiveLayer) return;
      trackLiveLayer.clearLayers();
      trackLivePolyline = null;
      if (trackLogPoints.length < 2) return;
      trackLivePolyline = L.polyline(trackLogPoints.map(p => [p[0], p[1]]), trackStyle()).addTo(trackLiveLayer);
    }

    function clearActiveTrack() {
      trackLogPoints = [];
      trackLastAccepted = null;
      trackStartedAt = null;
      if (trackLiveLayer) trackLiveLayer.clearLayers();
      trackLivePolyline = null;
    }

    function persistTrackLog() {
      if (!targetModeTarget || trackLogPoints.length < 2) return false;
      const endedAt = new Date().toISOString();
      const log = {
        id:`TRACK-${Date.now()}`,
        targetId:String(targetModeTarget.id || ''),
        targetName:String(targetModeTarget.name || 'TARGET').slice(0,120),
        targetStatus:String(targetModeTarget.status || targetModeTarget.statusType || 'REGISTERED').slice(0,40),
        startedAt:trackStartedAt || endedAt,
        endedAt,
        distanceKm:Number(trackLogDistanceKm(trackLogPoints).toFixed(3)),
        points:trackLogPoints.slice(0,12000).map(p => [Number(p[0]), Number(p[1]), Number(p[2]) || 0])
      };
      try {
        const logs = getTrackLogs();
        logs.unshift(log);
        localStorage.setItem(TRACK_LOG_STORAGE_KEY, JSON.stringify(logs.slice(0,60)));
        return true;
      } catch (e) {
        console.warn('TRACK LOG 저장 실패:', e);
        return false;
      }
    }

    function startTrackRecording() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      if (!hasGpsFix || !latestGpsPosition) {
        pendingTrackStart = true;
        gpsLockState = 'ACQUIRING';
        updateGpsTelemetry();
        updateTargetModePanel();
        locateUser();
        return;
      }
      pendingTrackStart = false;
      clearActiveTrack();
      trackRecording = true;
      trackStartedAt = new Date().toISOString();
      const pos = latestGpsPosition;
      const lat = Number(pos.coords?.latitude), lon = Number(pos.coords?.longitude);
      const ts = Number(pos.timestamp) || Date.now();
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        trackLogPoints.push([lat, lon, ts]);
        trackLastAccepted = { lat, lon, time:ts };
      }
      document.body.classList.add('track-recording');
      renderActiveTrack();
      updateTargetModePanel();
    }

    function stopTrackRecording(save = true, silent = false) {
      if (!trackRecording && !pendingTrackStart) return;
      pendingTrackStart = false;
      const wasRecording = trackRecording;
      trackRecording = false;
      document.body.classList.remove('track-recording');
      let saved = false;
      if (wasRecording && save && trackLogPoints.length >= 2) saved = persistTrackLog();
      if (save && wasRecording && trackLogPoints.length >= 2 && !saved && !silent) {
        alert('TRACK LOG 저장에 실패했습니다. 현재 선은 화면에 유지됩니다.');
      }
      updateTargetModePanel();
    }

    function toggleTrackRecording() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      if (trackRecording || pendingTrackStart) stopTrackRecording(true, false);
      else startTrackRecording();
    }

    function recordTrackPoint(pos) {
      if (!trackRecording || !targetModeActive || targetModePhase !== 'NAV' || !pos?.coords) return;
      const lat = Number(pos.coords.latitude), lon = Number(pos.coords.longitude);
      const accuracy = Number(pos.coords.accuracy);
      const ts = Number(pos.timestamp) || Date.now();
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
      if (Number.isFinite(accuracy) && accuracy > 65) return;
      if (!trackLastAccepted) {
        trackLogPoints.push([lat, lon, ts]);
        trackLastAccepted = { lat, lon, time:ts };
        renderActiveTrack();
        return;
      }
      const movedM = calcDistanceKmRaw(trackLastAccepted.lat, trackLastAccepted.lon, lat, lon) * 1000;
      const dt = ts - trackLastAccepted.time;
      const accept = (movedM >= TRACK_LOG_MIN_DISTANCE_M && dt >= TRACK_LOG_MIN_INTERVAL_MS) ||
                     (movedM >= 3 && dt >= TRACK_LOG_FORCE_INTERVAL_MS);
      if (!accept) return;
      trackLogPoints.push([lat, lon, ts]);
      trackLastAccepted = { lat, lon, time:ts };
      if (!trackLivePolyline) renderActiveTrack();
      else trackLivePolyline.addLatLng([lat, lon]);
      if (trackLogPoints.length > 8000) {
        trackLogPoints = trackLogPoints.filter((_, i) => i % 2 === 0 || i === trackLogPoints.length - 1);
        const last = trackLogPoints[trackLogPoints.length - 1];
        trackLastAccepted = { lat:last[0], lon:last[1], time:last[2] };
        renderActiveTrack();
      }
      updateTargetModePanel();
    }

    function routeViaIcon(via) {
      const safeName = String(via?.name || 'VIA').replace(/[<>&"']/g, '');
      return L.divIcon({
        className:'route-via-wrapper',
        iconSize:[24,24], iconAnchor:[12,12],
        html:`<div class="route-via-icon" aria-label="${safeName}"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 L20 18 H4 Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg><span class="route-via-label">${safeName}</span></div>`
      });
    }

    function renderRouteViaPoints() {
      if (!routeViaLayer) return;
      routeViaLayer.clearLayers();
      if (!targetModeActive) return;
      routeViaPoints.forEach(via => {
        const marker = L.marker(via.coords, { icon:routeViaIcon(via), keyboard:false, riseOnHover:true }).addTo(routeViaLayer);
        marker.on('click', e => {
          if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent);
          if (targetModePhase !== 'PLAN' || routeDrawEnabled) return;
          if (confirm(`${via.name} VIA를 ROUTE에서 삭제하시겠습니까?`)) removeRouteViaPoint(via.id);
        });
      });
    }

    function removeRouteViaPoint(id) {
      const before = routeViaPoints.length;
      routeViaPoints = routeViaPoints.filter(via => String(via.id) !== String(id));
      if (routeViaPoints.length !== before) {
        routeDirty = true;
        renderRouteViaPoints();
        updateTargetModePanel();
      }
    }

    function renderRouteDraft() {
      if (!routeDraftLayer) return;
      routeDraftLayer.clearLayers();
      if (!targetModeActive) { renderRouteViaPoints(); renderRouteEndpoints(); return; }
      routeDraftSegments.forEach(segment => {
        L.polyline(segment, routeStyle()).addTo(routeDraftLayer);
      });
      routeMarkSegments.forEach(segment => {
        L.polyline(segment, routeMarkStyle()).addTo(routeDraftLayer);
      });
      routeCurrentPolyline = null;
      renderRouteViaPoints();
      renderRouteEndpoints();
      updateTargetModePanel();
    }

    function syncRoutePlanStyle() {
      if (routeDraftLayer) {
        routeDraftLayer.eachLayer(layer => {
          if (layer.setStyle) layer.setStyle({ color:getOpticColor() });
        });
      }
      if (targetReferenceLine?.setStyle) targetReferenceLine.setStyle({ color:getOpticColor() });
      if (trackLivePolyline?.setStyle) trackLivePolyline.setStyle({ color:getOpticColor() });
      renderRouteViaPoints();
    }

    function syncGpsMarkerVisibility() {
      if (!gpsMarker) return;
      const shouldShow = hasGpsFix && (!targetModeActive || targetModeShowGps);
      const shown = map.hasLayer(gpsMarker);
      if (shouldShow && !shown) gpsMarker.addTo(map);
      if (!shouldShow && shown) map.removeLayer(gpsMarker);
    }

    function syncTargetReferenceLine() {
      const shouldShow = targetModeActive && targetModePhase !== 'NAV' && targetModeTarget && targetModeShowGps && hasGpsFix;
      if (!shouldShow) {
        if (targetReferenceLine && map.hasLayer(targetReferenceLine)) map.removeLayer(targetReferenceLine);
        return;
      }
      const pts = [baseLocation, targetModeTarget.coords];
      if (!targetReferenceLine) {
        targetReferenceLine = L.polyline(pts, {
          renderer:routeRenderer, interactive:false, color:getOpticColor(), weight:1, opacity:.55, dashArray:'5,7'
        });
      } else {
        targetReferenceLine.setLatLngs(pts);
        targetReferenceLine.setStyle({ color:getOpticColor() });
      }
      if (!map.hasLayer(targetReferenceLine)) targetReferenceLine.addTo(map);
    }

    function resetRouteGestureState(cancelStroke = true) {
      routeActivePointers.forEach((_, id) => {
        try { map.getContainer().releasePointerCapture(id); } catch (e) {}
      });
      routeActivePointers.clear();
      routeGestureMode = false;
      routeGestureAwaitRelease = false;
      routeGestureLastCenter = null;
      routeGestureLastDistance = 0;
      if (cancelStroke && routeCurrentPolyline) {
        try { routeDraftLayer.removeLayer(routeCurrentPolyline); } catch (e) {}
      }
      routePointerId = null;
      routeCurrentSegment = null;
      routeCurrentPolyline = null;
    }

    function setMapRouteDrawInteraction(enabled) {
      const container = map.getContainer();
      routeDrawEnabled = Boolean(enabled && targetModeActive && targetModePhase === 'PLAN');
      container.classList.toggle('route-draw-active', routeDrawEnabled);
      resetRouteGestureState(true);
      if (routeDrawEnabled) {
        // One finger draws. Two fingers are handled below as custom pan/zoom.
        map.dragging.disable();
        map.touchZoom.disable();
        map.doubleClickZoom.disable();
        map.scrollWheelZoom.enable();
        if (map.boxZoom) map.boxZoom.disable();
      } else {
        map.dragging.enable();
        map.touchZoom.enable();
        map.doubleClickZoom.enable();
        map.scrollWheelZoom.enable();
        if (map.boxZoom) map.boxZoom.enable();
      }
      updateTargetModePanel();
    }

    function toggleRouteDraw() {
      if (!targetModeActive) return;
      setMapRouteDrawInteraction(!routeDrawEnabled);
    }

    function enterTargetModeFromSitrep() {
      if (!currentActiveTarget) return;
      const list = getLocalIntel();
      const stored = list.find(item => String(item.id) === String(currentActiveTarget.id));
      const target = stored || RECON_TARGETS.find(item => String(item.id) === String(currentActiveTarget.id)) || currentActiveTarget;
      if (!target?.coords) {
        alert('TARGET MODE에서 사용할 수 없는 거점입니다.');
        return;
      }
      enterTargetMode(target);
    }

    function enterTargetMode(target) {
      if (!target?.coords) return;
      if (!preserveActivePlan()) return;
      // Saving the outgoing plan may replace its local point object.
      target = getLocalIntel().find(item => String(item.id) === String(target.id)) || target;
      closeRouteLocate(); closeRoutePoints(); closeNavOptic();
      stopNavElapsed();
      if (trackRecording || pendingTrackStart) stopTrackRecording(true, true);
      clearActiveTrack();
      targetModeTarget = target;
      targetModeActive = true;
      targetModePhase = 'PLAN';
      pendingNavStart = false;
      navPanelCollapsed = false;
      navMapOrientation = 'NORTH';
      lastTrackSample = null; lastTrackHeading = null; lastTrackHeadingAt = 0;
      stopTrackUpRotation(true);
      targetModeShowGps = hasGpsFix;
      gpsFollowEnabled = false;
      updateGpsTelemetry();
      const savedRoute = getTargetRoutePlan(target);
      routeDraftSegments = cloneRouteSegments(savedRoute?.segments);
      routeMarkSegments = cloneRouteSegments(savedRoute?.markSegments);
      routeViaPoints = cloneRouteViaPoints(savedRoute?.viaPoints);
      routeStartPoint = cloneRouteEndpoint(savedRoute?.startPoint);
      routeEndPoint = cloneRouteEndpoint(savedRoute?.endPoint);
      routeDrawKind = 'ROUTE';
      navLegIndex = 0; backtrackActive = false;
      routeDirty = false;
      closeFieldControls();
      closeWpDrawer();
      closeSitrep();
      setMapRouteDrawInteraction(false);
      renderRouteDraft();
      syncMarkerVisibility();
      syncGpsMarkerVisibility();
      syncTargetReferenceLine();

      if (hasGpsFix && targetModeShowGps) {
        map.fitBounds(L.latLngBounds([baseLocation, target.coords]), { padding:[54,54], maxZoom:14, animate:false });
      } else {
        map.setView(target.coords, Math.max(map.getZoom(), 14), { animate:false });
      }
      updateReticleTelemetry();
      updateTargetModePanel();
    }

    function exitTargetMode(force = false) {
      if (!targetModeActive) return;
      // force is reserved for explicit point deletion, never normal PLAN closing.
      if (!force && !preserveActivePlan()) return;
      closeRouteLocate();
      closeRoutePoints();
      closeNavOptic();
      setMapRouteDrawInteraction(false);
      if (trackRecording || pendingTrackStart) stopTrackRecording(true, true);
      targetModeActive = false;
      targetModeTarget = null;
      targetModeShowGps = false;
      targetModePhase = 'PLAN';
      pendingNavStart = false;
      navPanelCollapsed = false;
      navMapOrientation = 'NORTH';
      stopTrackUpRotation(true);
      lastTrackSample = null; lastTrackHeading = null; lastTrackHeadingAt = 0;
      gpsFollowEnabled = false;
      routeDraftSegments = [];
      routeMarkSegments = [];
      routeViaPoints = [];
      routeStartPoint = null;
      routeEndPoint = null;
      renderRouteEndpoints();
      navLegIndex = 0; backtrackActive = false;
      stopNavElapsed();
      routeDirty = false;
      clearActiveTrack();
      if (routeDraftLayer) routeDraftLayer.clearLayers();
      if (routeViaLayer) routeViaLayer.clearLayers();
      if (targetReferenceLine && map.hasLayer(targetReferenceLine)) map.removeLayer(targetReferenceLine);
      syncMarkerVisibility();
      syncGpsMarkerVisibility();
      updateTargetModePanel();
    }

    function toggleTargetMyPosition() {
      if (!targetModeActive) return;
      if (!hasGpsFix) {
        targetModeShowGps = true;
        updateTargetModePanel();
        locateUser();
        return;
      }
      targetModeShowGps = !targetModeShowGps;
      syncGpsMarkerVisibility();
      syncTargetReferenceLine();
      updateTargetModePanel();
    }

    function undoRouteStroke() {
      if (!targetModeActive) return;
      const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
      if (!bucket.length) return;
      bucket.pop();
      routeDirty = true;
      renderRouteDraft();
    }

    function clearRouteDraft() {
      if (!targetModeActive) return;
      const label = routeDrawKind === 'MARK' ? 'OVERLAY' : 'ROUTE';
      const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
      if (!bucket.length) return;
      if (!confirm(`${label} 선을 모두 지우시겠습니까?`)) return;
      if (routeDrawKind === 'MARK') routeMarkSegments = []; else routeDraftSegments = [];
      routeDirty = true;
      renderRouteDraft();
    }

    function preserveActivePlan() {
      return !targetModeActive || (!routeDirty && !(routeCurrentSegment?.length >= 2)) || saveTargetRoute();
    }

    function saveTargetRoute() {
      if (!targetModeActive || !targetModeTarget) return false;
      if (routePointerId !== null && routeCurrentSegment?.length >= 2) {
        finishRoutePointer({pointerId:routePointerId, preventDefault(){}});
      }
      const routePlan = {
        segments: cloneRouteSegments(routeDraftSegments),
        markSegments: cloneRouteSegments(routeMarkSegments),
        viaPoints: cloneRouteViaPoints(routeViaPoints),
        startPoint: cloneRouteEndpoint(routeStartPoint),
        endPoint: cloneRouteEndpoint(routeEndPoint),
        distanceKm: Number(routeLengthKm().toFixed(3)),
        updatedAt: new Date().toISOString()
      };
      const list = getLocalIntel();
      const idx = list.findIndex(item => String(item.id) === String(targetModeTarget.id));
      try {
        if (idx !== -1) {
          list[idx].routePlan = routePlan;
          saveLocalIntel(list);
          targetModeTarget = list[idx];
        } else if (isRegisteredTarget(targetModeTarget)) {
          saveRegisteredRoutePlan(targetModeTarget, routePlan);
          targetModeTarget = { ...targetModeTarget, routePlan };
        } else {
          throw new Error('target route storage unavailable');
        }
      } catch (e) {
        console.warn('ROUTE PLAN 저장 실패:', e);
        alert('ROUTE PLAN 저장에 실패했습니다.');
        return false;
      }
      routeDirty = false;
      syncMarkerVisibility();
      updateTargetModePanel();
      return true;
    }

    function setRouteLocateActionsEnabled(enabled) {
      const move = document.getElementById('routeLocateMoveBtn');
      const via = document.getElementById('routeLocateViaBtn');
      if (move) move.disabled = !enabled;
      if (via) via.disabled = !enabled;
    }

    function updateRouteLocateReadout(result) {
      const box = document.getElementById('routeLocateReadout');
      if (!box) return;
      box.style.display = result ? 'grid' : 'none';
      document.getElementById('routeLocateLatLon').innerText = result ? `${result.lat.toFixed(6)}, ${result.lon.toFixed(6)}` : '--';
      document.getElementById('routeLocateMgrs').innerText = result ? calcMGRS(result.lat, result.lon) : '--';
      document.getElementById('routeLocateAddress').innerText = result?.address || '--';
    }

    function selectRouteLocateResult(result, button = null) {
      routeLocateSelected = result;
      document.querySelectorAll('#routeLocateResults .address-search-item').forEach(el => el.classList.remove('selected'));
      if (button) button.classList.add('selected');
      setRouteLocateActionsEnabled(Boolean(result));
      updateRouteLocateReadout(result);
      const name = document.getElementById('routeViaNameInput');
      if (name && !name.value.trim() && result?.name) name.value = String(result.name).slice(0,40);
    }

    function openRouteLocate(role = 'VIA') {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !['START','VIA','END'].includes(role)) return;
      routeLocateRole = role;
      closeRoutePoints();
      document.getElementById('routeLocateTitle').textContent = `PLAN INPUT / ${role}`;
      document.getElementById('routeLocateViaBtn').textContent = `${role} 지정`;
      document.getElementById('routeViaNameInput').placeholder = `${role} 명칭 (선택)`;
      document.querySelector('#routeLocateBackdrop .route-locate-hint').textContent = `주소·장소명, WGS84 또는 MGRS를 입력하여 ${role} 위치를 지정합니다.`;
      document.getElementById('routeLocateSearchBtn').disabled = false;
      setMapRouteDrawInteraction(false);
      routeLocateSelected = null;
      routeLocateSearchToken++;
      const input = document.getElementById('routeLocateInput');
      const results = document.getElementById('routeLocateResults');
      const name = document.getElementById('routeViaNameInput');
      if (input) input.value = '';
      if (name) name.value = '';
      if (results) results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
      setRouteLocateActionsEnabled(false);
      updateRouteLocateReadout(null);
      document.getElementById('routeLocateBackdrop').style.display = 'flex';
      setTimeout(() => input?.focus(), 80);
    }

    function closeRouteLocate() {
      document.getElementById('routeLocateBackdrop').style.display = 'none';
      routeLocateSelected = null;
      routeLocateSearchToken++;
      setRouteLocateActionsEnabled(false);
      updateRouteLocateReadout(null);
    }

    function parseDirectRouteLocation(query) {
      const q = String(query || '').trim();
      if (!q) return null;
      const coord = q.match(/^\s*([+-]?\d{1,2}(?:\.\d+)?)\s*[,\s]\s*([+-]?\d{1,3}(?:\.\d+)?)\s*$/);
      if (coord) {
        const lat = Number(coord[1]), lon = Number(coord[2]);
        if (Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          return { lat, lon, name:'WGS84 VIA', address:'', source:'WGS84' };
        }
      }
      const compact = q.toUpperCase().replace(/\s+/g, '');
      if (/^\d{1,2}[C-X][A-Z]{2}\d{2,10}$/.test(compact) && window.mgrs?.toPoint) {
        try {
          const point = window.mgrs.toPoint(compact);
          const lon = Number(point?.[0]), lat = Number(point?.[1]);
          if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon, name:'MGRS VIA', address:'', source:'MGRS' };
        } catch (e) {}
      }
      return null;
    }

    async function resolveRouteLocateAddress(result, token) {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(result.lat)}&lon=${encodeURIComponent(result.lon)}&zoom=18&addressdetails=1&accept-language=ko`, { headers:{'Accept':'application/json'} });
        if (!res.ok) return result;
        const data = await res.json();
        if (token !== routeLocateSearchToken) return result;
        result.address = normalizeKoreanAddress(data, data.display_name || '') || '';
        if (routeLocateSelected === result) updateRouteLocateReadout(result);
      } catch (e) {}
      return result;
    }

    async function searchRouteLocate() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      const input = document.getElementById('routeLocateInput');
      const resultsEl = document.getElementById('routeLocateResults');
      const button = document.getElementById('routeLocateSearchBtn');
      const query = input?.value.trim();
      if (!query) { input?.focus(); return; }
      const token = ++routeLocateSearchToken;
      routeLocateSelected = null;
      setRouteLocateActionsEnabled(false);
      updateRouteLocateReadout(null);
      resultsEl.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
      if (button) button.disabled = true;
      try {
        const direct = parseDirectRouteLocation(query);
        if (direct) {
          resultsEl.innerHTML = '';
          const item = document.createElement('button');
          item.type = 'button'; item.className = 'address-search-item selected';
          item.innerHTML = `<span class="address-search-name">${direct.source} COORDINATE</span><span class="address-search-coords">${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}</span>`;
          item.onclick = () => selectRouteLocateResult(direct, item);
          resultsEl.appendChild(item);
          selectRouteLocateResult(direct, item);
          resolveRouteLocateAddress(direct, token);
          return;
        }

        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
        const res = await fetch(url, { headers:{'Accept':'application/json'} });
        if (!res.ok) throw new Error('route locate search failed');
        const data = await res.json();
        if (token !== routeLocateSearchToken) return;
        resultsEl.innerHTML = '';
        if (!Array.isArray(data) || data.length === 0) {
          resultsEl.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
          return;
        }
        data.forEach(row => {
          const lat = Number(row.lat), lon = Number(row.lon);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const normalized = normalizeKoreanAddress(row, row.display_name || query);
          const result = { lat, lon, name:String(row.name || normalized || query), address:normalized || row.display_name || query, source:'ADDRESS' };
          const item = document.createElement('button');
          item.type='button'; item.className='address-search-item';
          const name = document.createElement('span'); name.className='address-search-name'; name.textContent=result.address;
          const coords = document.createElement('span'); coords.className='address-search-coords'; coords.textContent=`${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat,lon)}`;
          item.append(name,coords);
          item.onclick=()=>selectRouteLocateResult(result,item);
          resultsEl.appendChild(item);
        });
      } catch (e) {
        if (token !== routeLocateSearchToken) return;
        console.warn('ROUTE LOCATE 실패:', e);
        resultsEl.innerHTML = '<div class="address-search-empty">위치 검색에 실패했습니다. 네트워크 또는 좌표 형식을 확인하십시오.</div>';
      } finally {
        if (button && token === routeLocateSearchToken) button.disabled = false;
      }
    }

    function moveToRouteLocate() {
      if (!routeLocateSelected) return;
      const result = { ...routeLocateSelected };
      closeRouteLocate();
      map.setView([result.lat, result.lon], Math.max(map.getZoom(), 16), { animate:false });
      flushReticleTelemetry();
    }

    function addRouteViaPoint() {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !routeLocateSelected) return;
      const nameInput = document.getElementById('routeViaNameInput');
      const via = {
        name:(nameInput?.value.trim() || routeLocateRole).slice(0,60),
        coords:[Number(routeLocateSelected.lat), Number(routeLocateSelected.lon)],
        address:String(routeLocateSelected.address || '').slice(0,500),
        source:String(routeLocateSelected.source || 'INPUT')
      };
      if (!assignPlanPoint(routeLocateRole, via)) return;
      const coords = [...via.coords];
      closeRouteLocate();
      map.setView(coords, Math.max(map.getZoom(), 15), { animate:false });
      flushReticleTelemetry();
    }

    function activateTargetNavigation() {
      if (!targetModeActive || !targetModeTarget) return;
      const ref = getReferencePosition();
      if (!ref?.coords) return;
      pendingNavStart = false;
      if (!routeStartPoint) {
        routeStartPoint = { name:ref.type === 'GPS' ? 'GPS START' : 'TEMP POS START', coords:[...ref.coords], source:ref.type };
        routeDirty = true;
        renderRouteEndpoints();
        if (!saveTargetRoute()) return;
      }
      targetModePhase = 'NAV';
      navPanelCollapsed = false;
      navLegIndex = 0;
      backtrackActive = false;
      if (!trackRecording) clearActiveTrack();
      navMapOrientation = ROTATION_AVAILABLE && ref.type === 'GPS' ? 'TRACK' : 'NORTH';
      stopTrackUpRotation(true);
      targetModeShowGps = hasGpsFix;
      setMapRouteDrawInteraction(false);
      syncGpsMarkerVisibility();
      syncTargetReferenceLine();
      map.setView(ref.coords, Math.max(map.getZoom(),13), {animate:false});
      startNavElapsed();
      updateTrackUpFromGps(latestGpsPosition);
      renderRouteEndpoints();
      updateTargetModePanel();
    }

    function startTargetNavigation() {
      if (!targetModeActive || !targetModeTarget) return;
      if (!preserveActivePlan()) return;
      setMapRouteDrawInteraction(false);
      const ref = getReferencePosition();
      if (!ref?.coords) {
        pendingNavStart = true;
        if (!gpsPowerEnabled) startGpsTracking(false); else locateUser();
        return;
      }
      activateTargetNavigation();
    }

    function recenterTargetNavigation() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      const ref = getReferencePosition();
      if (!ref?.coords) { alert('GPS 또는 TEMP POS 위치가 필요합니다.'); return; }
      if (ref.type === 'GPS') {
        targetModeShowGps = true;
        syncGpsMarkerVisibility();
        map.setView(ref.coords, Math.max(map.getZoom(),13), { animate:false });
      } else {
        gpsFollowEnabled = false;
        map.setView(ref.coords, Math.max(map.getZoom(),13), { animate:false });
      }
      updateTargetModePanel();
    }

    function returnToTargetPlan() {
      if (!targetModeActive) return;
      if (trackRecording || pendingTrackStart) stopTrackRecording(true, true);
      targetModePhase = 'PLAN';
      pendingNavStart = false;
      navPanelCollapsed = false;
      navMapOrientation = 'NORTH';
      stopTrackUpRotation(true);
      gpsFollowEnabled = false;
      stopNavElapsed();
      backtrackActive = false;
      syncTargetReferenceLine();
      updateGpsTelemetry();
      updateTargetModePanel();
    }

    function routeContainerPoint(event) {
      const rect = map.getContainer().getBoundingClientRect();
      return L.point(event.clientX - rect.left, event.clientY - rect.top);
    }

    function routeGesturePair() {
      const values = [...routeActivePointers.values()];
      return values.length >= 2 ? [values[0], values[1]] : null;
    }

    function routeGestureMetrics(pair) {
      const [a,b] = pair;
      return {
        center:L.point((a.x+b.x)/2, (a.y+b.y)/2),
        distance:Math.hypot(a.x-b.x, a.y-b.y)
      };
    }

    function cancelCurrentRouteStroke() {
      if (routeCurrentPolyline) {
        try { routeDraftLayer.removeLayer(routeCurrentPolyline); } catch (e) {}
      }
      routePointerId = null;
      routeCurrentSegment = null;
      routeCurrentPolyline = null;
    }

    function beginTwoFingerRouteGesture() {
      const pair = routeGesturePair();
      if (!pair) return;
      cancelCurrentRouteStroke();
      routeGestureMode = true;
      routeGestureAwaitRelease = false;
      const metrics = routeGestureMetrics(pair);
      routeGestureLastCenter = metrics.center;
      routeGestureLastDistance = metrics.distance;
    }

    function handleRoutePointerDown(event) {
      if (!targetModeActive || !routeDrawEnabled || event.button > 0) return;
      const point = routeContainerPoint(event);
      routeActivePointers.set(event.pointerId, point);
      try { map.getContainer().setPointerCapture(event.pointerId); } catch (e) {}
      event.preventDefault();
      event.stopPropagation();

      if (event.pointerType === 'touch' && routeActivePointers.size >= 2) {
        beginTwoFingerRouteGesture();
        return;
      }
      if (routeGestureMode || routeGestureAwaitRelease || routePointerId !== null) return;

      routePointerId = event.pointerId;
      const latlng = map.containerPointToLatLng(point);
      routeCurrentSegment = [[latlng.lat, latlng.lng]];
      routeCurrentPolyline = L.polyline(routeCurrentSegment, routeDrawKind === 'MARK' ? routeMarkStyle() : routeStyle()).addTo(routeDraftLayer);
    }

    function handleRoutePointerMove(event) {
      if (!targetModeActive || !routeDrawEnabled || !routeActivePointers.has(event.pointerId)) return;
      const point = routeContainerPoint(event);
      routeActivePointers.set(event.pointerId, point);
      event.preventDefault();

      if (routeGestureMode) {
        const pair = routeGesturePair();
        if (!pair) return;
        const metrics = routeGestureMetrics(pair);
        if (routeGestureLastCenter) {
          const dx = metrics.center.x - routeGestureLastCenter.x;
          const dy = metrics.center.y - routeGestureLastCenter.y;
          if (Math.abs(dx) + Math.abs(dy) > 0.5) map.panBy([-dx, -dy], { animate:false, noMoveStart:true });
        }
        if (routeGestureLastDistance > 0) {
          const ratio = metrics.distance / routeGestureLastDistance;
          if (ratio > 1.16 && map.getZoom() < map.getMaxZoom()) {
            map.setZoomAround(metrics.center, Math.min(map.getMaxZoom(), map.getZoom() + 1), { animate:false });
            routeGestureLastDistance = metrics.distance;
          } else if (ratio < 0.86 && map.getZoom() > map.getMinZoom()) {
            map.setZoomAround(metrics.center, Math.max(map.getMinZoom(), map.getZoom() - 1), { animate:false });
            routeGestureLastDistance = metrics.distance;
          }
        }
        routeGestureLastCenter = metrics.center;
        return;
      }

      if (routePointerId !== event.pointerId || !routeCurrentSegment) return;
      const latlng = map.containerPointToLatLng(point);
      const next = [latlng.lat, latlng.lng];
      const prev = routeCurrentSegment[routeCurrentSegment.length - 1];
      const prevPx = map.latLngToContainerPoint(prev);
      if (prevPx.distanceTo(point) < 5) return;
      routeCurrentSegment.push(next);
      routeCurrentPolyline?.setLatLngs(routeCurrentSegment);
    }

    function finishRoutePointer(event) {
      if (!routeActivePointers.has(event.pointerId) && routePointerId !== event.pointerId) return;
      event.preventDefault();
      try { map.getContainer().releasePointerCapture(event.pointerId); } catch (e) {}

      if (routeGestureMode) {
        routeActivePointers.delete(event.pointerId);
        if (routeActivePointers.size < 2) {
          routeGestureMode = false;
          routeGestureAwaitRelease = routeActivePointers.size > 0;
          routeGestureLastCenter = null;
          routeGestureLastDistance = 0;
        }
        if (routeActivePointers.size === 0) routeGestureAwaitRelease = false;
        return;
      }

      routeActivePointers.delete(event.pointerId);
      if (routeGestureAwaitRelease) {
        if (routeActivePointers.size === 0) routeGestureAwaitRelease = false;
        return;
      }
      if (routePointerId !== event.pointerId) return;

      if (routeCurrentSegment && routeCurrentSegment.length >= 2) {
        const cleanSegment = routeCurrentSegment.map(pt => [pt[0], pt[1]]);
        if (routeDrawKind === 'MARK') routeMarkSegments.push(cleanSegment);
        else routeDraftSegments.push(cleanSegment);
        routeDirty = true;
      } else if (routeCurrentPolyline) {
        routeDraftLayer.removeLayer(routeCurrentPolyline);
      }
      routePointerId = null;
      routeCurrentSegment = null;
      routeCurrentPolyline = null;
      updateTargetModePanel();
    }

    const routeMapContainer = map.getContainer();
    routeMapContainer.addEventListener('pointerdown', handleRoutePointerDown, { passive:false });
    routeMapContainer.addEventListener('pointermove', handleRoutePointerMove, { passive:false });
    routeMapContainer.addEventListener('pointerup', finishRoutePointer, { passive:false });
    routeMapContainer.addEventListener('pointercancel', finishRoutePointer, { passive:false });

    function openPromotionModal() {
      closeWpDrawer();
      if (!currentActiveTarget) return;
      document.getElementById('promoNameInput').value = currentActiveTarget.name.replace(/\[.*\]/, '').trim();
      document.getElementById('promoMemoInput').value = "";
      document.getElementById('promoModalBackdrop').style.display = 'flex';
    }

    function closePromotionModal() {
      document.getElementById('promoModalBackdrop').style.display = 'none';
    }

    function confirmPromotion() {
      if (!currentActiveTarget) {
        closePromotionModal();
        return;
      }
      const newName = document.getElementById('promoNameInput').value.trim() || currentActiveTarget.name;
      const newMemo = document.getElementById('promoMemoInput').value.trim() || "현장 답사 완료. 특이 지형 및 접근로 확보.";

      const list = getLocalIntel();
      const idx = list.findIndex(i => String(i.id) === String(currentActiveTarget.id));
      if (idx === -1) {
        alert('해당 POINT를 저장소에서 찾을 수 없습니다.');
        closePromotionModal();
        return;
      }

      list[idx].name = newName;
      list[idx].desc = newMemo;
      list[idx].status = 'SECURED';
      if (typeof list[idx].opCode === 'string') list[idx].opCode = list[idx].opCode.replace('WILD', 'SECURED');
      list[idx].securedAt = new Date().toISOString().substring(0, 16).replace('T', ' ');
      try {
        saveLocalIntel(list);
      } catch (e) {
        console.warn('개척 거점 저장 실패:', e);
        alert('개척 상태 저장에 실패했습니다. 브라우저 저장 공간을 확인하십시오.');
        return;
      }
      if (targetModeActive && targetModeTarget && String(targetModeTarget.id) === String(list[idx].id)) {
        targetModeTarget = list[idx];
      }
      openSitrep(list[idx], 'SECURED');
      closePromotionModal();
    }

    function setOpticTheme(themeName, btn) {
      ['theme-stealth','theme-nvg-green','theme-nvg-white','theme-flir'].forEach(c => document.body.classList.remove(c));
      document.body.classList.add(`theme-${themeName}`);
      const modeMap = { 'stealth':'STH', 'nvg-green':'NVG-G', 'nvg-white':'NVG-W', 'flir':'FLIR' };
      currentOpticMode = modeMap[themeName] || themeName.toUpperCase();
      const opticLabel = document.getElementById('currentOpticLabel');
      if (opticLabel) opticLabel.innerText = currentOpticMode;
      if (btn) {
        btn.parentElement.querySelectorAll('.osb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      document.querySelectorAll('#control-optic .osb-btn, #navOpticBackdrop .osb-btn').forEach(b => {
        b.classList.toggle('active', b.textContent.trim() === currentOpticMode);
      });
      syncRadiusCircleStyle();
      syncRoutePlanStyle();
      updateMapScale();
      try { window.r1?.refreshLowDataStyle?.(); } catch (e) {}
      const themeMeta = document.getElementById('appThemeColor');
      if (themeMeta) themeMeta.setAttribute('content', getComputedStyle(document.body).getPropertyValue('--bg-base').trim() || '#020904');
    }

    function toggleMapLayer(layerKey, btn) {
      if (!(layerKey in markerLayerVisibility)) return;
      markerLayerVisibility[layerKey] = !markerLayerVisibility[layerKey];
      if (btn) {
        btn.classList.toggle('active', markerLayerVisibility[layerKey]);
        btn.setAttribute('aria-pressed', markerLayerVisibility[layerKey] ? 'true' : 'false');
      }
      syncMarkerVisibility();
    }

    function setRadar(r, btn) {
      if (r !== 'all' && !hasGpsFix) {
        alert('NEARBY 거리 필터는 GPS FIX 이후 사용할 수 있습니다.');
        return;
      }
      selectedRadius = r;
      if (r !== 'all') updateRegisteredDistanceCache(true);
      if (btn) {
        btn.parentElement.querySelectorAll('.osb-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      syncMarkerVisibility();
    }

    function setGpsFollow(enabled, recenter = false) {
      gpsFollowEnabled = Boolean(enabled && gpsPowerEnabled && hasGpsFix);
      if (!gpsFollowEnabled && navMapOrientation === 'TRACK') stopTrackUpRotation(true);
      updateGpsTelemetry();
      if (gpsFollowEnabled && recenter) {
        map.setView(baseLocation, Math.max(map.getZoom(), 13), { animate:false });
        lastGpsFollowPanAt = Date.now();
      }
      if (gpsFollowEnabled && navMapOrientation === 'TRACK') resumeTrackUpRotation();
      if (targetModeActive) updateTargetModePanel();
    }

    function toggleGpsFollow() {
      if (!gpsPowerEnabled || !hasGpsFix) { alert('FOLLOW는 GPS ON + FIX 상태에서 사용할 수 있습니다.'); return; }
      setGpsFollow(!gpsFollowEnabled, true);
    }

    function applyGpsPosition(pos, shouldRecenter = false) {
      latestGpsPosition = pos;
      const nextLocation = [pos.coords.latitude, pos.coords.longitude];
      const hadFix = hasGpsFix;
      baseLocation = nextLocation;
      hasGpsFix = true;
      gpsLockState = 'LOCK';
      currentGpsAltitude = (typeof pos.coords.altitude === 'number' && Number.isFinite(pos.coords.altitude)) ? pos.coords.altitude : null;

      if (!gpsMarker) {
        gpsMarker = L.marker(baseLocation, {
          icon: L.divIcon({ className:'gps-position-wrapper', html:gpsMarkerSvg(), iconSize:[28,28], iconAnchor:[14,14] }),
          zIndexOffset: 100
        });
      } else {
        gpsMarker.setLatLng(baseLocation);
      }
      syncGpsMarkerVisibility();
      syncTargetReferenceLine();

      const cacheChanged = updateRegisteredDistanceCache(!hadFix);
      if (selectedRadius !== 'all' && cacheChanged) syncMarkerVisibility();
      else syncRadiusCirclePosition();

      updateActiveTargetNavigation();
      if (pendingNavStart && targetModeActive) {
        activateTargetNavigation();
      }
      if (pendingTrackStart && targetModeActive && targetModePhase === 'NAV' && !trackRecording) {
        startTrackRecording();
      }
      recordTrackPoint(pos);
      if (shouldRecenter) {
        map.setView(baseLocation, Math.max(map.getZoom(),13), {animate:false});
        updateGpsTelemetry();
      }
      else {
        updateGpsTelemetry();
        if (gpsFollowEnabled && Date.now() - lastGpsFollowPanAt > 900) {
          map.panTo(baseLocation, { animate:false });
          lastGpsFollowPanAt = Date.now();
        }
      }
      updateTrackUpFromGps(pos);
      if (targetModeActive) updateTargetModePanel();
    }

    /* GPS entry point is defined once in the power-managed GPS section below. */
    function openWpDrawer() {
      const drawer = document.getElementById('wpDrawer');
      if (!drawer) return;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      renderWpDrawerList();
    }

    function closeWpDrawer() {
      const drawer = document.getElementById('wpDrawer');
      if (!drawer) return;
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    }

    function toggleWpDrawer() {
      const drawer = document.getElementById('wpDrawer');
      if (!drawer) return;
      if (drawer.classList.contains('open')) closeWpDrawer();
      else openWpDrawer();
    }

    function renderWpDrawerList() {
      const c = document.getElementById('wpListContainer');
      const groups = getWaypointEntries(waypointFilter);
      c.innerHTML = '';

      const groupMeta = [
        ['REGISTERED','REGISTERED'],
        ['UNEXPLORED','UNEXPLORED'],
        ['SECURED','SECURED'],
        ['USER_PLACED','USER']
      ];
      let totalVisible = 0;

      groupMeta.forEach(([key, label]) => {
        const items = groups[key] || [];
        if (items.length === 0) return;
        totalVisible += items.length;

        const section = document.createElement('section');
        section.className = 'wp-group';

        const head = document.createElement('button');
        head.type = 'button';
        head.className = 'wp-group-head';
        const collapsed = waypointGroupsCollapsed[key];
        head.innerHTML = `<span class="wp-group-chevron">${collapsed ? '▸' : '▾'}</span><span class="wp-group-name">${label}</span><span class="wp-group-count">${items.length}</span>`;
        head.onclick = () => toggleWaypointGroup(key);
        section.appendChild(head);

        if (!collapsed) {
          const body = document.createElement('div');
          body.className = 'wp-group-body';

          items.forEach(item => {
            const isRegistered = key === 'REGISTERED' || item.__kind === 'REGISTERED';
            const div = document.createElement('div');
            div.className = 'wp-item';

            const displayStatus = isRegistered
              ? 'REGISTERED'
              : item.source === 'USER_PLACED'
                ? `USER · ${item.status || 'UNEXPLORED'}`
                : (item.status || key);
            const opCode = item.opCode || 'USER-POINT';
            const deleteButton = isRegistered ? '' : `<button class="wp-item-delete" type="button">삭제</button>`;

            div.innerHTML = `
              <div class="wp-item-meta">
                <span class="wp-item-status"></span>
                ${deleteButton}
              </div>
              <div class="wp-item-name"></div>
              <div class="wp-item-coords">${calcMGRS(item.coords[0], item.coords[1])}</div>
            `;
            div.querySelector('.wp-item-name').textContent = item.name || '무명 거점';
            div.querySelector('.wp-item-status').textContent = `[${displayStatus}] ${opCode}`;

            if (!isRegistered) {
              const del = div.querySelector('.wp-item-delete');
              del.onclick = e => {
                e.stopPropagation();
                deleteWPById(item.id);
              };
            }

            div.onclick = () => {
              openSitrep(item, isRegistered ? 'REGISTERED' : item.status);
              toggleWpDrawer();
            };
            body.appendChild(div);
          });
          section.appendChild(body);
        }

        c.appendChild(section);
      });

      if (totalVisible === 0) {
        c.innerHTML = `<div style="text-align:center;color:var(--text-dim);font-size:11px;padding:30px 10px;">저장된 POINTS가 없습니다.</div>`;
      }
    }

    function deleteWPById(id) {
      const list = getLocalIntel();
      const deletingActive = currentActiveTarget && String(currentActiveTarget.id) === String(id);
      const next = list.filter(item => String(item.id) !== String(id));
      try {
        saveLocalIntel(next);
      } catch (e) {
        console.warn('POINT 삭제 저장 실패:', e);
        alert('POINT 삭제에 실패했습니다.');
        return;
      }
      if (targetModeActive && targetModeTarget && String(targetModeTarget.id) === String(id)) exitTargetMode(true);
      if (deletingActive) closeSitrep();
      renderWpDrawerList();
    }

    function clearAllWP() {
      const localList = getLocalIntel();
      if (localList.length === 0) {
        renderWpDrawerList();
        return;
      }
      if (!confirm(`저장된 POINTS ${localList.length}개를 모두 삭제하시겠습니까?\n등록 거점(REGISTERED)은 유지됩니다.\n삭제 전 DATA > 전체 백업을 권장합니다.`)) return;

      // Removing local points must not discard edits to an unrelated registered PLAN.
      if (targetModeActive && isRegisteredTarget(targetModeTarget) && !preserveActivePlan()) return;

      const activeWasLocal = currentActiveTarget && !RECON_TARGETS.some(t => String(t.id) === String(currentActiveTarget.id));
      try {
        saveLocalIntel([]);
      } catch (e) {
        console.warn('POINTS 전체 삭제 저장 실패:', e);
        alert('POINTS 전체 삭제에 실패했습니다.');
        return;
      }
      if (targetModeActive) exitTargetMode(true);
      if (activeWasLocal) closeSitrep();
      renderWpDrawerList();
    }

    function escapeXml(value) {
      return String(value ?? '').replace(/[<>&'"]/g, ch => ({ '<':'&lt;', '>':'&gt;', '&':'&amp;', "'":'&apos;', '"':'&quot;' }[ch]));
    }

    const ROUTE_FILE_FORMAT = 'TACTICAL_RECON_ROUTE';
    const ROUTE_FILE_VERSION = 3;
    const ROUTE_IMPORT_MAX_BYTES = 1024 * 1024;
    const ROUTE_IMPORT_MAX_POINTS = 20000;

    function safeRouteFileName(value) {
      return String(value || 'TARGET')
        .normalize('NFKC')
        .replace(/[\\/:*?"<>|]+/g, '_')
        .replace(/\s+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 48) || 'TARGET';
    }

    function buildRoutePackage() {
      if (!targetModeActive || !targetModeTarget) return null;
      if (!preserveActivePlan()) return null;
      const routePlan = getTargetRoutePlan(targetModeTarget) || {
        segments: cloneRouteSegments(routeDraftSegments),
        viaPoints: cloneRouteViaPoints(routeViaPoints),
        distanceKm: Number(routeLengthKm().toFixed(3)),
        updatedAt: new Date().toISOString()
      };
      if (!Array.isArray(routePlan.segments) || routePlan.segments.length === 0) return null;
      const registered = isRegisteredTarget(targetModeTarget);
      return {
        format: ROUTE_FILE_FORMAT,
        version: ROUTE_FILE_VERSION,
        exportedAt: new Date().toISOString(),
        target: {
          id: String(targetModeTarget.id || `IMPORTED-${Date.now()}`),
          opCode: String(targetModeTarget.opCode || 'ROUTE-TARGET'),
          name: String(targetModeTarget.name || 'ROUTE TARGET'),
          coords: [Number(targetModeTarget.coords[0]), Number(targetModeTarget.coords[1])],
          status: registered ? 'REGISTERED' : String(targetModeTarget.status || 'UNEXPLORED'),
          source: registered ? 'REGISTERED' : String(targetModeTarget.source || ''),
          address: String(targetModeTarget.address || ''),
          desc: String(targetModeTarget.desc || ''),
          tips: String(targetModeTarget.tips || '')
        },
        routePlan: {
          segments: cloneRouteSegments(routePlan.segments),
          markSegments: cloneRouteSegments(routePlan.markSegments),
          viaPoints: cloneRouteViaPoints(routePlan.viaPoints),
          startPoint: cloneRouteEndpoint(routePlan.startPoint),
          endPoint: cloneRouteEndpoint(routePlan.endPoint),
          distanceKm: Number(routePlan.distanceKm ?? routeLengthKm(routePlan.segments)),
          updatedAt: routePlan.updatedAt || new Date().toISOString()
        }
      };
    }

    async function shareTargetRoute() {
      const pkg = buildRoutePackage();
      if (!pkg) {
        alert('공유할 저장 ROUTE가 없습니다. 먼저 경로를 그리고 SAVE ROUTE를 실행하십시오.');
        return;
      }
      const filename = `${safeRouteFileName(pkg.target.name)}_${new Date().toISOString().substring(0,10)}.reconroute.json`;
      const json = JSON.stringify(pkg, null, 2);
      const blob = new Blob([json], { type:'application/json' });
      let shared = false;
      try {
        const file = new File([blob], filename, { type:'application/json' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
          await navigator.share({ files:[file], title:`ROUTE // ${pkg.target.name}`, text:'TACTICAL RECON ROUTE PLAN' });
          shared = true;
        }
      } catch (e) {
        if (e?.name === 'AbortError') return;
        console.warn('ROUTE 공유 시트 실패, 파일 저장으로 전환:', e);
      }
      if (shared) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 2000);
    }

    function openRouteImport() {
      const input = document.getElementById('routeImportInput');
      if (!input) return;
      input.value = '';
      try {
        if (typeof input.showPicker === 'function') input.showPicker();
        else input.click();
      } catch (e) {
        input.click();
      }
    }

    function importedCoordinates(raw) {
      if (!Array.isArray(raw) || raw.length < 2 || raw.slice(0,2).some(v =>
        !['number','string'].includes(typeof v) || String(v).trim() === '')) throw new Error('invalid coordinates');
      const coords = [Number(raw[0]), Number(raw[1])];
      if (!validCoordinates(coords)) throw new Error('invalid coordinates');
      return coords;
    }

    function sanitizeImportedRouteSegments(raw, allowEmpty = false, budget = { count:0 }) {
      if (raw == null && allowEmpty) return [];
      if (!Array.isArray(raw)) throw new Error('invalid route segments');
      if (raw.length > 500) throw new Error('too many segments');
      const segments = [];
      for (const segment of raw) {
        if (!Array.isArray(segment) || segment.length < 2) throw new Error('invalid segment');
        const clean = [];
        for (const point of segment) {
          clean.push(importedCoordinates(point));
          if (++budget.count > ROUTE_IMPORT_MAX_POINTS) throw new Error('route too large');
        }
        segments.push(clean);
      }
      if (!allowEmpty && segments.length === 0) throw new Error('empty route');
      return segments;
    }

    function sanitizeImportedTarget(raw) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('invalid target');
      const [lat, lon] = importedCoordinates(raw.coords);
      if (['__proto__','constructor','prototype'].includes(String(raw.id))) throw new Error('invalid target id');
      const status = ['UNEXPLORED','SECURED','REGISTERED'].includes(String(raw.status)) ? String(raw.status) : 'UNEXPLORED';
      const source = String(raw.source || '');
      return {
        id: String(raw.id || `IMPORTED-${Date.now()}`).slice(0,120),
        opCode: String(raw.opCode || 'IMPORTED-ROUTE').slice(0,120),
        name: String(raw.name || 'IMPORTED ROUTE TARGET').slice(0,120),
        coords:[lat, lon],
        status,
        source: source === 'REGISTERED' ? 'REGISTERED' : (source === 'USER_PLACED' ? 'USER_PLACED' : ''),
        address:String(raw.address || '').slice(0,500),
        desc:String(raw.desc || '다른 기기에서 불러온 ROUTE 목표 거점.').slice(0,1500),
        tips:String(raw.tips || '').slice(0,500)
      };
    }

    function sanitizeImportedViaPoints(raw) {
      if (raw == null) return [];
      if (!Array.isArray(raw) || raw.length > 100) throw new Error('invalid vias');
      raw.forEach(via => importedCoordinates(via?.coords));
      return cloneRouteViaPoints(raw);
    }

    function sanitizeImportedEndpoint(raw) {
      if (raw == null) return null;
      importedCoordinates(raw.coords);
      return cloneRouteEndpoint(raw);
    }

    function readRouteFileText(file) {
      if (file && typeof file.text === 'function') {
        return file.text();
      }
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error || new Error('file read failed'));
        reader.readAsText(file);
      });
    }

    async function importRouteFile(file) {
      if (!file) return;
      if (file.size > ROUTE_IMPORT_MAX_BYTES) {
        alert('ROUTE 파일이 너무 큽니다.');
        return;
      }
      try {
        const raw = JSON.parse(await readRouteFileText(file));
        const fileVersion = Number(raw?.version);
        if (raw?.format !== ROUTE_FILE_FORMAT || ![1,2,3].includes(fileVersion)) throw new Error('unsupported route format');
        const target = sanitizeImportedTarget(raw.target);
        const budget = { count:0 };
        const segments = sanitizeImportedRouteSegments(raw?.routePlan?.segments, false, budget);
        const routePlan = {
          segments,
          markSegments:fileVersion >= 3 ? sanitizeImportedRouteSegments(raw?.routePlan?.markSegments, true, budget) : [],
          viaPoints:fileVersion >= 2 ? sanitizeImportedViaPoints(raw?.routePlan?.viaPoints) : [],
          startPoint:fileVersion >= 3 ? sanitizeImportedEndpoint(raw?.routePlan?.startPoint) : null,
          endPoint:fileVersion >= 3 ? sanitizeImportedEndpoint(raw?.routePlan?.endPoint) : null,
          distanceKm:Number(routeLengthKm(segments).toFixed(3)),
          updatedAt:String(raw?.routePlan?.updatedAt || raw?.exportedAt || new Date().toISOString())
        };

        // Validate the complete file before any write, then preserve the outgoing PLAN.
        if (!preserveActivePlan()) return;
        const registered = RECON_TARGETS.find(item => String(item.id) === String(target.id));
        let importedTarget;
        if (registered) {
          saveRegisteredRoutePlan(registered, routePlan);
          importedTarget = { ...registered, routePlan };
        } else {
          const list = getLocalIntel();
          const idx = list.findIndex(item => String(item.id) === String(target.id));
          if (idx >= 0) {
            list[idx].routePlan = routePlan;
            importedTarget = list[idx];
          } else {
            importedTarget = {
              ...target,
              status: target.status === 'REGISTERED' ? 'UNEXPLORED' : target.status,
              source: target.source === 'REGISTERED' ? '' : target.source,
              routePlan,
              importedAt:new Date().toISOString()
            };
            list.unshift(importedTarget);
          }
          saveLocalIntel(list);
        }
        closeWpDrawer();
        enterTargetMode(importedTarget);
        alert(`ROUTE 불러오기 완료\n${importedTarget.name}`);
      } catch (e) {
        console.warn('ROUTE 불러오기 실패:', e);
        alert('ROUTE 파일을 불러올 수 없습니다. .reconroute.json 또는 기존 .reconroute 파일인지 확인하십시오.');
      }
    }

    function exportToGPX() {
      const list = getWaypoints('ALL');
      const trackLogs = getTrackLogs();
      if (list.length === 0 && trackLogs.length === 0) {
        alert("내보낼 POINTS 또는 TRACK LOG가 없습니다.");
        return;
      }
      let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="TacticalReconFieldTerminal" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n`;
      list.forEach(wp => {
        const mgrs = calcMGRS(wp.coords[0], wp.coords[1]);
        const desc = `[${wp.status}] ${wp.opCode} / MGRS: ${mgrs}${wp.desc ? ` / ${wp.desc}` : ''}`;
        gpx += `  <wpt lat="${wp.coords[0]}" lon="${wp.coords[1]}">\n`;
        gpx += `    <name>${escapeXml(wp.name)}</name>\n`;
        gpx += `    <desc>${escapeXml(desc)}</desc>\n`;
        gpx += `    <type>Waypoint</type>\n`;
        gpx += `  </wpt>\n`;
      });
      trackLogs.forEach(log => {
        if (!Array.isArray(log.points) || log.points.length < 2) return;
        gpx += `  <trk>\n`;
        gpx += `    <name>${escapeXml(`TRACK ${log.targetName || log.targetId || ''}`)}</name>\n`;
        gpx += `    <desc>${escapeXml(`Actual track / ${(Number(log.distanceKm)||0).toFixed(2)} km`)}</desc>\n`;
        gpx += `    <trkseg>\n`;
        log.points.forEach(pt => {
          if (!Array.isArray(pt) || pt.length < 2) return;
          const lat = Number(pt[0]), lon = Number(pt[1]), ts = Number(pt[2]);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          gpx += `      <trkpt lat="${lat}" lon="${lon}">`;
          if (Number.isFinite(ts) && ts > 0) gpx += `<time>${new Date(ts).toISOString()}</time>`;
          gpx += `</trkpt>\n`;
        });
        gpx += `    </trkseg>\n  </trk>\n`;
      });
      gpx += `</gpx>`;

      const blob = new Blob([gpx], { type: 'application/gpx+xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `TACTICAL_RECON_${new Date().toISOString().substring(0,10)}.gpx`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        a.remove();
      }, 1500);
    }

    function openFieldControls(section) {
      const tray = document.getElementById('fieldControlTray');
      const title = document.getElementById('fieldControlTitle');
      const titles = { menu:'FIELD MENU', radar: 'NEARBY / SEARCH RANGE', layers: 'LAYERS / MARKER DISPLAY', target: 'RECON / TARGET SELECTION', optic: 'DISPLAY / MODE' };
      title.innerText = titles[section] || 'FIELD CONTROLS';
      tray.querySelectorAll('.field-control-section').forEach(el => el.classList.remove('active'));
      const target = document.getElementById(`control-${section}`);
      if (target) target.classList.add('active');
      tray.classList.add('open');
    }

    function closeFieldControls() {
      document.getElementById('fieldControlTray').classList.remove('open');
    }

    // 작은 FIELD CONTROL 패널은 지도 탭으로 닫는다. POINTS/POINT INFO은 명시적 닫기 유지.
    map.on('click', () => { if (!routeDrawEnabled) closeFieldControls(); });
    map.on('dragstart', () => {
      closeFieldControls();
      if (gpsFollowEnabled) {
        gpsFollowEnabled = false;
        if (navMapOrientation === 'TRACK') stopTrackUpRotation(true);
        updateGpsTelemetry();
        if (targetModeActive) updateTargetModePanel();
      }
    });
    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      if (routeDrawEnabled) setMapRouteDrawInteraction(false);
      else if (targetModeActive) exitTargetMode();
      else closeFieldControls();
    });
    document.getElementById('routeLocateInput')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') { event.preventDefault(); searchRouteLocate(); }
    });

    document.getElementById('addressSearchInput')?.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchKoreanAddress();
      }
    });

    const routeImportInput = document.getElementById('routeImportInput');
    routeImportInput?.addEventListener('click', event => { event.currentTarget.value = ''; });
    routeImportInput?.addEventListener('change', async event => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      try {
        await importRouteFile(file);
      } finally {
        input.value = '';
      }
    });

    ['pointPlacementBackdrop','addressSearchBackdrop','routeLocateBackdrop','routePointsBackdrop','gpsDetailBackdrop','navOpticBackdrop','promoModalBackdrop'].forEach(id => {
      const backdrop = document.getElementById(id);
      if (!backdrop) return;
      backdrop.addEventListener('dblclick', event => {
        event.preventDefault();
        event.stopPropagation();
      }, { passive:false });
      backdrop.addEventListener('pointerdown', event => event.stopPropagation());
      backdrop.addEventListener('pointerup', event => event.stopPropagation());
      backdrop.addEventListener('click', event => event.stopPropagation());
    });


    /* ============================================================
       V26 // FIELD FUNCTION EXTENSIONS
       ============================================================ */
    function cloneRouteEndpoint(value) {
      if (!value || !Array.isArray(value.coords) || value.coords.length < 2) return null;
      const lat=Number(value.coords[0]), lon=Number(value.coords[1]);
      if (!Number.isFinite(lat)||!Number.isFinite(lon)||lat<-90||lat>90||lon<-180||lon>180) return null;
      return { name:String(value.name||'POINT').slice(0,80), coords:[lat,lon], source:String(value.source||'PLAN').slice(0,30) };
    }

    function fieldDivIcon(cls,label) {
      return L.divIcon({ className:'', iconSize:[26,26], iconAnchor:[13,13], html:`<div class="${cls}"><span class="v26-map-label">${label}</span></div>` });
    }

    function getHomePoint() {
      try { return cloneRouteEndpoint(JSON.parse(localStorage.getItem(HOME_POINT_STORAGE_KEY)||'null')); } catch(e) { return null; }
    }

    function renderHomeMarker() {
      const home=getHomePoint();
      if (home) {
        if (!homeMarker) homeMarker=L.marker(home.coords,{icon:fieldDivIcon('home-marker','HOME'),keyboard:false,zIndexOffset:55});
        else homeMarker.setLatLng(home.coords);
        if (!map.hasLayer(homeMarker)) homeMarker.addTo(map);
      } else if (homeMarker && map.hasLayer(homeMarker)) map.removeLayer(homeMarker);
    }

    function setHomeAtReticle() {
      const c=map.getCenter();
      const home={name:'HOME / EXIT',coords:[c.lat,c.lng],source:'RETICLE'};
      try { localStorage.setItem(HOME_POINT_STORAGE_KEY,JSON.stringify(home)); refreshPositionState(); }
      catch(e){ alert('HOME 저장에 실패했습니다.'); }
    }

    function centerHome() {
      const home=getHomePoint();
      if (!home) { alert('HOME / EXIT가 설정되지 않았습니다.'); return; }
      map.setView(home.coords,Math.max(map.getZoom(),14),{animate:false}); flushReticleTelemetry();
    }

    function clearHomePoint() {
      try { localStorage.removeItem(HOME_POINT_STORAGE_KEY); }
      catch (e) { alert('HOME 삭제에 실패했습니다.'); return; }
      if (homeMarker) map.removeLayer(homeMarker);
      homeMarker = null;
      refreshPositionState();
    }

    function refreshPositionState() {
      renderHomeMarker();
      syncGpsMarkerVisibility(); syncMarkerVisibility(); syncTargetReferenceLine();
      updateActiveTargetNavigation(); updateGpsTelemetry(); updateTargetModePanel(); updateGpsDetail();
    }

    function renderTempMark() {
      if (!tempMarkPoint) { if(tempMarkMarker&&map.hasLayer(tempMarkMarker)) map.removeLayer(tempMarkMarker); return; }
      if (!tempMarkMarker) tempMarkMarker=L.marker(tempMarkPoint.coords,{icon:fieldDivIcon('temp-marker','TEMP POS'),keyboard:false,zIndexOffset:70});
      else tempMarkMarker.setLatLng(tempMarkPoint.coords);
      if (!map.hasLayer(tempMarkMarker)) tempMarkMarker.addTo(map);
      updateTargetModePanel();
    }

    function setTempMark(coords,name='TEMP POS') {
      const lat=Number(coords?.[0]), lon=Number(coords?.[1]);
      if(!validCoordinates([lat,lon])) return;
      tempMarkPoint={name,coords:[lat,lon],source:'TEMP'}; renderTempMark(); refreshPositionState();
    }
    function setTempMarkAtReticle(){ const c=map.getCenter(); setTempMark([c.lat,c.lng]); }
    function setTempMarkFromSelectedSearch(){
      if(!selectedAddressResult) return; const r={...selectedAddressResult}; setTempMark([r.lat,r.lon],r.name||'TEMP POS'); closeAddressSearch(); map.setView([r.lat,r.lon],Math.max(map.getZoom(),15),{animate:false});
    }
    function clearTempMark(){
      tempMarkPoint=null;
      if (tempMarkMarker) map.removeLayer(tempMarkMarker);
      tempMarkMarker=null;
      refreshPositionState();
    }

    function referenceLabel(type){ return type === 'TEMP' ? 'TEMP POS' : (type || 'NONE'); }

    function getReferencePosition(){
      if(gpsPowerEnabled && hasGpsFix) return {type:'GPS',coords:[baseLocation[0],baseLocation[1]]};
      if(tempMarkPoint?.coords) return {type:'TEMP',coords:[...tempMarkPoint.coords]};
      return null;
    }

    function refreshGpsPowerUi(){
      const label=document.getElementById('gpsPowerLabel');
      const btn=document.getElementById('gpsPowerBtn');
      const center=document.getElementById('primaryCenterBtn');
      if(label) label.innerText=gpsPowerEnabled ? (hasGpsFix?'GPS ON':'GPS WAIT') : 'GPS OFF';
      if(btn) btn.classList.toggle('active',gpsPowerEnabled);
      if(center) center.innerText='RECENTER';
      document.querySelectorAll('.gps-follow-toggle').forEach(el => {
        el.textContent = gpsFollowEnabled ? 'FOLLOW ON' : 'FOLLOW OFF';
        el.classList.toggle('active',gpsFollowEnabled);
        el.setAttribute('aria-pressed',String(gpsFollowEnabled));
        el.disabled = !gpsPowerEnabled || !hasGpsFix;
      });
    }

    function startGpsTracking(recenter=false){
      if(!navigator.geolocation){ alert('브라우저가 GPS를 지원하지 않습니다.'); return; }
      const session = ++gpsSessionId;
      if (gpsWatchId !== null) navigator.geolocation.clearWatch(gpsWatchId);
      gpsWatchId = null;
      gpsPowerEnabled=true; gpsLockState='ACQUIRING'; updateGpsTelemetry();
      const isCurrent = () => gpsPowerEnabled && session === gpsSessionId;
      const onError = (initial) => {
        if (!isCurrent()) return;
        gpsLockState = initial ? 'NO FIX' : 'SIGNAL LOST';
        hasGpsFix = false; gpsFollowEnabled = false; currentGpsAltitude = null;
        if (initial) { pendingNavStart = false; pendingTrackStart = false; }
        refreshPositionState();
        if (initial) alert('GPS 수신 실패. 위치 권한을 확인하십시오.');
      };
      const onOk = pos => {
        if (!isCurrent()) return;
        applyGpsPosition(pos,recenter,session);
        if (isCurrent() && gpsWatchId === null) gpsWatchId = navigator.geolocation.watchPosition(
          p => { if (isCurrent()) applyGpsPosition(p,false,session); },
          () => onError(false), {enableHighAccuracy:true,maximumAge:5000,timeout:15000});
      };
      navigator.geolocation.getCurrentPosition(onOk,()=>onError(true),{enableHighAccuracy:true,maximumAge:0,timeout:15000});
    }

    function stopGpsTracking(){
      gpsSessionId++;
      if(gpsWatchId!==null){ try{navigator.geolocation.clearWatch(gpsWatchId);}catch(e){} gpsWatchId=null; }
      gpsPowerEnabled=false; hasGpsFix=false; gpsLockState='OFF'; gpsFollowEnabled=false; pendingNavStart=false; pendingTrackStart=false; currentGpsAltitude=null;
      if(trackRecording) stopTrackRecording(true,true);
      latestGpsPosition = null;
      refreshPositionState();
    }

    function toggleGpsPower(){ gpsPowerEnabled ? stopGpsTracking() : startGpsTracking(true); }
    function locateUser(){ if(!gpsPowerEnabled) startGpsTracking(true); else if(hasGpsFix) recenterPrimary(); else startGpsTracking(true); }
    function recenterPrimary(){
      if(gpsPowerEnabled&&hasGpsFix){ map.setView(baseLocation,Math.max(map.getZoom(),13),{animate:false}); flushReticleTelemetry(); return; }
      if(tempMarkPoint){ map.setView(tempMarkPoint.coords,Math.max(map.getZoom(),14),{animate:false}); flushReticleTelemetry(); return; }
      alert('GPS FIX 또는 TEMP POS가 필요합니다.');
    }

    function openPlanShortcut(){
      if(targetModeActive){ updateTargetModePanel(); return; }
      if(currentActiveTarget?.coords){ enterTargetModeFromSitrep(); return; }
      openWpDrawer();
    }

    function toggleRoadBoost(btn){
      roadBoostEnabled=!roadBoostEnabled;
      syncNetworkBasemap();
      if(btn) btn.classList.toggle('active',roadBoostEnabled);
    }

    function toggleDrawKind(){
      if(!targetModeActive||targetModePhase!=='PLAN') return;
      routeDrawKind=routeDrawKind==='ROUTE'?'MARK':'ROUTE';
      if(routeCurrentPolyline) cancelCurrentRouteStroke();
      updateTargetModePanel();
    }

    function renderRouteEndpoints(){
      if(routeStartMarker&&map.hasLayer(routeStartMarker)) map.removeLayer(routeStartMarker);
      if(routeEndMarker&&map.hasLayer(routeEndMarker)) map.removeLayer(routeEndMarker);
      routeStartMarker=routeEndMarker=null;
      if(!targetModeActive) return;
      if(routeStartPoint){ routeStartMarker=L.marker(routeStartPoint.coords,{icon:fieldDivIcon('route-start-marker','START'),keyboard:false,zIndexOffset:48}).addTo(map); }
      if(routeEndPoint){ routeEndMarker=L.marker(routeEndPoint.coords,{icon:fieldDivIcon('route-end-marker','END'),keyboard:false,zIndexOffset:48}).addTo(map); }
    }

    function routePointLabel(p){ return p?.coords ? `${p.name||'POINT'} · ${p.coords[0].toFixed(5)}, ${p.coords[1].toFixed(5)}` : 'NOT SET'; }
    function updateRoutePointsModal(){
      const sEl=document.getElementById('routeStartReadout'), tEl=document.getElementById('routeTargetReadout'), eEl=document.getElementById('routeEndReadout');
      if(sEl) sEl.innerText=routePointLabel(routeStartPoint); if(tEl) tEl.innerText=routePointLabel(targetModeTarget); if(eEl) eEl.innerText=routePointLabel(routeEndPoint);
      document.getElementById('routeViaReadout').textContent = `${routeViaPoints.length} VIA`;
    }
    function assignPlanPoint(role, point) {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !validCoordinates(point?.coords)) return false;
      const snapshot = cloneRouteEndpoint(point);
      if (role === 'START') routeStartPoint = snapshot;
      else if (role === 'END') routeEndPoint = snapshot;
      else if (role === 'VIA') {
        if (routeViaPoints.length >= 100) { alert('VIA는 최대 100개까지 지정할 수 있습니다.'); return false; }
        routeViaPoints.push({...snapshot, id:`VIA-${Date.now()}-${routeViaPoints.length+1}`, address:String(point.address || '').slice(0,500)});
      } else return false;
      routeDirty = true;
      renderRouteEndpoints(); renderRouteViaPoints(); updateTargetModePanel();
      return true;
    }

    function setPlanPointFromSource(role, source) {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      if (source === 'INPUT') { openRouteLocate(role); return; }
      let coords;
      if (source === 'GPS' && gpsPowerEnabled && hasGpsFix) coords = baseLocation;
      else if (source === 'HOME') coords = getHomePoint()?.coords;
      else if (source === 'TEMP') coords = tempMarkPoint?.coords;
      else if (source === 'RETICLE') { const c = map.getCenter(); coords = [c.lat,c.lng]; }
      if (!coords) { alert(`${source === 'TEMP' ? 'TEMP POS' : source} 위치를 사용할 수 없습니다.`); return; }
      assignPlanPoint(role, {name:`${source === 'TEMP' ? 'TEMP POS' : source} ${role}`,coords:[...coords],source});
    }
    function openRoutePoints(){ if(!targetModeActive||targetModePhase!=='PLAN')return; setMapRouteDrawInteraction(false);updateRoutePointsModal();document.getElementById('routePointsBackdrop').style.display='flex'; }
    function closeRoutePoints(){ document.getElementById('routePointsBackdrop').style.display='none'; }
    function setRouteStartFromReference(){ const r=getReferencePosition(); if(!r){alert('GPS FIX 또는 TEMP POS가 필요합니다.');return;} routeStartPoint={name:r.type==='GPS'?'GPS START':'TEMP POS START',coords:[...r.coords],source:r.type};routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel(); }
    function setRouteStartFromReticle(){ const c=map.getCenter();routeStartPoint={name:'RETICLE START',coords:[c.lat,c.lng],source:'RETICLE'};routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel(); }
    function clearRouteStart(){routeStartPoint=null;routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel();}
    function setRouteEndFromReticle(){ const c=map.getCenter();routeEndPoint={name:'END',coords:[c.lat,c.lng],source:'RETICLE'};routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel(); }
    function setRouteEndFromHome(){const h=getHomePoint();if(!h){alert('HOME / EXIT가 설정되지 않았습니다.');return;}routeEndPoint={...h,name:'HOME / END'};routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel();}
    function clearRouteEnd(){routeEndPoint=null;routeDirty=true;renderRouteEndpoints();updateRoutePointsModal();updateTargetModePanel();}

    function getBacktrackDestination(){
      if(!trackLogPoints.length) return null;
      const ref=getReferencePosition(); if(!ref?.coords) return {name:'BACKTRACK START',coords:[trackLogPoints[0][0],trackLogPoints[0][1]]};
      let best=0,bestD=Infinity;
      for(let i=0;i<trackLogPoints.length;i++){ const p=trackLogPoints[i]; const d=calcDistanceKmRaw(ref.coords[0],ref.coords[1],p[0],p[1]); if(d<bestD){bestD=d;best=i;} }
      const idx=Math.max(0,best-8); const p=trackLogPoints[idx]; return {name:idx===0?'BACKTRACK START':'BACKTRACK',coords:[p[0],p[1]]};
    }
    function getCurrentNavDestination(){ if(backtrackActive)return getBacktrackDestination(); if(navLegIndex>=1&&routeEndPoint)return routeEndPoint; return targetModeTarget; }
    function nextNavLeg(){ if(!targetModeActive||targetModePhase!=='NAV'||!routeEndPoint||backtrackActive)return; if(navLegIndex===0){ navLegTimes[0]=Date.now()-(navLegStartedAt||Date.now()); navLegIndex=1;navLegStartedAt=Date.now();updateTargetModePanel(); } }
    function toggleBacktrack(){ if(!targetModeActive||targetModePhase!=='NAV')return; if(!backtrackActive&&trackLogPoints.length<2){alert('BACKTRACK에 사용할 TRACK 기록이 없습니다.');return;} backtrackActive=!backtrackActive;gpsFollowEnabled=false;updateGpsTelemetry();updateTargetModePanel(); }

    function formatElapsed(ms){ const sec=Math.max(0,Math.floor(Number(ms||0)/1000));const h=Math.floor(sec/3600);const m=Math.floor((sec%3600)/60);const s=sec%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`; }
    function startNavElapsed(){ stopNavElapsed();navStartedAt=Date.now();navLegStartedAt=navStartedAt;navLegTimes=[];navElapsedTimer=setInterval(()=>{if(targetModeActive&&targetModePhase==='NAV')updateTargetModePanel();},1000); }
    function stopNavElapsed(){ if(navElapsedTimer){clearInterval(navElapsedTimer);navElapsedTimer=null;} }

    function openNavOptic(){document.getElementById('navOpticBackdrop').style.display='flex';}
    function closeNavOptic(){document.getElementById('navOpticBackdrop').style.display='none';}

    function updateGpsDetail(){
      const ref=getReferencePosition(); const pos=latestGpsPosition; const acc=Number(pos?.coords?.accuracy),alt=Number(pos?.coords?.altitude),speed=Number(pos?.coords?.speed);
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.innerText=v;};
      set('gpsDetailState',gpsPowerEnabled?gpsLockState:'OFF'); set('gpsDetailRef',referenceLabel(ref?.type));
      set('gpsDetailLatLon',ref?.coords?`${ref.coords[0].toFixed(6)}, ${ref.coords[1].toFixed(6)}`:'--'); set('gpsDetailMgrs',ref?.coords?calcMGRS(ref.coords[0],ref.coords[1]):'--');
      set('gpsDetailAcc',gpsPowerEnabled&&Number.isFinite(acc)?`±${Math.round(acc)} M`:'--');set('gpsDetailAlt',gpsPowerEnabled&&Number.isFinite(alt)?`${Math.round(alt)} M MSL`:'--');set('gpsDetailSpeed',gpsPowerEnabled&&Number.isFinite(speed)?`${(speed*3.6).toFixed(1)} KM/H`:'--');set('gpsDetailNetwork',navigator.onLine?'ONLINE':'OFFLINE');
      const home=getHomePoint();
      if(home?.coords && ref?.coords){ const d=calcDistanceKmRaw(ref.coords[0],ref.coords[1],home.coords[0],home.coords[1]); set('gpsDetailHome',`${d.toFixed(d<10?1:0)} KM · BRG ${calcBearing(ref.coords[0],ref.coords[1],home.coords[0],home.coords[1])}`); }
      else set('gpsDetailHome',home?.coords?'NO POSITION REFERENCE':'NOT SET');
    }
    function openGpsDetail(){closeFieldControls();updateGpsDetail();document.getElementById('gpsDetailBackdrop').style.display='flex';}
    function closeGpsDetail(){document.getElementById('gpsDetailBackdrop').style.display='none';}
    async function copyFieldPosition(){const r=getReferencePosition();if(!r?.coords){alert('복사할 위치가 없습니다.');return;}const txt=`WGS84 ${r.coords[0].toFixed(6)}, ${r.coords[1].toFixed(6)}\nMGRS ${calcMGRS(r.coords[0],r.coords[1])}`;try{await navigator.clipboard.writeText(txt);}catch(e){const ta=document.createElement('textarea');ta.value=txt;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();}}

    function quickOfflineMark(){
      const ref=getReferencePosition(); if(!ref?.coords){alert('GPS FIX 또는 TEMP POS가 필요합니다.');return;}
      const memo=prompt('FIELD POINT 메모 (선택)')||''; const now=Date.now(); const d=new Date(); const hh=String(d.getHours()).padStart(2,'0'),mm=String(d.getMinutes()).padStart(2,'0');
      const point={id:`WP-${now}`,opCode:`OP-MARK-${String(now).slice(-6)}`,name:`FIELD POINT ${hh}${mm}`,coords:[...ref.coords],desc:memo||`오프라인 현장 표식 · ${referenceLabel(ref.type)} 기준`,tips:'',status:'UNEXPLORED',createdAt:new Date(now).toISOString(),source:'USER_PLACED',address:''};
      try{const list=getLocalIntel();list.unshift(point);saveLocalIntel(list);renderAllMarkers();updateWpCounter();}catch(e){alert('FIELD POINT 저장에 실패했습니다.');}
    }

    // Existing GPS updates feed new UI as well.
    const v26ApplyGpsPosition=applyGpsPosition;
    applyGpsPosition=function(pos,shouldRecenter=false,session=gpsSessionId){
      if (!gpsPowerEnabled || session !== gpsSessionId || !validCoordinates([pos?.coords?.latitude,pos?.coords?.longitude])) return;
      v26ApplyGpsPosition(pos,shouldRecenter); updateGpsDetail(); refreshGpsPowerUi();
    };

    // GPS off means marker really disappears, not only FOLLOW off.
    const v26SyncGpsMarkerVisibility=syncGpsMarkerVisibility;
    syncGpsMarkerVisibility=function(){ if(!gpsPowerEnabled){ if(gpsMarker&&map.hasLayer(gpsMarker))map.removeLayer(gpsMarker);return;} v26SyncGpsMarkerVisibility(); };

    // Target reference line can use TEMP when GPS is off.
    syncTargetReferenceLine=function(){
      const ref=getReferencePosition(); const shouldShow=targetModeActive&&targetModePhase!=='NAV'&&targetModeTarget&&ref?.coords;
      if(!shouldShow){if(targetReferenceLine&&map.hasLayer(targetReferenceLine))map.removeLayer(targetReferenceLine);return;}
      const pts=[ref.coords,targetModeTarget.coords];
      if(!targetReferenceLine) targetReferenceLine=L.polyline(pts,{renderer:routeRenderer,interactive:false,color:getOpticColor(),weight:1,opacity:.55,dashArray:'5,7'});
      else{targetReferenceLine.setLatLngs(pts);targetReferenceLine.setStyle({color:getOpticColor()});}
      if(!map.hasLayer(targetReferenceLine))targetReferenceLine.addTo(map);
    };

    // Persist elapsed time in TRACK log without changing legacy reader.
    const v26PersistTrackLog=persistTrackLog;
    persistTrackLog=function(){ return v26PersistTrackLog(); };

    window.addEventListener('online',()=>{updateLinkState();updateGpsDetail();});
    window.addEventListener('offline',()=>{updateLinkState();updateGpsDetail();});
    renderHomeMarker(); renderTempMark(); refreshGpsPowerUi();

    const v26BaseUpdateTargetModePanel = updateTargetModePanel;
    updateTargetModePanel = function() {
      v26BaseUpdateTargetModePanel();
      const dest=getCurrentNavDestination?.();
      const name=document.getElementById('navHudTarget');
      if(targetModeActive&&targetModePhase==='NAV'&&name&&dest?.name) name.innerText=dest.name;
      updateRoutePointsModal?.();
      refreshGpsPowerUi?.();
    };


    /* ============================================================
       V27.1 // COMPACT FIELD WORKFLOW
       ============================================================ */
    let planUiSubmode = 'MAIN';
    let planUndoStack = [];
    let selectedPlanPointRef = null;
    let planSearchToken = 0;
    let planSearchOpen = false;
    let v271ToastTimer = 0;
    let pendingDrawUndo = null;

    function setV271Sheet(id, open) {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('open', Boolean(open));
      el.setAttribute('aria-hidden', open ? 'false' : 'true');
    }

    function closePlanSearch() {
      planSearchToken++;
      planSearchOpen = false;
      setV271Sheet('planSearchSheet', false);
    }

    function closePlanPointInfo() {
      selectedPlanPointRef = null;
      setV271Sheet('planPointSheet', false);
    }

    function closeNavMore() { setV271Sheet('navMoreSheet', false); }

    function closeV271Sheets() {
      closePlanSearch();
      closePlanPointInfo();
      closeNavMore();
    }

    function showV271Toast(text) {
      const el = document.getElementById('v271Toast');
      if (!el) return;
      clearTimeout(v271ToastTimer);
      el.textContent = text;
      el.classList.add('show');
      v271ToastTimer = setTimeout(() => el.classList.remove('show'), 1000);
    }

    function capturePlanEditState() {
      return {
        startPoint:cloneRouteEndpoint(routeStartPoint),
        endPoint:cloneRouteEndpoint(routeEndPoint),
        viaPoints:cloneRouteViaPoints(routeViaPoints),
        routeSegments:cloneRouteSegments(routeDraftSegments),
        overlaySegments:cloneRouteSegments(routeMarkSegments)
      };
    }

    function recordPlanUndo(snapshot) {
      if (!snapshot || !targetModeActive || targetModePhase !== 'PLAN') return;
      planUndoStack.push(snapshot);
      if (planUndoStack.length > 40) planUndoStack.shift();
      syncKnownActionAvailability();
    }

    function restorePlanEditState(snapshot) {
      if (!snapshot) return;
      routeStartPoint = cloneRouteEndpoint(snapshot.startPoint);
      routeEndPoint = cloneRouteEndpoint(snapshot.endPoint);
      routeViaPoints = cloneRouteViaPoints(snapshot.viaPoints);
      routeDraftSegments = cloneRouteSegments(snapshot.routeSegments);
      routeMarkSegments = cloneRouteSegments(snapshot.overlaySegments);
      routeDirty = true;
      closePlanPointInfo();
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    function undoPlanEdit() {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !planUndoStack.length) return;
      restorePlanEditState(planUndoStack.pop());
    }

    function enterPlanSetMode() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      closeV271Sheets();
      setMapRouteDrawInteraction(false);
      planUiSubmode = 'SET';
      updateTargetModePanel();
    }

    function enterPlanDrawMode() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      closeV271Sheets();
      routeDrawKind = 'ROUTE';
      planUiSubmode = 'DRAW';
      setMapRouteDrawInteraction(true);
      updateTargetModePanel();
    }

    function exitPlanSubmode() {
      if (routeDrawEnabled) setMapRouteDrawInteraction(false);
      planUiSubmode = 'MAIN';
      updateTargetModePanel();
    }

    function setPlanPointAtReticle(role) {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !['START','VIA','END'].includes(role)) return;
      const c = map.getCenter();
      const snapshot = capturePlanEditState();
      const coords = [c.lat, c.lng];
      if (role === 'START') routeStartPoint = { name:'START', coords, source:'RETICLE' };
      else if (role === 'END') routeEndPoint = { name:'END', coords, source:'RETICLE' };
      else {
        if (routeViaPoints.length >= 100) return;
        routeViaPoints.push({ id:`VIA-${Date.now()}-${routeViaPoints.length+1}`, name:`VIA ${routeViaPoints.length+1}`, coords, address:'', source:'RETICLE' });
      }
      recordPlanUndo(snapshot);
      routeDirty = true;
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    function selectedPlanPoint() {
      if (!selectedPlanPointRef) return null;
      if (selectedPlanPointRef.role === 'START') return routeStartPoint;
      if (selectedPlanPointRef.role === 'END') return routeEndPoint;
      if (selectedPlanPointRef.role === 'VIA') return routeViaPoints.find(v => String(v.id) === String(selectedPlanPointRef.id)) || null;
      return null;
    }

    function openPlanPointInfo(role, id = null, event = null) {
      if (event) {
        try { event.originalEvent && L.DomEvent.stopPropagation(event.originalEvent); } catch (e) {}
      }
      if (!targetModeActive || targetModePhase !== 'PLAN' || routeDrawEnabled) return;
      selectedPlanPointRef = { role, id };
      const point = selectedPlanPoint();
      if (!point?.coords) { closePlanPointInfo(); return; }
      closePlanSearch();
      const type = document.getElementById('planPointType');
      const name = document.getElementById('planPointName');
      const wgs = document.getElementById('planPointWgs84');
      const mgrsEl = document.getElementById('planPointMgrs');
      const addr = document.getElementById('planPointAddress');
      if (type) type.textContent = role === 'VIA' ? 'VIA POINT' : `${role} POINT`;
      if (name) name.textContent = point.name || role;
      if (wgs) wgs.textContent = `${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}`;
      if (mgrsEl) mgrsEl.textContent = calcMGRS(point.coords[0], point.coords[1]);
      if (addr) {
        const address = String(point.address || '').trim();
        addr.hidden = !address;
        addr.textContent = address;
      }
      setV271Sheet('planPointSheet', true);
    }

    async function copyPlanPointValue(kind) {
      const point = selectedPlanPoint();
      if (!point?.coords) return;
      const value = kind === 'MGRS'
        ? calcMGRS(point.coords[0], point.coords[1])
        : `${point.coords[0].toFixed(6)}, ${point.coords[1].toFixed(6)}`;
      if (await writeClipboardText(value)) showV271Toast('COPIED');
    }

    function deleteSelectedPlanPoint() {
      const point = selectedPlanPoint();
      if (!point || !selectedPlanPointRef) return;
      const label = selectedPlanPointRef.role === 'VIA' ? (point.name || 'VIA') : selectedPlanPointRef.role;
      if (!confirm(`${label} 포인트를 삭제하시겠습니까?`)) return;
      const snapshot = capturePlanEditState();
      if (selectedPlanPointRef.role === 'START') routeStartPoint = null;
      else if (selectedPlanPointRef.role === 'END') routeEndPoint = null;
      else routeViaPoints = routeViaPoints.filter(v => String(v.id) !== String(selectedPlanPointRef.id));
      recordPlanUndo(snapshot);
      routeDirty = true;
      closePlanPointInfo();
      renderRouteDraft();
      renderPlanSearchPoints();
      updateTargetModePanel();
    }

    // All PLAN point markers share the same tap -> info -> delete lifecycle.
    renderRouteEndpoints = function() {
      if (routeStartMarker && map.hasLayer(routeStartMarker)) map.removeLayer(routeStartMarker);
      if (routeEndMarker && map.hasLayer(routeEndMarker)) map.removeLayer(routeEndMarker);
      routeStartMarker = routeEndMarker = null;
      if (!targetModeActive) return;
      if (routeStartPoint) {
        routeStartMarker = L.marker(routeStartPoint.coords,{icon:fieldDivIcon('route-start-marker','START'),keyboard:false,zIndexOffset:48}).addTo(map);
        routeStartMarker.on('click', e => openPlanPointInfo('START', null, e));
      }
      if (routeEndPoint) {
        routeEndMarker = L.marker(routeEndPoint.coords,{icon:fieldDivIcon('route-end-marker','END'),keyboard:false,zIndexOffset:48}).addTo(map);
        routeEndMarker.on('click', e => openPlanPointInfo('END', null, e));
      }
    };

    renderRouteViaPoints = function() {
      if (!routeViaLayer) return;
      routeViaLayer.clearLayers();
      if (!targetModeActive) return;
      routeViaPoints.forEach(via => {
        const marker = L.marker(via.coords,{icon:routeViaIcon(via),keyboard:false,riseOnHover:true}).addTo(routeViaLayer);
        marker.on('click', e => openPlanPointInfo('VIA', via.id, e));
      });
    };

    clearRouteDraft = function() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
      if (!bucket.length) return;
      const label = routeDrawKind === 'MARK' ? 'OVERLAY' : 'ROUTE';
      if (!confirm(`${label} 선을 모두 지우시겠습니까?`)) return;
      const snapshot = capturePlanEditState();
      if (routeDrawKind === 'MARK') routeMarkSegments = []; else routeDraftSegments = [];
      recordPlanUndo(snapshot);
      routeDirty = true;
      renderRouteDraft();
      updateTargetModePanel();
    };

    // Capture a PLAN snapshot before a stroke, then add it to the undo stack only when a stroke actually commits.
    routeMapContainer.addEventListener('pointerdown', event => {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !routeDrawEnabled) return;
      if (routeGestureMode || routeActivePointers.size > 1) { pendingDrawUndo = null; return; }
      if (routePointerId === event.pointerId) {
        pendingDrawUndo = {
          snapshot:capturePlanEditState(),
          before:routeDraftSegments.length + routeMarkSegments.length,
          pointerId:event.pointerId
        };
      }
    }, { passive:true });
    const settleDrawUndo = event => {
      if (!pendingDrawUndo || pendingDrawUndo.pointerId !== event.pointerId) return;
      const after = routeDraftSegments.length + routeMarkSegments.length;
      if (after > pendingDrawUndo.before) recordPlanUndo(pendingDrawUndo.snapshot);
      pendingDrawUndo = null;
    };
    routeMapContainer.addEventListener('pointerup', settleDrawUndo, { passive:true });
    routeMapContainer.addEventListener('pointercancel', () => { pendingDrawUndo = null; }, { passive:true });

    function renderPlanSearchPoints() {
      const home = getHomePoint();
      const homeBtn = document.getElementById('planSearchHomeBtn');
      const tempBtn = document.getElementById('planSearchTempBtn');
      const startBtn = document.getElementById('planSearchStartBtn');
      const endBtn = document.getElementById('planSearchEndBtn');
      if (homeBtn) homeBtn.disabled = !home?.coords;
      if (tempBtn) tempBtn.disabled = !tempMarkPoint?.coords;
      if (startBtn) startBtn.disabled = !routeStartPoint?.coords;
      if (endBtn) endBtn.disabled = !routeEndPoint?.coords;
      const list = document.getElementById('planSearchViaList');
      if (!list) return;
      list.textContent = '';
      if (!routeViaPoints.length) {
        const empty = document.createElement('div');
        empty.className = 'v271-via-empty';
        empty.textContent = 'NO VIA';
        list.appendChild(empty);
        return;
      }
      routeViaPoints.forEach((via,index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'osb-btn';
        btn.textContent = `VIA ${String(index+1).padStart(2,'0')} · ${via.name || 'POINT'}`;
        btn.onclick = () => movePlanMapTo(via.coords);
        list.appendChild(btn);
      });
    }

    function openPlanSearch() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      setMapRouteDrawInteraction(false);
      planUiSubmode = 'MAIN';
      closePlanPointInfo();
      closeNavMore();
      planSearchToken++;
      planSearchOpen = true;
      const input = document.getElementById('planSearchInput');
      const results = document.getElementById('planSearchResults');
      const button = document.getElementById('planSearchGoBtn');
      if (input) input.value = '';
      if (results) results.innerHTML = '<div class="address-search-empty">주소·좌표·MGRS를 입력하십시오.</div>';
      if (button) button.disabled = false;
      renderPlanSearchPoints();
      setV271Sheet('planSearchSheet', true);
      updateTargetModePanel();
      setTimeout(() => input?.focus(), 80);
    }

    function movePlanMapTo(coords, zoom = 15) {
      if (!validCoordinates(coords)) return;
      closePlanSearch();
      map.setView(coords, Math.max(map.getZoom(), zoom), {animate:false});
      flushReticleTelemetry();
    }
    function movePlanToHome() { const p=getHomePoint(); if (p?.coords) movePlanMapTo(p.coords,14); }
    function movePlanToTemp() { if (tempMarkPoint?.coords) movePlanMapTo(tempMarkPoint.coords,14); }
    function movePlanToPoint(role) {
      const p = role === 'START' ? routeStartPoint : role === 'END' ? routeEndPoint : null;
      if (p?.coords) movePlanMapTo(p.coords,15);
    }

    function appendPlanSearchResult(result, title, subtitle) {
      const results = document.getElementById('planSearchResults');
      if (!results || !result) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'address-search-item';
      const name = document.createElement('span');
      name.className = 'address-search-name';
      name.textContent = title;
      const coords = document.createElement('span');
      coords.className = 'address-search-coords';
      coords.textContent = subtitle;
      btn.append(name, coords);
      btn.onclick = () => movePlanMapTo([result.lat,result.lon],16);
      results.appendChild(btn);
    }

    async function searchPlanLocation() {
      if (!targetModeActive || targetModePhase !== 'PLAN') return;
      const input = document.getElementById('planSearchInput');
      const results = document.getElementById('planSearchResults');
      const button = document.getElementById('planSearchGoBtn');
      const query = input?.value.trim();
      if (!query || !results) { input?.focus(); return; }
      const token = ++planSearchToken;
      results.innerHTML = '<div class="address-search-empty">SEARCHING...</div>';
      if (button) button.disabled = true;
      try {
        const direct = parseDirectRouteLocation(query);
        if (direct) {
          if (token !== planSearchToken) return;
          results.textContent = '';
          appendPlanSearchResult(direct, `${direct.source} COORDINATE`, `${direct.lat.toFixed(6)}, ${direct.lon.toFixed(6)} · ${calcMGRS(direct.lat,direct.lon)}`);
          return;
        }
        if (!navigator.onLine) {
          results.innerHTML = '<div class="address-search-empty">OFFLINE · 주소 검색은 사용할 수 없습니다. WGS84 또는 MGRS를 입력하십시오.</div>';
          return;
        }
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=kr&limit=6&addressdetails=1&accept-language=ko&q=${encodeURIComponent(query)}`;
        const res = await fetch(url,{headers:{Accept:'application/json'}});
        if (!res.ok) throw new Error('search failed');
        const data = await res.json();
        if (token !== planSearchToken) return;
        results.textContent = '';
        if (!Array.isArray(data) || !data.length) {
          results.innerHTML = '<div class="address-search-empty">검색 결과가 없습니다.</div>';
          return;
        }
        data.forEach(row => {
          const lat=Number(row.lat), lon=Number(row.lon);
          if (!Number.isFinite(lat)||!Number.isFinite(lon)) return;
          const address=normalizeKoreanAddress(row,row.display_name||query);
          appendPlanSearchResult({lat,lon}, address || row.display_name || query, `${lat.toFixed(5)}, ${lon.toFixed(5)} · ${calcMGRS(lat,lon)}`);
        });
      } catch (e) {
        if (token !== planSearchToken) return;
        results.innerHTML = '<div class="address-search-empty">위치 검색에 실패했습니다.</div>';
      } finally {
        if (button && token === planSearchToken) button.disabled = false;
      }
    }

    function handlePlanInfoKey(event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      startTargetNavigation();
    }

    function centerGpsNow() {
      if (!gpsPowerEnabled || !hasGpsFix) return;
      map.setView(baseLocation, Math.max(map.getZoom(),13), {animate:false});
      flushReticleTelemetry();
    }

    // Power and centering are intentionally separate controls in V27.1.
    toggleGpsPower = function() {
      if (!navigator.geolocation) return;
      gpsPowerEnabled ? stopGpsTracking() : startGpsTracking(false);
    };

    recenterPrimary = function() {
      const ref=getReferencePosition();
      if (!ref?.coords) return;
      map.setView(ref.coords, Math.max(map.getZoom(), ref.type === 'GPS' ? 13 : 14), {animate:false});
      flushReticleTelemetry();
    };

    // GPS marker is global while GPS is ON+FIX; PLAN no longer has a separate MY POS visibility toggle.
    syncGpsMarkerVisibility = function() {
      if (!gpsMarker) return;
      const shouldShow = gpsPowerEnabled && hasGpsFix;
      const shown = map.hasLayer(gpsMarker);
      if (shouldShow && !shown) gpsMarker.addTo(map);
      if (!shouldShow && shown) map.removeLayer(gpsMarker);
    };

    function navSequence() {
      const seq = routeViaPoints.filter(v => validCoordinates(v?.coords)).map(v => ({...v, __navRole:'VIA'}));
      if (targetModeTarget?.coords) seq.push({...targetModeTarget, __navRole:'TARGET'});
      if (routeEndPoint?.coords) seq.push({...routeEndPoint, __navRole:'END'});
      return seq;
    }

    getCurrentNavDestination = function() {
      if (backtrackActive) return getBacktrackDestination();
      const seq = navSequence();
      return seq[Math.min(navLegIndex, Math.max(0,seq.length-1))] || targetModeTarget;
    };

    function hasNextNavLeg() {
      if (backtrackActive) return false;
      return navLegIndex < navSequence().length - 1;
    }

    nextNavLeg = function() {
      if (!targetModeActive || targetModePhase !== 'NAV' || !hasNextNavLeg()) return;
      navLegTimes[navLegIndex] = Date.now() - (navLegStartedAt || Date.now());
      navLegIndex += 1;
      navLegStartedAt = Date.now();
      updateTargetModePanel();
    };

    startTargetNavigation = function() {
      if (!targetModeActive || targetModePhase !== 'PLAN' || !targetModeTarget) return;
      const ref=getReferencePosition();
      if (!ref?.coords) return;
      if (!preserveActivePlan()) return;
      closeV271Sheets();
      setMapRouteDrawInteraction(false);
      planUiSubmode='MAIN';
      activateTargetNavigation();
    };

    function stopTargetNavigation() {
      if (!targetModeActive || targetModePhase !== 'NAV') return;
      navLegTimes[navLegIndex] = Date.now() - (navLegStartedAt || Date.now());
      closeNavMore();
      navPanelCollapsed=false;
      returnToTargetPlan();
    }

    function openNavMore() {
      if (!targetModeActive || targetModePhase !== 'NAV' || navPanelCollapsed) return;
      closePlanSearch(); closePlanPointInfo();
      setV271Sheet('navMoreSheet', true);
      syncKnownActionAvailability();
    }

    const v271ToggleNavPanelCollapse = toggleNavPanelCollapse;
    toggleNavPanelCollapse = function(event) {
      closeNavMore();
      v271ToggleNavPanelCollapse(event);
    };

    const v271CopyPointCoordinate = copyPointCoordinate;
    copyPointCoordinate = async function(id) {
      await v271CopyPointCoordinate(id);
      const el=document.getElementById(id);
      if (el?.parentElement?.querySelector('.coord-copy-feedback')?.textContent === 'COPIED') showV271Toast('COPIED');
    };

    function syncKnownActionAvailability() {
      const ref=getReferencePosition();
      const gpsReady=Boolean(gpsPowerEnabled && hasGpsFix);
      const gpsBtn=document.getElementById('gpsPowerBtn');
      const gpsCenter=document.getElementById('gpsCenterBtn');
      const primaryCenter=document.getElementById('primaryCenterBtn');
      if (gpsBtn) {
        gpsBtn.disabled = !navigator.geolocation;
        gpsBtn.classList.toggle('active', gpsPowerEnabled);
        gpsBtn.setAttribute('aria-pressed', String(gpsPowerEnabled));
      }
      if (gpsCenter) gpsCenter.disabled = !gpsReady;
      if (primaryCenter) primaryCenter.disabled = !ref?.coords;

      const undoDisabled = planUndoStack.length === 0;
      const undo=document.getElementById('planUndoBtn');
      const drawUndo=document.getElementById('drawUndoBtn');
      if (undo) undo.disabled=undoDisabled;
      if (drawUndo) drawUndo.disabled=undoDisabled;
      const clear=document.getElementById('drawClearBtn');
      if (clear) clear.disabled=(routeDrawKind==='MARK'?routeMarkSegments:routeDraftSegments).length===0;

      const planHead=document.getElementById('planInfoTrigger');
      const hint=document.getElementById('planNavHint');
      const navReady=Boolean(targetModeActive && targetModePhase==='PLAN' && ref?.coords);
      if (!document.body.classList.contains('v28-integrated')) {
        if (planHead) {
          planHead.classList.toggle('nav-unavailable',!navReady);
          planHead.setAttribute('aria-disabled',String(!navReady));
          planHead.tabIndex=navReady?0:-1;
        }
        if (hint) hint.textContent=navReady?'TAP TO START':'POSITION REQUIRED';
      }

      const shareReady=routeDraftSegments.length>0;
      const share=document.getElementById('targetShareBtn');
      const shareNav=document.getElementById('targetShareNavBtn');
      if (share) share.disabled=!shareReady;
      if (shareNav) shareNav.disabled=!shareReady;

      const recenter=document.getElementById('targetRecenterBtn');
      if (recenter) recenter.disabled=!ref?.coords;
      const nextDisabled=!hasNextNavLeg();
      const next=document.getElementById('targetNextLegBtn');
      const nextCompact=document.getElementById('navCollapsedNextLegBtn');
      if (next) next.disabled=nextDisabled;
      if (nextCompact) nextCompact.disabled=nextDisabled;

      const track=document.getElementById('targetTrackRecBtn');
      if (track) track.disabled=!(trackRecording || pendingTrackStart || gpsReady);
      const back=document.getElementById('targetBacktrackBtn');
      if (back) back.disabled=!backtrackActive && trackLogPoints.length<2;

      document.querySelectorAll('[data-radius]').forEach(btn => {
        btn.disabled = String(btn.dataset.radius) !== 'all' && !gpsReady;
      });
      const centerHomeBtn=document.querySelector('button[onclick*="centerHome()"]');
      const clearHomeBtn=document.querySelector('button[onclick*="clearHomePoint()"]');
      const clearTempBtn=document.querySelector('button[onclick*="clearTempMark()"]');
      const quickMarkBtn=document.querySelector('button[onclick*="quickOfflineMark()"]');
      if (centerHomeBtn) centerHomeBtn.disabled=!getHomePoint()?.coords;
      if (clearHomeBtn) clearHomeBtn.disabled=!getHomePoint()?.coords;
      if (clearTempBtn) clearTempBtn.disabled=!tempMarkPoint?.coords;
      if (quickMarkBtn) quickMarkBtn.disabled=!ref?.coords;
      document.querySelectorAll('button[onclick*="deployRegisteredRecon"],button[onclick*="deployWildRecon"]').forEach(btn => {
        btn.disabled = selectedRadius !== 'all' && !gpsReady;
      });

      renderPlanSearchPoints();
    }

    const v271RefreshGpsPowerUi = refreshGpsPowerUi;
    refreshGpsPowerUi = function() {
      v271RefreshGpsPowerUi();
      const label=document.getElementById('gpsPowerLabel');
      if (label) label.textContent='GPS';
      syncKnownActionAvailability();
    };

    const v271UpdateTargetModePanel = updateTargetModePanel;
    updateTargetModePanel = function() {
      v271UpdateTargetModePanel();
      document.body.classList.toggle('plan-set-submode',targetModeActive&&targetModePhase==='PLAN'&&planUiSubmode==='SET');
      document.body.classList.toggle('plan-draw-submode',targetModeActive&&targetModePhase==='PLAN'&&planUiSubmode==='DRAW');
      const kind=document.getElementById('targetDrawKindBtn');
      if (kind) {
        kind.textContent=routeDrawKind==='MARK'?'OVERLAY':'ROUTE';
        kind.classList.toggle('active',routeDrawKind==='MARK');
      }
      const seq=navSequence();
      const dest=getCurrentNavDestination();
      const leg=document.getElementById('navHudLeg');
      const label=document.getElementById('navHudDistanceLabel');
      if (targetModeActive&&targetModePhase==='NAV'&&!backtrackActive&&dest) {
        if (leg) leg.textContent=`LEG ${Math.min(navLegIndex+1,Math.max(seq.length,1))}/${Math.max(seq.length,1)} · ${dest.__navRole||'TARGET'}`;
        if (label) label.textContent=`DIRECT TO ${dest.__navRole||'TARGET'}`;
      }
      syncKnownActionAvailability();
      updateMapScale();
    };

    const v271EnterTargetMode = enterTargetMode;
    enterTargetMode = function(target) {
      const beforeId=targetModeTarget?.id;
      v271EnterTargetMode(target);
      if (targetModeActive && String(targetModeTarget?.id||'') !== String(beforeId||'')) {
        planUndoStack=[];
        planUiSubmode='MAIN';
        closeV271Sheets();
        updateTargetModePanel();
      }
    };

    const v271ExitTargetMode = exitTargetMode;
    exitTargetMode = function(force=false) {
      const wasActive=targetModeActive;
      closeV271Sheets();
      v271ExitTargetMode(force);
      if (wasActive && !targetModeActive) {
        planUndoStack=[];
        planUiSubmode='MAIN';
        document.body.classList.remove('plan-set-submode','plan-draw-submode');
      }
    };

    const v271ReturnToTargetPlan = returnToTargetPlan;
    returnToTargetPlan = function() {
      closeNavMore();
      v271ReturnToTargetPlan();
      planUiSubmode='MAIN';
      updateTargetModePanel();
    };

    // Better two-finger draw gesture: smaller zoom increments avoid the V27 one-level jump feel.
    const v271HandleRoutePointerMove = handleRoutePointerMove;
    handleRoutePointerMove = function(event) {
      if (!targetModeActive || !routeDrawEnabled || !routeActivePointers.has(event.pointerId) || !routeGestureMode) {
        return v271HandleRoutePointerMove(event);
      }
      const point=routeContainerPoint(event);
      routeActivePointers.set(event.pointerId,point);
      event.preventDefault();
      const pair=routeGesturePair();
      if (!pair) return;
      const metrics=routeGestureMetrics(pair);
      if (routeGestureLastCenter) {
        const dx=metrics.center.x-routeGestureLastCenter.x;
        const dy=metrics.center.y-routeGestureLastCenter.y;
        if (Math.abs(dx)+Math.abs(dy)>.35) map.panBy([-dx,-dy],{animate:false,noMoveStart:true});
      }
      if (routeGestureLastDistance>0) {
        const ratio=metrics.distance/routeGestureLastDistance;
        if (ratio>1.045 && map.getZoom()<map.getMaxZoom()) {
          map.setZoomAround(metrics.center,Math.min(map.getMaxZoom(),map.getZoom()+0.25),{animate:false});
          routeGestureLastDistance=metrics.distance;
        } else if (ratio<0.957 && map.getZoom()>map.getMinZoom()) {
          map.setZoomAround(metrics.center,Math.max(map.getMinZoom(),map.getZoom()-0.25),{animate:false});
          routeGestureLastDistance=metrics.distance;
        }
      }
      routeGestureLastCenter=metrics.center;
    };
    routeMapContainer.removeEventListener('pointermove',v271HandleRoutePointerMove);
    routeMapContainer.addEventListener('pointermove',handleRoutePointerMove,{passive:false});

    // Blank-map tap dismisses transient information instead of forcing explicit close buttons.
    map.on('click', () => {
      if (routeDrawEnabled) return;
      if (currentActiveTarget) closeSitrep();
      closePlanPointInfo();
      closePlanSearch();
      closeNavMore();
    });

    document.getElementById('planSearchInput')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();searchPlanLocation();}
    });
    document.querySelectorAll('.v271-bottom-sheet').forEach(sheet=>{
      sheet.addEventListener('pointerdown',event=>event.stopPropagation());
      sheet.addEventListener('click',event=>event.stopPropagation());
    });

    // Update known impossible actions whenever field controls open as well.
    const v271OpenFieldControls=openFieldControls;
    openFieldControls=function(section){ v271OpenFieldControls(section); syncKnownActionAvailability(); };

    // New DRAW mode owns draw activation; no separate DRAW ON step remains.
    const v271ToggleDrawKind=toggleDrawKind;
    toggleDrawKind=function(){ v271ToggleDrawKind(); syncKnownActionAvailability(); };


    updateWpCounter();
    updateGpsTelemetry();
    updateTargetModePanel();
    updateLinkState();
    const initialOpticLabel = document.getElementById('currentOpticLabel');
    if (initialOpticLabel) initialOpticLabel.innerText = currentOpticMode;
    renderAllMarkers();

    /* PWA 업데이트: 서비스워커 자체는 HTTP 캐시를 우회해 확인한다. */
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js?v=r2-cleanup-20261006-1', { scope: './', updateViaCache: 'none' })
          .then(registration => registration.update())
          .catch(err => console.warn('Service Worker 등록 실패:', err));
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        const reloadKey = 'tactical-recon-sw-reload-r2-cleanup-20261006-1';
        if (sessionStorage.getItem(reloadKey)) return;
        sessionStorage.setItem(reloadKey, '1');
        location.reload();
      });
    }
