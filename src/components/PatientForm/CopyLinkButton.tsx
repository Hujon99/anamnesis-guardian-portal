
/**
 * This component provides a button to copy the current form URL to the clipboard,
 * allowing users to easily share or save the link to their form.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CopyLinkButtonProps {
  className?: string;
}

const CopyLinkButton: React.FC<CopyLinkButtonProps> = ({ className = "" }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Länk kopierad till urklipp");
      
      // Reset the copied status after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
      toast.error("Kunde inte kopiera länken", {
        description: "Försök igen eller kopiera webbadressen manuellt från webbläsarens adressfält."
      });
    }
  };
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`${className}`}
          onClick={handleCopy}
          aria-label="Kopiera formulärlänk"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          Kopiera länk
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        Kopiera länk till detta formulär
      </TooltipContent>
    </Tooltip>
  );
};

export default CopyLinkButton;
