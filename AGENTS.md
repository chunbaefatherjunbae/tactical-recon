# Tactical Recon Field Terminal — 개발 규칙

이 디렉터리의 V26을 현재 기준 버전으로 취급한다. 이후 작업에서는 사용자가 요청한 범위만 변경한다. 기존 기능을 임의로 삭제하거나 동작 의미를 바꾸지 않고, 요청하지 않은 대규모 리팩터링이나 코드 정리를 하지 않는다. 상세 구조와 근거는 `/workspace/recon-v26-analysis.md`를 참고한다.

## 구조와 변경 전 확인

- `index.html` 하나에 HTML, CSS, 등록 거점 DB, 전역 상태, 주요 JavaScript가 들어 있다. `service-worker.js`는 PWA 캐시, `manifest.json`은 설치 설정을 담당한다.
- 상태는 전역 변수, Leaflet 레이어, `localStorage`, DOM 클래스·스타일에 분산되어 있다. 기능을 수정하기 전에 관련 상태값, 호출 경로, 화면 갱신, 저장·복원, 종료 정리를 추적하고 영향받는 기능을 확인한다.
- `index.html` 앞쪽 구현뿐 아니라 후반 V26 재정의·래퍼와 마지막 CSS override까지 확인한다. 같은 이름의 함수가 여럿 있으면 실제 최종 적용되는 구현을 기준으로 수정한다. 특히 `locateUser`, `applyGpsPosition`, `syncGpsMarkerVisibility`, `syncTargetReferenceLine`, `updateTargetModePanel`을 주의한다.
- 일반 마커, ROUTE/MARK, VIA, TRACK, GPS, TEMP, HOME, START/END는 서로 다른 레이어 또는 지도 객체를 쓴다. 모드 전환·삭제·종료 시 각 객체와 타이머·터치 상태가 함께 정리되는지 확인한다.

## 제품과 UI 원칙

- iPhone Safari와 홈 화면 설치(PWA) 환경을 우선 고려한다. UI는 실제 야외 운용을 위한 전술 장비/필드 터미널 방향을 유지한다. 장식용 가짜 수치나 실제 관측값처럼 보이는 허위 정보는 표시하지 않는다.
- 기존 STH / NVG-G / NVG-W / FLIR 테마 구조를 유지한다. 테마는 표시 방식이며 센서 측정값으로 취급하지 않는다.
- NORTH UP을 기본 정책으로 유지한다. 현재 TRACK UP 회전은 비활성화되어 있으므로 관련 코드가 존재한다는 이유만으로 활성 기능으로 취급하지 않는다.
- 작은 화면에서 GPS, CENTER, TARGET, PLAN, MENU 및 현재 모드의 주요 버튼이 다른 UI나 홈 인디케이터에 가려지지 않게 한다. `viewport-fit`, `100dvh`, safe-area, 키보드, 터치 크기와 DRAW 중 한 손가락·두 손가락 제스처를 함께 확인한다.
- 모바일 CSS는 여러 구간에서 같은 선택자를 덮어쓴다. 특히 V26 마지막 `.mfd-bottom-bar` 규칙이 앞선 safe-area 하단 padding을 덮는 점을 고려한다.

## GPS와 위치

