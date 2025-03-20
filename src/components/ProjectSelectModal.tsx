import React, { useState } from 'react';
import { Project } from '../App';
import { DeleteConfirmModal } from './DeleteConfirmModal';

/** モーダルのz-index値。背景より前面に表示するための基準値 */
const MODAL_Z_INDEX = 200;
/** モーダルの幅（ピクセル）。プロジェクト一覧が収まる適切なサイズ */
const MODAL_WIDTH = 400;
/** ボタンの間隔（ピクセル）。レイアウト調整用 */
const BUTTON_GAP = 10;

interface ProjectSelectModalProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onDelete: (localId: string) => void;
  onClose: () => void;
}

/**
 * プロジェクト選択用のモーダル。
 * プロジェクト一覧を表示し、選択または削除を可能にする。
 */
export const ProjectSelectModal: React.FC<ProjectSelectModalProps> = ({ projects, onSelect, onDelete, onClose }) => {
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);

  const handleDeleteClick = (project: Project) => {
    setDeleteProject(project);
  };

  const confirmDelete = () => {
    if (deleteProject) {
      onDelete(deleteProject.localId);
      setDeleteProject(null);
    }
  };

  const cancelDelete = () => {
    setDeleteProject(null);
  };

  return (
    <>
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        background: 'rgba(0,0,0,0.5)', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        zIndex: MODAL_Z_INDEX 
      }}>
        <div style={{ background: 'white', padding: 20, borderRadius: 5, width: MODAL_WIDTH }}>
          <h3>プロジェクト選択</h3>
          {projects.map((project) => (
            <div key={project.localId} style={{ marginBottom: BUTTON_GAP, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => onSelect(project)} style={{ width: '70%', textAlign: 'left' }}>
                {project.title} {project.lastSavedAt ? `(${new Date(project.lastSavedAt).toLocaleString()})` : '(未保存)'}
              </button>
              <button
                onClick={() => handleDeleteClick(project)}
                style={{ padding: '5px', background: 'red', color: 'white', border: 'none', borderRadius: 3 }}
              >
                削除
              </button>
            </div>
          ))}
          <button onClick={onClose} style={{ marginTop: BUTTON_GAP }}>閉じる</button>
        </div>
      </div>
      {deleteProject && (
        <DeleteConfirmModal project={deleteProject} onConfirm={confirmDelete} onCancel={cancelDelete} />
      )}
    </>
  );
};