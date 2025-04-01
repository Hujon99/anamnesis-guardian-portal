
interface PrintStylesProps {
  showPrintPreview: boolean;
}

export const PrintStyles = ({ showPrintPreview }: PrintStylesProps) => {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-view, .print-view * {
          visibility: visible;
        }
        .print-view {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .print-view button, 
        .print-view .ScrollArea, 
        .print-view [data-radix-scroll-area-viewport] {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
        /* Hide elements not needed in print */
        .print-view button {
          display: none !important;
        }
      }
    `}} />
  );
};
