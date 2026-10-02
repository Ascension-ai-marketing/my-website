// Sets KEY=value in the text of a .env file, replacing the line if the key exists.
export function upsertEnvValue(text, key, value) {
  const line = `${key}=${value}`;
  const lines = text.split('\n');
  const index = lines.findIndex((existing) => existing.startsWith(`${key}=`));
  if (index !== -1) {
    lines[index] = line;
    return lines.join('\n');
  }
  const separator = text === '' || text.endsWith('\n') ? '' : '\n';
  return `${text}${separator}${line}\n`;
}

// Returns why a pasted secret cannot be stored as a .env value, or null if it can.
export function secretValueProblem(value) {
  if (value === '') return 'the clipboard is empty';
  if (/\s/.test(value)) return 'the clipboard holds more than one word or line, which is not a token';
  if (value.length > 512) return 'the clipboard holds more than 512 characters, which is not a token';
  if (/^[A-Z][A-Z0-9_]*=/.test(value)) return 'the clipboard holds a NAME=value line; copy only the value';
  return null;
}
