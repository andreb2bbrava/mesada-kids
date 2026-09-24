"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Filho = {
  id: string;
  nome: string;
  pinConfigurado: boolean;
  acessoConfigurado: boolean;
};

type Dispositivo = {
  id: string;
  nome: string;
  tipo: string;
};

type RespostaIdentificacao = {
  ok?: boolean;
  dispositivo?: Dispositivo;
  filhos?: Filho[];
  error?: string;
};

const TAMANHO_PIN = 6;

export default function AcessoInfantilPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [dispositivo, setDispositivo] =
    useState<Dispositivo | null>(null);

  const [filhos, setFilhos] = useState<Filho[]>([]);

  const [filhoSelecionado, setFilhoSelecionado] =
    useState<Filho | null>(null);

  const [pin, setPin] = useState("");
  const [erroPin, setErroPin] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    async function identificarDispositivo() {
      try {
        setCarregando(true);
        setErro("");

        const resposta = await fetch(
          "/api/dispositivos/identificar",
          {
            method: "POST",
            cache: "no-store",
          }
        );

        const dados: RespostaIdentificacao =
          await resposta.json();

        if (!resposta.ok) {
          throw new Error(
            dados.error ??
              "Não foi possível reconhecer este aparelho."
          );
        }

        setDispositivo(dados.dispositivo ?? null);
        setFilhos(dados.filhos ?? []);
      } catch (error) {
        setErro(
          error instanceof Error
            ? error.message
            : "Não foi possível reconhecer este aparelho."
        );
      } finally {
        setCarregando(false);
      }
    }

    identificarDispositivo();
  }, []);

  function selecionarFilho(filho: Filho) {
    if (
      !filho.pinConfigurado ||
      !filho.acessoConfigurado
    ) {
      return;
    }

    setFilhoSelecionado(filho);
    setPin("");
    setErroPin("");
  }

  function voltarParaPerfis() {
    if (entrando) {
      return;
    }

    setFilhoSelecionado(null);
    setPin("");
    setErroPin("");
  }

  function digitarNumero(numero: string) {
    if (entrando || pin.length >= TAMANHO_PIN) {
      return;
    }

    setErroPin("");
    setPin((atual) =>
      `${atual}${numero}`.slice(0, TAMANHO_PIN)
    );
  }

  function apagarNumero() {
    if (entrando) {
      return;
    }

    setErroPin("");
    setPin((atual) => atual.slice(0, -1));
  }

  function limparPin() {
    if (entrando) {
      return;
    }

    setErroPin("");
    setPin("");
  }

  async function entrar() {
    if (!filhoSelecionado) {
      return;
    }

    if (pin.length !== TAMANHO_PIN) {
      setErroPin("Digite os 6 números do seu PIN.");
      return;
    }

    try {
      setEntrando(true);
      setErroPin("");

      const resposta = await fetch(
        "/api/auth/login-filho",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            perfilFilhoId: filhoSelecionado.id,
            pin,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setPin("");
        setErroPin(
          dados.error ??
            "Não foi possível entrar. Tente novamente."
        );
        return;
      }

      const primeiroNome =
        filhoSelecionado.nome
          .trim()
          .split(/\s+/)[0]
          ?.toLowerCase();

      if (primeiroNome === "lorenzo") {
        router.replace("/lorenzo");
        return;
      }

      if (primeiroNome === "betina") {
        router.replace("/betina");
        return;
      }

      setErroPin(
        "O acesso foi autorizado, mas a página deste perfil ainda não está configurada."
      );
    } catch {
      setPin("");
      setErroPin(
        "Não foi possível entrar agora. Tente novamente."
      );
    } finally {
      setEntrando(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-violet-50 px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600" />

          <h1 className="text-xl font-bold text-slate-800">
            Mesada Kids
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Preparando seu acesso...
          </p>
        </div>
      </main>
    );
  }

  if (erro) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-violet-50 px-6">
        <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-xl">
          <div className="mb-4 text-5xl">🔒</div>

          <h1 className="text-2xl font-bold text-slate-800">
            Aparelho não configurado
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            {erro}
          </p>

          <p className="mt-5 text-sm text-slate-500">
            Peça para um responsável configurar este
            aparelho para o acesso infantil.
          </p>
        </div>
      </main>
    );
  }

  if (filhoSelecionado) {
    const primeiroNome =
      filhoSelecionado.nome.trim().split(/\s+/)[0];

    const indiceFilho = filhos.findIndex(
      (filho) => filho.id === filhoSelecionado.id
    );

    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 via-white to-violet-50 px-5 py-8">
        <div className="w-full max-w-sm">
          <button
            type="button"
            onClick={voltarParaPerfis}
            disabled={entrando}
            className="mb-5 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-600 shadow-sm transition active:scale-95 disabled:opacity-50"
          >
            ← Voltar
          </button>

          <section className="rounded-[32px] bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-violet-100">
                <img
                  src={
                    indiceFilho % 2 === 0
                      ? "/personagens/betina.png"
                      : "/personagens/lorenzo.png"
                  }
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>

              <h1 className="mt-4 text-2xl font-black text-slate-800">
                Oi, {primeiroNome}! 👋
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Digite seu PIN para entrar
              </p>
            </div>

            <div className="mt-6 flex justify-center gap-3">
              {Array.from({
                length: TAMANHO_PIN,
              }).map((_, indice) => (
                <div
                  key={indice}
                  className={`h-4 w-4 rounded-full border-2 transition ${
                    indice < pin.length
                      ? "border-violet-600 bg-violet-600"
                      : "border-slate-300 bg-white"
                  }`}
                />
              ))}
            </div>

            <div className="mt-7 grid grid-cols-3 gap-3">
              {[
                "1",
                "2",
                "3",
                "4",
                "5",
                "6",
                "7",
                "8",
                "9",
              ].map((numero) => (
                <button
                  key={numero}
                  type="button"
                  onClick={() =>
                    digitarNumero(numero)
                  }
                  disabled={entrando}
                  className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-2xl font-black text-slate-800 shadow-sm transition hover:bg-violet-50 active:scale-95 disabled:opacity-50"
                >
                  {numero}
                </button>
              ))}

              <button
                type="button"
                onClick={limparPin}
                disabled={entrando}
                className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-sm font-bold text-slate-500 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50"
              >
                Limpar
              </button>

              <button
                type="button"
                onClick={() => digitarNumero("0")}
                disabled={entrando}
                className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-2xl font-black text-slate-800 shadow-sm transition hover:bg-violet-50 active:scale-95 disabled:opacity-50"
              >
                0
              </button>

              <button
                type="button"
                onClick={apagarNumero}
                disabled={entrando}
                aria-label="Apagar último número"
                className="flex h-16 items-center justify-center rounded-2xl bg-slate-50 text-2xl font-bold text-slate-600 transition hover:bg-slate-100 active:scale-95 disabled:opacity-50"
              >
                ⌫
              </button>
            </div>

            {erroPin && (
              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-600">
                {erroPin}
              </div>
            )}

            <button
              type="button"
              onClick={entrar}
              disabled={
                entrando ||
                pin.length !== TAMANHO_PIN
              }
              className="mt-6 h-14 w-full rounded-2xl bg-violet-600 text-base font-black text-white shadow-lg transition hover:bg-violet-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
            >
              {entrando
                ? "Entrando..."
                : "Entrar 🚀"}
            </button>
          </section>

          <p className="mt-5 text-center text-xs text-slate-400">
            🔐 Seu PIN é secreto
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-violet-50 px-5 py-10">
      <div className="mx-auto max-w-md">
        <header className="mb-10 text-center">
          <div className="mb-3 text-5xl">⭐</div>

          <h1 className="text-3xl font-black tracking-tight text-slate-800">
            Mesada Kids
          </h1>

          <p className="mt-3 text-base text-slate-500">
            Quem está entrando?
          </p>
        </header>

        {filhos.length === 0 ? (
          <div className="rounded-3xl bg-white p-7 text-center shadow-lg">
            <div className="mb-4 text-5xl">
              👨‍👩‍👧‍👦
            </div>

            <h2 className="text-lg font-bold text-slate-800">
              Nenhum perfil infantil disponível
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              O responsável precisa cadastrar uma
              criança antes de utilizar o acesso
              infantil.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filhos.map((filho, index) => {
              const pronto =
                filho.pinConfigurado &&
                filho.acessoConfigurado;

              return (
                <button
                  key={filho.id}
                  type="button"
                  disabled={!pronto}
                  onClick={() =>
                    selecionarFilho(filho)
                  }
                  className="group rounded-3xl bg-white p-5 shadow-lg transition hover:-translate-y-1 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
                >
                  <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-violet-100">
                    <img
                      src={
                        index % 2 === 0
                          ? "/personagens/betina.png"
                          : "/personagens/lorenzo.png"
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <h2 className="mt-4 truncate text-lg font-black text-slate-800">
                    {filho.nome.split(" ")[0]}
                  </h2>

                  {pronto ? (
                    <p className="mt-1 text-xs font-semibold text-emerald-600">
                      Toque para entrar
                    </p>
                  ) : (
                    <p className="mt-1 text-xs font-semibold text-amber-600">
                      Acesso não configurado
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {dispositivo && (
          <footer className="mt-10 text-center">
            <p className="text-xs text-slate-400">
              🔐 Aparelho autorizado
            </p>

            <p className="mt-1 text-xs text-slate-300">
              {dispositivo.nome}
            </p>
          </footer>
        )}
      </div>
    </main>
  );
}