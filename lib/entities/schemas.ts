import { EntitySchema } from '@/types';

// Define entity schemas - what information to collect for each type of entity
export const DEFAULT_ENTITY_SCHEMAS: EntitySchema[] = [
  {
    entityType: 'sibling',
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The sibling\'s name',
      },
      {
        name: 'gender',
        required: true,
        type: 'string',
        description: 'The sibling\'s gender (brother/sister)',
      },
      {
        name: 'age',
        required: false,
        type: 'number',
        description: 'The sibling\'s age or age difference',
      },
      {
        name: 'residencePeriod',
        required: false,
        type: 'text',
        description: 'How long they lived together (e.g., "from 1954 to 1963, 11 years")',
      },
      {
        name: 'earliestMemory',
        required: false,
        type: 'text',
        description: 'Description of relationship in earliest memories',
      },
      {
        name: 'lessonsLearned',
        required: false,
        type: 'text',
        description: 'Lessons learned from this sibling',
      },
      {
        name: 'favoriteQuality',
        required: false,
        type: 'text',
        description: 'Favorite quality of this sibling',
      },
      {
        name: 'leastFavoriteQuality',
        required: false,
        type: 'text',
        description: 'Least favorite quality of this sibling',
      },
    ],
  },
  {
    entityType: 'pet',
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The pet\'s name',
      },
      {
        name: 'type',
        required: true,
        type: 'string',
        description: 'Type of pet (dog, cat, etc.)',
      },
      {
        name: 'breed',
        required: false,
        type: 'string',
        description: 'Breed of the pet',
      },
      {
        name: 'howAcquired',
        required: false,
        type: 'text',
        description: 'How the pet was acquired',
      },
      {
        name: 'memories',
        required: false,
        type: 'text',
        description: 'Memories with this pet',
      },
    ],
  },
  {
    entityType: 'friend',
    attributes: [
      {
        name: 'name',
        required: true,
        type: 'string',
        description: 'The friend\'s name',
      },
      {
        name: 'howMet',
        required: false,
        type: 'text',
        description: 'How they met',
      },
      {
        name: 'sharedActivities',
        required: false,
        type: 'text',
        description: 'Activities they did together',
      },
      {
        name: 'memories',
        required: false,
        type: 'text',
        description: 'Memories together',
      },
      {
        name: 'timeframe',
        required: false,
        type: 'text',
        description: 'When they were friends (e.g., "8th grade", "1950s")',
      },
    ],
  },
  {
    entityType: 'move',
    attributes: [
      {
        name: 'date',
        required: false,
        type: 'date',
        description: 'When the move occurred',
      },
      {
        name: 'from',
        required: false,
        type: 'string',
        description: 'Where they moved from',
      },
      {
        name: 'to',
        required: false,
        type: 'string',
        description: 'Where they moved to',
      },
      {
        name: 'reason',
        required: false,
        type: 'text',
        description: 'Why they moved',
      },
      {
        name: 'feelings',
        required: false,
        type: 'text',
        description: 'How they felt about the move',
      },
    ],
  },
];

export function getSchemaForEntityType(entityType: string): EntitySchema | undefined {
  return DEFAULT_ENTITY_SCHEMAS.find(schema => schema.entityType === entityType);
}

export function getAllEntityTypes(): string[] {
  return DEFAULT_ENTITY_SCHEMAS.map(schema => schema.entityType);
}

