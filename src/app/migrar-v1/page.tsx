"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type StatusV1 = "done" | "missed";

type DadosV1 = {
  statuses?: Record<string, StatusV1>;
};

type Resultado = {
  filho: string;
  encontrados: number;
  inseridos: number;
  existentes: number;
  ignorados: number;
};

const PERFIS = {
  lorenzo: {
    nome: "Lorenzo",
    perfilId: "2c14dd2a-b557-4c8e-9406-05ac05df2130",
    storageKey: "mesada-kids-lorenzo-2026",
    tarefas: {
      varanda: "8f3396f6-4376-4057-9260-1d9b0dd90b87",
      lixo: "348acb5d-a2bb-4550-aad3-ddb84ff14858",
      roupas: "d81c6850-0aab-46e1-aa2c-428c34ead294",
      quarto: "50108613-7233-4a59-b44e-07029c88d3d4",
      dentes: "65cf5257-f1b4-48a2-b780-ae6e7684ba0e",
      estudar: "e19c7cd3-3cc1-42c2-a3f0-c67f89cf2cbb",
      ler: "460741fd-46cb-4159-b0f7-e4ba1de438e1",
      soneca: "4574ab88-a243-4493-b01a-e1e1b5b0a5cf",
    },
  },

  betina: {
    nome: "Betina",
    perfilId: "0dd6d06d-73a0-43b3-a633-ca5c9fcdb47b",
    storageKey: "mesada-kids-betina-2026",
    tarefas: {
      brinquedos: "c4dc03c8-c4a2-4e1d-83aa-0e8cda2be23a",
      louca: "f109a9da-521e-495a-90a8-c42006b55434",
      dentes: "ee595e2d-c44a-47af-8d26-579a25543e04",
      mochila: "8943b805-2f7f-49f5-a8ab-5b188d9f0741",
      brincar: "a791f9cd-995a-4015-98bb-13034ba73689",
      bencao: "16ca6544-759b-489b-80be-3b4ab54b1a26",
      professoras: "78b706bc-29e3-43c5-83d2-96f94db8fbba",
      gentil: "361c01be-1659-497d-b8e1-d6ffd6f6d33a",
    },
  },
} as const;

