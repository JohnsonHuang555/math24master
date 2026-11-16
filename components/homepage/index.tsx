'use client';

import { useState } from 'react';
import { AddToHomeScreenPrompt } from '@/components/add-to-home-screen-prompt';
import { RuleModal } from '@/components/modals/rule-modal';
import { StatsModal } from '@/components/modals/stats-modal';
import Footer from './footer';
import HeroSection from './hero-section';
import MoreModesSection from './more-modes-section';
import StepsSection from './steps-section';

const Homepage = () => {
  const [isOpenRuleModal, setIsOpenRuleModal] = useState(false);
  const [isOpenStatsModal, setIsOpenStatsModal] = useState(false);

  return (
    <>
      <AddToHomeScreenPrompt />
      <RuleModal isOpen={isOpenRuleModal} onOpenChange={setIsOpenRuleModal} />
      <StatsModal
        isOpen={isOpenStatsModal}
        onClose={() => setIsOpenStatsModal(false)}
      />

      <div className="flex h-full w-full flex-col overflow-y-auto">
        {/* 新玩法公告（AnnouncementBanner）不放首頁，讓主視覺與快速試玩成為第一個內容 */}
        <HeroSection onOpenStatsModal={() => setIsOpenStatsModal(true)} />
        <StepsSection />
        <MoreModesSection />
        <Footer />
      </div>
    </>
  );
};

export default Homepage;
