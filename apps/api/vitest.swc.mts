import swc from 'unplugin-swc';

/**
 * Vitest는 esbuild로 TS를 변환하는데, esbuild는 데코레이터 메타데이터를 만들지 않는다.
 * Nest DI는 이 메타데이터로 생성자 주입 타입을 알아내므로 SWC로 변환한다.
 * 단위·e2e 설정이 같은 변환을 쓰도록 한 곳에 둔다.
 */
export const swcPlugin = swc.vite({
  module: { type: 'es6' },
  jsc: {
    parser: { syntax: 'typescript', decorators: true },
    transform: { legacyDecorator: true, decoratorMetadata: true },
  },
});
