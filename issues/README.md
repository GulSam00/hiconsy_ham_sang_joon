# 이슈 목록

작업 규칙은 [CLAUDE.md](../CLAUDE.md) 2절을 따릅니다. 이슈 폴더는 작업을 시작할 때 `_template`을 복사해 만듭니다.

| 번호 | 제목 | 관련 FR | 상태 |
|---|---|---|---|
| 001 | [프로젝트 셋업 (npm workspaces, lint, `packages/shared`)](./001-project-setup/README.md) | - | DONE |
| 002 | [DB 스키마와 시드 (Prisma + SQLite)](./002-db-schema/README.md) | - | DONE |
| 003 | [공통 인프라 (ErrorCode, 예외 필터, Clock, Swagger, 요청자 Guard)](./003-common-infra/README.md) | - | DONE |
| 004 | [자습실 CRUD API (수정·삭제 시 R6~R8 포함)](./004-room-crud-api/README.md) | FR-ROM-01, 02, 04, 05, (선택) FR-ROM-06 | DONE |
| 005 | [학생 API (삭제 시 R9 포함)](./005-student-api/README.md) | FR-STD-01, (선택) FR-STD-02 | DONE |
| 006 | [방문 신청·수정·취소 API와 이력](./006-visit-api/README.md) | FR-VST-01~03, FR-ROM-03 | DONE |
| 007 | [강사 개별 취소 (R11)](./007-teacher-cancel/README.md) | (선택) FR-ROM-06 | DONE |
| 008 | [내 신청 목록 API](./008-my-visits-api/README.md) | (선택) FR-VST-04 | DONE |
| 009 | [프론트엔드 셋업 (Router, Pinia, Vue Query, Tailwind, 역할 전환)](./009-web-setup/README.md) | - | DONE |
| 010 | 강사 화면 (자습실 목록·등록·수정·삭제·상세 이력, 학생 목록) | FR-ROM-*, FR-STD-01 | TODO |
| 011 | 학생 화면 (방문 신청·수정·취소, 내 신청 목록) | FR-VST-* | TODO |
| 012 | 문서화와 클린 환경 실행 검증 (README, docs, docker-compose) | - | TODO |
