// Built-in theme nights: ready-to-run slide groups with silly lines already written, used
// by the New Show wizard and the template picker. Pure data + builders (no I/O).
import type {
  AiPromptSettings,
  SlideAiKind,
  SlideBodyStyle,
  SlideFrame,
  SlideshowItem,
  TextAnimation
} from './types'
import { createSlideFrame, createSlideshowItem } from './factory'

export type ThemeNightId = 'classic' | 'halloween' | 'christmas' | 'kids' | 'birthday' | 'pta'

export type SectionId =
  | 'welcome'
  | 'houseRules'
  | 'snacks'
  | 'concessions'
  | 'sponsors'
  | 'fundraiser'
  | 'events'
  | 'feature'

/** What the wizard asks for; everything is optional and has a sensible fallback. */
export interface ShowDetails {
  movieTitle: string
  /** Birthday night: whose birthday it is. */
  guestOfHonor: string
  /** PTA night: the school or group putting it on. */
  orgName: string
  /** PTA night: "Popcorn | $2" lines for the price list. */
  concessions: string[]
  sponsors: string[]
  /** "Book Fair | Oct 14" lines. */
  events: string[]
}

export const EMPTY_DETAILS: ShowDetails = {
  movieTitle: '',
  guestOfHonor: '',
  orgName: '',
  concessions: [],
  sponsors: [],
  events: []
}

export interface SectionInfo {
  id: SectionId
  label: string
  description: string
}

export const SECTIONS: Record<SectionId, SectionInfo> = {
  welcome: { id: 'welcome', label: 'Welcome', description: 'Opens the pre-show' },
  houseRules: {
    id: 'houseRules',
    label: 'House rules',
    description: 'Phones, spoilers, bathroom breaks…'
  },
  snacks: { id: 'snacks', label: 'Snacks', description: 'The snack bar is open!' },
  concessions: {
    id: 'concessions',
    label: 'Concessions & prices',
    description: 'A price list, and where the money goes'
  },
  sponsors: {
    id: 'sponsors',
    label: 'Sponsors & thank-yous',
    description: 'Sponsors, volunteers, the PTA'
  },
  fundraiser: {
    id: 'fundraiser',
    label: 'Fundraiser & raffle',
    description: 'Raffle, goal, and a QR code to donate'
  },
  events: {
    id: 'events',
    label: 'Upcoming events & safety',
    description: 'What’s next, plus exits and restrooms'
  },
  feature: {
    id: 'feature',
    label: "Tonight's feature",
    description: 'Now showing, fun facts (via AI), enjoy the show'
  }
}

export interface ThemeNight {
  id: ThemeNightId
  label: string
  emoji: string
  description: string
  /** Slide color themes, used in turn by the groups (see shared/slideThemes.ts). */
  palette: string[]
  animation: TextAnimation
  /** For the AI prompt. */
  tone: string
  event: string
  holdMessage: string
  endMessage: string
  sections: SectionId[]
  defaultSections: SectionId[]
}

