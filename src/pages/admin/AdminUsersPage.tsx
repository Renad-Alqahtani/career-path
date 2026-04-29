import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/integrations/supabase/client'

type ManagedRole = 'student' | 'advisor' | 'mentor'

type AdminUsersPageProps = {
  type: ManagedRole
}

interface UserRow {
  id: string
  user_id: string
  name: string
  email: string
  role: 'student' | 'advisor' | 'mentor' | 'admin'
}

export default function AdminUsersPage({ type }: AdminUsersPageProps) {
  const { profile } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ManagedRole>(type)
  const [loading, setLoading] = useState(true)

  const titleMap: Record<ManagedRole, string> = {
    student: 'Student controller',
    advisor: 'Advisor controller',
    mentor: 'Mentor controller',
  }

  const fetchUsers = async () => {
    setLoading(true)

    const { data, error } = await (supabase as any)
      .from('profiles')
      .select('*')
      .eq('role', type)
      .order('created_at', { ascending: true })

    if (error) {
      alert(error.message)
    } else {
      const formattedUsers: UserRow[] = ((data || []) as any[]).map((user) => ({
        id: user.id ?? '',
        user_id: user.user_id ?? '',
        name: user.name ?? '',
        email: user.email ?? '',
        role: (user.role ?? type) as UserRow['role'],
      }))

      setUsers(formattedUsers)
    }

    setLoading(false)
  }

  useEffect(() => {
    void fetchUsers()
  }, [type])

  const selectUser = (user: UserRow) => {
    setSelected(user)
    setName(user.name || '')
    setEmail(user.email || '')
    setRole((user.role === 'admin' ? type : user.role) as ManagedRole)
  }

  const clearForm = () => {
    setSelected(null)
    setName('')
    setEmail('')
    setRole(type)
  }

  const handleUpdate = async () => {
    if (!selected) {
      alert('Choose a user first')
      return
    }

    const { error } = await (supabase as any)
      .from('profiles')
      .update({
        name,
        email,
        role,
      })
      .eq('user_id', selected.user_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('User updated')
    clearForm()
    void fetchUsers()
  }

  const handleDelete = async () => {
    if (!selected) {
      alert('Choose a user first')
      return
    }

    const ok = window.confirm('Delete this user from profiles?')
    if (!ok) return

    const { error } = await (supabase as any)
      .from('profiles')
      .delete()
      .eq('user_id', selected.user_id)

    if (error) {
      alert(error.message)
      return
    }

    alert('User deleted from profiles')
    clearForm()
    void fetchUsers()
  }

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
          <Link
            to="/admin/students"
            className={`px-6 py-3 rounded-xl border font-medium transition ${
              type === 'student'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Students
          </Link>

          <Link
            to="/admin/advisors"
            className={`px-6 py-3 rounded-xl border font-medium transition ${
              type === 'advisor'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Advisors
          </Link>

          <Link
            to="/admin/mentors"
            className={`px-6 py-3 rounded-xl border font-medium transition ${
              type === 'mentor'
                ? 'bg-slate-700 text-white border-slate-700 shadow-sm'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Mentors
          </Link>
        </div>

        <h1 className="text-5xl font-bold text-center text-slate-800 mb-10">
          {titleMap[type]}
        </h1>

        <div className="bg-white/95 border border-slate-200 rounded-2xl p-6 shadow-md">
          <div className="grid lg:grid-cols-[1.6fr_0.9fr] gap-8 items-start">
            <div className="overflow-auto rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-sm border-collapse text-slate-700">
                <thead className="bg-slate-100">
                  <tr className="border-b border-slate-200 font-semibold text-slate-800">
                    <th className="text-left py-4 px-3">ID</th>
                    <th className="text-left py-4 px-3">Name</th>
                    <th className="text-left py-4 px-3">User ID</th>
                    <th className="text-left py-4 px-3">User Type</th>
                    <th className="text-left py-4 px-3">Email</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-3 text-center text-slate-500">
                        Loading...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 px-3 text-center text-slate-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users.map((user, index) => (
                      <tr
                        key={user.id}
                        onClick={() => selectUser(user)}
                        className={`border-b border-slate-200 cursor-pointer transition ${
                          selected?.id === user.id
                            ? 'bg-blue-50'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-3 text-slate-700">{index + 1}</td>
                        <td className="py-3 px-3 text-slate-800 font-medium">{user.name}</td>
                        <td className="py-3 px-3 break-all text-slate-600">{user.user_id}</td>
                        <td className="py-3 px-3 capitalize text-slate-700">{user.role}</td>
                        <td className="py-3 px-3 break-all text-slate-600">{user.email}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <input
                className="w-full border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                className="w-full border border-slate-300 bg-white text-slate-800 placeholder:text-slate-400 rounded-xl px-4 py-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                className="w-full border border-slate-300 bg-slate-50 text-slate-700 placeholder:text-slate-400 rounded-xl px-4 py-3 outline-none"
                placeholder="User ID"
                value={selected?.user_id || ''}
                readOnly
              />

              <select
                className="w-full border border-slate-300 bg-white text-slate-800 rounded-xl px-4 py-3 outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                value={role}
                onChange={(e) => setRole(e.target.value as ManagedRole)}
              >
                <option value="student">Student</option>
                <option value="advisor">Advisor</option>
                <option value="mentor">Mentor</option>
              </select>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="w-full bg-slate-700 hover:bg-slate-800 text-white py-3 rounded-xl font-medium transition"
                >
                  Update user
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition"
                >
                  Delete user
                </button>

                <button
                  type="button"
                  onClick={clearForm}
                  className="w-full bg-slate-500 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition"
                >
                  Clear selection
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}