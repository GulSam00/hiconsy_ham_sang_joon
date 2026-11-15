import { Clock } from './clock';

/**
 * 테스트용 고정 시각. 경계값(운영 기간 시작·끝 정각, 지난 방문 등)을 재현할 때 쓴다.
 * 호출하는 쪽이 반환값을 바꿔도 내부 시각이 변하지 않도록 매번 복사본을 돌려준다.
 */
export class FixedClock extends Clock {
  private current: Date;

  constructor(initial: Date | string) {
    super();
    this.current = FixedClock.toDate(initial);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  set(next: Date | string): void {
    this.current = FixedClock.toDate(next);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }

  private static toDate(value: Date | string): Date {
    const date = new Date(value instanceof Date ? value.getTime() : value);
    if (Number.isNaN(date.getTime())) {
      throw new Error(`FixedClock: 올바르지 않은 시각입니다: ${String(value)}`);
    }
    return date;
  }
}
