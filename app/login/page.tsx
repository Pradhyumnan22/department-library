"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    const supabase = createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[#f6f3ed] text-stone-900">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6 py-12">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-stone-200 bg-white shadow-2xl shadow-stone-300/30 lg:grid-cols-2">
          <section className="relative hidden overflow-hidden bg-[#173a31] p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#d9b66f]/20" />
            <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-white/5" />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9b66f] text-2xl text-[#173a31]">
                  📚
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#cbd8d2]">
                    Department
                  </p>
                  <h1 className="text-xl font-semibold">Library</h1>
                </div>
              </div>

              <div className="mt-20 max-w-md">
                <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#d9b66f]">
                  Library Management
                </p>
                <h2 className="mt-4 text-4xl font-semibold leading-tight">
                  Everything your library needs, in one place.
                </h2>
                <p className="mt-5 text-base leading-7 text-[#d4dfda]">
                  Manage books, members, loans, returns and late fees through
                  one simple workspace.
                </p>
              </div>
            </div>

            <p className="relative text-sm text-[#b8c9c1]">
              Department Library Tracker
            </p>
          </section>

          <section className="p-7 sm:p-10 lg:p-12">
            <div className="mx-auto max-w-md">
              <div className="lg:hidden">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173a31] text-xl text-white">
                    📚
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-stone-500">
                      Department
                    </p>
                    <h1 className="font-semibold text-stone-900">Library</h1>
                  </div>
                </div>
              </div>

              <div className="mt-8 lg:mt-0">
                <p className="text-sm font-medium text-[#8a6a2f]">
                  Welcome back
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                  Sign in to your library
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-500">
                  Access your books and loan activity.
                </p>
              </div>

              <form onSubmit={handleLogin} className="mt-8 space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#173a31] focus:bg-white focus:ring-4 focus:ring-[#173a31]/10"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-[#173a31] focus:bg-white focus:ring-4 focus:ring-[#173a31]/10"
                  />
                </div>

                {message && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#173a31] px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#173a31]/15 transition hover:bg-[#214b3f] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </button>
              </form>

              <div className="mt-7 border-t border-stone-200 pt-6 text-center text-sm text-stone-500">
                Don't have an account?{" "}
                <Link
                  href="/signup"
                  className="font-semibold text-[#173a31] hover:underline"
                >
                  Create one
                </Link>
              </div>

              <Link
                href="/"
                className="mt-4 block text-center text-xs font-medium text-stone-400 hover:text-stone-700"
              >
                Back to home
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
