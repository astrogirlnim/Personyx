/**
 * Personas Hook
 * Phase 3.5.3 - Persona Manager Implementation
 *
 * Manages persona state and provides methods for persona operations including:
 * - Loading YAML configuration
 * - Saving updated personas
 * - Reloading personas from configuration
 * - Real-time updates via IPC events
 */

import { useState, useEffect, useCallback } from 'react';
import type { Persona } from '../../shared/types';

export interface PersonaValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  duplicateIds: string[];
  duplicateNames: string[];
}

export interface PersonaManagerResult {
  success: boolean;
  personas?: Persona[];
  error?: string;
  validationResult?: PersonaValidationResult;
}

export interface PersonasState {
  personas: Persona[];
  yamlContent: string;
  loading: boolean;
  saving: boolean;
  reloading: boolean;
  error: string | null;
  lastSaveResult: PersonaManagerResult | null;
  lastReloadResult: PersonaManagerResult | null;
}

export interface PersonasActions {
  loadYamlConfig: () => Promise<void>;
  saveYamlConfig: (yaml: string) => Promise<PersonaManagerResult>;
  reloadPersonas: () => Promise<PersonaManagerResult>;
  clearError: () => void;
  updateYamlContent: (yaml: string) => void;
}

export function usePersonas(): PersonasState & PersonasActions {
  const [state, setState] = useState<PersonasState>({
    personas: [],
    yamlContent: '',
    loading: false,
    saving: false,
    reloading: false,
    error: null,
    lastSaveResult: null,
    lastReloadResult: null,
  });

  /**
   * Load YAML configuration from main process
   */
  const loadYamlConfig = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      console.log('🎭 Loading personas YAML configuration...');
      const result = await window.electronAPI.getPersonasConfig();

      if (result && typeof result === 'object' && 'yaml' in result) {
        const yamlContent = (result as { yaml: string }).yaml;
        console.log(
          '✅ Personas YAML loaded successfully:',
          yamlContent.length,
          'characters'
        );
        setState(prev => ({
          ...prev,
          yamlContent,
          loading: false,
        }));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to load personas configuration';
      console.error('❌ Failed to load personas YAML:', err);
      setState(prev => ({
        ...prev,
        error: errorMessage,
        loading: false,
      }));
    }
  }, []);

  /**
   * Save YAML configuration to main process
   */
  const saveYamlConfig = useCallback(
    async (yaml: string): Promise<PersonaManagerResult> => {
      try {
        setState(prev => ({
          ...prev,
          saving: true,
          error: null,
          lastSaveResult: null,
        }));

        console.log('💾 Saving personas YAML configuration...');
        const result = await window.electronAPI.savePersonasConfig(yaml);

        const saveResult = result as PersonaManagerResult;

        if (saveResult.success) {
          console.log('✅ Personas YAML saved successfully');
          setState(prev => ({
            ...prev,
            yamlContent: yaml,
            personas: saveResult.personas || prev.personas,
            saving: false,
            lastSaveResult: saveResult,
          }));
        } else {
          console.warn('⚠️ Failed to save personas YAML:', saveResult.error);
          setState(prev => ({
            ...prev,
            error: saveResult.error || 'Failed to save configuration',
            saving: false,
            lastSaveResult: saveResult,
          }));
        }

        return saveResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to save personas configuration';
        console.error('❌ Failed to save personas YAML:', err);

        const saveResult: PersonaManagerResult = {
          success: false,
          error: errorMessage,
        };

        setState(prev => ({
          ...prev,
          error: errorMessage,
          saving: false,
          lastSaveResult: saveResult,
        }));

        return saveResult;
      }
    },
    []
  );

  /**
   * Reload personas from configuration
   */
  const reloadPersonas =
    useCallback(async (): Promise<PersonaManagerResult> => {
      try {
        setState(prev => ({
          ...prev,
          reloading: true,
          error: null,
          lastReloadResult: null,
        }));

        console.log('🔄 Reloading personas from configuration...');
        const result = await window.electronAPI.reloadPersonas();

        const reloadResult = result as PersonaManagerResult;

        if (reloadResult.success) {
          console.log('✅ Personas reloaded successfully');
          setState(prev => ({
            ...prev,
            personas: reloadResult.personas || prev.personas,
            reloading: false,
            lastReloadResult: reloadResult,
          }));
        } else {
          console.warn('⚠️ Failed to reload personas:', reloadResult.error);
          setState(prev => ({
            ...prev,
            error: reloadResult.error || 'Failed to reload personas',
            reloading: false,
            lastReloadResult: reloadResult,
          }));
        }

        return reloadResult;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to reload personas';
        console.error('❌ Failed to reload personas:', err);

        const reloadResult: PersonaManagerResult = {
          success: false,
          error: errorMessage,
        };

        setState(prev => ({
          ...prev,
          error: errorMessage,
          reloading: false,
          lastReloadResult: reloadResult,
        }));

        return reloadResult;
      }
    }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Update YAML content (for local editing)
   */
  const updateYamlContent = useCallback((yaml: string) => {
    setState(prev => ({ ...prev, yamlContent: yaml }));
  }, []);

  /**
   * Set up event listeners for real-time updates
   */
  useEffect(() => {
    console.log('🎭 Setting up personas event listeners...');

    // Listen for personas updates from main process
    const handlePersonasUpdated = (data: unknown) => {
      console.log('📢 Personas updated event received:', data);
      const updateData = data as {
        personas: Persona[];
        success: boolean;
        error?: string;
      };

      if (updateData?.success && updateData.personas) {
        setState(prevState => ({
          ...prevState,
          personas: updateData.personas,
        }));
      } else if (updateData?.error) {
        setState(prevState => ({
          ...prevState,
          error: updateData.error || 'Unknown error during personas update',
        }));
      }
    };

    // Register event listener
    window.electronAPI.onPersonasUpdated(handlePersonasUpdated);

    // Load initial configuration AND personas (not just YAML)
    console.log('🔄 Auto-loading personas on mount...');
    reloadPersonas();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up personas event listeners');
      window.electronAPI.removeAllListeners('personas-updated');
    };
  }, [reloadPersonas]);

  return {
    ...state,
    loadYamlConfig,
    saveYamlConfig,
    reloadPersonas,
    clearError,
    updateYamlContent,
  };
}

