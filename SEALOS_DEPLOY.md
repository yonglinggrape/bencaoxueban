# Sealos Deployment

This project is a Next.js full-stack app and should be deployed on Sealos as a single Docker service with a persistent SQLite volume.

## Runtime Settings

- Build source: GitHub repository
- Build method: root `Dockerfile`
- Container port: `3000`
- Replicas: `1`
- Persistent volume mount: `/app/data`

Required environment variables:

```env
DATABASE_URL=file:/app/data/dev.db
AUTH_SECRET=<fixed-long-random-secret>
AUTH_TRUST_HOST=true
DEEPSEEK_API_KEY=<your-deepseek-key>
```

Optional:

```env
DEEPSEEK_MODEL=deepseek-v4-flash
```

## Database Import

To make Sealos match local functionality and local seed data, import the local SQLite database:

1. Stop the Sealos app.
2. Download and keep a backup of the current `/app/data/dev.db`.
3. Upload local `dev.db` from the project root to `/app/data/dev.db`.
4. Start or redeploy the app.

The startup script runs `prisma db push` and seeds when the herb catalog is empty or incomplete, so deployed services receive the full 本草药典 card and detail data automatically.
The seed scripts read `DATABASE_URL`, so startup schema sync and startup seed target the same SQLite file.

Expected local baseline:

- `HerbCard`: 429 rows
- `Question`: 194 rows
- `Topic`: 18 rows
- `KnowledgeDomain`: 1 row

## Verification

After deploy, verify:

- The home page opens.
- Register/login works.
- Collection shows the herb catalog.
- Quiz and progress writes persist after restart.
- Logs contain:
  - `[startup] Syncing Prisma schema...`
  - `[startup] Existing herb data found`
  - `Next.js ... Ready`
