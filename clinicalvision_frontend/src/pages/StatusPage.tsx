import React from 'react';
import { Box, Typography, Grid, alpha } from '@mui/material';
import { CheckCircle, Schedule, Warning, Error as ErrorIcon } from '@mui/icons-material';
import { PageLayout, PageHero, PageSection } from '../components/layout/PageLayout';
import { lunitColors, lunitTypography, lunitRadius } from '../styles/lunitDesignSystem';

const services = [
  { name: 'API Services', status: 'operational', uptime: '99.99%' },
  { name: 'Analysis Engine', status: 'operational', uptime: '99.98%' },
  { name: 'Web Application', status: 'operational', uptime: '99.99%' },
  { name: 'PACS Integration', status: 'operational', uptime: '99.97%' },
  { name: 'Authentication Services', status: 'operational', uptime: '100%' },
  { name: 'Data Storage', status: 'operational', uptime: '99.99%' },
];

const incidents = [
  {
    date: 'January 12, 2024',
    title: 'Scheduled Maintenance',
    status: 'completed',
    description: 'Completed database optimization. No user impact.',
    duration: '45 minutes',
  },
  {
    date: 'January 5, 2024',
    title: 'API Latency Increase',
    status: 'resolved',
    description: 'Brief period of elevated API response times. Issue identified and resolved.',
    duration: '12 minutes',
  },
  {
    date: 'December 28, 2023',
    title: 'Scheduled Maintenance',
    status: 'completed',
    description: 'Infrastructure upgrades completed successfully.',
    duration: '2 hours',
  },
];

const uptimeHistory = [
  { month: 'Jan 2024', uptime: 99.99 },
  { month: 'Dec 2023', uptime: 99.98 },
  { month: 'Nov 2023', uptime: 100.00 },
  { month: 'Oct 2023', uptime: 99.99 },
  { month: 'Sep 2023', uptime: 99.97 },
  { month: 'Aug 2023', uptime: 99.99 },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'operational':
      return <CheckCircle sx={{ color: lunitColors.green, fontSize: 20 }} />;
    case 'degraded':
      return <Warning sx={{ color: lunitColors.yellow, fontSize: 20 }} />;
    case 'outage':
      return <ErrorIcon sx={{ color: lunitColors.red, fontSize: 20 }} />;
    case 'maintenance':
      return <Schedule sx={{ color: lunitColors.teal, fontSize: 20 }} />;
    default:
      return <CheckCircle sx={{ color: lunitColors.green, fontSize: 20 }} />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational':
    case 'resolved':
    case 'completed':
      return lunitColors.green;
    case 'degraded':
      return lunitColors.yellow;
    case 'outage':
    case 'ongoing':
      return lunitColors.red;
    case 'maintenance':
    case 'scheduled':
      return lunitColors.teal;
    default:
      return lunitColors.green;
  }
};

