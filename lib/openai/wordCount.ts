import OpenAI from 'openai';
import { Question } from '@/types';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WordCountRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  questions: Question[];
}

export interface CategoryWordCount {
  questionIndex: number;
  mainQuestion: string;
  totalWords: number;
  subTopics: Array<{
    subTopicIndex: number;
    name: string;
    wordCount: number;
  }>;
}

export interface WordCountResponse {
  categories: CategoryWordCount[];
  totalWords: number;
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

export async function analyzeWordCounts(
  request: WordCountRequest
): Promise<WordCountResponse> {
  const { messages, questions } = request;

  // Extract only user messages
  const userMessages = messages.filter(m => m.role === 'user');
  
  if (userMessages.length === 0) {
    return {
      categories: questions.map((q, idx) => ({
        questionIndex: idx,
        mainQuestion: q.mainQuestion,
        totalWords: 0,
        subTopics: q.subTopics.map((st, stIdx) => ({
          subTopicIndex: stIdx,
          name: st.name,
          wordCount: 0,
        })),
      })),
      totalWords: 0,
    };
  }

  // Build a comprehensive list of all categories and sub-topics
  const allCategories = questions.map((q, qIdx) => ({
    questionIndex: qIdx,
    mainQuestion: q.mainQuestion,
    subTopics: q.subTopics.map((st, stIdx) => ({
      subTopicIndex: stIdx,
      name: st.name,
    })),
  }));

  // Create a prompt for OpenAI to analyze which words belong to which categories
  const analysisPrompt = `You are analyzing interview responses to categorize word counts by topic and sub-topic.

CRITICAL: Only count words that ACTUALLY relate to the topics. If a response does NOT mention anything related to a topic or sub-topic, that category should have 0 words. Do NOT assign words to categories just because they exist - only if the content actually relates to them.

The interview has these main questions and sub-topics:
${allCategories.map(cat => `
${cat.questionIndex + 1}. Main Question: "${cat.mainQuestion}"
   Sub-topics: ${cat.subTopics.map(st => `"${st.name}"`).join(', ')}
`).join('\n')}

User responses:
${userMessages.map((msg, idx) => `${idx + 1}. ${msg.content}`).join('\n\n')}

For each user response, analyze which words/phrases ACTUALLY relate to which main question AND which sub-topics. 
Important: 
- Words can count toward MULTIPLE categories if they're relevant to multiple topics
- If a response has NO relation to a topic/sub-topic, assign 0 words to it
- Be precise - only count words that genuinely relate to the topic

Example: If someone says "My brother and I used to take turns walking our golden retriever Peanut", this should count toward:
- The "pets" sub-topic (mentions pet: golden retriever Peanut) - count words about the pet
- The "brother" or "siblings" sub-topic (mentions brother) - count words about the brother
- If there's no "pets" question in the interview, do NOT count toward pets

Return a JSON object with this structure:
{
  "responses": [
    {
      "responseIndex": 0,
      "wordCount": 25,
      "categories": [
        {
          "questionIndex": 0,
          "mainQuestion": "Do you have any memories from 1st grade?",
          "wordCount": 10,
          "subTopics": [
            {"subTopicIndex": 0, "name": "teachers", "wordCount": 5},
            {"subTopicIndex": 1, "name": "friends", "wordCount": 5}
          ]
        }
      ]
    }
  ]
}

IMPORTANT: Only include categories that the response actually relates to. If a response has nothing to do with a question or sub-topic, do NOT include it in the categories array, or set its wordCount to 0.`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at analyzing text and categorizing word counts by topic. Always return valid JSON only, with no other text or markdown.' 
        },
        { role: 'user', content: analysisPrompt },
      ],
      temperature: 0.3,
    });

    let analysisText = completion.choices[0]?.message?.content?.trim() || '{}';
    // Strip markdown code blocks if present (some models wrap JSON in ```json ... ```)
    const jsonMatch = analysisText.match(/^```(?:json)?\s*([\s\S]*?)```$/m);
    if (jsonMatch) {
      analysisText = jsonMatch[1].trim();
    }
    let analysis: any = {};
    
    try {
      analysis = JSON.parse(analysisText);
      // Log the analysis for debugging
      console.log('Word count analysis result:', JSON.stringify(analysis, null, 2));
    } catch (parseError) {
      console.error('Failed to parse word count analysis JSON:', parseError);
      console.error('Raw response:', analysisText);
      throw new Error('Failed to parse analysis results');
    }

    // Aggregate the results by category
    const categoryMap = new Map<string, CategoryWordCount>();

    // Initialize all categories
    questions.forEach((q, qIdx) => {
      const key = `q${qIdx}`;
      categoryMap.set(key, {
        questionIndex: qIdx,
        mainQuestion: q.mainQuestion,
        totalWords: 0,
        subTopics: q.subTopics.map((st, stIdx) => ({
          subTopicIndex: stIdx,
          name: st.name,
          wordCount: 0,
        })),
      });
    });

    // Aggregate word counts from analysis
    if (analysis.responses && Array.isArray(analysis.responses)) {
      analysis.responses.forEach((resp: any) => {
        if (resp.categories && Array.isArray(resp.categories)) {
          resp.categories.forEach((cat: any) => {
            const questionIndex = parseInt(cat.questionIndex);
            if (isNaN(questionIndex) || questionIndex < 0 || questionIndex >= questions.length) {
              return; // Skip invalid question indices
            }
            
            const key = `q${questionIndex}`;
            const category = categoryMap.get(key);
            if (category) {
              const wordCount = parseInt(cat.wordCount) || 0;
              // Only add if wordCount is positive (AI should return 0 for unrelated topics)
              if (wordCount > 0) {
                category.totalWords += wordCount;
              }
              
              if (cat.subTopics && Array.isArray(cat.subTopics)) {
                cat.subTopics.forEach((st: any) => {
                  const subTopicIndex = parseInt(st.subTopicIndex);
                  if (isNaN(subTopicIndex)) return;
                  
                  const subTopic = category.subTopics.find(
                    s => s.subTopicIndex === subTopicIndex
                  );
                  if (subTopic) {
                    const stWordCount = parseInt(st.wordCount) || 0;
                    // Only add if wordCount is positive
                    if (stWordCount > 0) {
                      subTopic.wordCount += stWordCount;
                    }
                  }
                });
              }
            }
          });
        }
      });
    } else {
      // If the response structure is unexpected, log it and return zeros
      console.warn('Unexpected analysis structure:', analysis);
    }

    const categories = Array.from(categoryMap.values());
    const totalWords = categories.reduce((sum, cat) => sum + cat.totalWords, 0);

    return {
      categories,
      totalWords,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    console.error('Error details:', error);
    // Fallback: return zeros instead of distributing words incorrectly
    // This is safer than incorrectly assigning words to unrelated topics
    const totalWords = userMessages.reduce((sum, msg) => sum + countWords(msg.content), 0);
    
    return {
      categories: questions.map((q, idx) => ({
        questionIndex: idx,
        mainQuestion: q.mainQuestion,
        totalWords: 0, // Return 0 instead of distributing incorrectly
        subTopics: q.subTopics.map((st, stIdx) => ({
          subTopicIndex: stIdx,
          name: st.name,
          wordCount: 0, // Return 0 instead of distributing incorrectly
        })),
      })),
      totalWords,
    };
  }
}

