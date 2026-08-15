import { useCallback, useState } from 'react';
import { Edge } from 'reactflow';
import { TaskNode } from '../types';

interface GraphSnapshot {
  tasks: TaskNode[];
  arrows: Edge[];
}

export const useGraphHistory = (
  setTasks: (tasks: TaskNode[]) => void,
  setArrows: (arrows: Edge[]) => void
) => {
  const [history, setHistory] = useState<GraphSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const record = useCallback((snapshot: GraphSnapshot) => {
    setHistory((current) => {
      const next = [...current.slice(0, historyIndex + 1), {
        tasks: snapshot.tasks.map((task) => ({ ...task, data: { ...task.data }, position: { ...task.position } })),
        arrows: snapshot.arrows.map((arrow) => ({ ...arrow })),
      }];
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const previous = history[historyIndex - 1];
    setHistoryIndex(historyIndex - 1);
    setTasks(previous.tasks);
    setArrows(previous.arrows);
  }, [history, historyIndex, setArrows, setTasks]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const next = history[historyIndex + 1];
    setHistoryIndex(historyIndex + 1);
    setTasks(next.tasks);
    setArrows(next.arrows);
  }, [history, historyIndex, setArrows, setTasks]);

  const reset = useCallback(() => {
    setHistory([]);
    setHistoryIndex(-1);
  }, []);

  return {
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    record,
    reset,
    undo,
    redo,
  };
};
