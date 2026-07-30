/**
 * English <-> Tagalog dictionary translator.
 *
 * Port of assets/js/translator.js. Covers the institutional vocabulary that
 * shows up in ZPPSU meetings; it is a lookup table, not a translation model, and
 * is only meant to make the bilingual demo legible.
 *
 * One behavioural fix over the original — see translateString().
 */

/** English -> Tagalog. Keys are lowercase. */
const EN_TL: Record<string, string> = {
  'good morning': 'magandang umaga',
  'good afternoon': 'magandang hapon',
  'thank you all': 'salamat sa inyong lahat',
  'thank you': 'salamat',
  colleagues: 'mga kasamahan',
  'faculty senate': 'kapulungan ng guro',
  'monthly sync': 'buwanang pagpupulong',
  'meeting was called to order': 'pormal na binuksan ang pulong',
  'meeting is adjourned': 'tapos na ang pulong',
  meeting: 'pulong',
  faculty: 'guro',
  curriculum: 'kurikulum',
  budget: 'badyet',
  infrastructure: 'imprastraktura',
  committee: 'komite',
  priority: 'prayoridad',
  replacement: 'pagpapalit',
  networking: 'networking',
  equipment: 'kagamitan',
  department: 'departamento',
  'i agree': 'sumasang-ayon ako',
  'i second the motion': 'sinusuportahan ko ang mosyon',
  'approved without corrections': 'inaprubahan nang walang pagbabago',
  'by next week': 'sa susunod na linggo',
  'next week': 'sa susunod na linggo',
  'next month': 'sa susunod na buwan',
  deadline: 'huling araw',
  'submit the': 'isumite ang',
  submit: 'isumite',
  report: 'ulat',
  finalize: 'tapusin',
  review: 'suriin',
  discussed: 'tinalakay',
  discuss: 'talakayin',
  'we need to': 'kailangan nating',
  'we will': 'tayo ay',
  'i will': 'ako ay',
  will: 'ay magsasagawa ng',
  shall: 'ay magsasagawa ng',
  must: 'dapat',
  should: 'kailangang',
  request: 'kahilingan',
  approved: 'inaprubahan',
  approve: 'aprubahan',
  pending: 'nakabinbin',
  'in progress': 'nagaganap',
  done: 'tapos na',
  university: 'unibersidad',
  college: 'kolehiyo',
  office: 'tanggapan',
  president: 'pangulo',
  dean: 'dekano',
  secretary: 'kalihim',
  staff: 'kawani',
  students: 'mga mag-aaral',
  student: 'mag-aaral',
  workshop: 'palihan',
  training: 'pagsasanay',
  evaluation: 'pagsusuri',
  accreditation: 'akreditasyon',
  syllabus: 'silabus',
  syllabi: 'mga silabus',
  instructors: 'mga tagapagturo',
  instructor: 'tagapagturo',
  professor: 'propesor',
  documents: 'mga dokumento',
  document: 'dokumento',
  schedule: 'iskedyul',
  conflict: 'salungatan',
  adjourned: 'tapos na',
  presented: 'iniharap',
  present: 'iharap',
  agenda: 'adyenda',
  good: 'mabuti',
  today: 'ngayon',
  tomorrow: 'bukas',
  yesterday: 'kahapon',
  morning: 'umaga',
  afternoon: 'hapon',
  evening: 'gabi',
  without: 'walang',
  with: 'kasama',
  and: 'at',
  or: 'o',
  the: 'ang',
  a: 'isang',
  is: 'ay',
  are: 'ay',
  for: 'para sa',
  to: 'sa',
  of: 'ng',
  in: 'sa',
  on: 'sa',
  at: 'sa',
  this: 'ito',
  that: 'iyan',
  these: 'ang mga ito',
  those: 'ang mga iyon',
  please: 'paki',
  coordinate: 'i-koordinasyon',
  finance: 'pinansya',
  'academic affairs': 'mga gawaing akademiko',
  'vice president': 'pangalawang pangulo',
  board: 'lupon',
  quorum: 'kumporme',
  motion: 'mosyon',
  minutes: 'katitikan',
  previous: 'nakaraan',
  team: 'koponan',
  project: 'proyekto',
  'action items': 'mga gawaing aksyon',
  tasks: 'mga gawain',
  task: 'gawain',
};

