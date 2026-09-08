import { useAuthStore } from '@/store/auth.store'
import { AdminLayout } from './AdminLayout'
import { HRLayout } from './HRLayout'
import { FinanceLayout } from './FinanceLayout'
import { ManagerLayout } from './ManagerLayout'
import { EmployeeLayout } from './EmployeeLayout'
import { LoadingScreen } from '@/components/ui/LoadingScreen'
import { PushPrompt } from '@/components/PushPrompt'

/**
 * Renders the bottom-nav layout that matches the current user's role.
 * Used for shared routes (Tasks, Chat, Analytics) so a non-employee never
 * gets dumped into the employee nav — their own nav (and Home) stays intact.
 *
 * A null/unresolved role must NOT fall through to the employee layout:
 * during auth rehydration that would flash the wrong nav for admin/HR/etc.
 */
export function RoleLayout() {
  const { role } = useAuthStore()
  if (!role) return <LoadingScreen />
  const layout =
    role === 'admin'      ? <AdminLayout /> :
    role === 'hr_officer' ? <HRLayout /> :
    role === 'finance'    ? <FinanceLayout /> :
    role === 'manager'    ? <ManagerLayout /> :
                            <EmployeeLayout />
  return (<>{layout}<PushPrompt /></>)
}
