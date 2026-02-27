/**
 * Report Generator Service
 * Generate professional PDF reports for clinical findings
 */

import { jsPDF } from 'jspdf';
import {
  AnalysisSession,
  ClinicalReport,
  BIRADS,
  BIRADS_DESCRIPTIONS,
  BIRADS_RECOMMENDATIONS,
  Finding,
} from '../types/clinical.types';

class ReportGeneratorService {
  /**
   * Generate a clinical report PDF from an analysis session
   */
  generatePDF(session: AnalysisSession): void {
    const doc = new jsPDF();
    let yPosition = 20;

    // Helper to add text with automatic page breaks
    const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFontSize(fontSize);
      if (isBold) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(text, 20, yPosition);
      yPosition += fontSize / 2 + 2;
    };

    const addSpacer = () => {
      yPosition += 5;
    };

    // Header
    doc.setFillColor(25, 118, 210); // Primary blue
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('CLINICAL MAMMOGRAPHY REPORT', 20, 18);
    doc.setTextColor(0, 0, 0);
    yPosition = 40;

    // Patient Information Section
    addText('PATIENT INFORMATION', 14, true);
    addSpacer();
    addText(`Patient ID: ${session.patientInfo.patientId || 'N/A'}`);
    addText(`Patient Name: ${session.patientInfo.name || 'N/A'}`);
    addText(`Date of Birth: ${session.patientInfo.dateOfBirth || 'N/A'}`);
    addText(`Age: ${session.patientInfo.age || 'N/A'} years`);
    addText(`Gender: ${session.patientInfo.gender || 'N/A'}`);
    if (session.patientInfo.medicalRecordNumber) {
      addText(`MRN: ${session.patientInfo.medicalRecordNumber}`);
    }
    addSpacer();

    // Study Information Section
    addText('STUDY INFORMATION', 14, true);
    addSpacer();
    addText(`Study ID: ${session.studyInfo.studyId || 'N/A'}`);
    addText(`Study Date: ${session.studyInfo.studyDate || 'N/A'}`);
    addText(`Modality: ${session.studyInfo.modality || 'N/A'}`);
    addText(`Description: ${session.studyInfo.studyDescription || 'N/A'}`);
    if (session.studyInfo.institution) {
      addText(`Institution: ${session.studyInfo.institution}`);
    }
    if (session.studyInfo.referringPhysician) {
      addText(`Referring Physician: ${session.studyInfo.referringPhysician}`);
    }
    if (session.studyInfo.performingPhysician) {
      addText(`Performing Physician: ${session.studyInfo.performingPhysician}`);
    }
    addSpacer();

    // Images Section
    addText('IMAGES ANALYZED', 14, true);
    addSpacer();
    addText(`Total Images: ${session.images.length}`);
    session.images.forEach((img, index) => {
      addText(
        `  ${index + 1}. ${img.viewType || 'Unknown View'} - ${img.laterality || 'N/A'} (${img.fileName})`
      );
    });
    addSpacer();

    // Findings Section
    addText('FINDINGS', 14, true);
    addSpacer();

    if (session.findings.length === 0) {
      addText('No significant findings documented.');
    } else {
      addText(`Total Findings: ${session.findings.length}`);
      addSpacer();

      session.findings.forEach((finding: Finding, index: number) => {
        // Skip dismissed findings
        if (finding.status === 'dismissed') return;

        addText(`Finding ${index + 1}: ${finding.findingType.toUpperCase()}`, 12, true);

        if (finding.location) {
          addText(
            `  Location: ${finding.location.clockPosition} o'clock, ${finding.location.distanceFromNipple}cm from nipple`
          );
        }

        if (finding.description) {
          addText(`  Description: ${finding.description}`);
        }

        if (finding.measurements) {
          const { maxDiameter, minDiameter, area } = finding.measurements;
          if (maxDiameter) addText(`  Max Diameter: ${maxDiameter.toFixed(1)} mm`);
          if (minDiameter) addText(`  Min Diameter: ${minDiameter.toFixed(1)} mm`);
          if (area) addText(`  Area: ${area.toFixed(1)} mm²`);
        }

        if (finding.characteristics) {
          const chars = finding.characteristics;
          if (chars.shape) addText(`  Shape: ${chars.shape}`);
          if (chars.margin) addText(`  Margin: ${chars.margin}`);
          if (chars.density) addText(`  Density: ${chars.density}`);
          if (chars.calcificationType) addText(`  Calcification: ${chars.calcificationType}`);
        }

        if (finding.aiConfidence !== undefined) {
          addText(`  AI Confidence: ${(finding.aiConfidence * 100).toFixed(1)}%`);
        }

        addText(`  Status: ${finding.status.toUpperCase()}`);
        addSpacer();
      });
    }

