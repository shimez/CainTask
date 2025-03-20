import React, { useState, useEffect } from 'react';
import { TaskNode } from '../App';
import { Edge } from 'reactflow';

/** モーダルのz-index値。背景より前面に表示するための基準値 */
const MODAL_Z_INDEX = 200;
/** モーダルの幅（ピクセル）。入力欄が収まる適切なサイズ */
const MODAL_WIDTH = 300;
/** ボタンの間隔（ピクセル）。レイアウト調整用 */
const BUTTON_GAP = 10;

interface EditModalProps {
  task: TaskNode | null;
  tasks: TaskNode[];
  arrows: Edge[];
  onSave: (id: string, label: string, completed: boolean) => void;
  onClose: () => void;
}

/**
 * 指定されたタスクのすべての親タスクが完了しているかを判定する。
 * 依存関係（矢印）をもとに、親タスクの完了状態を確認する。
 * @param taskId 判定対象のタスクID
 * @param tasks タスクリスト
 * @param arrows 矢印（依存関係）リスト
 * @returns 親タスクがすべて完了している場合true、未完了が1つでもあればfalse、親がない場合はtrue
 */
const areAllParentsCompleted = (taskId: string, tasks: TaskNode[], arrows: Edge[]): boolean => {
  const parentArrows = arrows.filter((arrow) => arrow.target === taskId);
  return parentArrows.length === 0 || parentArrows.every((arrow) => tasks.find((n) => n.id === arrow.source)?.data.completed);
};

/**
 * タスク編集用のモーダル。
 * タスクのラベルと完了状態を編集し、保存する。
 */
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
    onSave(task.id, label, newCompleted);
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
        <h3>タスク編集</h3>
        <input 
          value={label} 
          onChange={(e) => setLabel(e.target.value)} 
          style={{ width: '100%', marginBottom: BUTTON_GAP }} 
        />
        <label>
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            disabled={!canComplete && !task.data.completed}
          />
          完了
        </label>
        {!canComplete && !task.data.completed && <p style={{ color: 'red', fontSize: 12 }}>親タスクが未完了</p>}
        <div style={{ marginTop: BUTTON_GAP }}>
          <button onClick={handleSave} style={{ marginRight: BUTTON_GAP }}>保存</button>
          <button onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  );
};