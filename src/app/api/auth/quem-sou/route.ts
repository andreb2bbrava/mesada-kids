import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          autenticado: false,
          error: "Nenhum usuário autenticado.",
        },
        { status: 401 }
      );
    }

    const { data: perfil, error: perfilError } = await supabase
      .from("perfis")
      .select("id,nome,tipo,ativo,auth_user_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (perfilError) {
      throw perfilError;
    }

    return NextResponse.json({
      autenticado: true,
      authUserId: user.id,
      perfil: perfil
        ? {
            id: perfil.id,
            nome: perfil.nome,
            tipo: perfil.tipo,
            ativo: perfil.ativo,
            authUserId: perfil.auth_user_id,
          }
        : null,
    });
  } catch (error) {
    console.error("Erro em quem-sou:", error);

    return NextResponse.json(
      { error: "Não foi possível identificar a sessão." },
      { status: 500 }
    );
  }
}