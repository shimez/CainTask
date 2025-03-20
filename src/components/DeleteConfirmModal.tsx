import React from 'react';
import { Project } from '../App';

/** モーダルのz-index値。背景より前面に表示するための基準値 */
const MODAL_Z_INDEX = 300;
/** 表示するタスクの最大数。一覧が見づらくならないように制限 */
const MAX_DISPLAY_TASKS = 10;
/** モーダルの幅（ピクセル）。コンテンツが収まる適切なサイズ */
const MODAL_WIDTH = 400;
/** ボタンの間隔（ピクセル）。レイアウト調整用 */
const BUTTON_GAP = 10;

interface DeleteConfirmModalProps {
  project: Project;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * プロジェクト削除確認用のモーダル。
 * プロジェクトの詳細を表示し、削除の確認を求める。
 */
export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ project, onConfirm, onCancel }) => {
  const incompleteTasks = project.tasks.filter((task) => !task.data.completed);
  const completedTasks = project.tasks.filter((task) => task.data.completed);
  const displayedTasks = [
    ...incompleteTasks.slice(0, MAX_DISPLAY_TASKS),
    ...completedTasks.slice(0, MAX_DISPLAY_TASKS - incompleteTasks.length),
  ];
  const remainingTasks = project.tasks.length - displayedTasks.length;

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
        <h3>プロジェクト削除確認</h3>
        <p>以下のプロジェクトを削除しますか？</p>
        <p><strong>タイトル:</strong> {project.title}</p>
        <p><strong>タスク数:</strong> {project.tasks.length}</p>
        <p><strong>エッジ数:</strong> {project.arrows.length}</p>
        <p><strong>タスク一覧（一部）:</strong></p>
        <ul style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: BUTTON_GAP }}>
          {displayedTasks.map((task) => (
            <li key={task.id}>{task.data.label} ({task.data.completed ? '完了' : '未完了'})</li>
          ))}
          {remainingTasks > 0 && <li>…他 {remainingTasks} 件</li>}
        </ul>
        <button 
          onClick={onConfirm} 
          style={{ padding: '5px 10px', background: 'red', color: 'white', border: 'none', borderRadius: 3, marginRight: BUTTON_GAP }}
        >
          削除
        </button>
        <button onClick={onCancel} style={{ padding: '5px 10px' }}>
          キャンセル
        </button>
      </div>
    </div>
  );
};