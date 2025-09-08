/**
 * Legal Document Viewer Component
 * Renders markdown legal documents with proper formatting and typography.
 * Used for displaying privacy policy and terms of service in modals and dedicated pages.
 */

import React from 'react';
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
  // Simple markdown-to-HTML conversion for basic formatting
  const formatContent = (markdown: string) => {
    return markdown
      // Headers
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold text-foreground mb-4 mt-6">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-foreground mb-6">$1</h1>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      // Lists
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-2">$1</li>')
      .replace(/^⦁\s+(.*$)/gm, '<li class="ml-4 mb-2">$1</li>')
      // Paragraphs
      .replace(/^([^<#\-⦁\n][^\n]*$)/gm, '<p class="mb-4 text-muted-foreground leading-relaxed">$1</p>')
      // Line breaks
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`legal-document-viewer ${className}`}>
      {title && (
        <h1 className="text-2xl font-bold text-foreground mb-6">{title}</h1>
      )}
      <ScrollArea className="h-full">
        <div 
          className="prose prose-sm max-w-none text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: formatContent(content) }}
        />
      </ScrollArea>
    </div>
  );
};