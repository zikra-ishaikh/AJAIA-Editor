import { parseMarkdownToTiptapJson } from '../lib/markdownParser';

describe('Markdown Parser to TipTap JSON', () => {
  test('should parse empty string into a single empty paragraph', () => {
    const result = parseMarkdownToTiptapJson('');
    expect(result).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }]
    });
  });

  test('should parse simple text into a paragraph', () => {
    const result = parseMarkdownToTiptapJson('Hello World');
    expect(result).toEqual({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello World' }]
        }
      ]
    });
  });

  test('should parse headings', () => {
    const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Heading 1' }]
      },
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Heading 2' }]
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Heading 3' }]
      }
    ]);
  });

  test('should parse blockquotes', () => {
    const markdown = '> This is a quote';
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'This is a quote' }]
          }
        ]
      }
    ]);
  });

  test('should parse bullet lists', () => {
    const markdown = '- Item 1\n- Item 2';
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item 1' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Item 2' }]
              }
            ]
          }
        ]
      }
    ]);
  });

  test('should parse ordered lists', () => {
    const markdown = '1. First Item\n2. Second Item';
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'orderedList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'First Item' }]
              }
            ]
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Second Item' }]
              }
            ]
          }
        ]
      }
    ]);
  });

  test('should parse code blocks', () => {
    const markdown = '```typescript\nconst a = 1;\nconsole.log(a);\n```';
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'codeBlock',
        attrs: { language: 'typescript' },
        content: [{ type: 'text', text: 'const a = 1;\nconsole.log(a);' }]
      }
    ]);
  });

  test('should parse complex combinations with blank lines correctly', () => {
    const markdown = `# Title\n\nSome introductory text.\n\n- List Item 1\n- List Item 2\n\nBack to standard text.`;
    const result = parseMarkdownToTiptapJson(markdown);

    expect(result.content).toEqual([
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: 'Title' }]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Some introductory text.' }]
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'List Item 1' }] }]
          },
          {
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: 'List Item 2' }] }]
          }
        ]
      },
      {
        type: 'paragraph'
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Back to standard text.' }]
      }
    ]);
  });
});
