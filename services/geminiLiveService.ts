
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
- Proactive: Greet the user immediately and introduce the topic of the day.
- Focus: Classical mechanics, quantum physics, astrophysics, and thermodynamics.
- Style: Use vivid analogies and conceptual logic.
- Bilingual: English and Bengali.
- Interaction: End with a thought-provoking physics question.`,
  
  ielts: `You are "Lisaa," a professional IELTS Speaking Examiner. 
Your goal is to help students achieve a Band 8+ score.
- Proactive: Greet the user immediately and start a mock IELTS Speaking test.
- Focus: Conduct mock tests (Part 1, 2, and 3). 
- Style: Formal but encouraging. Provide feedback on lexical resource, grammatical range, and pronunciation.
- Bilingual: Primarily English, but use Bengali for complex explanations if needed.
- Interaction: Ask standard IELTS questions and provide immediate, constructive feedback.`,

  history_geo: `You are "Lisaa," a world-renowned Historian and Geographer.
Your goal is to connect the past with the physical world.
- Proactive: Greet the user immediately and share a fascinating historical or geographical fact.
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
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error('No Gemini API key found in environment variables.');
    }
    this.ai = new GoogleGenAI({ apiKey: apiKey as string });
  }

  async connect(callbacks: LisaaCallbacks, mode: TutorMode = 'physics') {
    try {
      console.log('Starting Lisaa connection for mode:', mode);
      // 1. Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording. Please use a modern browser like Chrome or Firefox over HTTPS.');
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Your browser does not support the Web Audio API.');
      }

      // 2. Initialize Audio Contexts
      this.inputAudioContext = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      this.outputAudioContext = new AudioContextClass({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      // 3. Explicitly resume contexts (required by some browsers)
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }

      // 4. Request Microphone Permission
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      console.log('Microphone access granted.');
      
      // 5. Connect to Gemini Live API
      const sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log('Gemini Live connection opened.');
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

            let chunkCount = 0;
            this.scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = this.createBlob(inputData);
              chunkCount++;
              
              sessionPromise.then((session: any) => {
                if (session && session.sendRealtimeInput) {
                  session.sendRealtimeInput({ media: pcmBlob });
                }
              }).catch(err => console.error('Error sending audio:', err));
            };

            source.connect(this.scriptProcessor);
            this.scriptProcessor.connect(this.inputAudioContext!.destination);
            
            // Proactively trigger the AI to start talking
            sessionPromise.then((session: any) => {
              if (session && session.send) {
                console.log('Sending initial trigger to AI...');
                session.send({
                  clientContent: {
                    turns: [{
                      role: 'user',
                      parts: [{ text: 'Hello Lisaa, I am ready to start our session. Please introduce yourself and begin.' }]
                    }],
                    turnComplete: true
                  }
                });
              }
            });

            callbacks.onOpen();
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log('Gemini Message:', message);

            // Handle Transcripts
            if (message.serverContent?.outputTranscription) {
              callbacks.onTranscript(message.serverContent.outputTranscription.text, false);
            } else if (message.serverContent?.inputTranscription) {
              callbacks.onTranscript(message.serverContent.inputTranscription.text, true);
            }

            // Handle Audio Playback (Iterate through all parts)
            const parts = message.serverContent?.modelTurn?.parts;
            if (parts && this.outputAudioContext) {
              for (const part of parts) {
                const base64Audio = part.inlineData?.data;
                if (base64Audio) {
                  // Ensure context is running before playback
                  if (this.outputAudioContext.state === 'suspended') {
                    await this.outputAudioContext.resume();
                  }

                  this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
                  try {
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
                  } catch (decodeErr) {
                    console.error('Audio decoding error:', decodeErr);
                  }
                }
              }
            }

            // Handle Interruptions
            if (message.serverContent?.interrupted) {
              console.log('AI Interrupted');
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
