export class SpeechToText {
  private recognition: any;
  private isSupported: boolean;
  private isListening: boolean = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private lastSpeechTime: number = 0;
  private onResultCallback: ((transcript: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private allFinalTranscripts: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.isSupported = !!SpeechRecognition;
      
      if (this.isSupported) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Changed to continuous to allow longer pauses
        this.recognition.interimResults = true; // Get interim results to track speech
        this.recognition.lang = 'en-US';
      }
    } else {
      this.isSupported = false;
    }
  }

  private getFinalTranscript(): string {
    if (this.recognition && this.recognition.results) {
      return Array.from(this.recognition.results)
        .filter((result: any) => result.isFinal)
        .map((result: any) => result[0].transcript)
        .join(' ')
        .trim();
    }
    return this.allFinalTranscripts.join(' ').trim();
  }

  private resetSilenceTimeout() {
    if (this.silenceTimeout) {
      clearTimeout(this.silenceTimeout);
    }
    // Allow 5 seconds of silence before stopping (increased from default)
    this.silenceTimeout = setTimeout(() => {
      if (this.isListening && Date.now() - this.lastSpeechTime > 5000) {
        const finalTranscript = this.getFinalTranscript();
        this.stop();
        if (finalTranscript && this.onResultCallback) {
          this.onResultCallback(finalTranscript);
        }
      }
    }, 5000);
  }

  start(
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.isSupported) {
      onError?.('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (this.isListening) {
      this.stop();
    }

    this.isListening = true;
    this.onResultCallback = onResult;
    this.onErrorCallback = onError ?? null;
    this.lastSpeechTime = Date.now();
    this.allFinalTranscripts = [];

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          this.allFinalTranscripts.push(transcript);
          this.lastSpeechTime = Date.now();
          this.resetSilenceTimeout();
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // Don't error on no-speech, just wait longer
        this.resetSilenceTimeout();
        return;
      }
      
      this.isListening = false;
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      
      let errorMessage = 'Speech recognition error occurred.';
      if (event.error === 'audio-capture') {
        errorMessage = 'No microphone found. Please check your microphone.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone permission denied. Please allow microphone access.';
      }
      
      onError?.(errorMessage);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      // If stopped manually, return the final transcript
      const finalTranscript = this.getFinalTranscript();
      if (finalTranscript && this.onResultCallback && !this.isListening) {
        this.onResultCallback(finalTranscript);
      }
    };

    try {
      this.recognition.start();
      this.resetSilenceTimeout();
    } catch (error) {
      this.isListening = false;
      onError?.('Failed to start speech recognition.');
    }
  }

  stop(): void {
    if (this.isSupported && this.isListening) {
      this.isListening = false;
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      try {
        this.recognition.stop();
      } catch (error) {
        // Ignore errors when stopping
      }
    }
  }

  isAvailable(): boolean {
    return this.isSupported;
  }

  getListeningState(): boolean {
    return this.isListening;
  }
}

