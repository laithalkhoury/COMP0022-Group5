import { useState, useEffect, useRef } from 'react';
import type { FilterOptions, MovieQueryParams } from '@/types/dto';

interface FiltersBarProps {
    filterOptions: FilterOptions | null;
    initialValues: MovieQueryParams;
    onSearch: (params: MovieQueryParams) => void;
}

const SORT_OPTIONS: { value: MovieQueryParams['sortBy']; label: string }[] = [
    { value: 'rating', label: 'Rating' },
    { value: 'year', label: 'Year' },
    { value: 'popularity', label: 'Popularity' },
    { value: 'boxOffice', label: 'Box Office' },
    { value: 'criticScore', label: 'Critic Score' },
];

export default function FiltersBar({ filterOptions, initialValues, onSearch }: FiltersBarProps) {
    const [title, setTitle] = useState(initialValues.title ?? '');
    const [dateFrom, setDateFrom] = useState(initialValues.dateFrom ?? '');
    const [dateTo, setDateTo] = useState(initialValues.dateTo ?? '');
    const [genres, setGenres] = useState<string[]>(initialValues.genres ?? []);
    const [tag, setTag] = useState(initialValues.tag ?? '');
    const [ratingMin, setRatingMin] = useState(initialValues.ratingMin?.toString() ?? '');
    const [ratingMax, setRatingMax] = useState(initialValues.ratingMax?.toString() ?? '');
    const [sortBy, setSortBy] = useState<MovieQueryParams['sortBy']>(
        initialValues.sortBy ?? 'rating'
    );
    const [sortDir, setSortDir] = useState<MovieQueryParams['sortDir']>(
        initialValues.sortDir ?? 'desc'
    );
    const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
    const tagWrapperRef = useRef<HTMLDivElement>(null);

    // Sync from URL when back/forward navigation occurs
    useEffect(() => {
        setTitle(initialValues.title ?? '');
        setDateFrom(initialValues.dateFrom ?? '');
        setDateTo(initialValues.dateTo ?? '');
        setGenres(initialValues.genres ?? []);
        setTag(initialValues.tag ?? '');
        setRatingMin(initialValues.ratingMin?.toString() ?? '');
        setRatingMax(initialValues.ratingMax?.toString() ?? '');
        setSortBy(initialValues.sortBy ?? 'rating');
        setSortDir(initialValues.sortDir ?? 'desc');
    }, [initialValues]);

    // Close tag dropdown on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (tagWrapperRef.current && !tagWrapperRef.current.contains(e.target as Node)) {
                setTagDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function toggleGenre(g: string) {
        setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
    }

    const tagSuggestions = filterOptions?.tags ?? [];
    const filteredTags =
        tag.length > 0
            ? tagSuggestions
                  .filter((t) => t.toLowerCase().includes(tag.toLowerCase()))
                  .slice(0, 10)
            : [];

    function handleSearch() {
        onSearch({
            title: title || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            genres: genres.length ? genres : undefined,
            tag: tag || undefined,
            ratingMin: ratingMin !== '' ? Number(ratingMin) : undefined,
            ratingMax: ratingMax !== '' ? Number(ratingMax) : undefined,
            sortBy,
            sortDir,
            page: 1,
            size: 10,
        });
    }

    function handleKeyDown(e: React.KeyboardEvent) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    }

    const inputClass =
        'w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500';

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 shadow-sm space-y-4">
            {/* Row 1: Title + Date range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Title
                    </label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search by title..."
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        From
                    </label>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className={inputClass}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        To
                    </label>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className={inputClass}
                    />
                </div>
            </div>

            {/* Row 2: Genres chips */}
            {filterOptions && filterOptions.genres.length > 0 && (
                <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                        Genres
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {filterOptions.genres.map((g) => (
                            <button
                                key={g}
                                type="button"
                                onClick={() => toggleGenre(g)}
                                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                                    genres.includes(g)
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                                }`}
                            >
                                {g}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Row 3: Tag + Rating + Sort */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Tag with typeahead */}
                <div ref={tagWrapperRef} className="relative">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Tag
                    </label>
                    <input
                        type="text"
                        value={tag}
                        onChange={(e) => {
                            setTag(e.target.value);
                            setTagDropdownOpen(true);
                        }}
                        onFocus={() => setTagDropdownOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder="e.g. neo-noir"
                        className={inputClass}
                    />
                    {tagDropdownOpen && filteredTags.length > 0 && (
                        <ul className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredTags.map((t) => (
                                <li key={t}>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            setTag(t);
                                            setTagDropdownOpen(false);
                                        }}
                                    >
                                        {t}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Rating range */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Min Rating
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={ratingMin}
                            onChange={(e) => setRatingMin(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Max Rating
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="5"
                            step="0.5"
                            value={ratingMax}
                            onChange={(e) => setRatingMax(e.target.value)}
                            className={inputClass}
                        />
                    </div>
                </div>

                {/* Sort */}
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) =>
                                setSortBy(e.target.value as MovieQueryParams['sortBy'])
                            }
                            className={inputClass}
                        >
                            {SORT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Direction
                        </label>
                        <select
                            value={sortDir}
                            onChange={(e) =>
                                setSortDir(e.target.value as MovieQueryParams['sortDir'])
                            }
                            className={inputClass}
                        >
                            <option value="desc">Desc</option>
                            <option value="asc">Asc</option>
                        </select>
                    </div>
                </div>

                {/* Search button */}
                <div>
                    <button
                        type="button"
                        onClick={handleSearch}
                        className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
}
