# MVP v2 — 업데이트된 설계서

> 작성일: 2026-07-18
> 이전 버전: 02-MVP-정의.md (폐기)

---

## 변경 사항 요약

| # | 변경 | 사유 |
|:--|:-----|:-----|
| 1 | 모든 요소 설정 기반 (하드코딩 금지) | 교체·변경·확장 가능성 확보 |
| 2 | 통합모드(솔로) 디폴트, 멀티 스텁 유지 | MVP는 솔로지만 확장 포인트 사전 설계 |
| 3 | 메타요소(웨이브·레벨업·업그레이드) 제외 | MVP는 순수 메커니즘 검증이 목적 |
| 4 | 대규모 랜덤 맵 생성 | 고려 중인 방향 반영 |
| 5 | 물리 기반 이동 (가속도·모멘텀·드리프트) | "정직한 이동"이 아닌 질량감 있는 움직임 |

---

## 1. 물리 검증: 가속도 + 모멘텀 + 드리프트

### 가능 여부: ✅ 완전 가능

Canvas 2D에서 벡터 기반 물리로 충분히 구현 가능. 복잡한 물리 엔진 불필요.

### 물리 모델

```
탱크는 두 개의 독립된 방향을 가진다:
  1. 섀시 방향 (chassisAngle) — WASD가 제어
  2. 포탑 방향 (turretAngle)  — 마우스가 제어

탱크는 velocity 벡터를 가진다 (vx, vy).
velocity는 chassisAngle과 즉시 일치하지 않는다. ← 이게 드리프트의 핵심
```

### 이동 입력 → 물리 변환

| 키 | 동작 |
|:---|:-----|
| **W** | 섀시 방향으로 가속 (accel × dt) |
| **S** | 섀시 반대 방향으로 가속 (후진) |
| **A** | 섀시 각도 반시계 회전 (turnRate × dt) |
| **D** | 섀시 각도 시계 회전 (turnRate × dt) |

### 드리프트 발생 조건

```
1. 탱크가 북쪽으로 이동 중 (velocity = (0, -200))
2. D를 눌러 섀시를 오른쪽으로 회전 (chassisAngle → 90°)
3. velocity는 여전히 북쪽으로 향함 (관성)
4. W를 누르면 섀시 방향(동쪽)으로 가속 시작
5. velocity = 북쪽 벡터 + 동쪽 가속 벡터 → 북동쪽으로 서서히 전환

결과: 탱크가 북쪽으로 미끄러지면서(드리프트) 동쪽으로 방향을 트는 움직임
```

### 구현에 필요한 물리 파라미터

```javascript
const PHYSICS = {
  maxSpeed: 250,          // px/s
  acceleration: 600,       // px/s² (W 누를 때 증가율)
  friction: 0.92,          // 감속 계수 (아무 키도 안 누를 때, 매 프레임 곱함)
  turnRate: 3.0,           // rad/s (섀시 회전 속도)
  driftFactor: 0.85,       // 드리프트 강도 (낮을수록 더 미끄러움)
  reverseMultiplier: 0.5,  // 후진 가속 계수
  brakingForce: 1.5,       // 브레이크(S) 추가 감속 배율
};
```

### 드리프트 시각 피드백

- 섀시가 velocity 방향과 각도 차이가 클수록:
  - 타이어 자국(스키드 마크) 그리기
  - 먼지 파티클 발생 (선택적)
- 드리프트 각도가 threshold 초과 시:
  - 사이드 데미지 판정 (적에게 옆구리 충돌 시 추가 피해)

### 물리 업데이트 의사코드

```javascript
function updateTank(dt) {
  // 1. 회전 (A/D)
  if (keys.left)  tank.chassisAngle -= PHYSICS.turnRate * dt;
  if (keys.right) tank.chassisAngle += PHYSICS.turnRate * dt;

  // 2. 가속 (W/S)
  let accelX = 0, accelY = 0;
  if (keys.forward) {
    accelX += Math.cos(tank.chassisAngle) * PHYSICS.acceleration;
    accelY += Math.sin(tank.chassisAngle) * PHYSICS.acceleration;
  }
  if (keys.reverse) {
    accelX -= Math.cos(tank.chassisAngle) * PHYSICS.acceleration * PHYSICS.reverseMultiplier;
    accelY -= Math.sin(tank.chassisAngle) * PHYSICS.acceleration * PHYSICS.reverseMultiplier;
  }

  // 3. 속도 업데이트
  tank.vx += accelX * dt;
  tank.vy += accelY * dt;

  // 4. 감속 (마찰)
  if (!keys.forward && !keys.reverse) {
    tank.vx *= PHYSICS.friction;
    tank.vy *= PHYSICS.friction;
  }

  // 5. 최대 속도 제한
  const speed = Math.sqrt(tank.vx ** 2 + tank.vy ** 2);
  if (speed > PHYSICS.maxSpeed) {
    tank.vx = (tank.vx / speed) * PHYSICS.maxSpeed;
    tank.vy = (tank.vy / speed) * PHYSICS.maxSpeed;
  }

  // 6. 드리프트 각도 계산 (섀시 방향 vs 실제 이동 방향)
  const moveAngle = Math.atan2(tank.vy, tank.vx);
  tank.driftAngle = angleDiff(tank.chassisAngle, moveAngle);

  // 7. 위치 업데이트
  tank.x += tank.vx * dt;
  tank.y += tank.vy * dt;
}
```

