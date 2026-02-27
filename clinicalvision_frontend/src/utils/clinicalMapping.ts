/**
 * Clinical Mapping Utilities for Breast Cancer Detection
 * Based on BI-RADS Assessment Categories and Breast Cancer Types
 * Anatomical localization using UCLA Health standards
 */

export interface BiRadsCategory {
  category: number;
  subCategory?: string;
  label: string;
  description: string;
  recommendedAction: string;
  likelihoodOfCancer: string;
  cancerProbability: string;
  color: string;
  urgency: 'low' | 'moderate' | 'high' | 'critical';
}

export interface CancerType {
  name: string;
  description: string;
  prevalence: string;
  characteristics: string[];
}

export interface AnatomicalLocation {
  quadrant: string;
  quadrantAbbr: string;
  clockPosition: string;
  depth: 'anterior' | 'middle' | 'posterior';
  laterality: 'left' | 'right';
  view: 'CC' | 'MLO';
  isLikelyBreastTissue?: boolean;  // Flag to indicate if region is likely within breast
  edgeWarning?: string;  // Warning if region is near edge
}

/**
 * Validate if a region is likely within breast tissue
 * Regions too close to image edges or in corners are likely artifacts
 * @param bbox - Bounding box [x, y, width, height]
 * @param imageSize - Image size in pixels
 * @returns Object with validation result and any warnings
 */
export const validateBreastRegion = (
  bbox: number[],
  imageSize: number = 224
): { isValid: boolean; warning?: string } => {
  const [x, y, w, h] = bbox;
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  
  // Define margin (10% of image size) - regions too close to edge are suspicious
  const margin = imageSize * 0.1;
  const maxCoord = imageSize - margin;
  
  // Check if region is in corner (likely artifact/marker)
  const inCorner = (
    (centerX < margin && centerY < margin) ||
    (centerX < margin && centerY > maxCoord) ||
    (centerX > maxCoord && centerY < margin) ||
    (centerX > maxCoord && centerY > maxCoord)
  );
  
  if (inCorner) {
    return { isValid: false, warning: 'Region near image corner - may be artifact' };
  }
  
  // Check if region extends beyond image bounds (invalid detection)
  if (x < 0 || y < 0 || x + w > imageSize || y + h > imageSize) {
    return { isValid: false, warning: 'Region extends beyond image bounds' };
  }
  
  // Check if region is too close to any edge
  if (x < margin || y < margin || x + w > maxCoord || y + h > maxCoord) {
    return { isValid: true, warning: 'Region near image edge - verify with original' };
  }
  
  return { isValid: true };
};

/**
 * BI-RADS Assessment Categories
 */
export const BIRADS_CATEGORIES: Record<string, BiRadsCategory> = {
  '0': {
    category: 0,
    label: 'Incomplete',
    description: 'Assessment is incomplete',
    recommendedAction: 'Need additional views or imaging to further evaluate',
    likelihoodOfCancer: 'N/A',
    cancerProbability: 'N/A',
    color: '#9E9E9E',
    urgency: 'moderate',
  },
  '1': {
    category: 1,
    label: 'Negative',
    description: 'Nothing to comment on',
    recommendedAction: 'Continue routine annual screening',
    likelihoodOfCancer: 'Essentially 0%',
    cancerProbability: '0%',
    color: '#4CAF50',
    urgency: 'low',
  },
  '2': {
    category: 2,
    label: 'Benign',
    description: 'Benign finding(s)',
    recommendedAction: 'Continue routine annual screening',
    likelihoodOfCancer: 'Essentially 0%',
    cancerProbability: '0%',
    color: '#8BC34A',
    urgency: 'low',
  },
  '3': {
    category: 3,
    label: 'Probably Benign',
    description: 'Probably benign finding',
    recommendedAction: 'Short interval follow-up suggested (6 months)',
    likelihoodOfCancer: '<2% probability of malignancy',
    cancerProbability: '<2%',
    color: '#FFC107',
    urgency: 'moderate',
  },
  '4A': {
    category: 4,
    subCategory: 'A',
    label: 'Suspicious - Low',
    description: 'Low suspicion for malignancy',
    recommendedAction: 'Biopsy should be considered',
    likelihoodOfCancer: 'Low suspicion for malignancy',
    cancerProbability: '2-9%',
    color: '#FF9800',
    urgency: 'high',
  },
  '4B': {
    category: 4,
    subCategory: 'B',
    label: 'Suspicious - Moderate',
    description: 'Moderate suspicion for malignancy',
    recommendedAction: 'Biopsy should be considered',
    likelihoodOfCancer: 'Moderate suspicion for malignancy',
    cancerProbability: '10-49%',
    color: '#FF5722',
    urgency: 'high',
  },
  '4C': {
    category: 4,
    subCategory: 'C',
    label: 'Suspicious - High',
    description: 'High suspicion for malignancy',
    recommendedAction: 'Biopsy should be considered',
    likelihoodOfCancer: 'High suspicion for malignancy',
    cancerProbability: '50-94%',
    color: '#F44336',
    urgency: 'critical',
  },
  '5': {
    category: 5,
    label: 'Highly Suggestive',
    description: 'Highly suggestive of malignancy',
    recommendedAction: 'Biopsy required',
    likelihoodOfCancer: 'Proven malignancy',
    cancerProbability: '≥95%',
    color: '#D32F2F',
    urgency: 'critical',
  },
  '6': {
    category: 6,
    label: 'Known Malignancy',
    description: 'Known biopsy-proven malignancy',
    recommendedAction: 'Confirmed biopsy and treatment planning',
    likelihoodOfCancer: '>95% probability of malignancy',
    cancerProbability: '>95%',
    color: '#B71C1C',
    urgency: 'critical',
  },
};

