import { Link, Navigate } from 'react-router-dom'
import { Navbar } from '@/components/layout/Navbar'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminDashboard() {
  const { profile } = useAuth()

  if (profile?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-10">
          Admin Dashboard
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          
          <Link
            to="/admin/students"
            className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow hover:shadow-lg hover:scale-[1.02] transition duration-200"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Students
            </h2>
            <p className="text-gray-500">
              View, edit, and delete student accounts
            </p>
          </Link>

          <Link
            to="/admin/advisors"
            className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow hover:shadow-lg hover:scale-[1.02] transition duration-200"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Advisors
            </h2>
            <p className="text-gray-500">
              Manage advisor accounts
            </p>
          </Link>

          <Link
            to="/admin/mentors"
            className="bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl p-6 shadow hover:shadow-lg hover:scale-[1.02] transition duration-200"
          >
            <h2 className="text-2xl font-semibold mb-2 text-gray-800">
              Mentors
            </h2>
            <p className="text-gray-500">
              Manage mentor accounts
            </p>
          </Link>

        </div>
      </div>
    </div>
  )
}