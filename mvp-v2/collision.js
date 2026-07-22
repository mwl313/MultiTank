// 충돌 처리 모듈
// 용도: 총알-적 충돌, 탱크-적 충돌, Circle-AABB 밀어내기 (공통)
import { TANK_CONFIG } from './config/tank.js';
import { PHYSICS_CONFIG } from './config/physics.js';
import { MAP_CONFIG } from './config/map.js';
import { getObstacles } from './map.js';
import { WEAPON_CONFIG } from './config/weapons.js';
import { applyExplosionBlast, applyPierce, getSniperDamageMultiplier } from './weapon-effects.js';

// --- 공통 충돌 유틸리티 ---

/**
 * 원(Circle)을 AABB(사각형) 장애물 밖으로 밀어냄
 * enemy.js의 동일 함수를 중복 제거를 위해 collision.js로 이관.
 * 탱크와 적 양쪽에서 공유.
 * @param {{x:number, y:number, radius:number}} circle
 * @param {{x:number, y:number, w:number, h:number}} rect
 * @returns {boolean} 충돌이 있었으면 true
 */
export function pushCircleOutOfRect(circle, rect) {
  // 사각형에서 원 중심에 가장 가까운 점 찾기
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));

  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const distSq = dx * dx + dy * dy;

  if (distSq < circle.radius * circle.radius) {
    const dist = Math.sqrt(distSq);

    // 작은 dist에서의 폭발적 밀림 방지 (epsilon 가드)
    if (dist < PHYSICS_CONFIG.epsilon) {
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

// --- 총알-적 충돌 ---

/**
 * 총알-적 충돌 검사
 * 모든 활성 총알 × 모든 활성 적을 순회하며 거리 기반 히트 판정
 * @param {import('./bullet.js').BulletPool} bulletPool
 * @param {import('./enemy.js').EnemyPool} enemyPool
 */
export function checkBulletEnemyCollisions(bulletPool, enemyPool) {
  for (const bullet of bulletPool.bullets) {
    if (!bullet.active) continue;

    for (const enemy of enemyPool.pool) {
      if (!enemy.active) continue;

      const dx = bullet.x - enemy.x;
      const dy = bullet.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const contactDist = bullet.radius + enemy.radius;

      if (dist < contactDist) {
        // --- 히트! ---

        // 데미지 계산 (저격 무기: 원거리 계수 적용)
        let damage = bullet.damage;
        if (bullet.weaponId === 3) {
          const hitDist = bullet.lifetime * WEAPON_CONFIG.sniper.bulletSpeed;
          const mul = getSniperDamageMultiplier(hitDist, WEAPON_CONFIG.sniper.baseRangeMultiplier);
          damage *= mul;
        }

        enemy.hp -= damage;

        // --- 무기별 특수 효과 ---
        if (bullet.weaponId === 1) {
          // 💥 폭발: 탄착 지점에 AoE 데미지
          applyExplosionBlast(
            bullet.x, bullet.y,
            WEAPON_CONFIG.explosion.baseBlastRadius,
            bullet.damage,
            enemyPool,
          );
          bulletPool.releaseBullet(bullet);
        } else if (bullet.weaponId === 4) {
          // 🔩 관통: bullet 유지, 데미지 감소 후 계속 진행
          const canContinue = applyPierce(bullet);
          if (!canContinue) {
            bulletPool.releaseBullet(bullet);
          }
          // 관통은 break 하지 않음 — 같은 총알이 다음 적도 타격 가능
        } else {
          // 일반 / 속사 / 저격: 명중 즉시 소멸
          bulletPool.releaseBullet(bullet);
        }

        // 적 처치
        if (enemy.hp <= 0) {
          enemyPool.deactivate(enemy);
        }

        // 관통이 아니면 break (한 총알이 한 적만 타격)
        if (bullet.weaponId !== 4) {
          break;
        }
      }
    }
  }
}

// --- 탱크-적 충돌 ---

/**
 * 탱크-적 충돌 검사
 * 적이 탱크와 닿으면 데미지 + 넉백 + 무적 발동
 * @param {import('./tank.js').Tank} tank - 플레이어 탱크
 * @param {import('./enemy.js').EnemyPool} enemyPool
 * @param {number} currentTime - 현재 시간 (ms, performance.now 기준)
 */
export function checkTankEnemyCollisions(tank, enemyPool, currentTime) {
  // 대시 중이 아니고 무적 상태면 충돌 스킵 (대시는 무적과 무관하게 넉백 처리)
  if (tank.dashTimer <= 0 && currentTime < tank.invincibleUntil) return;

  const { invincibleDuration } = TANK_CONFIG.default;
  const { driftDamageMultiplier } = PHYSICS_CONFIG;

  // 탱크 충돌 반경: 짧은 변의 절반으로 근사
  const tankRadius = Math.min(tank.width, tank.height) / 2;

  for (const enemy of enemyPool.pool) {
    if (!enemy.active) continue;

    const dx = tank.x - enemy.x;
    const dy = tank.y - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const contactDist = tankRadius + enemy.radius;

    if (dist < contactDist) {
      // --- 충돌! ---

      if (tank.dashTimer > 0) {
        // === 대시 중 충돌: 데미지 없음 + 적 넉백 4배 + 장애물 스턴 ===
        const knockbackMul = 4.0;
        const pushDist = (contactDist - dist) * knockbackMul;

        if (dist > PHYSICS_CONFIG.epsilon) {
          enemy.x -= (dx / dist) * pushDist;
          enemy.y -= (dy / dist) * pushDist;
        } else {
          enemy.y -= contactDist * knockbackMul;
        }

        // 적 맵 경계 클램프
        enemy.x = Math.max(enemy.radius, Math.min(MAP_CONFIG.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(MAP_CONFIG.height - enemy.radius, enemy.y));

        // 장애물에 부딪혔는지 확인 → 스턴 0.3초
        const obstacles = getObstacles();
        for (const obs of obstacles) {
          if (pushCircleOutOfRect(enemy, obs)) {
            enemy.stunTimer = 0.3;
            break;
          }
        }
      } else {
        // === 일반 충돌: 무적 체크 → 데미지 + 넉백 ===
        if (currentTime < tank.invincibleUntil) return;

        // 데미지 계산 (드리프트 중이면 배율 적용)
        let damage = enemy.damage;
        if (tank.isDrifting) {
          damage *= driftDamageMultiplier;
        }
        tank.hp -= damage;
        tank.hp = Math.max(0, tank.hp); // 0 미만 방지

        // 적 넉백: 탱크 바깥으로 밀어내기
        if (dist > PHYSICS_CONFIG.epsilon) {
          const overlap = contactDist - dist;
          enemy.x -= (dx / dist) * overlap;
          enemy.y -= (dy / dist) * overlap;
        } else {
          // 탱크와 완전히 겹친 경우 위쪽으로 밀어내기
          enemy.y -= contactDist;
        }

        // 적 맵 경계 클램프
        enemy.x = Math.max(enemy.radius, Math.min(MAP_CONFIG.width - enemy.radius, enemy.x));
        enemy.y = Math.max(enemy.radius, Math.min(MAP_CONFIG.height - enemy.radius, enemy.y));

        // 무적 시간 발동 (연속 피해 방지)
        tank.invincibleUntil = currentTime + invincibleDuration;
      }

      // 한 프레임에 한 적만 충돌 (동시 다중 충돌 방지)
      break;
    }
  }
}
