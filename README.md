# Department Library Tracker

A role-based library management application built with Next.js, TypeScript, and Supabase.

## Features

- Supabase authentication
- Two user roles:
  - Member
  - Librarian
- Book management
- Book issuing and returning
- Copy availability enforcement
- Late-fee calculation
- Row Level Security (RLS)
- Role-based access control
- Automated late-fee tests
- Responsive dashboard

## Tech Stack

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- Tailwind CSS
- Vitest

## Data Model

### Profiles

The `profiles` table stores application-specific information for authenticated users.

| Column | Description |
|---|---|
| `id` | References `auth.users(id)` |
| `full_name` | User's full name |
| `role` | `member` or `librarian` |
| `created_at` | Profile creation timestamp |

New users are automatically created as members through a database trigger.

### Books

The `books` table stores library book information.

| Column | Description |
|---|---|
| `id` | Unique book identifier |
| `title` | Book title |
| `author` | Book author |
| `number_of_copies` | Total number of copies |
| `book_value_paise` | Book value stored in paise |
| `created_at` | Book creation timestamp |

Money is stored as an integer in minor units rather than using floating-point values.

Examples:

- 50000 paise = Rs. 500
- 2500 paise = Rs. 25

### Loans

The `loans` table records book issues.

| Column | Description |
|---|---|
| `id` | Unique loan identifier |
| `book_id` | References the issued book |
| `member_id` | References the borrowing member |
| `issued_date` | Date the book was issued |
| `due_date` | Date the book is due |
| `returned_date` | Date the book was returned |
| `created_at` | Loan creation timestamp |

## Relationships

```text
auth.users
    |
    | 1:1
    v
profiles
    |
    | 1:N
    v
loans
    |
    | N:1
    v
books