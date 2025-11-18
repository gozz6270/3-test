import "./style.css";
import Swal from "sweetalert2";

const FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScW8FIBjLsLC9GuklP7w9apLOemBPHnwqJ1CKF_rGGUD0kV0g/formResponse";

// GPT API 호출 함수
async function callGPTAPI(messages) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey || apiKey === "your_api_key_here") {
    throw new Error(
      "API 키가 설정되지 않았습니다. .env 파일에 VITE_OPENAI_API_KEY를 설정해주세요."
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || "API 호출 실패");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// HTML 생성
document.querySelector("#app").innerHTML = `
  <div class="app-wrapper">
    <div class="main-container">
      <!-- 기존 폼 -->
      <div class="container">
        <div class="container-header">
          <h1>기본 정보</h1>
        </div>
        <form id="googleForm" class="form">
          <div class="form-group">
            <label for="name">이름</label>
            <input type="text" id="name" name="name" required />
          </div>
          <div class="form-group">
            <label for="studentId">학번</label>
            <input type="text" id="studentId" name="studentId" required />
          </div>
          <div class="form-group">
            <label for="message">하고 싶은 말</label>
            <textarea id="message" name="message" rows="5" required></textarea>
          </div>
        </form>
      </div>

      <!-- 챗봇 예시 -->
      <div class="container">
        <div class="container-header">
          <h1>오늘 목표 공부 시간</h1>
        </div>
        <div class="chat-container">
          <div id="chatMessages" class="chat-messages">
            <div class="chat-message bot">
              <div class="message-content">안녕하세요! 오늘 목표 공부 시간에 대해 이야기해볼까요?</div>
            </div>
          </div>
          <div class="chat-input-container">
            <input
              type="text"
              id="chatInput"
              class="chat-input"
              placeholder="메시지를 입력하세요..."
            />
            <button id="chatSendBtn" class="chat-send-btn">전송</button>
          </div>
        </div>
      </div>

      <!-- 자기 성찰 + GPT 피드백 -->
      <div class="container">
        <div class="container-header">
          <h1>어제 공부 시간 성찰</h1>
        </div>
        <div class="reflection-container">
          <div class="form-group">
            <label for="reflection">어제 공부 시간에 대한 자기 성찰</label>
            <textarea id="reflection" name="reflection" rows="8"></textarea>
          </div>
          <button id="getFeedbackBtn" class="action-btn">GPT 피드백 받기</button>
          <div id="feedbackSection" class="feedback-section" style="display: none;">
            <h3>GPT 피드백</h3>
            <div id="feedbackContent" class="feedback-content"></div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 통합 제출 버튼 -->
    <button id="integratedSubmitBtn" class="integrated-submit-btn">
      <span class="submit-icon">📤</span>
      <span>전체 제출하기</span>
    </button>
  </div>
`;

// 기존 폼 - 제출 이벤트 제거 (통합 제출로 변경)
const form = document.querySelector("#googleForm");
form.addEventListener("submit", (e) => {
  e.preventDefault();
});

// 챗봇 기능
const chatMessages = document.querySelector("#chatMessages");
const chatInput = document.querySelector("#chatInput");
const chatSendBtn = document.querySelector("#chatSendBtn");

let chatHistory = [];

chatSendBtn.addEventListener("click", async () => {
  const message = chatInput.value.trim();
  if (!message) return;

  // 사용자 메시지 추가
  const userMessageDiv = document.createElement("div");
  userMessageDiv.className = "chat-message user";
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = message;
  userMessageDiv.appendChild(messageContent);
  chatMessages.appendChild(userMessageDiv);
  chatHistory.push({ role: "user", content: message });
  chatInput.value = "";

  // 스크롤을 맨 아래로
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // GPT 응답 받기
  chatSendBtn.disabled = true;
  chatSendBtn.textContent = "전송 중...";

  try {
    const systemMessage = {
      role: "system",
      content:
        "당신은 친근한 상담사입니다. 사용자와 오늘 목표 공부 시간에 대해 대화를 나누세요.",
    };

    const messages = [
      systemMessage,
      ...chatHistory.map((msg) => ({ role: msg.role, content: msg.content })),
    ];

    const botResponse = await callGPTAPI(messages);

    const botMessageDiv = document.createElement("div");
    botMessageDiv.className = "chat-message bot";
    const messageContent = document.createElement("div");
    messageContent.className = "message-content";
    messageContent.textContent = botResponse;
    botMessageDiv.appendChild(messageContent);
    chatMessages.appendChild(botMessageDiv);
    chatHistory.push({ role: "assistant", content: botResponse });

    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    const errorDiv = document.createElement("div");
    errorDiv.className = "chat-message bot";
    errorDiv.textContent = `오류: ${error.message}`;
    chatMessages.appendChild(errorDiv);
  } finally {
    chatSendBtn.disabled = false;
    chatSendBtn.textContent = "전송";
  }
});

chatInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    chatSendBtn.click();
  }
});

