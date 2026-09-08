import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmployees } from '@/hooks/useData'
import { StatusBar, PageContent, Avatar, SearchBar, EmptyState, StatusBadge, SkeletonList } from '@/components/ui'
import { statusLabel } from '@/lib/labels'

const STATUS_FILTERS = ['all','active','on_leave','suspended','offboarding']

export function EmployeesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')

  const { data: employees, isLoading } = useEmployees({
    status: statusFilter==='all'?undefined:statusFilter,
    search: search||undefined,
  })

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <h1 style={{color:'white',fontSize:17,fontWeight:700}}>Employees</h1>
          <div style={{display:'flex',gap:8}}>
            <button onClick={()=>navigate('/hr/employees/import')} title="Bulk import from CSV"
              style={{background:'rgba(255,255,255,.12)',border:'none',borderRadius:8,padding:'6px 12px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
              <i className="ti ti-upload" /> Import
            </button>
            <button onClick={()=>navigate('/hr/employees/new')}
              style={{background:'#17B8D0',border:'none',borderRadius:8,padding:'6px 14px',color:'white',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
              <i className="ti ti-user-plus" /> Add
            </button>
          </div>
        </div>
      </div>
      <PageContent>
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name..." />
        <div style={{display:'flex',gap:6,marginBottom:12,overflowX:'auto',paddingBottom:2}}>
          {STATUS_FILTERS.map(s=>(
            <button key={s} onClick={()=>setStatusFilter(s)}
              style={{whiteSpace:'nowrap',padding:'5px 12px',borderRadius:20,border:'none',background:statusFilter===s?'#17294A':'white',color:statusFilter===s?'white':'#718096',fontSize:11,fontWeight:500,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 1px 4px rgba(0,0,0,.06)',textTransform:'capitalize'}}>
              {statusLabel(s)}
            </button>
          ))}
        </div>
        <div style={{fontSize:11,color:'#718096',marginBottom:8}}>{employees?.length??0} employees</div>
        {isLoading && <SkeletonList />}
        {!isLoading && !employees?.length && <EmptyState icon="users-off" title="No employees found" subtitle="Try a different search or filter." />}
        {employees?.map(emp=>(
          <div key={emp.id} onClick={()=>navigate(`/hr/employees/${emp.id}`)}
            style={{background:'white',borderRadius:14,padding:12,display:'flex',alignItems:'center',gap:12,marginBottom:8,cursor:'pointer',boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
            <Avatar name={emp.full_name_en} size={40} />
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:600,color:'#1A202C',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{emp.full_name_en}</div>
              <div style={{fontSize:11,color:'#718096',marginTop:2}}>{emp.job_title_en}</div>
              <div style={{fontSize:10,color:'#CBD5E0'}}>{emp.division?.name_en} · {emp.employee_number}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
              <StatusBadge status={emp.status} />
              <i className="ti ti-chevron-right" style={{color:'#CBD5E0',fontSize:16}} />
            </div>
          </div>
        ))}
      </PageContent>
    </div>
  )
}
