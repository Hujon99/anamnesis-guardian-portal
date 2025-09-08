/**
 * Legal Document Viewer Component
 * Renders markdown legal documents with proper formatting and typography.
 * Uses react-markdown for reliable markdown parsing and rendering.
 * Used for displaying privacy policy and terms of service in modals and dedicated pages.
 */

import React from 'react';
import ReactMarkdown from 'react-markdown';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LegalDocumentViewerProps {
  content: string;
  title?: string;
  className?: string;
}

export const LegalDocumentViewer: React.FC<LegalDocumentViewerProps> = ({
  content,
  title,
  className = ''
}) => {
  return (
    <div className={`legal-document-viewer w-full ${className}`}>
      {title && (
        <h1 className="text-xl font-bold text-foreground mb-6 pb-2 border-b border-border">{title}</h1>
      )}
      <ScrollArea className="h-full w-full" type="always">
        <div className="pr-6 pb-4">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown
              components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-foreground mb-4 mt-8 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-foreground mb-3 mt-6 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-medium text-foreground mb-2 mt-4">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-3 text-sm text-muted-foreground leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-4 space-y-1 list-none">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="ml-6 text-sm text-muted-foreground leading-relaxed relative before:content-['•'] before:absolute before:-ml-4 before:text-primary">
                  {children}
                </li>
              ),
              ol: ({ children }) => (
                <ol className="mb-4 space-y-1 list-decimal list-inside">{children}</ol>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-1 py-0.5 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono text-foreground overflow-x-auto my-4">
                  {children}
                </pre>
              ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};