export const THEME_NIGHTS: ThemeNight[] = [
  {
    id: 'classic',
    label: 'Classic Movie Night',
    emoji: '🍿',
    description: 'Popcorn, house rules and a feature presentation',
    palette: ['popcorn', 'midnight', 'gold-rush'],
    animation: 'fade-up',
    tone: 'silly and punny',
    event: 'Family movie night',
    holdMessage: 'The movie will be starting shortly',
    endMessage: 'Thanks for coming!',
    sections: ['welcome', 'houseRules', 'snacks', 'feature'],
    defaultSections: ['welcome', 'houseRules', 'snacks', 'feature']
  },
  {
    id: 'halloween',
    label: 'Halloween',
    emoji: '🎃',
    description: 'Spooky puns in orange and purple',
    palette: ['autumn', 'cosmic', 'ember'],
    animation: 'zoom-in',
    tone: 'spooky, punny and silly (still family-friendly)',
    event: 'Halloween movie night',
    holdMessage: 'The movie will be starting shortly… if you dare',
    endMessage: 'Thanks for coming! Sweet screams 👻',
    sections: ['welcome', 'houseRules', 'snacks', 'feature'],
    defaultSections: ['welcome', 'houseRules', 'snacks', 'feature']
  },
  {
    id: 'christmas',
    label: 'Christmas & holidays',
    emoji: '🎄',
    description: 'Cozy, festive lines in red, green and snow',
    palette: ['cherry', 'forest', 'arctic'],
    animation: 'fade-up',
    tone: 'cozy, festive and punny',
    event: 'Holiday movie night',
    holdMessage: 'The movie will be starting shortly. Get cozy!',
    endMessage: 'Thanks for coming! Happy holidays 🎄',
    sections: ['welcome', 'houseRules', 'snacks', 'feature'],
    defaultSections: ['welcome', 'houseRules', 'snacks', 'feature']
  },
  {
    id: 'kids',
    label: "Kids' night",
    emoji: '🧸',
    description: 'Bright colors and simple, kid-friendly jokes',
    palette: ['tropical', 'neon', 'sunset'],
    animation: 'zoom-in',
    tone: 'silly, simple and kid-friendly (ages 5–10)',
    event: "Kids' movie night",
    holdMessage: 'The movie is starting really, really soon!',
    endMessage: 'Thanks for coming! Sweet dreams 🌙',
    sections: ['welcome', 'houseRules', 'snacks', 'feature'],
    defaultSections: ['welcome', 'houseRules', 'snacks', 'feature']
  },
  {
    id: 'birthday',
    label: 'Birthday party',
    emoji: '🎂',
    description: 'A birthday shout-out and party snacks',
    palette: ['blush', 'rose-gold', 'neon'],
    animation: 'zoom-in',
    tone: 'celebratory, silly and punny',
    event: 'Birthday party movie night',
    holdMessage: 'The movie will be starting shortly',
    endMessage: 'Thanks for celebrating with us! 🎉',
    sections: ['welcome', 'houseRules', 'snacks', 'feature'],
    defaultSections: ['welcome', 'houseRules', 'snacks', 'feature']
  },
  {
    id: 'pta',
    label: 'PTA / school movie night',
    emoji: '🏫',
    description: 'Sponsors, concessions, fundraiser and safety',
    palette: ['royal', 'ocean', 'gold-rush'],
    animation: 'fade-up',
    tone: 'friendly, family-friendly and a little punny',
    event: 'School PTA family movie night',
    holdMessage: 'The movie will be starting shortly',
    endMessage: 'Thanks for supporting our school!',
    sections: [
      'welcome',
      'houseRules',
      'concessions',
      'sponsors',
      'fundraiser',
      'events',
      'feature'
    ],
    defaultSections: [
      'welcome',
      'houseRules',
      'concessions',
      'sponsors',
      'fundraiser',
      'events',
      'feature'
    ]
  }
]

export function findThemeNight(id: string): ThemeNight {
  return THEME_NIGHTS.find((t) => t.id === id) ?? THEME_NIGHTS[0]
}

export const DEFAULT_CONCESSIONS = [
  'Popcorn | $2',
  'Candy | $1',
  'Pizza slice | $3',
  'Water | $1',
  'Juice box | $1'
]
export const DEFAULT_EVENTS = [
  'Book Fair | Oct 14',
  'Fall Festival | Oct 28',
  'Next Movie Night | TBA'
]

// ---------------------------------------------------------------------------------------
// Slide text. "{movie}", "{name}" and "{org}" are filled in from the wizard's details.

interface SlideSpec {
  title: string
  lines: string[]
  style?: SlideBodyStyle
  ai?: SlideAiKind
  durationSec?: number
}

interface GroupSpec {
  name: string
  slides: SlideSpec[]
}

const PHONES_GENERIC: SlideSpec = {
  title: 'Silence Your Phones',
  lines: [
    'Your ringtone is not part of the soundtrack',
    "Airplane mode: the only flight we're taking tonight",
    'The only screen that matters is the big one',
    'Even the cat is on airplane mode',
    'The group chat can wait two hours',
    'Texting in the dark? We can see your face glowing'
  ]
}

