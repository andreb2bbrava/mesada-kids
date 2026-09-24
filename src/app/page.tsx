"use client";

import { useRouter } from "next/navigation";

const features = [
  {
    icon: "✓",
    title: "Responsabilidades",
    text: "Organize tarefas e hábitos de cada criança de forma simples e visual.",
    className: "blue",
  },
  {
    icon: "🙋",
    title: "Eu fiz!",
    text: "A criança informa quando concluiu uma responsabilidade e aguarda a aprovação.",
    className: "purple",
  },
  {
    icon: "★",
    title: "Aprovação dos pais",
    text: "O responsável confere antes que qualquer conquista seja registrada.",
    className: "orange",
  },
  {
    icon: "R$",
    title: "Educação financeira",
    text: "Os filhos acompanham suas conquistas e aprendem a lidar com dinheiro.",
    className: "green",
  },
];

const steps = [
  {
    number: "01",
    title: "Você organiza",
    text: "Defina responsabilidades, valores e regras para cada filho.",
  },
  {
    number: "02",
    title: "Eles participam",
    text: "Seus filhos acompanham as tarefas e avisam quando concluírem.",
  },
  {
    number: "03",
    title: "Você aprova",
    text: "Confira as atividades realizadas antes de confirmar cada conquista.",
  },
  {
    number: "04",
    title: "Eles aprendem",
    text: "Acompanhar o próprio saldo ajuda a desenvolver consciência financeira.",
  },
];

