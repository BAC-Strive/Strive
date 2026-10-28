import { calculate, isCompletedToday } from "../../src/services/streakService";

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
});

describe("isCompletedToday", () => {
  it("er sand, hvis der er en gennemførelse i dag", () => {
    expect(isCompletedToday([d(16, 8)], d(16, 20))).toBe(true);
  });

  it("er falsk, hvis gennemførelsen var i går", () => {
    expect(isCompletedToday([d(15)], d(16))).toBe(false);
  });
});