'use client';

import { useState, useEffect, useRef } from 'react';
import { Question, SubTopic, InterviewMode } from '@/types';
import { DEFAULT_QUESTIONS } from '@/constants/questions';
import { TextToSpeech } from '@/lib/voice/textToSpeech';

const MODE_LABELS: Record<InterviewMode, string> = {
  1: '1 – Screening (right answer, no hints)',
  2: '2 – Right answer + hints',
  3: '3 – List only, no follow-up',
  4: '4 – Conversational (biographer)',
  5: '5 – Contradiction check',
};

interface ConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  questions: Question[];
  onQuestionsChange: (questions: Question[]) => void;
  availableVoices: SpeechSynthesisVoice[];
  selectedVoiceName: string | null;
  onVoiceChange: (voiceName: string | null) => void;
}

export default function ConfigPanel({
  isOpen,
  onClose,
  questions,
  onQuestionsChange,
  availableVoices,
  selectedVoiceName,
  onVoiceChange,
}: ConfigPanelProps) {
  const [localQuestions, setLocalQuestions] = useState<Question[]>(questions);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newSubTopic, setNewSubTopic] = useState({ name: '', required: false });
  const ttsRef = useRef<TextToSpeech | null>(null);

  useEffect(() => {
    setLocalQuestions(questions);
  }, [questions]);

  useEffect(() => {
    // Initialize TextToSpeech for voice preview
    if (typeof window !== 'undefined') {
      ttsRef.current = new TextToSpeech();
    }
    return () => {
      // Cleanup: stop any ongoing speech when component unmounts
      if (ttsRef.current) {
        ttsRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    onQuestionsChange(localQuestions);
    onClose();
  };

  const handleCancel = () => {
    setLocalQuestions(questions);
    setEditingIndex(null);
    onClose();
  };

  const handleAddQuestion = () => {
    setLocalQuestions([
      ...localQuestions,
      {
        mainQuestion: '',
        subTopics: [],
        wordCountThreshold: 200,
        mode: 4,
      },
    ]);
    setEditingIndex(localQuestions.length);
  };

  const handleRemoveQuestion = (index: number) => {
    setLocalQuestions(localQuestions.filter((_, i) => i !== index));
  };

  const handleUpdateQuestion = (index: number, field: keyof Question, value: any) => {
    const updated = [...localQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setLocalQuestions(updated);
  };

  const handleAddSubTopic = (questionIndex: number) => {
    if (!newSubTopic.name.trim()) return;
    const updated = [...localQuestions];
    updated[questionIndex].subTopics = [
      ...updated[questionIndex].subTopics,
      { ...newSubTopic },
    ];
    setLocalQuestions(updated);
    setNewSubTopic({ name: '', required: false });
  };

  const handleRemoveSubTopic = (questionIndex: number, subTopicIndex: number) => {
    const updated = [...localQuestions];
    updated[questionIndex].subTopics = updated[questionIndex].subTopics.filter(
      (_, i) => i !== subTopicIndex
    );
    setLocalQuestions(updated);
  };

  const handleUpdateSubTopic = (
    questionIndex: number,
    subTopicIndex: number,
    field: keyof SubTopic,
    value: any
  ) => {
    const updated = [...localQuestions];
    updated[questionIndex].subTopics[subTopicIndex] = {
      ...updated[questionIndex].subTopics[subTopicIndex],
      [field]: value,
    };
    setLocalQuestions(updated);
  };

  const handleResetToDefaults = () => {
    if (confirm('Clear all questions? This will remove all questions and you\'ll need to add them again.')) {
      setLocalQuestions([]);
    }
  };

  const handleVoicePreview = (voiceName: string) => {
    if (!ttsRef.current || !ttsRef.current.isAvailable()) {
      return;
    }
    
    // Stop any ongoing speech
    ttsRef.current.stop();
    
    // Set the voice temporarily for preview
    ttsRef.current.setVoice(voiceName);
    
    // Play a sample text
    const sampleText = "This is a preview of how this voice sounds. You can hear the tone and style.";
    ttsRef.current.speak(sampleText);
  };

  const handleVoiceChange = (voiceName: string) => {
    // Play preview when voice is selected
    handleVoicePreview(voiceName);
    // Update the selected voice
    onVoiceChange(voiceName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Configuration</h2>
          <button
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Voice Selection */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Voice Selection</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
              {availableVoices.length === 0 ? (
                <p className="text-gray-500 text-sm">No voices available</p>
              ) : (
                availableVoices.map((voice) => (
                  <label
                    key={voice.name}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                  >
                    <input
                      type="radio"
                      name="voice"
                      value={voice.name}
                      checked={selectedVoiceName === voice.name}
                      onChange={() => handleVoiceChange(voice.name)}
                      className="text-blue-600"
                    />
                    <span className="text-sm flex-1 text-gray-900">
                      {voice.name} ({voice.lang})
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleVoicePreview(voice.name);
                      }}
                      className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                      title="Preview this voice"
                    >
                      🔊 Preview
                    </button>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Questions Management */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Questions</h3>
              <div className="flex gap-2">
                <button
                  onClick={handleResetToDefaults}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear All
                </button>
                <button
                  onClick={handleAddQuestion}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  + Add Question
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {localQuestions.map((question, qIndex) => (
                <div
                  key={qIndex}
                  className="border rounded-lg p-4 bg-gray-50"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Main Question
                      </label>
                      <input
                        type="text"
                        value={question.mainQuestion}
                        onChange={(e) =>
                          handleUpdateQuestion(qIndex, 'mainQuestion', e.target.value)
                        }
                        placeholder="Enter main question..."
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                    <button
                      onClick={() => handleRemoveQuestion(qIndex)}
                      className="ml-2 text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Interview Mode
                    </label>
                    <select
                      value={question.mode ?? 4}
                      onChange={(e) =>
                        handleUpdateQuestion(qIndex, 'mode', parseInt(e.target.value, 10) as InterviewMode)
                      }
                      className="w-full max-w-md px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    >
                      {( [1, 2, 3, 4, 5] as const ).map((m) => (
                        <option key={m} value={m}>
                          {MODE_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(question.mode === 1 || question.mode === 2) && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Acceptable answers (one per line)
                      </label>
                      <textarea
                        value={(question.acceptableAnswers ?? []).join('\n')}
                        onChange={(e) =>
                          handleUpdateQuestion(
                            qIndex,
                            'acceptableAnswers',
                            e.target.value
                              .split('\n')
                              .map((s) => s.trim())
                              .filter(Boolean)
                          )
                        }
                        placeholder="e.g. yes, yeah, I am"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  )}

                  {(question.mode === 2 || question.mode === 3) && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Follow-up prompt (optional)
                      </label>
                      <input
                        type="text"
                        value={question.followUpPrompt ?? ''}
                        onChange={(e) =>
                          handleUpdateQuestion(qIndex, 'followUpPrompt', e.target.value)
                        }
                        placeholder="e.g. Where, when and how long?"
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Word Count Threshold (for optional sub-topics, mode 4)
                    </label>
                    <input
                      type="number"
                      value={question.wordCountThreshold || 200}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          qIndex,
                          'wordCountThreshold',
                          parseInt(e.target.value) || 200
                        )
                      }
                      className="w-32 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sub-topics
                    </label>
                    <div className="space-y-2 mb-2">
                      {question.subTopics.map((subTopic, sIndex) => (
                        <div
                          key={sIndex}
                          className="flex items-center gap-2 bg-white p-2 rounded border"
                        >
                          <input
                            type="text"
                            value={subTopic.name}
                            onChange={(e) =>
                              handleUpdateSubTopic(qIndex, sIndex, 'name', e.target.value)
                            }
                            placeholder="Sub-topic name..."
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                          <label className="flex items-center gap-1 text-sm text-gray-900">
                            <input
                              type="checkbox"
                              checked={subTopic.required}
                              onChange={(e) =>
                                handleUpdateSubTopic(qIndex, sIndex, 'required', e.target.checked)
                              }
                              className="text-blue-600"
                            />
                            <span className="text-gray-900">Required</span>
                          </label>
                          <button
                            onClick={() => handleRemoveSubTopic(qIndex, sIndex)}
                            className="text-red-600 hover:text-red-800 text-sm px-2"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newSubTopic.name}
                        onChange={(e) =>
                          setNewSubTopic({ ...newSubTopic, name: e.target.value })
                        }
                        placeholder="New sub-topic name..."
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddSubTopic(qIndex);
                          }
                        }}
                      />
                      <label className="flex items-center gap-1 text-sm px-2 text-gray-900">
                        <input
                          type="checkbox"
                          checked={newSubTopic.required}
                          onChange={(e) =>
                            setNewSubTopic({ ...newSubTopic, required: e.target.checked })
                          }
                          className="text-blue-600"
                        />
                        <span className="text-gray-900">Required</span>
                      </label>
                      <button
                        onClick={() => handleAddSubTopic(qIndex)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t flex justify-end gap-2">
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

