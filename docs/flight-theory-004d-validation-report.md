# FLIGHT-THEORY-004D Validation Report

## 1. Input integrity

- Source of truth: `work/flight-theory-validation/004d/` and `work/source-ingestion/source-batch-004d/`
- All eight paired JSON payloads have matching normalized SHA-256 checksums.
- Input drift: **0** (`false`)
- Ingestion rerun: **0**; source recollection: **0**

## 2. Exact input split

| Layer | Count |
|---|---:|
| Primary Knowledge | 20 |
| Supporting Visual | 1 |
| Blocked Table | 1 |

The 22 validation inputs are not reported as 22 Knowledge records.

## 3. Primary validation results

| Type | VALIDATED | VALIDATED_WITH_WARNING | BLOCKED |
|---|---:|---:|---:|
| FlightControlConcept | 0 | 1 | 0 |
| SensorComponent | 2 | 2 | 0 |
| SensorPrinciple | 3 | 0 | 0 |
| NavigationKnowledge | 3 | 2 | 0 |
| FailureKnowledge | 0 | 1 | 0 |
| Relationship | 0 | 6 | 0 |
| **Total** | **8** | **12** | **0** |

The warning results preserve aviation/general-sensor scope, technical-failure boundaries, or relationship review constraints. They are not blockers.

## 4. Sensor and control fidelity

- Gyroscope remains rotation/angular-motion and attitude/direction instrumentation knowledge.
- Accelerometer remains acceleration-force knowledge.
- Magnetometer/flux gate remains magnetic-field direction/reference knowledge.
- Barometric instrumentation remains pressure-derived aviation indication knowledge.
- Sensor-role mismatch: **0**.
- FlightControlConcept remains `AVIATION_NAVIGATION`; it was not generalized to a UAS flight controller.
- IMU synthesis: **0**; sensor-fusion synthesis: **0**.

## 5. Navigation and failure boundaries

- GPS-specific evidence remains GPS-specific where applicable.
- GNSS wording is retained only for the FAA ADS-B/GNSS evidence and carries a scope warning.
- GPS to RTH, Position Hold, Home Point, Geofencing, obstacle detection, or failsafe inference: **0**.
- Barometer to Altitude Hold inference: **0**.
- FailureKnowledge remains a technical GPS SIS integrity indication; emergency response procedure is absent.

## 6. Relationships

All six supplied relationships have existing endpoints, direct evidence, locators, and valid source-to-target direction. No relationship was generated during Validation. Relationship-based IMU, sensor fusion, flight-mode, or emergency-response inference is prohibited and absent.

## 7. Visual, table, formula

- Visual: `SUPPORTIVE_VERIFIED`; it is supporting evidence, not Knowledge, and does not block Primary validation.
- Table: `PAGE_REVIEW_REQUIRED`; the text layer and relevance are recorded, but page-layout review remains necessary. It does not block unrelated Primary Knowledge.
- Formula: 0; no formula was created.

## 8. Technical context

Primary non-relationship Knowledge context remains:

- `AVIATION_NAVIGATION`: 8
- `SENSOR_GENERAL`: 3
- `SATELLITE_NAVIGATION_GENERAL`: 3
- `UAS_SPECIFIC`: 0

Question preview permits sensor identification/function/comparison and GPS/navigation accuracy/integrity concepts. Drone configuration, flight modes, RTH, Home Point, Position Hold, Geofencing, and emergency procedures remain prohibited.

## 9. Duplicate and boundary analysis

- 004B: `flight-control-concept:attitude-information` is `CONTROL_SYSTEM_004B_OVERLAP`, treated as the same entity area with a different evidence role—not an exact duplicate.
- 004G: `sensor-failure:gps-sis-integrity-indication` is `TECHNICAL_VS_EMERGENCY`; 004D keeps technical integrity knowledge and does not add operational response.
- Exact duplicate: 0. Existing 004B/004G Canonical artifacts were not modified.

## 10. Candidate inventory and gaps

- Canonical candidates: 20 (`READY` 8, `READY_WITH_WARNING` 12)
- Issued Canonical IDs: 0; every `canonicalId` is `null`.
- Canonical artifact generated: no.
- Protected gaps: 14, unchanged: flight-controller, imu, position-hold, altitude-hold, sensor-fusion, home-point, return-to-home, geofencing, vision-sensor, ultrasonic-sensor, obstacle-detection, calibration, sensor-error, compass-error.

Topic validation coverage across 24 topics:

- `VALIDATED`: 4
- `VALIDATED_WITH_GAPS`: 6
- `NO_KNOWLEDGE`: 14

## 11. Runtime readiness

Result: **READY_FOR_CANONICAL_BUILD_WITH_GAPS**.

There are no Primary Knowledge blockers. The unresolved supporting table does not block the batch. The readiness retains explicit constraints for UAS-specific coverage 0 and the 14 protected gaps.

- TS: `WAITING_FOR_MANUAL_FILE` (not a Validation blocker)
- 004E: `PARTIAL_UNCHANGED`
- Unsupported inference: 0

## 12. Mutation guard

- Existing Flight Theory Canonical baseline: 180, unchanged
- 004A/B/C/F/G/H, Active Pack, AtomicFact, Graph, Graph Version, Question, Legal, Weather, Supabase mutations: 0
- 004D Canonical generation: 0

The next permissible task is a separate 004D Canonical build/freeze step; this Validation run did not perform it.
