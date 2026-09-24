"use client";

import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Status =
  | "done"
  | "missed"
  | "na"
  | null;

type V2Status =
  | "pending"
  | "approved"
  | "rejected";

const BETINA_PROFILE_ID =
  "0dd6d06d-73a0-43b3-a633-ca5c9fcdb47b";

const TASK_IDS: Record<string, string> = {
  brinquedos: "c4dc03c8-c4a2-4e1d-83aa-0e8cda2be23a",
  louca: "f109a9da-521e-495a-90a8-c42006b55434",
  dentes: "ee595e2d-c44a-47af-8d26-579a25543e04",
  mochila: "8943b805-2f7f-49f5-a8ab-5b188d9f0741",
  brincar: "a791f9cd-995a-4015-98bb-13034ba73689",
  bencao: "16ca6544-759b-489b-80be-3b4ab54b1a26",
  professoras: "78b706bc-29e3-43c5-83d2-96f94db8fbba",
  gentil: "361c01be-1659-497d-b8e1-d6ffd6f6d33a",
};

const TASK_CODES_BY_ID = Object.fromEntries(
  Object.entries(TASK_IDS).map(([code, id]) => [id, code])
) as Record<string, string>;

type Activity = {
  id: string;
  name: string;
  icon: string;
  weight: number;
};

type Discount = {
  id: string;
  name: string;
  icon: string;
  value: number;
};

type DiscountMovement = {
  id: string;
  descricao: string;
  valor: number;
  data_movimentacao: string;
  created_at: string;
};

type MonthDay = {
  day: number;
  weekDay: string;
  weekDayNumber: number;
  isWeekend: boolean;
};

type StoredData = {
  statuses: Record<string, Status>;
  discountCounts: Record<string, number>;
  superPrizeMonths: Record<string, boolean>;
};

const BASE_ALLOWANCE = 30;

const STORAGE_KEY =
  "mesada-kids-betina-2026";

const AVAILABLE_MONTHS = [
  {
    value: "2026-09",
    short: "SET",
    label: "Setembro",
  },
  {
    value: "2026-10",
    short: "OUT",
    label: "Outubro",
  },
  {
    value: "2026-11",
    short: "NOV",
    label: "Novembro",
  },
  {
    value: "2026-12",
    short: "DEZ",
    label: "Dezembro",
  },
];

/*
  Os valores originais agora funcionam
  como PESOS.

  Assim mantemos algumas atividades
  valendo mais que outras e garantimos
  que cumprir tudo no mês resulte
  exatamente em R$ 30,00.
*/

const activities: Activity[] = [
  {
    id: "brinquedos",
    name: "Guardar os brinquedos",
    icon: "🧸",
    weight: 0.15,
  },
  {
    id: "louca",
    name: "Guardar a louça após as refeições",
    icon: "🍽️",
    weight: 0.15,
  },
  {
    id: "dentes",
    name: "Escovar os dentes",
    icon: "🪥",
    weight: 0.1,
  },
  {
    id: "mochila",
    name: "Organizar a mochila",
    icon: "🎒",
    weight: 0.1,
  },
  {
    id: "brincar",
    name: "Brincar com bonecas, pintar ou desenhar",
    icon: "🎨",
    weight: 0.1,
  },
  {
    id: "bencao",
    name: "Dar a bênção aos pais, avós e tias",
    icon: "🙏",
    weight: 0.1,
  },
  {
    id: "professoras",
    name: "Obedecer às professoras e à tia Lu",
    icon: "🏫",
    weight: 0.1,
  },
  {
    id: "gentil",
    name: "Ser gentil e educada",
    icon: "💖",
    weight: 0.2,
  },
];

const discounts: Discount[] = [
  {
    id: "desrespeito",
    name: "Desrespeitar os pais",
    icon: "😠",
    value: 2,
  },
  {
    id: "lorenzo",
    name: "Implicar com o Lorenzo",
    icon: "👦",
    value: 1.5,
  },
  {
    id: "celular",
    name: "Usar celular sem permissão",
    icon: "📱",
    value: 1.5,
  },
  {
    id: "penteado",
    name: "Desfazer o penteado da escola",
    icon: "🎀",
    value: 1.5,
  },
  {
    id: "manha",
    name: "Gritar / fazer manha",
    icon: "😤",
    value: 1.5,
  },
];

