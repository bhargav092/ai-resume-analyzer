# Operations and deployment

## Required production configuration

- `NODE_ENV=production`
- A unique `JWT_SECRET` with at least 32 characters
- `MONGODB_URI` pointing to an authenticated MongoDB deployment
- `WEB_ORIGIN` set to the exact trusted web origin(s)
- `AI_PROVIDER=claude` or `AI_PROVIDER=openai`, plus `AI_API_KEY`
- `AI_MODEL` if using a non-default model
- `GOOGLE_CLIENT_ID` if Google sign-in is enabled
- SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) for email
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` for card, UPI, and QR payments

When a real AI provider is enabled, extracted resume text and the job description are
sent to that provider. Review the provider's data-processing terms and disclose this to
users before enabling it.

The API refuses a production startup with the mock provider or a missing/placeholder
JWT secret. Keep all secrets in the deployment platform's secret manager.

For Docker Compose, copy `.env.example` to the project-root `.env` and configure the
variables there. `VITE_GOOGLE_CLIENT_ID` is a public web build value; all other OAuth,
SMTP, and Razorpay credentials stay in the API environment. Enable QR Codes in the
Razorpay merchant account before using QR payments. QR payment requests are
single-use, fixed-amount codes; their expiry is provided by Razorpay and is at least
two minutes. Test the complete flow with Razorpay test credentials before production.

## S3 resume storage

S3 storage is optional. When configured, the API writes each uploaded file under a
random per-user object key with AES-256 server-side encryption. Do not enable public
access. Configure S3 Block Public Access and grant the API role only `s3:PutObject` and
`s3:DeleteObject` for the resume bucket/prefix. Prefer workload IAM roles over static
access keys.

The API deletes the stored object on user-requested analysis deletion and through the
daily retention job. The default is 90 days; configure `ANALYSIS_RETENTION_DAYS` to
change it. Failed S3 deletes are logged and the analysis record is retained for retry.

## MongoDB backups

Use managed MongoDB backups for production. For a local manual backup, use `mongodump`
with the deployment URI and protect the resulting archive as sensitive personal data:

```bash
mongodump --uri="$MONGODB_URI" --archive=resume-analyzer.archive.gz --gzip
```

Test restore procedures regularly. Never store backup archives in the web application's
public directory or commit them to source control.

## Health and logs

`GET /health` reports API and MongoDB connectivity. NestJS's built-in logger reports
startup and scheduled-retention failures. Configure platform-level log retention,
alerting, and uptime monitoring for deployed instances.
