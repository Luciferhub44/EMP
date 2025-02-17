import { useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { formatCurrency } from "@/lib/utils"
import { Copy, QrCode, Upload, Check, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "@/components/ui/use-toast"
import { paymentMethods } from "@/lib/constants/payment-methods"

export default function PaymentPage() {
  const { fulfillmentId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [selectedMethod, setSelectedMethod] = useState("bank-wire")
  const [selectedCrypto, setSelectedCrypto] = useState(0)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmationNote, setConfirmationNote] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // In a real app, fetch fulfillment and quote details
  const amount = 15000 // This would come from the quote

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    alert("Copied to clipboard!")
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleConfirmPayment = async () => {
    if (!selectedFile || !user) return
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('receipt', selectedFile)
      formData.append('note', confirmationNote)
      formData.append('fulfillmentId', fulfillmentId!)
      formData.append('paymentMethod', selectedMethod)
      formData.append('userId', user.id)

      const response = await fetch('/api/payments/confirm', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: formData
      })

      if (!response.ok) throw new Error('Failed to confirm payment')

      toast({
        title: "Success",
        description: "Payment confirmation submitted successfully",
      })
      navigate(`/fulfillment/${fulfillmentId}`)
    } catch (error) {
      console.error('Failed to confirm payment:', error)
      toast({
        title: "Error",
        description: "Failed to submit payment confirmation",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setIsConfirmDialogOpen(false)
    }
  }

  const selectedPaymentMethod = paymentMethods.find(m => m.id === selectedMethod)

  const renderPaymentDetails = () => {
    if (!selectedPaymentMethod) return null

    if (selectedMethod === "crypto") {
      const network = selectedPaymentMethod.details?.networks?.[selectedCrypto]
      if (!network) return null
      return (
        <div className="space-y-4">
          <div className="flex gap-4">
            {selectedPaymentMethod.details?.networks?.map((n, index) => (
              <Button
                key={n.name}
                variant={selectedCrypto === index ? "default" : "outline"}
                onClick={() => setSelectedCrypto(index)}
              >
                {n.name}
              </Button>
            ))}
          </div>
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <Label>Address</Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleCopy(network.address)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm font-mono break-all">{network.address}</p>
          </div>
          {network.qrCode && (
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QrCode className="h-48 w-48" />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {Object.entries(selectedPaymentMethod.details).map(([key, value]) => (
          <div key={key} className="space-y-1.5">
            <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className="text-sm font-mono">{value}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => handleCopy(value as string)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Payment Information
          </h2>
          <p className="text-muted-foreground">
            Fulfillment ID: {fulfillmentId}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Check className="mr-2 h-4 w-4" />
                Confirm Payment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Payment</DialogTitle>
                <DialogDescription>
                  Please provide payment confirmation details and upload your receipt.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Payment Note</Label>
                  <Textarea
                    placeholder="Add any relevant payment details or transaction reference..."
                    value={confirmationNote}
                    onChange={(e) => setConfirmationNote(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Upload Receipt</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {selectedFile ? selectedFile.name : "Select Receipt File"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Supported formats: Images, PDF, DOC, DOCX, XLS, XLSX
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmPayment}
                  disabled={!selectedFile || isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Confirmation'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={() => navigate("/fulfillment")}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payment Method</CardTitle>
            <CardDescription>Select your preferred payment method</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors
                  ${selectedMethod === method.id ? 'border-primary bg-primary/5' : 'hover:bg-muted'}
                `}
                onClick={() => setSelectedMethod(method.id)}
              >
                <method.icon className="h-5 w-5" />
                <div>
                  <h3 className="font-medium">{method.name}</h3>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Details</CardTitle>
            <CardDescription>
              Amount to pay: {formatCurrency(amount)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {renderPaymentDetails()}
            <div className="mt-6 text-sm text-muted-foreground">
              <p>Please make sure to:</p>
              <ul className="list-disc list-inside mt-2">
                <li>Include the Fulfillment ID as payment reference</li>
                <li>Send the exact amount shown above</li>
                <li>Use the correct payment details for your selected method</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 