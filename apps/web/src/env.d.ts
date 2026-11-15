/**
 * vue-tsc는 .vue 파일을 직접 해석하지만, typescript-eslint의 타입 정보는 일반 tsc 기반이라
 * .vue import를 해석하지 못한다. 이 선언이 그 경우의 폴백 타입이 된다.
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
