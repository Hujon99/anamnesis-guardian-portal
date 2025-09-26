/**
 * Template Selector Component
 * Modal interface for selecting and duplicating form templates.
 * Provides categorized templates with search and preview functionality.
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, FileText, Copy, Eye } from 'lucide-react';

import { FormTemplateData, useFormTemplates } from '@/hooks/useFormTemplates';
import { useFormDuplication } from '@/hooks/useFormDuplication';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelected?: (templateId: string) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  onOpenChange,
  onTemplateSelected
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newFormTitle, setNewFormTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplateData | null>(null);

  const { data: templates = [], isLoading } = useFormTemplates();
  const { duplicateForm, isDuplicating } = useFormDuplication();

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.examination_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || template.template_category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = Array.from(new Set(templates.map(t => t.template_category).filter(Boolean)));

  const handleDuplicate = async () => {
    if (!selectedTemplate || !newFormTitle.trim()) return;

    await duplicateForm({
      templateId: selectedTemplate.id,
      newTitle: newFormTitle.trim(),
      examinationType: selectedTemplate.examination_type,
      templateCategory: selectedTemplate.template_category || undefined
    });

    onOpenChange(false);
    setSelectedTemplate(null);
    setNewFormTitle('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Välj formulärmall
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search and filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Sök mallar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Alla
              </Button>
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Templates list */}
            <div>
              <h3 className="font-medium mb-3">Tillgängliga mallar ({filteredTemplates.length})</h3>
              <ScrollArea className="h-96">
                <div className="space-y-3">
                  {filteredTemplates.map((template) => (
                    <Card 
                      key={template.id}
                      className={`cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm">{template.title}</CardTitle>
                          {template.organization_id ? (
                            <Badge variant="secondary">Organistion</Badge>
                          ) : (
                            <Badge variant="outline">Global</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            {template.examination_type}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {template.schema.sections?.length || 0} sektioner, {' '}
                            {template.schema.sections?.reduce((total, section) => 
                              total + section.questions.length, 0
                            ) || 0} frågor
                          </p>
                          {template.template_category && (
                            <Badge variant="outline" className="text-xs">
                              {template.template_category}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Template details and duplication */}
            <div>
              {selectedTemplate ? (
                <div className="space-y-4">
                  <h3 className="font-medium">Mall detaljer</h3>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium">{selectedTemplate.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {selectedTemplate.examination_type}
                          </p>
                        </div>

                        <div>
                          <label className="text-sm font-medium">Titel för nytt formulär:</label>
                          <Input
                            value={newFormTitle}
                            onChange={(e) => setNewFormTitle(e.target.value)}
                            placeholder="Ange titel..."
                            className="mt-1"
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={handleDuplicate}
                            disabled={!newFormTitle.trim() || isDuplicating}
                            className="flex-1 gap-2"
                          >
                            <Copy className="h-4 w-4" />
                            {isDuplicating ? 'Duplicerar...' : 'Duplicera mall'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4" />
                  <p>Välj en mall för att se detaljer</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};