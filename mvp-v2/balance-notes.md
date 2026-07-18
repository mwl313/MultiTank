# Phase 6 통합 검토 — 밸런스 튜닝 + 개선점

> 2026-07-18 리뷰 기준

---

## 1. 통합 상태 점검

### Import 체인 ✅
모든 import/export 경로 정상. 순환 참조 없음.

### Config 연결 ✅
모든 게임 수치가 config/ 파일에서 import됨.
하드코딩 의심 지점은 아래 "코드 개선" 섹션 참고.

### 게임 루프 ✅
requestAnimationFrame 정상 작동. dt 상한 100ms 적용.

---

## 2. 게임 플로우 검증

| 항목 | 상태 | 비고 |
|---|---|---|
| WASD 이동 | ✅ | 가속 기반, friction 정상 |
| 드리프트 | ✅ | W+A/D 유지 시 발생, 인디케이터 정상 |
| 마우스 발사 | ✅ | 500ms 쿨다운, 포탑 방향 발사 |
| 적 스폰 | ✅ | 2초 후 시작, 2초 간격, 최대 40마리 |
| 적 AI 추적 | ✅ | atan2 직진형 |
| 총알-적 충돌 | ✅ | 10 데미지, 즉시 처치 확인 |
| 탱크-적 충돌 | ✅ | 데미지+넉백+무적 500ms |
| HP 0 → 게임오버 | ✅ | 화면 정지, GAME OVER 표시 |
| R 키 재시작 | ✅ | 전체 리셋 후 정상 재개 |

---

## 3. 발견된 경미한 이슈

### 3-1. 재시작 후 `lastTime` 미초기화 (낮음)
- **파일**: main.js:241
- **현상**: 게임오버 동안에도 gameLoop은 계속 돌기 때문에 `lastTime`이 갱신됨. 재시작 직후 dt는 정상(~16ms).
- **영향**: 없음. gameLoop이 멈추지 않으므로 자연스럽게 처리됨.

### 3-2. 적 HP 바 색상 하드코딩 (낮음)
- **파일**: enemy.js:328,332
- **현상**: HP 바 배경('#333'), HP 색상('#2ecc71'/'#f39c12'/'#e74c3c') 하드코딩
- **제안**: 추후 config로 분리 고려. MVP에선 무방.

### 3-3. 적 분리 배율 하드코딩 (중간)
- **파일**: enemy.js:264
- **현상**: `minSeparation = 1.2`가 상수로 박혀있음
- **제안**: SPAWN_CONFIG에 `enemySeparation: 1.2` 추가 검토

### 3-5. 적 HP 바 노란색 불일치 (중간) ← 에이전트 발견
- **파일**: enemy.js:332 vs main.js:205
- **현상**: 플레이어 HP 바는 `#f1c40f`(노랑), 적 HP 바는 `#f39c12`(주황). 같은 "중간 체력" 의미인데 색상 다름.
- **수정**: enemy.js:332의 `'#f39c12'` → `'#f1c40f'`로 통일

### 3-6. 하드코딩 종합 목록 (낮음~중간)
모든 Phase가 config 기반으로 설계됐지만, 아래 값들이 상수로 남아있음.
MVP 동작에는 문제없으나 Phase 확장 시 config로 이관 권장.

| 파일 | 라인 | 하드코딩 값 | 제안 config 위치 |
|---|---|---|---|
| main.js | 251 | `dt > 100` | `GAME_CONFIG.maxDeltaTime: 100` |
| tank.js | 96,105 | `dtSec * 60`의 `60` | `GAME_CONFIG.targetFPS` 참조 |
| tank.js | 120 | `speed > 0.5` | `PHYSICS_CONFIG.minSpeedForDrift` |
| camera.js | 46 | `lerpSpeed = 8` | `GAME_CONFIG.cameraLerpSpeed` |
| map.js | 72 | `obstacleCount * 100` | `MAP_CONFIG.maxGenerationAttempts` |
| enemy.js | 72 | `type: 'scout'` | `SPAWN_CONFIG.defaultType` |
| enemy.js | 188 | `tankSpeed > 10` | `SPAWN_CONFIG.minSpeedForDirection` |
| enemy.js | 199 | `Math.PI / 3` (60°) | `SPAWN_CONFIG.forwardAvoidanceAngle` |
| enemy.js | 264 | `minSeparation = 1.2` | `SPAWN_CONFIG.enemySeparationFactor` |
| enemy.js | 278 | `dist > 0.001` | `PHYSICS_CONFIG.epsilon` |
| enemy.js | 323-333 | HP 바 높이4, 오프셋8, 색상들 | `config/hud.js` 신설 검토 |
| input.js | 40 | `['Space','ArrowUp',...]` | `CONTROL_CONFIG.preventDefaultKeys` |
| input.js | 61 | `e.button === 0` | `CONTROL_CONFIG`에서 mouseButton 파생 |

