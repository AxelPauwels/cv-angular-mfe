import { loadLanguage } from './code-block.languages';

describe('loadLanguage', () => {
  it('loads a grammar by its name', async () => {
    const { name, grammar } = await loadLanguage('typescript');
    expect(name).toBe('typescript');
    expect(grammar).toBeTypeOf('function');
  });

  it('resolves html to the xml grammar', async () => {
    const { name } = await loadLanguage('html');
    expect(name).toBe('xml');
  });
});
