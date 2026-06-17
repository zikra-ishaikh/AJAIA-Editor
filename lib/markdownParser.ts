export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export interface TiptapDoc {
  type: 'doc';
  content: TiptapNode[];
}

/**
 * Converts a raw text/markdown string into a valid TipTap JSON format.
 */
export function parseMarkdownToTiptapJson(markdown: string): TiptapDoc {
  if (!markdown) {
    return {
      type: 'doc',
      content: [{ type: 'paragraph' }]
    };
  }

  const lines = markdown.split(/\r?\n/);
  const content: TiptapNode[] = [];
  
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let codeBlockLang = '';

  let inBulletList = false;
  let bulletItems: TiptapNode[] = [];

  let inOrderedList = false;
  let orderedItems: TiptapNode[] = [];

  const flushLists = () => {
    if (inBulletList && bulletItems.length > 0) {
      content.push({
        type: 'bulletList',
        content: [...bulletItems]
      });
      bulletItems = [];
      inBulletList = false;
    }
    if (inOrderedList && orderedItems.length > 0) {
      content.push({
        type: 'orderedList',
        content: [...orderedItems]
      });
      orderedItems = [];
      inOrderedList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Code Block handling
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        content.push({
          type: 'codeBlock',
          attrs: { language: codeBlockLang || null },
          content: codeBlockLines.length > 0 
            ? [{ type: 'text', text: codeBlockLines.join('\n') }]
            : undefined
        });
        codeBlockLines = [];
        codeBlockLang = '';
        inCodeBlock = false;
      } else {
        // Start code block
        flushLists();
        inCodeBlock = true;
        codeBlockLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // 2. Heading handling
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushLists();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      content.push({
        type: 'heading',
        attrs: { level },
        content: text ? [{ type: 'text', text }] : undefined
      });
      continue;
    }

    // 3. Blockquote handling
    if (line.startsWith('>')) {
      flushLists();
      const text = line.slice(1).trim();
      content.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text }] : undefined
        }]
      });
      continue;
    }

    // 4. Bullet List handling
    const bulletMatch = line.match(/^[-*+]\s+(.*)$/);
    if (bulletMatch) {
      if (inOrderedList) flushLists();
      inBulletList = true;
      const text = bulletMatch[1].trim();
      bulletItems.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text }] : undefined
        }]
      });
      continue;
    }

    // 5. Ordered List handling
    const orderedMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      if (inBulletList) flushLists();
      inOrderedList = true;
      const text = orderedMatch[2].trim();
      orderedItems.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: text ? [{ type: 'text', text }] : undefined
        }]
      });
      continue;
    }

    // 6. Blank lines (paragraphs separation or spacing)
    if (trimmed === '') {
      flushLists();
      // Only push an empty paragraph if the previous node wasn't empty
      if (content.length > 0 && content[content.length - 1].type !== 'paragraph') {
        content.push({ type: 'paragraph' });
      }
      continue;
    }

    // 7. Regular paragraph
    flushLists();
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line }]
    });
  }

  // Flush remaining lists at end of document
  flushLists();

  // If code block remains open, flush it
  if (inCodeBlock && codeBlockLines.length > 0) {
    content.push({
      type: 'codeBlock',
      attrs: { language: codeBlockLang || null },
      content: [{ type: 'text', text: codeBlockLines.join('\n') }]
    });
  }

  // Ensure doc has at least one child node
  if (content.length === 0) {
    content.push({ type: 'paragraph' });
  }

  return {
    type: 'doc',
    content
  };
}
