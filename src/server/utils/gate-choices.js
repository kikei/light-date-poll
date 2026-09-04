import { ANY_DATE_KEY } from './any-date-key.js';
import { NOT_ATTENDING_KEY } from './not-attending-key.js';

// What the first screen offers, and the vote each answer casts. The choice
// is stored under its own name because it records an intent at first
// contact, which is not the same thing as the availability it implies.
export const GATE_CHOICES = {
  maybe: ANY_DATE_KEY,
  no: NOT_ATTENDING_KEY,
};

export function isGateChoice(choice) {
  return Object.prototype.hasOwnProperty.call(GATE_CHOICES, choice);
}
