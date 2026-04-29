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

type Advisor = {
  id: string
  user_id: string
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
  professional_id: string
  status: string
}

export default function Advisors() {
  const { user } = useAuth()

  const [searchQuery, setSearchQuery] = useState('')
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [requests, setRequests] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [selectedAdvisor, setSelectedAdvisor] = useState<Advisor | null>(null)

  useEffect(() => {
    loadData()
  }, [user?.id])

  const loadData = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: advisorData } = await (supabase as any)
      .from('professional_profiles')
      .select('*')
      .eq('role', 'advisor')
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    const { data: requestData } = await (supabase as any)
      .from('connection_requests')
      .select('id, professional_id, status')
      .eq('student_id', user.id)
      .eq('professional_role', 'advisor')

    setAdvisors(advisorData || [])
    setRequests(requestData || [])
    setLoading(false)
  }

  const getRequest = (advisorId: string) => {
    return requests.find((item) => item.professional_id === advisorId)
  }

  const sendRequest = async (advisor: Advisor) => {
    if (!user?.id) return

    setSendingId(advisor.user_id)

    const { error } = await (supabase as any)
      .from('connection_requests')
      .insert({
        student_id: user.id,
        professional_id: advisor.user_id,
        professional_role: 'advisor',
        status: 'pending',
        message: 'I would like advising support.',
      })

    setSendingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success('Advisor request sent')
    loadData()
  }

  const requestAgain = async (advisor: Advisor) => {
    setSendingId(advisor.user_id)

    await (supabase as any)
      .from('connection_requests')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', user?.id)
      .eq('professional_id', advisor.user_id)

    setSendingId(null)
    toast.success('Request sent again')
    loadData()
  }

  const getInitials = (name?: string | null) =>
    (name || 'A')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()

  const filtered = advisors.filter((advisor) => {
    const text = `${advisor.full_name || ''} ${advisor.job_title || ''} ${advisor.company || ''} ${advisor.specialization || ''} ${advisor.skills || ''}`.toLowerCase()

    return text.includes(searchQuery.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Find an Advisor</h1>
          <p className="text-muted-foreground">
            Connect with academic and career advisors.
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

          <Input
            className="pl-10"
            placeholder="Search advisor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {selectedAdvisor && (
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedAdvisor.full_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedAdvisor.job_title}
                  </p>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedAdvisor(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div><b>Company:</b> {selectedAdvisor.company || '-'}</div>
                <div><b>Department:</b> {selectedAdvisor.department || '-'}</div>
                <div><b>Specialization:</b> {selectedAdvisor.specialization || '-'}</div>
                <div><b>Experience:</b> {selectedAdvisor.experience_years || '-'} years</div>
                <div className="md:col-span-2"><b>Bio:</b> {selectedAdvisor.bio || '-'}</div>
                <div className="md:col-span-2"><b>Skills:</b> {selectedAdvisor.skills || '-'}</div>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filtered.map((advisor) => {
              const request = getRequest(advisor.user_id)

              return (
                <Card key={advisor.id}>
                  <CardContent className="p-6">
                    <div className="flex gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarFallback>
                          {getInitials(advisor.full_name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {advisor.full_name}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          {advisor.job_title}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          {advisor.company && (
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {advisor.company}
                            </span>
                          )}

                          {advisor.experience_years && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {advisor.experience_years} years
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground">
                      {advisor.bio || 'No bio added'}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedAdvisor(advisor)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </Button>

                      {advisor.linkedin_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={advisor.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Linkedin className="h-4 w-4" />
                          </a>
                        </Button>
                      )}

                      {!request && (
                        <Button
                          size="sm"
                          onClick={() => sendRequest(advisor)}
                          disabled={sendingId === advisor.user_id}
                        >
                          {sendingId === advisor.user_id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <MessageSquare className="mr-2 h-4 w-4" />
                          )}
                          Request
                        </Button>
                      )}

                      {request?.status === 'pending' && (
                        <Button size="sm" disabled>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Pending
                        </Button>
                      )}

                      {request?.status === 'rejected' && (
                        <Button
                          size="sm"
                          onClick={() => requestAgain(advisor)}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Request Again
                        </Button>
                      )}
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