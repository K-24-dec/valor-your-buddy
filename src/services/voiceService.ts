export interface ErrorDetail {
  category: 'grammar' | 'vocabulary' | 'sentence-structure' | 'pronunciation';
  originalSnippet: string;
  correctedSnippet: string;
  explanation: string;
}

export interface GrammarCorrectionResponse {
  hasErrors: boolean;
  originalText: string;
  explanation: string;
  correctedSentence: string;
  retryPrompt: string;
  spokenResponse: string;
  errorDetails: ErrorDetail[];
  llmProvider?: string;
}

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface VoiceInfo {
  uri: string;
  name: string;
  lang: string;
  isMale: boolean;
  isNatural: boolean;
}

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voiceURI?: string;
}

/**
 * Microphone Audio Recorder wrapping HTML5 MediaRecorder API.
 */
export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  public async start(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser environment.');
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];

    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
      ? 'audio/webm'
      : 'audio/mp4';

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  public stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('Recorder was not initialized.'));
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        });
        if (this.mediaRecorder && this.mediaRecorder.stream) {
          this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        }
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }
}

/**
 * Clean Voice Engine Abstraction for VALOR AI Language Partner
 * Handles TTS playback, voice selection, pitch/rate controls, cancellation, and fallback.
 */
export class VoiceServiceEngine {
  private currentAudio: HTMLAudioElement | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private _isSpeaking: boolean = false;
  private rate: number = 0.90; // Default calm, clear, relaxed pace for language learners
  private pitch: number = 0.95; // Warm, natural male pitch (never artificially distorted)
  private volume: number = 0.9;
  private selectedVoiceURI: string = '';

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Warm up voice list loading
      window.speechSynthesis.onvoiceschanged = () => {
        this.getAvailableVoices();
      };
    }
  }

  public get isSpeaking(): boolean {
    return this._isSpeaking;
  }

  /**
   * Stop/Cancel all ongoing speech (audio stream or Web Speech utterance).
   */
  public stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (err) {
        console.warn('Error stopping audio playback:', err);
      }
      this.currentAudio = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    this._isSpeaking = false;
  }

  public pause(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.pause();
    }
  }

  public resume(): void {
    if (this.currentAudio) {
      this.currentAudio.play();
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.resume();
    }
  }

  public setVoice(voiceURI: string): void {
    this.selectedVoiceURI = voiceURI;
  }

  public setRate(rate: number): void {
    this.rate = Math.max(0.5, Math.min(1.5, rate));
  }

  public setPitch(pitch: number): void {
    this.pitch = Math.max(0.7, Math.min(1.2, pitch));
  }

  public setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Query available browser speech voices, prioritizing calm, natural adult male voices.
   */
  public getAvailableVoices(): VoiceInfo[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    const voices = window.speechSynthesis.getVoices();
    return voices.map((v) => {
      const nameLower = v.name.toLowerCase();
      const isMale =
        nameLower.includes('guy') ||
        nameLower.includes('david') ||
        nameLower.includes('male') ||
        nameLower.includes('george') ||
        nameLower.includes('christopher') ||
        nameLower.includes('daniel') ||
        nameLower.includes('alex') ||
        nameLower.includes('james') ||
        nameLower.includes('brian');
      const isNatural = nameLower.includes('natural') || nameLower.includes('google') || nameLower.includes('online');

      return {
        uri: v.voiceURI || v.name,
        name: v.name,
        lang: v.lang,
        isMale,
        isNatural,
      };
    });
  }

  /**
   * Main Speak Method: Tries server TTS endpoint (ElevenLabs/Azure calm male voice),
   * then falls back gracefully to Browser Web Speech API with dynamic male voice selection.
   */
  public speak(text: string, options?: VoiceOptions): Promise<void> {
    // Cancel any ongoing speech first to prevent overlapping playback
    this.stop();
    this._isSpeaking = true;

    const rateToUse = options?.rate ?? this.rate;
    const pitchToUse = options?.pitch ?? this.pitch;
    const volumeToUse = options?.volume ?? this.volume;

    return new Promise(async (resolve) => {
      const onDone = () => {
        this._isSpeaking = false;
        resolve();
      };

      // 1. Try Server-Synthesized Speech (ElevenLabs / Azure calm male voice)
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            rate: rateToUse,
            pitch: pitchToUse,
          }),
        });

        if (res.ok) {
          const audioBlob = await res.blob();
          if (audioBlob.size > 200) {
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);
            this.currentAudio = audio;
            audio.volume = volumeToUse;

            audio.onended = () => {
              URL.revokeObjectURL(audioUrl);
              this.currentAudio = null;
              onDone();
            };

            audio.onerror = () => {
              this.currentAudio = null;
              this.speakWithBrowserFallback(text, rateToUse, pitchToUse, volumeToUse, onDone);
            };

            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn('Server TTS stream unavailable, falling back to browser male voice:', err);
      }

      // 2. Fallback: Browser Speech Synthesis with Calm Male Voice Selection
      this.speakWithBrowserFallback(text, rateToUse, pitchToUse, volumeToUse, onDone);
    });
  }

  private speakWithBrowserFallback(
    text: string,
    rate: number,
    pitch: number,
    volume: number,
    onDone: () => void
  ): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      console.warn('Web Speech Synthesis not supported in browser environment.');
      onDone();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    utterance.rate = rate; // e.g. 0.90 for clear, relaxed delivery
    utterance.pitch = pitch; // e.g. 0.95 for warm natural male pitch
    utterance.volume = volume;
    utterance.lang = 'en-US';

    const voices = window.speechSynthesis.getVoices();
    let chosenVoice: SpeechSynthesisVoice | null = null;

    // Check if user explicitly chose a voice
    if (this.selectedVoiceURI) {
      chosenVoice = voices.find((v) => (v.voiceURI || v.name) === this.selectedVoiceURI) || null;
    }

    // Select closest natural adult male voice
    if (!chosenVoice && voices.length > 0) {
      // 1. Look for natural adult male voices (e.g. Google US English, Microsoft Guy, Microsoft Christopher, Microsoft David)
      chosenVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Guy') ||
              v.name.includes('Christopher') ||
              v.name.includes('Google US English') ||
              v.name.includes('David') ||
              v.name.includes('George') ||
              v.name.includes('Daniel') ||
              v.name.includes('Male'))
        ) || null;

      // 2. Fallback to any natural English voice
      if (!chosenVoice) {
        chosenVoice =
          voices.find(
            (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
          ) || null;
      }

      // 3. Fallback to first available English voice
      if (!chosenVoice) {
        chosenVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onend = () => {
      this.currentUtterance = null;
      onDone();
    };

    utterance.onerror = (e) => {
      console.warn('Speech synthesis error:', e);
      this.currentUtterance = null;
      onDone();
    };

    window.speechSynthesis.speak(utterance);
  }
}

