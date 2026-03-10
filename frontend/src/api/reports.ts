import { GenrePopularity, GenrePolarization, NicheInsight } from '@/types/dto';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = `${BASE_URL.replace(/\/$/, '')}/api/genres`;

export async function getGenrePopularity(): Promise<GenrePopularity[]> {
    const response = await fetch(`${API_BASE}/popularity-report`);
    if (!response.ok) {
        throw new Error('Failed to fetch genre popularity report');
    }
    return response.json();
}

export async function getGenrePolarization(): Promise<GenrePolarization[]> {
    const response = await fetch(`${API_BASE}/polarization`);
    if (!response.ok) {
        throw new Error('Failed to fetch genre polarization data');
    }
    return response.json();
}

export async function getNicheInsights(): Promise<NicheInsight[]> {
    const response = await fetch(`${API_BASE}/personality-insights`);
    if (!response.ok) {
        throw new Error('Failed to fetch personality niche insights');
    }
    return response.json();
}