---

## 2. 설정 기반 아키텍처 (하드코딩 금지)

### 원칙
- 모든 수치, 타입, 동작 파라미터는 `config/` 디렉토리에 JSON 또는 JS 객체로 분리
- 게임 로직에는 `config.XXX` 참조만 존재
- 새 탱크 타입, 새 적 타입, 새 무기 타입을 config만 추가해서 확장 가능

### 설정 파일 구조

```
config/
├── game.js          ← 캔버스 크기, FPS, 디버그 플래그
├── physics.js       ← 가속도, 마찰, 드리프트 파라미터
├── tank.js          ← 탱크 기본 스탯 (HP, 크기, 속도 한계)
├── enemies.js       ← 적 타입별 스탯 (HP, 속도, 데미지, 색상)
├── weapons.js       ← 무기 타입별 스탯 (발사 간격, 데미지, 탄속)
├── map.js           ← 맵 생성 파라미터 (크기, 장애물 밀도, 시드)
└── controls.js      ← 키 바인딩 (리맵핑 가능)
```

### 예: config/tank.js

```javascript
export const TANK_CONFIG = {
  default: {
    hp: 100,
    width: 48,
    height: 32,
    color: '#4a9e4a',
    turretColor: '#3a7e3a',
    turretLength: 28,
    turretWidth: 8,
  },
  // 확장 예정
  // scout: { hp: 60, width: 36, height: 24, ... },
  // heavy: { hp: 200, width: 56, height: 40, ... },
};
```

### 예: config/enemies.js

```javascript
// 적 타입 정의 — config만 수정해서 새 타입 추가 가능
export const ENEMY_TYPES = {
  scout:  { name: 'Scout',  hp: 20, speed: 120, damage: 5,  radius: 10, color: '#e74c3c' },
  bruiser:{ name: 'Bruiser',hp: 60, speed: 80,  damage: 10, radius: 15, color: '#e67e22' },
  runner: { name: 'Runner', hp: 10, speed: 200, damage: 3,  radius: 8,  color: '#f1c40f' },
};

// 스폰 파라미터 — 리서치 기반 (VS + Megabonk + Brotato 분석)
export const SPAWN_CONFIG = {
  // --- 스폰 위치 ---
  // VS: 화면 바로 바깥 + 50% 더 → 1080p 기준 ~600-800px
  // 우리 맥락: 3000px 대맵 + 빠른 이동 → 거리 기반
  spawnMode: 'radial',          // 'radial' | 'screenEdge'
  spawnDistance: 800,           // px — 탱크 중심 거리
  minSpawnDistance: 500,        // px — 최소 거리 (이 안은 금지)

  // Megabonk 문제 해결: 전방 스폰 확률 감소
  forwardAvoidance: 0.5,        // 진행방향 120도 내 스폰 계수 (낮을수록 적게)

  // --- 빈도 ---
  spawnInterval: 2.0,           // 초 — 적 1마리 간격
  initialDelay: 2.0,            // 게임 시작 후 첫 스폰 대기

  // --- 상한 & 풀링 (Brotato: 명확한 cap, Megabonk: data-oriented pool) ---
  maxEnemies: 40,               // 최대 동시 적 수
  despawnDistance: 2500,        // 디스폰 거리 (성능 유지)
  poolSize: 50,                 // 오브젝트 풀 할당량

  // --- 분포 (고정) ---
  enemyWeights: { scout: 0.55, runner: 0.30, bruiser: 0.15 },

  // --- 충돌 회피 ---
  minSpawnClearance: 48,
  spawnRetries: 5,
};
```

---

## 3. 조작: 통합 모드 (MVP) + 멀티플레이어 스텁

### MVP 입력 모델

