import type { PredictionRequest, PredictionResponse } from '@/types/dto';

export async function getPrediction(data: PredictionRequest): Promise<PredictionResponse> {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';
    
    const response = await fetch(`${BASE_URL}/api/predictions/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch prediction');
    }

    return response.json();
}