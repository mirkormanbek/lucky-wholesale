// First-party aggregate analytics. No cookies, customer details or full URLs.
const endpoint=new URL("./traffic.php",import.meta.url);
let memory=null;
const clean=v=>typeof v==="string"&&/^[\p{L}\p{N}_.-]{1,64}$/u.test(v)&&!/[0-9]{7,}/.test(v)?v:"";
function session(){
 const now=Date.now();let value=memory;try{value=JSON.parse(localStorage.getItem("lucky-traffic-session")||"null")||value;}catch{}
 if(!value||!/^[-a-z0-9]{20,64}$/i.test(value.id)||now-value.at>1800000){
  const q=new URL(location.href).searchParams;let ref="";try{const u=new URL(document.referrer);if(u.hostname!==location.hostname)ref=u.hostname.toLowerCase();}catch{}
  value={id:crypto.randomUUID(),at:now,source:clean(q.get("utm_source"))||(ref&&/^[a-z0-9.-]{1,100}$/.test(ref)?ref:"direct"),medium:clean(q.get("utm_medium")),campaign:clean(q.get("utm_campaign"))};
 }
 value.at=now;memory=value;try{localStorage.setItem("lucky-traffic-session",JSON.stringify(value));}catch{}return value;
}
export function track(event,id=""){
 try{
  if(navigator.doNotTrack==="1"||navigator.globalPrivacyControl===true||localStorage.getItem("lucky-traffic-excluded")==="1")return;
  const s=session();const body={event,id,session:s.id,source:s.source,medium:s.medium,campaign:s.campaign,device:/iPad|Tablet/i.test(navigator.userAgent)?"tablet":/Mobi|Android/i.test(navigator.userAgent)?"mobile":"desktop"};
  fetch(endpoint,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json","X-Requested-With":"LuckyTraffic"},body:JSON.stringify(body),keepalive:true}).catch(()=>{});
 }catch{} // Analytics must never interrupt shopping.
}
track("page_view");
const initial=new URL(location.href).searchParams;
if(initial.get("category"))track("category_view",initial.get("category"));
if(initial.get("productType"))track("type_view",initial.get("productType"));
document.addEventListener("click",e=>{const a=e.target.closest?.("a[href]");if(!a)return;try{const u=new URL(a.href);if(u.hostname==="wa.me"||u.hostname==="api.whatsapp.com")track("whatsapp_click");}catch{}});
