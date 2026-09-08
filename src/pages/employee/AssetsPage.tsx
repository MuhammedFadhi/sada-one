import { useMyAssets } from '@/hooks/useData'
import { StatusBar, PageContent, EmptyState, SkeletonList } from '@/components/ui'
import { formatDateShort } from '@/lib/dates'

const ASSET_ICONS: Record<string,string> = { laptop:'device-laptop', mobile:'device-mobile', vehicle:'car', tablet:'device-tablet', printer:'printer', equipment:'tool', other:'box' }
const ASSET_COLORS: Record<string,string> = { laptop:'#17B8D0', mobile:'#7F77DD', vehicle:'#C8A96E', tablet:'#1D9E75', printer:'#E67E22', equipment:'#E24B4A', other:'#718096' }
const COND_COLORS: Record<string,string> = { good:'#1D9E75', fair:'#E67E22', damaged:'#E24B4A' }

export function MyAssetsPage() {
  const { data: assets, isLoading } = useMyAssets()

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{background:'#0D1B2A',paddingBottom:16}}>
        <StatusBar />
        <div style={{padding:'4px 16px 0'}}><h1 style={{color:'white',fontSize:17,fontWeight:700}}>My Assets</h1></div>
      </div>
      <PageContent>
        <div style={{background:'#EBF8FF',borderRadius:10,padding:'10px 14px',marginBottom:14,fontSize:12,color:'#17B8D0',lineHeight:1.6}}>
          <i className="ti ti-info-circle" style={{marginRight:6}} />
          These are company assets currently assigned to you. Report any damage to HR immediately.
        </div>
        {isLoading && <SkeletonList />}
        {!isLoading && !assets?.length && <EmptyState icon="box-off" title="No assets assigned" subtitle="Company assets assigned to you will appear here." />}
        {assets?.map((a:any)=>{
          const color = ASSET_COLORS[a.asset_type]??'#718096'
          return (
            <div key={a.id} style={{background:'white',borderRadius:14,padding:14,marginBottom:10,boxShadow:'0 1px 4px rgba(0,0,0,.06)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{width:46,height:46,borderRadius:12,background:color+'18',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <i className={`ti ti-${ASSET_ICONS[a.asset_type]??'box'}`} style={{color,fontSize:22}} />
                </div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:'#1A202C'}}>{a.name}</div>
                  <div style={{fontSize:11,color:'#718096',marginTop:2}}>{a.brand} {a.model}</div>
                </div>
                <span className="badge" style={{background:(COND_COLORS[a.condition]??'#CBD5E0')+'18',color:COND_COLORS[a.condition]??'#CBD5E0',textTransform:'capitalize'}}>{a.condition}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[{label:'Asset #',val:a.asset_number},{label:'Type',val:a.asset_type},{label:'Serial #',val:a.serial_number??'—'},{label:'Assigned',val:a.assigned_date?formatDateShort(a.assigned_date):'—'}].map((x,i)=>(
                  <div key={i} style={{background:'#F4F6F9',borderRadius:8,padding:'8px 10px'}}>
                    <div style={{fontSize:10,color:'#718096'}}>{x.label}</div>
                    <div style={{fontSize:12,fontWeight:500,color:'#1A202C',marginTop:2}}>{x.val}</div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </PageContent>
    </div>
  )
}
