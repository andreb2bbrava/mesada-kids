import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const COOKIE_DISPOSITIVO = "mesada_kids_device";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Responsável não autenticado." },
        { status: 401 }
      );
    }

    const { data: responsavel, error: responsavelError } =
      await supabaseAdmin
        .from("perfis")
        .select("id,familia_id,tipo,ativo")
        .eq("auth_user_id", user.id)
        .eq("tipo", "responsavel")
        .eq("ativo", true)
        .maybeSingle();

    if (responsavelError) {
      throw responsavelError;
    }

    if (!responsavel) {
      return NextResponse.json(
        { error: "Apenas um responsável pode configurar este aparelho." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const nome =
      typeof body?.nome === "string"
        ? body.nome.trim()
        : "";

    const tipo =
      typeof body?.tipo === "string"
        ? body.tipo
        : "outro";

    if (!nome || nome.length > 100) {
      return NextResponse.json(
        { error: "Informe um nome válido para o aparelho." },
        { status: 400 }
      );
    }

    const tiposPermitidos = [
      "celular",
      "tablet",
      "computador",
      "outro",
    ];

    if (!tiposPermitidos.includes(tipo)) {
      return NextResponse.json(
        { error: "Tipo de aparelho inválido." },
        { status: 400 }
      );
    }

    /*
     * Token secreto de alta entropia.
     * Somente o hash será armazenado no banco.
     */
    const token = randomBytes(32).toString("base64url");

    const { data: tokenHash, error: hashError } =
      await supabaseAdmin.rpc(
        "hash_token_dispositivo",
        {
          p_token: token,
        }
      );

    if (hashError || !tokenHash) {
      throw hashError ??
        new Error("Não foi possível proteger o token do aparelho.");
    }

    /*
     * O familia_id vem exclusivamente da sessão do responsável.
     */
    const { data: dispositivo, error: dispositivoError } =
      await supabaseAdmin
        .from("dispositivos_familia")
        .insert({
          familia_id: responsavel.familia_id,
          nome,
          tipo,
          token_hash: tokenHash,
          ativo: true,
          ultimo_acesso_em: new Date().toISOString(),
        })
        .select("id,nome,tipo,ativo")
        .single();

    if (dispositivoError) {
      throw dispositivoError;
    }

    const response = NextResponse.json({
      ok: true,
      dispositivo: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        tipo: dispositivo.tipo,
        ativo: dispositivo.ativo,
      },
    });

    /*
     * O token fica no aparelho em cookie HttpOnly.
     *
     * JavaScript da página não consegue ler esse cookie.
     * Ele também não aparece na resposta da API.
     */
    response.cookies.set({
      name: COOKIE_DISPOSITIVO,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });

    return response;
  } catch (error) {
    console.error(
      "Erro ao configurar aparelho infantil:",
      error
    );

    return NextResponse.json(
      {
        error: "Não foi possível configurar este aparelho.",
      },
      { status: 500 }
    );
  }
}