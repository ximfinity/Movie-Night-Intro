export interface SlideThemeDef {
  id: string
  label: string
  background: string
  textColor: string
  titleFrom: string
  titleTo: string
}

/** Sentinel theme id meaning "pick one of the real themes below at random each time
 * this slide is shown" — a real theme id is picked once per display, the same way a
 * random body-text option is picked. */
export const RANDOM_THEME = 'random'

export const SLIDE_THEMES: SlideThemeDef[] = [
  {
    id: 'midnight',
    label: 'Midnight',
    background: 'radial-gradient(ellipse at 50% 30%, #1c2450 0%, #0a0e24 70%)',
    textColor: '#f5f6fa',
    titleFrom: '#ffe6ad',
    titleTo: '#f2b84b'
  },
  {
    id: 'sunset',
    label: 'Sunset',
    background: 'linear-gradient(150deg, #ff8a3d 0%, #ff3d77 45%, #6d28d9 100%)',
    textColor: '#fff8f0',
    titleFrom: '#fff8f0',
    titleTo: '#ffd9a0'
  },
  {
    id: 'popcorn',
    label: 'Popcorn',
    background: 'radial-gradient(ellipse at 50% 20%, #8f1420 0%, #3d0509 75%)',
    textColor: '#fff3d6',
    titleFrom: '#fff3d6',
    titleTo: '#ffd76a'
  },
  {
    id: 'classic',
    label: 'Classic',
    background: '#050505',
    textColor: '#ffffff',
    titleFrom: '#ffffff',
    titleTo: '#c9c9c9'
  },
  {
    id: 'ocean',
    label: 'Ocean',
    background: 'radial-gradient(ellipse at 50% 25%, #0b3d55 0%, #021b26 75%)',
    textColor: '#e6faff',
    titleFrom: '#8fe9ff',
    titleTo: '#3fc9f0'
  },
  {
    id: 'forest',
    label: 'Forest',
    background: 'radial-gradient(ellipse at 50% 25%, #0f3d1e 0%, #061a0d 75%)',
    textColor: '#eaffe9',
    titleFrom: '#b6ff9c',
    titleTo: '#5ed64a'
  },
  {
    id: 'lavender',
    label: 'Lavender',
    background: 'linear-gradient(150deg, #7c6fd6 0%, #b28ce0 50%, #f3c9e6 100%)',
    textColor: '#2a1e4d',
    titleFrom: '#3a2a5e',
    titleTo: '#6d4fa0'
  },
  {
    id: 'cherry',
    label: 'Cherry',
    background: 'radial-gradient(ellipse at 50% 25%, #6e0f28 0%, #250308 75%)',
    textColor: '#ffe6ec',
    titleFrom: '#ff9db3',
    titleTo: '#ff5c7a'
  },
  {
    id: 'gold-rush',
    label: 'Gold Rush',
    background: 'radial-gradient(ellipse at 50% 25%, #2a2405 0%, #0a0800 75%)',
    textColor: '#fff4d6',
    titleFrom: '#ffe08a',
    titleTo: '#d4a017'
  },
  {
    id: 'neon',
    label: 'Neon',
    background: 'radial-gradient(ellipse at 50% 25%, #1a0533 0%, #050014 75%)',
    textColor: '#f4e9ff',
    titleFrom: '#ff4fd8',
    titleTo: '#4fe1ff'
  },
  {
    id: 'arctic',
    label: 'Arctic',
    background: 'linear-gradient(150deg, #dff4ff 0%, #a9d9f0 50%, #6fa8c9 100%)',
    textColor: '#0b2e40',
    titleFrom: '#0b2e40',
    titleTo: '#1c6087'
  },
  {
    id: 'ember',
    label: 'Ember',
    background: 'radial-gradient(ellipse at 50% 25%, #5c1a06 0%, #1a0602 75%)',
    textColor: '#ffe9d6',
    titleFrom: '#ffb066',
    titleTo: '#ff5a1f'
  },
  {
    id: 'royal',
    label: 'Royal',
    background: 'radial-gradient(ellipse at 50% 25%, #2e0f4d 0%, #0d0319 75%)',
    textColor: '#f3e9ff',
    titleFrom: '#e6c667',
    titleTo: '#b88a2e'
  },
  {
    id: 'mint',
    label: 'Mint',
    background: 'radial-gradient(ellipse at 50% 25%, #063d33 0%, #011a15 75%)',
    textColor: '#e6fff7',
    titleFrom: '#8affd6',
    titleTo: '#2fe0a8'
  },
  {
    id: 'rose-gold',
    label: 'Rose Gold',
    background: 'radial-gradient(ellipse at 50% 25%, #4d1f2b 0%, #1a0a0e 75%)',
    textColor: '#ffe9ee',
    titleFrom: '#ffc9d6',
    titleTo: '#e8a2ad'
  },
  {
    id: 'cosmic',
    label: 'Cosmic',
    background: 'radial-gradient(ellipse at 50% 20%, #241a4d 0%, #06041a 75%)',
    textColor: '#e9e6ff',
    titleFrom: '#c9a8ff',
    titleTo: '#7a5cff'
  },
  {
    id: 'autumn',
    label: 'Autumn',
    background: 'linear-gradient(150deg, #b5651d 0%, #8a3d0f 50%, #3d1a05 100%)',
    textColor: '#fff2e0',
    titleFrom: '#ffcf8a',
    titleTo: '#ff9d3d'
  },
  {
    id: 'blush',
    label: 'Blush',
    background: 'radial-gradient(ellipse at 50% 25%, #4d1f3d 0%, #1a0a15 75%)',
    textColor: '#ffe6f5',
    titleFrom: '#ff9dd6',
    titleTo: '#e05ca8'
  },
  {
    id: 'steel',
    label: 'Steel',
    background: 'radial-gradient(ellipse at 50% 25%, #2b3440 0%, #0d1116 75%)',
    textColor: '#e6edf5',
    titleFrom: '#a8c0d6',
    titleTo: '#5c7a99'
  },
  {
    id: 'tropical',
    label: 'Tropical',
    background: 'linear-gradient(150deg, #00b3a4 0%, #00d98a 50%, #ffd23f 100%)',
    textColor: '#04211c',
    titleFrom: '#04211c',
    titleTo: '#0d5c4d'
  }
]

export function findSlideTheme(id: string): SlideThemeDef {
  return SLIDE_THEMES.find((t) => t.id === id) ?? SLIDE_THEMES[0]
}

export function pickRandomSlideTheme(): SlideThemeDef {
  return SLIDE_THEMES[Math.floor(Math.random() * SLIDE_THEMES.length)]
}
