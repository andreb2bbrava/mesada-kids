"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCarregando(true);
    setErro("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: senha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErro(
          data?.error || "Não foi possível entrar. Tente novamente."
        );
        setCarregando(false);
        return;
      }

      router.push("/responsavel");
      router.refresh();
    } catch {
      setErro("Não foi possível entrar. Tente novamente.");
      setCarregando(false);
    }
  }

  return (
    <>
      <main className="loginPage">
        <section className="visualSide">
          <button className="brand" onClick={() => router.push("/")}>
            <span className="brandIcon">★</span>
            <span>Mesada Kids</span>
          </button>

          <div className="visualContent">
            <div className="tag">★ EDUCAÇÃO FINANCEIRA EM FAMÍLIA</div>

            <h1>
              Aprender hoje.
              <br />
              <span>Conquistar amanhã.</span>
            </h1>

            <p>
              Acompanhe responsabilidades, aprove conquistas e ajude seus
              filhos a desenvolver uma relação mais consciente com o dinheiro.
            </p>

            <div className="familyCard">
              <div className="familyCardTop">
                <div>
                  <small>Família</small>
                  <strong>Minha família</strong>
                </div>

                <span className="familyEmoji">👨‍👩‍👧‍👦</span>
              </div>

              <div className="children">
                <div className="child">
                  <div className="avatar blue">👦</div>
                  <div>
                    <strong>Responsabilidades</strong>
                    <small>Organização e autonomia</small>
                  </div>
                  <span className="check">✓</span>
                </div>

                <div className="child">
                  <div className="avatar pink">👧</div>
                  <div>
                    <strong>Conquistas</strong>
                    <small>Aprendendo sobre dinheiro</small>
                  </div>
                  <span className="star">★</span>
                </div>
              </div>

              <div className="familyFooter">
                <span>🏆</span>
                <div>
                  <strong>Cada pequena atitude conta.</strong>
                  <small>
                    Acompanhe a evolução da sua família todos os dias.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="visualFooter">
            <span>🛡️</span>
            <p>
              <strong>Controle dos responsáveis</strong>
              <br />
              Uma experiência pensada para famílias.
            </p>
          </div>

          <div className="circle circleOne" />
          <div className="circle circleTwo" />
        </section>

        <section className="formSide">
          <div className="mobileBrand">
            <button className="brand" onClick={() => router.push("/")}>
              <span className="brandIcon">★</span>
              <span>Mesada Kids</span>
            </button>
          </div>

          <div className="formContainer">
            <button className="back" onClick={() => router.push("/")}>
              ← Voltar para o site
            </button>

            <div className="formHeading">
              <span className="hello">👋</span>
              <h2>Bem-vindo de volta!</h2>
              <p>Entre na sua conta para acompanhar sua família.</p>
            </div>

            <form onSubmit={entrar}>
              <label>
                E-mail
                <input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label>
                <div className="passwordLabel">
                  <span>Senha</span>
                  <button type="button" className="forgot">
                    Esqueci minha senha
                  </button>
                </div>

                <input
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(event) => setSenha(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              {erro && <div className="errorBox">{erro}</div>}

              <button
                className="submitButton"
                type="submit"
                disabled={carregando}
              >
                {carregando ? (
                  "Entrando..."
                ) : (
                  <>
                    Entrar na minha conta <span>→</span>
                  </>
                )}
              </button>
            </form>

            <div className="divider">
              <span />
              <p>AINDA NÃO TEM UMA CONTA?</p>
              <span />
            </div>

            <button
              className="registerButton"
              onClick={() => router.push("/cadastro")}
            >
              Criar minha família
            </button>

            <p className="legal">
              Ao continuar, você concorda com os termos e políticas do Mesada
              Kids.
            </p>
          </div>
        </section>
      </main>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
        }

        button,
        input {
          font-family: inherit;
        }

        .loginPage {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          background: white;
          color: #172554;
          font-family: Arial, Helvetica, sans-serif;
        }

        .visualSide {
          min-height: 100vh;
          position: relative;
          overflow: hidden;
          padding: 42px 7vw;
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            145deg,
            #f7f8ff 0%,
            #eef2ff 55%,
            #faf5ff 100%
          );
        }

        .brand {
          position: relative;
          z-index: 5;
          padding: 0;
          border: 0;
          background: transparent;
          display: inline-flex;
          align-items: center;
          gap: 11px;
          color: #172554;
          font-size: 21px;
          font-weight: 800;
          cursor: pointer;
        }

        .brandIcon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: white;
          background: linear-gradient(135deg, #4f46e5, #8b5cf6);
          box-shadow: 0 9px 22px rgba(79, 70, 229, 0.22);
        }

        .visualContent {
          position: relative;
          z-index: 4;
          width: 100%;
          max-width: 550px;
          margin: auto 0;
          padding: 55px 0;
        }

        .tag {
          width: fit-content;
          padding: 9px 13px;
          border-radius: 100px;
          color: #6366f1;
          background: rgba(255, 255, 255, 0.7);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.3px;
        }

        .visualContent h1 {
          margin: 24px 0 20px;
          color: #172554;
          font-size: clamp(45px, 4vw, 64px);
          line-height: 1.02;
          letter-spacing: -3px;
        }

        .visualContent h1 span {
          background: linear-gradient(90deg, #4f46e5, #a855f7);
          -webkit-background-clip: text;
          color: transparent;
        }

        .visualContent > p {
          max-width: 510px;
          margin: 0;
          color: #64748b;
          font-size: 16px;
          line-height: 1.7;
        }

        .familyCard {
          max-width: 470px;
          margin-top: 36px;
          padding: 22px;
          border-radius: 25px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 28px 70px rgba(51, 65, 85, 0.11);
          backdrop-filter: blur(12px);
        }

        .familyCardTop {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid #eef2f7;
        }

        .familyCardTop small,
        .familyCardTop strong {
          display: block;
        }

        .familyCardTop small {
          margin-bottom: 4px;
          color: #94a3b8;
          font-size: 10px;
        }

        .familyCardTop strong {
          font-size: 15px;
        }

        .familyEmoji {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: #f8fafc;
          font-size: 21px;
        }

        .children {
          padding: 9px 0;
        }

        .child {
          padding: 10px 4px;
          display: grid;
          grid-template-columns: 42px 1fr auto;
          align-items: center;
          gap: 11px;
        }

        .avatar {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          font-size: 21px;
        }

        .avatar.blue {
          background: #e0e7ff;
        }

        .avatar.pink {
          background: #fae8ff;
        }

        .child strong,
        .child small {
          display: block;
        }

        .child strong {
          font-size: 12px;
        }

        .child small {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 9px;
        }

        .check,
        .star {
          width: 29px;
          height: 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          font-size: 11px;
          font-weight: 900;
        }

        .check {
          color: #16a34a;
          background: #dcfce7;
        }

        .star {
          color: #d97706;
          background: #fef3c7;
        }

        .familyFooter {
          padding: 13px;
          display: flex;
          align-items: center;
          gap: 11px;
          border-radius: 15px;
          background: #f8fafc;
        }

        .familyFooter > span {
          font-size: 23px;
        }

        .familyFooter strong,
        .familyFooter small {
          display: block;
        }

        .familyFooter strong {
          font-size: 10px;
        }

        .familyFooter small {
          margin-top: 3px;
          color: #94a3b8;
          font-size: 8px;
        }

        .visualFooter {
          position: relative;
          z-index: 4;
          display: flex;
          align-items: center;
          gap: 10px;
          color: #64748b;
          font-size: 10px;
        }

        .visualFooter > span {
          font-size: 21px;
        }

        .visualFooter p {
          margin: 0;
          line-height: 1.5;
        }

        .visualFooter strong {
          color: #475569;
        }

        .circle {
          position: absolute;
          border-radius: 50%;
        }

        .circleOne {
          width: 430px;
          height: 430px;
          right: -160px;
          top: -130px;
          background: rgba(216, 180, 254, 0.2);
        }

        .circleTwo {
          width: 300px;
          height: 300px;
          left: -120px;
          bottom: -100px;
          background: rgba(165, 180, 252, 0.22);
        }

        .formSide {
          min-height: 100vh;
          padding: 40px 7vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
        }

        .formContainer {
          width: 100%;
          max-width: 430px;
        }

        .back {
          margin-bottom: 50px;
          padding: 0;
          border: 0;
          color: #94a3b8;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .back:hover {
          color: #4f46e5;
        }

        .hello {
          font-size: 29px;
        }

        .formHeading h2 {
          margin: 12px 0 8px;
          color: #172554;
          font-size: 32px;
          letter-spacing: -1.2px;
        }

        .formHeading p {
          margin: 0 0 31px;
          color: #94a3b8;
          font-size: 13px;
        }

        form {
          display: grid;
          gap: 20px;
        }

        label {
          display: grid;
          gap: 8px;
          color: #334155;
          font-size: 12px;
          font-weight: 800;
        }

        input {
          width: 100%;
          height: 52px;
          padding: 0 16px;
          outline: none;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #fbfcfe;
          color: #172554;
          font-size: 14px;
          transition: 0.2s;
        }

        input:focus {
          border-color: #818cf8;
          background: white;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.09);
        }

        input::placeholder {
          color: #cbd5e1;
        }

        .passwordLabel {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .forgot {
          padding: 0;
          border: 0;
          background: transparent;
          color: #6366f1;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .errorBox {
          padding: 11px 13px;
          border-radius: 11px;
          color: #b91c1c;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          font-size: 11px;
          line-height: 1.5;
        }

        .submitButton {
          height: 53px;
          border: 0;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 15px;
          color: white;
          background: linear-gradient(135deg, #4f46e5, #6d5dfc);
          box-shadow: 0 13px 27px rgba(79, 70, 229, 0.2);
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
        }

        .submitButton:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .divider {
          margin: 31px 0 22px;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 13px;
        }

        .divider span {
          height: 1px;
          background: #eef2f7;
        }

        .divider p {
          margin: 0;
          color: #c0c8d4;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .registerButton {
          width: 100%;
          height: 50px;
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          color: #475569;
          background: white;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .registerButton:hover {
          border-color: #c7d2fe;
          color: #4f46e5;
          background: #fafaff;
        }

        .legal {
          max-width: 320px;
          margin: 24px auto 0;
          color: #c0c8d4;
          text-align: center;
          font-size: 9px;
          line-height: 1.6;
        }

        .mobileBrand {
          display: none;
        }

        @media (max-width: 850px) {
          .loginPage {
            display: block;
          }

          .visualSide {
            display: none;
          }

          .formSide {
            min-height: 100vh;
            padding: 25px 22px 45px;
            display: block;
          }

          .mobileBrand {
            display: block;
            margin-bottom: 65px;
          }

          .formContainer {
            margin: auto;
          }

          .back {
            margin-bottom: 35px;
          }

          .formHeading h2 {
            font-size: 29px;
          }
        }
      `}</style>
    </>
  );
}