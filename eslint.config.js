import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import jsdoc from 'eslint-plugin-jsdoc'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['dist/', 'node_modules/'] },

  js.configs.recommended,
  tseslint.configs.recommended,
  jsdoc.configs['flat/recommended-typescript-error'],

  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      // Toda função, método e classe do projeto tem JSDoc (inclusive métodos em arrow function)
      'jsdoc/require-jsdoc': [
        'error',
        {
          require: {
            FunctionDeclaration: true,
            MethodDefinition: true,
            ClassDeclaration: true,
          },
          contexts: ['PropertyDefinition > ArrowFunctionExpression'],
        },
      ],
      // Getters descrevem o valor na própria descrição
      'jsdoc/require-returns': ['error', { checkGetters: false }],
      // Descrição não precisa terminar em ponto nem ter hífen antes dela
      'jsdoc/require-hyphen-before-param-description': 'off',
      'jsdoc/tag-lines': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    // Nos testes, callbacks de describe/it dispensam JSDoc
    files: ['src/**/*.test.ts'],
    rules: {
      'jsdoc/require-jsdoc': 'off',
    },
  },

  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: globals.node },
  },

  // Deixa a formatação só com o Prettier
  prettier,
)
