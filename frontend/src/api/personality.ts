const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface GenreTraitData {
    genre: string;
    openness: number;
    agreeableness: number;
    extraversion: number;
    conscientiousness: number;
    emotional_stability: number;
    user_count: number;
}

export interface PersonalityTraits {
    openness: number;
    agreeableness: number;
    extraversion: number;
    conscientiousness: number;
    emotional_stability: number;
}

export interface PersonalityMovie {
    movie_id: number;
    title: string;
    release_year: number;
    poster_url: string | null;
    genres: string[];
    avg_predicted_rating: number;
}

export interface PersonalityRecommendationsResponse {
    movies: PersonalityMovie[];
    matched_profiles: { person_user_id: string; distance: number }[];
}

export async function getGenreTraits(): Promise<GenreTraitData[]> {
    const res = await fetch(`${BASE_URL}/api/personality/genre-traits`);
    if (!res.ok) throw new Error('Failed to fetch genre trait data');
    return res.json();
}

export async function getPersonalityRecommendations(
    traits: PersonalityTraits
): Promise<PersonalityRecommendationsResponse> {
    const res = await fetch(`${BASE_URL}/api/personality/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(traits),
    });
    if (!res.ok) throw new Error('Failed to fetch recommendations');
    return res.json();
}
