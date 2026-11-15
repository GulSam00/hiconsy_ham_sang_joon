export const HEALTH_STATUS = {
  OK: 'ok',
} as const;

export type HealthStatus = (typeof HEALTH_STATUS)[keyof typeof HEALTH_STATUS];

/** GET /api/health 응답 */
export interface HealthResponse {
  status: HealthStatus;
  /** 서버 기준 현재 시각 (ISO 8601, UTC) */
  timestamp: string;
}
