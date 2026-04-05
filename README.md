# light-date-poll

A streamlined date poll app for quick group scheduling. See
[SPEC_ja.md](./SPEC_ja.md) for the specification (Japanese).

## Local development

```bash
npm ci
DATABASE_URL=postgresql://... npm start
```

With Docker:

```bash
docker build -t light-date-poll .
docker run -p 3000:3000 -e DATABASE_URL=postgresql://... light-date-poll
```

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `PORT` | No | Listen port (default: 3000) |
| `DATABASE_SSL` | No | Set to `false` to disable SSL |

## Deployment

- AWS Lambda + Neon: see [docs/aws-deploy.md](./docs/aws-deploy.md)
