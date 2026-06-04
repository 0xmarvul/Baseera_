<p align="center">
  <img src="frontend/src/assets/logo.png" width="64" height="64" alt="Baseera" />
</p>

<h1 align="center">Baseera</h1>

<p align="center">
  <em>A passive web vulnerability scanner with an AI assistant — built as a graduation project.</em>
</p>

<p align="center">
  <a href="https://0xmarvul.github.io/Baseera/privacy-policy.html">Privacy Policy</a>
  ·
  <a href="docs/CHROME_WEBSTORE_SUBMISSION.md">Chrome Web Store</a>
  ·
  <a href="mailto:0xbaseera@gmail.com">Contact</a>
</p>

---

Baseera (meaning "insight" or "vision" in Arabic) helps developers and students discover, understand, and fix the most common classes of web vulnerabilities. It combines a Chrome extension that runs 28 passive scanners directly in the browser, an AI assistant that explains every finding in plain language, and a full-stack web dashboard for tracking scan history. The backend is built with C# .NET 8, the AI service with Python, and the frontend with React + Vite.

---

## Features

- 28 passive vulnerability scanners across Critical, High, Medium, and Low tiers
- AI-powered chatbot that explains every finding and answers security questions
- Chrome extension (Manifest V3) for one-click scanning of any website
- Real-time risk scoring and severity triage
- JWT-based authentication, scan history, and Bugs dashboard
- 100% client-side scanning — no requests sent, no page modifications, no tracking
- Configurable backend URLs via the extension's Options page

---

## Project Structure

```
backend/
  AIChatService/     -- Python-based AI chat microservice
  Application/       -- DTOs, interfaces, services, validators
  Core/              -- Domain entities and interfaces
  Infrastructure/    -- EF Core DbContext, migrations, repositories
  WebAPI/            -- ASP.NET Core controllers, middleware, entry point
  SecurityScanner.sln

frontend/
  src/
    api/             -- Axios API client configuration
    assets/          -- Images, icons, and static resources
    components/      -- Reusable components (Navbar, Footer, FloatingChat, ...)
    pages/           -- Page components (Home, Landing, Login, Register, Bugs, Profile, About, AIChatbot, ...)
  extension/         -- Chrome Extension (Manifest V3)
    manifest.json
    popup/           -- Extension popup UI
    background/      -- Service worker
    content/         -- Content script
    scanners/        -- 28 passive vulnerability scanners
    options/         -- Extension options page (configure backend URLs)
    config.js        -- Runtime config helper
    icons/           -- Extension icons
  index.html
  package.json
  vite.config.js

database/
  scripts/
    InitialSchema.sql

README.md
```

---

## Prerequisites

