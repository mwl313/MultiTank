// 무기 타입 정의 — 4종 무기 (폭발·속사·저격·관통)
// 용도: bullet.js, tank.js, weapon-fire.js, magazine.js, collision.js에서 import
// 새 무기 추가는 여기에 정의 + weapon-upgrades.js에 테이블 + weapon-fire.js에 핸들러
export const WEAPON_CONFIG = {
  // 1. 폭발 — 탄착 지점에 넓은 범위 피해
  explosion: {
    id: 1,
    name: '폭발',
    fireInterval: 800,         // ms — 발사 간격
    bulletSpeed: 600,          // px/s
    bulletRadius: 6,           // px
    bulletColor: '#ff6b35',    // 주황
    bulletLifetime: 1.5,       // 초
    poolSize: 50,
    baseDamage: 2,             // 1단계 기준 데미지
    baseMagazine: 3,           // 1단계 기준 탄창
    baseReloadTime: 5.0,       // 초 — 1단계 기준 재장전 시간
    baseBlastRadius: 60,       // px — 폭발 반경 (고유 옵션)
  },

  // 2. 속사 — 1회 발사 시 여러 발의 포탄 발사
  rapid: {
    id: 2,
    name: '속사',
    fireInterval: 500,
    bulletSpeed: 700,
    bulletRadius: 3,
    bulletColor: '#ffdd57',    // 노랑
    bulletLifetime: 1.2,
    poolSize: 200,
    baseDamage: 2,
    baseMagazine: 3,
    baseReloadTime: 3.0,
    baseFireCount: 5,          // 1회 발사 시 포탄 수 (고유 옵션)
  },

  // 3. 저격 — 긴 사거리 + 거리 비례 데미지
  sniper: {
    id: 3,
    name: '저격',
    fireInterval: 1500,
    bulletSpeed: 1200,         // 빠른 탄속 (장거리 도달용)
    bulletRadius: 4,
    bulletColor: '#00d4ff',    // 하늘
    bulletLifetime: 4.5,       // 3배 사거리 (1.5 × 3)
    poolSize: 30,
    baseDamage: 5,
    baseMagazine: 1,
    baseReloadTime: 10.0,
    baseRangeMultiplier: 2.5,  // 저격 거리 비례 계수 (고유 옵션)
  },

  // 4. 관통 — 적/지형 관통, 관통 시 데미지 감소
  pierce: {
    id: 4,
    name: '관통',
    fireInterval: 600,
    bulletSpeed: 800,
    bulletRadius: 5,
    bulletColor: '#ff69b4',    // 분홍
    bulletLifetime: 1.5,
    poolSize: 60,
    baseDamage: 20,
    baseMagazine: 30,
    baseReloadTime: 2.0,
    basePierceReduction: 0.03, // 관통 시 데미지 감소율 3% (고유 옵션)
  },
};

/**
 * id로 무기 설정 조회 (무기 레지스트리 패턴)
 * @param {number} id - 무기 ID (1~4)
 * @returns {object|null} 무기 설정 객체
 */
export function getWeaponById(id) {
  for (const w of Object.values(WEAPON_CONFIG)) {
    if (w.id === id) return w;
  }
  return null;
}
