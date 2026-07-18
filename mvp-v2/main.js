// 게임 진입점 — 게임 루프, 상태 관리, update/render 호출 구조
// 용도: 모든 모듈을 연결하고 requestAnimationFrame 기반 루프를 구동
import { GAME_CONFIG } from './config/game.js';
import { MAP_CONFIG } from './config/map.js';
import { createCamera, updateCamera } from './camera.js';
import { generateMap, drawMap } from './map.js';
import { Tank, updateTank, drawTank, tryFire, updateCooldown } from './tank.js';
import { PLAYER_INPUT, initInput, updateInput } from './input.js';
import { BulletPool } from './bullet.js';
import { WEAPON_CONFIG } from './config/weapons.js';

// --- 캔버스 초기화 ---
const canvas = document.getElementById('game-canvas');
canvas.width = GAME_CONFIG.canvasWidth;
canvas.height = GAME_CONFIG.canvasHeight;
const ctx = canvas.getContext('2d');

// --- 게임 상태 ---
const state = {
  status: 'playing', // 'playing' | 'gameover'
};

// --- 입력 시스템 초기화 ---
initInput(canvas);

// --- 카메라 ---
const camera = createCamera();

// --- 플레이어 탱크 생성 ---
// 맵 중앙 기준 spawnAreaRadius 내 랜덤 위치
const spawnAngle = Math.random() * Math.PI * 2;
const spawnDist = Math.random() * MAP_CONFIG.spawnAreaRadius;
const player = new Tank(
  MAP_CONFIG.width / 2 + Math.cos(spawnAngle) * spawnDist,
  MAP_CONFIG.height / 2 + Math.sin(spawnAngle) * spawnDist,
);

// --- HUD 요소 참조 ---
const driftIndicator = document.getElementById('drift-indicator');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpLabel = document.getElementById('hp-label');

// --- 총알 풀 생성 ---
const bulletPool = new BulletPool(WEAPON_CONFIG.default);

// --- 프레임 타이밍 ---
let lastTime = 0;

// --- 맵 생성 ---
generateMap();

/**
 * 매 프레임 게임 상태 업데이트
 * 입력 → 탱크 물리 → 카메라 → HUD 순으로 처리
 * @param {number} dt - delta time (ms)
 */
function update(dt) {
  if (state.status !== 'playing') return;

  // 1. 입력 상태 갱신
  updateInput();

  // 2. 마우스 화면 좌표 → 월드 좌표 변환 (카메라 오프셋 보정)
  const worldAimX = PLAYER_INPUT.gunner.aimX + camera.x;
  const worldAimY = PLAYER_INPUT.gunner.aimY + camera.y;

  // 3. 탱크 물리 업데이트 (가속, 회전, 드리프트, 포탑 조준, 경계 클램프)
  updateTank(player, PLAYER_INPUT, worldAimX, worldAimY, dt);

  // 4. 발사 시도 + 쿨다운 갱신
  tryFire(player, PLAYER_INPUT, bulletPool);
  updateCooldown(player, dt);

  // 5. 총알 업데이트 (이동, 수명, 맵 경계)
  bulletPool.updateBullets(dt);

  // 6. 카메라가 플레이어를 부드럽게 추적
  updateCamera(camera, player.x, player.y, dt);

  // 7. HUD 갱신: 드리프트 인디케이터
  if (player.isDrifting) {
    driftIndicator.classList.add('active');
  } else {
    driftIndicator.classList.remove('active');
  }

  // 8. HUD 갱신: HP 바
  const hpPercent = (player.hp / player.maxHp) * 100;
  hpBarFill.style.width = `${hpPercent}%`;
  hpLabel.textContent = `HP ${player.hp} / ${player.maxHp}`;

  // HP에 따라 색상 변화
  if (hpPercent > 50) {
    hpBarFill.style.background = '#2ecc71'; // 초록
  } else if (hpPercent > 25) {
    hpBarFill.style.background = '#f39c12'; // 주황
  } else {
    hpBarFill.style.background = '#e74c3c'; // 빨강
  }
}

/**
 * 매 프레임 화면 렌더링
 * 1. 캔버스 초기화 → 2. 카메라 변환 → 3. 월드 오브젝트 → 4. 변환 복원
 */
function render() {
  // 캔버스 전체 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 카메라 변환 적용
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // --- 월드 오브젝트 (카메라 기준 자동 변환) ---
  drawMap(ctx);
  drawTank(ctx, player);
  bulletPool.drawBullets(ctx);

  ctx.restore();

  // --- UI 오버레이는 restore 이후, 카메라 영향 없이 그릴 수 있음 ---
  // (HUD는 HTML 요소로 처리되므로 여기선 생략)
}

/**
 * 게임 루프 — requestAnimationFrame 기반
 * @param {number} timestamp - rAF가 전달하는 고해상도 타임스탬프 (ms)
 */
function gameLoop(timestamp) {
  // 첫 프레임은 lastTime 초기화만 하고 다음 프레임으로
  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  // delta time 계산 (ms)
  let dt = timestamp - lastTime;
  lastTime = timestamp;

  // dt 상한선 — 탭 전환/백그라운드 후 급증 방지 (최대 100ms)
  if (dt > 100) {
    dt = 100;
  }

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// --- 게임 시작 ---
requestAnimationFrame(gameLoop);
