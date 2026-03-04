import type { MovieQueryParams } from '@/types/dto';

export function paramsToSearch(params: MovieQueryParams): string {
    const usp = new URLSearchParams();
    if (params.title) usp.set('title', params.title);
    if (params.crew) usp.set('crew', params.crew);
    if (params.dateFrom) usp.set('dateFrom', params.dateFrom);
    if (params.dateTo) usp.set('dateTo', params.dateTo);
    if (params.tag) usp.set('tag', params.tag);
    if (params.ratingMin !== undefined) usp.set('ratingMin', String(params.ratingMin));
    if (params.ratingMax !== undefined) usp.set('ratingMax', String(params.ratingMax));
    if (params.sortBy) usp.set('sortBy', params.sortBy);
    if (params.sortDir) usp.set('sortDir', params.sortDir);
    if (params.page !== undefined) usp.set('page', String(params.page));
    if (params.size !== undefined) usp.set('size', String(params.size));
    if (params.genres?.length) {
        for (const g of params.genres) usp.append('genres', g);
    }
    return usp.toString();
}

export function searchToParams(usp: URLSearchParams): MovieQueryParams {
    const genres = usp.getAll('genres');
    return {
        title: usp.get('title') ?? undefined,
        crew: usp.get('crew') ?? undefined,
        dateFrom: usp.get('dateFrom') ?? undefined,
        dateTo: usp.get('dateTo') ?? undefined,
        tag: usp.get('tag') ?? undefined,
        ratingMin: usp.get('ratingMin') ? Number(usp.get('ratingMin')) : undefined,
        ratingMax: usp.get('ratingMax') ? Number(usp.get('ratingMax')) : undefined,
        sortBy: (usp.get('sortBy') as MovieQueryParams['sortBy']) ?? undefined,
        sortDir: (usp.get('sortDir') as MovieQueryParams['sortDir']) ?? undefined,
        page: usp.get('page') ? Number(usp.get('page')) : undefined,
        size: usp.get('size') ? Number(usp.get('size')) : undefined,
        genres: genres.length ? genres : undefined,
    };
}
