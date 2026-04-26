export function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export function monthStartDate(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
}

export function toMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function buildCalendarDays(activeMonth: Date) {
  const start = monthStartDate(activeMonth);
  const firstWeekday = start.getDay();
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

  for (let i = firstWeekday; i > 0; i -= 1) {
    const date = new Date(start);
    date.setDate(date.getDate() - i);
    cells.push({ date, inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(start.getFullYear(), start.getMonth(), day), inCurrentMonth: true });
  }
  const remainder = cells.length % 7;
  if (remainder > 0) {
    for (let i = 1; i <= 7 - remainder; i += 1) {
      cells.push({ date: new Date(start.getFullYear(), start.getMonth(), daysInMonth + i), inCurrentMonth: false });
    }
  }
  return cells;
}
