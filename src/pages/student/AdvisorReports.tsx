import { useEffect, useState } from 'react'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Loader2, ExternalLink } from 'lucide-react'

type AdvisorReport = {
  id: string
  advisor_id: string
  title: string
  report_type: string | null
  content: string | null
  file_name: string | null
  file_path: string | null
  created_at: string
}

type AdvisorProfile = {
  user_id: string
  full_name: string | null
  job_title: string | null
}

export default function AdvisorReports() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<AdvisorReport[]>([])
  const [advisors, setAdvisors] = useState<AdvisorProfile[]>([])

  useEffect(() => {
    loadReports()
  }, [user?.id])

  const loadReports = async () => {
    if (!user?.id) return

    setLoading(true)

    const { data: reportsData } = await (supabase as any)
      .from('advisor_reports')
      .select('*')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })

    const rows = reportsData || []
    const advisorIds = Array.from(new Set(rows.map((item: AdvisorReport) => item.advisor_id)))

    if (advisorIds.length > 0) {
      const { data: advisorData } = await (supabase as any)
        .from('professional_profiles')
        .select('user_id, full_name, job_title')
        .in('user_id', advisorIds)

      setAdvisors(advisorData || [])
    } else {
      setAdvisors([])
    }

    setReports(rows)
    setLoading(false)
  }

  const getAdvisor = (advisorId: string) => {
    return advisors.find((advisor) => advisor.user_id === advisorId)
  }

  const getFileUrl = (path: string | null) => {
    if (!path) return null

    const {
      data: { publicUrl },
    } = supabase.storage.from('advisor-reports').getPublicUrl(path)

    return publicUrl
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Advisor Reports</h1>
          <p className="text-muted-foreground">
            View reports shared by your advisors.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No reports yet</h2>
              <p className="text-muted-foreground">
                Reports uploaded by your advisor will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5">
            {reports.map((report) => {
              const advisor = getAdvisor(report.advisor_id)
              const fileUrl = getFileUrl(report.file_path)

              return (
                <Card key={report.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <CardTitle>{report.title}</CardTitle>
                        <CardDescription>
                          {advisor?.full_name || 'Advisor'}
                          {advisor?.job_title ? ` • ${advisor.job_title}` : ''}
                        </CardDescription>
                      </div>

                      <Badge variant="secondary">
                        {report.report_type || 'Career Guidance'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {report.content && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {report.content}
                      </p>
                    )}

                    {fileUrl && (
                      <Button asChild variant="outline">
                        <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open Report File
                        </a>
                      </Button>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {new Date(report.created_at).toLocaleString()}
                    </p>
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