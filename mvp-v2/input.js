// 입력 처리 모듈
// 용도: 키보드/마우스 이벤트 → PLAYER_INPUT 객체로 통합, 매 프레임 상태 제공
// 솔로모드: 하나의 키보드+마우스가 driver(운전수)+gunner(포수) 모두 담당
import { CONTROL_CONFIG } from './config/controls.js';

// --- 내부 참조 ---
/** @type {HTMLCanvasElement|null} */
let canvas = null;

// --- 동시 누름 판정용 ---
/** @type {number[]} 무기 키 눌린 시간 (timeStamp) */
const weaponKeyTimestamps = { 1: 0, 2: 0, 3: 0, 4: 0 };

// --- 플레이어 입력 상태 ---
export const PLAYER_INPUT = {
  driver: {
    forward: false,   // W — 전진
    reverse: false,   // S — 후진/제동
    left: false,      // A — 좌회전
    right: false,     // D — 우회전
    dash: false,      // Space — 기본 대시 (진행 방향 순간 가속)
  },
  gunner: {
    aimX: 0,          // 마우스 화면 x 좌표 (캔버스 기준)
    aimY: 0,          // 마우스 화면 y 좌표 (캔버스 기준)
    fire: false,      // 마우스 왼쪽 버튼
    weaponKeys: { 1: false, 2: false, 3: false, 4: false }, // 숫자키 눌림 상태
    selectedWeapons: new Set(),  // 현재 선택된 무기 ID 집합 {1}, {2}, {1,2} 등
  },
  system: {
    restart: false,   // R — 게임오버 후 재시작 (원샷: main.js가 소비 후 false로)
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
    // 키 반복 이벤트 무시 — 재시작 루프 등 연속 발동 방지
    if (e.repeat) return;

    handleKey(e.code, true, e.timeStamp);
    // Space, 화살표 키, 숫자키의 기본 브라우저 동작 방지
    if (CONTROL_CONFIG.preventDefaultKeys.includes(e.code)) {
      e.preventDefault();
    }
    // 숫자키도 기본 동작 방지 (브라우저 탭 전환 등)
    if (['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    handleKey(e.code, false, e.timeStamp);
  });

  // --- 마우스 이동: 캔버스 좌표계로 변환 ---
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    PLAYER_INPUT.gunner.aimX = (e.clientX - rect.left) * scaleX;
    PLAYER_INPUT.gunner.aimY = (e.clientY - rect.top) * scaleY;
  });

  // --- 마우스 버튼: 발사 ---
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
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
 * 키 코드를 CONTROL_CONFIG와 비교해 입력 상태 갱신
 * @param {string} code - KeyboardEvent.code
 * @param {boolean} pressed - 눌렀으면 true, 뗐으면 false
 * @param {number} timeStamp - 이벤트 발생 시간 (ms)
 */
function handleKey(code, pressed, timeStamp) {
  const c = CONTROL_CONFIG;

  if (code === c.forward)  { PLAYER_INPUT.driver.forward = pressed; return; }
  if (code === c.reverse)  { PLAYER_INPUT.driver.reverse = pressed; return; }
  if (code === c.left)     { PLAYER_INPUT.driver.left    = pressed; return; }
  if (code === c.right)    { PLAYER_INPUT.driver.right   = pressed; return; }
  if (code === c.action)   { PLAYER_INPUT.driver.dash    = pressed; return; }
  if (code === c.restart)  { PLAYER_INPUT.system.restart = pressed; return; }

  // --- 무기 선택 키 (1~4) ---
  if (code === c.weapon1) { setWeaponKey(1, pressed, timeStamp); return; }
  if (code === c.weapon2) { setWeaponKey(2, pressed, timeStamp); return; }
  if (code === c.weapon3) { setWeaponKey(3, pressed, timeStamp); return; }
  if (code === c.weapon4) { setWeaponKey(4, pressed, timeStamp); return; }
}

/**
 * 무기 선택 키 상태 갱신 + 타임스탬프 기록
 */
function setWeaponKey(id, pressed, timeStamp) {
  PLAYER_INPUT.gunner.weaponKeys[id] = pressed;
  if (pressed) {
    weaponKeyTimestamps[id] = timeStamp;
  }
}

/**
 * 매 프레임 호출 — 최신 입력 상태 반환 + selectedWeapons 갱신
 * @returns {typeof PLAYER_INPUT}
 */
export function updateInput() {
  const { weaponKeys } = PLAYER_INPUT.gunner;

  // 눌린 무기 키 수집
  const pressed = [];
  for (let id = 1; id <= 4; id++) {
    if (weaponKeys[id]) pressed.push(id);
  }

  const selected = PLAYER_INPUT.gunner.selectedWeapons;
  selected.clear();

  if (pressed.length === 1) {
    // 단일 무기
    selected.add(pressed[0]);
  } else if (pressed.length === 2) {
    // 두 키가 100ms 이내로 눌렸으면 융합 무기
    const t1 = weaponKeyTimestamps[pressed[0]];
    const t2 = weaponKeyTimestamps[pressed[1]];
    if (Math.abs(t1 - t2) <= 100) {
      selected.add(pressed[0]);
      selected.add(pressed[1]);
    } else {
      // 시간차가 크면 나중에 누른 키만 선택
      const later = t1 > t2 ? pressed[0] : pressed[1];
      selected.add(later);
    }
  }
  // pressed.length >= 3 → 선택 안 함 (혼란 방지)

  return PLAYER_INPUT;
}
