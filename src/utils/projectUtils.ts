import { v4 as uuidv4 } from 'uuid';
import { Project, TaskNode } from '../App';
import { Edge } from 'reactflow';

// 新規プロジェクト作成（テンプレートベース）
export const createNewLocalProject = (
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  setCurrentProjectIndex: React.Dispatch<React.SetStateAction<number>>,
  setTasks: any,
  setArrows: any,
  setTaskIdCounter: React.Dispatch<React.SetStateAction<number>>
) => {
  const newProject: Project = {
    localId: uuidv4(),
    title: '新しいプロジェクト',
    tasks: [{ id: '0', data: { label: '初期タスク', completed: false }, position: { x: 100, y: 100 } }],
    arrows: [],
    taskIdCounter: 1,
    lastSavedAt: new Date().toISOString(),
  };
  setProjects((prevProjects) => {
    const updatedProjects = [...prevProjects, newProject];
    setCurrentProjectIndex(updatedProjects.length - 1);
    setTasks(newProject.tasks);
    setArrows(newProject.arrows);
    setTaskIdCounter(newProject.taskIdCounter);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    localStorage.setItem('lastProjectId', newProject.localId);
    return updatedProjects;
  });
};

// 既存のプロジェクトを別名保存（変更なし）
export const saveCurrentProjectAsNew = (
  projects: Project[],
  currentProjectIndex: number,
  tasks: TaskNode[],
  arrows: Edge[],
  taskIdCounter: number,
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  setCurrentProjectIndex: React.Dispatch<React.SetStateAction<number>>,
  saveToLocalStorage: () => void
) => {
  const currentProject = projects[currentProjectIndex];
  const newProject: Project = {
    ...currentProject,
    localId: uuidv4(),
    title: `${currentProject.title} (コピー)`,
    tasks: [...tasks],
    arrows: [...arrows],
    taskIdCounter,
    lastSavedAt: new Date().toISOString(),
  };
  setProjects((prevProjects) => {
    const updatedProjects = [...prevProjects, newProject];
    setCurrentProjectIndex(updatedProjects.length - 1);
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    localStorage.setItem('lastProjectId', newProject.localId);
    return updatedProjects;
  });
  saveToLocalStorage();
};

// プロジェクト削除（変更なし）
export const handleDeleteProject = (
  localId: string,
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>,
  setCurrentProjectIndex: React.Dispatch<React.SetStateAction<number>>,
  setTasks: any,
  setArrows: any,
  setTaskIdCounter: React.Dispatch<React.SetStateAction<number>>,
  currentProjectIndex: number
) => {
  setProjects((prevProjects) => {
    const updatedProjects = prevProjects.filter((p) => p.localId !== localId);
    const newIndex = currentProjectIndex >= updatedProjects.length ? updatedProjects.length - 1 : currentProjectIndex;
    setCurrentProjectIndex(newIndex);
    if (updatedProjects.length > 0) {
      setTasks(updatedProjects[newIndex].tasks);
      setArrows(updatedProjects[newIndex].arrows);
      setTaskIdCounter(updatedProjects[newIndex].taskIdCounter);
      localStorage.setItem('lastProjectId', updatedProjects[newIndex].localId);
    } else {
      setTasks([]);
      setArrows([]);
      setTaskIdCounter(0);
      localStorage.removeItem('lastProjectId');
    }
    localStorage.setItem('projects', JSON.stringify(updatedProjects));
    return updatedProjects;
  });
};