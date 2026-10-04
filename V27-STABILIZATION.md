# V27 Stabilization / V28 Prep

## 목적

현재 동작을 바꾸지 않고 V27 패치 구조를 안정화해 V28의 다중 PLAN/TRACK 저장구조 작업 전에 회귀 위험을 낮춘다.

## 이번 안정화에서 변경한 구조

- 런타임 오버레이를 `v27-stable.js` / `v27-stable.css` 한 쌍으로 통합한다.
- 통합 순서는 기존과 동일하게 V27.2 → V27.2.1 → V27.3.x다.
- `v27-2.js/css`, `v27-2-1.js/css`, `v27-3.js/css`는 이력/비교용으로 남기지만 서비스워커가 직접 로드하지 않는다.
- 서비스워커가 오래된 캐시 HTML의 레거시 오버레이 태그를 제거한 뒤 stable bundle만 한 번 주입한다.
- 저장 키, ROUTE/TRACK 형식, GPS/TEMP/FOLLOW 정책, 화면 동작은 변경하지 않는다.

## 감사 결과

### 재정의/래퍼

`index.html` 내부에서도 여러 핵심 함수가 반복 정의되거나 래핑된다. 대표적으로:
- `updateTargetModePanel`: 3개 정의/재정의
- `syncGpsMarkerVisibility`: 3개
- `applyGpsPosition`, `locateUser`, `enterTargetMode`, `exitTargetMode`, `returnToTargetPlan`: 복수 정의
- V26/V27.1 래퍼 체인 13개

기존 V27 분리 오버레이에는 추가 래퍼가 36개 있었다. 이번 작업은 이 래퍼의 의미를 바꾸지 않고 **파일 간 실행 경계만 하나로 통합**한다. V28 이전에 `index.html`의 래퍼를 직접 평탄화하는 것은 회귀 위험 때문에 보류한다.

### CSS 충돌 위험

`index.html` 안에서 다음 핵심 UI 선택자가 여러 시기에 반복 정의된다.
- `.mfd-bottom-bar`
- `.target-mode-actions`
- `.field-control-tray`
- `.sitrep-panel`
- `.wp-drawer`
- `.global-gps-controls`

최종 V27 stable CSS가 이 레거시 규칙보다 뒤에서 적용되는 구조를 유지한다. 새 수정은 가능하면 stable CSS의 마지막 규칙에서 처리하고, 레거시 CSS를 중간에서 부분 수정하지 않는다.

## 상태 기준

### 화면/운용 모드

| 상태 | 의미 | 허용되는 주 조작 |
|---|---|---|
| MAIN | 기본 지도 | OBJECTIVE / SITES / MENU |
| PLAN MAIN | 경로계획 기본 | SEARCH / SET / PLOT / UNDO / EXIT |
| PLAN SET | START/VIA/END 지정 | START / VIA / END / DONE |
| PLAN DRAW | ROUTE/OVERLAY 작도 | 종류 / UNDO / CLEAR / DONE |
| NAV | 항법 실행 | SEARCH / PAUSE / NEXT LEG / STOP / MORE |
| NAV DRAW | NAV 유지 중 작도 | ROUTE/OVERLAY / UNDO / CLEAR / DONE |

서브모드는 서로 배타적으로 표시되어야 한다.

### 위치 상태

현재 제품 기준:
1. GPS ON + 유효 FIX
2. TEMP
3. 없음

HOME은 별도 귀환점이다. V27.2의 LAST FIX는 GPS 손실 시 특정 NAV/센터 동작을 보조하는 fallback이며 일반 TEMP 의미와 섞지 않는다.

FOLLOW는 live GPS FIX가 있을 때만 가능하다. GPS OFF는 정상 배터리 절약 운용 상태다.

### ROUTE / TRACK

- ROUTE: 사용자가 계획한 START/VIA/END + 작도선/표식선
- TRACK: 실제 GPS 이동 기록
- BACKTRACK: TRACK 기반
- 둘은 저장/표시/거리 의미를 합치지 않는다.