### 3-4. forwardAvoidance 임계값 하드코딩 (낮음)
- **파일**: enemy.js:187
- **현상**: `tankSpeed > 10` — "이동 중" 판정 임계치
- **제안**: config에 추가하는 게 일관성 있으나, 실용적 영향은 거의 없음

### 3-7. R키 연속 입력 시 재시작 루프 (중간) ★수정완료
- **파일**: input.js:37
- **현상**: `keydown` 이벤트가 `e.repeat`을 체크하지 않아, R키를 길게 누르면 재시작이 연속 발동
- **수정**: `if (e.repeat) return;` 추가

### 3-8. 카메라 재시작 시 미초기화 (낮음)
- **파일**: main.js:81-110 (`restartGame`)
- **현상**: 재시작 후 카메라가 사망 지점에 남아있다가 새 탱크 위치로 lerp됨 → 0.5~1초간 화면 스크롤
- **제안**: `camera.x = 0; camera.y = 0;` 또는 스냅 이동 추가

### 3-9. 탱크-장애물 충돌 없음 (중간)
- **파일**: tank.js:65-146 (`updateTank`)
- **현상**: 탱크가 장애물을 통과함. 적은 장애물과 충돌하는데 탱크는 안 함 → 비대칭
- **제안**: 의도된 MVP 설계일 수 있으나, CLAUDE.md의 tank.js 설명에 "충돌" 명시됨. 추후 추가 검토.

### 3-10. 탱크 충돌 넉백 후 장애물 재검사 없음 (낮음)
- **파일**: main.js updatePlaying 순서 (enemy→collision 순)
- **현상**: 적이 탱크에 의해 장애물 안으로 밀려나면 1프레임 동안 장애물 내부에 머묾
- **영향**: 다음 프레임 `updateEnemies`에서 보정됨. 일시적 시각 글리치 가능.

### 3-11. `weightedRandom` 부동소수점 경계 (낮음)
- **파일**: enemy.js:14-22
- **현상**: 가중치 합이 부동소수점 오차로 1.0 미만일 때 fallback이 첫 키 반환 → scout 편향
- **영향**: 발생 확률 극히 낮음 (~1/10^16). 실질적 영향 없음.

### 3-12. `pushCircleOutOfRect` 작은 dist에서 폭발적 밀림 (낮음)
- **파일**: enemy.js:48-55
- **현상**: `dist`가 0에 매우 가깝지만 0은 아닐 때 `dx/dist`가 거대해져 적이 순간이동
- **제안**: `dist < 0.001` 임계값 추가 (collision.js:79와 일관성)

---

## 4. 밸런스 튜닝 제안

### 4-1. 스폰 간격 (spawnInterval: 2.0초)
- **현재**: 2초마다 1마리 → 80초 후 40마리 풀
- **체감**: 초반 20~30초가 매우 한산함. 초보자에게는 적절하나, 긴장감이 부족할 수 있음.
- **제안**: 
  - 초반 30초는 2초 유지 → 이후 1.5초로 가속
  - 또는 `initialDelay: 1.0`으로 줄여서 1초부터 시작
  - Vampire Survivors처럼 시간 경과에 따라 spawnInterval 감소하는 커브 고려

### 4-2. 탱크 최대 속도 (maxSpeed: 250px/s)
- **현재**: 맵 3000px 기준 종단하는 데 약 12초
- **체감**: runner(200)보다 25% 빠름. scout(120)보다 2배 빠름. 적절함.
- **제안**: 현상 유지. 다만 드리프트 체감을 높이려면 maxSpeed를 280~300으로 올리는 것도 고려.

