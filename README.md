# Claude Code Reset Timer

Claude Code의 5시간 / 7일 사용량 한도 리셋 스케줄을 시각화하는 대시보드.
로컬 Docker에서 운영하며, Claude Code statusline + JSONL 트랜스크립트를 통해 사용량을 수집합니다.

> **대상**: Claude **Pro** / **Max** 구독자

## 주요 기능

- **실시간 카운트다운** — 다음 5시간 / 7일 리셋까지 남은 시간
- **실제 사용량 표시** — statusline에서 수집한 `used_percentage`를 프로그레스 바로 표시 (LIVE)
- **사용량 추이 차트** — 5시간 윈도우별 토큰 사용량 + 사용률 오버레이
- **주간/월간 캘린더** — 리셋 시각마다 과거 토큰 사용량 바 표시
- **최근 리셋** — 과거 3 + 현재 + 미래 3 윈도우, 사용률/토큰 이중 표시
- **세션 이력** — 프로젝트별/세션별 토큰 사용량 집계
- **자동 보정** — `resets_at`으로 리셋 시각을 사용자별 서버 기준에 맞게 자동 조정

## 요구 사항

- **Docker** (Docker Desktop 또는 Docker Engine)
- **Claude Code** CLI 설치 및 로그인 완료
- **OS**: Linux, macOS, Windows (WSL 또는 Git Bash)

> **Windows**: `setup.sh`는 bash 스크립트이므로 **WSL** 또는 **Git Bash**에서 실행하세요.
> Docker 볼륨 마운트 경로(`~/.claude`)는 WSL 환경에서 가장 안정적입니다.

## 설치

```bash
git clone <repo-url> claude-reset-time
cd claude-reset-time
./setup.sh
```

`setup.sh`가 자동으로 처리하는 것:
1. `statusline.sh`를 `~/.claude/`에 설치
2. `~/.claude/settings.json`에 statusLine hook 등록
3. Docker 이미지 빌드 및 컨테이너 실행

완료 후 **http://localhost:3456** 접속.

> **중요**: 설치 후 Claude Code 세션을 **새로 시작**해야 데이터 수집이 시작됩니다.
> 이미 실행 중이던 세션에서는 statusline이 호출되지 않습니다.
>
> ```bash
> claude    # 터미널에서 새 세션 시작
> ```
>
> 첫 메시지를 보내면 statusline이 호출되고, 대시보드에 **LIVE** 표시가 나타납니다.

<details>
<summary>수동 설치 (setup.sh 없이)</summary>

```bash
# 1. statusline 스크립트 복사
cp statusline.sh ~/.claude/statusline.sh
chmod +x ~/.claude/statusline.sh

# 2. settings.json에 statusLine 추가 (jq 사용, 기존 설정 유지)
jq '. + { "statusLine": { "type": "command", "command": "~/.claude/statusline.sh" } }' \
  ~/.claude/settings.json > /tmp/settings.json && mv /tmp/settings.json ~/.claude/settings.json

# 3. Docker 실행
docker compose up -d --build
```

</details>

## 사용법

```bash
docker compose up -d          # 시작
docker compose down           # 중지
docker compose up -d --build  # 재빌드
docker compose logs -f        # 로그
```

<details>
<summary>로컬 개발 (Docker 없이)</summary>

```bash
npm install
npm run dev    # http://localhost:3000
```

</details>

## 아키텍처

```
Claude Code 세션
    │  stdin (JSON)
    ▼
~/.claude/statusline.sh ──▶ usage-latest.json    (실시간 사용률)
                          └▶ usage-history.jsonl  (사용률 이력)

~/.claude/projects/**/*.jsonl ──▶ 세션별 토큰 사용량 (과거 이력)

        Docker 볼륨 마운트 (~/.claude → /claude-data:ro)
                    ▼
             Next.js API Routes
             /api/usage/current   ← 실시간 사용률
             /api/usage/history   ← 사용률 이력
             /api/usage/windows   ← 윈도우별 토큰 집계
             /api/sessions        ← 세션별 상세
                    ▼
             http://localhost:3456
```

## 데이터 소스

| 데이터 | 소스 | 설명 |
|--------|------|------|
| 5시간/7일 사용률 | statusline | 현재 윈도우 실시간 %, 세션 활성 시 갱신 |
| 리셋 시각 보정 | statusline `resets_at` | 사용자별 실제 리셋 시각으로 자동 보정 |
| 윈도우별 토큰량 | JSONL 트랜스크립트 | 과거 5시간 윈도우마다 입력/출력 토큰 집계 |
| 세션별 상세 | JSONL 트랜스크립트 | 프로젝트/세션별 토큰, 메시지 수 |
| 사용률 추이 | `usage-history.jsonl` | statusline이 1분 간격으로 축적 |

- **현재 윈도우**: statusline LIVE → 만료 시 자동 무효화
- **과거 윈도우**: statusline 이력 → 없으면 JSONL 토큰으로 fallback

## 프로젝트 구조

```
├── setup.sh                  # 자동 설치 스크립트
├── docker-compose.yml        # Docker 설정 (포트 3456, ~/.claude 마운트)
├── Dockerfile                # 멀티스테이지 standalone 빌드
├── statusline.sh             # statusline 수집 스크립트
└── src/
    ├── app/
    │   ├── page.tsx           # 메인 대시보드
    │   ├── api/
    │   │   ├── usage/
    │   │   │   ├── current/   # 실시간 사용률
    │   │   │   ├── history/   # statusline 이력
    │   │   │   └── windows/   # 윈도우별 토큰 집계
    │   │   └── sessions/      # 세션별 상세
    │   └── globals.css        # 다크 테마 스타일
    ├── components/
    │   ├── CurrentStatus.tsx   # 5시간 윈도우 히어로
    │   ├── WeeklyStatus.tsx    # 7일 윈도우
    │   ├── UsageChart.tsx      # 사용량 추이 차트
    │   ├── SessionHistory.tsx  # 세션 이력
    │   ├── UpcomingResets.tsx   # 최근 리셋 (과거3+현재+미래3)
    │   ├── WeekView.tsx        # 주간 타임라인 + 토큰 바
    │   └── MonthView.tsx       # 월간 캘린더 + 일별 토큰
    ├── hooks/
    │   └── useUsageData.ts     # API 폴링 훅
    └── lib/
        ├── resetTimes.ts       # 리셋 시간 계산 + 자동 보정
        └── types.ts            # 타입 정의
```

## 기술 스택

- **Next.js 16** (App Router, standalone output)
- **Tailwind CSS v4**
- **TypeScript**
- **Docker** (node:24-alpine 멀티스테이지 빌드)