| 입력 | 역할 | 담당 |
|:----|:----|:-----|
| **WASD** | 섀시 이동 (가속/회전) | 운전수 |
| **마우스 이동** | 포탑 조준 | 포수 |
| **마우스 L클릭** | 발사 | 포수 |
| **Space** | 드리프트 액션 (추가 가속 + 측면 데미지) | 운전수 |

### 멀티플레이어 스텁

MVP는 솔로지만, 내부적으로는 역할 분리 구조 유지:

```javascript
// game.js — 멀티플레이어 스텁
const PLAYER_INPUT = {
  driver: {
    forward: false,
    reverse: false,
    left: false,
    right: false,
    action: false,   // 드리프트/회피
  },
  gunner: {
    aimX: 0,
    aimY: 0,
    fire: false,
  },
};

// mvp: 하나의 키보드/마우스가 두 역할에 동시 바인딩
// future: 네트워크에서 player[0] = driver, player[1] = gunner
function updateInput() {
  if (NETWORK_MODE === 'solo') {
    PLAYER_INPUT.driver.forward  = keys.w;
    PLAYER_INPUT.driver.left     = keys.a;
    PLAYER_INPUT.driver.right    = keys.d;
    PLAYER_INPUT.driver.reverse  = keys.s;
    PLAYER_INPUT.driver.action   = keys.space;
    PLAYER_INPUT.gunner.aimX     = mouse.x;
    PLAYER_INPUT.gunner.aimY     = mouse.y;
    PLAYER_INPUT.gunner.fire     = mouse.click;
  }
  // else: NETWORK_MODE === 'multi'
  //   driver input <-- Socket.IO player[0]
  //   gunner input <-- Socket.IO player[1]
}
```

---

## 4. 대규모 랜덤 맵 생성

### 방향성 (MVP는 심플하게)

MVP 단계에서는 완전한 절차적 생성보다 **시드 기반 단순 랜덤 맵**으로 시작:

### 맵 구성 요소

```javascript
// config/map.js
export const MAP_CONFIG = {
  width: 3000,           // px (캔버스 1920×1080 기준 1.5배+)
  height: 3000,
  seed: 'default',       // 랜덤 시드 (재현 가능)
  tileSize: 64,          // 그리드 셀 크기

  // 장애물
  obstacleCount: 40,     // 장애물 개수
  obstacleMinSize: 32,
  obstacleMaxSize: 128,
  obstacleTypes: ['rock', 'tree', 'building', 'wall'],

  // 지형 (선택적)
  terrainTypes: ['grass', 'dirt', 'road'],
  terrainClusters: 5,    // 지형 클러스터 개수

  // 경계
  boundaryType: 'wall',  // 'wall' | 'wrap' (화면 경계)
};
```

### 생성 알고리즘 (MVP)

1. **빈 맵**: `map.width × map.height` 초기화
2. **장애물 배치**: 랜덤 좌표에 사각형 배치 (겹침 검사 후)
3. **시드 맵 저장**: `seed` 값으로 동일한 맵 재생성 가능
4. **탱크 스폰 지점**: 맵 중앙 근처, 장애물과 겹치지 않는 위치

### 카메라

- 카메라는 탱크를 중심으로 따라감 (부드러운 lerp)
- 화면보다 큰 맵에서 시야 제한 → 생존 긴장감

```javascript
camera.x = lerp(camera.x, tank.x - canvas.width / 2, 0.1);
camera.y = lerp(camera.y, tank.y - canvas.height / 2, 0.1);
```

---

## 5. MVP 범위 (최종)

### 포함 ✅

| 요소 | 내용 |
|:----|:------|
| **렌더링** | Canvas 2D, 원색 도형 (사각형/원형) |
| **맵** | 시드 기반 랜덤 생성, 장애물 O, 카메라 추적 |
| **탱크 이동** | 가속도 + 모멘텀 + 드리프트 (물리 기반) |
| **탱크 조준** | 마우스 포인터 = 포탑 방향 |
| **탱크 발사** | 마우스 L클릭, 총알 생성 + 이동 + 수명 |
| **적 AI** | 탱크 방향 추적 이동, 적끼리 밀어내기 분산 |
| **적 피격** | 총알 충돌 → HP 감소 → 사망 |
| **탱크 피격** | 적 접촉 → HP 감소 |
| **드리프트 어택** | 고속 드리프트 중 적과 접촉 → 추가 데미지 |
| **게임오버** | HP ≤ 0 → 화면 표시 + R키 재시작 |
| **설정 기반** | 모든 수치는 config/ 분리 |

### 제외 ❌

