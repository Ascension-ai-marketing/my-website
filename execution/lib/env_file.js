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
