'use client';

import { useState } from 'react';
import { AddToHomeScreenPrompt } from '@/components/add-to-home-screen-prompt';
import AnnouncementBanner from '@/components/announcement-banner';
import { AchievementModal } from '@/components/modals/achievement-modal';
import { RuleModal } from '@/components/modals/rule-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import Footer from './footer';
import HeroSection from './hero-section';
import MoreModesSection from './more-modes-section';
import StepsSection from './steps-section';

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenAchievementModal, setIsOpenAchievementModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);

  return (
    <>
      <AddToHomeScreenPrompt />
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <AchievementModal
        isOpen={isOpenAchievementModal}
        onClose={() => setIsOpenAchievementModal(false)}
      />
      <StatsModal
        isOpen={isOpenStatsModal}
        onClose={() => setIsOpenStatsModal(false)}
      />

      <div className="flex h-full w-full flex-col overflow-y-auto">
        <AnnouncementBanner />
        <HeroSection
          onOpenStatsModal={() => setIsOpenStatsModal(true)}
          onOpenAchievementModal={() => setIsOpenAchievementModal(true)}
        />
        <MoreModesSection />
        <StepsSection />
        <Footer />
      </div>
    </>
  );
};

export default Homepage;
