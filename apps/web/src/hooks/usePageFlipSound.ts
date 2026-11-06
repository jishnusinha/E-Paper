import { useCallback, useRef } from "react";

/** Synthesize a short paper-flip sound via Web Audio (no asset file required). */
export function usePageFlipSound() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(async () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      if (!ctxRef.current) {
        ctxRef.current = new AudioCtx();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const duration = 0.18;
      const sampleRate = ctx.sampleRate;
      const frameCount = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, frameCount, sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < frameCount; i++) {
        const t = i / sampleRate;
        const envelope = Math.exp(-t * 18) * (1 - t / duration);
        const rustle =
          (Math.random() * 2 - 1) * 0.55 +
          Math.sin(2 * Math.PI * (420 + t * 900) * t) * 0.25;
        data[i] = rustle * envelope * 0.35;
      }

      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 0.7;

      const gain = ctx.createGain();
      gain.gain.value = 0.9;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // Audio may be blocked until user gesture; ignore quietly.
    }
  }, []);

  return { play };
}
