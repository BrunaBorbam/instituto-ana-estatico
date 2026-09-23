# Instituto Ana — captação de interessados

Projeto Supabase: llbisfkatpgkothsetso (São Paulo).
Consulta administrativa: https://supabase.com/dashboard/project/llbisfkatpgkothsetso/editor
A tabela leads é acessível apenas por administradores do projeto e pelo backend. Não há painel público nem login de alunos com acesso aos contatos.

## Funcionando
- Endpoint POST /functions/v1/site-leads, validando nome, telefone, email, curso e autorização de contato.
- Seis formulários existentes usam assets/js/hello-frontend.js.
- assets/js/wpforms.min.js é um arquivo vazio intencional: o envio legado WordPress foi desativado.
- RLS e privilégios negam leitura e escrita direta a visitantes e usuários comuns.
- Identificador de envio evita duplicatas em tentativas repetidas.
- Limite de 5 cadastros por email/hora e 200 no total/hora. Isso é mitigação básica, não substitui CAPTCHA/WAF em caso de abuso.
- Origem e chave pública são verificadas; não são prova da identidade de um visitante.
- Campanhas: parâmetros UTM, campaign_id, ad_id, adset_id presentes na URL do formulário ficam no campo attribution.
- Avisos ficam na tabela lead_notifications com estado aguardando_configuracao. Nenhum email é enviado ainda.
- Os testes usam somente example.invalid; excluir os registros técnicos após validação.

## Conexões ainda necessárias
1. Email: conectar um provedor transacional, verificar o domínio remetente e guardar sua chave como segredo do backend. Destinatário solicitado: instituto.ana.xangrila@gmail.com. Implementar envio/repetição idempotente e só marcar enviado após confirmação do provedor.
2. Meta Lead Ads: conectar a Página e um aplicativo autorizado a recuperar leads. Criar webhook com verificação de assinatura e token, buscar dados no servidor e deduplicar por meta_lead_id. NÃO apontar Meta para site-leads: este endpoint é exclusivo do formulário do site.
3. Somente leads do site estão ativos; formulários instantâneos do Facebook/Instagram ainda não estão integrados.

## Manutenção
- schema.sql registra o esquema inicial aplicado pela migração create_private_lead_intake.
- Código do backend em functions/site-leads/index.ts. Publicar com verificação JWT desativada apenas porque o próprio endpoint verifica a chave da aplicação e aceita somente inclusão validada.
- Segredos: utilizar SUPABASE_SECRET_KEYS ou SUPABASE_SERVICE_ROLE_KEY apenas no ambiente da função; nunca no navegador.
- Restringir membros do projeto e configurar a rotina de backups e retenção antes de ampliar a operação.
- A revisão de SEO, política completa de privacidade, cookies e limpeza do HTML WordPress continua separada desta integração.
- Não cancelar a HostGator até verificar dependências de email, domínio e DNS.
