import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier/flat';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**',
      'apps/api/src/prisma/contract.d.ts',
    ],
  },
  {
    files: [
      'packages/ui/src/**/*.ts',
      'packages/ui/src/**/*.tsx',
      'apps/api/src/**/*.ts',
      'apps/api/tests/**/*.ts',
      'apps/api/prisma.config.ts',
      'apps/web/src/**/*.ts',
      'apps/web/src/**/*.tsx',
      'apps/dashboard/src/**/*.ts',
      'apps/dashboard/src/**/*.tsx',
    ],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      prettierConfig,
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { args: 'all', argsIgnorePattern: '^_' },
      ],
    },
  },
);
