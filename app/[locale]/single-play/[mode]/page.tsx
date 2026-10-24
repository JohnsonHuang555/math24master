'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

export default function SinglePlayModePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/single-play');
  }, [router]);

  return null;
}