/**
 * Breast Cancer Types with Clinical Information
 */
export const CANCER_TYPES: Record<string, CancerType> = {
  DCIS: {
    name: 'Ductal Carcinoma In Situ (DCIS)',
    description: 'Non-invasive breast cancer where abnormal cells are contained in the milk ducts',
    prevalence: 'Common pre-invasive form',
    characteristics: ['Confined to ducts', 'Not spread to surrounding tissue', 'High cure rate'],
  },
  LCIS: {
    name: 'Lobular Carcinoma In Situ (LCIS)',
    description: 'Abnormal cells in breast lobules that increase cancer risk',
    prevalence: 'Less common than DCIS',
    characteristics: ['Confined to lobules', 'Risk indicator', 'Usually not treated as cancer'],
  },
  IDC: {
    name: 'Invasive Ductal Cancer',
    description: 'The most common type of breast cancer',
    prevalence: '70-80% of all breast cancers',
    characteristics: ['Starts in ducts', 'Invades surrounding tissue', 'Can spread to lymph nodes'],
  },
  ILC: {
    name: 'Invasive Lobular Carcinoma',
    description: 'Cancer that starts in milk-producing glands',
    prevalence: '10-15% of invasive breast cancers',
    characteristics: ['Starts in lobules', 'Harder to detect on imaging', 'Can be multifocal'],
  },
  INFLAMMATORY: {
    name: 'Inflammatory Breast Cancer',
    description: 'Rare and aggressive form causing breast inflammation',
    prevalence: 'Rare (1-5% of cases)',
    characteristics: ['Rapid growth', 'Skin changes', 'No distinct lump'],
  },
  PAGET: {
    name: "Paget's Disease",
    description: 'Rare cancer affecting the nipple and areola',
    prevalence: 'Rare (1-4% of cases)',
    characteristics: ['Nipple involvement', 'Often with underlying DCIS/IDC', 'Eczema-like changes'],
  },
};

/**
 * Map malignancy probability to BI-RADS category
 * 
 * BI-RADS is based on probability of malignancy, NOT model confidence.
 * This follows ACR BI-RADS Atlas guidelines:
 * - BI-RADS 1: Negative (0% malignancy)
 * - BI-RADS 2: Benign (0% malignancy)  
 * - BI-RADS 3: Probably Benign (<2% malignancy)
 * - BI-RADS 4A: Low Suspicion (2-9% malignancy)
 * - BI-RADS 4B: Moderate Suspicion (10-49% malignancy)
 * - BI-RADS 4C: High Suspicion (50-94% malignancy)
 * - BI-RADS 5: Highly Suggestive (≥95% malignancy)
 * 
 * @param malignancyProb - Probability of malignancy (0-1)
 * @param prediction - Model prediction ('benign' or 'malignant')
 * @param confidence - Model confidence (optional, used for edge cases)
 */
