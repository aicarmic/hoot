/** Uyut color roles for avatars, ordered so the first few people look most different. */
export const AVATAR_TONES = ['primary-soft', 'tertiary-soft', 'secondary-soft', 'primary', 'tertiary', 'secondary'] as const

/**
 * Each family member keeps one color on every device: members are sorted by id, and the
 * position picks the tone, so nobody shares a color until there are more than six people.
 */
export function avatarTone(id: string, allIds: string[]): (typeof AVATAR_TONES)[number] {
  const i = [...new Set(allIds)].sort().indexOf(id)
  return AVATAR_TONES[Math.max(0, i) % AVATAR_TONES.length]
}
