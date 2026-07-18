// 탱크 모듈 — 물리 시뮬레이션 + 렌더링
// 용도: Tank 클래스, 가속·마찰·드리프트·회전 물리, 섀시+포탑 그리기
import { TANK_CONFIG } from './config/tank.js';
import { PHYSICS_CONFIG } from './config/physics.js';
import { MAP_CONFIG } from './config/map.js';
import { WEAPON_CONFIG } from './config/weapons.js';
import { getObstacles } from './map.js';
import { pushCircleOutOfRect } from './collision.js';

/**
 * 탱크 클래스
 * 속도 벡터 기반 이동 — 입력 방향으로 즉시 방향 전환이 아닌 가속 기반
 */
export class Tank {
  /**
   * @param {number} x - 초기 월드 x 좌표
   * @param {number} y - 초기 월드 y 좌표
   */
  constructor(x, y) {
    // --- 위치 ---
    this.x = x;
    this.y = y;

    // --- 속도 벡터 (px/s) ---
    this.vx = 0;
    this.vy = 0;

    // --- 섀시 방향 (rad) — WASD가 제어, 0 = 오른쪽 ---
    this.chassisAngle = 0;

    // --- 포탑 방향 (rad) — 마우스가 제어 ---
    this.turretAngle = 0;

    // --- 체력 ---
    const stats = TANK_CONFIG.default;
    this.hp = stats.hp;
    this.maxHp = stats.hp;

    // --- 크기 ---
    this.width = stats.width;
    this.height = stats.height;

    // --- 장착 무기 ---
    this.weapon = WEAPON_CONFIG.default;

    // --- 발사 쿨다운 (ms) ---
    this.fireCooldown = 0;

    // --- 드리프트 상태 (매 프레임 updateTank가 갱신) ---
    this.driftAngle = 0;   // |chassisAngle - velocityAngle| (rad)
    this.isDrifting = false;

    // --- 피격 무적 타이머 관련 ---
    this.invincibleUntil = 0;

    // --- 대시 (Phase 6.6) ---
    this.dashTimer = 0;       // 대시 지속 시간 (초) — 0보다 크면 대시 중
    this.dashCooldown = 0;    // 대시 쿨다운 (초) — 0이면 사용 가능
  }
}

/**
 * 탱크 물리 업데이트
 * 가속 → 마찰 → 속도 제한 → 드리프트 계산 → 포탑 조준 → 위치 이동 → 경계 클램프
 * @param {Tank} tank - 업데이트할 탱크 인스턴스
 * @param {{driver: object, gunner: object}} input - PLAYER_INPUT 객체
 * @param {number} worldAimX - 포탑 조준점 월드 x 좌표
 * @param {number} worldAimY - 포탑 조준점 월드 y 좌표
 * @param {number} dt - delta time (ms)
 */
