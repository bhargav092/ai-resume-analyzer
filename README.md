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

The API runs on port 3001 and the web app on port 5173.
The API can also be started directly with:

```bash
npm run dev --workspace apps/api
```

## Configuration

Copy `.env.example` files into `.env`. Set `JWT_SECRET` in every deployment. The default
`AI_PROVIDER=mock` is suitable for development and testing. Never put provider keys in
the React application.

The API reads `MONGODB_URI` from `apps/api/.env`. By default it connects to
`mongodb://localhost:27017/ai_resume_analyzer`; ensure MongoDB is running locally before
starting the API. `/health` reports the database connection state.
