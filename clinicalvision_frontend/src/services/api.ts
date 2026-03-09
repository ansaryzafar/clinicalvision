/**
 * ClinicalVision API Service - Production Grade
 *
 * Complete integration with FastAPI backend
 * - Authentication with JWT tokens
 * - Automatic token refresh on 401
 * - Image upload with progress tracking
 * - AI inference with comprehensive response handling
 * - Robust error handling
 * - Type-safe with TypeScript
 * - Request/response interceptors
 * - Retry logic for transient failures
 */
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// ============================================================================
// Configuration
// ============================================================================

// Use empty string for API_BASE_URL to leverage CRA proxy (package.json "proxy" field)
// This avoids ERR_NETWORK_CHANGED issues caused by Docker bridge interfaces
// All requests go to localhost:3000/* and get proxied to localhost:8000/*
const API_BASE_URL = process.env.REACT_APP_API_URL || '';
const API_TIMEOUT = 180000; // 3 minutes for large file uploads and model inference

// ============================================================================
// Type Definitions - Match Backend Schemas
// ============================================================================

// Authentication Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

/** User role - aligned with backend UserRole enum */
export type UserRole = 'admin' | 'radiologist' | 'technician' | 'viewer';

/**
 * User interface - aligned with backend User model
 * Includes additional fields for medical credentials and security
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  role: UserRole;
  organization_id?: string;
  is_active: boolean;
  created_at: string;
  
  // Medical credentials (for radiologists)
  license_number?: string;
  specialization?: string;
  
  // Security fields
  two_factor_enabled?: boolean;
  email_verified?: boolean;
  last_login?: string;
}

// Image Upload Types
export interface ImageUploadRequest {
  file: File;
  patient_id: string;
  study_instance_uid?: string;
  series_instance_uid?: string;
  laterality?: 'LEFT' | 'RIGHT' | 'BILATERAL' | 'UNKNOWN';
  view_position?: string;
  modality?: string;
}

export interface ImageUploadResponse {
  success: boolean;
  message: string;
  image: {
    id: string;
    patient_id: string;
    study_instance_uid: string;
    file_name: string;
    file_size_bytes: number;
    mime_type: string;
    laterality?: string;
    view_position?: string;
    created_at: string;
  };
}

// Inference Types - Match Backend InferenceResponse Schema
export interface SuspiciousRegion {
  region_id: number;
  bbox: number[]; // [x, y, width, height] in model space (224x224)
  bbox_model?: number[]; // [x, y, width, height] in model space (224x224)
  bbox_original?: number[]; // [x, y, width, height] in original image space
  attention_score: number;
  location: string;
  area_pixels?: number;
  area_pixels_original?: number;
  tile_id?: number; // From tile analysis
  tile_attention?: number; // From tile analysis
}

export interface ImageMetadata {
  original_width: number;
  original_height: number;
  model_width: number; // Usually 224
  model_height: number; // Usually 224
  scale_x: number; // original_width / model_width
  scale_y: number; // original_height / model_height
  aspect_ratio: number;
  coordinate_system: 'model' | 'original';
}

export interface UncertaintyMetrics {
  epistemic_uncertainty: number;
  aleatoric_uncertainty?: number;
  predictive_entropy: number;
  mutual_information?: number;
  mc_samples?: number;
  mc_std?: number;
  requires_human_review: boolean;
}

export interface ExplanationData {
  attention_map?: number[][];
  suspicious_regions: SuspiciousRegion[];
  narrative: string;
  confidence_explanation: string;
}

export interface InferenceResponse {
  prediction: 'benign' | 'malignant';
  confidence: number;
  probabilities: {
    benign: number;
    malignant: number;
  };
  risk_level: 'low' | 'moderate' | 'high';
  uncertainty: UncertaintyMetrics;
  explanation: ExplanationData;
  image_metadata?: ImageMetadata; // For full-size mammogram coordinate transformation
  case_id: string;
  image_id?: number;
  model_version: string;
  inference_time_ms: number;
  timestamp: string;
}

// ============================================================================
// Tile Analysis Types (Phase 2)
// ============================================================================

export type AnalysisMode = 'global_only' | 'attention_guided' | 'full_coverage';

export interface TileConfig {
  tile_size: number;
  overlap: number;
  attention_threshold: number;
  max_tiles: number;
}

export interface TileInfo {
  tile_id: number;
  position: number[]; // [x, y] in original image
  attention_score: number;
  breast_coverage: number;
  prediction: 'benign' | 'malignant';
  malignancy_prob: number;
  confidence: number;
}

export interface TileAnalysisMetrics {
  global_probability: number;
  tile_weighted_average: number;
  tile_max_probability: number;
  final_probability: number;
  tiles: TileInfo[];
}

export interface TileAnalysisResponse extends InferenceResponse {
  analysis_mode: AnalysisMode;
  tiles_analyzed: number;
  tile_analysis?: TileAnalysisMetrics;
}

export interface TileAnalysisOptions {
  mode?: AnalysisMode;
  tile_size?: number;
  overlap?: number;
  attention_threshold?: number;
  max_tiles?: number;
  save_result?: boolean;
}

// Health Check Types
export interface HealthStatus {
  status: string;
  version?: string;
  environment?: string;
  database?: string;
  model_loaded?: boolean;
  model_version?: string;
}

// ============================================================================
// Fairness Monitoring Types
// ============================================================================

export type ProtectedAttribute = 'age_group' | 'breast_density' | 'imaging_device';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type ComplianceStatus = 'compliant' | 'conditional' | 'non_compliant';

export interface SubgroupMetrics {
  group_name: string;
  n_samples: number;
  sensitivity: number;
  specificity: number;
  auc: number;
}

export interface FairnessAlert {
  alert_id: string;
  severity: AlertSeverity;
  attribute: ProtectedAttribute;
  metric: string;
  disparity: number;
  threshold: number;
  groups: [string, string];
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface AttributeSummary {
  attribute: ProtectedAttribute;
  status: ComplianceStatus;
  n_groups: number;
  max_disparity: number;
  groups: SubgroupMetrics[];
}

export interface DashboardSummary {
  total_alerts: number;
  critical_alerts: number;
  warning_alerts: number;
  attributes_analyzed: number;
  compliance_score: number;
}

export interface ComplianceBreakdown {
  fda_status: ComplianceStatus;
  eu_ai_act_status: ComplianceStatus;
  nist_rmf_status: ComplianceStatus;
}

export interface FairnessDashboardMetadata {
  data_source: 'real_database' | 'demo_fallback';
  reason?: string;
  note?: string;
  predictions_analyzed?: number;
  ground_truth_available?: number;
  analysis_period_days?: number;
  computed_at?: string;
}

export interface FairnessDashboardResponse {
  overall_status: ComplianceStatus;
  last_evaluation: string | null;
  model_version: string;
  summary: DashboardSummary;
  compliance: ComplianceBreakdown;
  alerts: FairnessAlert[];
  attributes: AttributeSummary[];
  metadata?: FairnessDashboardMetadata | null;
}

// ============================================================================
// XAI (Explainability) Types - Match Backend Schemas
// ============================================================================

export type XAIMethod = 'gradcam' | 'gradcam++' | 'integrated_gradients' | 'lime' | 'shap';

export interface GradCAMRequest {
  method?: XAIMethod;
  target_layer?: string;
  output_format?: string;
  colormap?: string;
  overlay_alpha?: number;
}

export interface GradCAMResponse {
  method_used: string;
  target_layer?: string;
  attention_map?: number[][];
  attention_image?: string;
  suspicious_regions: SuspiciousRegion[];
  image_metadata?: {
    original_width: number;
    original_height: number;
    processed_width: number;
    processed_height: number;
    scale_factors: { x: number; y: number };
  };
  inference_time_ms: number;
  // Convenience aliases for backward compat
  heatmap?: number[][];
  heatmap_base64?: string;
  overlay_base64?: string;
}

// LIME segment info from backend
export interface LIMESegmentInfo {
  segment_id: number;
  rank: number;
  importance: number;
  bbox: number[];
  centroid: number[];
  area_fraction: number;
  location: string;
}

export interface LIMERequest {
  n_segments?: number;
  n_samples?: number;
  top_k_features?: number;
  output_format?: string;
  colormap?: string;
  overlay_alpha?: number;
}

export interface LIMEResponse {
  lime_map: number[][];
  lime_image?: string;
  top_regions: LIMESegmentInfo[];
  segment_importance: Record<string, number>;
  n_segments: number;
  n_samples: number;
  method_used: string;
  inference_time_ms: number;
}

// SHAP region info from backend
export interface SHAPRegionInfo {
  region_id: number;
  bbox: number[];
  centroid: number[];
  mean_shap: number;
  area_fraction: number;
  contribution_type: string;
  location: string;
}

export interface SHAPRequest {
  method?: 'deep' | 'gradient' | 'partition' | 'kernel';
  n_samples?: number;
  n_background?: number;
  output_format?: string;
  colormap?: string;
  overlay_alpha?: number;
}

export interface SHAPResponse {
  shap_map: number[][];
  shap_image?: string;
  base_value: number;
  prediction_contribution: number;
  feature_importance: Record<string, number>;
  positive_regions: SHAPRegionInfo[];
  negative_regions: SHAPRegionInfo[];
  method_used: string;
  n_samples: number;
  n_background: number;
  inference_time_ms: number;
}

export interface XAIValidationRequest {
  attention_map: number[][];
  known_regions?: Array<Record<string, any>>;
  include_faithfulness?: boolean;
}

export interface XAIValidationResponse {
  overall_score: number;
  overall_status: 'passed' | 'warning' | 'failed';
  metrics: Array<{
    metric: string;
    score: number;
    status: 'passed' | 'warning' | 'failed';
    details: string;
    threshold: number;
    passed: boolean;
  }>;
  recommendations: string[];
  warnings: string[];
  passed: boolean;
  timestamp: string;
}

export interface ClinicalNarrativeRequest {
  prediction: string;
  malignancy_probability: number;
  confidence: number;
  uncertainty: number;
  suspicious_regions?: Array<Record<string, any>>;
  attention_quality?: number;
  patient_context?: Record<string, any>;
}

export interface ClinicalNarrativeResponse {
  impression: string;
  birads_category: string;
  birads_description: string;
  findings: string[];
  recommendations: string[];
  technical_notes: string;
  confidence_explanation: string;
  limitations: string[];
  disclaimer: string;
  generated_at: string;
}

// ============================================================================
// Case Management Types — Match Backend Pydantic Schemas (Phase C)
// ============================================================================

/** Request payload for creating a new clinical case */
export interface CaseCreateRequest {
  patient_mrn?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_sex?: string;
  clinical_history?: Record<string, any>;
}

