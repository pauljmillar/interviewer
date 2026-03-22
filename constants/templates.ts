import { InterviewTemplate, Question } from '@/types';

const CUSTOM_TEMPLATES_KEY = 'interviewer-custom-templates';

export function getCustomTemplates(): InterviewTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InterviewTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomTemplate(template: InterviewTemplate): void {
  const list = getCustomTemplates();
  const existing = list.findIndex((t) => t.id === template.id);
  const next = existing >= 0 ? list.map((t, i) => (i === existing ? template : t)) : [...list, template];
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(next));
  }
}

export function addCustomTemplate(
  name: string,
  questions: Question[],
  options?: { intro?: string; conclusion?: string; reminder?: string }
): InterviewTemplate {
  const id = `custom-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;
  const template: InterviewTemplate = {
    id,
    name,
    questions,
    intro: options?.intro,
    conclusion: options?.conclusion,
    reminder: options?.reminder,
  };
  saveCustomTemplate(template);
  return template;
}

export const INTERVIEW_TEMPLATES: InterviewTemplate[] = [
  {
    id: 'ice-cream-shop',
    name: 'Ice cream shop summer employee',
    intro: 'Thanks for your interest in the summer role. I\'ll ask you a few short questions so we can learn a bit about you.',
    conclusion: 'That\'s all we need for now. We\'ll review your answers and be in touch soon.',
    reminder: 'This is a real interview. Your answers will be reviewed by the hiring team the same way as in an in-person interview. We\'d like to continue—please answer the question.',
    questions: [
      {
        mainQuestion: 'How old are you?',
        subTopics: [],
        mode: 1,
        acceptableAnswers: ['16', 'sixteen', 'I am 16', "I'm 16", '16 years old'],
      },
      {
        mainQuestion: 'Have you ever worked serving food before?',
        subTopics: [],
        mode: 3,
        followUpPrompt: 'Where, when and for how long?',
      },
      {
        mainQuestion: 'If your friends come in, how would you respond?',
        subTopics: [],
        mode: 2,
        acceptableAnswers: [
          'Treat them kindly, but do not converse with them if there are customers waiting.',
          'Be kind but prioritize customers',
          'I would not talk to them if customers are waiting',
        ],
        followUpPrompt: 'Would you give them free food?',
      },
      {
        mainQuestion: 'Would you give them free food?',
        subTopics: [],
        mode: 2,
        acceptableAnswers: ['No', 'no', 'Never', 'Of course not', 'I would not'],
      },
    ],
  },
  {
    id: 'internship-screening',
    name: 'Screening call – summer internship (engineer)',
    intro: 'Thanks for taking the time today. This is a short screening call — I\'ll ask you a few questions to confirm eligibility and learn a bit about your background.',
    conclusion: 'Thank you for your time. We are reviewing applicants over the next few days and will be in touch with a selection of candidates by the end of next week.',
    reminder: 'This screening is a real part of our process. The hiring team will review your responses as they would a live call. Please answer the question so we can continue.',
    questions: [
      {
        mainQuestion: 'Are you authorized to work in the United States?',
        subTopics: [],
        mode: 1,
        acceptableAnswers: ['yes', 'yeah', 'I am', 'I am authorized', 'Yes I am', 'Yes.'],
        correctReply: 'Great, because this job does not offer visa sponsorships. Let\'s move on.',
      },
      {
        mainQuestion: 'What made you want to study engineering?',
        subTopics: [],
        mode: 3,
        followUpPrompt: 'Is there anything else you thought you might do when you were younger?',
      },
      {
        mainQuestion: 'How do you measure the volume of a liquid?',
        subTopics: [],
        mode: 2,
        acceptableAnswers: [
          'use a graduated cylinder or measuring cup',
          'graduated cylinder',
          'measuring cup',
          'graduated cylinder or measuring cup',
        ],
      },
    ],
  },
  {
    id: 'biography-70',
    name: 'Biography for 70-year-old (kids and grandkids)',
    intro: 'I\'d love to hear about your life and family. We\'ll go through a few questions together—take your time.',
    conclusion: 'Thank you for sharing. We can pick up where we left off another time if you\'d like.',
    reminder: 'This conversation is part of your story and will be reviewed. We\'d like to hear from you—please share your answer.',
    questions: [
      {
        mainQuestion: 'What year were you born?',
        subTopics: [],
        mode: 3,
      },
      {
        mainQuestion: 'Did you have any siblings?',
        subTopics: [],
        mode: 3,
        followUpPrompt: 'What are their names and ages?',
      },
    ],
  },
  {
    id: 'demo-walkthrough',
    name: 'Try our interview (demo)',
    intro: "Hi there — this is generally the experience that one of your candidates will have in an AI screening interview. The email they've received will have described the process in advance, so they have some idea of what to expect. Then they'll be asked to confirm that they are ok being recorded, as you had to do. The videos are available for you to review, though it is not required. The main goal of Candice AI is to save you time. After each interview, we'll provide a summary, score, and ranking, so you may want to briefly review the video only of the highest ranked candidate(s). To give you the feel of the question and answer format, let's move on to a question.",
    conclusion: "That's the end of the demo. Thanks for trying it! You can create your own interview by pasting a job description on the home page, or sign up to manage positions and review results.",
    reminder: "No pressure—this is just a demo. Feel free to answer so we can continue, or you can close the tab anytime.",
    questions: [
      {
        mainQuestion: "How many screening interviews do you schedule each month, on average?",
        subTopics: [],
        mode: 4,
      },
    ],
  },
];

export function getTemplateById(id: string): InterviewTemplate | undefined {
  return INTERVIEW_TEMPLATES.find((t) => t.id === id);
}

export function getDefaultTemplate(): InterviewTemplate {
  return INTERVIEW_TEMPLATES[0];
}
