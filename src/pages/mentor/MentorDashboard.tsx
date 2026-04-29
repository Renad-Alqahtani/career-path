import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  MessageSquare,
  Check,
  X,
  Loader2,
  Briefcase,
  Trash2,
  Eye,
  FileText,
} from 'lucide-react'
import { toast } from 'sonner'

type RequestRow = {
  id: string
  student_id: string
  professional_id: string
  professional_role: string
  status: 'pending' | 'accepted' | 'rejected'
  message: string | null
  created_at: string
  updated_at: string | null
}

type StudentInfo = {
  user_id: string
  name: string | null
  
  role: string | null
  major: string | null
}

type StudentAcademicProfile = {
  major: string | null
  gpa: number | null
  university: string | null
  completed_courses: string | null
  self_reported_skills: string | null
  transcript_file_name: string | null
  transcript_file_path: string | null
  visible_to_mentors: boolean
  visibility_settings: any
}

export default function MentorDashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const profileRef = useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [acceptedRequests, setAcceptedRequests] = useState<RequestRow[]>([])
  const [students, setStudents] = useState<StudentInfo[]>([])
  const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [hasProfessionalProfile, setHasProfessionalProfile] = useState(false)

  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null)
  const [studentProfile, setStudentProfile] = useState<StudentAcademicProfile | null>(null)
  const [profileBlocked, setProfileBlocked] = useState(false)
  const [loadingStudentProfile, setLoadingStudentProfile] = useState(false)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: professionalData } = await (supabase as any)
      .from('professional_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    setHasProfessionalProfile(!!professionalData)

    const { data: requestData, error } = await (supabase as any)
      .from('connection_requests')
      .select('*')
      .eq('professional_id', user.id)
      .eq('professional_role', 'mentor')
      .order('created_at', { ascending: false })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const rows = requestData || []

    setRequests(rows.filter((item: RequestRow) => item.status === 'pending'))
    setAcceptedRequests(rows.filter((item: RequestRow) => item.status === 'accepted'))

    const studentIds = Array.from(new Set(rows.map((item: RequestRow) => item.student_id)))

    if (studentIds.length > 0) {
      const { data: studentData } = await (supabase as any)
        .from('profiles')
        .select('user_id, name, role, major')
        .in('user_id', studentIds)

      setStudents(studentData || [])
    } else {
      setStudents([])
    }

    setLoading(false)
  }

  const getStudent = (studentId: string) => {
    return students.find((student) => student.user_id === studentId)
  }

  const getStudentName = (student?: StudentInfo) => {
    return student?.name || 'Student'
  }

  const getInitials = (name?: string | null) => {
    return (name || 'ST')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  const canShowField = (field: string) => {
    if (!studentProfile?.visible_to_mentors) return false

    const settings = studentProfile.visibility_settings
    if (!settings) return true

    const value = settings[field]

    if (typeof value === 'boolean') return value
    if (typeof value === 'object') return value?.mentor === true

    return true
  }

  const getTranscriptFileUrl = () => {
    if (!studentProfile?.transcript_file_path) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from('transcripts').getPublicUrl(studentProfile.transcript_file_path)

    return publicUrl
  }

  const viewStudentProfile = async (request: RequestRow) => {
    const student = getStudent(request.student_id)

    setSelectedStudentName(getStudentName(student))
    setStudentProfile(null)
    setProfileBlocked(false)
    setLoadingStudentProfile(true)

    setTimeout(() => {
      profileRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)

    const { data, error } = await (supabase as any)
      .from('student_academic_profiles')
      .select('*')
      .eq('user_id', request.student_id)
      .maybeSingle()

    setLoadingStudentProfile(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (!data) {
      setProfileBlocked(true)
      toast.info('This student does not allow mentors to view their profile')
      return
    }

    if (!data.visible_to_mentors) {
      setProfileBlocked(true)
      toast.info('This student does not allow mentors to view their profile')
      return
    }

    setStudentProfile(data)
  }

  const handleAccept = async (request: RequestRow) => {
    setUpdatingRequestId(request.id)

    const { error: updateError } = await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'accepted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (updateError) {
      setUpdatingRequestId(null)
      toast.error(updateError.message)
      return
    }

    await (supabase as any).from('conversations').upsert(
      {
        student_id: request.student_id,
        professional_id: user?.id,
        request_id: request.id,
      },
      { onConflict: 'student_id,professional_id' }
    )

    setUpdatingRequestId(null)
    toast.success('Request accepted')
    await loadData()
  }

  const handleDecline = async (request: RequestRow) => {
    setUpdatingRequestId(request.id)

    await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    setUpdatingRequestId(null)
    toast.info('Request declined')
    await loadData()
  }

  const removeStudent = async (request: RequestRow) => {
    setRemovingId(request.id)

    await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'rejected',
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    setRemovingId(null)
    toast.success('Student removed')
    await loadData()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-16">
          <div className="flex justify-center">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold mb-2">
              Welcome, {profile?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Mentor'}! 👋
            </h1>
            <p className="text-muted-foreground">
              Manage your mentorship requests and accepted students.
            </p>
          </div>

          <Button asChild>
            <Link to="/mentor/profile">
              <Briefcase className="mr-2 h-4 w-4" />
              {hasProfessionalProfile ? 'Edit Mentor Profile' : 'Complete Mentor Profile'}
            </Link>
          </Button>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{acceptedRequests.length}</div>
              <div className="text-sm text-muted-foreground">Current Mentees</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">{requests.length}</div>
              <div className="text-sm text-muted-foreground">Pending Requests</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="text-2xl font-bold">
                {hasProfessionalProfile ? 'Ready' : 'Setup'}
              </div>
              <div className="text-sm text-muted-foreground">Profile Status</div>
            </CardContent>
          </Card>
        </div>

        {selectedStudentName && (
          <div ref={profileRef}>
            <Card className="mb-8 border-primary/30">
              <CardHeader>
                <CardTitle>{selectedStudentName} Profile</CardTitle>
                <CardDescription>
                  Visible academic information based on student permission
                </CardDescription>
              </CardHeader>

              <CardContent>
                {loadingStudentProfile ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : profileBlocked ? (
                  <p className="text-sm text-muted-foreground">
                    This student does not allow mentors to view their academic profile.
                  </p>
                ) : !studentProfile ? (
                  <p className="text-sm text-muted-foreground">
                    This student does not allow mentors to view their academic profile.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {canShowField('major') && (
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Major</p>
                        <p className="font-medium">{studentProfile.major || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('gpa') && (
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">GPA</p>
                        <p className="font-medium">{studentProfile.gpa ?? 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('university') && (
                      <div className="rounded-lg border p-4 md:col-span-2">
                        <p className="text-sm text-muted-foreground">University</p>
                        <p className="font-medium">{studentProfile.university || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('courses') && (
                      <div className="rounded-lg border p-4 md:col-span-2">
                        <p className="text-sm text-muted-foreground">Courses</p>
                        <p>{studentProfile.completed_courses || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('skills') && (
                      <div className="rounded-lg border p-4 md:col-span-2">
                        <p className="text-sm text-muted-foreground">Skills</p>
                        <p>{studentProfile.self_reported_skills || 'Not added'}</p>
                      </div>
                    )}

                    {canShowField('transcript_file') && studentProfile.transcript_file_name && (
                      <div className="rounded-lg border p-4 md:col-span-2">
                        <p className="text-sm text-muted-foreground">Transcript File</p>

                        {getTranscriptFileUrl() ? (
                          <a
                            href={getTranscriptFileUrl() || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-primary underline"
                          >
                            <FileText className="h-4 w-4" />
                            {studentProfile.transcript_file_name}
                          </a>
                        ) : (
                          <p>{studentProfile.transcript_file_name}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Pending Requests</CardTitle>
              <CardDescription>Students requesting your mentorship</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {requests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No pending requests.</p>
              ) : (
                requests.map((request) => {
                  const student = getStudent(request.student_id)
                  const studentName = getStudentName(student)

                  return (
                    <div key={request.id} className="rounded-lg border bg-muted/30 p-4">
                      <div className="mb-3 flex items-start gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="font-semibold">{studentName}</h4>
                            <Badge variant="secondary">Pending</Badge>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {student?.major || 'No major added'}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <p className="mb-4 text-sm italic text-muted-foreground">
                        "{request.message || 'No message provided.'}"
                      </p>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => viewStudentProfile(request)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </Button>

                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAccept(request)}
                          disabled={updatingRequestId === request.id}
                        >
                          {updatingRequestId === request.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Accept
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleDecline(request)}
                          disabled={updatingRequestId === request.id}
                        >
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Mentees</CardTitle>
              <CardDescription>Accepted mentorship connections</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {acceptedRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">No current mentees.</p>
              ) : (
                acceptedRequests.map((request) => {
                  const student = getStudent(request.student_id)
                  const studentName = getStudentName(student)

                  return (
                    <div key={request.id} className="flex items-center gap-4 rounded-lg border p-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>{getInitials(studentName)}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h4 className="font-semibold">{studentName}</h4>

                        <p className="text-sm text-muted-foreground">
                          {student?.major || 'Accepted mentorship'}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewStudentProfile(request)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Profile
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('/mentor-chat')}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStudent(request)}
                          disabled={removingId === request.id}
                        >
                          {removingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}