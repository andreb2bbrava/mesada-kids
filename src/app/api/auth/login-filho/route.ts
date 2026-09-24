import { NextRequest, NextResponse } from "next/server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const perfilFilhoId =
      typeof body?.perfilFilhoId === "string"
        ? body.perfilFilhoId
        : "";

    const pin =
      typeof body?.pin === "string"
        ? body.pin
        : "";

    if (!perfilFilhoId) {
      return NextResponse.json(
        { error: "Filho não informado." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: "O PIN deve conter exatamente 6 números." },
        { status: 400 }
      );
    }

    /*
     * 1. Localiza o perfil infantil.
     *
     * Esta consulta usa o cliente administrativo apenas no servidor.
     * Nenhuma informação sensível é devolvida ao navegador.
     */
    const { data: filho, error: filhoError } = await supabaseAdmin
      .from("perfis")
      .select("id,nome,tipo,ativo,auth_user_id,pin_hash")
      .eq("id", perfilFilhoId)
      .eq("tipo", "filho")
      .eq("ativo", true)
      .maybeSingle();

    if (filhoError) {
      throw filhoError;
    }

    if (!filho) {
      return NextResponse.json(
        { error: "Acesso infantil inválido." },
        { status: 401 }
      );
    }

    if (!filho.auth_user_id || !filho.pin_hash) {
      return NextResponse.json(
        { error: "O acesso desta criança ainda não foi configurado." },
        { status: 403 }
      );
    }

    /*
     * 2. Valida o PIN através da função protegida no banco.
     *
     * O PIN nunca é comparado no navegador e o hash nunca é enviado
     * para o cliente.
     */
    const { data: pinValido, error: pinError } = await supabaseAdmin.rpc(
      "validar_pin",
      {
        p_perfil_filho_id: filho.id,
        p_pin: pin,
      }
    );

    if (pinError) {
      throw pinError;
    }

    if (pinValido !== true) {
      return NextResponse.json(
        { error: "PIN incorreto." },
        { status: 401 }
      );
    }

    /*
     * 3. Busca a identidade Auth vinculada ao perfil.
     */
    const {
      data: authUserData,
      error: authUserError,
    } = await supabaseAdmin.auth.admin.getUserById(
      filho.auth_user_id
    );

    if (authUserError || !authUserData.user) {
      throw authUserError ?? new Error("Usuário Auth infantil não encontrado.");
    }

    const emailInterno = authUserData.user.email;

    if (!emailInterno) {
      throw new Error("Usuário Auth infantil não possui e-mail interno.");
    }

    /*
     * 4. Gera um magic link internamente.
     *
     * O link não é enviado para a criança.
     * Usaremos apenas o token_hash gerado pelo Supabase.
     */
    const {
      data: linkData,
      error: linkError,
    } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: emailInterno,
    });

    if (linkError) {
      throw linkError;
    }

    const tokenHash = linkData.properties?.hashed_token;

    if (!tokenHash) {
      throw new Error(
        "O Supabase não retornou o token necessário para criar a sessão."
      );
    }

    /*
     * 5. Troca o token interno por uma sessão real do Supabase.
     *
     * createSupabaseServerClient utiliza @supabase/ssr e grava os
     * cookies da sessão no navegador.
     */
    const supabase = await createSupabaseServerClient();

    const {
      data: sessaoData,
      error: sessaoError,
    } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (sessaoError || !sessaoData.session || !sessaoData.user) {
      throw sessaoError ?? new Error("Não foi possível criar a sessão infantil.");
    }

    /*
     * 6. Confirma que a sessão criada pertence exatamente à identidade
     * Auth vinculada ao perfil selecionado.
     */
    if (sessaoData.user.id !== filho.auth_user_id) {
      await supabase.auth.signOut();

      throw new Error(
        "A sessão criada não corresponde ao perfil infantil selecionado."
      );
    }

    return NextResponse.json({
      ok: true,
      autenticado: true,
      filho: {
        id: filho.id,
        nome: filho.nome,
      },
    });
  } catch (error) {
    console.error("Erro no login infantil:", error);

    return NextResponse.json(
      { error: "Não foi possível entrar no perfil infantil." },
      { status: 500 }
    );
  }
}