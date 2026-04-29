import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AdvisorProfile() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    full_name: '',
    job_title: '',
    company: '',
    department: '',
    specialization: '',
    experience_years: '',
    bio: '',
    skills: '',
    linkedin_url: '',
    is_available: true,
  })

  useEffect(() => {
    loadProfile()
  }, [user?.id])

  const loadProfile = async () => {
    if (!user?.id) return

    const { data } = await (supabase as any)
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'advisor')
      .maybeSingle()

    if (data) {
      setForm({
        full_name: data.full_name || '',
        job_title: data.job_title || '',
        company: data.company || '',
        department: data.department || '',
        specialization: data.specialization || '',
        experience_years: data.experience_years?.toString() || '',
        bio: data.bio || '',
        skills: data.skills || '',
        linkedin_url: data.linkedin_url || '',
        is_available: data.is_available ?? true,
      })
    }

    setLoading(false)
  }

  const saveProfile = async () => {
    if (!user?.id) return

    setSaving(true)

    const { error } = await (supabase as any)
      .from('professional_profiles')
      .upsert({
        user_id: user.id,
        role: 'advisor',
        full_name: form.full_name,
        job_title: form.job_title,
        company: form.company,
        department: form.department,
        specialization: form.specialization,
        experience_years: form.experience_years
          ? Number(form.experience_years)
          : null,
        bio: form.bio,
        skills: form.skills,
        linkedin_url: form.linkedin_url,
        is_available: form.is_available,
      })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Advisor profile saved')
  }

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Advisor Profile</CardTitle>
            <CardDescription>
              Complete your advisor information so students can find you.
            </CardDescription>
          </CardHeader>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <Input
              placeholder="Full Name"
              value={form.full_name}
              onChange={(e) => updateField('full_name', e.target.value)}
            />

            <Input
              placeholder="Job Title"
              value={form.job_title}
              onChange={(e) => updateField('job_title', e.target.value)}
            />

            <Input
              placeholder="Company / University"
              value={form.company}
              onChange={(e) => updateField('company', e.target.value)}
            />

            <Input
              placeholder="Department"
              value={form.department}
              onChange={(e) => updateField('department', e.target.value)}
            />

            <Input
              placeholder="Specialization"
              value={form.specialization}
              onChange={(e) => updateField('specialization', e.target.value)}
            />

            <Input
              placeholder="Years of Experience"
              value={form.experience_years}
              onChange={(e) => updateField('experience_years', e.target.value)}
            />

            <Input
              className="md:col-span-2"
              placeholder="Skills (comma separated)"
              value={form.skills}
              onChange={(e) => updateField('skills', e.target.value)}
            />

            <Input
              className="md:col-span-2"
              placeholder="LinkedIn URL"
              value={form.linkedin_url}
              onChange={(e) => updateField('linkedin_url', e.target.value)}
            />

            <Textarea
              className="md:col-span-2"
              placeholder="Bio"
              rows={5}
              value={form.bio}
              onChange={(e) => updateField('bio', e.target.value)}
            />

            <div className="md:col-span-2 flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label>Available for Students</Label>
                <p className="text-sm text-muted-foreground">
                  Show your profile in Find Advisor page.
                </p>
              </div>

              <Switch
                checked={form.is_available}
                onCheckedChange={(value) =>
                  updateField('is_available', value)
                }
              />
            </div>

            <Button
              className="md:col-span-2"
              onClick={saveProfile}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Profile
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}