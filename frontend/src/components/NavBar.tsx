import { NavLink, useNavigate } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const links = [
    { to: '/movies', label: 'Dashboard' },
    { to: '/reports', label: 'Reports' },
    { to: '/predict', label: 'Predict' },
    { to: '/personality', label: 'Viewing Preferences' },
    { to: '/rating-patterns', label: 'Rating Patterns' },
    { to: '/user-movies', label: 'My Movies' },
];

export default function NavBar() {
    const username = localStorage.getItem('username');
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        navigate('/login');
    };
    
    return (
        <nav className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <span className="font-bold text-lg tracking-tight">MovieDB</span>
                    <div className="flex gap-4">
                        {links.map(({ to, label }) => (
                            <NavLink
                                key={to}
                                to={to}
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors px-2 py-1 rounded ${
                                        isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                    }`
                                }
                            >
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {username ? (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Hi, {username}
                            </span>
                            <button 
                                onClick={handleLogout} 
                                className="text-sm font-medium text-red-600 hover:text-red-500 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <NavLink 
                            to="/login" 
                            className={({ isActive }) =>
                                `text-sm font-medium transition-colors px-2 py-1 rounded ${
                                    isActive
                                        ? 'text-blue-600 dark:text-blue-400'
                                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                                }`
                            }
                        >
                            Login
                        </NavLink>
                    )}
                    <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 mx-1" />
                    <ThemeToggle />
                </div>
            </div>
        </nav>
    );
}