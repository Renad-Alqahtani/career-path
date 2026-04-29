import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Navbar } from '@/components/layout/Navbar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Camera,
  Loader2,
  Save,
  User,
  MapPin,
  Phone,
  Briefcase,
  Globe,
  Linkedin,
  LogOut,
  Lock,
  Eye,
  EyeOff,
  FileText,
  Sparkles,
} from 'lucide-react'

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,15}$/

type AcademicProfile = {
  major: string
  gpa: number | null
  university: string | null
  completed_courses: string | null
  self_reported_skills: string | null
  transcript_file_name: string | null
  transcript_file_path: string | null
  ai_consent: boolean
  visible_to_mentors: boolean
  visible_to_advisors: boolean
}

export default function Account() {
  const { user, profile, refreshProfile, logout, updateProfile } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const [academicProfile, setAcademicProfile] = useState<AcademicProfile | null>(null)
  const [isLoadingAcademic, setIsLoadingAcademic] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsDoNotMatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    major: '',
    phone: '',
    location: '',
    linkedin_url: '',
    website_url: '',
  })

  useEffect(() => {
    setFormData({
      name: profile?.name || '',
      bio: profile?.bio || '',
      major: profile?.major || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      linkedin_url: profile?.linkedin_url || '',
      website_url: profile?.website_url || '',
    })
  }, [profile])

  useEffect(() => {
    loadAcademicProfile()
  }, [user?.id])

  const loadAcademicProfile = async () => {
    if (!user?.id) return

    setIsLoadingAcademic(true)

    const { data, error } = await (supabase as any)
      .from('student_academic_profiles')
      .select(
        'major,gpa,university,completed_courses,self_reported_skills,transcript_file_name,transcript_file_path,ai_consent,visible_to_mentors,visible_to_advisors'
      )
      .eq('user_id', user.id)
      .maybeSingle()

    if (!error) {
      setAcademicProfile(data || null)
    }

    setIsLoadingAcademic(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be less than 2MB')
      return
    }

    setIsUploading(true)

    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const avatarUrl = `${publicUrl}?v=${Date.now()}`

      await updateProfile({ avatar_url: avatarUrl })
      await refreshProfile()
      toast.success('Avatar updated!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload avatar')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      await updateProfile({
        name: formData.name,
        bio: formData.bio,
        major: formData.major || null,
        phone: formData.phone || null,
        location: formData.location || null,
        linkedin_url: formData.linkedin_url || null,
        website_url: formData.website_url || null,
      })

      await refreshProfile()
      toast.success('Profile saved!')
    } catch (error: any) {
      toast.error(error.message || 'Failed to save profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!user?.email) {
      toast.error('Unable to find your email.')
      return
    }

    if (!currentPassword.trim()) {
      toast.error('Please enter your current password.')
      return
    }

    if (!passwordRegex.test(newPassword)) {
      toast.error('Password must be 8-15 characters and include uppercase, lowercase, number, and special character.')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('New password cannot be the same as your current password.')
      return
    }

    setIsChangingPassword(true)

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (loginError) {
        toast.error('Current password is incorrect.')
        return
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Password updated successfully.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await logout()
    } catch (error: any) {
      toast.error(error.message || 'Failed to log out')
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-bold">My Account</h1>

          <Button variant="outline" onClick={handleLogout} disabled={isLoggingOut}>
            {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
            Logout
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Profile Photo</CardTitle>
            <CardDescription>Click the avatar to upload a new photo</CardDescription>
          </CardHeader>

          <CardContent className="flex items-center gap-6">
            <div className="relative cursor-pointer group" onClick={() => fileInputRef.current?.click()}>
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {profile?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 opacity-0 transition-opacity group-hover:opacity-100">
                {isUploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary-foreground" />
                ) : (
                  <Camera className="h-6 w-6 text-primary-foreground" />
                )}
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            </div>

            <div>
              <p className="font-medium">{profile?.name || 'Your Name'}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs capitalize text-muted-foreground">{profile?.role}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+966 5X XXX XXXX"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                  placeholder="City, Country"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="major" className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" />
                  Major / Field
                </Label>
                <Input
                  id="major"
                  value={formData.major}
                  onChange={(e) => handleChange('major', e.target.value)}
                  placeholder="Computer Science"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange('bio', e.target.value)}
                placeholder="Tell us about yourself..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {profile?.role === 'student' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-primary" />
                Academic Transcript Information
              </CardTitle>
              <CardDescription>
                This data is saved from your Transcript page and used for recommendations only when AI consent is enabled.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {isLoadingAcademic ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : academicProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">Major</p>
                      <p className="font-medium">{academicProfile.major || 'Not added'}</p>
                    </div>

                    <div className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">GPA</p>
                      <p className="font-medium">{academicProfile.gpa ?? 'Not added'}</p>
                    </div>

                    <div className="rounded-lg border p-4 sm:col-span-2">
                      <p className="text-sm text-muted-foreground">University</p>
                      <p className="font-medium">{academicProfile.university || 'Not added'}</p>
                    </div>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Completed Courses</p>
                    <p className="whitespace-pre-wrap text-sm">{academicProfile.completed_courses || 'Not added'}</p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <p className="mb-2 text-sm text-muted-foreground">Skills</p>
                    <p className="whitespace-pre-wrap text-sm">{academicProfile.self_reported_skills || 'Not added'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant={academicProfile.ai_consent ? 'default' : 'secondary'}>
                      <Sparkles className="mr-1 h-3 w-3" />
                      AI Consent: {academicProfile.ai_consent ? 'Enabled' : 'Disabled'}
                    </Badge>

                    <Badge variant={academicProfile.visible_to_mentors ? 'default' : 'secondary'}>
                      Mentors: {academicProfile.visible_to_mentors ? 'Allowed' : 'Hidden'}
                    </Badge>

                    <Badge variant={academicProfile.visible_to_advisors ? 'default' : 'secondary'}>
                      Advisors: {academicProfile.visible_to_advisors ? 'Allowed' : 'Hidden'}
                    </Badge>

                    {academicProfile.transcript_file_name && (
                      <Badge variant="outline">
                        File: {academicProfile.transcript_file_name}
                      </Badge>
                    )}
                  </div>

                  <Button variant="outline" asChild className="w-full">
                    <Link to="/student/transcript">Edit Transcript Information</Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <p className="mb-4 text-muted-foreground">
                    No academic transcript information has been saved yet.
                  </p>
                  <Button asChild>
                    <Link to="/student/transcript">Add Transcript Information</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Links
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="flex items-center gap-1">
                <Linkedin className="h-3 w-3" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                value={formData.linkedin_url}
                onChange={(e) => handleChange('linkedin_url', e.target.value)}
                placeholder="https://linkedin.com/in/yourname"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                Website
              </Label>
              <Input
                id="website"
                value={formData.website_url}
                onChange={(e) => handleChange('website_url', e.target.value)}
                placeholder="https://yourwebsite.com"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-primary" />
              Change Password
            </CardTitle>
            <CardDescription>
              Password must be 8-15 characters and include uppercase, lowercase, number, and special character.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type={showPasswords ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPasswords ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {passwordsDoNotMatch && <p className="text-sm text-destructive">Passwords do not match.</p>}
              {passwordsMatch && <p className="text-sm text-green-600">Passwords match.</p>}
            </div>

            <Button className="w-full" onClick={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
              Update Password
            </Button>
          </CardContent>
        </Card>

        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Changes
        </Button>
      </main>
    </div>
  )
}