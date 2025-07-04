"use client";

import { FC, useEffect, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import mermaid from "mermaid";

import type {
  UnorderedListProps,
  OrderedListProps,
  EmphasizedTextProps,
  ItalicTextProps,
  StrongTextProps,
  BoldTextProps,
  DeletedTextProps,
  UnderlinedTextProps,
  HorizontalRuleProps,
  BlockquoteProps,
  AnchorLinkProps,
  HeadingProps,
  ImgProps,
  ParagraphProps,
  TableHeaderCellProps,
  TableProps,
  TableHeaderProps,
  TableBodyProps,
  TableRowProps,
  TableCellProps,
} from "./types";

import { HEADING_SIZES } from "../heading/constants";
import { PARAGRAPH_SIZES } from "../paragraph/constants";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vs,
  vscDarkPlus,
} from "react-syntax-highlighter/dist/esm/styles/prism"; // Or any other theme
import { useTheme } from "next-themes";
import { Check, Copy, Download } from "lucide-react";

const filterProps = (props: object) => {
  const newProps = { ...props };

  if ("node" in newProps) {
    delete newProps.node;
  }

  return newProps;
};

const UnorderedList = ({ className, ...props }: UnorderedListProps) => (
  <ul
    className={cn(
      className,
      PARAGRAPH_SIZES.body,
      "flex list-disc flex-col pl-10"
    )}
    {...filterProps(props)}
  />
);

const OrderedList = ({ className, ...props }: OrderedListProps) => (
  <ol
    className={cn(
      className,
      PARAGRAPH_SIZES.body,
      "flex list-decimal flex-col pl-10"
    )}
    {...filterProps(props)}
  />
);

const Paragraph = ({ className, ...props }: ParagraphProps) => (
  <div
    className={cn(className, PARAGRAPH_SIZES.body)}
    {...filterProps(props)}
  />
);

const EmphasizedText = ({ className, ...props }: EmphasizedTextProps) => (
  <em
    className={cn(className, "text-sm font-semibold")}
    {...filterProps(props)}
  />
);

const ItalicText = ({ className, ...props }: ItalicTextProps) => (
  <i
    className={cn(className, "italic", PARAGRAPH_SIZES.body)}
    {...filterProps(props)}
  />
);

const StrongText = ({ className, ...props }: StrongTextProps) => (
  <strong
    className={cn(className, "text-sm font-semibold")}
    {...filterProps(props)}
  />
);

const BoldText = ({ className, ...props }: BoldTextProps) => (
  <b
    className={cn(className, "text-sm font-semibold")}
    {...filterProps(props)}
  />
);

const UnderlinedText = ({ className, ...props }: UnderlinedTextProps) => (
  <u
    className={cn(className, "underline", PARAGRAPH_SIZES.body)}
    {...filterProps(props)}
  />
);

const DeletedText = ({ className, ...props }: DeletedTextProps) => (
  <del
    className={cn(className, "text-muted line-through", PARAGRAPH_SIZES.body)}
    {...filterProps(props)}
  />
);

const HorizontalRule = ({ className, ...props }: HorizontalRuleProps) => (
  <hr
    className={cn(className, "mx-auto w-48 border-b border-border")}
    {...filterProps(props)}
  />
);