    // Measurements Section
    if (session.measurements && session.measurements.length > 0) {
      addText('MEASUREMENTS', 14, true);
      addSpacer();
      session.measurements.forEach((measurement, index) => {
        addText(
          `${index + 1}. ${measurement.label || 'Measurement'}: ${measurement.value.toFixed(2)} ${measurement.unit}`
        );
      });
      addSpacer();
    }

    // Assessment Section
    addText('ASSESSMENT', 14, true);
    addSpacer();

    if (session.assessment.biradsCategory !== undefined) {
      const birads = session.assessment.biradsCategory;
      addText(`BI-RADS Category: ${birads}`, 12, true);
      addText(`Classification: ${BIRADS_DESCRIPTIONS[birads]}`);
      addSpacer();
    }

    if (session.assessment.impression) {
      addText('IMPRESSION:', 12, true);
      // Split long text into multiple lines
      const impressionLines = this.splitTextIntoLines(session.assessment.impression, 170);
      impressionLines.forEach((line) => addText(line));
      addSpacer();
    }

    if (session.assessment.recommendation) {
      addText('RECOMMENDATION:', 12, true);
      const recommendationLines = this.splitTextIntoLines(session.assessment.recommendation, 170);
      recommendationLines.forEach((line) => addText(line));
      addSpacer();
    }

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    const footerY = 280;
    doc.text(`Report Generated: ${new Date().toLocaleString()}`, 20, footerY);
    doc.text(`Session ID: ${session.sessionId}`, 20, footerY + 5);
    doc.text(
      `Report Version: ${session.metadata.version} | Created by: ${session.metadata.createdBy}`,
      20,
      footerY + 10
    );

    // Generate filename
    const patientId = session.patientInfo.patientId || 'unknown';
    const studyDate = session.studyInfo.studyDate?.replace(/\-/g, '') || 'unknown';
    const filename = `mammography_report_${patientId}_${studyDate}.pdf`;

    // Save PDF
    doc.save(filename);
  }

  /**
   * Create a structured report object (for database storage)
   */
  createReport(session: AnalysisSession): ClinicalReport {
    return {
      reportId: `report_${Date.now()}`,
      sessionId: session.sessionId,
      patientInfo: session.patientInfo,
      studyInfo: session.studyInfo,
      findings: session.findings,
      impression: session.assessment.impression || '',
      biradsAssessment: session.assessment.biradsCategory || BIRADS.INCOMPLETE,
      recommendation: session.assessment.recommendation || '',
      radiologistName: session.metadata.createdBy,
      reportDate: new Date().toISOString().split('T')[0],
      reportTime: new Date().toISOString(),
      technique: session.studyInfo.modality || 'MG',
      status: 'draft',
      images: session.images.map((img) => ({
        imageId: img.imageId || `img_${Date.now()}`,
        caption: `${img.viewType || 'View'} - ${img.laterality || 'N/A'}`,
        annotations: [],
      })),
    };
  }

  /**
   * Export session as JSON
   */
  exportJSON(session: AnalysisSession): void {
    const dataStr = JSON.stringify(session, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `session_${session.sessionId}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Helper: Split text into multiple lines for PDF
   */
  private splitTextIntoLines(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach((word) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Approximate character width (this is simplified, jsPDF has better methods)
      if (testLine.length * 2 < maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });

    if (currentLine) lines.push(currentLine);
    return lines;
  }
}

export const reportGenerator = new ReportGeneratorService();
