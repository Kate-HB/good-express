class RealtimeFeedbackGate {
  constructor(threshold = 30) {
    this.threshold = threshold;
    this.claimedLength = 0;
  }

  claim(transcript) {
    if (transcript.length - this.claimedLength < this.threshold) return false;
    this.claimedLength = transcript.length;
    return true;
  }
}

function buildRealtimeMessages(transcript) {
  return [
    {
      role: 'system',
      content: '你是中文口语实时教练。输出严格 JSON：{"feedback":"提示"}。每次只给1条提示，不超过8个字；无提示时输出空字符串。优先检查重复、结论缺失、缺少例子、主题漂移和立场模糊，不纠正语音识别错误。'
    },
    { role: 'user', content: transcript.slice(-500) }
  ];
}

async function requestRealtimeFeedback({ transcript, llm, timeoutMs = 1500 }) {
  if (!llm) return '';
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    });
    const result = await Promise.race([llm.complete(buildRealtimeMessages(transcript)), timeout]);
    return typeof result?.feedback === 'string' ? result.feedback.trim().slice(0, 16) : '';
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { RealtimeFeedbackGate, buildRealtimeMessages, requestRealtimeFeedback };
