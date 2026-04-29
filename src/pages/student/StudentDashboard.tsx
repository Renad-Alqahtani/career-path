import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Sparkles,
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Loader2,
  Trash2,
  Eye,
  ChevronRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react'

type MyProfessional = {
  request_id: string
  professional_id: string
  full_name: string | null
  job_title: string | null
  company: string | null
  specialization: string | null
  bio: string | null
  experience_years: number | null
  department: string | null
}

type StudentProfile = {
  user_id: string
  name: string | null
  full_name?: string | null
  major: string | null
  bio: string | null
  phone: string | null
  location: string | null
  linkedin_url: string | null
  website_url: string | null
}

type CareerMatch = {
  id: string
  occupation_id: string
  match_score: number
  title: string
  description: string | null
}

export default function StudentDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [careerMatches, setCareerMatches] = useState<CareerMatch[]>([])
  const [myMentors, setMyMentors] = useState<MyProfessional[]>([])
  const [myAdvisors, setMyAdvisors] = useState<MyProfessional[]>([])
  const [loading, setLoading] = useState(true)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [selectedProfessional, setSelectedProfessional] = useState<MyProfessional | null>(null)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadCareerMatches = async () => {
    if (!user?.id) return []

    const { data } = await (supabase as any)
      .from('recommendations')
      .select('id, occupation_id, match_score')
      .eq('user_id', user.id)
      .order('match_score', { ascending: false })
      .limit(5)

    const rows = data || []
    const ids = rows.map((item: any) => item.occupation_id)

    if (ids.length === 0) return []

    const { data: occupations } = await (supabase as any)
      .from('occupations')
      .select('id, title, description')
      .in('id', ids)

    return rows.map((item: any) => {
      const occ = occupations?.find((o: any) => o.id === item.occupation_id)

      return {
        id: item.id,
        occupation_id: item.occupation_id,
        match_score: item.match_score || 0,
        title: occ?.title || 'Career',
        description: occ?.description || null,
      }
    })
  }

  const loadAccepted = async (role: 'mentor' | 'advisor') => {
    if (!user?.id) return []

    const { data: requests } = await (supabase as any)
      .from('connection_requests')
      .select('id, professional_id')
      .eq('student_id', user.id)
      .eq('professional_role', role)
      .eq('status', 'accepted')

    const rows = requests || []
    const ids = rows.map((r: any) => r.professional_id)

    if (ids.length === 0) return []

    const { data: profiles } = await (supabase as any)
      .from('professional_profiles')
      .select('user_id, full_name, job_title, company, specialization, bio, experience_years, department')
      .in('user_id', ids)

    return rows.map((req: any) => {
      const item = profiles?.find((p: any) => p.user_id === req.professional_id)

      return {
        request_id: req.id,
        professional_id: req.professional_id,
        full_name: item?.full_name || role,
        job_title: item?.job_title || role,
        company: item?.company || null,
        specialization: item?.specialization || null,
        bio: item?.bio || null,
        experience_years: item?.experience_years || null,
        department: item?.department || null,
      }
    })
  }

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: profileData } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const mentors = await loadAccepted('mentor')
    const advisors = await loadAccepted('advisor')
    const matches = await loadCareerMatches()

    setStudentProfile(profileData || null)
    setMyMentors(mentors)
    setMyAdvisors(advisors)
    setCareerMatches(matches)
    setLoading(false)
  }

  const removeProfessional = async (item: MyProfessional) => {
    setRemovingId(item.request_id)

    await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', item.request_id)

    setRemovingId(null)
    await loadData()
  }

  const displayName =
    studentProfile?.name ||
    studentProfile?.full_name ||
    profile?.name ||
    user?.email?.split('@')[0] ||
    'Student'

  const profileItems = [
    { label: 'Full name', value: studentProfile?.name || studentProfile?.full_name },
    { label: 'Major', value: studentProfile?.major },
    { label: 'Bio', value: studentProfile?.bio },
    { label: 'Phone', value: studentProfile?.phone },
    { label: 'Location', value: studentProfile?.location },
    { label: 'LinkedIn', value: studentProfile?.linkedin_url },
    { label: 'Website', value: studentProfile?.website_url },
  ]

  const missingItems = profileItems.filter(
    (item) => !item.value || String(item.value).trim() === ''
  )

  const progress = Math.round(
    ((profileItems.length - missingItems.length) / profileItems.length) * 100
  )

  const quickActions = [
    {
      title: 'Get Recommendations',
      description: 'AI-powered career suggestions',
      icon: Sparkles,
      href: '/student/recommendations',
    },
    {
      title: 'Skill Gap Analysis',
      description: 'Identify areas to improve',
      icon: BarChart3,
      href: '/student/skill-gap',
    },
    {
      title: 'Find Mentors',
      description: 'Connect with professionals',
      icon: Users,
      href: '/student/mentors',
    },
    {
      title: 'Find Advisors',
      description: 'Connect with academic advisors',
      icon: UserCheck,
      href: '/student/advisors',
    },
    {
      title: 'Upload Transcript',
      description: 'Enhance your profile',
      icon: FileText,
      href: '/student/transcript',
    },
  ]

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

  const renderCard = (item: MyProfessional, chatPath: string) => (
    <div key={item.request_id} className="rounded-lg border p-4 flex justify-between gap-4">
      <div>
        <h4 className="font-semibold">{item.full_name}</h4>
        <p className="text-sm text-muted-foreground">
          {item.job_title}
          {item.company ? ` • ${item.company}` : ''}
        </p>

        {item.specialization && (
          <Badge variant="outline" className="mt-2">
            {item.specialization}
          </Badge>
        )}
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSelectedProfessional(item)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>

        <Button size="sm" onClick={() => navigate(chatPath)}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Chat
        </Button>

        <Button
          size="sm"
          variant="destructive"
          onClick={() => removeProfessional(item)}
          disabled={removingId === item.request_id}
        >
          {removingId === item.request_id ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {displayName.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Track your profile, mentors, advisors, reports, and recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {quickActions.map((action) => (
            <Card key={action.title} variant="interactive" asChild>
              <Link to={action.href}>
                <CardHeader className="pb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <action.icon className="h-5 w-5 text-primary" />
                  </div>
                </CardHeader>

                <CardContent>
                  <h3 className="font-semibold mb-1">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>My Mentors</CardTitle>
              <CardDescription>Accepted mentors</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {myMentors.length === 0 ? (
                <p className="text-muted-foreground">No mentors yet.</p>
              ) : (
                myMentors.map((item) => renderCard(item, '/mentor-chat'))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>My Advisors</CardTitle>
              <CardDescription>Accepted advisors</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {myAdvisors.length === 0 ? (
                <p className="text-muted-foreground">No advisors yet.</p>
              ) : (
                myAdvisors.map((item) => renderCard(item, '/mentor-chat'))
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Advisor Reports</CardTitle>
              <CardDescription>Reports shared by advisors</CardDescription>
            </div>

            <Button asChild variant="outline">
              <Link to="/student/advisor-reports">
                <FileText className="mr-2 h-4 w-4" />
                View Reports
              </Link>
            </Button>
          </CardHeader>
        </Card>

        {selectedProfessional && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{selectedProfessional.full_name}</CardTitle>
              <CardDescription>{selectedProfessional.job_title}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium">Company</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional.company || 'Not added'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Department</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional.department || 'Not added'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Specialization</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional.specialization || 'Not added'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium">Experience</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional.experience_years
                    ? `${selectedProfessional.experience_years} years`
                    : 'Not added'}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-sm font-medium">Bio</p>
                <p className="text-sm text-muted-foreground">
                  {selectedProfessional.bio || 'No bio added'}
                </p>
              </div>

              <div className="md:col-span-2">
                <Button variant="outline" onClick={() => setSelectedProfessional(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Completion</CardTitle>
              <CardDescription>Based on your added information</CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>

                <Progress value={progress} className="h-2" />
              </div>

              <div className="space-y-2 text-sm">
                {missingItems.length === 0 ? (
                  <div className="rounded-lg border p-3 text-muted-foreground">
                    Your profile is complete.
                  </div>
                ) : (
                  missingItems.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span>Add {item.label}</span>
                    </div>
                  ))
                )}
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link to="/profile">
                  Complete Profile
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Career Matches</CardTitle>
              <CardDescription>From saved recommendations</CardDescription>
            </CardHeader>

            <CardContent className="space-y-3">
              {careerMatches.length === 0 ? (
                <p className="text-muted-foreground">No saved recommendations yet.</p>
              ) : (
                careerMatches.map((career, index) => (
                  <div
                    key={career.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                        {index + 1}
                      </div>

                      <div>
                        <p className="font-medium text-sm">{career.title}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TrendingUp className="h-3 w-3" />
                          Saved recommendation
                        </div>
                      </div>
                    </div>

                    <Badge>{career.match_score}%</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}