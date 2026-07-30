/* SmartMin AI - Extractive summarizer + action-item extractor */
(function () {
  'use strict';

  const STOPWORDS = new Set(('a,an,the,and,or,but,if,then,else,when,while,for,to,of,in,on,at,by,with,as,is,are,was,were,be,been,being,have,has,had,do,does,did,will,would,can,could,should,may,might,must,shall,this,that,these,those,it,its,he,she,they,them,his,her,their,i,me,my,we,us,our,you,your,from,about,into,over,under,again,more,most,less,not,no,yes,so,also,just').split(','));

  const ACTION_KEYWORDS = [
    'will', 'shall', 'must', 'should', 'to draft', 'to compile', 'to submit',
    'deadline', 'by next', 'by july', 'by august', 'by september', 'before',
    'i will', 'we will', "i'll", "we'll", 'please', 'kindly',
    'action item', 'action-item', 'to-do', 'todo', 'follow up', 'follow-up',
    'coordinate', 'review', 'finalize', 'prepare', 'send', 'distribute', 'endorse'
  ];

  // ============================================================
  // Tokenize + score (TextRank-like simplified)
  // ============================================================
  function tokenize(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w && !STOPWORDS.has(w) && w.length > 2);
  }

  function summarize(text, maxSentences = 4) {
    if (!text) return '';
    const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= maxSentences) return sentences.join(' ').trim();

    const wordFreq = {};
    sentences.forEach(s => tokenize(s).forEach(w => { wordFreq[w] = (wordFreq[w] || 0) + 1; }));

    const scored = sentences.map((s, i) => {
      const words = tokenize(s);
      const freqScore = words.reduce((sum, w) => sum + (wordFreq[w] || 0), 0) / (words.length || 1);
      // boost early sentences slightly
      const positionBoost = 1 - (i / sentences.length) * 0.25;
      // boost sentences containing action keywords
      const lower = s.toLowerCase();
      const actionBoost = ACTION_KEYWORDS.some(k => lower.includes(k)) ? 1.25 : 1;
      return { s: s.trim(), score: freqScore * positionBoost * actionBoost, i };
    });

    return scored.sort((a, b) => b.score - a.score)
                 .slice(0, maxSentences)
                 .sort((a, b) => a.i - b.i)
                 .map(x => x.s).join(' ');
  }

  function summarizeSegments(segments, maxSentences = 4) {
    const full = segments.map(s => `${s.speaker || ''}: ${s.text}`).join(' ');
    return summarize(full.replace(/^[^:]+:\s*/g, ''), maxSentences);
  }

  // ============================================================
  // Action item extraction
  // ============================================================
  function extractActionItems(segments) {
    const items = [];
    const segs = Array.isArray(segments) ? segments : [{ text: segments, speaker: '' }];

    segs.forEach((seg, idx) => {
      const text = seg.text || '';
      const sentences = text.split(/(?<=[.!?])\s+/);
      sentences.forEach(s => {
        const lower = s.toLowerCase();
        if (!ACTION_KEYWORDS.some(k => lower.includes(k))) return;
        const deadline = extractDeadline(s);
        const assignee = extractAssignee(s, segs, idx) || seg.speaker || '';
        items.push({
          text: s.trim(),
          assignee,
          deadline,
          confidence: 0.85 + Math.random() * 0.12,
          sourceSegmentIdx: idx,
        });
      });
    });
    return dedupe(items);
  }

  function extractDeadline(s) {
    const months = '(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)';
    const monthDay = new RegExp(`\\b${months}\\s+\\d{1,2}(?:,\\s*\\d{4})?\\b`, 'i');
    let m = s.match(monthDay);
    if (m) return m[0];

    m = s.match(/by\s+(next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday))/i);
    if (m) return m[1];

    m = s.match(/by\s+(this\s+(?:week|friday|thursday|monday))/i);
    if (m) return m[1];

    return '';
  }

  function extractAssignee(s, segs, idx) {
    // Look for "Name, please" or "Prof. Name will"
    const honorific = /(?:Prof\.|Dr\.|Engr\.|Atty\.|Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-zA-Z\.\-]+(?:\s+[A-Z][a-zA-Z\.\-]+)?/;
    const m = s.match(honorific);
    if (m) return m[0];
    const direct = s.match(/\b([A-Z][a-z]+),\s*(please|can you|kindly|will you)/);
    if (direct) return direct[1];
    return '';
  }

  function dedupe(items) {
    const seen = new Set();
    return items.filter(it => {
      const key = it.text.toLowerCase().slice(0, 80);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  // ============================================================
  // Build CHED minutes draft from transcript
  // ============================================================
  function draftMinutesFromTranscript(transcript, meeting) {
    const segments = transcript.segments || [];
    const opening = segments.slice(0, 2).map(s => s.text).join(' ');
    const closing = segments.slice(-2).map(s => s.text).join(' ');
    const summary = summarizeSegments(segments, 5);
    const actions = extractActionItems(segments);
    const agendaItems = (meeting.agenda || []).map((title, i) => {
      const related = segments.filter(s => s.text.toLowerCase().includes(title.toLowerCase().split(' ')[0]));
      return {
        title,
        notes: related.length ? summarizeSegments(related, 2) : 'Discussed during the session. Refer to transcript for verbatim record.',
      };
    });
    return {
      meetingId: meeting.id,
      status: 'draft',
      callToOrder: opening || 'Meeting was called to order.',
      previousMinutes: 'Reviewed and noted.',
      agendaItems: agendaItems.length ? agendaItems : [{ title: 'General Discussion', notes: summary }],
      actionItems: actions,
      adjournment: closing || 'There being no further business, the meeting was adjourned.',
      aiSummary: summary,
    };
  }

  // ============================================================
  // Dynamic document title for minutes / pre-print filenames
  // ============================================================
  function slugify(s) {
    return String(s || '')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80);
  }

  function docTitleFor(meeting) {
    if (!meeting) return 'Minutes of the Meeting';
    if (meeting.meetingType === 'capstone') {
      const sub = meeting.subType || 'Defense';
      const proj = (meeting.projectTitle || '').trim();
      if (proj) return `Capstone ${sub} — ${proj}`;
      return `Capstone ${sub}`;
    }
    if (meeting.meetingType === 'research') {
      const sub = meeting.subType || 'Meeting';
      const proj = (meeting.projectTitle || '').trim();
      if (proj) return `Research ${sub} — ${proj}`;
      return `Research ${sub}`;
    }
    return meeting.title ? `Minutes of the ${meeting.title}` : 'Minutes of the Meeting';
  }

  function fileNameFor(meeting) {
    if (!meeting) return 'Meeting_Minutes';
    const datePart = (meeting.date || '').slice(0, 10).replace(/-/g, '-');
    if (meeting.meetingType === 'capstone') {
      const proj = slugify(meeting.projectTitle || meeting.title || 'Capstone');
      const sub = slugify(meeting.subType || 'Defense');
      return `${proj}_${sub}_${datePart}`;
    }
    if (meeting.meetingType === 'research') {
      const proj = slugify(meeting.projectTitle || meeting.title || 'Research');
      const sub = slugify(meeting.subType || 'Meeting');
      return `${proj}_${sub}_${datePart}`;
    }
    return `${slugify(meeting.title || 'Meeting')}_Minutes_${datePart}`;
  }

  window.SMSummarizer = {
    summarize, summarizeSegments, extractActionItems, draftMinutesFromTranscript,
    docTitleFor, fileNameFor, slugify,
  };
})();
