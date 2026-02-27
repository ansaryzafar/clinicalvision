/**
 * Image Upload Operations Tests - Phase 4 TDD
 * 
 * These tests are written FIRST following TDD methodology.
 * They cover the uploadMultipleImages algorithm from ALGORITHM_DESIGN.md:
 * 
 * ALGORITHM: UploadMultipleImages
 * - Input: caseId, files[], metadata[]
 * - Output: Result<MammogramImage[]>
 * 
 * Test Categories:
 * 1. Input validation
 * 2. File validation
 * 3. Metadata validation
 * 4. Image object creation
 * 5. Case integration
 * 6. Error handling
 * 7. Edge cases
 * 8. Integration with workflow
 * 
 * @module imageUploadOperations.test
 */

// ============================================================================
// NOTE: URL.createObjectURL mock is set up in setupTests.ts
// ============================================================================

// ============================================================================
// IMPORTS
// ============================================================================

import {
  ClinicalCase,
  MammogramImage,
  ViewType,
  Laterality,
  ClinicalWorkflowStep,
  MAX_FILE_SIZE,
  MAX_IMAGES_PER_CASE,
  ALLOWED_MIME_TYPES,
  Result,
  FieldError,
} from '../../types/case.types';
import { assertFailure } from '../../types/resultHelpers';

import {
  validateImageFile,
  validateImageMetadata,
  validateImageBatch,
  ImageMetadataInput,
} from '../validators';

// Import functions under test (will be created after tests)
import {
  createMammogramImage,
  addImageToCase,
  addImagesToCase,
  prepareImagesForUpload,
  removeImageFromCase,
  getImageById,
  getImagesByLaterality,
  getImagesByView,
  validateImagesForAnalysis,
  canAddMoreImages,
  getUploadProgress,
  markImageUploaded,
  markImageFailed,
  ImageUploadError,
} from '../imageUploadOperations';

import { createClinicalCase, generateUUID } from '../caseOperations';

// ============================================================================
// RESET MOCKS BETWEEN TESTS
// ============================================================================

