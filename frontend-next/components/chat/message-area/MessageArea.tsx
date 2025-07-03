"use client";

import type { PlaygroundChatMessage } from "@/types/app-types";
import Messages from "./messages";
import { StickToBottom } from "use-stick-to-bottom";
import ScrollToBottom from "./ScrollToBottom";

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
];

const MessageArea = () => {
  const messages = dummyMessages;

  return (
    <StickToBottom
      className="relative mb-4 flex max-h-[calc(100vh-64px)] min-h-0 flex-grow flex-col"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="flex min-h-full flex-col justify-center">
        <div className="mx-auto w-full max-w-2xl space-y-9 px-4 pb-4">
          <Messages messages={messages} />
        </div>
      </StickToBottom.Content>
      <ScrollToBottom />
    </StickToBottom>
  );
};

export default MessageArea;
