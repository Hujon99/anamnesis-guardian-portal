/**
 * Form Management Grid Component
 * Provides overview and management interface for all forms in an organization.
 * Displays forms in a grid with filtering, search, and quick actions.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Eye,
  Settings
} from 'lucide-react';

import { useOrganizationForms } from '@/hooks/useOrganizationForms';
import { useFormCRUD } from '@/hooks/useFormCRUD';
import { useFormDuplication } from '@/hooks/useFormDuplication';
import { FormBuilder } from './FormBuilder';
import { TemplateSelector } from './TemplateSelector';

interface FormManagementGridProps {
  onCreateNew?: () => void;
}

export const FormManagementGrid: React.FC<FormManagementGridProps> = ({
  onCreateNew
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFormBuilder, setShowFormBuilder] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [formToDelete, setFormToDelete] = useState<any>(null);

  const { data: forms = [], isLoading, refetch } = useOrganizationForms();
  const { deleteForm, isDeleting } = useFormCRUD();
  const { duplicateForm } = useFormDuplication();

  // Only show organization-specific forms (not global templates)
  // Global templates should only be visible in TemplateSelector
  const organizationForms = forms.filter(form => form.organization_id !== null);

  // Filter forms based on search
  const filteredForms = organizationForms.filter(form =>
    form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    form.examination_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditForm = (form: any) => {
    setSelectedForm(form);
    setShowFormBuilder(true);
  };

  const handleDuplicateForm = async (form: any) => {
    await duplicateForm({
      templateId: form.id,
      newTitle: `${form.title} (Kopia)`,
      examinationType: form.examination_type
    });
    refetch();
  };

  const handleDeleteForm = (form: any) => {
    setFormToDelete(form);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (formToDelete) {
      await deleteForm(formToDelete.id);
      setShowDeleteDialog(false);
      setFormToDelete(null);
      refetch();
    }
  };

  const handleCreateNew = () => {
    setSelectedForm(null);
    setShowFormBuilder(true);
  };

  const handleCreateFromTemplate = () => {
    setShowTemplateSelector(true);
  };

  const handleFormSaved = () => {
    setShowFormBuilder(false);
    setSelectedForm(null);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Laddar formulär...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              Formulär
            </h2>
            <p className="text-muted-foreground mt-1">
              Skapa och hantera dina formulär
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateFromTemplate} variant="outline" className="gap-2">
              <Copy className="h-4 w-4" />
              Från mall
            </Button>
            <Button onClick={handleCreateNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Skapa nytt
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Sök formulär..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Forms Grid */}
        {filteredForms.length === 0 && !searchTerm && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inga formulär ännu</h3>
            <p className="text-muted-foreground mb-6">
              Kom igång genom att skapa ett nytt formulär eller duplicera en färdig mall
            </p>
            <div className="flex justify-center gap-2">
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Skapa nytt formulär
              </Button>
              <Button onClick={handleCreateFromTemplate} variant="outline" className="gap-2">
                <Copy className="h-4 w-4" />
                Använd mall
              </Button>
            </div>
          </div>
        )}

        {filteredForms.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Inga matchande formulär</h3>
            <p className="text-muted-foreground">
              Försök med en annan sökterm
            </p>
          </div>
        )}

        {filteredForms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredForms.map((form) => (
              <Card key={form.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg truncate">{form.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {form.examination_type}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEditForm(form)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Redigera
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicateForm(form)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicera
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteForm(form)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Ta bort
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        {form.schema?.sections?.length || 0} sektioner
                      </span>
                      <span>
                        {form.schema?.sections?.reduce((total: number, section: any) => 
                          total + (section.questions?.length || 0), 0
                        ) || 0} frågor
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {form.organization_id ? (
                        <Badge variant="secondary">Organisation</Badge>
                      ) : (
                        <Badge variant="outline">Global</Badge>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => handleEditForm(form)}
                      className="w-full gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      Redigera formulär
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Form Builder Modal */}
      {showFormBuilder && (
        <div className="fixed inset-0 z-[70] bg-background">
          <FormBuilder
            formId={selectedForm?.id}
            initialForm={selectedForm ? {
              id: selectedForm.id,
              title: selectedForm.title,
              examination_type: selectedForm.examination_type,
              schema: selectedForm.schema
            } : undefined}
            onSave={handleFormSaved}
            onClose={() => {
              setShowFormBuilder(false);
              setSelectedForm(null);
            }}
          />
        </div>
      )}

      {/* Template Selector */}
      <TemplateSelector
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        onTemplateSelected={() => {
          setShowTemplateSelector(false);
          refetch();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort formulär</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort formuläret "{formToDelete?.title}"?
              Denna åtgärd kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Tar bort...' : 'Ta bort formulär'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};