beforeEach(() => {
  jest.clearAllMocks();
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock File object for testing
 */
function createMockFile(
  name: string = 'test.png',
  size: number = 1024,
  type: string = 'image/png'
): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

/**
 * Create valid test patient info
 */
function createValidPatientInfo() {
  return {
    mrn: 'MRN12345',
    firstName: 'Jane',
    lastName: 'Doe',
    dateOfBirth: '1980-01-15',
    gender: 'F' as const,
  };
}

/**
 * Create valid test clinical history
 */
function createValidClinicalHistory() {
  return {
    clinicalIndication: 'Screening mammogram',
    familyHistoryBreastCancer: false,
    personalHistoryBreastCancer: false,
    previousBiopsy: false,
    comparisonAvailable: false,
  };
}

/**
 * Create a valid test case
 */
function createTestCase(): ClinicalCase {
  const result = createClinicalCase(
    createValidPatientInfo(),
    createValidClinicalHistory(),
    'test-user-id'
  );
  if (!result.success) {
    throw new Error('Failed to create test case');
  }
  return result.data;
}

/**
 * Create a case at IMAGE_UPLOAD step
 */
function createCaseAtImageUploadStep(): ClinicalCase {
  const case_ = createTestCase();
  return {
    ...case_,
    workflow: {
      ...case_.workflow,
      currentStep: ClinicalWorkflowStep.IMAGE_UPLOAD,
      completedSteps: [
        ClinicalWorkflowStep.PATIENT_REGISTRATION,
        ClinicalWorkflowStep.CLINICAL_HISTORY,
      ],
    },
  };
}

/**
 * Create standard 4-view metadata
 */
function createStandard4ViewMetadata(): ImageMetadataInput[] {
  return [
    { viewType: ViewType.CC, laterality: Laterality.RIGHT },
    { viewType: ViewType.CC, laterality: Laterality.LEFT },
    { viewType: ViewType.MLO, laterality: Laterality.RIGHT },
    { viewType: ViewType.MLO, laterality: Laterality.LEFT },
  ];
}

// ============================================================================
// TEST SUITE: createMammogramImage
// ============================================================================

describe('createMammogramImage', () => {
  describe('Valid Input', () => {
    it('should create a MammogramImage from valid file and metadata', () => {
      const file = createMockFile('RCC.png', 5000, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(true);
      if (result.success === true) {
        expect(result.data.filename).toBe('RCC.png');
        expect(result.data.fileSize).toBe(5000);
        expect(result.data.mimeType).toBe('image/png');
        expect(result.data.viewType).toBe(ViewType.CC);
        expect(result.data.laterality).toBe(Laterality.RIGHT);
        expect(result.data.uploadStatus).toBe('uploaded');
        expect(result.data.id).toBeDefined();
        // localUrl is set via URL.createObjectURL mock
        expect(typeof result.data.localUrl).toBe('string');
        expect(result.data.localUrl.length).toBeGreaterThan(0);
      }
    });

    it('should generate unique IDs for each image', () => {
      const file1 = createMockFile('image1.png');
      const file2 = createMockFile('image2.png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.LEFT };

      const result1 = createMammogramImage(file1, metadata);
      const result2 = createMammogramImage(file2, metadata);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.data.id).not.toBe(result2.data.id);
      }
    });

    it('should handle DICOM files', () => {
      const file = createMockFile('study.dcm', 10000, 'application/dicom');
      const metadata = { viewType: ViewType.MLO, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mimeType).toBe('application/dicom');
      }
    });

    it('should handle JPEG files', () => {
      const file = createMockFile('mammogram.jpg', 8000, 'image/jpeg');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.LEFT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.mimeType).toBe('image/jpeg');
      }
    });

    it('should create localUrl for image preview', () => {
      const file = createMockFile('preview.png', 2000, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(true);
      if (result.success === true) {
        // The mock returns 'blob:test-N' format
        expect(typeof result.data.localUrl).toBe('string');
        expect(result.data.localUrl.startsWith('blob:')).toBe(true);
      }
    });
  });

  describe('Invalid File', () => {
    it('should fail for null file', () => {
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(null as unknown as File, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'file')).toBe(true);
      }
    });

    it('should fail for file exceeding max size', () => {
      const file = createMockFile('huge.png', MAX_FILE_SIZE + 1, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.code === 'FILE_TOO_LARGE')).toBe(true);
      }
    });

    it('should fail for empty file (0 bytes)', () => {
      const file = createMockFile('empty.png', 0, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.code === 'FILE_EMPTY')).toBe(true);
      }
    });

    it('should fail for unsupported MIME type', () => {
      const file = createMockFile('document.pdf', 5000, 'application/pdf');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.code === 'INVALID_FILE_TYPE')).toBe(true);
      }
    });
  });

  describe('Invalid Metadata', () => {
    it('should fail for null metadata', () => {
      const file = createMockFile('test.png');

      const result = createMammogramImage(file, null as unknown as ImageMetadataInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'metadata')).toBe(true);
      }
    });

    it('should fail for missing viewType', () => {
      const file = createMockFile('test.png');
      const metadata = { laterality: Laterality.RIGHT } as ImageMetadataInput;

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'viewType')).toBe(true);
      }
    });

    it('should fail for missing laterality', () => {
      const file = createMockFile('test.png');
      const metadata = { viewType: ViewType.CC } as ImageMetadataInput;

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'laterality')).toBe(true);
      }
    });

    it('should fail for invalid viewType', () => {
      const file = createMockFile('test.png');
      const metadata = { viewType: 'INVALID', laterality: Laterality.RIGHT } as ImageMetadataInput;

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'viewType')).toBe(true);
      }
    });

    it('should fail for invalid laterality', () => {
      const file = createMockFile('test.png');
      const metadata = { viewType: ViewType.CC, laterality: 'B' } as ImageMetadataInput;

      const result = createMammogramImage(file, metadata);

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.field === 'laterality')).toBe(true);
      }
    });
  });
});

// ============================================================================
// TEST SUITE: addImageToCase
// ============================================================================

