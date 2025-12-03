// ============================================
// QUESTIONNAIRE PARSER
// Parses the JSON questionnaire data into usable format
// ============================================

import questionnaireJson from '@/assets/questions/questionnaire.json';
import {
    ParsedQuestionnaire,
    QuestionnaireLanguage,
    QuestionnairePart,
    QuestionnairePartProgress,
    QuestionnaireQuestion,
    QuestionnaireSection,
    QuestionnaireSectionProgress,
} from '@/types/firebase.types';

// Human-readable titles for parts and sections
const PART_TITLES: Record<string, { en: string; ta: string }> = {
  part_1_background_and_clinical: {
    en: 'Background & Clinical Data',
    ta: 'பின்னணி மற்றும் மருத்துவ தகவல்',
  },
};

const SECTION_TITLES: Record<string, { en: string; ta: string }> = {
  section_a_background_variables: {
    en: 'Background Information',
    ta: 'பின்னணி தகவல்',
  },
  section_b_clinical_data: {
    en: 'Clinical Data',
    ta: 'மருத்துவ தகவல்',
  },
};

/**
 * Get human-readable title for a part
 */
export const getPartTitle = (partId: string, language: QuestionnaireLanguage): string => {
  const titles = PART_TITLES[partId];
  if (titles) {
    return language === 'english' ? titles.en : titles.ta;
  }
  // Fallback: Convert snake_case to Title Case
  return partId
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Get human-readable title for a section
 */
export const getSectionTitle = (sectionId: string, language: QuestionnaireLanguage): string => {
  const titles = SECTION_TITLES[sectionId];
  if (titles) {
    return language === 'english' ? titles.en : titles.ta;
  }
  // Fallback: Convert snake_case to Title Case
  return sectionId
    .replace(/section_[a-z]_/i, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Parse the questionnaire JSON for a specific language and gender
 */
export const parseQuestionnaire = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female'
): ParsedQuestionnaire => {
  const data = questionnaireJson as any;
  const langData = data[language];
  const genderKey = gender === 'male' ? 'men' : 'women';
  const genderData = langData[genderKey];

  const parts: QuestionnairePart[] = [];
  let totalQuestions = 0;

  // Iterate through parts
  Object.entries(genderData).forEach(([partId, partData]: [string, any]) => {
    const sections: QuestionnaireSection[] = [];

    // Iterate through sections within each part
    Object.entries(partData).forEach(([sectionId, sectionQuestions]: [string, any]) => {
      const questions: QuestionnaireQuestion[] = sectionQuestions.map((q: any) => ({
        number: q.number,
        question: q.question,
        type: q.type,
        options: q.options || undefined,
        conditional_textfield: q.conditional_textfield || undefined,
        sub_questions: q.sub_questions || undefined,
      }));

      totalQuestions += questions.length;

      sections.push({
        id: sectionId,
        title: getSectionTitle(sectionId, language),
        questions,
      });
    });

    parts.push({
      id: partId,
      title: getPartTitle(partId, language),
      sections,
    });
  });

  return {
    language,
    gender: gender === 'male' ? 'men' : 'women',
    parts,
    totalQuestions,
  };
};

/**
 * Get the total number of questions for a specific gender
 */
export const getTotalQuestionCount = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female'
): number => {
  const parsed = parseQuestionnaire(language, gender);
  return parsed.totalQuestions;
};

/**
 * Generate a unique question ID
 */
export const generateQuestionId = (
  partId: string,
  sectionId: string,
  questionNumber: string
): string => {
  return `${partId}_${sectionId}_${questionNumber}`;
};

/**
 * Parse a question ID back to its components
 */
export const parseQuestionId = (
  questionId: string
): { partId: string; sectionId: string; questionNumber: string } => {
  // Format: part_1_background_and_clinical_section_a_background_variables_1
  const parts = questionId.split('_section_');
  const partId = parts[0];
  const sectionAndNumber = parts[1];
  
  // Find the last underscore for question number
  const lastUnderscoreIndex = sectionAndNumber.lastIndexOf('_');
  const sectionId = 'section_' + sectionAndNumber.substring(0, lastUnderscoreIndex);
  const questionNumber = sectionAndNumber.substring(lastUnderscoreIndex + 1);
  
  return { partId, sectionId, questionNumber };
};

/**
 * Initialize empty progress structure for a questionnaire
 */
export const initializeProgress = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female'
): {
  parts: QuestionnairePartProgress[];
  totalQuestions: number;
  answeredQuestions: number;
  percentComplete: number;
} => {
  const parsed = parseQuestionnaire(language, gender);

  const parts: QuestionnairePartProgress[] = parsed.parts.map((part) => {
    const sections: QuestionnaireSectionProgress[] = part.sections.map((section) => ({
      sectionId: section.id,
      sectionTitle: section.title,
      totalQuestions: section.questions.length,
      answeredQuestions: 0,
      isComplete: false,
    }));

    const totalQuestions = sections.reduce((sum, s) => sum + s.totalQuestions, 0);

    return {
      partId: part.id,
      partTitle: part.title,
      sections,
      totalQuestions,
      answeredQuestions: 0,
      isComplete: false,
    };
  });

  return {
    parts,
    totalQuestions: parsed.totalQuestions,
    answeredQuestions: 0,
    percentComplete: 0,
  };
};

