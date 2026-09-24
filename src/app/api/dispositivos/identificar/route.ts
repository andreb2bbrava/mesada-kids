import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";

const COOKIE_DISPOSITIVO = "mesada_kids_device";

export async function POST(request: NextRequest) {
  try {
    /*
     * O token não vem mais do JavaScript.
     * Ele é lido diretamente do cookie HttpOnly
     * criado quando o responsável configurou o aparelho.
     */
    const token = request.cookies.get(COOKIE_DISPOSITIVO)?.value ?? "";

    if (!token) {
      return NextResponse.json(
        {
          error: "Este aparelho ainda não foi configurado para acesso infantil.",
        },
        { status: 401 }
      );
    }

    /*
     * O banco nunca recebe o token original para armazenamento.
     * Calculamos o SHA-256 e procuramos apenas pelo hash.
     */
    const { data: tokenHash, error: hashError } =
      await supabaseAdmin.rpc(
        "hash_token_dispositivo",
        {
          p_token: token,
        }
      );

    if (hashError || !tokenHash) {
      throw (
        hashError ??
        new Error("Não foi possível processar o token do dispositivo.")
      );
    }

    /*
     * Localiza somente um dispositivo ativo.
     */
    const { data: dispositivo, error: dispositivoError } =
      await supabaseAdmin
        .from("dispositivos_familia")
        .select("id,familia_id,nome,tipo,ativo")
        .eq("token_hash", tokenHash)
        .eq("ativo", true)
        .maybeSingle();

    if (dispositivoError) {
      throw dispositivoError;
    }

    if (!dispositivo) {
      return NextResponse.json(
        {
          error: "Dispositivo não reconhecido ou revogado.",
        },
        { status: 401 }
      );
    }

    /*
     * Registra quando este aparelho foi utilizado pela última vez.
     */
    const { error: updateError } = await supabaseAdmin
      .from("dispositivos_familia")
      .update({
        ultimo_acesso_em: new Date().toISOString(),
      })
      .eq("id", dispositivo.id);

    if (updateError) {
      throw updateError;
    }

    /*
     * O familia_id nunca vem do navegador.
     * Ele é obtido exclusivamente através do dispositivo vinculado.
     */
    const { data: filhos, error: filhosError } =
      await supabaseAdmin
        .from("perfis")
        .select(
          "id,nome,ativo,auth_user_id,pin_hash"
        )
        .eq("familia_id", dispositivo.familia_id)
        .eq("tipo", "filho")
        .eq("ativo", true)
        .order("nome");

    if (filhosError) {
      throw filhosError;
    }

    /*
     * O pin_hash é utilizado somente no servidor
     * para sabermos se a criança já possui PIN.
     *
     * Ele NUNCA é devolvido para o navegador.
     */
    const filhosDisponiveis = (filhos ?? []).map((filho) => ({
      id: filho.id,
      nome: filho.nome,
      pinConfigurado: Boolean(filho.pin_hash),
      acessoConfigurado: Boolean(filho.auth_user_id),
    }));

    return NextResponse.json({
      ok: true,

      dispositivo: {
        id: dispositivo.id,
        nome: dispositivo.nome,
        tipo: dispositivo.tipo,
      },

      filhos: filhosDisponiveis,
    });
  } catch (error) {
    console.error(
      "Erro ao identificar dispositivo:",
      error
    );

    return NextResponse.json(
      {
        error: "Não foi possível identificar o dispositivo.",
      },
      { status: 500 }
    );
  }
}