# V28 Hybrid TRACK Design

## 목표

GPS가 약하거나 사용자가 배터리 절약을 위해 GPS를 OFF한 상황에서도 TRACK 세션을 끊지 않되, 실제 GPS 실측과 수동/추정 연결을 데이터·화면·거리·GPX·BACKTRACK에서 명확히 구분한다.

## 핵심 원칙

- GPS 연속 수신 구간만 **실측(MEASURED)** 이다.
- TEMP가 한쪽 끝이라도 포함된 연결은 **추정(ESTIMATED)** 이다.
- GPS 신호가 끊긴 뒤 TEMP 없이 재수신된 GPS와 마지막 FIX 사이도 **추정**이다.
- 추정 구간은 실제 이동 경로라고 주장하지 않는다.
- TRACK 세션은 GPS 상태와 별개로 유지될 수 있다.
- 기존 V1 TRACK 로그는 파괴하지 않고 읽기 호환한다.

## 권장 V28 데이터 모델

PLAN과 TARGET을 먼저 분리한다.

```text
Plan {
  id,
  name,
  objectiveId?,       // optional
  startPoint?,
  viaPoints[],
  endPoint?,
  routeSegments[],
  overlaySegments[],
  trackIds[]
}
```

TRACK은 PLAN에 연결하되 독립 객체다.

```text
TrackV2 {
  schemaVersion: 2,
  id,
  planId?,
  objectiveId?,
  startedAt,
  endedAt?,
  segments: TrackSegment[],
  distance: {
    measuredKm,
    estimatedKm
  }
}
```

세그먼트는 다음 두 종류만 사용한다.

```text
MeasuredSegment {
  kind: "MEASURED",
  source: "GPS",
  points: [
    { lat, lon, timestamp, accuracyM? },
    ...
  ]
}

EstimatedSegment {
  kind: "ESTIMATED",
  reason: "TEMP_BRIDGE" | "GPS_REACQUIRE",
  from: { lat, lon, timestamp?, source: "GPS" | "TEMP" },
  to:   { lat, lon, timestamp?, source: "GPS" | "TEMP" }
}
```

## 연결 규칙

| 이전 상태 | 신규 위치 | 저장 |
|---|---|---|
| GPS | GPS, 수신 연속 | MEASURED GPS segment 계속 |
| GPS | TEMP | ESTIMATED bridge |
| TEMP | TEMP | ESTIMATED bridge |
| TEMP | GPS 재수신 | ESTIMATED bridge 후 새 MEASURED GPS segment 시작 |
| LAST FIX | GPS 재수신, TEMP 없음 | ESTIMATED GPS_REACQUIRE bridge 후 새 MEASURED segment |
| GPS OFF 후 TEMP만 연속 입력 | TEMP | 세션 유지 + ESTIMATED bridge 추가 |

GPS 재수신 시 마지막 TEMP가 있다면 LAST FIX를 건너뛰지 않고 **마지막 기록점 → 신규 GPS**만 연결한다.

## 화면

- MEASURED: 기존 TRACK 실선.
- ESTIMATED: 동일 계열의 점선/낮은 강조도.
- 추정선을 실제 TRACK과 같은 스타일로 그리지 않는다.
- TRACK HUD는 최소한 measured와 estimated 거리를 내부적으로 별도 유지한다.
- 합계를 보여주더라도 추정 포함 여부를 구분한다.

예:
```text
TRACK 8.4 KM
EST 1.2 KM
```

## 거리 계산

- `measuredKm`: MEASURED segment 내부 GPS 포인트 간 거리만 합산.
- `estimatedKm`: ESTIMATED bridge의 직선거리만 합산.
- `totalKm`이 필요하면 파생값 `measuredKm + estimatedKm`로 계산하되 저장의 기준값으로 삼지 않는다.
- 속도/평균속도/실제 이동거리 통계에는 ESTIMATED를 기본 포함하지 않는다.

## GPX

기본 GPX TRACK에는 MEASURED segment만 각각 별도 `<trkseg>`로 내보낸다.

ESTIMATED bridge는 실제 GPS 궤적으로 합치지 않는다. V28 구현 시 다음 중 하나를 택한다.
1. 별도 `<rte>` / route point로 내보내기.
2. 앱 전용 extension으로 추정구간 메타데이터 보존.

Garmin 호환성 때문에 기본값은 **실측 TRACK 우선**으로 한다. 추정선을 일반 `<trkseg>`에 섞지 않는다.

## BACKTRACK

- MEASURED segment: 기존처럼 기록점을 따라 역추적 가능.
- ESTIMATED segment: 실제 지나간 선으로 취급하지 않는다.
- 역추적이 추정구간 경계에 도달하면 UI에 ESTIMATED 상태를 표시하고 다음 확인점/끝점으로 직선 안내한다.
- 추정구간 위에서 자동으로 세부 경로가 있었다고 가정하지 않는다.

## V1 마이그레이션

현재 `tactical_recon_track_logs_v1`의 `points: [[lat, lon, timestamp], ...]`는 당시 GPS에서만 만들어졌으므로 읽을 때 하나의 legacy MEASURED segment로 해석할 수 있다.

권장 방식:
- 기존 V1 키는 그대로 둔다.
- V28은 V1 reader + V2 reader를 모두 제공한다.
- 사용자가 기존 로그를 수정/복제할 때만 V2로 변환한다.
- 앱 시작 시 전체 데이터를 강제 재작성하지 않는다.

## 구현 순서

1. PLAN ID를 TARGET ID에서 분리.
2. TrackV2 reader/writer 추가.
3. V1 read compatibility 추가.
4. GPS 연속 measured segment 기록.
5. TEMP / GPS reacquire bridge 기록.
6. 지도 스타일 분리.
7. 거리 통계 분리.
8. GPX 정책 적용.
9. BACKTRACK에서 estimated 경계 처리.
10. 실제 iPhone GPS OFF/ON, 신호손실/재수신 실기기 검증.
