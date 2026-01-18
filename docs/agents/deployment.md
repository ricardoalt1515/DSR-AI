## Deployment

### Backend
```bash
# Build Docker image
cd backend

### Frontend
- Build via `npm run build` (deploy pipeline handles hosting).

### Notes
- Backend and frontend deploy independently; keep versions aligned via atomic commits in the monorepo.
