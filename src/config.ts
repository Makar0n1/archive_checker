export interface ArchiveConfig {
  limit: number;
  timeoutMs: number;
  userAgent: string;

  noArchiveMode: 'hard_fail' | 'flag';

  // regex, применяются с флагом i к декодированному URL
  hardSpamPatterns: string[];
  hardSpamMinUrls: number;

  softPatterns: string[];
  softExcludePatterns: string[];
  softSpamMode: 'hard_fail' | 'flag';
  // отказ по SOFT, только если выполнены оба порога
  softSpamHardMinUrls: number;
  softSpamHardMinShare: number;

  // лет подряд без снапшотов
  gapYearsFlag: number;
  gapMode: 'hard_fail' | 'flag';

  // парковка: было >= MinHistoryPaths страниц в год, за последние RecentYears лет <= MaxRecentPaths
  parkedRecentYears: number;
  parkedMinHistoryPaths: number;
  parkedMaxRecentPaths: number;
}

export const DEFAULT_CONFIG: ArchiveConfig = {
  limit: 3000,
  timeoutMs: 30_000,
  userAgent: 'archive-checker/1.0 (archive history check)',

  noArchiveMode: 'hard_fail',

  hardSpamPatterns: [
    '\\bviagra',
    '\\bcialis',
    '\\blevitra',
    'tadalafil',
    'sildenafil',
    '\\btramadol',
    '\\bxanax',
    '\\bambien\\b',
    'phentermine',
    '\\bmodafinil',
    'porn',
    '\\bxxx\\b',
    'sex(cam|chat|video|tube|movie|film)',
    '\\bescorts\\b',
    'escorts?-(girls?|service|agency)',
    'hentai',
    '\\bmilfs?\\b',
    '\\bnude-?(girls|pics|photos|cams)',
    'replica-?(watch|rolex|handbag|bag|shoes|sunglass)',
    '(louis-?vuitton|gucci|prada|hermes|chanel)-?(outlet|replica|cheap|sale)',
    '[\\u4e00-\\u9fff\\u3040-\\u30ff]', // иероглифы - дорвеи
    '(ugg|jordan|nike-?air)-?(boots|shoes|max)?-?(cheap|sale|outlet)',
    'cheap-(ugg|jordan|nike|oakley|ray-?ban)',
    'payday-?loans?',
  ],
  hardSpamMinUrls: 2,

  softPatterns: [
    'casino',
    '\\bslots?\\b',
    '\\bpoker\\b',
    '\\bbet(ting|way|365|fair|win|winner)?\\b',
    'gambling',
    'roulette',
    'blackjack',
    'jackpot',
    '\\bpin-?up\\b',
    '1xbet',
    'mostbet',
    'vulkan',
    'вулкан',
    'azino',
    'joycasino',
    'melbet',
    'parimatch',
    '\\bleon-?bets?\\b',
    'bookmaker',
    'sportsbook',
    '\\bcrypto',
    '\\bforex\\b',
    'binary-?options?',
    '\\bseo\\b',
    'backlinks?',
    '\\bessays?\\b',
    '\\bdiploma\\b',
  ],
  softExcludePatterns: ['/(job|jobs|career|careers|vacanc|hiring|recruit|employment)', 'hotel', 'resort', 'wikipedia', '/news/'],
  softSpamMode: 'hard_fail',
  softSpamHardMinUrls: 5,
  softSpamHardMinShare: 0.03,

  gapYearsFlag: 3,
  gapMode: 'flag',

  parkedRecentYears: 2,
  parkedMinHistoryPaths: 10,
  parkedMaxRecentPaths: 2,
};
