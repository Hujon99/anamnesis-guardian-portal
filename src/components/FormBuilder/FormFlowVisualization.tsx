/**
 * Form Flow Visualization Component
 * Provides a visual overview of the form structure showing sections as nodes
 * with conditional flow arrows to help users understand the form logic.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Layers, 
  ArrowDown, 
  ArrowRight, 
  Eye, 
  Edit, 
  Plus, 
  Workflow,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { FormTemplate } from '@/types/anamnesis';

interface FormFlowVisualizationProps {
  schema: FormTemplate;
  onEditSection?: (sectionIndex: number) => void;
  onAddSection?: () => void;
}

interface FlowNode {
  id: string;
  type: 'section' | 'question';
  title: string;
  sectionIndex?: number;
  questionIndex?: number;
  conditional?: {
    dependsOn: string;
    condition: string;
  };
  questionCount?: number;
}

export const FormFlowVisualization: React.FC<FormFlowVisualizationProps> = ({
  schema,
  onEditSection,
  onAddSection
}) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Generate flow nodes from schema
  const flowNodes: FlowNode[] = React.useMemo(() => {
    const nodes: FlowNode[] = [];
    
    schema.sections.forEach((section, sectionIndex) => {
      // Add section node
      const sectionNode: FlowNode = {
        id: `section-${sectionIndex}`,
        type: 'section',
        title: section.section_title,
        sectionIndex,
        questionCount: section.questions.length,
        conditional: section.show_if ? {
          dependsOn: section.show_if.question,
          condition: `${section.show_if.equals}`
        } : undefined
      };
      nodes.push(sectionNode);
      
      // Add conditional question nodes if they have significant logic
      section.questions.forEach((question, questionIndex) => {
        if (question.show_if) {
          const questionNode: FlowNode = {
            id: `question-${sectionIndex}-${questionIndex}`,
            type: 'question',
            title: question.label,
            sectionIndex,
            questionIndex,
            conditional: {
              dependsOn: question.show_if.question,
              condition: `${question.show_if.equals}`
            }
          };
          nodes.push(questionNode);
        }
      });
    });
    
    return nodes;
  }, [schema]);

  const getNodeStyle = (node: FlowNode) => {
    const isHovered = hoveredNode === node.id;
    const isSelected = selectedNode === node.id;
    
    if (node.type === 'section') {
      return `
        transition-all duration-200 cursor-pointer
        ${isHovered ? 'shadow-lg scale-105' : 'hover:shadow-md'}
        ${isSelected ? 'ring-2 ring-primary' : ''}
        ${node.conditional ? 'border-l-4 border-l-accent' : 'border-l-4 border-l-primary/20'}
      `;
    } else {
      return `
        transition-all duration-200 cursor-pointer ml-8
        ${isHovered ? 'shadow-md scale-102' : 'hover:shadow-sm'}
        ${isSelected ? 'ring-2 ring-accent' : ''}
        border-l-4 border-l-accent/50 bg-accent/5
      `;
    }
  };

  const findDependencyNode = (dependencyId: string) => {
    for (const section of schema.sections) {
      for (const question of section.questions) {
        if (question.id === dependencyId) {
          return {
            questionLabel: question.label,
            sectionTitle: section.section_title
          };
        }
      }
    }
    return null;
  };

  const renderConditionalInfo = (node: FlowNode) => {
    if (!node.conditional) return null;
    
    const dependency = findDependencyNode(node.conditional.dependsOn);
    
    return (
      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Eye className="h-3 w-3" />
          <span>
            Visas när "{dependency?.questionLabel || node.conditional.dependsOn}" är "{node.conditional.condition}"
          </span>
        </div>
        {dependency && (
          <div className="text-xs text-muted-foreground mt-1">
            från "{dependency.sectionTitle}"
          </div>
        )}
      </div>
    );
  };

  const hasConditionalLogic = flowNodes.some(node => node.conditional);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-medium">Formulärflöde</h3>
            {hasConditionalLogic && (
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                Villkorlig logik aktiv
              </Badge>
            )}
          </div>
          
          {onAddSection && (
            <Button size="sm" onClick={onAddSection} className="gap-2">
              <Plus className="h-4 w-4" />
              Lägg till sektion
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {flowNodes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Inget formulärflöde att visa</p>
              {onAddSection && (
                <Button onClick={onAddSection} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Skapa första sektionen
                </Button>
              )}
            </div>
          ) : (
            <>
              {flowNodes.map((node, index) => (
                <div key={node.id}>
                  <Card
                    className={getNodeStyle(node)}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
                  >
                    {node.type === 'section' ? (
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">{node.title}</CardTitle>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {node.questionCount} frågor
                            </Badge>
                            {onEditSection && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditSection(node.sectionIndex!);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {renderConditionalInfo(node)}
                      </CardHeader>
                    ) : (
                      <CardContent className="py-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-3 w-3 text-accent" />
                          <span className="text-sm font-medium">{node.title}</span>
                        </div>
                        {renderConditionalInfo(node)}
                      </CardContent>
                    )}
                  </Card>
                  
                  {/* Flow arrow */}
                  {index < flowNodes.length - 1 && (
                    <div className="flex justify-center py-2">
                      {node.type === 'section' && flowNodes[index + 1]?.type === 'question' ? (
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  )}
                </div>
              ))}
              
              {/* Summary card */}
              <Card className="bg-surface-light border-dashed">
                <CardContent className="py-4">
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">Formulär komplett</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {schema.sections.length} sektioner • {' '}
                      {schema.sections.reduce((total, section) => total + section.questions.length, 0)} frågor
                      {hasConditionalLogic && ' • Villkorlig logik'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};