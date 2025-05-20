
//     const getMessagesFunc = httpsCallable(functions, 'getMessages');
import React, { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';


// Interface for Prompt type from adminPromptFunctions.ts
interface Prompt {
  id?: string;
  category: 'greeting' | 'reflection' | 'emotion_ack' | 'gap_reconnect' | 'default' | string;
  trigger: {
    type: 'first_time' | 'new_day' | 'emotion_detected' | 'default' | string;
    condition?: any;
  };
  tone: 'friendly' | 'empathetic' | string;
  content: string;
  active: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const PromptAdminPanel = () => {
  // State variables
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Filter states
  const [categoryFilter, setCategoryFilter] = useState('');
  const [triggerFilter, setTriggerFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState(false);
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  
  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Firebase utilities
  const functions = getFunctions();
  const auth = getAuth();
  
  // Available categories and trigger types for dropdowns
  const categories = ['default', 'greeting', 'reflection', 'emotion_ack', 'gap_reconnect'];
  const triggerTypes = ['default', 'first_time', 'new_day', 'emotion_detected', 'gap_reconnect'];
  const tones = ['friendly', 'empathetic', 'professional', 'casual', 'supportive', 'calm'];
  
  // Check if user is admin and load prompts
  useEffect(() => {
    const checkAdminAndLoadPrompts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if user is logged in
        const user = auth.currentUser;
        if (!user) {
          setError('You must be logged in to access this page');
          setLoading(false);
          return;
        }
        
        // Try to fetch prompts - this will fail if not admin
        const getPromptsFunc = httpsCallable(functions, 'getPrompts');
        const result = await getPromptsFunc({});
        
        // If we got here, user is admin
        setIsAdmin(true);
        
        // @ts-ignore - result.data has prompts property
        const fetchedPrompts = result.data.prompts || [];
        setPrompts(fetchedPrompts);
        setFilteredPrompts(fetchedPrompts);
      } catch (err) {
        console.error('Error checking admin status:', err);
        setError('Access denied. Only administrators can access this page.');
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };
    
    checkAdminAndLoadPrompts();
  }, [auth, functions]);
  
  // Apply filters when filter states change
  useEffect(() => {
    if (prompts.length === 0) return;
    
    let filtered = [...prompts];
    
    if (categoryFilter) {
      filtered = filtered.filter(prompt => prompt.category === categoryFilter);
    }
    
    if (triggerFilter) {
      filtered = filtered.filter(prompt => prompt.trigger.type === triggerFilter);
    }
    
    if (showOnlyActive) {
      filtered = filtered.filter(prompt => prompt.active);
    }
    
    setFilteredPrompts(filtered);
  }, [prompts, categoryFilter, triggerFilter, showOnlyActive]);
  
  // Reset filters
  const resetFilters = () => {
    setCategoryFilter('');
    setTriggerFilter('');
    setShowOnlyActive(false);
    setFilteredPrompts(prompts);
  };
  
  // Create empty prompt
  const createNewPrompt = () => {
    setCurrentPrompt({
      category: 'default',
      trigger: {
        type: 'default'
      },
      tone: 'friendly',
      content: '',
      active: true
    });
    setIsEditing(true);
    setFormError(null);
  };
  
  // Edit existing prompt
  const editPrompt = (prompt: Prompt) => {
    setCurrentPrompt({...prompt});
    setIsEditing(true);
    setFormError(null);
  };
  
  // Save prompt (create or update)
  const savePrompt = async () => {
    if (!currentPrompt) return;
    
    // Validate form
    if (!currentPrompt.content.trim()) {
      setFormError('Prompt content is required');
      return;
    }
    
    try {
      setLoading(true);
      setFormError(null);
      
      const createOrUpdatePromptFunc = httpsCallable(functions, 'createOrUpdatePrompt');
      const result = await createOrUpdatePromptFunc({
        promptId: currentPrompt.id,
        prompt: currentPrompt
      });
      
      // Refresh prompts list
      const getPromptsFunc = httpsCallable(functions, 'getPrompts');
      const promptsResult = await getPromptsFunc({});
      
      // @ts-ignore - result.data has prompts property
      const fetchedPrompts = promptsResult.data.prompts || [];
      setPrompts(fetchedPrompts);
      
      // Close form
      setIsEditing(false);
      setCurrentPrompt(null);
    } catch (err) {
      console.error('Error saving prompt:', err);
      setFormError(`Failed to save prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Delete prompt
  const deletePromptHandler = async (promptId: string) => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const deletePromptFunc = httpsCallable(functions, 'deletePrompt');
      await deletePromptFunc({ promptId });
      
      // Refresh prompts list
      const getPromptsFunc = httpsCallable(functions, 'getPrompts');
      const result = await getPromptsFunc({});
      
      // @ts-ignore - result.data has prompts property
      const fetchedPrompts = result.data.prompts || [];
      setPrompts(fetchedPrompts);
    } catch (err) {
      console.error('Error deleting prompt:', err);
      setError(`Failed to delete prompt: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    
    // Firebase timestamps have seconds and nanoseconds
    if (timestamp.seconds) {
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleString();
    }
    
    // Handle string dates or other formats
    return new Date(timestamp).toLocaleString();
  };
  
  // Render loading state
  if (loading && !isEditing) {
    return (
      <div className="prompt-admin-panel">
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="prompt-admin-panel">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => window.location.href = '/'}>Return to Home</button>
        </div>
      </div>
    );
  }
  
  // Render access denied
  if (!isAdmin) {
    return (
      <div className="prompt-admin-panel">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>You do not have permission to access this page.</p>
          <p>This page is restricted to administrators only.</p>
          <button onClick={() => window.location.href = '/'}>Return to Home</button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="prompt-admin-panel">
      <h1>Prompt Management</h1>
      <p className="admin-description">
        Manage conversation prompts for the Bubbas.AI emotional support system. These prompts define how the AI responds in different contexts.
      </p>
      
      {/* Filter controls */}
      <div className="filter-controls">
        <h3>Filter Prompts</h3>
        <div className="filter-form">
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Trigger Type:</label>
            <select
              value={triggerFilter}
              onChange={(e) => setTriggerFilter(e.target.value)}
            >
              <option value="">All Triggers</option>
              {triggerTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group checkbox">
            <label>
              <input
                type="checkbox"
                checked={showOnlyActive}
                onChange={(e) => setShowOnlyActive(e.target.checked)}
              />
              Show Only Active
            </label>
          </div>
          
          <button 
            className="reset-filter-btn" 
            onClick={resetFilters}
          >
            Reset Filters
          </button>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="action-buttons">
        <button className="create-btn" onClick={createNewPrompt}>
          Create New Prompt
        </button>
      </div>
      
      {/* Prompt editing form */}
      {isEditing && currentPrompt && (
        <div className="prompt-form-modal">
          <div className="prompt-form">
            <h2>{currentPrompt.id ? 'Edit Prompt' : 'Create New Prompt'}</h2>
            
            {formError && <div className="form-error">{formError}</div>}
            
            <div className="form-group">
              <label>Category:</label>
              <select
                value={currentPrompt.category}
                onChange={(e) => setCurrentPrompt({...currentPrompt, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
              
              {currentPrompt.category === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom category"
                  value={currentPrompt.category === 'custom' ? '' : currentPrompt.category}
                  onChange={(e) => setCurrentPrompt({...currentPrompt, category: e.target.value})}
                />
              )}
            </div>
            
            <div className="form-group">
              <label>Trigger Type:</label>
              <select
                value={currentPrompt.trigger.type}
                onChange={(e) => setCurrentPrompt({
                  ...currentPrompt, 
                  trigger: {...currentPrompt.trigger, type: e.target.value}
                })}
              >
                {triggerTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
              
              {currentPrompt.trigger.type === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom trigger type"
                  value={currentPrompt.trigger.type === 'custom' ? '' : currentPrompt.trigger.type}
                  onChange={(e) => setCurrentPrompt({
                    ...currentPrompt,
                    trigger: {...currentPrompt.trigger, type: e.target.value}
                  })}
                />
              )}
            </div>
            
            {currentPrompt.trigger.type === 'emotion_detected' && (
              <div className="form-group">
                <label>Emotion Condition:</label>
                <input
                  type="text"
                  placeholder="e.g., anxious, sad, happy"
                  value={currentPrompt.trigger.condition?.emotion || ''}
                  onChange={(e) => setCurrentPrompt({
                    ...currentPrompt,
                    trigger: {
                      ...currentPrompt.trigger,
                      condition: { emotion: e.target.value }
                    }
                  })}
                />
              </div>
            )}
            
            <div className="form-group">
              <label>Tone:</label>
              <select
                value={currentPrompt.tone}
                onChange={(e) => setCurrentPrompt({...currentPrompt, tone: e.target.value})}
              >
                {tones.map(tone => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
                <option value="custom">Custom</option>
              </select>
              
              {currentPrompt.tone === 'custom' && (
                <input
                  type="text"
                  placeholder="Enter custom tone"
                  value={currentPrompt.tone === 'custom' ? '' : currentPrompt.tone}
                  onChange={(e) => setCurrentPrompt({...currentPrompt, tone: e.target.value})}
                />
              )}
            </div>
            
            <div className="form-group">
              <label>Content:</label>
              <textarea
                rows={8}
                value={currentPrompt.content}
                onChange={(e) => setCurrentPrompt({...currentPrompt, content: e.target.value})}
                placeholder="Enter the prompt content..."
              />
            </div>
            
            <div className="form-group checkbox">
              <label>
                <input
                  type="checkbox"
                  checked={currentPrompt.active}
                  onChange={(e) => setCurrentPrompt({...currentPrompt, active: e.target.checked})}
                />
                Active
              </label>
            </div>
            
            <div className="form-actions">
              <button 
                className="cancel-btn" 
                onClick={() => {
                  setIsEditing(false);
                  setCurrentPrompt(null);
                  setFormError(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={savePrompt}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Prompt'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Prompts list */}
      <div className="prompts-list">
        <h3>Prompts ({filteredPrompts.length})</h3>
        
        {filteredPrompts.length === 0 ? (
          <div className="no-prompts">
            <p>No prompts found. {prompts.length > 0 ? 'Try adjusting your filters.' : 'Create your first prompt!'}</p>
          </div>
        ) : (
          filteredPrompts.map(prompt => (
            <div key={prompt.id} className={`prompt-card ${!prompt.active ? 'inactive' : ''}`}>
              <div className="prompt-header">
                <div className="prompt-meta">
                  <span className="prompt-category">{prompt.category}</span>
                  <span className="prompt-trigger">Trigger: {prompt.trigger.type}</span>
                  {prompt.trigger.condition?.emotion && (
                    <span className="prompt-emotion">
                      Emotion: {prompt.trigger.condition.emotion}
                    </span>
                  )}
                  <span className={`prompt-status ${prompt.active ? 'active' : 'inactive'}`}>
                    {prompt.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="prompt-actions">
                  <button 
                    className="edit-btn" 
                    onClick={() => editPrompt(prompt)}
                  >
                    Edit
                  </button>
                  <button 
                    className="delete-btn" 
                    onClick={() => prompt.id && deletePromptHandler(prompt.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              
              <div className="prompt-body">
                <div className="prompt-tone">
                  <strong>Tone:</strong> {prompt.tone}
                </div>
                <div className="prompt-content">
                  <strong>Content:</strong>
                  <p>{prompt.content}</p>
                </div>
              </div>
              
              <div className="prompt-footer">
                <div className="timestamp">
                  <div>Created: {formatTimestamp(prompt.createdAt)}</div>
                  <div>Updated: {formatTimestamp(prompt.updatedAt)}</div>
                </div>
                <div className="prompt-id">ID: {prompt.id}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PromptAdminPanel;