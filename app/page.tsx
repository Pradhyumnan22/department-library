import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f6f3ed] text-stone-900">
      <nav className="border-b border-stone-200 bg-white/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#173a31] text-xl text-white">
              📚
            </span>
            <span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                Department
              </span>
              <span className="block text-lg font-semibold text-stone-900">
                Library
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-100"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-xl bg-[#173a31] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#173a31]/15 hover:bg-[#214b3f]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d9b66f]/40 bg-[#d9b66f]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a2f]">
              📖 Department Library Tracker
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-stone-900 sm:text-6xl">
              A simpler way to manage your library.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-500">
              Manage your collection, members, book loans, returns and late
              fees from one clean workspace built for your department.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/login"
                className="rounded-xl bg-[#173a31] px-6 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[#173a31]/15 hover:bg-[#214b3f]"
              >
                Open Library
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-stone-300 bg-white px-6 py-3.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
              >
                Create Account
              </Link>
              <Link
                href="/dashboard"
                className="rounded-xl px-4 py-3.5 text-sm font-semibold text-[#173a31] hover:bg-white"
              >
                Go to Dashboard →
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-[#d9b66f]/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] bg-[#173a31] p-7 text-white shadow-2xl shadow-[#173a31]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#b8c9c1]">
                    Library workspace
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Everything in view.
                  </h2>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#d9b66f] text-2xl text-[#173a31]">
                  📚
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-xs text-[#b8c9c1]">Collection</p>
                  <p className="mt-2 text-2xl font-semibold">Books</p>
                  <p className="mt-1 text-xs text-[#b8c9c1]">
                    Organized catalogue
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-xs text-[#b8c9c1]">Loans</p>
                  <p className="mt-2 text-2xl font-semibold">Tracked</p>
                  <p className="mt-1 text-xs text-[#b8c9c1]">
                    Due dates & returns
                  </p>
                </div>
                <div className="rounded-2xl bg-white/10 p-5">
                  <p className="text-xs text-[#b8c9c1]">Security</p>
                  <p className="mt-2 text-2xl font-semibold">RLS</p>
                  <p className="mt-1 text-xs text-[#b8c9c1]">
                    Role-based access
                  </p>
                </div>
                <div className="rounded-2xl bg-[#d9b66f] p-5 text-[#173a31]">
                  <p className="text-xs opacity-70">Fees</p>
                  <p className="mt-2 text-2xl font-semibold">₹5/day</p>
                  <p className="mt-1 text-xs opacity-70">
                    Capped at book value
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 grid gap-4 border-t border-stone-200 pt-8 sm:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-stone-900">
              For librarians
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Manage books and control the complete loan lifecycle.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">
              For members
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              View your own loans and current return information.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-900">
              Built for the department
            </p>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Clean authentication, RLS protection and tested fee logic.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
