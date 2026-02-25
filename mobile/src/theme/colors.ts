export type Palette = {
  background: string;
  card: string;
  cardSoft: string;
  text: string;
  muted: string;
  line: string;
  accent: string;
  accentText: string;
  danger: string;
};

export const darkPalette: Palette = {
  background: '#0b0d10',
  card: '#151a20',
  cardSoft: '#1d242d',
  text: '#f3f5f7',
  muted: '#9ba3ac',
  line: '#2a3340',
  accent: '#c4ff1a',
  accentText: '#11130f',
  danger: '#d64045',
};

export const lightPalette: Palette = {
  background: '#f4f6f8',
  card: '#ffffff',
  cardSoft: '#f0f3f6',
  text: '#13171c',
  muted: '#5c6773',
  line: '#d4dbe3',
  accent: '#9ac900',
  accentText: '#0f1a00',
  danger: '#b62127',
};
