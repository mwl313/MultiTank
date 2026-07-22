// 맵 생성 파라미터
// 용도: map.js에서 import. 맵 크기·장애물·시드 변경은 여기만 수정.
export const MAP_CONFIG = {
  width: 3000,               // px — 맵 전체 너비
  height: 3000,              // px — 맵 전체 높이
  seed: 'default',           // 랜덤 시드 (같은 시드 = 같은 맵. 재현 가능)
  tileSize: 64,              // px — 그리드 셀 크기 (장애물 배치 기준)

  // 장애물
  obstacleCount: 40,         // 장애물 총 개수
  obstacleMinSize: 32,       // px — 장애물 최소 크기
  obstacleMaxSize: 128,      // px — 장애물 최대 크기
  obstacleColor: '#555555',  // 장애물 색상

  // 경계
  boundaryType: 'wall',      // 'wall' — 맵 밖은 벽(못 나감)

  // 탱크 시작 위치
  spawnAreaRadius: 100,      // px — 맵 중심에서 이 반경 내 랜덤 스폰

  // 생성 파라미터
  maxGenerationAttempts: 4000, // 장애물 배치 최대 시도 횟수 (무한 루프 방지)
};
