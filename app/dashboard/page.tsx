"use client";

import { FormEvent, useEffect, useState } from "react";
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

  const [editingBookId, setEditingBookId] = useState<string | null>(
    null,
  );
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
        const { data: membersData, error: membersError } =
          await supabase
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
    setBookMessage("Book created successfully.");
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
    setBookMessage("Book updated successfully.");
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

    setDeleteMessage("Book deleted successfully.");
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

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">
        Library Dashboard
      </h1>

      {email && (
        <p className="mt-2">
          Logged in as: <strong>{email}</strong>
        </p>
      )}

      {role && (
        <p className="mt-1">
          Role: <strong>{role}</strong>
        </p>
      )}

      {email && (
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded bg-black px-4 py-2 text-white"
        >
          Sign Out
        </button>
      )}

      {message && (
        <p className="mt-6">{message}</p>
      )}

      {!message && (
        <>
          {role === "librarian" && (
            <>
              <section className="mt-8">
                <h2 className="text-2xl font-semibold">
                  Create Book
                </h2>

                <form
                  onSubmit={handleCreateBook}
                  className="mt-4 max-w-md space-y-4 rounded-lg border p-6"
                >
                  <input
                    type="text"
                    placeholder="Book title"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    required
                    className="w-full rounded border p-2"
                  />

                  <input
                    type="text"
                    placeholder="Author"
                    value={author}
                    onChange={(event) =>
                      setAuthor(event.target.value)
                    }
                    required
                    className="w-full rounded border p-2"
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
                    className="w-full rounded border p-2"
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
                    className="w-full rounded border p-2"
                  />

                  <button
                    type="submit"
                    className="w-full rounded bg-black px-4 py-2 text-white"
                  >
                    Create Book
                  </button>

                  {bookMessage && (
                    <p className="text-sm">
                      {bookMessage}
                    </p>
                  )}
                </form>
              </section>

              <section className="mt-10">
                <h2 className="text-2xl font-semibold">
                  Issue Book
                </h2>

                <form
                  onSubmit={handleIssueBook}
                  className="mt-4 max-w-md space-y-4 rounded-lg border p-6"
                >
                  <select
                    value={selectedMemberId}
                    onChange={(event) =>
                      setSelectedMemberId(event.target.value)
                    }
                    required
                    className="w-full rounded border p-2"
                  >
                    <option value="">
                      Select member
                    </option>

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
                    className="w-full rounded border p-2"
                  >
                    <option value="">
                      Select book
                    </option>

                    {books.map((book) => (
                      <option
                        key={book.id}
                        value={book.id}
                      >
                        {book.title} — {book.number_of_copies} copies
                      </option>
                    ))}
                  </select>

                  <label className="block">
                    <span className="mb-1 block text-sm">
                      Issue date
                    </span>

                    <input
                      type="date"
                      value={issuedDate}
                      onChange={(event) =>
                        setIssuedDate(event.target.value)
                      }
                      required
                      className="w-full rounded border p-2"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm">
                      Due date
                    </span>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(event.target.value)
                      }
                      required
                      className="w-full rounded border p-2"
                    />
                  </label>

                  <button
                    type="submit"
                    className="w-full rounded bg-black px-4 py-2 text-white"
                  >
                    Issue Book
                  </button>

                  {loanMessage && (
                    <p className="text-sm">
                      {loanMessage}
                    </p>
                  )}
                </form>
              </section>
            </>
          )}

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">
              Books
            </h2>

            {deleteMessage && (
              <p className="mt-4 text-sm">
                {deleteMessage}
              </p>
            )}

            {books.length === 0 ? (
              <p className="mt-4">
                No books available.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {books.map((book) => (
                  <article
                    key={book.id}
                    className="rounded-lg border p-4"
                  >
                    {editingBookId === book.id ? (
                      <form
                        onSubmit={handleUpdateBook}
                        className="space-y-4"
                      >
                        <h3 className="text-xl font-semibold">
                          Edit Book
                        </h3>

                        <input
                          type="text"
                          placeholder="Book title"
                          value={editTitle}
                          onChange={(event) =>
                            setEditTitle(event.target.value)
                          }
                          required
                          className="w-full rounded border p-2"
                        />

                        <input
                          type="text"
                          placeholder="Author"
                          value={editAuthor}
                          onChange={(event) =>
                            setEditAuthor(event.target.value)
                          }
                          required
                          className="w-full rounded border p-2"
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
                          className="w-full rounded border p-2"
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
                          className="w-full rounded border p-2"
                        />

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="rounded bg-black px-4 py-2 text-white"
                          >
                            Save Changes
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditingBook}
                            className="rounded border px-4 py-2"
                          >
                            Cancel
                          </button>
                        </div>

                        {editMessage && (
                          <p className="text-sm">
                            {editMessage}
                          </p>
                        )}
                      </form>
                    ) : (
                      <>
                        <h3 className="text-xl font-semibold">
                          {book.title}
                        </h3>

                        <p className="mt-1">
                          Author: {book.author}
                        </p>

                        <p className="mt-1">
                          Copies: {book.number_of_copies}
                        </p>

                        <p className="mt-1">
                          Value: ₹
                          {(book.book_value_paise / 100).toFixed(
                            2,
                          )}
                        </p>

                        {role === "librarian" && (
                          <div className="mt-4 flex gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                startEditingBook(book)
                              }
                              className="rounded bg-black px-4 py-2 text-white"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDeleteBook(book)
                              }
                              className="rounded border px-4 py-2"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">
              {role === "librarian"
                ? "All Loans"
                : "My Loans"}
            </h2>

            {returnMessage && (
              <p className="mt-4 text-sm">
                {returnMessage}
              </p>
            )}

            {loans.length === 0 ? (
              <p className="mt-4">
                {role === "librarian"
                  ? "There are currently no loans."
                  : "You currently have no loans."}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {loans.map((loan) => {
                  const book = books.find(
                    (item) => item.id === loan.book_id,
                  );

                  const lateFeePaise = getLateFeePaise(
                    loan,
                    book,
                  );

                  return (
                    <article
                      key={loan.id}
                      className="rounded-lg border p-4"
                    >
                      <h3 className="text-xl font-semibold">
                        {getBookTitle(loan.book_id)}
                      </h3>

                      <p className="mt-1">
                        Issued: {loan.issued_date}
                      </p>

                      <p className="mt-1">
                        Due: {loan.due_date}
                      </p>

                      <p className="mt-1">
                        Status:{" "}
                        {loan.returned_date
                          ? `Returned on ${loan.returned_date}`
                          : "Not returned"}
                      </p>

                      <p className="mt-1">
                        Late fee: ₹
                        {(lateFeePaise / 100).toFixed(2)}
                      </p>

                      {role === "librarian" &&
                        !loan.returned_date && (
                          <button
                            type="button"
                            onClick={() =>
                              handleReturnBook(loan)
                            }
                            className="mt-4 rounded bg-black px-4 py-2 text-white"
                          >
                            Return Book
                          </button>
                        )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}