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
const player = new Tank(0, 0);

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
const gameoverEl = document.getElementById('gameover');
const survivalTimeEl = document.getElementById('survival-time');

// --- 프레임 타이밍 ---
let lastTime = 0;

// --- 경과 시간 (ms) ---
let elapsedTime = 0;

// --- 맵 생성 ---
generateMap();

// --- 초기 스폰 위치로 탱크 배치 ---
respawnPlayer();

/**
 * 플레이어 탱크를 맵 중앙 spawnAreaRadius 내 랜덤 위치에 재배치
 */
function respawnPlayer() {
  const angle = Math.random() * Math.PI * 2;
  const dist = Math.random() * MAP_CONFIG.spawnAreaRadius;
  player.x = MAP_CONFIG.width / 2 + Math.cos(angle) * dist;
  player.y = MAP_CONFIG.height / 2 + Math.sin(angle) * dist;
  player.vx = 0;
  player.vy = 0;
  player.chassisAngle = 0;
  player.turretAngle = 0;
  player.hp = player.maxHp;
  player.fireCooldown = 0;
  player.invincibleUntil = 0;
}

/**
 * 게임 전체 상태를 초기화하고 재시작
 */
function restartGame() {
  // 플레이어 리셋
  respawnPlayer();

  // 모든 총알 비활성화
  for (const bullet of bulletPool.bullets) {
    bullet.active = false;
  }

  // 모든 적 비활성화
  for (const enemy of enemyPool.pool) {
    enemy.active = false;
  }
  enemyPool.activeCount = 0;

  // 적 스폰 타이머 리셋
  enemyPool.resetSpawnTimer();

  // 생존 타이머 리셋
  elapsedTime = 0;

  // 게임오버 UI 숨기기
  gameoverEl.style.display = 'none';

  // 상태 복원
  state.status = 'playing';

  // R 키 원샷 소비
  PLAYER_INPUT.system.restart = false;
}

/**
 * 매 프레임 게임 상태 업데이트
 * @param {number} dt - delta time (ms)
 */
function update(dt) {
  // 입력 상태 갱신 (항상 — 게임오버 중에도 R 키 감지 필요)
  updateInput();

  if (state.status === 'playing') {
    updatePlaying(dt);
  } else if (state.status === 'gameover') {
    updateGameover();
  }
}

/**
 * playing 상태 업데이트: 전체 게임 로직
 */
function updatePlaying(dt) {
  const now = performance.now();

  // 마우스 화면 좌표 → 월드 좌표 변환
  const worldAimX = PLAYER_INPUT.gunner.aimX + camera.x;
  const worldAimY = PLAYER_INPUT.gunner.aimY + camera.y;

  // 탱크 물리
  updateTank(player, PLAYER_INPUT, worldAimX, worldAimY, dt);

  // 발사
  tryFire(player, PLAYER_INPUT, bulletPool);
  updateCooldown(player, dt);

  // 총알
  bulletPool.updateBullets(dt);

  // 적 스폰 + AI
  enemyPool.updateSpawn(dt, player);
  enemyPool.updateEnemies(dt, player);

  // 충돌
  checkBulletEnemyCollisions(bulletPool, enemyPool);
  checkTankEnemyCollisions(player, enemyPool, now);

  // 카메라
  updateCamera(camera, player.x, player.y, dt);

  // 경과 시간
  elapsedTime += dt;

  // --- HUD 갱신 ---
  updateHUD();

  // --- 게임오버 체크 ---
  if (player.hp <= 0) {
    state.status = 'gameover';
    gameoverEl.style.display = 'flex';

    const totalSec = Math.floor(elapsedTime / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    survivalTimeEl.textContent =
      `생존 시간: ${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  }
}

/**
 * gameover 상태 업데이트: R 키 재시작 감지
 */
function updateGameover() {
  if (PLAYER_INPUT.system.restart) {
    restartGame();
  }
}

/**
 * HUD 요소 갱신 (HP, 드리프트, 적 카운트, 타이머)
 */
function updateHUD() {
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
    hpBarFill.style.background = '#2ecc71'; // 초록
  } else if (hpPercent > 25) {
    hpBarFill.style.background = '#f1c40f'; // 노랑
  } else {
    hpBarFill.style.background = '#e74c3c'; // 빨강
  }

  // 적 카운트
  enemyCountEl.textContent = `적: ${enemyPool.activeCount}`;

  // 타이머
  const totalSec = Math.floor(elapsedTime / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  timerEl.textContent = `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
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
