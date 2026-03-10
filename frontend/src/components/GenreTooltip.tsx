import type { TooltipProps } from 'recharts';
import type { GenrePopularity } from '@/types/dto';
import { TrendingUp, Bookmark, Film } from 'lucide-react';

function StarRating({ rating }: { rating: number }) {
    const pct = Math.min(100, Math.max(0, (rating / 5) * 100));
    return (
        <span className="inline-flex items-center gap-1">
            <span className="relative text-base leading-none text-gray-300 dark:text-gray-600">
                <span aria-hidden>★★★★★</span>
                <span
                    className="absolute inset-0 overflow-hidden text-yellow-400"
                    style={{ width: `${pct}%` }}
                    aria-hidden
                >
                    ★★★★★
                </span>
            </span>
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                {rating.toFixed(1)}
            </span>
        </span>
    );
}

export default function GenreTooltip(props: TooltipProps<any, any>) {
    const { active, payload } = props as TooltipProps<any, any> & { payload?: Array<{ payload: GenrePopularity }> };
    
    if (!active || !payload || payload.length === 0) {
        return null;
    }

    const data = payload[0].payload as GenrePopularity;

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 min-w-[220px] backdrop-blur-sm bg-opacity-95">
            {/* Header: Genre Name */}
            <div className="mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 dark:text-gray-100">
                    {data.genre}
                </h3>
            </div>

            <div className="space-y-3">
                {/* 1. Rating Stats */}
                <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase font-bold text-gray-400">Average Performance</span>
                    <StarRating rating={data.average_rating} />
                </div>

                {/* 2. Volume & Engagement Grid */}
                <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> Engagement
                        </span>
                        <span className="text-sm font-semibold">
                            {data.engagement_volume.toLocaleString()}
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                            <Bookmark className="w-3 h-3 text-green-500" /> Saves
                        </span>
                        <span className="text-sm font-semibold text-green-600">
                            {data.commercial_indicator.toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* 3. Library Size Footer */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-1 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 italic">
                        <Film className="w-3 h-3" /> Library Share
                    </span>
                    <span className="text-[11px] font-bold text-gray-500">
                        {data.movie_count} Titles
                    </span>
                </div>
            </div>
        </div>
    );
}