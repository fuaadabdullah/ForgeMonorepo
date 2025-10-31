/**
 * ForgeMonorepo Templater Functions
 * Custom functions for automated note generation and KPI calculations
 */

// Calculate KPI status based on thresholds
function calculateKPIStatus(current, target, type = 'higher-better') {
  if (!current || !target) return 'unknown';

  const ratio = current / target;

  if (type === 'higher-better') {
    if (ratio >= 1.1) return '🟢 excellent';
    if (ratio >= 0.9) return '🟡 good';
    if (ratio >= 0.7) return '🟠 needs-improvement';
    return '🔴 critical';
  } else {
    if (ratio <= 0.9) return '🟢 excellent';
    if (ratio <= 1.1) return '🟡 good';
    if (ratio <= 1.3) return '🟠 needs-improvement';
    return '🔴 critical';
  }
}

// Generate sprint burndown data
function generateBurndownData(totalPoints, daysRemaining, currentVelocity) {
  const dailyBurn = totalPoints / (daysRemaining + 1);
  const idealLine = [];
  const actualLine = [];

  for (let i = 0; i <= daysRemaining; i++) {
    idealLine.push(Math.max(0, totalPoints - (dailyBurn * i)));
    actualLine.push(Math.max(0, totalPoints - (currentVelocity * i)));
  }

  return { ideal: idealLine, actual: actualLine };
}

// Auto-generate project ID
function generateProjectId(component, title) {
  const timestamp = tp.date.now('YYMMDD');
  const cleanTitle = title.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  return `${component}-${timestamp}-${cleanTitle}`;
}

// Calculate team capacity
function calculateTeamCapacity(teamSize, sprintDays, focusFactor = 0.8) {
  const availableHours = teamSize * sprintDays * 8; // 8 hours per day
  return Math.round(availableHours * focusFactor); // Account for meetings, etc.
}

// Risk assessment calculator
function assessRisk(impact, probability) {
  const riskScore = impact * probability;

  if (riskScore >= 15) return { level: '🔴 Critical', action: 'Immediate mitigation required' };
  if (riskScore >= 10) return { level: '🟠 High', action: 'Active monitoring needed' };
  if (riskScore >= 5) return { level: '🟡 Medium', action: 'Plan mitigation strategy' };
  return { level: '🟢 Low', action: 'Monitor periodically' };
}

// Export functions for use in templates
module.exports = {
  calculateKPIStatus,
  generateBurndownData,
  generateProjectId,
  calculateTeamCapacity,
  assessRisk
};
