# Tactical Recon V28 — Development Specification

## 0. 목적

V28은 기능을 마구 추가하는 버전이 아니라 **PLAN과 TRACK의 저장 구조를 독립 객체로 재구성하는 기반 업데이트**다.

V27.4.1의 UI/GPS/TEMP/NAV 동작을 기준선으로 보존하면서 다음을 구현한다.

- TARGET에 종속된 ROUTE PLAN을 독립 PLAN 객체로 분리
- 여러 PLAN 저장 / 불러오기 / 삭제
- PLAN별 여러 TRACK 저장
- TRACK V2: GPS 실측구간과 TEMP/재수신 추정구간 분리
- GPS OFF / 신호손실 상태에서도 TRACK 세션 유지
- 기존 V27 데이터 읽기 호환 및 안전한 lazy migration
- GPX / BACKTRACK에서 추정구간을 실제 GPS 기록처럼 취급하지 않음
- 진행 중 TRACK 임시복구 기반 추가

V29 기능은 당겨 넣지 않는다.

## 1. V27 기준선

보존:
- 메인 하단: 목표 | 거점 | 메뉴
- 우측 상단: GPS / adaptive RECENTER-CENTERED-FOLLOW / TEMP
- GPS OFF는 정상 배터리 절약 상태
- GPS ON + FIX가 최우선 기준위치
- GPS OFF + TEMP는 TEMP 기준
- NAV 신호손실 시 LAST FIX fallback
- 신호손실 상태에서 새 TEMP 지정 시 TEMP override
- FOLLOW는 live GPS FIX에서만 가능
- ROUTE / TRACK 의미 분리
- NORTH UP 기본
- PLAN MAIN / SET / DRAW / NAV / NAV DRAW는 배타적
- 동적 한/영 상태문구는 상태 계산 후 렌더링

## 2. V28 메인 UI

V28에서 PLAN이 독립 1차 객체가 되므로 메인 하단에 경로를 다시 노출한다.

한글:
`목표 | 경로 | 거점 | 메뉴`

영문:
`OBJECTIVE | ROUTES | SITES | MENU`

역할:
- OBJECTIVE: 현재 목표/목적지 선택 및 상태
- ROUTES: 저장 PLAN 목록, 새 PLAN 생성, PLAN 불러오기/삭제
- SITES: 저장 장소/거점 DB
- MENU: 설정 및 보조기능

V27에서 경로와 거점이 겹쳤던 이유는 PLAN이 TARGET에 종속됐기 때문이다. V28에서는 PLAN을 독립 객체로 분리하므로 역할 충돌이 사라진다.

## 3. V28에서 하지 않는 것

V29 이후:
- TRACK → ROUTE 자동 변환
- 여러 TRACK 비교
- 고급 BACKTRACK 재설계
- 비상지도 / 완전 오프라인 지도
- 나침반 보조모드
- OVERLAY 세부 타입
- PLAN 복제
- 도로 기반 자동경로
- VIA 자동 도착판정
- TRACK 통계 대시보드

V28의 BACKTRACK 변경은 TRACK V2 호환에 필요한 최소 범위만 허용한다.

## 4. 핵심 소유관계

현재:
```text
TARGET
 ├─ routePlan
 └─ trackLogs
```

V28:
```text
PLAN
 ├─ optional OBJECTIVE snapshot
 ├─ START / VIA / END
 ├─ ROUTE / OVERLAY
 └─ TRACK IDs[]
      ├─ TRACK A
      ├─ TRACK B
      └─ TRACK C
```

PLAN이 1차 객체다. OBJECTIVE는 선택 사항이다.

## 5. PLAN 데이터 모델

새 키:
`tactical_recon_plans_v1`

```text
PlanV1 {
  schemaVersion: 1,
  id: string,
  name: string,
  createdAt: ISODate,
  updatedAt: ISODate,

  objective?: PlanPoint,
  startPoint?: PlanPoint,
  viaPoints: PlanPoint[],
  endPoint?: PlanPoint,

  routeSegments: [[lat, lon], ...][],
  overlaySegments: [[lat, lon], ...][],

  trackIds: string[],

  legacy?: {
    source: "LOCAL_SITE" | "REGISTERED_SITE" | "ROUTE_IMPORT",
    sourceId?: string
  }
}
```

