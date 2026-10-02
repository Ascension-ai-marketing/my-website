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
