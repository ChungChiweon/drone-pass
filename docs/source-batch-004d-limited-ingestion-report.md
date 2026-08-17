# SOURCE-BATCH-004D Limited Ingestion Report

## 1. Scope

004CDE registry에서 `ACQUIRED`, checksum 일치, 004D mapping이 확인된 로컬 공식 원문만 사용했다. 이 단계는 detached ingestion과 validation input 준비만 수행했다. Validation, Canonical, Shadow Runtime, Question 생성은 실행하지 않았다.

## 2. Sources

| Source | Authority/currentness | Local validation | Role |
| --- | --- | --- | --- |
| FAA-H-8083-31B AMT Airframe | OFFICIAL_SECONDARY / CURRENT | checksum verified, 1052 pages | 항공 계기, gyro, accelerometer, magnetic/pressure sensing, GPS/GNSS aviation context |
| GPS SPS Performance Standard, 5th Edition | OFFICIAL_SECONDARY / CURRENT | checksum verified, 196 pages | GPS signal, position/time performance, SIS accuracy and integrity |

TS manual은 `WAITING_FOR_MANUAL_FILE`이며 전체 004D blocker로 사용하지 않았다.

## 3. Page and section processing

직접 관련된 13개 page/section을 처리했다. FAA pages 521, 534, 551, 564, 570, 571, 573, 663, 671과 GPS SPS pages 23, 53, 66, 107이다. Source section map에는 sensor/navigation/control/calibration/failure signal과 relevance/context를 기록했다.

## 4. Topic coverage

24개 taxonomy topic을 전수 평가했다.

| Status | Count |
| --- | ---: |
| INGESTED | 7 |
| INGESTED_WITH_GAPS | 3 |
| NO_KNOWLEDGE | 14 |

General sensor/navigation 근거가 있어도 특정 UAS mode나 자동 동작으로 확대하지 않았다.

## 5. Flight control concept

1건을 생성했다. Piezoelectric gyro signal이 attitude/direction information 계산 변수로 사용될 수 있다는 FAA 문언만 보존했다. Flight Controller 구조나 sensor fusion은 추론하지 않았다.

## 6. Sensor components

4건을 생성했다.

- Gyroscope: rotation/angular-motion sensing의 항공 계기 context
- Accelerometer: inertia에 따른 acceleration-force indication
- Magnetometer/flux gate: Earth magnetic-field flux 변화와 electrical pickoff
- Barometric pressure instrument: pressure-derived aviation indication

Barometer를 drone altitude-hold sensor로 확대하지 않았다.

## 7. Sensor principles

3건을 생성했다: gyroscopic rigidity, accelerometer inertia, magnetic-flux pickoff. 각 measured variable과 raw evidence를 유지했다. IMU 구성은 생성하지 않았다.

## 8. Navigation knowledge

5건을 생성했다: GPS navigation, GNSS position data, SPS position/time service, GPS SIS accuracy aspects, magnetic direction signal. GPS SPS는 satellite-navigation general source로만 사용했고 Position Hold, Home Point, RTH, Geofencing을 생성하지 않았다.

## 9. Failure knowledge

GPS SIS integrity failure indication 1건을 기술 오류 Knowledge로 생성했다. Response procedure는 `null`이며 004G emergency 대응과 분리했다. Compass recovery나 calibration 절차를 추가하지 않았다.

## 10. Relationships

Evidence와 locator를 갖는 6건만 생성했다. Gyro-attitude support, magnetometer-compass support 및 sensor principle/component `PART_OF` 관계를 포함한다. 새 endpoint나 상식 기반 edge는 없다.

## 11. Visual, table, formula

- Visual link: 1 (`SUPPORTIVE`, interpretation required)
- Table candidate: 1 (GPS navigation-message table, `PAGE_REVIEW_REQUIRED`)
- Formula: 0

Position, attitude, sensor-fusion, GPS geometry 공식을 기억으로 생성하지 않았다.

## 12. Technical context

| Context | Count |
| --- | ---: |
| AVIATION_NAVIGATION | 8 |
| SENSOR_GENERAL | 3 |
| SATELLITE_NAVIGATION_GENERAL | 3 |
| UAS_SPECIFIC | 0 |

Question constraint는 general navigation/sensor concept만 허용하고 drone RTH, Position Hold, calibration procedure 등은 금지한다.

## 13. 004B / 004G boundary

- Attitude information: `CONTROL_SYSTEM_004B_OVERLAP`
- GPS integrity indication: `SENSOR_FAILURE_004G_OVERLAP`

004B structure와 004G emergency Canonical은 수정하지 않았다.

## 14. Remaining gaps

14개 topic이 `NO_KNOWLEDGE`다: Flight Controller, IMU, Position Hold, Altitude Hold, Sensor Fusion, Home Point, Return To Home, Geofencing, Vision Sensor, Ultrasonic Sensor, Obstacle Detection, Calibration, Sensor Error, Compass Error.

특히 GPS를 Position Hold/RTH로, barometer를 Altitude Hold로, gyro/accelerometer/magnetometer를 IMU/sensor fusion으로 자동 연결하지 않았다.

## 15. Validation input

22개 입력을 준비했다.

- ELIGIBLE: 8
- ELIGIBLE_WITH_WARNING: 13
- BLOCKED_TABLE: 1

Validation은 실행하지 않았고 Canonical 생성도 하지 않았다.

## 16. Quality metrics

Source locator, sensor/navigation/control structure, relationship evidence와 provenance completeness는 1.0이다. Extraction quality는 0.94다. UAS-specific coverage는 0이며 unsupported inference count도 0이다.

## 17. Preservation

- TS: `WAITING_FOR_MANUAL_FILE`
- 004E: `PARTIAL_UNCHANGED`
- Existing Flight Theory Canonical: 180 unchanged
- Active Pack / AtomicFact / Graph / Question: mutation 0
- Legal / Weather runtime: mutation 0
- Supabase: mutation 0
