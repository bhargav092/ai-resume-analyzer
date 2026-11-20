# AI Resume Analyzer

An evidence-backed resume-to-job-description analysis application.

## Structure

- `apps/web` - React and TypeScript client
- `apps/api` - NestJS modular API
- `infrastructure` - Docker and AWS configuration
- `docs` - Architecture and API documentation

## Development

```bash
npm install
npm run dev
```

Copy the templates before starting:

```bash
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env
```

The API uses `mongodb://localhost:27017/ai_resume_analyzer` by default and the web app
runs on port 5173. To use Docker Compose, first copy `.env.example` to the project-root
`.env`, set any Google, SMTP, Razorpay, or production secrets there, then run
`docker compose up --build`.

## Configuration

Set a unique `JWT_SECRET` of at least 32 characters outside development. Development
uses an ephemeral secret when one is not configured, so active sessions expire on API
restart. `AI_PROVIDER=mock` is development-only; production requires `claude` or `openai`
and an `AI_API_KEY`. Never put provider keys in the React application.

`MONGODB_URI` is read by the API from `apps/api/.env`. Analysis records are private to
their owner and retained for 90 days by default (`ANALYSIS_RETENTION_DAYS`).

New accounts receive a 24-hour free trial. The Subscription navigation item shows
the trial status and these INR plans: ₹99 for 7 days, ₹199 for 1 month, ₹299 for
3 months, or ₹499 for 1 year. Razorpay payments are enabled only when
`RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set in `apps/api/.env`; keep the
secret on the API server and never add it to the web app. Use Razorpay test keys
while developing. Card and UPI use Razorpay Checkout; QR uses a single-use,
fixed-amount Razorpay QR code and activates the subscription only after the API
confirms a captured payment. Razorpay QR Codes must be enabled for the merchant
account. QR expiry follows Razorpay's returned expiry time (at least two minutes).
Trial-expiry notices are dismissible and do not block workspace use.

Google sign-in requires the same public OAuth web Client ID in
`VITE_GOOGLE_CLIENT_ID` (`apps/web/.env`) and `GOOGLE_CLIENT_ID` (`apps/api/.env`).
Add each web origin to the OAuth client's authorized JavaScript origins. Email
notifications use SMTP; configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
`SMTP_PASSWORD`, and `SMTP_FROM` on the API. A welcome email is attempted once
when the account first authenticates, and a payment email is sent only after the
API verifies a captured Razorpay payment. The app does not store card details.

Protected API endpoints use `Authorization: Bearer <accessToken>`. Available routes are
`POST /auth/register`, `POST /auth/login`, `POST /auth/google`, `GET /auth/me`, `GET /auth/settings`,
`GET /subscriptions/status`, `POST /subscriptions/orders`, `POST /subscriptions/verify`,
`POST /subscriptions/qr-codes`, and `GET /subscriptions/qr-codes/:id/status`,
`POST /analyses` (multipart fields `resume` and `jobDescription`), `GET /analyses`,
`GET /analyses/:id`, `GET /analyses/:id/export`, and `DELETE /analyses/:id`.

Resume files are processed in memory and discarded after analysis unless
`S3_RESUME_BUCKET` is configured. When enabled, objects are stored with server-side
encryption and removed with their analysis or by the retention job. Enable S3 Block
Public Access and grant the API identity only the required bucket object permissions.

The first OCR run may download Tesseract's English language data. OCR runs locally in the
API and processes at most the first five PDF pages.

See [docs/operations.md](./docs/operations.md) for deployment, S3, and backup guidance.
