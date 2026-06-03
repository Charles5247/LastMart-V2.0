import React, { Suspense } from 'react';
import ResetClient from '@/components/auth/ResetClient';

export const dynamic = 'force-dynamic';

export default function ResetPage() {
  return (
    <Suspense fallback={<div />}>
      <ResetClient />
    </Suspense>
  );
}
