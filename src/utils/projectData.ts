import { Edge } from 'reactflow';
import { TaskNode } from '../types';

export const PROJECT_FILE_VERSION = 1;

export interface ProjectFileData {
  title: string;
  tasks: TaskNode[];
  arrows: Edge[];
  taskIdCounter: number;
  viewport?: { x: number; y: number; zoom: number };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isTask = (value: unknown): value is TaskNode => {
  if (!isRecord(value) || !isRecord(value.data) || !isRecord(value.position)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.data.label === 'string' &&
    typeof value.data.completed === 'boolean' &&
    isFiniteNumber(value.position.x) &&
    isFiniteNumber(value.position.y)
  );
};

const isEdge = (value: unknown): value is Edge =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.source === 'string' &&
  typeof value.target === 'string';

const isViewport = (value: unknown): value is NonNullable<ProjectFileData['viewport']> =>
  isRecord(value) &&
  isFiniteNumber(value.x) &&
  isFiniteNumber(value.y) &&
  isFiniteNumber(value.zoom) &&
  value.zoom > 0;

export const serializeProjectFile = (data: ProjectFileData): string =>
  JSON.stringify({ version: PROJECT_FILE_VERSION, project: data }, null, 2);

export const parseProjectFile = (value: unknown): ProjectFileData => {
  if (!isRecord(value)) throw new Error('プロジェクトデータがオブジェクトではありません');

  const payload = value.version === PROJECT_FILE_VERSION && isRecord(value.project)
    ? value.project
    : value;

  if (!Array.isArray(payload.tasks) || !payload.tasks.every(isTask)) {
    throw new Error('タスクデータの形式が正しくありません');
  }
  if (!Array.isArray(payload.arrows) || !payload.arrows.every(isEdge)) {
    throw new Error('依存関係データの形式が正しくありません');
  }

  const taskIds = new Set(payload.tasks.map((task) => task.id));
  if (payload.arrows.some((arrow) => !taskIds.has(arrow.source) || !taskIds.has(arrow.target))) {
    throw new Error('存在しないタスクを参照する依存関係があります');
  }

  const numericIds = payload.tasks
    .map((task) => Number(task.id))
    .filter(Number.isFinite);
  const minimumCounter = numericIds.length > 0 ? Math.max(...numericIds) + 1 : payload.tasks.length;
  const suppliedCounter = isFiniteNumber(payload.taskIdCounter) ? payload.taskIdCounter : minimumCounter;

  return {
    title: typeof payload.title === 'string' && payload.title.trim() ? payload.title : 'インポートしたプロジェクト',
    tasks: payload.tasks,
    arrows: payload.arrows,
    taskIdCounter: Math.max(suppliedCounter, minimumCounter),
    viewport: isViewport(payload.viewport) ? payload.viewport : undefined,
  };
};
