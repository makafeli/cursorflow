/**
 * CursorFlow MCP - Browser Client Application
 * 
 * This file contains the JavaScript code for the browser-based client
 * that visualizes the Memory Bank components and provides an interface
 * for interacting with the MCP Server.
 */

// Application state
const state = {
  connected: false,
  connectionId: null,
  server: null,
  components: {},
  currentComponent: null,
  history: [],
  dark: localStorage.getItem('darkMode') === 'true',
  editors: {},
  socket: null,
  authToken: localStorage.getItem('authToken') || '',
  serverUrl: localStorage.getItem('serverUrl') || 'ws://localhost:3002',
  autoRefresh: localStorage.getItem('autoRefresh') === 'true',
  autoRefreshInterval: parseInt(localStorage.getItem('autoRefreshInterval') || '30', 10) * 1000,
  refreshTimer: null
};

// DOM elements
const elements = {
  connectBtn: document.getElementById('connectButton'),
  connectConfirmBtn: document.getElementById('connectConfirmBtn'),
  refreshBtn: document.getElementById('refreshBtn'),
  exportBtn: document.getElementById('exportBtn'),
  editBtn: document.getElementById('editBtn'),
  historyBtn: document.getElementById('historyBtn'),
  saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  componentTitle: document.getElementById('componentTitle'),
  componentLastUpdated: document.getElementById('componentLastUpdated'),
  historyPanel: document.getElementById('historyPanel'),
  historyList: document.getElementById('historyList'),
  memoryBankComponents: document.getElementById('memoryBankComponents'),
  activityFeed: document.getElementById('activityFeed'),
  componentEditor: document.getElementById('componentEditor'),
  serverUrl: document.getElementById('serverUrl'),
  authToken: document.getElementById('authToken'),
  darkModeSwitch: document.getElementById('darkModeSwitch'),
  enableRealTimeUpdates: document.getElementById('enableRealTimeUpdates'),
  refreshInterval: document.getElementById('refreshInterval'),
  mainTitle: document.getElementById('mainTitle'),
  componentContent: document.getElementById('componentContent'),
  analyticsContent: document.getElementById('analyticsContent'),
  toastMessage: document.getElementById('toastMessage'),
  notificationToast: document.getElementById('notificationToast')
};

// Initialize Monaco Editor
let monacoEditor = null;

// Initialize application
function initApp() {
  console.log('Initializing Memory Bank Visualizer app');
  
  // Check if DOM elements exist
  for (const key in elements) {
    if (!elements[key]) {
      console.warn(`Element '${key}' not found in the DOM`);
    }
  }
  
  // Set up event listeners
  if (elements.connectBtn) {
    elements.connectBtn.addEventListener('click', openConnectionModal);
    console.log('Added click listener to connectBtn');
  }
  
  if (elements.connectConfirmBtn) {
    elements.connectConfirmBtn.addEventListener('click', function() {
      console.log('Connect button clicked');
      connect();
    });
    console.log('Added click listener to connectConfirmBtn');
  }
  
  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', refreshData);
  }
  
  if (elements.exportBtn) {
    elements.exportBtn.addEventListener('click', exportData);
  }
  
  if (elements.editBtn) {
    elements.editBtn.addEventListener('click', toggleEditMode);
  }
  
  if (elements.historyBtn) {
    elements.historyBtn.addEventListener('click', toggleHistoryPanel);
  }
  
  if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener('click', saveSettings);
  }
  
  if (elements.settingsBtn) {
    elements.settingsBtn.addEventListener('click', openSettingsModal);
  }
  
  // Setup component menu clicks
  setupComponentMenuListeners();
  
  // Initialize Monaco Editor
  initMonacoEditor();
  
  // Apply initial dark mode
  if (state.dark) {
    document.body.classList.add('dark-mode');
    if (elements.darkModeSwitch) {
      elements.darkModeSwitch.checked = true;
    }
  }
  
  // Set initial values for connection settings
  if (elements.serverUrl) {
    // Handle URL formatting to remove ws:// protocol
    const savedUrl = state.serverUrl.replace(/^(wss?:\/\/)/, '');
    elements.serverUrl.value = savedUrl;
    console.log('Set server URL input to:', savedUrl);
  }
  
  if (elements.authToken) {
    elements.authToken.value = state.authToken;
  }
  
  if (elements.refreshInterval) {
    elements.refreshInterval.value = state.autoRefreshInterval / 1000;
  }
  
  // Initialize the analytics charts
  initCharts();
  
  // Show a welcome message after a delay to ensure DOM is fully loaded
  setTimeout(() => {
    showToast('Welcome to the Memory Bank Visualizer!', 'info');
    
    // Auto-connect if enabled and we have server details
    const shouldAutoConnect = localStorage.getItem('autoConnect') === 'true';
    if (shouldAutoConnect && state.serverUrl) {
      console.log('Auto-connecting to server:', state.serverUrl);
      setTimeout(() => {
        if (elements.serverUrl && elements.authToken) {
          connect();
        }
      }, 1000);
    }
  }, 500);
}