const SPOILERS_GENERIC: SlideSpec = {
  title: 'No Spoilers',
  lines: [
    'Violators must watch the credits twice',
    "Yes, we know you've seen it before",
    'Zip it, lock it, pass the popcorn',
    'Spoil the movie, lose snack privileges',
    'What happens in the movie stays in the movie'
  ]
}

const BATHROOM_GENERIC: SlideSpec = {
  title: 'Bathroom Breaks',
  lines: [
    "Now is the time. You've been warned",
    'There is no pause button for the rest of us',
    'Speed-walking is encouraged',
    'Go now or hold it for two hours'
  ]
}

const HOUSE_RULES: Record<ThemeNightId, SlideSpec[]> = {
  classic: [
    PHONES_GENERIC,
    SPOILERS_GENERIC,
    BATHROOM_GENERIC,
    {
      title: 'Quiet, Please',
      lines: [
        'Whisper like a ninja',
        'The commentary track is off tonight',
        'Save your reviews for the credits',
        'Laughing and gasping are allowed'
      ]
    }
  ],
  halloween: [
    {
      title: 'Silence Your Phones',
      lines: [
        'The only ringing tonight should be the screams',
        'Airplane mode or broom mode, your choice',
        'Glowing phones attract zombies',
        'No calls from beyond the grave'
      ]
    },
    {
      title: 'No Spoilers',
      lines: [
        'Spoilers will be haunted for all eternity',
        'Spoil it and be cursed with soggy popcorn',
        'Keep your crypt shut',
        'Dead men tell no tales, and neither should you'
      ]
    },
    {
      title: 'Bathroom Breaks',
      lines: [
        "Go now. The monster won't wait for you",
        'Never split up. Except for bathroom breaks',
        'The bathroom is not haunted. Probably.',
        "Don't look behind the shower curtain"
      ]
    },
    {
      title: 'Scream Responsibly',
      lines: [
        'Shrieks allowed, just not into anyone’s ear',
        'Hide behind a pillow like a pro',
        'Brave faces optional',
        'Hand-holding is permitted in scary parts'
      ]
    }
  ],
  christmas: [
    {
      title: 'Silence Your Phones',
      lines: [
        'Only jingle bells may ring tonight',
        'Phones on silent night mode',
        "Santa can't reach you here anyway",
        'Unplug and get snug'
      ]
    },
    {
      title: 'No Spoilers',
      lines: [
        'Spoilers go straight to the naughty list',
        "Don't be a Grinch. Keep the plot a secret",
        'Coal for anyone who spoils it',
        'Keep it merry and mysterious'
      ]
    },
    {
      title: 'Bathroom Breaks',
      lines: [
        'Go now, before the cocoa kicks in',
        'Dash away, dash away, dash away all',
        'Hurry back. The movie waits for no elf'
      ]
    },
    {
      title: 'Share the Blankets',
      lines: [
        'Warm hearts, shared blankets',
        'Scoot over and make room for one more',
        'Cozy is mandatory'
      ]
    }
  ],
  kids: [
    {
      title: 'Grown-Up Phones Away',
      lines: [
        'Even grown-ups put their phones away',
        'Screens off, except the big one',
        'Beep boop. Phones go to sleep now'
      ]
    },
    {
      title: 'Inside Voices',
      lines: [
        'Whisper like a mouse',
        'Giggles are allowed, shouting is not',
        'Save the cheering for the ending'
      ]
    },
    {
      title: 'Potty Break Now!',
      lines: [
        "Go now so you don't miss the good part",
        'Wash those hands, superstar',
        "Hurry back, the movie's almost here"
      ]
    },
    {
      title: 'Stay in Your Spot',
      lines: [
        'Sit on your bottom, not on your friend',
        'Feet on the floor, not on the chairs',
        'Blankets up, bodies cozy'
      ]
    }
  ],
  birthday: [
    {
      title: 'Silence Your Phones',
      lines: [
        'Take the party pics now, then phones away',
        'Your ringtone is not invited',
        'Airplane mode: the only gift we’re asking for'
      ]
    },
    {
      title: 'No Spoilers',
      lines: [
        'Spoilers are not on the birthday wish list',
        'Spoil it and you sing Happy Birthday solo',
        'Keep the surprises for the presents'
      ]
    },
    BATHROOM_GENERIC
  ],
  pta: [
    {
      title: 'Please Silence Your Phones',
      lines: [
        'The only screen that matters is the big one',
        'Airplane mode: cleared for takeoff',
        'Your ringtone is not part of the soundtrack'
      ]
    },
    {
      title: 'Kids Stay With a Grown-Up',
      lines: [
        'Every young movie-goer needs a buddy',
        'Grown-ups: keep your crew close',
        'Lost? Find a volunteer in a PTA shirt'
      ]
    },
    {
      title: 'Please Stay Seated',
      lines: [
        'Keep the aisles clear for safety',
        'Walk, don’t run, when you need a break',
        'Blankets and chairs stay out of walkways'
      ]
    },
    SPOILERS_GENERIC
  ]
}

