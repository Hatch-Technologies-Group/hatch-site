import type { AiEmployeeUsageStats } from '@/lib/api/ai-employees';

const CSV_HEADERS = [
  'personaKey',
  'personaName',
  'totalActions',
  'successfulActions',
  'failedActions',
  'successRate',
  'topTools',
  'windowFrom',
  'windowTo'
];

export function exportUsageStatsToCsv(stats: AiEmployeeUsageStats[]) {
  if (!stats.length) {
    return;
  }
  const rows = stats.map((stat) => {
    const successRate = stat.totalActions
      ? ((stat.successfulActions / stat.totalActions) * 100).toFixed(1)
      : '0';
    const topTools = stat.toolsUsed
      .map((tool) => `${tool.toolKey}:${tool.count}`)
      .join('|');
    return [
      stat.personaKey,
      stat.personaName,
      String(stat.totalActions),
      String(stat.successfulActions),
      String(stat.failedActions),
      successRate,
      topTools,
      stat.timeWindow.from,
      stat.timeWindow.to
    ];
  });

  const data = [CSV_HEADERS, ...rows]
    .map((cols) => cols.map(escapeCsvCell).join(','))
    .join('\n');

  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date().toISOString().slice(0, 10);
  link.download = `ai-usage-${today}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvCell(value: string) {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