const StatusPage: React.FC = () => {
  const allOperational = services.every(s => s.status === 'operational');

  return (
    <PageLayout>
      {/* Hero */}
      <PageHero
        label="System Status"
        title={
          allOperational ? (
            <>
              All Systems{' '}
              <Box component="span" sx={{ color: lunitColors.green }}>
                Operational
              </Box>
            </>
          ) : (
            <>
              Experiencing{' '}
              <Box component="span" sx={{ color: lunitColors.yellow }}>
                Issues
              </Box>
            </>
          )
        }
        subtitle="Real-time status of ClinicalVision services. Subscribe for updates on incidents and maintenance."
      />

      {/* Overall Status Banner */}
      <PageSection background="light" paddingY="small">
        <Box
          sx={{
            p: 3,
            borderRadius: lunitRadius['2xl'],
            bgcolor: alpha(allOperational ? lunitColors.green : lunitColors.yellow, 0.1),
            border: `1px solid ${alpha(allOperational ? lunitColors.green : lunitColors.yellow, 0.3)}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <CheckCircle sx={{ color: lunitColors.green, fontSize: 28 }} />
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyHeading,
              fontSize: '18px',
              fontWeight: 500,
              color: lunitColors.headingColor,
            }}
          >
            All systems are operational
          </Typography>
          <Typography
            sx={{
              fontFamily: lunitTypography.fontFamilyBody,
              fontSize: '14px',
              color: lunitColors.darkGrey,
            }}
          >
            Last updated: {new Date().toLocaleString()}
          </Typography>
        </Box>
      </PageSection>

      {/* Services Status */}
      <PageSection>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: '24px',
            fontWeight: 400,
            color: lunitColors.headingColor,
            mb: 3,
          }}
        >
          Service Status
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {services.map((service, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3,
                borderRadius: lunitRadius.lg,
                bgcolor: lunitColors.lightestGray,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {getStatusIcon(service.status)}
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '16px',
                    fontWeight: 500,
                    color: lunitColors.headingColor,
                  }}
                >
                  {service.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '13px',
                    color: lunitColors.darkGrey,
                  }}
                >
                  {service.uptime} uptime (90 days)
                </Typography>
                <Box
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: lunitRadius.full,
                    bgcolor: alpha(getStatusColor(service.status), 0.1),
                    color: getStatusColor(service.status),
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {service.status}
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </PageSection>

      {/* Uptime History */}
      <PageSection background="light">
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: '24px',
            fontWeight: 400,
            color: lunitColors.headingColor,
            mb: 3,
          }}
        >
          Uptime History
        </Typography>

        <Grid container spacing={2}>
          {uptimeHistory.map((month, idx) => (
            <Grid size={{ xs: 6, sm: 4, md: 2 }} key={idx}>
              <Box
                sx={{
                  p: 2,
                  textAlign: 'center',
                  borderRadius: lunitRadius.lg,
                  bgcolor: lunitColors.white,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    color: lunitColors.darkGrey,
                    mb: 1,
                  }}
                >
                  {month.month}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: lunitTypography.fontFamilyHeading,
                    fontSize: '24px',
                    fontWeight: 400,
                    color: month.uptime >= 99.9 ? lunitColors.green : lunitColors.yellow,
                  }}
                >
                  {month.uptime.toFixed(2)}%
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      {/* Recent Incidents */}
      <PageSection>
        <Typography
          sx={{
            fontFamily: lunitTypography.fontFamilyHeading,
            fontSize: '24px',
            fontWeight: 400,
            color: lunitColors.headingColor,
            mb: 3,
          }}
        >
          Recent Incidents
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {incidents.map((incident, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3,
                borderRadius: lunitRadius['2xl'],
                border: `1px solid ${alpha(lunitColors.darkerGray, 0.08)}`,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                <Box>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyBody,
                      fontSize: '12px',
                      color: lunitColors.darkGrey,
                      mb: 0.5,
                    }}
                  >
                    {incident.date}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: lunitTypography.fontFamilyHeading,
                      fontSize: '18px',
                      fontWeight: 500,
                      color: lunitColors.headingColor,
                    }}
                  >
                    {incident.title}
                  </Typography>
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 0.5,
                    borderRadius: lunitRadius.full,
                    bgcolor: alpha(getStatusColor(incident.status), 0.1),
                    color: getStatusColor(incident.status),
                    fontFamily: lunitTypography.fontFamilyBody,
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                >
                  {incident.status}
                </Box>
              </Box>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '14px',
                  fontWeight: 300,
                  color: lunitColors.text,
                  mb: 1,
                }}
              >
                {incident.description}
              </Typography>
              <Typography
                sx={{
                  fontFamily: lunitTypography.fontFamilyBody,
                  fontSize: '13px',
                  color: lunitColors.darkGrey,
                }}
              >
                Duration: {incident.duration}
              </Typography>
            </Box>
          ))}
        </Box>
      </PageSection>
    </PageLayout>
  );
};

export default StatusPage;
