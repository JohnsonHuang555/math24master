'use client';

import { ReactNode } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type HoverTipProps = {
  children: ReactNode;
  content: ReactNode;
  notPointer?: boolean;
};

const HoverTip = ({ children, content, notPointer }: HoverTipProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className={cn(notPointer && 'cursor-auto')}>
          {children}
        </TooltipTrigger>
        <TooltipContent>{content}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default HoverTip;
