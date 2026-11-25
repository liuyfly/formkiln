import type { ErrorCode, JsonValue, ValidationError } from "@formkiln/spec";

/** User interface strings. Error templates may use `{value}`. */
export interface Messages {
  back: string;
  next: string;
  submit: string;
  submitting: string;
  /** `{current}` and `{total}` are replaced. */
  progress: string;
  optional: string;
  errorSummaryTitle: string;
  submitFailed: string;
  submitted: string;
  unsupported: string;
  chooseDate: string;
  previousMonth: string;
  nextMonth: string;
  selectPlaceholder: string;
  yes: string;
  no: string;
  errors: Record<ErrorCode, string>;
}

export const en: Messages = {
  back: "Back",
  next: "Continue",
  submit: "Submit",
  submitting: "Submitting…",
  progress: "Step {current} of {total}",
  optional: "(optional)",
  errorSummaryTitle: "There is a problem",
  submitFailed: "Your answers could not be sent. Please try again.",
  submitted: "Thank you. Your answers have been received.",
  unsupported: "This field type is not supported yet.",
  chooseDate: "Choose a date",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  selectPlaceholder: "Select an option",
  yes: "Yes",
  no: "No",
  errors: {
    required: "This field is required",
    type: "Enter a valid value",
    option: "Select one of the options",
    "format.email": "Enter an email address in the correct format, like name@example.com",
    "format.phone": "Enter a phone number in the correct format",
    "format.url": "Enter a web address starting with http:// or https://",
    minLength: "Enter at least {value} characters",
    maxLength: "Enter {value} characters or fewer",
    pattern: "Enter a value in the correct format",
    min: "Enter a number of at least {value}",
    max: "Enter a number of at most {value}",
    integer: "Enter a whole number",
    minDate: "Enter a date on or after {value}",
    maxDate: "Enter a date on or before {value}",
    minItems: "Select or add at least {value}",
    maxItems: "Select or add at most {value}",
    maxFileSize: "The file must be smaller than {value} bytes",
    fileType: "This file type is not allowed",
    equals: "Enter the expected value",
    expression: "Enter a valid value",
  },
};

export const zhCN: Messages = {
  back: "上一步",
  next: "下一步",
  submit: "提交",
  submitting: "正在提交…",
  progress: "第 {current} 步，共 {total} 步",
  optional: "（选填）",
  errorSummaryTitle: "请修正以下问题",
  submitFailed: "提交失败，请稍后重试。",
  submitted: "感谢填写，我们已收到您的信息。",
  unsupported: "暂不支持此字段类型。",
  chooseDate: "选择日期",
  previousMonth: "上个月",
  nextMonth: "下个月",
  selectPlaceholder: "请选择",
  yes: "是",
  no: "否",
  errors: {
    required: "此项为必填项",
    type: "请输入有效的值",
    option: "请从选项中选择",
    "format.email": "请输入正确的邮箱地址，例如 name@example.com",
    "format.phone": "请输入正确的电话号码",
    "format.url": "请输入以 http:// 或 https:// 开头的网址",
    minLength: "至少输入 {value} 个字符",
    maxLength: "最多输入 {value} 个字符",
    pattern: "请输入正确的格式",
    min: "请输入不小于 {value} 的数",
    max: "请输入不大于 {value} 的数",
    integer: "请输入整数",
    minDate: "请选择 {value} 当天或之后的日期",
    maxDate: "请选择 {value} 当天或之前的日期",
    minItems: "至少选择或添加 {value} 项",
    maxItems: "最多选择或添加 {value} 项",
    maxFileSize: "文件大小不能超过 {value} 字节",
    fileType: "不支持此文件类型",
    equals: "请输入符合要求的值",
    expression: "请输入有效的值",
  },
};

/** Built-in messages for a locale (by language), falling back to English. */
export function defaultMessages(locale: string): Messages {
  return locale.toLowerCase().startsWith("zh") ? zhCN : en;
}

export function format(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

const display = (value: JsonValue | undefined): string =>
  Array.isArray(value)
    ? value.join(", ")
    : value === undefined || value === null
      ? ""
      : String(value);

/** The text to show for an error: the form's custom message, or the localised default. */
export function errorText(error: ValidationError, messages: Messages): string {
  if (error.message !== undefined) return error.message;
  return format(messages.errors[error.code] ?? messages.errors.type, {
    value: display(error.params?.value),
  });
}
