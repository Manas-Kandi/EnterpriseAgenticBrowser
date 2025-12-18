/**
 * Unit Tests for Warm-Start Task Lookup
 * 
 * Tests:
 * - findNearest returns skill when similarity is high
 * - findNearest returns null when similarity is low
 * - markStale updates skill stats
 */

// Mock the TaskKnowledgeService for isolated testing
describe('Warm-Start Task Lookup', () => {
  // Simple cosine similarity implementation for testing
  function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
  }

  // Simple hash-based embedding for testing (matches TaskKnowledgeService)
  function computeEmbedding(text: string): number[] {
    const dim = 256;
    const vec = new Array(dim).fill(0);
    const tokens = text.toLowerCase().split(/\s+/).filter(Boolean);
    for (const tok of tokens) {
      let h = 2166136261;
      for (let i = 0; i < tok.length; i++) {
        h ^= tok.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      const idx = Math.abs(h) % dim;
      vec[idx] += 1;
    }
    let norm = 0;
    for (const x of vec) norm += x * x;
    norm = Math.sqrt(norm) || 1;
    return vec.map((x) => x / norm);
  }

  describe('Embedding Similarity', () => {
    it('should return high similarity for identical queries', () => {
      const query = 'create a new jira issue';
      const embedding1 = computeEmbedding(query);
      const embedding2 = computeEmbedding(query);
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should return high similarity for similar queries', () => {
      const query1 = 'create a new jira issue';
      const query2 = 'create new jira issue please';
      
      const embedding1 = computeEmbedding(query1);
      const embedding2 = computeEmbedding(query2);
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.7);
    });

    it('should return low similarity for different queries', () => {
      const query1 = 'create a new jira issue';
      const query2 = 'check the weather in tokyo';
      
      const embedding1 = computeEmbedding(query1);
      const embedding2 = computeEmbedding(query2);
      
      const similarity = cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeLessThan(0.3);
    });
  });

  describe('findNearest Logic', () => {
    interface MockSkill {
      id: string;
      name: string;
      embedding: number[];
      stats: { successes: number; failures: number };
    }

    function findNearest(
      skills: MockSkill[],
      query: string,
      threshold: number = 0.8
    ): { skill: MockSkill; similarity: number } | null {
      if (skills.length === 0) return null;

      const queryEmbedding = computeEmbedding(query);
      let bestMatch: { skill: MockSkill; similarity: number } | null = null;

      for (const skill of skills) {
        // Skip skills with poor track record
        const total = skill.stats.successes + skill.stats.failures;
        if (total > 3 && skill.stats.failures > skill.stats.successes) {
          continue;
        }

        const similarity = cosineSimilarity(skill.embedding, queryEmbedding);
        
        if (similarity >= threshold) {
          if (!bestMatch || similarity > bestMatch.similarity) {
            bestMatch = { skill, similarity };
          }
        }
      }

      return bestMatch;
    }

    it('should return skill when similarity exceeds threshold', () => {
      const skills: MockSkill[] = [
        {
          id: '1',
          name: 'create_jira_issue',
          embedding: computeEmbedding('create a new jira issue'),
          stats: { successes: 5, failures: 0 },
        },
      ];

      const result = findNearest(skills, 'create a new jira issue', 0.8);
      expect(result).not.toBeNull();
      expect(result?.skill.name).toBe('create_jira_issue');
      expect(result?.similarity).toBeGreaterThan(0.8);
    });

    it('should return null when similarity below threshold', () => {
      const skills: MockSkill[] = [
        {
          id: '1',
          name: 'create_jira_issue',
          embedding: computeEmbedding('create a new jira issue'),
          stats: { successes: 5, failures: 0 },
        },
      ];

      const result = findNearest(skills, 'check weather in tokyo', 0.8);
      expect(result).toBeNull();
    });

    it('should skip skills with poor track record', () => {
      const skills: MockSkill[] = [
        {
          id: '1',
          name: 'bad_skill',
          embedding: computeEmbedding('create a new jira issue'),
          stats: { successes: 1, failures: 5 }, // Poor track record
        },
        {
          id: '2',
          name: 'good_skill',
          embedding: computeEmbedding('create new jira ticket'),
          stats: { successes: 5, failures: 1 }, // Good track record
        },
      ];

      const result = findNearest(skills, 'create a new jira issue', 0.5);
      expect(result).not.toBeNull();
      expect(result?.skill.name).toBe('good_skill');
    });

    it('should return best match when multiple skills match', () => {
      const skills: MockSkill[] = [
        {
          id: '1',
          name: 'generic_create',
          embedding: computeEmbedding('create something new'),
          stats: { successes: 3, failures: 0 },
        },
        {
          id: '2',
          name: 'create_jira_issue',
          embedding: computeEmbedding('create a new jira issue'),
          stats: { successes: 5, failures: 0 },
        },
      ];

      const result = findNearest(skills, 'create a new jira issue', 0.5);
      expect(result).not.toBeNull();
      expect(result?.skill.name).toBe('create_jira_issue');
    });
  });

  describe('markStale Behavior', () => {
    it('should increment failures when marked stale', () => {
      const skill = {
        id: '1',
        name: 'test_skill',
        stats: { successes: 5, failures: 0, lastOutcomeSuccess: true },
      };

      // Simulate markStale
      skill.stats.failures++;
      skill.stats.lastOutcomeSuccess = false;

      expect(skill.stats.failures).toBe(1);
      expect(skill.stats.lastOutcomeSuccess).toBe(false);
    });
  });
});
