import React, { useState } from 'react';

/** モーダルのz-index値。背景より前面に表示するための基準値 */
const MODAL_Z_INDEX = 200;
/** モーダルの幅（ピクセル）。入力欄が収まる適切なサイズ */
const MODAL_WIDTH = 300;
/** ボタンの間隔（ピクセル）。レイアウト調整用 */
const BUTTON_GAP = 10;

interface EditProjectTitleModalProps {
  currentTitle: string;
  onSave: (newTitle: string) => void;
  onClose: () => void;
}

/**
 * プロジェクト名編集用のモーダル。
 * 現在のタイトルを編集し、新しいタイトルを保存する。
 */
export const EditProjectTitleModal: React.FC<EditProjectTitleModalProps> = ({ currentTitle, onSave, onClose }) => {
  const [title, setTitle] = useState(currentTitle);

  const handleSave = () => {
    if (title.trim()) {
      onSave(title);
    }
    onClose();
  };

  return (
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
        <h3>プロジェクト名編集</h3>
        <input 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          placeholder="プロジェクトタイトル" 
          style={{ width: '100%', marginBottom: BUTTON_GAP }} 
        />
        <button onClick={handleSave} style={{ marginRight: BUTTON_GAP }}>保存</button>
        <button onClick={onClose}>キャンセル</button>
      </div>
    </div>
  );
};