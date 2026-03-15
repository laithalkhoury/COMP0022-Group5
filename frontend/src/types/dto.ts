export interface MovieSummary {
    id: string | number;
    title: string;
    releaseDate: string;
    year: number;
    posterUrl: string | null;
    avgRating: number | null;
    ratingCount: number | null;
    genres: string[];
    runtime: number | null;
}

export interface CrewMember {
    name: string;
    role: string;
    character: string | null;
}

export interface MovieDetail extends MovieSummary {
    tags: string[];
    director: string | null;
    actors: string[] | null;
    awards: string[] | null;
    boxOffice: string | number | null;
    criticScore: number | null;
    crew: CrewMember[];
}

export interface FilterOptions {
    genres: string[];
    tags: string[];
    awards: string[];
}

export interface PaginatedResponse<T> {
    items: T[];
    page: number;
    size: number;
    total: number;
    totalPages: number;
}

export interface MovieQueryParams {
    title?: string;
    dateFrom?: string;
    dateTo?: string;
    genres?: string[];
    tag?: string;
    crew?: string;
    ratingMin?: number;
    ratingMax?: number;
    sortBy?: 'rating' | 'year' | 'popularity';
    sortDir?: 'asc' | 'desc';
    page?: number;
    size?: number;
}

export interface PredictionRequest {
    title: string;
    genres: string[];
    tags?: string[];
    release_year: number;
}

export interface PredictionResponse {
    title: string;
    mean: number;
    uncertainty: number;
    sample_size: number;
    confidence: 'High' | 'Moderate' | 'Low';
    message?: string;
    top_peers: {
        id: number;
        title: string;
        poster_url: string | null;
    }[];
}

export interface ScatterPoint {
    movieRating: number;
    genreAvgRating: number;
}

export interface ScatterResponse {
    movieTitle: string;
    genres: string[];
    points: ScatterPoint[];
    count: number;
    correlation: number | null;
}

export interface MovieSearchResult {
    movieId: number;
    title: string;
    year: number;
    genres: string[];
}

export interface GenreScatterPoint {
    xAvgRating: number;
    yAvgRating: number;
}

export interface GenreVsGenreResponse {
    genresX: string[];
    genresY: string[];
    points: GenreScatterPoint[];
    count: number;
    correlation: number | null;
    minRatings: number;
}

export interface PreferenceGenreEntry {
    genreCombination: string;
    avgRating: number;
    numUsers: number;
}

export interface PreferenceAnalysisResponse {
    thresholdType: 'low' | 'high';
    thresholdValue: number;
    combinationType: 'single' | 'pair';
    entries: PreferenceGenreEntry[];
}
// requirement 2 types
export interface GenrePopularity {
    genre: string;
    movie_count: number;
    engagement_volume: number;
    average_rating: number;
    commercial_indicator: number;
}

export interface GenrePolarization {
    genre: string;
    sample_size: number;
    standard_deviation: number;
    love_hate_ratio: number;
    status: 'Highly Polarizing' | 'Consensus';
}

export interface GenreFinancials {
    genre: string;
    movie_count: number;
    total_budget: number;
    total_revenue: number;
    average_revenue: number;
    roi_percentage: number;
}

export interface PersonalityTraits {
    openness: number;
    extraversion: number;
    emotional_stability: number;
    agreeableness: number;
    conscientiousness: number;
}

export interface NicheInsight {
    genre: string;
    target_persona_traits: PersonalityTraits;
    niche_strength: number;
}

// User Movie Collections (Requirement 6)
export interface CollectionSummary {
    collectionId: number;
    collectionName: string;
    notes: string | null;
    sortOrder: number;
    movieCount: number;
}

export interface CollectionMovie extends MovieSummary {
    addedAt: string;
    sortOrder: number;
}
