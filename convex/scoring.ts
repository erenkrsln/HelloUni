/**
 * Scoring module for feed ranking algorithm
 * Combines engagement, recency, and personalization into a single score
 */

export interface ScoringFactors {
  likesCount: number;
  commentsCount: number;
  participantsCount: number;
  createdAt: number;
  isFromFollowedUser?: boolean;
  matchesUserInterests?: boolean;
  matchesUserMajor?: boolean;
  isEvent?: boolean;
  eventDate?: number;
}

/**
 * Calculate time decay factor using exponential decay
 * Posts decay exponentially over time - older posts need more engagement to stay visible
 * Decay rate: 0.1 (post halves in value every ~7 hours)
 */
function calculateTimeDecay(createdAt: number, currentTime: number): number {
  const hoursSincePost = Math.max(0, (currentTime - createdAt) / (1000 * 60 * 60));
  // e^(-0.05 * hours) - posts decay gradually over time (halves in value in ~14 hours)
  return Math.exp(-0.05 * hoursSincePost);
}

/**
 * Calculate engagement score from likes, comments, and participants
 * Weights: comments worth 2x likes (higher effort), participants 1.5x likes
 */
function calculateEngagementScore(
  likesCount: number,
  commentsCount: number,
  participantsCount: number
): number {
  return (likesCount * 1.0) + (commentsCount * 2.0) + (participantsCount * 1.5);
}

/**
 * Calculate personalization boost based on user relationships and interests
 * Returns a multiplier (base 1.0 = no boost)
 */
function calculatePersonalizationBoost(
  isFromFollowedUser: boolean = false,
  matchesUserInterests: boolean = false,
  matchesUserMajor: boolean = false
): number {
  let boost = 1.0;

  if (isFromFollowedUser) {
    boost *= 1.5; // 50% boost for followed users
  }
  if (matchesUserMajor) {
    boost *= 1.3; // 30% boost for same major
  }
  if (matchesUserInterests) {
    boost *= 1.2; // 20% boost for matching interests
  }

  return boost;
}

/**
 * Calculate event date priority bonus
 * Upcoming events get higher scores, past events get deprioritized
 */
function calculateEventBonus(isEvent: boolean, eventDate?: number): number {
  if (!isEvent || !eventDate) return 1.0;

  const now = Date.now();
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);

  // Past events (negative hours): score = 0.1
  if (hoursUntilEvent < 0) {
    return 0.1;
  }

  // Upcoming events: boost multiplier based on proximity
  // Events within 7 days get maximum boost, then decay
  const daysUntilEvent = hoursUntilEvent / 24;
  if (daysUntilEvent <= 7) {
    return 1.0 + (7 - daysUntilEvent) * 0.2; // Max 2.4x boost for imminent events
  }

  // Events 7+ days away: smaller boost
  return Math.exp(-0.05 * daysUntilEvent);
}

/**
 * Main ranking score calculation
 * Combines: (engagement × time_decay) × personalization_boost × event_bonus
 *
 * Score represents post relevance - higher = should appear higher in feed
 * Zero or negative engagement = zero score (prevents negative rankings)
 */
export function calculateRankingScore(factors: ScoringFactors): number {
  const currentTime = Date.now();

  // Safe fallbacks for missing/NaN values
  const likes = Number.isFinite(factors.likesCount) ? factors.likesCount : 0;
  const comments = Number.isFinite(factors.commentsCount) ? factors.commentsCount : 0;
  const participants = Number.isFinite(factors.participantsCount) ? factors.participantsCount : 0;
  const createdAt = Number.isFinite(factors.createdAt) ? factors.createdAt : currentTime;
  const isFromFollowedUser = !!factors.isFromFollowedUser;
  const matchesUserInterests = !!factors.matchesUserInterests;
  const matchesUserMajor = !!factors.matchesUserMajor;
  const isEvent = !!factors.isEvent;
  const eventDate = factors.eventDate;

  // Base engagement score
  const engagementScore = calculateEngagementScore(likes, comments, participants);

  // Use a baseline engagement score of at least 1.0 so personalization boosts & event bonuses
  // are still fully active even for posts with zero engagement.
  const baselineScore = engagementScore + 1.0;

  // Time decay: older posts need more engagement to compete
  const timeDecay = calculateTimeDecay(createdAt, currentTime);

  // Personalization: boost for user's network and interests
  const personalizationBoost = calculatePersonalizationBoost(
    isFromFollowedUser,
    matchesUserInterests,
    matchesUserMajor
  );

  // Event bonus: prioritize upcoming events
  const eventBonus = calculateEventBonus(isEvent, eventDate);

  // Final score: baselineScore × recency × personalization × event_bonus
  const score = (baselineScore * timeDecay) * personalizationBoost * eventBonus;

  // Prevent NaN and ensure non-negative
  return Number.isFinite(score) ? Math.max(0, score) : 0;
}

/**
 * Alternative: Calculate "trending" score for posts with recent engagement
 * Focuses on engagement velocity (likes/comments in last 24 hours)
 * Not used in main ranking, but useful for "Trending" section
 */
export function calculateTrendingScore(
  recentLikesCount: number,
  recentCommentsCount: number,
  recentParticipantsCount: number,
  totalEngagementScore: number
): number {
  // Recent engagement is weighted more heavily
  const recentEngagementScore =
    (recentLikesCount * 2.0) + (recentCommentsCount * 4.0) + (recentParticipantsCount * 3.0);

  // Trending score: recent engagement with minimum engagement requirement
  // Prevents spam/bots from gaming the system
  if (totalEngagementScore < 3) return 0; // Need at least 3 engagement points

  return recentEngagementScore / Math.sqrt(Math.max(1, totalEngagementScore));
}
