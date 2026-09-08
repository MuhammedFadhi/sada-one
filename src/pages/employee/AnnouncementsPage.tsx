import { useAnnouncements } from '@/hooks/useData'
import { StatusBar, PageContent, EmptyState, SkeletonList } from '@/components/ui'
import { formatDayMonth } from '@/lib/dates'

const TAG_COLORS: Record<string,{bg:string;color:string}> = {
  holiday: {bg:'#E6FAF0',color:'#1D9E75'}, policy: {bg:'#F5F0FF',color:'#7F77DD'},
  event: {bg:'#EBF8FF',color:'#17B8D0'}, urgent: {bg:'#FFF0F0',color:'#E24B4A'},
  general: {bg:'#F4F6F9',color:'#718096'},
}

export function AnnouncementsPage() {
  const { data: announcements, isLoading } = useAnnouncements()
  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>Announcements</h1></div>
      </div>
      <PageContent>
        {isLoading && <SkeletonList />}
        {!isLoading && !announcements?.length && <EmptyState icon="speakerphone" title="No announcements" subtitle="Company announcements will appear here." />}
        {announcements?.map(ann=>{
          const tc = TAG_COLORS[ann.tag]??TAG_COLORS.general
          return (
            <div key={ann.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)', borderLeft:ann.tag==='urgent'?'3px solid #E24B4A':'none'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span className="badge" style={{background:tc.bg,color:tc.color}}>{ann.tag}</span>
                <span style={{fontSize:11,color:'#CBD5E0'}}>{formatDayMonth(ann.published_at)}</span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:'#1A202C',marginBottom:6}}>{ann.title_en}</div>
              <div style={{fontSize:12,color:'#718096',lineHeight:1.6}}>{ann.body_en}</div>
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
