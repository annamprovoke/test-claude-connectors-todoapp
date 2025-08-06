import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle, Circle, Settings, RefreshCw, ExternalLink, LogOut, LogIn } from 'lucide-react';

// ============================================
// CONFIGURATION SECTION
// ============================================
const SUPABASE_CONFIG = {
  url: 'https://sfoezehnnkqgqguehugn.supabase.co',  // 👈 PUT YOUR SUPABASE URL HERE
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmb2V6ZWhubmtxZ3FndWVodWduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0OTUwMDYsImV4cCI6MjA3MDA3MTAwNn0.pSR-VdsSF0uqzRn8Pysr8-WknBZQ4DPc6v7EsqbuLRE',               // 👈 PUT YOUR ANON KEY HERE
};

const hasRealSupabaseCredentials = 
  SUPABASE_CONFIG.url !== 'https://your-project-id.supabase.co' && 
  SUPABASE_CONFIG.anonKey !== 'your-anon-key-here';

// ============================================
// MOCK SUPABASE CLIENT
// ============================================
const createMockSupabase = () => {
  let currentUser = null;
  let todos = [];
  let jiraConfig = null;

  console.log('🏗️ Creating mock Supabase client');

  return {
    auth: {
      getSession: async () => {
        console.log('📋 getSession called, currentUser:', currentUser);
        return { data: { session: currentUser ? { user: currentUser } : null } };
      },
      signUp: async ({ email, password }) => {
        console.log('📝 Mock signUp called with:', { email, password });
        const user = { 
          id: `user_${Date.now()}`, 
          email, 
          created_at: new Date().toISOString() 
        };
        currentUser = user;
        console.log('✅ Mock user created:', user);
        return { data: { user }, error: null };
      },
      signInWithPassword: async ({ email, password }) => {
        console.log('🔑 Mock signIn called with:', { email, password });
        const user = { 
          id: `user_${Date.now()}`, 
          email, 
          created_at: new Date().toISOString() 
        };
        currentUser = user;
        console.log('✅ Mock user signed in:', user);
        return { data: { user }, error: null };
      },
      signOut: async () => {
        console.log('👋 Mock signOut called');
        currentUser = null;
        todos = [];
        jiraConfig = null;
        return { error: null };
      }
    },
    from: (table) => ({
      select: () => ({
        eq: () => {
          console.log(`📊 Mock select from ${table}`);
          return Promise.resolve({ data: table === 'todos' ? todos : [], error: null });
        }
      }),
      insert: (data) => {
        console.log(`➕ Mock insert into ${table}:`, data);
        if (table === 'todos') {
          const newTodo = { 
            ...data[0], 
            id: `todo_${Date.now()}`, 
            created_at: new Date().toISOString() 
          };
          todos.push(newTodo);
          console.log('✅ Todo added:', newTodo);
          return Promise.resolve({ data: [newTodo], error: null });
        }
        return Promise.resolve({ data: [data[0]], error: null });
      },
      update: (data) => ({
        eq: (field, value) => {
          console.log(`🔄 Mock update in ${table}:`, { field, value, data });
          if (table === 'todos') {
            const todo = todos.find(t => t.id === value);
            if (todo) {
              Object.assign(todo, data);
              console.log('✅ Todo updated:', todo);
            }
          }
          return Promise.resolve({ data: [], error: null });
        }
      }),
      delete: () => ({
        eq: (field, value) => {
          console.log(`🗑️ Mock delete from ${table}:`, { field, value });
          if (table === 'todos') {
            todos = todos.filter(t => t.id !== value);
            console.log('✅ Todo deleted, remaining:', todos.length);
          }
          return Promise.resolve({ data: [], error: null });
        }
      }),
      upsert: (data) => {
        console.log(`🔄 Mock upsert into ${table}:`, data);
        if (table === 'jira_configurations') {
          jiraConfig = { ...data, id: `config_${Date.now()}` };
          console.log('✅ Jira config saved:', jiraConfig);
        }
        return Promise.resolve({ data: [data], error: null });
      }
    })
  };
};

// ============================================
// UI COMPONENTS SECTION
// ============================================

// Loading Spinner Component
const LoadingSpinner = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg flex items-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
        <p>Loading...</p>
      </div>
    </div>
  );
};