export const mapConfidenceToBiRads = (
  malignancyProbOrConfidence: number, 
  prediction: string,
  confidence?: number
): string => {
  // Determine malignancy probability
  // If prediction is benign, malignancy prob is (1 - confidence) if only confidence provided
  // If prediction is malignant, malignancy prob equals confidence
  let malignancyProb: number;
  
  const isBenign = prediction.toLowerCase().includes('benign') || prediction.toLowerCase().includes('normal');
  const isMalignant = prediction.toLowerCase().includes('malignant') || prediction.toLowerCase().includes('cancer');
  
  if (confidence !== undefined) {
    // New API: malignancyProbOrConfidence is actually malignancy probability
    malignancyProb = malignancyProbOrConfidence;
  } else {
    // Legacy: derive malignancy probability from confidence and prediction
    if (isBenign) {
      malignancyProb = 1 - malignancyProbOrConfidence; // Benign with 90% confidence = 10% malignancy risk
    } else if (isMalignant) {
      malignancyProb = malignancyProbOrConfidence; // Malignant with 80% confidence = 80% malignancy risk
    } else {
      malignancyProb = malignancyProbOrConfidence; // Unknown, use as-is
    }
  }
  
  // Map to BI-RADS based on ACR guidelines for probability of malignancy
  if (malignancyProb >= 0.95) return '5';      // ≥95% - Highly suggestive of malignancy
  if (malignancyProb >= 0.50) return '4C';     // 50-94% - High suspicion
  if (malignancyProb >= 0.10) return '4B';     // 10-49% - Moderate suspicion
  if (malignancyProb >= 0.02) return '4A';     // 2-9% - Low suspicion
  if (malignancyProb > 0) return '3';          // >0 but <2% - Probably benign
  
  // 0% or essentially 0%
  if (isBenign && (confidence || malignancyProbOrConfidence) > 0.95) {
    return '1'; // Negative - very confident benign
  }
  return '2'; // Benign
};

/**
 * Get likely cancer types based on characteristics
 */
export const getLikelyCancerTypes = (
  location: string,
  size: number,
  attentionScore: number
): string[] => {
  const types: string[] = [];
  
  // Most common type
  if (attentionScore > 0.5) {
    types.push('IDC'); // Invasive Ductal Cancer is most common
  }
  
  // Based on size and characteristics
  if (size < 500) {
    types.push('DCIS'); // Smaller findings might be DCIS
  }
  
  if (attentionScore > 0.7) {
    types.push('ILC'); // Higher scores for potentially invasive lobular
  }
  
  return types;
};

/**
 * Get clinical recommendations based on BI-RADS category
 */
export const getClinicalRecommendations = (biRadsKey: string): string[] => {
  const category = BIRADS_CATEGORIES[biRadsKey];
  if (!category) return [];
  
  const recommendations: string[] = [];
  
  switch (category.category) {
    case 0:
      recommendations.push('Additional imaging views recommended');
      recommendations.push('Consider ultrasound or MRI');
      recommendations.push('Follow-up within 2-4 weeks');
      break;
    case 1:
    case 2:
      recommendations.push('Continue annual screening mammography');
      recommendations.push('Maintain healthy lifestyle');
      recommendations.push('Self-examination monthly');
      break;
    case 3:
      recommendations.push('Short-interval follow-up in 6 months');
      recommendations.push('Bilateral mammography recommended');
      recommendations.push('Document and compare with future studies');
      break;
    case 4:
      recommendations.push('Tissue diagnosis recommended (biopsy)');
      recommendations.push('Image-guided core needle biopsy preferred');
      recommendations.push('Multidisciplinary consultation suggested');
      if (category.subCategory === 'C') {
        recommendations.push('Surgical consultation may be warranted');
      }
      break;
    case 5:
      recommendations.push('Biopsy required immediately');
      recommendations.push('Surgical oncology consultation');
      recommendations.push('Staging workup if confirmed');
      recommendations.push('Treatment planning discussion');
      break;
    case 6:
      recommendations.push('Confirmed malignancy - proceed with treatment');
      recommendations.push('Multidisciplinary tumor board review');
      recommendations.push('Staging and surgical planning');
      recommendations.push('Discuss chemotherapy/radiation options');
      break;
  }
  
  return recommendations;
};

