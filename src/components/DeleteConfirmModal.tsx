import React from 'react';
import { Project } from '../types';
import { AccessibleModal } from './AccessibleModal';

const MAX_DISPLAY_TASKS = 10;

interface DeleteConfirmModalProps {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ project, onConfirm, onCancel }) => {
  const incompleteTasks = project.tasks.filter((task) => !task.data.completed);
  const completedTasks = project.tasks.filter((task) => task.data.completed);
  const displayedTasks = [
    ...incompleteTasks.slice(0, MAX_DISPLAY_TASKS),
    ...completedTasks.slice(0, Math.max(0, MAX_DISPLAY_TASKS - incompleteTasks.length)),
  ];
  const remainingTasks = project.tasks.length - displayedTasks.length;

  return (
    <AccessibleModal titleId="delete-project-title" onClose={onCancel} zIndex={300}>
      <h2 id="delete-project-title">プロジェクト削除確認</h2>
      <p>「{project.title}」を削除しますか？この操作は元に戻せません。</p>
      <dl className="project-summary">
        <dt>タスク数</dt><dd>{project.tasks.length}</dd>
        <dt>エッジ数</dt><dd>{project.arrows.length}</dd>
      </dl>
      <p id="delete-task-list-label">タスク一覧（一部）</p>
      <ul className="delete-task-list" aria-labelledby="delete-task-list-label">
        {displayedTasks.map((task) => (
          <li key={task.id}>{task.data.completed ? '✓' : '○'} {task.data.label}</li>
        ))}
        {remainingTasks > 0 && <li>ほか {remainingTasks} 件</li>}
      </ul>
      <div className="modal-actions">
        <button className="danger-button" onClick={onConfirm}>削除する</button>
        <button onClick={onCancel}>キャンセル</button>
      </div>
    </AccessibleModal>
  );
};