/** Tagalog -> English. */
const TL_EN: Record<string, string> = {
  'magandang umaga': 'good morning',
  'magandang hapon': 'good afternoon',
  'salamat sa inyong lahat': 'thank you all',
  salamat: 'thank you',
  'mga kasamahan': 'colleagues',
  pagpupulong: 'meeting',
  pulong: 'meeting',
  guro: 'faculty',
  kurikulum: 'curriculum',
  badyet: 'budget',
  departamento: 'department',
  kolehiyo: 'college',
  unibersidad: 'university',
  pangulo: 'president',
  dekano: 'dean',
  kalihim: 'secretary',
  'mga mag-aaral': 'students',
  'mag-aaral': 'student',
  'mga silabus': 'syllabi',
  silabus: 'syllabus',
  iskedyul: 'schedule',
  'huling araw': 'deadline',
  ulat: 'report',
  inaprubahan: 'approved',
  aprubahan: 'approve',
  nakabinbin: 'pending',
  'tapos na': 'done',
  palihan: 'workshop',
  pagsasanay: 'training',
  pagsusuri: 'evaluation',
  akreditasyon: 'accreditation',
  'mga tagapagturo': 'instructors',
  tagapagturo: 'instructor',
  propesor: 'professor',
  'mga dokumento': 'documents',
  dokumento: 'document',
  salungatan: 'conflict',
  kailangan: 'need',
  dapat: 'must',
  kasama: 'with',
  walang: 'without',
  at: 'and',
  o: 'or',
  ang: 'the',
  isang: 'a',
  'para sa': 'for',
  sa: 'to',
  ng: 'of',
  ito: 'this',
  iyan: 'that',
  paki: 'please',
  mosyon: 'motion',
  katitikan: 'minutes',
  lupon: 'board',
  'mga gawaing aksyon': 'action items',
  'mga gawain': 'tasks',
  gawain: 'task',
  proyekto: 'project',
  koponan: 'team',
  pinansya: 'finance',
};

const escapeRe = (s: string) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

/** Cache the compiled alternation per dictionary — it never changes. */
const compiled = new WeakMap<Record<string, string>, RegExp>();

function patternFor(dict: Record<string, string>): RegExp {
  const cached = compiled.get(dict);
  if (cached) return cached;

  // Longest first, so "good morning" wins over "good" and "thank you all" over
  // "thank you".
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  const re = new RegExp(`\\b(?:${keys.map(escapeRe).join('|')})\\b`, 'gi');
  compiled.set(dict, re);
  return re;
}

function matchCase(source: string, translated: string): string {
  if (source[0] === source[0]?.toUpperCase()) {
    return translated[0].toUpperCase() + translated.slice(1);
  }
  return translated;
}

/**
 * Single-pass replacement.
 *
 * The original looped over every key running a global replace per key, which let
 * output be translated a second time: "and" -> "at" on the `and` pass, then the
 * shorter `at` key rewrote that same "at" -> "sa", so "budget and infrastructure"
 * came out as "badyet sa imprastraktura". Matching every key in one alternation
 * and replacing once means each source token is translated exactly once.
 */
function translateString(text: string, dict: Record<string, string>): string {
  if (!text) return text;
  return text.replace(patternFor(dict), (match) => {
    const hit = dict[match.toLowerCase()];
    return hit ? matchCase(match, hit) : match;
  });
}

export type TranslationDirection = 'en-tl' | 'tl-en';

export function translate(text: string, direction: TranslationDirection = 'en-tl'): string {
  return translateString(text, direction === 'tl-en' ? TL_EN : EN_TL);
}

export function translateSegments<T extends { text: string }>(
  segments: T[],
  direction: TranslationDirection = 'en-tl',
): T[] {
  return segments.map((s) => ({ ...s, text: translate(s.text, direction) }));
}
