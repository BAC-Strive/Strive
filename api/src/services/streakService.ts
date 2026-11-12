// Ren logik uden databasekald. Alle datoer sammenlignes på dagsniveau.

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function previousDay(date: Date): Date {
  // setDate-logik (ikke "minus 24 timer"), så sommertid ikke giver fejl
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
}

export function isCompletedToday(completedDates: Date[], today = new Date()): boolean {
  const todayTime = startOfDay(today).getTime();
  return completedDates.some((d) => startOfDay(d).getTime() === todayTime);
}

// weekdays: 0-6, søndag = 0
export function calculate(completedDates: Date[], weekdays: number[], today = new Date()): number {
  if (weekdays.length === 0) return 0; // sikrer, at løkken altid stopper

  const done = new Set(completedDates.map((d) => startOfDay(d).getTime()));
  let day = startOfDay(today);

  // Er dagens vane ikke klaret endnu, er streaken ikke brudt endnu
  if (!done.has(day.getTime())) day = previousDay(day);

  let streak = 0;
  while (true) {
    if (weekdays.includes(day.getDay())) {
      if (!done.has(day.getTime())) break; // planlagt dag uden gennemførsel
      streak++;
    }
    day = previousDay(day); // dage uden for planen springes over
  }
  return streak;
}