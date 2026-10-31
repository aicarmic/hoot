/**
 * Every Material Symbols icon the app uses. index.html asks Google Fonts for
 * only these (icon_names=…), so a name missing here renders as plain text.
 * Keep the list sorted: Google Fonts requires it, and a test checks index.html.
 */
export const ICONS = [
  'add',
  'arrow_back',
  'check',
  'check_circle',
  'chevron_right',
  'close',
  'delete',
  'error',
  'expand_more',
  'group',
  'hearing',
  'lock',
  'logout',
  'mail',
  'menu_book',
  'mic',
  'nights_stay',
  'person',
  'person_add',
  'quiz',
  'radio_button_checked',
  'radio_button_unchecked',
  'record_voice_over',
  'replay',
  'send',
  'slow_motion_video',
  'style',
  'volume_up',
] as const

export type IconName = (typeof ICONS)[number]
