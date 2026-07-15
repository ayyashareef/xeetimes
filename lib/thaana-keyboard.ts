// Standard Dhivehi (Thaana) keyboard layout mapping
// Maps English keyboard keys to Thaana characters

const THAANA_MAP: Record<string, string> = {
  // Lowercase
  'q': '\u0787\u07B0', // ް (sukun mapped as alifu+sukun, but standard is just sukun)
  'w': '\u0787',       // އ
  'e': '\u07AC',       // ެ
  'r': '\u0783',       // ރ
  't': '\u078C',       // ތ
  'y': '\u0794',       // ޔ
  'u': '\u07AA',       // ު
  'i': '\u07A8',       // ި
  'o': '\u07AE',       // ޮ
  'p': '\u0795',       // ޕ
  'a': '\u07A6',       // ަ
  's': '\u0790',       // ސ
  'd': '\u078B',       // ދ
  'f': '\u078A',       // ފ
  'g': '\u078E',       // ގ
  'h': '\u0780',       // ހ
  'j': '\u0796',       // ޖ
  'k': '\u0786',       // ކ
  'l': '\u078D',       // ލ
  'z': '\u0792',       // ޒ
  'x': '\u00D7',       // × (multiply sign)
  'c': '\u0797',       // ޗ
  'v': '\u0788',       // ވ
  'b': '\u0784',       // ބ
  'n': '\u0782',       // ނ
  'm': '\u0789',       // މ

  // Uppercase (Shift)
  'Q': '\u07B0',       // ް (sukun)
  'W': '\u0787\u07A2', // ޢ
  'E': '\u07AD',       // ޭ
  'R': '\u079C',       // ޜ (not common, using ޜ)
  'T': '\u0793',       // ޓ
  'Y': '\u07A0',       // ޠ
  'U': '\u07AB',       // ޫ
  'I': '\u07A9',       // ީ
  'O': '\u07AF',       // ޯ
  'P': '\u00F7',       // ÷ (division sign)
  'A': '\u07A7',       // ާ
  'S': '\u079B',       // ށ
  'D': '\u0791',       // ޑ
  'F': '\uFDF2',       // ﷲ (Allah ligature)
  'G': '\u07A3',       // ޣ
  'H': '\u0799',       // ޙ
  'J': '\u079B',       // ޛ - using ށ as fallback
  'K': '\u079A',       // ޚ
  'L': '\u0785',       // ޅ
  'Z': '\u07A1',       // ޡ
  'X': '\u0798',       // ޘ
  'C': '\u079D',       // ޝ
  'V': '\u07A5',       // ޥ
  'B': '\u079E',       // ޞ
  'N': '\u078F',       // ޏ
  'M': '\u079F',       // ޟ
};

export function englishToThaana(char: string): string {
  return THAANA_MAP[char] || char;
}

export function convertToThaana(text: string): string {
  let result = '';
  for (const char of text) {
    result += THAANA_MAP[char] || char;
  }
  return result;
}

// Check if a character is already Thaana
export function isThaanaChar(char: string): boolean {
  const code = char.charCodeAt(0);
  return (code >= 0x0780 && code <= 0x07BF) || code === 0xFDF2;
}
