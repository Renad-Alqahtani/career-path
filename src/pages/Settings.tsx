import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(15, 'Password must be at most 15 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character')

export default function Settings() {
  const { user, profile, updatePassword, updateEmail, refreshProfile } = useAuth()

  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [language, setLanguage] = useState('en')
  const [profilePublic, setProfilePublic] = useState(true)
  const [showEmail, setShowEmail] = useState(false)
  const [fontSize, setFontSize] = useState('medium')
  const [reduceMotion, setReduceMotion] = useState(false)
  const [highContrast, setHighContrast] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)

  useEffect(() => {
    setNewName(profile?.name || '')
    setLanguage(profile?.language || 'en')
    setProfilePublic(profile?.privacy_profile_public ?? true)
    setShowEmail(profile?.privacy_show_email ?? false)
    setFontSize(profile?.accessibility_font_size || 'medium')
    setReduceMotion(profile?.accessibility_reduce_motion ?? false)
    setHighContrast(profile?.accessibility_high_contrast ?? false)
  }, [profile])

  const handleChangeName = async () => {
    if (!user || !newName.trim()) return

    setSavingName(true)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({ name: newName.trim() })
        .eq('user_id', user.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Name updated!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update name')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) return

    setSavingEmail(true)
    try {
      await updateEmail(newEmail.trim())
      toast.success('Verification email sent to your new address. Please confirm it.')
      setNewEmail('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update email')
    } finally {
      setSavingEmail(false)
    }
  }

  const handleChangePassword = async () => {
    const result = passwordSchema.safeParse(newPassword)
    if (!result.success) {
      setPasswordError(result.error.errors[0].message)
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setPasswordError('')
    setSavingPassword(true)

    try {
      await updatePassword(newPassword)
      toast.success('Password updated!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!user) return

    setSavingPrefs(true)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          language,
          privacy_profile_public: profilePublic,
          privacy_show_email: showEmail,
          accessibility_font_size: fontSize,
          accessibility_reduce_motion: reduceMotion,
          accessibility_high_contrast: highContrast,
        })
        .eq('user_id', user.id)

      if (error) throw error
      await refreshProfile()
      toast.success('Preferences saved!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to save preferences')
    } finally {
      setSavingPrefs(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle>Display Name</CardTitle>
            <CardDescription>Update your name</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Your name" />
            <Button onClick={handleChangeName} disabled={savingName}>
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Email Address</CardTitle>
            <CardDescription>Current: {user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@email.com" type="email" />
            <Button onClick={handleChangeEmail} disabled={savingEmail}>
              {savingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>8-15 characters, uppercase, lowercase, number, and special character</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="••••••••"
              />
            </div>

            <div>
              <Label>Confirm Password</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value)
                  setPasswordError('')
                }}
                placeholder="••••••••"
              />
            </div>

            {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}

            <Button onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Language, privacy, and accessibility</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                  <SelectItem value="zh">中文</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Public Profile</Label>
                <p className="text-sm text-muted-foreground">Allow others to see your profile</p>
              </div>
              <Switch checked={profilePublic} onCheckedChange={setProfilePublic} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Email</Label>
                <p className="text-sm text-muted-foreground">Display email on your profile</p>
              </div>
              <Switch checked={showEmail} onCheckedChange={setShowEmail} />
            </div>

            <Separator />

            <div>
              <Label>Font Size</Label>
              <Select value={fontSize} onValueChange={setFontSize}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Reduce Motion</Label>
                <p className="text-sm text-muted-foreground">Minimize animations</p>
              </div>
              <Switch checked={reduceMotion} onCheckedChange={setReduceMotion} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>High Contrast</Label>
                <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
              </div>
              <Switch checked={highContrast} onCheckedChange={setHighContrast} />
            </div>

            <Button onClick={handleSavePreferences} disabled={savingPrefs}>
              {savingPrefs ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Preferences'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}