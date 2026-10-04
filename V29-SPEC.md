# Tactical Recon V29 — Field Reuse & Emergency Navigation Specification

## 0. 목적

V29는 V28에서 만든 PLAN/TRACK 데이터를 **현장에서 다시 활용하고, GPS/네트워크가 불리한 상황에서도 좌표와 실제 나침반으로 항법을 보조하는 버전**이다.

V29의 두 축:
1. FIELD REUSE — 기록 재활용
2. EMERGENCY NAV — 비상/저GPS 항법

각 기능은 구현 단계부터 **실사용 가능한 최종 수준의 UI/UX와 비주얼을 함께 설계·구현**한다. 임시 UI를 전제로 미루지 않는다. 각 Phase 종료 시 기능과 비주얼을 함께 검수하고 이상이 있으면 즉시 수정한다. 모든 기능 완료 후에는 필요할 때만 전체 일관성 조정을 수행한다.

## 1. TRACK → ROUTE

저장된 실제 TRACK을 새 PLAN의 ROUTE 재료로 복사할 수 있게 한다.

원칙:
- 원본 TRACK 보존
- 새 ROUTE는 별도 데이터
- GPS 점이 과도하게 많으므로 좌표 단순화 적용
- 단순화 허용오차는 원본을 파괴하지 않음
- ESTIMATED 구간을 실제 이동경로 근거처럼 자동 승격하지 않음
- 필요 시 사용자 확인/제외 정책을 둠

## 2. PLAN 복제

기존 PLAN을 기반으로 새 PLAN 생성.

기본 복제:
- OBJECTIVE
- START / VIA / END
- ROUTE
- OVERLAY

기본 미복제:
- 과거 TRACK

TRACK은 실행 결과이므로 PLAN 복제에 자동 포함하지 않는다.

## 3. TRACK 비교

같은 PLAN의 여러 TRACK을 비교한다.

최소 비교:
- 날짜
- measured distance
- estimated distance
- 소요시간
- 평균속도(실측 기준)
- 지도 중첩
- 주요 경로 차이

거대한 통계 대시보드보다 실제 비교에 필요한 정보만 우선한다.

## 4. 저장 TRACK BACKTRACK 확장

V28의 TrackV2 최소 호환을 확장해 과거 저장 TRACK을 골라 BACKTRACK에 사용할 수 있게 한다.

원칙:
- MEASURED는 실제 기록점 기반 역추적
- ESTIMATED는 실제 지나간 세부 경로로 취급하지 않음
- 추정 경계에서는 다음 확인 가능한 anchor로 직선 안내
- 선택한 TRACK/세션을 명확히 표시

## 5. OVERLAY 확장

OVERLAY를 실제 현장 표시용으로 최소 확장한다.

후보:
- 위험
- 참고
- 차단
- 관측
- 기타

과도한 군용 심볼 세트는 넣지 않는다. 실제 구분 가치가 있는 최소 타입만 채택한다.

## 6. 나침반 보조 — GRID / TRUE / MAG

이 기능은 스마트폰을 전자 나침반으로 만드는 기능이 아니다.

목적:
- MGRS/WGS84 좌표
- 현재 기준위치
- 목표좌표
- 실제 자석 나침반
을 함께 사용해 GPS 의존도를 낮춘 항법을 돕는다.

리콘은 다음 북 기준을 구분한다:
- GRID NORTH = 도북
- TRUE NORTH = 진북
- MAGNETIC NORTH = 자북

계산 흐름:
```
현재 좌표 + 목표 좌표
→ GRID BRG
→ grid convergence 보정
→ TRUE BRG
→ magnetic declination 보정
→ MAG BRG
```

표시 예시는 개념적으로:
```
DIST        2.4 KM
GRID BRG    243°
TRUE BRG    245°
MAG BRG     253°
CONV        +2°
DECL        +8°E
```

실제 값은 위치/날짜 기반 계산값만 표시한다.

### 자편각

자편각은 외부 실시간 API에 의존하지 않고 공식 WMM 계수 기반의 오프라인 계산을 우선한다.

정책:
- 앱에 필요한 모델 계수/계산 로직 내장
- 위치 + 날짜 기반 declination
- 모델 유효기간/버전을 명확히 관리
- 모델 범위 밖 날짜는 경고/사용 제한 정책 검토
- 계산 검증용 공식 reference case 사용

### 도편각

MGRS/UTM 격자와 진북 간 grid convergence를 위치 기반으로 계산한다.

GRID / TRUE / MAG 값의 기준을 UI에서 섞지 않는다.

## 7. 비상 항법 화면