```text
PlanPoint {
  id: string,
  role: "OBJECTIVE" | "START" | "VIA" | "END",
  name: string,
  coords: [lat, lon],
  source: "SITE" | "GPS" | "TEMP" | "LAST_FIX" |
          "HOME" | "RETICLE" | "INPUT" | "IMPORT",
  siteId?: string,
  address?: string
}
```

OBJECTIVE는 원본 SITE 좌표/이름 snapshot을 PLAN 안에 보존한다. 원본 SITE가 나중에 삭제돼도 PLAN은 깨지지 않는다.

기본 PLAN 이름:
1. OBJECTIVE 있으면 OBJECTIVE 이름
2. 없으면 `ROUTE YYYY-MM-DD HH:mm`

## 6. 다중 PLAN UX

ROUTES 버튼 → PLAN 목록.

각 PLAN 카드 최소 표시:
- PLAN 이름
- OBJECTIVE 또는 NO OBJECTIVE
- VIA 수
- ROUTE 길이
- TRACK 수
- 마지막 수정시각

동작:
- 탭: PLAN 열기
- 새 경로: 빈 PLAN 생성
- 삭제: 확인 후 PLAN 삭제
- SITE 상세에서 "경로계획": 해당 SITE snapshot을 OBJECTIVE로 가진 새 PLAN 생성 또는 현재 PLAN에 지정

V28에서는 PLAN 이름 편집/복제는 필수 범위가 아니다.

## 7. TRACK V2

새 키:
`tactical_recon_track_logs_v2`

```text
TrackV2 {
  schemaVersion: 2,
  id: string,
  planId?: string,
  objectiveSnapshot?: PlanPoint,
  startedAt: ISODate,
  endedAt?: ISODate,
  interrupted?: boolean,
  segments: TrackSegment[],
  distance: {
    measuredKm: number,
    estimatedKm: number
  }
}
```

Measured:
```text
{
  kind: "MEASURED",
  source: "GPS",
  points: [{ lat, lon, timestamp, accuracyM? }]
}
```

Estimated:
```text
{
  kind: "ESTIMATED",
  reason: "TEMP_BRIDGE" | "GPS_REACQUIRE",
  from: { lat, lon, timestamp?, source: "GPS" | "TEMP" | "LAST_FIX" },
  to:   { lat, lon, timestamp?, source: "GPS" | "TEMP" }
}
```

## 8. TRACK 상태기계

세션:
`OFF | RECORDING | PAUSED`

위치 공급:
`GPS_LIVE | WAITING_REFERENCE | MANUAL_TEMP | GPS_LOST`

규칙:
- GPS→GPS 연속: MEASURED
- GPS→TEMP: ESTIMATED
- TEMP→TEMP: ESTIMATED
- TEMP→GPS 재수신: ESTIMATED bridge 후 새 MEASURED
- LAST FIX→GPS 재수신, TEMP 없음: ESTIMATED GPS_REACQUIRE 후 새 MEASURED
- GPS OFF 중 TEMP 연속 입력: 세션 유지 + ESTIMATED
- live GPS FIX 중 TEMP 지정: TRACK에는 삽입하지 않음
- GPS OFF나 신호손실로 TRACK을 자동 STOP하지 않음
- PAUSE 중 GPS/TEMP 변화는 기록하지 않음
- RESUME 시 현재 GPS/TEMP에서 새 기록 시작, PAUSE 구간은 자동 연결하지 않음

## 9. 표시와 거리

- MEASURED: 기존 TRACK 실선
- ESTIMATED: 같은 계열의 점선/낮은 강조도
- 실제와 추정을 같은 스타일로 그리지 않음
- measuredKm / estimatedKm 별도 계산
- totalKm은 파생값
- 속도/평균속도 통계에는 ESTIMATED 기본 제외

HUD 예:
```text
TRACK 8.4 KM
EST 1.2 KM
```

## 10. PLAN별 다중 TRACK

하나의 PLAN에 여러 TRACK 저장 가능.

기본 지도 표시:
- 최근 TRACK 1개 표시
- SHOW ALL 선택 시 해당 PLAN의 모든 TRACK 표시

TRACK 삭제는 PLAN/ROUTE를 삭제하지 않는다.
PLAN 삭제 시 연결 TRACK 삭제 여부는 확인 절차를 거친다.

## 11. 임시복구

RECORDING 중 세션 스냅샷을 별도 임시 키에 저장한다.

`tactical_recon_active_track_v2`

