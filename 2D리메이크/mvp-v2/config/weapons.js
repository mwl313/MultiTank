// 무기 타입 정의
// 용도: bullet.js, turret.js에서 import. 새 무기 추가는 여기만 수정.
export const WEAPON_CONFIG = {
  default: {
    name: '기본포',
    fireInterval: 500,       // ms — 발사 간격 (쿨다운)
    bulletSpeed: 600,        // px/s — 총알 속도
    bulletDamage: 10,        // 적 1회 타격 데미지
    bulletRadius: 4,         // px — 충돌 판정용 반경
    bulletLifetime: 1.5,     // 초 — 최대 생존 시간
    bulletColor: '#ffdd57',  // 총알 색 (노랑)
    poolSize: 100,           // 총알 오브젝트 풀 크기
  },

  // 확장 예:
  // spread: { name: '산탄포', fireInterval: 800, bulletSpeed: 500, bulletDamage: 7, ... },
  // pierce: { name: '관통포', fireInterval: 1000, bulletSpeed: 700, bulletDamage: 15, ... },
};