/**
 * Format BI-RADS display string
 */
export const formatBiRadsDisplay = (biRadsKey: string): string => {
  const category = BIRADS_CATEGORIES[biRadsKey];
  if (!category) return 'Unknown';
  
  if (category.subCategory) {
    return `BI-RADS ${category.category}${category.subCategory}`;
  }
  return `BI-RADS ${category.category}`;
};

/**
 * Calculate clock position from coordinates
 * Based on standard mammography clock face system with nipple at center
 * @param x - X coordinate (0-1 normalized or pixel value)
 * @param y - Y coordinate (0-1 normalized or pixel value)
 * @param view - Mammographic view (CC or MLO)
 * @param laterality - Breast side (left or right)
 * @returns Clock position string (e.g., "2:00", "10:30")
 */
export const getClockPosition = (
  x: number,
  y: number,
  view: 'CC' | 'MLO',
  laterality: 'left' | 'right',
  imageSize: number = 224
): string => {
  // Assume nipple is at center (0.5, 0.5) for normalized coordinates
  const centerX = 0.5;
  const centerY = 0.5;
  
  // Normalize coordinates if they're pixel values (>1)
  // Use actual image size for proper normalization
  const normX = x > 1 ? x / imageSize : x;
  const normY = y > 1 ? y / imageSize : y;
  
  // Calculate angle from center (nipple)
  const deltaX = normX - centerX;
  const deltaY = normY - centerY;
  
  // Calculate angle in radians, then convert to degrees
  let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
  
  // Adjust for mammography coordinate system
  // In mammography: 12:00 is superior (top), 3:00 is lateral (right side of image)
  angle = 90 - angle; // Rotate to make 12:00 at top
  
  // Normalize angle to 0-360
  if (angle < 0) angle += 360;
  
  // Convert to clock position (0° = 12:00, 90° = 3:00, etc.)
  const clockHour = (angle / 30) % 12; // 30° per hour
  const hour = Math.floor(clockHour);
  const minutes = Math.round((clockHour - hour) * 60);
  
  // Format as clock position
  const hourDisplay = hour === 0 ? 12 : hour;
  if (minutes === 0) {
    return `${hourDisplay}:00`;
  } else {
    return `${hourDisplay}:${minutes.toString().padStart(2, '0')}`;
  }
};

/**
 * Determine depth category based on coordinates
 * @param x - X coordinate (0-1 normalized or pixel value)
 * @param view - Mammographic view (CC or MLO)
 * @param imageSize - Image size in pixels (default: 224)
 * @returns Depth category: anterior (front 1/3), middle (middle 1/3), or posterior (back 1/3)
 */
export const getDepthCategory = (
  x: number,
  view: 'CC' | 'MLO',
  imageSize: number = 224
): 'anterior' | 'middle' | 'posterior' => {
  // Normalize coordinate if it's a pixel value
  const normX = x > 1 ? x / imageSize : x;
  
  // In MLO view, x-axis represents depth (anterior to posterior)
  // In CC view, depth is harder to determine from 2D projection
  if (view === 'MLO') {
    if (normX < 0.33) return 'anterior';
    if (normX < 0.67) return 'middle';
    return 'posterior';
  }
  
  // For CC view, estimate based on distance from image edge
  // Anterior structures typically appear more lateral, posterior more medial
  if (normX < 0.25 || normX > 0.75) return 'anterior';
  if (normX > 0.4 && normX < 0.6) return 'posterior';
  return 'middle';
};

/**
 * Calculate distance from nipple
 * @param x - X coordinate (normalized or pixel)
 * @param y - Y coordinate (normalized or pixel)
 * @param pixelSpacing - Physical pixel spacing in mm (default: 0.1mm)
 * @returns Distance in mm from nipple (assuming nipple at center)
 */
export const getDistanceFromNipple = (
  x: number,
  y: number,
  pixelSpacing: number = 0.1,
  imageSize: number = 224
): number => {
  // Assume nipple at center (0.5, 0.5) for normalized coordinates
  const centerX = 0.5;
  const centerY = 0.5;
  
  // Normalize if pixel coordinates using actual image size
  const normX = x > 1 ? x / imageSize : x;
  const normY = y > 1 ? y / imageSize : y;
  
  // Calculate Euclidean distance in normalized space, then convert to pixels
  const deltaX = (normX - centerX) * imageSize;
  const deltaY = (normY - centerY) * imageSize;
  const distancePixels = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  
  // Convert to mm using pixel spacing
  return Math.round(distancePixels * pixelSpacing);
};

