export const HEALTH_STATUS = {
  OK: 'ok',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

export const DATABASE_STATUS = {
  UP: 'up',
} as const;

export type DatabaseStatus = (typeof DATABASE_STATUS)[keyof typeof DATABASE_STATUS];

/**
 * GET /api/health 응답.
 * DB에 연결할 수 없으면 이 형식 대신 503을 반환한다.
 */
export interface HealthResponse {
  status: HealthStatus;
  database: DatabaseStatus;
  /** 서버 기준 현재 시각 (ISO 8601, UTC) */
  timestamp: string;
}
