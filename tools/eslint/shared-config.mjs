// eslint.config.mjs
// import tsParser from '@typescript-eslint/parser';
// import typescriptPlugin from '@typescript-eslint/eslint-plugin';
// import angularPlugin from '@angular-eslint/eslint-plugin';
// import angularTemplate from '@angular-eslint/eslint-plugin-template';
// import prettier from 'eslint-config-prettier';
// import importPlugin from 'eslint-plugin-import';
// import nxPlugin from '@nx/eslint-plugin';
// import unusedImports from 'eslint-plugin-unused-imports';

export const sharedConfig = [
  {
    ignores: [
      '**/*.js',
      '**/*.d.ts',
      '**/*.generated.ts',
      '**/*/generated/types.ts',
    ],
  },
];
