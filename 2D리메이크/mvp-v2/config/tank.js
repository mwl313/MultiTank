// 탱크 기본 스탯
// 용도: tank.js 생성자에서 읽기. 새 탱크 타입 추가 시 여기에만 추가.
export const TANK_CONFIG = {
  default: {
    hp: 100,
    width: 48,
    height: 32,
    bodyColor: '#4a9e4a',     // 섀시 색 (진한 녹색)
    turretColor: '#3a7e3a',   // 포탑 색 (더 진한 녹색)
    turretLength: 28,         // 포탑 선 길이 px
    turretWidth: 6,           // 포탑 선 두께 px
    invincibleDuration: 500,  // ms — 피격 후 무적 시간 (연속 피해 방지)
  },

  // 확장 예:
  // scout: { hp: 60,  width: 36, height: 24, bodyColor: '#4aae9a', ... },
  // heavy: { hp: 200, width: 56, height: 40, bodyColor: '#6a5e3a', ... },
};
