/**
 * 지난 방문 판정 (R5). 신청·수정·취소·삭제 처리가 모두 이 기준 하나를 쓴다.
 * `visitAt === now`는 지난 방문이 아니다 (R4의 `visitAt ≥ now`와 경계가 맞물린다).
 */
export function isPastVisit(visitAt: Date, now: Date): boolean {
  return visitAt.getTime() < now.getTime();
}
