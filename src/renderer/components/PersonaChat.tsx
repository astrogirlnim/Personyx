/**
 * PersonaChat Component - Phase 3.1 Feature 1.1
 * Chat with Persona window (single persona dropdown)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Persona } from '@shared/types';

interface PersonaChatProps {
  personas: Persona[];
  onClose: () => void;
  onError: (message: string) => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'persona';
  content: string;
  timestamp: Date;
  personaName?: string;
}

export function PersonaChat({
  personas,
  onClose,
  onError,
}: PersonaChatProps): JSX.Element {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(
    personas[0]?.id || ''
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Get selected persona
  const selectedPersona = personas.find(p => p.id === selectedPersonaId);

  // Handle sending a message
  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim() || !selectedPersonaId || isLoading) return;

    const messageText = currentMessage.trim();
    setCurrentMessage('');
    setIsLoading(true);

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);

    try {
      console.log(
        '💬 Sending message to persona:',
        selectedPersonaId,
        messageText
      );

      // Show typing indicator
      setIsTyping(true);

      // Call the backend chat service
      const response = (await window.electronAPI.chatWithPersona(
        selectedPersonaId,
        messageText,
        'chat-ui' // context to indicate this is from the UI
      )) as { response: string };

      setIsTyping(false);

      // Add persona response
      const personaMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'persona',
        content:
          response.response ||
          "I apologize, but I couldn't generate a response at this time.",
        timestamp: new Date(),
        personaName: selectedPersona?.name,
      };

      setMessages(prev => [...prev, personaMessage]);

      console.log('✅ Chat response received');
    } catch (error) {
      console.error('❌ Chat failed:', error);
      setIsTyping(false);
      onError(
        `Failed to chat with ${selectedPersona?.name || 'persona'}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentMessage, selectedPersonaId, selectedPersona, isLoading, onError]);

  // Handle Enter key
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Clear chat when persona changes
  const handlePersonaChange = useCallback((newPersonaId: string) => {
    setSelectedPersonaId(newPersonaId);
    setMessages([]);
    setCurrentMessage('');
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-paper dark:bg-paper-dark rounded-dr-md shadow-dr-md w-full max-w-2xl h-[600px] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-graphite dark:border-graphite-dark">
          <div className="flex items-center space-x-3">
            <h2 className="text-h2 text-slate dark:text-slate-dark">
              💬 Chat with Persona
            </h2>

            {/* Persona Selector */}
            <select
              value={selectedPersonaId}
              onChange={e => handlePersonaChange(e.target.value)}
              className="bg-mist dark:bg-mist-dark text-slate dark:text-slate-dark border border-graphite dark:border-graphite-dark rounded-dr-md px-3 py-1 text-body"
              disabled={isLoading}
            >
              {personas.map(persona => (
                <option key={persona.id} value={persona.id}>
                  {persona.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-graphite/20 dark:hover:bg-graphite-dark/20 rounded-full transition-colors"
            title="Close chat"
          >
            <svg
              className="w-5 h-5 text-steel dark:text-steel-dark"
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

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🤖</div>
              <p className="text-body text-steel dark:text-steel-dark">
                Start a conversation with{' '}
                {selectedPersona?.name || 'your selected persona'}
              </p>
              <p className="text-caption text-steel dark:text-steel-dark mt-2">
                Ask about evidence, insights, or validation for your product
                ideas
              </p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-dr-md ${
                    message.type === 'user'
                      ? 'bg-evidence dark:bg-evidence-dark text-paper dark:text-paper-dark'
                      : 'bg-mist dark:bg-mist-dark text-slate dark:text-slate-dark border border-graphite dark:border-graphite-dark'
                  }`}
                >
                  {message.type === 'persona' && message.personaName && (
                    <div className="text-caption text-steel dark:text-steel-dark mb-1 font-medium">
                      {message.personaName}
                    </div>
                  )}
                  <div className="text-body whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <div
                    className={`text-caption mt-1 ${
                      message.type === 'user'
                        ? 'text-paper/70 dark:text-paper-dark/70'
                        : 'text-steel dark:text-steel-dark'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-mist dark:bg-mist-dark text-slate dark:text-slate-dark border border-graphite dark:border-graphite-dark p-3 rounded-dr-md">
                <div className="flex items-center space-x-1">
                  <div className="text-caption text-steel dark:text-steel-dark mb-1 font-medium">
                    {selectedPersona?.name}
                  </div>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-steel dark:bg-steel-dark rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-steel dark:bg-steel-dark rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-steel dark:bg-steel-dark rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-graphite dark:border-graphite-dark p-4">
          <div className="flex space-x-2">
            <textarea
              value={currentMessage}
              onChange={e => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Ask ${selectedPersona?.name || 'persona'} about evidence, insights, or validation...`}
              className="flex-1 bg-mist dark:bg-mist-dark text-slate dark:text-slate-dark border border-graphite dark:border-graphite-dark rounded-dr-md px-3 py-2 text-body resize-none focus:outline-none focus:ring-2 focus:ring-evidence-dark"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={!currentMessage.trim() || isLoading}
              className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
              title="Send message (Enter)"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-paper/30 border-t-paper rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>

          <div className="mt-2 text-caption text-steel dark:text-steel-dark">
            Press Enter to send • Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
