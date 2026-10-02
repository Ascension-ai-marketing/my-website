// Returns the named values from env, or throws naming every one that is missing.
export function requireEnv(names, env = process.env) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing in .env: ${missing.join(', ')}`);
  }
  return Object.fromEntries(names.map((name) => [name, env[name]]));
}
