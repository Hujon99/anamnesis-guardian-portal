
/**
 * Format a date string or timestamp to a localized format
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Date formatting error:", error);
    return "Ogiltigt datum";
  }
}
