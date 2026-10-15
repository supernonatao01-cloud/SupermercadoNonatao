// Configuração pública do Supabase (a chave "anon" é feita para ficar no navegador;
// quem protege os dados são as regras RLS do supabase/schema.sql).
// Enquanto estiver vazio, o site roda em MODO DEMONSTRAÇÃO (dados só no navegador).
window.NONATAO_CONFIG = {
  supabaseUrl: '',   // ex.: https://abcdxyz.supabase.co
  supabaseKey: '',   // chave "anon public" (Project Settings > API)
};
