import React, { useState } from 'react';
import { AccessibleModal } from './AccessibleModal';

interface EditProjectTitleModalProps {
  currentTitle: string;
  onSave: (newTitle: string) => void;
  onClose: () => void;
}

export const EditProjectTitleModal: React.FC<EditProjectTitleModalProps> = ({ currentTitle, onSave, onClose }) => {
  const [title, setTitle] = useState(currentTitle);
  const handleSave = () => {
    const trimmed = title.trim();
    if (trimmed) onSave(trimmed);
    onClose();
  };

  return (
    <AccessibleModal titleId="edit-project-title" onClose={onClose} width={320}>
      <h2 id="edit-project-title">プロジェクト名編集</h2>
      <label className="field-label" htmlFor="project-title-input">プロジェクト名</label>
      <input
        id="project-title-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && handleSave()}
      />
      <div className="modal-actions">
        <button onClick={handleSave} disabled={!title.trim()}>保存</button>
        <button onClick={onClose}>キャンセル</button>
      </div>
    </AccessibleModal>
  );
};
