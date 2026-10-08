import globals from 'globals';
import { baseConfig } from './base.js';

/**
 * ESLint configuration for Node.js / backend applications and services (Nest.js, etc.).
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const nodeConfig = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      'no-process-exit': 'off',
      // Nest.js relies on constructor type annotations for runtime Dependency Injection metadata
      '@typescript-eslint/consistent-type-imports': 'off'
    }
  }
];

export default nodeConfig;
