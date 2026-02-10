import type { Row, Team } from "./types"

export const DATA_BY_TEAM: Record<Team, Row[]> = {
  ETCH: [
    { user: "kkashmiry0641", currentLicense: "Analyst", lastActive: "2026-02-01", recommendedAction: "Downgrade to Business Author", estSavingsUsd: 1200 },
    { user: "icastillo2", currentLicense: "Business Author", lastActive: "2026-01-28", recommendedAction: "Keep", estSavingsUsd: 0 },
  ],
  PHOTO: [
    { user: "jdoe", currentLicense: "Analyst", lastActive: "2025-12-20", recommendedAction: "Downgrade to Consumer", estSavingsUsd: 1800 },
  ],
  CMP: [
    { user: "asmith", currentLicense: "Consumer", lastActive: "2026-01-15", recommendedAction: "Keep", estSavingsUsd: 0 },
  ],
  METRO: [
    { user: "bnguyen", currentLicense: "Analyst", lastActive: "2025-11-02", recommendedAction: "Review usage", estSavingsUsd: 600 },
  ],
}
