import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import Layout from './Layout';
import MoviesListPage from '@/pages/MoviesListPage';
import MovieDetailPage from '@/pages/MovieDetailPage';
import PlaceholderPage from '@/pages/PlaceholderPage';
import PredictiveRatingsPage from '@/pages/PredictiveRatingsPage';
import PersonalityPage from '@/pages/PersonalityPage';
import RatingPatternsPage from '@/pages/RatingPatternsPage';
import ReportsPage from '@/pages/ReportsPage';
import LoginPage from '@/pages/LoginPage';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            { index: true, element: <Navigate to="/movies" replace /> },
            { path: 'movies', element: <MoviesListPage /> },
            { path: 'movie/:id', element: <MovieDetailPage /> },
            { path: 'predict', element: <PredictiveRatingsPage /> },
            { path: 'personality', element: <PersonalityPage /> },
            { path: 'reports', element: <PlaceholderPage title="Reports" /> },
            { path: 'rating-patterns', element: <RatingPatternsPage /> },
            { path: 'reports', element: <ReportsPage /> },
            { path: 'planner', element: <PlaceholderPage title="Planner" /> },
            { path: 'login', element: <LoginPage /> },
        ],
    },
]);

export default function Router() {
    return <RouterProvider router={router} />;
}