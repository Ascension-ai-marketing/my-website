import { bookCall } from '../navigation/book_flow.js';
import { bookingIsOpen, readJsonBody } from '../navigation/live.js';

export default {
  async fetch(request) {
    if (!bookingIsOpen()) return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') {
      return Response.json({ status: 'error', message: 'Use POST.' }, { status: 405, headers: { allow: 'POST' } });
    }
    const startedAt = Date.now();
    try {
      const result = await bookCall(await readJsonBody(request));
      console.log(JSON.stringify({ route: 'book', ...result.log, elapsed_ms: Date.now() - startedAt }));
      return Response.json(result.response, { status: result.httpStatus, headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      console.error(
        JSON.stringify({ route: 'book', outcome: 'error', error: error.message, elapsed_ms: Date.now() - startedAt }),
      );
      return Response.json(
        { status: 'error', message: 'Something went wrong. Please try again.' },
        { status: 500, headers: { 'cache-control': 'no-store' } },
      );
    }
  },
};
