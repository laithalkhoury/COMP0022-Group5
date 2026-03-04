import { apiFetch } from './client';
import type { FilterOptions } from '@/types/dto';

export function getFilterOptions(): Promise<FilterOptions> {
    return apiFetch<FilterOptions>('/api/filters/options');
}
