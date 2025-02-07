import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Loader2, Truck } from "lucide-react"
import { ordersService } from "@/lib/services/orders"
import { toast } from "@/components/ui/use-toast"
import type { TransportQuote } from "@/types/orders"
import { transportService } from "@/lib/services/transport"

interface TransportQuotesProps {
  orderId: string
}

export function TransportQuotes({ orderId }: TransportQuotesProps) {
  const [quotes, setQuotes] = React.useState<TransportQuote[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAccepting, setIsAccepting] = React.useState(false)

  React.useEffect(() => {
    const loadQuotes = async () => {
      try {
        const data = await transportService.getQuotes(orderId)
        setQuotes(data)
      } catch (error) {
        console.error("Failed to load transport quotes:", error)
        toast({
          title: "Error",
          description: "Failed to load transport quotes",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadQuotes()
  }, [orderId])

  const handleAcceptQuote = async (quoteId: string) => {
    setIsAccepting(true)
    try {
      await ordersService.acceptTransportQuote(orderId, quoteId)
      toast({
        title: "Success",
        description: "Transport quote accepted successfully",
      })
      // Refresh the page or update the order state
      window.location.reload()
    } catch (error) {
      console.error("Failed to accept quote:", error)
      toast({
        title: "Error",
        description: "Failed to accept transport quote",
        variant: "destructive",
      })
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (quotes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Truck className="h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No transport quotes available</p>
        <p className="text-sm text-muted-foreground">
          Try refreshing the page or contact support
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {quotes.map((quote) => (
        <Card
          key={quote.id}
          className={`relative overflow-hidden transition-colors`}
        >
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{quote.carrier}</h3>
                  <Badge variant="secondary">{quote.services.join(', ')}</Badge>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(quote.price)}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Time</span>
                  <span>{quote.estimatedDays} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span>{quote.distance}km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Insurance</span>
                  <span>
                    {quote.insurance?.included ? (
                      'Included'
                    ) : quote.insurance?.cost ? (
                      `+${formatCurrency(quote.insurance.cost)}`
                    ) : (
                      'Not available'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valid Until</span>
                  <span>{formatDate(quote.validUntil)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handleAcceptQuote(quote.id)}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  'Accept Quote'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
} 