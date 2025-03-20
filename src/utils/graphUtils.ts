import { Node, Edge, MarkerType } from 'reactflow';interface TaskNodeData {
  label: string;
  completed: boolean;
}type TaskNode = Node<TaskNodeData>;export const detectAllCycles = (arrows: Edge[]): Set<string> => {
  const graph: { [key: string]: string[] } = {};
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycleArrows = new Set<string>();  arrows.forEach((arrow) => {
    if (!graph[arrow.source]) graph[arrow.source] = [];
    graph[arrow.source].push(arrow.target);
  });  const dfs = (taskId: string): void => {
    visited.add(taskId);
    recStack.add(taskId);
    const neighbors = graph[taskId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor);
      } else if (recStack.has(neighbor)) {
        const arrowId = arrows.find((e) => e.source === taskId && e.target === neighbor)?.id;
        if (arrowId) cycleArrows.add(arrowId);
      }
    }
    recStack.delete(taskId);
  };  Object.keys(graph).forEach((taskId) => {
    if (!visited.has(taskId)) dfs(taskId);
  });  return cycleArrows;
};export const areAllParentsCompleted = (taskId: string, tasks: TaskNode[], arrows: Edge[]): boolean => {
  const parentArrows = arrows.filter((arrow) => arrow.target === taskId);
  return parentArrows.length === 0 || parentArrows.every((arrow) => tasks.find((n) => n.id === arrow.source)?.data.completed);
};export const hasIncompleteParent = (taskId: string, tasks: TaskNode[], arrows: Edge[]): boolean => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task?.data.completed) return false;
  return arrows.filter((arrow) => arrow.target === taskId).some((arrow) => !tasks.find((n) => n.id === arrow.source)?.data.completed);
};export const updateStyles = (tasks: TaskNode[], arrows: Edge[], selectedTaskId?: string | null, selectedArrowId?: string | null): { tasks: TaskNode[]; arrows: Edge[] } => {
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

