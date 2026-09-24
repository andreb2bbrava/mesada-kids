"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Perfil = {
  id: string;
  nome: string;
};

type TarefaBanco = {
  id: string;
  nome: string;
  descricao: string | null;
  peso: number | string;
};

type DiaTarefa = {
  tarefa_id: string;
  dia_semana: number;
};

type StatusBanco = "aguardando_aprovacao" | "aprovada" | "recusada";
type StatusTela = "pending" | "approved" | "rejected";

type ExecucaoBanco = {
  tarefa_id: string;
  status: StatusBanco;
};

type TarefaHoje = {
  id: string;
  nome: string;
  descricao: string | null;
  valor: number;
  status: StatusTela | null;
};

const formatMoney = (value: number) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function dataLocalISO(date: Date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function primeiroNome(nome: string) {
  return nome.trim().split(/\\s+/)[0] || "Lorenzo";
}

function saudacao() {
  const hora = new Date().getHours();

  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function iconeTarefa(nome: string) {
  const texto = nome.toLocaleLowerCase("pt-BR");

  if (texto.includes("varanda")) return "🧹";
  if (texto.includes("lixo")) return "🗑️";
  if (texto.includes("roupa") || texto.includes("mochila")) return "👕";
  if (texto.includes("quarto")) return "🛏️";
  if (texto.includes("dente")) return "🪥";
  if (texto.includes("estudar") || texto.includes("estudo")) return "📚";
  if (texto.includes("livro") || texto.includes("ler")) return "📖";
  if (texto.includes("soneca")) return "🐾";

  return "⭐";
}

function converterStatus(status: StatusBanco): StatusTela {
  if (status === "aguardando_aprovacao") return "pending";
  if (status === "aprovada") return "approved";
  return "rejected";
}

export default function LorenzoPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [tarefasHoje, setTarefasHoje] = useState<TarefaHoje[]>([]);
  const [conquistadoMes, setConquistadoMes] = useState(0);

  const [carregando, setCarregando] = useState(true);
  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const hoje = useMemo(() => new Date(), []);
  const dataHoje = useMemo(() => dataLocalISO(hoje), [hoje]);
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth() + 1;
  const diaSemanaAtual = hoje.getDay();

  const dataPorExtenso = useMemo(
    () =>
      hoje.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
      }),
    [hoje]
  );

  useEffect(() => {
    void carregarTudo();
  }, []);

  useEffect(() => {
    if (!perfil) return;

    const channel = supabase
      .channel(`lorenzo-execucoes-${perfil.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "execucoes_tarefas",
          filter: `perfil_filho_id=eq.${perfil.id}`,
        },
        async (payload) => {
          const registro =
            payload.eventType === "DELETE" ? payload.old : payload.new;

          const dataExecucao =
            registro && "data_execucao" in registro
              ? String(registro.data_execucao)
              : null;

          // Alterações de outros dias não precisam redesenhar as missões de hoje.
          if (dataExecucao && dataExecucao !== dataHoje) {
            return;
          }

          await atualizarTelaSemLoading();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [perfil?.id, dataHoje]);

  async function atualizarTelaSemLoading() {
    if (!perfil) return;

    try {
      const { data: execucoesData, error: execucoesError } = await supabase
        .from("execucoes_tarefas")
        .select("tarefa_id,status")
        .eq("perfil_filho_id", perfil.id)
        .eq("data_execucao", dataHoje);

      if (execucoesError) {
        throw execucoesError;
      }

      const statusPorTarefa = new Map<string, StatusTela>();

      ((execucoesData ?? []) as ExecucaoBanco[]).forEach((execucao) => {
        statusPorTarefa.set(
          execucao.tarefa_id,
          converterStatus(execucao.status)
        );
      });

      setTarefasHoje((atual) =>
        atual.map((tarefa) => ({
          ...tarefa,
          status: statusPorTarefa.get(tarefa.id) ?? null,
        }))
      );

      const { data: totalData, error: totalError } = await supabase.rpc(
        "total_conquistado_mes",
        {
          p_perfil_filho_id: perfil.id,
          p_ano: anoAtual,
          p_mes: mesAtual,
        }
      );

      if (totalError) {
        throw totalError;
      }

      setConquistadoMes(Number(totalData ?? 0));
    } catch (error) {
      console.error("Erro ao atualizar área infantil em tempo real:", error);
    }
  }

  async function carregarTudo() {
    try {
      setCarregando(true);
      setErro("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error("Sessão infantil não encontrada.");
      }

      const { data: perfilData, error: perfilError } = await supabase
        .from("perfis")
        .select("id,nome,tipo,ativo")
        .eq("auth_user_id", user.id)
        .eq("tipo", "filho")
        .eq("ativo", true)
        .single();

      if (perfilError || !perfilData) {
        throw new Error("Não foi possível identificar o perfil infantil.");
      }

      const perfilAtual: Perfil = {
        id: perfilData.id,
        nome: perfilData.nome,
      };

      setPerfil(perfilAtual);

      const { data: tarefasData, error: tarefasError } = await supabase
        .from("tarefas")
        .select("id,nome,descricao,peso")
        .eq("perfil_id", perfilAtual.id)
        .eq("ativa", true)
        .order("created_at", { ascending: true });

      if (tarefasError) {
        throw tarefasError;
      }

      const tarefas = (tarefasData ?? []) as TarefaBanco[];
      const idsTarefas = tarefas.map((tarefa) => tarefa.id);

      let dias: DiaTarefa[] = [];

      if (idsTarefas.length > 0) {
        const { data: diasData, error: diasError } = await supabase
          .from("tarefa_dias_semana")
          .select("tarefa_id,dia_semana")
          .in("tarefa_id", idsTarefas);

        if (diasError) {
          throw diasError;
        }

        dias = (diasData ?? []) as DiaTarefa[];
      }

      const idsPermitidosHoje = new Set(
        dias
          .filter((item) => Number(item.dia_semana) === diaSemanaAtual)
          .map((item) => item.tarefa_id)
      );

      const tarefasPermitidas = tarefas.filter((tarefa) =>
        idsPermitidosHoje.has(tarefa.id)
      );

      const idsHoje = tarefasPermitidas.map((tarefa) => tarefa.id);

      let execucoes: ExecucaoBanco[] = [];

      if (idsHoje.length > 0) {
        const { data: execucoesData, error: execucoesError } = await supabase
          .from("execucoes_tarefas")
          .select("tarefa_id,status")
          .eq("perfil_filho_id", perfilAtual.id)
          .eq("data_execucao", dataHoje)
          .in("tarefa_id", idsHoje);

        if (execucoesError) {
          throw execucoesError;
        }

        execucoes = (execucoesData ?? []) as ExecucaoBanco[];
      }

      const statusPorTarefa = new Map<string, StatusTela>();

      execucoes.forEach((execucao) => {
        statusPorTarefa.set(
          execucao.tarefa_id,
          converterStatus(execucao.status)
        );
      });

      const valores = await Promise.all(
        tarefasPermitidas.map(async (tarefa) => {
          const { data, error } = await supabase.rpc("valor_tarefa_no_mes", {
            p_tarefa_id: tarefa.id,
            p_ano: anoAtual,
            p_mes: mesAtual,
          });

          if (error) {
            throw error;
          }

          return {
            tarefaId: tarefa.id,
            valor: Number(data ?? 0),
          };
        })
      );

      const valorPorTarefa = new Map(
        valores.map((item) => [item.tarefaId, item.valor])
      );

      setTarefasHoje(
        tarefasPermitidas.map((tarefa) => ({
          id: tarefa.id,
          nome: tarefa.nome,
          descricao: tarefa.descricao,
          valor: valorPorTarefa.get(tarefa.id) ?? 0,
          status: statusPorTarefa.get(tarefa.id) ?? null,
        }))
      );

      const { data: totalData, error: totalError } = await supabase.rpc(
        "total_conquistado_mes",
        {
          p_perfil_filho_id: perfilAtual.id,
          p_ano: anoAtual,
          p_mes: mesAtual,
        }
      );

      if (totalError) {
        throw totalError;
      }

      // Fonte financeira oficial do V2.
      // Inclui tarefas aprovadas, bônus, descontos e ajustes de migração.
      setConquistadoMes(Number(totalData ?? 0));
    } catch (error) {
      console.error("Erro ao carregar área infantil:", error);

      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar suas missões."
      );
    } finally {
      setCarregando(false);
    }
  }

  async function atualizarTotal() {
    if (!perfil) return;

    const { data, error } = await supabase.rpc("total_conquistado_mes", {
      p_perfil_filho_id: perfil.id,
      p_ano: anoAtual,
      p_mes: mesAtual,
    });

    if (!error) {
      setConquistadoMes(Number(data ?? 0));
    }
  }

  async function enviarMissao(tarefa: TarefaHoje) {
    if (!perfil || tarefa.status || enviandoId) {
      return;
    }

    try {
      setEnviandoId(tarefa.id);
      setErro("");
      setMensagem("");

      const { error } = await supabase.from("execucoes_tarefas").insert({
        tarefa_id: tarefa.id,
        perfil_filho_id: perfil.id,
        data_execucao: dataHoje,
        status: "aguardando_aprovacao",
        observacao_filho: null,
        origem: "v2",
      });

      if (error) {
        if (error.code === "23505") {
          await carregarTudo();
          setMensagem("Essa missão já tinha sido enviada. 👍");
          return;
        }

        throw error;
      }

      setTarefasHoje((atual) =>
        atual.map((item) =>
          item.id === tarefa.id
            ? {
                ...item,
                status: "pending",
              }
            : item
        )
      );

      // Enviar uma missão NÃO aumenta o saldo.
      // O saldo só muda quando o responsável aprovar.
      await atualizarTotal();

      setMensagem("Boa! Missão enviada para aprovação. ⭐");
    } catch (error) {
      console.error("Erro ao enviar missão:", error);
      setErro("Não foi possível enviar essa missão. Tente novamente.");
    } finally {
      setEnviandoId(null);
    }
  }

  async function trocarPerfil() {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "/acesso-infantil";
    }
  }

  const primeiro = perfil ? primeiroNome(perfil.nome) : "Lorenzo";

  const marcadasHoje = tarefasHoje.filter(
    (tarefa) => tarefa.status !== null
  ).length;

  const todasMarcadas =
    tarefasHoje.length > 0 && marcadasHoje === tarefasHoje.length;

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f4f9ff] flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mb-4 text-5xl animate-bounce">⭐</div>
          <p className="font-bold text-slate-600">
            Carregando suas missões...
          </p>
        </div>
      </main>
    );
  }

  if (!perfil) {
    return (
      <main className="min-h-screen bg-[#f4f9ff] flex items-center justify-center px-6">
        <section className="w-full max-w-md rounded-[28px] border border-slate-100 bg-white p-7 text-center shadow-sm">
          <div className="mb-4 text-5xl">😕</div>

          <h1 className="mb-2 text-2xl font-black text-slate-800">
            Não conseguimos abrir sua área
          </h1>

          <p className="mb-6 text-slate-500">
            {erro || "Perfil infantil não encontrado."}
          </p>

          <button
            type="button"
            onClick={() => {
              window.location.href = "/acesso-infantil";
            }}
            className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-black text-white"
          >
            Voltar para o acesso infantil
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f9ff] text-slate-800">
      <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white shadow-sm ring-4 ring-white sm:h-20 sm:w-20">
              <Image
                src="/personagens/lorenzo.png"
                alt={primeiro}
                fill
                priority
                className="object-contain"
              />
            </div>

            <div className="min-w-0">
              <span className="text-[11px] font-black tracking-[0.18em] text-blue-600">
                MESADA KIDS
              </span>

              <h1 className="truncate text-2xl font-black text-slate-900 sm:text-3xl">
                {saudacao()}, {primeiro}! 👋
              </h1>

              <p className="text-sm font-semibold capitalize text-slate-500">
                {dataPorExtenso}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={trocarPerfil}
            className="shrink-0 rounded-2xl border border-blue-100 bg-white px-3 py-2 text-xs font-black text-blue-600 shadow-sm sm:px-4 sm:py-3 sm:text-sm"
          >
            Trocar perfil
          </button>
        </header>

        <section className="mb-5 overflow-hidden rounded-[28px] bg-gradient-to-br from-blue-600 to-blue-500 p-5 text-white shadow-lg shadow-blue-100 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-bold text-blue-100">
                💰 Conquistado neste mês
              </p>

              <strong className="text-4xl font-black tracking-tight sm:text-5xl">
                {formatMoney(conquistadoMes)}
              </strong>

              <p className="mt-2 text-xs font-semibold text-blue-100 sm:text-sm">
                Seu saldo oficial no Mesada Kids.
              </p>
            </div>

            <div className="hidden rounded-2xl bg-white/15 px-4 py-3 text-right sm:block">
              <span className="block text-xs font-bold text-blue-100">
                Missões marcadas hoje
              </span>

              <strong className="text-2xl font-black">
                {marcadasHoje}/{tarefasHoje.length}
              </strong>
            </div>
          </div>
        </section>

        {todasMarcadas && (
          <section className="mb-5 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-center shadow-sm sm:p-6">
            <div className="mb-2 text-5xl">🎉</div>

            <h2 className="text-xl font-black text-amber-900 sm:text-2xl">
              Parabéns, {primeiro}!
            </h2>

            <p className="mt-1 font-semibold text-amber-700">
              Você concluiu suas atividades de hoje!
            </p>
          </section>
        )}

        {(mensagem || erro) && (
          <div
            className={`mb-5 rounded-2xl px-4 py-3 text-sm font-bold ${
              erro
                ? "border border-red-100 bg-red-50 text-red-700"
                : "border border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}
          >
            {erro || mensagem}
          </div>
        )}

        <section>
          <div className="mb-4 flex items-end justify-between gap-3 px-1">
            <div>
              <span className="text-xs font-black tracking-[0.16em] text-blue-600">
                🎯 MISSÕES DE HOJE
              </span>

              <h2 className="mt-1 text-2xl font-black text-slate-900">
                O que vamos fazer?
              </h2>
            </div>

            <div className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-sm">
              {marcadasHoje} de {tarefasHoje.length}
            </div>
          </div>

          {tarefasHoje.length === 0 ? (
            <div className="rounded-[28px] bg-white p-8 text-center shadow-sm">
              <div className="mb-3 text-5xl">🌈</div>

              <h3 className="text-xl font-black text-slate-800">
                Nenhuma missão para hoje!
              </h3>

              <p className="mt-2 text-sm font-semibold text-slate-500">
                Aproveite o dia. 😄
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {tarefasHoje.map((tarefa) => {
                const enviando = enviandoId === tarefa.id;
                const bloqueada = tarefa.status !== null || enviando;

                const cardClass =
                  tarefa.status === "approved"
                    ? "border-emerald-200 bg-emerald-50"
                    : tarefa.status === "pending"
                      ? "border-amber-200 bg-amber-50"
                      : tarefa.status === "rejected"
                        ? "border-red-100 bg-red-50"
                        : "border-slate-100 bg-white";

                const buttonClass =
                  tarefa.status === "approved"
                    ? "cursor-default bg-emerald-600 text-white"
                    : tarefa.status === "pending"
                      ? "cursor-default bg-amber-400 text-amber-950"
                      : tarefa.status === "rejected"
                        ? "cursor-default bg-red-100 text-red-700"
                        : enviando
                          ? "cursor-wait bg-blue-300 text-white"
                          : "bg-blue-600 text-white shadow-md shadow-blue-100 active:scale-[0.98]";

                const buttonText = enviando
                  ? "Enviando..."
                  : tarefa.status === "pending"
                    ? "⏳ Aguardando aprovação"
                    : tarefa.status === "approved"
                      ? "✅ Aprovada"
                      : tarefa.status === "rejected"
                        ? "❌ Não aprovada"
                        : "FIZ!";

                return (
                  <article
                    key={tarefa.id}
                    className={`rounded-[28px] border p-5 shadow-sm transition sm:p-6 ${cardClass}`}
                  >
                    <div className="mb-5 flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">
                        {iconeTarefa(tarefa.nome)}
                      </div>

                      <div className="min-w-0 pt-1">
                        <h3 className="text-lg font-black leading-tight text-slate-900 sm:text-xl">
                          {tarefa.nome}
                        </h3>

                        {tarefa.descricao && (
                          <p className="mt-1 text-sm font-medium text-slate-500">
                            {tarefa.descricao}
                          </p>
                        )}

                        <div className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                          Vale {formatMoney(tarefa.valor)}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={bloqueada}
                      onClick={() => enviarMissao(tarefa)}
                      className={`w-full rounded-2xl px-4 py-4 text-base font-black transition ${buttonClass}`}
                    >
                      {buttonText}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <footer className="pb-5 pt-8 text-center">
          <p className="text-xs font-bold text-slate-400">
            Faça suas missões com carinho. O responsável confere depois. 💙
          </p>
        </footer>
      </div>
    </main>
  );
}
