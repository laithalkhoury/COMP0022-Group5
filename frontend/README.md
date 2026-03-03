# COMP0022 Movie Catalogue Frontend

A React 18 + TypeScript frontend for browsing and searching a movie catalogue. Built with Vite, Tailwind CSS, and React Router.

## Setup

```bash
npm install
npm run dev
```

## Environment Variables `.env`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend REST API base URL |

## REST API Contract

### GET /movies

Query params (all optional): `title`, `dateFrom`, `dateTo`, `genres` (repeatable), `tag`, `ratingMin`, `ratingMax`, `sortBy` (rating|year|popularity|boxOffice|criticScore), `sortDir` (asc|desc), `page` (1-based), `size` (default 10).

Response: `{ items: MovieSummary[], page, size, total, totalPages }`

### GET /movies/:id

Response: `MovieDetail` — includes all summary fields plus `tags`, `director`, `actors`, `awards`, `boxOffice`, `criticScore`.

### GET /filters/options

Response: `{ genres: string[], tags: string[], awards: string[] }`

## Project Structure

```
src/
  app/         Router, Layout
  pages/       MoviesListPage, MovieDetailPage, PlaceholderPage
  components/  NavBar, ThemeToggle, FiltersBar, MovieCard, Pagination, Toast, ui
  api/         client.ts, movies.ts, filters.ts
  types/       dto.ts
  utils/       query.ts, scrollRestore.ts
```
