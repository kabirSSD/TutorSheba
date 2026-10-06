Live link: https://kabirssd.github.io/TutorSheba/

# TuitionHub

A tutor finder web app built with Node.js, HTML, CSS (Bootstrap), JavaScript, and **MySQL**. Students search tutors and send requests; tutors accept or reject; admin approves tutors and moderates.

## Features
- **MySQL Database Support**: Connects to MySQL with automatic schema creation, tables for `users`, `requests`, and `reviews`.
- **MySQL Workbench Compatible**: View and query tables directly inside MySQL Workbench (`tuitionhub_db`).
- **Resilient Fallback**: Automatically falls back to local JSON storage if MySQL is stopped or unconfigured.
- Register / login with roles: student, tutor, admin (passwords stored as SHA-256 hashes).
- Search and filter tutors by subject, location, fee, and mode.
- Tuition requests: send, accept, reject, cancel.
- Reviews and ratings.
- Admin panel: approve tutors, delete users and reviews, statistics.
- Responsive on mobile, tablet, and laptop.

## MySQL Configuration

Configure database settings in `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tuitionhub_db
```

### Database Schema
The database schema is defined in [`schema.sql`](schema.sql):
- `users`: stores accounts (students, tutors, admin)
- `requests`: tuition proposals and booking requests
- `reviews`: tutor ratings and feedback

The backend automatically creates `tuitionhub_db` and all tables on startup if they do not exist. You can also execute [`schema.sql`](schema.sql) directly in MySQL Workbench.

## How to Run

1. Make sure your MySQL Server is running on port 3306.
2. Put your MySQL password in `.env`.
3. Start the server:

```bash
npm start
```

4. Open `http://localhost:3000` in your browser.
5. Check database connection status anytime at `http://localhost:3000/api/db-status`.

## Demo accounts
| Role | Email | Password |
|---|---|---|
| Admin | admin@tuitionhub.com | admin123 |
| Tutor | rahim@mail.com | tutor123 |

Register a new account to try the student role.