### 4-3. 드리프트 임계값 (driftThreshold: 0.3 rad ≈ 17°)
- **현재**: W+A/D 유지 시 약 0.1~0.2초 후 발동
- **체감**: 생각보다 자주 발동됨. "특별한 상태"라는 느낌이 약할 수 있음.
- **제안**: 0.4~0.5 rad (23~29°)로 올리면 "의도적인 드리프트"만 감지. 단, 드리프트 데미지 2배가 리스크 요인이므로 너무 올리면 드리프트의 의미가 퇴색.

### 4-4. 적 속도 vs 탱크 속도
| 적 | 속도 | 탱크 대비 | 체감 |
|---|---|---|---|
| Scout | 120 | 48% | 느림, 기본 몹 적절 |
| Runner | 200 | 80% | 빠름, 위협적 |
| Bruiser | 80 | 32% | 매우 느림, 탱커 역할 |

- **제안**: Bruiser 속도를 100~110으로 올려서 최소한의 위협감 부여. 현재는 너무 쉽게 회피 가능.

### 4-5. 총알 데미지 vs 적 HP
| 적 | HP | 필요 탄환 | 처치 시간 |
|---|---|---|---|
| Scout | 20 | 2발 | 1.0초 |
| Runner | 10 | 1발 | 0.5초 |
| Bruiser | 60 | 6발 | 3.0초 |

- **체감**: Scout/Runner는 적절. Bruiser 6발(3초)은 좀 길게 느껴질 수 있음.
- **제안**: Bruiser HP를 45~50으로 낮추거나, 플레이어 기본 데미지를 12로 올리는 것 검토.

### 4-6. 적 데미지 vs 탱크 HP
| 적 | 데미지 | 처치 필요 횟수 | DPS (무적 500ms 감안) |
|---|---|---|---|
| Scout | 5 | 20회 | ~10 |
| Runner | 3 | 34회 | ~6 |
| Bruiser | 10 | 10회 | ~20 |

- **체감**: Bruiser 위주로 쌓이면 5~10초 내 사망 가능. 긴장감 있음.
- **드리프트 시**: Bruiser 20 DPS → 탱크 5초 내 사망. 위험/보상 밸런스 적절.

---

## 5. 코드 구조 개선 제안

### 5-1. 충돌 객체 직접 접근 (중간)
- **collision.js:14,17**: `bulletPool.bullets`, `enemyPool.pool` 내부 배열 직접 접근
- **제안**: `bulletPool.getActiveBullets()`, `enemyPool.getActiveEnemies()` 같은 이터레이터 제공하면 캡슐화 개선

### 5-2. 재시작 시 일괄 비활성화 (낮음)
- **main.js:86-94**: 총알/적을 직접 순회하며 `active = false` 설정
- **제안**: `bulletPool.deactivateAll()`, `enemyPool.deactivateAll()` 메서드로 캡슐화

### 5-3. updatePlaying 함수 비대화 (낮음)
- **main.js:130-175**: updatePlaying이 45줄. HUD/게임오버 로직 포함.
- **제안**: Phase 확장 시 updatePlaying을 더 작은 함수로 분리 고려

### 5-4. 탱크-장애물 충돌 없음 (참고)
- 현재 탱크는 장애물을 통과함. 적만 장애물과 충돌.
- 의도된 설계일 수 있으나, 추후 탱크-장애물 충돌 추가 시 맵 디자인 재검토 필요.

---

## 6. Phase 2+ 확장 시 주의점

1. **오브젝트 풀 확장**: 새 적 타입 추가 시 `EnemyPool.activate()`에 타입별 초기화 확장 필요
2. **멀티플레이어**: PLAYER_INPUT이 싱글턴 구조. 분리 필요.
3. **무기 시스템**: Tank.weapon이 현재 고정. 다중 무기/교체 시스템 추가 시 WEAPON_CONFIG 구조 확장 필요.
4. **성능**: 현재 O(n²) 루프 3개(적끼리, 적-장애물, 총알-적). 적 수가 100+로 늘면 공간 분할(spatial hash/grid) 도입 필요.
5. **config 불변성**: 몇몇 값이 config 참조 후 로컬 변수에 캡처되어 런타임 변경이 반영 안 됨 (의도된 동작).
