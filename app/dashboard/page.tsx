"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calculateLateFeePaise } from "@/lib/lateFee";

type Role = "member" | "librarian";

type Book = {
  id: string;
  title: string;
  author: string;
  number_of_copies: number;
  book_value_paise: number;
};

type Loan = {
  id: string;
  book_id: string;
  issued_date: string;
  due_date: string;
  returned_date: string | null;
};

type Member = {
  id: string;
  full_name: string;
};

function isRole(value: string): value is Role {
  return value === "member" || value === "librarian";
}

function getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function getLoanStatus(
  loan: Loan,
): "Returned" | "Overdue" | "Active" {
  if (loan.returned_date) {
    return "Returned";
  }

  return getTodayDate() > loan.due_date ? "Overdue" : "Active";
}

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState("Loading...");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [numberOfCopies, setNumberOfCopies] = useState("");
  const [bookValueRupees, setBookValueRupees] = useState("");
  const [bookMessage, setBookMessage] = useState("");

  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editNumberOfCopies, setEditNumberOfCopies] = useState("");
  const [editBookValueRupees, setEditBookValueRupees] = useState("");
  const [editMessage, setEditMessage] = useState("");

  const [deleteMessage, setDeleteMessage] = useState("");

  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loanMessage, setLoanMessage] = useState("");

  const [returnMessage, setReturnMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/login");
        return;
      }

      setEmail(user.email ?? null);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError) {
        setMessage(profileError.message);
        return;
      }

      if (!isRole(profile.role)) {
        setMessage("Invalid user role.");
        return;
      }

      setRole(profile.role);

      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select(
          "id, title, author, number_of_copies, book_value_paise",
        )
        .order("title");

      if (booksError) {
        setMessage(booksError.message);
        return;
      }

      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select(
          "id, book_id, issued_date, due_date, returned_date",
        )
        .order("issued_date", { ascending: false });

      if (loansError) {
        setMessage(loansError.message);
        return;
      }

      setBooks(booksData);
      setLoans(loansData);

      if (profile.role === "librarian") {
        const { data: membersData, error: membersError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "member")
          .order("full_name");

        if (membersError) {
          setMessage(membersError.message);
          return;
        }

        setMembers(membersData);
      }

      setMessage("");
    }

    loadDashboard();
  }, [router]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => !loan.returned_date),
    [loans],
  );

  const overdueLoans = useMemo(
    () => activeLoans.filter((loan) => getTodayDate() > loan.due_date),
    [activeLoans],
  );

  const totalCopies = useMemo(
    () => books.reduce((total, book) => total + book.number_of_copies, 0),
    [books],
  );

  const borrowedCopies = activeLoans.length;

  const availableCopies = Math.max(0, totalCopies - borrowedCopies);

  const outstandingLateFees = useMemo(
    () =>
      loans.reduce((total, loan) => {
        const book = books.find((item) => item.id === loan.book_id);

        if (!book) {
          return total;
        }

        return (
          total +
          calculateLateFeePaise({
            issuedDate: loan.issued_date,
            dueDate: loan.due_date,
            returnedDate: loan.returned_date,
            asOfDate: getTodayDate(),
            bookValuePaise: book.book_value_paise,
          })
        );
      }, 0),
    [books, loans],
  );

  function getBookTitle(bookId: string): string {
    const book = books.find((item) => item.id === bookId);

    return book?.title ?? "Unknown book";
  }

  function getMemberName(member: Member): string {
    return (
      member.full_name.trim() ||
      `Member ${member.id.slice(0, 8)}`
    );
  }

  function getActiveLoanCount(bookId: string): number {
    return activeLoans.filter((loan) => loan.book_id === bookId).length;
  }

  function getAvailableCopies(book: Book): number {
    return Math.max(
      0,
      book.number_of_copies - getActiveLoanCount(book.id),
    );
  }

  function getLateFeePaise(
    loan: Loan,
    book: Book | undefined,
  ): number {
    if (!book) {
      return 0;
    }

    return calculateLateFeePaise({
      issuedDate: loan.issued_date,
      dueDate: loan.due_date,
      returnedDate: loan.returned_date,
      asOfDate: getTodayDate(),
      bookValuePaise: book.book_value_paise,
    });
  }

  async function handleCreateBook(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (role !== "librarian") {
      setBookMessage("Only librarians can create books.");
      return;
    }

    const copies = Number(numberOfCopies);
    const valueRupees = Number(bookValueRupees);

    if (!Number.isInteger(copies) || copies < 0) {
      setBookMessage(
        "Number of copies must be a non-negative integer.",
      );
      return;
    }

    if (!Number.isFinite(valueRupees) || valueRupees < 0) {
      setBookMessage(
        "Book value must be a non-negative number.",
      );
      return;
    }

    const bookValuePaise = Math.round(valueRupees * 100);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("books")
      .insert({
        title,
        author,
        number_of_copies: copies,
        book_value_paise: bookValuePaise,
      })
      .select(
        "id, title, author, number_of_copies, book_value_paise",
      )
      .single();

    if (error) {
      setBookMessage(error.message);
      return;
    }

    setBooks((currentBooks) => [...currentBooks, data]);
    setTitle("");
    setAuthor("");
    setNumberOfCopies("");
    setBookValueRupees("");
    setBookMessage("Book added to the collection.");
  }

  function startEditingBook(book: Book) {
    setEditingBookId(book.id);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditNumberOfCopies(String(book.number_of_copies));
    setEditBookValueRupees(
      (book.book_value_paise / 100).toFixed(2),
    );
    setEditMessage("");
  }

  function cancelEditingBook() {
    setEditingBookId(null);
    setEditTitle("");
    setEditAuthor("");
    setEditNumberOfCopies("");
    setEditBookValueRupees("");
    setEditMessage("");
  }

  async function handleUpdateBook(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (role !== "librarian") {
      setEditMessage("Only librarians can update books.");
      return;
    }

    if (!editingBookId) {
      setEditMessage("No book selected.");
      return;
    }

    const copies = Number(editNumberOfCopies);
    const valueRupees = Number(editBookValueRupees);

    if (!Number.isInteger(copies) || copies < 0) {
      setEditMessage(
        "Number of copies must be a non-negative integer.",
      );
      return;
    }

    if (!Number.isFinite(valueRupees) || valueRupees < 0) {
      setEditMessage(
        "Book value must be a non-negative number.",
      );
      return;
    }

    const bookValuePaise = Math.round(valueRupees * 100);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("books")
      .update({
        title: editTitle,
        author: editAuthor,
        number_of_copies: copies,
        book_value_paise: bookValuePaise,
      })
      .eq("id", editingBookId)
      .select(
        "id, title, author, number_of_copies, book_value_paise",
      )
      .single();

    if (error) {
      setEditMessage(error.message);
      return;
    }

    setBooks((currentBooks) =>
      currentBooks.map((book) =>
        book.id === data.id ? data : book,
      ),
    );

    cancelEditingBook();
    setBookMessage("Book details updated.");
  }

  async function handleDeleteBook(book: Book) {
    if (role !== "librarian") {
      setDeleteMessage("Only librarians can delete books.");
      return;
    }

    const confirmed = window.confirm(
      `Delete "${book.title}"?`,
    );

    if (!confirmed) {
      return;
    }

    setDeleteMessage("");

    const supabase = createClient();

    const { error } = await supabase
      .from("books")
      .delete()
      .eq("id", book.id);

    if (error) {
      setDeleteMessage(error.message);
      return;
    }

    setBooks((currentBooks) =>
      currentBooks.filter((item) => item.id !== book.id),
    );

    setDeleteMessage("Book removed from the collection.");
  }

  async function handleIssueBook(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (role !== "librarian") {
      setLoanMessage("Only librarians can issue books.");
      return;
    }

    if (!selectedMemberId) {
      setLoanMessage("Please select a member.");
      return;
    }

    if (!selectedBookId) {
      setLoanMessage("Please select a book.");
      return;
    }

    if (!issuedDate || !dueDate) {
      setLoanMessage(
        "Please select both issue and due dates.",
      );
      return;
    }

    if (dueDate < issuedDate) {
      setLoanMessage(
        "Due date cannot be before issue date.",
      );
      return;
    }

    const supabase = createClient();

    const { error } = await supabase.rpc("issue_book", {
      p_book_id: selectedBookId,
      p_member_id: selectedMemberId,
      p_issued_date: issuedDate,
      p_due_date: dueDate,
    });

    if (error) {
      setLoanMessage(error.message);
      return;
    }

    const { data: refreshedLoans, error: loansError } =
      await supabase
        .from("loans")
        .select(
          "id, book_id, issued_date, due_date, returned_date",
        )
        .order("issued_date", { ascending: false });

    if (loansError) {
      setLoanMessage(
        `Loan created, but the loan list could not be refreshed: ${loansError.message}`,
      );
      return;
    }

    setLoans(refreshedLoans);
    setSelectedMemberId("");
    setSelectedBookId("");
    setIssuedDate("");
    setDueDate("");
    setLoanMessage("Book issued successfully.");
  }

  async function handleReturnBook(loan: Loan) {
    if (role !== "librarian") {
      setReturnMessage(
        "Only librarians can return books.",
      );
      return;
    }

    if (loan.returned_date) {
      setReturnMessage("This book has already been returned.");
      return;
    }

    const returnedDate = getTodayDate();

    if (returnedDate <= loan.issued_date) {
      setReturnMessage(
        "Return date must be after the issue date.",
      );
      return;
    }

    const confirmed = window.confirm(
      `Return "${getBookTitle(loan.book_id)}" today?`,
    );

    if (!confirmed) {
      return;
    }

    setReturnMessage("");

    const supabase = createClient();

    const { error } = await supabase.rpc("return_book", {
      p_loan_id: loan.id,
      p_returned_date: returnedDate,
    });

    if (error) {
      setReturnMessage(error.message);
      return;
    }

    setLoans((currentLoans) =>
      currentLoans.map((item) =>
        item.id === loan.id
          ? {
              ...item,
              returned_date: returnedDate,
            }
          : item,
      ),
    );

    setReturnMessage("Book returned successfully.");
  }

  async function handleLogout() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/login");
  }

  const displayName = email?.split("@")[0] ?? "Library user";
  const roleLabel = role === "librarian" ? "Librarian" : "Member";

  if (message) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f6f3ed] p-6">
        <section className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl shadow-stone-200/50">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#183b32] text-2xl text-white">
            📚
          </div>
          <h1 className="mt-6 text-2xl font-semibold text-stone-900">
            {message === "Loading..." ? "Opening your library" : "Unable to load library"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-stone-500">
            {message === "Loading..."
              ? "Preparing your books, loans and account details."
              : message}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f3ed] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-stone-200 bg-[#173a31] px-6 py-7 text-white lg:flex lg:flex-col">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#d9b66f] text-xl text-[#173a31]">
                📚
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#cbd8d2]">
                  Department
                </p>
                <h1 className="text-lg font-semibold">
                  Library
                </h1>
              </div>
            </div>

            <nav className="mt-10 space-y-2">
              <a
                href="#overview"
                className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm font-medium text-white"
              >
                <span>⌂</span>
                Overview
              </a>
              <a
                href="#books"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#cbd8d2] transition hover:bg-white/10 hover:text-white"
              >
                <span>▤</span>
                Collection
              </a>
              <a
                href="#loans"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#cbd8d2] transition hover:bg-white/10 hover:text-white"
              >
                <span>↗</span>
                {role === "librarian" ? "Loan register" : "My loans"}
              </a>
              {role === "librarian" && (
                <a
                  href="#manage"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-[#cbd8d2] transition hover:bg-white/10 hover:text-white"
                >
                  <span>＋</span>
                  Manage library
                </a>
              )}
            </nav>
          </div>

          <div className="mt-auto">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#d9b66f] text-sm font-bold text-[#173a31]">
                  {getInitials(displayName)}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {displayName}
                  </p>
                  <p className="mt-0.5 text-xs text-[#cbd8d2]">
                    {roleLabel}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-[#e6eeea] transition hover:bg-white/10"
              >
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-[#f6f3ed]/95 px-5 py-4 backdrop-blur md:px-8 lg:px-10">
            <div className="flex items-center justify-between gap-4">
              <div className="lg:hidden">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#547065]">
                  Department Library
                </p>
                <h1 className="text-lg font-semibold">
                  Library Dashboard
                </h1>
              </div>

              <div className="hidden lg:block">
                <p className="text-sm text-stone-500">
                  {role === "librarian"
                    ? "Manage your collection and loan register."
                    : "Your personal library overview."}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">
                    {displayName}
                  </p>
                  <p className="text-xs text-stone-500">
                    {roleLabel}
                  </p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-sm font-bold text-[#173a31] shadow-sm">
                  {getInitials(displayName)}
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm font-medium text-stone-700 shadow-sm transition hover:bg-stone-50 lg:hidden"
                >
                  Sign out
                </button>
              </div>
            </div>
          </header>

          <div className="px-5 py-7 md:px-8 md:py-9 lg:px-10">
            <section id="overview">
              <div className="relative overflow-hidden rounded-[2rem] bg-[#1b4036] p-7 text-white shadow-xl shadow-[#173a31]/10 md:p-9">
                <div className="relative z-10 max-w-2xl">
                  <p className="text-sm font-medium uppercase tracking-[0.22em] text-[#d9b66f]">
                    {role === "librarian"
                      ? "Librarian workspace"
                      : "Member workspace"}
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                    {role === "librarian"
                      ? "Welcome back to your library."
                      : "Your reading desk, at a glance."}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-[#d8e4df] md:text-base">
                    {role === "librarian"
                      ? "Keep the collection organized, issue books safely, and stay ahead of overdue returns."
                      : "Browse the collection and keep track of your current loans and late fees."}
                  </p>
                </div>
                <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full border-[30px] border-[#d9b66f]/15" />
                <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full bg-[#d9b66f]/10 blur-2xl" />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-stone-500">
                        Total titles
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {books.length}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef4f0] text-[#245344]">
                      ▤
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-stone-400">
                    Books in the collection
                  </p>
                </article>

                <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-stone-500">
                        Available copies
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {availableCopies}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f1f5e9] text-[#53683b]">
                      ✓
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-stone-400">
                    {totalCopies} copies across all titles
                  </p>
                </article>

                <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-stone-500">
                        Active loans
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {activeLoans.length}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f0df] text-[#886a2c]">
                      ↗
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-stone-400">
                    {overdueLoans.length} currently overdue
                  </p>
                </article>

                <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm text-stone-500">
                        Late fees
                      </p>
                      <p className="mt-2 text-3xl font-semibold">
                        {formatCurrency(outstandingLateFees)}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f8ece9] text-[#9b5548]">
                      ₹
                    </span>
                  </div>
                  <p className="mt-4 text-xs text-stone-400">
                    Calculated from current loan status
                  </p>
                </article>
              </div>
            </section>

            {role === "librarian" && (
              <section
                id="manage"
                className="mt-8 grid gap-5 xl:grid-cols-2"
              >
                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
                        Collection
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">
                        Add a new book
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Add a title to the department collection.
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#173a31] text-lg text-white">
                      ＋
                    </span>
                  </div>

                  <form
                    onSubmit={handleCreateBook}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <input
                      type="text"
                      placeholder="Book title"
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10 sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Author"
                      value={author}
                      onChange={(event) =>
                        setAuthor(event.target.value)
                      }
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10 sm:col-span-2"
                    />
                    <input
                      type="number"
                      placeholder="Number of copies"
                      value={numberOfCopies}
                      onChange={(event) =>
                        setNumberOfCopies(event.target.value)
                      }
                      min="0"
                      step="1"
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10"
                    />
                    <input
                      type="number"
                      placeholder="Book value in ₹"
                      value={bookValueRupees}
                      onChange={(event) =>
                        setBookValueRupees(event.target.value)
                      }
                      min="0"
                      step="0.01"
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition placeholder:text-stone-400 focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-[#173a31] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#245344] sm:col-span-2"
                    >
                      Add book to collection
                    </button>
                  </form>

                  {bookMessage && (
                    <p className="mt-3 rounded-xl bg-[#eef4f0] px-4 py-3 text-sm text-[#315e4e]">
                      {bookMessage}
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
                        Circulation
                      </p>
                      <h2 className="mt-1 text-xl font-semibold">
                        Issue a book
                      </h2>
                      <p className="mt-1 text-sm text-stone-500">
                        Create a loan for a department member.
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f7f0df] text-lg text-[#886a2c]">
                      ↗
                    </span>
                  </div>

                  <form
                    onSubmit={handleIssueBook}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <select
                      value={selectedMemberId}
                      onChange={(event) =>
                        setSelectedMemberId(event.target.value)
                      }
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10 sm:col-span-2"
                    >
                      <option value="">Select member</option>
                      {members.map((member) => (
                        <option
                          key={member.id}
                          value={member.id}
                        >
                          {getMemberName(member)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={selectedBookId}
                      onChange={(event) =>
                        setSelectedBookId(event.target.value)
                      }
                      required
                      className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10 sm:col-span-2"
                    >
                      <option value="">Select available book</option>
                      {books.map((book) => {
                        const available = getAvailableCopies(book);

                        return (
                          <option
                            key={book.id}
                            value={book.id}
                            disabled={available === 0}
                          >
                            {book.title} — {available} available
                          </option>
                        );
                      })}
                    </select>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-stone-500">
                        Issue date
                      </span>
                      <input
                        type="date"
                        value={issuedDate}
                        onChange={(event) =>
                          setIssuedDate(event.target.value)
                        }
                        required
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1.5 block text-xs font-medium text-stone-500">
                        Due date
                      </span>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(event) =>
                          setDueDate(event.target.value)
                        }
                        required
                        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#547065] focus:bg-white focus:ring-2 focus:ring-[#547065]/10"
                      />
                    </label>

                    <button
                      type="submit"
                      className="rounded-xl bg-[#d9b66f] px-4 py-3 text-sm font-semibold text-[#173a31] shadow-sm transition hover:bg-[#cba85d] sm:col-span-2"
                    >
                      Issue book
                    </button>
                  </form>

                  {loanMessage && (
                    <p className="mt-3 rounded-xl bg-[#f7f0df] px-4 py-3 text-sm text-[#725b2b]">
                      {loanMessage}
                    </p>
                  )}
                </div>
              </section>
            )}

            <section id="books" className="mt-8">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
                    Library collection
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    Books
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {books.length === 0
                      ? "The collection is currently empty."
                      : `${books.length} titles · ${totalCopies} physical copies`}
                  </p>
                </div>

                {deleteMessage && (
                  <p className="rounded-xl bg-[#f8ece9] px-4 py-2.5 text-sm text-[#8d4c41]">
                    {deleteMessage}
                  </p>
                )}
              </div>

              {books.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef4f0] text-2xl">
                    📖
                  </div>
                  <h3 className="mt-4 font-semibold">
                    No books in the collection
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                    {role === "librarian"
                      ? "Use the Add a new book panel above to start building the collection."
                      : "The librarian has not added any books yet."}
                  </p>
                </div>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {books.map((book) => {
                    const available = getAvailableCopies(book);
                    const borrowed = getActiveLoanCount(book.id);

                    return (
                      <article
                        key={book.id}
                        className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-stone-200/50"
                      >
                        {editingBookId === book.id ? (
                          <form
                            onSubmit={handleUpdateBook}
                            className="p-5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="rounded-full bg-[#eef4f0] px-3 py-1 text-xs font-semibold text-[#315e4e]">
                                Editing
                              </span>
                              <button
                                type="button"
                                onClick={cancelEditingBook}
                                className="text-sm text-stone-400 hover:text-stone-700"
                              >
                                Cancel
                              </button>
                            </div>

                            <div className="mt-5 space-y-3">
                              <input
                                type="text"
                                placeholder="Book title"
                                value={editTitle}
                                onChange={(event) =>
                                  setEditTitle(event.target.value)
                                }
                                required
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#547065] focus:bg-white"
                              />
                              <input
                                type="text"
                                placeholder="Author"
                                value={editAuthor}
                                onChange={(event) =>
                                  setEditAuthor(event.target.value)
                                }
                                required
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#547065] focus:bg-white"
                              />
                              <input
                                type="number"
                                placeholder="Number of copies"
                                value={editNumberOfCopies}
                                onChange={(event) =>
                                  setEditNumberOfCopies(
                                    event.target.value,
                                  )
                                }
                                min="0"
                                step="1"
                                required
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#547065] focus:bg-white"
                              />
                              <input
                                type="number"
                                placeholder="Book value in ₹"
                                value={editBookValueRupees}
                                onChange={(event) =>
                                  setEditBookValueRupees(
                                    event.target.value,
                                  )
                                }
                                min="0"
                                step="0.01"
                                required
                                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none focus:border-[#547065] focus:bg-white"
                              />
                            </div>

                            <button
                              type="submit"
                              className="mt-4 w-full rounded-xl bg-[#173a31] px-4 py-3 text-sm font-semibold text-white hover:bg-[#245344]"
                            >
                              Save changes
                            </button>

                            {editMessage && (
                              <p className="mt-3 text-sm text-[#8d4c41]">
                                {editMessage}
                              </p>
                            )}
                          </form>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-4 bg-[#f0eadc] p-5">
                              <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded-md bg-[#173a31] text-2xl text-white shadow-md">
                                ▥
                              </div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  available > 0
                                    ? "bg-[#e3f1e9] text-[#315e4e]"
                                    : "bg-[#f8ece9] text-[#8d4c41]"
                                }`}
                              >
                                {available > 0
                                  ? `${available} available`
                                  : "Unavailable"}
                              </span>
                            </div>

                            <div className="p-5">
                              <h3 className="line-clamp-2 text-lg font-semibold">
                                {book.title}
                              </h3>
                              <p className="mt-1 text-sm text-stone-500">
                                {book.author}
                              </p>

                              <div className="mt-5 grid grid-cols-2 gap-3">
                                <div className="rounded-xl bg-stone-50 p-3">
                                  <p className="text-xs text-stone-400">
                                    Copies
                                  </p>
                                  <p className="mt-1 font-semibold">
                                    {book.number_of_copies}
                                  </p>
                                </div>
                                <div className="rounded-xl bg-stone-50 p-3">
                                  <p className="text-xs text-stone-400">
                                    On loan
                                  </p>
                                  <p className="mt-1 font-semibold">
                                    {borrowed}
                                  </p>
                                </div>
                              </div>

                              <div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-4">
                                <div>
                                  <p className="text-xs text-stone-400">
                                    Book value
                                  </p>
                                  <p className="mt-0.5 text-sm font-semibold">
                                    {formatCurrency(
                                      book.book_value_paise,
                                    )}
                                  </p>
                                </div>

                                {role === "librarian" && (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        startEditingBook(book)
                                      }
                                      className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteBook(book)
                                      }
                                      className="rounded-lg border border-[#edd5d0] px-3 py-2 text-xs font-semibold text-[#8d4c41] transition hover:bg-[#f8ece9]"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section id="loans" className="mt-10 pb-10">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6a806f]">
                    Circulation
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold">
                    {role === "librarian" ? "Loan register" : "My loans"}
                  </h2>
                  <p className="mt-1 text-sm text-stone-500">
                    {role === "librarian"
                      ? `${loans.length} loan records`
                      : `${loans.length} loan records associated with your account`}
                  </p>
                </div>

                {returnMessage && (
                  <p className="rounded-xl bg-[#eef4f0] px-4 py-2.5 text-sm text-[#315e4e]">
                    {returnMessage}
                  </p>
                )}
              </div>

              {loans.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f7f0df] text-2xl">
                    🕮
                  </div>
                  <h3 className="mt-4 font-semibold">
                    {role === "librarian"
                      ? "No loans yet"
                      : "Your loan shelf is empty"}
                  </h3>
                  <p className="mx-auto mt-1 max-w-md text-sm text-stone-500">
                    {role === "librarian"
                      ? "Issued books will appear here."
                      : "Books issued to your account will appear here."}
                  </p>
                </div>
              ) : (
                <div className="mt-5 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
                  <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-stone-100 bg-stone-50 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-stone-400 lg:grid">
                    <span>Book</span>
                    <span>Issued</span>
                    <span>Due</span>
                    <span>Status</span>
                    <span>Late fee</span>
                    <span />
                  </div>

                  <div className="divide-y divide-stone-100">
                    {loans.map((loan) => {
                      const book = books.find(
                        (item) => item.id === loan.book_id,
                      );
                      const status = getLoanStatus(loan);
                      const lateFeePaise = getLateFeePaise(
                        loan,
                        book,
                      );

                      return (
                        <article
                          key={loan.id}
                          className="grid gap-4 px-5 py-5 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] lg:items-center"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-9 shrink-0 items-center justify-center rounded bg-[#173a31] text-lg text-white">
                              ▥
                            </div>
                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold">
                                {getBookTitle(loan.book_id)}
                              </h3>
                              <p className="mt-0.5 text-xs text-stone-400">
                                {book?.author ?? "Book record unavailable"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-stone-400 lg:hidden">
                              Issued
                            </p>
                            <p className="mt-0.5 text-sm text-stone-700">
                              {formatDate(loan.issued_date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-stone-400 lg:hidden">
                              Due
                            </p>
                            <p className="mt-0.5 text-sm text-stone-700">
                              {formatDate(loan.due_date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-stone-400 lg:hidden">
                              Status
                            </p>
                            <span
                              className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                status === "Returned"
                                  ? "bg-stone-100 text-stone-600"
                                  : status === "Overdue"
                                    ? "bg-[#f8ece9] text-[#8d4c41]"
                                    : "bg-[#e3f1e9] text-[#315e4e]"
                              }`}
                            >
                              {status}
                            </span>
                            {loan.returned_date && (
                              <p className="mt-1 text-xs text-stone-400">
                                {formatDate(loan.returned_date)}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-xs text-stone-400 lg:hidden">
                              Late fee
                            </p>
                            <p
                              className={`mt-0.5 text-sm font-semibold ${
                                lateFeePaise > 0
                                  ? "text-[#9b5548]"
                                  : "text-stone-700"
                              }`}
                            >
                              {formatCurrency(lateFeePaise)}
                            </p>
                          </div>

                          <div className="lg:text-right">
                            {role === "librarian" &&
                              !loan.returned_date && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReturnBook(loan)
                                  }
                                  className="rounded-lg bg-[#173a31] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#245344]"
                                >
                                  Return
                                </button>
                              )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
