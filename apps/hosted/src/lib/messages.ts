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
  resumeOffer: string;
  resumeTitle: string;
  resumeHint: string;
  resumeEmail: string;
  resumeSend: string;
  resumeCancel: string;
  resumeSent: string;
  resumeFailed: string;
  resumeTooMany: string;
  receiptDownload: string;
  receiptFailed: string;
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
  resumeOffer: "Email me a link to continue later",
  resumeTitle: "Continue later",
  resumeHint:
    "We save your answers and email you a link to this form. Anyone with the link can see your answers.",
  resumeEmail: "Your email",
  resumeSend: "Send link",
  resumeCancel: "Cancel",
  resumeSent: "Link sent. Check your email; it works for 30 days after your last change.",
  resumeFailed: "The link could not be sent. Check the address and try again.",
  resumeTooMany: "Too many emails for this form today. Use the link you already received.",
  receiptDownload: "Download a receipt (PDF)",
  receiptFailed:
    "The receipt could not be downloaded. It is available for one hour after submitting.",
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
  resumeOffer: "发邮件给我，稍后继续填写",
  resumeTitle: "稍后继续",
  resumeHint:
    "我们会保存您填写的内容，并把本表单的链接发到您的邮箱。持有链接的人都能看到您填写的内容。",
  resumeEmail: "您的邮箱",
  resumeSend: "发送链接",
  resumeCancel: "取消",
  resumeSent: "链接已发送，请查收邮件。链接在您最后一次修改后 30 天内有效。",
  resumeFailed: "链接发送失败，请检查邮箱地址后重试。",
  resumeTooMany: "今天本表单的邮件发送次数过多，请使用已收到的链接。",
  receiptDownload: "下载回执（PDF）",
  receiptFailed: "回执下载失败。回执在提交后 1 小时内可以下载。",
};

export function hostedMessages(locale: string): HostedMessages {
  return locale.toLowerCase().startsWith("zh") ? zhCN : en;
}