GPS가 꺼져 있거나 네트워크가 없는 상황에서도 좌표를 수동으로 넣어 최소 항법을 수행할 수 있게 한다.

기준위치 후보:
- live GPS
- TEMP
- 직접 WGS84 입력
- MGRS 입력
- 기존 정책에서 허용되는 LAST FIX

표시 우선:
- CURRENT 좌표
- TARGET 좌표
- DIST
- GRID BRG
- TRUE BRG
- MAG BRG
- GRID CONV
- MAG DECL

실제 자석 나침반에 적용할 값을 분명하게 표시한다.

## 8. 초경량 비상지도

목표는 완전한 오프라인 지도 서비스가 아니다.

목적:
- 데이터 연결이 없을 때
- GPS가 꺼졌거나 제한적일 때
- 좌표/방위/대략적 위치관계를 판단할 최소 basemap 제공

원칙:
- 저해상도
- 작은 저장 용량
- PWA 저장 한계 고려
- 좌표/방위 판단 우선
- 온라인 지도 실패 시 fallback
- 일반 내비게이션 지도 대체를 목표로 하지 않음

## 9. GPX / Garmin 고도화

V28의 안전한 최소 export를 확장한다.

검토/구현:
- 저장 TRACK 선택 export
- 여러 MEASURED segment 유지
- ESTIMATED 별도 표현 또는 제외 정책
- ROUTE/PLAN 공유와 TRACK GPX 역할 분리
- Garmin 실기기 호환 검증

ESTIMATED를 일반 GPS 실측 trkseg로 위장하지 않는다.

## 10. UI/비주얼 구현 원칙

각 기능은 처음부터 현재 Tactical Recon의 디자인 언어에 맞춰 완성도 있게 만든다.

검수 기준:
- 정보 우선순위
- 패널/카드 구조
- 하단 메뉴 균형
- 타이포/간격/선 굵기/아이콘
- STH / NVG-G / NVG-W / FLIR 테마 대비
- 작은 화면/safe-area
- 야외 판독성
- GRID/TRUE/MAG 정보 밀도
- 상태와 UI 표현의 일치

새 기능이 실제 화면에서 어색하거나 기존 UI 균형을 깨면 해당 Phase에서 수정하고 넘어간다. 마지막에는 전체 리디자인을 전제로 하지 않으며, 필요할 때만 전체 일관성 조정을 수행한다.

## 11. V29 구현 순서

Phase 1 — Reuse
1. TRACK → ROUTE
2. 좌표 단순화
3. PLAN 복제

Phase 2 — Compare / Backtrack
1. TRACK 비교
2. 저장 TRACK BACKTRACK

Phase 3 — Overlay
1. 최소 OVERLAY 타입 확장

Phase 4 — Compass Assist
1. GRID bearing
2. grid convergence
3. TRUE bearing
4. WMM magnetic declination
5. MAG bearing
6. reference-case 검증

Phase 5 — Emergency NAV
1. 수동 좌표 기반 비상 항법 화면
2. GPS/TEMP/LAST FIX 연계
3. 오프라인 동작 검증

Phase 6 — Emergency Map
1. 초경량 fallback 지도
2. PWA 저장/복원
3. 온라인 지도 실패 fallback

Phase 7 — GPX / Garmin
1. 선택 export
2. segment 정책
3. 실기기 Garmin 검증

Phase 8 — Final Consistency Check (필요 시)
1. 전체 정보구조 재검토
2. 모바일/야외 판독성
3. 테마/간격/타이포/아이콘 일관성 확인
4. 필요한 부분만 조정
5. iPhone PWA 최종 회귀

## 12. 보류 기능

다음은 V29에 억지로 넣지 않는다:
- 도로 기반 자동경로
- VIA 자동 도착판정
- TRACK UP 지도회전

실제 V28/V29 운용 후 필요성을 다시 판단한다.

## 13. 완료 기준

- 실제 TRACK을 안전하게 ROUTE로 재활용 가능
- PLAN 복제 가능
- 같은 PLAN의 TRACK 비교 가능
- 저장 TRACK BACKTRACK 가능
- GRID / TRUE / MAG 기준이 명확히 분리됨
- 도편각/자편각이 위치 기반으로 계산됨
- 네트워크 없이 자편각 계산 가능
- GPS OFF에서도 수동 좌표 기반 거리/방위 계산 가능
- 비상지도 fallback 동작
- GPX/Garmin이 MEASURED와 ESTIMATED 의미를 훼손하지 않음
- 각 Phase에서 기능과 UI/비주얼이 함께 검수되며, 마지막에는 필요한 경우에만 전체 일관성 조정 완료
