# Architecture

The app uses a modular monolith:

- React client for uploads, job descriptions, statuses and results
- NestJS API for authentication, validation, parsing, authorization and orchestration
- MongoDB for users and owner-scoped analysis records
- Optional private S3 storage for uploaded resumes
- A provider interface for local keyword matching or configured Claude/OpenAI analysis
- Docker Compose for local MongoDB/API/web development

Resume text and job descriptions are treated as untrusted input. AI response structure
is validated, quoted resume evidence is checked against extracted text, and coverage is
computed by the server rather than trusted from the model. The score is a coverage
indicator, not a hiring prediction.
