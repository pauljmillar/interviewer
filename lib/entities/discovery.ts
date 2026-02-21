import OpenAI from 'openai';
import { EntityInstance, TimelineEvent, DiscoveryContext, EntitySchema } from '@/types';
import { DEFAULT_ENTITY_SCHEMAS, getAllEntityTypes } from './schemas';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface DiscoveryRequest {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  currentContext: DiscoveryContext;
}

export interface DiscoveryResult {
  newEntities: EntityInstance[];
  updatedEntities: EntityInstance[];
  newTimelineEvents: TimelineEvent[];
  updatedTimelineEvents: TimelineEvent[];
  followUpQuestions: string[];
}

function generateEntityId(entityType: string, name: string, index: number): string {
  return `${entityType}_${name.toLowerCase().replace(/\s+/g, '_')}_${index}`;
}

function generateTimelineEventId(eventType: string, index: number): string {
  return `timeline_${eventType}_${index}`;
}

export async function discoverEntitiesAndEvents(
  request: DiscoveryRequest
): Promise<DiscoveryResult> {
  const { messages, currentContext } = request;
  
  // Get the last user message
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (!lastUserMessage) {
    return {
      newEntities: [],
      updatedEntities: [],
      newTimelineEvents: [],
      updatedTimelineEvents: [],
      followUpQuestions: [],
    };
  }

  const entityTypes = getAllEntityTypes();
  const existingEntityIds = currentContext.entities.map(e => e.id);
  const existingEntityNames = currentContext.entities.map(e => 
    e.attributes.name || e.attributes.type || ''
  ).filter(Boolean);

  // Build context about existing entities
  const existingEntitiesContext = currentContext.entities.map(e => {
    const attrs = Object.entries(e.attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    return `- ${e.entityType} (${e.id}): ${attrs}`;
  }).join('\n');

  const timelineContext = currentContext.timeline.map(e => 
    `- ${e.eventType}: ${e.description}${e.date ? ` (${e.date})` : ''}`
  ).join('\n');

  const discoveryPrompt = `Analyze the following user response and identify entities and events.

User response: "${lastUserMessage.content}"

Existing entities:
${existingEntitiesContext || 'None'}

Existing timeline:
${timelineContext || 'None'}

Entity types to look for: ${entityTypes.join(', ')}

Entity schemas (what information to collect):
${DEFAULT_ENTITY_SCHEMAS.map(schema => `
${schema.entityType}:
${schema.attributes.map(attr => `  - ${attr.name} (${attr.required ? 'REQUIRED' : 'optional'}): ${attr.description}`).join('\n')}
`).join('\n')}

CRITICAL INSTRUCTIONS:
1. Look for ANY mention of siblings, pets, friends, moves, or other events
2. If someone says "my brother Nick" or "I had a dog named Max" or "we moved when I was 10", you MUST create entities
3. Extract ALL attributes that are mentioned in the response
4. Create separate entities for each person/pet mentioned (e.g., if they say "I had two brothers, Nick and Tom", create TWO sibling entities)
5. For timeline events, look for: moves, births, deaths, graduations, marriages, job changes, etc.

Return a JSON object with this EXACT structure:
{
  "entities": [
    {
      "entityType": "sibling",
      "isNew": true,
      "entityId": "sibling_nick_0",
      "attributes": {
        "name": "Nick",
        "gender": "brother"
      }
    }
  ],
  "timelineEvents": [
    {
      "eventType": "move",
      "description": "Moved from childhood home",
      "date": null,
      "datePrecision": null
    }
  ],
  "followUpQuestions": [
    "What is your brother Nick's full name?",
    "When did you move from your childhood home?"
  ]
}

Examples:
- "My brother Nick" → Create sibling entity with name="Nick", gender="brother"
- "We moved to Chicago" → Create timeline event with eventType="move", description="Moved to Chicago"
- "I had a golden retriever named Peanut" → Create pet entity with name="Peanut", type="dog", breed="golden retriever"
- "My friend Mike and I used to play together" → Create friend entity with name="Mike"`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at extracting structured information from conversational text. Always return valid JSON.',
        },
        { role: 'user', content: discoveryPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const analysisText = completion.choices[0]?.message?.content || '{}';
    let analysis: any = {};
    
    try {
      analysis = JSON.parse(analysisText);
      console.log('Discovery analysis result:', JSON.stringify(analysis, null, 2));
    } catch (parseError) {
      console.error('Failed to parse discovery analysis:', parseError);
      console.error('Raw response:', analysisText);
      return {
        newEntities: [],
        updatedEntities: [],
        newTimelineEvents: [],
        updatedTimelineEvents: [],
        followUpQuestions: [],
      };
    }

    const newEntities: EntityInstance[] = [];
    const updatedEntities: EntityInstance[] = [];
    const newTimelineEvents: TimelineEvent[] = [];
    const updatedTimelineEvents: TimelineEvent[] = [];
    const followUpQuestions: string[] = [];

    // Process entities
    if (analysis.entities && Array.isArray(analysis.entities)) {
      console.log(`Processing ${analysis.entities.length} entities from analysis`);
      analysis.entities.forEach((entityData: any, index: number) => {
        console.log(`Processing entity ${index}:`, entityData);
        const schema = DEFAULT_ENTITY_SCHEMAS.find(s => s.entityType === entityData.entityType);
        if (!schema) {
          console.warn(`No schema found for entity type: ${entityData.entityType}`);
          return;
        }

        const entityId = entityData.entityId || generateEntityId(
          entityData.entityType,
          entityData.attributes?.name || entityData.attributes?.type || 'unknown',
          currentContext.entities.length
        );

        const existingEntity = currentContext.entities.find(e => e.id === entityId);

        // If isNew is not specified, assume it's new if entity doesn't exist
        const isNew = entityData.isNew !== undefined ? entityData.isNew : !existingEntity;

        if (isNew && !existingEntity) {
          console.log(`Creating new entity: ${entityId}`, entityData.attributes);
          // New entity
          newEntities.push({
            id: entityId,
            entityType: entityData.entityType,
            attributes: entityData.attributes || {},
            discoveredAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
          });

          // Generate follow-up questions for missing required attributes
          schema.attributes.forEach(attr => {
            if (attr.required && !entityData.attributes?.[attr.name]) {
              const question = `What is ${entityData.attributes?.name || 'their'} ${attr.description}?`;
              if (!followUpQuestions.includes(question)) {
                followUpQuestions.push(question);
              }
            }
          });
        } else if (existingEntity) {
          // Update existing entity
          const updatedAttributes = {
            ...existingEntity.attributes,
            ...entityData.attributes,
          };
          updatedEntities.push({
            ...existingEntity,
            attributes: updatedAttributes,
            lastUpdated: new Date().toISOString(),
          });

          // Check for missing required attributes
          schema.attributes.forEach(attr => {
            if (attr.required && !updatedAttributes[attr.name]) {
              const question = `What is ${updatedAttributes.name || 'their'} ${attr.description}?`;
              if (!followUpQuestions.includes(question)) {
                followUpQuestions.push(question);
              }
            }
          });
        }
      });
    }

    // Process timeline events
    if (analysis.timelineEvents && Array.isArray(analysis.timelineEvents)) {
      analysis.timelineEvents.forEach((eventData: any, index: number) => {
        const eventId = eventData.eventId || generateTimelineEventId(
          eventData.eventType,
          currentContext.timeline.length + index
        );

        const existingEvent = currentContext.timeline.find(e => e.id === eventId);

        if (!existingEvent) {
          // New timeline event
          newTimelineEvents.push({
            id: eventId,
            eventType: eventData.eventType,
            description: eventData.description,
            date: eventData.date || undefined,
            datePrecision: eventData.datePrecision || undefined,
            context: eventData.context,
            discoveredAt: new Date().toISOString(),
            relatedEntities: eventData.relatedEntities || [],
          });

          // Generate follow-up questions for missing date
          if (!eventData.date) {
            const question = `When did ${eventData.description.toLowerCase()}?`;
            if (!followUpQuestions.includes(question)) {
              followUpQuestions.push(question);
            }
          }
        } else {
          // Update existing event
          updatedTimelineEvents.push({
            ...existingEvent,
            description: eventData.description || existingEvent.description,
            date: eventData.date || existingEvent.date,
            datePrecision: eventData.datePrecision || existingEvent.datePrecision,
            context: eventData.context || existingEvent.context,
            relatedEntities: eventData.relatedEntities || existingEvent.relatedEntities,
          });
        }
      });
    }

    // Add any explicit follow-up questions from the analysis
    if (analysis.followUpQuestions && Array.isArray(analysis.followUpQuestions)) {
      analysis.followUpQuestions.forEach((q: string) => {
        if (!followUpQuestions.includes(q)) {
          followUpQuestions.push(q);
        }
      });
    }

    console.log('Discovery result summary:', {
      newEntities: newEntities.length,
      updatedEntities: updatedEntities.length,
      newTimelineEvents: newTimelineEvents.length,
      updatedTimelineEvents: updatedTimelineEvents.length,
      followUpQuestions: followUpQuestions.length,
    });

    return {
      newEntities,
      updatedEntities,
      newTimelineEvents,
      updatedTimelineEvents,
      followUpQuestions,
    };
  } catch (error) {
    console.error('Discovery API error:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    return {
      newEntities: [],
      updatedEntities: [],
      newTimelineEvents: [],
      updatedTimelineEvents: [],
      followUpQuestions: [],
    };
  }
}

