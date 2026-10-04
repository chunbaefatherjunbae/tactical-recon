# Tactical Recon V28 — Development Specification

## 0. 목적

V28은 **데이터 구조와 기록 시스템을 완성하는 버전**이다.

V27.4.1의 GPS/TEMP/LAST FIX/FOLLOW/NAV 동작을 보존하면서:
- PLAN을 TARGET/OBJECTIVE에서 분리
- 여러 PLAN 저장/전환/삭제
- PLAN별 여러 TRACK 저장
- TRACK V2 도입
- GPS 실측과 TEMP/재수신 추정구간 분리
- 진행 중 TRACK 복구
- 기존 V27 데이터 읽기 호환
- GPX/BACKTRACK 최소 호환
- OBJECTIVE 정보에 거리와 기본 BRG 표시

V28은 각 기능을 구현할 때부터 **실사용 가능한 최종 수준의 UI/UX와 비주얼을 함께 설계·구현**한다. 임시 UI를 전제로 미루지 않는다. 각 Phase 종료 시 기능과 비주얼을 함께 검수하고, 실제 화면에서 어색함·가독성·배치·상태표시 문제가 보이면 그 Phase에서 바로 수정한다. V29 종료 후에는 필요할 때만 전체 일관성 조정을 수행한다.

## 1. V27 기준선

보존:
- GPS OFF는 정상 배터리 절약 상태
- GPS ON + FIX가 실시간 위치의 최우선 기준
- GPS OFF + TEMP는 TEMP 기준
- NAV 신호손실 시 기존 LAST FIX fallback
- 신호손실 상태에서 새 TEMP 지정 시 TEMP override
- FOLLOW는 live GPS FIX에서만 가능
- HOME은 별도 귀환점
- ROUTE는 계획, TRACK은 실제/기록 데이터
- NORTH UP 기본
- 사용자 데이터명은 번역하지 않음
- 동적 상태문구는 실제 상태 계산 후 현재 언어로 렌더링

## 2. V28 메인 UI

메인 하단:
- 한글: `목표 | 경로 | 거점 | 메뉴`
- 영문: `OBJECTIVE | ROUTES | SITES | MENU`

역할:
- OBJECTIVE: 현재 목표 정보/선택
- ROUTES: PLAN 목록, 생성, 열기, 삭제
- SITES: 거점 DB
- MENU: 설정/보조기능

OBJECTIVE 상세는 기존 목표명과 좌표를 유지하고, 유효한 기준위치가 있을 때 같은 기준으로:
- DIST
- BRG
를 추가한다.

V28의 BRG는 기존 NAV 방위 계산과 동일한 기준/계산 경로를 사용한다. 북 기준을 새로 임의 정의하지 않는다. GRID / TRUE / MAG 분리는 V29 나침반 보조에서 처리한다.

## 3. PLAN 독립화

현재:
```
TARGET
 ├ routePlan
 └ trackLogs
```

V28:
```
PLAN
 ├ optional OBJECTIVE snapshot
 ├ START / VIA / END
 ├ ROUTE / OVERLAY
 └ TRACK IDs[]
```

PLAN이 1차 객체이며 OBJECTIVE는 선택 사항이다.

새 키:
`tactical_recon_plans_v1`

```text
PlanV1 {
  schemaVersion: 1,
  id,
  name,
  createdAt,
  updatedAt,
  objective?,
  startPoint?,
  viaPoints[],
  endPoint?,
  routeSegments[],
  overlaySegments[],
  trackIds[],
  legacy?
}
```

PlanPoint:
```text
{
  id,
  role: "OBJECTIVE" | "START" | "VIA" | "END",
  name,
  coords: [lat, lon],
  source: "SITE" | "GPS" | "TEMP" | "LAST_FIX" |
          "HOME" | "RETICLE" | "INPUT" | "IMPORT",
  siteId?,
  address?
}
```

OBJECTIVE는 snapshot으로 저장해 원본 SITE가 삭제되어도 PLAN이 깨지지 않게 한다.