- GPS는 사용자가 명시적으로 ON/OFF할 수 있어야 한다. GPS OFF는 배터리 절약을 위한 정상 운용 상태이며 오류로 표시하지 않는다.
- GPS가 OFF이거나 수신·권한을 사용할 수 없어도 TEMP와 WGS84 직접 좌표 입력으로 가능한 작업을 계속 지원한다. MGRS 변환은 외부 라이브러리 로드 여부에 영향을 받는다.
- 현재 기준 위치의 우선순위는 **GPS ON + 유효한 FIX → TEMP → 없음**이다. HOME은 별도의 귀환 지점이다. 마지막 GPS 좌표, 현재 FIX, TEMP, 기준 위치의 의미를 임의로 섞거나 변경하지 않는다.
- GPS 관련 수정 시 `gpsPowerEnabled`, `hasGpsFix`, `gpsWatchId`, `pendingNavStart`, `pendingTrackStart`, FOLLOW, RADAR, SITREP, NAV HUD, TRACK을 함께 확인한다. OFF 또는 새 요청 이후 늦게 도착한 위치 성공·실패 콜백이 사용자 선택과 현재 상태를 뒤집지 않도록 한다.
- 앱 내부와 저장 ROUTE/TRACK 좌표는 **[위도, 경도]**다. MGRS 라이브러리의 변환 입출력은 **[경도, 위도]**다. 경계에서 순서를 명시적으로 확인한다.

## ROUTE, NAV, TRACK

- ROUTE는 손으로 계획한 경로, TRACK은 실제 GPS 이동 기록이다. 저장·표시·내보내기에서 두 개념을 합치거나 의미를 바꾸지 않는다.
- NAV의 현재 안내는 기준 위치부터 목적지까지의 직선 거리·방위다. ROUTE 선 추종, VIA 자동 순회, 도로 경로 계산, 도착 자동 판정으로 해석하지 않는다.
- NAV를 수정할 때 PLAN/TARGET/START/END/VIA/BACKTRACK, `routeDirty`, `navLegIndex`, GPS/TEMP 기준 위치, TRACK 시작·중지·저장을 함께 확인한다. NEXT LEG는 수동 전환이고 BACKTRACK은 현재 TRACK 점을 사용한다.
- 계획 ROUTE 공유는 ROUTE JSON, GPX 내보내기는 LOCAL WAYPOINT와 저장된 TRACK 중심이다. GPX 가져오기나 계획 ROUTE의 GPX 포함을 기존 기능으로 가정하지 않는다.

## 데이터와 파일 안전성

- 기존 `localStorage` 키와 저장 형식의 호환성을 유지한다: `tactical_recon_intel_v2`, `tactical_recon_registered_routes_v1`, `tactical_recon_track_logs_v1`, `tactical_recon_home_point_v1`. 변경이 필요하면 기존 데이터의 마이그레이션 또는 하위 호환성을 먼저 검토한다.
- 등록 거점 ID는 저장 ROUTE와 연결되는 키다. ID를 임의로 변경하거나 LOCAL ID 충돌, 가져온 ROUTE의 같은 ID 처리 방식을 무심코 바꾸지 않는다. ROUTE JSON v1/v2/v3 가져오기 호환성도 고려한다.
- 사용자 입력·ROUTE 파일·저장 데이터는 신뢰하지 않는다. DOM에 표시할 때 안전한 텍스트 삽입을 사용하고 좌표 범위·크기·필드를 검증한다. 현재 가져온 `opCode`가 WAYPOINT 목록의 `innerHTML`에 들어가는 경로와 MARK 검증 차이를 특히 확인한다.
- 브라우저 저장 실패, PWA 재로드, Safari 중단 시 진행 중인 TRACK·미저장 계획이 소실될 수 있음을 고려한다. 서비스워커는 외부 CDN 라이브러리·지도 타일·주소 검색을 캐시하지 않으므로 완전한 오프라인 지도로 단정하지 않는다.

## 변경 후 확인과 보고

- 변경한 기능의 정상 경로와 관련 회귀 경로를 확인한다. 해당될 때 GPS ON→OFF→늦은 콜백, TEMP 대체, PLAN→NAV→PLAN→EXIT, 목표 교체, 저장 데이터 재로드, ROUTE 파일 가져오기·공유, 작은 화면·safe-area를 점검한다.
- 코드·정적 검사로 확인한 사실과 실기기 확인이 필요한 사항을 구분해 보고한다. 실제 iPhone Safari, GPS 수신, 홈 화면 설치, 공유 시트, 파일 저장을 실행하지 않았다면 검증했다고 단정하지 않는다.
