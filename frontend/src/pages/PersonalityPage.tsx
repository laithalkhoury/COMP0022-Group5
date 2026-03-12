import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    getGenreTraits,
    getPersonalityRecommendations,
    type GenreTraitData,
    type PersonalityTraits,
    type PersonalityMovie,
} from '@/api/personality';
import { Spinner } from '@/components/ui';

const TRAITS: { key: keyof PersonalityTraits; label: string; color: string }[] = [
    { key: 'openness',            label: 'Openness',             color: '#6366f1' },
    { key: 'agreeableness',       label: 'Agreeableness',        color: '#22c55e' },
    { key: 'extraversion',        label: 'Extraversion',         color: '#f59e0b' },
    { key: 'conscientiousness',   label: 'Conscientiousness',    color: '#ef4444' },
    { key: 'emotional_stability', label: 'Emotional Stability',  color: '#3b82f6' },
];

const DEFAULT_TRAITS: PersonalityTraits = {
    openness: 4,
    agreeableness: 4,
    extraversion: 4,
    conscientiousness: 4,
    emotional_stability: 4,
};

export default function PersonalityPage() {
    const [genreData, setGenreData] = useState<GenreTraitData[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);
    const [chartError, setChartError] = useState<string | null>(null);

    const [activeTraits, setActiveTraits] = useState<(keyof PersonalityTraits)[]>(['openness']);

    const [traits, setTraits] = useState<PersonalityTraits>(DEFAULT_TRAITS);
    const [movies, setMovies] = useState<PersonalityMovie[]>([]);
    const [loadingRecs, setLoadingRecs] = useState(false);
    const [recError, setRecError] = useState<string | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        getGenreTraits()
            .then(setGenreData)
            .catch(() => setChartError('Failed to load genre trait data'))
            .finally(() => setLoadingChart(false));
    }, []);

    const handleSlider = (trait: keyof PersonalityTraits, value: number) => {
        setTraits(prev => ({ ...prev, [trait]: value }));
    };

    const handleRecommend = async () => {
        setLoadingRecs(true);
        setRecError(null);
        setHasSearched(true);
        try {
            const res = await getPersonalityRecommendations(traits);
            setMovies(res.movies);
        } catch {
            setRecError('Failed to fetch recommendations');
        } finally {
            setLoadingRecs(false);
        }
    };

    const toggleTrait = (key: keyof PersonalityTraits) => {
        setActiveTraits(prev =>
            prev.includes(key)
                ? prev.length > 1 ? prev.filter(t => t !== key) : prev  // keep at least 1
                : [...prev, key]
        );
    };

    // Sort chart data by first selected trait descending
    const sortedGenreData = [...genreData].sort((a, b) => b[activeTraits[0]] - a[activeTraits[0]]);

    return (
        <div className="max-w-6xl mx-auto space-y-12 px-4 pb-16">

            {/* Header */}
            <header>
                <h1 className="text-2xl font-bold">Personality Traits & Viewing Preferences</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                    Explore how Big Five personality traits correlate with film genre preferences,
                    and discover movies matched to your personality profile.
                </p>
            </header>

            {/* ── SECTION 1: Correlation Chart ── */}
            <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 space-y-6">
                <div>
                    <h2 className="text-lg font-bold">Genre–Trait Correlation</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Normalised deviation (z-score) of each personality trait for users whose recommended films belong to each genre.
                        Positive values mean that genre's fans score <em>above average</em> on that trait; negative means below average.
                    </p>
                </div>

                {/* Trait selector */}
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-400 font-medium">Show:</span>
                    {TRAITS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => toggleTrait(t.key)}
                            className={`px-3 py-1 text-xs rounded-full border transition-all font-medium ${
                                activeTraits.includes(t.key)
                                    ? 'text-white border-transparent shadow-md'
                                    : 'border-gray-300 dark:border-gray-600 text-gray-500 hover:border-gray-400'
                            }`}
                            style={activeTraits.includes(t.key) ? { backgroundColor: t.color } : {}}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {loadingChart ? (
                    <div className="flex justify-center py-16"><Spinner /></div>
                ) : chartError ? (
                    <p className="text-red-500 text-sm">{chartError}</p>
                ) : (
                    <ResponsiveContainer width="100%" height={360}>
                        <BarChart data={sortedGenreData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis
                                dataKey="genre"
                                tick={{ fontSize: 11 }}
                                angle={-40}
                                textAnchor="end"
                                interval={0}
                            />
                            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v.toFixed(2)} />
                            <Tooltip
                                formatter={(val: number) => [val.toFixed(3) + ' σ', '']}
                                contentStyle={{ fontSize: 12 }}
                            />
                            {TRAITS.filter(t => activeTraits.includes(t.key)).map(t => (
                                <Bar
                                    key={t.key}
                                    dataKey={t.key}
                                    name={t.label}
                                    fill={t.color}
                                    radius={[4, 4, 0, 0]}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                )}

                <p className="text-xs text-gray-400">
                    Based on {genreData.reduce((s, g) => s + g.user_count, 0).toLocaleString()} user-genre associations
                    across {genreData.length} genres. Values are z-scores (standard deviations from population mean). 0 = average.
                </p>
            </section>

            {/* ── SECTION 2: Personality-Based Recommendations ── */}
            <section className="space-y-6">
                <div>
                    <h2 className="text-lg font-bold">Personalised Movie Finder</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Rate each trait from 1 (low) to 7 (high) to match your personality profile. We'll find users with similar
                        traits and surface the films they were recommended.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-8 space-y-6">
                    {TRAITS.map(({ key, label, color }) => (
                        <div key={key} className="space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium" style={{ color }}>{label}</span>
                                <span className="text-gray-400 font-mono text-xs">
                                    {traits[key].toFixed(1)} / 7
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1} max={7} step={0.1}
                                value={traits[key]}
                                onChange={e => handleSlider(key, parseFloat(e.target.value))}
                                className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
                                style={{ accentColor: color }}
                            />
                            <div className="flex justify-between text-[10px] text-gray-400">
                                <span>1 – Low</span>
                                <span>7 – High</span>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={handleRecommend}
                        disabled={loadingRecs}
                        className="w-full md:w-auto px-10 py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/20"
                    >
                        {loadingRecs ? 'Finding matches...' : 'Find My Movies'}
                    </button>
                </div>

                {/* Results */}
                {loadingRecs && (
                    <div className="flex flex-col items-center py-16 space-y-4">
                        <Spinner />
                        <p className="text-sm text-gray-500 animate-pulse">Matching personality profiles...</p>
                    </div>
                )}

                {recError && (
                    <p className="text-red-500 text-sm">{recError}</p>
                )}

                {!loadingRecs && hasSearched && movies.length === 0 && !recError && (
                    <p className="text-gray-500 text-sm text-center py-8">No recommendations found.</p>
                )}

                {!loadingRecs && movies.length > 0 && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-xs text-gray-400 px-1">
                            Top {movies.length} films recommended to users with a similar personality profile
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {movies.map(movie => (
                                <a
                                    key={movie.movie_id}
                                    href={`/movie/${movie.movie_id}`}
                                    className="flex flex-col space-y-2 group"
                                >
                                    <div className="w-full aspect-[2/3] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm group-hover:shadow-md transition-shadow">
                                        {movie.poster_url ? (
                                            <img
                                                src={movie.poster_url}
                                                alt={movie.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px] text-center p-2 uppercase">
                                                No Poster
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {movie.title}
                                        </p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                            {movie.release_year} · ★ {movie.avg_predicted_rating.toFixed(2)}
                                        </p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
