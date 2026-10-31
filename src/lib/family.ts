import { supabase } from './supabase'

export interface MemberSummary {
  user_id: string
  display_name: string
  week_cards: number
  today_cards: number
  known_cards: number
  learning_cards: number
  last_practised: string | null
}

export interface Nudge {
  id: string
  from_user: string
  to_user: string
  deck_id: string
  card_id: string
  message: string | null
  created_at: string
  seen_at: string | null
}

export async function familySummary(): Promise<MemberSummary[]> {
  const { data, error } = await supabase.rpc('family_summary')
  if (error) throw error
  return (data ?? []) as MemberSummary[]
}

export async function myNudges(userId: string): Promise<Nudge[]> {
  const { data } = await supabase
    .from('nudges')
    .select('*')
    .eq('to_user', userId)
    .is('seen_at', null)
    .order('created_at', { ascending: false })
    .limit(10)
  return (data ?? []) as Nudge[]
}

export async function sendNudge(n: { familyId: string; from: string; to: string; deckId: string; cardId: string; message?: string }) {
  const { error } = await supabase.from('nudges').insert({
    family_id: n.familyId,
    from_user: n.from,
    to_user: n.to,
    deck_id: n.deckId,
    card_id: n.cardId,
    message: n.message?.trim() || null,
  })
  if (error) throw new Error(error.message)
}

export async function markNudgeSeen(id: string) {
  await supabase.from('nudges').update({ seen_at: new Date().toISOString() }).eq('id', id)
}

export function timeAgo(iso: string | null): string {
  if (!iso) return 'not yet'
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
