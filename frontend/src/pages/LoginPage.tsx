import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/api/client';

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const endpoint = isLogin ? '/api/login' : '/api/register';
        
        try {
            const data = await apiFetch<{ token?: string; username: string }>(
                endpoint, 
                undefined, 
                'POST', 
                { username, password }
            );

            if (isLogin && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('username', data.username);
                navigate('/user-movies');
            } else {
                setIsLogin(true);
                setError('Account created! Please log in.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="p-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm max-w-md w-full">
                <h1 className="text-2xl font-bold mb-6 text-center">
                    {isLogin ? 'Login' : 'Create Account'}
                </h1>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Username</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full p-2 border rounded dark:bg-gray-900 dark:border-gray-600"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Register'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                        {isLogin ? "Don't have an account? Register" : 'Already have an account? Login'}
                    </button>
                </div>
            </div>
        </div>
    );
}