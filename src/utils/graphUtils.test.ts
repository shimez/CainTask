import { Edge } from 'reactflow';
import { detectAllCycles, wouldCreateCycle } from './graphUtils';

const edge = (id: string, source: string, target: string): Edge => ({
  id,
  source,
  target,
});

describe('graph cycle validation', () => {
  const arrows = [edge('a-b', 'a', 'b'), edge('b-c', 'b', 'c')];

  it('rejects self references and edges that close a cycle', () => {
    expect(wouldCreateCycle('a', 'a', arrows)).toBe(true);
    expect(wouldCreateCycle('c', 'a', arrows)).toBe(true);
  });

  it('allows dependencies that keep the graph acyclic', () => {
    expect(wouldCreateCycle('a', 'c', arrows)).toBe(false);
    expect(wouldCreateCycle('c', 'd', arrows)).toBe(false);
  });

  it('marks every edge that belongs to a cycle', () => {
    const cyclic = [...arrows, edge('c-a', 'c', 'a')];
    expect(detectAllCycles(cyclic)).toEqual(new Set(['a-b', 'b-c', 'c-a']));
  });
});
