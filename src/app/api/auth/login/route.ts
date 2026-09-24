import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body?.email === "string"
        ? body.email.trim()
        : "";

    const password =
      typeof body?.password === "string"
        ? body.password
        : "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "E-mail e senha são obrigatórios." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Variáveis públicas do Supabase não configuradas.");

      return NextResponse.json(
        { error: "Configuração de autenticação indisponível." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({ ok: true });

    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },

          setAll(cookiesToSet) {
            cookiesToSet.forEach(
              ({ name, value, options }) => {
                response.cookies.set(
                  name,
                  value,
                  options
                );
              }
            );
          },
        },
      }
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !user) {
      return NextResponse.json(
        { error: "E-mail ou senha incorretos." },
        { status: 401 }
      );
    }

    return response;
  } catch (error) {
    console.error("Erro no login:", error);

    return NextResponse.json(
      { error: "Não foi possível entrar. Tente novamente." },
      { status: 500 }
    );
  }
}