export function updateTank(tank, input, worldAimX, worldAimY, dt) {
  const dtSec = dt / 1000;

  const {
    maxSpeed, acceleration, friction, turnRate,
    reverseMultiplier, brakingForce, driftThreshold,
  } = PHYSICS_CONFIG;

  const { driver } = input;

  // --- 1. 섀시 회전 (A/D) ---
  if (driver.left) {
    tank.chassisAngle -= turnRate * dtSec;
  }
  if (driver.right) {
    tank.chassisAngle += turnRate * dtSec;
  }

  // --- 2. 가속 (W: 전진, S: 후진) ---
  if (driver.forward) {
    tank.vx += Math.cos(tank.chassisAngle) * acceleration * dtSec;
    tank.vy += Math.sin(tank.chassisAngle) * acceleration * dtSec;
  }
  if (driver.reverse) {
    // 후진 가속 (reverseMultiplier 적용)
    tank.vx -= Math.cos(tank.chassisAngle) * acceleration * reverseMultiplier * dtSec;
    tank.vy -= Math.sin(tank.chassisAngle) * acceleration * reverseMultiplier * dtSec;

    // S키 제동: 현재 전진 중이면 추가 감속 (brakingForce 배율)
    const forwardSpeed = tank.vx * Math.cos(tank.chassisAngle) + tank.vy * Math.sin(tank.chassisAngle);
    if (forwardSpeed > 0) {
      const brakeFactor = Math.pow(friction, brakingForce * dtSec * 60);
      tank.vx *= brakeFactor;
      tank.vy *= brakeFactor;
    }
  }

  // --- 3. 무입력 시 마찰 감속 ---
  // dt 기반 지수 보간으로 프레임레이트 독립성 확보
  if (!driver.forward && !driver.reverse) {
    const frictionFactor = Math.pow(friction, dtSec * 60);
    tank.vx *= frictionFactor;
    tank.vy *= frictionFactor;
  }

  // --- 4. 최대 속도 제한 (벡터 길이 클램프) ---
  const speed = Math.sqrt(tank.vx * tank.vx + tank.vy * tank.vy);
  if (speed > maxSpeed) {
    const scale = maxSpeed / speed;
    tank.vx *= scale;
    tank.vy *= scale;
  }

  // --- 4.5. 대시 (Space) ---
  // 쿨다운 감소
  if (tank.dashCooldown > 0) {
    tank.dashCooldown -= dtSec;
    if (tank.dashCooldown < 0) tank.dashCooldown = 0;
  }

  // 대시 발동
  if (driver.dash && tank.dashCooldown <= 0 && tank.dashTimer <= 0) {
    tank.dashTimer = 0.25;        // 지속 시간 0.25초
    tank.dashCooldown = 4.0;      // 쿨다운 4초
    tank.invincibleUntil = performance.now() + 150; // 무적 0.15초
  }

  // 대시 지속 중: 속도 오버라이드
  if (tank.dashTimer > 0) {
    tank.dashTimer -= dtSec;
    if (tank.dashTimer <= 0) tank.dashTimer = 0;

    const dashSpeed = maxSpeed * 2.5;          // 대시 속도 = 최대 속도 × 2.5
    const currentSpeed = Math.sqrt(tank.vx * tank.vx + tank.vy * tank.vy);
    if (currentSpeed > 0.5) {
      // 진행 방향(속도 벡터)으로 대시
      tank.vx = (tank.vx / currentSpeed) * dashSpeed;
      tank.vy = (tank.vy / currentSpeed) * dashSpeed;
    } else {
      // 정지 상태면 섀시 방향으로 대시
      tank.vx = Math.cos(tank.chassisAngle) * dashSpeed;
      tank.vy = Math.sin(tank.chassisAngle) * dashSpeed;
    }
  }

  // --- 5. 드리프트 각도 계산 ---
  // 최소 속도 이상일 때만 드리프트 판정
  if (speed > PHYSICS_CONFIG.minSpeedForDrift) {
    const velAngle = Math.atan2(tank.vy, tank.vx);
    let diff = tank.chassisAngle - velAngle;

    // -PI ~ PI 범위로 정규화
    while (diff > Math.PI)  diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    tank.driftAngle = Math.abs(diff);
  } else {
    tank.driftAngle = 0;
  }
  tank.isDrifting = tank.driftAngle > driftThreshold;

  // --- 6. 포탑 각도 (마우스 조준 방향) ---
  tank.turretAngle = Math.atan2(worldAimY - tank.y, worldAimX - tank.x);

  // --- 7. 위치 업데이트 ---
  tank.x += tank.vx * dtSec;
  tank.y += tank.vy * dtSec;

  // --- 8. 맵 경계 클램프 (탱크가 맵 밖으로 못 나감) ---
  const halfW = tank.width / 2;
  const halfH = tank.height / 2;
  tank.x = Math.max(halfW, Math.min(MAP_CONFIG.width - halfW, tank.x));
  tank.y = Math.max(halfH, Math.min(MAP_CONFIG.height - halfH, tank.y));

  // --- 9. 장애물 충돌 해결 (탱크를 장애물 밖으로 밀어냄) ---
  const obstacles = getObstacles();
  const tankRadius = Math.min(tank.width, tank.height) / 2;
  const tankCircle = { x: tank.x, y: tank.y, radius: tankRadius };
  for (const obs of obstacles) {
    pushCircleOutOfRect(tankCircle, obs);
  }
  tank.x = tankCircle.x;
  tank.y = tankCircle.y;
}