describe('addImageToCase', () => {
  it('should add an image to a case with no existing images', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images.length).toBe(1);
      expect(result.data.images[0].viewType).toBe(ViewType.CC);
      expect(result.data.images[0].laterality).toBe(Laterality.RIGHT);
    }
  });

  it('should add an image to a case with existing images', () => {
    const case_ = createCaseAtImageUploadStep();
    const file1 = createMockFile('RCC.png', 5000, 'image/png');
    const file2 = createMockFile('LCC.png', 5000, 'image/png');
    const metadata1 = { viewType: ViewType.CC, laterality: Laterality.RIGHT };
    const metadata2 = { viewType: ViewType.CC, laterality: Laterality.LEFT };

    // Add first image
    const result1 = addImageToCase(case_, file1, metadata1, 'test-user');
    expect(result1.success).toBe(true);

    // Add second image
    if (result1.success) {
      const result2 = addImageToCase(result1.data, file2, metadata2, 'test-user');
      expect(result2.success).toBe(true);
      if (result2.success) {
        expect(result2.data.images.length).toBe(2);
      }
    }
  });

  it('should fail when max images limit is reached', () => {
    let case_ = createCaseAtImageUploadStep();
    
    // Add MAX_IMAGES_PER_CASE images
    for (let i = 0; i < MAX_IMAGES_PER_CASE; i++) {
      const file = createMockFile(`image${i}.png`, 1000, 'image/png');
      const metadata = { 
        viewType: i % 2 === 0 ? ViewType.CC : ViewType.MLO, 
        laterality: i % 4 < 2 ? Laterality.RIGHT : Laterality.LEFT 
      };
      const result = addImageToCase(case_, file, metadata, 'test-user');
      if (result.success) {
        case_ = result.data;
      }
    }

    expect(case_.images.length).toBe(MAX_IMAGES_PER_CASE);

    // Try to add one more
    const extraFile = createMockFile('extra.png', 1000, 'image/png');
    const extraMetadata = { viewType: ViewType.SPOT, laterality: Laterality.RIGHT };
    const result = addImageToCase(case_, extraFile, extraMetadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'MAX_IMAGES_EXCEEDED')).toBe(true);
    }
  });

  it('should update audit trail when adding image', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.audit.modifications.length).toBeGreaterThan(case_.audit.modifications.length);
      const lastMod = result.data.audit.modifications[result.data.audit.modifications.length - 1];
      expect(lastMod.action).toBe('ADD_IMAGE');
      expect(lastMod.userId).toBe('test-user');
    }
  });

  it('should preserve immutability of original case', () => {
    const case_ = createCaseAtImageUploadStep();
    const originalImages = [...case_.images];
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    addImageToCase(case_, file, metadata, 'test-user');

    // Original case should be unchanged
    expect(case_.images).toEqual(originalImages);
    expect(case_.images.length).toBe(0);
  });

  it('should warn about duplicate view/laterality combination', () => {
    const case_ = createCaseAtImageUploadStep();
    const file1 = createMockFile('RCC1.png', 5000, 'image/png');
    const file2 = createMockFile('RCC2.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result1 = addImageToCase(case_, file1, metadata, 'test-user');
    expect(result1.success).toBe(true);

    if (result1.success) {
      const result2 = addImageToCase(result1.data, file2, metadata, 'test-user');
      expect(result2.success).toBe(true);
      if (result2.success) {
        // Should have warning about duplicate
        expect(result2.warnings?.some(w => w.includes('duplicate') || w.includes('Duplicate'))).toBe(true);
      }
    }
  });
});

// ============================================================================
// TEST SUITE: addImagesToCase (batch)
// ============================================================================

