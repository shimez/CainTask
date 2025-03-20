import React, { useState } from 'react';
import { ReactFlowProvider, Node, Edge, MarkerType } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import 'reactflow/dist/style.css';
import { FlowContent } from './components/FlowContent';

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
  viewport?: { x: number; y: number; zoom: number }; // 位置情報を追加（オプショナル）
}

const defaultTasks: TaskNode[] = [
  { id: '1', data: { label: 'タスク1: 企画書作成', completed: false }, position: { x: 250, y: 0 } },
  { id: '2', data: { label: 'タスク2: 調査', completed: false }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'タスク3: レビュー', completed: false }, position: { x: 400, y: 100 } },
];
const defaultArrows: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'straight', markerEnd: { type: MarkerType.Arrow } },
  { id: 'e1-3', source: '1', target: '3', type: 'straight', markerEnd: { type: MarkerType.Arrow } },
];

/**
 * アプリケーションのメインコンポーネント。
 * プロジェクトの状態管理とReactFlowのプロバイダーを提供。
 */
const App: React.FC = () => {
  const savedProjects = localStorage.getItem('projects');
  const initialProjects: Project[] = savedProjects
    ? JSON.parse(savedProjects)
    : [
        {
          localId: uuidv4(),
          title: 'デフォルトプロジェクト',
          tasks: defaultTasks,
          arrows: defaultArrows,
          taskIdCounter: 4,
          lastSavedAt: new Date().toISOString(),
        },
      ];
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [currentProjectIndex, setCurrentProjectIndex] = useState<number>(0);

  return (
    <div style={{ height: '100vh' }}>
      <ReactFlowProvider>
        <FlowContent
          projects={projects}
          currentProjectIndex={currentProjectIndex}
          setProjects={setProjects}
          setCurrentProjectIndex={setCurrentProjectIndex}
        />
      </ReactFlowProvider>
    </div>
  );
};

export default App;