"use client";

import type { PlaygroundChatMessage } from "@/types/app-types";
import Messages from "./messages";
import { StickToBottom } from "use-stick-to-bottom";
import ScrollToBottom from "./scroll-to-bottom";

// Dummy messages for testing
const dummyMessages: PlaygroundChatMessage[] = [
  {
    role: "user",
    content: "Hello! Can you help me understand how Azure Container Apps work?",
    created_at: Date.now() - 300000, // 5 minutes ago
  },
  {
    role: "agent",
    content:
      "I'd be happy to help you understand Azure Container Apps! Azure Container Apps is a fully managed serverless container service that enables you to run microservices and containerized applications on a serverless platform.\n\nHere are the key features:\n\n1. **Serverless containers**: No need to manage infrastructure\n2. **Auto-scaling**: Scales based on demand, including scale-to-zero\n3. **Built-in load balancing**: Distributes traffic across instances\n4. **Blue-green deployments**: Safe deployment strategies\n5. **Integration with Azure services**: Works seamlessly with other Azure services",
    created_at: Date.now() - 280000, // 4 minutes 40 seconds ago
    extra_data: {
      reasoning_steps: [
        {
          title: "Analyzing user question about Azure Container Apps",
          action: "research",
          result: "User wants to understand Azure Container Apps fundamentals",
          reasoning:
            "The user is asking for general information about Azure Container Apps, so I should provide a comprehensive overview covering key features and benefits.",
        },
        {
          title: "Structuring response with key features",
          action: "organize",
          result: "Organized response into main features and benefits",
          reasoning:
            "Breaking down the information into digestible points will help the user understand the service better.",
        },
      ],
      references: [
        {
          query: "Azure Container Apps overview",
          references: [
            {
              name: "Azure Container Apps Documentation",
              content:
                "Azure Container Apps enables you to run microservices and containerized applications on a serverless platform...",
              meta_data: {
                chunk: 1,
                chunk_size: 1024,
              },
            },
            {
              name: "Container Apps Features Guide",
              content:
                "Key features include auto-scaling, built-in load balancing, and blue-green deployments...",
              meta_data: {
                chunk: 2,
                chunk_size: 1024,
              },
            },
          ],
        },
      ],
    },
    tool_calls: [
      {
        role: "tool",
        content:
          "Retrieved Azure Container Apps documentation and feature overview",
        tool_call_id: "call_123",
        tool_name: "azure_documentation_search",
        tool_args: {
          query: "Azure Container Apps features",
        },
        tool_call_error: false,
        metrics: {
          time: 1200,
        },
        created_at: Date.now() - 285000,
      },
    ],
  },
  {
    role: "user",
    content:
      "That's great! Can you show me how to deploy a simple web application to Azure Container Apps?",
    created_at: Date.now() - 180000, // 3 minutes ago
  },
  {
    role: "agent",
    content:
      "Absolutely! I'll walk you through deploying a simple web application to Azure Container Apps. Here's a step-by-step guide:\n\n## Prerequisites\n- Azure CLI installed\n- Docker installed\n- A containerized web application\n\n## Steps:\n\n### 1. Create a Resource Group\n```bash\naz group create --name myResourceGroup --location eastus\n```\n\n### 2. Create a Container Apps Environment\n```bash\naz containerapp env create --name myContainerAppEnv --resource-group myResourceGroup --location eastus\n```\n\n### 3. Deploy Your Container App\n```bash\naz containerapp create \\\n  --name my-web-app \\\n  --resource-group myResourceGroup \\\n  --environment myContainerAppEnv \\\n  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \\\n  --target-port 80 \\\n  --ingress external\n```\n\nThat's it! Your web application will be deployed and accessible via a public URL.",
    created_at: Date.now() - 120000, // 2 minutes ago
    tool_calls: [
      {
        role: "tool",
        content: "Generated Azure CLI commands for Container Apps deployment",
        tool_call_id: "call_456",
        tool_name: "azure_cli_generator",
        tool_args: {
          intent: "deploy container app with external ingress",
        },
        tool_call_error: false,
        metrics: {
          time: 800,
        },
        created_at: Date.now() - 125000,
      },
    ],
  },
  {
    role: "user",
    content:
      "Perfect! One more question - how does pricing work for Azure Container Apps?",
    created_at: Date.now() - 60000, // 1 minute ago
  },
  {
    role: "agent",
    content:
      "Great question! Azure Container Apps pricing is based on resource consumption and follows a pay-as-you-go model. Here's a detailed breakdown:\n\n## Pricing Components\n\n### 1. Compute Resources\n\n| Resource Type | CPU (vCPU) | Memory (GB) | Price per Hour |\n|---------------|------------|-------------|----------------|\n| Basic | 0.25 | 0.5 | $0.0144 |\n| Standard | 0.5 | 1.0 | $0.0288 |\n| Premium | 1.0 | 2.0 | $0.0576 |\n| Custom | Variable | Variable | Based on allocation |\n\n### 2. Request Pricing\n\n- **First 2 million requests**: Free\n- **Additional requests**: $0.40 per million requests\n\n### 3. Storage\n\n- **Ephemeral storage**: Included (up to 10 GB)\n- **Persistent storage**: $0.10 per GB per month\n\n## Cost Optimization Tips\n\n> 💡 **Pro Tips for Cost Savings:**\n> \n> 1. **Enable scale-to-zero** for dev/test environments\n> 2. **Use appropriate resource allocation** - don't over-provision\n> 3. **Monitor usage patterns** with Azure Cost Management\n> 4. **Consider spot instances** for non-critical workloads\n\n## Example Calculation\n\nFor a small web application:\n\n```\nMonthly Cost Breakdown:\n- Basic container (0.25 vCPU, 0.5 GB): $10.37\n- 1M requests: $0.00 (within free tier)\n- 2 GB persistent storage: $0.20\n\nTotal Monthly Cost: ~$10.57\n```\n\n## Comparison with Other Services\n\n| Service | Cost Model | Best For |\n|---------|------------|----------|\n| **Container Apps** | Pay-per-use + requests | Microservices, APIs |\n| **App Service** | Fixed pricing tiers | Traditional web apps |\n| **AKS** | VM-based pricing | Complex orchestration |\n| **Functions** | Execution-based | Event-driven workloads |\n\n---\n\n**Key Benefits:**\n- ✅ No upfront costs\n- ✅ Scale-to-zero capability\n- ✅ Pay only for what you use\n- ✅ Built-in load balancing included\n\n**Important Notes:**\n- Prices may vary by region\n- Free tier includes 2 million requests/month\n- Bandwidth charges apply for data transfer\n\nWould you like me to help you estimate costs for your specific use case?",
    created_at: Date.now() - 30000, // 30 seconds ago
    tool_calls: [
      {
        role: "tool",
        content:
          "Retrieved Azure Container Apps pricing information and generated comparison table",
        tool_call_id: "call_789",
        tool_name: "azure_pricing_calculator",
        tool_args: {
          service: "container-apps",
        },
        tool_call_error: false,
        metrics: {
          time: 1500,
        },
        created_at: Date.now() - 35000,
      },
    ],
  },
  {
    role: "user",
    content: "Hello! Can you help me understand how Azure Container Apps work?",
    created_at: Date.now() - 300000, // 5 minutes ago
  },
  {
    role: "agent",
    content:
      "I'd be happy to help you understand Azure Container Apps! Azure Container Apps is a fully managed serverless container service that enables you to run microservices and containerized applications on a serverless platform.\n\nHere are the key features:\n\n1. **Serverless containers**: No need to manage infrastructure\n2. **Auto-scaling**: Scales based on demand, including scale-to-zero\n3. **Built-in load balancing**: Distributes traffic across instances\n4. **Blue-green deployments**: Safe deployment strategies\n5. **Integration with Azure services**: Works seamlessly with other Azure services",
    created_at: Date.now() - 280000, // 4 minutes 40 seconds ago
    extra_data: {
      reasoning_steps: [
        {
          title: "Analyzing user question about Azure Container Apps",
          action: "research",
          result: "User wants to understand Azure Container Apps fundamentals",
          reasoning:
            "The user is asking for general information about Azure Container Apps, so I should provide a comprehensive overview covering key features and benefits.",
        },
        {
          title: "Structuring response with key features",
          action: "organize",
          result: "Organized response into main features and benefits",
          reasoning:
            "Breaking down the information into digestible points will help the user understand the service better.",
        },
      ],
      references: [
        {
          query: "Azure Container Apps overview",
          references: [
            {
              name: "Azure Container Apps Documentation",
              content:
                "Azure Container Apps enables you to run microservices and containerized applications on a serverless platform...",
              meta_data: {
                chunk: 1,
                chunk_size: 1024,
              },
            },
            {
              name: "Container Apps Features Guide",
              content:
                "Key features include auto-scaling, built-in load balancing, and blue-green deployments...",
              meta_data: {
                chunk: 2,
                chunk_size: 1024,
              },
            },
          ],
        },
      ],
    },
    tool_calls: [
      {
        role: "tool",
        content:
          "Retrieved Azure Container Apps documentation and feature overview",
        tool_call_id: "call_123",
        tool_name: "azure_documentation_search",
        tool_args: {
          query: "Azure Container Apps features",
        },
        tool_call_error: false,
        metrics: {
          time: 1200,
        },
        created_at: Date.now() - 285000,
      },
    ],
  },
  {
    role: "user",
    content:
      "That's great! Can you show me how to deploy a simple web application to Azure Container Apps?",
    created_at: Date.now() - 180000, // 3 minutes ago
  },
  {
    role: "agent",
    content:
      "Absolutely! I'll walk you through deploying a simple web application to Azure Container Apps. Here's a step-by-step guide:\n\n## Prerequisites\n- Azure CLI installed\n- Docker installed\n- A containerized web application\n\n## Steps:\n\n### 1. Create a Resource Group\n```bash\naz group create --name myResourceGroup --location eastus\n```\n\n### 2. Create a Container Apps Environment\n```bash\naz containerapp env create --name myContainerAppEnv --resource-group myResourceGroup --location eastus\n```\n\n### 3. Deploy Your Container App\n```bash\naz containerapp create \\\n  --name my-web-app \\\n  --resource-group myResourceGroup \\\n  --environment myContainerAppEnv \\\n  --image mcr.microsoft.com/azuredocs/containerapps-helloworld:latest \\\n  --target-port 80 \\\n  --ingress external\n```\n\nThat's it! Your web application will be deployed and accessible via a public URL.",
    created_at: Date.now() - 120000, // 2 minutes ago
    tool_calls: [
      {
        role: "tool",
        content: "Generated Azure CLI commands for Container Apps deployment",
        tool_call_id: "call_456",
        tool_name: "azure_cli_generator",
        tool_args: {
          intent: "deploy container app with external ingress",
        },
        tool_call_error: false,
        metrics: {
          time: 800,
        },
        created_at: Date.now() - 125000,
      },
    ],
  },
  {
    role: "user",
    content:
      "Perfect! One more question - how does pricing work for Azure Container Apps?",
    created_at: Date.now() - 60000, // 1 minute ago
  },
  {
    role: "agent",
    content:
      "Great question! Azure Container Apps pricing is based on resource consumption and follows a pay-as-you-go model. Here's a detailed breakdown:\n\n## Pricing Components\n\n### 1. Compute Resources\n\n| Resource Type | CPU (vCPU) | Memory (GB) | Price per Hour |\n|---------------|------------|-------------|----------------|\n| Basic | 0.25 | 0.5 | $0.0144 |\n| Standard | 0.5 | 1.0 | $0.0288 |\n| Premium | 1.0 | 2.0 | $0.0576 |\n| Custom | Variable | Variable | Based on allocation |\n\n### 2. Request Pricing\n\n- **First 2 million requests**: Free\n- **Additional requests**: $0.40 per million requests\n\n### 3. Storage\n\n- **Ephemeral storage**: Included (up to 10 GB)\n- **Persistent storage**: $0.10 per GB per month\n\n## Cost Optimization Tips\n\n> 💡 **Pro Tips for Cost Savings:**\n> \n> 1. **Enable scale-to-zero** for dev/test environments\n> 2. **Use appropriate resource allocation** - don't over-provision\n> 3. **Monitor usage patterns** with Azure Cost Management\n> 4. **Consider spot instances** for non-critical workloads\n\n## Example Calculation\n\nFor a small web application:\n\n```\nMonthly Cost Breakdown:\n- Basic container (0.25 vCPU, 0.5 GB): $10.37\n- 1M requests: $0.00 (within free tier)\n- 2 GB persistent storage: $0.20\n\nTotal Monthly Cost: ~$10.57\n```\n\n## Comparison with Other Services\n\n| Service | Cost Model | Best For |\n|---------|------------|----------|\n| **Container Apps** | Pay-per-use + requests | Microservices, APIs |\n| **App Service** | Fixed pricing tiers | Traditional web apps |\n| **AKS** | VM-based pricing | Complex orchestration |\n| **Functions** | Execution-based | Event-driven workloads |\n\n---\n\n**Key Benefits:**\n- ✅ No upfront costs\n- ✅ Scale-to-zero capability\n- ✅ Pay only for what you use\n- ✅ Built-in load balancing included\n\n**Important Notes:**\n- Prices may vary by region\n- Free tier includes 2 million requests/month\n- Bandwidth charges apply for data transfer\n\nWould you like me to help you estimate costs for your specific use case?",
    created_at: Date.now() - 30000, // 30 seconds ago
    tool_calls: [
      {
        role: "tool",
        content:
          "Retrieved Azure Container Apps pricing information and generated comparison table",
        tool_call_id: "call_789",
        tool_name: "azure_pricing_calculator",
        tool_args: {
          service: "container-apps",
        },
        tool_call_error: false,
        metrics: {
          time: 1500,
        },
        created_at: Date.now() - 35000,
      },
    ],
  },
  {
    role: "user",
    content:
      "Can you show me some code examples for different languages and how to integrate with Azure Container Apps?",
    created_at: Date.now() - 15000, // 15 seconds ago
  },
  {
    role: "agent",
    content:
      'Absolutely! Here are comprehensive code examples for different languages and frameworks that work great with Azure Container Apps:\n\n## 🐍 Python FastAPI Example\n\n### Creating a FastAPI Application\n\n```python\n# main.py\nfrom fastapi import FastAPI, HTTPException\nfrom pydantic import BaseModel\nimport uvicorn\nimport os\nfrom typing import List, Optional\n\napp = FastAPI(title="Azure Container Apps Demo", version="1.0.0")\n\n# Health check endpoint\n@app.get("/health")\nasync def health_check():\n    return {"status": "healthy", "service": "fastapi-demo"}\n\n# Data model\nclass Item(BaseModel):\n    id: int\n    name: str\n    description: Optional[str] = None\n    price: float\n\n# In-memory storage (use database in production)\nitems_db: List[Item] = []\n\n@app.post("/items/", response_model=Item)\nasync def create_item(item: Item):\n    items_db.append(item)\n    return item\n\n@app.get("/items/", response_model=List[Item])\nasync def get_items():\n    return items_db\n\n@app.get("/items/{item_id}", response_model=Item)\nasync def get_item(item_id: int):\n    for item in items_db:\n        if item.id == item_id:\n            return item\n    raise HTTPException(status_code=404, detail="Item not found")\n\nif __name__ == "__main__":\n    port = int(os.getenv("PORT", 8000))\n    uvicorn.run(app, host="0.0.0.0", port=port)\n```\n\n### Dockerfile for Python\n\n```dockerfile\n# Dockerfile\nFROM python:3.11-slim\n\nWORKDIR /app\n\n# Install dependencies\nCOPY requirements.txt .\nRUN pip install --no-cache-dir -r requirements.txt\n\n# Copy application\nCOPY . .\n\n# Expose port\nEXPOSE 8000\n\n# Run application\nCMD ["python", "main.py"]\n```\n\n### Requirements.txt\n\n```txt\nfastapi==0.104.1\nuvicorn[standard]==0.24.0\npydantic==2.5.0\n```\n\n---\n\n## 🟢 Node.js Express Example\n\n### Express Server\n\n```javascript\n// server.js\nconst express = require(\'express\');\nconst cors = require(\'cors\');\nconst helmet = require(\'helmet\');\nconst rateLimit = require(\'express-rate-limit\');\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\n// Middleware\napp.use(helmet());\napp.use(cors());\napp.use(express.json({ limit: \'10mb\' }));\n\n// Rate limiting\nconst limiter = rateLimit({\n  windowMs: 15 * 60 * 1000, // 15 minutes\n  max: 100 // limit each IP to 100 requests per windowMs\n});\napp.use(\'/api/\', limiter);\n\n// In-memory storage\nlet users = [];\nlet nextId = 1;\n\n// Routes\napp.get(\'/health\', (req, res) => {\n  res.json({ \n    status: \'healthy\', \n    timestamp: new Date().toISOString(),\n    uptime: process.uptime()\n  });\n});\n\napp.get(\'/api/users\', (req, res) => {\n  res.json(users);\n});\n\napp.post(\'/api/users\', (req, res) => {\n  const { name, email } = req.body;\n  \n  if (!name || !email) {\n    return res.status(400).json({ error: \'Name and email are required\' });\n  }\n  \n  const user = {\n    id: nextId++,\n    name,\n    email,\n    createdAt: new Date().toISOString()\n  };\n  \n  users.push(user);\n  res.status(201).json(user);\n});\n\napp.get(\'/api/users/:id\', (req, res) => {\n  const id = parseInt(req.params.id);\n  const user = users.find(u => u.id === id);\n  \n  if (!user) {\n    return res.status(404).json({ error: \'User not found\' });\n  }\n  \n  res.json(user);\n});\n\n// Error handling middleware\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: \'Something went wrong!\' });\n});\n\napp.listen(PORT, \'0.0.0.0\', () => {\n  console.log(`Server running on port ${PORT}`);\n});\n```\n\n### Package.json\n\n```json\n{\n  "name": "containerapp-node-demo",\n  "version": "1.0.0",\n  "description": "Node.js demo for Azure Container Apps",\n  "main": "server.js",\n  "scripts": {\n    "start": "node server.js",\n    "dev": "nodemon server.js"\n  },\n  "dependencies": {\n    "express": "^4.18.2",\n    "cors": "^2.8.5",\n    "helmet": "^7.1.0",\n    "express-rate-limit": "^7.1.5"\n  },\n  "devDependencies": {\n    "nodemon": "^3.0.2"\n  }\n}\n```\n\n### Dockerfile for Node.js\n\n```dockerfile\n# Dockerfile\nFROM node:18-alpine\n\nWORKDIR /app\n\n# Copy package files\nCOPY package*.json ./\n\n# Install dependencies\nRUN npm ci --only=production\n\n# Copy application code\nCOPY . .\n\n# Create non-root user\nRUN addgroup -g 1001 -S nodejs\nRUN adduser -S nextjs -u 1001\nUSER nextjs\n\n# Expose port\nEXPOSE 3000\n\n# Start application\nCMD ["npm", "start"]\n```\n\n---\n\n## ☕ Java Spring Boot Example\n\n### Spring Boot Application\n\n```java\n// Application.java\npackage com.example.containerapp;\n\nimport org.springframework.boot.SpringApplication;\nimport org.springframework.boot.autoconfigure.SpringBootApplication;\nimport org.springframework.web.bind.annotation.*;\nimport org.springframework.http.ResponseEntity;\nimport java.util.*;\nimport java.time.LocalDateTime;\n\n@SpringBootApplication\n@RestController\npublic class Application {\n    \n    private final List<User> users = new ArrayList<>();\n    private long nextId = 1;\n    \n    public static void main(String[] args) {\n        SpringApplication.run(Application.class, args);\n    }\n    \n    @GetMapping("/health")\n    public Map<String, Object> health() {\n        Map<String, Object> response = new HashMap<>();\n        response.put("status", "healthy");\n        response.put("timestamp", LocalDateTime.now());\n        response.put("service", "spring-boot-demo");\n        return response;\n    }\n    \n    @GetMapping("/api/users")\n    public List<User> getUsers() {\n        return users;\n    }\n    \n    @PostMapping("/api/users")\n    public ResponseEntity<User> createUser(@RequestBody User user) {\n        user.setId(nextId++);\n        user.setCreatedAt(LocalDateTime.now());\n        users.add(user);\n        return ResponseEntity.ok(user);\n    }\n    \n    @GetMapping("/api/users/{id}")\n    public ResponseEntity<User> getUser(@PathVariable Long id) {\n        return users.stream()\n                .filter(user -> user.getId().equals(id))\n                .findFirst()\n                .map(ResponseEntity::ok)\n                .orElse(ResponseEntity.notFound().build());\n    }\n    \n    // User model\n    public static class User {\n        private Long id;\n        private String name;\n        private String email;\n        private LocalDateTime createdAt;\n        \n        // Constructors\n        public User() {}\n        \n        public User(String name, String email) {\n            this.name = name;\n            this.email = email;\n        }\n        \n        // Getters and setters\n        public Long getId() { return id; }\n        public void setId(Long id) { this.id = id; }\n        \n        public String getName() { return name; }\n        public void setName(String name) { this.name = name; }\n        \n        public String getEmail() { return email; }\n        public void setEmail(String email) { this.email = email; }\n        \n        public LocalDateTime getCreatedAt() { return createdAt; }\n        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }\n    }\n}\n```\n\n### Dockerfile for Java\n\n```dockerfile\n# Dockerfile\nFROM openjdk:17-jdk-slim\n\nWORKDIR /app\n\n# Copy the JAR file\nCOPY target/containerapp-demo-1.0.0.jar app.jar\n\n# Expose port\nEXPOSE 8080\n\n# Run the application\nENTRYPOINT ["java", "-jar", "app.jar"]\n```\n\n---\n\n## 🔧 Azure Container Apps Deployment\n\n### Using Azure CLI\n\n```bash\n#!/bin/bash\n\n# Variables\nRESOURCE_GROUP="my-container-apps-rg"\nLOCATION="eastus"\nENVIRONMENT="my-container-env"\nAPP_NAME="my-web-app"\nIMAGE_NAME="myregistry.azurecr.io/my-app:latest"\n\n# Create resource group\necho "Creating resource group..."\naz group create --name $RESOURCE_GROUP --location $LOCATION\n\n# Create Container Apps environment\necho "Creating Container Apps environment..."\naz containerapp env create \\\n  --name $ENVIRONMENT \\\n  --resource-group $RESOURCE_GROUP \\\n  --location $LOCATION\n\n# Deploy the container app\necho "Deploying container app..."\naz containerapp create \\\n  --name $APP_NAME \\\n  --resource-group $RESOURCE_GROUP \\\n  --environment $ENVIRONMENT \\\n  --image $IMAGE_NAME \\\n  --target-port 8000 \\\n  --ingress external \\\n  --min-replicas 1 \\\n  --max-replicas 10 \\\n  --cpu 0.25 \\\n  --memory 0.5Gi \\\n  --env-vars "ENVIRONMENT=production" "LOG_LEVEL=info"\n\necho "Deployment completed!"\n```\n\n### Container Apps YAML Configuration\n\n```yaml\n# containerapp.yaml\nlocation: eastus\nresourceGroup: my-container-apps-rg\ntype: Microsoft.App/containerApps\nname: my-web-app\nproperties:\n  environmentId: /subscriptions/{subscription-id}/resourceGroups/my-container-apps-rg/providers/Microsoft.App/managedEnvironments/my-container-env\n  configuration:\n    ingress:\n      external: true\n      targetPort: 8000\n      allowInsecure: false\n    dapr:\n      enabled: false\n    secrets:\n      - name: "registry-password"\n        value: "password"\n  template:\n    containers:\n      - name: my-web-app\n        image: myregistry.azurecr.io/my-app:latest\n        env:\n          - name: "ENVIRONMENT"\n            value: "production"\n          - name: "LOG_LEVEL"\n            value: "info"\n        resources:\n          cpu: 0.25\n          memory: 0.5Gi\n    scale:\n      minReplicas: 1\n      maxReplicas: 10\n      rules:\n        - name: "http-rule"\n          http:\n            metadata:\n              concurrentRequests: 50\n```\n\n---\n\n## 🐳 Docker Compose for Local Development\n\n```yaml\n# docker-compose.yml\nversion: \'3.8\'\n\nservices:\n  web:\n    build: .\n    ports:\n      - "8000:8000"\n    environment:\n      - ENVIRONMENT=development\n      - LOG_LEVEL=debug\n    volumes:\n      - .:/app\n    depends_on:\n      - redis\n      - postgres\n  \n  redis:\n    image: redis:7-alpine\n    ports:\n      - "6379:6379"\n    volumes:\n      - redis_data:/data\n  \n  postgres:\n    image: postgres:15-alpine\n    environment:\n      - POSTGRES_DB=myapp\n      - POSTGRES_USER=user\n      - POSTGRES_PASSWORD=password\n    ports:\n      - "5432:5432"\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n\nvolumes:\n  redis_data:\n  postgres_data:\n```\n\n---\n\n## 🚀 GitHub Actions CI/CD Pipeline\n\n```yaml\n# .github/workflows/deploy.yml\nname: Deploy to Azure Container Apps\n\non:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    \n    steps:\n    - uses: actions/checkout@v4\n    \n    - name: Set up Docker Buildx\n      uses: docker/setup-buildx-action@v3\n    \n    - name: Log in to Azure Container Registry\n      uses: azure/docker-login@v1\n      with:\n        login-server: ${{ secrets.REGISTRY_LOGIN_SERVER }}\n        username: ${{ secrets.REGISTRY_USERNAME }}\n        password: ${{ secrets.REGISTRY_PASSWORD }}\n    \n    - name: Build and push Docker image\n      run: |\n        docker build -t ${{ secrets.REGISTRY_LOGIN_SERVER }}/my-app:${{ github.sha }} .\n        docker push ${{ secrets.REGISTRY_LOGIN_SERVER }}/my-app:${{ github.sha }}\n    \n    - name: Deploy to Azure Container Apps\n      uses: azure/container-apps-deploy-action@v1\n      with:\n        appSourcePath: ${{ github.workspace }}\n        acrName: ${{ secrets.REGISTRY_LOGIN_SERVER }}\n        containerAppName: my-web-app\n        resourceGroup: my-container-apps-rg\n        imageToDeploy: ${{ secrets.REGISTRY_LOGIN_SERVER }}/my-app:${{ github.sha }}\n```\n\nThese examples demonstrate various programming languages and deployment strategies that work seamlessly with Azure Container Apps. Each includes proper health checks, error handling, and production-ready configurations! 🎉',
    created_at: Date.now() - 5000, // 5 seconds ago
    tool_calls: [
      {
        role: "tool",
        content:
          "Generated comprehensive code examples for multiple programming languages",
        tool_call_id: "call_101112",
        tool_name: "code_generator",
        tool_args: {
          languages: "python",
          framework: "container-apps-ready",
        },
        tool_call_error: false,
        metrics: {
          time: 2200,
        },
        created_at: Date.now() - 8000,
      },
    ],
  },
];

const MessageArea = () => {
  const messages = dummyMessages;

  return (
    <StickToBottom
      className="relative mb-4 flex max-h-[calc(100vh-64px)] min-h-0 flex-grow flex-col"
      resize="instant"
      initial="instant"
    >
      <StickToBottom.Content className="flex min-h-full flex-col justify-center">
        <div className="mx-auto w-full max-w-3xl space-y-9 px-4 pb-4">
          <Messages messages={[...messages, ...messages, ...messages]} />
        </div>
      </StickToBottom.Content>
      <ScrollToBottom />
    </StickToBottom>
  );
};

export default MessageArea;