const SNACKS: Record<ThemeNightId, SlideSpec[]> = {
  classic: [
    {
      title: 'The Snack Bar Is Open',
      lines: [
        'Grab it before Uncle Dave does',
        'Butter is a food group tonight',
        "Calories don't count during movies",
        'The nachos have been legally cleared',
        'Popcorn: now 100% crunchier'
      ]
    },
    {
      title: 'Last Call for Popcorn',
      lines: [
        'Stock up before the lights go down',
        "The kernels won't pop themselves",
        'Get it now, crunch it later',
        'Final boarding call for snacks'
      ]
    }
  ],
  halloween: [
    {
      title: 'The Candy Cauldron Is Open',
      lines: [
        'Help yourself. The witch is on break',
        'Candy corn: eat at your own risk',
        'Treats for everyone, tricks for spoilers',
        'Fang-tastic snacks ahead'
      ]
    },
    {
      title: 'Monster Munchies',
      lines: [
        'Grab a bite before the vampires do',
        'Zombies want brains. We want popcorn',
        'Snack like a werewolf, chew like a human'
      ]
    }
  ],
  christmas: [
    {
      title: 'Cocoa & Cookies Are Served',
      lines: [
        'Marshmallows: take as many as you like',
        "Cookies are fair game (except Santa's)",
        'Candy canes count as a food group',
        'Snack like the elves are watching'
      ]
    },
    {
      title: 'Last Call for Treats',
      lines: [
        'Grab one more cookie. You deserve it',
        'Stock up before the magic starts',
        'The North Pole snack bar closes soon'
      ]
    }
  ],
  kids: [
    {
      title: 'Snack Time!',
      lines: [
        'Crunchy, munchy, yummy',
        "Please don't feed the popcorn to the dog",
        'Share with your neighbor',
        'One handful at a time, superstar'
      ]
    },
    {
      title: 'Juice Boxes Ready',
      lines: [
        'Squeeze gently, superhero',
        'The straw goes in the box, not your nose',
        "Sip, don't squirt"
      ]
    }
  ],
  birthday: [
    {
      title: 'Cake & Snacks Are Served',
      lines: [
        "Birthday calories don't count",
        'Frosting is a vegetable today',
        'One slice now, one slice "for later"',
        'Party snacks: grab them while they last'
      ]
    }
  ],
  pta: []
}

const WELCOME: Record<ThemeNightId, SlideSpec[]> = {
  classic: [
    {
      title: 'Welcome to Movie Night!',
      lines: [
        'Grab a seat, a snack and a blanket',
        'The best seats in the house are all of them',
        "Tonight's forecast: 100% chance of popcorn",
        'Get comfy. The show starts soon'
      ]
    }
  ],
  halloween: [
    {
      title: 'Welcome, Boils and Ghouls!',
      lines: [
        'Grab a seat before the ghosts take them all',
        'Costumes encouraged, screams mandatory',
        "Tonight's forecast: foggy with a chance of candy",
        "We've been dying to see you"
      ]
    }
  ],
  christmas: [
    {
      title: 'Welcome to Holiday Movie Night!',
      lines: [
        'Grab some cocoa and get cozy',
        'Ugly sweaters strongly encouraged',
        "Tonight's forecast: 100% chance of cheer",
        'You sleigh just by showing up'
      ]
    }
  ],
  kids: [
    {
      title: 'Welcome to Movie Night!',
      lines: [
        'Jammies on, snacks ready!',
        'Pillow forts are totally allowed',
        'Tonight you are all movie stars',
        'Get ready for the best night ever'
      ]
    }
  ],
  birthday: [
    {
      title: 'Happy Birthday, {name}!',
      lines: [
        'The birthday star gets the best seat',
        'Another trip around the sun, and a movie!',
        'Cake first, movie second, fun always',
        'Make a wish. This movie is it!'
      ]
    }
  ],
  pta: [
    {
      title: 'Welcome to {org} Movie Night!',
      lines: [
        'Thanks for supporting our school community',
        'Grab a spot, a snack and a friend',
        'Brought to you by amazing volunteers',
        'Movie magic, school spirit'
      ]
    }
  ]
}

