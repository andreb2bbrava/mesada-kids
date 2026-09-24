"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Aprovacao = {
  execucao_id: string;
  filho_id: string;
  filho_nome: string;
  tarefa_id: string;
  tarefa_nome: string;
  data_execucao: string;
  enviado_em: string;
  observacao_filho: string | null;
  valor_estimado: number | string | null;
};

export default function AprovacoesPage() {
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string[]>([]);
  const [pendencias, setPendencias] = useState<Aprovacao[]>([]);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

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

      const { data, error } = await supabase.rpc(
        "listar_aprovacoes_pendentes"
      );

      if (error) {
        throw error;
      }

      const lista = ((data ?? []) as Aprovacao[]).map((item) => ({
        ...item,
        valor_estimado: Number(item.valor_estimado ?? 0),
      }));

      setPendencias(lista);

      setSelecionados((atuais) =>
        atuais.filter((id) =>
          lista.some((item) => item.execucao_id === id)
        )
      );
    } catch (error) {
      console.error(error);
      setErro("Não foi possível carregar as aprovações.");
    } finally {
      setCarregando(false);
    }
  }

  function primeiroNome(nome: string) {
    return nome.split(" ")[0] ?? nome;
  }

  function dinheiro(valor: number | string | null) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data: string) {
    const hoje = new Date();
    const dataLocal = new Date(`${data}T12:00:00`);

    const hojeTexto = [
      hoje.getFullYear(),
      String(hoje.getMonth() + 1).padStart(2, "0"),
      String(hoje.getDate()).padStart(2, "0"),
    ].join("-");

    if (data === hojeTexto) {
      return "Hoje";
    }

    return dataLocal.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
    });
  }

  function formatarHora(data: string) {
    if (!data) return "";

    return new Date(data).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
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

  function estaProcessando(id: string) {
    return processando.includes(id);
  }

  function iniciarProcessamento(id: string) {
    setProcessando((atual) =>
      atual.includes(id) ? atual : [...atual, id]
    );
  }

  function finalizarProcessamento(id: string) {
    setProcessando((atual) =>
      atual.filter((item) => item !== id)
    );
  }

  function alternarSelecao(id: string) {
    setSelecionados((atuais) =>
      atuais.includes(id)
        ? atuais.filter((item) => item !== id)
        : [...atuais, id]
    );
  }

  function selecionarTodas() {
    if (
      pendencias.length > 0 &&
      selecionados.length === pendencias.length
    ) {
      setSelecionados([]);
      return;
    }

    setSelecionados(
      pendencias.map((item) => item.execucao_id)
    );
  }

  async function aprovar(id: string, silencioso = false) {
    iniciarProcessamento(id);
    setErro("");

    if (!silencioso) {
      setMensagem("");
    }

    try {
      const { error } = await supabase.rpc(
        "aprovar_execucao",
        {
          p_execucao_id: id,
          p_observacao: null,
        }
      );

      if (error) {
        throw error;
      }

      setPendencias((atuais) =>
        atuais.filter((item) => item.execucao_id !== id)
      );

      setSelecionados((atuais) =>
        atuais.filter((item) => item !== id)
      );

      if (!silencioso) {
        setMensagem("Missão aprovada! O valor entrou na mesada. 🎉");
      }

      return true;
    } catch (error) {
      console.error(error);

      if (!silencioso) {
        setErro("Não foi possível aprovar esta missão.");
      }

      return false;
    } finally {
      finalizarProcessamento(id);
    }
  }

  async function recusar(id: string) {
    iniciarProcessamento(id);
    setErro("");
    setMensagem("");

    try {
      const { error } = await supabase.rpc(
        "recusar_execucao",
        {
          p_execucao_id: id,
          p_observacao: null,
        }
      );

      if (error) {
        throw error;
      }

      setPendencias((atuais) =>
        atuais.filter((item) => item.execucao_id !== id)
      );

      setSelecionados((atuais) =>
        atuais.filter((item) => item !== id)
      );

      setMensagem(
        "Missão recusada. Nenhum valor foi acrescentado à mesada."
      );
    } catch (error) {
      console.error(error);
      setErro("Não foi possível recusar esta missão.");
    } finally {
      finalizarProcessamento(id);
    }
  }

  async function aprovarSelecionadas() {
    if (selecionados.length === 0) return;

    const ids = [...selecionados];

    setErro("");
    setMensagem("");

    let aprovadas = 0;
    let falhas = 0;

    for (const id of ids) {
      const sucesso = await aprovar(id, true);

      if (sucesso) {
        aprovadas++;
      } else {
        falhas++;
      }
    }

    if (aprovadas > 0) {
      setMensagem(
        `${aprovadas} ${
          aprovadas === 1 ? "missão aprovada" : "missões aprovadas"
        } com sucesso! 🎉`
      );
    }

    if (falhas > 0) {
      setErro(
        `${falhas} ${
          falhas === 1
            ? "missão não pôde ser aprovada"
            : "missões não puderam ser aprovadas"
        }.`
      );
    }

    await carregar();
  }

  async function aprovarTodas() {
    if (pendencias.length === 0) return;

    const ids = pendencias.map(
      (item) => item.execucao_id
    );

    setSelecionados(ids);

    setErro("");
    setMensagem("");

    let aprovadas = 0;
    let falhas = 0;

    for (const id of ids) {
      const sucesso = await aprovar(id, true);

      if (sucesso) {
        aprovadas++;
      } else {
        falhas++;
      }
    }

    if (aprovadas > 0) {
      setMensagem(
        `${aprovadas} ${
          aprovadas === 1 ? "missão aprovada" : "missões aprovadas"
        } com sucesso! 🎉`
      );
    }

    if (falhas > 0) {
      setErro(
        `${falhas} ${
          falhas === 1
            ? "missão apresentou erro"
            : "missões apresentaram erro"
        }.`
      );
    }

    await carregar();
  }

  const totalEstimado = useMemo(
    () =>
      pendencias.reduce(
        (total, item) =>
          total + Number(item.valor_estimado ?? 0),
        0
      ),
    [pendencias]
  );

  const totalSelecionado = useMemo(
    () =>
      pendencias
        .filter((item) =>
          selecionados.includes(item.execucao_id)
        )
        .reduce(
          (total, item) =>
            total + Number(item.valor_estimado ?? 0),
          0
        ),
    [pendencias, selecionados]
  );

  const nomesFilhos = useMemo(
    () =>
      Array.from(
        new Set(
          pendencias.map((item) =>
            primeiroNome(item.filho_nome)
          )
        )
      ),
    [pendencias]
  );

  if (carregando) {
    return (
      <main className="loading">
        <div className="loadingStar">★</div>
        <strong>Mesada Kids</strong>
        <span>Buscando as missões...</span>

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

          .loadingStar {
            width: 55px;
            height: 55px;
            display: flex;
            justify-content: center;
            align-items: center;
            border-radius: 18px;
            color: white;
            background: linear-gradient(
              135deg,
              #6558f5,
              #9b68f5
            );
            font-size: 23px;
            box-shadow: 0 14px 30px
              rgba(99, 91, 239, 0.22);
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
      <main className="app">
        <header className="header">
          <div className="headerInner">
            <button
              className="brand"
              onClick={() =>
                router.push("/responsavel")
              }
            >
              <span className="brandStar">★</span>

              <div>
                <strong>Mesada Kids</strong>
                <small>Central da família</small>
              </div>
            </button>

            <button
              className="back"
              onClick={() =>
                router.push("/responsavel")
              }
            >
              <span>←</span>
              Voltar para hoje
            </button>
          </div>
        </header>

        <section className="page">
          <section className="hero">
            <div>
              <span className="eyebrow">
                CENTRAL DE APROVAÇÕES
              </span>

              <h1>
                Hora de conferir as{" "}
                <span>missões!</span> ✨
              </h1>

              <p>
                Veja o que a turma realizou antes de
                adicionar as conquistas à mesada.
              </p>
            </div>

            <div className="heroBadge">
              <span>🙌</span>

              <div>
                <small>ESPERANDO VOCÊ</small>
                <strong>{pendencias.length}</strong>
                <em>
                  {pendencias.length === 1
                    ? "missão"
                    : "missões"}
                </em>
              </div>
            </div>
          </section>

          {erro && (
            <div className="message error">
              <span>⚠️</span>
              {erro}
            </div>
          )}

          {mensagem && (
            <div className="message success">
              <span>✓</span>
              {mensagem}
            </div>
          )}

          {pendencias.length === 0 ? (
            <section className="empty">
              <div className="emptyDecoration one">
                ★
              </div>
              <div className="emptyDecoration two">
                ●
              </div>

              <div className="emptyIcon">🌈</div>

              <span>TUDO EM DIA</span>

              <h2>
                Nenhuma missão esperando aprovação.
              </h2>

              <p>
                Quando Lorenzo ou Betina tocar em
                <strong> “Fiz!”</strong>, a atividade
                aparecerá aqui para você conferir.
              </p>

              <button
                onClick={() =>
                  router.push("/responsavel")
                }
              >
                Voltar para a família
                <span>→</span>
              </button>
            </section>
          ) : (
            <>
              <section className="summary">
                <div className="summaryMain">
                  <div className="summaryIcon">
                    ✨
                  </div>

                  <div>
                    <span>AGUARDANDO APROVAÇÃO</span>

                    <h2>
                      {pendencias.length}{" "}
                      {pendencias.length === 1
                        ? "missão"
                        : "missões"}
                    </h2>

                    <p>
                      {nomesFilhos.join(" e ")}
                    </p>
                  </div>
                </div>

                <div className="summaryValue">
                  <small>
                    VALOR SE TODAS FOREM APROVADAS
                  </small>

                  <strong>
                    {dinheiro(totalEstimado)}
                  </strong>
                </div>
              </section>

              <section className="toolbar">
                <button
                  className="selectAll"
                  onClick={selecionarTodas}
                >
                  <span
                    className={`checkbox ${
                      selecionados.length ===
                        pendencias.length &&
                      pendencias.length > 0
                        ? "checked"
                        : ""
                    }`}
                  >
                    {selecionados.length ===
                      pendencias.length &&
                    pendencias.length > 0
                      ? "✓"
                      : ""}
                  </span>

                  {selecionados.length ===
                  pendencias.length
                    ? "Desmarcar todas"
                    : "Selecionar todas"}
                </button>

                <div className="toolbarActions">
                  {selecionados.length > 0 && (
                    <button
                      className="approveSelected"
                      onClick={aprovarSelecionadas}
                    >
                      Aprovar selecionadas (
                      {selecionados.length}) •{" "}
                      {dinheiro(totalSelecionado)}
                    </button>
                  )}

                  <button
                    className="approveAll"
                    onClick={aprovarTodas}
                  >
                    ✓ Aprovar todas
                  </button>
                </div>
              </section>

              <section className="cards">
                {pendencias.map((item) => {
                  const nome = primeiroNome(
                    item.filho_nome
                  );

                  const imagem = personagem(
                    item.filho_nome
                  );

                  const selecionado =
                    selecionados.includes(
                      item.execucao_id
                    );

                  const bloqueado =
                    estaProcessando(
                      item.execucao_id
                    );

                  return (
                    <article
                      className={`card ${
                        selecionado
                          ? "selected"
                          : ""
                      }`}
                      key={item.execucao_id}
                    >
                      <button
                        className={`cardCheckbox ${
                          selecionado
                            ? "checked"
                            : ""
                        }`}
                        onClick={() =>
                          alternarSelecao(
                            item.execucao_id
                          )
                        }
                        aria-label="Selecionar missão"
                      >
                        {selecionado ? "✓" : ""}
                      </button>

                      <div className="child">
                        <div className="avatar">
                          {imagem ? (
                            <img
                              src={imagem}
                              alt={nome}
                            />
                          ) : (
                            <span>😊</span>
                          )}
                        </div>

                        <div>
                          <small>MISSÃO DE</small>
                          <strong>{nome}</strong>
                        </div>
                      </div>

                      <div className="task">
                        <span className="taskIcon">
                          ⭐
                        </span>

                        <div>
                          <small>
                            MISSÃO REALIZADA
                          </small>

                          <h3>
                            {item.tarefa_nome}
                          </h3>

                          <p>
                            {formatarData(
                              item.data_execucao
                            )}
                            {item.enviado_em
                              ? ` • enviada às ${formatarHora(
                                  item.enviado_em
                                )}`
                              : ""}
                          </p>

                          {item.observacao_filho && (
                            <blockquote>
                              “
                              {
                                item.observacao_filho
                              }
                              ”
                            </blockquote>
                          )}
                        </div>
                      </div>

                      <div className="value">
                        <small>
                          VALE NESTE MÊS
                        </small>

                        <strong>
                          +
                          {dinheiro(
                            item.valor_estimado
                          )}
                        </strong>

                        <span>
                          entra só se aprovada
                        </span>
                      </div>

                      <div className="actions">
                        <button
                          className="reject"
                          disabled={bloqueado}
                          onClick={() =>
                            recusar(
                              item.execucao_id
                            )
                          }
                        >
                          {bloqueado
                            ? "..."
                            : "Recusar"}
                        </button>

                        <button
                          className="approve"
                          disabled={bloqueado}
                          onClick={() =>
                            aprovar(
                              item.execucao_id
                            )
                          }
                        >
                          {bloqueado
                            ? "Aguarde..."
                            : "✓ Aprovar"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </section>

              <section className="tip">
                <span className="tipIcon">💡</span>

                <div>
                  <small>DICA PARA A FAMÍLIA</small>

                  <strong>
                    Aprovar também é reconhecer.
                  </strong>

                  <p>
                    Um elogio junto da aprovação ajuda a
                    transformar tarefas em bons hábitos.
                  </p>
                </div>
              </section>
            </>
          )}
        </section>
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

        .app {
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
          border-bottom: 1px solid #f0eff8;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
        }

        .headerInner {
          max-width: 1180px;
          height: 100%;
          margin: auto;
          padding: 0 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          padding: 0;
          border: 0;
          display: flex;
          align-items: center;
          gap: 11px;
          text-align: left;
          color: #20275a;
          background: transparent;
          cursor: pointer;
        }

        .brandStar {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          color: white;
          background: linear-gradient(
            135deg,
            #6658f5,
            #9d68f5
          );
          box-shadow: 0 10px 22px
            rgba(101, 88, 245, 0.2);
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

        .back {
          height: 40px;
          padding: 0 15px;
          border: 1px solid #e9e7f3;
          border-radius: 12px;
          color: #686d87;
          background: white;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .back span {
          margin-right: 7px;
        }

        .page {
          max-width: 1180px;
          margin: auto;
          padding: 50px 26px 80px;
        }

        .hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 30px;
        }

        .eyebrow {
          color: #7568ee;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;
        }

        .hero h1 {
          margin: 8px 0;
          font-size: clamp(33px, 4vw, 47px);
          line-height: 1.05;
          letter-spacing: -2px;
        }

        .hero h1 span {
          color: #6658f5;
        }

        .hero p {
          margin: 0;
          color: #9196aa;
          font-size: 13px;
        }

        .heroBadge {
          min-width: 210px;
          padding: 15px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1px solid #efedf8;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.85);
          box-shadow: 0 10px 30px
            rgba(49, 44, 99, 0.05);
        }

        .heroBadge > span {
          width: 45px;
          height: 45px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #f0edff;
          font-size: 21px;
        }

        .heroBadge small,
        .heroBadge strong,
        .heroBadge em {
          display: block;
        }

        .heroBadge small {
          color: #a1a5b5;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .heroBadge strong {
          margin-top: 2px;
          font-size: 20px;
        }

        .heroBadge em {
          color: #9ca1b4;
          font-size: 8px;
          font-style: normal;
        }

        .message {
          margin-top: 22px;
          padding: 14px 17px;
          display: flex;
          align-items: center;
          gap: 9px;
          border-radius: 14px;
          font-size: 10px;
          font-weight: 700;
        }

        .message.error {
          color: #b91c1c;
          background: #fef2f2;
        }

        .message.success {
          color: #287a4a;
          background: #ecfdf3;
        }

        .empty {
          min-height: 350px;
          margin-top: 34px;
          padding: 45px 30px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          border-radius: 30px;
          color: white;
          background: linear-gradient(
            120deg,
            #6557ef,
            #8c5ef0
          );
          box-shadow: 0 20px 45px
            rgba(100, 87, 239, 0.18);
        }

        .emptyIcon {
          width: 72px;
          height: 72px;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 23px;
          background: rgba(255, 255, 255, 0.16);
          font-size: 34px;
        }

        .empty > span:not(.emptyDecoration) {
          margin-top: 20px;
          position: relative;
          z-index: 2;
          color: #dedaff;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        .empty h2 {
          max-width: 550px;
          margin: 7px 0;
          position: relative;
          z-index: 2;
          font-size: 25px;
        }

        .empty p {
          max-width: 530px;
          margin: 0;
          position: relative;
          z-index: 2;
          color: #dedaff;
          font-size: 10px;
          line-height: 1.6;
        }

        .empty button {
          height: 42px;
          margin-top: 22px;
          padding: 0 18px;
          position: relative;
          z-index: 2;
          border: 0;
          border-radius: 13px;
          color: #6658ed;
          background: white;
          font-size: 9px;
          font-weight: 900;
          cursor: pointer;
        }

        .empty button span {
          margin-left: 10px;
        }

        .emptyDecoration {
          position: absolute;
          color: rgba(255, 255, 255, 0.07);
        }

        .emptyDecoration.one {
          top: -70px;
          right: 15%;
          font-size: 190px;
        }

        .emptyDecoration.two {
          left: -60px;
          bottom: -160px;
          font-size: 300px;
        }

        .summary {
          min-height: 105px;
          margin-top: 34px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          border: 1px solid #e9e6fb;
          border-radius: 23px;
          background: linear-gradient(
            110deg,
            #f7f5ff,
            #ffffff
          );
        }

        .summaryMain {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .summaryIcon {
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 17px;
          background: #ece9ff;
          font-size: 23px;
        }

        .summaryMain span,
        .summaryValue small {
          color: #9b9fb2;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.9px;
        }

        .summaryMain h2 {
          margin: 4px 0;
          font-size: 18px;
        }

        .summaryMain p {
          margin: 0;
          color: #9a9eaf;
          font-size: 8px;
        }

        .summaryValue {
          text-align: right;
        }

        .summaryValue small,
        .summaryValue strong {
          display: block;
        }

        .summaryValue strong {
          margin-top: 5px;
          color: #4f46d8;
          font-size: 20px;
        }

        .toolbar {
          margin-top: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .selectAll {
          padding: 0;
          border: 0;
          display: flex;
          align-items: center;
          gap: 9px;
          color: #777c94;
          background: transparent;
          font-size: 9px;
          font-weight: 800;
          cursor: pointer;
        }

        .checkbox,
        .cardCheckbox {
          width: 20px;
          height: 20px;
          border: 1px solid #dcd9ed;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          color: white;
          background: white;
          font-size: 10px;
          font-weight: 900;
        }

        .checkbox.checked,
        .cardCheckbox.checked {
          border-color: #6759ef;
          background: #6759ef;
        }

        .toolbarActions {
          display: flex;
          gap: 8px;
        }

        .toolbarActions button {
          height: 38px;
          padding: 0 14px;
          border-radius: 11px;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .approveSelected {
          border: 1px solid #ddd9fa;
          color: #6255e8;
          background: white;
        }

        .approveAll {
          border: 0;
          color: white;
          background: linear-gradient(
            135deg,
            #6658ef,
            #8b62ee
          );
        }

        .cards {
          margin-top: 14px;
          display: grid;
          gap: 12px;
        }

        .card {
          min-height: 125px;
          padding: 18px 20px;
          display: grid;
          grid-template-columns:
            30px 150px minmax(220px, 1fr)
            125px 180px;
          align-items: center;
          gap: 16px;
          border: 1px solid #efedf6;
          border-radius: 21px;
          background: white;
          box-shadow: 0 8px 25px
            rgba(47, 43, 98, 0.035);
          transition:
            border-color 0.2s,
            transform 0.2s;
        }

        .card.selected {
          border-color: #cfc9fa;
          background: #fdfcff;
        }

        .cardCheckbox {
          padding: 0;
          cursor: pointer;
        }

        .child {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar {
          width: 47px;
          height: 47px;
          overflow: hidden;
          flex: 0 0 47px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: #f1efff;
        }

        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .child small,
        .child strong {
          display: block;
        }

        .child small,
        .task small,
        .value small {
          color: #a0a4b5;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.7px;
        }

        .child strong {
          margin-top: 3px;
          font-size: 11px;
        }

        .task {
          min-width: 0;
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }

        .taskIcon {
          width: 35px;
          height: 35px;
          flex: 0 0 35px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #fff7df;
          font-size: 16px;
        }

        .task h3 {
          margin: 3px 0;
          font-size: 12px;
        }

        .task p {
          margin: 0;
          color: #a0a3b3;
          font-size: 7px;
        }

        .task blockquote {
          margin: 7px 0 0;
          color: #7d8197;
          font-size: 8px;
          font-style: italic;
        }

        .value {
          text-align: right;
        }

        .value small,
        .value strong,
        .value span {
          display: block;
        }

        .value strong {
          margin: 4px 0 2px;
          color: #35a66c;
          font-size: 15px;
        }

        .value span {
          color: #a1a5b5;
          font-size: 6px;
        }

        .actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .actions button {
          height: 38px;
          border-radius: 11px;
          font-size: 8px;
          font-weight: 900;
          cursor: pointer;
        }

        .actions button:disabled {
          opacity: 0.55;
          cursor: wait;
        }

        .reject {
          border: 1px solid #f1d7dc;
          color: #cf6572;
          background: #fffafa;
        }

        .approve {
          border: 0;
          color: white;
          background: linear-gradient(
            135deg,
            #6658ef,
            #8b62ee
          );
        }

        .tip {
          margin-top: 24px;
          padding: 20px 22px;
          display: flex;
          align-items: center;
          gap: 13px;
          border-radius: 19px;
          background: linear-gradient(
            110deg,
            #fff9ec,
            #fffdf8
          );
          border: 1px solid #f4e9cf;
        }

        .tipIcon {
          width: 44px;
          height: 44px;
          flex: 0 0 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #fff0ce;
          font-size: 20px;
        }

        .tip small,
        .tip strong,
        .tip p {
          display: block;
        }

        .tip small {
          color: #c18a34;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: 0.9px;
        }

        .tip strong {
          margin-top: 3px;
          font-size: 11px;
        }

        .tip p {
          margin: 3px 0 0;
          color: #9995a3;
          font-size: 8px;
        }

        @media (max-width: 950px) {
          .card {
            grid-template-columns:
              30px 130px minmax(180px, 1fr)
              110px;
          }

          .actions {
            grid-column: 3 / -1;
          }
        }

        @media (max-width: 760px) {
          .header {
            height: 70px;
          }

          .headerInner {
            padding: 0 17px;
          }

          .page {
            padding: 30px 17px 80px;
          }

          .hero {
            align-items: flex-start;
            flex-direction: column;
          }

          .hero h1 {
            font-size: 35px;
          }

          .heroBadge {
            width: 100%;
          }

          .summary {
            align-items: flex-start;
            flex-direction: column;
          }

          .summaryValue {
            width: 100%;
            padding-top: 14px;
            border-top: 1px solid #ece9f7;
            text-align: left;
          }

          .toolbar {
            align-items: flex-start;
            flex-direction: column;
          }

          .toolbarActions {
            width: 100%;
          }

          .toolbarActions button {
            flex: 1;
          }

          .card {
            padding: 17px;
            grid-template-columns: 25px 1fr;
          }

          .child {
            grid-column: 2;
          }

          .task,
          .value,
          .actions {
            grid-column: 2;
          }

          .value {
            padding: 10px 0;
            border-top: 1px solid #f1eff6;
            border-bottom: 1px solid #f1eff6;
            text-align: left;
          }

          .back {
            padding: 0 10px;
            font-size: 7px;
          }
        }

        @media (max-width: 480px) {
          .brand small {
            display: none;
          }

          .toolbarActions {
            flex-direction: column;
          }

          .empty {
            padding: 40px 20px;
          }

          .empty h2 {
            font-size: 21px;
          }
        }
      `}</style>
    </>
  );
}