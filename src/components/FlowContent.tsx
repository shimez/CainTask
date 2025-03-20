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
  useReactFlow,
} from 'reactflow';
import { EditModal } from './EditModal';
import { ProjectSelectModal } from './ProjectSelectModal';
import { EditProjectTitleModal } from './EditProjectTitleModal';
import { Project, TaskNode } from '../App';
import { updateStyles, areAllParentsCompleted } from '../utils/graphUtils';
import { createNewLocalProject, saveCurrentProjectAsNew, handleDeleteProject } from '../utils/projectUtils';

import undoIcon from '../assets/undo.png';
import redoIcon from '../assets/redo.png';
import straightIcon from '../assets/straight.png';
import smoothstepIcon from '../assets/smoothstep.png';
import bezierIcon from '../assets/bezier.png';

/** 操作パネルのz-index値。モーダルより手前に表示 */
const OPERATION_PANEL_Z_INDEX = 100;
/** タブバーの高さ（ピクセル）。レイアウト計算に使用 */
const TAB_BAR_HEIGHT = 50;
/** 操作パネルの高さ（ピクセル）。タスク追加位置の計算に使用 */
const OPERATION_PANEL_HEIGHT = 80;
/** キャンバスの余白（ピクセル）。タスクが端に寄りすぎないように調整 */
const CANVAS_MARGIN = 50;
/** ボタンのサイズ（ピクセル）。丸ボタンの幅と高さに使用 */
const BUTTON_SIZE = 48;
/** ボタンの間隔（ピクセル）。レイアウト調整用 */
const BUTTON_GAP = 10;
/** タブ間の間隔（ピクセル）。タブバーのレイアウト調整用 */
const TAB_GAP = 5;
/** アイコンのサイズ（ピクセル）。操作ボタンのアイコンに使用 */
const ICON_SIZE = 20;

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
  const [arrowType, setArrowType] = useState<'straight' | 'smoothstep' | 'bezier'>('straight');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedArrowId, setSelectedArrowId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<TaskNode | null>(null);
  const [taskIdCounter, setTaskIdCounter] = useState<number>(effectiveProjects[effectiveIndex]?.taskIdCounter || sampleProject.taskIdCounter);
  const [history, setHistory] = useState<{ tasks: TaskNode[]; arrows: Edge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const taskOperationsRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { project, fitView, getViewport, setViewport } = useReactFlow();
  const [activeTab, setActiveTab] = useState<'tasks' | 'projects' | 'files'>('tasks');
  const [showProjectSelectModal, setShowProjectSelectModal] = useState<boolean>(false);
  const [showEditTitleModal, setShowEditTitleModal] = useState<boolean>(false);

  /**
   * 現在のプロジェクト状態をローカルストレージに保存。
   * ビューポートの位置情報も含めて保存し、履歴を更新。
   */
  const saveToLocalStorage = useCallback(() => {
    const viewport = getViewport();
    const updatedProjects = effectiveProjects.map((p, idx) =>
      idx === effectiveIndex
        ? { ...p, tasks, arrows, taskIdCounter, lastSavedAt: new Date().toISOString(), viewport }
        : p
    );
    setProjects(updatedProjects);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    localStorage.setItem('lastProjectId', effectiveProjects[effectiveIndex].localId);
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, historyIndex + 1), { tasks: [...tasks], arrows: [...arrows] }];
      setHistoryIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [effectiveProjects, effectiveIndex, tasks, arrows, taskIdCounter, setProjects, historyIndex, getViewport]);

  /** Undo操作。履歴を1つ前に戻し、タスクと矢印を復元 */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      const { tasks: prevTasks, arrows: prevArrows } = history[historyIndex - 1];
      setTasks(prevTasks);
      setArrows(prevArrows);
    }
  }, [history, historyIndex, setTasks, setArrows]);

  /** Redo操作。履歴を1つ進め、タスクと矢印を復元 */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      const { tasks: nextTasks, arrows: nextArrows } = history[historyIndex + 1];
      setTasks(nextTasks);
      setArrows(nextArrows);
    }
  }, [history, historyIndex, setTasks, setArrows]);

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

      const newEdge: Edge = {
        id: `e${arrows.length + 1}`,
        source: params.source,
        target: params.target,
        type: arrowType,
        markerEnd: { type: MarkerType.ArrowClosed },
      };
      const newArrows = [...arrows, newEdge];
      const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, newArrows, selectedTaskId, selectedArrowId);
      setTasks(updatedTasks);
      setArrows(styledArrows);
      saveToLocalStorage();
    },
    [arrows, arrowType, tasks, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage] // 'tasks' を追加
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      setSelectedArrowId(edge.id);
      setSelectedTaskId(null);
      const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(tasks, arrows, null, edge.id);
      setTasks(updatedTasks);
      setArrows(styledArrows);
    },
    [arrows, setTasks, setArrows] // 'tasks' を削除
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
        saveToLocalStorage();
        return styledArrows;
      });
    },
    [tasks, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage]
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
      return styledTasks;
    });
    setTaskIdCounter((prev) => prev + 1);
    saveToLocalStorage();
  }, [taskIdCounter, tasks, arrows, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage, project, getViewport]);

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
        return styledTasks;
      });
      setSelectedTaskId(null);
      saveToLocalStorage();
    } else if (selectedArrowId) {
      setArrows((prevArrows) => {
        const updatedArrows = prevArrows.filter((a) => a.id !== selectedArrowId);
        const { tasks: styledTasks, arrows: styledArrows } = updateStyles(tasks, updatedArrows, null, null);
        setTasks(styledTasks);
        return styledArrows;
      });
      setSelectedArrowId(null);
      saveToLocalStorage();
    }
  }, [selectedTaskId, selectedArrowId, tasks, arrows, setTasks, setArrows, saveToLocalStorage]);

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
        return styledTasks;
      });
      saveToLocalStorage();
    },
    [arrows, selectedTaskId, selectedArrowId, setTasks, setArrows, saveToLocalStorage]
  );

  const handleNodesChange = useCallback(
    (changes: any) => {
      onTasksChange(changes);
      if (changes.some((change: any) => change.type === 'position' && change.dragging)) {
        setIsDragging(true);
      }
      if (changes.some((change: any) => change.type === 'position' && !change.dragging && isDragging)) {
        setIsDragging(false);
        saveToLocalStorage();
      }
    },
    [onTasksChange, isDragging, saveToLocalStorage]
  );

  const exportData = useCallback(() => {
    const viewport = getViewport();
    const data = { tasks, arrows, taskIdCounter, title: effectiveProjects[effectiveIndex]?.title || '無題のプロジェクト', viewport };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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
          const data = JSON.parse(e.target?.result as string);
          const updatedArrows = (data.arrows || effectiveProjects[0].arrows).map((arrow: Edge) => ({
            ...arrow,
            type: arrowType,
            markerEnd: { type: MarkerType.ArrowClosed },
          }));
          const { tasks: updatedTasks, arrows: styledArrows } = updateStyles(
            data.tasks || effectiveProjects[0].tasks,
            updatedArrows,
            selectedTaskId,
            selectedArrowId
          );
          const newProject: Project = {
            localId: require('uuid').v4(),
            title: data.title || 'インポートしたプロジェクト',
            tasks: updatedTasks,
            arrows: styledArrows,
            taskIdCounter: data.taskIdCounter || 4,
            lastSavedAt: new Date().toISOString(),
            viewport: data.viewport,
          };
          setProjects((prevProjects) => {
            const updatedProjects = [...prevProjects, newProject];
            setCurrentProjectIndex(updatedProjects.length - 1);
            setTasks(updatedTasks);
            setArrows(styledArrows);
            setTaskIdCounter(data.taskIdCounter || 4);
            if (newProject.viewport) {
              setViewport(newProject.viewport);
            }
            saveToLocalStorage();
            return updatedProjects;
          });
        } catch (error) {
          alert('無効なJSONファイルです');
        }
      };
      reader.readAsText(file);
      event.target.value = '';
    },
    [arrowType, selectedTaskId, selectedArrowId, setProjects, setCurrentProjectIndex, setTasks, setArrows, saveToLocalStorage, effectiveProjects, setViewport]
  );

  const triggerFileInput = () => fileInputRef.current?.click();

  const handleProjectSwitch = useCallback(
    (project: Project) => {
      saveToLocalStorage();
      setTasks([]);
      setArrows([]);
      setTimeout(() => {
        const index = effectiveProjects.findIndex((p) => p.localId === project.localId);
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
    [effectiveProjects, saveToLocalStorage, setTasks, setArrows, setTaskIdCounter, setCurrentProjectIndex, arrowType, selectedTaskId, selectedArrowId, setViewport, fitView]
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
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: OPERATION_PANEL_Z_INDEX, maxWidth: 'calc(100vw - 30px)', overflow: 'hidden' }}>
        <div style={{ marginBottom: BUTTON_GAP }}>
          <select
            value={effectiveProjects[effectiveIndex]?.localId || ''}
            onChange={(e) => {
              const selectedProject = effectiveProjects.find((p) => p.localId === e.target.value);
              if (selectedProject) handleProjectSwitch(selectedProject);
            }}
            style={{ padding: '5px', width: '100%', maxWidth: '300px', boxSizing: 'border-box' }}
          >
            {effectiveProjects.map((p) => (
              <option key={p.localId} value={p.localId}>
                {`${p.title} (${new Date(p.lastSavedAt ?? new Date().toISOString()).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })})`}
              </option>
            ))}
          </select>
        </div>
        <div
          className="tab-bar"
          style={{
            display: 'flex',
            gap: TAB_GAP,
            marginBottom: BUTTON_GAP,
            borderBottom: '2px solid #ccc',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            maxWidth: 'calc(100vw - 80px)',
            boxSizing: 'border-box',
          }}
        >
          <button
            onClick={() => setActiveTab('tasks')}
            style={{
              padding: '8px 15px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'tasks' ? '2px solid #007bff' : 'none',
              color: activeTab === 'tasks' ? '#007bff' : '#666',
              fontWeight: activeTab === 'tasks' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
            title="タスク操作"
          >
            タスク
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            style={{
              padding: '8px 15px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'projects' ? '2px solid #007bff' : 'none',
              color: activeTab === 'projects' ? '#007bff' : '#666',
              fontWeight: activeTab === 'projects' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
            title="プロジェクト管理"
          >
            プロジェクト
          </button>
          <button
            onClick={() => setActiveTab('files')}
            style={{
              padding: '8px 15px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'files' ? '2px solid #007bff' : 'none',
              color: activeTab === 'files' ? '#007bff' : '#666',
              fontWeight: activeTab === 'files' ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
            title="ファイル操作"
          >
            ファイル
          </button>
        </div>
        <div ref={taskOperationsRef} style={{ padding: BUTTON_GAP }}>
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: BUTTON_GAP }}>
              <button onClick={addTask} style={{ padding: '5px 10px' }} title="新しいタスクを追加">
                タスク追加
              </button>
              <button
                onClick={deleteSelected}
                disabled={!selectedTaskId && !selectedArrowId}
                style={{ padding: '5px 10px', opacity: !selectedTaskId && !selectedArrowId ? 0.5 : 1 }}
                title="選択したタスクまたは矢印を削除"
              >
                削除
              </button>
              <button onClick={undo} disabled={historyIndex <= 0} style={{ padding: '5px', border: 'none', background: 'none', cursor: 'pointer' }} title="元に戻す">
                <img src={undoIcon} alt="Undo" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
              </button>
              <button onClick={redo} disabled={historyIndex >= history.length - 1} style={{ padding: '5px', border: 'none', background: 'none', cursor: 'pointer' }} title="やり直す">
                <img src={redoIcon} alt="Redo" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
              </button>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px',
                  border: '1px solid #ccc',
                  borderRadius: '4px',
                }}
              >
                <span style={{ marginRight: '5px', fontSize: '14px' }}>線種:</span>
                <button
                  onClick={() => handleArrowTypeChange('straight')}
                  style={{
                    padding: '5px',
                    border: arrowType === 'straight' ? '2px solid #007bff' : '1px solid #ccc',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  title="直線"
                >
                  <img src={straightIcon} alt="Straight" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                </button>
                <button
                  onClick={() => handleArrowTypeChange('smoothstep')}
                  style={{
                    padding: '5px',
                    border: arrowType === 'smoothstep' ? '2px solid #007bff' : '1px solid #ccc',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  title="カギ線"
                >
                  <img src={smoothstepIcon} alt="Smoothstep" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                </button>
                <button
                  onClick={() => handleArrowTypeChange('bezier')}
                  style={{
                    padding: '5px',
                    border: arrowType === 'bezier' ? '2px solid #007bff' : '1px solid #ccc',
                    background: 'none',
                    cursor: 'pointer',
                  }}
                  title="曲線"
                >
                  <img src={bezierIcon} alt="Bezier" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
                </button>
              </div>
            </div>
          )}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: BUTTON_GAP }}>
              <button
                onClick={handleCreateNewProject}
                style={{ padding: '5px 10px' }}
                title="新しいプロジェクトを作成"
              >
                プロジェクトの追加
              </button>
              <button onClick={() => setShowProjectSelectModal(true)} style={{ padding: '5px 10px' }} title="プロジェクトを管理">
                管理
              </button>
              <button onClick={() => setShowEditTitleModal(true)} style={{ padding: '5px 10px' }} title="プロジェクト名を変更">
                名前変更
              </button>
              <button
                onClick={() => saveCurrentProjectAsNew(projects, effectiveIndex, tasks, arrows, taskIdCounter, setProjects, setCurrentProjectIndex, saveToLocalStorage)}
                style={{ padding: '5px 10px' }}
                title="現在のプロジェクトを別名で保存"
              >
                別名保存
              </button>
            </div>
          )}
          {activeTab === 'files' && (
            <div style={{ display: 'flex', gap: BUTTON_GAP }}>
              <button onClick={exportData} style={{ padding: '5px 10px' }} title="プロジェクトをJSONファイルとしてエクスポート">
                エクスポート
              </button>
              <button onClick={triggerFileInput} style={{ padding: '5px 10px' }} title="JSONファイルからプロジェクトをインポート">
                インポート
              </button>
              <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={importData} />
            </div>
          )}
        </div>
      </div>
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
      <EditModal task={editingTask} tasks={tasks} arrows={arrows} onSave={updateTask} onClose={() => setEditingTask(null)} />
    </>
  );
};