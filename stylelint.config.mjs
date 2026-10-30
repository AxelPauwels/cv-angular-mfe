/** @type {import('stylelint').Config} */
export default {
  extends: ['stylelint-config-standard-scss'],
  plugins: ['stylelint-order'],
  rules: {
    'order/properties-alphabetical-order': true,
    // Formatting is Prettier's job: it breaks long expressions after operators
    'scss/operator-no-newline-after': null,
    // Flags valid shorthands like `font: 1rem/1.5rem` as unspaced division
    'scss/operator-no-unspaced': null,
    // Allow blank lines to group related variables
    'scss/dollar-variable-empty-line-before': null,
  },
  ignoreFiles: [
    'dist/**',
    'coverage/**',
  ],
};
