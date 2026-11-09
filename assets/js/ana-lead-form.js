/* Instituto Ana: formulário de interesse sem dependência do WordPress.
 * A chave pública identifica o site; todas as gravações passam pela Edge Function
 * site-leads, com validação, RLS e limitação de tentativas no servidor. */
(function () {
  "use strict";
  var ENDPOINT = "https://llbisfkatpgkothsetso.supabase.co/functions/v1/site-leads";
  var PUBLIC_KEY = "sb_publishable_bIwx5UgckFzhmmizdO-HaA_0wqoiol3";
  var ATTRIBUTION = ["utm_source", "utm_medium", "utm_campaign", "utm_content",
                     "utm_term", "campaign_id", "ad_id", "adset_id"];

  function showMessage(element, message, success) {
    if (!element) return;
    element.textContent = message;
    element.classList.remove("ana-lead-success", "ana-lead-error");
    element.classList.add(success ? "ana-lead-success" : "ana-lead-error");
    element.setAttribute("role", success ? "status" : "alert");
  }

  function attribution() {
    var query = new URLSearchParams(window.location.search);
    var data = {};
    ATTRIBUTION.forEach(function (key) {
      var value = query.get(key);
      if (value) data[key] = value.slice(0, 200);
    });
    return data;
  }

  document.querySelectorAll("form.ana-lead-form").forEach(function (form) {
    var submit = form.querySelector('button[type="submit"]');
    var message = form.querySelector("[data-lead-status]");
    var submissionId = null;

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;
      if (form.elements.website && form.elements.website.value.trim()) {
        showMessage(message, "Não foi possível enviar. Tente novamente.", false);
        return;
      }

      var name = form.elements.name.value.trim();
      var phone = form.elements.phone.value.replace(/\D/g, "");
      var email = form.elements.email.value.trim().toLowerCase();
      var course = form.elements.course.value;
      if (name.length < 2 || name.length > 120 || phone.length < 10 || phone.length > 15 ||
          email.length > 254 || !form.elements.consent.checked) {
        showMessage(message, "Confira nome, telefone, e-mail e autorização de contato.", false);
        return;
      }
      if (!window.crypto || !window.crypto.randomUUID) {
        showMessage(message, "Seu navegador precisa estar atualizado para enviar este formulário.", false);
        return;
      }
      if (!submissionId) submissionId = window.crypto.randomUUID();
      var payload = {
        submission_id: submissionId,
        name: name, phone: phone, email: email, course: course,
        page_path: window.location.pathname || "/",
        attribution: attribution(),
        website: "",
        consent: true
      };
      submit.disabled = true;
      submit.textContent = "Enviando…";
      showMessage(message, "Enviando seus dados com segurança…", true);

      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 16000);
      try {
        var response = await fetch(ENDPOINT, {
          method: "POST",
          mode: "cors",
          credentials: "omit",
          redirect: "error",
          headers: { "Content-Type": "application/json", "apikey": PUBLIC_KEY },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(
          typeof result.message === "string" && result.message.length < 240
            ? result.message : "Não foi possível enviar. Tente novamente."
        );
        form.reset();
        submissionId = null;
        showMessage(message, "Recebemos seu interesse! Nossa equipe entrará em contato com você.", true);
        message.focus({ preventScroll: true });
      } catch (error) {
        showMessage(message, error.name === "AbortError"
          ? "O envio demorou mais que o esperado. Verifique sua conexão e tente novamente."
          : (error instanceof TypeError
            ? "Não foi possível conectar. Verifique sua internet e tente novamente."
            : (error.message || "Não foi possível enviar. Tente novamente.")), false);
      } finally {
        clearTimeout(timeout);
        submit.disabled = false;
        submit.textContent = "Enviar interesse";
      }
    });
  });
})();