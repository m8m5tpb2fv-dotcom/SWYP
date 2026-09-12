// A custom in-app nickname (set during registration or in Edit Profile)
// takes priority over the Telegram-synced username/firstName everywhere a
// person's name is shown — same fallback order used consistently across
// Feed/VideoCard/ProfileScreen/CommentsSheet/SearchScreen.
export function displayName(
  person: { nickname?: string | null; username?: string | null; firstName?: string | null },
  fallback = "Пользователь",
): string {
  return person.nickname ?? person.username ?? person.firstName ?? fallback;
}

export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(n % 1000 >= 100 ? 1 : 0)}K`;
  return `${(n / 1_000_000).toFixed(n % 1_000_000 >= 100_000 ? 1 : 0)}M`;
}