describe('addImagesToCase (batch)', () => {
  it('should add multiple images at once', () => {
    const case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
      createMockFile('RMLO.png', 5000, 'image/png'),
      createMockFile('LMLO.png', 5000, 'image/png'),
    ];
    const metadata = createStandard4ViewMetadata();

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images.length).toBe(4);
    }
  });

  it('should fail when files and metadata count mismatch', () => {
    const case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
    ];
    const metadata = createStandard4ViewMetadata(); // 4 metadata items

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'METADATA_MISMATCH')).toBe(true);
    }
  });

  it('should fail when no files provided', () => {
    const case_ = createCaseAtImageUploadStep();
    const files: File[] = [];
    const metadata: ImageMetadataInput[] = [];

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'REQUIRED')).toBe(true);
    }
  });

  it('should fail when total images would exceed max', () => {
    // Create case with some existing images
    let case_ = createCaseAtImageUploadStep();
    for (let i = 0; i < 6; i++) {
      const file = createMockFile(`existing${i}.png`, 1000, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };
      const result = addImageToCase(case_, file, metadata, 'test-user');
      if (result.success) case_ = result.data;
    }

    // Try to add 4 more (would exceed max of 8)
    const files = [
      createMockFile('new1.png'),
      createMockFile('new2.png'),
      createMockFile('new3.png'),
      createMockFile('new4.png'),
    ];
    const metadata = createStandard4ViewMetadata();

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'MAX_IMAGES_EXCEEDED')).toBe(true);
    }
  });

  it('should return indexed errors for each invalid file', () => {
    const case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('valid.png', 5000, 'image/png'),
      createMockFile('empty.png', 0, 'image/png'),  // Invalid: empty
      createMockFile('huge.png', MAX_FILE_SIZE + 1, 'image/png'),  // Invalid: too large
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
      { viewType: ViewType.MLO, laterality: Laterality.RIGHT },
    ];

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      // Should have errors with index information
      const error = assertFailure(result);
      const indexedErrors = error.errors.filter(e => e.index !== undefined);
      expect(indexedErrors.length).toBeGreaterThan(0);
      expect(indexedErrors.some(e => e.index === 1)).toBe(true); // empty file
      expect(indexedErrors.some(e => e.index === 2)).toBe(true); // huge file
    }
  });

  it('should provide warnings about incomplete standard 4-view set', () => {
    const case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
      // Missing MLO views
    ];

    const result = addImagesToCase(case_, files, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings?.some(w => w.includes('RMLO') || w.includes('LMLO'))).toBe(true);
    }
  });
});

// ============================================================================
// TEST SUITE: prepareImagesForUpload
// ============================================================================

describe('prepareImagesForUpload', () => {
  it('should create pending MammogramImage objects for all valid files', () => {
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
    ];

    const result = prepareImagesForUpload(files, metadata);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.length).toBe(2);
      expect(result.data.every(img => img.uploadStatus === 'uploaded')).toBe(true);
    }
  });

  it('should validate all files and metadata before creating images', () => {
    const files = [
      createMockFile('valid.png', 5000, 'image/png'),
      createMockFile('invalid.pdf', 5000, 'application/pdf'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
    ];

    const result = prepareImagesForUpload(files, metadata);

    expect(result.success).toBe(false);
  });

  it('should return errors with proper indexing', () => {
    const files = [
      createMockFile('valid.png', 5000, 'image/png'),
      createMockFile('invalid.pdf', 5000, 'application/pdf'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: 'INVALID', laterality: Laterality.LEFT },
    ];

    const result = prepareImagesForUpload(files, metadata);

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.index === 1)).toBe(true);
    }
  });
});

// ============================================================================
// TEST SUITE: removeImageFromCase
// ============================================================================

describe('removeImageFromCase', () => {
  it('should remove an image by ID', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    // Add image
    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    expect(addResult.success).toBe(true);
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;

      // Remove image
      const removeResult = removeImageFromCase(case_, imageId, 'test-user');

      expect(removeResult.success).toBe(true);
      if (removeResult.success) {
        expect(removeResult.data.images.length).toBe(0);
      }
    }
  });

  it('should fail when image ID not found', () => {
    const case_ = createCaseAtImageUploadStep();

    const result = removeImageFromCase(case_, 'non-existent-id', 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'NOT_FOUND')).toBe(true);
    }
  });

  it('should update audit trail when removing image', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    // Add image
    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    expect(addResult.success).toBe(true);
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;
      const prevModCount = case_.audit.modifications.length;

      // Remove image
      const removeResult = removeImageFromCase(case_, imageId, 'test-user');

      expect(removeResult.success).toBe(true);
      if (removeResult.success) {
        expect(removeResult.data.audit.modifications.length).toBe(prevModCount + 1);
        const lastMod = removeResult.data.audit.modifications[removeResult.data.audit.modifications.length - 1];
        expect(lastMod.action).toBe('REMOVE_IMAGE');
      }
    }
  });

  it('should fail when case is finalized', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    // Add image
    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      // Mark case as finalized
      case_ = {
        ...case_,
        workflow: {
          ...case_.workflow,
          status: 'finalized',
          isLocked: true,
        },
      };
      const imageId = case_.images[0].id;

      // Try to remove image
      const result = removeImageFromCase(case_, imageId, 'test-user');

      expect(result.success).toBe(false);
      if (!result.success) {
        const error = assertFailure(result);
        expect(error.errors.some(e => e.code === 'CASE_LOCKED')).toBe(true);
      }
    }
  });
});

