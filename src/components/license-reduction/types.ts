export type Team = "ETCH" | "PHOTO" | "CMP" | "METRO"

export type Row = {
  user: string
  currentLicense: "Analyst" | "Business Author" | "Consumer"
  lastActive: string
  recommendedAction: string
  estSavingsUsd: number
}
