// 게임 진입점 — 게임 루프, 상태 관리, update/render 호출 구조
// 용도: 모든 모듈을 연결하고 requestAnimationFrame 기반 루프를 구동
import { GAME_CONFIG } from './config/game.js';
import { MAP_CONFIG } from './config/map.js';
import { createCamera, updateCamera } from './camera.js';
import { generateMap, drawMap } from './map.js';
import { Tank, updateTank, drawTank, tryFire, updateCooldown } from './tank.js';
import { PLAYER_INPUT, initInput, updateInput } from './input.js';
import { BulletPool } from './bullet.js';
import { EnemyPool } from './enemy.js';
import { WEAPON_CONFIG } from './config/weapons.js';
import { checkBulletEnemyCollisions, checkTankEnemyCollisions } from './collision.js';

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
const spawnAngle = Math.random() * Math.PI * 2;
const spawnDist = Math.random() * MAP_CONFIG.spawnAreaRadius;
const player = new Tank(
  MAP_CONFIG.width / 2 + Math.cos(spawnAngle) * spawnDist,
  MAP_CONFIG.height / 2 + Math.sin(spawnAngle) * spawnDist,
);

// --- 총알 풀 ---
const bulletPool = new BulletPool(WEAPON_CONFIG.default);

// --- 적 풀 ---
const enemyPool = new EnemyPool();

// --- HUD 요소 참조 ---
const driftIndicator = document.getElementById('drift-indicator');
const hpBarFill = document.getElementById('hp-bar-fill');
const hpLabel = document.getElementById('hp-label');
const enemyCountEl = document.getElementById('enemy-count');
const timerEl = document.getElementById('timer');

// --- 프레임 타이밍 ---
let lastTime = 0;

// --- 경과 시간 (타이머용) ---
let elapsedTime = 0;

// --- 맵 생성 ---
generateMap();

/**
 * 매 프레임 게임 상태 업데이트
 * 입력 → 탱크 물리 → 발사 → 총알 → 적 스폰/AI → 충돌 → 카메라 → HUD
 * @param {number} dt - delta time (ms)
 */
function update(dt) {
  if (state.status !== 'playing') return;

  // 현재 시간 (무적 타이머용)
  const now = performance.now();

  // 1. 입력 상태 갱신
  updateInput();

  // 2. 마우스 화면 좌표 → 월드 좌표 변환
  const worldAimX = PLAYER_INPUT.gunner.aimX + camera.x;
  const worldAimY = PLAYER_INPUT.gunner.aimY + camera.y;

  // 3. 탱크 물리 업데이트
  updateTank(player, PLAYER_INPUT, worldAimX, worldAimY, dt);

  // 4. 발사 + 쿨다운
  tryFire(player, PLAYER_INPUT, bulletPool);
  updateCooldown(player, dt);

  // 5. 총알 업데이트 (이동, 수명, 맵 경계)
  bulletPool.updateBullets(dt);

  // 6. 적 스폰
  enemyPool.updateSpawn(dt, player);

  // 7. 적 AI + 이동 + 디스폰
  enemyPool.updateEnemies(dt, player);

  // 8. 충돌 검사
  checkBulletEnemyCollisions(bulletPool, enemyPool);
  checkTankEnemyCollisions(player, enemyPool, now);

  // 9. 카메라 추적
  updateCamera(camera, player.x, player.y, dt);

  // 10. 경과 시간
  elapsedTime += dt;

  // 11. HUD 갱신

  // 드리프트 인디케이터
  if (player.isDrifting) {
    driftIndicator.classList.add('active');
  } else {
    driftIndicator.classList.remove('active');
  }

  // HP 바
  const hpPercent = (player.hp / player.maxHp) * 100;
  hpBarFill.style.width = `${hpPercent}%`;
  hpLabel.textContent = `HP ${player.hp} / ${player.maxHp}`;

  if (hpPercent > 50) {
    hpBarFill.style.background = '#2ecc71';
  } else if (hpPercent > 25) {
    hpBarFill.style.background = '#f39c12';
  } else {
    hpBarFill.style.background = '#e74c3c';
  }

  // 적 카운트
  enemyCountEl.textContent = `적: ${enemyPool.activeCount}`;

  // 타이머
  const totalSec = Math.floor(elapsedTime / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;

  // 게임오버 체크
  if (player.hp <= 0) {
    state.status = 'gameover';
    document.getElementById('gameover').style.display = 'flex';
    document.getElementById('survival-time').textContent =
      `생존 시간: ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}

/**
 * 매 프레임 화면 렌더링
 */
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // --- 월드 오브젝트 ---
  drawMap(ctx);
  drawTank(ctx, player);
  bulletPool.drawBullets(ctx);
  enemyPool.drawEnemies(ctx);

  ctx.restore();
}

/**
 * 게임 루프 — requestAnimationFrame 기반
 */
function gameLoop(timestamp) {
  if (lastTime === 0) {
    lastTime = timestamp;
    requestAnimationFrame(gameLoop);
    return;
  }

  let dt = timestamp - lastTime;
  lastTime = timestamp;

  if (dt > 100) dt = 100;

  update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

// --- 게임 시작 ---
requestAnimationFrame(gameLoop);
