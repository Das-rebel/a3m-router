/**
 * Tests for SkillManager and TMLEnhancedAgent
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { SkillManager, Skill } from '../skill_manager';
import { TMLEnhancedAgent } from '../../agents/skill_enhanced_agent';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs operations
jest.mock('fs');

describe('SkillManager', () => {
  let skillManager: SkillManager;
  const mockSkillsDir = '/mock/skills';

  beforeEach(() => {
    jest.clearAllMocks();
    skillManager = new SkillManager(mockSkillsDir);
  });

  describe('initialization', () => {
    it('should create skill manager instance', () => {
      expect(skillManager).toBeInstanceOf(SkillManager);
      expect(skillManager.skills_dir).toBeDefined();
    });

    it('should have empty skills initially if directory does not exist', () => {
      expect(skillManager.list_skills()).toEqual([]);
    });
  });

  describe('load_skills_metadata', () => {
    it('should load skill metadata from SKILL.md files', () => {
      // Mock directory listing and file reading
      const mockSkillMD = `---
name: "Test Skill"
description: "A test skill for testing"
---
# Test Skill Content`;

      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(Path.prototype, 'isDirectory').mockReturnValue(true);
      jest.spyOn(Path.prototype, 'iterdir').mockReturnValue([
        { name: 'SKILL.md', isFile: () => true }
      ] as any);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockSkillMD);

      skillManager.reload_skills();

      expect(skillManager.list_skills()).toContain('Test Skill');
    });

    it('should skip directories without SKILL.md', () => {
      jest.spyOn(Path.prototype, 'existsSync').mockReturnValue(false);

      skillManager.reload_skills();

      expect(skillManager.list_skills()).toEqual([]);
    });
  });

  describe('get_relevant_skills', () => {
    beforeEach(() => {
      // Add mock skills
      skillManager.skills['React Development'] = new Skill(
        'React Development',
        'Best practices for React components',
        Path('/mock/react'),
        {}
      );

      skillManager.skills['Node.js API'] = new Skill(
        'Node.js API',
        'Building backend APIs with Node.js and Express',
        Path('/mock/nodejs'),
        {}
      );

      skillManager.skills['Python Django'] = new Skill(
        'Python Django',
        'Django web framework for Python',
        Path('/mock/python'),
        {}
      );
    });

    it('should find skills with keyword matching', () => {
      const relevant = skillManager.get_relevant_skills(
        'Build a React component for user login',
        2
      );

      expect(relevant).toContain('React Development');
    });

    it('should return skills ordered by relevance', () => {
      const relevant = skillManager.get_relevant_skills(
        'Create a React component with Node.js backend',
        3
      );

      // React should come first (exact match)
      expect(relevant[0]).toBe('React Development');
      expect(relevant).toContain('Node.js API');
    });

    it('should respect threshold parameter', () => {
      const relevant = skillManager.get_relevant_skills(
        'Build a Go microservice',
        2,
        0.5  // Higher threshold
      );

      // Should return fewer or no skills due to high threshold
      expect(relevant.length).toBeLessThanOrEqual(2);
    });
  });

  describe('load_skill', () => {
    it('should load full skill content on first call', () => {
      const mockSkill = skillManager.skills['React Development'];
      mockSkill.content = null;

      const mockContent = '# React Development\n\nBest practices...';

      jest.spyOn(fs, 'readFileSync').mockReturnValue(
        `---\nname: "React Development"\ndescription: "Best practices"\n---\n${mockContent}`
      );

      const loaded = skillManager.load_skill('React Development');

      expect(loaded.content).toBe(mockContent);
      expect(loaded.loaded_at).toBeDefined();
    });

    it('should return cached content on subsequent calls', () => {
      const mockSkill = skillManager.skills['React Development'];
      mockSkill.content = 'Cached content';

      const loaded1 = skillManager.load_skill('React Development');
      const loaded2 = skillManager.load_skill('React Development');

      expect(loaded1).toBe(loaded2);
      expect(loaded1.content).toBe('Cached content');
    });

    it('should throw error for non-existent skill', () => {
      expect(() => {
        skillManager.load_skill('Non-existent Skill');
      }).toThrow("Skill 'Non-existent Skill' not found");
    });
  });

  describe('validate_skill', () => {
    it('should return validation results for existing skill', () => {
      const mockSkill = skillManager.skills['React Development'];

      jest.spyOn(skillManager, 'list_additional_files').mockReturnValue([]);

      const validation = skillManager.validate_skill('React Development');

      expect(validation).toHaveProperty('exists', true);
      expect(validation).toHaveProperty('has_name', true);
      expect(validation).toHaveProperty('has_description', true);
    });

    it('should return all false for non-existent skill', () => {
      const validation = skillManager.validate_skill('Non-existent');

      expect(validation.exists).toBe(false);
      expect(validation.has_skill_md).toBe(false);
    });
  });
});

describe('TMLEnhancedAgent', () => {
  let agent: TMLEnhancedAgent;

  beforeEach(() => {
    agent = new TMLEnhancedAgent(
      'frontend-agent',
      'anthropic',
      'claude-sonnet-4',
      'mock-skills',
      ['React Frontend Development', 'TypeScript Best Practices']
    );
  });

  describe('initialization', () => {
    it('should create agent with configuration', () => {
      expect(agent.agent_id).toBe('frontend-agent');
      expect(agent.provider).toBe('anthropic');
      expect(agent.model).toBe('claude-sonnet-4');
    });

    it('should initialize with assigned skills', () => {
      expect(agent.assigned_skills).toContain('React Frontend Development');
      expect(agent.assigned_skills).toContain('TypeScript Best Practices');
    });
  });

  describe('execute_task', () => {
    it('should execute task with relevant skills', async () => {
      const task = {
        description: 'Build a React login form component',
        context: 'Must include email and password fields',
        requirements: 'Use TypeScript and Material-UI'
      };

      // Mock skill loading
      jest.spyOn(agent, '_get_relevant_skills').mockReturnValue([]);

      // Mock LLM call
      jest.spyOn(agent, '_execute_llm_call').mockReturnValue({
        success: true,
        output: 'React component code...',
        tokens_used: 150,
        cost: 0.015,
        execution_time: 3.2
      });

      const result = agent.execute_task(task);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
    });

    it('should remember successful patterns', () => {
      const task = { description: 'Test task' };

      jest.spyOn(agent, '_get_relevant_skills').mockReturnValue([]);
      jest.spyOn(agent, '_execute_llm_call').mockReturnValue({
        success: true,
        output: 'Success'
      });

      jest.spyOn(agent, '_remember_success_pattern').mockImplementation(() => {});

      agent.execute_task(task);

      expect(agent._remember_success_pattern).toHaveBeenCalled();
    });
  });

  describe('skill management', () => {
    it('should add skill to agent', () => {
      agent.add_skill('Jest Testing');

      expect(agent.assigned_skills).toContain('Jest Testing');
    });

    it('should remove skill from agent', () => {
      agent.remove_skill('TypeScript Best Practices');

      expect(agent.assigned_skills).not.toContain('TypeScript Best Practices');
    });

    it('should list all available skills', () => {
      jest.spyOn(agent.skill_manager, 'list_skills').mockReturnValue([
        'Skill 1',
        'Skill 2',
        'Skill 3'
      ]);

      const skills = agent.list_available_skills();

      expect(skills).toHaveLength(3);
    });
  });

  describe('serialization', () => {
    it('should convert to dictionary', () => {
      const dict = agent.to_dict();

      expect(dict).toHaveProperty('agent_id', 'frontend-agent');
      expect(dict).toHaveProperty('provider', 'anthropic');
      expect(dict).toHaveProperty('model', 'claude-sonnet-4');
      expect(dict).toHaveProperty('assigned_skills');
      expect(dict).toHaveProperty('available_skills');
    });
  });
});

describe('TMLEnhancedAgentFactory', () => {
  describe('create_from_config', () => {
    it('should create agent from config', () => {
      const config = {
        id: 'test-agent',
        provider: 'openai',
        model: 'gpt-4-turbo',
        skills_dir: 'test-skills',
        skills: ['Test Skill']
      };

      const agent = TMLEnhancedAgentFactory.create_from_config(config);

      expect(agent).toBeInstanceOf(TMLEnhancedAgent);
      expect(agent.agent_id).toBe('test-agent');
    });
  });

  describe('create_multiple_from_config', () => {
    it('should create multiple agents from config list', () => {
      const configs = [
        {
          id: 'agent-1',
          provider: 'anthropic',
          model: 'claude-sonnet-4',
          skills: ['Skill A']
        },
        {
          id: 'agent-2',
          provider: 'openai',
          model: 'gpt-4-turbo',
          skills: ['Skill B']
        }
      ];

      const agents = TMLEnhancedAgentFactory.create_multiple_from_config(configs);

      expect(agents).toHaveLength(2);
      expect(agents[0].agent_id).toBe('agent-1');
      expect(agents[1].agent_id).toBe('agent-2');
    });
  });
});
