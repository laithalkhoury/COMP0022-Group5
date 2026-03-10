import type { TooltipProps } from 'recharts';

export default function NicheTooltip({ active, payload }: TooltipProps<any, any> & { payload?: any[] }) {
    if (!active || !payload || !payload.length) {
        return null;
    }

    const data = payload[0].payload; 
    const rawScore = data.raw; 

    return (
        <div className="bg-white dark:bg-gray-900 p-3 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl min-w-[150px] backdrop-blur-md bg-opacity-95 animate-in fade-in zoom-in duration-150">
            <div className="flex flex-col gap-0.5">
                <span className="text-[10px] uppercase font-black tracking-widest text-gray-400 dark:text-gray-500">
                    {data.subject}
                </span>

                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                        {typeof rawScore === 'number' ? rawScore.toFixed(2) : 'N/A'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-400">/ 7.0</span>
                </div>

                <p className="text-[9px] text-gray-400 dark:text-gray-500 italic mt-1 border-t border-gray-100 dark:border-gray-800 pt-1">
                    Raw Personality Score
                </p>
            </div>
        </div>
    );
}