// 맵 생성 및 렌더링 모듈
// 용도: 시드 기반 랜덤 장애물 배치, AABB 겹침 방지, 맵 그리기
import { MAP_CONFIG } from './config/map.js';

// --- 내부 상태 ---
/** @type {{x: number, y: number, w: number, h: number}[]} */
let obstacles = [];

// --- 시드 기반 난수 생성기 ---

/**
 * 간단한 시드 기반 난수 생성기
 * 문자열 시드를 해시 → mulberry32 PRNG로 0~1 난수 생성
 * 같은 시드는 항상 같은 난수열을 반환 (맵 재현 가능)
 * @param {string} seed - 시드 문자열
 * @returns {() => number} 0 이상 1 미만 난수를 반환하는 함수
 */
function createSeededRandom(seed) {
  // 문자열 → 32비트 정수 해시 (djb2 변형)
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32비트 정수로 유지
  }

  // mulberry32 PRNG — 가볍고 분포가 양호한 32비트 난수 생성기
  let state = hash >>> 0; // unsigned 32-bit
  return function () {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- 충돌 검사 ---

/**
 * 두 AABB(축 정렬 사각형)가 겹치는지 검사
 * @param {{x: number, y: number, w: number, h: number}} a - 첫 번째 사각형
 * @param {{x: number, y: number, w: number, h: number}} b - 두 번째 사각형
 * @returns {boolean} 겹치면 true
 */
function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// --- 맵 생성 ---

/**
 * 시드 기반 랜덤 장애물 생성
 * 장애물끼리 겹치지 않도록 AABB 검사 후 배치
 * @returns {{x: number, y: number, w: number, h: number}[]} 생성된 장애물 배열
 */
export function generateMap() {
  const {
    width, height, seed,
    obstacleCount, obstacleMinSize, obstacleMaxSize,
  } = MAP_CONFIG;

  const random = createSeededRandom(seed);
  obstacles = [];

  let attempts = 0;
  const maxAttempts = obstacleCount * 100; // 무한 루프 방지

  while (obstacles.length < obstacleCount && attempts < maxAttempts) {
    attempts++;

    // 랜덤 크기 (정사각형에 가깝되 약간의 변형 허용)
    const w = obstacleMinSize + random() * (obstacleMaxSize - obstacleMinSize);
    const h = obstacleMinSize + random() * (obstacleMaxSize - obstacleMinSize);

    // 랜덤 위치 (맵 경계 내부)
    const x = random() * (width - w);
    const y = random() * (height - h);

    const candidate = { x, y, w, h };

    // 기존 장애물과 겹치는지 검사
    const overlaps = obstacles.some(existing => aabbOverlap(candidate, existing));

    if (!overlaps) {
      obstacles.push(candidate);
    }
  }

  return obstacles;
}

/**
 * 현재 장애물 배열 반환
 * @returns {{x: number, y: number, w: number, h: number}[]}
 */
export function getObstacles() {
  return obstacles;
}

// --- 렌더링 ---

/**
 * 맵(장애물)을 캔버스에 그리기
 * ctx.translate로 이미 카메라 오프셋이 적용된 상태에서 호출되므로
 * 장애물은 월드 좌표 그대로 그림
 * @param {CanvasRenderingContext2D} ctx - 캔버스 2D 컨텍스트
 */
export function drawMap(ctx) {
  const { obstacleColor } = MAP_CONFIG;

  ctx.fillStyle = obstacleColor;

  for (const obs of obstacles) {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  }
}
