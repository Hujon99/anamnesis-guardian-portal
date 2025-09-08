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
  // Enhanced markdown-to-HTML conversion with better formatting
  const formatContent = (markdown: string) => {
    let html = markdown;
    
    // Split content into blocks to handle lists properly
    const lines = html.split('\n');
    let processedLines: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      // Handle headers
      if (trimmedLine.startsWith('## ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<h2 class="text-lg font-semibold text-foreground mb-3 mt-6 first:mt-0">${trimmedLine.substring(3)}</h2>`);
      } else if (trimmedLine.startsWith('# ')) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        processedLines.push(`<h1 class="text-xl font-bold text-foreground mb-4 mt-8 first:mt-0">${trimmedLine.substring(2)}</h1>`);
      }
      // Handle list items
      else if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('⦁ ')) {
        if (!inList) {
          processedLines.push('<ul class="mb-4 space-y-1">');
          inList = true;
        }
        const listContent = trimmedLine.startsWith('- ') ? trimmedLine.substring(2) : trimmedLine.substring(2);
        processedLines.push(`<li class="ml-6 text-sm text-muted-foreground leading-relaxed relative before:content-['•'] before:absolute before:-ml-4 before:text-primary">${listContent}</li>`);
      }
      // Handle empty lines
      else if (trimmedLine === '') {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        // Add spacing between sections
        if (processedLines.length > 0 && !processedLines[processedLines.length - 1].includes('</ul>')) {
          processedLines.push('<div class="mb-2"></div>');
        }
      }
      // Handle regular paragraphs
      else if (trimmedLine.length > 0) {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        // Apply bold formatting
        let formattedLine = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>');
        processedLines.push(`<p class="mb-3 text-sm text-muted-foreground leading-relaxed">${formattedLine}</p>`);
      }
    }
    
    // Close any remaining list
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('');
  };

  return (
    <div className={`legal-document-viewer w-full ${className}`}>
      {title && (
        <h1 className="text-xl font-bold text-foreground mb-6 pb-2 border-b border-border">{title}</h1>
      )}
      <ScrollArea className="h-full w-full">
        <div className="pr-4">
          <div 
            className="max-w-none text-muted-foreground space-y-1"
            dangerouslySetInnerHTML={{ __html: formatContent(content) }}
          />
        </div>
      </ScrollArea>
    </div>
  );
};