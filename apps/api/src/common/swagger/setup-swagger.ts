import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ACTOR_HEADER, ACTOR_ROLE, API_PREFIX } from '@study-room/shared';

export const SWAGGER_PATH = `${API_PREFIX}/docs`;

/** API 문서: /api/docs (UI), /api/docs-json (OpenAPI JSON) */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('자습실 예약 API')
    .setDescription(
      '로그인 대신 요청자 헤더로 역할을 구분합니다. 정책: docs/visit-policy.md\n\n' +
        '- 강사: `X-Actor-Role: TEACHER`\n' +
        '- 학생: `X-Actor-Role: STUDENT` + `X-Student-Id: {학생 id}`',
    )
    .setVersion('0.1.0')
    .addGlobalParameters(
      {
        in: 'header',
        name: ACTOR_HEADER.ROLE,
        required: false,
        schema: { type: 'string', enum: Object.values(ACTOR_ROLE) },
        description: '요청자 역할 (health 외 모든 API에 필요)',
      },
      {
        in: 'header',
        name: ACTOR_HEADER.STUDENT_ID,
        required: false,
        schema: { type: 'integer', minimum: 1 },
        description: '학생 id (역할이 STUDENT일 때 필요)',
      },
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);
}
