// 적 타입 정의 + 스폰 파라미터
// 용도: enemy.js에서 import. 새 적 타입, 스폰 방식 변경은 여기만 수정.

// --- 적 타입 (이름, HP, 속도, 데미지, 반경, 색상) ---
export const ENEMY_TYPES = {
  scout: {
    name: 'Scout',
    hp: 20,
    speed: 120,       // px/s
    damage: 5,
    radius: 10,       // px — 충돌 판정용
    color: '#e74c3c', // 빨강
  },
  bruiser: {
    name: 'Bruiser',
    hp: 60,
    speed: 80,
    damage: 10,
    radius: 15,
    color: '#e67e22', // 주황
  },
  runner: {
    name: 'Runner',
    hp: 10,
    speed: 200,
    damage: 3,
    radius: 8,
    color: '#f1c40f', // 노랑
  },
};

// --- 스폰 시스템 ---
// 리서치 기반: Vampire Survivors(화면밖+50%) + Megabonk(전방회피) + Brotato(상한)
export const SPAWN_CONFIG = {
  // 스폰 위치
  spawnMode: 'radial',          // 'radial' 고정 (거리 기반 원형)
  spawnDistance: 800,           // px — 탱크 중심 기준 최대 스폰 거리
  minSpawnDistance: 500,        // px — 이보다 가까운 위치엔 스폰 안 함

  // Megabonk 문제 방지: 진행 방향 앞에는 덜 스폰
  forwardAvoidance: 0.5,        // 탱크 진행 방향 ±60도 내 스폰 확률 계수
                                // 1.0 = 정상, 0.5 = 절반, 0 = 전방 금지

  // 스폰 타이밍
  spawnInterval: 2.0,           // 초 — 적 1마리 생성 간격
  initialDelay: 2.0,            // 초 — 게임 시작 후 첫 스폰까지 대기

  // 상한 & 풀링 (Brotato 스타일 명확한 cap)
  maxEnemies: 40,               // 맵 내 최대 동시 적 수
  despawnDistance: 2500,        // px — 이 거리 이상 멀어지면 적 제거
  poolSize: 50,                 // 오브젝트 풀 사전 할당량

  // 타입 분포 (고정)
  enemyWeights: {
    scout:   0.55,               // 55% — 기본병
    runner:  0.30,               // 30% — 신속형
    bruiser: 0.15,               // 15% — 돌격병
  },

  // 충돌 회피
  minSpawnClearance: 48,        // px — 장애물과 최소 거리
  spawnRetries: 5,              // 위치 재시도 횟수 (실패 시 강제 배치)
};
