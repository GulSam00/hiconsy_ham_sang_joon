/** e2e·DB 통합 테스트 전용 DB. 개발 DB(dev.db)를 건드리지 않는다. */
export const TEST_DATABASE_FILE_NAME = 'test.db';
export const TEST_DATABASE_URL = `file:./prisma/${TEST_DATABASE_FILE_NAME}`;
