import { parseProjectFile, PROJECT_FILE_VERSION, serializeProjectFile } from './projectData';

const validProject = {
  title: 'Example',
  tasks: [
    { id: '1', data: { label: 'Task', completed: false }, position: { x: 10, y: 20 } },
  ],
  arrows: [],
  taskIdCounter: 2,
};

describe('project file format', () => {
  it('round-trips the versioned format', () => {
    const serialized = serializeProjectFile(validProject);
    expect(parseProjectFile(JSON.parse(serialized))).toEqual(validProject);
    expect(JSON.parse(serialized).version).toBe(PROJECT_FILE_VERSION);
  });

  it('continues to accept the legacy unversioned format', () => {
    expect(parseProjectFile(validProject)).toEqual(validProject);
  });

  it('rejects edges that reference missing tasks', () => {
    expect(() => parseProjectFile({
      ...validProject,
      arrows: [{ id: 'bad', source: '1', target: 'missing' }],
    })).toThrow('存在しないタスク');
  });

  it('rejects malformed tasks', () => {
    expect(() => parseProjectFile({ ...validProject, tasks: [{ id: '1' }] }))
      .toThrow('タスクデータ');
  });
});
