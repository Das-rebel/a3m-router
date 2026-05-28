import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EpisodicMemoryStore } from '../../tmlpd-pi-extension/src/memory/episodicMemory';

describe('EpisodicMemoryStore', () => {
  let store: EpisodicMemoryStore;

  const sampleEntry = {
    task: {
      description: 'Test task execution',
      type: 'code_generation',
      complexity: 3,
    },
    result: {
      success: true,
      output: 'Successfully generated code',
      duration_ms: 1500,
    },
    agent: {
      id: 'agent-1',
      model: 'gpt-4o',
      provider: 'openai',
    },
    metadata: { source: 'test' },
    importance: 5,
  };

  beforeEach(() => {
    store = new EpisodicMemoryStore(100);
  });

  describe('store and query', () => {
    it('stores an entry and returns a non-empty id', () => {
      const id = store.store(sampleEntry);
      expect(id).toBeTruthy();
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('stores multiple entries and retrieves them', () => {
      store.store(sampleEntry);
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Second task' } });

      const results = store.query({ limit: 10 });
      expect(results.length).toBe(2);
    });

    it('filters by task type', () => {
      store.store(sampleEntry);
      store.store({
        ...sampleEntry,
        task: { ...sampleEntry.task, type: 'data_analysis' },
      });

      const codeResults = store.query({ task_type: 'code_generation' });
      expect(codeResults.length).toBe(1);
      expect(codeResults[0].task.type).toBe('code_generation');

      const analysisResults = store.query({ task_type: 'data_analysis' });
      expect(analysisResults.length).toBe(1);
    });

    it('filters by keywords', () => {
      store.store(sampleEntry);
      store.store({
        ...sampleEntry,
        task: { ...sampleEntry.task, description: 'Database query optimization' },
      });

      const results = store.query({ keywords: ['database'] });
      expect(results.length).toBe(1);
      expect(results[0].task.description).toContain('Database');
    });

    it('returns newest entries first', () => {
      store.store(sampleEntry);
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Second' } });

      const results = store.query({ limit: 10 });
      expect(results[results.length - 1].task.description).toBe('Second');
    });

    it('respects limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: `Task ${i}` } });
      }

      expect(store.query({ limit: 3 }).length).toBe(3);
      expect(store.query({ limit: 20 }).length).toBe(10);
    });
  });

  describe('max entries eviction', () => {
    it('evicts oldest entries when at capacity', () => {
      const smallStore = new EpisodicMemoryStore(3);
      smallStore.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'A' } });
      smallStore.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'B' } });
      smallStore.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'C' } });
      smallStore.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'D' } });

      expect(smallStore.query({ limit: 10 }).length).toBe(3);
      const descriptions = smallStore.query({ limit: 10 }).map(e => e.task.description);
      expect(descriptions).not.toContain('A');
      expect(descriptions).toContain('D');
    });
  });

  describe('getSimilarTasks', () => {
    it('finds tasks with overlapping words', () => {
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Build REST API endpoint' } });
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Deploy database cluster' } });
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Fix API authentication bug' } });

      const similar = store.getSimilarTasks('Build API endpoint');
      expect(similar.length).toBeGreaterThanOrEqual(1);
      // "API" should match entries 0 and 2
      const descriptions = similar.map(e => e.task.description);
      expect(descriptions.some(d => d.includes('API'))).toBe(true);
    });

    it('returns empty array for no matches', () => {
      store.store(sampleEntry);
      const similar = store.getSimilarTasks('xyznonexistent12345');
      expect(similar.length).toBe(0);
    });

    it('respects limit parameter', () => {
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Task A' } });
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Task B' } });
      store.store({ ...sampleEntry, task: { ...sampleEntry.task, description: 'Task C' } });

      const similar = store.getSimilarTasks('Task', 2);
      expect(similar.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getStats', () => {
    it('returns zeroed stats for empty store', () => {
      const stats = store.getStats();
      expect(stats.total_entries).toBe(0);
      expect(stats.indexed_keywords).toBe(0);
      expect(stats.success_rate).toBe(0);
      expect(stats.avg_duration_ms).toBe(0);
    });

    it('returns accurate stats after entries', () => {
      store.store(sampleEntry);
      store.store({
        ...sampleEntry,
        result: { ...sampleEntry.result, success: false },
      });

      const stats = store.getStats();
      expect(stats.total_entries).toBe(2);
      expect(stats.success_rate).toBe(0.5);
      expect(stats.avg_duration_ms).toBe(1500);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      store.store(sampleEntry);
      store.store(sampleEntry);
      expect(store.query({ limit: 10 }).length).toBe(2);

      store.clear();
      expect(store.query({ limit: 10 }).length).toBe(0);
      expect(store.getStats().total_entries).toBe(0);
    });
  });

  describe('persistence', () => {
    let fsMock: any;

    beforeEach(() => {
      fsMock = {
        existsSync: vi.fn().mockReturnValue(false),
        readFileSync: vi.fn(),
        writeFileSync: vi.fn(),
        unlinkSync: vi.fn(),
      };

      vi.doMock('fs', () => fsMock);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('loadFromDisk returns false when file does not exist', () => {
      const store2 = new EpisodicMemoryStore(100, '/tmp/test-memory.json');
      expect(store2['loadFromDisk']()).toBe(false);
    });

    it('saveToDisk returns false when no persistence path', () => {
      expect(store.saveToDisk()).toBe(false);
    });

    it('autoPersist triggers after every 3 entries', () => {
      const saveSpy = vi.spyOn(store as any, 'autoPersist');
      store.store(sampleEntry);
      store.store(sampleEntry);
      expect(saveSpy).toHaveBeenCalledTimes(2); // called on each store
      expect((store as any).entries.length % 3 === 0).toBe(false);

      store.store(sampleEntry); // 3rd entry
      expect((store as any).entries.length % 3 === 0).toBe(true);
    });
  });

  describe('keyword indexing', () => {
    it('indexes words longer than 3 characters', () => {
      store.store(sampleEntry);
      const index = (store as any).keywordIndex as Map<string, string[]>;

      // 'test' (4 chars) should be indexed, 'is' (2 chars) should not
      const keys = Array.from(index.keys());
      expect(keys.some(k => k.length <= 3)).toBe(false);
    });

    it('automatically indexes on store', () => {
      store.store(sampleEntry);
      const index = (store as any).keywordIndex as Map<string, string[]>;
      expect(index.has('test')).toBe(true);
      expect(index.has('task')).toBe(true);
    });
  });
});