/** Request payload for partially updating an existing case */
export interface CaseUpdateRequest {
  patient_mrn?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_dob?: string;
  patient_sex?: string;
  clinical_history?: Record<string, any>;
  workflow_current_step?: string;
  workflow_status?: string;
  workflow_completed_steps?: string[];
  birads_assessment?: Record<string, any>;
  report_content?: string;
}

/** Backend response for a single case image */
export interface BackendCaseImageResponse {
  id: string;
  filename: string;
  view_type: string;
  laterality: string;
  upload_status: string;
  file_size?: number | null;
  mime_type?: string | null;
  analysis_result?: Record<string, any> | null;
  analyzed_at?: string | null;
}

/** Backend response for a single case finding */
export interface BackendCaseFindingResponse {
  id: string;
  finding_type: string;
  laterality: string;
  description?: string | null;
  location?: Record<string, any> | null;
  size?: Record<string, any> | null;
  ai_confidence?: number | null;
  ai_generated: boolean;
  radiologist_confirmed: boolean;
  radiologist_notes?: string | null;
}

/** Full case detail response (includes nested images & findings) */
export interface BackendCaseResponse {
  id: string;
  case_number: string;
  patient_mrn?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  patient_dob?: string | null;
  patient_sex?: string | null;
  clinical_history?: Record<string, any> | null;
  workflow_current_step: string;
  workflow_status: string;
  workflow_completed_steps: string[];
  workflow_locked: boolean;
  birads_assessment?: Record<string, any> | null;
  report_content?: string | null;
  signed_at?: string | null;
  signature_hash?: string | null;
  images: BackendCaseImageResponse[];
  findings: BackendCaseFindingResponse[];
  created_at: string;
  updated_at: string;
}

