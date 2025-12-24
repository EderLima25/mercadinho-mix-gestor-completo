# 🚀 Instruções para Configurar o Banco de Dados

## ❌ **Problema Atual:**
O aplicativo está retornando erro 404 porque as tabelas não existem no novo banco Supabase.

## ✅ **Solução:**

### **Passo 1: Acessar o Supabase Dashboard**
1. Vá para: https://supabase.com/dashboard
2. Faça login na sua conta
3. Selecione o projeto: `hfydariofprnuibfoxbf`

### **Passo 2: Executar o Script SQL**
1. No dashboard, clique em **"SQL Editor"** no menu lateral
2. Clique em **"New Query"**
3. Copie todo o conteúdo do arquivo `setup_database.sql`
4. Cole no editor SQL
5. Clique em **"Run"** para executar

### **Passo 3: Verificar se as Tabelas foram Criadas**
1. Vá para **"Table Editor"** no menu lateral
2. Você deve ver as seguintes tabelas:
   - ✅ categories
   - ✅ products  
   - ✅ sales
   - ✅ sale_items
   - ✅ profiles
   - ✅ user_roles

### **Passo 4: Criar Usuário Admin (Opcional)**
1. Primeiro, crie uma conta no aplicativo (registre-se)
2. Após criar a conta, vá para **"Authentication"** > **"Users"**
3. Copie o **User ID** do seu usuário
4. Volte ao **SQL Editor** e execute:
```sql
INSERT INTO public.user_roles (user_id, role) 
VALUES ('SEU_USER_ID_AQUI', 'admin');
```

### **Passo 5: Testar o Aplicativo**
1. Recarregue a página do aplicativo
2. Faça login com sua conta
3. Teste as funcionalidades:
   - ✅ Dashboard deve carregar
   - ✅ Produtos deve mostrar produtos de exemplo
   - ✅ PDV deve funcionar
   - ✅ Todas as seções devem funcionar

## 🔧 **Configurações Aplicadas:**

### **Segurança Melhorada:**
- ✅ RLS (Row Level Security) habilitado
- ✅ Políticas de segurança mais restritivas
- ✅ Apenas managers/admins podem modificar produtos
- ✅ Sistema de roles implementado

### **Dados de Exemplo:**
- ✅ 5 categorias padrão criadas
- ✅ 3 produtos de exemplo
- ✅ Índices para performance

### **Funcionalidades:**
- ✅ Triggers para timestamps automáticos
- ✅ Função para novos usuários
- ✅ Validações de integridade

## 🆘 **Se Ainda Houver Problemas:**

### **Erro de Permissão:**
Se aparecer erro de permissão, execute no SQL Editor:
```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
```

### **Tabelas Não Aparecem:**
1. Verifique se executou o script completo
2. Recarregue o dashboard do Supabase
3. Verifique se não há erros no console do SQL Editor

### **Aplicativo Ainda com Erro 404:**
1. Limpe o cache do navegador (Ctrl+Shift+R)
2. Verifique se o arquivo `.env` está correto
3. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

## 📞 **Suporte:**
Se continuar com problemas, verifique:
- ✅ URL do Supabase está correta
- ✅ Chave pública está correta  
- ✅ Projeto está ativo no Supabase
- ✅ Script SQL foi executado sem erros

Após seguir estes passos, o aplicativo deve funcionar perfeitamente! 🎉