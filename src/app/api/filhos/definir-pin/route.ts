import { NextRequest, NextResponse } from "next/server";
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

    const { error: pinError } = await supabase.rpc(
      "definir_pin_filho",
      {
        p_perfil_filho_id: perfilFilhoId,
        p_pin: pin,
      }
    );

    if (pinError) {
      console.error("Erro ao definir PIN:", pinError);

      return NextResponse.json(
        { error: "Não foi possível definir o PIN." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "PIN configurado com sucesso.",
    });
  } catch (error) {
    console.error("Erro em definir-pin:", error);

    return NextResponse.json(
      { error: "Não foi possível definir o PIN." },
      { status: 500 }
    );
  }
}