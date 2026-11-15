// @ts-check
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import vue from 'eslint-plugin-vue';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      '**/*.d.ts',
      // prisma generate 결과물
      'apps/api/src/generated/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...vue.configs['flat/recommended'],

  {
    languageOptions: {
      parserOptions: {
        // 각 파일에 가장 가까운 tsconfig를 자동으로 찾아 타입 정보를 사용한다.
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
      globals: globals.browser,
    },
  },

  {
    files: ['apps/api/**/*.ts', '*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },

  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Nest DI는 생성자 파라미터의 "값" import에서 메타데이터를 읽는다.
    // type-only import로 바꾸면 런타임에 주입 대상이 사라지므로 api에서는 자동 변환을 끈다.
    files: ['apps/api/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },

  {
    // 시드는 CLI에서 실행하는 스크립트라 진행 상황을 표준 출력으로 알린다.
    files: ['apps/api/prisma/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    // 설정 파일은 어떤 tsconfig에도 속하지 않으므로 타입 기반 규칙을 끈다.
    files: ['eslint.config.mjs'],
    ...tseslint.configs.disableTypeChecked,
  },

  prettier,
);