현재 ROUTE PLAN 저장 객체는 `segments`, `markSegments`, `viaPoints`, `startPoint`, `endPoint`, `distanceKm`, `updatedAt`를 가진다. 현재 `saveTargetRoute()`는 `targetModeTarget`이 있어야 저장 가능하므로 PLAN이 TARGET에 결합되어 있다.

현재 TRACK LOG는 `points: [[lat, lon, timestamp], ...]` 형태이며 `persistTrackLog()` 역시 `targetModeTarget`을 요구한다. GPX는 이 좌표를 전부 실제 TRACK으로 내보낸다. V28의 다중 PLAN/TRACK 및 TEMP 추정구간을 위해서는 PLAN/TRACK의 ID와 TARGET 결합을 분리하고, TRACK point/segment에 source/quality 정보를 추가하는 마이그레이션이 필요하다.

## 보존해야 할 저장 호환성

- `tactical_recon_intel_v2`
- `tactical_recon_registered_routes_v1`
- `tactical_recon_track_logs_v1`
- `tactical_recon_home_point_v1`
- `tactical_recon_language_v1`
- `tactical_recon_optic_theme_v1`
- `tactical_recon_road_boost_v1`
- `tactical_recon_marker_layers_v1`

V28은 기존 키를 읽을 수 있는 마이그레이션 계층을 먼저 둔 뒤 새 구조로 이동해야 한다.

## 남아 있는 위험요소 (이번 단계에서는 수정하지 않음)

- TEMP/LAST FIX/목표 상태를 읽는 함수가 여러 래퍼에 분산되어 있어 특정 상태 조합에서 UI 표시와 실제 기준위치가 어긋날 수 있다.
- TARGET 없이 START/VIA/END만 존재하는 PLAN의 상태 문구 정책이 기존 TARGET 중심 코드와 완전히 일치하지 않는다. 더 근본적으로 현재 ROUTE 저장과 TRACK 저장이 모두 `targetModeTarget`에 결합되어 있어 targetless PLAN은 V28에서 별도 PLAN ID 구조로 분리할 필요가 있다.
- TRACK은 현재 GPS 실측점 중심 형식이라 향후 TEMP 기반 추정 구간을 넣으려면 V28에서 point/segment source 모델이 필요하다.
- 동적 UI 문자열 일부는 레거시 함수가 직접 문자열을 쓰고, stable i18n 레이어가 다시 보정하는 방식이다.
- `index.html`의 CSS는 동일 선택자를 여러 구간에서 덮어쓰므로 새 UI 수정은 specificity와 실제 로드 순서를 함께 검증해야 한다.
- 실제 iPhone Safari/PWA, 센서/GPS, 공유 시트, 파일 저장은 정적 검증만으로 완전 보장할 수 없다.

## V28 전에 추가로 손볼 항목

기능 안정화 후 별도 작업으로:
1. TEMP 존재 시 기준위치 판정/UI 상태 불일치 수정
2. TARGET 없는 ROUTE의 상태/다음 지점 표시 정리
3. V28 TRACK 데이터 모델: GPS 실측점 / TEMP 수동점 / ESTIMATED 연결구간 분리 설계
4. 동적 i18n 문자열 생성 경로 중앙화
5. V28 마이그레이션 reader/writer를 기존 storage와 분리해 도입

## 회귀 테스트 체크리스트

### 앱/PWA
- 첫 로드, 새로고침, 홈화면 PWA 완전 종료 후 재실행
- 이전 service worker 캐시에서 업데이트
- 오프라인에서 앱 shell 로드

### 메인 UI
- MAIN 하단 3등분
- GPS / adaptive RECENTER-FOLLOW / TEMP 상시 표시
- 각 테마 STH / NVG-G / NVG-W / FLIR
- 메뉴/거점/거점정보 스크롤과 고정 헤더

### GPS / 위치
- GPS OFF
- GPS ON → NO FIX
- GPS FIX
- GPS FIX → OFF
- GPS FIX → 신호 손실 → LAST FIX
- TEMP 생성/삭제
- GPS 재수신 시 TEMP override 해제
- 늦게 도착한 geolocation callback이 GPS OFF를 되살리지 않는지
- FOLLOW 진입/해제/지도 drag 해제

