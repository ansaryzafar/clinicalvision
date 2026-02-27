/**
 * Usage Example: Enhanced Mammogram Viewer Integration
 * 
 * This example shows how to integrate the EnhancedMammogramViewer
 * into your clinical workflow pages.
 */

import React, { useState } from 'react';
import { Box, Container } from '@mui/material';
import { EnhancedMammogramViewer } from '../components/viewer/EnhancedMammogramViewer';

export const MammogramAnalysisPage: React.FC = () => {
  const [images, setImages] = useState({
    rcc: null as File | null,
    lcc: null as File | null,
    rmlo: null as File | null,
    lmlo: null as File | null,
  });

  const [aiResults, setAIResults] = useState<{
    rccRmlo: { score: number; level: 'low' | 'medium' | 'high' };
    lccLmlo: { score: number; level: 'low' | 'medium' | 'high' };
  }>({
    rccRmlo: { score: 0, level: 'low' },
    lccLmlo: { score: 64, level: 'high' },
  });

  const [heatmaps, setHeatmaps] = useState<any>(undefined);

  // Example: Load images from file upload
  const handleImageUpload = (view: 'rcc' | 'lcc' | 'rmlo' | 'lmlo', file: File) => {
    setImages(prev => ({
      ...prev,
      [view]: file,
    }));
  };

  // Example: After AI analysis completes
  const handleAIAnalysisComplete = (results: any) => {
    setAIResults({
      rccRmlo: {
        score: Math.round(results.rightBreast.confidence * 100),
        level: (results.rightBreast.confidence > 0.7 ? 'high' : 
               results.rightBreast.confidence > 0.3 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      },
      lccLmlo: {
        score: Math.round(results.leftBreast.confidence * 100),
        level: (results.leftBreast.confidence > 0.7 ? 'high' : 
               results.leftBreast.confidence > 0.3 ? 'medium' : 'low') as 'low' | 'medium' | 'high',
      },
    });

    // Set heatmaps if available
    if (results.heatmaps) {
      setHeatmaps({
        rcc: results.heatmaps.rcc,
        lcc: results.heatmaps.lcc,
        rmlo: results.heatmaps.rmlo,
        lmlo: results.heatmaps.lmlo,
      });
    }
  };

  // Example: Track viewport changes
  const handleViewportChange = (viewport: string, state: any) => {
    console.log(`Viewport ${viewport} updated:`, state);
    // You can save viewport states for session persistence
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <EnhancedMammogramViewer
        images={images}
        heatmaps={heatmaps}
        aiResults={aiResults}
        syncControls={false}
        onViewportChange={handleViewportChange}
      />

      {/* Example: File upload UI (add below viewer) */}
      <Box sx={{ mt: 3 }}>
        {/* Your file upload components here */}
      </Box>
    </Container>
  );
};

export default MammogramAnalysisPage;
