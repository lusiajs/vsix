const WORD_CHAR = /[\w$]/;
const ATTRIBUTE_CHAR = /[\w-]/;

/** The identifier that covers `offset`, or an empty string. */
export function wordAt(text: string, offset: number): string {
  return spanAt(text, offset, WORD_CHAR);
}

/** The attribute name that covers `offset`, such as `bind-value`, or an empty string. */
export function attributeNameAt(text: string, offset: number): string {
  return spanAt(text, offset, ATTRIBUTE_CHAR);
}

function spanAt(text: string, offset: number, charPattern: RegExp): string {
  let start = offset;
  while (start > 0 && charPattern.test(text.charAt(start - 1))) start--;
  let end = offset;
  while (end < text.length && charPattern.test(text.charAt(end))) end++;
  return text.slice(start, end);
}
