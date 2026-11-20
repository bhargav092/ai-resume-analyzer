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
runs on port 5173. To use the Docker Compose MongoDB instance, run `docker compose up --build`.

## Configuration

Set a unique `JWT_SECRET` of at least 32 characters outside development. Development
uses an ephemeral secret when one is not configured, so active sessions expire on API
restart. `AI_PROVIDER=mock` is development-only; production requires `claude` or `openai`
and an `AI_API_KEY`. Never put provider keys in the React application.

`MONGODB_URI` is read by the API from `apps/api/.env`. Analysis records are private to
their owner and retained for 90 days by default (`ANALYSIS_RETENTION_DAYS`).

Protected API endpoints use `Authorization: Bearer <accessToken>`. Available routes are
`POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /auth/settings`,
`POST /analyses` (multipart fields `resume` and `jobDescription`), `GET /analyses`,
`GET /analyses/:id`, `GET /analyses/:id/export`, and `DELETE /analyses/:id`.

Resume files are processed in memory and discarded after analysis unless
`S3_RESUME_BUCKET` is configured. When enabled, objects are stored with server-side
encryption and removed with their analysis or by the retention job. Enable S3 Block
Public Access and grant the API identity only the required bucket object permissions.

The first OCR run may download Tesseract's English language data. OCR runs locally in the
API and processes at most the first five PDF pages.

See [docs/operations.md](./docs/operations.md) for deployment, S3, and backup guidance.
