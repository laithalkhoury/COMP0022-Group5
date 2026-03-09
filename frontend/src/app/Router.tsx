import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './Layout';
import MoviesListPage from '@/pages/MoviesListPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import PlaceholderPage from '@/pages/PlaceholderPage';
import PredictiveRatingsPage from '@/pages/PredictiveRatingsPage';
import RatingPatternsPage from '@/pages/RatingPatternsPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <Navigate to="/movies" replace /> },
            { path: 'movies', element: <MoviesListPage /> },
            { path: 'movie/:id', element: <MovieDetailPage /> },
            { path: 'predict', element: <PredictiveRatingsPage /> },
            { path: 'rating-patterns', element: <RatingPatternsPage /> },
            { path: 'reports', element: <PlaceholderPage title="Reports" /> },
            { path: 'planner', element: <PlaceholderPage title="Planner" /> },
            { path: 'login', element: <PlaceholderPage title="Login" /> },
        ],
    },
]);

export default function Router() {
    return <RouterProvider router={router} />;
}
