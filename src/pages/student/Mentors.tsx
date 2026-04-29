import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import {
  Search,
  Briefcase,
  Clock,
  MessageSquare,
  Linkedin,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Eye,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

type ProfessionalProfile = {
  id: string
  user_id: string
  role: 'mentor' | 'advisor'
  full_name: string | null
  job_title: string | null
  company: string | null
  department: string | null
  specialization: string | null
  experience_years: number | null
  bio: string | null
  skills: string | null
  linkedin_url: string | null
  is_available: boolean
}

type RequestRow = {
  id: string
  student_id: string
  professional_id: string
  professional_role: string
  status: string
  created_at?: string
  updated_at?: string | null
}

export default function Mentors() {
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [professionals, setProfessionals] = useState<ProfessionalProfile[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [selectedMentor, setSelectedMentor] = useState<ProfessionalProfile | null>(null)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: professionalsData, error: professionalsError } = await (supabase as any)
      .from('professional_profiles')
      .select('*')
      .eq('role', 'mentor')
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (professionalsError) {
      toast.error(professionalsError.message)
      setLoading(false)
      return
    }

    const { data: requestsData, error: requestsError } = await (supabase as any)
      .from('connection_requests')
      .select('id, student_id, professional_id, professional_role, status, created_at, updated_at')
      .eq('student_id', user.id)
      .eq('professional_role', 'mentor')

    if (requestsError) {
      toast.error(requestsError.message)
      setLoading(false)
      return
    }

    setProfessionals(professionalsData || [])
    setRequests(requestsData || [])
    setLoading(false)
  }

  const getRequest = (professionalId: string) => {
    const mentorRequests = requests.filter(
      (request) => request.professional_id === professionalId
    )

    return mentorRequests.sort((a, b) => {
      const order: Record<string, number> = {
        accepted: 3,
        pending: 2,
        rejected: 1,
      }

      const statusDiff = (order[b.status] || 0) - (order[a.status] || 0)
      if (statusDiff !== 0) return statusDiff

      const bDate = new Date(b.updated_at || b.created_at || 0).getTime()
      const aDate = new Date(a.updated_at || a.created_at || 0).getTime()

      return bDate - aDate
    })[0]
  }

  const filteredMentors = professionals.filter((mentor) => {
    const request = getRequest(mentor.user_id)

    if (request?.status === 'accepted') return false

    const text = `${mentor.full_name || ''} ${mentor.job_title || ''} ${mentor.company || ''} ${mentor.specialization || ''} ${mentor.skills || ''}`.toLowerCase()
    return text.includes(searchQuery.toLowerCase())
  })

  const handleRequestMentorship = async (mentor: ProfessionalProfile) => {
    if (!user?.id) return

    setSendingId(mentor.user_id)

    const { error } = await (supabase as any)
      .from('connection_requests')
      .insert({
        student_id: user.id,
        professional_id: mentor.user_id,
        professional_role: 'mentor',
        status: 'pending',
        message: 'I would like to request mentorship.',
      })

    setSendingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Mentorship request sent')
    await loadData()
  }

  const handleRequestAgain = async (mentor: ProfessionalProfile) => {
    if (!user?.id) return

    setSendingId(mentor.user_id)

    const { error } = await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'pending',
        message: 'I would like to request mentorship again.',
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', user.id)
      .eq('professional_id', mentor.user_id)

    setSendingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Mentorship request sent again')
    await loadData()
  }

  const getInitials = (name?: string | null) => {
    return (name || 'M')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">Find a Mentor</h1>
          <p className="text-muted-foreground">
            Connect with real mentors registered in CareerPath.
          </p>
        </div>

        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, expertise, company, or specialization..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {selectedMentor && (
  <Card className="mb-8 border-primary/30">
    <CardContent className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="gradient-primary text-primary-foreground">
              {getInitials(selectedMentor.full_name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <h2 className="text-xl font-bold">
              {selectedMentor.full_name || 'Unnamed Mentor'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {selectedMentor.job_title || 'Mentor'}
              {selectedMentor.company ? ` • ${selectedMentor.company}` : ''}
            </p>
            <Badge variant="success" className="mt-2">
              Available
            </Badge>
          </div>
        </div>

        <Button variant="ghost" size="icon" onClick={() => setSelectedMentor(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Full Name</p>
          <p className="font-medium">{selectedMentor.full_name || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Job Title</p>
          <p className="font-medium">{selectedMentor.job_title || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Company</p>
          <p className="font-medium">{selectedMentor.company || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Department</p>
          <p className="font-medium">{selectedMentor.department || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Specialization</p>
          <p className="font-medium">{selectedMentor.specialization || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">Experience</p>
          <p className="font-medium">
            {selectedMentor.experience_years !== null
              ? `${selectedMentor.experience_years} years`
              : 'Not added'}
          </p>
        </div>

        <div className="rounded-lg border p-4 md:col-span-2">
          <p className="text-sm text-muted-foreground">Bio</p>
          <p className="font-medium">{selectedMentor.bio || 'Not added'}</p>
        </div>

        <div className="rounded-lg border p-4 md:col-span-2">
          <p className="text-sm text-muted-foreground">Skills</p>
          <p className="font-medium">{selectedMentor.skills || 'Not added'}</p>
        </div>

        {selectedMentor.linkedin_url && (
          <div className="rounded-lg border p-4 md:col-span-2">
            <p className="text-sm text-muted-foreground">LinkedIn</p>
            <a
              href={selectedMentor.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              View LinkedIn Profile
            </a>
          </div>
        )}
      </div>
    </CardContent>
  </Card>
)}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : filteredMentors.length === 0 ? (
          <Card className="p-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No mentors found</h3>
            <p className="text-sm text-muted-foreground">
              No available mentors to request right now.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMentors.map((mentor) => {
              const request = getRequest(mentor.user_id)
              const status = request?.status

              const skills = mentor.skills
                ? mentor.skills.split(',').map((s) => s.trim()).filter(Boolean)
                : []

              return (
                <Card key={mentor.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="gradient-primary text-primary-foreground text-xl">
                          {getInitials(mentor.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-display text-lg font-semibold truncate">
                            {mentor.full_name || 'Unnamed Mentor'}
                          </h3>

                          <Badge variant="success" className="shrink-0">
                            Available
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground mb-1">
                          {mentor.job_title || 'Mentor'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          {mentor.company && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3.5 w-3.5" />
                              {mentor.company}
                            </span>
                          )}

                          {mentor.experience_years !== null && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {mentor.experience_years} years
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground line-clamp-2">
                      {mentor.bio || 'No bio added yet.'}
                    </p>

                    {skills.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {skills.map((skill) => (
                          <Badge key={skill} variant="skill">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t flex flex-col gap-3">
                      <Badge variant="outline" className="w-fit">
                        {mentor.specialization || mentor.department || 'General Guidance'}
                      </Badge>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMentor(mentor)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>

                        {mentor.linkedin_url && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={mentor.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Linkedin className="h-4 w-4" />
                            </a>
                          </Button>
                        )}

                        {status === 'pending' && (
                          <Button variant="secondary" size="sm" disabled>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Pending
                          </Button>
                        )}

                        {status === 'rejected' && (
                          <Button
                            size="sm"
                            onClick={() => handleRequestAgain(mentor)}
                            disabled={sendingId === mentor.user_id}
                          >
                            {sendingId === mentor.user_id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <RotateCcw className="h-4 w-4 mr-2" />
                            )}
                            Request Again
                          </Button>
                        )}

                        {!status && (
                          <Button
                            size="sm"
                            onClick={() => handleRequestMentorship(mentor)}
                            disabled={sendingId === mentor.user_id}
                          >
                            {sendingId === mentor.user_id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <MessageSquare className="h-4 w-4 mr-2" />
                            )}
                            Request Mentorship
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}