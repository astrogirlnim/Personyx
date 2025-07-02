/**
 * Personyx Main App Component
 */

import React, { useEffect, useState } from 'react';
import { APP_NAME } from '../shared/constants';
import type { AppState, Persona, ChatResponse } from '../shared/types';

// Chat Window Component
interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  personas: Persona[];
}

function ChatWindow({
  isOpen,
  onClose,
  personas,
}: ChatWindowProps): JSX.Element | null {
  const [selectedPersona, setSelectedPersona] = useState<string>('');
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize with first persona if available
  useEffect(() => {
    if (personas.length > 0 && !selectedPersona) {
      setSelectedPersona(personas[0].id);
    }
  }, [personas, selectedPersona]);

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedPersona || isLoading) return;

    const userMessage = message.trim();
    setMessage('');

    // Add user message to chat history immediately
    const userChatEntry = {
      message: userMessage,
      sources: [],
      persona: null,
      timestamp: new Date(),
      isUser: true, // Flag to identify user messages
    };
    setChatHistory(prev => [...prev, userChatEntry]);

    setIsLoading(true);

    try {
      // Send message via IPC
      const response = (await window.electronAPI.chatWithPersona(
        selectedPersona,
        userMessage,
        '' // Could include current PRD context later
      )) as ChatResponse;

      // Add persona response to chat history
      setChatHistory(prev => [
        ...prev,
        {
          message: response.message,
          sources: response.sources,
          persona: response.persona,
          timestamp: response.timestamp,
          isUser: false, // Flag to identify persona responses
        },
      ]);
    } catch (error) {
      console.error('Chat failed:', error);
      // Add error message to chat
      setChatHistory(prev => [
        ...prev,
        {
          message:
            'Sorry, there was an error processing your message. Please try again.',
          sources: [],
          persona: personas.find(p => p.id === selectedPersona) || personas[0],
          timestamp: new Date(),
          isUser: false,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  const selectedPersonaData = personas.find(p => p.id === selectedPersona);

  return (
    <div className="fixed inset-0 bg-slate/50 dark:bg-slate-dark/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-paper dark:bg-paper-dark rounded-lg shadow-lg w-full max-w-2xl h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-persona rounded-full flex items-center justify-center">
              <span className="text-sm font-bold text-white">
                {selectedPersonaData?.name.charAt(0) || 'P'}
              </span>
            </div>
            <div>
              <h2 className="text-h2 text-slate dark:text-slate-dark">
                Chat with Persona
              </h2>
              <p className="text-caption text-steel dark:text-steel-dark">
                {selectedPersonaData?.name || 'Select a persona'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
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

        {/* Persona Selector */}
        <div className="p-4 border-b border-graphite dark:border-graphite-dark">
          <label className="block text-body text-slate dark:text-slate-dark mb-2">
            Select Persona:
          </label>
          <select
            value={selectedPersona}
            onChange={e => setSelectedPersona(e.target.value)}
            className="w-full p-2 rounded-md border border-graphite dark:border-graphite-dark bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:border-evidence dark:focus:border-evidence-dark focus:outline-none"
          >
            {personas.map(persona => (
              <option key={persona.id} value={persona.id}>
                {persona.name} - {persona.description}
              </option>
            ))}
          </select>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.length === 0 ? (
            <div className="text-center text-steel dark:text-steel-dark">
              <p className="mb-2">
                👋 Start a conversation with {selectedPersonaData?.name}
              </p>
              <p className="text-caption">
                Ask questions about user needs, pain points, or get insights for
                your PRD.
              </p>
            </div>
          ) : (
            chatHistory.map((chat, index) => (
              <div key={index} className="space-y-3">
                {/* Message */}
                <div
                  className={`flex space-x-3 ${chat.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      chat.isUser
                        ? 'bg-evidence dark:bg-evidence-dark'
                        : 'bg-persona'
                    }`}
                  >
                    <span className="text-sm font-bold text-white">
                      {chat.isUser ? 'U' : chat.persona?.name.charAt(0) || 'P'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div
                      className={`rounded-lg p-3 ${
                        chat.isUser
                          ? 'bg-evidence/10 dark:bg-evidence-dark/10 border border-evidence/20 dark:border-evidence-dark/20'
                          : 'bg-graphite/10 dark:bg-graphite-dark/10'
                      }`}
                    >
                      <p className="text-body text-slate dark:text-slate-dark whitespace-pre-wrap">
                        {chat.message}
                      </p>
                    </div>
                    {!chat.isUser && chat.sources.length > 0 && (
                      <div className="mt-2">
                        <p className="text-caption text-steel dark:text-steel-dark mb-1">
                          Sources ({chat.sources.length}):
                        </p>
                        <div className="space-y-1">
                          {chat.sources
                            .slice(0, 3)
                            .map((source, sourceIndex) => (
                              <div
                                key={sourceIndex}
                                className="text-caption text-steel dark:text-steel-dark bg-mist dark:bg-mist-dark p-2 rounded"
                              >
                                "{source.content.substring(0, 100)}..."
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    <p
                      className={`text-caption text-steel dark:text-steel-dark mt-1 ${
                        chat.isUser ? 'text-right' : 'text-left'
                      }`}
                    >
                      {chat.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex space-x-3">
              <div className="w-8 h-8 bg-persona rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-white">
                  {selectedPersonaData?.name.charAt(0) || 'P'}
                </span>
              </div>
              <div className="flex-1">
                <div className="bg-graphite/10 dark:bg-graphite-dark/10 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-evidence dark:border-evidence-dark"></div>
                    <span className="text-body text-steel dark:text-steel-dark">
                      {selectedPersonaData?.name} is thinking...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-graphite dark:border-graphite-dark">
          <div className="flex space-x-2">
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${selectedPersonaData?.name || 'the persona'} a question...`}
              className="flex-1 p-3 rounded-md border border-graphite dark:border-graphite-dark bg-paper dark:bg-paper-dark text-slate dark:text-slate-dark focus:border-evidence dark:focus:border-evidence-dark focus:outline-none resize-none"
              rows={2}
              disabled={isLoading || !selectedPersona}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !selectedPersona || isLoading}
              className="px-4 py-2 bg-evidence dark:bg-evidence-dark text-white rounded-md hover:bg-evidence/90 dark:hover:bg-evidence-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Send
            </button>
          </div>
          <p className="text-caption text-steel dark:text-steel-dark mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

export function App(): JSX.Element {
  const [appState, setAppState] = useState<AppState>({
    isReady: false,
    personas: [],
    recentScores: [],
    settings: {
      theme: 'system',
      autoUpdate: true,
      notifications: true,
      evidenceRetentionDays: 30,
      aiService: {
        provider: 'local',
        localApiKey: undefined,
        cloudSubscription: undefined,
      },
    },
  });

  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    console.log('🚀 Personyx App component mounted');

    // Initialize app state
    const initializeApp = async () => {
      try {
        // Load personas
        const personas = (await window.electronAPI.getPersonas()) as Persona[];
        console.log('📋 Loaded personas:', personas);

        setAppState(prev => ({
          ...prev,
          isReady: true,
          personas: personas || [],
        }));
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAppState(prev => ({ ...prev, isReady: true }));
      }
    };

    initializeApp();
  }, []);

  // Handle keyboard shortcuts and IPC events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K to open chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsChatOpen(true);
      }
      // Escape to close chat
      if (e.key === 'Escape' && isChatOpen) {
        setIsChatOpen(false);
      }
    };

    // Listen for tray-triggered chat window open
    const handleOpenChatWindow = () => {
      setIsChatOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);

    // Set up IPC listener for opening chat window from tray
    if (window.electronAPI) {
      window.electronAPI.onOpenChatWindow(handleOpenChatWindow);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // Note: electronAPI listeners are automatically cleaned up by preload script
    };
  }, [isChatOpen]);

  if (!appState.isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-mist dark:bg-mist-dark">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-evidence dark:border-evidence-dark mx-auto mb-4"></div>
          <h2 className="text-body-lg text-slate dark:text-slate-dark">
            Loading {APP_NAME}...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mist dark:bg-mist-dark p-6">
      {/* Evidence Gate Layout */}
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-h1 text-slate dark:text-slate-dark relative">
                {APP_NAME}
                <div className="absolute -bottom-2 left-0 w-full h-0.5 bg-evidence dark:bg-evidence-dark"></div>
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              {/* Chat Button */}
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors"
                title="Chat with Persona (Ctrl+K)"
              >
                <svg
                  className="w-6 h-6 text-slate dark:text-slate-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </button>
              {/* Dark Mode Toggle */}
              <button className="p-2 rounded-full hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 transition-colors">
                <svg
                  className="w-6 h-6 text-slate dark:text-slate-dark"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Evidence Gate Hero */}
        <div className="mb-8">
          <div className="text-center">
            <h2 className="text-display text-slate dark:text-slate-dark mb-2">
              Evidence Gate
            </h2>
            <p className="text-body text-steel dark:text-steel-dark">
              Trust-worthy analysis, front-and-centre
            </p>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Import PRD Card - Spans 8 columns on desktop */}
          <div className="lg:col-span-8">
            <div className="card">
              <h2 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Import PRD
              </h2>
              <div className="drop-zone interactive min-h-[360px] flex items-center justify-center">
                <div className="text-center">
                  <svg
                    className="mx-auto h-12 w-12 mb-4 text-slate dark:text-slate-dark drop-zone-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-body-lg font-medium mb-2 text-slate dark:text-slate-dark">
                    Drop your PRD here
                  </p>
                  <p className="text-body text-slate dark:text-slate-dark">
                    or click to browse for .md or .txt files
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Spans 4 columns on desktop */}
          <div className="lg:col-span-4 space-y-6">
            {/* Evidence Scores Card */}
            <div className="card">
              <h3 className="text-h2 text-slate dark:text-slate-dark mb-4">
                Evidence Scores
              </h3>
              <div className="text-center">
                {/* Ring Gauge - Empty State */}
                <div className="w-40 h-40 mx-auto mb-4 relative">
                  <svg className="w-40 h-40 transform -rotate-90">
                    <circle
                      cx="80"
                      cy="80"
                      r="70"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                      className="text-graphite dark:text-graphite-dark"
                      strokeDasharray="439.8"
                      strokeDashoffset="0"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-caption text-slate dark:text-slate-dark">
                        No PRDs analysed yet
                      </div>
                    </div>
                  </div>
                </div>
                <button className="btn-primary">Import First PRD</button>
              </div>
            </div>

            {/* Personas Card */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-h2 text-slate dark:text-slate-dark">
                  Personas
                </h3>
                <button
                  onClick={() => setIsChatOpen(true)}
                  className="text-caption text-evidence dark:text-evidence-dark hover:underline"
                  title="Chat with a persona"
                >
                  Chat →
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {appState.personas.map(persona => (
                    <span key={persona.id} className="persona-pill">
                      {persona.name}
                    </span>
                  ))}
                  {appState.personas.length === 0 && (
                    <>
                      <span className="persona-pill">Solo Founder</span>
                      <span className="persona-pill">Agency Marketer</span>
                    </>
                  )}
                </div>
                <p className="text-caption text-steel dark:text-steel-dark">
                  Ready for evidence analysis
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Window Modal */}
      <ChatWindow
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        personas={appState.personas}
      />
    </div>
  );
}
