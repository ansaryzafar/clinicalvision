/**
 * Measurements Panel
 * Record and manage measurements from medical images
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Stack,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  ArrowForward,
  Save,
  Straighten,
} from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { WorkflowStep } from '../../types/clinical.types';

// Type for measurement from AnalysisSession
type SessionMeasurement = {
  measurementId: string;
  imageId: string;
  type: 'distance' | 'area' | 'angle';
  points: Array<{ x: number; y: number }>;
  value: number;
  unit: 'mm' | 'cm' | 'degrees';
  label?: string;
};

const MEASUREMENT_TYPES = [
  { value: 'distance', label: 'Distance/Length', unit: 'mm' },
  { value: 'area', label: 'Area', unit: 'mm²' },
  { value: 'angle', label: 'Angle', unit: 'degrees' },
];

export const MeasurementsPanel: React.FC = () => {
  const { currentSession, updateSessionData, advanceToStep } = useLegacyWorkflow();

  const [measurements, setMeasurements] = useState<SessionMeasurement[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<SessionMeasurement | null>(null);
  const [formData, setFormData] = useState<Partial<SessionMeasurement>>({
    type: 'distance',
    value: 0,
    unit: 'mm',
    label: '',
    imageId: '',
  });

  // Load measurements from session
  useEffect(() => {
    if (currentSession?.measurements) {
      setMeasurements(currentSession.measurements);
    }
  }, [currentSession]);

  const handleAddNew = () => {
    setEditingMeasurement(null);
    setFormData({
      type: 'distance',
      value: 0,
      unit: 'mm',
      label: '',
      imageId: currentSession?.images[0]?.imageId || '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (measurement: SessionMeasurement) => {
    setEditingMeasurement(measurement);
    setFormData(measurement);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    const updated = measurements.filter(m => m.measurementId !== id);
    setMeasurements(updated);
    updateSessionData({ measurements: updated });
  };

  const handleSaveMeasurement = () => {
    if (!formData.value || formData.value <= 0) {
      return;
    }

    let updated: SessionMeasurement[];

    if (editingMeasurement) {
      // Update existing
      updated = measurements.map(m =>
        m.measurementId === editingMeasurement.measurementId
          ? {
              ...m,
              ...formData,
              measurementId: m.measurementId,
              type: (formData.type || 'distance') as 'distance' | 'area' | 'angle',
              value: formData.value || 0,
              unit: (formData.unit || 'mm') as 'mm' | 'cm' | 'degrees',
              label: formData.label || '',
              imageId: formData.imageId || m.imageId,
              points: m.points, // Keep existing points
            } as SessionMeasurement
          : m
      );
    } else {
      // Add new (placeholder points - would come from viewer in real implementation)
      const newMeasurement: SessionMeasurement = {
        measurementId: `meas_${Date.now()}`,
        type: (formData.type || 'distance') as 'distance' | 'area' | 'angle',
        value: formData.value || 0,
        unit: (formData.unit || 'mm') as 'mm' | 'cm' | 'degrees',
        label: formData.label || '',
        imageId: formData.imageId || currentSession?.images[0]?.imageId || '',
        points: [{ x: 0, y: 0 }, { x: formData.value || 0, y: 0 }], // Placeholder
      };
      updated = [...measurements, newMeasurement];
    }

    setMeasurements(updated);
    updateSessionData({ measurements: updated });
    setDialogOpen(false);
  };

  const handleContinue = () => {
    updateSessionData({ measurements });
    advanceToStep(WorkflowStep.ASSESSMENT);
  };

  const handleTypeChange = (type: string) => {
    const measurementType = MEASUREMENT_TYPES.find(t => t.value === type);
    setFormData({
      ...formData,
      type: type as 'distance' | 'area' | 'angle',
      unit: (measurementType?.unit || 'mm') as 'mm' | 'cm' | 'degrees',
    });
  };

  const getMeasurementTypeLabel = (type: string) => {
    return MEASUREMENT_TYPES.find(t => t.value === type)?.label || type;
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" gutterBottom>
            Measurements
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Record measurements from medical images
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add Measurement
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" icon={<Straighten />} sx={{ mb: 3 }}>
        Use the medical viewer to take measurements on the mammogram images. Record important
        dimensions of masses, calcifications, or other findings.
      </Alert>

      {/* Measurements Summary */}
      {measurements.length > 0 && (
        <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
          <Paper sx={{ p: 2, flex: 1, bgcolor: '#f5f5f5' }}>
            <Typography variant="h5" color="primary">
              {measurements.length}
            </Typography>
            <Typography variant="body2">Total Measurements</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, bgcolor: '#f5f5f5' }}>
            <Typography variant="h5" color="primary">
              {measurements.filter(m => m.type === 'distance').length}
            </Typography>
            <Typography variant="body2">Distance/Length</Typography>
          </Paper>
          <Paper sx={{ p: 2, flex: 1, bgcolor: '#f5f5f5' }}>
            <Typography variant="h5" color="primary">
              {measurements.filter(m => m.type === 'area').length}
            </Typography>
            <Typography variant="body2">Area</Typography>
          </Paper>
        </Box>
      )}

      {/* Measurements Table */}
      {measurements.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No measurements recorded yet. Add measurements to document findings dimensions.
        </Alert>
      ) : (
        <TableContainer sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Type</TableCell>
                <TableCell>Value</TableCell>
                <TableCell>Label</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Image ID</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {measurements.map((measurement) => (
                <TableRow key={measurement.measurementId}>
                  <TableCell>{getMeasurementTypeLabel(measurement.type)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="bold">
                      {measurement.value.toFixed(2)} {measurement.unit}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {measurement.label || 'No label'}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {measurement.points?.length || 0} points
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {measurement.imageId?.substring(0, 12)}...
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleEdit(measurement)} color="primary">
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(measurement.measurementId)}
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" startIcon={<Save />} onClick={() => updateSessionData({ measurements })}>
          Save Measurements
        </Button>
        <Button variant="contained" endIcon={<ArrowForward />} onClick={handleContinue}>
          Continue to Assessment
        </Button>
      </Box>

      {/* Add/Edit Measurement Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMeasurement ? 'Edit Measurement' : 'Add New Measurement'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              select
              fullWidth
              label="Measurement Type"
              value={formData.type || 'distance'}
              onChange={e => handleTypeChange(e.target.value)}
            >
              {MEASUREMENT_TYPES.map(type => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </TextField>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Value"
                type="number"
                value={formData.value || ''}
                onChange={e => setFormData({ ...formData, value: parseFloat(e.target.value) })}
                inputProps={{ step: 0.1, min: 0 }}
                required
              />
              <TextField
                label="Unit"
                value={formData.unit || 'mm'}
                InputProps={{ readOnly: true }}
                sx={{ width: 100 }}
              />
            </Stack>

            <TextField
              fullWidth
              label="Label/Description"
              value={formData.label || ''}
              onChange={e => setFormData({ ...formData, label: e.target.value })}
              placeholder="e.g., Lesion diameter, Mass width"
              helperText="Brief description of what is being measured"
            />

            <TextField
              fullWidth
              label="Image ID"
              value={formData.imageId || ''}
              onChange={e => setFormData({ ...formData, imageId: e.target.value })}
              placeholder="Associated image ID"
              helperText="Leave blank to use first image in session"
            />

            <Alert severity="info" icon={<Straighten />}>
              <Typography variant="caption">
                <strong>Tip:</strong> Use the medical viewer's measurement tool to get accurate
                values from the image, then record them here.
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveMeasurement}
            variant="contained"
            startIcon={editingMeasurement ? <Save /> : <Add />}
            disabled={!formData.value || formData.value <= 0}
          >
            {editingMeasurement ? 'Update' : 'Add'} Measurement
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
