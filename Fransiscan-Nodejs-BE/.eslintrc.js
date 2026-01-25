module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'standard'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'object-shorthand': 'error',
    'prefer-template': 'error',
    'template-curly-spacing': 'error',
    'arrow-spacing': 'error',
    'comma-dangle': ['error', 'never'],
    'semi': ['error', 'always'],
    'quotes': ['error', 'single'],
    'indent': ['error', 2],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    'no-multiple-empty-lines': ['error', { 'max': 1 }],
    'space-before-function-paren': ['error', 'never'],
    'keyword-spacing': 'error',
    'space-infix-ops': 'error',
    'comma-spacing': 'error',
    'brace-style': 'error',
    'camelcase': 'error',
    'new-cap': 'error',
    'no-new': 'error',
    'no-array-constructor': 'error',
    'no-new-object': 'error',
    'no-duplicate-imports': 'error',
    'no-useless-rename': 'error',
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'computed-property-spacing': ['error', 'never'],
    'space-in-parens': ['error', 'never'],
    'space-before-blocks': 'error',
    'key-spacing': 'error',
    'space-in-brackets': 'off'
  },
  globals: {
    process: 'readonly'
  }
}
