export class SpeechToText {
  private recognition: any;
  private isSupported: boolean;
  private isListening: boolean = false;
  private silenceTimeout: NodeJS.Timeout | null = null;
  private lastSpeechTime: number = 0;
  private onResultCallback: ((transcript: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private allFinalTranscripts: string[] = [];
  /** When true, recording only stops when stop() is called; no silence timeout or onend submit. */
  private manualStopOnly: boolean = false;
  /** Set by stop() so onend delivers the transcript instead of restarting. */
  private manualStopRequested: boolean = false;

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

  /**
   * Start listening; result is delivered on silence timeout (5s) or when the browser ends the session.
   */
  start(
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): void {
    this.runStart(false, onResult, onError);
  }

  /**
   * Start listening in manual-stop mode: recording continues until stop() is called.
   * No silence timeout; browser onend will restart recognition to keep listening.
   * The result callback is only invoked when stop() is called.
   */
  startManualStop(
    onResult: (transcript: string) => void,
    onError?: (error: string) => void
  ): void {
    this.runStart(true, onResult, onError);
  }

  private runStart(
    manualStopOnly: boolean,
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

    this.manualStopOnly = manualStopOnly;
    this.manualStopRequested = false;
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
          if (!this.manualStopOnly) {
            this.resetSilenceTimeout();
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        if (!this.manualStopOnly) {
          this.resetSilenceTimeout();
        }
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
      if (this.manualStopRequested) {
        this.isListening = false;
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
        }
        const finalTranscript = this.getFinalTranscript();
        if (this.onResultCallback) {
          this.onResultCallback(finalTranscript);
        }
        this.manualStopRequested = false;
        return;
      }
      if (this.manualStopOnly) {
        this.isListening = false;
        if (this.silenceTimeout) {
          clearTimeout(this.silenceTimeout);
        }
        try {
          this.isListening = true;
          this.recognition.start();
        } catch {
          this.isListening = false;
        }
        return;
      }
      this.isListening = false;
      if (this.silenceTimeout) {
        clearTimeout(this.silenceTimeout);
      }
      const finalTranscript = this.getFinalTranscript();
      if (finalTranscript && this.onResultCallback) {
        this.onResultCallback(finalTranscript);
      }
    };

    try {
      this.recognition.start();
      if (!this.manualStopOnly) {
        this.resetSilenceTimeout();
      }
    } catch (error) {
      this.isListening = false;
      onError?.('Failed to start speech recognition.');
    }
  }

  stop(): void {
    if (this.isSupported && this.isListening) {
      if (this.manualStopOnly) {
        this.manualStopRequested = true;
      }
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

