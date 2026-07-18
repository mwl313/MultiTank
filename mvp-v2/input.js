// 입력 처리 모듈
// 용도: 키보드/마우스 이벤트 → PLAYER_INPUT 객체로 통합, 매 프레임 상태 제공
// 솔로모드: 하나의 키보드+마우스가 driver(운전수)+gunner(포수) 모두 담당
import { CONTROL_CONFIG } from './config/controls.js';

// --- 내부 참조 ---
/** @type {HTMLCanvasElement|null} */
let canvas = null;

// --- 플레이어 입력 상태 ---
export const PLAYER_INPUT = {
  driver: {
    forward: false,   // W — 전진
    reverse: false,   // S — 후진/제동
    left: false,      // A — 좌회전
    right: false,     // D — 우회전
    action: false,    // Space — 드리프트 액션
  },
  gunner: {
    aimX: 0,          // 마우스 화면 x 좌표 (캔버스 기준)
    aimY: 0,          // 마우스 화면 y 좌표 (캔버스 기준)
    fire: false,      // 마우스 왼쪽 버튼
  },
};

/**
 * 입력 시스템 초기화 — 키보드/마우스 이벤트 리스너 등록
 * @param {HTMLCanvasElement} canvasEl - 게임 캔버스 요소
 */
export function initInput(canvasEl) {
  canvas = canvasEl;

  // --- 키보드 ---
  window.addEventListener('keydown', (e) => {
    handleKey(e.code, true);
    // Space, 화살표 키의 기본 브라우저 동작(스크롤 등) 방지
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    handleKey(e.code, false);
  });

  // --- 마우스 이동: 캔버스 좌표계로 변환 ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    // 캔버스의 실제 렌더링 크기와 CSS 표시 크기 간 비율 보정
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    PLAYER_INPUT.gunner.aimX = (e.clientX - rect.left) * scaleX;
    PLAYER_INPUT.gunner.aimY = (e.clientY - rect.top) * scaleY;
  });

  // --- 마우스 버튼: 발사 ---
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // 왼쪽 버튼
      PLAYER_INPUT.gunner.fire = true;
      e.preventDefault();
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      PLAYER_INPUT.gunner.fire = false;
    }
  });

  // 캔버스 밖으로 마우스가 나가면 발사 중지
  canvas.addEventListener('mouseleave', () => {
    PLAYER_INPUT.gunner.fire = false;
  });

  // 우클릭 컨텍스트 메뉴 방지
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

/**
 * 키 코드를 CONTROL_CONFIG와 비교해 driver 입력 상태 갱신
 * @param {string} code - KeyboardEvent.code
 * @param {boolean} pressed - 눌렀으면 true, 뗐으면 false
 */
function handleKey(code, pressed) {
  const c = CONTROL_CONFIG;

  if (code === c.forward)  { PLAYER_INPUT.driver.forward = pressed; return; }
  if (code === c.reverse)  { PLAYER_INPUT.driver.reverse = pressed; return; }
  if (code === c.left)     { PLAYER_INPUT.driver.left    = pressed; return; }
  if (code === c.right)    { PLAYER_INPUT.driver.right   = pressed; return; }
  if (code === c.action)   { PLAYER_INPUT.driver.action  = pressed; return; }
  // restart(R)는 Phase 5에서 처리 — 여기선 이벤트만 감지하고 상태는 main.js에서
}

/**
 * 매 프레임 호출 — 최신 입력 상태 반환
 * (현재는 이벤트 기반으로 실시간 갱신되므로 참조만 반환)
 * @returns {typeof PLAYER_INPUT}
 */
export function updateInput() {
  return PLAYER_INPUT;
}
