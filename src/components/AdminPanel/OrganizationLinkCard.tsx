/**
 * Visar och låter administratörer kopiera organisationslänken som leder till formulär.
 * Länken används för att ge användare direkt tillgång till organisationens formulär.
 */

import React, { useState } from 'react';
import { useOrganization } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, CheckCircle, Link as LinkIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const OrganizationLinkCard: React.FC = () => {
  const { organization } = useOrganization();
  const [copied, setCopied] = useState(false);

  if (!organization) return null;

  const organizationLink = `${window.location.origin}/link?org_id=${organization.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(organizationLink);
      setCopied(true);
      toast({
        title: "Länk kopierad",
        description: "Organisationslänken har kopierats till urklipp",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast({
        title: "Kunde inte kopiera länk",
        description: "Försök igen eller kopiera länken manuellt",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LinkIcon className="h-5 w-5 text-primary" />
          Organisationslänk
        </CardTitle>
        <CardDescription>
          Dela denna länk för att ge användare tillgång till organisationens formulär
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input 
            value={organizationLink} 
            readOnly 
            className="flex-1 font-mono text-sm"
          />
          <Button 
            onClick={handleCopyLink}
            variant="outline"
            size="icon"
            className="shrink-0"
          >
            {copied ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
