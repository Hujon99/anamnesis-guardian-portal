/**
 * Consent Checkbox Component
 * Renders a checkbox with linked text for legal consent.
 * Handles opening legal documents in modals when links are clicked.
 */

import React, { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { LegalConsentModal } from './LegalConsentModal';
import { privacyPolicyContent, termsOfServiceContent } from '@/legal';

interface ConsentCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
}

export const ConsentCheckbox: React.FC<ConsentCheckboxProps> = ({
  checked,
  onCheckedChange,
  className = ''
}) => {
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: string;
  } | null>(null);

  const handleLinkClick = (e: React.MouseEvent, type: 'privacy' | 'terms') => {
    e.preventDefault();
    if (type === 'privacy') {
      setModalContent({
        title: 'Integritetspolicy',
        content: privacyPolicyContent
      });
    } else {
      setModalContent({
        title: 'Användarvillkor',
        content: termsOfServiceContent
      });
    }
  };

  return (
    <>
      <div className={`flex items-start space-x-3 ${className}`}>
        <Checkbox
          id="legal-consent"
          checked={checked}
          onCheckedChange={onCheckedChange}
          className="mt-1"
        />
        <label 
          htmlFor="legal-consent" 
          className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
        >
          Jag har läst och godkänner{' '}
          <button
            type="button"
            onClick={(e) => handleLinkClick(e, 'privacy')}
            className="text-primary hover:text-primary-glow underline font-medium transition-colors"
          >
            integritetspolicyn
          </button>
          {' '}och{' '}
          <button
            type="button"
            onClick={(e) => handleLinkClick(e, 'terms')}
            className="text-primary hover:text-primary-glow underline font-medium transition-colors"
          >
            användarvillkoren
          </button>
          . Jag förstår att mina uppgifter kommer att delas med min optiker för undersökning och journalföring.
        </label>
      </div>

      <LegalConsentModal
        isOpen={!!modalContent}
        onClose={() => setModalContent(null)}
        title={modalContent?.title || ''}
        content={modalContent?.content || ''}
      />
    </>
  );
};