## 4. 다중 PLAN

필수:
- PLAN 생성
- PLAN 열기/전환
- PLAN 삭제
- OBJECTIVE 없는 PLAN
- START / VIA / END
- ROUTE / OVERLAY
- autosave
- `activePlanId`

V28에서는 PLAN 복제를 필수 범위로 넣지 않는다. 복제는 V29.

## 5. TrackV2 / 다중 TRACK

새 키:
`tactical_recon_track_logs_v2`

```text
TrackV2 {
  schemaVersion: 2,
  id,
  planId?,
  objectiveSnapshot?,
  startedAt,
  endedAt?,
  interrupted?,
  segments[],
  distance: {
    measuredKm,
    estimatedKm
  }
}
```

세션:
`OFF | RECORDING | PAUSED`

필수:
- RECORD
- PAUSE
- RESUME
- STOP
- PLAN 하나에 여러 TRACK
- `activeTrackId`
- 최근 TRACK 기본 표시
- 필요 시 같은 PLAN의 TRACK 전체 표시

TRACK 삭제는 PLAN/ROUTE를 삭제하지 않는다.

## 6. 하이브리드 TRACK

MEASURED:
```text
{
  kind: "MEASURED",
  source: "GPS",
  points: [{ lat, lon, timestamp, accuracyM? }]
}
```

ESTIMATED:
```text
{
  kind: "ESTIMATED",
  reason: "TEMP_BRIDGE" | "GPS_REACQUIRE",
  from,
  to
}
```

규칙:
- GPS → GPS 연속 = MEASURED
- GPS → TEMP = ESTIMATED
- TEMP → TEMP = ESTIMATED
- TEMP → GPS 재수신 = ESTIMATED bridge 후 새 MEASURED
- TEMP가 없고 LAST FIX 이후 GPS 재수신 = ESTIMATED GPS_REACQUIRE 후 새 MEASURED
- GPS OFF/신호손실은 TRACK 자동 STOP 사유가 아님
- PAUSE 중 위치 변화는 기록하지 않음
- RESUME 시 현재 위치원에서 새 기록을 시작하고 PAUSE 구간은 자동 연결하지 않음
- live GPS FIX 중 TEMP 지정은 TRACK에 추정점으로 삽입하지 않음

표시:
- MEASURED = 기존 계열 실선
- ESTIMATED = 점선/낮은 강조

거리:
- measuredKm / estimatedKm 분리
- total은 파생값
- 실제 속도 통계에 ESTIMATED 기본 제외

## 7. 진행 중 TRACK 복구

새 임시 키:
`tactical_recon_active_track_v2`

RECORDING 중 세션 스냅샷을 저장한다.

PWA 종료/크래시 후:
- 미완료 TRACK 감지
- 복구 / 폐기 선택
- 자동으로 정상 완료 TRACK처럼 저장하지 않음

## 8. V27 데이터 호환

기존 키/원본 데이터는 삭제하거나 앱 시작 시 강제 재작성하지 않는다.

정책:
- V27 reader 유지
- V28 reader/writer 추가
- 기존 TARGET-bound routePlan은 virtual PLAN으로 읽을 수 있게 함
- 실제 수정/저장 시에만 lazy migration
- 기존 `tactical_recon_track_logs_v1`은 legacy MEASURED로 읽음
- migration/validation 실패 시 원본 유지
- ROUTE JSON v1/v2/v3 호환 보존

## 9. GPX 최소 호환

V28에서는 TrackV2 때문에 기존 GPX가 잘못된 실제 궤적을 만들지 않게 하는 최소 호환만 수행한다.

- MEASURED만 기본 `<trkseg>`
- 끊긴 MEASURED는 별도 `<trkseg>`
- ESTIMATED를 실제 TRACK에 섞지 않음
- Garmin이 추정구간을 실측 GPS 기록으로 오인하게 만들지 않음

