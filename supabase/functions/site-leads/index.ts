const PUBLIC_KEY = "sb_publishable_bIwx5UgckFzhmmizdO-HaA_0wqoiol3";
const origins = new Set(["https://www.anainstitutodeeducacao.com.br","https://anainstitutodeeducacao.com.br","https://instituto-ana-estatico.vercel.app"]);
const courses = new Set(["Outros","Desenho Técnico + Promob","Designer de Interiores","Social Media","Tráfego Pago","Formação para Vereadores"]);
Deno.serve(async (req: Request) => {
 const origin=req.headers.get("origin") || "";
 const headers:Record<string,string>={"Content-Type":"application/json","Cache-Control":"no-store","Vary":"Origin"};
 if(origins.has(origin)) Object.assign(headers,{"Access-Control-Allow-Origin":origin,"Access-Control-Allow-Headers":"apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"});
 const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers});
 if(!origins.has(origin)) return reply(403,"Origem não permitida.");
 if(req.method==="OPTIONS") return new Response(null,{status:204,headers});
 if(req.method!=="POST") return reply(405,"Método não permitido.");
 // Public application key scopes the intake endpoint; it does not grant database access.
 if(req.headers.get("apikey")!==PUBLIC_KEY) return reply(401,"Chave inválida.");
 if(!req.headers.get("content-type")?.startsWith("application/json")) return reply(415,"Formato inválido.");
 try {
  if(Number(req.headers.get("content-length")||0)>8192) return reply(413,"Formulário muito grande.");
  const reader=req.body?.getReader(); if(!reader) return reply(400,"Formulário vazio.");
  const chunks:Uint8Array[]=[]; let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return reply(413,"Formulário muito grande.");}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  let d;try{d=JSON.parse(new TextDecoder().decode(bytes));}catch{return reply(400,"Formulário inválido.");}
  if(!d || typeof d!=="object" || Array.isArray(d)) return reply(400,"Formulário inválido.");
  const str=(key:string)=>typeof d[key]==="string"?d[key].trim():"";
  const name=str("name"),phone=str("phone").replace(/\D/g,""),email=str("email").toLowerCase(),course=str("course"),id=str("submission_id"),path=str("page_path");
  if(str("website"))return reply(400,"Não foi possível enviar.");
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) || name.length<2 || name.length>120 || phone.length<10 || phone.length>15 || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !courses.has(course) || d.consent!==true || !path.startsWith("/") || path.length>250 || /[?#]/.test(path)) return reply(400,"Confira nome, telefone, e-mail e autorização de contato.");
  const attribution:Record<string,string>={};
  for(const key of ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","campaign_id","ad_id","adset_id"]){
   if(typeof d.attribution?.[key]==="string") attribution[key]=d.attribution[key].slice(0,200);
  }
  const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(email));
  const bucket=Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,"0")).join("");
  const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");
  const secret=keys.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiHeaders:Record<string,string>={"Content-Type":"application/json","apikey":secret};
  if(!keys.default)apiHeaders.Authorization="Bearer "+secret;
  const response=await fetch(Deno.env.get("SUPABASE_URL")+"/rest/v1/rpc/submit_website_lead",{method:"POST",headers:apiHeaders,body:JSON.stringify({p_submission_id:id,p_name:name,p_phone:phone,p_email:email,p_course:course,p_page_path:path,p_attribution:attribution,p_bucket:bucket})});
  if(!response.ok){const error=await response.text();if(error.includes("rate_limit"))return reply(429,"Muitas tentativas. Aguarde ou fale conosco pelo WhatsApp.");console.error("lead_storage_error",response.status);return reply(503,"Não foi possível salvar. Tente novamente.");}
  return reply(200,"Interesse registrado! Nossa equipe entrará em contato.");
 }catch{console.error("lead_intake_error");return reply(503,"Não foi possível salvar. Tente novamente.");}
});
