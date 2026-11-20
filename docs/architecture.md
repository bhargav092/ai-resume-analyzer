# Architecture

The MVP uses a modular monolith:

- React client for uploads, job descriptions, statuses and results
- NestJS API for authentication, validation, parsing and orchestration
- A provider interface behind the mock or configured LLM provider
- MongoDB for application metadata (production integration)
- S3 for original private resume documents (production integration)
- Docker for local and deployment packaging

The LLM is never the source of truth for file safety, arithmetic or exact skill appearance.