export default function Home() {
  const router = useRouter();

  return (
    <>
      <main className="landing">
        <header className="header">
          <div className="headerInner">
            <button
              className="brand"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              <span className="brandIcon">★</span>
              <span>Mesada Kids</span>
            </button>

            <nav className="nav">
              <a href="#como-funciona">Como funciona</a>
              <a href="#familia">Para a família</a>
              <a href="#seguranca">Segurança</a>
            </nav>

            <div className="headerActions">
              <button
                className="loginButton"
                onClick={() => router.push("/login")}
              >
                Entrar
              </button>

              <button
                className="startButton"
                onClick={() => router.push("/login")}
              >
                Começar
              </button>
            </div>
          </div>
        </header>

        <section className="hero">
          <div className="heroContent">
            <div className="eyebrow">
              <span>★</span>
              EDUCAÇÃO FINANCEIRA EM FAMÍLIA
            </div>

            <h1>
              Pequenas atitudes.
              <br />
              <span>Grandes conquistas.</span>
            </h1>

            <p className="heroText">
              Ajude seus filhos a desenvolver responsabilidade, organização e
              consciência financeira de um jeito leve, seguro e divertido.
            </p>

            <div className="heroActions">
              <button
                className="heroPrimary"
                onClick={() => router.push("/login")}
              >
                Começar minha família
                <span>→</span>
              </button>

              <a href="#como-funciona" className="heroSecondary">
                Ver como funciona
              </a>
            </div>

            <div className="heroTrust">
              <div className="avatars">
                <span>👨</span>
                <span>👩</span>
                <span>👦</span>
                <span>👧</span>
              </div>
              <p>
                <strong>Feito para famílias.</strong>
                <br />
                Pais acompanham. Filhos aprendem.
              </p>
            </div>
          </div>

          <div className="heroVisual">
            <div className="blob blobOne" />
            <div className="blob blobTwo" />

            <div className="appCard">
              <div className="appTop">
                <div>
                  <small>Olá, família! 👋</small>
                  <h3>Minhas conquistas</h3>
                </div>
                <div className="miniAvatar">👦</div>
              </div>

              <div className="balanceCard">
                <span>Conquistado este mês</span>
                <strong>R$ 42,80</strong>

                <div className="progressTrack">
                  <div className="progressFill" />
                </div>

                <small>Você está indo muito bem! ⭐</small>
              </div>

              <div className="todayHeader">
                <strong>Hoje</strong>
                <span>3 de 5 concluídas</span>
              </div>

              <div className="task done">
                <div className="taskCheck">✓</div>
                <div>
                  <strong>Arrumar o quarto</strong>
                  <small>Aprovada</small>
                </div>
                <b>+ R$ 0,23</b>
              </div>

              <div className="task waiting">
                <div className="taskCheck">⌛</div>
                <div>
                  <strong>Estudar</strong>
                  <small>Aguardando aprovação</small>
                </div>
                <b>Em análise</b>
              </div>

              <div className="task">
                <div className="taskCheck empty">○</div>
                <div>
                  <strong>Escovar os dentes</strong>
                  <small>Toque em “Fiz!” quando terminar</small>
                </div>
                <button>Fiz!</button>
              </div>
            </div>

            <div className="floatingCoin coinOne">★</div>
            <div className="floatingCoin coinTwo">R$</div>
            <div className="floatingBadge">
              <span>🏆</span>
              <div>
                <strong>Nova conquista!</strong>
                <small>7 dias organizados</small>
              </div>
            </div>
          </div>
        </section>

        <section className="features" id="familia">
          <div className="sectionHeading">
            <span>PARA TODA A FAMÍLIA</span>
            <h2>Aprender sobre dinheiro pode ser divertido.</h2>
            <p>
              Uma experiência para aproximar pais e filhos enquanto desenvolve
              hábitos que podem acompanhar as crianças por toda a vida.
            </p>
          </div>

          <div className="featureGrid">
            {features.map((feature) => (
              <article className="featureCard" key={feature.title}>
                <div className={`featureIcon ${feature.className}`}>
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="how" id="como-funciona">
          <div className="howInner">
            <div className="howIntro">
              <span>COMO FUNCIONA</span>
              <h2>Da responsabilidade à conquista.</h2>
              <p>
                O Mesada Kids cria uma rotina simples de acompanhamento entre
                responsáveis e filhos.
              </p>

              <div className="parentCard">
                <div className="parentIcon">👨‍👩‍👧</div>
                <div>
                  <strong>Você continua no controle.</strong>
                  <p>
                    Nenhuma tarefa gera uma conquista financeira antes da sua
                    aprovação.
                  </p>
                </div>
              </div>
            </div>

            <div className="steps">
              {steps.map((step) => (
                <div className="step" key={step.number}>
                  <div className="stepNumber">{step.number}</div>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="security" id="seguranca">
          <div className="securityIcon">🛡️</div>

          <div className="securityContent">
            <span>SEGURANÇA E RESPONSABILIDADE</span>
            <h2>Uma experiência pensada para famílias.</h2>
            <p>
              O responsável administra a família, acompanha as atividades e
              controla as aprovações. A experiência infantil é separada e
              simplificada.
            </p>
          </div>

          <div className="securityPoints">
            <div>✓ Controle dos responsáveis</div>
            <div>✓ Perfis separados para os filhos</div>
            <div>✓ Privacidade desde a concepção</div>
          </div>
        </section>

        <section className="finalCta">
          <div>
            <span className="finalStar">★</span>
            <h2>Educação financeira começa em casa.</h2>
            <p>
              Transforme pequenas responsabilidades em grandes aprendizados.
            </p>

            <button onClick={() => router.push("/login")}>
              Começar agora <span>→</span>
            </button>

            <small>
              O responsável mantém o controle da experiência familiar.
            </small>
          </div>
        </section>

        <footer>
          <div className="footerBrand">
            <span className="brandIcon">★</span>
            <strong>Mesada Kids</strong>
          </div>

          <p>
            Educação financeira, responsabilidade e conquistas em família.
          </p>

          <span>© 2026 Mesada Kids</span>
        </footer>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .landing {
          min-height: 100vh;
          background: #fbfcff;
          color: #172554;
          font-family: Arial, Helvetica, sans-serif;
        }

        .header {
          position: sticky;
          top: 0;
          z-index: 50;
          height: 78px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(18px);
          border-bottom: 1px solid #edf0f7;
        }

        .headerInner {
          max-width: 1180px;
          height: 100%;
          margin: auto;
          padding: 0 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .brand {
          border: 0;
          background: transparent;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #172554;
          font-size: 21px;
          font-weight: 800;
          cursor: pointer;
        }

        .brandIcon {
          width: 37px;
          height: 37px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          color: white;
          box-shadow: 0 8px 18px rgba(79, 70, 229, 0.22);
        }

        .nav {
          display: flex;
          gap: 32px;
        }

        .nav a {
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
        }

        .nav a:hover {
          color: #4f46e5;
        }

        .headerActions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .loginButton,
        .startButton {
          height: 42px;
          padding: 0 19px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .loginButton {
          background: white;
          color: #334155;
          border: 1px solid #e2e8f0;
        }

        .startButton {
          border: 0;
          background: #4f46e5;
          color: white;
          box-shadow: 0 8px 20px rgba(79, 70, 229, 0.2);
        }

        .hero {
          max-width: 1180px;
          min-height: 680px;
          margin: auto;
          padding: 70px 24px 90px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 80px;
        }

        .eyebrow,
        .sectionHeading > span,
        .howIntro > span,
        .securityContent > span {
          font-size: 12px;
          letter-spacing: 1.6px;
          font-weight: 800;
          color: #6366f1;
        }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border-radius: 100px;
          background: #eef2ff;
        }

        .hero h1 {
          margin: 24px 0 22px;
          font-size: clamp(48px, 5vw, 72px);
          line-height: 0.98;
          letter-spacing: -3.5px;
          color: #172554;
        }

        .hero h1 span {
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          -webkit-background-clip: text;
          color: transparent;
        }

        .heroText {
          max-width: 560px;
          color: #64748b;
          font-size: 18px;
          line-height: 1.7;
        }

        .heroActions {
          margin-top: 32px;
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .heroPrimary {
          border: 0;
          padding: 16px 21px;
          border-radius: 14px;
          background: linear-gradient(135deg, #4f46e5, #6d5dfc);
          color: white;
          font-size: 15px;
          font-weight: 800;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 15px 30px rgba(79, 70, 229, 0.22);
        }

        .heroSecondary {
          color: #475569;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
        }

        .heroTrust {
          margin-top: 38px;
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .avatars {
          display: flex;
        }

        .avatars span {
          width: 36px;
          height: 36px;
          margin-left: -7px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #f1f5f9;
          border: 3px solid white;
          font-size: 17px;
        }

        .avatars span:first-child {
          margin-left: 0;
        }

        .heroTrust p {
          margin: 0;
          color: #94a3b8;
          font-size: 12px;
          line-height: 1.45;
        }

        .heroTrust strong {
          color: #475569;
        }

        .heroVisual {
          min-height: 530px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(1px);
        }

        .blobOne {
          width: 440px;
          height: 440px;
          background: #eef2ff;
        }

        .blobTwo {
          width: 280px;
          height: 280px;
          right: -20px;
          top: 10px;
          background: #fae8ff;
          opacity: 0.75;
        }

        .appCard {
          position: relative;
          z-index: 4;
          width: 390px;
          padding: 24px;
          border-radius: 28px;
          background: rgba(255, 255, 255, 0.95);
          box-shadow: 0 35px 80px rgba(30, 41, 59, 0.14);
          border: 1px solid rgba(255, 255, 255, 0.9);
          transform: rotate(1deg);
        }

        .appTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .appTop small {
          color: #94a3b8;
        }

        .appTop h3 {
          margin: 5px 0 0;
          font-size: 18px;
        }

        .miniAvatar {
          width: 45px;
          height: 45px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #eef2ff;
          font-size: 23px;
        }

        .balanceCard {
          margin: 20px 0;
          padding: 19px;
          border-radius: 20px;
          color: white;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
        }

        .balanceCard span,
        .balanceCard small {
          display: block;
          opacity: 0.8;
          font-size: 11px;
        }

        .balanceCard strong {
          display: block;
          margin: 6px 0 13px;
          font-size: 28px;
        }

        .progressTrack {
          height: 6px;
          margin-bottom: 8px;
          background: rgba(255, 255, 255, 0.25);
          border-radius: 20px;
          overflow: hidden;
        }

        .progressFill {
          width: 64%;
          height: 100%;
          background: white;
          border-radius: inherit;
        }

        .todayHeader {
          display: flex;
          justify-content: space-between;
          margin: 18px 0 10px;
          font-size: 12px;
        }

        .todayHeader span {
          color: #94a3b8;
        }

        .task {
          margin-top: 9px;
          padding: 12px;
          display: grid;
          grid-template-columns: 35px 1fr auto;
          align-items: center;
          gap: 9px;
          border-radius: 14px;
          background: #f8fafc;
        }

        .taskCheck {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #dcfce7;
          color: #16a34a;
          font-weight: 900;
        }

        .taskCheck.empty {
          background: #eef2ff;
          color: #6366f1;
        }

        .waiting .taskCheck {
          background: #fff7ed;
          color: #f97316;
        }

        .task strong {
          display: block;
          font-size: 11px;
        }

        .task small {
          display: block;
          margin-top: 3px;
          color: #94a3b8;
          font-size: 9px;
        }

        .task b {
          color: #16a34a;
          font-size: 9px;
        }

        .waiting b {
          color: #f97316;
        }

        .task button {
          border: 0;
          padding: 7px 11px;
          border-radius: 9px;
          color: white;
          background: #6366f1;
          font-size: 9px;
          font-weight: 800;
        }

        .floatingCoin {
          position: absolute;
          z-index: 5;
          width: 62px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 20px;
          color: white;
          font-weight: 900;
          box-shadow: 0 18px 35px rgba(30, 41, 59, 0.18);
        }

        .coinOne {
          top: 70px;
          left: 15px;
          background: linear-gradient(135deg, #fbbf24, #f97316);
          transform: rotate(-12deg);
        }

        .coinTwo {
          right: 10px;
          bottom: 110px;
          background: linear-gradient(135deg, #22c55e, #14b8a6);
          transform: rotate(9deg);
        }

        .floatingBadge {
          position: absolute;
          z-index: 6;
          left: -5px;
          bottom: 55px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 15px;
          background: white;
          box-shadow: 0 18px 45px rgba(30, 41, 59, 0.14);
        }

        .floatingBadge span {
          font-size: 25px;
        }

        .floatingBadge strong,
        .floatingBadge small {
          display: block;
        }

        .floatingBadge strong {
          font-size: 10px;
        }

        .floatingBadge small {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
        }

        .features {
          padding: 100px 24px;
          background: white;
        }

        .sectionHeading {
          max-width: 700px;
          margin: auto;
          text-align: center;
        }

        .sectionHeading h2,
        .howIntro h2,
        .securityContent h2,
        .finalCta h2 {
          margin: 12px 0 15px;
          color: #172554;
          font-size: 38px;
          letter-spacing: -1.5px;
        }

        .sectionHeading p,
        .howIntro > p,
        .securityContent p {
          color: #64748b;
          line-height: 1.7;
        }

        .featureGrid {
          max-width: 1100px;
          margin: 55px auto 0;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 18px;
        }

        .featureCard {
          padding: 28px 24px;
          border: 1px solid #edf0f7;
          border-radius: 22px;
          background: #fff;
          box-shadow: 0 8px 30px rgba(30, 41, 59, 0.04);
        }

        .featureIcon {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }

        .featureIcon.blue {
          background: #e0e7ff;
          color: #4f46e5;
        }

        .featureIcon.purple {
          background: #f3e8ff;
        }

        .featureIcon.orange {
          background: #ffedd5;
          color: #ea580c;
        }

        .featureIcon.green {
          background: #dcfce7;
          color: #16a34a;
        }

        .featureCard h3 {
          margin: 19px 0 10px;
          font-size: 17px;
        }

        .featureCard p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.65;
        }

        .how {
          padding: 110px 24px;
          background: #f7f8ff;
        }

        .howInner {
          max-width: 1050px;
          margin: auto;
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 100px;
          align-items: center;
        }

        .parentCard {
          margin-top: 35px;
          padding: 18px;
          display: flex;
          gap: 14px;
          border-radius: 18px;
          background: white;
          box-shadow: 0 10px 35px rgba(30, 41, 59, 0.05);
        }

        .parentIcon {
          font-size: 27px;
        }

        .parentCard p {
          margin: 5px 0 0;
          color: #64748b;
          font-size: 12px;
          line-height: 1.55;
        }

        .steps {
          position: relative;
        }

        .step {
          position: relative;
          padding: 18px 0;
          display: grid;
          grid-template-columns: 55px 1fr;
          gap: 18px;
        }

        .stepNumber {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          background: white;
          color: #6366f1;
          font-size: 12px;
          font-weight: 900;
          box-shadow: 0 8px 25px rgba(30, 41, 59, 0.07);
        }

        .step h3 {
          margin: 2px 0 7px;
          font-size: 16px;
        }

        .step p {
          margin: 0;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }

        .security {
          max-width: 1100px;
          margin: 90px auto;
          padding: 38px;
          display: grid;
          grid-template-columns: 80px 1fr 0.9fr;
          gap: 28px;
          align-items: center;
          border: 1px solid #e0e7ff;
          border-radius: 28px;
          background: linear-gradient(135deg, #f8faff, #faf5ff);
        }

        .securityIcon {
          width: 70px;
          height: 70px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 22px;
          background: white;
          font-size: 34px;
          box-shadow: 0 10px 30px rgba(30, 41, 59, 0.07);
        }

        .securityContent h2 {
          margin: 8px 0;
          font-size: 25px;
        }

        .securityContent p {
          margin: 0;
          font-size: 13px;
        }

        .securityPoints {
          display: grid;
          gap: 10px;
          color: #475569;
          font-size: 13px;
          font-weight: 700;
        }

        .finalCta {
          padding: 95px 24px;
          text-align: center;
          color: white;
          background: linear-gradient(135deg, #4338ca, #7c3aed);
        }

        .finalCta > div {
          max-width: 680px;
          margin: auto;
        }

        .finalStar {
          width: 50px;
          height: 50px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.14);
          font-size: 22px;
        }

        .finalCta h2 {
          margin-top: 22px;
          color: white;
          font-size: 38px;
        }

        .finalCta p {
          color: #ddd6fe;
          font-size: 16px;
        }

        .finalCta button {
          margin: 20px 0 14px;
          padding: 15px 22px;
          border: 0;
          border-radius: 14px;
          background: white;
          color: #4f46e5;
          font-weight: 900;
          cursor: pointer;
        }

        .finalCta button span {
          margin-left: 12px;
        }

        .finalCta small {
          display: block;
          color: #c4b5fd;
        }

        footer {
          max-width: 1100px;
          margin: auto;
          padding: 32px 24px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          color: #94a3b8;
          font-size: 11px;
        }

        footer > span {
          text-align: right;
        }

        .footerBrand {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #172554;
        }

        .footerBrand .brandIcon {
          width: 30px;
          height: 30px;
          border-radius: 9px;
        }

        @media (max-width: 900px) {
          .nav {
            display: none;
          }

          .hero {
            grid-template-columns: 1fr;
            gap: 20px;
            padding-top: 55px;
            text-align: center;
          }

          .heroText {
            margin-left: auto;
            margin-right: auto;
          }

          .heroActions,
          .heroTrust {
            justify-content: center;
          }

          .heroVisual {
            margin-top: 20px;
          }

          .featureGrid {
            grid-template-columns: repeat(2, 1fr);
          }

          .howInner {
            grid-template-columns: 1fr;
            gap: 45px;
          }

          .security {
            margin: 60px 20px;
            grid-template-columns: 70px 1fr;
          }

          .securityPoints {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 600px) {
          .header {
            height: 68px;
          }

          .headerInner {
            padding: 0 16px;
          }

          .brand {
            font-size: 17px;
          }

          .brandIcon {
            width: 33px;
            height: 33px;
          }

          .loginButton {
            display: none;
          }

          .startButton {
            height: 38px;
            padding: 0 14px;
          }

          .hero {
            min-height: auto;
            padding: 45px 18px 65px;
          }

          .hero h1 {
            margin-top: 20px;
            font-size: 45px;
            letter-spacing: -2.5px;
          }

          .heroText {
            font-size: 16px;
          }

          .heroActions {
            flex-direction: column;
          }

          .heroPrimary {
            width: 100%;
            justify-content: center;
          }

          .heroVisual {
            min-height: 480px;
          }

          .appCard {
            width: min(350px, 94vw);
            padding: 19px;
          }

          .floatingBadge {
            left: 0;
          }

          .coinOne {
            left: 0;
          }

          .coinTwo {
            right: 0;
          }

          .features,
          .how {
            padding: 75px 18px;
          }

          .sectionHeading h2,
          .howIntro h2,
          .finalCta h2 {
            font-size: 30px;
          }

          .featureGrid {
            grid-template-columns: 1fr;
            margin-top: 35px;
          }

          .security {
            padding: 25px;
            grid-template-columns: 1fr;
            text-align: center;
          }

          .securityIcon {
            margin: auto;
          }

          .securityPoints {
            text-align: left;
          }

          footer {
            grid-template-columns: 1fr;
            gap: 14px;
            text-align: center;
          }

          .footerBrand {
            justify-content: center;
          }

          footer > span {
            text-align: center;
          }
        }
      `}</style>
    </>
  );
}