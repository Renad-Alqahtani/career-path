import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, FileText, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

const majors = [
  'Computer Science',
  'Information Systems',
  'Information Technology',
  'Cybersecurity',
  'Software Engineering',
  'Artificial Intelligence',
  'Data Science',
  'Computer Engineering',
  'Business Administration',
  'Accounting',
  'Finance',
  'Marketing',
  'Human Resources',
  'Management Information Systems',
  'Medicine',
  'Nursing',
  'Pharmacy',
  'Dentistry',
  'Electrical Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'Architecture',
  'Law',
  'Education',
  'English Language',
  'Translation',
  'Psychology',
  'Media and Communication',
  'Graphic Design'
]

const examplesByMajor: Record<string, { courses: string; skills: string }> = {
  'Computer Science': {
    courses: 'Programming, Data Structures, Database Systems, Algorithms, Artificial Intelligence, Software Engineering',
    skills: 'Python, Java, SQL, Problem Solving, Algorithms, Data Analysis'
  },
  Cybersecurity: {
    courses: 'Network Security, Cryptography, Ethical Hacking, Digital Forensics, Information Security',
    skills: 'Network Security, Risk Analysis, Linux, Incident Response, Cryptography'
  },
  'Data Science': {
    courses: 'Statistics, Machine Learning, Data Mining, Database Systems, Python Programming',
    skills: 'Python, SQL, Machine Learning, Data Visualization, Statistics'
  },
  'Information Systems': {
    courses: 'Systems Analysis, Database Management, Project Management, Business Intelligence',
    skills: 'SQL, Business Analysis, Documentation, Project Management, Communication'
  },
  'Business Administration': {
    courses: 'Management, Marketing, Finance, Organizational Behavior, Business Strategy',
    skills: 'Leadership, Communication, Planning, Decision Making, Teamwork'
  }
}

type VisibilitySettings = {
  major: boolean
  gpa: boolean
  university: boolean
  courses: boolean
  skills: boolean
  transcript_file: boolean
}

const defaultVisibilitySettings: VisibilitySettings = {
  major: true,
  gpa: false,
  university: true,
  courses: true,
  skills: true,
  transcript_file: false
}

