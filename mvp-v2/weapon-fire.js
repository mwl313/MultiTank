// 무기별 발사 로직 — 핸들러 레지스트리 패턴
// 용도: 무기 ID에 따라 다른 발사 행동을 수행. 새 무기 추가는 여기에만 등록.
import { WEAPON_CONFIG, getWeaponById } from './config/weapons.js';
import { TANK_CONFIG } from './config/tank.js';

/**
 * 무기 발사 — 무기 ID에 해당하는 핸들러 호출
 * @param {number} weaponId - 무기 ID (1~4)
 * @param {import('./tank.js').Tank} tank - 발사하는 탱크
 * @param {import('./bullet.js').BulletPool} bulletPool - 총알 풀
 */
export function fireWeapon(weaponId, tank, bulletPool) {
  const handler = FIRE_HANDLERS[weaponId];
  if (handler) {
    handler(tank, bulletPool);
  }
}

// --- 무기 레지스트리 (새 무기 등록은 여기에) ---
/** @type {Object<number, Function>} */
const FIRE_HANDLERS = {
  1: fireExplosion,
  2: fireRapid,
  3: fireSniper,
  4: firePierce,
};

// --- 무기별 발사 함수 ---

/** 💥 폭발 — 단일 포탄, 착탄 시 AoE */
function fireExplosion(tank, bulletPool) {
  const w = WEAPON_CONFIG.explosion;
  const bullet = bulletPool.getBullet();
  if (!bullet) return;

  setupBullet(bullet, tank, w);
}

/** 🔫 속사 — 1회 발사 시 여러 발 (산개각 포함) */
function fireRapid(tank, bulletPool) {
  const w = WEAPON_CONFIG.rapid;
  const fireCount = w.baseFireCount; // todo: upgrade system에서 실제 값 가져오기

  for (let i = 0; i < fireCount; i++) {
    const bullet = bulletPool.getBullet();
    if (!bullet) break;

    // 약간의 산개각 (±5° 이내)
    const spreadAngle = (Math.random() - 0.5) * (10 * Math.PI / 180);
    const angle = tank.turretAngle + spreadAngle;

    setupBulletWithAngle(bullet, tank, w, angle);
  }
}

/** 🎯 저격 — 단일 고속 포탄, 원거리 데미지 계수 */
function fireSniper(tank, bulletPool) {
  const w = WEAPON_CONFIG.sniper;
  const bullet = bulletPool.getBullet();
  if (!bullet) return;

  setupBullet(bullet, tank, w);
}

/** 🔩 관통 — 적 관통, 데미지 감소 */
function firePierce(tank, bulletPool) {
  const w = WEAPON_CONFIG.pierce;
  const bullet = bulletPool.getBullet();
  if (!bullet) return;

  setupBullet(bullet, tank, w);
  // 관통 데미지 감소율 설정 (collision.js에서 사용)
  bullet.pierceReduction = w.basePierceReduction;
}

// --- 헬퍼 함수 ---

/**
 * 총알 기본 설정 (탱크 위치 + 포탑 방향)
 */
function setupBullet(bullet, tank, weaponConfig) {
  setupBulletWithAngle(bullet, tank, weaponConfig, tank.turretAngle);
}

/**
 * 총알 설정 (지정 각도)
 */
function setupBulletWithAngle(bullet, tank, weaponConfig, angle) {
  const { turretLength } = TANK_CONFIG.default;

  // 위치: 포탑 끝
  bullet.x = tank.x + Math.cos(angle) * turretLength;
  bullet.y = tank.y + Math.sin(angle) * turretLength;

  // 속도
  bullet.vx = Math.cos(angle) * weaponConfig.bulletSpeed;
  bullet.vy = Math.sin(angle) * weaponConfig.bulletSpeed;

  // 무기별 속성
  bullet.radius = weaponConfig.bulletRadius;
  bullet.color = weaponConfig.bulletColor;
  bullet.damage = weaponConfig.baseDamage; // todo: upgrade system에서 실제 값 가져오기
  bullet.maxLifetime = weaponConfig.bulletLifetime;
  bullet.weaponId = weaponConfig.id;
  bullet.pierceReduction = 0; // 기본값 (관통 시 덮어씀)
}

// --- 융합 무기 ---

/**
 * 융합 무기 발사 — 두 무기 ID의 특성을 결합
 * @param {number[]} weaponIds - 선택된 무기 ID 2개
 * @param {import('./tank.js').Tank} tank
 * @param {import('./bullet.js').BulletPool} bulletPool
 */
export function fireFusionWeapon(weaponIds, tank, bulletPool) {
  const w1 = getWeaponById(weaponIds[0]);
  const w2 = getWeaponById(weaponIds[1]);
  if (!w1 || !w2) return;

  const bullet = bulletPool.getBullet();
  if (!bullet) return;

  // 융합 포탄: 두 무기의 특성 중 적절한 것 선택
  // 기본 위치/속도: 포탑 방향
  const { turretLength } = TANK_CONFIG.default;
  bullet.x = tank.x + Math.cos(tank.turretAngle) * turretLength;
  bullet.y = tank.y + Math.sin(tank.turretAngle) * turretLength;

  // 속도: 더 빠른 쪽
  const speed = Math.max(w1.bulletSpeed, w2.bulletSpeed);
  bullet.vx = Math.cos(tank.turretAngle) * speed;
  bullet.vy = Math.sin(tank.turretAngle) * speed;

  // 데미지: 더 높은 쪽
  bullet.damage = Math.max(w1.baseDamage, w2.baseDamage);

  // 외형: 첫 번째 무기 기준
  bullet.radius = Math.max(w1.bulletRadius, w2.bulletRadius);
  bullet.color = w1.bulletColor;
  bullet.maxLifetime = Math.max(w1.bulletLifetime, w2.bulletLifetime);

  // weaponId는 첫 번째 무기로 (충돌 처리 기준)
  bullet.weaponId = w1.id;

  // 관통: 관통 무기가 포함됐으면 관통 감소율 적용
  if (w1.id === 4) bullet.pierceReduction = w1.basePierceReduction;
  else if (w2.id === 4) bullet.pierceReduction = w2.basePierceReduction;
  else bullet.pierceReduction = 0;
}
