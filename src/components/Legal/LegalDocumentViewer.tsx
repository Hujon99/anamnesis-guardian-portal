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
        <div className="pr-6 pb-6">
          <div className="prose prose-sm max-w-none text-muted-foreground">
            <ReactMarkdown
              components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-foreground mb-6 mt-8 first:mt-0">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-foreground mb-4 mt-8 first:mt-0">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-medium text-foreground mb-3 mt-6">{children}</h3>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">{children}</p>
              ),
              ul: ({ children }) => (
                <ul className="mb-6 space-y-2 list-none">{children}</ul>
              ),
              li: ({ children }) => (
                <li className="ml-6 text-sm text-muted-foreground leading-relaxed relative before:content-['•'] before:absolute before:-ml-4 before:text-primary">
                  {children}
                </li>
              ),
              ol: ({ children }) => (
                <ol className="mb-6 space-y-2 list-decimal list-inside">{children}</ol>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-foreground">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic text-muted-foreground">{children}</em>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-6 italic text-muted-foreground my-6 py-2">
                  {children}
                </blockquote>
              ),
              code: ({ children }) => (
                <code className="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre className="bg-muted p-4 rounded-lg text-sm font-mono text-foreground overflow-x-auto my-6">
                  {children}
                </pre>
              ),
              table: ({ children }) => (
                <div className="my-6 overflow-x-auto">
                  <table className="w-full border-collapse border border-border rounded-lg">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-muted/50">{children}</thead>
              ),
              tbody: ({ children }) => (
                <tbody>{children}</tbody>
              ),
              tr: ({ children }) => (
                <tr className="border-b border-border hover:bg-muted/30">{children}</tr>
              ),
              th: ({ children }) => (
                <th className="border border-border px-4 py-3 text-left text-sm font-semibold text-foreground">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-4 py-3 text-sm text-muted-foreground">
                  {children}
                </td>
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