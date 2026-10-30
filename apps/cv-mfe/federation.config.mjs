import {
  withNativeFederation,
  fromPackageJson,
} from '@angular-architects/native-federation/config';

export default withNativeFederation({
  name: 'cv-mfe',

  exposes: {
    './web-components': './apps/cv-mfe/src/web-components.ts',
  },

  //shareScope: autoShareScope({level: 'minor'}),

  shared: fromPackageJson({
    singleton: true,
    strictVersion: true,
    requiredVersion: 'auto',
    build: 'package',
  })
    .patch(['@angular/*'], { includeSecondaries: { keepAll: true } })
    .get(),

  //sharedMappings: mappingsFromWorkspace({ singleton: true }).filter(['@my-org/*']).get(),

  skip: ['rxjs/ajax', 'rxjs/fetch', 'rxjs/testing', 'rxjs/webSocket'],

  // Please read our docs about configuring native federation:
  // https://native-federation.com/docs/v4/angular-adapter/configuration/

  features: {
    ignoreUnusedDeps: true,
    denseChunking: true,
    denseExternals: true,
    strictImports: false,
  },
});