### PLAN
- TARGET 있음/없음
- START / VIA 여러 개 / END
- SEARCH
- SET → DONE
- DRAW ROUTE → DONE
- DRAW OVERLAY → DONE
- UNDO / CLEAR
- 종료 후 자동저장 및 재진입 복원

### NAV
- PLAN → NAV → PLAN
- SEARCH 중 FOLLOW 해제
- PAUSE/RESUME는 timer만 정지
- NEXT LEG / long press REVERT
- NAV DRAW → DONE
- STOP
- LAST FIX / TEMP fallback

### TRACK
- GPS FIX에서 TRACK 시작/정지
- GPS OFF/손실 시 기존 기록 보존
- 저장 TRACK 재표시
- BACKTRACK
- GPX 내보내기

### 데이터
- 기존 localStorage 데이터로 부팅
- ROUTE JSON v1/v2/v3 가져오기
- 사용자 거점/등록 거점 ID 유지
- 언어/테마/레이어/도로강조 설정 복원

## 검증 수준

이 문서와 안정화 패치는 정적 코드/로드순서/문법 기준 검증이다. 실제 iPhone Safari/PWA 및 실제 GPS 센서 동작은 실기기 검증이 별도로 필요하다.


## V27.4.1 상태표시 수정

- `planNavHint`, `targetModeName`, `navHudTarget`은 동적 상태/사용자 데이터이므로 정적 i18n binding 대상에서 제외한다.
- GPS가 명시적으로 OFF일 때 유효 TEMP가 있으면 TEMP가 활성 기준위치다.
- GPS ON + FIX는 항상 GPS가 우선이다.
- NAV에서 GPS 신호만 손실된 경우 기존 정책대로 explicit TEMP override가 없으면 LAST FIX를 우선한다.
- TARGET 이름은 번역하지 않는다.
- TARGET이 없지만 VIA/END가 존재하는 비정상/미래 호환 상태에서는 `경로 · 다음 <지점>` / `ROUTE · NEXT <point>`를 표시한다.
- 현재 V27 NAV 시작은 여전히 TARGET을 요구한다. TARGET 없는 PLAN의 저장/NAV 정책 자체는 V28의 PLAN ID 분리 전까지 변경하지 않는다.


### V27.4.1 로직 회귀 매트릭스

정적/로직 수준 검증 결과:

| 상태 | 기준위치 결과 | 비고 |
|---|---|---|
| GPS OFF + TEMP | TEMP | 정상 |
| GPS OFF + TEMP + LAST FIX + NAV | TEMP | 명시적 GPS OFF에서는 TEMP 우선 |
| GPS OFF + LAST FIX only + NAV | LAST FIX | NAV fallback 유지 |
| GPS ON + NO FIX + TEMP, PLAN | TEMP | 정상 |
| GPS ON + NO FIX + LAST FIX + TEMP, NAV | LAST FIX | 기존 signal-loss 정책 유지 |
| GPS ON + NO FIX + 새 TEMP, NAV | TEMP | explicit TEMP override 유지 |
| GPS ON + FIX + TEMP | GPS | live GPS 최우선 |
| GPS/TEMP 모두 없음 | 없음 | 기준위치 필요 표시 |

FOLLOW는 기존 `setGpsFollow()` 조건인 `gpsPowerEnabled && hasGpsFix`를 변경하지 않았다.

동적 UI 검증:
- 한글 + TARGET + TEMP → 실제 TARGET 이름 / `탭하여 항법 시작`
- 영어 + TARGET + GPS → 실제 TARGET 이름 / `TAP TO START`
- 한글 + TARGET 없음 + VIA/END → `경로 · 다음 <지점>`
- 영어 + TARGET 없음 + END → `ROUTE · NEXT <point>`
- TARGET 있음 + 기준위치 없음 → `기준위치 필요 / REF POS REQUIRED`
- NAV에서는 현재 `navLegIndex`의 VIA/TARGET/END 이름을 HUD 목적지로 표시

실제 iPhone 센서/PWA 테스트는 별도 실기기 검증 항목이다.