// Setup component menu listeners
function setupComponentMenuListeners() {
  if (elements.memoryBankComponents) {
    const links = elements.memoryBankComponents.querySelectorAll('a.nav-link');
    links.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const component = link.getAttribute('data-component');
        if (component) {
          loadComponent(component);
          // Update active state
          links.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    });
  }
}

// Initialize the Monaco Editor
function initMonacoEditor() {
  if (!elements.componentEditor) return;
  
  require.config({
    paths: {
      'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs'
    }
  });
  
  require(['vs/editor/editor.main'], function() {
    monacoEditor = monaco.editor.create(elements.componentEditor, {
      value: '// Select a component to edit it',
      language: 'markdown',
      theme: state.dark ? 'vs-dark' : 'vs',
      automaticLayout: true,
      scrollBeyondLastLine: false,
      minimap: { enabled: true },
      readOnly: true // Start in read-only mode
    });
  });
}

// Open connection modal
function openConnectionModal() {
  console.log('Opening connection modal');
  const modalElement = document.getElementById('connectionModal');
  if (!modalElement) {
    console.error('Connection modal element not found!');
    return;
  }
  
  try {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  } catch (e) {
    console.error('Error opening connection modal:', e);
    showToast('Error opening connection dialog', 'error');
  }
}

// Open settings modal
function openSettingsModal() {
  console.log('Opening settings modal');
  const modalElement = document.getElementById('settingsModal');
  if (!modalElement) {
    console.error('Settings modal element not found!');
    return;
  }
  
  try {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  } catch (e) {
    console.error('Error opening settings modal:', e);
    showToast('Error opening settings dialog', 'error');
  }
}

// Refresh data
function refreshData() {
  if (state.connected) {
    fetchMemoryBankComponents();
    showToast('Refreshing data...', 'info');
  } else {
    showToast('Not connected to server', 'warning');
  }
}

// Export data
function exportData() {
  if (!state.currentComponent) {
    showToast('No component selected', 'warning');
    return;
  }
  
  const content = state.currentComponent.content;
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentComponent.name}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast(`Exported ${state.currentComponent.name}`, 'success');
}

// Toggle edit mode
function toggleEditMode() {
  if (!monacoEditor || !state.currentComponent) {
    showToast('No component selected', 'warning');
    return;
  }
  
  const isReadOnly = monacoEditor.getOption(monaco.editor.EditorOption.readOnly);
  monacoEditor.updateOptions({ readOnly: !isReadOnly });
  
  if (isReadOnly) {
    elements.editBtn.innerHTML = '<i class="bi bi-check"></i> Save';
    elements.editBtn.classList.remove('btn-outline-primary');
    elements.editBtn.classList.add('btn-primary');
    showToast('Edit mode enabled', 'info');
  } else {
    // Save changes
    const content = monacoEditor.getValue();
    updateComponent(state.currentComponent.id, content);
    
    elements.editBtn.innerHTML = '<i class="bi bi-pencil"></i> Edit';
    elements.editBtn.classList.remove('btn-primary');
    elements.editBtn.classList.add('btn-outline-primary');
  }
}

