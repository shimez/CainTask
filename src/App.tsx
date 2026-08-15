import React, { useState } from 'react';
import { ReactFlowProvider, MarkerType } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import 'reactflow/dist/style.css';
import { FlowContent } from './components/FlowContent';
import { loadProjects } from './utils/storageUtils';
import { Project, TaskNode } from './types';


const defaultTasks: TaskNode[] = [
  { id: '1', data: { label: 'タスク1: 企画書作成', completed: false }, position: { x: 250, y: 0 } },
  { id: '2', data: { label: 'タスク2: 調査', completed: false }, position: { x: 100, y: 100 } },
  { id: '3', data: { label: 'タスク3: レビュー', completed: false }, position: { x: 400, y: 100 } },
];
const defaultArrows: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', type: 'straight', markerEnd: { type: MarkerType.Arrow } },
  { id: 'e1-3', source: '1', target: '3', type: 'straight', markerEnd: { type: MarkerType.Arrow } },
];

const createDefaultProject = (): Project => ({
  localId: uuidv4(),
  title: 'デフォルトプロジェクト',
  tasks: defaultTasks,
  arrows: defaultArrows,
  taskIdCounter: 4,
  lastSavedAt: new Date().toISOString(),
});

/**
 * アプリケーションのメインコンポーネント。
 * プロジェクトの状態管理とReactFlowのプロバイダーを提供。
 */
const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>(() =>
    loadProjects(localStorage.getItem('projects'), [createDefaultProject()])
  );
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
