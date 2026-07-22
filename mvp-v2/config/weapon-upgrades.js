// 무기 강화 단계별 능력치 테이블 (1~20단계)
// 용도: upgrade-system.js에서 단계에 따른 실제 수치 조회
// 데이터 출처: 07-사격수-무기-시스템.md §10
// 각 무기별 [{damage, magazine, reloadTime, uniqueValue}, ...] (인덱스 0 = 1단계)

export const WEAPON_UPGRADES = {
  // --- 💥 폭발 (Explosion) ---
  // uniqueValue = 폭발 반경 단계 (§7.6: 공용옵션 5/10/15/20 도달 시 자동 상승)
  explosion: [
    { damage: 2,  magazine: 3.00, reloadTime: 5,  unique: 1 },
    { damage: 4,  magazine: 2.95, reloadTime: 6,  unique: 1 },
    { damage: 6,  magazine: 2.90, reloadTime: 8,  unique: 1 },
    { damage: 8,  magazine: 2.85, reloadTime: 9,  unique: 1 },
    { damage: 10, magazine: 2.80, reloadTime: 10, unique: 2 },
    { damage: 12, magazine: 2.75, reloadTime: 12, unique: 2 },
    { damage: 14, magazine: 2.70, reloadTime: 13, unique: 2 },
    { damage: 16, magazine: 2.65, reloadTime: 14, unique: 2 },
    { damage: 18, magazine: 2.60, reloadTime: 16, unique: 2 },
    { damage: 20, magazine: 2.55, reloadTime: 17, unique: 3 },
    { damage: 22, magazine: 2.50, reloadTime: 18, unique: 3 },
    { damage: 24, magazine: 2.45, reloadTime: 20, unique: 3 },
    { damage: 26, magazine: 2.40, reloadTime: 21, unique: 3 },
    { damage: 28, magazine: 2.35, reloadTime: 22, unique: 3 },
    { damage: 30, magazine: 2.30, reloadTime: 24, unique: 4 },
    { damage: 32, magazine: 2.25, reloadTime: 25, unique: 4 },
    { damage: 34, magazine: 2.20, reloadTime: 26, unique: 4 },
    { damage: 36, magazine: 2.15, reloadTime: 28, unique: 4 },
    { damage: 38, magazine: 2.10, reloadTime: 29, unique: 4 },
    { damage: 40, magazine: 2.05, reloadTime: 30, unique: 5 },
  ],

  // --- 🔫 속사 (Rapid Fire) ---
  // uniqueValue = 발사 횟수
  rapid: [
    { damage: 2,  magazine: 3, reloadTime: 3.00, unique: 5 },
    { damage: 4,  magazine: 3, reloadTime: 2.95, unique: 6 },
    { damage: 6,  magazine: 3, reloadTime: 2.90, unique: 8 },
    { damage: 8,  magazine: 3, reloadTime: 2.85, unique: 9 },
    { damage: 10, magazine: 4, reloadTime: 2.80, unique: 10 },
    { damage: 12, magazine: 4, reloadTime: 2.75, unique: 12 },
    { damage: 14, magazine: 4, reloadTime: 2.70, unique: 13 },
    { damage: 16, magazine: 4, reloadTime: 2.65, unique: 14 },
    { damage: 18, magazine: 4, reloadTime: 2.60, unique: 16 },
    { damage: 20, magazine: 5, reloadTime: 2.55, unique: 17 },
    { damage: 22, magazine: 5, reloadTime: 2.50, unique: 18 },
    { damage: 24, magazine: 5, reloadTime: 2.45, unique: 20 },
    { damage: 26, magazine: 5, reloadTime: 2.40, unique: 21 },
    { damage: 28, magazine: 5, reloadTime: 2.35, unique: 22 },
    { damage: 30, magazine: 6, reloadTime: 2.30, unique: 24 },
    { damage: 32, magazine: 6, reloadTime: 2.25, unique: 25 },
    { damage: 34, magazine: 6, reloadTime: 2.20, unique: 26 },
    { damage: 36, magazine: 6, reloadTime: 2.15, unique: 28 },
    { damage: 38, magazine: 6, reloadTime: 2.10, unique: 29 },
    { damage: 40, magazine: 7, reloadTime: 2.05, unique: 30 },
  ],

  // --- 🎯 저격 (Sniper) ---
  // uniqueValue = 저격 거리 비례 계수
  sniper: [
    { damage: 5,   magazine: 1.0, reloadTime: 10, unique: 2.50 },
    { damage: 10,  magazine: 1.0, reloadTime: 11, unique: 2.45 },
    { damage: 100, magazine: 1.0, reloadTime: 13, unique: 2.40 },
    { damage: 95,  magazine: 1.0, reloadTime: 14, unique: 2.35 },
    { damage: 90,  magazine: 1.5, reloadTime: 15, unique: 2.30 },
    { damage: 85,  magazine: 1.5, reloadTime: 17, unique: 2.25 },
    { damage: 80,  magazine: 1.5, reloadTime: 18, unique: 2.20 },
    { damage: 75,  magazine: 1.5, reloadTime: 19, unique: 2.15 },
    { damage: 70,  magazine: 1.5, reloadTime: 21, unique: 2.10 },
    { damage: 65,  magazine: 2.0, reloadTime: 22, unique: 2.05 },
    { damage: 60,  magazine: 2.0, reloadTime: 23, unique: 2.00 },
    { damage: 55,  magazine: 2.0, reloadTime: 25, unique: 1.95 },
    { damage: 50,  magazine: 2.0, reloadTime: 26, unique: 1.90 },
    { damage: 45,  magazine: 2.0, reloadTime: 27, unique: 1.85 },
    { damage: 40,  magazine: 2.5, reloadTime: 29, unique: 1.80 },
    { damage: 35,  magazine: 2.5, reloadTime: 30, unique: 1.75 },
    { damage: 30,  magazine: 2.5, reloadTime: 31, unique: 1.70 },
    { damage: 25,  magazine: 2.5, reloadTime: 33, unique: 1.65 },
    { damage: 20,  magazine: 2.5, reloadTime: 34, unique: 1.60 },
    { damage: 15,  magazine: 3.0, reloadTime: 35, unique: 1.55 },
  ],

  // --- 🔩 관통 (Pierce) ---
  // uniqueValue = 관통 데미지 감소율 (%)
  pierce: [
    { damage: 20, magazine: 30, reloadTime: 2.00, unique: 3  },
    { damage: 22, magazine: 30, reloadTime: 1.95, unique: 6  },
    { damage: 26, magazine: 30, reloadTime: 1.90, unique: 60 },
    { damage: 28, magazine: 30, reloadTime: 1.85, unique: 57 },
    { damage: 30, magazine: 25, reloadTime: 1.80, unique: 54 },
    { damage: 34, magazine: 25, reloadTime: 1.75, unique: 51 },
    { damage: 36, magazine: 25, reloadTime: 1.70, unique: 48 },
    { damage: 38, magazine: 25, reloadTime: 1.65, unique: 45 },
    { damage: 42, magazine: 25, reloadTime: 1.60, unique: 42 },
    { damage: 44, magazine: 20, reloadTime: 1.55, unique: 39 },
    { damage: 46, magazine: 20, reloadTime: 1.50, unique: 36 },
    { damage: 50, magazine: 20, reloadTime: 1.45, unique: 33 },
    { damage: 52, magazine: 20, reloadTime: 1.40, unique: 30 },
    { damage: 54, magazine: 20, reloadTime: 1.35, unique: 27 },
    { damage: 58, magazine: 15, reloadTime: 1.30, unique: 24 },
    { damage: 60, magazine: 15, reloadTime: 1.25, unique: 21 },
    { damage: 62, magazine: 15, reloadTime: 1.20, unique: 18 },
    { damage: 66, magazine: 15, reloadTime: 1.15, unique: 15 },
    { damage: 68, magazine: 15, reloadTime: 1.10, unique: 12 },
    { damage: 70, magazine: 10, reloadTime: 1.05, unique: 9  },
  ],
};

/** 무기 ID → WEAPON_UPGRADES 키 매핑 */
const ID_TO_KEY = { 1: 'explosion', 2: 'rapid', 3: 'sniper', 4: 'pierce' };

/**
 * 무기 ID와 단계(1~20)로 해당 단계의 능력치 조회
 * @param {number} weaponId - 무기 ID
 * @param {number} level - 강화 단계 (1~20)
 * @returns {{damage:number, magazine:number, reloadTime:number, unique:number}|null}
 */
export function getUpgradeStats(weaponId, level) {
  const key = ID_TO_KEY[weaponId];
  if (!key) return null;
  const table = WEAPON_UPGRADES[key];
  if (!table || level < 1 || level > table.length) return null;
  return table[level - 1];
}
