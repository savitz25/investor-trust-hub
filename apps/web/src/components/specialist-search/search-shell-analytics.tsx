'use client';
import { useEffect } from 'react';
import { track } from '@vercel/analytics';

export function SearchShellAnalytics() {
  useEffect(() => {
    const forms = document.querySelectorAll<HTMLFormElement>('form[data-specialist-search]');
    const submit = () => track('specialist_search_submit', { hub: 'investor' });
    forms.forEach((form) => form.addEventListener('submit', submit));
    return () => forms.forEach((form) => form.removeEventListener('submit', submit));
  }, []);
  return null;
}