// 자기 성찰 + GPT 피드백
const reflectionTextarea = document.querySelector("#reflection");
const getFeedbackBtn = document.querySelector("#getFeedbackBtn");
const feedbackSection = document.querySelector("#feedbackSection");
const feedbackContent = document.querySelector("#feedbackContent");

let gptFeedback = "";

getFeedbackBtn.addEventListener("click", async () => {
  const reflection = reflectionTextarea.value.trim();
  if (!reflection) {
    reflectionMessageDiv.textContent = "자기 성찰을 입력해주세요.";
    reflectionMessageDiv.className = "message error";
    return;
  }

  getFeedbackBtn.disabled = true;
  getFeedbackBtn.textContent = "피드백 생성 중...";
  feedbackContent.textContent = "피드백을 생성하고 있습니다...";
  feedbackSection.style.display = "block";

  try {
    const messages = [
      {
        role: "system",
        content:
          "당신은 학습 상담사입니다. 사용자가 작성한 어제 공부 시간에 대한 자기 성찰을 읽고, 건설적이고 격려하는 피드백을 제공하세요.",
      },
      {
        role: "user",
        content: `다음은 사용자가 작성한 어제 공부 시간에 대한 자기 성찰입니다:\n\n${reflection}`,
      },
    ];

    gptFeedback = await callGPTAPI(messages);
    feedbackContent.textContent = gptFeedback;
  } catch (error) {
    feedbackContent.textContent = `오류: ${error.message}`;
    feedbackSection.style.display = "block";
  } finally {
    getFeedbackBtn.disabled = false;
    getFeedbackBtn.textContent = "GPT 피드백 받기";
  }
});

// 통합 제출 기능
const integratedSubmitBtn = document.querySelector("#integratedSubmitBtn");

integratedSubmitBtn.addEventListener("click", async () => {
  // 유효성 검사
  const name = document.querySelector("#name").value.trim();
  const studentId = document.querySelector("#studentId").value.trim();
  const message = document.querySelector("#message").value.trim();
  const reflection = reflectionTextarea.value.trim();

  if (!name || !studentId || !message) {
    await Swal.fire({
      icon: "warning",
      title: "입력 확인",
      text: "기본 정보(이름, 학번, 하고 싶은 말)를 모두 입력해주세요.",
      confirmButtonColor: "#667eea",
      confirmButtonText: "확인",
    });
    return;
  }

  // 제출 확인 다이얼로그
  const confirmResult = await Swal.fire({
    title: "제출하시겠습니까?",
    text: "모든 정보가 Google Form으로 제출됩니다.",
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#667eea",
    cancelButtonColor: "#d33",
    confirmButtonText: "제출하기",
    cancelButtonText: "취소",
    reverseButtons: true,
  });

  if (!confirmResult.isConfirmed) {
    return;
  }

  // 로딩 표시
  Swal.fire({
    title: "제출 중...",
    text: "잠시만 기다려주세요.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });

  try {
    // 모든 데이터를 하나의 FormData에 통합
    const formData = new FormData();

    // 1. 기본 정보
    formData.append("entry.339409842", name);
    formData.append("entry.2119313464", studentId);
    formData.append("entry.1448634607", message);

    // 2. 챗봇 대화 내용 (있는 경우)
    if (chatHistory.length > 0) {
      const conversationText = chatHistory
        .map(
          (msg) => `${msg.role === "user" ? "사용자" : "봇"}: ${msg.content}`
        )
        .join("\n\n");
      formData.append("entry.380692783", conversationText);
    }

    // 3. 자기 성찰 + GPT 피드백 (있는 경우)
    if (reflection) {
      let submissionText = `[자기 성찰]\n${reflection}`;
      if (gptFeedback) {
        submissionText += `\n\n[GPT 피드백]\n${gptFeedback}`;
      }
      formData.append("entry.899895858", submissionText);
    }

    // 하나의 요청으로 모든 데이터 제출
    await fetch(FORM_URL, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    // 성공 메시지
    await Swal.fire({
      icon: "success",
      title: "제출 완료!",
      text: "모든 항목이 성공적으로 제출되었습니다.",
      confirmButtonColor: "#667eea",
      confirmButtonText: "확인",
    });

    // 폼 초기화
    form.reset();
    chatHistory = [];
    chatMessages.innerHTML = `
      <div class="chat-message bot">
        <div class="message-content">안녕하세요! 오늘 목표 공부 시간에 대해 이야기해볼까요?</div>
      </div>
    `;
    reflectionTextarea.value = "";
    gptFeedback = "";
    feedbackSection.style.display = "none";
  } catch (error) {
    // 오류 메시지
    await Swal.fire({
      icon: "error",
      title: "제출 실패",
      text: `제출 중 오류가 발생했습니다: ${error.message}`,
      confirmButtonColor: "#667eea",
      confirmButtonText: "확인",
    });
  }
});
