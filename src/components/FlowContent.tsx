import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeChange,
  useReactFlow,
} from 'reactflow';
import { EditModal } from './EditModal';
import { ProjectSelectModal } from './ProjectSelectModal';
import { EditProjectTitleModal } from './EditProjectTitleModal';
import { Project, TaskNode } from '../types';
import { updateStyles, areAllParentsCompleted, wouldCreateCycle } from '../utils/graphUtils';
import { v4 as uuidv4 } from 'uuid';
import { createNewLocalProject, saveCurrentProjectAsNew, handleDeleteProject } from '../utils/projectUtils';
import { useGraphHistory } from '../hooks/useGraphHistory';
import { parseProjectFile, serializeProjectFile } from '../utils/projectData';
import { ArrowType, OperationPanel, OperationTab, OPERATION_PANEL_Z_INDEX } from './OperationPanel';
/** タブバーの高さ（ピクセル）。レイアウト計算に使用 */
const TAB_BAR_HEIGHT = 50;
/** 操作パネルの高さ（ピクセル）。タスク追加位置の計算に使用 */
const OPERATION_PANEL_HEIGHT = 80;
/** キャンバスの余白（ピクセル）。タスクが端に寄りすぎないように調整 */
const CANVAS_MARGIN = 50;
/** ボタンのサイズ（ピクセル）。丸ボタンの幅と高さに使用 */
const BUTTON_SIZE = 48;

interface FlowContentProps {
  projects: Project[];
  currentProjectIndex: number;
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  setCurrentProjectIndex: React.Dispatch<React.SetStateAction<number>>;
}

const sampleProject: Project = {
  localId: 'sample-project',
  title: 'サンプルプロジェクト',
  tasks: [
    { id: '1', data: { label: 'タスク1', completed: false }, position: { x: 300, y: 100 } },
    { id: '2', data: { label: 'タスク2', completed: false }, position: { x: 500, y: 200 } },
    { id: '3', data: { label: 'タスク3', completed: false }, position: { x: 700, y: 300 } },
  ],
  arrows: [
    { id: 'e1', source: '1', target: '2', type: 'straight' },
    { id: 'e2', source: '2', target: '3', type: 'straight' },
  ],
  taskIdCounter: 4,
};

/**
 * タスクと依存関係（矢印）を管理するフロービューコンポーネント。
 * ReactFlowを使用して、タスクの追加・編集・削除、プロジェクトの管理を行う。
 */
