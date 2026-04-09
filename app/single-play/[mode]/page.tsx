'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SinglePlayModePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/single-play');
  }, [router]);

  return null;
}