/**
 * Helper function to validate YAML format
 */
export function validateYamlFormat(yaml: string): PersonaValidationResult {
  const result: PersonaValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    duplicateIds: [],
    duplicateNames: [],
  };

  if (!yaml || yaml.trim() === '') {
    result.valid = false;
    result.errors.push('YAML content cannot be empty');
    return result;
  }

  // Basic YAML structure validation
  if (!yaml.includes('personas:')) {
    result.valid = false;
    result.errors.push('YAML must contain a "personas:" section');
  }

  // Check for required fields in personas
  const requiredFields = [
    'id:',
    'name:',
    'description:',
    'primaryGoal:',
    'mainPainPoint:',
    'keywords:',
  ];
  for (const field of requiredFields) {
    if (!yaml.includes(field)) {
      result.warnings.push(
        `Missing or uncommon field: ${field.replace(':', '')}`
      );
    }
  }

  // Simple duplicate ID check (basic regex)
  const idMatches = yaml.match(/id:\s*["']?([^"'\n]+)["']?/g);
  if (idMatches) {
    const ids = idMatches.map(match =>
      match.replace(/id:\s*["']?([^"'\n]+)["']?/, '$1').trim()
    );
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      result.valid = false;
      result.errors.push('Duplicate persona IDs detected');

      // Find duplicates
      const seenIds = new Set<string>();
      for (const id of ids) {
        if (seenIds.has(id)) {
          result.duplicateIds.push(id);
        } else {
          seenIds.add(id);
        }
      }
    }
  }

  return result;
}

/**
 * Helper function to format YAML with proper indentation
 */
export function formatYaml(yaml: string): string {
  // Basic YAML formatting - in a real implementation, you might use a YAML library
  return yaml
    .split('\n')
    .map(line => line.trimEnd()) // Remove trailing whitespace
    .join('\n')
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines
}
