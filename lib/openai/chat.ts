import OpenAI from 'openai';
import { Question, DiscoveryContext, InterviewMode } from '@/types';
import { discoverEntitiesAndEvents } from '@/lib/entities/discovery';
import { DEFAULT_ENTITY_SCHEMAS } from '@/lib/entities/schemas';
import { checkAnswer } from '@/lib/tools/checkAnswer';
import { reviewForContradiction } from '@/lib/tools/reviewForContradiction';
import { detectDisengagement } from '@/lib/tools/detectDisengagement';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DebugStep {
  type: 'tool_call' | 'thinking';
  name?: string;
  input?: unknown;
  output?: unknown;
  content?: string;
  timestamp?: string;
}

export interface ChatRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentQuestionIndex: number;
  questions: Question[];
  coveredSubTopics?: Array<{ questionIndex: number; subTopicIndex: number }>;
  currentQuestionWordCount?: number;
  discoveryContext?: DiscoveryContext;
  /** Number of user replies for the current question (used for mode 3 follow-up). */
  userRepliesForCurrentQuestion?: number;
  /** When true, response includes debugSteps for the debug panel. */
  includeDebug?: boolean;
  /** Optional intro before the first question (e.g. screening). */
  intro?: string;
  /** Optional conclusion after all questions are covered. */
  conclusion?: string;
  /** Optional reminder shown once when interviewee dismisses the interview. */
  reminder?: string;
  /** Whether the reminder has already been shown this session. */
  reminderAlreadyShown?: boolean;
}

export interface ChatResponse {
  response: string;
  questionCovered: boolean;
  allQuestionsCovered: boolean;
  discoveryContext?: DiscoveryContext;
  followUpQuestions?: string[];
  debugSteps?: DebugStep[];
  /** True when the disengagement reminder was shown this turn. */
  reminderShown?: boolean;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export type StreamSink = (delta: string) => void;

/** Run a single completion; when streamSink is provided, streams content deltas and returns full content. */
async function runCompletion(
  params: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    max_tokens?: number;
  },
  streamSink?: StreamSink
): Promise<string> {
  if (streamSink) {
    const stream = await openai.chat.completions.create({
      ...params,
      stream: true,
    });
    let full = '';
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      full += delta;
      streamSink(delta);
    }
    return full;
  }
  const completion = await openai.chat.completions.create(params);
  return completion.choices[0]?.message?.content ?? '';
}

