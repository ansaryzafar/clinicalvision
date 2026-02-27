/**
 * Findings Documentation Component
 * Review and document AI-detected and manual findings
 */

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Cancel,
  ArrowForward,
} from '@mui/icons-material';
import { useLegacyWorkflow } from '../../workflow-v3';
import { Finding, WorkflowStep } from '../../types/clinical.types';

const FINDING_TYPES = [
  'mass',
  'calcification',
  'asymmetry',
  'distortion',
  'other',
];

const FINDING_STATUS = [
  { value: 'pending', label: 'Pending Review', color: 'warning' },
  { value: 'reviewed', label: 'Reviewed', color: 'info' },
  { value: 'confirmed', label: 'Confirmed', color: 'success' },
  { value: 'dismissed', label: 'Dismissed', color: 'default' },
];

export const FindingsPanel: React.FC = () => {
  const { currentSession, addFinding, updateFinding, deleteFinding, advanceToStep } = useLegacyWorkflow();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFinding, setEditingFinding] = useState<Finding | null>(null);
  const [formData, setFormData] = useState<Partial<Finding>>({
    findingType: 'mass',
    location: { clockPosition: 12, distanceFromNipple: 0 },
    description: '',
    status: 'pending',
  });

  const findings = currentSession?.findings || [];

  const handleAddNew = () => {
    setEditingFinding(null);
    setFormData({
      findingType: 'mass',
      location: { clockPosition: 12, distanceFromNipple: 0 },
      description: '',
      status: 'pending',
    });
    setDialogOpen(true);
  };

  const handleEdit = (finding: Finding) => {
    setEditingFinding(finding);
    setFormData(finding);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingFinding) {
      // Update existing finding
      updateFinding(editingFinding.findingId, formData);
    } else {
      // Add new finding
      const newFinding: Finding = {
        findingId: `finding_${Date.now()}`,
        findingType: formData.findingType || 'mass',
        location: formData.location || { clockPosition: 12, distanceFromNipple: 0 },
        description: formData.description || '',
        status: formData.status || 'pending',
      };
      if (formData.coordinates) {
        newFinding.coordinates = formData.coordinates;
      }
      if (formData.measurements) {
        newFinding.measurements = formData.measurements;
      }
      if (formData.characteristics) {
        newFinding.characteristics = formData.characteristics;
      }
      addFinding(newFinding);
    }
    setDialogOpen(false);
  };

  const handleDelete = (findingId: string) => {
    if (window.confirm('Are you sure you want to delete this finding?')) {
      deleteFinding(findingId);
    }
  };

  const handleStatusChange = (finding: Finding, newStatus: string) => {
    updateFinding(finding.findingId, { status: newStatus as 'pending' | 'reviewed' | 'confirmed' | 'dismissed' });
  };

  const handleContinue = () => {
    // Navigate based on workflow mode
    const mode = currentSession?.workflow?.mode || 'clinical';
    if (mode === 'quick') {
      advanceToStep(WorkflowStep.ASSESSMENT);
    } else {
      advanceToStep(WorkflowStep.MEASUREMENTS);
    }
  };

  const getStatusChip = (status: string) => {
    const statusConfig = FINDING_STATUS.find(s => s.value === status);
    return (
      <Chip
        label={statusConfig?.label || status}
        color={statusConfig?.color as any}
        size="small"
      />
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">Findings Documentation</Typography>
          <Typography variant="body2" color="text.secondary">
            Review AI-detected findings and add manual observations
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={handleAddNew}>
          Add Finding
        </Button>
      </Box>

      {/* Findings Table */}
      <TableContainer sx={{ mb: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>AI Confidence</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {findings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No findings documented yet. Add findings manually or run AI analysis.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              findings.map((finding) => (
                <TableRow key={finding.findingId}>
                  <TableCell>
                    <Chip label={finding.findingType} size="small" />
                  </TableCell>
                  <TableCell>
                    {finding.location ? (
                      <>
                        {finding.location.clockPosition} o'clock,{' '}
                        {finding.location.distanceFromNipple}cm from nipple
                      </>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell>{finding.description || 'No description'}</TableCell>
                  <TableCell>
                    {finding.aiConfidence !== undefined ? (
                      <Chip
                        label={`${(finding.aiConfidence * 100).toFixed(0)}%`}
                        size="small"
                        color={finding.aiConfidence > 0.7 ? 'error' : 'warning'}
                      />
                    ) : (
                      'Manual'
                    )}
                  </TableCell>
                  <TableCell>{getStatusChip(finding.status)}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={() => handleStatusChange(finding, 'confirmed')}
                      color="success"
                      title="Confirm"
                    >
                      <CheckCircle />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleStatusChange(finding, 'dismissed')}
                      color="default"
                      title="Dismiss"
                    >
                      <Cancel />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(finding)}
                      title="Edit"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(finding.findingId)}
                      color="error"
                      title="Delete"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" endIcon={<ArrowForward />} onClick={handleContinue}>
          {(currentSession?.workflow?.mode || 'clinical') === 'quick' 
            ? 'Continue to Assessment' 
            : 'Continue to Measurements'}
        </Button>
      </Box>

      {/* Add/Edit Finding Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingFinding ? 'Edit Finding' : 'Add New Finding'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                select
                label="Finding Type"
                value={formData.findingType || 'mass'}
                onChange={(e) => setFormData({ ...formData, findingType: e.target.value as 'mass' | 'calcification' | 'asymmetry' | 'distortion' | 'other' })}
              >
                {FINDING_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                select
                label="Status"
                value={formData.status || 'pending'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'pending' | 'reviewed' | 'confirmed' | 'dismissed' })}
              >
                {FINDING_STATUS.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    {status.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <TextField
                fullWidth
                type="number"
                label="Clock Position (1-12)"
                value={formData.location?.clockPosition || 12}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      clockPosition: parseInt(e.target.value),
                      distanceFromNipple: formData.location?.distanceFromNipple || 0,
                    },
                  })
                }
                inputProps={{ min: 1, max: 12 }}
              />
              <TextField
                fullWidth
                type="number"
                label="Distance from Nipple (cm)"
                value={formData.location?.distanceFromNipple || 0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    location: {
                      clockPosition: formData.location?.clockPosition || 12,
                      distanceFromNipple: parseFloat(e.target.value),
                    },
                  })
                }
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the finding..."
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingFinding ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
