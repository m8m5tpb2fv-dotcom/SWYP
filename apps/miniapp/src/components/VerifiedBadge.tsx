import { BadgeCheck } from "lucide-react";

// One shared badge for every spot a person's name/nickname is shown — kept
// as its own tiny component so the checkmark's look stays identical
// everywhere (VideoCard, ProfileScreen, CommentsSheet, SearchScreen)
// instead of each place styling its own icon slightly differently.
export default function VerifiedBadge({ size = 14 }: { size?: number }) {
  return <BadgeCheck size={size} strokeWidth={2.5} className="inline-block shrink-0 align-middle text-[#2AABEE]" />;
}