| Tool | Minimum Version |
|------|----------------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 8.0 |
| [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) | 2019+ (Express is fine) |
| [Python](https://www.python.org/downloads/) | 3.10+ |
| [Node.js](https://nodejs.org/) | 18+ (for the React frontend) |
| [npm](https://www.npmjs.com/) | 9+ |

---

## 1. Database Setup

### Option A – Using the SQL Script (recommended for first-time setup)

1. Open **SQL Server Management Studio (SSMS)** or **Azure Data Studio**.
2. Connect to your local SQL Server instance.
3. Open the file `database/scripts/InitialSchema.sql`.
4. Execute the script. It will:
   - Create the `SecurityScanner` database (if it does not exist).
   - Create the tables: `Users`, `Scans`, `Vulnerabilities`, `Reports`.
   - Create all required indexes.
   - Insert migration history so EF Core won't re-run the migrations.

### Option B – Using Entity Framework Core Migrations

```bash
cd backend

# Apply all pending migrations to create the database and tables
dotnet ef database update --project Infrastructure --startup-project WebAPI
```

> If `dotnet-ef` is not installed globally:
> ```bash
> dotnet tool install --global dotnet-ef
> ```

---

## 2. Backend Setup

### Connection String

The backend connects to SQL Server using Windows Authentication (Trusted Connection).  
The default connection string in `backend/WebAPI/appsettings.json` is:

```json
"DefaultConnection": "Server=(local);Database=SecurityScanner;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

If your SQL Server instance name is different (e.g., `.\SQLEXPRESS`), update `appsettings.json`:

```json
"DefaultConnection": "Server=.\\SQLEXPRESS;Database=SecurityScanner;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true"
```

### Run the Backend

```bash
cd backend/WebAPI
dotnet run
```

The API will start on **http://localhost:5000** (HTTP) and **https://localhost:5001** (HTTPS).

Swagger UI is available at: **http://localhost:5000/swagger**

---

## 3. Frontend Setup

### Configure API URL

The frontend reads the backend URL from an environment variable.  
Create (or verify) the file `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

A sample file `frontend/.env.example` is provided.

### Install Dependencies

```bash
cd frontend
npm install
```

### Run the Frontend

```bash
npm run dev
```

The app will be available at **http://localhost:5173**.

---

## 4. Running Both Servers

Open **two terminal windows**:

**Terminal 1 – Backend:**
```bash
cd backend/WebAPI
dotnet run
```

**Terminal 2 – Frontend:**
```bash
cd frontend
npm run dev
```

Then open your browser at `http://localhost:5173`.

---

## 5. API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Login and get JWT token | No |
| GET | `/api/scans` | List all scans for current user | Yes |
| POST | `/api/scans/extension` | Submit a scan from the extension | Yes |
| GET | `/api/scans/{id}` | Get scan details | Yes |
| GET | `/api/scans/{id}/vulnerabilities` | List vulnerabilities for a scan | Yes |
| POST | `/api/chat` | Ask the AI assistant a question | Yes |
| POST | `/api/contact` | Submit the contact form | No |

All protected endpoints require the header:
```
Authorization: Bearer <your-jwt-token>
```

---

## 6. CORS Configuration

The backend allows requests from:
- `http://localhost:3000`
- `http://localhost:5173` (Vite dev server)
- `chrome-extension://*` (Chrome Extension)

To add other origins, edit `backend/WebAPI/appsettings.json`:

```json
"Cors": {
  "AllowedOrigins": [
    "http://localhost:3000",
    "http://localhost:5173",
    "chrome-extension://*"
  ]
}
```

---

## 7. Troubleshooting

### `Invalid object name 'Users'`
The database tables have not been created yet. Run the SQL script or EF Core migrations (see **Section 1** above).

### `A network-related or instance-specific error occurred`
SQL Server is not running or the connection string is wrong. Check:
1. SQL Server service is running in **Services** or **SQL Server Configuration Manager**.
2. The `Server=` value in `appsettings.json` matches your instance name.
   - Default instance: `Server=(local)` or `Server=.`
   - Named instance: `Server=.\SQLEXPRESS` or `Server=localhost\SQLEXPRESS`

### Frontend cannot reach the backend
- Make sure the backend is running on port 5000.
- Check that `frontend/.env` contains `VITE_API_URL=http://localhost:5000/api`.
- Restart the frontend dev server after changing `.env`.

### JWT / Authentication errors
The JWT secret key is set in `appsettings.json`. Make sure both `appsettings.json` and `appsettings.Development.json` use the same key in production.

---

## Chrome Extension

The Baseera Security Scanner Chrome Extension allows passive vulnerability scanning of any web page and syncs results with your Baseera account.

### Extension Location

The 28 scanners are grouped by OWASP-aligned severity:

| Tier | Scanners |
|------|----------|
| **Critical** | SQL Injection, Command Injection, Exposed API Keys, Insecure Forms (Password over HTTP), XSS via `javascript:` URLs |
| **High** | Missing CSP, Weak CSP, Sensitive Files, Insecure Storage, Outdated Components, DOM-based XSS, Insecure postMessage, Session Token in URL, Reflected XSS, iframe `srcdoc` XSS, External Form Action (with password) |
| **Medium** | XSS code-smell (eval/innerHTML), Mixed Content, Clickjacking, Insecure Cookies, Missing SRI, CORS Misconfiguration, Debug Pages, Open Redirect, CSRF, Missing HSTS, Source Map Exposure, Directory Listing, External Form Action (no password) |
| **Low** | XSS inline event handlers, Deprecated HTML, Excessive Trackers, Sensitive Autocomplete, Version Disclosure, Missing X-Content-Type-Options, Missing Permissions-Policy, Missing Cross-Origin-Opener-Policy, Missing Referrer-Policy |

Each scanner lives in `frontend/extension/scanners/` as a standalone file. The runtime logic that actually runs in the page is inlined in `popup/popup.js`. See `frontend/extension/scanners/index.js` for the canonical registry.

### Installing the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `frontend/extension/` directory
5. The Baseera Security Scanner icon will appear in your Chrome toolbar

### Using the Extension

1. Navigate to any website you want to scan
2. Click the **Baseera** icon in the Chrome toolbar
3. Click **Scan Page** to run passive vulnerability detection
4. Review the results:
   - **Risk Score** (0–100) indicates overall page risk
   - Vulnerabilities are grouped by severity: Critical, High, Medium, Low
5. If you are logged in, click **Save to Account** to store results in your Baseera account

### Linking the Extension with Your Account

The extension stores your JWT token in Chrome's local storage after you log in via the Baseera web app. To link:

1. Open the Baseera web app (`http://localhost:5173`) and log in
2. The extension automatically detects the auth token (stored in `localStorage`)
3. Scan results submitted via **Save to Account** appear in your **Bugs** dashboard under the Vulnerabilities tab

> **Note:** The extension performs **passive scanning only** — it reads page content and DOM without modifying anything or making requests on your behalf.

