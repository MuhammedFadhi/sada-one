import { useAuthStore } from '@/store/auth.store'
import { useEmployeeDocuments } from '@/hooks/useData'
import { StatusBar, PageContent, EmptyState, formatDate, SkeletonList } from '@/components/ui'

const DOC_ICONS: Record<string,string> = {
  iqama:'id-badge', passport:'passport', medical_insurance:'heart-rate-monitor',
  work_contract:'file-text', degree_certificate:'certificate', driving_license:'car', other:'file'
}
const DOC_COLORS: Record<string,string> = {
  iqama:'#17B8D0', passport:'#7F77DD', medical_insurance:'#E24B4A',
  work_contract:'#1D9E75', degree_certificate:'#C8A96E', driving_license:'#E67E22', other:'#718096'
}

export function DocumentsPage() {
  const { profile } = useAuthStore()
  const { data: docs, isLoading } = useEmployeeDocuments(profile?.employee_id ?? '')

  const getDaysUntil = (date: string) => Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
  const getStatus = (days: number) => days < 0 ? 'expired' : days < 30 ? 'critical' : days < 90 ? 'warning' : 'ok'
  const statusColors = { ok:'#1D9E75', warning:'#E67E22', critical:'#E24B4A', expired:'#E24B4A' }
  const statusBgs    = { ok:'#E6FAF0', warning:'#FFF3E0', critical:'#FFF0F0', expired:'#FFF0F0' }
  const statusLabels = { ok:'Valid', warning:'Expiring Soon', critical:'Expiring Critical', expired:'Expired' }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>My Documents</h1></div>
      </div>
      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !docs?.length && <EmptyState icon="file-off" title="No documents" subtitle="Your HR documents will appear here once uploaded by HR." />}
        {docs?.map(doc => {
          const days   = doc.expiry_date ? getDaysUntil(doc.expiry_date) : null
          const status = days !== null ? getStatus(days) : 'ok'
          const color  = DOC_COLORS[doc.doc_type] ?? '#718096'
          return (
            <div key={doc.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:doc.expiry_date?10:0}}>
                <div style={{width:44,height:44,borderRadius:12,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={`ti ti-${DOC_ICONS[doc.doc_type]??'file'}`} style={{color,fontSize:22}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{doc.doc_name}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2,textTransform:'capitalize'}}>{doc.doc_type.replace(/_/g,' ')}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
                  {doc.is_verified && <span className="badge badge-success" style={{fontSize:9}}>Verified</span>}
                  {doc.file_url && (
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer"
                      style={{color:'#17B8D0',fontSize:11,textDecoration:'none',display:'flex',alignItems:'center',gap:3}}>
                      <i className="ti ti-download" style={{fontSize:13}} /> View
                    </a>
                  )}
                </div>
              </div>
              {doc.expiry_date && (
                <div style={{background:(statusBgs as any)[status],borderRadius:8,padding:'8px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:10,color:(statusColors as any)[status],fontWeight:600}}>{(statusLabels as any)[status].toUpperCase()}</div>
                    <div style={{fontSize:12,color:(statusColors as any)[status],marginTop:2}}>
                      {days! < 0 ? `Expired ${Math.abs(days!)} days ago` : `${days} days remaining`}
                    </div>
                  </div>
                  <div style={{fontSize:11,color:(statusColors as any)[status],fontWeight:500}}>{formatDate(doc.expiry_date,true)}</div>
                </div>
              )}
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
