import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  let authUserCriadoId: string | null = null;

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

    // Confirma que quem está fazendo a operação é um responsável ativo.
    const { data: responsavel, error: responsavelError } = await supabaseAdmin
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
        {
          error:
            "Apenas um responsável ativo pode preparar o acesso infantil.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const perfilFilhoId = body?.perfilFilhoId;

    if (typeof perfilFilhoId !== "string" || !perfilFilhoId) {
      return NextResponse.json(
        { error: "perfilFilhoId é obrigatório." },
        { status: 400 }
      );
    }

    // O filtro pela família impede preparar um filho de outra família.
    const { data: filho, error: filhoError } = await supabaseAdmin
      .from("perfis")
      .select("id, nome, familia_id, auth_user_id, tipo, ativo")
      .eq("id", perfilFilhoId)
      .eq("familia_id", responsavel.familia_id)
      .eq("tipo", "filho")
      .eq("ativo", true)
      .maybeSingle();

    if (filhoError) {
      throw filhoError;
    }

    if (!filho) {
      return NextResponse.json(
        { error: "Filho não encontrado ou não pertence à sua família." },
        { status: 404 }
      );
    }

    // Se já existe vínculo, a operação é idempotente:
    // não cria uma segunda identidade Auth.
    if (filho.auth_user_id) {
      return NextResponse.json({
        ok: true,
        filho: {
          id: filho.id,
          nome: filho.nome,
          acessoPreparado: true,
        },
      });
    }

    /*
     * A criança não precisa conhecer e-mail ou senha.
     * Estes dados existem apenas como credenciais técnicas internas do Auth.
     *
     * O PIN NÃO é usado como senha.
     */
    const emailInterno = `child-${filho.id}@mesadakids.invalid`;
    const senhaInterna = randomBytes(48).toString("base64url");

    const {
      data: authData,
      error: authError,
    } = await supabaseAdmin.auth.admin.createUser({
      email: emailInterno,
      password: senhaInterna,
      email_confirm: true,
      user_metadata: {
        perfil_id: filho.id,
        familia_id: filho.familia_id,
        tipo: "filho",
      },
    });

    if (authError || !authData.user) {
      throw authError ?? new Error("Não foi possível criar o usuário Auth.");
    }

    authUserCriadoId = authData.user.id;

    // Vincula a identidade Auth recém-criada ao perfil infantil.
    const { error: vinculoError } = await supabaseAdmin
      .from("perfis")
      .update({
        auth_user_id: authUserCriadoId,
      })
      .eq("id", filho.id)
      .eq("familia_id", responsavel.familia_id)
      .is("auth_user_id", null);

    if (vinculoError) {
      throw vinculoError;
    }

    // Confirma que o vínculo realmente aconteceu.
    const { data: perfilVinculado, error: verificacaoError } =
      await supabaseAdmin
        .from("perfis")
        .select("auth_user_id")
        .eq("id", filho.id)
        .maybeSingle();

    if (verificacaoError) {
      throw verificacaoError;
    }

    if (perfilVinculado?.auth_user_id !== authUserCriadoId) {
      throw new Error("Não foi possível confirmar o vínculo da conta infantil.");
    }

    return NextResponse.json({
      ok: true,
      filho: {
        id: filho.id,
        nome: filho.nome,
        acessoPreparado: true,
      },
    });
  } catch (error) {
    console.error("Erro em preparar-acesso:", error);

    /*
     * Se o Auth user foi criado, mas o vínculo com perfis falhou,
     * removemos a identidade órfã.
     */
    if (authUserCriadoId) {
      const { error: rollbackError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserCriadoId);

      if (rollbackError) {
        console.error(
          "Erro ao desfazer criação do usuário infantil:",
          rollbackError
        );
      }
    }

    return NextResponse.json(
      { error: "Não foi possível preparar o acesso infantil." },
      { status: 500 }
    );
  }
}