export async function generateChatResponse(
  request: ChatRequest,
  options?: { streamSink?: StreamSink }
): Promise<ChatResponse> {
  const streamSink = options?.streamSink;
  const { 
    messages, 
    currentQuestionIndex, 
    questions, 
    coveredSubTopics = [], 
    currentQuestionWordCount = 0,
    discoveryContext = {
      entities: [],
      timeline: [],
      entitySchemas: DEFAULT_ENTITY_SCHEMAS,
    },
    userRepliesForCurrentQuestion = 0,
    includeDebug = false,
    intro,
    conclusion,
    reminder,
    reminderAlreadyShown = false,
  } = request;

  const debugSteps: DebugStep[] | undefined = includeDebug ? [] : undefined;
  const pushDebug = (step: DebugStep) => {
    if (debugSteps) debugSteps.push({ ...step, timestamp: new Date().toISOString() });
  };
  const debugPayload = () => (debugSteps?.length ? { debugSteps } : {});

  const mode: InterviewMode = (questions[currentQuestionIndex]?.mode ?? 4) as InterviewMode;
  if (debugSteps) pushDebug({ type: 'thinking', content: `Mode ${mode}: ${!questions[currentQuestionIndex] ? 'no current question' : `current question: "${questions[currentQuestionIndex].mainQuestion}"` }.` });

  // Run discovery only for mode 4 (biographer) and optionally mode 5
  let updatedDiscoveryContext = { ...discoveryContext };
  let discoveryFollowUps: string[] = [];

  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage && (mode === 4 || mode === 5)) {
    try {
      pushDebug({ type: 'tool_call', name: 'discover-entities', input: { messageCount: messages.length } });
      const discoveryResult = await discoverEntitiesAndEvents({
        messages,
        currentContext: discoveryContext,
      });
      pushDebug({
        type: 'tool_call',
        name: 'discover-entities',
        output: {
          newEntities: discoveryResult.newEntities.length,
          updatedEntities: discoveryResult.updatedEntities.length,
          newTimelineEvents: discoveryResult.newTimelineEvents.length,
          followUpQuestions: discoveryResult.followUpQuestions?.length ?? 0,
        },
      });

      updatedDiscoveryContext = {
        ...discoveryContext,
        entities: [
          ...discoveryContext.entities.filter(e => 
            !discoveryResult.updatedEntities.find(ue => ue.id === e.id)
          ),
          ...discoveryResult.newEntities,
          ...discoveryResult.updatedEntities,
        ],
        timeline: [
          ...discoveryContext.timeline.filter(e => 
            !discoveryResult.updatedTimelineEvents.find(ue => ue.id === e.id)
          ),
          ...discoveryResult.newTimelineEvents,
          ...discoveryResult.updatedTimelineEvents,
        ],
        entitySchemas: discoveryContext.entitySchemas.length > 0 
          ? discoveryContext.entitySchemas 
          : DEFAULT_ENTITY_SCHEMAS,
      };

      discoveryFollowUps = discoveryResult.followUpQuestions;
      
      console.log('Discovery results:', {
        newEntities: discoveryResult.newEntities.length,
        updatedEntities: discoveryResult.updatedEntities.length,
        newTimelineEvents: discoveryResult.newTimelineEvents.length,
        updatedTimelineEvents: discoveryResult.updatedTimelineEvents.length,
        followUpQuestions: discoveryResult.followUpQuestions.length,
      });
    } catch (error) {
      console.error('Discovery error:', error);
      console.error('Discovery error details:', error instanceof Error ? error.stack : error);
    }
  }

  if (!questions || questions.length === 0) {
    return {
      response: "Please configure your questions in the Config panel before starting the interview.",
      questionCovered: false,
      allQuestionsCovered: false,
      ...debugPayload(),
    };
  }

  const currentQuestion = questions[currentQuestionIndex];
  if (!currentQuestion) {
    const response = (conclusion?.trim()) || "Thank you for sharing your story. That covers all the questions I had!";
    return {
      response,
      questionCovered: true,
      allQuestionsCovered: true,
      ...debugPayload(),
    };
  }

  const isFirstMessage = messages.filter(m => m.role === 'assistant').length === 0;

  // --- Disengagement check: show template reminder once if user dismisses the interview ---
  if (reminder?.trim() && !reminderAlreadyShown && lastUserMessage) {
    const disengagementInput = {
      userResponse: lastUserMessage.content,
      questionContext: currentQuestion.mainQuestion,
    };
    if (debugSteps) pushDebug({ type: 'tool_call', name: 'detect-disengagement', input: disengagementInput });
    const disengagementResult = await detectDisengagement(disengagementInput);
    if (debugSteps) pushDebug({ type: 'tool_call', name: 'detect-disengagement', output: disengagementResult });
    if (disengagementResult.disengaged) {
      const response = reminder.trim() + '\n\nLet\'s continue. ' + currentQuestion.mainQuestion;
      return {
        response,
        questionCovered: false,
        allQuestionsCovered: false,
        reminderShown: true,
        ...debugPayload(),
      };
    }
  }

  // --- Mode 1: Screening — check-answer tool; no hints; always move on ---
  if (mode === 1) {
    if (!lastUserMessage) {
      if (streamSink && isFirstMessage && intro?.trim()) {
        streamSink(intro.trim() + '\n\n');
      }
      let response = await runCompletion(
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a formal interviewer. Ask only this question, nothing else: ' + currentQuestion.mainQuestion },
            ...messages,
          ],
          temperature: 0.3,
          max_tokens: 80,
        },
        streamSink
      ) || currentQuestion.mainQuestion;
      if (isFirstMessage && intro?.trim()) {
        response = intro.trim() + '\n\n' + response;
      }
      return { response, questionCovered: false, allQuestionsCovered: false, ...debugPayload() };
    }
    const checkInput = {
      userResponse: lastUserMessage.content,
      acceptableAnswers: currentQuestion.acceptableAnswers ?? [],
      question: currentQuestion.mainQuestion,
    };
    pushDebug({ type: 'tool_call', name: 'check-answer', input: checkInput });
    const result = await checkAnswer(checkInput);
    pushDebug({ type: 'tool_call', name: 'check-answer', output: { correct: result.correct, hint: result.hint } });
    const nextQuestion = questions[currentQuestionIndex + 1];
    let response = result.correct
      ? (currentQuestion.correctReply?.trim() || "That's correct. Let's move on.")
      : (currentQuestion.incorrectReply?.trim() || "That's not quite right. Let's move on.");
    if (nextQuestion) {
      response += ` Next: ${nextQuestion.mainQuestion}`;
    }
    const questionCovered = true;
    const allQuestionsCovered = currentQuestionIndex >= questions.length - 1;
    const finalResponse = (allQuestionsCovered && conclusion?.trim()) ? conclusion.trim() : response;
    return { response: finalResponse, questionCovered, allQuestionsCovered, ...debugPayload() };
  }

  // --- Mode 2: Right answer + hints — check-answer tool; if wrong, return hint and do not advance ---
  if (mode === 2) {
    if (!lastUserMessage) {
      if (streamSink && isFirstMessage && intro?.trim()) {
        streamSink(intro.trim() + '\n\n');
      }
      let response = await runCompletion(
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a professional interviewer. Ask only this question, nothing else: ' + currentQuestion.mainQuestion },
            ...messages,
          ],
          temperature: 0.3,
          max_tokens: 80,
        },
        streamSink
      ) || currentQuestion.mainQuestion;
      if (isFirstMessage && intro?.trim()) {
        response = intro.trim() + '\n\n' + response;
      }
      return { response, questionCovered: false, allQuestionsCovered: false, ...debugPayload() };
    }
    const checkInput2 = {
      userResponse: lastUserMessage.content,
      acceptableAnswers: currentQuestion.acceptableAnswers ?? [],
      question: currentQuestion.mainQuestion,
      hint: currentQuestion.followUpPrompt,
    };
    pushDebug({ type: 'tool_call', name: 'check-answer', input: checkInput2 });
    const result = await checkAnswer(checkInput2);
    pushDebug({ type: 'tool_call', name: 'check-answer', output: { correct: result.correct, hint: result.hint } });
    if (result.correct) {
      const nextQuestion = questions[currentQuestionIndex + 1];
      let response = currentQuestion.correctReply?.trim() || "Good, that's correct. Let's move on.";
      if (nextQuestion) {
        response += ` Next: ${nextQuestion.mainQuestion}`;
      }
      const questionCovered = true;
      const allQuestionsCovered = currentQuestionIndex >= questions.length - 1;
      const finalResponse = (allQuestionsCovered && conclusion?.trim()) ? conclusion.trim() : response;
      return { response: finalResponse, questionCovered, allQuestionsCovered, ...debugPayload() };
    }
    const hint = result.hint || "Can you add a bit more? Think about what might be missing.";
    const response = `You're on the right track. ${hint}`;
    return { response, questionCovered: false, allQuestionsCovered: false, ...debugPayload() };
  }

  // --- Mode 3: List only, no content-based follow-up; optional single followUpPrompt ---
  if (mode === 3) {
    if (!lastUserMessage) {
      if (streamSink && isFirstMessage && intro?.trim()) {
        streamSink(intro.trim() + '\n\n');
      }
      let response = await runCompletion(
        {
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are an interviewer. Ask only this question, nothing else: ' + currentQuestion.mainQuestion },
            ...messages,
          ],
          temperature: 0.3,
          max_tokens: 80,
        },
        streamSink
      ) || currentQuestion.mainQuestion;
      if (isFirstMessage && intro?.trim()) {
        response = intro.trim() + '\n\n' + response;
      }
      return { response, questionCovered: false, allQuestionsCovered: false, ...debugPayload() };
    }
    const hasFollowUp = Boolean(currentQuestion.followUpPrompt?.trim());
    const isFirstReply = userRepliesForCurrentQuestion <= 1;
    if (hasFollowUp && isFirstReply) {
      const response = currentQuestion.followUpPrompt!;
      return { response, questionCovered: false, allQuestionsCovered: false, ...debugPayload() };
    }
    const nextQuestion = questions[currentQuestionIndex + 1];
    let response = "Thanks. Let's move on.";
    if (nextQuestion) {
      response += ` Next: ${nextQuestion.mainQuestion}`;
    }
    const questionCovered = true;
    const allQuestionsCovered = currentQuestionIndex >= questions.length - 1;
    const finalResponse = (allQuestionsCovered && conclusion?.trim()) ? conclusion.trim() : response;
    return { response: finalResponse, questionCovered, allQuestionsCovered, ...debugPayload() };
  }

  // --- Mode 5: review-for-contradiction tool then conversational response ---
  if (mode === 5) {
    const priorUserMessages = messages.filter(m => m.role === 'user').slice(0, -1);
    let contradictionContext = '';
    if (lastUserMessage && priorUserMessages.length > 0) {
      const revInput = {
        priorStatements: priorUserMessages.map(m => m.content),
        latestResponse: lastUserMessage.content,
      };
      pushDebug({ type: 'tool_call', name: 'review-for-contradiction', input: revInput });
      const result = await reviewForContradiction(revInput);
      pushDebug({ type: 'tool_call', name: 'review-for-contradiction', output: result });
      if (result.hasContradiction && (result.summary || result.suggestedClarification)) {
        contradictionContext = `\n\nContradiction check: ${result.summary || 'Possible contradiction.'}${result.suggestedClarification ? ` Suggested clarification: ${result.suggestedClarification}` : ''}\n\nUse this to gently ask for clarification, then move on.`;
      }
    }

    const systemPrompt = `You are a professional political reporter or news anchor interviewing someone who may have made contradictory statements.

Current question: "${currentQuestion.mainQuestion}"
${contradictionContext}

Be conversational but direct. If a contradiction was flagged above, note it calmly and ask for clarification. Otherwise acknowledge and move on. Keep your response concise (2-3 sentences).`;

    if (streamSink && isFirstMessage && !lastUserMessage && intro?.trim()) {
      streamSink(intro.trim() + '\n\n');
    }
    let response = await runCompletion(
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.5,
        max_tokens: 150,
      },
      streamSink
    ) || "Thanks. Let's move on.";
    if (isFirstMessage && !lastUserMessage && intro?.trim()) {
      response = intro.trim() + '\n\n' + response;
    }
    const questionCovered = !!lastUserMessage;
    const allQuestionsCovered = currentQuestionIndex >= questions.length - 1 && questionCovered;
    const finalResponse = (allQuestionsCovered && conclusion?.trim()) ? conclusion.trim() : response;
    return { response: finalResponse, questionCovered, allQuestionsCovered, ...debugPayload() };
  }

  // --- Mode 4: Biographer — existing conversational discovery flow ---
  let totalWordCount = currentQuestionWordCount;

  const currentQuestionCoveredSubTopics = coveredSubTopics
    .filter(c => c.questionIndex === currentQuestionIndex)
    .map(c => c.subTopicIndex);

  const requiredSubTopics = currentQuestion.subTopics
    .map((st, idx) => ({ ...st, index: idx }))
    .filter(st => st.required && !currentQuestionCoveredSubTopics.includes(st.index));

  const optionalSubTopics = currentQuestion.subTopics
    .map((st, idx) => ({ ...st, index: idx }))
    .filter(st => !st.required && !currentQuestionCoveredSubTopics.includes(st.index));

  const entitiesContext = updatedDiscoveryContext.entities.length > 0
    ? `\n\nDiscovered entities so far:\n${updatedDiscoveryContext.entities.map(e => {
        const attrs = Object.entries(e.attributes)
          .filter(([_, v]) => v !== null && v !== undefined && v !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
        return `- ${e.entityType}: ${attrs}`;
      }).join('\n')}`
    : '';

  const timelineContext = updatedDiscoveryContext.timeline.length > 0
    ? `\n\nTimeline of events:\n${updatedDiscoveryContext.timeline.map(e => 
        `- ${e.description}${e.date ? ` (${e.date})` : ' [date needed]'}`
      ).join('\n')}`
    : '';

  const followUpContext = discoveryFollowUps.length > 0
    ? `\n\nIMPORTANT: Based on what was just shared, there are follow-up questions needed:\n${discoveryFollowUps.map(q => `- ${q}`).join('\n')}\n\nPick ONE of these to ask now. Don't ask all of them at once - focus on one topic at a time.`
    : '';

  let systemPrompt = `You are a warm, conversational interviewer helping to capture someone's life story.

Current main question: "${currentQuestion.mainQuestion}"
${entitiesContext}
${timelineContext}
${followUpContext}

Guidelines:
${isFirstMessage 
  ? `- Start with a warm greeting and introduce the first topic naturally. You can ask 1-2 questions to get the conversation started.`
  : `- CRITICAL: Ask ONLY ONE question at a time. Focus on a single topic or follow-up. This is a conversation, not an interrogation.
