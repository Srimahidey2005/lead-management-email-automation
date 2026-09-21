# Lead Management & Email Automation Dashboard

This project is a professional, full-stack Next.js application built as an internship assignment to demonstrate API integration, safe data management, and Gmail-based email automation.

## 🚀 Project Overview

The core objective of this application is to manage leads (specifically buyers interested in singing bowls) sourced from various platforms and to securely send them a presentation via an authenticated Gmail integration. 

The application emphasizes data privacy, strict eligibility checks, OAuth 2.0 security, and a highly polished, production-ready user interface suitable for a modern SaaS environment.

## ✨ Core Features

* **Lead Management:** View, search, and filter leads with visual indicators for eligibility and status.
* **Safe CSV Import:** Drag-and-drop CSV upload with client-side parsing (`papaparse`) and strict schema validation (`zod`). Prevents invalid data from entering the system.
* **Gmail Integration:** Secure OAuth 2.0 flow via `next-auth`. The application uses the `https://www.googleapis.com/auth/gmail.send` scope to send emails without ever asking for or storing user passwords.
* **Campaign Composer:** A dedicated interface to draft emails, attach a presentation, and dispatch campaigns exclusively to "Eligible" leads.
* **Modern UI/UX:** Built with Tailwind CSS and Lucide Icons, featuring responsive design, empty states, loading spinners, and clear error/success feedback.

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router)
* **Language:** TypeScript
* **Styling:** Tailwind CSS
* **Authentication:** NextAuth.js (Auth.js) / Google OAuth 2.0
* **Data Handling:** PapaParse (CSV), Zod (Validation)
* **Icons:** Lucide React

## 📂 Folder Structure

```
├── public/
│   └── sample-leads.csv         # Sample data for testing the import flow
├── src/
│   ├── app/                     # Next.js App Router pages and API routes
│   │   ├── api/auth/[...nextauth]/  # OAuth 2.0 handlers
│   │   ├── api/campaigns/send/  # Gmail send endpoint (server-side)
│   │   ├── campaigns/           # Email composer and dispatch UI
│   │   ├── import/              # CSV upload and validation UI
│   │   ├── login/               # Google sign-in page
│   │   ├── leads/               # Lead data table and filtering UI
│   │   ├── settings/            # Gmail connection management
│   │   └── templates/           # Starter email templates
│   ├── lib/                     # CSV, validation, Gmail MIME, config helpers
│   ├── components/layout/       # Reusable UI components (Sidebar, Header)
│   ├── data/                    # Mock data stores for demonstration
│   └── types/                   # TypeScript interfaces (Lead, Campaign, etc.)
└── .env.example                 # Environment variable templates
```

## ⚙️ Setup Instructions

### 1. Clone & Install
```bash
git clone <repository-url>
cd <repository-directory>
npm install
```

### 2. Environment Variables
Copy the example environment file and fill in the required credentials.
```bash
cp .env.example .env.local
```

You will need to configure:
* `GOOGLE_CLIENT_ID`
* `GOOGLE_CLIENT_SECRET`
* `NEXTAUTH_URL=http://localhost:3000`
* `NEXTAUTH_SECRET` (Run `openssl rand -base64 32` to generate a secure secret)
* `ALLOWED_EMAILS` (optional, comma-separated Google accounts allowed to sign in; recommended)

**Demo mode:** if the Google values are missing or still the placeholders from `.env.example`, the app runs in *demo mode*: no login is required, labelled sample leads are shown, and campaign sends are validated but **never emailed** (the UI says so). Google sign-in and real sending turn on automatically once real credentials are set.

**With credentials configured**, all pages and API routes require sign-in. Unauthenticated visitors are redirected to the **Login** page (`/login`), which starts the Google OAuth flow; after signing in they return to the page they originally requested. OAuth tokens are kept in NextAuth's encrypted, httpOnly cookie and are never exposed to browser JavaScript. Never commit `.env.local` (it is git-ignored; only `.env.example` is tracked).

### 3. Google OAuth Configuration (For API Access)
To fully test the Gmail integration:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project and enable the **Gmail API**.
3. Configure the OAuth Consent Screen (add yourself as a Test User).
4. Create **OAuth 2.0 Client IDs** (Web Application).
5. Add `http://localhost:3000` to Authorized JavaScript origins.
6. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs.
7. Copy the generated Client ID and Client Secret into your `.env.local`.

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🧪 Testing

```bash
npx tsc --noEmit        # TypeScript
npm run lint            # ESLint
npm run build && npm start   # production build
```

Behaviour covered by the checks run during development: CSV import validation (case-insensitive headers, duplicates, invalid rows, size/row limits), CSV export (formula-injection safe), dashboard statistics derived from data, lead search/filter/pagination logic, Gmail MIME building (header-injection safe), the `/api/campaigns/send` route (auth, validation, partial failures, token refresh) against a mocked Gmail API, route protection in demo and configured modes, and server-rendering of every page. Real Gmail delivery requires your own Google credentials and should be verified manually with a test account.

## ⚠️ Known Limitations & Demo Mode

* **Persistence:** there is no database. Leads, campaigns and activity are kept in the browser's `localStorage` (this browser only). Clearing site data resets the app. In demo mode the app starts with labelled sample leads; with real credentials it starts empty.
* **Demo Send Mode:** without valid Google OAuth credentials the campaign "send" only validates the campaign and records a *Demo* entry. No email is sent and the dashboard's "Emails Sent" is not increased.
* **Sending limits:** up to 100 recipients per campaign and a 10 MB PDF/PowerPoint attachment; emails are sent one by one through the Gmail API, so Gmail's own daily sending limits apply.

## 🔮 Future Improvements

1. **Database Integration:** Swap the mock data store with Prisma + PostgreSQL for persistent lead management.
2. **Webhooks:** Integrate Gmail API webhooks to track email open rates and bounce statuses in real-time.
3. **Sync across devices:** persist leads server-side instead of browser storage.
