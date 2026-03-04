
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { encode, decode, decodeAudioData } from '../utils/audioUtils';

// Constants for audio handling
const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;

export type TutorMode = 'physics' | 'ielts' | 'history_geo';

export interface LisaaCallbacks {
  onOpen: () => void;
  onClose: () => void;
  onError: (error: any) => void;
  onTranscript: (text: string, isUser: boolean) => void;
  onVolumeChange: (volume: number) => void;
}

const SYSTEM_INSTRUCTIONS: Record<TutorMode, string> = {
  physics: `You are "Lisaa," a brilliant and enthusiastic Physics Professor. 
Your goal is to make the laws of the universe feel alive. 
- Focus: Classical mechanics, quantum physics, astrophysics, and thermodynamics.
- Style: Use vivid analogies and conceptual logic.
- Bilingual: English and Bengali.
- Interaction: End with a thought-provoking physics question.`,
  
  ielts: `You are "Lisaa," a professional IELTS Speaking Examiner. 
Your goal is to help students achieve a Band 8+ score.
- Focus: Conduct mock tests (Part 1, 2, and 3). 
- Style: Formal but encouraging. Provide feedback on lexical resource, grammatical range, and pronunciation.
- Bilingual: Primarily English, but use Bengali for complex explanations if needed.
- Interaction: Ask standard IELTS questions and provide immediate, constructive feedback.`,

  history_geo: `You are "Lisaa," a world-renowned Historian and Geographer.
Your goal is to connect the past with the physical world.
- Focus: Ancient civilizations, modern history, geopolitical shifts, and physical geography.
- Style: Storytelling-driven. Explain how geography shaped history (e.g., why empires settled near rivers).
- Bilingual: English and Bengali.
- Interaction: End with a question about a historical event or a geographical feature.`
};

export class LisaaService {
  private ai: any;
  private session: any;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private sources: Set<AudioBufferSourceNode> = new Set();
  private nextStartTime: number = 0;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private analyser: AnalyserNode | null = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: (process.env.API_KEY as string) });
  }

  async connect(callbacks: LisaaCallbacks, mode: TutorMode = 'physics') {
    try {
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = this.inputAudioContext!.createMediaStreamSource(stream);
            this.scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
            
            // For volume visualization
            this.analyser = this.inputAudioContext!.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            const updateVolume = () => {
              if (this.analyser) {
                this.analyser.getByteFrequencyData(dataArray);
                const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                callbacks.onVolumeChange(average / 128); // Normalized 0-1
                requestAnimationFrame(updateVolume);
              }
            };
            updateVolume();

            this.scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = this.createBlob(inputData);
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.inputAudioContext!.destination);
            callbacks.onOpen();
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcripts
            if (message.serverContent?.outputTranscription) {
              callbacks.onTranscript(message.serverContent.outputTranscription.text, false);
            } else if (message.serverContent?.inputTranscription) {
              callbacks.onTranscript(message.serverContent.inputTranscription.text, true);
            }

            // Handle Audio Playback
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && this.outputAudioContext) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
              const audioBuffer = await decodeAudioData(
                decode(base64Audio),
                this.outputAudioContext,
                OUTPUT_SAMPLE_RATE,
                1
              );
              
              const source = this.outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              const gainNode = this.outputAudioContext.createGain();
              source.connect(gainNode);
              gainNode.connect(this.outputAudioContext.destination);

              source.addEventListener('ended', () => {
                this.sources.delete(source);
              });

              source.start(this.nextStartTime);
              this.nextStartTime += audioBuffer.duration;
              this.sources.add(source);
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              this.sources.forEach(s => {
                try { s.stop(); } catch(e) {}
              });
              this.sources.clear();
              this.nextStartTime = 0;
            }
          },
          onerror: (e: any) => callbacks.onError(e),
          onclose: () => callbacks.onClose(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTIONS[mode],
        },
      });

      this.session = await sessionPromise;
    } catch (err) {
      callbacks.onError(err);
    }
  }

  private createBlob(data: Float32Array): Blob {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  }

  disconnect() {
    if (this.session) {
      this.session.close();
      this.session = null;
    }
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    this.analyser = null;
    this.sources.forEach(s => {
      try { s.stop(); } catch(e) {}
    });
    this.sources.clear();
  }
}
