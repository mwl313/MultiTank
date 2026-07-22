// 게임 기본 설정
// 용도: 캔버스, FPS, 디버그 — 게임 전체에 영향
export const GAME_CONFIG = {
  canvasWidth: 1920,
  canvasHeight: 1080,
  targetFPS: 60,
  debug: false,        // true면 FPS 표시 + 히트박스 렌더링
  maxDeltaTime: 100,   // ms — 프레임 간 최대 dt 상한 (탭 전환 스터터링 방지)
  cameraLerpSpeed: 8,  // 카메라 추적 속도 (클수록 빠르게 따라감)
};
