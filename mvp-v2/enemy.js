// 적 시스템 — 오브젝트 풀 + 스폰 + AI 이동 + 장애물 충돌 + 디스폰
// 용도: 적 사전 할당, Vampire Survivors 스타일 스폰, 탱크 추적 AI, 렌더링
import { ENEMY_TYPES, SPAWN_CONFIG } from './config/enemies.js';
import { MAP_CONFIG } from './config/map.js';
import { getObstacles } from './map.js';

// --- 헬퍼 함수 ---

/**
 * 가중치 기반 랜덤 선택
 * @param {object} weights — { key: weight, ... }
 * @returns {string} 선택된 키
 */
function weightedRandom(weights) {
  const r = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(weights)) {
    cumulative += weight;
    if (r <= cumulative) return key;
  }
  return Object.keys(weights)[0];
}

/**
 * 숫자를 min~max 범위로 클램프
 */
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

/**
 * 원 vs AABB(사각형) 충돌 해결 — 적을 장애물 밖으로 밀어냄
 * @param {{x:number,y:number,radius:number}} circle - 적
 * @param {{x:number,y:number,w:number,h:number}} rect - 장애물
 * @returns {boolean} 충돌이 있었으면 true
 */
function pushCircleOutOfRect(circle, rect) {
  // 사각형에서 원 중심에 가장 가까운 점 찾기
  const closestX = clamp(circle.x, rect.x, rect.x + rect.w);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.h);

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq < circle.radius * circle.radius) {
    const dist = Math.sqrt(distSq);
    if (dist === 0) {
      // 원 중심이 사각형 내부 — 위쪽으로 밀어내기
      circle.y = rect.y - circle.radius;
    } else {
      const overlap = circle.radius - dist;
      circle.x += (dx / dist) * overlap;
      circle.y += (dy / dist) * overlap;
    }
    return true;
  }
  return false;
}

// --- EnemyPool 클래스 ---

export class EnemyPool {
  constructor() {
    const { poolSize, initialDelay, spawnInterval } = SPAWN_CONFIG;

    /** @type {{x:number,y:number,type:string,hp:number,maxHp:number,speed:number,damage:number,radius:number,color:string,active:boolean,targetAngle:number}[]} */
    this.pool = [];

    // 오브젝트 풀 사전 할당
    for (let i = 0; i < poolSize; i++) {
      this.pool.push({
        x: 0, y: 0,
        type: 'scout',
        hp: 0, maxHp: 0,
        speed: 0, damage: 0,
        radius: 0, color: '',
        active: false,
        targetAngle: 0,
      });
    }

    /** @type {number} 현재 활성 적 수 */
    this.activeCount = 0;

    /** @type {number} 스폰 타이머 (ms) — initialDelay 이후부터 스폰 시작 */
    this.spawnTimer = spawnInterval * 1000 - initialDelay * 1000;
  }

  /**
   * 비활성 적 하나를 꺼내 주어진 타입/위치로 활성화
   * @param {string} typeKey — ENEMY_TYPES 키 (scout|bruiser|runner)
   * @param {number} x - 월드 x 좌표
   * @param {number} y - 월드 y 좌표
   * @returns {object|null} 활성화된 적, 풀 고갈 시 null
   */
  activate(typeKey, x, y) {
    const type = ENEMY_TYPES[typeKey];
    if (!type) return null;

    for (const enemy of this.pool) {
      if (!enemy.active) {
        enemy.x = x;
        enemy.y = y;
        enemy.type = typeKey;
        enemy.hp = type.hp;
        enemy.maxHp = type.hp;
        enemy.speed = type.speed;
        enemy.damage = type.damage;
        enemy.radius = type.radius;
        enemy.color = type.color;
        enemy.active = true;
        enemy.targetAngle = 0;
        this.activeCount++;
        return enemy;
      }
    }
    return null; // 풀 고갈
  }

  /**
   * 적을 비활성화해서 풀에 반환
   * @param {object} enemy
   */
  deactivate(enemy) {
    if (enemy.active) {
      enemy.active = false;
      this.activeCount--;
    }
  }

  // --- 스폰 시스템 ---

  /**
   * 스폰 타이머 갱신 + 조건 충족 시 적 생성
   * @param {number} dt - delta time (ms)
   * @param {{x:number,y:number,vx:number,vy:number}} tank - 플레이어 탱크
   */
  updateSpawn(dt, tank) {
    const { spawnInterval, maxEnemies, spawnDistance, minSpawnDistance,
            forwardAvoidance, minSpawnClearance, spawnRetries } = SPAWN_CONFIG;

    this.spawnTimer += dt;

    // 스폰 간격마다 적 생성 시도
    while (this.spawnTimer >= spawnInterval * 1000) {
      this.spawnTimer -= spawnInterval * 1000;

      // 최대 동시 적 수 체크
      if (this.activeCount >= maxEnemies) continue;

      // 가중치 기반 타입 선택
      const typeKey = weightedRandom(SPAWN_CONFIG.enemyWeights);
      const type = ENEMY_TYPES[typeKey];
      if (!type) continue;

      // 스폰 위치 계산
      const { x, y } = this._findSpawnPosition(
        tank, type, spawnDistance, minSpawnDistance,
        forwardAvoidance, minSpawnClearance, spawnRetries,
      );

      // 맵 경계 클램프
      const clampedX = clamp(x, type.radius, MAP_CONFIG.width - type.radius);
      const clampedY = clamp(y, type.radius, MAP_CONFIG.height - type.radius);

      this.activate(typeKey, clampedX, clampedY);
    }
  }