const MermaidRenderer: FC<{ children: string }> = ({ children }) => {
  const { systemTheme, theme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isCopied, setIsCopied] = useState(false);
  const mermaidRef = useRef<HTMLDivElement>(null);

  const isDarkTheme =
    theme === "dark" || (theme === "system" && systemTheme === "dark");

  useEffect(() => {
    const renderMermaid = async () => {
      try {
        // Configure mermaid for theme
        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkTheme ? "dark" : "default",
          themeVariables: {
            primaryColor: isDarkTheme ? "#3b82f6" : "#2563eb",
            primaryTextColor: isDarkTheme ? "#f1f5f9" : "#1e293b",
            primaryBorderColor: isDarkTheme ? "#64748b" : "#cbd5e1",
            lineColor: isDarkTheme ? "#64748b" : "#94a3b8",
            secondaryColor: isDarkTheme ? "#1e293b" : "#f1f5f9",
            tertiaryColor: isDarkTheme ? "#0f172a" : "#ffffff",
            background: isDarkTheme ? "#0f172a" : "#ffffff",
            mainBkg: isDarkTheme ? "#1e293b" : "#f8fafc",
            secondBkg: isDarkTheme ? "#334155" : "#e2e8f0",
            tertiaryBkg: isDarkTheme ? "#475569" : "#cbd5e1",
          },
          suppressErrorRendering: true,
        });

        const id = `mermaid-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, children.trim());
        setSvg(renderedSvg);
        setError("");
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to render diagram"
        );
        setSvg("");
      }
    };

    if (children.trim()) {
      renderMermaid();
    }
  }, [children, isDarkTheme]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy mermaid code:", err);
    }
  };

  const handleDownloadDiagram = () => {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="relative group">
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-4">
          <div className="text-destructive text-sm font-medium mb-2">
            Mermaid Diagram Error
          </div>
          <div className="text-destructive/80 text-xs mb-3 whitespace-break-spaces">
            {error}
          </div>
          <pre className="text-xs bg-muted/50 p-2 rounded overflow-x-hidden block whitespace-pre-wrap">
            {children}
          </pre>
        </div>

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="absolute top-3 right-3 p-2 rounded-md bg-background/80 hover:bg-background border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label={isCopied ? "Copied!" : "Copy mermaid code"}
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          )}
        </button>
        {/* Download Button */}
        <button
          onClick={handleDownloadDiagram}
          className="absolute top-3 right-12 p-2 rounded-md bg-background/80 hover:bg-background border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Download mermaid diagram"
        >
          <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </button>

        {/* Language Label */}
        <div className="absolute top-[-13px] left-[0px] p-1 rounded-sm bg-background/90 border border-border/60 text-xs font-medium text-muted-foreground">
          mermaid
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      <div className="rounded-md bg-muted/80 border border-border/40 dark:bg-muted/60 dark:border-border/60 p-4 overflow-x-auto">
        <div
          ref={mermaidRef}
          className="flex justify-center items-center"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>

      {/* Download Button */}
      <button
        onClick={handleDownloadDiagram}
        className="absolute top-3 right-12 p-2 rounded-md bg-background/80 hover:bg-background border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label="Download mermaid diagram"
      >
        <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
      </button>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-md bg-background/80 hover:bg-background border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={isCopied ? "Copied!" : "Copy mermaid code"}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        )}
      </button>

      {/* Language Label */}
      <div className="absolute top-[-13px] left-[0px] p-1 rounded-sm bg-background/90 border border-border/60 text-xs font-medium text-muted-foreground">
        mermaid
      </div>
    </div>
  );
};

const InlineCode = ({ node, inline, className, children, ...props }: any) => {
  const { systemTheme, theme } = useTheme();
  const [isCopied, setIsCopied] = useState(false);

  const isDarkTheme =
    theme === "dark" || (theme === "system" && systemTheme === "dark");
  const match = /language-(\w+)/.exec(className || "");

  const handleCopy = async () => {
    const code = String(children).replace(/\n$/, "");
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  // Handle Mermaid diagrams
  if (!inline && match && match[1] === "mermaid") {
    return <MermaidRenderer>{String(children)}</MermaidRenderer>;
  }

  return !inline && match ? (
    <div className="relative group">
      <SyntaxHighlighter
        style={isDarkTheme ? vscDarkPlus : vs}
        language={match[1]}
        PreTag="div"
        {...props}
        className={cn(
          "rounded-md bg-muted/80 px-4 py-6 text-sm font-mono border border-border/40 dark:bg-muted/60 dark:border-border/60 overflow-x-auto",
          className
        )}
        wrapLines
        showLineNumbers={true}
        lineNumberStyle={{
          minWidth: "2.5em",
          paddingRight: "1em",
          textAlign: "right",
          userSelect: "none",
          color: isDarkTheme ? "#6b7280" : "#9ca3af",
        }}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>

      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 p-2 rounded-md bg-background/80 hover:bg-background border border-border/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={isCopied ? "Copied!" : "Copy code"}
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        )}
      </button>

      {/* Language Label */}
      {match[1] && (
        <div className="absolute top-[-13px] left-[0px] p-1 rounded-sm bg-background/90 border border-border/60 text-xs font-medium text-muted-foreground">
          {match[1]}
        </div>
      )}
    </div>
  ) : (
    <code
      className={cn(
        "whitespace-pre-wrap rounded-md px-1.5 py-0.5 text-sm font-mono text-foreground border border-border/40 dark:border-border/60 break-words",
        className
      )}
      {...props}
    >
      <br />
      {children}
    </code>
  );
};

const Blockquote = ({ className, ...props }: BlockquoteProps) => (
  <blockquote
    className={cn(className, "italic", PARAGRAPH_SIZES.body)}
    {...filterProps(props)}
  />
);

const AnchorLink = ({ className, ...props }: AnchorLinkProps) => (
  <a
    className={cn(className, "cursor-pointer text-xs underline")}
    target="_blank"
    rel="noopener noreferrer"
    {...filterProps(props)}
  />
);

const Heading1 = ({ className, ...props }: HeadingProps) => (
  <h1 className={cn(className, HEADING_SIZES[3])} {...filterProps(props)} />
);

const Heading2 = ({ className, ...props }: HeadingProps) => (
  <h2 className={cn(className, HEADING_SIZES[3])} {...filterProps(props)} />
);

const Heading3 = ({ className, ...props }: HeadingProps) => (
  <h3 className={cn(className, PARAGRAPH_SIZES.lead)} {...filterProps(props)} />
);

const Heading4 = ({ className, ...props }: HeadingProps) => (
  <h4 className={cn(className, PARAGRAPH_SIZES.lead)} {...filterProps(props)} />
);

const Heading5 = ({ className, ...props }: HeadingProps) => (
  <h5
    className={cn(className, PARAGRAPH_SIZES.title)}
    {...filterProps(props)}
  />
);

const Heading6 = ({ className, ...props }: HeadingProps) => (
  <h6
    className={cn(className, PARAGRAPH_SIZES.title)}
    {...filterProps(props)}
  />
);

const Img = ({ src, alt }: ImgProps) => {
  const [error, setError] = useState(false);

  if (!src) return null;

  return (
    <div className="w-full max-w-xl">
      {error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-md bg-secondary/50 text-muted">
          <Paragraph className="text-primary">Image unavailable</Paragraph>
          <Link
            href={src as string}
            target="_blank"
            className="max-w-md truncate underline"
          >
            {src as string}
          </Link>
        </div>
      ) : (
        <Image
          src={src as string}
          width={1280}
          height={720}
          alt={alt ?? "Rendered image"}
          className="size-full rounded-md object-cover"
          onError={() => setError(true)}
          unoptimized
        />
      )}
    </div>
  );
};

const Table = ({ className, ...props }: TableProps) => (
  <div className="w-full max-w-[560px] overflow-hidden rounded-md border border-border">
    <div className="w-full overflow-x-auto">
      <table className={cn(className, "w-full")} {...filterProps(props)} />
    </div>
  </div>
);

const TableHead = ({ className, ...props }: TableHeaderProps) => (
  <thead
    className={cn(
      className,
      "rounded-md border-b border-border bg-transparent p-2 text-left text-sm font-[600]"
    )}
    {...filterProps(props)}
  />
);

const TableHeadCell = ({ className, ...props }: TableHeaderCellProps) => (
  <th
    className={cn(className, "p-2 text-sm font-[600]")}
    {...filterProps(props)}
  />
);

const TableBody = ({ className, ...props }: TableBodyProps) => (
  <tbody className={cn(className, "text-xs")} {...filterProps(props)} />
);

const TableRow = ({ className, ...props }: TableRowProps) => (
  <tr
    className={cn(className, "border-b border-border last:border-b-0")}
    {...filterProps(props)}
  />
);

const TableCell = ({ className, ...props }: TableCellProps) => (
  <td
    className={cn(className, "whitespace-nowrap p-2 font-[400]")}
    {...filterProps(props)}
  />
);

export const components = {
  h1: Heading1,
  h2: Heading2,
  h3: Heading3,
  h4: Heading4,
  h5: Heading5,
  h6: Heading6,
  ul: UnorderedList,
  ol: OrderedList,
  em: EmphasizedText,
  i: ItalicText,
  strong: StrongText,
  b: BoldText,
  u: UnderlinedText,
  del: DeletedText,
  hr: HorizontalRule,
  blockquote: Blockquote,
  code: InlineCode,
  a: AnchorLink,
  img: Img,
  p: Paragraph,
  table: Table,
  thead: TableHead,
  th: TableHeadCell,
  tbody: TableBody,
  tr: TableRow,
  td: TableCell,
};
