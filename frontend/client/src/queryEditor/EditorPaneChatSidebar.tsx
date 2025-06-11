import React, { FunctionComponent, ReactElement, useRef, useEffect, useState } from 'react';
import SplitPane from 'react-split-pane';
import { debouncedResizeChart } from '../common/tauChartRef';
import { useSessionShowChat, useSchemaState, useSessionConnectionId, useDarkMode, useEditorStore } from '../stores/editor-store';
import ReactMarkdown from 'react-markdown';
import styles from './EditorPaneChatSidebar.module.css';
import { setQueryText, runQuery } from '../stores/editor-actions';
import { v4 as uuidv4 } from 'uuid';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
}

interface SessionInfo {
  session_id: string;
  model: string;
  last_updated: string;
}

type ModelType = 'Auto' | 'Claude Sonnet 4.0' | 'Llama 3.0';

interface EditorPaneChatSidebarProps {
  queryId: string;
  children: ReactElement;
}

const EditorPaneChatSidebar: React.FC<EditorPaneChatSidebarProps> = ({
  children,
  queryId,
}) => {
  const showChat = useSessionShowChat();
  const isDarkMode = useDarkMode();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [showTableList, setShowTableList] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const historyDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const connectionId = useSessionConnectionId();
  const { connectionSchema } = useSchemaState(connectionId || '');
  const [selectedModel, setSelectedModel] = useState<ModelType>('Auto');
  const [showModelSelector, setShowModelSelector] = useState(false);
  const modelSelectorRef = useRef<HTMLDivElement>(null);
  const [currentSessionId, setCurrentSessionId] = useState(queryId);

  // Call handleNewChat only on component mount
  useEffect(() => {
    const initializeChat = () => {
      handleNewChat();
    };
    initializeChat();
  }, []); // Empty dependency array means this runs only once on mount

  // Get tables from the public schema
  const publicSchema = connectionSchema?.schemas?.find(schema => schema.name === 'public');
  const allTables = publicSchema?.tables || [];
  
  // Filter out already selected tables from dropdown options
  const availableTables = allTables.filter(table => !selectedTables.includes(table.name));

  const fetchSessions = async () => {
    try {
      const response = await fetch('http://localhost:8008/sessions');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      const data = await response.json();
      setSessions(data);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  // Fetch chat history when component mounts
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch(`http://localhost:8008/history/${queryId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch chat history');
        }
        const data = await response.json();
        
        // Convert history to messages format
        const historyMessages: Message[] = data.map((item: any) => [
          {
            id: Date.now() + Math.random(),
            text: item.message,
            isUser: true,
          },
          {
            id: Date.now() + Math.random() + 1,
            text: item.response,
            isUser: false,
          }
        ]).flat();
        
        setMessages(historyMessages);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    };

    if (queryId) {
      fetchChatHistory();
    }
  }, [queryId]);

  // Update currentSessionId when queryId changes
  // useEffect(() => {
  //   setCurrentSessionId(queryId);
  // }, [queryId]);

  const handleTableSelect = (tableName: string) => {
    setSelectedTables(prev => [...prev, tableName]);
    setShowTableList(false);
  };

  const removeTable = (tableName: string) => {
    setSelectedTables(prev => prev.filter(name => name !== tableName));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTableList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close model selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelSelectorRef.current && !modelSelectorRef.current.contains(event.target as Node)) {
        setShowModelSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close history dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(event.target as Node)) {
        setShowHistoryList(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = 'auto';
      // Calculate new height based on content
      const newHeight = Math.min(textarea.scrollHeight, 120);
      textarea.style.height = `${newHeight}px`;
    }
  };

  const resetTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // First set to auto to get the correct line height
      textarea.style.height = 'auto';
      // Get the computed line height
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      // Set to one line height plus padding
      const padding = parseInt(getComputedStyle(textarea).paddingTop) + parseInt(getComputedStyle(textarea).paddingBottom);
      textarea.style.height = `${lineHeight + padding}px`;
    }
  };

  const scrollToBottom = () => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  };

  const scrollTextareaToCursor = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      const cursorPosition = textarea.selectionStart;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
      const lines = textarea.value.substring(0, cursorPosition).split('\n').length;
      const scrollPosition = (lines - 1) * lineHeight;
      textarea.scrollTop = scrollPosition;
    }
  };

  // Adjust height when sidebar size changes
  useEffect(() => {
    const handleResize = () => {
      requestAnimationFrame(adjustTextareaHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Adjust height and scroll when sidebar visibility changes
  useEffect(() => {
    if (showChat) {
      if (inputText) {
        requestAnimationFrame(adjustTextareaHeight);
      }
      // Scroll to bottom when sidebar opens
      requestAnimationFrame(scrollToBottom);
    }
  }, [showChat, inputText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.addEventListener('input', adjustTextareaHeight);
      return () => {
        textareaRef.current?.removeEventListener('input', adjustTextareaHeight);
      };
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleRunCode = (code: string) => {
    // Set the query text in the editor
    setQueryText(code);
    // Run the query
    runQuery();
  };

  const formatMessage = (text: string) => {
    // Check if the message starts with "Tables:"
    if (text.startsWith('Tables:')) {
      const [tableContext, ...messageParts] = text.split('\n\n');
      const tables = tableContext.replace('Tables:', '').trim().split(', ');
      const messageContent = messageParts.join('\n\n');
      
      return (
        <>
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            flexWrap: 'wrap',
            marginBottom: '8px'
          }}>
            {tables.map(tableName => (
              <div
                key={tableName}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '1px 4px',
                  backgroundColor: '#006ac0',
                  borderRadius: '4px',
                  fontSize: '12px'
                }}
              >
                @{tableName}
              </div>
            ))}
          </div>
          <div className={styles['markdown-content']}>
            <ReactMarkdown
              components={{
                code: ({node, className, children, ...props}: any) => {
                  const match = /language-(\w+)/.exec(className || '');
                  if (!match) {
                    return <code className={className} {...props}>{children}</code>;
                  }
                  return (
                    <div>
                      <button 
                        onClick={() => handleRunCode(String(children))}
                        className={styles.runButton}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Run
                      </button>
                      <pre className={className} {...props}>
                        {children}
                      </pre>
                    </div>
                  );
                }
              }}
            >
              {messageContent}
            </ReactMarkdown>
          </div>
        </>
      );
    }
    
    // For regular messages, render as markdown
    return (
      <div className={styles['markdown-content']}>
        <ReactMarkdown
          components={{
            code: ({node, className, children, ...props}: any) => {
              const match = /language-(\w+)/.exec(className || '');
              if (!match) {
                return <code className={className} {...props}>{children}</code>;
              }
              return (
                <div>
                  <button 
                    onClick={() => handleRunCode(String(children))}
                    className={styles.runButton}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Run
                  </button>
                  <pre className={className} {...props}>
                    {children}
                  </pre>
                </div>
              );
            }
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    );
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    // TODO: Should we pass the table name in the message
    // Create message text with table context
    let messageText = inputText;
    if (selectedTables.length > 0) {
      const tableContext = `Tables: ${selectedTables.join(', ')}\n\n`;
      messageText = tableContext + messageText;
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      isUser: true,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    resetTextareaHeight();

    try {
      // Map the selected model to the correct model ID
      const modelName = selectedModel === 'Auto' ? 'bedrock' : 
                     selectedModel === 'Claude Sonnet 4.0' ? 'bedrock' :
                     'llama3';

      const response = await fetch('http://localhost:8008/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          message: inputText,
          role: 'dba',
          model: modelName,
          table_names: selectedTables,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      
      // Add AI response
      const aiResponse: Message = {
        id: Date.now() + 1,
        text: data.response,
        isUser: false,
      };
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Add error message to chat
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: "I apologize, but I'm having trouble connecting to the AI service. Please try again later.",
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Send message on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow new line on Shift + Enter
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = inputText.substring(0, start) + '\n' + inputText.substring(end);
        setInputText(newValue);
        
        // Use multiple requestAnimationFrame calls to ensure proper height adjustment
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          // First adjust height
          adjustTextareaHeight();
          // Then scroll to cursor in the next frame
          requestAnimationFrame(() => {
            scrollTextareaToCursor();
            // Final height adjustment to ensure proper sizing
            requestAnimationFrame(adjustTextareaHeight);
          });
        });
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    // Use requestAnimationFrame to ensure DOM updates before adjusting height
    requestAnimationFrame(adjustTextareaHeight);
  };

  const handleNewChat = () => {
    // Generate a new session ID
    const newSessionId = uuidv4();
    setCurrentSessionId(newSessionId);
    
    // Clear the current chat state
    setMessages([]);
    setInputText('');
    setSelectedTables([]);
  };

  const handleModelSelect = (model: ModelType) => {
    setSelectedModel(model);
    setShowModelSelector(false);
  };

  const handleSessionSelect = async (sessionId: string) => {
    try {
      const response = await fetch(`http://localhost:8008/history/${sessionId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch chat history');
      }
      const data = await response.json();
      
      // Convert history to messages format
      const historyMessages: Message[] = data.map((item: any) => [
        {
          id: Date.now() + Math.random(),
          text: item.message,
          isUser: true,
        },
        {
          id: Date.now() + Math.random() + 1,
          text: item.response,
          isUser: false,
        }
      ]).flat();
      
      setMessages(historyMessages);
      setShowHistoryList(false);
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleHistoryClick = () => {
    fetchSessions();
    setShowHistoryList(!showHistoryList);
  };

  if (!showChat) {
    return children;
  }

  const sidebarContent = (
    <div style={{ position: 'absolute', padding: 8 }} className="h-100 w-100">
      <div className={styles.chatContent}>
        <div className={styles.chatHeader}>
          <h3>Ask DataDynamics</h3>
          <div>
            <div style={{ position: 'relative' }} ref={historyDropdownRef}>
              <button 
                onClick={handleHistoryClick}
                className={styles.historyChatButton}
                title="History of chats"
              >
                History
              </button>
              {showHistoryList && (
                <div className={styles.historyDropdown}>
                  {sessions.length === 0 ? (
                    <div className={styles.noSessions}>No chat history</div>
                  ) : (
                    sessions.map(session => (
                      <div
                        key={session.session_id}
                        onClick={() => handleSessionSelect(session.session_id)}
                        className={styles.historyItem}
                      >
                        <div className={styles.historyItemHeader}>
                          <span className={styles.sessionId}>
                            {session.session_id}
                          </span>
                          {/* <span className={styles.model}>{session.model === 'bedrock' ? 'Claude Sonnet 4.0' : 'Llama 3.0'} </span> */}
                        </div>
                        <div className={styles.lastUpdated}>
                          {new Date(session.last_updated).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button 
              onClick={handleNewChat}
              className={styles.newChatButton}
              title="Start a new chat"
            >
              New Chat
            </button>
          </div>
        </div>
        <div className={styles.messageList} ref={messageListRef}>
          {/* <div className={styles.welcomeMessage}>
            Welcome! I'm your SQL assistant. I can help you with:
            <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
              <li>Writing and optimizing SQL queries</li>
              <li>Explaining query results</li>
              <li>Suggesting improvements</li>
              <li>Answering database questions</li>
            </ul>
          </div> */}
          {messages.map(message => (
            <div
              key={message.id}
              className={`${styles.message} ${message.isUser ? styles.userMessage : styles.aiMessage}`}
            >
              {formatMessage(message.text)}
            </div>
          ))}
        </div>
        <div className={styles.inputArea}>
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ position: 'relative' }} ref={dropdownRef}>
              <button
                onClick={() => setShowTableList(!showTableList)}
                className={styles.atButton}
              >
                @
              </button>
              {showTableList && (
                <div className={styles.dropdownMenu}>
                  {availableTables.map(table => (
                    <div
                      key={table.name}
                      onClick={() => handleTableSelect(table.name)}
                      className={styles.dropdownMenuItem}
                    >
                      {table.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              flexWrap: 'wrap',
              flex: 1
            }}>
              {selectedTables.map(tableName => (
                <div
                  key={tableName}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '1px 4px',
                    backgroundColor: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}
                >
                  {tableName}
                  <button
                    onClick={() => removeTable(tableName)}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '0 2px',
                      cursor: 'pointer',
                      color: '#666',
                      fontSize: '12px',
                      lineHeight: 1
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            placeholder="Type your message here..."
            className={styles.messageInput}
            rows={1}
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onKeyDown={handleKeyDown}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className={styles.modelSelector} ref={modelSelectorRef}>
              <button
                className={styles.modelSelectorButton}
                onClick={() => setShowModelSelector(!showModelSelector)}
              >
                {selectedModel}
                <span>▲</span>
              </button>
              {showModelSelector && (
                <div className={styles.modelSelectorDropdown}>
                  <div
                    className={styles.modelOption}
                    onClick={() => handleModelSelect('Auto')}
                  >
                    Auto
                  </div>
                  <div
                    className={styles.modelOption}
                    onClick={() => handleModelSelect('Claude Sonnet 4.0')}
                  >
                    Claude Sonnet 4.0
                  </div>
                  <div
                    className={styles.modelOption}
                    onClick={() => handleModelSelect('Llama 3.0')}
                  >
                    Llama 3.0
                  </div>
                </div>
              )}
            </div>
            <button 
              className={styles.sendButton}
              onClick={handleSendMessage}
            >
              Send
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <SplitPane
      split="vertical"
      primary="second"
      defaultSize={350}
      maxSize={800}
      minSize={250}
      onChange={() => {
        debouncedResizeChart(queryId);
        requestAnimationFrame(adjustTextareaHeight);
      }}
    >
      {children}
      {sidebarContent}
    </SplitPane>
  );
};

export default EditorPaneChatSidebar; 