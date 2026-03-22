'use client';

import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`font-landing flex w-full mb-4 ${
        isAssistant ? 'justify-start' : 'justify-end'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isAssistant
            ? 'bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] text-gray-800 dark:text-gray-200'
            : 'bg-[#3ECF8E]/10 border border-[#3ECF8E]/30 text-gray-800 dark:text-gray-200'
        }`}
      >
        <div className="text-xs font-semibold mb-1 text-landing-muted">
          {isAssistant ? 'Interviewer' : 'You'}
        </div>
        <div className="text-base whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

