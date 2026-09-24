"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Perfil = {
  id: string;
  nome: string;
  familia_id: string;
};

type ItemCarteira = {
  mesada_id: string;
  perfil_filho_id: string;
  filho_nome: string;
  ano: number;
  mes: number;
  valor_base: number;
  conquistado: number;
  valor_fechamento: number | null;
  fechada: boolean;
  fechada_em: string | null;
  paga: boolean;
  paga_em: string | null;
  status: "conquistando" | "aguardando_fechamento" | "a_pagar" | "pago";
};

const MESES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function CarteiraPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [responsavel, setResponsavel] = useState<Perfil | null>(null);
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [itens, setItens] = useState<ItemCarteira[]>([]);
  const [erro, setErro] = useState("");
  const [filtroFilho, setFiltroFilho] = useState("todos");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    try {
      setCarregando(true);
      setErro("");

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const { data: perfil, error: perfilError } = await supabase
        .from("perfis")
        .select("id,nome,familia_id")
        .eq("auth_user_id", user.id)
        .eq("tipo", "responsavel")
        .eq("ativo", true)
        .single();

      if (perfilError || !perfil) throw perfilError ?? new Error("Perfil não encontrado.");
      setResponsavel(perfil as Perfil);

      const { data: familia } = await supabase
        .from("familias")
        .select("nome")
        .eq("id", perfil.familia_id)
        .single();

      if (familia?.nome) setNomeFamilia(familia.nome);

      const { data, error } = await supabase.rpc("historico_carteira");
      if (error) throw error;

      setItens(
        ((data ?? []) as ItemCarteira[]).map((item) => ({
          ...item,
          valor_base: Number(item.valor_base ?? 0),
          conquistado: Number(item.conquistado ?? 0),
          valor_fechamento:
            item.valor_fechamento === null ? null : Number(item.valor_fechamento),
        }))
      );
    } catch (e) {
      console.error(e);
      setErro("Não foi possível carregar a carteira da família.");
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  function dinheiro(valor: number | null | undefined) {
    return Number(valor ?? 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function primeiroNome(nome?: string) {
    return nome?.split(" ")[0] ?? "";
  }

  function nomeMes(mes: number) {
    return MESES[mes] ?? "";
  }

  function formatarData(data?: string | null) {
    if (!data) return "";
    return new Date(data).toLocaleDateString("pt-BR");
  }

  function statusInfo(status: ItemCarteira["status"]) {
    if (status === "pago") return { rotulo: "Pago", icone: "✓", classe: "pago" };
    if (status === "a_pagar") return { rotulo: "A pagar", icone: "💳", classe: "pagar" };
    if (status === "aguardando_fechamento")
      return { rotulo: "Aguardando fechamento", icone: "⏳", classe: "fechamento" };
    return { rotulo: "Conquistando", icone: "🌱", classe: "andamento" };
  }

  const filhos = useMemo(
    () =>
      Array.from(
        new Map(itens.map((item) => [item.perfil_filho_id, item.filho_nome])).entries()
      ).map(([id, nome]) => ({ id, nome })),
    [itens]
  );

  const filtrados = useMemo(
    () =>
      filtroFilho === "todos"
        ? itens
        : itens.filter((item) => item.perfil_filho_id === filtroFilho),
    [itens, filtroFilho]
  );

  const competencias = useMemo(() => {
    const mapa = new Map<string, ItemCarteira[]>();
    for (const item of filtrados) {
      const chave = `${item.ano}-${String(item.mes).padStart(2, "0")}`;
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(item);
    }
    return Array.from(mapa.entries());
  }, [filtrados]);

  const totalAtual = itens
    .filter((i) => i.status === "conquistando")
    .reduce((s, i) => s + i.conquistado, 0);

  const totalPago = itens
    .filter((i) => i.paga)
    .reduce((s, i) => s + Number(i.valor_fechamento ?? i.conquistado), 0);

  const totalAPagar = itens
    .filter((i) => i.status === "a_pagar")
    .reduce((s, i) => s + Number(i.valor_fechamento ?? i.conquistado), 0);

  if (carregando) {
    return (
      <main className="loading">
        <div>★</div>
        <strong>Mesada Kids</strong>
        <span>Organizando a carteira...</span>
        <style jsx>{`
          .loading { min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;background:#fafaff;color:#20275a;font-family:Arial,sans-serif }
          .loading div { width:55px;height:55px;border-radius:18px;display:flex;align-items:center;justify-content:center;color:white;background:linear-gradient(135deg,#6558f5,#9b68f5);font-size:23px }
          .loading span { color:#9ca3b8;font-size:12px }
        `}</style>
      </main>
    );
  }

  return (
    <main className="walletApp">
      <header className="header">
        <div className="headerInner">
          <button className="brand" onClick={() => router.push("/responsavel")}>
            <span className="brandStar">★</span>
            <div>
              <strong>Mesada Kids</strong>
              <small>{nomeFamilia || "Minha família"}</small>
            </div>
          </button>

          <nav className="desktopNav">
            <button onClick={() => router.push("/responsavel")}><span>🏠</span>Hoje</button>
            <button onClick={() => router.push("/responsavel/aprovacoes")}><span>✨</span>Aprovar</button>
            <button onClick={() => router.push("/responsavel")}><span>👨‍👩‍👧‍👦</span>Meus filhos</button>
            <button className="active"><span>💰</span>Carteira</button>
          </nav>

          <div className="profileArea">
            <div className="parentAvatar">{primeiroNome(responsavel?.nome).charAt(0)}</div>
            <div className="parentInfo">
              <strong>{primeiroNome(responsavel?.nome)}</strong>
              <small>Responsável</small>
            </div>
            <button className="logout" onClick={sair}>Sair</button>
          </div>
        </div>
      </header>

      <section className="page">
        <button className="back" onClick={() => router.push("/responsavel")}>← Voltar para hoje</button>

        <section className="hero">
          <div>
            <span>CARTEIRA DA FAMÍLIA</span>
            <h1>O dinheiro também conta uma história. <b>💰</b></h1>
            <p>Acompanhe as conquistas, fechamentos e pagamentos mês a mês.</p>
          </div>
          <div className="coin">🪙</div>
        </section>

        {erro && <div className="error">{erro}</div>}

        <section className="summary">
          <article>
            <div className="summaryIcon purple">🌱</div>
            <div><small>EM CONQUISTA AGORA</small><strong>{dinheiro(totalAtual)}</strong><span>competência atual</span></div>
          </article>
          <article>
            <div className="summaryIcon orange">💳</div>
            <div><small>A PAGAR</small><strong>{dinheiro(totalAPagar)}</strong><span>mesadas já fechadas</span></div>
          </article>
          <article>
            <div className="summaryIcon green">✓</div>
            <div><small>HISTÓRICO PAGO</small><strong>{dinheiro(totalPago)}</strong><span>total registrado</span></div>
          </article>
        </section>

        <section className="toolbar">
          <div>
            <span>HISTÓRICO FINANCEIRO</span>
            <h2>Competências</h2>
          </div>
          <div className="filters">
            <button className={filtroFilho === "todos" ? "selected" : ""} onClick={() => setFiltroFilho("todos")}>Todos</button>
            {filhos.map((filho) => (
              <button key={filho.id} className={filtroFilho === filho.id ? "selected" : ""} onClick={() => setFiltroFilho(filho.id)}>
                {primeiroNome(filho.nome)}
              </button>
            ))}
          </div>
        </section>

        <section className="history">
          {competencias.length === 0 ? (
            <div className="empty">🌱<strong>O histórico começa por aqui.</strong><span>As competências aparecerão automaticamente com o passar dos meses.</span></div>
          ) : (
            competencias.map(([chave, registros]) => {
              const [ano, mes] = chave.split("-").map(Number);
              const total = registros.reduce(
                (s, i) => s + Number(i.fechada ? i.valor_fechamento ?? 0 : i.conquistado),
                0
              );

              return (
                <article className="monthCard" key={chave}>
                  <div className="monthHead">
                    <div>
                      <span>{ano}</span>
                      <h3>{nomeMes(mes)}</h3>
                    </div>
                    <div className="monthTotal">
                      <small>TOTAL DA COMPETÊNCIA</small>
                      <strong>{dinheiro(total)}</strong>
                    </div>
                  </div>

                  <div className="childRows">
                    {registros.map((item) => {
                      const status = statusInfo(item.status);
                      const valor = item.fechada
                        ? Number(item.valor_fechamento ?? 0)
                        : item.conquistado;
                      const percentual =
                        item.valor_base > 0
                          ? Math.max(0, Math.min(100, Math.round((item.conquistado / item.valor_base) * 100)))
                          : 0;

                      return (
                        <div className="childRow" key={item.mesada_id}>
                          <div className="avatar">{primeiroNome(item.filho_nome).charAt(0)}</div>
                          <div className="childInfo">
                            <strong>{primeiroNome(item.filho_nome)}</strong>
                            <span>Meta {dinheiro(item.valor_base)}</span>
                          </div>
                          <div className="progress">
                            <div><span>Conquistado</span><b>{percentual}%</b></div>
                            <div className="track"><i style={{ width: `${percentual}%` }} /></div>
                          </div>
                          <div className="value">
                            <small>{item.fechada ? "VALOR FINAL" : "ATÉ AGORA"}</small>
                            <strong>{dinheiro(valor)}</strong>
                          </div>
                          <div className={`status ${status.classe}`}>
                            <span>{status.icone}</span>
                            <div>
                              <strong>{status.rotulo}</strong>
                              {item.paga_em && <small>{formatarData(item.paga_em)}</small>}
                              {!item.paga_em && item.fechada_em && <small>Fechada {formatarData(item.fechada_em)}</small>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })
          )}
        </section>
      </section>

      <nav className="mobileNav">
        <button onClick={() => router.push("/responsavel")}><span>🏠</span>Hoje</button>
        <button onClick={() => router.push("/responsavel/aprovacoes")}><span>✨</span>Aprovar</button>
        <button onClick={() => router.push("/responsavel")}><span>👨‍👩‍👧‍👦</span>Filhos</button>
        <button className="active"><span>💰</span>Carteira</button>
      </nav>

      <style jsx global>{`
        *{box-sizing:border-box}html,body{margin:0;background:#fafaff}button{font-family:inherit}
        .walletApp{min-height:100vh;color:#20275a;background:radial-gradient(circle at 8% 20%,rgba(221,214,254,.32),transparent 22%),radial-gradient(circle at 95% 55%,rgba(254,215,170,.2),transparent 18%),#fafaff;font-family:Arial,Helvetica,sans-serif}
        .header{height:82px;position:sticky;top:0;z-index:50;background:rgba(255,255,255,.9);border-bottom:1px solid #f0eff8;backdrop-filter:blur(18px)}
        .headerInner{max-width:1280px;height:100%;margin:auto;padding:0 26px;display:grid;grid-template-columns:240px 1fr 240px;align-items:center;gap:25px}
        .brand{padding:0;border:0;display:flex;align-items:center;gap:11px;text-align:left;background:transparent;color:#20275a;cursor:pointer}.brandStar{width:42px;height:42px;display:flex;align-items:center;justify-content:center;border-radius:14px;color:white;background:linear-gradient(135deg,#6658f5,#9d68f5);box-shadow:0 10px 22px rgba(101,88,245,.2)}.brand strong,.brand small{display:block}.brand strong{font-size:16px}.brand small{margin-top:3px;color:#a0a4b8;font-size:8px}
        .desktopNav{justify-self:center;display:flex;align-items:center;gap:5px;padding:5px;border-radius:16px;background:#f7f7fc}.desktopNav button{height:42px;padding:0 15px;border:0;border-radius:12px;display:flex;align-items:center;gap:7px;color:#7c809c;background:transparent;font-size:10px;font-weight:800;cursor:pointer}.desktopNav button.active{color:#5c50e8;background:white;box-shadow:0 5px 15px rgba(47,43,98,.07)}
        .profileArea{justify-self:end;display:flex;align-items:center;gap:9px}.parentAvatar{width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:13px;color:#5d50e8;background:#e7e8ff;font-size:12px;font-weight:900}.parentInfo strong,.parentInfo small{display:block}.parentInfo strong{font-size:10px}.parentInfo small{margin-top:2px;color:#a1a5b6;font-size:7px}.logout{margin-left:5px;border:0;color:#9da1b2;background:transparent;font-size:9px;cursor:pointer}
        .page{max-width:1180px;margin:auto;padding:38px 26px 90px}.back{border:0;background:transparent;color:#7568ee;font-size:9px;font-weight:900;cursor:pointer;padding:0;margin-bottom:20px}
        .hero{min-height:180px;padding:32px 36px;display:flex;align-items:center;justify-content:space-between;overflow:hidden;border-radius:30px;color:white;background:linear-gradient(120deg,#6557ef,#8c5ef0);box-shadow:0 20px 45px rgba(100,87,239,.18)}.hero>div>span{color:#ddd9ff;font-size:8px;font-weight:900;letter-spacing:1.4px}.hero h1{max-width:650px;margin:8px 0;font-size:35px;letter-spacing:-1.4px}.hero h1 b{font-size:30px}.hero p{margin:0;color:#e4e1ff;font-size:11px}.coin{width:105px;height:105px;display:flex;align-items:center;justify-content:center;border-radius:32px;background:rgba(255,255,255,.13);font-size:50px;transform:rotate(5deg)}
        .error{margin-top:20px;padding:13px 16px;border-radius:13px;color:#b91c1c;background:#fef2f2;font-size:11px}
        .summary{margin-top:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.summary article{min-height:105px;padding:20px;display:flex;align-items:center;gap:14px;border:1px solid #efedf6;border-radius:20px;background:white}.summaryIcon{width:48px;height:48px;flex:0 0 48px;display:flex;align-items:center;justify-content:center;border-radius:15px;font-size:20px}.summaryIcon.purple{background:#efedff}.summaryIcon.orange{background:#fff2d7}.summaryIcon.green{background:#eaf9ef;color:#2f8a58;font-weight:900}.summary small,.summary strong,.summary span{display:block}.summary small{color:#9da1b3;font-size:7px;font-weight:900;letter-spacing:.8px}.summary strong{margin:4px 0;font-size:19px}.summary span{color:#a2a6b6;font-size:8px}
        .toolbar{margin-top:42px;display:flex;align-items:flex-end;justify-content:space-between;gap:20px}.toolbar>div:first-child>span{color:#7568ee;font-size:8px;font-weight:900;letter-spacing:1.2px}.toolbar h2{margin:6px 0 0;font-size:25px}.filters{display:flex;gap:7px;padding:5px;border-radius:14px;background:#f0eff8}.filters button{height:34px;padding:0 13px;border:0;border-radius:10px;color:#8a8ea2;background:transparent;font-size:8px;font-weight:900;cursor:pointer}.filters button.selected{color:#5c50e8;background:white;box-shadow:0 4px 12px rgba(47,43,98,.06)}
        .history{margin-top:16px;display:grid;gap:15px}.monthCard{overflow:hidden;border:1px solid #eeedf5;border-radius:23px;background:white;box-shadow:0 10px 30px rgba(49,44,99,.035)}.monthHead{padding:18px 22px;display:flex;align-items:center;justify-content:space-between;background:#fbfbfe;border-bottom:1px solid #f1f0f7}.monthHead span{color:#9ea2b4;font-size:7px;font-weight:900;letter-spacing:1px}.monthHead h3{margin:3px 0 0;font-size:18px}.monthTotal{text-align:right}.monthTotal small,.monthTotal strong{display:block}.monthTotal small{color:#a2a5b4;font-size:6px;font-weight:900}.monthTotal strong{margin-top:3px;font-size:15px}
        .childRows{padding:4px 20px}.childRow{min-height:92px;display:grid;grid-template-columns:44px 145px 1fr 120px 165px;align-items:center;gap:14px;border-bottom:1px solid #f3f2f8}.childRow:last-child{border-bottom:0}.avatar{width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:13px;color:#6255e9;background:#ececff;font-size:13px;font-weight:900}.childInfo strong,.childInfo span{display:block}.childInfo strong{font-size:11px}.childInfo span{margin-top:3px;color:#9ea2b2;font-size:7px}.progress>div:first-child{display:flex;justify-content:space-between;color:#969aab;font-size:7px}.track{height:6px;margin-top:6px;overflow:hidden;border-radius:100px;background:#f0eff7}.track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#6658ef,#9a68f4)}.value small,.value strong{display:block}.value small{color:#a1a4b4;font-size:6px;font-weight:900}.value strong{margin-top:4px;font-size:13px}.status{justify-self:end;min-width:150px;padding:9px 11px;display:flex;align-items:center;gap:8px;border-radius:13px}.status>span{font-size:15px}.status strong,.status small{display:block}.status strong{font-size:7px}.status small{margin-top:2px;font-size:6px;opacity:.7}.status.pago{color:#2f8053;background:#eaf9ef}.status.pagar{color:#9b6c24;background:#fff4dc}.status.fechamento{color:#a16c2b;background:#fff6e8}.status.andamento{color:#5d50df;background:#efedff}
        .empty{min-height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;border:1px dashed #ddd9f2;border-radius:22px;color:#8e92a6;background:white}.empty:first-letter{font-size:25px}.empty strong{color:#4b5071;font-size:13px}.empty span{font-size:9px}
        .mobileNav{display:none}
        @media(max-width:1000px){.headerInner{grid-template-columns:180px 1fr auto}.parentInfo,.logout{display:none}.childRow{grid-template-columns:44px 120px 1fr 105px}.status{grid-column:2/-1;justify-self:stretch;margin-bottom:12px}.summary{grid-template-columns:1fr}}
        @media(max-width:760px){.header{height:70px}.headerInner{padding:0 17px;display:flex;justify-content:space-between}.desktopNav,.profileArea{display:none}.page{padding:25px 16px 100px}.hero{min-height:165px;padding:25px}.hero h1{font-size:27px}.coin{display:none}.toolbar{align-items:flex-start;flex-direction:column}.filters{width:100%;overflow-x:auto}.summary{grid-template-columns:1fr}.childRows{padding:5px 15px}.childRow{padding:16px 0;grid-template-columns:42px 1fr 100px;gap:10px}.progress{grid-column:2/-1;width:100%}.value{grid-column:2}.status{grid-column:2/-1;min-width:0;margin:0;justify-self:stretch}.mobileNav{height:70px;position:fixed;left:0;right:0;bottom:0;z-index:60;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid #ecebf4;background:rgba(255,255,255,.96);backdrop-filter:blur(15px)}.mobileNav button{border:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#9a9eae;background:transparent;font-size:7px;font-weight:800}.mobileNav button span{font-size:17px}.mobileNav button.active{color:#6255e9}}
      `}</style>
    </main>
  );
}
