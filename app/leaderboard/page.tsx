import { Suspense } from 'react';
import LeaderboardView from './leaderboard-view';

// useSearchParams 需要 Suspense 邊界，否則整頁會退回 client-side rendering
export default function LeaderboardPage() {
  return (
    <Suspense>
      <LeaderboardView />
    </Suspense>
  );
}
