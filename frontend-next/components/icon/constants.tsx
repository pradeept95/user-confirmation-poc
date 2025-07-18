import {
  MistralLogo,
  OpenAILogo,
  GeminiLogo,
  AwsLogo,
  AzureLogo,
  AnthropicLogo,
  GroqLogo,
  FireworksLogo,
  DeepseekLogo,
  CohereLogo,
  OllamaLogo,
  XaiLogo,
  UserIcon,
  AgentIcon,
  SheetIcon,
  NextjsTag,
  ShadcnTag,
  TailwindTag,
  AgnoTag,
  ReasoningIcon,
  ReferencesIcon,
} from "./custom-icons";
import { IconTypeMap } from "./types";
import {
  RefreshCw,
  Edit,
  Save,
  X,
  ArrowDown,
  SendIcon,
  Download,
  HammerIcon,
  Check,
  ChevronDown,
  ChevronUp,
  Trash,
  StopCircle,
} from "lucide-react";

import { PlusIcon } from "@radix-ui/react-icons";

export const ICONS: IconTypeMap = {
  "open-ai": OpenAILogo,
  mistral: MistralLogo,
  gemini: GeminiLogo,
  aws: AwsLogo,
  azure: AzureLogo,
  anthropic: AnthropicLogo,
  groq: GroqLogo,
  fireworks: FireworksLogo,
  deepseek: DeepseekLogo,
  cohere: CohereLogo,
  ollama: OllamaLogo,
  xai: XaiLogo,
  user: UserIcon,
  agent: AgentIcon,
  sheet: SheetIcon,
  nextjs: NextjsTag,
  shadcn: ShadcnTag,
  tailwind: TailwindTag,
  reasoning: ReasoningIcon,
  "agno-tag": AgnoTag,
  refresh: RefreshCw,
  edit: Edit,
  save: Save,
  x: X,
  "arrow-down": ArrowDown,
  send: SendIcon,
  download: Download,
  hammer: HammerIcon,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "plus-icon": PlusIcon,
  references: ReferencesIcon,
  trash: Trash,
  cancel: StopCircle,
};