function featureGroup(theme: ThemeNightId): SlideSpec[] {
  const nowShowing: Record<ThemeNightId, string[]> = {
    classic: [
      'Find your seat. {movie} is coming up',
      'Critics agree: this is the movie we are watching',
      'Rated M for Mandatory Snacks'
    ],
    halloween: [
      'Prepare to be spooked',
      'Lights out soon… if you dare',
      'The screaming starts shortly'
    ],
    christmas: [
      'Get cozy. {movie} starts soon',
      'Warm socks on, lights down',
      'A holiday treat in 3… 2… 1…'
    ],
    kids: ['Get your giggles ready!', 'It starts really, really soon', 'Snuggle up. Here we go!'],
    birthday: [
      'Picked by the birthday star',
      'The best present: two hours of {movie}',
      'Cake in one hand, popcorn in the other'
    ],
    pta: ['Find your seat. {movie} is coming up', 'Grab your snacks now', 'Thanks for being here!']
  }
  return [
    { title: 'Now Showing: {movie}', lines: nowShowing[theme] },
    { title: 'Fun Facts: {movie}', lines: [], ai: 'trivia', durationSec: 8 },
    {
      title: 'Please Enjoy the Show',
      lines: [
        'Sit back, relax and pass the popcorn',
        'The adventure starts in just a moment',
        'Phones down, eyes up'
      ]
    }
  ]
}

function groupSpec(section: SectionId, theme: ThemeNightId, d: ShowDetails): GroupSpec | null {
  switch (section) {
    case 'welcome':
      return { name: 'Welcome', slides: WELCOME[theme] }
    case 'houseRules':
      return { name: 'House Rules', slides: HOUSE_RULES[theme] }
    case 'snacks':
      return SNACKS[theme].length ? { name: 'Snacks', slides: SNACKS[theme] } : null
    case 'concessions':
      return {
        name: 'Concessions',
        slides: [
          {
            title: 'Concession Stand',
            lines: d.concessions.length ? d.concessions : DEFAULT_CONCESSIONS,
            style: 'list',
            durationSec: 10
          },
          {
            title: 'Every Snack Supports Our School',
            lines: [
              'Snack for a cause',
              'Crunch for the kids',
              'Your popcorn buys pencils (and more!)'
            ]
          }
        ]
      }
    case 'sponsors':
      return {
        name: 'Thank You',
        slides: [
          {
            title: 'Thank You to Our Sponsors',
            lines: d.sponsors.length ? d.sponsors : ['Your sponsor here'],
            style: 'list',
            durationSec: 10
          },
          {
            title: 'Thank You, Volunteers!',
            lines: [
              'Our volunteers make movie night happen',
              'Give a wave to someone in a PTA shirt',
              'Want to help next time? Ask us how!'
            ]
          },
          {
            title: 'Thanks to {org} PTA',
            lines: ['Supporting our students all year long', 'Join us at the next PTA meeting!']
          }
        ]
      }
    case 'fundraiser':
      return {
        name: 'Fundraiser',
        slides: [
          {
            title: 'Support Our Fundraiser',
            lines: [
              'Every dollar goes straight to our students',
              'Help us reach our goal tonight!',
              'Big or small, every gift counts'
            ]
          },
          {
            title: 'Raffle Drawing After the Movie',
            lines: [
              'Tickets on sale at the snack table',
              'Must be present to win',
              'Feeling lucky? Grab a few more tickets'
            ]
          }
        ]
      }
    case 'events':
      return {
        name: 'Coming Up',
        slides: [
          {
            title: 'Upcoming Events',
            lines: d.events.length ? d.events : DEFAULT_EVENTS,
            style: 'list',
            durationSec: 10
          },
          {
            title: 'Exits & Restrooms',
            lines: [
              'Exits are marked with lit signs',
              'Restrooms are down the hall',
              'In an emergency, follow a volunteer'
            ]
          }
        ]
      }
    case 'feature':
      return { name: "Tonight's Feature", slides: featureGroup(theme) }
  }
}

