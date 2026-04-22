import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ComingSoonPage() {
    return (
        <div className="min-h-[calc(100vh-4rem)] w-full flex items-center justify-center px-4 py-10">
            <Card className="w-full max-w-xl">
                <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                        <CardTitle className="text-2xl">License Swap - Coming Soon</CardTitle>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">In Development</Badge>
                    </div>
                    <CardDescription>
                        Designed to provide flexibility following the license reduction effort
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm text-muted-foreground">
                        <p>
                            After the reduction phase is complete:
                        </p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>30-day <strong>unrestricted</strong> swap window for cost center leaders</li>
                            <li>Swaps stay within your allocated totals and license-type mix</li>
                            <li>No changes to Analyst vs. Consumer allocation</li>
                            <li>Post-window swaps continue with structured constraints</li>
                        </ul>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <Button asChild>
                            <a href="/">Back to Home</a>
                        </Button>
                        <Button variant="outline" asChild>
                            <a href="/license-reduction">Back to License Data</a>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