- After they answer, acknowledge their response briefly (1 sentence), then ask ONE follow-up question.
- Don't ask multiple questions in one response - it's overwhelming and unnatural.
- Stay focused on one topic until you have enough depth, then naturally transition.`}
- Listen carefully to responses and ask thoughtful follow-up questions
- Make connections between different memories they share
- Keep the conversation flowing - don't just ask questions mechanically
- Be empathetic and encouraging
- Keep your responses concise and natural
- Don't explicitly mention that you're moving to a new topic - transition naturally
- When new people, places, or events are mentioned, ask for details about them naturally
- Reference the timeline and entities when relevant to show you're listening`;

  // Add sub-topic guidance
  if (requiredSubTopics.length > 0) {
    systemPrompt += `\n\nIMPORTANT: You MUST cover these required sub-topics before moving on:\n`;
    requiredSubTopics.forEach(st => {
      systemPrompt += `- ${st.name}\n`;
    });
    systemPrompt += `\nPick ONE of these sub-topics to focus on now. Ask about it naturally, then move to the next one after they've answered.`;
  }

  if (optionalSubTopics.length > 0 && totalWordCount < (currentQuestion.wordCountThreshold || 200)) {
    const wordsNeeded = (currentQuestion.wordCountThreshold || 200) - totalWordCount;
    systemPrompt += `\n\nYou should also try to explore these optional sub-topics:\n`;
    optionalSubTopics.forEach(st => {
      systemPrompt += `- ${st.name}\n`;
    });
    systemPrompt += `\nThe current response is ${totalWordCount} words. Aim for at least ${currentQuestion.wordCountThreshold || 200} words total for this main question (${wordsNeeded} more words needed). Pick ONE sub-topic to explore now, then continue with others after they respond.`;
  } else if (optionalSubTopics.length > 0) {
    systemPrompt += `\n\nYou've reached the word count threshold. You can optionally explore remaining sub-topics one at a time, but you may also transition to the next main question if appropriate.`;
  }

  // Check if we should move to next question
  const allRequiredCovered = requiredSubTopics.length === 0;
  const wordThresholdMet = totalWordCount >= (currentQuestion.wordCountThreshold || 200);
  const shouldMoveOn = allRequiredCovered && (wordThresholdMet || optionalSubTopics.length === 0);

  if (shouldMoveOn && currentQuestionIndex < questions.length - 1) {
    systemPrompt += `\n\nYou've covered the required sub-topics and met the word count threshold. You can now naturally transition to the next main question: "${questions[currentQuestionIndex + 1].mainQuestion}"`;
  } else if (currentQuestionIndex >= questions.length - 1 && shouldMoveOn) {
    systemPrompt += `\n\nYou've covered all questions. You can wrap up the conversation naturally.`;
  }

  try {
    if (streamSink && isFirstMessage && intro?.trim()) {
      streamSink(intro.trim() + '\n\n');
    }
    let response = await runCompletion(
      {
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        temperature: 0.7,
        max_tokens: isFirstMessage ? 150 : 100, // Shorter responses to encourage one question at a time
      },
      streamSink
    ) || 'I apologize, I didn\'t catch that. Could you tell me more?';
    if (isFirstMessage && intro?.trim()) {
      response = intro.trim() + '\n\n' + response;
    }

    // Determine if we've covered the current question
    const questionCovered = shouldMoveOn;

    // Check if all questions are covered
    // We're done if we're on the last question (or beyond) and it's covered
    const allQuestionsCovered = currentQuestionIndex >= questions.length - 1 && questionCovered;
    
    // Also check if we've somehow gone past all questions
    if (currentQuestionIndex >= questions.length) {
      const response = (conclusion?.trim()) || "Thank you for sharing your story. That covers all the questions I had!";
      return {
        response,
        questionCovered: true,
        allQuestionsCovered: true,
        discoveryContext: updatedDiscoveryContext,
        followUpQuestions: discoveryFollowUps,
        ...debugPayload(),
      };
    }

    // Log the discovery context being returned
    console.log('Returning discovery context:', {
      entities: updatedDiscoveryContext.entities.length,
      timeline: updatedDiscoveryContext.timeline.length,
    });

    const finalResponse = (allQuestionsCovered && conclusion?.trim()) ? conclusion.trim() : response;
    return {
      response: finalResponse,
      questionCovered,
      allQuestionsCovered,
      discoveryContext: updatedDiscoveryContext,
      followUpQuestions: discoveryFollowUps,
      ...debugPayload(),
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate response. Please try again.');
  }
}