/** Fills {movie}, {name} and {org}, dropping a dangling ": " when the value is blank. */
export function fillPlaceholders(text: string, d: ShowDetails): string {
  const values: Record<string, string> = {
    movie: d.movieTitle.trim(),
    name: d.guestOfHonor.trim(),
    org: d.orgName.trim()
  }
  const fallbacks: Record<string, string> = {
    movie: 'the movie',
    name: 'Birthday Star',
    org: 'Our'
  }
  return text
    .replace(/:\s*\{movie\}$/, values.movie ? `: ${values.movie}` : '')
    .replace(/\{(movie|name|org)\}/g, (_m, key: string) => values[key] || fallbacks[key])
}

/** One built-in slide group, in the theme night's look. `paletteIndex` staggers colors
 * so neighboring groups differ. */
export function buildSection(
  section: SectionId,
  themeId: ThemeNightId,
  details: ShowDetails = EMPTY_DETAILS,
  paletteIndex = 0
): SlideshowItem | null {
  const theme = findThemeNight(themeId)
  const spec = groupSpec(section, themeId, details)
  if (!spec || spec.slides.length === 0) return null
  const style = {
    theme: theme.palette[paletteIndex % theme.palette.length],
    textAnimation: theme.animation,
    durationSec: 6
  }
  const frames: SlideFrame[] = spec.slides.map((s) => ({
    ...createSlideFrame('text', { ...style, durationSec: s.durationSec ?? 6 }),
    title: fillPlaceholders(s.title, details),
    subtitleOptions: s.lines.length ? s.lines.map((l) => fillPlaceholders(l, details)) : [''],
    bodyStyle: s.style ?? 'rotate',
    aiKind: s.ai ?? 'jokes'
  }))
  return { ...createSlideshowItem(), name: spec.name, frames }
}

export interface BuiltShow {
  items: SlideshowItem[]
  /** Which built group each section became (to wire up the hold/end screens). */
  bySection: Partial<Record<SectionId, SlideshowItem>>
  aiPrompt: AiPromptSettings
  holdMessage: string
  endMessage: string
}

/** A whole pre-show for a theme night: the chosen sections, in the theme's order. */
export function buildShow(
  themeId: ThemeNightId,
  sections: SectionId[],
  details: ShowDetails
): BuiltShow {
  const theme = findThemeNight(themeId)
  const items: SlideshowItem[] = []
  const bySection: BuiltShow['bySection'] = {}
  for (const section of theme.sections) {
    if (!sections.includes(section)) continue
    const item = buildSection(section, themeId, details, items.length)
    if (!item) continue
    items.push(item)
    bySection[section] = item
  }
  const movie = details.movieTitle.trim()
  const who =
    themeId === 'birthday' && details.guestOfHonor.trim()
      ? ` for ${details.guestOfHonor.trim()}`
      : themeId === 'pta' && details.orgName.trim()
        ? ` at ${details.orgName.trim()}`
        : ''
  return {
    items,
    bySection,
    aiPrompt: {
      event: `${theme.event}${who}.${movie ? ` Tonight's movie: ${movie}` : ''}`,
      tone: theme.tone,
      perTitle: 5
    },
    holdMessage: theme.holdMessage,
    endMessage: theme.endMessage
  }
}

/** Splits a textarea into trimmed, non-empty lines. */
export function toLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
}