export const FlowContent: React.FC<FlowContentProps> = ({ projects, currentProjectIndex, setProjects, setCurrentProjectIndex }) => {
  const effectiveProjects = useMemo(() => {
    return projects.length === 0 ? [sampleProject] : projects;
  }, [projects]);
  const effectiveIndex = projects.length === 0 ? 0 : currentProjectIndex;

  const [tasks, setTasks, onTasksChange] = useNodesState<TaskNode['data']>(effectiveProjects[effectiveIndex]?.tasks || sampleProject.tasks);
  const [arrows, setArrows, onEdgesChange] = useEdgesState<Edge[]>(effectiveProjects[effectiveIndex]?.arrows || sampleProject.arrows);
  const [arrowType, setArrowType] = useState<ArrowType>('straight');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskNode | null>(null);
  const [taskIdCounter, setTaskIdCounter] = useState<number>(effectiveProjects[effectiveIndex]?.taskIdCounter || sampleProject.taskIdCounter);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project, fitView, getViewport, setViewport } = useReactFlow();
  const [activeTab, setActiveTab] = useState<OperationTab>('tasks');
  const [showProjectSelectModal, setShowProjectSelectModal] = useState<boolean>(false);
  const [showEditTitleModal, setShowEditTitleModal] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const { canUndo, canRedo, record: recordHistory, reset: resetHistory, undo, redo } = useGraphHistory(setTasks, setArrows);

  const showNotice = useCallback((message: string) => {
    setNotice(message);
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 4000);
  }, []);

  /**
   * 現在のプロジェクト状態をローカルストレージに保存。
   * ビューポートの位置情報も含めて保存し、履歴を更新。
   */
  const saveToLocalStorage = useCallback((
    nextTasks: TaskNode[] = tasks,
    nextArrows: Edge[] = arrows,
    nextTaskIdCounter: number = taskIdCounter
  ) => {
    const viewport = getViewport();
    const updatedProjects = effectiveProjects.map((p, idx) =>
      idx === effectiveIndex
        ? { ...p, tasks: nextTasks, arrows: nextArrows, taskIdCounter: nextTaskIdCounter, lastSavedAt: new Date().toISOString(), viewport }
        : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    localStorage.setItem('lastProjectId', effectiveProjects[effectiveIndex].localId);
    recordHistory({ tasks: nextTasks, arrows: nextArrows });
  }, [effectiveProjects, effectiveIndex, tasks, arrows, taskIdCounter, setProjects, getViewport, recordHistory]);

  useEffect(() => {
    const handleBeforeUnload = () => saveToLocalStorage();
    const handlePopState = () => saveToLocalStorage();
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [saveToLocalStorage]);

  useEffect(() => {
    if (projects.length === 0) {
      setProjects([sampleProject]);
      setCurrentProjectIndex(0);
      setTasks(sampleProject.tasks);
      setArrows(sampleProject.arrows);
      setTaskIdCounter(sampleProject.taskIdCounter);
      localStorage.setItem('projects', JSON.stringify([sampleProject]));
      localStorage.setItem('lastProjectId', sampleProject.localId);
      setTimeout(() => fitView(), 0);
    }
  }, [projects, setProjects, setCurrentProjectIndex, setTasks, setArrows, setTaskIdCounter, fitView]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const isDuplicate = arrows.some(
        (arrow) => arrow.source === params.source && arrow.target === params.target
      );

      if (isDuplicate) return;
      if (wouldCreateCycle(params.source, params.target, arrows)) {
        showNotice('循環する依存関係は作成できません');
        return;
      }

      const newEdge: Edge = {
        id: `e-${uuidv4()}`,
        source: params.source,
        target: params.target,
        type: arrowType,
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      const newArrows = [...arrows, newEdge];
      const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, newArrows, selectedTaskId, selectedArrowId);
      setTasks(updatedTasks);
      setArrows(styledArrows);
      saveToLocalStorage(updatedTasks, styledArrows, taskIdCounter);
    },
    [arrows, arrowType, tasks, taskIdCounter, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage, showNotice]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedArrowId(edge.id);
      setSelectedTaskId(null);
      const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, arrows, null, edge.id);
      setTasks(updatedTasks);
      setArrows(styledArrows);
    },
    [tasks, arrows, setTasks, setArrows]
  );

  const handleArrowTypeChange = useCallback(
    (newType: 'straight' | 'smoothstep' | 'bezier') => {
      setArrowType(newType);
      setArrows((ars) => {
        const updatedArrows = ars.map((arrow) => ({
          ...arrow,
          type: newType,
          markerEnd: { type: MarkerType.ArrowClosed },
        }));
        const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, updatedArrows, selectedTaskId, selectedArrowId);
        setTasks(updatedTasks);
        saveToLocalStorage(updatedTasks, styledArrows, taskIdCounter);
        return styledArrows;
      });
    },
    [tasks, taskIdCounter, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage]
  );

  /**
   * 新しいタスクをキャンバスに追加する。
   * 追加位置は画面中央を基準にし、ビューポートの範囲内に収まるよう調整。
   * タスクIDはカウンターを利用して一意に生成。
   */
  const addTask = useCallback(() => {
    const newId = `${taskIdCounter}`;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    const baseX = windowWidth / 2 - CANVAS_MARGIN;
    const baseY = (TAB_BAR_HEIGHT + OPERATION_PANEL_HEIGHT + 20) * 2;

    const screenPosition = { x: baseX, y: baseY };
    const canvasPosition = project(screenPosition);
    const viewport = getViewport();
    const minX = -viewport.x / viewport.zoom;
    const maxX = minX + windowWidth / viewport.zoom;
    const minY = -viewport.y / viewport.zoom;
    const maxY = minY + windowHeight / viewport.zoom;

    const adjustedX = Math.max(minX + CANVAS_MARGIN, Math.min(maxX - CANVAS_MARGIN, canvasPosition.x));
    const adjustedY = Math.max(minY + CANVAS_MARGIN, Math.min(maxY - CANVAS_MARGIN, canvasPosition.y));

    const newTask: TaskNode = {
      id: newId,
      data: { label: `タスク${newId}`, completed: false },
      position: { x: adjustedX, y: adjustedY },
    };

    setTasks((prevTasks) => {
      const updatedTasks = [...prevTasks, newTask];
      const { tasks: styledTasks, arrows: styledArrows } = updateStyles(updatedTasks, arrows, selectedTaskId, selectedArrowId);
      setArrows(styledArrows);
      saveToLocalStorage(styledTasks, styledArrows, taskIdCounter + 1);
      return styledTasks;
    });
    setTaskIdCounter((prev) => prev + 1);
  }, [taskIdCounter, arrows, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage, project, getViewport]);

  const onTaskClick = useCallback((event: React.MouseEvent, task: TaskNode) => {
    setSelectedTaskId(task.id);
    setSelectedArrowId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedTaskId(null);
    setSelectedArrowId(null);
    const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, arrows, null, null);
    setTasks(updatedTasks);
    setArrows(styledArrows);
  }, [tasks, arrows, setTasks, setArrows]);

  const onTaskDoubleClick = useCallback((event: React.MouseEvent, task: TaskNode) => {
    setEditingTask(task);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedTaskId) {
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.filter((t) => t.id !== selectedTaskId);
        const updatedArrows = arrows.filter((a) => a.source !== selectedTaskId && a.target !== selectedTaskId);
        const { tasks: styledTasks, arrows: styledArrows } = updateStyles(updatedTasks, updatedArrows, null, selectedArrowId);
        setArrows(styledArrows);
        saveToLocalStorage(styledTasks, styledArrows, taskIdCounter);
        return styledTasks;
      });
      setSelectedTaskId(null);
    } else if (selectedArrowId) {
      setArrows((prevArrows) => {
        const updatedArrows = prevArrows.filter((a) => a.id !== selectedArrowId);
        const { tasks: styledTasks, arrows: styledArrows } = updateStyles(tasks, updatedArrows, null, null);
        setTasks(styledTasks);
        saveToLocalStorage(styledTasks, styledArrows, taskIdCounter);
        return styledArrows;
      });
      setSelectedArrowId(null);
    }
  }, [selectedTaskId, selectedArrowId, tasks, arrows, taskIdCounter, setTasks, setArrows, saveToLocalStorage]);

  const updateTask = useCallback(
    (id: string, label: string, completed: boolean) => {
      setTasks((prevTasks) => {
        const newTasks = prevTasks.map((t) => {
          if (t.id === id) {
            const canComplete = areAllParentsCompleted(t.id, prevTasks, arrows);
            const newCompleted = t.data.completed ? completed : canComplete ? completed : false;
            return { ...t, data: { label, completed: newCompleted } };
          }
          return t;
        });
        const { tasks: styledTasks, arrows: styledArrows } = updateStyles(newTasks, arrows, selectedTaskId, selectedArrowId);
        setArrows(styledArrows);
        saveToLocalStorage(styledTasks, styledArrows, taskIdCounter);
        return styledTasks;
      });
    },
    [arrows, taskIdCounter, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onTasksChange(changes);
      if (changes.some((change) => change.type === 'position' && change.dragging)) {
        setIsDragging(true);
      }
      if (changes.some((change) => change.type === 'position' && !change.dragging && isDragging)) {
        setIsDragging(false);
        saveToLocalStorage();
      }
    },
    [onTasksChange, isDragging, saveToLocalStorage]
  );

  const exportData = useCallback(() => {
    const viewport = getViewport();
    const data = { tasks, arrows, taskIdCounter, title: effectiveProjects[effectiveIndex]?.title || '無題のプロジェクト', viewport };
    const blob = new Blob([serializeProjectFile(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${effectiveProjects[effectiveIndex]?.title || '無題のプロジェクト'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [tasks, arrows, taskIdCounter, effectiveProjects, effectiveIndex, getViewport]);

  const importData = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!event.target.files) return;
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = parseProjectFile(JSON.parse(e.target?.result as string));
          const updatedArrows = data.arrows.map((arrow: Edge) => ({
            ...arrow,
            type: arrowType,
            markerEnd: { type: MarkerType.ArrowClosed },
          }));
          const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(
            data.tasks,
            updatedArrows,
            selectedTaskId,
            selectedArrowId
          );
          const newProject: Project = {
            localId: uuidv4(),
            title: data.title || 'インポートしたプロジェクト',
            tasks: updatedTasks,
            arrows: styledArrows,
            taskIdCounter: data.taskIdCounter,
            lastSavedAt: new Date().toISOString(),
            viewport: data.viewport,
          };
          setProjects((prevProjects) => {
            const updatedProjects = [...prevProjects, newProject];
            setCurrentProjectIndex(updatedProjects.length - 1);
            setTasks(updatedTasks);
            setArrows(styledArrows);
            setTaskIdCounter(data.taskIdCounter);
            if (newProject.viewport) {
              setViewport(newProject.viewport);
            }
            saveToLocalStorage();
            return updatedProjects;
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : '無効なJSONファイルです';
          showNotice(message);
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [arrowType, selectedTaskId, selectedArrowId, setProjects, setCurrentProjectIndex, setTasks, setArrows, saveToLocalStorage, setViewport, showNotice]
  );

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleProjectSwitch = useCallback(
    (project: Project) => {
      saveToLocalStorage();
      setTasks([]);
      setArrows([]);
      setTimeout(() => {
        const index = effectiveProjects.findIndex((p) => p.localId === project.localId);
        resetHistory();
        setCurrentProjectIndex(index);
        setTasks(project.tasks);
        const unifiedArrows = project.arrows.map((arrow) => ({
          ...arrow,
          type: arrowType,
          markerEnd: { type: MarkerType.ArrowClosed },
        }));
        const { tasks: styledTasks, arrows: styledArrows } = updateStyles(project.tasks, unifiedArrows, selectedTaskId, selectedArrowId);
        setTasks(styledTasks);
        setArrows(styledArrows);
        setTaskIdCounter(project.taskIdCounter);
        localStorage.setItem('lastProjectId', project.localId);
        if (project.viewport) {
          setViewport(project.viewport);
        } else {
          fitView();
        }
      }, 0);
    },
    [effectiveProjects, saveToLocalStorage, resetHistory, setTasks, setArrows, setTaskIdCounter, setCurrentProjectIndex, arrowType, selectedTaskId, selectedArrowId, setViewport, fitView]
  );

  useEffect(() => {
    const lastProjectId = localStorage.getItem('lastProjectId');
    if (lastProjectId) {
      const lastProject = effectiveProjects.find((p) => p.localId === lastProjectId);
      if (lastProject && effectiveProjects[effectiveIndex].localId !== lastProjectId) {
        handleProjectSwitch(lastProject);
      }
    }
  }, [effectiveProjects, handleProjectSwitch, effectiveIndex]);

  const handleCreateNewProject = useCallback(() => {
    createNewLocalProject(setProjects, setCurrentProjectIndex, setTasks, setArrows, setTaskIdCounter);
    setTimeout(() => fitView(), 0);
  }, [setProjects, setCurrentProjectIndex, setTasks, setArrows, setTaskIdCounter, fitView]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select')) return;
      const modifier = event.ctrlKey || event.metaKey;
      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedTaskId || selectedArrowId) {
          event.preventDefault();
          deleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [deleteSelected, redo, selectedArrowId, selectedTaskId, undo]);

  return (
    <>
      {showProjectSelectModal && (
        <ProjectSelectModal
          projects={effectiveProjects}
          onSelect={(project) => {
            handleProjectSwitch(project);
            setShowProjectSelectModal(false);
          }}
          onDelete={(localId) => handleDeleteProject(localId, setProjects, setCurrentProjectIndex, setTasks, setArrows, setTaskIdCounter, effectiveIndex)}
          onClose={() => setShowProjectSelectModal(false)}
        />
      )}
      {showEditTitleModal && (
        <EditProjectTitleModal
          currentTitle={effectiveProjects[effectiveIndex]?.title || ''}
          onSave={(newTitle) => {
            setProjects((prevProjects) => {
              const updatedProjects = prevProjects.map((p, idx) =>
                idx === effectiveIndex ? { ...p, title: newTitle, lastSavedAt: new Date().toISOString() } : p
              );
              localStorage.setItem('projects', JSON.stringify(updatedProjects));
              return updatedProjects;
            });
            setShowEditTitleModal(false);
          }}
          onClose={() => setShowEditTitleModal(false)}
        />
      )}
      <ReactFlow
        nodes={tasks}
        edges={arrows}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onNodeClick={onTaskClick}
        onNodeDoubleClick={onTaskDoubleClick}
        onPaneClick={onPaneClick}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
      <OperationPanel
        projects={effectiveProjects}
        currentProjectId={effectiveProjects[effectiveIndex]?.localId || ''}
        activeTab={activeTab}
        arrowType={arrowType}
        canDelete={Boolean(selectedTaskId || selectedArrowId)}
        canUndo={canUndo}
        canRedo={canRedo}
        fileInputRef={fileInputRef}
        onProjectSwitch={handleProjectSwitch}
        onTabChange={setActiveTab}
        onAddTask={addTask}
        onDelete={deleteSelected}
        onUndo={undo}
        onRedo={redo}
        onArrowTypeChange={handleArrowTypeChange}
        onCreateProject={handleCreateNewProject}
        onManageProjects={() => setShowProjectSelectModal(true)}
        onRenameProject={() => setShowEditTitleModal(true)}
        onSaveAsNew={() =>
          saveCurrentProjectAsNew(
            projects,
            effectiveIndex,
            tasks,
            arrows,
            taskIdCounter,
            setProjects,
            setCurrentProjectIndex,
            saveToLocalStorage
          )
        }
        onExport={exportData}
        onImportClick={triggerFileInput}
        onImport={importData}
      />
      <button
        onClick={addTask}
        style={{
          position: 'absolute',
          top: 60,
          right: 20,
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          borderRadius: '50%',
          background: '#007bff',
          color: 'white',
          fontSize: '20px',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: OPERATION_PANEL_Z_INDEX + 1,
        }}
        title="新しいタスクを追加"
      >
        +
      </button>
      {selectedTaskId || selectedArrowId ? (
        <button
          onClick={deleteSelected}
          style={{
            position: 'absolute',
            top: 120,
            right: 20,
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: '50%',
            background: '#007bff',
            color: 'white',
            fontSize: '20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: OPERATION_PANEL_Z_INDEX + 1,
          }}
          title="選択したタスクまたは矢印を削除"
        >
          -
        </button>
      ) : null}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: OPERATION_PANEL_Z_INDEX }}>
        <a
          href="https://note.com/ctake_shimez/n/n214948846287"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#007bff', textDecoration: 'none', fontSize: '14px' }}
          title="アプリの説明書を開く"
        >
          説明書
        </a>
      </div>
      <div className="status-legend" aria-label="タスク状態の凡例">
        <span>✓ 完了</span><span>● 着手可能</span><span>! 依存タスク未完了</span><span>青枠 選択中</span>
      </div>
      {notice && <div className="app-notice" role="status" aria-live="polite">{notice}</div>}
      <EditModal task={editingTask} tasks={tasks} arrows={arrows} onSave={updateTask} onClose={() => setEditingTask(null)} />
    </>
  );
};


