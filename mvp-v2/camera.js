// 카메라 모듈
// 용도: 월드 좌표 → 화면 좌표 변환, 부드러운 대상 추적 (lerp)
import { GAME_CONFIG } from './config/game.js';

/**
 * 카메라 객체 생성
 * @returns {{x: number, y: number}} x, y는 뷰포트 좌상단의 월드 좌표
 */
export function createCamera() {
  return {
    x: 0,
    y: 0,
  };
}

/**
 * 월드 좌표를 화면(캔버스) 좌표로 변환
 * @param {number} wx - 월드 x 좌표
 * @param {number} wy - 월드 y 좌표
 * @param {{x: number, y: number}} camera - 카메라 객체
 * @returns {{x: number, y: number}} 화면 좌표
 */
export function worldToScreen(wx, wy, camera) {
  return {
    x: wx - camera.x,
    y: wy - camera.y,
  };
}

/**
 * 카메라를 대상 위치로 부드럽게 추적 (지수 감쇠 lerp)
 * dt 기반이므로 프레임레이트가 변해도 일관된 움직임
 * @param {{x: number, y: number}} camera - 카메라 객체 (직접 수정됨)
 * @param {number} targetX - 추적 대상의 월드 x 좌표
 * @param {number} targetY - 추적 대상의 월드 y 좌표
 * @param {number} dt - delta time (ms)
 */
export function updateCamera(camera, targetX, targetY, dt) {
  const { canvasWidth, canvasHeight } = GAME_CONFIG;

  // 화면 중앙에 targetX, targetY가 오도록 카메라 목표 위치 계산
  const desiredX = targetX - canvasWidth / 2;
  const desiredY = targetY - canvasHeight / 2;

  // 카메라 추적 속도 (초당 감쇠 계수 — 클수록 빠르게 따라감)
  const lerpSpeed = 8;

  // 지수 감쇠 공식: 프레임레이트 독립적인 부드러운 lerp
  const t = 1 - Math.exp(-lerpSpeed * dt / 1000);

  camera.x += (desiredX - camera.x) * t;
  camera.y += (desiredY - camera.y) * t;
}
