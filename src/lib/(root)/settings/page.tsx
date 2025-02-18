import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { useSettings } from "@/contexts/settings-context"
import { toast } from "@/components/ui/use-toast"
import { useNavigate } from "react-router-dom"

export default function SettingsPage() {
  const { settings, updateSettings, updateProfile, updatePassword, isLoading } = useSettings()
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const navigate = useNavigate()

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData(e.target as HTMLFormElement)
      await updateProfile({
        name: formData.get("name") as string,
        email: formData.get("email") as string,
        company: formData.get("company") as string,
      })
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match.",
        variant: "destructive",
      })
      return
    }
    try {
      await updatePassword(currentPassword, newPassword)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update password. Please check your current password.",
        variant: "destructive",
      })
    }
  }

  const handleNotificationToggle = async (key: keyof typeof settings.notifications) => {
    try {
      await updateSettings({
        notifications: {
          ...settings.notifications,
          [key]: !settings.notifications[key]
        }
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update notification settings.",
        variant: "destructive",
      })
    }
  }

  const handleCompactModeToggle = async () => {
    try {
      await updateSettings({
        appearance: {
          ...settings.appearance,
          compactMode: !settings.appearance.compactMode
        }
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update appearance settings.",
        variant: "destructive",
      })
    }
  }

  const handle2FAToggle = async () => {
    try {
      await updateSettings({
        security: {
          ...settings.security,
          twoFactorEnabled: !settings.security.twoFactorEnabled
        }
      })
      toast({
        title: settings.security.twoFactorEnabled ? "2FA Disabled" : "2FA Enabled",
        description: settings.security.twoFactorEnabled 
          ? "Two-factor authentication has been disabled."
          : "Two-factor authentication has been enabled.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update security settings.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings
        </p>
      </div>

      <div className="grid gap-4">
        <Card className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate("/settings/profile")}>
          <CardHeader>
            <CardTitle>Profile Settings</CardTitle>
            <CardDescription>
              View and manage your profile information
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>
                  Configure your basic account settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Name</Label>
                    <Input 
                      id="name" 
                      name="name"
                      defaultValue={settings.profile.name} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      name="email"
                      type="email" 
                      defaultValue={settings.profile.email} 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company</Label>
                    <Input 
                      id="company" 
                      name="company"
                      defaultValue={settings.profile.company} 
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>
                  Choose what notifications you want to receive
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive email about your account activity
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.email}
                    onCheckedChange={() => handleNotificationToggle('email')}
                    disabled={isLoading}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Order Updates</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about order status changes
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.orders}
                    onCheckedChange={() => handleNotificationToggle('orders')}
                    disabled={isLoading}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Chat Messages</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications for new chat messages
                    </p>
                  </div>
                  <Switch 
                    checked={settings.notifications.chat}
                    onCheckedChange={() => handleNotificationToggle('chat')}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                  Customize how the app looks and feels
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Theme</Label>
                    <p className="text-sm text-muted-foreground">
                      Switch between light and dark mode
                    </p>
                  </div>
                  <ThemeToggle />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Compact Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Show more content in less space
                    </p>
                  </div>
                  <Switch 
                    checked={settings.appearance.compactMode}
                    onCheckedChange={handleCompactModeToggle}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your security preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password" 
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </form>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </p>
                  </div>
                  <Switch 
                    checked={settings.security.twoFactorEnabled}
                    onCheckedChange={handle2FAToggle}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
} 