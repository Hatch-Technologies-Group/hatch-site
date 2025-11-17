export const isAiEmployeesEnabled = (): boolean => {
  return process.env.AI_EMPLOYEES_ENABLED !== 'false';
};
