import { describe, it, expect } from 'vitest';
import { getRecipe, RECIPES } from '@/app/runtime/recipes';

describe('Recipes', () => {
  const expectedRecipes = ['apply_to_job', 'check_resume', 'prepare_interview', 'full_optimization'];

  it('all expected recipes exist', () => {
    for (const id of expectedRecipes) {
      expect(RECIPES[id]).toBeDefined();
    }
  });

  it('getRecipe returns the correct recipe', () => {
    const recipe = getRecipe('apply_to_job');
    expect(recipe.id).toBe('apply_to_job');
    expect(recipe.totalBudget).toBe(40_000);
    expect(recipe.nodes.length).toBeGreaterThan(5);
  });

  it('getRecipe throws for an unknown id', () => {
    expect(() => getRecipe('nonexistent')).toThrow(/Unknown recipe/);
  });

  it('every recipe node references a valid step id', () => {
    // The step ids in recipes should match what the registry defines.
    const validIds = new Set([
      'readResume', 'extractKeywords', 'researchCompany', 'tailor',
      'parseNormalize', 'metricsContext', 'baselineScore', 'reScore',
      'sanitize', 'assemble',
    ]);
    for (const recipe of Object.values(RECIPES)) {
      for (const node of recipe.nodes) {
        expect(validIds.has(node.stepId)).toBe(true);
      }
    }
  });

  it('every recipe has a positive totalBudget', () => {
    for (const recipe of Object.values(RECIPES)) {
      expect(recipe.totalBudget).toBeGreaterThan(0);
    }
  });

  it('apply_to_job nodes include the full pipeline', () => {
    const recipe = getRecipe('apply_to_job');
    const ids = recipe.nodes.map((n) => n.stepId);
    expect(ids).toContain('readResume');
    expect(ids).toContain('tailor');
    expect(ids).toContain('assemble');
  });
});