// Toggle history panel
function toggleHistoryPanel() {
  if (elements.historyPanel) {
    const isVisible = elements.historyPanel.style.display !== 'none';
    elements.historyPanel.style.display = isVisible ? 'none' : 'block';
    
    if (!isVisible && state.currentComponent) {
      fetchComponentHistory(state.currentComponent.id);
    }
  }
}

// Initialize the analytics charts
function initCharts() {
  // Create charts here when we have the analytics section ready
  const charts = [
    { id: 'componentSizeChart', type: 'bar' },
    { id: 'updateFrequencyChart', type: 'bar' },
    { id: 'activityTimelineChart', type: 'line' }
  ];
  
  charts.forEach(chart => {
    const ctx = document.getElementById(chart.id);
    if (ctx) {
      new Chart(ctx, {
        type: chart.type,
        data: {
          labels: ['Sample'],
          datasets: [{
            label: 'Sample Data',
            data: [0],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          scales: {
            y: {
              beginAtZero: true
            }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  });
}

// Connect to the MCP server
function connect() {
  const serverInput = elements.serverUrl.value.trim();
  const token = elements.authToken.value.trim();
  
  if (!serverInput) {
    showToast('Please enter a server URL', 'error');
    return;
  }
  
  // Make sure URL has ws:// prefix and no trailing slashes
  let serverUrl = serverInput;
  if (!serverUrl.startsWith('ws://') && !serverUrl.startsWith('wss://')) {
    serverUrl = 'ws://' + serverUrl;
  }
  // Remove trailing slash if present
  serverUrl = serverUrl.replace(/\/$/, '');
  
  console.log('Attempting to connect to:', serverUrl);
  
  // Close any existing connection
  if (state.socket) {
    state.socket.close();
    state.socket = null;
  }
  
  // Update UI to show connecting state
  elements.connectBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Connecting...';
  elements.connectBtn.disabled = true;
  
  // Create WebSocket connection with timeout
  let connectionTimeout;
  
  try {
    state.socket = new WebSocket(serverUrl);
    
    // Set connection timeout (5 seconds)
    connectionTimeout = setTimeout(() => {
      if (state.socket && state.socket.readyState !== WebSocket.OPEN) {
        console.error('WebSocket connection timeout');
        state.socket.close();
        handleDisconnect(false);
        showToast('Connection timeout. Server not responding.', 'error');
      }
    }, 5000);
    
    // Connection opened
    state.socket.addEventListener('open', (event) => {
      clearTimeout(connectionTimeout);
      console.log('Connected to server');
      state.connected = true;
      elements.connectBtn.innerHTML = '<i class="bi bi-plug-fill"></i> Connected';
      elements.connectBtn.classList.remove('btn-outline-light');
      elements.connectBtn.classList.add('btn-light');
      elements.connectBtn.disabled = false;
      
      // Close the connection modal if it's open
      const modal = bootstrap.Modal.getInstance(document.getElementById('connectionModal'));
      if (modal) modal.hide();
      
      // Save connection settings
      state.serverUrl = serverUrl;
      state.authToken = token;
      localStorage.setItem('serverUrl', state.serverUrl);
      localStorage.setItem('authToken', state.authToken);
      localStorage.setItem('autoConnect', document.getElementById('autoConnectToggle').checked);
      
      // Authenticate if token is provided
      if (token) {
        authenticate(token);
      } else {
        // If no token, immediately try to get resources
        fetchMemoryBankComponents();
      }
    });
    
    // Listen for messages
    state.socket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data);
        handleMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error);
        showToast('Error parsing server message', 'error');
      }
    });
    
    // Connection closed
    state.socket.addEventListener('close', (event) => {
      clearTimeout(connectionTimeout);
      console.log('Connection closed:', event.code, event.reason);
      handleDisconnect(event.wasClean);
    });
    
    // Connection error
    state.socket.addEventListener('error', (event) => {
      clearTimeout(connectionTimeout);
      console.error('WebSocket error:', event);
      showToast('Connection error. Check if the server is running.', 'error');
      handleDisconnect(false);
    });
  } catch (error) {
    clearTimeout(connectionTimeout);
    console.error('Failed to connect:', error);
    handleDisconnect(false);
    showToast('Failed to connect: ' + error.message, 'error');
  }
}

// Handle server disconnect
function handleDisconnect(wasClean) {
  state.connected = false;
  state.connectionId = null;
  state.socket = null;
  
  // Update UI
  elements.connectBtn.innerHTML = '<i class="bi bi-plug"></i> Connect';
  elements.connectBtn.classList.remove('btn-light');
  elements.connectBtn.classList.add('btn-outline-light');
  elements.connectBtn.disabled = false;
  
  // Show message
  if (!wasClean) {
    showToast('Connection to server lost', 'error');
  }
}

// Authenticate with the server
function authenticate(token) {
  if (!state.connected || !state.socket) return;
  
  const authMessage = {
    type: 'authenticate',
    token: token,
    requestId: generateRequestId()
  };
  
  state.socket.send(JSON.stringify(authMessage));
}

// Fetch Memory Bank components
function fetchMemoryBankComponents() {
  if (!state.connected || !state.socket) return;
  
  const message = {
    type: 'getResource',
    resourceId: 'memory-bank',
    params: {},
    requestId: generateRequestId()
  };
  
  state.socket.send(JSON.stringify(message));
  addActivity('Requesting Memory Bank components');
}

// Fetch component history
function fetchComponentHistory(componentId) {
  if (!state.connected || !state.socket) return;
  
  const message = {
    type: 'getResource',
    resourceId: 'memory-bank/history',
    params: {
      componentName: componentId
    },
    requestId: generateRequestId()
  };
  
  state.socket.send(JSON.stringify(message));
  addActivity(`Requesting history for ${componentId}`);
}

// Update a Memory Bank component
function updateComponent(componentId, content) {
  if (!state.connected || !state.socket) {
    showToast('Not connected to server', 'warning');
    return;
  }
  
  const message = {
    type: 'executeTool',
    toolId: 'updateMemoryBank',
    params: {
      componentName: componentId,
      content: content
    },
    requestId: generateRequestId()
  };
  
  state.socket.send(JSON.stringify(message));
  addActivity(`Updating component: ${componentId}`);
}

// Handle incoming messages from the server
function handleMessage(message) {
  console.log('Received message:', message);
  
  switch (message.type) {
    case 'welcome':
      state.connectionId = message.connectionId;
      state.server = message.server;
      addActivity(`Connected to ${message.server} v${message.version}`);
      showToast(`Connected to ${message.server}`, 'success');
      break;
      
    case 'authenticationResult':
      if (message.success) {
        showToast('Authentication successful', 'success');
        fetchMemoryBankComponents();
      } else {
        showToast('Authentication failed: ' + message.error, 'error');
        handleDisconnect(true);
      }
      break;
      
    case 'resource':
      if (message.resourceId === 'memory-bank') {
        handleMemoryBankResource(message.data);
      } else if (message.resourceId === 'memory-bank/history') {
        handleMemoryBankHistory(message.data);
      }
      break;
      
    case 'toolExecution':
      if (message.toolId === 'updateMemoryBank') {
        handleComponentUpdate(message.result);
      }
      break;
      
    case 'error':
      console.error('Server error:', message);
      showToast(`Error: ${message.error} (${message.code})`, 'error');
      break;
      
    default:
      console.log('Unhandled message type:', message.type);
  }
}

// Handle Memory Bank resource data
function handleMemoryBankResource(data) {
  if (!data || !data.components) return;
  
  state.components = data.components;
  
  // Update components list
  updateComponentsList();
  
  // If we have a current component, refresh it
  if (state.currentComponent && state.components[state.currentComponent.id]) {
    loadComponent(state.currentComponent.id);
  } else if (Object.keys(state.components).length > 0) {
    // Otherwise, load the first component
    loadComponent(Object.keys(state.components)[0]);
  }
  
  addActivity('Loaded Memory Bank components');
  showToast('Memory Bank components loaded', 'success');
}

// Handle Memory Bank history data
function handleMemoryBankHistory(data) {
  if (!data || !data.history) return;
  
  state.history = data.history;
  
  // Update version history panel
  updateVersionHistory();
  
  addActivity(`Loaded history for ${data.componentName}`);
}

// Handle component update result
function handleComponentUpdate(result) {
  if (result.success) {
    showToast(`Component "${result.component.name}" updated successfully`, 'success');
    
    // Update the component in our state
    if (state.components[result.component.id]) {
      state.components[result.component.id] = result.component;
      
      // If this is the current component, refresh the editor
      if (state.currentComponent && state.currentComponent.id === result.component.id) {
        state.currentComponent = result.component;
        
        // Switch back to read-only mode
        if (monacoEditor) {
          monacoEditor.updateOptions({ readOnly: true });
        }
        
        elements.editBtn.innerHTML = '<i class="bi bi-pencil"></i> Edit';
        elements.editBtn.classList.remove('btn-primary');
        elements.editBtn.classList.add('btn-outline-primary');
      }
    }
    
    addActivity(`Updated component: ${result.component.name}`);
    
    // Refresh component history
    fetchComponentHistory(result.component.id);
  } else {
    showToast(`Failed to update component: ${result.message}`, 'error');
  }
}

// Update the components list in the sidebar
function updateComponentsList() {
  const list = elements.memoryBankComponents;
  if (!list) return;
  
  // Clear all existing active states
  const links = list.querySelectorAll('a.nav-link');
  links.forEach(link => {
    const component = link.getAttribute('data-component');
    if (component && state.components[component]) {
      // Update the component info
      link.classList.remove('active');
    } else {
      // This component is not in the data
      link.style.opacity = '0.5';
    }
  });
  
  // If there's a current component, mark it as active
  if (state.currentComponent) {
    const activeLink = list.querySelector(`a[data-component="${state.currentComponent.id}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
}

// Load a component into the editor
function loadComponent(componentId) {
  const component = state.components[componentId];
  if (!component) return;
  
  // Update state
  state.currentComponent = component;
  
  // Update UI
  if (elements.componentTitle) {
    elements.componentTitle.textContent = component.name;
  }
  
  if (elements.componentLastUpdated) {
    elements.componentLastUpdated.textContent = `Last updated: ${formatDate(component.lastUpdated)}`;
  }
  
  // Update editor content
  if (monacoEditor) {
    monacoEditor.setValue(component.content);
    monacoEditor.updateOptions({ readOnly: true });
  }
  
  // Update active component in sidebar
  updateComponentsList();
  
  // Fetch component history
  fetchComponentHistory(componentId);
  
  addActivity(`Loaded component: ${component.name}`);
}

// Update the version history panel
function updateVersionHistory() {
  if (!elements.historyList) return;
  
  elements.historyList.innerHTML = '';
  
  if (!state.history || state.history.length === 0) {
    elements.historyList.innerHTML = '<div class="p-3 text-muted">No history available</div>';
    return;
  }
  
  state.history.forEach(version => {
    const item = document.createElement('a');
    item.href = '#';
    item.className = 'list-group-item list-group-item-action';
    item.innerHTML = `
      <div class="d-flex w-100 justify-content-between">
        <h6 class="mb-1">${version.preview}</h6>
        <small>${formatDate(version.timestamp)}</small>
      </div>
    `;
    
    item.addEventListener('click', (e) => {
      e.preventDefault();
      showHistoryDiff(version.content);
    });
    
    elements.historyList.appendChild(item);
  });
}

// Show a diff view of current vs. historical content
function showHistoryDiff(historicalContent) {
  if (!monacoEditor || !state.currentComponent) return;
  
  // Store the current model and editor instance
  const currentEditor = monacoEditor;
  const container = elements.componentEditor;
  
  // Create models for diff editor
  const originalModel = monaco.editor.createModel(historicalContent, 'markdown');
  const modifiedModel = monaco.editor.createModel(state.currentComponent.content, 'markdown');
  
  // Create diff editor in the same container
  container.innerHTML = '';
  const diffEditor = monaco.editor.createDiffEditor(container, {
    automaticLayout: true,
    readOnly: true,
    theme: state.dark ? 'vs-dark' : 'vs'
  });
  
  diffEditor.setModel({
    original: originalModel,
    modified: modifiedModel
  });
  
  // Add button to go back to normal editing
  const backBtn = document.createElement('button');
  backBtn.className = 'btn btn-sm btn-secondary position-absolute top-0 end-0 m-2 z-3';
  backBtn.textContent = 'Back to Editor';
  backBtn.addEventListener('click', () => {
    // Restore original editor
    container.innerHTML = '';
    initMonacoEditor();
    if (monacoEditor) {
      monacoEditor.setValue(state.currentComponent.content);
    }
    backBtn.remove();
  });
  
  container.appendChild(backBtn);
}

// Save settings
function saveSettings() {
  // Get settings values
  const refreshInterval = elements.refreshInterval ? parseInt(elements.refreshInterval.value, 10) : 30;
  const enableRealTime = elements.enableRealTimeUpdates ? elements.enableRealTimeUpdates.checked : true;
  const darkMode = elements.darkModeSwitch ? elements.darkModeSwitch.checked : false;
  
  // Save to state and localStorage
  state.autoRefreshInterval = refreshInterval * 1000;
  state.dark = darkMode;
  
  localStorage.setItem('autoRefreshInterval', refreshInterval);
  localStorage.setItem('enableRealTimeUpdates', enableRealTime);
  localStorage.setItem('darkMode', darkMode);
  
  // Apply settings
  if (darkMode) {
    document.body.classList.add('dark-mode');
    if (monacoEditor) {
      monaco.editor.setTheme('vs-dark');
    }
  } else {
    document.body.classList.remove('dark-mode');
    if (monacoEditor) {
      monaco.editor.setTheme('vs');
    }
  }
  
  // Hide the modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
  if (modal) modal.hide();
  
  showToast('Settings saved', 'success');
}

// Add an activity to the feed
function addActivity(message) {
  if (!elements.activityFeed) return;
  
  const timestamp = new Date();
  const item = document.createElement('li');
  item.className = 'nav-item';
  item.innerHTML = `
    <a class="nav-link ps-3 text-nowrap" href="#">
      <small class="d-block text-muted">${formatTime(timestamp)}</small>
      <span class="activity-message">${message}</span>
    </a>
  `;
  
  elements.activityFeed.prepend(item);
  
  // Limit activity feed items
  const items = elements.activityFeed.querySelectorAll('.nav-item');
  if (items.length > 20) {
    for (let i = 20; i < items.length; i++) {
      items[i].remove();
    }
  }
}

// Show a toast notification
function showToast(message, type = 'info') {
  console.log(`Toast notification: ${type} - ${message}`);
  
  if (!elements.notificationToast || !elements.toastMessage) {
    console.warn('Toast elements not found, showing console message instead');
    return;
  }
  
  try {
    // Set toast content
    elements.toastMessage.textContent = message;
    
    // Remove existing color classes
    elements.notificationToast.className = 'toast align-items-center text-white border-0';
    
    // Add appropriate color class
    switch (type) {
      case 'success':
        elements.notificationToast.classList.add('bg-success');
        break;
      case 'error':
        elements.notificationToast.classList.add('bg-danger');
        break;
      case 'warning':
        elements.notificationToast.classList.add('bg-warning');
        break;
      case 'info':
      default:
        elements.notificationToast.classList.add('bg-primary');
    }
    
    // Show the toast
    try {
      const toastInstance = bootstrap.Toast.getOrCreateInstance(elements.notificationToast, {
        delay: 5000,
        autohide: true
      });
      toastInstance.show();
    } catch (err) {
      console.error('Error showing toast notification:', err);
    }
  } catch (e) {
    console.error('Error displaying toast notification:', e);
  }
}

// Generate a random request ID
function generateRequestId() {
  return 'req_' + Math.random().toString(36).substring(2, 15);
}

// Format a date for display
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString || 'Unknown';
  }
}

// Format a time for display
function formatTime(date) {
  return date.toLocaleTimeString();
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initApp); 