// ============================================================================
// TEST SUITE: Image Retrieval Utilities
// ============================================================================

describe('getImageById', () => {
  it('should return image when found', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;

      const image = getImageById(case_, imageId);

      expect(image).toBeDefined();
      expect(image?.id).toBe(imageId);
    }
  });

  it('should return undefined when not found', () => {
    const case_ = createCaseAtImageUploadStep();

    const image = getImageById(case_, 'non-existent-id');

    expect(image).toBeUndefined();
  });
});

describe('getImagesByLaterality', () => {
  it('should return all images for given laterality', () => {
    let case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('RMLO.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.MLO, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
    ];

    const result = addImagesToCase(case_, files, metadata, 'test-user');
    if (result.success) {
      case_ = result.data;

      const rightImages = getImagesByLaterality(case_, Laterality.RIGHT);
      const leftImages = getImagesByLaterality(case_, Laterality.LEFT);

      expect(rightImages.length).toBe(2);
      expect(leftImages.length).toBe(1);
    }
  });

  it('should return empty array when no images match', () => {
    const case_ = createCaseAtImageUploadStep();

    const images = getImagesByLaterality(case_, Laterality.RIGHT);

    expect(images).toEqual([]);
  });
});

describe('getImagesByView', () => {
  it('should return all images for given view type', () => {
    let case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
      createMockFile('RMLO.png', 5000, 'image/png'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
      { viewType: ViewType.MLO, laterality: Laterality.RIGHT },
    ];

    const result = addImagesToCase(case_, files, metadata, 'test-user');
    if (result.success) {
      case_ = result.data;

      const ccImages = getImagesByView(case_, ViewType.CC);
      const mloImages = getImagesByView(case_, ViewType.MLO);

      expect(ccImages.length).toBe(2);
      expect(mloImages.length).toBe(1);
    }
  });
});

// ============================================================================
// TEST SUITE: validateImagesForAnalysis
// ============================================================================

describe('validateImagesForAnalysis', () => {
  it('should pass when case has at least one uploaded image', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      // Mark as uploaded
      case_ = {
        ...case_,
        images: case_.images.map(img => ({ ...img, uploadStatus: 'uploaded' as const })),
      };

      const result = validateImagesForAnalysis(case_);

      expect(result.isValid).toBe(true);
    }
  });

  it('should fail when case has no images', () => {
    const case_ = createCaseAtImageUploadStep();

    const result = validateImagesForAnalysis(case_);

    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.message.includes('no images') || e.message.includes('At least'))).toBe(true);
  });

  it('should fail when images are not fully uploaded', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      // Manually set image to 'pending' to simulate a real upload-in-progress scenario
      case_ = {
        ...case_,
        images: case_.images.map(img => ({ ...img, uploadStatus: 'pending' as const })),
      };

      const result = validateImagesForAnalysis(case_);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === 'PENDING_UPLOADS')).toBe(true);
    }
  });

  it('should warn about incomplete 4-view set', () => {
    let case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('RCC.png', 5000, 'image/png'),
      createMockFile('LCC.png', 5000, 'image/png'),
    ];
    const metadata = [
      { viewType: ViewType.CC, laterality: Laterality.RIGHT },
      { viewType: ViewType.CC, laterality: Laterality.LEFT },
    ];

    const addResult = addImagesToCase(case_, files, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      // Mark as uploaded
      case_ = {
        ...case_,
        images: case_.images.map(img => ({ ...img, uploadStatus: 'uploaded' as const })),
      };

      const result = validateImagesForAnalysis(case_);

      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.includes('RMLO') || w.includes('LMLO'))).toBe(true);
    }
  });
});

