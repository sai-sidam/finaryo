// Money helpers: aggregate in integer cents to avoid float drift.
export function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function toCents(value) {
  return Math.round(Number(value) * 100);
}

export function sumMoney(values) {
  let cents = 0;
  for (const value of values) {
    cents += toCents(value);
  }
  return cents / 100;
}
