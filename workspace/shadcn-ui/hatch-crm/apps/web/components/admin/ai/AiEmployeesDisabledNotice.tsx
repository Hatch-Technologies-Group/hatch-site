"use client";

type Props = {
  message?: string;
  className?: string;
};

export function AiEmployeesDisabledNotice({ message, className }: Props) {
  return (
    <div
      className={`rounded-xl border border-dashed border-slate-300 bg-white/60 p-8 text-center text-sm text-slate-600 ${
        className ?? ''
      }`}
    >
      <p className="text-base font-semibold text-slate-900">
        {message ?? 'AI Employees are disabled in this environment.'}
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Enable the `AI_EMPLOYEES_ENABLED` flag or switch to an environment where AI Employees are available.
      </p>
    </div>
  );
}
