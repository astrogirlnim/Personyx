/**
 * Persona Manager Modal Component
 * Phase 3.5.3 - Persona Manager Implementation
 *
 * Provides UI for managing persona configurations including:
 * - Viewing current personas
 * - Editing YAML configuration
 * - Adding/removing personas
 * - Validation and error handling
 * - Hot-reloading persona data
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePersonas, validateYamlFormat } from '../hooks/usePersonas';
import * as yaml from 'js-yaml';

interface PersonaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonaManagerModal({
  isOpen,
  onClose,
}: PersonaManagerModalProps): JSX.Element | null {
  const {
    yamlContent,
    loading,
    saving,
    reloading,
    error,
    lastSaveResult,
    saveYamlConfig,
    reloadPersonas,
    clearError,
  } = usePersonas();

  const [activeTab, setActiveTab] = useState<'visual' | 'yaml'>('visual');
  const [editedYaml, setEditedYaml] = useState('');
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof validateYamlFormat
  > | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [editedPersonas, setEditedPersonas] = useState<PersonaEditorProps[]>(
    []
  );

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setEditedYaml('');
      setHasUnsavedChanges(false);
      setValidationResult(null);
      clearError();
    } else if (yamlContent) {
      setEditedYaml(yamlContent);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, yamlContent, clearError]);

  // Track changes for unsaved state
  useEffect(() => {
    const hasChanges = editedYaml !== yamlContent;
    setHasUnsavedChanges(hasChanges);

    // Validate YAML in real-time when editing
    if (hasChanges && editedYaml) {
      const validation = validateYamlFormat(editedYaml);
      setValidationResult(validation);
    } else {
      setValidationResult(null);
    }
  }, [editedYaml, yamlContent]);

  // Load YAML content when modal opens or content changes
  useEffect(() => {
    if (isOpen && yamlContent) {
      setEditedYaml(yamlContent);

      // Parse YAML to populate visual editor
      try {
        const parsed = yaml.load(yamlContent) as {
          personas: PersonaEditorProps[];
        };
        if (parsed?.personas && Array.isArray(parsed.personas)) {
          setEditedPersonas(parsed.personas);
        }
      } catch (error) {
        console.warn('Failed to parse YAML for visual editor:', error);
        setEditedPersonas([]);
      }
    }
  }, [isOpen, yamlContent]);

  // Validate YAML when it changes
  useEffect(() => {
    if (editedYaml.trim()) {
      const result = validateYamlFormat(editedYaml);
      setValidationResult(result);
    } else {
      setValidationResult(null);
    }
  }, [editedYaml]);

  const handleYamlChange = useCallback((value: string) => {
    setEditedYaml(value);
    // Note: Don't call updateYamlContent here - it should only be called
    // when we successfully save or load, not during editing
  }, []);

  // New: Handle visual editor changes
  const handleVisualChange = useCallback(
    (updatedPersonas: PersonaEditorProps[]) => {
      setEditedPersonas(updatedPersonas);

      // Convert personas back to YAML
      const yamlConfig = {
        personas: updatedPersonas.map(persona => ({
          id: persona.id,
          name: persona.name,
          description: persona.description,
          primaryGoal: persona.primaryGoal,
          mainPainPoint: persona.mainPainPoint,
          keywords: persona.keywords || [],
        })),
      };

      const yamlString = yaml.dump(yamlConfig, {
        indent: 2,
        lineWidth: 80,
        quotingType: '"',
      });

      setEditedYaml(yamlString);
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      clearError();

      console.log('💾 Saving persona configuration...');

      // Validate before saving
      const validation = validateYamlFormat(editedYaml);
      if (!validation.valid) {
        setValidationResult(validation);
        return;
      }

      // Save configuration
      const result = await saveYamlConfig(editedYaml);

      if (result.success) {
        console.log('✅ Persona configuration saved successfully');
        setHasUnsavedChanges(false);
        setValidationResult(null);

        // Show success message briefly
        setTimeout(() => {
          if (result.validationResult?.warnings?.length === 0) {
            // Close modal after successful save with no warnings
            onClose();
          }
        }, 1000);
      } else {
        console.warn('⚠️ Failed to save persona configuration:', result.error);
        if (result.validationResult) {
          setValidationResult(result.validationResult);
        }
      }
    } catch (err) {
      console.error('❌ Failed to save persona configuration:', err);
    }
  }, [editedYaml, saveYamlConfig, clearError, onClose]);

  const handleReload = useCallback(async () => {
    try {
      clearError();

      console.log('🔄 Reloading persona configuration...');
      const result = await reloadPersonas();

      if (result.success) {
        console.log('✅ Personas reloaded successfully');

        // Reset edited content to match reloaded data
        if (result.personas) {
          setEditedYaml(yamlContent);
          setHasUnsavedChanges(false);
          setValidationResult(null);
        }
      } else {
        console.warn('⚠️ Failed to reload personas:', result.error);
      }
    } catch (err) {
      console.error('❌ Failed to reload personas:', err);
    }
  }, [reloadPersonas, clearError, yamlContent]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      if (
        confirm('You have unsaved changes. Are you sure you want to close?')
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      } else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (hasUnsavedChanges && !loading && !saving && !reloading) {
          handleSave();
        }
      }
    },
    [handleClose, handleSave, hasUnsavedChanges, loading, saving, reloading]
  );

  // Don't render if modal is not open
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate/50 dark:bg-slate-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="bg-paper dark:bg-paper-dark rounded-lg shadow-md border border-graphite dark:border-graphite-dark w-full max-w-4xl max-h-[75vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-persona/10 dark:bg-persona-dark/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-persona dark:text-persona-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark font-semibold">
                Persona Manager
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                Edit and manage persona configurations
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
            aria-label="Close persona manager"
          >
            <svg
              className="w-5 h-5 text-slate dark:text-slate-dark"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-graphite dark:border-graphite-dark">
          <button
            onClick={() => setActiveTab('visual')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'visual'
                ? 'border-persona text-persona dark:border-persona-dark dark:text-persona-dark bg-persona/5 dark:bg-persona-dark/5'
                : 'border-transparent text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark hover:border-graphite dark:hover:border-graphite-dark'
            }`}
          >
            Visual Editor
          </button>
          <button
            onClick={() => setActiveTab('yaml')}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'yaml'
                ? 'border-persona text-persona dark:border-persona-dark dark:text-persona-dark bg-persona/5 dark:bg-persona-dark/5'
                : 'border-transparent text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark hover:border-graphite dark:hover:border-graphite-dark'
            }`}
          >
            YAML Editor
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          {activeTab === 'visual' ? (
            <VisualEditor
              personas={editedPersonas}
              onChange={handleVisualChange}
              loading={loading}
            />
          ) : (
            <YamlEditor
              yaml={editedYaml}
              onChange={handleYamlChange}
              validationResult={validationResult}
              loading={loading}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-graphite dark:border-graphite-dark bg-mist dark:bg-mist-dark/20">
          <div className="flex items-center space-x-4">
            {/* Status */}
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  error || (validationResult && !validationResult.valid)
                    ? 'bg-red-500'
                    : hasUnsavedChanges
                      ? 'bg-yellow-500'
                      : 'bg-persona'
                }`}
              />
              <span className="text-caption text-steel dark:text-steel-dark">
                {error || (validationResult && !validationResult.valid)
                  ? 'Validation Error'
                  : hasUnsavedChanges
                    ? 'Unsaved Changes'
                    : `${editedPersonas.length} personas loaded`}
              </span>
            </div>

            {/* Reload Button */}
            <button
              onClick={handleReload}
              disabled={loading || saving || reloading}
              className="text-caption text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark disabled:opacity-50 transition-colors"
            >
              {reloading ? 'Reloading...' : '🔄 Reload'}
            </button>
          </div>

          <div className="flex items-center space-x-3">
            {/* Cancel Button */}
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark border border-graphite dark:border-graphite-dark rounded-md hover:bg-graphite/10 dark:hover:bg-graphite-dark/10 transition-colors"
            >
              Cancel
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={
                !hasUnsavedChanges ||
                loading ||
                saving ||
                reloading ||
                (validationResult ? !validationResult.valid : false)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-persona hover:bg-persona/90 dark:bg-persona-dark dark:hover:bg-persona-dark/90 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Configuration Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={clearError}
                className="text-red-400 hover:text-red-600 dark:text-red-300 dark:hover:text-red-100"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Success Message */}
        {lastSaveResult?.success && !error && (
          <div className="p-4 bg-persona/10 dark:bg-persona-dark/10 border-t border-persona/20 dark:border-persona-dark/20">
            <div className="flex items-center space-x-3">
              <svg
                className="w-5 h-5 text-persona dark:text-persona-dark"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-sm text-persona dark:text-persona-dark">
                Configuration saved successfully!{' '}
                {lastSaveResult.personas?.length || 0} personas loaded.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Basic persona interface for the Visual Editor
 */
interface PersonaEditorProps {
  id: string;
  name: string;
  description: string;
  primaryGoal: string;
  mainPainPoint: string;
  keywords?: string[];
}

/**
 * Visual Editor Component for persona management
 */
function VisualEditor({
  personas,
  onChange,
  loading,
}: {
  personas: PersonaEditorProps[];
  onChange: (personas: PersonaEditorProps[]) => void;
  loading: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Debug logging for height calculations
  useEffect(() => {
    if (contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      console.log('🔍 VisualEditor content dimensions:', {
        scrollHeight: contentRef.current.scrollHeight,
        clientHeight: contentRef.current.clientHeight,
        offsetHeight: contentRef.current.offsetHeight,
        boundingHeight: rect.height,
        scrollTop: contentRef.current.scrollTop,
        personaCount: personas.length,
      });
    }
  }, [personas]);

  const handleAddPersona = () => {
    const newPersona: PersonaEditorProps = {
      id: `persona_${Date.now()}`,
      name: 'New Persona',
      description: 'Description for the new persona',
      primaryGoal: 'Primary goal of this persona',
      mainPainPoint: 'Main pain point this persona faces',
      keywords: ['keyword1', 'keyword2'],
    };
    onChange([...personas, newPersona]);
    setEditingId(newPersona.id);
  };

  const handleUpdatePersona = (
    id: string,
    updates: Partial<PersonaEditorProps>
  ) => {
    onChange(personas.map(p => (p.id === id ? { ...p, ...updates } : p)));
  };

  const handleDeletePersona = (id: string) => {
    onChange(personas.filter(p => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const handleKeywordChange = (id: string, keywords: string[]) => {
    handleUpdatePersona(id, { keywords });
  };

  // Calculate available height for scrollable content
  // 75vh modal height - header (120px) - tab nav (53px) - footer+clearance (100px) - padding (27px)
  const availableHeight = 'calc(75vh - 300px)';

  console.log(
    '🎯 VisualEditor: Calculated available height with footer clearance:',
    availableHeight
  );

  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-graphite/20 dark:border-graphite-dark/20">
        <div className="flex justify-between items-center">
          <h3 className="text-body font-medium text-slate dark:text-slate-dark">
            Personas ({personas.length})
          </h3>
          <button
            onClick={handleAddPersona}
            disabled={loading}
            className="px-3 py-1 text-sm bg-persona/10 hover:bg-persona/20 dark:bg-persona-dark/10 dark:hover:bg-persona-dark/20 text-persona dark:text-persona-dark rounded-md transition-colors disabled:opacity-50"
          >
            + Add Persona
          </button>
        </div>
      </div>

      {/* Scrollable Content with Fixed Height */}
      <div
        ref={contentRef}
        className="overflow-y-auto"
        style={{ height: availableHeight }}
      >
        <div className="p-6 pt-4">
          {/* Personas List */}
          <div className="space-y-4">
            {personas.length > 0 ? (
              personas.map(persona => (
                <PersonaCard
                  key={persona.id}
                  persona={persona}
                  isEditing={editingId === persona.id}
                  onEdit={() => setEditingId(persona.id)}
                  onSave={() => setEditingId(null)}
                  onCancel={() => setEditingId(null)}
                  onUpdate={updates => handleUpdatePersona(persona.id, updates)}
                  onDelete={() => handleDeletePersona(persona.id)}
                  onKeywordChange={keywords =>
                    handleKeywordChange(persona.id, keywords)
                  }
                  loading={loading}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <svg
                  className="w-12 h-12 text-steel dark:text-steel-dark mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <h3 className="text-body font-medium text-slate dark:text-slate-dark mb-2">
                  No personas configured
                </h3>
                <p className="text-body-sm text-steel dark:text-steel-dark mb-4">
                  Click "Add Persona" to create your first persona
                  configuration.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual Persona Card Component
 */
function PersonaCard({
  persona,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onUpdate,
  onDelete,
  onKeywordChange,
  loading,
}: {
  persona: PersonaEditorProps;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onUpdate: (updates: Partial<PersonaEditorProps>) => void;
  onDelete: () => void;
  onKeywordChange: (keywords: string[]) => void;
  loading: boolean;
}) {
  const [editForm, setEditForm] = useState(persona);
  const [keywordInput, setKeywordInput] = useState('');

  // Update form when persona changes
  useEffect(() => {
    setEditForm(persona);
  }, [persona]);

  const handleSave = () => {
    onUpdate(editForm);
    onSave();
  };

  const handleAddKeyword = () => {
    if (
      keywordInput.trim() &&
      !editForm.keywords?.includes(keywordInput.trim())
    ) {
      const newKeywords = [...(editForm.keywords || []), keywordInput.trim()];
      setEditForm(prev => ({ ...prev, keywords: newKeywords }));
      onKeywordChange(newKeywords);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keywordToRemove: string) => {
    const newKeywords = (editForm.keywords || []).filter(
      k => k !== keywordToRemove
    );
    setEditForm(prev => ({ ...prev, keywords: newKeywords }));
    onKeywordChange(newKeywords);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="p-4 border border-graphite dark:border-graphite-dark rounded-lg bg-mist dark:bg-mist-dark/20">
      {isEditing ? (
        // Edit Mode
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-body font-semibold text-slate dark:text-slate-dark">
              Editing Persona
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={handleSave}
                disabled={loading}
                className="px-3 py-1 text-sm bg-persona hover:bg-persona/90 dark:bg-persona-dark dark:hover:bg-persona-dark/90 text-white rounded transition-colors disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={onCancel}
                disabled={loading}
                className="px-3 py-1 text-sm bg-graphite/20 hover:bg-graphite/30 dark:bg-graphite-dark/20 dark:hover:bg-graphite-dark/30 text-slate dark:text-slate-dark rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
                ID
              </label>
              <input
                type="text"
                value={editForm.id}
                onChange={e =>
                  setEditForm(prev => ({ ...prev, id: e.target.value }))
                }
                className="w-full px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
                Name
              </label>
              <input
                type="text"
                value={editForm.name}
                onChange={e =>
                  setEditForm(prev => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
              Description
            </label>
            <textarea
              value={editForm.description}
              onChange={e =>
                setEditForm(prev => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
              Primary Goal
            </label>
            <textarea
              value={editForm.primaryGoal}
              onChange={e =>
                setEditForm(prev => ({ ...prev, primaryGoal: e.target.value }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
              Main Pain Point
            </label>
            <textarea
              value={editForm.mainPainPoint}
              onChange={e =>
                setEditForm(prev => ({
                  ...prev,
                  mainPainPoint: e.target.value,
                }))
              }
              rows={2}
              className="w-full px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate dark:text-slate-dark mb-1">
              Keywords
            </label>
            <div className="space-y-2">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={e => setKeywordInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add keyword..."
                  className="flex-1 px-3 py-2 border border-graphite dark:border-graphite-dark rounded-md bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark"
                  disabled={loading}
                />
                <button
                  onClick={handleAddKeyword}
                  disabled={!keywordInput.trim() || loading}
                  className="px-3 py-2 text-sm bg-persona/10 hover:bg-persona/20 dark:bg-persona-dark/10 dark:hover:bg-persona-dark/20 text-persona dark:text-persona-dark rounded-md transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {editForm.keywords?.map((keyword, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 text-sm bg-persona/10 dark:bg-persona-dark/10 text-persona dark:text-persona-dark rounded border border-persona/20 dark:border-persona-dark/20"
                  >
                    {keyword}
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      disabled={loading}
                      className="ml-1 text-persona/60 hover:text-persona dark:text-persona-dark/60 dark:hover:text-persona-dark disabled:opacity-50"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // View Mode
        <div>
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="text-body font-semibold text-slate dark:text-slate-dark">
                {persona.name}
              </h3>
              <p className="text-caption text-persona dark:text-persona-dark mt-1">
                ID: {persona.id}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onEdit}
                disabled={loading}
                className="p-1 text-steel dark:text-steel-dark hover:text-slate dark:hover:text-slate-dark rounded transition-colors disabled:opacity-50"
                title="Edit persona"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={onDelete}
                disabled={loading}
                className="p-1 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors disabled:opacity-50"
                title="Delete persona"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-caption font-medium text-slate dark:text-slate-dark block mb-1">
                Description:
              </label>
              <p className="text-body-sm text-steel dark:text-steel-dark">
                {persona.description}
              </p>
            </div>

            <div>
              <label className="text-caption font-medium text-slate dark:text-slate-dark block mb-1">
                Primary Goal:
              </label>
              <p className="text-body-sm text-steel dark:text-steel-dark">
                {persona.primaryGoal}
              </p>
            </div>

            <div>
              <label className="text-caption font-medium text-slate dark:text-slate-dark block mb-1">
                Main Pain Point:
              </label>
              <p className="text-body-sm text-steel dark:text-steel-dark">
                {persona.mainPainPoint}
              </p>
            </div>

            <div>
              <label className="text-caption font-medium text-slate dark:text-slate-dark block mb-1">
                Keywords:
              </label>
              <div className="flex flex-wrap gap-1">
                {persona.keywords?.map((keyword: string, index: number) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-caption bg-persona/10 dark:bg-persona-dark/10 text-persona dark:text-persona-dark rounded border border-persona/20 dark:border-persona-dark/20"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * YAML Editor Component with syntax highlighting and validation
 */
function YamlEditor({
  yaml,
  onChange,
  validationResult,
  loading,
}: {
  yaml: string;
  onChange: (value: string) => void;
  validationResult: ReturnType<typeof validateYamlFormat> | null;
  loading: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Editor */}
      <div className="flex-1 p-4 min-h-0">
        <textarea
          value={yaml}
          onChange={e => onChange(e.target.value)}
          disabled={loading}
          className="w-full h-full resize-none font-mono text-sm bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark border border-graphite dark:border-graphite-dark rounded-md p-4 focus:outline-none focus:ring-2 focus:ring-persona dark:focus:ring-persona-dark focus:border-transparent disabled:opacity-50 min-h-[300px]"
          placeholder="# Personyx Persona Configuration
personas:
  - id: example_persona
    name: 'Example Persona'
    description: 'An example persona for demonstration'
    primaryGoal: 'Achieve specific objectives'
    mainPainPoint: 'Overcome specific challenges'
    keywords:
      - 'keyword1'
      - 'keyword2'"
          spellCheck={false}
        />
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="border-t border-graphite dark:border-graphite-dark p-4 space-y-3">
          {/* Errors */}
          {validationResult.errors.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600 dark:text-red-400">
                Validation Errors
              </h4>
              <ul className="space-y-1">
                {validationResult.errors.map((error, index) => (
                  <li
                    key={index}
                    className="text-sm text-red-600 dark:text-red-400 flex items-start space-x-2"
                  >
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {validationResult.warnings.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                Validation Warnings
              </h4>
              <ul className="space-y-1">
                {validationResult.warnings.map((warning, index) => (
                  <li
                    key={index}
                    className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start space-x-2"
                  >
                    <span className="text-yellow-500 mt-0.5">•</span>
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success */}
          {validationResult.valid &&
            validationResult.errors.length === 0 &&
            validationResult.warnings.length === 0 && (
              <div className="flex items-center space-x-2 text-sm text-persona dark:text-persona-dark">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span>Configuration is valid</span>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
