import { CodeBlockLanguage, loadLanguage } from './code-block.languages';

describe('loadLanguage', () => {
  it.each<CodeBlockLanguage>([
    'typescript',
    'javascript',
    'json',
    'xml',
    'css',
    'scss',
    'bash',
    'yaml',
  ])('loads the %s grammar under its own name', async (language) => {
    // Arrange: the language comes from the table

    // Act
    const { name, grammar } = await loadLanguage(language);

    // Assert
    expect(name).toBe(language);
    expect(grammar).toBeTypeOf('function');
  });

  it('resolves html to the xml grammar', async () => {
    // Arrange
    const language: CodeBlockLanguage = 'html';

    // Act
    const { name } = await loadLanguage(language);

    // Assert
    expect(name).toBe('xml');
  });
});