const weekDays = [
  "DOM",
  "SEG",
  "TER",
  "QUA",
  "QUI",
  "SEX",
  "SÁB",
];

const formatMoney = (
  value: number
) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const getMonthDays = (
  month: string
): MonthDay[] => {
  const [year, monthNumber] =
    month.split("-").map(Number);

  const totalDays = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  return Array.from(
    { length: totalDays },
    (_, index) => {
      const day = index + 1;

      const date = new Date(
        year,
        monthNumber - 1,
        day
      );

      const weekDayNumber =
        date.getDay();

      return {
        day,
        weekDay:
          weekDays[weekDayNumber],
        weekDayNumber,
        isWeekend:
          weekDayNumber === 0 ||
          weekDayNumber === 6,
      };
    }
  );
};

export default function BetinaPage() {
  const [month, setMonth] =
    useState("2026-09");

  const [v2Statuses, setV2Statuses] =
    useState<Record<string, V2Status>>({});
  const [v2Message, setV2Message] =
    useState("");
  const [v2Error, setV2Error] =
    useState("");
  const [sendingKey, setSendingKey] =
    useState<string | null>(null);

  const [statuses, setStatuses] =
    useState<
      Record<string, Status>
    >({});

  const [discountMovements, setDiscountMovements] =
    useState<DiscountMovement[]>([]);
  const [discountBusyId, setDiscountBusyId] =
    useState<string | null>(null);
  const [discountMessage, setDiscountMessage] =
    useState("");
  const [discountError, setDiscountError] =
    useState("");

  const [superPrizeAchieved, setSuperPrizeAchieved] =
    useState(false);
  const [superPrizeBusy, setSuperPrizeBusy] =
    useState(false);
  const [superPrizeMessage, setSuperPrizeMessage] =
    useState("");
  const [superPrizeError, setSuperPrizeError] =
    useState("");

  const [storageLoaded, setStorageLoaded] =
    useState(false);

  const monthDays = useMemo(
    () => getMonthDays(month),
    [month]
  );

  /*
    ========================================
    CARREGAR DADOS
    ========================================
  */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (saved) {
        const parsed: StoredData =
          JSON.parse(saved);

        setStatuses(
          parsed.statuses ?? {}
        );

      }
    } catch (error) {
      console.error(
        "Erro ao carregar dados da Betina:",
        error
      );
    } finally {
      setStorageLoaded(true);
    }
  }, []);

  /*
    ========================================
    SALVAR AUTOMATICAMENTE
    ========================================
  */

  useEffect(() => {
    if (!storageLoaded) {
      return;
    }

    let legacyDiscountCounts: Record<string, number> = {};
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current) {
        legacyDiscountCounts =
          (JSON.parse(current) as StoredData).discountCounts ?? {};
      }
    } catch {}

    let legacySuperPrizeMonths: Record<string, boolean> = {};

    try {
      const existing = localStorage.getItem(STORAGE_KEY);
      if (existing) {
        const parsed: StoredData = JSON.parse(existing);
        legacySuperPrizeMonths =
          parsed.superPrizeMonths ?? {};
      }
    } catch {
      legacySuperPrizeMonths = {};
    }

    const data: StoredData = {
      statuses,
      discountCounts: legacyDiscountCounts,
      superPrizeMonths: legacySuperPrizeMonths,
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );
  }, [
    statuses,
    storageLoaded,
  ]);

  /*
    ========================================
    SUPABASE V2 — EXECUÇÕES
    ========================================
  */

  useEffect(() => {
    carregarExecucoesV2();
  }, [month]);

  async function carregarExecucoesV2() {
    try {
      setV2Error("");

      const [year, monthNumber] =
        month.split("-").map(Number);

      const lastDay = new Date(
        year,
        monthNumber,
        0
      ).getDate();

      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("execucoes_tarefas")
        .select("tarefa_id,data_execucao,status,origem")
        .eq("perfil_filho_id", BETINA_PROFILE_ID)
        .gte("data_execucao", startDate)
        .lte("data_execucao", endDate);

      if (error) throw error;

      const next: Record<string, V2Status> = {};

      for (const item of data ?? []) {
        const code = TASK_CODES_BY_ID[item.tarefa_id];
        if (!code) continue;

        const day = Number(item.data_execucao.split("-")[2]);
        const key = `${month}-${code}-${day}`;

        if (item.status === "aguardando_aprovacao") {
          next[key] = "pending";
        } else if (item.status === "aprovada") {
          next[key] = "approved";
        } else if (item.status === "recusada") {
          next[key] = "rejected";
        }
      }

      setV2Statuses(next);
    } catch (error) {
      console.error("Erro ao carregar execuções V2 da Betina:", error);
      setV2Error("Não foi possível consultar as missões no Supabase.");
    }
  }

  function isTodayCell(day: number) {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    return month === currentMonth && day === today.getDate();
  }

  async function enviarMissao(activityId: string, day: number) {
    const key = `${month}-${activityId}-${day}`;

    if (!isTodayCell(day) || v2Statuses[key]) return;

    const taskId = TASK_IDS[activityId];

    if (!taskId) {
      setV2Error("Esta atividade ainda não está vinculada ao Supabase.");
      return;
    }

    try {
      setSendingKey(key);
      setV2Error("");
      setV2Message("");

      const dataExecucao = `${month}-${String(day).padStart(2, "0")}`;

      const { error } = await supabase
        .from("execucoes_tarefas")
        .insert({
          tarefa_id: taskId,
          perfil_filho_id: BETINA_PROFILE_ID,
          data_execucao: dataExecucao,
          status: "aguardando_aprovacao",
          observacao_filho: null,
          origem: "v2",
        });

      if (error) {
        if (error.code === "23505") {
          await carregarExecucoesV2();
          setV2Message("Esta missão já havia sido enviada.");
          return;
        }
        throw error;
      }

      setV2Statuses((current) => ({
        ...current,
        [key]: "pending",
      }));

      setV2Message(
        "Missão enviada! Agora ela está aguardando aprovação. ✨"
      );
    } catch (error) {
      console.error("Erro ao enviar missão da Betina:", error);
      setV2Error("Não foi possível enviar esta missão para aprovação.");
    } finally {
      setSendingKey(null);
    }
  }

  /*
    ========================================
    SUPABASE V2 — DESCONTOS
    ========================================
  */

  useEffect(() => {
    carregarDescontosV2();
  }, [month]);

  async function carregarDescontosV2() {
    try {
      setDiscountError("");

      const [year, monthNumber] = month.split("-").map(Number);
      const lastDay = new Date(year, monthNumber, 0).getDate();
      const startDate = `${month}-01`;
      const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

      const { data, error } = await supabase
        .from("movimentacoes")
        .select("id,descricao,valor,data_movimentacao,created_at")
        .eq("perfil_filho_id", BETINA_PROFILE_ID)
        .eq("tipo", "desconto")
        .gte("data_movimentacao", startDate)
        .lte("data_movimentacao", endDate)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setDiscountMovements(
        (data ?? []).map((item) => ({
          ...item,
          valor: Number(item.valor),
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar descontos da Betina:", error);
      setDiscountError("Não foi possível carregar os descontos.");
    }
  }

  function movimentoPertenceAoDesconto(
    movimento: DiscountMovement,
    discount: Discount
  ) {
    const descricao = movimento.descricao.toLocaleLowerCase("pt-BR");
    const nome = discount.name.toLocaleLowerCase("pt-BR");

    if (descricao === nome) return true;

    // Compatibilidade com a migração consolidada do V1.
    if (discount.id === "desrespeito" && descricao.includes("desrespeitar os pais")) {
      return true;
    }

    return false;
  }

  function movimentosDoDesconto(discount: Discount) {
    return discountMovements.filter((movimento) =>
      movimentoPertenceAoDesconto(movimento, discount)
    );
  }

  async function registrarDescontoV2(discount: Discount) {
    try {
      setDiscountBusyId(discount.id);
      setDiscountError("");
      setDiscountMessage("");

      const today = new Date();
      const currentMonth = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}`;

      if (month !== currentMonth) {
        setDiscountError("Os descontos só podem ser registrados no mês atual.");
        return;
      }

      const dataLocal = `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

      const { error } = await supabase.rpc("registrar_desconto", {
        p_perfil_filho_id: BETINA_PROFILE_ID,
        p_descricao: discount.name,
        p_valor: discount.value,
        p_data: dataLocal,
      });

      if (error) throw error;

      await carregarDescontosV2();
      setDiscountMessage(`${discount.name}: desconto registrado.`);
    } catch (error) {
      console.error("Erro ao registrar desconto da Betina:", error);
      setDiscountError("Não foi possível registrar o desconto.");
    } finally {
      setDiscountBusyId(null);
    }
  }

  async function desfazerUltimoDescontoV2(discount: Discount) {
    const removivel = movimentosDoDesconto(discount).find(
      (movimento) => movimento.descricao === discount.name
    );

    if (!removivel) {
      setDiscountError(
        "Não há uma ocorrência V2 deste desconto para desfazer. O histórico migrado foi preservado."
      );
      return;
    }

    try {
      setDiscountBusyId(discount.id);
      setDiscountError("");
      setDiscountMessage("");

      const { error } = await supabase.rpc("desfazer_desconto", {
        p_movimentacao_id: removivel.id,
      });

      if (error) throw error;

      await carregarDescontosV2();
      setDiscountMessage(`${discount.name}: última ocorrência desfeita.`);
    } catch (error) {
      console.error("Erro ao desfazer desconto da Betina:", error);
      setDiscountError("Não foi possível desfazer o desconto.");
    } finally {
      setDiscountBusyId(null);
    }
  }

  /*
    ========================================
    CHAVES
    ========================================
  */

  const getStatusKey = (
    activityId: string,
    day: number
  ) =>
    `${month}-${activityId}-${day}`;

  const getDiscountKey = (
    discountId: string
  ) =>
    `${month}-${discountId}`;

  /*
    ========================================
    MARCAÇÃO DAS TAREFAS
    ========================================
  */

  const setStatus = (
    activityId: string,
    day: number,
    status: Status
  ) => {
    const key =
      getStatusKey(
        activityId,
        day
      );

    setStatuses((current) => ({
      ...current,
      [key]: status,
    }));
  };

  const cycleStatus = (
    activityId: string,
    day: number,
    currentStatus: Status
  ) => {
    let nextStatus: Status;

    if (!currentStatus) {
      nextStatus = "done";
    } else if (
      currentStatus === "done"
    ) {
      nextStatus = "missed";
    } else if (
      currentStatus === "missed"
    ) {
      nextStatus = "na";
    } else {
      nextStatus = null;
    }

    setStatus(
      activityId,
      day,
      nextStatus
    );
  };

  /*
    ========================================
    SUPABASE V2 — SUPER PRÊMIO
    ========================================
  */

  useEffect(() => {
    carregarSuperPremio();
  }, [month]);

  async function carregarSuperPremio() {
    try {
      setSuperPrizeError("");

      const [year, monthNumber] =
        month.split("-").map(Number);

      const { data, error } = await supabase
        .from("conquistas")
        .select("id,conquistada")
        .eq("perfil_filho_id", BETINA_PROFILE_ID)
        .eq("codigo", "dormir_sozinha_quarto")
        .eq("ano", year)
        .eq("mes", monthNumber)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setSuperPrizeAchieved(
        data?.conquistada ?? false
      );
    } catch (error) {
      console.error(
        "Erro ao carregar Super Prêmio:",
        error
      );
      setSuperPrizeError(
        "Não foi possível carregar o Super Prêmio."
      );
    }
  }

  async function toggleSuperPrize() {
    try {
      setSuperPrizeBusy(true);
      setSuperPrizeError("");
      setSuperPrizeMessage("");

      const [year, monthNumber] =
        month.split("-").map(Number);

      const novoEstado =
        !superPrizeAchieved;

      const { error } = await supabase.rpc(
        "definir_conquista",
        {
          p_perfil_filho_id:
            BETINA_PROFILE_ID,
          p_codigo:
            "dormir_sozinha_quarto",
          p_titulo:
            "Dormir sozinha no meu quarto",
          p_descricao:
            "Super Prêmio da Betina por conseguir dormir sozinha no próprio quarto.",
          p_premio:
            "Um brinquedo que eu quiser",
          p_ano: year,
          p_mes: monthNumber,
          p_conquistada:
            novoEstado,
        }
      );

      if (error) {
        throw error;
      }

      setSuperPrizeAchieved(
        novoEstado
      );

      setSuperPrizeMessage(
        novoEstado
          ? "🏆 Super Prêmio conquistado!"
          : "Super Prêmio voltou para em andamento."
      );
    } catch (error) {
      console.error(
        "Erro ao atualizar Super Prêmio:",
        error
      );
      setSuperPrizeError(
        "Não foi possível atualizar o Super Prêmio."
      );
    } finally {
      setSuperPrizeBusy(false);
    }
  }

  /*
    ========================================
    VALOR DAS RESPONSABILIDADES

    Soma todos os pesos existentes
    no mês e distribui os R$ 30,00.

    Portanto, se Betina cumprir
    absolutamente tudo, fecha
    exatamente R$ 30,00.
    ========================================
  */

  const monthFinancialData =
    useMemo(() => {
      const totalDailyWeight =
        activities.reduce(
          (total, activity) =>
            total +
            activity.weight,
          0
        );

      const totalMonthWeight =
        totalDailyWeight *
        monthDays.length;

      const totalObligations =
        activities.length *
        monthDays.length;

      const valuePerWeight =
        totalMonthWeight > 0
          ? BASE_ALLOWANCE /
            totalMonthWeight
          : 0;

      const activityValues =
        activities.reduce<
          Record<string, number>
        >((result, activity) => {
          result[activity.id] =
            activity.weight *
            valuePerWeight;

          return result;
        }, {});

      return {
        totalMonthWeight,
        totalObligations,
        valuePerWeight,
        activityValues,
      };
    }, [monthDays]);

  /*
    ========================================
    CÁLCULO DO MÊS

    ✓ = ganha
    ✕ = R$ 0
    — = R$ 0
    vazio = R$ 0
    ========================================
  */

  const calculations = useMemo(() => {
    let completed = 0;
    let missed = 0;
    let notApplicable = 0;
    let baseEarned = 0;

    activities.forEach(
      (activity) => {
        monthDays.forEach(
          (dayInfo) => {
            const key =
              `${month}-${activity.id}-${dayInfo.day}`;

            const status =
              statuses[key];

            if (
              status === "done"
            ) {
              completed += 1;

              baseEarned +=
                monthFinancialData
                  .activityValues[
                  activity.id
                ];
            }

            if (
              status === "missed"
            ) {
              missed += 1;
            }

            if (
              status === "na"
            ) {
              notApplicable += 1;
            }
          }
        );
      }
    );

    baseEarned = Math.min(
      BASE_ALLOWANCE,
      baseEarned
    );

    const discountTotal = discountMovements.reduce(
      (total, movimento) => total + Math.abs(movimento.valor),
      0
    );

    const finalTotal =
      Math.max(
        0,
        baseEarned -
          discountTotal
      );

    const progressRate =
      monthFinancialData
        .totalObligations > 0
        ? completed /
          monthFinancialData
            .totalObligations
        : 0;

    return {
      completed,
      missed,
      notApplicable,
      baseEarned,
      discountTotal,
      finalTotal,
      progressRate,
    };
  }, [
    statuses,
    discountMovements,
    month,
    monthDays,
    monthFinancialData,
  ]);

  /*
    ========================================
    CONQUISTADO HOJE
    ========================================
  */

  const todayData = useMemo(() => {
    const today = new Date();

    const currentYear =
      today.getFullYear();

    const currentMonthNumber =
      today.getMonth() + 1;

    const currentDay =
      today.getDate();

    const currentMonth =
      `${currentYear}-${String(
        currentMonthNumber
      ).padStart(2, "0")}`;

    if (month !== currentMonth) {
      return {
        isCurrentMonth: false,
        earnedToday: 0,
        completedToday: 0,
      };
    }

    let earnedToday = 0;
    let completedToday = 0;

    activities.forEach(
      (activity) => {
        const key =
          `${month}-${activity.id}-${currentDay}`;

        if (
          statuses[key] === "done"
        ) {
          completedToday += 1;

          earnedToday +=
            monthFinancialData
              .activityValues[
              activity.id
            ];
        }
      }
    );

    return {
      isCurrentMonth: true,
      earnedToday,
      completedToday,
    };
  }, [
    month,
    statuses,
    monthFinancialData,
  ]);

  const percentage = Math.round(
    calculations.progressRate * 100
  );

  const selectedMonth =
    AVAILABLE_MONTHS.find(
      (item) =>
        item.value === month
    );

  return (
    <main className="betina-page">
      {/* CABEÇALHO */}

      <header className="betina-header">
        <div className="betina-header-left">
          <Link
            href="/responsavel"
            className="back-button betina-back-button"
          >
            ← Início
          </Link>

          <div className="betina-avatar">
            <Image
              src="/personagens/betina.png"
              alt="Betina"
              width={120}
              height={120}
              priority
            />
          </div>

          <div>
            <span className="betina-page-label">
              MESADA KIDS
            </span>

            <h1>Betina</h1>

            <p>
              Betina de Oliveira Miranda
            </p>
          </div>
        </div>

        <div className="betina-month">
          📅

          <strong>
            {selectedMonth?.label ??
              "Setembro"}{" "}
            de 2026
          </strong>
        </div>
      </header>

      {(v2Message || v2Error) && (
        <section
          style={{
            margin: "16px 0",
            padding: "14px 18px",
            borderRadius: "14px",
            background: v2Error ? "#fef2f2" : "#ecfdf3",
            color: v2Error ? "#b91c1c" : "#287a4a",
            fontSize: "13px",
            fontWeight: 700,
          }}
        >
          {v2Error || v2Message}
        </section>
      )}

      {/* RESUMO */}

      <section className="betina-summary">
        <div className="betina-summary-main">
          <span>
            Conquistado no mês
          </span>

          <strong>
            {formatMoney(
              calculations.finalTotal
            )}
          </strong>

          <small>
            Mesada-base:{" "}
            {formatMoney(
              BASE_ALLOWANCE
            )}
          </small>

          {todayData.isCurrentMonth && (
            <div className="betina-today-earned">
              <span>
                ☀️ Conquistado hoje
              </span>

              <strong>
                +{" "}
                {formatMoney(
                  todayData.earnedToday
                )}
              </strong>

              <small>
                {
                  todayData.completedToday
                }{" "}
                {todayData.completedToday ===
                1
                  ? "responsabilidade cumprida"
                  : "responsabilidades cumpridas"}
              </small>
            </div>
          )}

          <div className="betina-progress">
            <div
              style={{
                width: `${percentage}%`,
              }}
            />
          </div>

          <b>
            {percentage}% das
            responsabilidades cumpridas
          </b>
        </div>

        <div className="betina-summary-card positive">
          <span>
            💰 Base conquistada
          </span>

          <strong>
            {formatMoney(
              calculations.baseEarned
            )}
          </strong>
        </div>

        <div className="betina-summary-card negative">
          <span>
            🔻 Descontos
          </span>

          <strong>
            -{" "}
            {formatMoney(
              calculations.discountTotal
            )}
          </strong>
        </div>

        <div
          className={`betina-summary-card prize ${
            superPrizeAchieved
              ? "prize-achieved"
              : ""
          }`}
        >
          <span>
            👑 Super Prêmio
          </span>

          <strong>
            {superPrizeAchieved
              ? "CONQUISTADO!"
              : "Em andamento"}
          </strong>
        </div>
      </section>

      {/* TABELA */}

      <section className="betina-section">
        <div className="betina-section-heading">
          <div>
            <span>
              🎀 TABELA MENSAL
            </span>

            <h2>
              Minhas responsabilidades
            </h2>
          </div>

          <div className="legend">
            <span className="legend-done">
              ✓ Cumpriu
            </span>

            <span className="legend-missed">
              ✕ Não cumpriu
            </span>

            <span className="legend-na">
              — Não se aplica
            </span>
          </div>
        </div>

        {/* MESES */}

        <div className="betina-year-month-tabs">
          <div className="betina-year-label">
            <span>📅 Ano</span>
            <strong>2026</strong>
          </div>

          <div className="betina-month-tab-list">
            {AVAILABLE_MONTHS.map(
              (item) => (
                <button
                  type="button"
                  key={item.value}
                  className={`betina-month-tab ${
                    month ===
                    item.value
                      ? "active"
                      : ""
                  }`}
                  onClick={() =>
                    setMonth(
                      item.value
                    )
                  }
                >
                  <strong>
                    {item.short}
                  </strong>

                  <small>
                    {item.label}
                  </small>
                </button>
              )
            )}
          </div>
        </div>

        <div className="betina-month-value-info">
          <span>
            💰 Cada responsabilidade
            cumprida ajuda Betina a
            construir sua mesada.
          </span>

          <strong>
            Máximo:{" "}
            {formatMoney(
              BASE_ALLOWANCE
            )}
          </strong>
        </div>

        <div className="betina-table-scroll">
          <table className="betina-tasks-table">
            <thead>
              <tr>
                <th className="betina-activity-column">
                  Atividade
                </th>

                {monthDays.map(
                  ({
                    day,
                    weekDay,
                    isWeekend,
                  }) => (
                    <th
                      key={day}
                      className={`betina-calendar-day-header ${
                        isWeekend
                          ? "betina-weekend-header"
                          : ""
                      }`}
                    >
                      <strong>
                        {day}
                      </strong>

                      <small>
                        {weekDay}
                      </small>
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {activities.map(
                (activity) => {
                  const taskValue =
                    monthFinancialData
                      .activityValues[
                      activity.id
                    ] ?? 0;

                  return (
                    <tr
                      key={
                        activity.id
                      }
                    >
                      <td className="betina-activity-name">
                        <span className="betina-activity-icon">
                          {
                            activity.icon
                          }
                        </span>

                        <div>
                          <strong>
                            {
                              activity.name
                            }
                          </strong>

                          <small>
                            {formatMoney(
                              taskValue
                            )}{" "}
                            por dia
                          </small>
                        </div>
                      </td>

                      {monthDays.map(
                        ({
                          day,
                          isWeekend,
                        }) => {
                          const key = getStatusKey(
                            activity.id,
                            day
                          );

                          const status = statuses[key];
                          const v2Status = v2Statuses[key];

                          const displayStatus =
                            v2Status === "pending"
                              ? "pending"
                              : v2Status === "approved"
                                ? "done"
                                : v2Status === "rejected"
                                  ? "missed"
                                  : status;

                          const todayCell = isTodayCell(day);
                          const canSend = todayCell && !v2Status;

                          return (
                            <td
                              key={day}
                              className={`betina-day-cell ${
                                isWeekend
                                  ? "betina-weekend-cell"
                                  : ""
                              }`}
                            >
                              <button
                                type="button"
                                className={`betina-day-status ${
                                  displayStatus
                                    ? `betina-day-status-${displayStatus}`
                                    : ""
                                }`}
                                title={
                                  v2Status === "pending"
                                    ? "Aguardando aprovação"
                                    : displayStatus === "done"
                                      ? `Cumpriu: +${formatMoney(taskValue)}`
                                      : displayStatus === "missed"
                                        ? "Não cumpriu"
                                        : displayStatus === "na"
                                          ? "Não se aplica"
                                          : todayCell
                                            ? `Fiz! Enviar para aprovação • vale ${formatMoney(taskValue)}`
                                            : `Vale ${formatMoney(taskValue)}`
                                }
                                disabled={
                                  sendingKey === key || Boolean(v2Status)
                                }
                                onClick={() =>
                                  enviarMissao(activity.id, day)
                                }
                                style={
                                  canSend
                                    ? {
                                        fontSize: "7px",
                                        fontWeight: 900,
                                        cursor: "pointer",
                                      }
                                    : undefined
                                }
                              >
                                {sendingKey === key
                                  ? "…"
                                  : v2Status === "pending"
                                    ? "⏳"
                                    : displayStatus === "done"
                                      ? "✓"
                                      : displayStatus === "missed"
                                        ? "✕"
                                        : displayStatus === "na"
                                          ? "—"
                                          : todayCell
                                            ? "Fiz!"
                                            : ""}
                              </button>
                            </td>
                          );
                        }
                      )}
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>

        <p className="betina-table-tip">
          💡 No dia de hoje, toque em “Fiz!” para enviar a missão para
          aprovação. O valor só entra na mesada depois que o responsável
          aprovar. O histórico anterior permanece somente para consulta.
        </p>
      </section>

      {/* DESCONTOS + SUPER PRÊMIO */}

      <section className="betina-bottom-grid">
        <article className="betina-behavior-card">
          <div className="betina-bottom-title">
            <span>⚠️</span>

            <div>
              <small>REGRAS</small>
              <h2>Descontos</h2>
            </div>
          </div>

          {(discountMessage || discountError) && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 12,
                background: discountError ? "#fff1f2" : "#f0fdf4",
                color: discountError ? "#be123c" : "#166534",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {discountError || discountMessage}
            </div>
          )}

          <div className="betina-discount-list">
            {discounts.map(
              (discount) => {
                const discountItems =
                  movimentosDoDesconto(discount);
                const count = discountItems.length;
                const hasRemovableV2 = discountItems.some(
                  (movimento) => movimento.descricao === discount.name
                );
                const busy = discountBusyId === discount.id;

                return (
                  <div
                    className="betina-discount-item"
                    key={
                      discount.id
                    }
                  >
                    <div className="betina-discount-description">
                      <span>
                        {
                          discount.icon
                        }
                      </span>

                      <div>
                        <strong>
                          {
                            discount.name
                          }
                        </strong>

                        <small>
                          -{" "}
                          {formatMoney(
                            discount.value
                          )}{" "}
                          por ocorrência
                        </small>
                      </div>
                    </div>

                    <div className="betina-counter">
                      <button
                        type="button"
                        onClick={() =>
                          desfazerUltimoDescontoV2(discount)
                        }
                        disabled={busy || !hasRemovableV2}
                        title={
                          hasRemovableV2
                            ? "Desfazer a última ocorrência"
                            : "Nenhuma ocorrência V2 para desfazer"
                        }
                      >
                        −
                      </button>

                      <strong>
                        {count}
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          registrarDescontoV2(discount)
                        }
                        disabled={busy}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              }
            )}
          </div>

          <div className="betina-discount-total">
            <span>
              Total de descontos
            </span>

            <strong>
              -{" "}
              {formatMoney(
                calculations
                  .discountTotal
              )}
            </strong>
          </div>
        </article>

        {/* SUPER PRÊMIO */}

        <article className="betina-prize-card">
          <div className="betina-bottom-title">
            <span>👑</span>

            <div>
              <small>
                CONQUISTA ESPECIAL
              </small>

              <h2>Super Prêmio</h2>
            </div>
          </div>

          {(superPrizeMessage || superPrizeError) && (
            <div
              style={{
                marginBottom: 14,
                padding: "10px 12px",
                borderRadius: 12,
                background: superPrizeError
                  ? "#fff1f2"
                  : "#f0fdf4",
                color: superPrizeError
                  ? "#be123c"
                  : "#166534",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {superPrizeError || superPrizeMessage}
            </div>
          )}

          <div className="betina-prize-content">
            <div className="betina-prize-crown">
              👑
            </div>

            <span>
              SE EU CONSEGUIR...
            </span>

            <h3>
              Dormir sozinha
              <br />
              no meu quarto!
            </h3>

            <div className="betina-prize-reward">
              <span>
                🎁 EU GANHO
              </span>

              <strong>
                UM BRINQUEDO
                <br />
                QUE EU QUISER!
              </strong>
            </div>

            <button
              type="button"
              className={`betina-prize-button ${
                superPrizeAchieved
                  ? "achieved"
                  : ""
              }`}
              onClick={
                toggleSuperPrize
              }
              disabled={superPrizeBusy}
            >
              {superPrizeAchieved
                ? "🏆 Prêmio conquistado!"
                : "☆ Marcar como conquistado"}
            </button>
          </div>
        </article>
      </section>

      {/* FECHAMENTO */}

      <section className="betina-month-closing">
        <div>
          <span>
            🏆 RESUMO DO MÊS
          </span>

          <h2>
            Quanto Betina conquistou?
          </h2>
        </div>

        <div className="betina-closing-values">
          <div>
            <span>
              Mesada conquistada
            </span>

            <strong>
              {formatMoney(
                calculations
                  .baseEarned
              )}
            </strong>
          </div>

          <div className="betina-closing-minus">
            <span>
              Descontos
            </span>

            <strong>
              -{" "}
              {formatMoney(
                calculations
                  .discountTotal
              )}
            </strong>
          </div>

          <div className="betina-closing-prize">
            <span>
              Super Prêmio
            </span>

            <strong>
              {superPrizeAchieved
                ? "🏆 SIM"
                : "☆ Ainda não"}
            </strong>
          </div>

          <div className="betina-closing-final">
            <span>
              Total final
            </span>

            <strong>
              {formatMoney(
                calculations
                  .finalTotal
              )}
            </strong>
          </div>
        </div>
      </section>
    </main>
  );
}