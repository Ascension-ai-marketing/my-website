// Operation 1: list the free slots. Calls the tools in order; computes nothing itself.
// SOP: architecture/booking-flow.md
import { fetchBusy, freeSlots } from '../execution/availability.js';
import { RULES, buildSlotGrid } from '../execution/booking_rules.js';
import { toZonedIso } from '../execution/lib/time.js';

const defaultTools = { buildSlotGrid, fetchBusy, freeSlots };

export async function listSlots({ now = new Date(), env = process.env, tools = defaultTools } = {}) {
  const candidates = tools.buildSlotGrid(now);
  const busy = candidates.length === 0 ? [] : await tools.fetchBusy(candidates[0].start, candidates.at(-1).end, env);
  return {
    timezone: RULES.timezone,
    slot_minutes: RULES.slotMinutes,
    slots: tools.freeSlots(candidates, busy).map((slot) => toZonedIso(slot.start, RULES.timezone)),
  };
}
