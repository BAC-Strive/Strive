import { calculate, includesDay, isCompletedToday, splitLogDates } from "../../src/services/streakService";

// Oktober 2026: 12. mandag, 14. onsdag, 16. fredag, 17. lørdag
const d = (day: number, hour = 12) => new Date(2026, 9, day, hour);
const MWF = [1, 3, 5];

describe("calculate", () => {
  it("giver 0 uden gennemførelser", () => {
    expect(calculate([], MWF, d(16))).toBe(0);
  });

  it("giver 0 uden planlagte ugedage", () => {
    expect(calculate([d(16)], [], d(16))).toBe(0);
  });

  it("tæller planlagte dage i træk", () => {
    expect(calculate([d(12), d(14), d(16)], MWF, d(16))).toBe(3);
  });

  it("springer dage uden for planen over", () => {
    expect(calculate([d(12), d(14), d(16)], MWF, d(17))).toBe(3);
  });

  it("brydes af en manglende planlagt dag", () => {
    expect(calculate([d(12), d(16)], MWF, d(16))).toBe(1);
  });

  it("brydes ikke, hvis dagens vane endnu ikke er gjort", () => {
    expect(calculate([d(12), d(14)], MWF, d(16))).toBe(2);
  });

  it("tæller dagens gennemførelse med", () => {
    expect(calculate([d(14), d(16)], MWF, d(16))).toBe(2);
  });

  it("ser kun på dagen, ikke klokkeslættet", () => {
    expect(calculate([d(16, 18)], MWF, d(16, 8))).toBe(1);
  });

  it("giver ikke streak for gennemførelse på en ikke-planlagt dag", () => {
    expect(calculate([d(15)], MWF, d(15))).toBe(0);
  });

  it("ignorerer en log uden for planen og tæller kun planlagte dage", () => {
    // 15. (torsdag) er ikke planlagt, så loggen den dag hverken tæller med eller bryder noget
    expect(calculate([d(14), d(15), d(16)], MWF, d(16))).toBe(2);
  });

  it("tæller dage i træk hen over skiftet fra sommertid til vintertid", () => {
    // Sommertiden slutter søndag 25. oktober 2026, så døgnet er 25 timer
    expect(calculate([d(24), d(25), d(26)], [0, 1, 2, 3, 4, 5, 6], d(26))).toBe(3);
  });
});

describe("isCompletedToday", () => {
  it("er sand, hvis der er en gennemførelse i dag", () => {
    expect(isCompletedToday([d(16, 8)], d(16, 20))).toBe(true);
  });

  it("er falsk, hvis gennemførelsen var i går", () => {
    expect(isCompletedToday([d(15)], d(16))).toBe(false);
  });
});

describe("calculate med skjold (beskyttede dage)", () => {
  const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

  it("lader en streak på 5 gå til 6, selvom en dag i midten var beskyttet", () => {
    // 8.-12. gennemført (5 dage), 13. beskyttet, 14. gennemført
    const done = [d(8), d(9), d(10), d(11), d(12), d(14)];
    expect(calculate(done, EVERY_DAY, d(14), [d(13)])).toBe(6);
  });

  it("tæller ikke selve den beskyttede dag med", () => {
    // 13. og 15. gennemført, 14. beskyttet: 2, ikke 3
    expect(calculate([d(13), d(15)], EVERY_DAY, d(15), [d(14)])).toBe(2);
  });

  it("brydes ikke, hvis i dag er beskyttet og endnu ikke gennemført", () => {
    expect(calculate([d(14), d(15)], EVERY_DAY, d(16), [d(16)])).toBe(2);
  });

  it("lader flere beskyttede dage i træk bygge bro", () => {
    expect(calculate([d(12), d(15)], EVERY_DAY, d(15), [d(13), d(14)])).toBe(2);
  });

  it("brydes stadig af en planlagt dag uden hverken gennemførelse eller skjold", () => {
    // 13. mangler, så skjoldet den 14. redder ikke streaken
    expect(calculate([d(12)], EVERY_DAY, d(15), [d(14)])).toBe(0);
  });

  it("ignorerer et skjold på en dag uden for planen", () => {
    // 15. (torsdag) er ikke planlagt (man, ons, fre), så skjoldet hverken tæller eller ændrer noget
    expect(calculate([d(12), d(14)], MWF, d(16), [d(15)])).toBe(2);
  });

  it("giver samme resultat som før, når der ingen skjolde er", () => {
    expect(calculate([d(12), d(14), d(16)], MWF, d(16), [])).toBe(3);
  });
});

describe("splitLogDates", () => {
  it("deler logs i gennemførte og beskyttede dage", () => {
    const result = splitLogDates([
      { completedAt: d(14), isProtected: false },
      { completedAt: d(15), isProtected: true },
    ]);

    expect(result).toEqual({ completedDates: [d(14)], protectedDates: [d(15)] });
  });

  it("behandler gamle logs uden isProtected som gennemførte", () => {
    const result = splitLogDates([{ completedAt: d(14) }, { completedAt: d(15), isProtected: null }]);

    expect(result.completedDates).toEqual([d(14), d(15)]);
    expect(result.protectedDates).toEqual([]);
  });
});

describe("includesDay", () => {
  it("finder dagen uanset klokkeslæt", () => {
    expect(includesDay([d(16, 8)], d(16, 20))).toBe(true);
    expect(includesDay([d(15)], d(16))).toBe(false);
  });
});
