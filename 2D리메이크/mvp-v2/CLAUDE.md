# 2D 탑다운 협동 탱크 게임 — MVP

## 프로젝트 개요
- **장르:** 2D 탑다운 뱀서라이크
- **핵심:** 스플릿 컨트롤 (운전수 WASD + 포수 마우스 조준/발사)
- **MVP 목표:** 순수 게임 메커니즘 검증 (메타 시스템 없음)
- **현재 상태:** 솔로 모드 (추후 멀티 확장 가능 구조)

## 아키텍처 원칙

### 1. 하드코딩 절대 금지
- 모든 수치, 타입, 파라미터는 `config/` 디렉토리의 JS 파일에서 export
- 게임 로직 파일은 `import { XXX } from './config/XXX.js'` 방식으로만 참조
- 새 기능 추가 시 config 파일만 추가/수정하면 되도록 설계

### 2. config 파일은 읽기 전용
- config 파일의 내용을 코드에서 변경하지 마
- config를 수정하고 싶다면 직접 수정할 테니, 제안만 해줘

### 3. ES6 모듈 시스템
- 모든 .js 파일은 ES6 module (`type="module"`)
- import/export 사용
- 파일 확장자 .js 포함 (예: `import { X } from './config/game.js'`)

### 4. 언어
- 코드 주석: 한국어
- 변수/함수명: 영어 (camelCase)
- config 키 이름: 영어 (camelCase)

### 5. 디렉토리 구조
```
mvp-v2/
├── index.html        ← 진입점 (수정 금지, UI 구조 제공)
├── main.js           ← 게임 루프, 상태 관리
├── tank.js           ← 탱크 물리 (가속·드리프트·충돌)
├── turret.js         ← 포탑 조준·발사
├── bullet.js         ← 총알 풀·이동
├── enemy.js          ← 적 스폰·AI·충돌
├── map.js            ← 맵 생성·렌더링
├── camera.js         ← 카메라 추적
├── input.js          ← 입력 매핑
├── render.js         ← 통합 렌더링 (선택)
└── config/
    ├── game.js       ← 캔버스, FPS
    ├── physics.js    ← 가속, 마찰, 드리프트
    ├── tank.js       ← 탱크 스탯
    ├── enemies.js    ← 적 타입 + 스폰 파라미터
    ├── weapons.js    ← 무기 타입
    ├── map.js        ← 맵, 장애물
    └── controls.js   ← 키 바인딩
```

## 물리 모델
- **탱크는 velocity 벡터 기반 이동** (입력 즉시 방향 전환이 아님)
- **드리프트:** velocity 방향 ≠ chassisAngle 일 때 미끄러짐
- 포탑은 마우스 방향으로 자유 회전 (chassisAngle과 독립)

## 참고: 스폰 시스템 설계
- Vampire Survivors: 화면 밖 +50% 거리 스폰, time-based pool
- Megabonk: 전방 스폰 문제 → forwardAvoidance 파라미터로 해결
- Brotato: 명확한 maxEnemies 상한 (우리는 40)
- 자세한 설계는 03-MVP-v2.md 참고

## 참고: 게임 디자인 철학
- "함께 싸우는 뱀서라이크" — 운전수는 전장을 만들고, 포수는 총으로 채운다
- 이동 자체가 게임플레이 (뱀서의 정적 버티기와 차별화)
- 자세한 차별점은 01-차별점-아이데이션.md 참고
