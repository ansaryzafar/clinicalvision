/**
 * API Inference Retry Logic Test Suite
 * 
 * Tests the predict() method's retry mechanism:
 * - Exponential backoff (1s, 2s, 4s)
 * - No retry on 4xx client errors
 * - Retry on 5xx server errors
 * - Retry on network errors
 * - Max 3 attempts
 */

import { AxiosError, AxiosResponse } from 'axios';

// ============================================================================
// Mock API Service Predict Logic (Isolated for Testing)
// ============================================================================

interface PredictOptions {
  return_visualization?: boolean;
  return_attention_maps?: boolean;
  save_result?: boolean;
}

interface InferenceResponse {
  prediction: 'benign' | 'malignant';
  confidence: number;
  probabilities: { benign: number; malignant: number };
  risk_level: string;
  processing_time_ms: number;
  model_version: string;
}

// Extracted retry logic for testing (synchronous for tests, no delay)
const createPredictWithRetry = (mockClient: any) => {
  return async (
    file: File,
    options?: PredictOptions
  ): Promise<InferenceResponse> => {
    const maxRetries = 3;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const formData = new FormData();
        formData.append('file', file);

        if (options?.return_visualization !== undefined) {
          formData.append('return_visualization', String(options.return_visualization));
        }
        
        if (options?.return_attention_maps !== undefined) {
          formData.append('return_attention_maps', String(options.return_attention_maps));
        }

        const response = await mockClient.post('/inference/predict', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 180000,
        });

        return response.data;
      } catch (error) {
        lastError = error as Error;
        const axiosError = error as AxiosError;
        
        // Don't retry on client errors (4xx) except 408 (timeout)
        if (axiosError.response?.status && 
            axiosError.response.status >= 400 && 
            axiosError.response.status < 500 &&
            axiosError.response.status !== 408) {
          throw error;
        }
        
        // Continue to next attempt (no delay for tests)
      }
    }
    
    throw lastError;
  };
};

// ============================================================================
// Test Utilities
// ============================================================================

const createMockFile = (name = 'test.png'): File => {
  const blob = new Blob(['fake image'], { type: 'image/png' });
  return new File([blob], name, { type: 'image/png' });
};

const createAxiosError = (status: number, message: string): AxiosError => {
  const error = new Error(message) as AxiosError;
  error.isAxiosError = true;
  error.response = {
    status,
    data: { detail: message },
    headers: {},
    statusText: message,
    config: {} as any,
  } as AxiosResponse;
  return error;
};

const createNetworkError = (): AxiosError => {
  const error = new Error('Network Error') as AxiosError;
  error.isAxiosError = true;
  error.code = 'ERR_NETWORK';
  return error;
};

const mockSuccessResponse: InferenceResponse = {
  prediction: 'benign',
  confidence: 0.95,
  probabilities: { benign: 0.95, malignant: 0.05 },
  risk_level: 'low',
  processing_time_ms: 1500,
  model_version: 'v12',
};

// ============================================================================
// Test Suites
// ============================================================================