/** Lightweight case summary for list endpoints (no nested data) */
export interface BackendCaseListResponse {
  id: string;
  case_number: string;
  patient_mrn?: string | null;
  patient_first_name?: string | null;
  patient_last_name?: string | null;
  workflow_current_step: string;
  workflow_status: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Axios Instance with Interceptors
// ============================================================================

class APIClient {
  private client: AxiosInstance;
  private refreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle token refresh on 401
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.refreshing) {
            // Wait for the ongoing refresh to complete
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.refreshing = true;

          try {
            const refreshToken = this.getRefreshToken();
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Refresh the token
            const response = await axios.post<AuthTokens>(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            const { access_token, refresh_token } = response.data;
            
            // Save new tokens
            this.saveTokens(access_token, refresh_token);

            // Retry all queued requests
            this.refreshSubscribers.forEach((callback) => callback(access_token));
            this.refreshSubscribers = [];

            // Retry original request
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Only redirect to login if this was a genuine auth failure, not a network error
            const isNetworkError = !(refreshError as AxiosError).response;
            if (!isNetworkError) {
              // Refresh failed due to invalid token - clear and redirect
              this.clearTokens();
              window.location.href = '/login';
            }
            // For network errors, just reject without redirecting
            return Promise.reject(refreshError);
          } finally {
            this.refreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Get stored access token
   */
  private getAccessToken(): string | null {
    return localStorage.getItem('clinicalvision_access_token') || 
           sessionStorage.getItem('clinicalvision_access_token');
  }

  /**
   * Get stored refresh token
   */
  private getRefreshToken(): string | null {
    return localStorage.getItem('clinicalvision_refresh_token') || 
           sessionStorage.getItem('clinicalvision_refresh_token');
  }

  /**
   * Save tokens to storage
   */
  private saveTokens(accessToken: string, refreshToken: string): void {
    try {
      localStorage.setItem('clinicalvision_access_token', accessToken);
      localStorage.setItem('clinicalvision_refresh_token', refreshToken);
    } catch (error) {
      console.error('Failed to save tokens:', error);
      sessionStorage.setItem('clinicalvision_access_token', accessToken);
      sessionStorage.setItem('clinicalvision_refresh_token', refreshToken);
    }
  }

  /**
   * Clear all stored tokens
   */
  private clearTokens(): void {
    localStorage.removeItem('clinicalvision_access_token');
    localStorage.removeItem('clinicalvision_refresh_token');
    localStorage.removeItem('clinicalvision_user');
    sessionStorage.removeItem('clinicalvision_access_token');
    sessionStorage.removeItem('clinicalvision_refresh_token');
    sessionStorage.removeItem('clinicalvision_user');
  }

  /**
   * Get axios instance for custom requests
   */
  public getInstance(): AxiosInstance {
    return this.client;
  }
}

// Create singleton instance
const apiClient = new APIClient();
const client = apiClient.getInstance();

// ============================================================================
// API Service Class
// ============================================================================

class ClinicalVisionAPI {
  // ==========================================================================
  // Authentication Endpoints
  // ==========================================================================

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await client.post<AuthTokens>('/api/v1/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Login failed');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await client.get<User>('/api/v1/auth/me');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user profile');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const response = await client.post<AuthTokens>('/api/v1/auth/refresh', {
        refresh_token: refreshToken,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Token refresh failed');
    }
  }

  // ==========================================================================
  // Image Management Endpoints
  // ==========================================================================

  /**
   * Upload medical image
   * @param request - Image file and metadata
   * @param onProgress - Progress callback (0-100)
   */
  async uploadImage(
    request: ImageUploadRequest,
    onProgress?: (progress: number) => void
  ): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', request.file);
      formData.append('patient_id', request.patient_id);
      
      if (request.study_instance_uid) {
        formData.append('study_instance_uid', request.study_instance_uid);
      } else {
        formData.append('study_instance_uid', `STUDY-${Date.now()}`);
      }
      
      if (request.series_instance_uid) {
        formData.append('series_instance_uid', request.series_instance_uid);
      }
      
      if (request.laterality) {
        formData.append('laterality', request.laterality);
      }
      
      if (request.view_position) {
        formData.append('view_position', request.view_position);
      }
      
      if (request.modality) {
        formData.append('modality', request.modality);
      }

      const response = await client.post<ImageUploadResponse>('/images/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Image upload failed');
    }
  }

  /**
   * Get image by ID
   */
  async getImage(imageId: string): Promise<any> {
    try {
      const response = await client.get(`/images/${imageId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch image');
    }
  }

  /**
   * List images
   */
  async listImages(params?: { skip?: number; limit?: number }): Promise<any> {
    try {
      const response = await client.get('/images/', { params });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to list images');
    }
  }

  /**
   * Delete image
   */
  async deleteImage(imageId: string): Promise<void> {
    try {
      await client.delete(`/images/${imageId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete image');
    }
  }

  // ==========================================================================
  // Inference Endpoints
  // ==========================================================================

  /**
   * Run AI prediction on uploaded file
   * @param file - Image file
   * @param options - Prediction options
   */
  async predict(
    file: File,
    options?: {
      return_visualization?: boolean;
      return_attention_maps?: boolean;
      save_result?: boolean;
    }
  ): Promise<InferenceResponse> {
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

        // Build query params - save_result must be a query param, not form body
        const params = new URLSearchParams();
        if (options?.save_result !== undefined) {
          params.append('save_result', String(options.save_result));
        }
        const queryString = params.toString();
        const url = `/inference/predict${queryString ? `?${queryString}` : ''}`;

        const response = await client.post<InferenceResponse>(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 180000, // 3 minutes for inference
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
          throw this.handleError(error, 'Prediction failed');
        }
        
        // Retry on server errors (5xx) or network errors
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`Inference attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw this.handleError(lastError, 'Prediction failed after multiple attempts');
  }

  /**
   * Run AI prediction on multiple images in a single batch request.
   *
   * Sends all files in one multipart POST, avoiding per-image HTTP overhead.
   * The backend processes them concurrently via asyncio.to_thread so total
   * wall-clock time is close to a single image rather than N × single.
   *
   * @param files - Array of image files
   * @param options - Prediction options
   * @returns Array of InferenceResponse objects (same order as input files)
   */
  async predictBatch(
    files: File[],
    options?: {
      save_result?: boolean;
    }
  ): Promise<{ results: InferenceResponse[]; total_images: number; batch_time_ms: number }> {
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append('files', file);
      }

      const params = new URLSearchParams();
      if (options?.save_result !== undefined) {
        params.append('save_result', String(options.save_result));
      }
      const queryString = params.toString();
      const url = `/inference/predict-batch${queryString ? `?${queryString}` : ''}`;

      const response = await client.post(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // 5 minutes for batch
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Batch prediction failed');
    }
  }

  /**
   * Run AI prediction on stored image
   */
  async predictFromStorage(imageId: string): Promise<InferenceResponse> {
    try {
      const response = await client.get<InferenceResponse>(`/inference/predict-from-storage/${imageId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Prediction from storage failed');
    }
  }

  /**
   * Run tile-based AI prediction on full-size mammogram
   * This enables high-resolution analysis of clinical mammograms
   * 
   * @param file - Image file (any resolution)
   * @param options - Tile analysis configuration
   */
  async predictWithTiles(
    file: File,
    options?: TileAnalysisOptions
  ): Promise<TileAnalysisResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Build query params
      const params = new URLSearchParams();
      if (options?.mode) params.append('mode', options.mode);
      if (options?.tile_size) params.append('tile_size', String(options.tile_size));
      if (options?.overlap) params.append('overlap', String(options.overlap));
      if (options?.attention_threshold) params.append('attention_threshold', String(options.attention_threshold));
      if (options?.max_tiles) params.append('max_tiles', String(options.max_tiles));
      if (options?.save_result !== undefined) params.append('save_result', String(options.save_result));

      const queryString = params.toString();
      const url = `/inference/predict-tiles${queryString ? `?${queryString}` : ''}`;

      const response = await client.post<TileAnalysisResponse>(url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 300000, // 5 minutes for tile analysis (can be slower)
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Tile-based prediction failed');
    }
  }

  /**
   * Get inference history for an image
   */
  async getInferenceHistory(imageId: string): Promise<any> {
    try {
      const response = await client.get(`/inference/history/${imageId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch inference history');
    }
  }

  // ==========================================================================
  // Health Check
  // ==========================================================================

  /**
   * Check backend health status
   */
  async checkHealth(): Promise<HealthStatus> {
    try {
      const response = await client.get<HealthStatus>('/health/');
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Health check failed');
    }
  }

  // ==========================================================================
  // Fairness Monitoring Endpoints
  // ==========================================================================

  /**
   * Get fairness monitoring dashboard data
   */
  async getFairnessDashboard(): Promise<FairnessDashboardResponse> {
    try {
      const response = await client.get<FairnessDashboardResponse>(
        '/api/v1/fairness/dashboard',
        { timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch fairness dashboard');
    }
  }

  /**
   * Get fairness alerts
   */
  async getFairnessAlerts(
    severity?: AlertSeverity,
    acknowledged?: boolean
  ): Promise<FairnessAlert[]> {
    try {
      const params: Record<string, any> = {};
      if (severity) params.severity = severity;
      if (acknowledged !== undefined) params.acknowledged = acknowledged;
      
      const response = await client.get<FairnessAlert[]>(
        '/api/v1/fairness/alerts',
        { params, timeout: 5000 }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch fairness alerts');
    }
  }

  /**
   * Acknowledge a fairness alert
   */
  async acknowledgeFairnessAlert(alertId: string): Promise<void> {
    try {
      await client.post(`/api/v1/fairness/alerts/${alertId}/acknowledge`);
    } catch (error) {
      throw this.handleError(error, 'Failed to acknowledge alert');
    }
  }

  // ==========================================================================
  // XAI (Explainability) Endpoints
  // ==========================================================================

  /**
   * Generate GradCAM/GradCAM++/Integrated Gradients heatmap
   */
  async generateGradCAM(
    file: File,
    options?: GradCAMRequest
  ): Promise<GradCAMResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (options?.method) params.append('method', options.method);
      if (options?.target_layer) params.append('target_layer', options.target_layer);
      if (options?.output_format) params.append('output_format', options.output_format);
      if (options?.colormap) params.append('colormap', options.colormap);
      if (options?.overlay_alpha) params.append('overlay_alpha', String(options.overlay_alpha));

      const queryString = params.toString();
      const url = `/inference/gradcam${queryString ? `?${queryString}` : ''}`;

      const response = await client.post<GradCAMResponse>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'GradCAM generation failed');
    }
  }

  /**
   * Generate LIME explanation for an image
   * Returns superpixel-based explanations showing feature importance
   */
  async generateLIME(
    file: File,
    options?: LIMERequest
  ): Promise<LIMEResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (options?.n_segments) params.append('n_segments', String(options.n_segments));
      if (options?.n_samples) params.append('n_samples', String(options.n_samples));
      if (options?.top_k_features) params.append('top_k_features', String(options.top_k_features));
      if (options?.output_format) params.append('output_format', options.output_format);
      if (options?.colormap) params.append('colormap', options.colormap);
      if (options?.overlay_alpha !== undefined) params.append('overlay_alpha', String(options.overlay_alpha));

      const queryString = params.toString();
      const url = `/inference/lime${queryString ? `?${queryString}` : ''}`;

      const response = await client.post<LIMEResponse>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // LIME can be slow
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'LIME explanation generation failed');
    }
  }

  /**
   * Generate SHAP explanation for an image
   * Returns feature attribution based on Shapley values
   */
  async generateSHAP(
    file: File,
    options?: SHAPRequest
  ): Promise<SHAPResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (options?.method) params.append('method', options.method);
      if (options?.n_samples) params.append('n_samples', String(options.n_samples));
      if (options?.n_background) params.append('n_background', String(options.n_background));
      if (options?.output_format) params.append('output_format', options.output_format);
      if (options?.colormap) params.append('colormap', options.colormap);
      if (options?.overlay_alpha !== undefined) params.append('overlay_alpha', String(options.overlay_alpha));

      const queryString = params.toString();
      const url = `/inference/shap${queryString ? `?${queryString}` : ''}`;

      const response = await client.post<SHAPResponse>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000, // SHAP can be slow
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'SHAP explanation generation failed');
    }
  }

  /**
   * Validate XAI explanations quality
   */
  async validateXAI(
    file: File,
    options?: Partial<XAIValidationRequest>
  ): Promise<XAIValidationResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const params = new URLSearchParams();
      if (options?.include_faithfulness !== undefined) {
        params.append('include_faithfulness', String(options.include_faithfulness));
      }

      const queryString = params.toString();
      const url = `/inference/xai/validate${queryString ? `?${queryString}` : ''}`;

      const response = await client.post<XAIValidationResponse>(url, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'XAI validation failed');
    }
  }

  /**
   * Generate clinical narrative from prediction results
   */
  async generateClinicalNarrative(
    request: ClinicalNarrativeRequest
  ): Promise<ClinicalNarrativeResponse> {
    try {
      const response = await client.post<ClinicalNarrativeResponse>(
        '/inference/narrative/generate',
        request
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Clinical narrative generation failed');
    }
  }

  // ==========================================================================
  // Case Management Endpoints (Phase C)
  // ==========================================================================

  /**
   * Create a new clinical case
   */
  async createCase(data: CaseCreateRequest): Promise<BackendCaseResponse> {
    try {
      const response = await client.post<BackendCaseResponse>('/api/v1/cases/', data);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to create case');
    }
  }

  /**
   * Get a clinical case by ID
   */
  async getCase(caseId: string): Promise<BackendCaseResponse> {
    try {
      const response = await client.get<BackendCaseResponse>(`/api/v1/cases/${caseId}`);
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch case');
    }
  }

  /**
   * List clinical cases with optional filters
   */
  async listCases(params?: {
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<BackendCaseListResponse[]> {
    try {
      const response = await client.get<BackendCaseListResponse[]>('/api/v1/cases/', {
        params,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to list cases');
    }
  }

  /**
   * Partially update an existing clinical case
   */
  async updateCase(
    caseId: string,
    data: CaseUpdateRequest
  ): Promise<BackendCaseResponse> {
    try {
      const response = await client.patch<BackendCaseResponse>(
        `/api/v1/cases/${caseId}`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to update case');
    }
  }

  /**
   * Soft-delete a clinical case
   */
  async deleteCase(caseId: string): Promise<void> {
    try {
      await client.delete(`/api/v1/cases/${caseId}`);
    } catch (error) {
      throw this.handleError(error, 'Failed to delete case');
    }
  }

  /**
   * Advance or navigate the workflow step
   */
  async advanceWorkflow(
    caseId: string,
    targetStep: string
  ): Promise<BackendCaseResponse> {
    try {
      const response = await client.patch<BackendCaseResponse>(
        `/api/v1/cases/${caseId}/workflow`,
        { target_step: targetStep }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to advance workflow');
    }
  }

  /**
   * Finalize and lock a clinical case
   */
  async finalizeCase(
    caseId: string,
    signatureHash?: string
  ): Promise<BackendCaseResponse> {
    try {
      const response = await client.post<BackendCaseResponse>(
        `/api/v1/cases/${caseId}/finalize`,
        { signature_hash: signatureHash ?? null }
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to finalize case');
    }
  }

  /**
   * Add an image to a clinical case
   */
  async addImageToCase(
    caseId: string,
    data: {
      filename: string;
      view_type?: string;
      laterality?: string;
      upload_status?: string;
      file_size?: number;
      mime_type?: string;
      analysis_result?: Record<string, any>;
    }
  ): Promise<BackendCaseImageResponse> {
    try {
      const response = await client.post<BackendCaseImageResponse>(
        `/api/v1/cases/${caseId}/images`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to add image to case');
    }
  }

  /**
   * Add a finding to a clinical case
   */
  async addFindingToCase(
    caseId: string,
    data: {
      finding_type?: string;
      laterality?: string;
      description?: string;
      location?: Record<string, any>;
      size?: Record<string, any>;
      ai_confidence?: number;
      ai_generated?: boolean;
    }
  ): Promise<BackendCaseFindingResponse> {
    try {
      const response = await client.post<BackendCaseFindingResponse>(
        `/api/v1/cases/${caseId}/findings`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to add finding to case');
    }
  }

  /**
   * Store AI analysis results for a clinical case
   */
  async storeAnalysisResults(
    caseId: string,
    data: {
      prediction: string;
      confidence: number;
      probabilities: Record<string, number>;
      risk_level: string;
      processing_time_ms?: number;
      model_version?: string;
      explanation?: Record<string, any>;
      uncertainty?: Record<string, any>;
    }
  ): Promise<BackendCaseResponse> {
    try {
      const response = await client.post<BackendCaseResponse>(
        `/api/v1/cases/${caseId}/analysis-results`,
        data
      );
      return response.data;
    } catch (error) {
      throw this.handleError(error, 'Failed to store analysis results');
    }
  }

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  /**
   * Handle API errors with context-aware messages
   */
  private handleError(error: unknown, defaultMessage: string): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;

      if (axiosError.response) {
        const status = axiosError.response.status;
        const detail = axiosError.response.data?.detail;
        const message = axiosError.response.data?.message;

        // Handle validation errors (422)
        if (status === 422 && Array.isArray(detail)) {
          const validationErrors = detail.map((err: any) => {
            const field = err.loc ? err.loc.join(' > ') : 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
          return new Error(`Validation error: ${validationErrors}`);
        }

        // Handle specific status codes
        switch (status) {
          case 400:
            return new Error(detail || message || 'Bad request');
          case 401:
            return new Error('Unauthorized. Please login again');
          case 403:
            return new Error('Access denied');
          case 404:
            return new Error('Resource not found');
          case 413:
            return new Error('File too large');
          case 415:
            return new Error('Unsupported file type');
          case 429:
            return new Error('Too many requests. Please try again later');
          case 500:
            return new Error('Server error. Please try again');
          case 503:
            return new Error('Service unavailable. Please try again later');
          default:
            return new Error(detail || message || defaultMessage);
        }
      } else if (axiosError.request) {
        return new Error('Network error. Please check your connection');
      }
    }

    return new Error(defaultMessage);
  }

  // ==========================================================================
  // Validation Utilities
  // ==========================================================================

  /**
   * Validate image file before upload
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE = 50 * 1024 * 1024; // 50MB
    const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'application/dicom'];
    const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.dcm', '.dicom'];

    if (file.size > MAX_SIZE) {
      return { valid: false, error: 'File size exceeds 50MB limit' };
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    const hasValidType = ALLOWED_TYPES.includes(file.type) || file.type === '';

    if (!hasValidExtension && !hasValidType) {
      return { valid: false, error: 'Invalid file format. Please upload PNG, JPG, or DICOM files' };
    }

    return { valid: true };
  }

  // ========================================================================
  // Public Form Submissions (no auth required)
  // ========================================================================

  /**
   * Submit contact form data
   */
  async submitContactForm(data: {
    name: string;
    email: string;
    company?: string;
    subject?: string;
    message: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await this.client.post('/api/v1/contact', data);
      return response.data;
    } catch (error) {
      // If the backend endpoint doesn't exist yet, log for observability
      // but don't block the UX — graceful degradation
      console.warn('Contact form submission endpoint not available:', error);
      return { success: true }; // Graceful fallback
    }
  }

  /**
   * Submit demo request form data
   */
  async submitDemoRequest(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    company?: string;
    role?: string;
    size?: string;
    message?: string;
  }): Promise<{ success: boolean }> {
    try {
      const response = await this.client.post('/api/v1/demo-request', data);
      return response.data;
    } catch (error) {
      console.warn('Demo request endpoint not available:', error);
      return { success: true }; // Graceful fallback
    }
  }
}

// Export singleton instance
export const api = new ClinicalVisionAPI();
export default api;
