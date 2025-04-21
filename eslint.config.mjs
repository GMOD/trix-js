import eslint from '@eslint/js'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import importPlugin from 'eslint-plugin-import'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['esm/**/*', 'dist/**/*', '*.js', '*.mjs', 'example/*'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.lint.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  importPlugin.flatConfigs.recommended,
  eslintPluginUnicorn.configs['flat/recommended'],
  {
    rules: {
      'no-underscore-dangle': 0,
      curly: 'error',
      'no-plusplus': 0,
      'unicorn/numeric-separators-style': 0,
      'unicorn/prefer-node-protocol': 0,
      'unicorn/no-useless-undefined': 0,
      'unicorn/prevent-abbreviations': 0,
      'unicorn/prefer-spread': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/ban-ts-comment': 0,
      'unicorn/expiring-todo-comments': 0,
      semi: ['error', 'never'],

      'import/no-unresolved': 'off',
      'import/order': [
        'error',
        {
          named: true,
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
          },
          groups: [
            'builtin',
            ['external', 'internal'],
            ['parent', 'sibling', 'index', 'object'],
            'type',
          ],
          pathGroups: [
            {
              group: 'builtin',
              pattern: 'react',
              position: 'before',
            },
            {
              group: 'external',
              pattern: '@mui/icons-material',
              position: 'after',
            },
          ],

          pathGroupsExcludedImportTypes: ['react'],
        },
      ],
    },
  },
)
