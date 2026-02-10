export function getApiBase(): string {
  // If you set NEXT_PUBLIC_API_BASE_URL locally, use it
  const env = process.env.NEXT_PUBLIC_API_BASE_URL
  if (env && env.trim()) return env.trim().replace(/\/$/, "")

  // Default to the prod gateway path (works in prod without platform changes)
  return "/cloudappbackend/atlassian-api"
}
