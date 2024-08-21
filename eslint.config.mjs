import globals from 'globals';
import pluginJs from '@eslint/js';
import prettier from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';

export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node, // Поддержка глобальных переменных Node.js
      },
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.env, // Если нужны глобальные переменные окружения
      },
    },
  },
  pluginJs.configs.recommended,
  prettier, // Подключаем конфигурацию Prettier
  {
    plugins: {
      prettier: pluginPrettier, // Подключаем плагин Prettier
    },
    rules: {
      'prettier/prettier': 'error', // Добавляем правило Prettier
    },
  },
];