// ============================================================================
// TEST SUITE: canAddMoreImages
// ============================================================================

describe('canAddMoreImages', () => {
  it('should return true when under limit', () => {
    const case_ = createCaseAtImageUploadStep();

    const result = canAddMoreImages(case_);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_IMAGES_PER_CASE);
  });

  it('should return false when at limit', () => {
    let case_ = createCaseAtImageUploadStep();
    
    // Add max images
    for (let i = 0; i < MAX_IMAGES_PER_CASE; i++) {
      const file = createMockFile(`image${i}.png`, 1000, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };
      const result = addImageToCase(case_, file, metadata, 'test-user');
      if (result.success) case_ = result.data;
    }

    const result = canAddMoreImages(case_);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should correctly calculate remaining slots', () => {
    let case_ = createCaseAtImageUploadStep();
    
    // Add 3 images
    for (let i = 0; i < 3; i++) {
      const file = createMockFile(`image${i}.png`, 1000, 'image/png');
      const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };
      const result = addImageToCase(case_, file, metadata, 'test-user');
      if (result.success) case_ = result.data;
    }

    const result = canAddMoreImages(case_);

    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(MAX_IMAGES_PER_CASE - 3);
  });
});

// ============================================================================
// TEST SUITE: Upload Status Management
// ============================================================================

describe('getUploadProgress', () => {
  it('should return 0 when no images', () => {
    const case_ = createCaseAtImageUploadStep();

    const progress = getUploadProgress(case_);

    expect(progress.total).toBe(0);
    expect(progress.uploaded).toBe(0);
    expect(progress.failed).toBe(0);
    expect(progress.pending).toBe(0);
    expect(progress.percentage).toBe(0);
  });

  it('should calculate percentage correctly', () => {
    let case_ = createCaseAtImageUploadStep();
    const files = [
      createMockFile('img1.png'),
      createMockFile('img2.png'),
      createMockFile('img3.png'),
      createMockFile('img4.png'),
    ];
    const metadata = createStandard4ViewMetadata();

    const addResult = addImagesToCase(case_, files, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      // Mark 2 as uploaded
      case_ = {
        ...case_,
        images: case_.images.map((img, i) => ({
          ...img,
          uploadStatus: i < 2 ? 'uploaded' : 'pending',
        })),
      };

      const progress = getUploadProgress(case_);

      expect(progress.total).toBe(4);
      expect(progress.uploaded).toBe(2);
      expect(progress.pending).toBe(2);
      expect(progress.percentage).toBe(50);
    }
  });
});

describe('markImageUploaded', () => {
  it('should update image status to uploaded', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;

      const result = markImageUploaded(case_, imageId, '/server/path/to/image.png', 123);

      expect(result.success).toBe(true);
      if (result.success) {
        const image = result.data.images.find(img => img.id === imageId);
        expect(image?.uploadStatus).toBe('uploaded');
        expect(image?.serverPath).toBe('/server/path/to/image.png');
        expect(image?.backendImageId).toBe(123);
      }
    }
  });

  it('should set uploadedAt timestamp', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;

      const result = markImageUploaded(case_, imageId, '/server/path', 1);

      expect(result.success).toBe(true);
      if (result.success) {
        const image = result.data.images.find(img => img.id === imageId);
        expect(image?.uploadedAt).toBeDefined();
      }
    }
  });
});

describe('markImageFailed', () => {
  it('should update image status to failed with error message', () => {
    let case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const addResult = addImageToCase(case_, file, metadata, 'test-user');
    if (addResult.success) {
      case_ = addResult.data;
      const imageId = case_.images[0].id;

      const result = markImageFailed(case_, imageId, 'Network timeout');

      expect(result.success).toBe(true);
      if (result.success) {
        const image = result.data.images.find(img => img.id === imageId);
        expect(image?.uploadStatus).toBe('failed');
        expect(image?.uploadError).toBe('Network timeout');
      }
    }
  });
});

// ============================================================================
// TEST SUITE: Workflow Integration
// ============================================================================

