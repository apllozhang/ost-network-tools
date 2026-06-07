// Alert state machine — valid transitions only

const VALID_TRANSITIONS: Record<string, string[]> = {
  triggered: ["unconfirmed", "silenced"],
  unconfirmed: ["confirmed", "silenced", "closed"],
  confirmed: ["processing", "silenced", "closed"],
  processing: ["recovered", "silenced", "closed"],
  recovered: ["closed"],
  silenced: ["unconfirmed", "closed"],
  closed: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function transition(from: string, to: string): string {
  if (!canTransition(from, to)) {
    throw new Error(
      `INVALID_TRANSITION: cannot go from "${from}" to "${to}"`,
    );
  }
  return to;
}
