!function(){class e{constructor(){this.initSettings(),this.initElements(),this.bindEvents()}initSettings(){this.settings={selectors:{menuToggle:".site-header .site-navigation-toggle",menuToggleHolder:".site-header .site-navigation-toggle-holder",dropdownMenu:".site-header .site-navigation-dropdown"}}}initElements(){this.elements={window:window,menuToggle:document.querySelector(this.settings.selectors.menuToggle),menuToggleHolder:document.querySelector(this.settings.selectors.menuToggleHolder),dropdownMenu:document.querySelector(this.settings.selectors.dropdownMenu)}}bindEvents(){this.elements.menuToggleHolder&&!this.elements.menuToggleHolder?.classList.contains("hide")&&(this.elements.menuToggle.addEventListener("click",()=>this.handleMenuToggle()),this.elements.dropdownMenu.querySelectorAll(".menu-item-has-children > a").forEach(e=>e.addEventListener("click",e=>this.handleMenuChildren(e))))}closeMenuItems(){this.elements.menuToggleHolder.classList.remove("elementor-active"),this.elements.window.removeEventListener("resize",()=>this.closeMenuItems())}handleMenuToggle(){const e=!this.elements.menuToggleHolder.classList.contains("elementor-active");this.elements.menuToggle.setAttribute("aria-expanded",e),this.elements.dropdownMenu.setAttribute("aria-hidden",!e),this.elements.dropdownMenu.inert=!e,this.elements.menuToggleHolder.classList.toggle("elementor-active",e),this.elements.dropdownMenu.querySelectorAll(".elementor-active").forEach(e=>e.classList.remove("elementor-active")),e?this.elements.window.addEventListener("resize",()=>this.closeMenuItems()):this.elements.window.removeEventListener("resize",()=>this.closeMenuItems())}handleMenuChildren(e){const t=e.currentTarget.parentElement;t?.classList&&t.classList.toggle("elementor-active")}}document.addEventListener("DOMContentLoaded",()=>{new e})}();
/* Instituto Ana: form intake. No private credentials in this file. */
(function () {
 "use strict";
 // Compatibility marker for the exported WordPress script-loaded check.
 window.wpforms = { provider: "instituto-ana-intake" };
 const endpoint="https://llbisfkatpgkothsetso.supabase.co/functions/v1/site-leads";
 const key="sb_publishable_bIwx5UgckFzhmmizdO-HaA_0wqoiol3";
 const pending=new WeakSet(), ids=new WeakMap();
 function setup(){
  document.querySelectorAll("form.wpforms-form").forEach(function(form){
   if(form.dataset.anaIntake)return;
   form.dataset.anaIntake="true";
   form.classList.remove("wpforms-ajax-form","wpforms-validate");
   form.removeAttribute("novalidate");
   form.action=location.pathname;
   const notice=document.createElement("div");notice.style.cssText="margin:16px 0;font-size:14px;line-height:1.5;text-align:left;color:inherit";
   const label=document.createElement("label");label.style.cssText="display:flex;align-items:flex-start;gap:10px;color:inherit";
   const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.name="ana_contact_consent";checkbox.required=true;checkbox.style.cssText="width:18px;height:18px;flex:0 0 18px;margin-top:3px";
   const copy=document.createElement("span");copy.style.cssText="font-size:14px;font-weight:400;line-height:1.5;display:block";copy.textContent="Autorizo o Instituto Ana a usar meu nome, telefone, e-mail e curso de interesse para responder à minha solicitação. Os dados serão armazenados no Supabase. Posso solicitar a exclusão pelo e-mail instituto.ana.xangrila@gmail.com.";
   label.append(checkbox,copy);notice.append(label);
   form.querySelector(".wpforms-submit-container").before(notice);
   const status=document.createElement("p");status.dataset.anaStatus="true";status.setAttribute("role","status");status.setAttribute("aria-live","polite");status.style.cssText="margin:14px 0;line-height:1.5;color:inherit";form.append(status);
   const params=new URLSearchParams(location.search), attribution={};
   ["utm_source","utm_medium","utm_campaign","utm_content","utm_term","campaign_id","ad_id","adset_id"].forEach(k=>{if(params.has(k))attribution[k]=params.get(k).slice(0,200);});
   form.anaAttribution=attribution;
  });
 }
 window.addEventListener("submit",async function(event){
  const form=event.target;
  if(!(form instanceof HTMLFormElement)||!form.matches("form.wpforms-form"))return;
  event.preventDefault();event.stopImmediatePropagation();setup();
  if(pending.has(form)||!form.reportValidity())return;
  const button=form.querySelector('[type="submit"]'), status=form.querySelector("[data-ana-status]");
  const value=n=>String(new FormData(form).get("wpforms[fields]["+n+"]")||"").trim();
  const data={name:value(1),phone:value(2),email:value(3),course:value(4),website:value(5),consent:form.elements.ana_contact_consent.checked,page_path:location.pathname,attribution:form.anaAttribution};
  const fingerprint=JSON.stringify(data),previous=ids.get(form);
  const submission_id=previous?.fingerprint===fingerprint?previous.id:crypto.randomUUID();
  ids.set(form,{fingerprint,id:submission_id});data.submission_id=submission_id;
  pending.add(form);button.disabled=true;const label=button.textContent;button.textContent="Enviando…";status.textContent="";
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json",apikey:key},body:JSON.stringify(data),signal:controller.signal});
   const result=await response.json();
   if(!response.ok)throw new Error(result.message||"Não foi possível registrar.");
   status.textContent=result.message;form.reset();ids.delete(form);
  }catch(error){
   status.textContent=(error.name==="AbortError"?"O envio demorou mais que o esperado. Tente novamente.":error.message)+" Se preferir, fale pelo WhatsApp: (51) 98998-7678.";
  }finally{clearTimeout(timer);pending.delete(form);button.disabled=false;button.textContent=label;}
 },true);
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup);else setup();
})();