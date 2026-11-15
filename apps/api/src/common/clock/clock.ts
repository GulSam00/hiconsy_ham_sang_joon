/**
 * 현재 시각 공급자. 도메인 로직은 `new Date()` 대신 이것을 주입받는다 (CLAUDE.md 7절).
 * 인터페이스가 아니라 추상 클래스인 이유: Nest DI 토큰으로 그대로 쓸 수 있다 (인터페이스는 런타임에 사라짐).
 */
export abstract class Clock {
  abstract now(): Date;
}
