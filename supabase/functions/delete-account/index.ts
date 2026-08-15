import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userError } = await admin.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Empresa do usuário e se ele é o único administrador
    const { data: profile } = await admin
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    const companyId = profile?.company_id ?? null;

    const { data: admins } = companyId
      ? await admin
        .from("user_roles")
        .select("user_id")
        .eq("company_id", companyId)
        .eq("role", "admin")
      : { data: [] as { user_id: string }[] };

    const isSoleAdmin = !!companyId &&
      (admins ?? []).length === 1 &&
      (admins ?? [])[0]?.user_id === userId;

    if (isSoleAdmin) {
      // Único admin: remove todos os dados da empresa e todos os usuários vinculados
      const { data: members } = await admin
        .from("profiles")
        .select("id")
        .eq("company_id", companyId);

      await admin.from("cash_movements").delete().eq("company_id", companyId);
      await admin.from("cash_registers").delete().eq("company_id", companyId);
      await admin.from("sale_items").delete().eq("company_id", companyId);
      await admin.from("sales").delete().eq("company_id", companyId);
      await admin.from("products").delete().eq("company_id", companyId);
      await admin.from("categories").delete().eq("company_id", companyId);
      await admin.from("suppliers").delete().eq("company_id", companyId);
      await admin.from("company_invites").delete().eq("company_id", companyId);
      await admin.from("subscription_payments").delete().eq("company_id", companyId);
      await admin.from("subscriptions").delete().eq("company_id", companyId);
      await admin.from("user_roles").delete().eq("company_id", companyId);

      for (const member of members ?? []) {
        await admin.from("profiles").delete().eq("id", member.id);
        await admin.auth.admin.deleteUser(member.id);
      }

      await admin.from("companies").delete().eq("id", companyId);
    } else {
      // Funcionário: sai da empresa, dados operacionais da empresa permanecem
      await admin.from("sales").update({ user_id: null }).eq("user_id", userId);
      await admin.from("cash_movements").update({ user_id: null }).eq("user_id", userId);
      await admin.from("cash_registers").delete().eq("user_id", userId).eq("is_open", false).is(
        "closed_at",
        null,
      );
      await admin.from("user_roles").delete().eq("user_id", userId);
      await admin.from("profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }

    return new Response(JSON.stringify({ success: true, deletedCompany: isSoleAdmin }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
