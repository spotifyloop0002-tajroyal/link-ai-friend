import { useEffect } from 'react';

/**
 * Hook to set dynamic page titles for LinkedBot
 * @param pageTitle - The specific page title (e.g., "Dashboard", "Analytics")
 */
export const usePageTitle = (pageTitle?: string) => {
  useEffect(() => {
    const baseTitle = 'LinkedBot';
    document.title = pageTitle ? `${baseTitle} - ${pageTitle}` : `${baseTitle} - AI LinkedIn Automation`;
  }, [pageTitle]);
};
