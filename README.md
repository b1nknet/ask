# ask

개인용 익명 질문함입니다. 질문은 답변과 함께 선택적으로 공개합니다.

## 구성

| 영역      | 기술                                                 |
| --------- | ---------------------------------------------------- |
| 앱        | Next.js 16 App Router, React, TypeScript             |
| UI        | Tailwind CSS, Pretendard Variable·JP Variable 웹폰트 |
| 데이터    | SQLite, Prisma ORM 7, better-sqlite3                 |
| 인증      | Better Auth, 로컬 아이디·비밀번호, DB 세션           |
| 코드 검사 | ESLint, eslint-config-next                           |
| 포맷팅    | Prettier, eslint-config-prettier                     |
| 운영      | Docker Compose                                       |

서비스 실행에 외부 DB·인증·분석 서비스가 필요하지 않습니다. 질문 스팸 방지를 위해 Cloudflare Turnstile을 선택적으로 사용할 수 있습니다. 공개 배포 시 도메인과 HTTPS는 운영 환경에서 별도로 설정합니다.

화면은 `#181818` 배경과 `#c8b4f0` 포인트를 사용합니다. 웹폰트는 jsDelivr에서 Pretendard 1.3.9 가변 다이나믹 서브셋을 불러오며, 한국어에는 Pretendard Variable, `lang="ja"`로 지정한 일본어에는 Pretendard JP Variable을 우선 적용합니다. 웹폰트를 불러오지 못하면 시스템 폰트로 표시합니다.

Prisma는 Better Auth와 호환되는 7.x를 사용합니다. `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`는 함께 업데이트하세요. 현재 `latest` 태그를 무조건 설치하면 시험판 메이저 버전으로 바뀔 수 있습니다.

## 로컬 개발

Node.js 24.11 이상인 24.x와 npm을 사용합니다. `.nvmrc`, `.node-version`도 포함했습니다.

```bash
npm ci
npm run setup
```

`setup`은 `.env`가 없으면 생성하고, `BETTER_AUTH_SECRET`이 없거나 비어 있으면 임의의 인증 비밀키를 채웁니다. 기존에 설정한 키와 다른 환경 변수는 유지합니다. 이어서 Prisma Client 생성·마이그레이션 적용·SQLite WAL 설정을 수행합니다.

DB 파일을 삭제해 처음부터 테스트할 때도 `npm run setup`을 다시 실행한 뒤 웹에서 계정을 생성하세요. `prisma/migrations`는 테이블을 만드는 데 필요한 소스 파일이므로 삭제하지 않습니다. 마이그레이션 파일이 없거나 비어 있으면 초기화 명령은 실패합니다.

```bash
npm run dev
```

브라우저에서 <http://localhost:3000>을 열면 계정이 없는 경우 `/setup`으로 이동합니다. 아이디·비밀번호·비밀번호 확인을 입력해 첫 관리자 계정을 만든 뒤 로그인하세요. `/admin`·`/admin/login`·`/admin/account`에 먼저 접속해도 같은 초기 설정 화면으로 이동합니다. 공개 주소를 공유하기 전에 첫 계정 설정을 마치세요.

아이디는 3~30자의 영문·숫자·밑줄(`_`)·마침표(`.`)를 지원하며 대소문자를 구분하지 않습니다. 아이디를 `.env`에 설정할 필요는 없습니다. 비밀번호는 필수 입력이며 길이 제한은 없습니다. 계정이 하나라도 있으면 초기 설정 화면은 로그인으로 이동하고 계정 생성 요청은 거절합니다. 동시 요청에서도 첫 관리자 한 명만 생성하며, 일반 HTTP 회원가입 API는 계속 비활성화됩니다.

터미널의 `npm run admin:create`도 추가 관리자 생성용으로 유지합니다. 아이디와 비밀번호를 대화형으로 입력받으며, 아이디를 인자로 지정하려면 `npm run admin:create -- owner`를 사용하세요. 비대화형 실행에서는 아이디 인자와 `ADMIN_PASSWORD` 환경 변수를 함께 사용합니다. 입력은 가립니다. 이미 존재하는 계정의 비밀번호는 변경하지 않습니다.

