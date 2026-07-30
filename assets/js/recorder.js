/* SmartMin AI - MediaRecorder + offline queue + AI auto-processing pipeline */
(function () {
  'use strict';

  function isSupported() { return !!(navigator.mediaDevices && window.MediaRecorder); }

  class AudioRecorder {
    constructor({ onLevel, onTick, onStop } = {}) {
      this.onLevel = onLevel || (() => {});
      this.onTick = onTick || (() => {});
      this.onStop = onStop || (() => {});
      this.stream = null;
      this.recorder = null;
      this.chunks = [];
      this.startedAt = 0;
      this.tickTimer = null;
      this.levelTimer = null;
      this.audioCtx = null;
      this.analyser = null;
      this.state = 'idle'; // idle | recording | paused
    }

    async start() {
      if (!isSupported()) throw new Error('MediaRecorder not supported');
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream);
      this.recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) this.chunks.push(e.data); };
      this.recorder.start(1000);
      this.startedAt = Date.now();
      this.state = 'recording';
      this._startMeters();
    }

    pause() {
      if (this.state === 'recording' && this.recorder) {
        this.recorder.pause();
        this.state = 'paused';
        clearInterval(this.tickTimer);
      }
    }

    resume() {
      if (this.state === 'paused' && this.recorder) {
        this.recorder.resume();
        this.state = 'recording';
        this._startTick();
      }
    }

    async stop() {
      if (!this.recorder) return null;
      return new Promise((resolve) => {
        this.recorder.onstop = () => {
          clearInterval(this.tickTimer);
          clearInterval(this.levelTimer);
          if (this.stream) this.stream.getTracks().forEach(t => t.stop());
          if (this.audioCtx) { try { this.audioCtx.close(); } catch {} }
          const blob = new Blob(this.chunks, { type: this.recorder.mimeType || 'audio/webm' });
          this.state = 'idle';
          this.onStop(blob, this._elapsed());
          resolve({ blob, durationSec: this._elapsed() });
        };
        this.recorder.stop();
      });
    }

    _elapsed() { return Math.floor((Date.now() - this.startedAt) / 1000); }

    _startMeters() {
      this._startTick();
      try {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const source = this.audioCtx.createMediaStreamSource(this.stream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 256;
        source.connect(this.analyser);
        const data = new Uint8Array(this.analyser.frequencyBinCount);
        this.levelTimer = setInterval(() => {
          this.analyser.getByteFrequencyData(data);
          let sum = 0; for (let i = 0; i < data.length; i++) sum += data[i];
          this.onLevel(sum / data.length / 255);
        }, 80);
      } catch (e) { /* graceful degrade */ }
    }

    _startTick() {
      this.tickTimer = setInterval(() => this.onTick(this._elapsed()), 500);
    }
  }

  // ============================================================
  // Save recording to IndexedDB + queue if offline
  // ============================================================
  async function persistRecording({ blob, durationSec, meeting, language = 'en-US' }) {
    const audioId = SmartMin.uid('audio');
    await SMStore.saveAudio(audioId, blob, { meetingId: meeting?.id, durationSec, language });
    const queued = !navigator.onLine;
    const queue = SMStore.read(SMStore.KEYS.offlineQueue, []);
    queue.unshift({ id: audioId, meetingId: meeting?.id, durationSec, language, queuedAt: Date.now() });
    SMStore.write(SMStore.KEYS.offlineQueue, queue);
    SMStore.audit('recording_saved', `Audio ${audioId} (${durationSec}s) ${queued?'queued offline':'saved'} ${meeting?'for ' + meeting.title:''}`);
    if (!queued) {
      return await processRecording(audioId);
    }
    return { audioId, queued: true };
  }

  // Process a single queued recording through the AI pipeline
  async function processRecording(audioId) {
    const rec = SMStore.read(SMStore.KEYS.offlineQueue, []).find(r => r.id === audioId);
    if (!rec) return null;

    // 1. Generate transcript (mock - since we don't have a real Whisper instance)
    await wait(900);
    const segments = SMTranscriber.generateMockTranscript(rec.language || 'en-US', 8);
    // 2. Summarize
    const summary = SMSummarizer.summarizeSegments(segments, 4);
    // 3. Action items
    const actions = SMSummarizer.extractActionItems(segments);

    const transcript = {
      id: SmartMin.uid('t'),
      meetingId: rec.meetingId,
      language: rec.language || 'en-US',
      segments,
      summary,
      confidence: 0.97,
      sourceAudioId: audioId,
      createdAt: Date.now(),
    };
    SMStore.upsert(SMStore.KEYS.transcripts, transcript);

    // Update meeting
    if (rec.meetingId) {
      const m = SMStore.getById(SMStore.KEYS.meetings, rec.meetingId);
      if (m) {
        m.transcriptId = transcript.id;
        m.aiProcessed = true;
        m.status = m.status === 'scheduled' ? 'transcribed' : m.status;
        SMStore.upsert(SMStore.KEYS.meetings, m);
      }
    }

    // Auto-create tasks from action items
    let taskCount = 0;
    actions.forEach(a => {
      const task = {
        id: SmartMin.uid('task'),
        title: a.text.length > 90 ? a.text.slice(0, 87) + '...' : a.text,
        description: a.text,
        meetingId: rec.meetingId,
        departmentId: null,
        assigneeId: null,
        delegatedBy: null,
        priority: 'medium',
        deadline: a.deadline || '',
        status: 'pending',
        aiExtracted: true,
        confidence: a.confidence,
      };
      SMStore.upsert(SMStore.KEYS.tasks, task);
      taskCount++;
    });

    // Remove from queue
    SMStore.write(SMStore.KEYS.offlineQueue, SMStore.read(SMStore.KEYS.offlineQueue, []).filter(r => r.id !== audioId));
    SMStore.audit('ai_processed', `Audio ${audioId} transcribed (${segments.length} segments), ${taskCount} action items extracted`);
    return { transcriptId: transcript.id, taskCount, summary };
  }

  async function processQueue() {
    const queue = SMStore.read(SMStore.KEYS.offlineQueue, []);
    let count = 0;
    for (const rec of queue) {
      try { await processRecording(rec.id); count++; }
      catch (e) { console.warn('Failed to process', rec.id, e); }
    }
    return count;
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  // Auto-flush on reconnect (uses settings flag)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', async () => {
      const settings = SMStore.getSettings();
      if (settings.autoUploadOnReconnect) {
        const n = await processQueue();
        if (n > 0 && window.SmartMin) SmartMin.toast(`Synced ${n} offline recording${n>1?'s':''}. AI transcription complete.`, 'ai');
      }
    });
  }

  window.SMRecorder = { AudioRecorder, persistRecording, processRecording, processQueue, isSupported };
})();
