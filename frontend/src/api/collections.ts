import { apiFetch } from './client';
import type { CollectionSummary, CollectionMovie } from '@/types/dto';

interface BackendCollection {
    collection_id: number;
    collection_name: string;
    notes: string | null;
    sort_order: number;
    movie_count: number;
    created_at: string;
    updated_at: string;
}

function toCollectionSummary(c: BackendCollection): CollectionSummary {
    return {
        collectionId: c.collection_id,
        collectionName: c.collection_name,
        notes: c.notes,
        sortOrder: c.sort_order,
        movieCount: c.movie_count,
    };
}

export async function getCollections(): Promise<CollectionSummary[]> {
    const data = await apiFetch<BackendCollection[]>('/api/collections');
    return data.map(toCollectionSummary);
}

export async function createCollection(name: string, notes?: string): Promise<CollectionSummary> {
    const data = await apiFetch<BackendCollection>('/api/collections', undefined, 'POST', { name, notes });
    return toCollectionSummary(data);
}

export async function updateCollection(
    id: number,
    updates: { name?: string; notes?: string }
): Promise<CollectionSummary> {
    const data = await apiFetch<BackendCollection>(`/api/collections/${id}`, undefined, 'PUT', updates);
    return toCollectionSummary(data);
}

export async function deleteCollection(id: number): Promise<void> {
    await apiFetch<void>(`/api/collections/${id}`, undefined, 'DELETE');
}

export async function reorderCollections(
    order: { collectionId: number; sortOrder: number }[]
): Promise<void> {
    await apiFetch<void>('/api/collections/reorder', undefined, 'PUT', { order });
}

export async function getCollectionMovies(collectionId: number): Promise<CollectionMovie[]> {
    return apiFetch<CollectionMovie[]>(`/api/collections/${collectionId}/movies`);
}

export async function addMovieToCollection(collectionId: number, movieId: number): Promise<void> {
    await apiFetch<void>(`/api/collections/${collectionId}/movies`, undefined, 'POST', { movieId });
}

export async function removeMovieFromCollection(collectionId: number, movieId: number): Promise<void> {
    await apiFetch<void>(`/api/collections/${collectionId}/movies/${movieId}`, undefined, 'DELETE');
}

export async function reorderCollectionMovies(
    collectionId: number,
    order: { movieId: number; sortOrder: number }[]
): Promise<void> {
    await apiFetch<void>(`/api/collections/${collectionId}/movies/reorder`, undefined, 'PUT', { order });
}