ESTIMATED의 고급 GPX 표현/선택 export 정책은 V29에서 정리한다.

## 10. BACKTRACK 최소 호환

- MEASURED는 기존처럼 역추적 가능
- ESTIMATED는 실제 지나간 선으로 취급하지 않음
- 추정구간 경계에서는 다음 확인점으로 직선 안내
- 저장 TRACK 선택/고급 BACKTRACK은 V29

## 11. UI/비주얼 구현 원칙

각 Phase에서 새 기능의 UI는 임시 배치가 아니라 최종 사용을 전제로 만든다.

검수 기준:
- 현재 전술 장비/필드 터미널 디자인 언어와 일관성
- 정보 우선순위와 야외 판독성
- 버튼/터치 영역과 iPhone safe-area
- STH / NVG-G / NVG-W / FLIR 테마 대응
- 작은 화면에서 겹침/잘림/스크롤 문제 없음
- 새 정보가 기존 핵심 정보의 시야를 빼앗지 않음
- 동적 상태와 실제 기능 상태가 일치
- 기능 추가로 전체 레이아웃이 무너지면 해당 Phase에서 바로 수정

최종 단계에서 전체 리디자인을 전제로 하지 않는다. 처음부터 충분히 잘 만들고, 마지막에는 필요한 경우에만 간격·타이포·아이콘·정보밀도 등 전체 일관성을 조정한다.

## 12. V28 구현 순서

Phase 1 — Foundation
1. PlanV1 / PlanPoint / TrackV2 schema
2. validator / sanitizer
3. PLAN repository
4. TrackV2 reader/writer
5. V27 read adapter
6. activePlanId / activeTrackId 기반

Phase 2 — PLAN
1. TARGET → optional OBJECTIVE 분리
2. ROUTES 메인 버튼
3. PLAN list/create/open/delete
4. 기존 PLAN UI를 activePlanId 기반으로 전환
5. save/load/autosave
6. OBJECTIVE명/좌표 유지 + DIST/BRG

Phase 3 — TRACK
1. PLAN별 다중 TRACK
2. RECORD / PAUSE / RESUME / STOP
3. GPS 연속 MEASURED 기록
4. 기본 TRACK 표시/삭제

Phase 4 — Hybrid / Recovery
1. TEMP_BRIDGE
2. GPS_REACQUIRE
3. measured/estimated 거리
4. 실선/점선 표시
5. active TRACK 복구

Phase 5 — Compatibility / Release
1. GPX 최소 호환
2. BACKTRACK 최소 호환
3. V27 data regression
4. i18n/state regression
5. PWA/cache regression
6. 실제 iPhone GPS/TEMP/FOLLOW/재수신 검증

## 13. V28에서 제외

V29 이후:
- TRACK → ROUTE
- PLAN 복제
- 여러 TRACK 비교
- 저장 TRACK 선택 BACKTRACK 확장
- OVERLAY 세부 타입
- GRID / TRUE / MAG 나침반 보조
- WMM 오프라인 자편각
- 비상 항법 화면
- 초경량 비상지도
- GPX/Garmin 고도화
- 필요 시 최종 UI 일관성 조정

보류:
- 도로 기반 자동경로
- VIA 자동 도착판정
- TRACK UP

## 14. 완료 기준

- PLAN이 TARGET 없이 독립 저장 가능
- 여러 PLAN 생성/전환/삭제 가능
- OBJECTIVE명/좌표를 유지하면서 DIST/BRG 표시
- PLAN별 여러 TRACK 가능
- RECORD/PAUSE/RESUME/STOP 정상
- MEASURED/ESTIMATED 데이터·표시·거리 분리
- GPS OFF/TEMP에서도 TRACK 세션 유지
- 미완료 TRACK 복구
- 기존 V27 데이터 읽기 호환
- GPX/BACKTRACK이 ESTIMATED를 실제 GPS로 오인하지 않음
- V27 GPS/TEMP/LAST FIX/FOLLOW/NAV 핵심 회귀 없음
