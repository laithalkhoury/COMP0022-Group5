const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

function buildQueryString(params: Record<string, unknown>): string {
    const usp = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        if (Array.isArray(value)) {
            for (const item of value) {
                if (item !== undefined && item !== null && item !== '') {
                    usp.append(key, String(item));
                }
            }
        } else {
            usp.set(key, String(value));
        }
    }
    const str = usp.toString();
    return str ? `?${str}` : '';
}

export async function apiFetch<T>(
    path: string,
    params?: Record<string, unknown>,
    method: 'GET' | 'POST' = 'GET',
    body?: any
): Promise<T> {
    const qs = params ? buildQueryString(params) : '';
    const url = `${BASE_URL}${path}${qs}`;
    
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new ApiError(response.status, errData.error || `HTTP ${response.status}`);
    }
    return response.json() as Promise<T>;
}