// Todo Statistics Component
const TodoStats = ({ todos }) => {
  if (todos.length === 0) return null;

  return (
    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">{todos.length}</p>
          <p className="text-sm text-gray-600">Total Tasks</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-green-600">
            {todos.filter(t => t.completed).length}
          </p>
          <p className="text-sm text-gray-600">Completed</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-orange-600">
            {todos.filter(t => t.jira_issue_key).length}
          </p>
          <p className="text-sm text-gray-600">Jira Issues</p>
        </div>
      </div>
    </div>
  );
};

// Individual Todo Item Component
const TodoItem = ({ todo, toggleTodo, deleteTodo }) => {
  return (
    <div
      className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${
        todo.completed 
          ? 'bg-gray-50 border-gray-200' 
          : 'bg-white border-gray-300'
      }`}
    >
      <button
        onClick={() => toggleTodo(todo.id)}
        className={`flex-shrink-0 ${
          todo.completed ? 'text-green-600' : 'text-gray-400'
        } hover:text-green-700`}
      >
        {todo.completed ? (
          <CheckCircle className="w-6 h-6" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </button>
      
      <div className="flex-1 min-w-0">
        <p className={`${
          todo.completed 
            ? 'line-through text-gray-500' 
            : 'text-gray-900'
        }`}>
          {todo.text}
        </p>
        {todo.jira_issue_key && (
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {todo.jira_issue_key}
            </span>
            <span className="text-xs text-gray-500">
              Status: {todo.jira_status}
            </span>
            {todo.jira_url && (
              <a
                href={todo.jira_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>
      
      <button
        onClick={() => deleteTodo(todo.id)}
        className="flex-shrink-0 text-red-500 hover:text-red-700 p-1"
      >
        <Trash2 className="w-5 h-5" />
      </button>
    </div>
  );
};

// Todo List Component
const TodoList = ({ todos, toggleTodo, deleteTodo }) => {
  if (todos.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No todos yet. Add one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          toggleTodo={toggleTodo}
          deleteTodo={deleteTodo}
        />
      ))}
    </div>
  );
};

// Add Todo Form Component
const AddTodoForm = ({ 
  newTodo, 
  setNewTodo, 
  addTodo, 
  isLoading, 
  jiraConfig 
}) => {
  return (
    <div className="mb-6">
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo(newTodo)}
          placeholder="Add a new todo..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={() => addTodo(newTodo)}
          disabled={isLoading || !newTodo.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Local
        </button>
        <button
          onClick={() => addTodo(newTodo, true)}
          disabled={isLoading || !newTodo.trim() || !jiraConfig.baseUrl}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add to Jira
        </button>
      </div>
    </div>
  );
};

// Jira Configuration Component
const JiraConfig = ({ 
  jiraConfig, 
  updateJiraConfig, 
  saveJiraConfig, 
  showConfig, 
  setShowConfig, 
  isLoading, 
  connectionStatus 
}) => {
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Jira Integration</h2>
          {connectionStatus && (
            <span className="text-sm text-green-600 font-medium">{connectionStatus}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveJiraConfig}
            disabled={isLoading}
            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 text-sm"
          >
            Save Config
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-1 text-sm"
          >
            <Settings className="w-4 h-4" />
            {showConfig ? 'Hide' : 'Show'} Config
          </button>
        </div>
      </div>

      {showConfig && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Jira Base URL (e.g., https://company.atlassian.net)"
              value={jiraConfig.baseUrl}
              onChange={(e) => updateJiraConfig('baseUrl', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Project Key (e.g., PROJ)"
              value={jiraConfig.projectKey}
              onChange={(e) => updateJiraConfig('projectKey', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email"
              value={jiraConfig.email}
              onChange={(e) => updateJiraConfig('email', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder="API Token"
              value={jiraConfig.apiToken}
              onChange={(e) => updateJiraConfig('apiToken', e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Authentication Form Component
const AuthForm = ({ 
  authForm, 
  setAuthForm, 
  handleAuth, 
  isLoading, 
  error, 
  hasRealCredentials 
}) => {
  return (
    <form onSubmit={handleAuth} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-blue-800 text-sm">
          <strong>Note:</strong> This is for app authentication (not Jira login). 
          {!hasRealCredentials && " In demo mode, use any email/password."}
        </p>
      </div>
      
      <input
        type="email"
        placeholder={hasRealCredentials ? "Your email" : "Any email (demo@example.com)"}
        value={authForm.email}
        onChange={(e) => setAuthForm({...authForm, email: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      
      <input
        type="password"
        placeholder={hasRealCredentials ? "Your password" : "Any password (demo123)"}
        value={authForm.password}
        onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        required
      />
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Please wait...' : (authForm.isSignUp ? 'Sign Up' : 'Sign In')}
        </button>
        
        <button
          type="button"
          onClick={() => setAuthForm({...authForm, isSignUp: !authForm.isSignUp})}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          {authForm.isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
      
      <button
        type="button"
        onClick={() => {
          setAuthForm({ email: 'demo@test.com', password: 'demo123', isSignUp: false });
        }}
        className="w-full px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50"
      >
        Fill Demo Credentials
      </button>
    </form>
  );
};

// ============================================
// MAIN APPLICATION COMPONENT
// ============================================
function JiraTodoApp() {
  // Initialize Supabase client
  const [supabase] = useState(() => createMockSupabase());
  
  // Authentication state
  const [user, setUser] = useState(null);
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    isSignUp: false
  });
  
  // Todo management state
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  
  // Jira configuration state
  const [jiraConfig, setJiraConfig] = useState({
    baseUrl: '',
    email: '',
    apiToken: '',
    projectKey: ''
  });
  
  // UI state
  const [showConfig, setShowConfig] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('');

  // ============================================
  // AUTHENTICATION LOGIC
  // ============================================
  
  // Check authentication status on load
  useEffect(() => {
    checkUser();
  }, []);

  // Load user data when authenticated
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Load todos
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id);
      
      setTodos(todosData || []);

      // Load Jira configuration
      const { data: configData } = await supabase
        .from('jira_configurations')
        .select('*')
        .eq('user_id', user.id);

      if (configData && configData.length > 0) {
        const config = configData[0];
        setJiraConfig({
          baseUrl: config.base_url || '',
          email: config.email || '',
          apiToken: config.api_token || '',
          projectKey: config.project_key || ''
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    console.log('🔄 Starting authentication...', authForm);
    setIsLoading(true);
    setError('');

    try {
      let result;
      
      if (authForm.isSignUp) {
        console.log('📝 Attempting sign up...');
        result = await supabase.auth.signUp({
          email: authForm.email,
          password: authForm.password,
        });
      } else {
        console.log('🔑 Attempting sign in...');
        result = await supabase.auth.signInWithPassword({
          email: authForm.email,
          password: authForm.password,
        });
      }

      console.log('📊 Auth result:', result);

      if (result.error) {
        console.error('❌ Auth error:', result.error);
        throw result.error;
      }
      
      if (result.data && result.data.user) {
        console.log('✅ User authenticated:', result.data.user);
        setUser(result.data.user);
        setShowAuth(false);
        setAuthForm({ email: '', password: '', isSignUp: false });
        console.log('🎉 Authentication successful!');
      } else {
        console.error('❌ No user data returned');
        throw new Error('Authentication failed - no user data returned');
      }
    } catch (error) {
      console.error('💥 Authentication error:', error);
      setError(error.message || 'Authentication failed');
    }
    
    setIsLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setTodos([]);
    setJiraConfig({ baseUrl: '', email: '', apiToken: '', projectKey: '' });
    setConnectionStatus('');
  };

  // ============================================
  // JIRA CONFIGURATION LOGIC
  // ============================================
  
  const saveJiraConfig = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('jira_configurations')
        .upsert({
          user_id: user.id,
          base_url: jiraConfig.baseUrl,
          email: jiraConfig.email,
          api_token: jiraConfig.apiToken,
          project_key: jiraConfig.projectKey,
          is_active: true
        });

      if (error) throw error;
      setConnectionStatus('✅ Configuration saved');
    } catch (error) {
      setError('Failed to save Jira configuration');
    }
  };

  const updateJiraConfig = (field, value) => {
    setJiraConfig({ ...jiraConfig, [field]: value });
  };

  // ============================================
  // TODO MANAGEMENT LOGIC
  // ============================================
  
  const addTodo = async (text, createInJira = false) => {
    if (!text.trim() || !user) return;

    setIsLoading(true);
    try {
      const todoData = {
        user_id: user.id,
        text,
        completed: false
      };

      // If creating in Jira, add Jira fields (mock implementation)
      if (createInJira && jiraConfig.baseUrl) {
        todoData.jira_issue_key = `${jiraConfig.projectKey}-${Math.floor(Math.random() * 1000)}`;
        todoData.jira_status = 'To Do';
        todoData.jira_url = `${jiraConfig.baseUrl}/browse/${todoData.jira_issue_key}`;
      }

      const { data, error } = await supabase
        .from('todos')
        .insert([todoData])
        .select();

      if (error) throw error;
      
      setTodos([...todos, data[0]]);
      setNewTodo('');
    } catch (error) {
      setError('Failed to add todo');
    }
    setIsLoading(false);
  };

  const toggleTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
    } catch (error) {
      setError('Failed to update todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTodos(todos.filter(t => t.id !== id));
    } catch (error) {
      setError('Failed to delete todo');
    }
  };

  // ============================================
  // RENDER LOGIC
  // ============================================
  
  // Show authentication screen if not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 bg-white border border-gray-200 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center mb-6">Jira Todo App</h1>
        
        {/* Setup instructions if no real Supabase credentials */}
        {!hasRealSupabaseCredentials && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">🔧 Setup Required</h3>
            <p className="text-yellow-700 text-sm mb-2">
              To enable real authentication, add your Supabase credentials at the top of the code:
            </p>
            <div className="bg-yellow-100 p-2 rounded text-xs font-mono text-yellow-800">
              <div>SUPABASE_CONFIG.url = 'https://your-project-id.supabase.co'</div>
              <div>SUPABASE_CONFIG.anonKey = 'your-anon-key-here'</div>
            </div>
            <p className="text-yellow-700 text-sm mt-2">
              <strong>For now:</strong> Use any email/password to test the demo
            </p>
          </div>
        )}
        
        {!showAuth ? (
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              {hasRealSupabaseCredentials 
                ? "Sign in to your account or create a new one" 
                : "Demo Mode: Use any email/password to test"
              }
            </p>
            <button
              onClick={() => setShowAuth(true)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {hasRealSupabaseCredentials ? "Sign In / Sign Up" : "Start Demo"}
            </button>
          </div>
        ) : (
          <>
            <AuthForm 
              authForm={authForm}
              setAuthForm={setAuthForm}
              handleAuth={handleAuth}
              isLoading={isLoading}
              error={error}
              hasRealCredentials={hasRealSupabaseCredentials}
            />
            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 mt-4"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    );
  }

  // Main application interface
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white min-h-screen">
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Jira Todo App</h1>
          <p className="text-gray-600">Welcome back, {user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Configuration Notice */}
      {!jiraConfig.baseUrl && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-yellow-800 mb-2">🔧 Setup Required</h3>
          <p className="text-yellow-700 text-sm mb-3">
            Add your Supabase credentials at the top of the code to enable full functionality:
          </p>
          <div className="bg-yellow-100 p-2 rounded text-xs font-mono text-yellow-800">
            <div>SUPABASE_CONFIG.url = 'https://your-project-id.supabase.co'</div>
            <div>SUPABASE_CONFIG.anonKey = 'your-anon-key-here'</div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p className="font-semibold">Error: {error}</p>
        </div>
      )}

      {/* Jira Configuration */}
      <JiraConfig 
        jiraConfig={jiraConfig}
        updateJiraConfig={updateJiraConfig}
        saveJiraConfig={saveJiraConfig}
        showConfig={showConfig}
        setShowConfig={setShowConfig}
        isLoading={isLoading}
        connectionStatus={connectionStatus}
      />

      {/* Add Todo Form */}
      <AddTodoForm 
        newTodo={newTodo}
        setNewTodo={setNewTodo}
        addTodo={addTodo}
        isLoading={isLoading}
        jiraConfig={jiraConfig}
      />

      {/* Todo List */}
      <TodoList 
        todos={todos}
        toggleTodo={toggleTodo}
        deleteTodo={deleteTodo}
      />

      {/* Statistics */}
      <TodoStats todos={todos} />

      {/* Loading Spinner */}
      <LoadingSpinner isLoading={isLoading} />
    </div>
  );
}

export default JiraTodoApp;
