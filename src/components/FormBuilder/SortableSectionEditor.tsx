/**
 * Sortable Section Editor Wrapper
 * Enables drag-and-drop functionality for sections within the form builder.
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { FormSection, FormTemplate } from '@/types/anamnesis';
import { SectionEditor } from './SectionEditor';

interface SortableSectionEditorProps {
  section: FormSection;
  sectionIndex: number;
  schema: FormTemplate;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  isFromDatabase?: boolean;
  isNewlyAdded?: boolean;
  newQuestionIndex?: number;
}

export const SortableSectionEditor: React.FC<SortableSectionEditorProps> = ({
  section,
  sectionIndex,
  schema,
  onUpdate,
  onDelete,
  isFromDatabase = false,
  isNewlyAdded = false,
  newQuestionIndex
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: `section-${sectionIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Debug logging
  console.log(`[SortableSectionEditor] Rendering section ${sectionIndex}, isDragging: ${isDragging}`);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${
        isDragging ? 'opacity-50 z-50 shadow-xl' : 'opacity-100'
      }`}
    >
      {/* Section Editor with integrated drag handle */}
      <div className="group relative">
        {/* Drag handle - positioned inside the card */}
        <div 
          {...attributes}
          {...listeners}
          className={`
            absolute left-2 top-3 z-20 flex items-center justify-center
            w-6 h-6 rounded border bg-muted/50 backdrop-blur-sm
            cursor-grab active:cursor-grabbing
            opacity-60 hover:opacity-100 group-hover:opacity-100
            transition-all duration-200 hover:bg-accent_teal/20 hover:border-accent_teal/50
            hover:scale-110 active:scale-95
            ${isDragging ? 'opacity-100 bg-accent_teal/20' : ''}
          `}
          title="Dra för att flytta sektion"
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
        </div>
        
        {/* Section Editor with left padding for drag handle */}
        <div className="pl-10">
          <SectionEditor
            section={section}
            sectionIndex={sectionIndex}
            schema={schema}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isFromDatabase={isFromDatabase}
            isNewlyAdded={isNewlyAdded}
            newQuestionIndex={newQuestionIndex}
          />
        </div>
      </div>

      {/* Enhanced visual feedback when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-gradient-to-r from-accent_teal/10 to-primary/10 border-2 border-dashed border-accent_teal rounded-lg pointer-events-none animate-pulse" />
      )}
    </div>
  );
};