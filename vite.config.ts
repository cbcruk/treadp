import stylex from '@stylexjs/unplugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

export default defineConfig({
  // StyleX가 React보다 먼저 변환해야 한다
  plugins: [stylex(), react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
  fmt: {
    singleQuote: true,
    semi: false,
    // tests/fixtures/: 레거시 코드가 생성한 계약 → 손대지 않는다
    ignorePatterns: ['dist/**', 'tests/fixtures/**'],
  },
  lint: {
    ignorePatterns: ['dist/**'],
    plugins: ['react', 'typescript', 'oxc'],
    rules: {
      'react/rules-of-hooks': 'error',
      'react/only-export-components': ['warn', { allowConstantExport: true }],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@astryxdesign/*'],
              message: '디자인 시스템은 src/ui/ 어댑터를 통해서만 사용합니다.',
            },
          ],
        },
      ],
    },
    overrides: [{ files: ['src/ui/**'], rules: { 'no-restricted-imports': 'off' } }],
  },
})
