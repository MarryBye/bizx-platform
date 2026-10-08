import reactConfig from '@bizx/eslint-config/react';

export default [
  ...reactConfig,
  {
    ignores: [
      '.expo/**',
      'android/**',
      'ios/**',
      'metro.config.js',
      'tailwind.config.js',
      'babel.config.js'
    ]
  }
];