  /**
   * 스폰 위치 찾기 — forwardAvoidance 고려 + 장애물 회피 재시도
   * @returns {{x:number, y:number}}
   */
  _findSpawnPosition(tank, type, spawnDist, minDist, forwardAvoidance, clearance, retries) {
    // 탱크 진행 방향 (속도가 거의 없으면 랜덤)
    let tankAngle = Math.random() * Math.PI * 2;
    const tankSpeed = Math.sqrt(tank.vx * tank.vx + tank.vy * tank.vy);
    if (tankSpeed > 10) {
      tankAngle = Math.atan2(tank.vy, tank.vx);
    }

    const obstacles = getObstacles();

    for (let attempt = 0; attempt < retries; attempt++) {
      let angle = Math.random() * Math.PI * 2;

      // forwardAvoidance: 진행 방향 ±60도 이내면 50% 확률로 반대편에 스폰
      const angleDiff = Math.abs(angle - tankAngle);
      const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
      if (normalizedDiff < Math.PI / 3) { // ±60도 = π/3
        if (Math.random() < (1 - forwardAvoidance)) {
          angle += Math.PI; // 반대 방향으로
        }
      }

      const distance = minDist + Math.random() * (spawnDist - minDist);
      const sx = tank.x + Math.cos(angle) * distance;
      const sy = tank.y + Math.sin(angle) * distance;

      // 장애물과 겹치는지 검사
      const collides = obstacles.some(obs =>
        pushCircleOutOfRect({ x: sx, y: sy, radius: clearance / 2 }, obs),
      );

      if (!collides) {
        return { x: sx, y: sy };
      }

      // 재시도: 각도 조금씩 돌리기
      // 다음 시도에서 새로운 랜덤 각도로 다시 시도
    }

    // 재시도 실패 시 마지막 위치 그대로 사용 (강제 배치)
    const lastAngle = Math.random() * Math.PI * 2;
    const lastDist = minDist + Math.random() * (spawnDist - minDist);
    return {
      x: tank.x + Math.cos(lastAngle) * lastDist,
      y: tank.y + Math.sin(lastAngle) * lastDist,
    };
  }

  // --- AI + 이동 ---

  /**
   * 모든 활성 적 업데이트: AI 추적, 이동, 적끼리 밀어내기, 장애물 충돌, 디스폰
   * @param {number} dt - delta time (ms)
   * @param {{x:number,y:number}} tank - 플레이어 탱크
   */
  updateEnemies(dt, tank) {
    const dtSec = dt / 1000;
    const { despawnDistance } = SPAWN_CONFIG;
    const despawnDistSq = despawnDistance * despawnDistance;
    const obstacles = getObstacles();

    // --- 1. AI 방향 계산 + 이동 ---
    for (const enemy of this.pool) {
      if (!enemy.active) continue;

      // 탱크 방향 계산
      enemy.targetAngle = Math.atan2(tank.y - enemy.y, tank.x - enemy.x);

      // 탱크 방향으로 이동
      enemy.x += Math.cos(enemy.targetAngle) * enemy.speed * dtSec;
      enemy.y += Math.sin(enemy.targetAngle) * enemy.speed * dtSec;

      // 디스폰 체크 (탱크와 너무 멀어지면)
      const dx = enemy.x - tank.x;
      const dy = enemy.y - tank.y;
      if (dx * dx + dy * dy > despawnDistSq) {
        this.deactivate(enemy);
      }
    }

    // --- 2. 적끼리 밀어내기 (서로 겹치지 않게) ---
    const minSeparation = 1.2; // 최소 분리 배율 (반경 합 × 이 값)
    for (let i = 0; i < this.pool.length; i++) {
      const a = this.pool[i];
      if (!a.active) continue;

      for (let j = i + 1; j < this.pool.length; j++) {
        const b = this.pool[j];
        if (!b.active) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (a.radius + b.radius) * minSeparation;

        if (dist < minDist && dist > 0.001) {
          const overlap = minDist - dist;
          const pushX = (dx / dist) * overlap * 0.5;
          const pushY = (dy / dist) * overlap * 0.5;
          a.x += pushX;
          a.y += pushY;
          b.x -= pushX;
          b.y -= pushY;
        }
      }
    }

    // --- 3. 장애물 충돌 해결 ---
    for (const enemy of this.pool) {
      if (!enemy.active) continue;

      for (const obs of obstacles) {
        pushCircleOutOfRect(enemy, obs);
      }

      // 맵 경계 클램프
      enemy.x = clamp(enemy.x, enemy.radius, MAP_CONFIG.width - enemy.radius);
      enemy.y = clamp(enemy.y, enemy.radius, MAP_CONFIG.height - enemy.radius);
    }
  }

  // --- 렌더링 ---

  /**
   * 모든 활성 적을 원으로 렌더링
   * @param {CanvasRenderingContext2D} ctx - 캔버스 2D 컨텍스트
   */
  drawEnemies(ctx) {
    for (const enemy of this.pool) {
      if (!enemy.active) continue;

      // 적 본체 (원)
      ctx.fillStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP 바 (최대 체력의 절반 이하일 때만 표시)
      if (enemy.hp < enemy.maxHp) {
        const barWidth = enemy.radius * 2;
        const barHeight = 4;
        const barY = enemy.y - enemy.radius - 8;
        const hpRatio = enemy.hp / enemy.maxHp;

        // 배경
        ctx.fillStyle = '#333';
        ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth, barHeight);

        // HP
        ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(enemy.x - barWidth / 2, barY, barWidth * hpRatio, barHeight);
      }
    }
  }
}
