import { bookingIsOpen } from '../navigation/live.js';
import { listSlots } from '../navigation/slots_flow.js';

export default {
  async fetch(request) {
    if (!bookingIsOpen()) return new Response('Not found', { status: 404 });
    if (request.method !== 'GET') {
      return Response.json({ status: 'error', message: 'Use GET.' }, { status: 405, headers: { allow: 'GET' } });
    }
    try {
      const slots = await listSlots();
      return Response.json(slots, { headers: { 'cache-control': 'no-store' } });
    } catch (error) {
      console.error(JSON.stringify({ route: 'slots', outcome: 'unavailable', error: error.message }));
      return Response.json({ status: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
    }
  },
};
