export type LateFeeInput = {
    issuedDate: string;
    dueDate: string;
    returnedDate: string | null;
    asOfDate: string;
    bookValuePaise: number;
  };
  
  function parseDateAsUtc(date: string): number {
    const [year, month, day] = date.split("-").map(Number);
  
    return Date.UTC(year, month - 1, day);
  }
  
  export function calculateLateFeePaise(input: LateFeeInput): number {
    const issuedDate = parseDateAsUtc(input.issuedDate);
    const dueDate = parseDateAsUtc(input.dueDate);
    const endDate = parseDateAsUtc(
      input.returnedDate ?? input.asOfDate,
    );
  
    if (input.bookValuePaise < 0) {
      throw new Error("Book value cannot be negative");
    }
  
    if (dueDate < issuedDate) {
      throw new Error("Due date cannot be before issue date");
    }
  
    if (input.returnedDate !== null && endDate <= issuedDate) {
      throw new Error("Return date must be after issue date");
    }
  
    const millisecondsPerDay = 86_400_000;
    const daysLate = Math.max(
      0,
      Math.floor((endDate - dueDate) / millisecondsPerDay),
    );
  
    const feePaise = daysLate * 500;
  
    return Math.min(feePaise, input.bookValuePaise);
  }