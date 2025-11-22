export function savedSearchAlertEmail(params: {
  consumerName?: string | null;
  orgName: string;
  searchName: string;
  matchCount: number;
  portalLink: string;
}) {
  const { consumerName, orgName, searchName, matchCount, portalLink } = params;
  const greeting = consumerName ? `Hi ${consumerName},` : 'Hi there,';
  const summary = `We found ${matchCount} new match${matchCount === 1 ? '' : 'es'} for your saved search "${searchName}" at ${orgName}.`;
  const text = [greeting, '', summary, '', `View the new listings: ${portalLink}`, '', 'Thanks,', `${orgName} via Hatch`].join('\n');
  const html = text
    .split('\n')
    .map((line) => (line.trim().length === 0 ? '<br />' : `<p>${line}</p>`))
    .join('');
  return { subject: `New matches for "${searchName}"`, text, html };
}

export function aiCopilotBriefingEmail(params: {
  agentName?: string | null;
  orgName: string;
  summary: string;
  dashboardLink: string;
}) {
  const { agentName, orgName, summary, dashboardLink } = params;
  const greeting = agentName ? `Hi ${agentName},` : 'Hi there,';
  const text = [
    greeting,
    '',
    `Here is your AI Copilot briefing for today at ${orgName}:`,
    '',
    summary,
    '',
    `View details: ${dashboardLink}`,
    '',
    'Thanks,',
    'Hatch Copilot'
  ].join('\n');
  const html = text
    .split('\n')
    .map((line) => (line.trim().length === 0 ? '<br />' : `<p>${line}</p>`))
    .join('');
  return { subject: 'Your AI Copilot briefing', text, html };
}

export function complianceAlertEmail(params: {
  brokerName?: string | null;
  orgName: string;
  issueSummary: string;
  complianceLink: string;
}) {
  const { brokerName, orgName, issueSummary, complianceLink } = params;
  const greeting = brokerName ? `Hi ${brokerName},` : 'Hi there,';
  const text = [
    greeting,
    '',
    `New compliance items were detected for ${orgName}:`,
    '',
    issueSummary,
    '',
    `Review the details: ${complianceLink}`,
    '',
    'Thanks,',
    'Hatch Compliance'
  ].join('\n');
  const html = text
    .split('\n')
    .map((line) => (line.trim().length === 0 ? '<br />' : `<p>${line}</p>`))
    .join('');
  return { subject: 'Compliance alert for your brokerage', text, html };
}

export function accountingSyncErrorEmail(params: {
  brokerName?: string | null;
  orgName: string;
  errorSummary: string;
  financialsLink: string;
}) {
  const { brokerName, orgName, errorSummary, financialsLink } = params;
  const greeting = brokerName ? `Hi ${brokerName},` : 'Hi there,';
  const text = [
    greeting,
    '',
    `We encountered accounting sync errors for ${orgName}:`,
    '',
    errorSummary,
    '',
    `Review sync status: ${financialsLink}`,
    '',
    'Thanks,',
    'Hatch Accounting'
  ].join('\n');
  const html = text
    .split('\n')
    .map((line) => (line.trim().length === 0 ? '<br />' : `<p>${line}</p>`))
    .join('');
  return { subject: 'Accounting sync errors', text, html };
}
