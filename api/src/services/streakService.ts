// Ren logik uden databasekald. Alle datoer sammenlignes på dagsniveau.

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function previousDay(date: Date): Date {
  // setDate-logik (ikke "minus 24 timer"), så sommertid ikke giver fejl
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

// Findes dagen blandt datoerne? Sammenligner kun på dagen, ikke klokkeslættet.
export function includesDay(dates: Date[], day: Date): boolean {
  const time = startOfDay(day).getTime();
  return dates.some((d) => startOfDay(d).getTime() === time);
}

export function isCompletedToday(completedDates: Date[], today = new Date()): boolean {
  return includesDay(completedDates, today);
}

// Deler logs i gennemførte og beskyttede dage. Gamle logs uden isProtected tæller som gennemførte.
export function splitLogDates(logs: { completedAt: Date; isProtected?: boolean | null }[]) {
  const completedDates: Date[] = [];
  const protectedDates: Date[] = [];
  for (const log of logs) {
    (log.isProtected ? protectedDates : completedDates).push(log.completedAt);
  }
  return { completedDates, protectedDates };
}

// weekdays: 0-6, søndag = 0
// En beskyttet dag er et skjold: den bryder ikke streaken, men tæller heller ikke med i den.
export function calculate(
  completedDates: Date[],
  weekdays: number[],
  today = new Date(),
  protectedDates: Date[] = [],
): number {
  if (weekdays.length === 0) return 0; // sikrer, at løkken altid stopper

  const done = new Set(completedDates.map((d) => startOfDay(d).getTime()));
  const protectedDays = new Set(protectedDates.map((d) => startOfDay(d).getTime()));
  let day = startOfDay(today);

  // Er dagens vane ikke klaret endnu, er streaken ikke brudt endnu
  if (!done.has(day.getTime())) day = previousDay(day);

  let streak = 0;
  while (true) {
    if (weekdays.includes(day.getDay())) {
      if (done.has(day.getTime())) {
        streak++;
      } else if (!protectedDays.has(day.getTime())) {
        break; // planlagt dag uden gennemførsel eller skjold
      }
    }
    day = previousDay(day); // dage uden for planen og beskyttede dage springes over
  }
  return streak;
}
