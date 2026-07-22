// 무기 특수 효과 — 폭발 AoE, 관통 지속, 저격 거리 계수
// 용도: collision.js에서 bullet.weaponId에 따라 호출
import { WEAPON_CONFIG } from './config/weapons.js';

/**
 * 폭발 AoE — bullet 위치 기준 blastRadius 내 모든 적에게 blastDamage 적용
 * @param {number} x - 폭발 중심 x
 * @param {number} y - 폭발 중심 y
 * @param {number} blastRadius - 폭발 반경 (px)
 * @param {number} blastDamage - 폭발 데미지
 * @param {import('./enemy.js').EnemyPool} enemyPool
 */
export function applyExplosionBlast(x, y, blastRadius, blastDamage, enemyPool) {
  const radiusSq = blastRadius * blastRadius;

  for (const enemy of enemyPool.pool) {
    if (!enemy.active) continue;

    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= radiusSq) {
      enemy.hp -= blastDamage;
      if (enemy.hp <= 0) {
        enemyPool.deactivate(enemy);
      }
    }
  }
}

/**
 * 관통 처리 — bullet을 소멸시키지 않고 데미지만 감소
 * @param {object} bullet - 총알 객체
 * @returns {boolean} 관통 후에도 bullet이 유효하면 true (더 이상 못 뚫으면 false)
 */
export function applyPierce(bullet) {
  // pierceReduction 만큼 데미지 감소
  bullet.damage *= (1 - bullet.pierceReduction);

  // 데미지가 1 미만이면 소멸
  if (bullet.damage < 1) {
    return false; // caller가 releaseBullet 처리
  }
  return true; // bullet 유지, 계속 진행
}

/**
 * 저격 거리 비례 데미지 계수 계산
 * @param {number} hitDist - 총알이 이동한 거리 (px)
 * @param {number} rangeMultiplier - 저격 거리 비례 계수 (config에서)
 * @returns {number} 데미지 배율 (1.0 이상)
 */
export function getSniperDamageMultiplier(hitDist, rangeMultiplier) {
  // 기본 사정거리 (속사/폭발 기준 약 900px = 600 × 1.5)
  const baseRange = 900;

  if (hitDist > baseRange) {
    // 원거리 저격: 거리 비례 계수 적용
    return rangeMultiplier;
  }
  return 1.0; // 근거리: 일반 데미지
}