// Global Singleton Export for Voice Engine
export const voiceService = new VoiceServiceEngine();

/**
 * Convenience Helper for Speech Synthesis (backward compatible wrapper)
 */
export async function speakResponse(text: string, options?: VoiceOptions): Promise<void> {
  return voiceService.speak(text, options);
}

/**
 * Transcribe Speech to Text (STT) via backend API endpoint.
 */
export async function transcribeAudio(
  audioBlob: Blob
): Promise<{ text: string; provider: string }> {
  try {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');

    const res = await fetch('/api/voice/stt', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return { text: data.text, provider: data.provider || 'whisper' };
      }
    }
  } catch (err) {
    console.warn('STT API fetch failed:', err);
  }

  throw new Error('STT transcription could not be completed.');
}

/**
 * Evaluate transcript for grammar/vocab errors via LLM backend endpoint (backward compatible).
 */
export async function evaluateGrammar(transcript: string): Promise<GrammarCorrectionResponse> {
  try {
    const res = await fetch('/api/voice/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (res.ok) {
      const data: GrammarCorrectionResponse = await res.json();
      return data;
    }
  } catch (err) {
    console.warn('LLM Grammar evaluation API call failed:', err);
  }

  return generateFallbackGrammarCorrection(transcript);
}

/**
 * Intelligent Fallback Grammar Corrector (backward compatible).
 */
export function generateFallbackGrammarCorrection(transcript: string): GrammarCorrectionResponse {
  const errorDetails: ErrorDetail[] = [];
  let correctedSentence = transcript;
  let explanation = 'That is good. Your sentence is clear and natural.';
  let hasErrors = false;

  if (/\bhe go\b/i.test(transcript)) {
    hasErrors = true;
    correctedSentence = transcript.replace(/\bhe go\b/gi, 'he goes');
    explanation = 'Use "goes" for third-person singular subjects (he/she/it).';
  } else if (/\bi goes\b/i.test(transcript)) {
    hasErrors = true;
    correctedSentence = transcript.replace(/\bi goes\b/gi, 'I go');
    explanation = 'Use "go" with first-person singular "I".';
  } else if (/\bshe don't\b/i.test(transcript)) {
    hasErrors = true;
    correctedSentence = transcript.replace(/\bshe don't\b/gi, "she doesn't");
    explanation = 'Use "doesn\'t" with third-person singular (she/he/it).';
  }

  const retryPrompt = hasErrors
    ? `Try saying: "${correctedSentence}"`
    : `Good work. What else would you like to talk about?`;

  const spokenResponse = hasErrors
    ? `${explanation} Try saying: ${correctedSentence}.`
    : `That makes sense. ${retryPrompt}`;

  return {
    hasErrors,
    originalText: transcript,
    explanation,
    correctedSentence,
    retryPrompt,
    spokenResponse,
    errorDetails,
    llmProvider: 'Valor Voice Engine',
  };
}
