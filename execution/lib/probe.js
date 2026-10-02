// Runs one probe and reports it as a single GREEN or RED line. SOP: architecture/link-probes.md
export async function runProbe(name, check) {
  try {
    const detail = await check();
    console.log(`GREEN ${name}: ${detail}`);
  } catch (error) {
    console.log(`RED ${name}: ${error.message}`);
    process.exitCode = 1;
  }
}

// Throws with Google's own error message when an API call fails.
export async function googleJson(res) {
  const body = await res.json();
  if (!res.ok) {
    const reason = body.error?.message ?? JSON.stringify(body);
    throw new Error(`${res.status} ${reason}`);
  }
  return body;
}