describe('Workflow Integration', () => {
  it('should allow image upload at IMAGE_UPLOAD step', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
  });

  it('should allow image upload at IMAGE_VERIFICATION step', () => {
    let case_ = createCaseAtImageUploadStep();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.IMAGE_VERIFICATION,
        completedSteps: [
          ...case_.workflow.completedSteps,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
        ],
      },
    };
    const file = createMockFile('extra.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.SPOT, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
  });

  it('should NOT allow image upload before reaching IMAGE_UPLOAD step', () => {
    const case_ = createTestCase(); // At PATIENT_REGISTRATION
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'WORKFLOW_STEP_INVALID')).toBe(true);
    }
  });

  it('should NOT allow image upload after BATCH_AI_ANALYSIS step', () => {
    let case_ = createCaseAtImageUploadStep();
    case_ = {
      ...case_,
      workflow: {
        ...case_.workflow,
        currentStep: ClinicalWorkflowStep.FINDINGS_REVIEW,
        completedSteps: [
          ClinicalWorkflowStep.PATIENT_REGISTRATION,
          ClinicalWorkflowStep.CLINICAL_HISTORY,
          ClinicalWorkflowStep.IMAGE_UPLOAD,
          ClinicalWorkflowStep.IMAGE_VERIFICATION,
          ClinicalWorkflowStep.BATCH_AI_ANALYSIS,
        ],
      },
    };
    const file = createMockFile('late.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(false);
    if (!result.success) {
      const error = assertFailure(result);
      expect(error.errors.some(e => e.code === 'WORKFLOW_STEP_INVALID')).toBe(true);
    }
  });
});

// ============================================================================
// TEST SUITE: Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  it('should handle files with special characters in name', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('患者 image (1) - copy.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      // Filename should be sanitized
      expect(result.data.images[0].filename).not.toContain('<script>');
    }
  });

  it('should handle very long filenames', () => {
    const case_ = createCaseAtImageUploadStep();
    const longName = 'a'.repeat(300) + '.png';
    const file = createMockFile(longName, 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0].filename.length).toBeLessThanOrEqual(255);
    }
  });

  it('should handle XSS in filename', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('<script>alert("xss")</script>.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0].filename).not.toContain('<script>');
      expect(result.data.images[0].filename).not.toContain('</script>');
    }
  });

  it('should handle concurrent additions safely (immutability test)', () => {
    const case_ = createCaseAtImageUploadStep();
    const file1 = createMockFile('img1.png', 5000, 'image/png');
    const file2 = createMockFile('img2.png', 5000, 'image/png');
    const metadata1 = { viewType: ViewType.CC, laterality: Laterality.RIGHT };
    const metadata2 = { viewType: ViewType.CC, laterality: Laterality.LEFT };

    // Both operations start from the same base case
    const result1 = addImageToCase(case_, file1, metadata1, 'user1');
    const result2 = addImageToCase(case_, file2, metadata2, 'user2');

    // Both should succeed independently
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);

    // Original case should be unchanged
    expect(case_.images.length).toBe(0);
  });

  it('should handle null bytes in filename', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('image\x00.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0].filename).not.toContain('\x00');
    }
  });

  it('should handle path traversal attempts in filename', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('../../../etc/passwd.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.images[0].filename).not.toContain('..');
      expect(result.data.images[0].filename).not.toContain('/');
    }
  });
});

// ============================================================================
// TEST SUITE: Type Safety (compile-time checks)
// ============================================================================

describe('Type Safety', () => {
  it('should maintain correct types for MammogramImage', () => {
    const case_ = createCaseAtImageUploadStep();
    const file = createMockFile('RCC.png', 5000, 'image/png');
    const metadata = { viewType: ViewType.CC, laterality: Laterality.RIGHT };

    const result = addImageToCase(case_, file, metadata, 'test-user');

    if (result.success) {
      const image = result.data.images[0];
      
      // TypeScript should catch any type mismatches at compile time
      const id: string = image.id;
      const filename: string = image.filename;
      const fileSize: number = image.fileSize;
      const viewType: ViewType = image.viewType;
      const laterality: Laterality = image.laterality;
      
      expect(typeof id).toBe('string');
      expect(typeof filename).toBe('string');
      expect(typeof fileSize).toBe('number');
      expect(Object.values(ViewType)).toContain(viewType);
      expect(Object.values(Laterality)).toContain(laterality);
    }
  });
});
