'use client';

import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={`flex w-full mb-4 ${
        isAssistant ? 'justify-start' : 'justify-end'
      }`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isAssistant
            ? 'bg-blue-100 text-blue-900'
            : 'bg-green-100 text-green-900'
        }`}
      >
        <div className="text-sm font-semibold mb-1">
          {isAssistant ? 'Interviewer' : 'You'}
        </div>
        <div className="text-base whitespace-pre-wrap">{message.content}</div>
      </div>
    </div>
  );
}

