import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Usuário não autenticado." },
        { status: 401 }
      );
    }

    // Confirma que o usuário autenticado é um responsável ativo.
    const { data: responsavel, error: responsavelError } =
      await supabaseAdmin
        .from("perfis")
        .select("id, familia_id, tipo, ativo")
        .eq("auth_user_id", user.id)
        .eq("tipo", "responsavel")
        .eq("ativo", true)
        .maybeSingle();

    if (responsavelError) {
      throw responsavelError;
    }

    if (!responsavel) {
      return NextResponse.json(
        { error: "Apenas um responsável pode vincular dispositivos." },
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
        { error: "Informe um nome válido para o dispositivo." },
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
        { error: "Tipo de dispositivo inválido." },
        { status: 400 }
      );
    }

    // Gera um token secreto forte para este aparelho.
    // O token original não será armazenado no banco.
    const token = randomBytes(32).toString("base64url");

    // Armazena somente o hash do token.
    const { data: tokenHash, error: hashError } =
      await supabaseAdmin.rpc(
        "hash_token_dispositivo",
        {
          p_token: token,
        }
      );

    if (hashError || !tokenHash) {
      throw hashError ??
        new Error("Não foi possível gerar o hash do token.");
    }

    // A família vem da sessão do responsável.
    // O navegador nunca escolhe o familia_id.
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
        .select("id,nome,tipo,ativo,created_at")
        .single();

    if (dispositivoError) {
      throw dispositivoError;
    }

    // O token original é devolvido apenas neste momento.
    // Depois ele será armazenado de forma segura no aparelho.
    return NextResponse.json({
      ok: true,
      dispositivo,
      token,
    });
  } catch (error) {
    console.error("Erro ao vincular dispositivo:", error);

    return NextResponse.json(
      { error: "Não foi possível vincular o dispositivo." },
      { status: 500 }
    );
  }
}