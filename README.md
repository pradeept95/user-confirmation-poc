# FastAPI + React AI Agent POC

## 🚀 Overview

A modern human-in-the-loop AI agent system with real-time WebSocket communication, built with **FastAPI** and **React**. The system allows AI agents to request user confirmation before executing actions, collect dynamic input, and maintain persistent sessions.

## ✨ Key Features

- 🤖 **AI Agent Integration** - Azure OpenAI/Ollama powered agents with web search capabilities
- 👤 **Human-in-the-Loop** - AI requests user confirmation before executing tools
- ⚡ **Real-time Communication** - WebSocket-based bidirectional messaging
- 🔄 **Session Management** - Persistent sessions with reconnection support
- 📝 **Dynamic Input** - AI can request arbitrary user input during execution
- 🚫 **Cancellation Support** - Users can cancel tasks at any time
- 🔄 **State Recovery** - Complete session restoration after disconnection
- 📱 **Modern UI** - Responsive React interface with markdown support

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket/HTTP    ┌─────────────────┐
│   React Frontend│ ◄─────────────────► │ FastAPI Backend │
│                 │                      │                 │
│ • Task Control  │                      │ • AI Agents     │
│ • Confirmations │                      │ • Session Mgmt  │
│ • Real-time UI  │                      │ • WebSocket Hub │
│ • Input Forms   │                      │ • Tool Execution│
└─────────────────┘                      └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Azure OpenAI API key (optional, can use Ollama)

### Setup & Run

1. **Clone and Setup Backend**
   ```bash
   cd backend
   python -m venv ../venv
   source ../venv/bin/activate  # Windows: ..\venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   # Create .env file in backend directory
   AZURE_OPENAI_API_KEY=your_api_key
   AZURE_OPENAI_ENDPOINT=your_endpoint
   AZURE_OPENAI_DEPLOYMENT=your_deployment
   AZURE_OPENAI_MODEL=gpt-4
   AZURE_OPENAI_API_VERSION=2024-02-15-preview
   ```

3. **Start Backend**
   ```bash
   cd backend
   uvicorn main:app --reload
   # Backend runs on http://localhost:8000
   ```

4. **Setup & Start Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   # Frontend runs on http://localhost:5173
   ```

5. **Access Application**
   - Open http://localhost:5173 in your browser
   - Enter a question for the AI agent
   - Watch real-time confirmations and responses!

## 💡 Usage Example

1. **Start a Task**: Enter "Who is the current president of the United States?"
2. **AI Processing**: Agent searches for information
3. **Confirmation**: "Agent is trying to access google_search with query {...}. Do you want to proceed?"
4. **User Decision**: Click "Yes, Continue" or "No, Cancel"
5. **Real-time Response**: See the AI's research and final answer stream in real-time

## 📚 Detailed Documentation

For comprehensive technical details, see these documents:

### 🏛️ [Technical Architecture Document](./TECHNICAL_ARCHITECTURE_DOCUMENT.md)
Complete system architecture, API documentation, and implementation details including:
- Backend & Frontend architecture deep-dive
- WebSocket communication protocols
- Session management & state recovery
- Security considerations
- API reference with examples

### 📋 [Agent Response UI Guide](./AGENT_RESPONSE_UI.md)
Frontend UI components and user experience details:
- Real-time response streaming
- Confirmation dialogs
- Dynamic input forms
- Error handling UI

### 🔧 [Race Condition Fixes](./RACE_CONDITION_FIXES.md)
Technical solutions for concurrent operations:
- WebSocket connection management
- Session synchronization
- State consistency handling

### 📖 [Detailed Implementation Guide](./DETAILED_EXPLANATION.md)
Step-by-step implementation walkthrough:
- Code structure explanation
- Communication flow diagrams
- Error handling strategies

### ⚡ [Technical Challenges & Solutions](./TECHNICAL_CHALLENGES_AND_SOLUTIONS.md)
Engineering challenges and their solutions:
- Real-time communication complexities
- Session management and state persistence
- Concurrency and race condition handling
- AI agent integration challenges
- Performance and scalability solutions

## 🛠️ Development

### Available Scripts

**Backend:**
```bash
# Start with auto-reload
uvicorn main:app --reload

# Start with specific host/port
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
npm run dev      # Development server
npm run build    # Production build
npm run preview  # Preview production build
```

### VS Code Tasks

Use the predefined VS Code tasks for easy development:
- `Start FastAPI Backend` - Starts backend with auto-reload
- `Start React Frontend` - Starts frontend development server

## 🏗️ Project Structure

```
FastAPIPOC/
├── backend/
│   ├── main.py              # FastAPI app entry
│   ├── config.py           # AI model configuration
│   ├── models/types.py     # Data models
│   ├── routers/            # API endpoints
│   ├── service/            # Core services
│   └── task/               # Task management
├── frontend/
│   ├── src/App.jsx         # Main React component
│   ├── package.json        # Dependencies
│   └── vite.config.js      # Build configuration
├── TECHNICAL_ARCHITECTURE_DOCUMENT.md
├── AGENT_RESPONSE_UI.md
├── RACE_CONDITION_FIXES.md
└── DETAILED_EXPLANATION.md
```

## 🔑 Key Technologies

- **Backend**: FastAPI, WebSockets, AsyncIO, Agno AI Framework
- **Frontend**: React, Vite, WebSocket API, Markdown Preview
- **AI**: Azure OpenAI, Ollama, Google Search, DuckDuckGo
- **Communication**: HTTP REST API, WebSocket Protocol

## 🌟 Features in Action

### Real-time AI Interactions
- AI agent processes your questions with web search capabilities
- Requests permission before accessing external tools
- Streams responses in real-time with markdown formatting

### Session Management
- Persistent sessions survive browser refreshes
- Multiple tabs can connect to the same session
- Complete conversation history restoration

### Human-in-the-Loop
- AI pauses for user confirmation before tool execution
- Dynamic input collection during task execution
- Graceful cancellation at any point

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test thoroughly
4. Submit a pull request with detailed description

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🆘 Troubleshooting

### Common Issues

**Backend won't start:**
- Check Python version (3.8+)
- Verify virtual environment activation
- Install dependencies: `pip install -r requirements.txt`

**Frontend connection issues:**
- Ensure backend is running on port 8000
- Check browser console for WebSocket errors
- Verify CORS configuration

**AI responses not working:**
- Check Azure OpenAI API key in .env file
- Verify API endpoint and deployment configuration
- Try using Ollama as alternative (see config.py)

For detailed troubleshooting, see the [Technical Architecture Document](./TECHNICAL_ARCHITECTURE_DOCUMENT.md#troubleshooting).

---

*Built with ❤️ using FastAPI and React*
