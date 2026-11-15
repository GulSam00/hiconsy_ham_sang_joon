# 자습실 예약 MVP

하이컨시 과제 전형 **지정 주제 1** (Vue 3 + NestJS).

> 상세 문서(기술 스택 선택 이유, 아키텍처, DB 설계, 고민한 점)는 ISSUE-012에서 작성합니다.
> 현재 작업 규칙은 [CLAUDE.md](./CLAUDE.md), 진행 상황은 [issues/](./issues/README.md)를 참고하세요.

## 실행 방법

요구 사항: **Node.js 22.12 이상** (`.nvmrc` 참고), npm 10 이상

```bash
npm install
```

```bash
npm run dev
```

- 웹: http://localhost:5173
- API: http://localhost:3000/api (상태 확인: `GET /api/health`)

### 검증

```bash
npm run verify
```

포맷, 린트, 타입 검사, 단위 테스트, e2e 테스트를 순서대로 실행합니다.
