import React, { useState } from 'react';
import { Project } from '../types';
import { AccessibleModal } from './AccessibleModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ProjectSelectModalProps {
  projects: Project[];
  onSelect: (project: Project) => void;
  onDelete: (localId: string) => void;
  onClose: () => void;
}

export const ProjectSelectModal: React.FC<ProjectSelectModalProps> = ({ projects, onSelect, onDelete, onClose }) => {
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const confirmDelete = () => {
    if (!deleteProject) return;
    onDelete(deleteProject.localId);
    setDeleteProject(null);
  };

  return (
    <>
      <AccessibleModal titleId="select-project-title" onClose={onClose}>
        <h2 id="select-project-title">プロジェクト管理</h2>
        <ul className="project-list">
          {projects.map((project) => (
            <li key={project.localId}>
              <button className="project-select-button" onClick={() => onSelect(project)}>
                <span>{project.title}</span>
                <small>{project.lastSavedAt ? new Date(project.lastSavedAt).toLocaleString() : '未保存'}</small>
              </button>
              <button
                className="danger-button"
                onClick={() => setDeleteProject(project)}
                aria-label={`${project.title}を削除`}
              >
                削除
              </button>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button onClick={onClose}>閉じる</button>
        </div>
      </AccessibleModal>
      {deleteProject && (
        <DeleteConfirmModal
          project={deleteProject}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteProject(null)}
        />
      )}
    </>
  );
};