/**
 * Get a specific question by its position
 */
export const getQuestionByPosition = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female',
  partIndex: number,
  sectionIndex: number,
  questionIndex: number
): {
  question: QuestionnaireQuestion | null;
  partId: string;
  partTitle: string;
  sectionId: string;
  sectionTitle: string;
  questionId: string;
  isLastQuestion: boolean;
  isFirstQuestion: boolean;
  totalInSection: number;
  currentInSection: number;
} | null => {
  const parsed = parseQuestionnaire(language, gender);
  
  if (partIndex < 0 || partIndex >= parsed.parts.length) {
    return null;
  }

  const part = parsed.parts[partIndex];
  if (sectionIndex < 0 || sectionIndex >= part.sections.length) {
    return null;
  }

  const section = part.sections[sectionIndex];
  if (questionIndex < 0 || questionIndex >= section.questions.length) {
    return null;
  }

  const question = section.questions[questionIndex];
  const questionId = generateQuestionId(part.id, section.id, question.number);

  // Check if this is the last question overall
  const isLastPart = partIndex === parsed.parts.length - 1;
  const isLastSection = sectionIndex === part.sections.length - 1;
  const isLastQuestionInSection = questionIndex === section.questions.length - 1;
  const isLastQuestion = isLastPart && isLastSection && isLastQuestionInSection;

  // Check if this is the first question overall
  const isFirstQuestion = partIndex === 0 && sectionIndex === 0 && questionIndex === 0;

  return {
    question,
    partId: part.id,
    partTitle: part.title,
    sectionId: section.id,
    sectionTitle: section.title,
    questionId,
    isLastQuestion,
    isFirstQuestion,
    totalInSection: section.questions.length,
    currentInSection: questionIndex + 1,
  };
};

/**
 * Get the next question position
 */
export const getNextPosition = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female',
  partIndex: number,
  sectionIndex: number,
  questionIndex: number
): { partIndex: number; sectionIndex: number; questionIndex: number } | null => {
  const parsed = parseQuestionnaire(language, gender);
  const part = parsed.parts[partIndex];
  
  if (!part) return null;

  const section = part.sections[sectionIndex];
  if (!section) return null;

  // Try next question in same section
  if (questionIndex < section.questions.length - 1) {
    return { partIndex, sectionIndex, questionIndex: questionIndex + 1 };
  }

  // Try next section in same part
  if (sectionIndex < part.sections.length - 1) {
    return { partIndex, sectionIndex: sectionIndex + 1, questionIndex: 0 };
  }

  // Try next part
  if (partIndex < parsed.parts.length - 1) {
    return { partIndex: partIndex + 1, sectionIndex: 0, questionIndex: 0 };
  }

  // No more questions
  return null;
};

/**
 * Get the previous question position
 */
export const getPreviousPosition = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female',
  partIndex: number,
  sectionIndex: number,
  questionIndex: number
): { partIndex: number; sectionIndex: number; questionIndex: number } | null => {
  const parsed = parseQuestionnaire(language, gender);

  // Try previous question in same section
  if (questionIndex > 0) {
    return { partIndex, sectionIndex, questionIndex: questionIndex - 1 };
  }

  // Try last question of previous section in same part
  if (sectionIndex > 0) {
    const prevSection = parsed.parts[partIndex].sections[sectionIndex - 1];
    return { partIndex, sectionIndex: sectionIndex - 1, questionIndex: prevSection.questions.length - 1 };
  }

  // Try last question of last section of previous part
  if (partIndex > 0) {
    const prevPart = parsed.parts[partIndex - 1];
    const lastSection = prevPart.sections[prevPart.sections.length - 1];
    return {
      partIndex: partIndex - 1,
      sectionIndex: prevPart.sections.length - 1,
      questionIndex: lastSection.questions.length - 1,
    };
  }

  // No previous question (at the beginning)
  return null;
};