| 요소 | 사유 |
|:----|:------|
| 웨이브 시스템 | MVP는 지속 스폰 (간격만) |
| 레벨업 / 업그레이드 | 메타 시스템, MVP는 메커니즘 검증 |
| 점수 / EXP | MVP는 생존만 |
| 멀티플레이어 | 스텁만 유지 |
| 사운드 | MVP 폴리싱 아님 |
| 파티클 / 시각 효과 | MVP 폴리싱 아님 |
| 미션 타입 | 기본 생존만 |

---

## 6. 리서치 반영 — 적 스폰 시스템 설계 근거

### 비교 분석표

| 게임 | 스폰 위치 | 스폰 방식 | 최대 적 | 성능 전략 | 특이사항 |
|:----|:---------|:---------|:-------|:---------|:--------|
| **Vampire Survivors** | 화면 바로 바깥 +50% 존 | 타임 기반 pool + 1분 대규모 웨이브 | 무제한 | Batch update + pool | 스테이지별 enemy pool, 시간 따라 강화 |
| **Megabonk** | 사방에서 밀려옴 | 연속 타이머 기반 | 무제한 | 단일 batch 함수 + data-oriented | **문제:** 전방 스폰으로 진행 막힘 (유저 불만) |
| **Brotato** | 맵 끝단 | 이산적 웨이브 (타이머) | **100마리 고정 cap** | 웨이브 단위 batch | 웨이브 간 데드타임 명확 |
| **→ 우리 게임** | **거리 기반 (radial)** | **연속 타이머** | **40 (조정 가능)** | Pool + batch 준비 | **전방 avoid + 대맵 대응** |

### 리서치별 적용 포인트

**VS에서 배운 것:**
- 스폰 distance는 "화면 밖 +50%" 개념을 파라미터화 (spawnDistance 800px)
- 지속 스폰 + 타이머 방식이 뱀서라이크 장르의 정석
- 배치 업데이트가 성능의 핵심 (MVP 후반에 도입)

**Megabonk에서 배운 것:**
- Data-oriented design: 개별 객체 update ❌, 단일 batch 함수 ✅
- **유저 피드백 교훈:** 적이 진행 방향 앞에 스폰되면 게임 경험을 망침
  → `forwardAvoidance` 파라미터 도입: 탱크 진행 방향 120도 범위는 스폰 확률 0.5배
  → 뒤쪽 120도는 1.5배 (추가 가중치)

**Brotato에서 배운 것:**
- 명확한 `maxEnemies` cap이 성능과 체감 난이도 모두 안정화
- 100마리는 우리 MVP에 과하므로 40부터 시작
- 오브젝트 풀링: 생성/삭제 대신 비활성화/재활성화

### 스폰 알고리즘 (리서치 반영 완료)

```javascript
let spawnTimer = 0;

function updateSpawn(dt) {
  spawnTimer += dt;
  if (spawnTimer < SPAWN_CONFIG.spawnInterval) return;
  spawnTimer = 0;

  // Brotato 스타일: 명확한 상한
  if (activeEnemies.length >= SPAWN_CONFIG.maxEnemies) return;

  // 적 타입 선택 (가중치 랜덤)
  const type = weightedPick(SPAWN_CONFIG.enemyWeights);

  // 스폰 위치: 거리 기반 radial (VS + 우리 맥락)
  let angle = Math.random() * Math.PI * 2;

  // Megabonk 문제 해결: 진행 방향 보정
  const tankMoveAngle = Math.atan2(tank.vy, tank.vx);
  if (isInRange(angle, tankMoveAngle, Math.PI / 3)) {  // 60도 좌우 = 120도
    if (Math.random() > SPAWN_CONFIG.forwardAvoidance) {
      angle += Math.PI;  // 반대 방향으로 보정
    }
  }

  let sx = tank.x + Math.cos(angle) * randomRange(
    SPAWN_CONFIG.minSpawnDistance,
    SPAWN_CONFIG.spawnDistance
  );
  let sy = tank.y + Math.sin(angle) * randomRange(
    SPAWN_CONFIG.minSpawnDistance,
    SPAWN_CONFIG.spawnDistance
  );

  // 맵 경계 클램프
  sx = clamp(sx, 0, MAP_CONFIG.width);
  sy = clamp(sy, 0, MAP_CONFIG.height);

  // 장애물 겹침 검사 (최대 5회)
  const enemyRadius = ENEMY_TYPES[type].radius;
  for (let i = 0; i < SPAWN_CONFIG.spawnRetries; i++) {
    if (!isOverlapping(sx, sy, enemyRadius, obstacles)) break;
    angle += Math.PI / 4;  // 45도씩 돌려서 재시도
    sx = clamp(tank.x + Math.cos(angle) * SPAWN_CONFIG.spawnDistance, 0, MAP_CONFIG.width);
    sy = clamp(tank.y + Math.sin(angle) * SPAWN_CONFIG.spawnDistance, 0, MAP_CONFIG.height);
  }

  // Pool에서 적 활성화 (Megabonk 스타일)
  activateEnemy(type, sx, sy);
}
```

