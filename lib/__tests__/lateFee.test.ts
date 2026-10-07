import { describe, expect, it } from "vitest";
import { calculateLateFeePaise } from "../lateFee";

describe("calculateLateFeePaise", () => {
  it("returns zero when returned on the due date", () => {
    const fee = calculateLateFeePaise({
      issuedDate: "2026-10-01",
      dueDate: "2026-10-10",
      returnedDate: "2026-10-10",
      asOfDate: "2026-10-20",
      bookValuePaise: 50000,
    });

    expect(fee).toBe(0);
  });

  it("charges ₹5 per day after the due date", () => {
    const fee = calculateLateFeePaise({
      issuedDate: "2026-10-01",
      dueDate: "2026-10-10",
      returnedDate: "2026-10-13",
      asOfDate: "2026-10-20",
      bookValuePaise: 50000,
    });

    expect(fee).toBe(1500);
  });

  it("stops accruing when the book is returned", () => {
    const fee = calculateLateFeePaise({
      issuedDate: "2026-10-01",
      dueDate: "2026-10-10",
      returnedDate: "2026-10-13",
      asOfDate: "2026-10-20",
      bookValuePaise: 50000,
    });

    expect(fee).toBe(1500);
  });

  it("uses the as-of date for an unreturned book", () => {
    const fee = calculateLateFeePaise({
      issuedDate: "2026-10-01",
      dueDate: "2026-10-10",
      returnedDate: null,
      asOfDate: "2026-10-13",
      bookValuePaise: 50000,
    });

    expect(fee).toBe(1500);
  });

  it("caps the late fee at the book value", () => {
    const fee = calculateLateFeePaise({
      issuedDate: "2026-10-01",
      dueDate: "2026-10-10",
      returnedDate: "2026-11-30",
      asOfDate: "2026-12-01",
      bookValuePaise: 1000,
    });

    expect(fee).toBe(1000);
  });

  it("rejects a same-day return", () => {
    expect(() =>
      calculateLateFeePaise({
        issuedDate: "2026-10-10",
        dueDate: "2026-10-20",
        returnedDate: "2026-10-10",
        asOfDate: "2026-10-20",
        bookValuePaise: 50000,
      }),
    ).toThrow("Return date must be after issue date");
  });
});