로그인 화면은 요청마다 계정 유무를 확인합니다. 계정이 없는 상태에서 프로덕션 빌드를 하더라도, 첫 관리자 생성 후에는 로그인 화면으로 정상 이동합니다.

이름과 실제 이메일은 수집하지 않습니다. Better Auth의 필수 내부 필드에는 아이디와 임의의 `@ask.invalid` 값을 저장합니다. 이메일 로그인 및 HTTP 계정 정보 변경 API는 차단합니다.

초기 마이그레이션 `init`에 아이디 컬럼과 고유 인덱스, 질문자 IP 컬럼까지 포함되어 있습니다. 새 DB는 이 마이그레이션 하나로 생성합니다.

- 질문 작성·공개 답변: <http://localhost:3000>
- 관리자 받은편지함: <http://localhost:3000/admin>
- 첫 관리자 설정(계정이 없을 때만): <http://localhost:3000/setup>
- 관리자 로그인: <http://localhost:3000/admin/login>
- 관리자 계정·비밀번호 변경: <http://localhost:3000/admin/account>
- 상태 확인: <http://localhost:3000/api/health>

`npm run dev`와 `npm start`는 `.env`의 `PORT`로 서버 포트를 지정합니다. 설정하지 않으면 기본값은 `3000`입니다. 예를 들어 4000번 포트를 사용하려면 다음과 같이 설정한 뒤 서버를 재시작하세요.

```dotenv
PORT="4000"
BETTER_AUTH_URL="http://localhost:4000"
```

셸에서 지정한 `PORT`가 `.env`보다 우선하며, 개발 서버는 `npm run dev -- --port 5000`으로 포트를 지정할 수도 있습니다. 포트를 변경하면 `BETTER_AUTH_URL`도 실제 접속 주소와 맞추세요. `localhost`와 `127.0.0.1`은 서로 다른 origin입니다.

## Cloudflare Turnstile

