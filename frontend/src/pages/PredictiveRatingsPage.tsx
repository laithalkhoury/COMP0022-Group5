import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFilterOptions } from '@/api/filters';
import { getPrediction } from '@/api/predictions';
import type { FilterOptions, PredictionResponse } from '@/types/dto';
import { Spinner, ErrorPanel } from '@/components/ui';

export default function PredictiveRatingsPage() {
    const navigate = useNavigate();
    const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
    const [loadingOptions, setLoadingOptions] = useState(true);
    
    const [title, setTitle] = useState('');
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [tags, setTags] = useState('');

    const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
    const [isPredicting, setIsPredicting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getFilterOptions()
            .then(setFilterOptions)
            .finally(() => setLoadingOptions(false));
    }, []);

    const handlePredict = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedGenres.length === 0) {
            alert('Please select at least one genre');
            return;
        }
        
        setIsPredicting(true);
        setError(null);
        try {
            const res = await getPrediction({
                title,
                genres: selectedGenres,
                release_year: parseInt(year),
                tags: tags.split(',').map(t => t.trim()).filter(t => t !== '')
            });
            setPrediction(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Prediction failed');
        } finally {
            setIsPredicting(false);
        }
    };

    const toggleGenre = (g: string) => {
        setSelectedGenres(prev => 
            prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
        );
    };

    if (loadingOptions) return <div className="flex justify-center py-20"><Spinner /></div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 px-4">
            <header>
                <h1 className="text-2xl font-bold">Launch Strategy: Predictive Analysis</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Simulate audience response for upcoming titles using a preview panel of genre experts.
                </p>
            </header>

            <form onSubmit={handlePredict} className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Movie Title</label>
                        <input 
                            type="text" required value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="e.g. Inception 2"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Planned Release Year</label>
                        <input 
                            type="number" required value={year} onChange={e => setYear(e.target.value)}
                            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Metadata Tags (Comma separated)</label>
                    <textarea 
                        value={tags} 
                        onChange={e => setTags(e.target.value)}
                        placeholder="e.g. atmospheric, space, thought-provoking"
                        className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-transparent h-24 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    />
                </div>

                <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Target Genres</label>
                    <div className="flex flex-wrap gap-2 p-1">
                        {filterOptions?.genres.map(g => (
                            <button
                                key={g} type="button" onClick={() => toggleGenre(g)}
                                className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                    selectedGenres.includes(g) 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-blue-400'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    type="submit" disabled={isPredicting}
                    className="w-full md:w-auto px-10 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                >
                    {isPredicting ? 'Analysing...' : 'Generate Prediction'}
                </button>
            </form>

            <div className="mt-12">
                {error && <ErrorPanel message={error} onRetry={() => {}} />}
                
                {isPredicting && (
                    <div className="flex flex-col items-center justify-center py-20 space-y-4">
                        <Spinner />
                        <p className="text-sm text-gray-500 animate-pulse font-medium">Consulting Genre Experts...</p>
                    </div>
                )}

                {prediction && (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl p-10 shadow-xl space-y-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold">{prediction.title}</h2>
                                    <p className="text-sm text-gray-500 italic uppercase tracking-wider font-semibold">Simulated performance report</p>
                                </div>
                                <div className={`self-start px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${
                                    prediction.confidence === 'High' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                }`}>
                                    Confidence: {prediction.confidence}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl text-center border border-blue-100 dark:border-blue-800/30">
                                    <div className="text-5xl font-black text-blue-600 dark:text-blue-400">{prediction.mean.toFixed(1)}</div>
                                    <div className="text-xs uppercase text-gray-400 font-bold tracking-widest mt-2">Predicted Mean Rating</div>
                                </div>
                                <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl text-center border border-orange-100 dark:border-orange-800/30">
                                    <div className="text-5xl font-black text-orange-500 dark:text-orange-400">±{prediction.uncertainty.toFixed(2)}</div>
                                    <div className="text-xs uppercase text-gray-400 font-bold tracking-widest mt-2">Predicted Uncertainty</div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6">
                                <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-tighter px-1">
                                    <span>Failure (0.5)</span>
                                    <span>Average (2.5)</span>
                                    <span>Hit (5.0)</span>
                                </div>
                                <div className="relative h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div 
                                        className="absolute h-full bg-blue-500/20 dark:bg-blue-400/20 transition-all duration-1000 ease-out"
                                        style={{ 
                                            left: `${Math.max(0, (prediction.mean - prediction.uncertainty) * 20)}%`,
                                            right: `${Math.max(0, 100 - (prediction.mean + prediction.uncertainty) * 20)}%`
                                        }}
                                    />
                                    <div 
                                        className="absolute h-full w-1.5 bg-blue-600 dark:bg-blue-400 shadow-[0_0_12px_rgba(37,99,235,0.8)] transition-all duration-1000 ease-out"
                                        style={{ left: `${prediction.mean * 20}%` }}
                                    />
                                </div>
                                <p className="text-xs text-center text-gray-400 font-medium">
                                    Based on {prediction.sample_size} ratings from the expert panel.
                                </p>
                            </div>
                        </div>

                        {prediction.top_peers && prediction.top_peers.length > 0 && (
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold px-2">Top 5 Peer Films Influencing Prediction</h3>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                                    {prediction.top_peers.map((peer, idx) => (
                                        <div key={idx} className="flex flex-col space-y-3 cursor-pointer group" onClick={() => navigate(`/movie/${peer.id}`)}>
                                            <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm group-hover:ring-2 group-hover:ring-blue-500 transition-all">
                                                {peer.poster_url ? (
                                                    <img 
                                                        src={peer.poster_url} 
                                                        alt={peer.title} 
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] text-center p-2 uppercase">No Poster</div>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">{peer.title}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}