/**
 * Calculate progress from answered questions
 */
export const calculateProgress = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female',
  answeredQuestionIds: string[]
): {
  parts: QuestionnairePartProgress[];
  totalQuestions: number;
  answeredQuestions: number;
  percentComplete: number;
} => {
  const parsed = parseQuestionnaire(language, gender);
  const answeredSet = new Set(answeredQuestionIds);

  let totalAnswered = 0;

  const parts: QuestionnairePartProgress[] = parsed.parts.map((part) => {
    let partAnswered = 0;

    const sections: QuestionnaireSectionProgress[] = part.sections.map((section) => {
      let sectionAnswered = 0;

      section.questions.forEach((q) => {
        const qId = generateQuestionId(part.id, section.id, q.number);
        if (answeredSet.has(qId)) {
          sectionAnswered++;
          partAnswered++;
          totalAnswered++;
        }
      });

      return {
        sectionId: section.id,
        sectionTitle: section.title,
        totalQuestions: section.questions.length,
        answeredQuestions: sectionAnswered,
        isComplete: sectionAnswered === section.questions.length,
      };
    });

    const totalInPart = sections.reduce((sum, s) => sum + s.totalQuestions, 0);

    return {
      partId: part.id,
      partTitle: part.title,
      sections,
      totalQuestions: totalInPart,
      answeredQuestions: partAnswered,
      isComplete: partAnswered === totalInPart,
    };
  });

  return {
    parts,
    totalQuestions: parsed.totalQuestions,
    answeredQuestions: totalAnswered,
    percentComplete: Math.round((totalAnswered / parsed.totalQuestions) * 100),
  };
};

/**
 * Get all questions in flat array for easy iteration
 */
export const getAllQuestions = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female'
): Array<{
  partIndex: number;
  sectionIndex: number;
  questionIndex: number;
  question: QuestionnaireQuestion;
  questionId: string;
  partId: string;
  partTitle: string;
  sectionId: string;
  sectionTitle: string;
}> => {
  const parsed = parseQuestionnaire(language, gender);
  const questions: Array<any> = [];

  parsed.parts.forEach((part, partIndex) => {
    part.sections.forEach((section, sectionIndex) => {
      section.questions.forEach((question, questionIndex) => {
        questions.push({
          partIndex,
          sectionIndex,
          questionIndex,
          question,
          questionId: generateQuestionId(part.id, section.id, question.number),
          partId: part.id,
          partTitle: part.title,
          sectionId: section.id,
          sectionTitle: section.title,
        });
      });
    });
  });

  return questions;
};

/**
 * Get section-wise summary for displaying in UI
 */
export const getSectionSummary = (
  language: QuestionnaireLanguage,
  gender: 'male' | 'female'
): Array<{
  partId: string;
  partTitle: string;
  sectionId: string;
  sectionTitle: string;
  questionCount: number;
  startPosition: { partIndex: number; sectionIndex: number; questionIndex: number };
}> => {
  const parsed = parseQuestionnaire(language, gender);
  const sections: Array<any> = [];

  parsed.parts.forEach((part, partIndex) => {
    part.sections.forEach((section, sectionIndex) => {
      sections.push({
        partId: part.id,
        partTitle: part.title,
        sectionId: section.id,
        sectionTitle: section.title,
        questionCount: section.questions.length,
        startPosition: { partIndex, sectionIndex, questionIndex: 0 },
      });
    });
  });

  return sections;
};

export default {
  parseQuestionnaire,
  getTotalQuestionCount,
  generateQuestionId,
  parseQuestionId,
  initializeProgress,
  getQuestionByPosition,
  getNextPosition,
  getPreviousPosition,
  calculateProgress,
  getAllQuestions,
  getSectionSummary,
  getPartTitle,
  getSectionTitle,
};
