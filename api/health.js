import { health } from '../execution/health.js';

export default {
  fetch() {
    return Response.json(health(new Date()));
  },
};