/**
 * Determine quadrant from coordinates
 * Uses standard four-quadrant system: UOQ, UIQ, LIQ, LOQ
 * @param x - X coordinate (normalized 0-1)
 * @param y - Y coordinate (normalized 0-1)
 * @param view - Mammographic view (CC or MLO)
 * @param laterality - Breast side (left or right)
 * @returns Quadrant abbreviation and full name
 */
export const getQuadrant = (
  x: number,
  y: number,
  view: 'CC' | 'MLO',
  laterality: 'left' | 'right',
  imageSize: number = 224
): { abbr: string; name: string } => {
  // Normalize coordinates using actual image size
  const normX = x > 1 ? x / imageSize : x;
  const normY = y > 1 ? y / imageSize : y;
  
  // Determine if upper/lower (superior/inferior)
  const isUpper = normY < 0.5;
  
  // Determine if outer/inner (lateral/medial)
  let isOuter: boolean;
  
  if (view === 'CC') {
    // CC view: interpretation depends on breast side
    if (laterality === 'left') {
      // Left breast: lateral is left side of image (x < 0.5)
      isOuter = normX < 0.5;
    } else {
      // Right breast: lateral is right side of image (x > 0.5)
      isOuter = normX > 0.5;
    }
  } else {
    // MLO view: lateral is typically toward image edge
    isOuter = normX < 0.5;
  }
  
  // Determine quadrant
  if (isUpper && isOuter) {
    return { abbr: 'UOQ', name: 'Upper Outer Quadrant' };
  } else if (isUpper && !isOuter) {
    return { abbr: 'UIQ', name: 'Upper Inner Quadrant' };
  } else if (!isUpper && isOuter) {
    return { abbr: 'LOQ', name: 'Lower Outer Quadrant' };
  } else {
    return { abbr: 'LIQ', name: 'Lower Inner Quadrant' };
  }
};

/**
 * Get comprehensive anatomical location information
 * @param bbox - Bounding box [x, y, width, height] in pixel coordinates
 * @param view - Mammographic view (CC or MLO)
 * @param laterality - Breast side (left or right)
 * @param imageSize - Image size in pixels (default: 224 for model input)
 * @returns Complete anatomical location details
 */
export const getAnatomicalLocation = (
  bbox: number[],
  view: 'CC' | 'MLO' = 'MLO',
  laterality: 'left' | 'right' = 'left',
  imageSize: number = 224
): AnatomicalLocation => {
  const [x, y, width, height] = bbox;
  
  // Calculate center of bounding box
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  
  // Get quadrant information (pass imageSize for normalization)
  const quadrant = getQuadrant(centerX, centerY, view, laterality, imageSize);
  
  // Get clock position (pass imageSize for normalization)
  const clockPosition = getClockPosition(centerX, centerY, view, laterality, imageSize);
  
  // Get depth category (pass imageSize for normalization)
  const depth = getDepthCategory(centerX, view, imageSize);
  
  return {
    quadrant: quadrant.name,
    quadrantAbbr: quadrant.abbr,
    clockPosition,
    depth,
    laterality,
    view,
  };
};

/**
 * Get comprehensive location description string
 * @param location - Anatomical location object
 * @param includeDistance - Whether to include distance from nipple
 * @param distanceMm - Distance from nipple in mm (if available)
 * @returns Human-readable location description
 */
export const formatAnatomicalLocation = (
  location: AnatomicalLocation,
  includeDistance: boolean = false,
  distanceMm?: number
): string => {
  const parts: string[] = [];
  
  // Laterality
  parts.push(location.laterality === 'left' ? 'Left' : 'Right');
  
  // Quadrant
  parts.push(location.quadrant);
  
  // Clock position
  parts.push(`at ${location.clockPosition}`);
  
  // Depth
  parts.push(`(${location.depth} depth)`);
  
  // Distance from nipple
  if (includeDistance && distanceMm !== undefined) {
    parts.push(`${distanceMm}mm from nipple`);
  }
  
  return parts.join(' ');
};
