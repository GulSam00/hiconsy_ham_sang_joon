# Node.js 22.12 이상을 설치하지 않고 실행하기 위한 이미지입니다 (README "Docker로 실행").
# api와 web이 같은 이미지를 쓰고, docker-compose.yml이 서비스별 실행 명령을 정합니다.
#
# 버전 고정 규칙(CLAUDE.md 3절)에 따라 베이스 이미지는 digest로 고정합니다.
# BASE_IMAGE는 사내 프록시 인증서가 들어간 이미지 등으로 바꿔 빌드할 수 있게 열어 둡니다.
ARG BASE_IMAGE=node:22-bookworm-slim@sha256:e9f565d32859f0cbfb52125eafe8be39390f24dac302dc3cdf566e8ba3ab21ee
FROM ${BASE_IMAGE}

WORKDIR /app

# 소스를 먼저 복사한 뒤 설치합니다.
# postinstall(shared 빌드, Prisma Client 생성)이 소스를 필요로 하므로,
# 의존성 레이어 캐시를 위해 설치 스크립트를 끄고 나눠 실행하는 것보다 이쪽이 단순하고 로컬 설치와 같은 경로를 탑니다.
COPY . .
RUN npm ci && npm run build

# DB 파일은 컨테이너가 아니라 볼륨에 둡니다 (docker-compose.yml의 db-data).
ENV DATABASE_URL=file:/data/dev.db
