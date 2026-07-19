# MultiTank

2D 탑다운 탱크 서바이벌 게임 — WASD로 탱크를 몰고, 마우스로 조준해 몰려오는 적을 처치하세요.

## 실행 방법

```bash
# 1. 레포 클론
git clone https://github.com/mwl313/MultiTank.git
cd MultiTank/mvp-v2

# 2. 로컬 서버 실행 (아래 중 하나)
npx http-server . -p 8080 -c-1 -o
# 또는
python -m http.server 8080

# 3. 브라우저에서 열기
# http://localhost:8080
```

## 조작

| 키 | 동작 |
|---|---|
| **W** | 전진 |
| **S** | 후진 / 제동 |
| **A / D** | 좌 / 우 회전 |
| **Space** | 대시 (탱크 앞방향으로 순간 돌진, 쿨다운 4초) |
| **마우스 이동** | 포탑 조준 |
| **좌클릭** | 발사 (쿨다운 0.5초) |
| **R** | 게임오버 후 재시작 |

## 기술 스택

Vanilla JS (ES6 modules), Canvas 2D, HTML/CSS. 별도 빌드 도구나 프레임워크 없음.

## 문서

- [게임 디자인 뼈대](05-게임디자인-뼈대.md)
- [MVP 정의](03-MVP-v2.md)
- [통합 검토 + 밸런스 제안](mvp-v2/balance-notes.md)