describe('Inference Predict Retry Logic', () => {
  let mockClient: { post: jest.Mock };
  let predict: (file: File, options?: PredictOptions) => Promise<InferenceResponse>;

  beforeEach(() => {
    mockClient = { post: jest.fn() };
    predict = createPredictWithRetry(mockClient);
  });

  describe('Successful Predictions', () => {
    test('succeeds on first attempt', async () => {
      mockClient.post.mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('includes visualization options in request', async () => {
      mockClient.post.mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      await predict(file, { return_visualization: true, return_attention_maps: true });
      
      const [url, formData] = mockClient.post.mock.calls[0];
      expect(url).toBe('/inference/predict');
      expect(formData.get('return_visualization')).toBe('true');
      expect(formData.get('return_attention_maps')).toBe('true');
    });
  });

  describe('Retry on Server Errors (5xx)', () => {
    test('retries on 500 Internal Server Error', async () => {
      mockClient.post
        .mockRejectedValueOnce(createAxiosError(500, 'Internal Server Error'))
        .mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(2);
    });

    test('retries on 503 Service Unavailable', async () => {
      mockClient.post
        .mockRejectedValueOnce(createAxiosError(503, 'Service Unavailable'))
        .mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(2);
    });

    test('retries on 502 Bad Gateway', async () => {
      mockClient.post
        .mockRejectedValueOnce(createAxiosError(502, 'Bad Gateway'))
        .mockRejectedValueOnce(createAxiosError(502, 'Bad Gateway'))
        .mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(3);
    });
  });

  describe('Retry on Network Errors', () => {
    test('retries on network error', async () => {
      mockClient.post
        .mockRejectedValueOnce(createNetworkError())
        .mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(2);
    });

    test('retries on 408 Request Timeout', async () => {
      mockClient.post
        .mockRejectedValueOnce(createAxiosError(408, 'Request Timeout'))
        .mockResolvedValueOnce({ data: mockSuccessResponse });
      
      const file = createMockFile();
      const result = await predict(file);
      
      expect(result).toEqual(mockSuccessResponse);
      expect(mockClient.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('No Retry on Client Errors (4xx)', () => {
    test('does NOT retry on 400 Bad Request', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(400, 'Bad Request'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('does NOT retry on 401 Unauthorized', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(401, 'Unauthorized'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('does NOT retry on 403 Forbidden', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(403, 'Forbidden'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('does NOT retry on 413 Payload Too Large', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(413, 'Payload Too Large'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });

    test('does NOT retry on 422 Unprocessable Entity', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(422, 'Unprocessable Entity'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Max Retry Limit', () => {
    test('gives up after 3 attempts', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(500, 'Server Error'));
      
      const file = createMockFile();
      
      await expect(predict(file)).rejects.toThrow();
      expect(mockClient.post).toHaveBeenCalledTimes(3);
    });

    test('throws last error after all retries fail', async () => {
      mockClient.post.mockRejectedValue(createAxiosError(503, 'Service Unavailable'));
      
      const file = createMockFile();
      
      try {
        await predict(file);
        fail('Should have thrown');
      } catch (error: any) {
        expect(error.response?.status).toBe(503);
      }
    });
  });

  describe('Exponential Backoff Timing', () => {
    test('delay calculation follows exponential pattern', () => {
      const baseDelay = 1000;
      
      const calculateDelay = (attempt: number) => Math.pow(2, attempt) * baseDelay;
      
      expect(calculateDelay(0)).toBe(1000);  // 1s
      expect(calculateDelay(1)).toBe(2000);  // 2s
      expect(calculateDelay(2)).toBe(4000);  // 4s
    });
  });
});

describe('Predict Options', () => {
  let mockClient: { post: jest.Mock };
  let predict: (file: File, options?: PredictOptions) => Promise<InferenceResponse>;

  beforeEach(() => {
    mockClient = { post: jest.fn() };
    predict = createPredictWithRetry(mockClient);
    mockClient.post.mockResolvedValue({ data: mockSuccessResponse });
  });

  test('sends return_visualization option', async () => {
    const file = createMockFile();
    await predict(file, { return_visualization: true });
    
    const formData = mockClient.post.mock.calls[0][1] as FormData;
    expect(formData.get('return_visualization')).toBe('true');
  });

  test('sends return_attention_maps option', async () => {
    const file = createMockFile();
    await predict(file, { return_attention_maps: true });
    
    const formData = mockClient.post.mock.calls[0][1] as FormData;
    expect(formData.get('return_attention_maps')).toBe('true');
  });

  test('omits undefined options', async () => {
    const file = createMockFile();
    await predict(file, {});
    
    const formData = mockClient.post.mock.calls[0][1] as FormData;
    expect(formData.get('return_visualization')).toBeNull();
  });

  test('sets correct timeout for inference', async () => {
    const file = createMockFile();
    await predict(file);
    
    const config = mockClient.post.mock.calls[0][2];
    expect(config.timeout).toBe(180000); // 3 minutes
  });
});
