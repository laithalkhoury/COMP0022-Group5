import { useState, useEffect } from 'react';
import { 
    ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, BarChart, Bar, Cell, 
    ReferenceLine,
    PolarRadiusAxis,
    Legend
} from 'recharts';
import { Info, TrendingUp, Zap, Users, DollarSign, Trophy } from 'lucide-react';
import { Spinner, ErrorPanel } from '@/components/ui';

import { getGenrePopularity, getGenrePolarization, getNicheInsights, getGenreFinancials, getGenreAwards } from '@/api/reports';
import type { GenrePopularity, GenrePolarization, NicheInsight, GenreFinancials, GenreAwards } from '@/types/dto';
import GenreTooltip from '@/components/GenreTooltip';
import NicheTooltip from '@/components/NicheTooltip';

const normalize = (val: number | undefined) => {
    if (!val) return 0;
    const score = ((val - 1) / 6) * 100;
    return Math.min(100, Math.max(0, score));
};

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 1
    }).format(val);
};

export default function GenreAnalysisPage() {
    const [popularityData, setPopularityData] = useState<GenrePopularity[]>([]);
    const [polarizationData, setPolarizationData] = useState<GenrePolarization[]>([]);
    const [nicheData, setNicheData] = useState<NicheInsight[]>([]);
    const [financialData, setFinancialData] = useState<GenreFinancials[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [awardData, setAwardData] = useState<GenreAwards[]>([]);

    // For the Radar Chart detail view
    const [selectedNicheGenre, setSelectedNicheGenre] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            getGenrePopularity(), 
            getGenrePolarization(), 
            getNicheInsights(), 
            getGenreFinancials(),
            getGenreAwards()
        ])
            .then(([pop, pol, niche, fin, awn]) => {
                setPopularityData(pop);
                setPolarizationData(pol);
                setNicheData(niche);
                setFinancialData(fin);
                setAwardData(awn);
                if (niche.length > 0) setSelectedNicheGenre(niche[0].genre);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;
    if (error) return <ErrorPanel message={error} onRetry={() => window.location.reload()} />;

    const selectedGenreStats = nicheData.find(g => g.genre === selectedNicheGenre);

    const radarData = selectedGenreStats ? [
        { 
            subject: 'Openness', 
            A: normalize(selectedGenreStats.target_persona_traits.openness), 
            raw: selectedGenreStats.target_persona_traits.openness          
        },
        { 
            subject: 'Agreeableness',
            A: normalize(selectedGenreStats.target_persona_traits.agreeableness), 
            raw: selectedGenreStats.target_persona_traits.agreeableness 
        },
        { 
            subject: 'Extraversion', 
            A: normalize(selectedGenreStats.target_persona_traits.extraversion), 
            raw: selectedGenreStats.target_persona_traits.extraversion 
        },
        { 
            subject: 'Conscientiousness',
            A: normalize(selectedGenreStats.target_persona_traits.conscientiousness), 
            raw: selectedGenreStats.target_persona_traits.conscientiousness 
        },
        { 
            subject: 'Stability', 
            A: normalize(selectedGenreStats.target_persona_traits.emotional_stability), 
            raw: selectedGenreStats.target_persona_traits.emotional_stability 
        },
    ] : [
        { subject: 'Openness', A: 0, raw: 0 },
        { subject: 'Agreeableness', A: 0, raw: 0 },
        { subject: 'Extraversion', A: 0, raw: 0 },
        { subject: 'Conscientiousness', A: 0, raw: 0 },
        { subject: 'Stability', A: 0, raw: 0 },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-10 px-4 pb-20">
            <header className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Genre Intelligence & Market Dynamics</h1>
                <p className="text-gray-500 dark:text-gray-400 max-w-3xl">
                    Analyze the performance of categories across the library. Identify "Safe Bets" (high consensus) 
                    vs "Niche Risks" (high polarization) and understand the personality traits of your core audience.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* 1. POPULARITY SECTION */}
        <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold">Total Genres</p>
                    <p className="text-2xl font-black">{popularityData.length}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold">Avg Library Rating</p>
                    <p className="text-2xl font-black text-blue-600">
                        {(popularityData.reduce((acc, curr) => acc + curr.average_rating, 0) / popularityData.length).toFixed(1)}
                    </p>
                </div>
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-bold">Top Genre</p>
                    <p className="text-lg font-bold truncate">{popularityData[0]?.genre || 'N/A'}</p>
                </div>
            </div>

            {/* The Main Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-500" />
                        Market Popularity Matrix
                    </h2>
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-full bg-green-500" /> High Rating ({">"} 3.5)
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            <div className="w-2 h-2 rounded-full bg-blue-500" /> Average Rating
                        </span>
                    </div>
                </div>
                
                <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <ReferenceLine x={3.5} stroke="#b5b5b5" strokeDasharray="5 5" />
                            
                            <XAxis 
                                type="number" 
                                dataKey="average_rating" 
                                name="Rating" 
                                domain={[0, 5]} 
                                ticks={[0, 1, 2, 3, 4, 5]} 
                                interval={0}
                                label={{ value: 'Average Rating (out of 5)', position: 'bottom', offset: 0 }} 
                            />
                            <YAxis 
                                type="number" 
                                dataKey="engagement_volume" 
                                name="Votes" 
                                width={60} 
                                tickFormatter={(value) => `${value / 1000}`}
                                label={{ 
                                    value: 'Total Ratings (thousands)', 
                                    angle: -90, 
                                    position: 'insideLeft',
                                    offset: 10,
                                    style: { textAnchor: 'middle', fill: '#6b7280' }
                                }} 
                            />
                            <ZAxis type="number" dataKey="commercial_indicator" range={[100, 1000]} name="Saves" />
                                <Tooltip 
                                    content={<GenreTooltip />} 
                                    cursor={{ strokeDasharray: '3 3' }} 
                                />
                            <Scatter name="Genres" data={popularityData}>
                                {popularityData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={entry.average_rating > 3.5 ? '#10b981' : '#3b82f6'} 
                                        fillOpacity={0.7}
                                        stroke={entry.average_rating > 3.5 ? '#059669' : '#2563eb'}
                                    />
                                ))}
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

                {/* 2. POLARIZATION (Bar Chart) */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Zap className="w-5 h-5 text-orange-500" />
                        Rating Volatility
                    </h2>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={polarizationData} layout="vertical" margin={{ left: 30 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="genre" type="category" width={80} style={{ fontSize: '10px' }} />
                                <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                                <Bar dataKey="standard_deviation" radius={[0, 4, 4, 0]}>
                                    {polarizationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.standard_deviation > 1.0 ? '#f97316' : '#94a3b8'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
                        <Info className="w-3 h-3 inline mr-1" />
                        Higher values indicate "Polarizing" genres where audiences are split between extreme high and low scores.
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        Commercial ROI (%)
                    </h2>
                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            {/* Increased bottom margin to make room for the X-Axis label */}
                            <BarChart 
                                data={financialData} 
                                layout="vertical" 
                                margin={{ top: 5, right: 30, left: 20, bottom: 30 }}
                            >
                                <XAxis 
                                    type="number" 
                                    tickFormatter={(value) => `${value}%`} // Adds % to the numbers
                                    style={{ fontSize: '10px' }}
                                    label={{ 
                                        value: 'Return on Investment (%)', 
                                        position: 'insideBottom', 
                                        offset: -20, // Moves label down so it doesn't overlap ticks
                                        style: { fontSize: '12px', fontWeight: 'bold', fill: '#6b7280' } 
                                    }}
                                />
                                <YAxis 
                                    dataKey="genre" 
                                    type="category" 
                                    width={80} 
                                    style={{ fontSize: '10px' }} 
                                />
                                
                                <Tooltip 
                                    formatter={(value: any, _name: any, props: any) => {
                                        const avgRev = props.payload.average_revenue;
                                        
                                        return [
                                            (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-green-600 font-black">{value}% ROI</span>
                                                    <span className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">
                                                        Avg Revenue: {formatCurrency(avgRev)}
                                                    </span>
                                                </div>
                                            ),
                                            'Performance'
                                        ] as any;
                                    }}
                                    contentStyle={{ 
                                        borderRadius: '12px', 
                                        border: 'none', 
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '12px'
                                    }}
                                />

                                <Bar dataKey="roi_percentage" radius={[0, 4, 4, 0]}>
                                    {financialData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={entry.roi_percentage > 100 ? '#10b981' : '#94a3b8'} 
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <p className="text-[11px] font-bold text-gray-500 uppercase">Top Avg Revenue</p>
                        <p className="text-sm font-black text-green-600">
                            {financialData[0]?.genre}: {formatCurrency(financialData[0]?.average_revenue)}
                        </p>
                    </div>
                </div>

                {/* AWARDS SECTION */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h2 className="text-lg font-bold flex items-center gap-2 mb-6">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Awards vs. Nominations by Genre
                    </h2>

                    <div className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={awardData} margin={{ bottom: 40 }}>
                                <XAxis 
                                    dataKey="genre" 
                                    tick={{ fontSize: 11, fontWeight: 600 }} 
                                    interval={0} 
                                    angle={-45} 
                                    textAnchor="end" 
                                />
                                <YAxis tick={{ fontSize: 11 }} />
                                <Tooltip 
                                    cursor={{fill: '#f8fafc'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend verticalAlign="top" align="right" iconType="circle" />
                                
                                <Bar 
                                    dataKey="wins" 
                                    fill="#eab308" 
                                    name="Wins" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20}
                                />
                                
                                <Bar 
                                    dataKey="nominations" 
                                    fill="#94a3b8" 
                                    name="Nominations" 
                                    radius={[4, 4, 0, 0]} 
                                    barSize={20}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. PERSONALITY NICHE (Radar Chart) */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-8 bg-blue-50/50 dark:bg-blue-900/10 p-8 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-6 h-6 text-blue-600" />
                            Target Audience Personas
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Select a genre to visualize the psychological profile of the users who highly rate these titles. 
                            Use these traits to refine marketing copy and platform targeting.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {nicheData.map(n => (
                                <button
                                    key={n.genre}
                                    onClick={() => setSelectedNicheGenre(n.genre)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        selectedNicheGenre === n.genre 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : 'bg-white dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700'
                                    }`}
                                >
                                    {n.genre}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 flex items-center justify-center shadow-inner">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius="80%" 
                                    data={radarData}
                                >
                                    <PolarGrid stroke="#e2e8f0" />
                                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12, fontWeight: 600 }} />
                                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />

                                    <Tooltip content={<NicheTooltip />} cursor={false} />
                                    
                                    <Radar
                                        name="Audience Trait"
                                        dataKey="A"
                                        stroke="#2563eb"
                                        fill="#3b82f6"
                                        fillOpacity={0.6}
                                        animationDuration={500}
                                    />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}