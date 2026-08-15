import React from 'react';
import { Project } from '../types';

import undoIcon from '../assets/undo.png';
import redoIcon from '../assets/redo.png';
import straightIcon from '../assets/straight.png';
import smoothstepIcon from '../assets/smoothstep.png';
import bezierIcon from '../assets/bezier.png';

export const OPERATION_PANEL_Z_INDEX = 100;

const BUTTON_GAP = 10;
const TAB_GAP = 5;
const ICON_SIZE = 20;

export type OperationTab = 'tasks' | 'projects' | 'files';
export type ArrowType = 'straight' | 'smoothstep' | 'bezier';

interface OperationPanelProps {
  projects: Project[];
  currentProjectId: string;
  activeTab: OperationTab;
  arrowType: ArrowType;
  canDelete: boolean;
  canUndo: boolean;
  canRedo: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onProjectSwitch: (project: Project) => void;
  onTabChange: (tab: OperationTab) => void;
  onAddTask: () => void;
  onDelete: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onArrowTypeChange: (type: ArrowType) => void;
  onCreateProject: () => void;
  onManageProjects: () => void;
  onRenameProject: () => void;
  onSaveAsNew: () => void;
  onExport: () => void;
  onImportClick: () => void;
  onImport: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 15px',
  background: 'none',
  border: 'none',
  borderBottom: isActive ? '2px solid #007bff' : 'none',
  color: isActive ? '#007bff' : '#666',
  fontWeight: isActive ? 'bold' : 'normal',
  cursor: 'pointer',
});

export const OperationPanel: React.FC<OperationPanelProps> = ({
  projects,
  currentProjectId,
  activeTab,
  arrowType,
  canDelete,
  canUndo,
  canRedo,
  fileInputRef,
  onProjectSwitch,
  onTabChange,
  onAddTask,
  onDelete,
  onUndo,
  onRedo,
  onArrowTypeChange,
  onCreateProject,
  onManageProjects,
  onRenameProject,
  onSaveAsNew,
  onExport,
  onImportClick,
  onImport,
}) => (
  <div className="operation-panel" style={{ position: 'absolute', top: 10, left: 10, zIndex: OPERATION_PANEL_Z_INDEX, maxWidth: 'calc(100vw - 30px)', overflow: 'hidden' }}>
    <div style={{ marginBottom: BUTTON_GAP }}>
      <select
        aria-label="プロジェクト選択"
        value={currentProjectId}
        onChange={(event) => {
          const selectedProject = projects.find((project) => project.localId === event.target.value);
          if (selectedProject) onProjectSwitch(selectedProject);
        }}
        style={{ padding: '5px', width: '100%', maxWidth: '300px', boxSizing: 'border-box' }}
      >
        {projects.map((project) => (
          <option key={project.localId} value={project.localId}>
            {`${project.title} (${new Date(project.lastSavedAt ?? new Date().toISOString()).toLocaleString('ja-JP', {
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
    <div className="tab-bar" style={{ display: 'flex', gap: TAB_GAP, marginBottom: BUTTON_GAP, borderBottom: '2px solid #ccc', overflowX: 'auto', whiteSpace: 'nowrap', maxWidth: 'calc(100vw - 80px)', boxSizing: 'border-box' }}>
      <button onClick={() => onTabChange('tasks')} style={tabStyle(activeTab === 'tasks')} title="タスク操作">タスク</button>
      <button onClick={() => onTabChange('projects')} style={tabStyle(activeTab === 'projects')} title="プロジェクト管理">プロジェクト</button>
      <button onClick={() => onTabChange('files')} style={tabStyle(activeTab === 'files')} title="ファイル操作">ファイル</button>
    </div>
    <div style={{ padding: BUTTON_GAP }}>
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: BUTTON_GAP }}>
          <button onClick={onAddTask} style={{ padding: '5px 10px' }} title="新しいタスクを追加">タスク追加</button>
          <button onClick={onDelete} disabled={!canDelete} style={{ padding: '5px 10px', opacity: canDelete ? 1 : 0.5 }} title="選択したタスクまたは矢印を削除">削除</button>
          <button onClick={onUndo} disabled={!canUndo} style={{ padding: '5px', border: 'none', background: 'none', cursor: 'pointer' }} title="元に戻す">
            <img src={undoIcon} alt="Undo" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
          </button>
          <button onClick={onRedo} disabled={!canRedo} style={{ padding: '5px', border: 'none', background: 'none', cursor: 'pointer' }} title="やり直す">
            <img src={redoIcon} alt="Redo" style={{ width: ICON_SIZE, height: ICON_SIZE }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px', border: '1px solid #ccc', borderRadius: '4px' }}>
            <span style={{ marginRight: '5px', fontSize: '14px' }}>線種:</span>
            {([
              ['straight', '直線', straightIcon, 'Straight'],
              ['smoothstep', 'カギ線', smoothstepIcon, 'Smoothstep'],
              ['bezier', '曲線', bezierIcon, 'Bezier'],
            ] as const).map(([type, title, icon, alt]) => (
              <button key={type} onClick={() => onArrowTypeChange(type)} style={{ padding: '5px', border: arrowType === type ? '2px solid #007bff' : '1px solid #ccc', background: 'none', cursor: 'pointer' }} title={title}>
                <img src={icon} alt={alt} style={{ width: ICON_SIZE, height: ICON_SIZE }} />
              </button>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'projects' && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: BUTTON_GAP }}>
          <button onClick={onCreateProject} style={{ padding: '5px 10px' }} title="新しいプロジェクトを作成">プロジェクトの追加</button>
          <button onClick={onManageProjects} style={{ padding: '5px 10px' }} title="プロジェクトを管理">管理</button>
          <button onClick={onRenameProject} style={{ padding: '5px 10px' }} title="プロジェクト名を変更">名前変更</button>
          <button onClick={onSaveAsNew} style={{ padding: '5px 10px' }} title="現在のプロジェクトを別名で保存">別名保存</button>
        </div>
      )}
      {activeTab === 'files' && (
        <div style={{ display: 'flex', gap: BUTTON_GAP }}>
          <button onClick={onExport} style={{ padding: '5px 10px' }} title="プロジェクトをJSONファイルとしてエクスポート">エクスポート</button>
          <button onClick={onImportClick} style={{ padding: '5px 10px' }} title="JSONファイルからプロジェクトをインポート">インポート</button>
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".json" onChange={onImport} />
        </div>
      )}
    </div>
  </div>
);

