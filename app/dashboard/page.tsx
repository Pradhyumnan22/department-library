"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

export default function DashboardPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [message, setMessage] = useState("Loading...");

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

      const { data: booksData, error: booksError } = await supabase
        .from("books")
        .select(
          "id, title, author, number_of_copies, book_value_paise"
        )
        .order("title");

      if (booksError) {
        setMessage(booksError.message);
        return;
      }

      const { data: loansData, error: loansError } = await supabase
        .from("loans")
        .select(
          "id, book_id, issued_date, due_date, returned_date"
        )
        .order("issued_date", { ascending: false });

      if (loansError) {
        setMessage(loansError.message);
        return;
      }

      setBooks(booksData);
      setLoans(loansData);
      setMessage("");
    }

    loadDashboard();
  }, [router]);

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

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold">Library Dashboard</h1>

      {email && (
        <p className="mt-2">
          Logged in as: <strong>{email}</strong>
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

      {message && <p className="mt-6">{message}</p>}

      {!message && (
        <>
          <section className="mt-8">
            <h2 className="text-2xl font-semibold">Books</h2>

            {books.length === 0 ? (
              <p className="mt-4">No books available.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {books.map((book) => (
                  <article
                    key={book.id}
                    className="rounded-lg border p-4"
                  >
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
                      Value: ₹{(book.book_value_paise / 100).toFixed(2)}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-2xl font-semibold">My Loans</h2>

            {loans.length === 0 ? (
              <p className="mt-4">
                You currently have no loans.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {loans.map((loan) => (
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
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}