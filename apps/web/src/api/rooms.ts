import type { RoomResponse } from '@study-room/shared';
import { http } from './client';

/** 등록·수정 요청. 일시는 시간대가 붙은 ISO 문자열이어야 한다 (fromKstInputValue 결과). */
export interface RoomInput {
  title: string;
  maxPersonnel: number;
  startDate: string;
  endDate: string;
}

export async function fetchRooms(): Promise<RoomResponse[]> {
  const { data } = await http().get<RoomResponse[]>('/rooms');
  return data;
}

export async function fetchRoom(id: number): Promise<RoomResponse> {
  const { data } = await http().get<RoomResponse>(`/rooms/${id}`);
  return data;
}

export async function createRoom(input: RoomInput): Promise<RoomResponse> {
  const { data } = await http().post<RoomResponse>('/rooms', input);
  return data;
}

export async function updateRoom(id: number, input: Partial<RoomInput>): Promise<RoomResponse> {
  const { data } = await http().patch<RoomResponse>(`/rooms/${id}`, input);
  return data;
}

export async function deleteRoom(id: number): Promise<void> {
  await http().delete(`/rooms/${id}`);
}
