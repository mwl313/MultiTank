// 키 바인딩
// 용도: input.js에서 import. 키 변경은 여기만 수정.
// 값은 KeyboardEvent.code 문자열 (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code)
export const CONTROL_CONFIG = {
  // --- 운전수 ---
  forward:  'KeyW',
  left:     'KeyA',
  reverse:  'KeyS',
  right:    'KeyD',
  action:   'Space',      // 드리프트 액션 (추가 가속 or 회피기)

  // --- 포수 ---
  fire:     'MouseLeft',  // 마우스 왼쪽 버튼
  weapon1:  'Digit1',     // 1 — 폭발 무기
  weapon2:  'Digit2',     // 2 — 속사 무기
  weapon3:  'Digit3',     // 3 — 저격 무기
  weapon4:  'Digit4',     // 4 — 관통 무기

  // --- 시스템 ---
  restart:  'KeyR',       // 게임오버 후 재시작

  // --- 브라우저 기본 동작 방지 ---
  preventDefaultKeys: ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
};
