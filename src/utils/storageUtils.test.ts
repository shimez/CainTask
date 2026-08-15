import { loadProjects } from './storageUtils';
import type { Project } from '../App';

const fallback: Project[] = [
  {
    localId: 'fallback',
    title: 'Fallback',
    tasks: [],
    arrows: [],
    taskIdCounter: 0,
  },
];

describe('loadProjects', () => {
  it('loads valid persisted projects', () => {
    const saved: Project[] = [
      {
        localId: 'saved',
        title: 'Saved',
        tasks: [],
        arrows: [],
        taskIdCounter: 1,
      },
    ];

    expect(loadProjects(JSON.stringify(saved), fallback)).toEqual(saved);
  });

  it.each([null, '', '{broken', 'null', '[]', '[{"title":"missing fields"}]'])(
    'uses the fallback for invalid persisted data: %p',
    (raw) => {
      expect(loadProjects(raw, fallback)).toBe(fallback);
    }
  );
});
