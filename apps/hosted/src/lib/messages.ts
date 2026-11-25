/** Strings of the hosted app around the form (the form itself uses @formkiln/react's messages). */
export interface HostedMessages {
  linkExpired: string;
  linkExpiredHint: string;
  sessionExpired: string;
  verificationFailed: string;
  verificationRequired: string;
  tooManyRequests: string;
  draftSaved: string;
  honeypotLabel: string;
}

const en: HostedMessages = {
  linkExpired: "This link has expired",
  linkExpiredHint: "Open the form again from the page that sent you here.",
  sessionExpired: "Your session has expired. Reload the page to continue; your answers are saved.",
  verificationFailed: "Verification failed. Please try again.",
  verificationRequired: "Please complete the verification first.",
  tooManyRequests: "Too many attempts. Please wait a minute and try again.",
  draftSaved: "Your answers are saved on this device.",
  honeypotLabel: "Leave this field empty",
};

const zhCN: HostedMessages = {
  linkExpired: "链接已过期",
  linkExpiredHint: "请从原页面重新打开这个表单。",
  sessionExpired: "会话已过期。请刷新页面后继续，您填写的内容已保存。",
  verificationFailed: "人机验证失败，请重试。",
  verificationRequired: "请先完成人机验证。",
  tooManyRequests: "尝试次数过多，请稍等一分钟后再试。",
  draftSaved: "您填写的内容已保存在本设备上。",
  honeypotLabel: "请勿填写此项",
};

export function hostedMessages(locale: string): HostedMessages {
  return locale.toLowerCase().startsWith("zh") ? zhCN : en;
}
