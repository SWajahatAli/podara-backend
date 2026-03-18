import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import prettierPlugin from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

// ─────────────────────────────────────────────────────────────
// Podara — ESLint Flat Config
// Stack: TypeScript + Fastify + Node.js ESM
// Standard: Airbnb-inspired, production-grade, Prettier-aligned
// ─────────────────────────────────────────────────────────────

export default [
  // ── Global Ignores ─────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'generated/**', // Prisma generated client
      'coverage/**',
      '*.js', // root-level JS config files (this file excluded via flat config)
      'prisma/migrations/**',
    ],
  },

  // ── Base JS Rules ──────────────────────────────────────────
  js.configs.recommended,

  // ── TypeScript Source Files ────────────────────────────────
  {
    files: ['src/**/*.ts'],

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 2022,
        sourceType: 'module',
      },
      globals: {
        // Node.js globals
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
      },
    },

    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },

    rules: {
      // ── Prettier (must be last — overrides formatting rules) ──
      'prettier/prettier': 'error',

      // ── TypeScript — Type Safety ───────────────────────────
      '@typescript-eslint/no-explicit-any': 'error', // no any — use unknown or proper types
      '@typescript-eslint/no-unsafe-assignment': 'error', // no assigning untyped values
      '@typescript-eslint/no-unsafe-member-access': 'error', // no accessing props on untyped values
      '@typescript-eslint/no-unsafe-call': 'error', // no calling untyped functions
      '@typescript-eslint/no-unsafe-return': 'error', // no returning untyped values
      '@typescript-eslint/no-unsafe-argument': 'error', // no passing untyped args
      '@typescript-eslint/explicit-function-return-type': 'off', // inferred return types are fine
      '@typescript-eslint/explicit-module-boundary-types': 'off', // inferred boundaries are fine
      '@typescript-eslint/no-inferrable-types': 'error', // no `const x: string = 'hello'`
      '@typescript-eslint/consistent-type-imports': [
        // enforce `import type`
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/consistent-type-exports': [
        // enforce `export type`
        'error',
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],

      // ── TypeScript — Code Quality ──────────────────────────
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_', // allow _unused convention
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error', // all promises must be awaited or handled
      '@typescript-eslint/await-thenable': 'error', // no awaiting non-promises
      '@typescript-eslint/require-await': 'error', // no async functions without await
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } }, // allow async Fastify handlers
      ],
      '@typescript-eslint/prefer-nullish-coalescing': 'error', // prefer ?? over ||
      '@typescript-eslint/prefer-optional-chain': 'error', // prefer a?.b over a && a.b
      '@typescript-eslint/no-non-null-assertion': 'warn', // warn on ! — use proper guards
      '@typescript-eslint/no-unnecessary-condition': 'warn', // warn on always-true/false conditions
      '@typescript-eslint/switch-exhaustiveness-check': 'error', // exhaustive switch on union types
      '@typescript-eslint/no-shadow': 'error', // no variable shadowing
      '@typescript-eslint/naming-convention': [
        'error',
        // Interfaces: PascalCase, no I prefix
        {
          selector: 'interface',
          format: ['PascalCase'],
          custom: { regex: '^(?!I[A-Z])', match: true },
        },
        // Type aliases: PascalCase
        { selector: 'typeAlias', format: ['PascalCase'] },
        // Enums: PascalCase
        { selector: 'enum', format: ['PascalCase'] },
        // Enum members: UPPER_CASE
        { selector: 'enumMember', format: ['UPPER_CASE'] },
        // Variables: camelCase or UPPER_CASE for constants
        { selector: 'variable', format: ['camelCase', 'UPPER_CASE', 'PascalCase'] },
        // Functions: camelCase
        { selector: 'function', format: ['camelCase', 'PascalCase'] },
        // Parameters: camelCase, allow leading underscore
        { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Class members: camelCase
        { selector: 'classProperty', format: ['camelCase'], leadingUnderscore: 'allow' },
        // Class methods: camelCase
        { selector: 'classMethod', format: ['camelCase'] },
      ],

      // ── General JavaScript Quality ─────────────────────────
      'no-console': ['warn', { allow: ['warn', 'error'] }], // use fastify.log, not console.log
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error', // always const/let
      'prefer-const': 'error', // prefer const where possible
      'prefer-rest-params': 'error', // no arguments object
      'prefer-spread': 'error', // prefer spread over apply
      'prefer-template': 'error', // prefer template literals
      'object-shorthand': 'error', // { foo } not { foo: foo }
      'no-return-await': 'off', // handled by @typescript-eslint
      eqeqeq: ['error', 'always'], // always === never ==
      'no-throw-literal': 'error', // only throw Error instances
      'no-duplicate-imports': 'error',
      'no-useless-constructor': 'error',
      'no-useless-rename': 'error',
      'no-useless-return': 'error',
      'no-param-reassign': [
        'error',
        {
          props: true,
          ignorePropertyModificationsFor: [
            'request', // Fastify request augmentation is intentional
            'reply', // Fastify reply augmentation is intentional
            'acc', // array reducer accumulator
          ],
        },
      ],
      'spaced-comment': ['error', 'always', { markers: ['/'] }], // consistent comment spacing
      curly: ['error', 'all'], // always use braces
      'default-case': 'error', // switch must have default
      'dot-notation': 'error', // prefer obj.foo over obj['foo']
      radix: 'error', // always pass radix to parseInt
      yoda: 'error', // no yoda conditions

      // ── Import / Module ────────────────────────────────────
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../../generated/*', '../../../../generated/*'],
              message: 'Import Prisma types from @/shared/types instead of generated/ directly.',
            },
          ],
        },
      ],
    },
  },

  // ── Relaxed Rules for Config Files ────────────────────────
  {
    files: ['*.config.ts', 'prisma.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      'no-console': 'off',
    },
  },

  // ── Prettier Config (disables conflicting rules) ───────────
  prettierConfig,
]
