import type { Project } from '../App';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isProject = (value: unknown): value is Project => {
  if (!isRecord(value)) return false;
  return (
    typeof value.localId === 'string' &&
    typeof value.title === 'string' &&
    Array.isArray(value.tasks) &&
    Array.isArray(value.arrows) &&
    typeof value.taskIdCounter === 'number'
  );
};

/**
 * Reads persisted projects without allowing malformed browser data to prevent
 * the application from starting.
 */
export const loadProjects = (raw: string | null, fallback: Project[]): Project[] => {
  if (!raw) return fallback;

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 && parsed.every(isProject)
      ? parsed
      : fallback;
  } catch {
    return fallback;
  }
};