export default function MigrarV1Page() {
  const [migrando, setMigrando] = useState(false);
  const [resultado, setResultado] = useState<Resultado[]>([]);
  const [erro, setErro] = useState("");
  const [concluido, setConcluido] = useState(false);

  async function migrar() {
    setMigrando(true);
    setErro("");
    setResultado([]);
    setConcluido(false);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error(
          "Você precisa estar logado como responsável antes da migração."
        );
      }

      const { data: responsavel, error: responsavelError } = await supabase
        .from("perfis")
        .select("id,tipo")
        .eq("auth_user_id", user.id)
        .eq("tipo", "responsavel")
        .eq("ativo", true)
        .single();

      if (responsavelError || !responsavel) {
        throw new Error("Responsável não encontrado.");
      }

      const resultados: Resultado[] = [];

      for (const perfil of Object.values(PERFIS)) {
        const bruto = localStorage.getItem(perfil.storageKey);

        if (!bruto) {
          resultados.push({
            filho: perfil.nome,
            encontrados: 0,
            inseridos: 0,
            existentes: 0,
            ignorados: 0,
          });

          continue;
        }

        const dados = JSON.parse(bruto) as DadosV1;
        const statuses = dados.statuses ?? {};

        let inseridos = 0;
        let existentes = 0;
        let ignorados = 0;

        const entradas = Object.entries(statuses);

        for (const [chave, statusV1] of entradas) {
          /*
            Formato esperado:
            2026-09-lixo-22
            2026-09-varanda-18
            2026-09-brinquedos-22
          */
          const partes = chave.split("-");

          if (partes.length < 4) {
            ignorados++;
            continue;
          }

          const ano = Number(partes[0]);
          const mes = Number(partes[1]);
          const dia = Number(partes[partes.length - 1]);

          const codigoTarefa = partes
            .slice(2, partes.length - 1)
            .join("-");

          const tarefaId =
            perfil.tarefas[
              codigoTarefa as keyof typeof perfil.tarefas
            ];

          if (
            !tarefaId ||
            !ano ||
            !mes ||
            !dia ||
            !["done", "missed"].includes(statusV1)
          ) {
            ignorados++;
            continue;
          }

          const dataExecucao =
            `${ano}-${String(mes).padStart(2, "0")}-` +
            `${String(dia).padStart(2, "0")}`;

          const { data: existente, error: buscaError } = await supabase
            .from("execucoes_tarefas")
            .select("id")
            .eq("tarefa_id", tarefaId)
            .eq("perfil_filho_id", perfil.perfilId)
            .eq("data_execucao", dataExecucao)
            .maybeSingle();

          if (buscaError) {
            throw new Error(
              `Erro verificando ${perfil.nome} / ${chave}: ${buscaError.message}`
            );
          }

          if (existente) {
            existentes++;
            continue;
          }

          const status =
            statusV1 === "done" ? "aprovada" : "recusada";

          const agora = new Date().toISOString();

          const { error: insertError } = await supabase
            .from("execucoes_tarefas")
            .insert({
              tarefa_id: tarefaId,
              perfil_filho_id: perfil.perfilId,
              data_execucao: dataExecucao,
              status,
              enviado_em: agora,
              analisado_em: agora,
              analisado_por: responsavel.id,
              observacao_responsavel:
                "Histórico importado automaticamente da versão V1.",
              origem: "v1_migrado",
            });

          if (insertError) {
            throw new Error(
              `Erro importando ${perfil.nome} / ${chave}: ${insertError.message}`
            );
          }

          inseridos++;
        }

        resultados.push({
          filho: perfil.nome,
          encontrados: entradas.length,
          inseridos,
          existentes,
          ignorados,
        });
      }

      setResultado(resultados);
      setConcluido(true);
    } catch (error) {
      console.error(error);

      setErro(
        error instanceof Error
          ? error.message
          : "Erro inesperado durante a migração."
      );
    } finally {
      setMigrando(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <div className="icon">📦</div>

        <span className="label">MESADA KIDS • MIGRAÇÃO</span>

        <h1>Importar histórico da V1</h1>

        <p className="description">
          Esta ferramenta importa somente o histórico de tarefas de Lorenzo e
          Betina. Os valores financeiros que já migramos não serão alterados.
        </p>

        <div className="warning">
          <strong>Importante</strong>

          <p>
            ✓ antigo será registrado como aprovado e ✕ antigo como recusado.
            Nenhuma nova movimentação financeira será criada.
          </p>
        </div>

        <button
          onClick={migrar}
          disabled={migrando || concluido}
        >
          {migrando
            ? "Migrando histórico..."
            : concluido
            ? "Migração concluída"
            : "Migrar histórico agora"}
        </button>

        {erro && <div className="error">{erro}</div>}

        {resultado.length > 0 && (
          <div className="results">
            {resultado.map((item) => (
              <article key={item.filho}>
                <h2>{item.filho}</h2>

                <div>
                  <span>Encontrados</span>
                  <strong>{item.encontrados}</strong>
                </div>

                <div>
                  <span>Importados</span>
                  <strong>{item.inseridos}</strong>
                </div>

                <div>
                  <span>Já existentes</span>
                  <strong>{item.existentes}</strong>
                </div>

                <div>
                  <span>Ignorados</span>
                  <strong>{item.ignorados}</strong>
                </div>
              </article>
            ))}
          </div>
        )}

        {concluido && (
          <div className="success">
            <strong>✓ Histórico processado.</strong>

            <p>
              Não apague o localStorage ainda. Primeiro vamos conferir os
              registros diretamente no Supabase.
            </p>
          </div>
        )}
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 60px 20px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          background: #f8f8ff;
          font-family: Arial, Helvetica, sans-serif;
          color: #20275a;
        }

        .card {
          width: min(720px, 100%);
          padding: 38px;
          border: 1px solid #ecebf5;
          border-radius: 28px;
          background: white;
          box-shadow: 0 20px 60px rgba(45, 42, 90, 0.08);
        }

        .icon {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #f0edff;
          font-size: 27px;
        }

        .label {
          display: block;
          margin-top: 24px;
          color: #695bec;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.2px;
        }

        h1 {
          margin: 7px 0 10px;
          font-size: 30px;
        }

        .description {
          color: #858a9f;
          font-size: 13px;
          line-height: 1.6;
        }

        .warning {
          margin-top: 25px;
          padding: 17px;
          border-radius: 16px;
          background: #fff9e9;
          color: #78612e;
        }

        .warning strong {
          font-size: 11px;
        }

        .warning p {
          margin: 5px 0 0;
          font-size: 10px;
          line-height: 1.5;
        }

        button {
          width: 100%;
          height: 50px;
          margin-top: 25px;
          border: 0;
          border-radius: 15px;
          color: white;
          background: linear-gradient(135deg, #6558ef, #9063ef);
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        button:disabled {
          opacity: 0.6;
          cursor: default;
        }

        .error,
        .success {
          margin-top: 20px;
          padding: 15px;
          border-radius: 14px;
          font-size: 11px;
        }

        .error {
          color: #b42318;
          background: #fff1f1;
        }

        .success {
          color: #26784a;
          background: #effbf3;
        }

        .success p {
          margin: 5px 0 0;
        }

        .results {
          margin-top: 25px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
        }

        .results article {
          padding: 18px;
          border: 1px solid #eeeeF6;
          border-radius: 17px;
          background: #fafaff;
        }

        .results h2 {
          margin: 0 0 13px;
          font-size: 15px;
        }

        .results article > div {
          padding: 6px 0;
          display: flex;
          justify-content: space-between;
          color: #898da1;
          font-size: 9px;
        }

        .results article strong {
          color: #303657;
        }

        @media (max-width: 560px) {
          .card {
            padding: 25px;
          }

          .results {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}