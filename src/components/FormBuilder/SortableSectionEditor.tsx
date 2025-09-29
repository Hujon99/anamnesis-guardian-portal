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
}

export const SortableSectionEditor: React.FC<SortableSectionEditorProps> = ({
  section,
  sectionIndex,
  schema,
  onUpdate,
  onDelete,
  isFromDatabase = false
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative transition-all duration-200 ${
        isDragging ? 'opacity-50 z-50' : 'opacity-100'
      }`}
    >
      {/* Drag handle overlay */}
      <div 
        {...attributes}
        {...listeners}
        className={`
          absolute -left-8 top-4 z-10 flex items-center justify-center
          w-6 h-8 rounded border bg-background/80 backdrop-blur-sm
          cursor-grab active:cursor-grabbing
          opacity-0 hover:opacity-100 group-hover:opacity-100
          transition-all duration-200 hover:bg-accent_teal/10 hover:border-accent_teal/50
          ${isDragging ? 'opacity-100' : ''}
        `}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {/* Section Editor */}
      <div className="group">
        <SectionEditor
          section={section}
          sectionIndex={sectionIndex}
          schema={schema}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isFromDatabase={isFromDatabase}
        />
      </div>

      {/* Visual feedback when dragging */}
      {isDragging && (
        <div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-lg pointer-events-none" />
      )}
    </div>
  );
};