[Cloudflare 대시보드](https://dash.cloudflare.com/)의 Turnstile에서 Managed 위젯을 만들고 서비스 도메인을 허용한 뒤, 발급받은 두 키를 `.env`에 설정하세요.

```dotenv
TURNSTILE_SITE_KEY="발급받은 사이트 키"
TURNSTILE_SECRET_KEY="발급받은 비밀 키"
```

앱을 재시작하면 질문창에 보안 확인이 표시됩니다. Compose에서는 `docker compose up -d --force-recreate app`으로 환경 변수를 반영합니다. 사이트 키는 서버에서 실행 시 읽어 화면에 전달하므로 키 변경만으로 이미지를 다시 빌드할 필요는 없습니다. 비밀 키는 서버에서만 사용합니다.

두 키를 모두 비워 두면 Turnstile을 사용하지 않습니다. 한쪽 키만 설정했거나 Cloudflare 검증에 실패하면 질문을 저장하지 않습니다. 서버는 제출마다 Siteverify API로 토큰과 `question` action을 검증하며, 만료되거나 이미 사용한 토큰은 거절합니다. 제출 후에는 성공 여부와 관계없이 새 토큰을 받습니다. 기존 허니팟과 요청 횟수 제한도 함께 적용합니다.

로컬 UI 확인에는 [Cloudflare 공식 테스트 키](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)를 사용할 수 있습니다. 테스트 키는 실제 스팸을 차단하지 않으므로 공개 서비스에는 발급받은 키를 사용하세요.

## 명령어

| 명령                                       | 용도                                                         |
| ------------------------------------------ | ------------------------------------------------------------ |
| `npm run dev`                              | 개발 서버                                                    |
| `npm run build`                            | Prisma Client 생성, 프로덕션 빌드, standalone 정적 파일 복사 |
| `npm start`                                | standalone 프로덕션 서버                                     |
| `npm run lint` / `npm run lint:fix`        | ESLint 검사 / 자동 수정                                      |
| `npm run format` / `npm run format:check`  | Prettier 포맷팅 / 검사                                       |
| `npm run typecheck`                        | Next.js 라우트 타입 생성과 TypeScript 검사                   |
| `npm run check`                            | 린트·포맷·타입 검사                                          |
| `npm test`                                 | 입력 검증·공개 조건·요청 제한 테스트                         |
| `npm run test:smoke`                       | 빌드된 서버와 임시 DB를 사용하는 HTTP 통합 테스트            |
| `npm run db:generate`                      | Prisma Client 생성                                           |
| `npm run db:migrate -- --name change_name` | 개발용 마이그레이션 생성·적용                                |
| `npm run db:deploy`                        | 저장된 마이그레이션 적용, WAL 설정                           |
| `npm run db:studio`                        | Prisma Studio                                                |
| `npm run db:backup`                        | 실행 중인 SQLite의 일관된 백업 생성                          |

ESLint는 코드 오류와 Next.js·TypeScript 규칙을 검사합니다. 포맷은 Prettier가 담당하며 `eslint-config-prettier`를 마지막에 적용해 충돌하는 스타일 규칙을 끕니다. Prettier를 ESLint 규칙으로 실행하지 않습니다. VS Code의 저장 시 포맷팅·ESLint 수정 설정도 포함했습니다.

검증 순서는 다음과 같습니다. 통합 테스트는 임시 디렉터리에 별도 DB와 관리자 계정을 만들며 로컬 개발 DB를 변경하지 않습니다.

```bash
npm run check
npm test
npm run build
npm run test:smoke
```

## GitHub Actions CI와 GHCR 이미지 배포

`.github/workflows/ci.yml`은 `develop`으로의 push와 `develop`을 대상으로 하는 PR 생성·업데이트·재오픈 시 실행됩니다. `main`·다른 브랜치로의 push나 해당 브랜치를 대상으로 하는 PR, 태그 push, 수동 실행은 트리거에 포함하지 않습니다. 같은 브랜치나 PR에 새 실행이 시작되면 진행 중인 이전 실행은 취소합니다.

Ubuntu runner에서 `.nvmrc`의 Node.js 24를 사용하며, 다음 순서로 검증합니다.

1. `npm ci`로 lockfile에 맞춰 의존성을 설치합니다. npm 다운로드 캐시는 `package-lock.json`을 기준으로 재사용합니다.
2. `npm run db:generate`로 Git에서 제외된 Prisma Client를 생성합니다.
3. `npm run db:deploy`로 CI 전용 SQLite DB에 저장된 마이그레이션을 적용하고 WAL 설정을 검증합니다.
4. `npm run check`로 린트·포맷·타입을 검사합니다.
5. `npm test`로 단위 테스트를 실행합니다.
6. `npm run build`로 standalone 프로덕션 빌드와 정적 파일 복사를 검증합니다.
7. `npm run test:smoke`로 별도의 임시 SQLite DB에 마이그레이션을 적용하고, 빌드한 서버의 초기 관리자 설정·로그인·질문 처리·비밀번호 변경을 검증합니다.

CI 환경 변수는 workflow 안의 테스트 전용 값으로 설정하므로 저장소 Secrets나 운영 `.env`가 필요하지 않습니다. 통합 테스트는 별도의 임시 DB·인증 비밀키·포트를 생성하고 종료 시 DB와 서버를 정리합니다. workflow의 고정 비밀키는 운영 환경에서 사용하지 마세요.

CI가 통과하면 Dockerfile의 `runner`와 `tools` 대상을 각각 빌드해 GHCR에 배포합니다. [b1nknet/ask](https://github.com/b1nknet/ask) 저장소에서 앱 이미지는 `ghcr.io/b1nknet/ask:latest`, 마이그레이션·백업 도구 이미지는 `ghcr.io/b1nknet/ask-tools:latest`로 배포됩니다. workflow는 GitHub 저장소 이름을 자동으로 사용합니다. 현재 빌드 플랫폼은 `linux/amd64`입니다.

| 실행 조건                           | 이미지 태그          | GHCR 배포       |
| ----------------------------------- | -------------------- | --------------- |
| `develop` push                      | `latest`             | CI 통과 후 배포 |
| 같은 저장소에서 `develop` 대상 PR   | `latest`             | CI 통과 후 배포 |
| 포크·Dependabot의 `develop` 대상 PR | `latest`로 빌드 검증 | 배포 생략       |

PR 이미지는 GitHub가 생성한 테스트 병합 커밋을 빌드합니다. 앱과 도구 이미지의 태그는 모두 `latest`로 통일하며, `develop` push와 같은 저장소의 PR 배포가 동일한 `latest` 태그를 갱신합니다. BuildKit 캐시는 대상별로 분리해 재사용합니다.

[GitHub 공식 GHCR 배포 방식](https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions)에 따라 자동 발급되는 `GITHUB_TOKEN`으로 로그인하며, 이미지 작업에만 `packages: write`를 부여합니다. 별도의 PAT나 저장소 Secrets, `.env` 레지스트리 설정은 필요하지 않습니다. 기존 패키지에 배포하는 경우 패키지 설정의 **Manage Actions access**에서 이 저장소에 쓰기 권한을 허용해야 합니다. 포크·Dependabot PR은 읽기 전용 토큰을 사용하므로 로그인과 push를 생략하고 CI와 이미지 빌드만 검증합니다.

배포한 이미지는 다음과 같이 받을 수 있습니다. 비공개 패키지는 먼저 GHCR에 로그인해야 합니다.

```bash
docker pull ghcr.io/b1nknet/ask:latest
docker pull ghcr.io/b1nknet/ask-tools:latest
```

`compose.yaml`은 위 GHCR 이미지를 기본으로 사용합니다. `docker compose pull`과 `docker compose up -d --no-build`로 반영합니다. GHCR 업로드는 실행 중인 서버의 컨테이너를 자동 교체하지 않습니다. 소스에서 직접 빌드하려면 아래 로컬 빌드 절차를 사용하세요.

브랜치 보호 규칙에서 `CI`를 필수 상태 검사로 지정하면 CI 통과를 병합 조건으로 설정할 수 있습니다. workflow가 GitHub 저장소에 반영되어야 GitHub Actions가 실행됩니다.

## 디렉터리

```text
.github/workflows/       GitHub Actions CI와 GHCR 이미지 배포
compose.yaml             GHCR 이미지로 서버 실행
compose.build.yaml       소스에서 직접 빌드하는 Compose override
src/app/                 공개 화면·관리자 화면·API
src/components/          질문 작성·로그인·답변 편집 UI
src/lib/                 인증·DB·검증·요청 제한
src/generated/prisma/    생성된 Prisma Client (Git 제외)
prisma/schema.prisma     질문·인증 모델
prisma/migrations/       버전 관리하는 DB 마이그레이션
scripts/                 초기화·관리자 생성·백업·실행
tests/                   단위·HTTP 통합 테스트
data/                    SQLite 파일과 WAL (Git 제외)
```

## 동작

- 질문은 기본 `PENDING`이며 내용과 확인 가능한 질문자 IP를 저장합니다. 질문자 계정은 만들지 않습니다.
- 질문자 IP는 로그인한 관리자의 질문 카드(받은 질문·공개 답변·보관함)에만 표시합니다. 메인 화면의 공개 답변과 질문 제출 응답에는 IP를 포함하지 않습니다. 기존 질문이나 IP를 확인할 수 없는 질문은 `확인 불가`로 표시합니다.
- 관리자는 답변을 작성하고 `PENDING`·`PUBLISHED`·`ARCHIVED` 중 하나로 저장합니다.
- 답변이 있는 `PUBLISHED` 질문만 공개 화면에 표시됩니다. 비공개 전환 시 즉시 목록에서 빠집니다.
- 첫 계정은 계정이 없는 상태에서 웹 초기 설정으로 만들며, 추가 계정은 관리자 생성 명령으로 만듭니다. 모든 계정이 관리자입니다. 관리자 화면과 변경 API는 매번 유효한 세션을 검증합니다.
- 관리자 화면의 `계정`에서 현재 비밀번호와 새 비밀번호·확인을 입력해 비밀번호를 변경합니다. 현재 기기의 로그인은 유지하고, 같은 계정의 다른 기기는 로그아웃합니다.
- 질문은 1,000자, 답변은 5,000자까지이며 API에서도 검증합니다. 요청 본문은 16 KiB까지입니다.
- 질문 제출에는 허니팟과 1분에 5회 제한을 적용하며, 키를 설정하면 Cloudflare Turnstile 검증도 수행합니다. 변경 API는 같은 origin의 요청만 받습니다.

질문자의 IP는 질문과 함께 DB에 보관하며 질문을 영구 삭제하면 함께 삭제합니다. 질문자의 User-Agent는 질문 DB에 저장하지 않습니다. 요청 제한은 HMAC 처리한 IP 기반 키를 메모리에만 보관하며 만료된 키는 다음 요청 때 정리합니다. 관리자 로그인 세션에는 Better Auth의 IP·User-Agent 메타데이터가 들어갈 수 있습니다.

`TRUST_PROXY`는 직접 실행과 Compose 모두 기본값이 `false`입니다. 이때 헤더를 신뢰하지 않아 IP를 저장하지 않고 모든 질문을 하나의 제한 버킷으로 처리합니다. 신뢰할 수 있는 프록시가 `X-Real-IP`를 실제 접속 IP로 덮어쓰고 앱에 해당 프록시를 통해서만 접근할 수 있도록 제한한 경우에만 `.env`에서 `TRUST_PROXY=true`로 설정하세요. 이때 유효한 단일 IPv4·IPv6 주소만 저장하며, 헤더가 없거나 잘못된 값이면 IP는 비워 둡니다. `X-Forwarded-For`와 요청 본문의 IP 값은 사용하지 않습니다.

## Docker Compose 셀프호스팅

Docker와 Compose 플러그인이 필요합니다. 기본 구성은 GHCR의 `latest` 이미지를 사용하므로 서버에 Node.js나 npm을 설치할 필요가 없습니다. 현재 제공하는 이미지 플랫폼은 `linux/amd64`입니다. 애플리케이션은 한 개 인스턴스로 실행하며 SQLite는 서버의 로컬 디스크에 둡니다.

먼저 GitHub Actions에서 앱·도구 이미지 배포가 모두 성공했는지 확인하세요. 서버에서는 저장소를 받거나 `compose.yaml`과 `.env.example`만 같은 디렉터리에 준비해도 됩니다.

```bash
git clone --branch develop https://github.com/b1nknet/ask.git
cd ask
cp .env.example .env
```

기존 `.env`가 있다면 복사하지 않고 그대로 사용하세요. `.env`의 `BETTER_AUTH_SECRET`은 `openssl rand -hex 32` 등으로 만든 임의의 값으로 설정합니다. Docker 빌드에는 `.env`와 실제 DB가 포함되지 않습니다.

Compose는 앱의 HTTP 포트를 호스트에 직접 공개합니다. 기본 접속 주소는 `http://localhost:3000`이며, `.env`의 `PUBLIC_URL`도 이 주소를 사용합니다. 공개 배포 시에는 도메인과 HTTPS를 별도로 설정하고 브라우저에서 접속하는 주소를 지정하세요.

```dotenv
PUBLIC_URL="https://ask.example.com"
```

`PUBLIC_URL`은 컨테이너 안의 `BETTER_AUTH_URL`로 전달됩니다. 호스트 개발용 `BETTER_AUTH_URL=http://localhost:3000`과 따로 관리합니다. 프록시를 사용할 때는 앱의 HTTP 포트로 요청을 전달하고, `TRUST_PROXY=true`를 설정한다면 앱 포트에 대한 직접 접근을 방화벽이나 Docker 네트워크로 제한하세요.

앱과 도구 컨테이너는 UID/GID 1000으로 실행합니다. 먼저 데이터 디렉터리를 만들고 해당 사용자의 쓰기 권한을 부여하세요.

```bash
mkdir -p data backups
# 디렉터리에 UID/GID 1000의 쓰기 권한이 없다면 실행
sudo chown 1000:1000 data backups
```

GHCR 패키지가 비공개라면 먼저 `docker login ghcr.io`로 인증한 뒤 실행하세요.

```bash
docker compose pull
docker compose up -d --no-build
```

앱이 실행되면 설정한 주소를 브라우저에서 열어 첫 관리자 계정을 생성하세요. 별도의 관리자 생성 명령은 필요하지 않습니다.

`up` 시 도구 이미지로 마이그레이션이 먼저 실행된 뒤 앱이 시작되며, `/api/health`로 DB 상태를 확인합니다.

```bash
docker compose ps
docker compose logs app
docker compose --profile tools run --rm tools npm run db:backup
```

`.env`의 `PORT`는 앱 컨테이너의 수신 포트와 호스트에 공개할 포트이며 기본값은 `3000`입니다. 예를 들어 `PORT="4000"`으로 설정하면 앱의 수신 포트, 헬스체크, 호스트 포트가 모두 4000번 포트를 사용합니다. 직접 접속한다면 `PUBLIC_URL="http://localhost:4000"`도 함께 설정하세요. 변경 후 `docker compose up -d --force-recreate app`으로 반영합니다. 포트 변경만으로 이미지를 다시 빌드할 필요는 없습니다.

이전 구성에서 업데이트할 때는 `.env`의 `SITE_ADDRESS`, `HTTP_PORT`, `HTTPS_PORT`를 제거하고 `PUBLIC_URL`을 실제 접속 주소로 맞추세요. `docker compose pull` 후 `docker compose up -d --no-build --remove-orphans`를 실행하면 GHCR 이미지로 전환하고 이전 Caddy 컨테이너도 제거합니다. 인증서가 저장된 기존 Docker 볼륨은 자동으로 삭제하지 않습니다.

이후 이미지 업데이트도 다음 명령으로 반영합니다. 적용 전 백업을 권합니다. 마이그레이션 도구는 별도 `tools` 이미지에 두고, 앱 실행 이미지는 Next.js standalone 결과물만 포함합니다.

```bash
docker compose pull
docker compose up -d --no-build
```

소스를 직접 수정해 빌드하려면 저장소 전체를 준비하고 [Compose 파일 병합](https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/)으로 `compose.build.yaml`을 추가하세요. 로컬 빌드는 `ask-app:latest`·`ask-tools:latest`를 사용합니다.

```bash
docker compose -f compose.yaml -f compose.build.yaml up -d --build
# 로컬에서 빌드한 도구 이미지로 백업
docker compose -f compose.yaml -f compose.build.yaml --profile tools run --rm tools npm run db:backup
```

로컬 빌드 구성으로 운영할 때는 이후 Compose 명령에도 두 `-f` 옵션을 함께 지정하세요.

## 백업과 복원

```bash
npm run db:backup
# 원하는 경로를 지정할 수도 있습니다.
npm run db:backup -- /path/to/backup.db
```

SQLite Online Backup API를 사용하며 기본 저장 경로는 `backups/`입니다. 백업 파일은 별도 디스크나 보유한 다른 서버에도 보관하세요.

복원할 때는 앱을 중지하고 기존 DB와 `-wal`·`-shm` 파일을 별도 디렉터리로 옮긴 뒤, 백업 DB를 `DATABASE_URL`이 가리키는 위치에 놓습니다. 파일 소유권·권한을 확인하고 마이그레이션 적용 후 재시작하세요. WAL이 활성화된 실행 중 DB를 단순 파일 복사하는 방식은 피하세요.

## 운영 범위

현재 구성은 개인용 단일 서버 초안입니다. 요청 제한은 프로세스 재시작 시 초기화되며 여러 서버 사이에 공유되지 않습니다. 여러 인스턴스와 더 강한 스팸 대응이 필요해지면 PostgreSQL, 공유 요청 제한 저장소, 셀프호스팅 가능한 CAPTCHA 등을 검토하면 됩니다.
