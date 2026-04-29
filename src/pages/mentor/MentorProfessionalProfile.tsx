import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { ArrowLeft, Briefcase, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function MentorProfessionalProfile() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
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

    setLoading(true)

    const { data, error } = await (supabase as any)
      .from('professional_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setFormData({
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
    } else {
      setFormData((prev) => ({
        ...prev,
        full_name: profile?.name || '',
      }))
    }

    setLoading(false)
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    if (!user?.id) return

    if (!formData.full_name || !formData.job_title || !formData.specialization) {
      toast.error('Please fill full name, job title, and specialization')
      return
    }

    setSaving(true)

    const { error } = await (supabase as any)
      .from('professional_profiles')
      .upsert(
        {
          user_id: user.id,
          role: 'mentor',
          full_name: formData.full_name,
          job_title: formData.job_title,
          company: formData.company,
          department: formData.department,
          specialization: formData.specialization,
          experience_years: formData.experience_years ? Number(formData.experience_years) : null,
          bio: formData.bio,
          skills: formData.skills,
          linkedin_url: formData.linkedin_url,
          is_available: formData.is_available,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Mentor profile saved successfully')
    navigate('/mentor/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-4xl px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/mentor/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>

              <div>
                <CardTitle>Mentor Professional Profile</CardTitle>
                <CardDescription>
                  This information will appear to students looking for mentors.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => handleChange('full_name', e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      value={formData.job_title}
                      onChange={(e) => handleChange('job_title', e.target.value)}
                      placeholder="Senior Software Engineer"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      value={formData.company}
                      onChange={(e) => handleChange('company', e.target.value)}
                      placeholder="Company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Input
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                      placeholder="IT, Data, Cybersecurity..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input
                      value={formData.specialization}
                      onChange={(e) => handleChange('specialization', e.target.value)}
                      placeholder="AI, Data Science, Software Engineering..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Experience Years</Label>
                    <Input
                      type="number"
                      value={formData.experience_years}
                      onChange={(e) => handleChange('experience_years', e.target.value)}
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Skills / Expertise</Label>
                  <Textarea
                    value={formData.skills}
                    onChange={(e) => handleChange('skills', e.target.value)}
                    placeholder="Python, SQL, AI, Career Guidance..."
                    className="min-h-24"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bio</Label>
                  <Textarea
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Tell students about your experience and how you can help them."
                    className="min-h-28"
                  />
                </div>

                <div className="space-y-2">
                  <Label>LinkedIn URL</Label>
                  <Input
                    value={formData.linkedin_url}
                    onChange={(e) => handleChange('linkedin_url', e.target.value)}
                    placeholder="https://linkedin.com/in/yourname"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border p-4">
                  <div>
                    <p className="font-medium">Available for Mentorship</p>
                    <p className="text-sm text-muted-foreground">
                      If enabled, students can find and request you.
                    </p>
                  </div>

                  <Switch
                    checked={formData.is_available}
                    onCheckedChange={(value) => handleChange('is_available', value)}
                  />
                </div>

                <Button className="w-full" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Mentor Profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}