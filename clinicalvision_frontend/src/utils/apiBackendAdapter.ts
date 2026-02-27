/**
 * ApiBackendAdapter (Phase C, Steps C.3 & C.4)
 *
 * Bridges the ClinicalVisionAPI service (which uses backend snake_case types)
 * to the BackendAdapter interfaces expected by PersistenceManager and SyncQueue
 * (which use frontend ClinicalCase types).
 *
 * Responsibilities:
 * - Convert frontend ClinicalCase → backend CaseCreateRequest/CaseUpdateRequest
 * - Convert backend BackendCaseResponse → frontend ClinicalCase (partial merge)
 * - Provide adapter instances for PersistenceManager and SyncQueue
 *
 * @module ApiBackendAdapter
 */

import { api } from '../services/api';
import type {
  BackendCaseResponse,
  CaseCreateRequest,
  CaseUpdateRequest,
} from '../services/api';

import type { ClinicalCase } from '../types/case.types';
import type { BackendAdapter as PersistenceBackendAdapter } from './persistenceManager';
import type { BackendAdapter as SyncBackendAdapter } from './syncQueue';

// ============================================================================
// CONVERSION UTILITIES
// ============================================================================

/**
 * Convert a frontend ClinicalCase to a CaseCreateRequest for the backend.
 */
function toCreateRequest(c: ClinicalCase): CaseCreateRequest {
  return {
    patient_mrn: c.patient?.mrn || undefined,
    patient_first_name: c.patient?.firstName || undefined,
    patient_last_name: c.patient?.lastName || undefined,
    patient_dob: c.patient?.dateOfBirth || undefined,
    patient_sex: c.patient?.gender || undefined,
    clinical_history: c.clinicalHistory
      ? (c.clinicalHistory as unknown as Record<string, any>)
      : undefined,
  };
}

/**
 * Convert a frontend ClinicalCase partial to a CaseUpdateRequest for the backend.
 */
function toUpdateRequest(data: Partial<ClinicalCase>): CaseUpdateRequest {
  const req: CaseUpdateRequest = {};
  if (data.patient) {
    req.patient_mrn = data.patient.mrn || undefined;
    req.patient_first_name = data.patient.firstName || undefined;
    req.patient_last_name = data.patient.lastName || undefined;
    req.patient_dob = data.patient.dateOfBirth || undefined;
    req.patient_sex = data.patient.gender || undefined;
  }
  if (data.clinicalHistory) {
    req.clinical_history = data.clinicalHistory as unknown as Record<string, any>;
  }
  if (data.workflow) {
    req.workflow_current_step = data.workflow.currentStep;
    req.workflow_status = data.workflow.status;
    req.workflow_completed_steps = data.workflow.completedSteps;
  }
  if (data.assessment) {
    req.birads_assessment = data.assessment as unknown as Record<string, any>;
  }
  if (data.report?.content) {
    req.report_content = JSON.stringify(data.report.content);
  }
  return req;
}

/**
 * Merge a backend response into an existing ClinicalCase, preserving frontend-only fields.
 * Only updates the backendId and timestamps; the local state is the source of truth.
 */
function mergeBackendResponse(
  local: ClinicalCase,
  backend: BackendCaseResponse
): ClinicalCase {
  return {
    ...local,
    backendId: backend.id,
  };
}

/**
 * Create a minimal ClinicalCase shell from a backend response.
 * Used when loading a case that exists on the backend but not locally.
 * Returns null — callers should use their own hydration logic.
 */
function backendToClinicalCase(
  _backend: BackendCaseResponse
): ClinicalCase | null {
  // Full hydration requires complex type mapping; for now the system
  // uses the local ClinicalCase as the source of truth.
  // A full implementation would map every backend field.
  return null;
}

// ============================================================================
// ADAPTER IMPLEMENTATION
// ============================================================================

/**
 * Create a BackendAdapter compatible with both PersistenceManager and SyncQueue.
 *
 * This adapter:
 * - Calls the api service methods for HTTP communication
 * - Converts between frontend and backend types
 * - Returns ClinicalCase objects by merging backend responses with input data
 */
export function createApiBackendAdapter(): PersistenceBackendAdapter & SyncBackendAdapter {
  return {
    async createCase(case_: ClinicalCase): Promise<ClinicalCase> {
      const resp = await api.createCase(toCreateRequest(case_));
      return mergeBackendResponse(case_, resp);
    },

    async updateCase(
      caseId: string,
      data: Partial<ClinicalCase>
    ): Promise<ClinicalCase> {
      const resp = await api.updateCase(caseId, toUpdateRequest(data));
      // Merge backend response with the partial data
      const merged: ClinicalCase = {
        ...data,
        backendId: resp.id,
      } as ClinicalCase;
      return merged;
    },

    async deleteCase(caseId: string): Promise<void> {
      await api.deleteCase(caseId);
    },

    async getCase(caseId: string): Promise<ClinicalCase | null> {
      try {
        const resp = await api.getCase(caseId);
        return backendToClinicalCase(resp);
      } catch {
        return null;
      }
    },

    async listCases(_userId: string): Promise<ClinicalCase[]> {
      // The backend filters by authenticated user automatically
      // Full hydration not yet supported — return empty for now
      return [];
    },
  };
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Default adapter instance wired to the global `api` service */
export const apiBackendAdapter = createApiBackendAdapter();

export default apiBackendAdapter;
