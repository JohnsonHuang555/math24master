'use client';

import { useRef, useState } from 'react';
import { AddToHomeScreenPrompt } from '@/components/add-to-home-screen-prompt';
import AnnouncementBanner from '@/components/announcement-banner';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { LeaderboardModal } from '@/components/modals/leaderboard-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import AdSection from './ad-section';
import Footer from './footer';
import HeroSection from './hero-section';
import MoreModesSection from './more-modes-section';
import StepsSection from './steps-section';

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);
  const [isOpenLeaderboardModal, setIsOpenLeaderboardModal] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <AddToHomeScreenPrompt />
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <LeaderboardModal
        isOpen={isOpenLeaderboardModal}
        onClose={() => setIsOpenLeaderboardModal(false)}
      />
      <AchievementModal
        isOpen={isOpenAchievementModal}
        onClose={() => setIsOpenAchievementModal(false)}
      />
      <StatsModal
        isOpen={isOpenStatsModal}
        onClose={() => setIsOpenStatsModal(false)}
      />

      <div
        ref={scrollRef}
        className="flex h-full w-full flex-col overflow-y-auto"
      >
        <AnnouncementBanner />
        <HeroSection
          onOpenLeaderboardModal={() => setIsOpenLeaderboardModal(true)}
          onOpenStatsModal={() => setIsOpenStatsModal(true)}
          onOpenAchievementModal={() => setIsOpenAchievementModal(true)}
        />
        <MoreModesSection scrollRef={scrollRef} />
        <AdSection />
        <StepsSection scrollRef={scrollRef} />
        <Footer />
      </div>
    </>
  );
};

export default Homepage;
