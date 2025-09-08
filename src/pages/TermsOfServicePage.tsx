/**
 * Terms of Service Page
 * Standalone page for displaying the complete terms of service.
 * Provides public access to legal documents with proper navigation and layout.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LegalDocumentViewer } from '@/components/Legal/LegalDocumentViewer';
import { termsOfServiceContent } from '@/legal';

const TermsOfServicePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-light">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-elegant p-8">
          <LegalDocumentViewer
            content={termsOfServiceContent}
            title="Användarvillkor"
          />
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Har du frågor om våra användarvillkor? Kontakta oss på{' '}
            <a href="mailto:privacy@binokel.se" className="text-primary hover:text-primary-glow underline">
              privacy@binokel.se
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;