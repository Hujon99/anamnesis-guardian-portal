/**
 * FeedbackButton Component
 * 
 * This component provides a feedback button for the sidebar that triggers the feedback dialog.
 * It's designed to be integrated into the application's sidebar navigation.
 */

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton 
          onClick={() => setDialogOpen(true)}
          tooltip="Send feedback about the application"
        >
          <MessageSquare />
          <span>Send Feedback</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      
      <FeedbackDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />
    </>
  );
}