import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchInput } from "@/components/ui/search-input"
import { 
  Book,
  HelpCircle,
  MessageCircle,
  Phone,
  Mail,
  FileText,
  Video,
  Lightbulb
} from "lucide-react"

const helpCategories = [
  {
    icon: Book,
    title: "Getting Started",
    description: "Learn the basics of using our platform",
    articles: [
      "Platform Overview",
      "Account Setup",
      "First Steps Guide"
    ]
  },
  {
    icon: FileText,
    title: "User Guides",
    description: "Detailed guides for all features",
    articles: [
      "Dashboard Navigation",
      "Managing Products",
      "Order Processing"
    ]
  },
  {
    icon: Video,
    title: "Video Tutorials",
    description: "Watch step-by-step tutorials",
    articles: [
      "Quick Start Tutorial",
      "Advanced Features",
      "Tips & Tricks"
    ]
  },
  {
    icon: Lightbulb,
    title: "FAQs",
    description: "Common questions and answers",
    articles: [
      "Account FAQs",
      "Billing FAQs",
      "Feature FAQs"
    ]
  }
]

const supportChannels = [
  {
    icon: MessageCircle,
    title: "Live Chat",
    description: "Chat with our support team",
    availability: "24/7"
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Call us for immediate help",
    availability: "Mon-Fri, 9am-5pm"
  },
  {
    icon: Mail,
    title: "Email Support",
    description: "Send us your questions",
    availability: "Response within 24h"
  }
]

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Help Center</h2>
      </div>

      <div className="flex flex-col items-center space-y-4 text-center">
        <HelpCircle className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-semibold tracking-tight">How can we help?</h1>
        <p className="text-muted-foreground">
          Search our knowledge base or browse categories below
        </p>
        <SearchInput 
          placeholder="Search help articles..." 
          className="max-w-[500px]"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {helpCategories.map((category, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className="h-5 w-5" />
                {category.title}
              </CardTitle>
              <CardDescription>{category.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {category.articles.map((article, articleIndex) => (
                  <li key={articleIndex}>
                    <a
                      href="#"
                      className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                    >
                      {article}
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contact Support</CardTitle>
          <CardDescription>Get in touch with our support team</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {supportChannels.map((channel, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="rounded-lg bg-muted p-2">
                  <channel.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{channel.title}</h3>
                  <p className="text-sm text-muted-foreground">{channel.description}</p>
                  <p className="text-sm font-medium">{channel.availability}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 