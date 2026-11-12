import { ComponentFixture, TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let element: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
    fixture = TestBed.createComponent(App);
    element = fixture.nativeElement;
  });

  it('should create', () => {
    // Arrange: done in beforeEach

    // Act
    const app = fixture.componentInstance;

    // Assert
    expect(app).toBeTruthy();
  });

  it('renders an empty code block and the router outlet by default', async () => {
    // Arrange: no inputs

    // Act
    await fixture.whenStable();

    // Assert
    expect(element.querySelector('app-code-block code')?.textContent).toBe('');
    expect(element.querySelector('.code-block-gutter')).not.toBeNull();
    expect(element.querySelector('.code-block-copy')).not.toBeNull();
    expect(element.querySelector('router-outlet')).not.toBeNull();
  });

  it('passes the snippet and language to the code block', async () => {
    // Arrange
    fixture.componentRef.setInput('snippet', '<p>hi</p>');
    fixture.componentRef.setInput('language', 'html');

    // Act
    await fixture.whenStable();

    // Assert
    const code = element.querySelector('app-code-block code');
    expect(code?.textContent).toBe('<p>hi</p>');
    expect(code?.querySelector('.hljs-name')?.textContent).toBe('p');
  });

  it.each([false, 'false'])(
    'hides line numbers and the copy button when set to %j',
    async (value) => {
      // Arrange
      fixture.componentRef.setInput('snippet', 'a();');
      fixture.componentRef.setInput('lineNumbers', value);
      fixture.componentRef.setInput('copyable', value);

      // Act
      await fixture.whenStable();

      // Assert
      expect(element.querySelector('.code-block-gutter')).toBeNull();
      expect(element.querySelector('.code-block-copy')).toBeNull();
    }
  );
});
