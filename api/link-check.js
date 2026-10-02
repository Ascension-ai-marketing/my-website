import { runLinkChecks } from '../execution/lib/link_checks.js';

export default {
  async fetch() {
    // Preview deployments only; they sit behind Vercel sign-in.
    if (process.env.VERCEL_ENV === 'production') {
      return new Response('Not found', { status: 404 });
    }
    const report = await runLinkChecks();
    return Response.json(report, { status: report.ok ? 200 : 503 });
  },
};
