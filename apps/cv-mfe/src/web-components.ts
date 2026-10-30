import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Exposed via federation: registers the remote as the <cv-mfe> custom element
// so a host can render it without sharing an Angular application instance.
(async () => {
  if (customElements.get('cv-mfe')) {
    return;
  }

  const app = await createApplication(appConfig);
  const element = createCustomElement(App, { injector: app.injector });
  customElements.define('cv-mfe', element);
})();
