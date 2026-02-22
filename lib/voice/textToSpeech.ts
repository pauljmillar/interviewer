export class TextToSpeech {
  private synth!: SpeechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private isSupported: boolean;
  private selectedVoiceName: string | null = null;
  private preferredTtsId: string | null = null;

  constructor() {
    this.isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
    if (this.isSupported) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      // Some browsers load voices asynchronously
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => {
          this.loadVoices();
          if (this.preferredTtsId) this.applyTtsIdToVoice(this.preferredTtsId);
        };
      }
    }
  }

  private loadVoices() {
    if (this.isSupported) {
      this.voices = this.synth.getVoices();
    }
  }

  private applyTtsIdToVoice(ttsId: string) {
    const voices = this.getAvailableVoices();
    if (voices.length === 0) return;
    const preferFemale = ['alloy', 'nova', 'shimmer'].includes(ttsId);
    const preferMale = ['echo', 'onyx'].includes(ttsId);
    const preferred = preferFemale
      ? voices.find((v) => /samantha|karen|victoria|google.*english|female|natural/i.test(v.name))
      : preferMale
        ? voices.find((v) => /daniel|alex|david|male|mark/i.test(v.name))
        : null;
    this.selectedVoiceName = preferred ? preferred.name : voices[0].name;
  }

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported) return [];
    // Filter to English voices and sort by name
    return this.voices
      .filter(voice => voice.lang.includes('en'))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  setVoice(voiceName: string | null) {
    this.selectedVoiceName = voiceName;
  }

  /**
   * Set voice from an OpenAI TTS id (alloy, echo, fable, onyx, nova, shimmer).
   * Maps to a best-effort browser voice; falls back to default English if no match.
   * Re-applies when browser voices load asynchronously.
   */
  setVoiceByTtsId(ttsId: string | null | undefined) {
    if (!ttsId || !this.isSupported) {
      this.preferredTtsId = null;
      this.selectedVoiceName = null;
      return;
    }
    this.preferredTtsId = ttsId;
    this.applyTtsIdToVoice(ttsId);
  }

  getSelectedVoice(): SpeechSynthesisVoice | null {
    if (!this.selectedVoiceName) {
      // Default to first English voice or a natural-sounding one
      const preferredVoice = this.voices.find(voice => 
        voice.lang.includes('en') && 
        (voice.name.includes('Natural') || voice.name.includes('Premium') || voice.name.includes('Enhanced'))
      ) || this.voices.find(voice => voice.lang.includes('en')) || this.voices[0];
      return preferredVoice || null;
    }
    return this.voices.find(voice => voice.name === this.selectedVoiceName) || null;
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }) {
    if (!this.isSupported) {
      console.warn('Text-to-speech is not supported in this browser');
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    const selectedVoice = this.getSelectedVoice();
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = options?.rate ?? 1.0;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.volume = options?.volume ?? 1.0;

    this.synth.speak(utterance);
  }

  stop() {
    if (this.isSupported) {
      this.synth.cancel();
    }
  }

  isAvailable(): boolean {
    return this.isSupported;
  }
}

