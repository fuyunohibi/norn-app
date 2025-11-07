/**
 * Format date to show only the year
 * Example: "2025-01-15" -> "2025"
 */
export const formatYear = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.getFullYear().toString();
  } catch (error) {
    console.error('Error formatting year:', error);
    return '';
  }
};

/**
 * Format date to "Member since YYYY" format
 * Example: "2025-01-15" -> "Member since 2025"
 */
export const formatMemberSince = (dateString: string | null | undefined): string => {
  const year = formatYear(dateString);
  if (!year) return '';
  
  return `Member since ${year}`;
};

/**
 * Format date to a readable format
 * Example: "2025-01-15" -> "January 15, 2025"
 */
export const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

/**
 * Format date to short format
 * Example: "2025-01-15" -> "Jan 15, 2025"
 */
export const formatDateShort = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

