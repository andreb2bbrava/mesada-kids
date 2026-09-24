"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Perfil = {
  id: string;
  nome: string;
  tipo: "responsavel" | "filho";
  avatar_url: string | null;
  familia_id: string;
};

type MesAtual = {
  ano: number;
  mes: number;
  meta: number;
  conquistado: number;
};

type MesAnterior = {
  id: string;
  ano: number;
  mes: number;
  valor: number;
  fechada: boolean;
  fechada_em: string | null;
  paga: boolean;
  paga_em: string | null;
  pendencias: number;
  data_pagamento: string | null;
};

type ResumoFinanceiro = {
  mes_atual: MesAtual;
  mes_anterior: MesAnterior | null;
};

type Dependente = Perfil & {
  mesada: number;
  resumo: ResumoFinanceiro | null;
};

const NOMES_MESES = [
  "",
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export default function ResponsavelPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [responsavel, setResponsavel] = useState<Perfil | null>(null);
  const [dependentes, setDependentes] = useState<Dependente[]>([]);
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [erro, setErro] = useState("");
  const [totalPendencias, setTotalPendencias] = useState(0);
  const [acaoFinanceira, setAcaoFinanceira] = useState<string | null>(null);
  const [mensagemFinanceira, setMensagemFinanceira] = useState("");
  const [filhoPin, setFilhoPin] = useState<Dependente | null>(null);
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [salvandoPin, setSalvandoPin] = useState(false);
  const [erroPin, setErroPin] = useState("");
  const [configurandoDispositivo, setConfigurandoDispositivo] = useState(false);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfis")
        .select("id,nome,tipo,avatar_url,familia_id")
        .eq("auth_user_id", user.id)
        .eq("tipo", "responsavel")
        .eq("ativo", true)
        .single();

      if (perfilError || !perfil) {
        setErro("Não conseguimos carregar sua família.");
        return;
      }

      setResponsavel(perfil as Perfil);

      // Garante que cada filho ativo tenha a competência do mês atual.
      // A RPC é idempotente: se a competência já existir, nada é duplicado.
      const { error: competenciaError } = await supabase.rpc(
        "garantir_competencia_atual"
      );

      if (competenciaError) {
        console.error(
          "Erro ao garantir competência atual:",
          competenciaError
        );
        throw competenciaError;
      }

      const { data: pendencias, error: pendenciasError } = await supabase.rpc(
        "total_aprovacoes_pendentes"
      );

      if (pendenciasError) {
        console.error(
          "Erro ao carregar aprovações pendentes:",
          pendenciasError
        );
      } else {
        setTotalPendencias(Number(pendencias ?? 0));
      }

      const { data: familia } = await supabase
        .from("familias")
        .select("nome")
        .eq("id", perfil.familia_id)
        .single();

      if (familia) {
        setNomeFamilia(familia.nome);
      }

      const { data: filhos, error: filhosError } = await supabase
        .from("perfis")
        .select("id,nome,tipo,avatar_url,familia_id")
        .eq("familia_id", perfil.familia_id)
        .eq("tipo", "filho")
        .eq("ativo", true)
        .order("nome");

      if (filhosError) {
        throw filhosError;
      }

      const filhosComResumo = await Promise.all(
        (filhos ?? []).map(async (filho) => {
          const { data: resumo, error: resumoError } = await supabase.rpc(
            "resumo_financeiro_filho",
            {
              p_perfil_filho_id: filho.id,
            }
          );

          if (resumoError) {
            console.error(
              `Erro ao carregar resumo de ${filho.nome}:`,
              resumoError
            );
          }

          const resumoFinanceiro =
            resumoError || !resumo
              ? null
              : (resumo as ResumoFinanceiro);

          return {
            ...(filho as Perfil),
            mesada: Number(resumoFinanceiro?.mes_atual?.meta ?? 0),
            resumo: resumoFinanceiro,
          } as Dependente;
        })
      );

      setDependentes(filhosComResumo);
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar os dados da família.");
    } finally {
      setCarregando(false);
    }
  }

  function primeiroNome(nome?: string) {
    return nome?.split(" ")[0] ?? "";
  }

  function saudacao() {
    const hora = new Date().getHours();

    if (hora < 12) {
      return {
        texto: "Bom dia",
        emoji: "☀️",
      };
    }

    if (hora < 18) {
      return {
        texto: "Boa tarde",
        emoji: "🌤️",
      };
    }

    return {
      texto: "Boa noite",
      emoji: "🌙",
    };
  }

  function dinheiro(valor: number) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function nomeMes(mes?: number) {
    if (!mes) return "";
    return NOMES_MESES[mes] ?? "";
  }

  function formatarData(data?: string | null) {
    if (!data) return "";

    const [ano, mes, dia] = data.substring(0, 10).split("-");

    return `${dia}/${mes}/${ano}`;
  }

  function formatarDataHora(data?: string | null) {
    if (!data) return "";

    return new Date(data).toLocaleDateString("pt-BR");
  }

  function personagem(nome: string) {
    const normalizado = nome.toLowerCase();

    if (normalizado.includes("lorenzo")) {
      return "/personagens/lorenzo.png";
    }

    if (normalizado.includes("betina")) {
      return "/personagens/betina.png";
    }

    return null;
  }

  function corFilho(nome: string) {
    return nome.toLowerCase().includes("betina") ? "rosa" : "azul";
  }

  function progresso(filho: Dependente) {
    const meta = Number(filho.resumo?.mes_atual?.meta ?? filho.mesada ?? 0);
    const conquistado = Number(
      filho.resumo?.mes_atual?.conquistado ?? 0
    );

    if (meta <= 0) return 0;

    return Math.max(
      0,
      Math.min(100, Math.round((conquistado / meta) * 100))
    );
  }

  async function fecharMesada(filho: Dependente, anterior: MesAnterior) {
    if (anterior.fechada) return;

    if (anterior.pendencias > 0) {
      setMensagemFinanceira(
        `Ainda existem ${anterior.pendencias} atividade(s) pendente(s) de ${primeiroNome(
          filho.nome
        )}. Aprove ou recuse antes de fechar a mesada.`
      );
      return;
    }

    const confirmou = window.confirm(
      `Fechar a mesada de ${primeiroNome(filho.nome)} referente a ${nomeMes(
        anterior.mes
      )}/${anterior.ano}? Depois do fechamento, o valor ficará congelado.`
    );

    if (!confirmou) return;

    try {
      setAcaoFinanceira(`fechar-${filho.id}`);
      setMensagemFinanceira("");

      const { error } = await supabase.rpc("fechar_mesada", {
        p_perfil_filho_id: filho.id,
        p_ano: anterior.ano,
        p_mes: anterior.mes,
      });

      if (error) throw error;

      setMensagemFinanceira(
        `Mesada de ${primeiroNome(filho.nome)} fechada com sucesso.`
      );

      await carregar();
    } catch (error) {
      console.error("Erro ao fechar mesada:", error);
      setMensagemFinanceira(
        "Não foi possível fechar a mesada. Confira se ainda existem pendências."
      );
    } finally {
      setAcaoFinanceira(null);
    }
  }

  async function marcarComoPaga(filho: Dependente, anterior: MesAnterior) {
    if (!anterior.fechada || anterior.paga) return;

    const confirmou = window.confirm(
      `Confirmar o pagamento de ${dinheiro(anterior.valor)} para ${primeiroNome(
        filho.nome
      )}, referente a ${nomeMes(anterior.mes)}/${anterior.ano}?`
    );

    if (!confirmou) return;

    try {
      setAcaoFinanceira(`pagar-${filho.id}`);
      setMensagemFinanceira("");

      const { error } = await supabase.rpc("marcar_mesada_paga", {
        p_perfil_filho_id: filho.id,
        p_ano: anterior.ano,
        p_mes: anterior.mes,
      });

      if (error) throw error;

      setMensagemFinanceira(
        `Pagamento de ${primeiroNome(filho.nome)} registrado com sucesso.`
      );

      await carregar();
    } catch (error) {
      console.error("Erro ao registrar pagamento:", error);
      setMensagemFinanceira("Não foi possível registrar o pagamento.");
    } finally {
      setAcaoFinanceira(null);
    }
  }

  function abrirPin(filho: Dependente) {
    setFilhoPin(filho);
    setPin("");
    setConfirmarPin("");
    setErroPin("");
  }

  function fecharPin() {
    if (salvandoPin) return;

    setFilhoPin(null);
    setPin("");
    setConfirmarPin("");
    setErroPin("");
  }

  async function salvarPin() {
    if (!filhoPin) return;

    setErroPin("");

    if (!/^\d{6}$/.test(pin)) {
      setErroPin("O PIN precisa ter exatamente 6 números.");
      return;
    }

    if (pin !== confirmarPin) {
      setErroPin("Os dois PINs precisam ser iguais.");
      return;
    }

    try {
      setSalvandoPin(true);

      const response = await fetch("/api/filhos/definir-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          perfilFilhoId: filhoPin.id,
          pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErroPin(data?.error || "Não foi possível salvar o PIN.");
        return;
      }

      setMensagemFinanceira(
        `PIN de ${primeiroNome(filhoPin.nome)} configurado com sucesso.`
      );

      fecharPin();
    } catch (error) {
      console.error("Erro ao salvar PIN:", error);
      setErroPin("Não foi possível salvar o PIN. Tente novamente.");
    } finally {
      setSalvandoPin(false);
    }
  }

  async function configurarDispositivoInfantil() {
    try {
      setConfigurandoDispositivo(true);
      setMensagemFinanceira("");

      const response = await fetch("/api/dispositivos/configurar-infantil", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome: "Celular infantil",
          tipo: "celular",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível configurar este aparelho.");
      }

      setMensagemFinanceira(
        "Este aparelho foi configurado para o acesso infantil da sua família."
      );

      router.push("/acesso-infantil");
    } catch (error) {
      console.error("Erro ao configurar dispositivo infantil:", error);
      setMensagemFinanceira(
        error instanceof Error
          ? error.message
          : "Não foi possível configurar este aparelho."
      );
    } finally {
      setConfigurandoDispositivo(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const cumprimento = saudacao();

  const totalMetas = dependentes.reduce(
    (total, filho) =>
      total + Number(filho.resumo?.mes_atual?.meta ?? filho.mesada ?? 0),
    0
  );

  const totalConquistadoAtual = dependentes.reduce(
    (total, filho) =>
      total + Number(filho.resumo?.mes_atual?.conquistado ?? 0),
    0
  );

  const totalAnterior = dependentes.reduce(
    (total, filho) =>
      total + Number(filho.resumo?.mes_anterior?.valor ?? 0),
    0
  );

  const existeMesAnterior = dependentes.some(
    (filho) => filho.resumo?.mes_anterior
  );

  const existeAnteriorNaoPago = dependentes.some(
    (filho) =>
      filho.resumo?.mes_anterior &&
      !filho.resumo.mes_anterior.paga
  );

  const dataPagamento =
    dependentes.find(
      (filho) => filho.resumo?.mes_anterior?.data_pagamento
    )?.resumo?.mes_anterior?.data_pagamento ?? null;

  const mesAtual =
    dependentes[0]?.resumo?.mes_atual?.mes ??
    new Date().getMonth() + 1;

  const mesAnterior =
    dependentes.find((filho) => filho.resumo?.mes_anterior)?.resumo
      ?.mes_anterior?.mes ?? null;

  if (carregando) {
    return (
      <main className="loading">
        <img
          className="loadingLogo"
          src="/branding/mesada-kids-logo.png"
          alt="Mesada Kids"
        />
        <strong>Mesada Kids</strong>
        <span>Preparando a casa...</span>

        <style jsx>{`
          .loading {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 9px;
            background: #fafaff;
            color: #1e285c;
            font-family: Arial, Helvetica, sans-serif;
          }

          .loadingLogo {
            width: 82px;
            height: 82px;
            display: block;
            object-fit: contain;
            border-radius: 22px;
            box-shadow: 0 14px 30px rgba(99, 91, 239, 0.18);
          }

          .loading span {
            color: #9ca3b8;
            font-size: 12px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <>
      <main className="familyApp">
        <header className="header">
          <div className="headerInner">
            <button className="brand" onClick={() => router.push("/")}>
              <img
                className="brandLogo"
                src="/branding/mesada-kids-logo.png"
                alt="Mesada Kids"
              />

              <div>
                <strong>Mesada Kids</strong>
                <small>{nomeFamilia || "Minha família"}</small>
              </div>
            </button>

            <nav className="desktopNav">
              <button className="active">
                <span>🏠</span>
                Hoje
              </button>

              <button onClick={() => router.push("/responsavel/aprovacoes")}>
                <span>✨</span>
                Aprovar
                {totalPendencias > 0 && <b>{totalPendencias}</b>}
              </button>

              <button>
                <span>👨‍👩‍👧‍👦</span>
                Meus filhos
              </button>

              <button onClick={() => router.push("/responsavel/carteira")}>
                <span>💰</span>
                Carteira
              </button>
            </nav>

            <div className="profileArea">
              <button className="bell">🔔</button>

              <div className="parentAvatar">
                {primeiroNome(responsavel?.nome).charAt(0)}
              </div>

              <div className="parentInfo">
                <strong>{primeiroNome(responsavel?.nome)}</strong>
                <small>Responsável</small>
              </div>

              <button className="logout" onClick={sair}>
                Sair
              </button>
            </div>
          </div>
        </header>

        <section className="page">
          {erro && <div className="error">{erro}</div>}

          <section className="welcome">
            <div className="welcomeText">
              <span className="todayLabel">HOJE NA SUA FAMÍLIA</span>

              <h1>
                {cumprimento.texto},{" "}
                <span>{primeiroNome(responsavel?.nome)}</span>!{" "}
                {cumprimento.emoji}
              </h1>

              <p>
                Vamos ver como{" "}
                {dependentes.map((filho, index) => (
                  <span key={filho.id}>
                    <strong>{primeiroNome(filho.nome)}</strong>
                    {index < dependentes.length - 2
                      ? ", "
                      : index === dependentes.length - 2
                      ? " e "
                      : ""}
                  </span>
                ))}{" "}
                estão indo hoje?
              </p>
            </div>

            <div className="dateBubble">
              <span>🌱</span>

              <div>
                <small>CONQUISTADO EM {nomeMes(mesAtual).toUpperCase()}</small>
                <strong>{dinheiro(totalConquistadoAtual)}</strong>
                <em>de {dinheiro(totalMetas)}</em>
              </div>
            </div>
          </section>

          {mensagemFinanceira && (
            <div className="financialMessage">
              {mensagemFinanceira}
            </div>
          )}

          {existeMesAnterior ? (
            <section className="paymentBanner">
              <div className="paymentIcon">
                {existeAnteriorNaoPago ? "💳" : "✅"}
              </div>

              <div className="paymentMain">
                <span>
                  {existeAnteriorNaoPago
                    ? "PRÓXIMA MESADA"
                    : "MESADA ANTERIOR"}
                </span>

                <h2>
                  {existeAnteriorNaoPago
                    ? `${dinheiro(totalAnterior)} para pagar`
                    : `${dinheiro(totalAnterior)} pago`}
                </h2>

                <p>
                  Referente a{" "}
                  <strong>{nomeMes(mesAnterior ?? undefined)}</strong>
                  {dataPagamento && existeAnteriorNaoPago && (
                    <>
                      {" "}
                      • pagamento no 5º dia útil:{" "}
                      <strong>{formatarData(dataPagamento)}</strong>
                    </>
                  )}
                </p>
              </div>

              <div className="paymentChildren">
                {dependentes.map((filho) => {
                  const anterior = filho.resumo?.mes_anterior;

                  if (!anterior) return null;

                  return (
                    <div key={filho.id}>
                      <span>{primeiroNome(filho.nome)}</span>
                      <strong>{dinheiro(anterior.valor)}</strong>
                      <small>
                        {anterior.paga
                          ? "Pago"
                          : anterior.fechada
                          ? "A pagar"
                          : anterior.pendencias > 0
                          ? `${anterior.pendencias} pendência(s)`
                          : "Pronta para fechar"}
                      </small>

                      {!anterior.fechada && (
                        <button
                          className="miniFinancialAction"
                          disabled={
                            anterior.pendencias > 0 ||
                            acaoFinanceira === `fechar-${filho.id}`
                          }
                          onClick={() => fecharMesada(filho, anterior)}
                        >
                          {acaoFinanceira === `fechar-${filho.id}`
                            ? "Fechando..."
                            : anterior.pendencias > 0
                            ? "Resolver pendências"
                            : "Fechar mesada"}
                        </button>
                      )}

                      {anterior.fechada && !anterior.paga && (
                        <button
                          className="miniFinancialAction pay"
                          disabled={acaoFinanceira === `pagar-${filho.id}`}
                          onClick={() => marcarComoPaga(filho, anterior)}
                        >
                          {acaoFinanceira === `pagar-${filho.id}`
                            ? "Registrando..."
                            : "Marcar como pago"}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <button onClick={() => router.push("/responsavel/carteira")}>
                Abrir carteira <span>→</span>
              </button>
            </section>
          ) : (
            <section className="firstMonthBanner">
              <div className="firstMonthIcon">🌱</div>

              <div>
                <span>PRIMEIRO MÊS NO MESADA KIDS</span>
                <h2>A história da família começa agora.</h2>
                <p>
                  No próximo mês, esta área mostrará o valor da mesada anterior
                  e a data prevista para o pagamento.
                </p>
              </div>
            </section>
          )}

          <section className="mission">
            <div className="missionDecoration one">★</div>
            <div className="missionDecoration two">●</div>

            <div className="missionIcon">🙌</div>

            <div className="missionText">
              <span>
                {totalPendencias > 0
                  ? "TEM MISSÃO ESPERANDO POR VOCÊ"
                  : "TUDO TRANQUILO POR AQUI"}
              </span>
              <h2>
                {totalPendencias > 0
                  ? `${totalPendencias} ${
                      totalPendencias === 1 ? "missão aguarda" : "missões aguardam"
                    } sua aprovação.`
                  : "Nenhuma missão esperando sua aprovação."}
              </h2>
              <p>
                {totalPendencias > 0
                  ? "Confira o que foi realizado antes de liberar a conquista."
                  : "Quando uma tarefa for enviada pelos filhos, ela aparecerá aqui para você conferir."}
              </p>
            </div>

            <button onClick={() => router.push("/responsavel/aprovacoes")}>
              Ver aprovações
              <span>→</span>
            </button>
          </section>

          <section className="childrenSection">
            <div className="sectionHeader">
              <div>
                <span>MINHA TURMA</span>
                <h2>Como estão as conquistas?</h2>
              </div>

              <div className="sectionActions">
                <button
                  className="deviceChild"
                  type="button"
                  onClick={configurarDispositivoInfantil}
                  disabled={configurandoDispositivo}
                >
                  <span>📱</span>
                  {configurandoDispositivo
                    ? "Configurando..."
                    : "Configurar dispositivo infantil"}
                </button>

                <button className="addChild">
                  <span>＋</span>
                  Adicionar filho
                </button>
              </div>
            </div>

            <div className="childrenGrid">
              {dependentes.map((filho) => {
                const nome = primeiroNome(filho.nome);
                const cor = corFilho(filho.nome);
                const imagem = personagem(filho.nome);
                const resumo = filho.resumo;
                const atual = resumo?.mes_atual;
                const anterior = resumo?.mes_anterior;
                const percentual = progresso(filho);

                return (
                  <article className={`childCard ${cor}`} key={filho.id}>
                    <div className="cardCloud cloudOne" />
                    <div className="cardCloud cloudTwo" />

                    <div className="childTop">
                      <div className="childTitle">
                        <span>MEU FILHO</span>
                        <h3>{nome}</h3>
                        <p>Construindo bons hábitos todos os dias.</p>
                      </div>

                      <span className="statusPill">● Tudo certo</span>
                    </div>

                    <div className="childMain">
                      <div className="characterArea">
                        <div className="characterCircle">
                          {imagem ? (
                            <img src={imagem} alt={nome} />
                          ) : (
                            <span className="fallbackCharacter">😊</span>
                          )}
                        </div>

                        <div className="achievement">
                          <span>⭐</span>

                          <div>
                            <small>
                              META DE{" "}
                              {nomeMes(atual?.mes).toUpperCase()}
                            </small>

                            <strong>
                              {dinheiro(Number(atual?.meta ?? 0))}
                            </strong>
                          </div>
                        </div>
                      </div>

                      <div className="childProgress">
                        <div className="currentMonthLabel">
                          <span className="liveDot" />
                          {nomeMes(atual?.mes).toUpperCase()} • EM ANDAMENTO
                        </div>

                        <div className="moneyBlock">
                          <small>CONQUISTADO ATÉ AGORA</small>

                          <strong>
                            {dinheiro(Number(atual?.conquistado ?? 0))}
                          </strong>

                          <em>
                            de {dinheiro(Number(atual?.meta ?? 0))}
                          </em>
                        </div>

                        <div className="progressHeader">
                          <span>Progresso da mesada</span>
                          <strong>{percentual}%</strong>
                        </div>

                        <div className="progressTrack">
                          <div style={{ width: `${percentual}%` }} />
                        </div>

                        <div className="previousMonth">
                          {anterior ? (
                            <>
                              <div className="previousIcon">
                                {anterior.paga ? "✅" : "💰"}
                              </div>

                              <div className="previousText">
                                <small>
                                  MESADA DE{" "}
                                  {nomeMes(anterior.mes).toUpperCase()}
                                </small>

                                <strong>{dinheiro(anterior.valor)}</strong>

                                <span>
                                  {anterior.paga ? (
                                    <>
                                      Pago
                                      {anterior.paga_em
                                        ? ` em ${formatarDataHora(
                                            anterior.paga_em
                                          )}`
                                        : ""}
                                    </>
                                  ) : anterior.pendencias > 0 ? (
                                    <>
                                      {anterior.pendencias} atividade(s)
                                      aguardando aprovação
                                    </>
                                  ) : anterior.fechada ? (
                                    <>
                                      A pagar
                                      {anterior.data_pagamento
                                        ? ` • ${formatarData(
                                            anterior.data_pagamento
                                          )}`
                                        : ""}
                                    </>
                                  ) : (
                                    "Aguardando fechamento"
                                  )}
                                </span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="previousIcon">🌱</div>

                              <div className="previousText">
                                <small>MESADA ANTERIOR</small>
                                <strong>Primeiro mês</strong>
                                <span>
                                  O histórico financeiro começa por aqui.
                                </span>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="childActions">
                          <button
                            className="pinChild"
                            onClick={() => abrirPin(filho)}
                          >
                            <span>🔐</span>
                            Criar / alterar PIN
                          </button>

                          <button
                            className="openChild"
                            onClick={() =>
                              router.push(`/${nome.toLowerCase()}`)
                            }
                          >
                            Entrar no espaço de {nome}
                            <span>→</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="familyBottom">
            <article className="familyWallet" id="carteira-familia">
              <div className="walletIcon">🪙</div>

              <div className="walletText">
                <span>CARTEIRA DA FAMÍLIA</span>

                <h3>
                  {dinheiro(totalConquistadoAtual)}{" "}
                  <small>
                    conquistados de {dinheiro(totalMetas)} em{" "}
                    {nomeMes(mesAtual)}
                  </small>
                </h3>

                <p>
                  Só entram no saldo as tarefas aprovadas, bônus, descontos e
                  ajustes registrados.
                </p>
              </div>

              <button onClick={() => router.push("/responsavel/carteira")}>
                Ver movimentações
                <span>→</span>
              </button>
            </article>

            <article className="familyTip">
              <div className="tipIcon">💡</div>

              <span>DICA PARA HOJE</span>

              <h3>Dinheiro também é assunto de criança.</h3>

              <p>
                Conversas simples sobre escolhas, espera e objetivos ajudam a
                construir uma relação saudável com o dinheiro.
              </p>
            </article>
          </section>
        </section>

        <nav className="mobileNav">
          <button className="active">
            <span>🏠</span>
            Hoje
          </button>

          <button onClick={() => router.push("/responsavel/aprovacoes")}>
            <span>✨</span>
            Aprovar
          </button>

          <button>
            <span>👨‍👩‍👧‍👦</span>
            Filhos
          </button>

          <button onClick={() => router.push("/responsavel/carteira")}>
            <span>💰</span>
            Carteira
          </button>
        </nav>

        {filhoPin && (
          <div className="pinOverlay" onMouseDown={fecharPin}>
            <section
              className="pinModal"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                className="pinClose"
                type="button"
                onClick={fecharPin}
                disabled={salvandoPin}
                aria-label="Fechar"
              >
                ×
              </button>

              <div className="pinIcon">🔐</div>

              <span className="pinEyebrow">ACESSO DA CRIANÇA</span>

              <h2>PIN de {primeiroNome(filhoPin.nome)}</h2>

              <p>
                Crie um código de 6 números. Você poderá trocar esse PIN quando
                quiser pelo painel do responsável.
              </p>

              <label>
                Novo PIN
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={pin}
                  onChange={(event) =>
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  placeholder="••••••"
                />
              </label>

              <label>
                Confirmar PIN
                <input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  value={confirmarPin}
                  onChange={(event) =>
                    setConfirmarPin(
                      event.target.value.replace(/\D/g, "").slice(0, 6)
                    )
                  }
                  placeholder="••••••"
                />
              </label>

              {erroPin && <div className="pinError">{erroPin}</div>}

              <button
                className="savePin"
                type="button"
                disabled={
                  salvandoPin ||
                  pin.length !== 6 ||
                  confirmarPin.length !== 6
                }
                onClick={salvarPin}
              >
                {salvandoPin ? "Salvando..." : "Salvar PIN"}
              </button>

              <small>
                O PIN não fica visível no painel depois de salvo. Para trocar,
                basta criar um novo.
              </small>
            </section>
          </div>
        )}
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          background: #fafaff;
        }

        button {
          font-family: inherit;
        }

        .familyApp {
          min-height: 100vh;
          color: #20275a;
          background:
            radial-gradient(
              circle at 8% 20%,
              rgba(221, 214, 254, 0.32),
              transparent 22%
            ),
            radial-gradient(
              circle at 95% 55%,
              rgba(254, 215, 170, 0.2),
              transparent 18%
            ),
            #fafaff;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          height: 82px;
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(255, 255, 255, 0.9);
          border-bottom: 1px solid #f0eff8;
          backdrop-filter: blur(18px);
        }

        .headerInner {
          max-width: 1280px;
          height: 100%;
          margin: auto;
          padding: 0 26px;
          display: grid;
          grid-template-columns: 240px 1fr 240px;
          align-items: center;
          gap: 25px;
        }

        .brand {
          padding: 0;
          border: 0;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          background: transparent;
          color: #20275a;
          cursor: pointer;
        }

        .brandLogo {
          width: 48px;
          height: 48px;
          flex: 0 0 48px;
          display: block;
          object-fit: contain;
          border-radius: 14px;
          box-shadow: 0 10px 22px rgba(101, 88, 245, 0.16);
        }

        .brand strong,
        .brand small {
          display: block;
        }

        .brand strong {
          font-size: 16px;
        }

        .brand small {
          margin-top: 3px;
          color: #a0a4b8;
          font-size: 8px;
        }

        .desktopNav {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px;
          border-radius: 16px;
          background: #f7f7fc;
        }

        .desktopNav button {
          height: 42px;
          padding: 0 15px;
          border: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #7c809c;
          background: transparent;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
        }

        .desktopNav button.active {
          color: #5c50e8;
          background: white;
          box-shadow: 0 5px 15px rgba(47, 43, 98, 0.07);
        }

        .desktopNav b {
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: white;
          background: #ff9366;
          font-size: 7px;
        }

        .profileArea {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .bell {
          width: 37px;
          height: 37px;
          border: 1px solid #ececf3;
          border-radius: 12px;
          background: white;
          cursor: pointer;
        }

        .parentAvatar {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          color: #5d50e8;
          background: #e7e8ff;
          font-size: 12px;
          font-weight: 900;
        }

        .parentInfo strong,
        .parentInfo small {
          display: block;
        }

        .parentInfo strong {
          font-size: 10px;
        }

        .parentInfo small {
          margin-top: 2px;
          color: #a1a5b6;
          font-size: 7px;
        }

        .logout {
          margin-left: 5px;
          border: 0;
          color: #9da1b2;
          background: transparent;
          font-size: 9px;
          cursor: pointer;
        }

        .page {
          max-width: 1180px;
          margin: auto;
          padding: 50px 26px 80px;
        }

        .error {
          margin-bottom: 20px;
          padding: 13px 16px;
          border-radius: 13px;
          color: #b91c1c;
          background: #fef2f2;
          font-size: 11px;
        }

        .financialMessage {
          margin: 24px 0 -14px;
          padding: 12px 16px;
          border: 1px solid #e5e2fb;
          border-radius: 14px;
          color: #5d50df;
          background: #f7f5ff;
          font-size: 10px;
          font-weight: 800;
        }

        .miniFinancialAction {
          width: 100%;
          margin-top: 8px;
          padding: 7px 8px;
          border: 0;
          border-radius: 9px;
          color: #8a611f;
          background: #fff3d9;
          font-size: 6px;
          font-weight: 900;
          cursor: pointer;
        }

        .miniFinancialAction.pay {
          color: #28764a;
          background: #eaf9ef;
        }

        .miniFinancialAction:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .welcome {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .todayLabel,
        .sectionHeader > div > span {
          color: #7568ee;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .welcome h1 {
          margin: 8px 0;
          font-size: clamp(33px, 4vw, 47px);
          line-height: 1.05;
          letter-spacing: -2px;
        }

        .welcome h1 span {
          color: #6658f5;
        }

        .welcome p {
          margin: 0;
          color: #9196aa;
          font-size: 13px;
        }

        .welcome p strong {
          color: #4d5271;
        }

        .dateBubble {
          min-width: 235px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #efedf8;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 10px 30px rgba(49, 44, 99, 0.05);
        }

        .dateBubble > span {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #edfbed;
          font-size: 20px;
        }

        .dateBubble small,
        .dateBubble strong,
        .dateBubble em {
          display: block;
        }

        .dateBubble small {
          color: #a1a5b5;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .dateBubble strong {
          margin-top: 4px;
          font-size: 15px;
        }

        .dateBubble em {
          margin-top: 2px;
          color: #9ca1b4;
          font-size: 8px;
          font-style: normal;
        }

        .paymentBanner,
        .firstMonthBanner {
          margin-top: 34px;
          border-radius: 25px;
        }

        .paymentBanner {
          min-height: 120px;
          padding: 22px 25px;
          display: grid;
          grid-template-columns: 55px 1fr auto auto;
          align-items: center;
          gap: 20px;
          border: 1px solid #f4e4c7;
          background: linear-gradient(110deg, #fffaf0, #fffdf9);
          box-shadow: 0 14px 35px rgba(120, 89, 33, 0.06);
        }

        .paymentIcon,
        .firstMonthIcon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #fff0ce;
          font-size: 25px;
        }

        .paymentMain > span,
        .firstMonthBanner > div:last-child > span {
          color: #c18a34;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .paymentMain h2,
        .firstMonthBanner h2 {
          margin: 5px 0;
          color: #393653;
          font-size: 17px;
        }

        .paymentMain p,
        .firstMonthBanner p {
          margin: 0;
          color: #9894a3;
          font-size: 8px;
        }

        .paymentChildren {
          display: flex;
          gap: 10px;
        }

        .paymentChildren > div {
          min-width: 95px;
          padding: 10px 12px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.78);
        }

        .paymentChildren span,
        .paymentChildren strong,
        .paymentChildren small {
          display: block;
        }

        .paymentChildren span {
          color: #9894a3;
          font-size: 7px;
        }

        .paymentChildren strong {
          margin: 3px 0;
          font-size: 11px;
        }

        .paymentChildren small {
          color: #c18a34;
          font-size: 6px;
        }

        .paymentBanner > button {
          border: 0;
          color: #9c6b20;
          background: transparent;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .paymentBanner > button span {
          margin-left: 6px;
        }

        .firstMonthBanner {
          padding: 22px 25px;
          display: flex;
          align-items: center;
          gap: 18px;
          border: 1px solid #dcefdc;
          background: linear-gradient(110deg, #f6fff7, #fbfffb);
        }

        .firstMonthIcon {
          flex: 0 0 55px;
          background: #e8f8e9;
        }

        .firstMonthBanner > div:last-child > span {
          color: #5ba46b;
        }

        .mission {
          min-height: 125px;
          margin-top: 20px;
          padding: 24px 28px;
          position: relative;
          overflow: hidden;
          display: grid;
          grid-template-columns: 58px 1fr auto;
          align-items: center;
          gap: 19px;
          border-radius: 27px;
          color: white;
          background: linear-gradient(120deg, #6557ef, #8c5ef0);
          box-shadow: 0 20px 45px rgba(100, 87, 239, 0.18);
        }

        .missionIcon {
          width: 58px;
          height: 58px;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 19px;
          background: rgba(255, 255, 255, 0.16);
          font-size: 27px;
        }

        .missionText {
          position: relative;
          z-index: 2;
        }

        .missionText > span {
          color: #dcd8ff;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .missionText h2 {
          margin: 6px 0;
          font-size: 18px;
        }

        .missionText p {
          margin: 0;
          color: #dedaff;
          font-size: 9px;
        }

        .mission > button {
          height: 40px;
          padding: 0 16px;
          position: relative;
          z-index: 2;
          border: 0;
          border-radius: 12px;
          color: #6658ed;
          background: white;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .mission > button span {
          margin-left: 9px;
        }

        .missionDecoration {
          position: absolute;
          color: rgba(255, 255, 255, 0.08);
        }

        .missionDecoration.one {
          right: 22%;
          top: -45px;
          font-size: 130px;
        }

        .missionDecoration.two {
          right: -25px;
          bottom: -95px;
          font-size: 180px;
        }

        .childrenSection {
          margin-top: 48px;
        }

        .sectionHeader {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }

        .sectionHeader h2 {
          margin: 7px 0 0;
          font-size: 24px;
          letter-spacing: -0.7px;
        }

        .sectionActions {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .deviceChild {
          height: 39px;
          padding: 0 14px;
          border: 0;
          border-radius: 12px;
          color: white;
          background: linear-gradient(120deg, #6557ef, #8c5ef0);
          box-shadow: 0 9px 20px rgba(101, 87, 239, 0.16);
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .deviceChild:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .addChild {
          height: 39px;
          padding: 0 14px;
          border: 1px solid #e6e4f3;
          border-radius: 12px;
          color: #6658e9;
          background: white;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .childrenGrid {
          margin-top: 19px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }

        .childCard {
          min-height: 420px;
          padding: 24px;
          position: relative;
          overflow: hidden;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.8);
        }

        .childCard.azul {
          background: linear-gradient(145deg, #eef4ff, #f7f8ff);
        }

        .childCard.rosa {
          background: linear-gradient(145deg, #fff0f6, #fff8fb);
        }

        .cardCloud {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.55);
        }

        .cloudOne {
          width: 180px;
          height: 180px;
          right: -90px;
          top: -100px;
        }

        .cloudTwo {
          width: 100px;
          height: 100px;
          left: -50px;
          bottom: -45px;
        }

        .childTop {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: space-between;
          gap: 15px;
        }

        .childTitle > span {
          color: #9ba0b5;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .childTitle h3 {
          margin: 4px 0;
          font-size: 25px;
          letter-spacing: -1px;
        }

        .childTitle p {
          margin: 0;
          color: #969bad;
          font-size: 9px;
        }

        .statusPill {
          height: fit-content;
          padding: 7px 10px;
          border-radius: 100px;
          color: #35a66c;
          background: rgba(255, 255, 255, 0.7);
          font-size: 7px;
          font-weight: 900;
        }

        .childMain {
          min-height: 300px;
          margin-top: 20px;
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 180px 1fr;
          gap: 20px;
          align-items: center;
        }

        .characterArea {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .characterCircle {
          width: 155px;
          height: 155px;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.72);
          box-shadow: inset 0 0 0 8px rgba(255, 255, 255, 0.35);
        }

        .characterCircle img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          object-position: bottom;
        }

        .fallbackCharacter {
          margin: auto;
          font-size: 65px;
        }

        .achievement {
          min-width: 145px;
          margin-top: -12px;
          padding: 10px 13px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 14px;
          background: white;
          box-shadow: 0 10px 25px rgba(43, 41, 87, 0.09);
        }

        .achievement > span {
          font-size: 19px;
        }

        .achievement small,
        .achievement strong {
          display: block;
        }

        .achievement small {
          color: #a1a5b6;
          font-size: 6px;
          font-weight: 900;
        }

        .achievement strong {
          margin-top: 3px;
          font-size: 12px;
        }

        .currentMonthLabel {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #74798f;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.6px;
        }

        .liveDot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #5bc884;
        }

        .moneyBlock {
          margin-top: 8px;
        }

        .moneyBlock small,
        .moneyBlock strong,
        .moneyBlock em {
          display: block;
        }

        .moneyBlock small {
          color: #999daf;
          font-size: 7px;
          font-weight: 900;
        }

        .moneyBlock strong {
          margin-top: 4px;
          font-size: 26px;
          letter-spacing: -1px;
        }

        .moneyBlock em {
          margin-top: 1px;
          color: #9ca1b1;
          font-size: 8px;
          font-style: normal;
        }

        .progressHeader {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          color: #83889e;
          font-size: 8px;
        }

        .progressTrack {
          height: 8px;
          margin-top: 7px;
          overflow: hidden;
          border-radius: 100px;
          background: rgba(255, 255, 255, 0.8);
        }

        .progressTrack div {
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #6658ef, #9a68f4);
        }

        .rosa .progressTrack div {
          background: linear-gradient(90deg, #f36da3, #ba75ed);
        }

        .previousMonth {
          margin-top: 16px;
          padding: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.72);
        }

        .previousIcon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #fff5dc;
          font-size: 17px;
        }

        .previousText {
          min-width: 0;
        }

        .previousText small,
        .previousText strong,
        .previousText span {
          display: block;
        }

        .previousText small {
          color: #a0a4b4;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .previousText strong {
          margin: 3px 0;
          font-size: 11px;
        }

        .previousText span {
          color: #999dae;
          font-size: 7px;
          line-height: 1.35;
        }

        .openChild {
          width: 100%;
          height: 39px;
          margin-top: 12px;
          padding: 0 13px;
          border: 0;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #5f53e5;
          background: white;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 7px 18px rgba(45, 42, 91, 0.05);
        }

        .childActions {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }

        .childActions .openChild {
          margin-top: 0;
        }

        .pinChild {
          width: 100%;
          height: 37px;
          padding: 0 13px;
          border: 1px solid rgba(101, 88, 239, 0.14);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: #6a5ce7;
          background: rgba(255, 255, 255, 0.62);
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .pinOverlay {
          position: fixed;
          z-index: 100;
          inset: 0;
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(31, 35, 74, 0.38);
          backdrop-filter: blur(7px);
        }

        .pinModal {
          width: min(100%, 410px);
          padding: 30px;
          position: relative;
          border: 1px solid #eeecf8;
          border-radius: 27px;
          background: white;
          box-shadow: 0 30px 80px rgba(38, 34, 83, 0.22);
        }

        .pinClose {
          width: 34px;
          height: 34px;
          position: absolute;
          top: 16px;
          right: 16px;
          border: 0;
          border-radius: 11px;
          color: #8f93a7;
          background: #f5f5fa;
          font-size: 20px;
          cursor: pointer;
        }

        .pinIcon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #f0eeff;
          font-size: 25px;
        }

        .pinEyebrow {
          margin-top: 18px;
          display: block;
          color: #7568ee;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .pinModal h2 {
          margin: 6px 0 7px;
          color: #252b5e;
          font-size: 23px;
          letter-spacing: -0.7px;
        }

        .pinModal > p {
          margin: 0 0 21px;
          color: #969bad;
          font-size: 10px;
          line-height: 1.55;
        }

        .pinModal label {
          margin-top: 12px;
          display: block;
          color: #656a82;
          font-size: 9px;
          font-weight: 900;
        }

        .pinModal input {
          width: 100%;
          height: 50px;
          margin-top: 7px;
          padding: 0 16px;
          border: 1px solid #e7e5f1;
          outline: none;
          border-radius: 14px;
          color: #252b5e;
          background: #fbfbfe;
          font-size: 19px;
          font-weight: 900;
          letter-spacing: 8px;
        }

        .pinModal input:focus {
          border-color: #8d81f2;
          box-shadow: 0 0 0 3px rgba(101, 88, 239, 0.08);
        }

        .pinError {
          margin-top: 12px;
          padding: 10px 12px;
          border-radius: 11px;
          color: #b91c1c;
          background: #fef2f2;
          font-size: 9px;
          font-weight: 800;
        }

        .savePin {
          width: 100%;
          height: 46px;
          margin-top: 18px;
          border: 0;
          border-radius: 14px;
          color: white;
          background: linear-gradient(135deg, #6658f5, #8d61ee);
          font-size: 10px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 12px 25px rgba(101, 88, 245, 0.2);
        }

        .savePin:disabled,
        .pinClose:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pinModal > small {
          margin-top: 12px;
          display: block;
          color: #a2a6b7;
          font-size: 8px;
          line-height: 1.45;
          text-align: center;
        }

        .familyBottom {
          margin-top: 20px;
          display: grid;
          grid-template-columns: 1.5fr 0.8fr;
          gap: 20px;
        }

        .familyWallet,
        .familyTip {
          min-height: 150px;
          border-radius: 24px;
        }

        .familyWallet {
          padding: 25px;
          display: grid;
          grid-template-columns: 55px 1fr auto;
          align-items: center;
          gap: 17px;
          background: white;
          border: 1px solid #efedf6;
        }

        .walletIcon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #fff2d7;
          font-size: 25px;
        }

        .walletText > span {
          color: #9da1b3;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .walletText h3 {
          margin: 5px 0;
          font-size: 19px;
        }

        .walletText h3 small {
          color: #9ca0b0;
          font-size: 9px;
          font-weight: 500;
        }

        .walletText p {
          margin: 0;
          color: #a0a4b4;
          font-size: 8px;
        }

        .familyWallet button {
          border: 0;
          color: #6659e8;
          background: transparent;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .familyTip {
          padding: 23px;
          color: white;
          background: linear-gradient(135deg, #ff9966, #ff7b85);
          box-shadow: 0 16px 35px rgba(255, 126, 112, 0.15);
        }

        .tipIcon {
          font-size: 23px;
        }

        .familyTip > span {
          margin-left: 6px;
          color: #ffe1d8;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .familyTip h3 {
          margin: 13px 0 7px;
          font-size: 14px;
        }

        .familyTip p {
          margin: 0;
          color: #fff0eb;
          font-size: 8px;
          line-height: 1.55;
        }

        .mobileNav {
          display: none;
        }

        @media (max-width: 1000px) {
          .headerInner {
            grid-template-columns: 180px 1fr auto;
          }

          .parentInfo,
          .logout {
            display: none;
          }

          .childrenGrid {
            grid-template-columns: 1fr;
          }

          .paymentBanner {
            grid-template-columns: 55px 1fr auto;
          }

          .paymentChildren {
            grid-column: 2 / -1;
          }
        }

        @media (max-width: 760px) {
          .header {
            height: 70px;
          }

          .headerInner {
            padding: 0 17px;
            display: flex;
            justify-content: space-between;
          }

          .desktopNav {
            display: none;
          }

          .page {
            padding: 30px 17px 110px;
          }

          .welcome {
            align-items: flex-start;
            flex-direction: column;
          }

          .welcome h1 {
            font-size: 35px;
          }

          .dateBubble {
            width: 100%;
          }

          .paymentBanner {
            display: flex;
            align-items: flex-start;
            flex-direction: column;
          }

          .paymentChildren {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
          }

          .paymentChildren > div {
            min-width: 0;
          }

          .firstMonthBanner {
            align-items: flex-start;
          }

          .mission {
            padding: 21px;
            grid-template-columns: 48px 1fr;
          }

          .missionIcon {
            width: 48px;
            height: 48px;
          }

          .mission > button {
            grid-column: 1 / -1;
            width: 100%;
          }

          .childMain {
            grid-template-columns: 130px 1fr;
            gap: 14px;
          }

          .characterCircle {
            width: 120px;
            height: 120px;
          }

          .achievement {
            min-width: 120px;
          }

          .familyBottom {
            grid-template-columns: 1fr;
          }

          .familyWallet {
            grid-template-columns: 48px 1fr;
          }

          .familyWallet button {
            grid-column: 1 / -1;
            text-align: left;
          }

          .mobileNav {
            height: 70px;
            position: fixed;
            z-index: 60;
            left: 12px;
            right: 12px;
            bottom: 12px;
            padding: 6px;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            border: 1px solid #eeeef6;
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.95);
            box-shadow: 0 14px 40px rgba(37, 34, 77, 0.15);
            backdrop-filter: blur(18px);
          }

          .mobileNav button {
            border: 0;
            border-radius: 14px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            color: #989cad;
            background: transparent;
            font-size: 7px;
            font-weight: 800;
          }

          .mobileNav button span {
            font-size: 17px;
          }

          .mobileNav button.active {
            color: #6658ec;
            background: #f1efff;
          }
        }

        @media (max-width: 700px) {
          .sectionHeader {
            align-items: flex-start;
            gap: 14px;
          }

          .sectionActions {
            flex-direction: column;
            align-items: stretch;
          }

          .deviceChild,
          .addChild {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .childMain {
            display: block;
          }

          .characterArea {
            margin-bottom: 25px;
          }

          .characterCircle {
            width: 150px;
            height: 150px;
          }
        }
      `}</style>
    </>
  );
}