### 스폰 파라미터 튜닝 가이드

| 파라미터 | 느낌 변화 | 상황 |
|:--------|:---------|:------|
| `spawnInterval` ↓ | 적이 더 빠르게 몰려옴 | 난이도 UP |
| `spawnDistance` ↓ | 적이 더 가까이에서 나타남 | 갑작스러움 UP, 회피 시간 ↓ |
| `forwardAvoidance` ↓ | 전방에서 적 더 자주 나타남 | 메가봉크 느낌 (막힘) |
| `maxEnemies` ↑ | 화면이 적으로 가득 참 | 카오스 UP, 성능 부하 ↑ |
| `minSpawnDistance` ↑ | 적이 멀리서 나타나 접근 시간 ↑ | 여유 UP, 템포 ↓ |

---

## 7. 파일 구조 (MVP v2)

```
nhn-ai-game-jam-2026/
└── 2D리메이크/
    ├── 01-차별점-아이데이션.md     ← 기존 (변경 없음)
    ├── 02-MVP-정의.md               ← 기존 (폐기, 참고용)
    ├── 03-MVP-v2.md                 ← 이 파일
    └── mvp-v2/
        ├── index.html               ← 진입점, Canvas + UI
        ├── main.js                  ← 게임 루프, 상태 관리
        ├── tank.js                  ← 탱크 물리 (가속·드리프트·충돌)
        ├── turret.js                ← 포탑 조준·발사 (멀티 스텁 포함)
        ├── enemy.js                 ← 적 스폰·AI·충돌
        ├── bullet.js                ← 총알 풀·이동·충돌
        ├── map.js                   ← 맵 생성·렌더링·카메라
        ├── input.js                 ← 키보드/마우스 → PLAYER_INPUT 매핑
        ├── camera.js                ← 부드러운 카메라 추적
        ├── render.js                ← Canvas 렌더링 통합
        └── config/
            ├── game.js
            ├── physics.js
            ├── tank.js
            ├── enemies.js
            ├── weapons.js
            ├── map.js
            └── controls.js
```

---

## 8. 개발 순서 (MVP v2)

| 순서 | 항목 | 검증 포인트 |
|:----|:----|:-----------|
| 1 | `config/` 전체 + `main.js` (루프) | 해상도, FPS 일정 |
| 2 | `map.js` + `camera.js` | 랜덤 맵 생성, 카메라 추적 |
| 3 | `input.js` + `tank.js` (이동만) | 가속/감속/드리프트 느낌 |
| 4 | `turret.js` + bullet 발사 | 마우스 추적, 총알 이동 |
| 5 | `enemy.js` (스폰 + AI) | 적 추적, 분산 이동 |
| 6 | 충돌 시스템 (총알-적, 적-탱크) | HP 감소, 사망 처리 |
| 7 | 드리프트 어택 판정 | 사이드 슬라이딩 데미지 |
| 8 | 게임오버 + 재시작 | R키, UI 표시 |
| 9 | 폴리싱 (색상, 피드백 최소한) | 시각적 구분 확인 |

---

## 9. MVP 검증 질문

MVP가 완성되면 이 질문들에 답할 수 있어야 함:

1. **드리프트가 재미있는가?** — 의도적인 드리프트가 전략적으로 의미 있는가?
2. **스플릿 컨트롤(솔로)이 자연스러운가?** — WASD+마우스 동시 조작이 부담스럽지 않은가?
3. **적과의 상호작용이 만족스러운가?** — 피하고 쏘고 들이받는 루프가 잘 도는가?
4. **멀티플레이어로 확장할 여지가 보이는가?** — 솔로 플레이가 2인 협동을 상상하게 하는가?
5. **설정 기반 구조가 잘 작동하는가?** — config만 수정해서 새 적/탱크를 추가할 수 있는가?

---

## 한 줄 요약

> **Canvas 2D, 랜덤 맵, 가속+드리프트 물리, 스플릿 컨트롤 솔로, 설정 기반 확장 구조.**
> 목표: "이 움직임이 재미있다"는 확신을 10시간 내에 얻는다.
