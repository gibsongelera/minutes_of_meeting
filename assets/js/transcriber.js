/* SmartMin AI - Transcription wrapper (Web Speech API + canned fallback) */
(function () {
  'use strict';

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  // Canned demo lines used when Web Speech is unavailable / mock mode is on
  const CANNED_EN = [
    { speaker: 'Engr. Ricardo Gomez', text: 'Good morning, colleagues. Let us call this meeting to order. We have a quorum present today.' },
    { speaker: 'Sarah Torres',        text: 'Thank you, sir. The minutes of our previous meeting have been circulated. I move for their approval.' },
    { speaker: 'Dr. Maria Santos',    text: 'I second the motion. The minutes accurately reflect what was discussed.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Approved without corrections. Our first agenda item is the curriculum review. Dr. Villanueva, please proceed.' },
    { speaker: 'Prof. Antonette Villanueva', text: 'We need to finalize the curriculum updates by next week. The board expects our compliance report aligned with the new CHED CMO.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'I agree. Prof. Dela Cruz, please compile the syllabus drafts and have them ready by Thursday next week.' },
    { speaker: 'Prof. Juan Dela Cruz',text: 'Yes, I will coordinate with the other instructors and consolidate the drafts.' },
    { speaker: 'Dr. Maria Santos',    text: 'Regarding IT infrastructure, we propose a budget of 1.2 million pesos for Lab 3 networking upgrades. The Finance committee should endorse this to the VP for Academic Affairs by next week.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Noted. I will draft the endorsement letter by July 22.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'With no other business, this meeting is adjourned.' },
  ];

  const CANNED_TL = [
    { speaker: 'Engr. Ricardo Gomez', text: 'Magandang umaga sa inyong lahat. Pormal na binuksan ang ating pulong. May kumporme tayo ngayon.' },
    { speaker: 'Sarah Torres',        text: 'Salamat. Iminumungkahi ko ang pag-aapruba sa katitikan ng nakaraang pulong.' },
    { speaker: 'Dr. Maria Santos',    text: 'Sinusuportahan ko ang mosyon. Maayos at tumpak ang nasabing katitikan.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Aprubado. Susunod, ang pagrerepaso ng kurikulum. Prof. Villanueva, ipagpatuloy po.' },
    { speaker: 'Prof. Antonette Villanueva', text: 'Kailangan nating tapusin ang pagbabago sa kurikulum sa susunod na linggo upang umayon sa bagong CHED CMO.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Sumasang-ayon ako. Prof. Dela Cruz, pakikoordinasyon sa mga tagapagturo at isumite ang mga silabus sa Huwebes ng susunod na linggo.' },
    { speaker: 'Prof. Juan Dela Cruz',text: 'Opo, makikipag-ugnayan ako sa lahat at ipagsasama-sama ang mga draft.' },
    { speaker: 'Dr. Maria Santos',    text: 'Tungkol sa IT, iminumungkahi naming maglaan ng 1.2 milyong piso para sa Lab 3. Kailangang i-endorso ito ng komite ng pinansya.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Tatapusin ko ang sulat ng pag-endorso bago mag-July 22.' },
    { speaker: 'Engr. Ricardo Gomez', text: 'Tapos na ang pulong. Salamat sa inyong lahat.' },
  ];

  // ============================================================
  // LiveTranscriber - state machine driving a callback per segment
  // ============================================================
  class LiveTranscriber {
    constructor({ lang = 'en-US', onSegment, onPartial, onError, useMockOnly = false } = {}) {
      this.lang = lang;
      this.onSegment = onSegment || (() => {});
      this.onPartial = onPartial || (() => {});
      this.onError = onError || (() => {});
      this.useMockOnly = useMockOnly;
      this.recognition = null;
      this.mockTimer = null;
      this.mockIdx = 0;
      this.startedAt = 0;
      this.running = false;
    }

    isWebSpeechSupported() { return !!SR; }

    start() {
      this.startedAt = Date.now();
      this.running = true;
      if (SR && !this.useMockOnly) {
        try { this._startWebSpeech(); return 'web-speech'; }
        catch (e) { console.warn('Web Speech failed, falling back to mock', e); }
      }
      this._startMock();
      return 'mock';
    }

    stop() {
      this.running = false;
      if (this.recognition) { try { this.recognition.stop(); } catch {} this.recognition = null; }
      if (this.mockTimer) { clearTimeout(this.mockTimer); this.mockTimer = null; }
    }

    _startWebSpeech() {
      const rec = new SR();
      rec.lang = this.lang;
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      rec.onresult = (e) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const text = r[0].transcript.trim();
          if (!text) continue;
          if (r.isFinal) {
            this.onSegment({
              speaker: 'Live Speaker',
              text,
              t: (Date.now() - this.startedAt) / 1000,
              confidence: r[0].confidence || 0.95,
            });
          } else {
            this.onPartial(text);
          }
        }
      };
      rec.onerror = (e) => {
        if (e.error === 'no-speech') return; // benign
        this.onError(e.error || 'recognition_error');
        // fallback to mock if permission denied or service blocked
        if (['not-allowed', 'service-not-allowed', 'audio-capture', 'network'].includes(e.error)) {
          this._startMock();
        }
      };
      rec.onend = () => {
        if (this.running) {
          try { rec.start(); } catch {}
        }
      };
      rec.start();
      this.recognition = rec;
    }

    _startMock() {
      const corpus = this.lang.startsWith('tl') ? CANNED_TL : CANNED_EN;
      this.mockIdx = 0;
      const tick = () => {
        if (!this.running) return;
        const seg = corpus[this.mockIdx % corpus.length];
        this.onSegment({
          ...seg,
          t: (Date.now() - this.startedAt) / 1000,
          confidence: 0.93 + Math.random() * 0.06,
        });
        this.mockIdx += 1;
        const delay = 2800 + Math.random() * 2200;
        this.mockTimer = setTimeout(tick, delay);
      };
      // First segment after short delay
      this.mockTimer = setTimeout(tick, 1500);
    }
  }

  // Synthesize a full canned transcript (for offline-recorded files)
  function generateMockTranscript(lang = 'en-US', count = 8) {
    const corpus = lang.startsWith('tl') ? CANNED_TL : CANNED_EN;
    const out = [];
    let t = 0;
    for (let i = 0; i < count; i++) {
      const seg = corpus[i % corpus.length];
      out.push({ speaker: seg.speaker, text: seg.text, t, confidence: 0.93 + Math.random() * 0.06 });
      t += 18 + Math.random() * 12;
    }
    return out;
  }

  window.SMTranscriber = { LiveTranscriber, generateMockTranscript, isSupported: () => !!SR };
})();
