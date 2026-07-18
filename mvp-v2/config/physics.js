// 탱크 물리 파라미터
// 용도: tank.js에서 import. 수정만으로 움직임 전체 튜닝 가능.
export const PHYSICS_CONFIG = {
  maxSpeed: 250,           // px/s — 최대 속도
  acceleration: 600,       // px/s² — W 누를 때 가속률
  friction: 0.92,          // 무입력 시 매 프레임 곱하는 감속 계수
  turnRate: 3.0,           // rad/s — A/D 섀시 회전 속도
  reverseMultiplier: 0.5,  // 후진 가속 배율 (전진 대비)
  brakingForce: 1.5,       // S키로 제동 시 추가 감속 배율
  driftThreshold: 0.3,     // rad — 드리프트 판정 각도 (이 이상이면 DRIFT)
  driftDamageMultiplier: 2.0, // 드리프트 중 충돌 데미지 배율
  minSpeedForDrift: 0.5,      // px/s — 드리프트 판정 최소 속도 (이 이하면 드리프트 안 함)
  epsilon: 0.001,              // 거리 0 방지를 위한 최소값 (충돌 처리 등)
};
