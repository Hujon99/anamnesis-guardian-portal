/**
 * Custom hook that debounces react-hook-form watch calls
 * to reduce re-renders during rapid user input.
 */

import { useEffect, useState } from 'react';
import { UseFormWatch } from 'react-hook-form';

export function useDebouncedWatch(
  watch: UseFormWatch<any>,
  delay: number = 300
): Record<string, any> {
  const watchedValues = watch();
  const [debouncedValues, setDebouncedValues] = useState(watchedValues);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValues(watchedValues);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [watchedValues, delay]);

  return debouncedValues;
}
