import React, { useState, useEffect } from 'react';
import { Edge } from 'reactflow';
import { TaskNode } from '../types';
import { areAllParentsCompleted } from '../utils/graphUtils';
import { AccessibleModal } from './AccessibleModal';

interface EditModalProps {
  task: TaskNode | null;
  tasks: TaskNode[];
  arrows: Edge[];
  onSave: (id: string, label: string, completed: boolean) => void;
  onClose: () => void;
}

export const EditModal: React.FC<EditModalProps> = ({ task, tasks, arrows, onSave, onClose }) => {
  const [label, setLabel] = useState(task?.data.label || '');
  const [completed, setCompleted] = useState(task?.data.completed || false);

  useEffect(() => {
    if (task) {
      setLabel(task.data.label);
      setCompleted(task.data.completed);
    }
  }, [task]);

  if (!task) return null;

  const canComplete = areAllParentsCompleted(task.id, tasks, arrows);
  const handleSave = () => {
    const newCompleted = task.data.completed ? completed : canComplete ? completed : false;
    onSave(task.id, label.trim() || task.data.label, newCompleted);
    onClose();
  };

  return (
    <AccessibleModal titleId="edit-task-title" onClose={onClose} width={320}>
      <h2 id="edit-task-title">タスク編集</h2>
      <label className="field-label" htmlFor="task-label">タスク名</label>
      <input id="task-label" value={label} onChange={(event) => setLabel(event.target.value)} />
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={completed}
          onChange={(event) => setCompleted(event.target.checked)}
          disabled={!canComplete && !task.data.completed}
        />
        完了
      </label>
      {!canComplete && !task.data.completed && (
        <p className="field-error" role="status">親タスクが未完了のため完了にできません。</p>
      )}
      <div className="modal-actions">
        <button onClick={handleSave}>保存</button>
        <button onClick={onClose}>キャンセル</button>
      </div>
    </AccessibleModal>
  );
};