// --- 발사 시스템 ---

/**
 * 탱크 발사 시도 — 발사 입력 + 쿨다운 완료 시 총알 생성
 * @param {Tank} tank - 발사할 탱크
 * @param {object} input - PLAYER_INPUT 객체
 * @param {import('./bullet.js').BulletPool} bulletPool - 총알 풀
 */
export function tryFire(tank, input, bulletPool) {
  if (!input.gunner.fire) return;       // 발사 입력 없음
  if (tank.fireCooldown > 0) return;     // 쿨다운 중

  const bullet = bulletPool.getBullet();
  if (!bullet) return;                   // 풀 고갈

  const { turretLength } = TANK_CONFIG.default;
  const { fireInterval } = tank.weapon;

  // 총알 시작 위치: 탱크 중심 + 포탑 방향 × 포탑 길이 (총구 끝)
  bullet.x = tank.x + Math.cos(tank.turretAngle) * turretLength;
  bullet.y = tank.y + Math.sin(tank.turretAngle) * turretLength;

  // 총알 속도: 포탑 방향 × bulletSpeed
  bullet.vx = Math.cos(tank.turretAngle) * bulletPool.bulletSpeed;
  bullet.vy = Math.sin(tank.turretAngle) * bulletPool.bulletSpeed;

  // 발사 쿨다운 시작
  tank.fireCooldown = fireInterval;
}

/**
 * 발사 쿨다운 타이머 감소
 * @param {Tank} tank - 쿨다운을 감소시킬 탱크
 * @param {number} dt - delta time (ms)
 */
export function updateCooldown(tank, dt) {
  if (tank.fireCooldown > 0) {
    tank.fireCooldown -= dt;
    if (tank.fireCooldown < 0) tank.fireCooldown = 0;
  }
}

// --- 렌더링 ---

/**
 * 탱크 렌더링 — 회전된 섀시(사각형) + 회전된 포탑(선)
 * ctx.translate로 이미 카메라 오프셋이 적용된 상태에서 호출
 * @param {CanvasRenderingContext2D} ctx - 캔버스 2D 컨텍스트
 * @param {Tank} tank - 그릴 탱크 인스턴스
 */
export function drawTank(ctx, tank) {
  const { bodyColor, turretColor, turretLength, turretWidth } = TANK_CONFIG.default;

  // --- 섀시: 앞/뒤 분할 + 방향 삼각형 ---
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.chassisAngle);

  const hw = tank.width / 2;
  const hh = tank.height / 2;

  // 앞부분 (밝은 녹색) — chassisAngle 방향, 55%
  ctx.fillStyle = '#6abf6a';
  ctx.fillRect(-hw * 0.1, -hh, hw * 1.1, hh * 2);

  // 뒷부분 (어두운 녹색) — chassisAngle 반대 방향, 45%
  ctx.fillStyle = '#2a6e2a';
  ctx.fillRect(-hw, -hh, hw * 0.9, hh * 2);

  // 앞머리 삼각형 (노란색 방향 지표)
  ctx.fillStyle = '#f1c40f';
  ctx.beginPath();
  ctx.moveTo(hw, 0);           // 탱크 정면 끝
  ctx.lineTo(hw - 8, -10);     // 좌측 후방
  ctx.lineTo(hw - 8, 10);      // 우측 후방
  ctx.closePath();
  ctx.fill();

  ctx.restore();

  // --- 포탑: 회전된 선 (총구) ---
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.turretAngle);
  ctx.strokeStyle = turretColor;
  ctx.lineWidth = turretWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);                // 포탑 중심 (탱크 중심과 동일)
  ctx.lineTo(turretLength, 0);     // 포탑 끝 (총구 방향)
  ctx.stroke();
  ctx.restore();
}