PWA 종료/크래시 후 재실행 시:
- 미완료 TRACK 발견
- 복구/폐기 선택
- 자동으로 정상 완료 TRACK처럼 저장하지 않음

## 12. GPX

- MEASURED만 기본 GPX `<trkseg>`
- ESTIMATED를 실제 GPS TRACK에 섞지 않음
- ESTIMATED는 별도 route/extension 방식 검토
- Garmin 호환성을 우선

## 13. BACKTRACK

- MEASURED: 기록점 따라 역추적
- ESTIMATED: 실제 지나간 길로 취급하지 않음
- 추정구간 경계에서는 ESTIMATED 상태 표시 후 다음 확인점으로 직선 안내

## 14. 기존 데이터 호환

기존 키 삭제/강제재작성 금지.

정책:
- V1 reader 유지
- V2 reader/writer 추가
- 기존 TARGET.routePlan은 virtual PLAN으로 읽기
- 사용자가 수정/저장할 때만 PlanV1로 lazy migration
- 기존 TRACK v1은 legacy MEASURED segment로 해석
- 앱 시작 시 전체 데이터 강제 변환 금지

## 15. 구현 순서

1. PlanV1 / TrackV2 schema + validator
2. 기존 V27 read adapter
3. PLAN repository 계층
4. TARGET → optional OBJECTIVE snapshot 분리
5. ROUTES 메인 하단 버튼 및 PLAN 목록
6. PLAN create/open/delete
7. 기존 PLAN UI를 activePlanId 기반으로 전환
8. PLAN save/load/autosave
9. TrackV2 reader/writer
10. PLAN별 다중 TRACK
11. GPS 연속 MEASURED 기록
12. TEMP / GPS reacquire ESTIMATED bridge
13. TRACK 임시복구
14. 지도 실선/점선 표시
15. 거리 계산 분리
16. GPX V2
17. BACKTRACK V2 최소 호환
18. 구버전 데이터 회귀
19. iPhone PWA 실기기 검증

## 16. 구현 원칙

- V28 코드는 새 `v28.js/css` 또는 명확한 모듈 경계로 작성하고 V27 stable에 또 wrapper를 누적하지 않는다.
- 저장/상태 계산을 DOM 코드와 분리한다.
- `activePlanId`, `activeTrackId`를 명시적으로 둔다.
- TARGET/SITE object를 PLAN ID로 사용하지 않는다.
- 사용자 데이터명은 번역하지 않는다.
- 동적 상태문구는 상태 계산 후 i18n 렌더링한다.
- 저장 write 전 validator 통과.
- localStorage write 실패 시 기존 데이터 훼손 금지.
- 마이그레이션 실패 시 원본 V1 유지.

## 17. 필수 회귀 테스트

PLAN:
- OBJECTIVE 있음/없음
- 빈 PLAN
- START/VIA/END
- ROUTE/OVERLAY
- 여러 PLAN 생성/전환/삭제
- 재실행 후 복원
- 기존 V27 routePlan 불러오기

TRACK:
- GPS FIX 시작/정지
- GPS OFF + TEMP 시작
- GPS→TEMP
- TEMP→TEMP
- TEMP→GPS
- GPS 손실→재수신
- GPS 손실→TEMP→재수신
- PAUSE→이동→RESUME
- PLAN 하나에 TRACK 여러 개
- 앱 종료 후 active TRACK 복구

위치:
- GPS OFF / NO FIX / FIX
- TEMP / LAST FIX / FOLLOW
- GPS 재수신 시 GPS 우선 복귀

GPX/BACKTRACK:
- measured-only
- measured+estimated
- estimated가 실제 trkseg에 섞이지 않는지
- BACKTRACK 추정구간 경계 처리

데이터:
- 기존 localStorage 그대로 부팅
- 기존 SITE/ROUTE/TRACK ID 보존
- V1 데이터가 앱 시작만으로 재작성되지 않는지
- 마이그레이션 실패 시 원본 보존

## 18. 완료 기준

- PLAN이 TARGET 없이 독립 저장 가능
- 여러 PLAN 생성/전환/삭제 가능
- PLAN별 여러 TRACK 가능
- GPS 실측과 추정구간 데이터/화면/거리 분리
- GPS OFF/TEMP 운용에서도 TRACK 세션 유지
- 기존 V27 데이터 읽기 호환
- GPX/BACKTRACK이 추정구간을 실제 GPS로 오인하지 않음
- V27 핵심 UI/GPS/TEMP/FOLLOW 회귀 없음
