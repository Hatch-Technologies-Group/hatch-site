import { PersonaAdminPanel } from '@/components/admin/ai-personas/PersonaAdminPanel';
import { AiEmployeesDisabledNotice } from '@/components/admin/ai/AiEmployeesDisabledNotice';
import {
  AiEmployeesDisabledError,
  getAiEmployeeUsageStats,
  listAiEmployeeInstances,
  listAiEmployeeTemplates
} from '@/lib/api/ai-employees';

export const dynamic = 'force-dynamic';

export default async function AdminAiPersonasPage() {
  let disabledMessage: string | null = null;
  let templates: Awaited<ReturnType<typeof listAiEmployeeTemplates>> = [];
  let instances: Awaited<ReturnType<typeof listAiEmployeeInstances>> = [];
  let usageStats: Awaited<ReturnType<typeof getAiEmployeeUsageStats>> = [];

  try {
    [templates, instances, usageStats] = await Promise.all([
      listAiEmployeeTemplates(),
      listAiEmployeeInstances(),
      getAiEmployeeUsageStats()
    ]);
  } catch (error) {
    if (error instanceof AiEmployeesDisabledError) {
      disabledMessage = error.message;
    } else {
      throw error;
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">AI Personas</h1>
        <p className="text-sm text-slate-600">
          Review and adjust persona metadata, tones, and prompts. Changes persist in the canonical template and propagate to all AI employees.
        </p>
      </div>

      {disabledMessage ? (
        <AiEmployeesDisabledNotice message={disabledMessage} />
      ) : (
        <PersonaAdminPanel
          initialTemplates={templates}
          initialInstances={instances}
          usageStats={usageStats}
        />
      )}
    </div>
  );
}
