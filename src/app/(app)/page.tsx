import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Page() {
  return (
    <div className="max-w-5xl">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to Spotfire License Hub</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Use the menu to navigate dashboards and tools. Start with license reduction data.
          </p>

          <Button asChild>
            <Link href="/license-reduction">Go to License reduction</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
