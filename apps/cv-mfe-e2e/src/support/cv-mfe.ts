import { Locator, Page } from '@playwright/test';

/** Attributes of <cv-mfe>: the App inputs in kebab-case. */
export type CvMfeAttributes = Partial<{
  snippet: string;
  language: string;
  'line-numbers': string;
  copyable: string;
}>;

/**
 * Mounts the remote the way a host does: loads the federated
 * `./web-components` module (which registers <cv-mfe>) and adds the element
 * with the given attributes. Returns a locator for the element.
 */
export async function mountCvMfe(
  page: Page,
  attributes: CvMfeAttributes = {}
): Promise<Locator> {
  await page.goto('/');
  // main.ts writes the import map in initFederation and only then bootstraps
  // the app, so a rendered <app-root> means the remote's chunks can resolve.
  await page.locator('app-root app-code-block').waitFor({ state: 'attached' });
  await page.evaluate(async (attrs) => {
    const entry = await fetch('remoteEntry.json').then((r) => r.json());
    const exposed = (
      entry.exposes as { key: string; outFileName: string }[]
    ).find((e) => e.key === './web-components');
    if (!exposed) throw new Error('./web-components is not exposed');

    // es-module-shims resolves the shared Angular packages via the import map
    const { importShim } = window as unknown as {
      importShim: (url: string) => Promise<unknown>;
    };
    await importShim(new URL(exposed.outFileName, document.baseURI).href);
    await customElements.whenDefined('cv-mfe');

    const element = document.createElement('cv-mfe');
    for (const [name, value] of Object.entries(attrs)) {
      element.setAttribute(name, value);
    }
    document.body.append(element);
  }, attributes);
  return page.locator('cv-mfe');
}
