import { Edge, Node } from 'reactflow';

export interface TaskNodeData {
  label: string;
  completed: boolean;
}

export type TaskNode = Node<TaskNodeData>;

export interface Project {
  localId: string;
  title: string;
  tasks: TaskNode[];
  arrows: Edge[];
  taskIdCounter: number;
  lastSavedAt?: string;
  viewport?: { x: number; y: number; zoom: number };
}
