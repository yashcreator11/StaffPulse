'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import LockedFeatureGate from '@/components/billing/LockedFeatureGate';
import { GatedFeature } from '@/lib/billing/planGating';
import { Loader2 } from 'lucide-react';

function LockedFeatureContent() {
  const searchParams = useSearchParams();
  const feature = (searchParams.get('feature') as GatedFeature) || 'leave_portal';

  return (
    <div className="min-h-screen bg-[var(--bg-surface)] flex items-center justify-center py-12 px-4">
      <LockedFeatureGate
        feature={feature}
        backHref="/"
        backLabel="Return to Attendance Dashboard"
      />
    </div>
  );
}

export default function LockedFeaturePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-surface)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
        </div>
      }
    >
      <LockedFeatureContent />
    </Suspense>
  );
}
