// Configuração pública do Supabase (a chave "anon" é feita para ficar no navegador;
// quem protege os dados são as regras RLS do supabase/schema.sql).
// Enquanto estiver vazio, o site roda em MODO DEMONSTRAÇÃO (dados só no navegador).
window.NONATAO_CONFIG = {
  supabaseUrl: 'https://cgwnyfrhkjyrbnokrxvi.supabase.co',   // ex.: https://abcdxyz.supabase.co
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNnd255ZnJoa2p5cmJub2tyeHZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNzU1MjUsImV4cCI6MjEwNzY1MTUyNX0.NUlM7shWD49nTQ-6A7UnFFZaiAYbCxf8F4bANSo16GM',   // chave pública (anon)
};