export default function Transcript() {
  const { user } = useAuth()

  const [major, setMajor] = useState('')
  const [gpa, setGpa] = useState('')
  const [university, setUniversity] = useState('')
  const [courses, setCourses] = useState('')
  const [skills, setSkills] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [savedFileName, setSavedFileName] = useState<string | null>(null)

  const [aiConsent, setAiConsent] = useState(false)
  const [allowViewers, setAllowViewers] = useState(true)
  const [visibilitySettings, setVisibilitySettings] =
    useState<VisibilitySettings>(defaultVisibilitySettings)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAcademicProfile()
  }, [user?.id])

  const loadAcademicProfile = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data, error } = await (supabase as any)
      .from('student_academic_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data) {
      setMajor(data.major || '')
      setGpa(data.gpa?.toString() || '')
      setUniversity(data.university || '')
      setCourses(data.completed_courses || '')
      setSkills(data.self_reported_skills || '')
      setSavedFileName(data.transcript_file_name || null)
      setAiConsent(data.ai_consent || false)
      setAllowViewers((data.visible_to_mentors ?? true) || (data.visible_to_advisors ?? true))

      if (data.visibility_settings) {
        const oldSettings = data.visibility_settings

        setVisibilitySettings({
          major:
            typeof oldSettings.major === 'object'
              ? oldSettings.major.mentor || oldSettings.major.advisor
              : oldSettings.major ?? true,
          gpa:
            typeof oldSettings.gpa === 'object'
              ? oldSettings.gpa.mentor || oldSettings.gpa.advisor
              : oldSettings.gpa ?? false,
          university:
            typeof oldSettings.university === 'object'
              ? oldSettings.university.mentor || oldSettings.university.advisor
              : oldSettings.university ?? true,
          courses:
            typeof oldSettings.courses === 'object'
              ? oldSettings.courses.mentor || oldSettings.courses.advisor
              : oldSettings.courses ?? true,
          skills:
            typeof oldSettings.skills === 'object'
              ? oldSettings.skills.mentor || oldSettings.skills.advisor
              : oldSettings.skills ?? true,
          transcript_file:
            typeof oldSettings.transcript_file === 'object'
              ? oldSettings.transcript_file.mentor || oldSettings.transcript_file.advisor
              : oldSettings.transcript_file ?? false
        })
      }
    }

    setLoading(false)
  }

  const handleMajorChange = (value: string) => {
    setMajor(value)

    const example = examplesByMajor[value]

    if (example && !courses.trim() && !skills.trim()) {
      setCourses(example.courses)
      setSkills(example.skills)
    }
  }

  const updateVisibility = (field: keyof VisibilitySettings, value: boolean) => {
    setVisibilitySettings((prev) => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id) {
      toast.error('Please sign in again')
      return
    }

    if (!major || !gpa || !university || !courses) {
      toast.error('Please fill in all required fields')
      return
    }

    setSaving(true)

    let transcriptFileName = savedFileName
    let transcriptFilePath: string | null = null

    if (file) {
      const ext = file.name.split('.').pop() || 'pdf'
      const safeName = `transcript-${Date.now()}.${ext}`
      const filePath = `${user.id}/${safeName}`

      const { error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(filePath, file, { upsert: true })

      if (uploadError) {
        setSaving(false)
        toast.error(uploadError.message)
        return
      }

      transcriptFileName = file.name
      transcriptFilePath = filePath
    }

    const updateData: any = {
      user_id: user.id,
      major,
      gpa: Number(gpa),
      university,
      completed_courses: courses,
      self_reported_skills: skills,
      transcript_file_name: transcriptFileName,
      ai_consent: aiConsent,
      visible_to_mentors: allowViewers,
      visible_to_advisors: allowViewers,
      visibility_settings: visibilitySettings,
      updated_at: new Date().toISOString()
    }

    if (transcriptFilePath) {
      updateData.transcript_file_path = transcriptFilePath
    }

    const { error } = await (supabase as any)
      .from('student_academic_profiles')
      .upsert(updateData, { onConflict: 'user_id' })

    setSaving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setFile(null)
    setSavedFileName(transcriptFileName)
    toast.success('Transcript information saved successfully')
    await loadAcademicProfile()
  }

  const FieldRow = ({
    label,
    field
  }: {
    label: string
    field: keyof VisibilitySettings
  }) => (
    <div className="flex items-center justify-between gap-4 rounded-lg border p-4">
      <Label className="font-medium">{label}</Label>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Show</span>
        <Switch
          checked={visibilitySettings[field]}
          onCheckedChange={(value) => updateVisibility(field, value)}
        />
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <Button variant="ghost" asChild className="mb-6">
            <Link to="/student/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Academic Transcript</h1>
            <p className="text-muted-foreground">
              Add your academic information and control what can be shared.
            </p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>

                <div>
                  <CardTitle>Transcript Details</CardTitle>
                  <CardDescription>
                    Saved directly to your student account.
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
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label>Major</Label>
                    <Select value={major} onValueChange={handleMajorChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your major" />
                      </SelectTrigger>

                      <SelectContent>
                        {majors.map((item) => (
                          <SelectItem key={item} value={item}>
                            {item}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <FieldRow label="Show Major" field="major" />

                  <div className="space-y-2">
                    <Label>GPA</Label>
                    <Input
                      value={gpa}
                      onChange={(e) => setGpa(e.target.value)}
                      placeholder="4.50"
                      inputMode="decimal"
                    />
                  </div>

                  <FieldRow label="Show GPA" field="gpa" />

                  <div className="space-y-2">
                    <Label>University</Label>
                    <Input
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="King Khalid University"
                    />
                  </div>

                  <FieldRow label="Show University" field="university" />

                  <div className="space-y-2">
                    <Label>Completed Courses</Label>
                    <Textarea
                      value={courses}
                      onChange={(e) => setCourses(e.target.value)}
                      className="min-h-32"
                      placeholder="Programming, Data Structures, Database Systems..."
                    />
                  </div>

                  <FieldRow label="Show Completed Courses" field="courses" />

                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <Textarea
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                      className="min-h-32"
                      placeholder="Python, SQL, Communication..."
                    />
                  </div>

                  <FieldRow label="Show Skills" field="skills" />

                  <div className="space-y-2">
                    <Label>Upload Transcript File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />

                    {file && (
                      <p className="text-sm text-muted-foreground">
                        Selected file: {file.name}
                      </p>
                    )}

                    {!file && savedFileName && (
                      <p className="text-sm text-muted-foreground">
                        Saved file: {savedFileName}
                      </p>
                    )}
                  </div>

                  <FieldRow label="Show Transcript File" field="transcript_file" />

                  <div className="rounded-xl border p-4 space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">Allow Mentors & Advisors</p>
                        <p className="text-sm text-muted-foreground">
                          They can only see fields marked as Show.
                        </p>
                      </div>

                      <Switch checked={allowViewers} onCheckedChange={setAllowViewers} />
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">AI Recommendation Consent</p>
                        <p className="text-sm text-muted-foreground">
                          Allow AI to analyze your data and generate career recommendations.
                        </p>
                      </div>

                      <Switch checked={aiConsent} onCheckedChange={setAiConsent} />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Transcript Information
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}