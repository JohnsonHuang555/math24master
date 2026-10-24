'use client';

import { Volume2, VolumeX } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSound } from '@/hooks/useSound';
import { Button } from './ui/button';

const SoundToggle = () => {
  const { soundEnabled, toggleSound } = useSound();
  const t = useTranslations('SoundToggle');

  return (
    <Button
      variant="ghost"
      size="icon"
      className="fixed bottom-4 right-4 z-50 rounded-full bg-black/20 backdrop-blur-xs hover:bg-black/30"
      onClick={toggleSound}
      title={soundEnabled ? t('mute') : t('unmute')}
    >
      {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
    </Button>
  );
};

export default SoundToggle;
