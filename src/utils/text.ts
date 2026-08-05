import { Break } from '@/types/app';

export function processVerseText(raw: string): { text: string; breaks: Break[] } {
  // 1. Strip HTML tags
  let text = raw.replace(/<[^>]*>?/gm, '');
  // 2. Remove thin space (U+2009) or other special spaces
  text = text.replace(/\u2009/g, '');
  
  // 3. Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  // 4. Extract {פ} and {ס}
  const words = text.split(' ');
  const cleanWords: string[] = [];
  const breaks: Break[] = [];

  for (let i = 0; i < words.length; i++) {
    let word = words[i];
    let hasPetucha = false;
    let hasSetuma = false;
    
    if (word.includes('{פ}')) {
      word = word.replace('{פ}', '');
      hasPetucha = true;
    }
    if (word.includes('{ס}')) {
      word = word.replace('{ס}', '');
      hasSetuma = true;
    }
    
    if (word) {
      cleanWords.push(word);
    }
    
    if (hasPetucha) {
      breaks.push({ wordIndex: cleanWords.length - 1, type: 'petucha' });
    }
    if (hasSetuma) {
      breaks.push({ wordIndex: cleanWords.length - 1, type: 'setuma' });
    }
  }

  return { text: cleanWords.join(' '), breaks };
}