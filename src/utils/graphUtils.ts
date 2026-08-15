import { Node, Edge, MarkerType } from 'reactflow';

interface TaskNodeData {
  label: string;
  completed: boolean;
}

type TaskNode = Node<TaskNodeData>;

const canReach = (start: string, goal: string, arrows: Edge[]): boolean => {
  const graph = new Map<string, string[]>();
  arrows.forEach(({ source, target }) => {
    graph.set(source, [...(graph.get(source) ?? []), target]);
  });

  const pending = [start];
  const visited = new Set<string>();

  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === goal) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(graph.get(current) ?? []));
  }

  return false;
};

/** Returns true when adding source -> target would make the graph cyclic. */
export const wouldCreateCycle = (source: string, target: string, arrows: Edge[]): boolean =>
  source === target || canReach(target, source, arrows);

export const detectAllCycles = (arrows: Edge[]): Set<string> => {
  const cycleArrows = new Set<string>();

  arrows.forEach((arrow) => {
    const remainingArrows = arrows.filter((candidate) => candidate.id !== arrow.id);
    if (canReach(arrow.target, arrow.source, remainingArrows)) {
      cycleArrows.add(arrow.id);
    }
  });

  return cycleArrows;
};

export const areAllParentsCompleted = (taskId: string, tasks: TaskNode[], arrows: Edge[]): boolean => {
  const parentArrows = arrows.filter((arrow) => arrow.target === taskId);
  return parentArrows.length === 0 || parentArrows.every((arrow) => tasks.find((n) => n.id === arrow.source)?.data.completed);
};

export const hasIncompleteParent = (taskId: string, tasks: TaskNode[], arrows: Edge[]): boolean => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.data.completed) return false;
  return arrows.filter((arrow) => arrow.target === taskId).some((arrow) => !tasks.find((n) => n.id === arrow.source)?.data.completed);
};

export const updateStyles = (tasks: TaskNode[], arrows: Edge[], selectedTaskId?: string | null, selectedArrowId?: string | null): { tasks: TaskNode[]; arrows: Edge[] } => {
  const cycleArrows = detectAllCycles(arrows);
  return {
    arrows: arrows.map((arrow) => {
      const isSelected = arrow.id === selectedArrowId;
      const isCycled = cycleArrows.has(arrow.id);
      const strokeColor = isCycled ? 'red' : '#000';
      return {
        ...arrow,
        style: {
          stroke: strokeColor,
          strokeWidth: isSelected ? 3 : 1,
        },
        markerEnd: {
          type: MarkerType.Arrow,
          color: strokeColor,
        },
      };
    }),
    tasks: tasks.map((task) => {
      const allParentsCompleted = areAllParentsCompleted(task.id, tasks, arrows);
      const hasIncomplete = hasIncompleteParent(task.id, tasks, arrows);
      const isSelected = task.id === selectedTaskId;
      return {
        ...task,
        style: {
          background: task.data.completed ? '#d4d4d4' : undefined,
          border: isSelected
            ? '2px solid blue'
            : hasIncomplete
            ? '2px solid red'
            : !task.data.completed && allParentsCompleted
            ? '2px solid green'
            : '1px solid black',
        },
      };
    }),
  };
};
