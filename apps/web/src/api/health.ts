import type { HealthResponse } from '@study-room/shared';
import { http } from './client';

export async function fetchHealth(): Promise<HealthResponse> {
  const { data } = await http().get<HealthResponse>('/health');
  return data;
}
