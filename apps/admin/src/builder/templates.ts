/** Starting points for new forms. Each is a complete, valid form document. */
import type { FormDocument } from "@formkiln/spec";
import rentalApplication from "@formkiln/spec/examples/rental-application.json";

export interface Template {
  id: string;
  name: string;
  description: string;
  document: FormDocument;
}

const contact: FormDocument = {
  schemaVersion: 1,
  key: "contact",
  title: "Contact us",
  description: "We usually reply within one working day.",
  pages: [
    {
      key: "details",
      elements: [
        { type: "name", key: "name", label: "Your name", required: true },
        { type: "email", key: "email", label: "Email", required: true, autocomplete: "email" },
        { type: "phone", key: "phone", label: "Phone", autocomplete: "tel" },
        {
          type: "select",
          key: "topic",
          label: "Topic",
          required: true,
          options: [
            { value: "question", label: "A question" },
            { value: "support", label: "Help with an order" },
            { value: "feedback", label: "Feedback" },
            { value: "other", label: "Something else" },
          ],
        },
        {
          type: "textarea",
          key: "message",
          label: "Message",
          required: true,
          rows: 6,
          validators: [{ type: "maxLength", value: 2000 }],
        },
        {
          type: "boolean",
          key: "consent",
          label: "I agree that you store my details to answer this message.",
          required: true,
          validators: [
            { type: "equals", value: true, message: "Please agree so we can answer you." },
          ],
        },
      ],
    },
  ],
  submit: { outcomes: [{ key: "sent", message: "Thank you. We will get back to you soon." }] },
};

const feedback: FormDocument = {
  schemaVersion: 1,
  key: "feedback",
  title: "How did we do?",
  pages: [
    {
      key: "rating",
      elements: [
        {
          type: "radio",
          key: "satisfaction",
          label: "How satisfied are you overall?",
          required: true,
          options: [
            { value: "5", label: "Very satisfied" },
            { value: "4", label: "Satisfied" },
            { value: "3", label: "Neutral" },
            { value: "2", label: "Dissatisfied" },
            { value: "1", label: "Very dissatisfied" },
          ],
        },
        {
          type: "textarea",
          key: "whatWentWrong",
          label: "What should we improve?",
          visible: { in: [{ var: "satisfaction" }, ["1", "2"]] },
          required: true,
        },
        {
          type: "checkboxes",
          key: "liked",
          label: "What did you like?",
          options: [
            { value: "speed", label: "Speed" },
            { value: "quality", label: "Quality" },
            { value: "price", label: "Price" },
            { value: "support", label: "Customer support" },
          ],
        },
        {
          type: "boolean",
          key: "recommend",
          label: "Would you recommend us to a friend?",
          display: "yesNo",
        },
        { type: "email", key: "email", label: "Email, if you would like a reply" },
      ],
    },
  ],
  submit: { outcomes: [{ key: "thanks", message: "Thank you for your feedback." }] },
};

const event: FormDocument = {
  schemaVersion: 1,
  key: "eventRegistration",
  title: "Event registration",
  settings: { navigation: "paged" },
  pages: [
    {
      key: "attendee",
      title: "About you",
      elements: [
        { type: "name", key: "name", label: "Name", required: true },
        { type: "email", key: "email", label: "Email", required: true, autocomplete: "email" },
        { type: "text", key: "organisation", label: "Organisation" },
      ],
    },
    {
      key: "attendance",
      title: "Attendance",
      elements: [
        {
          type: "radio",
          key: "ticket",
          label: "Ticket",
          required: true,
          options: [
            { value: "inPerson", label: "In person" },
            { value: "online", label: "Online" },
          ],
        },
        {
          type: "select",
          key: "diet",
          label: "Dietary requirements",
          visible: { "==": [{ var: "ticket" }, "inPerson"] },
          options: [
            { value: "none", label: "None" },
            { value: "vegetarian", label: "Vegetarian" },
            { value: "vegan", label: "Vegan" },
            { value: "other", label: "Other" },
          ],
        },
        {
          type: "text",
          key: "dietOther",
          label: "Please describe",
          visible: {
            and: [{ "==": [{ var: "ticket" }, "inPerson"] }, { "==": [{ var: "diet" }, "other"] }],
          },
          required: true,
        },
        {
          type: "repeater",
          key: "guests",
          label: "Guests",
          itemLabel: "Guest",
          maxItems: 3,
          visible: { "==": [{ var: "ticket" }, "inPerson"] },
          elements: [
            { type: "text", key: "guestName", label: "Guest name", required: true },
            { type: "email", key: "guestEmail", label: "Guest email" },
          ],
        },
      ],
    },
  ],
  submit: {
    outcomes: [{ key: "registered", message: "You are registered. A confirmation is on its way." }],
  },
};

const job: FormDocument = {
  schemaVersion: 1,
  key: "jobApplication",
  title: "Job application",
  settings: { navigation: "paged" },
  pages: [
    {
      key: "candidate",
      title: "About you",
      elements: [
        { type: "name", key: "name", label: "Full name", required: true },
        { type: "email", key: "email", label: "Email", required: true, autocomplete: "email" },
        { type: "phone", key: "phone", label: "Phone", required: true, autocomplete: "tel" },
        { type: "url", key: "profile", label: "LinkedIn or portfolio" },
      ],
    },
    {
      key: "experience",
      title: "Experience",
      elements: [
        {
          type: "number",
          key: "years",
          label: "Years of relevant experience",
          required: true,
          validators: [{ type: "min", value: 0 }, { type: "integer" }],
        },
        {
          type: "date",
          key: "availableFrom",
          label: "Earliest start date",
          required: true,
          validators: [{ type: "minDate", value: { "date.today": [] } }],
        },
        {
          type: "file",
          key: "cv",
          label: "CV",
          required: true,
          accept: ["application/pdf"],
          validators: [{ type: "maxFileSize", value: 5242880 }],
        },
        {
          type: "textarea",
          key: "motivation",
          label: "Why are you interested in this role?",
          rows: 6,
        },
      ],
    },
  ],
  submit: {
    outcomes: [{ key: "received", message: "Thank you. We will review your application." }],
  },
};

export const TEMPLATES: Template[] = [
  {
    id: "contact",
    name: "Contact form",
    description: "Name, email, topic and message with consent.",
    document: contact,
  },
  {
    id: "feedback",
    name: "Feedback survey",
    description: "Satisfaction with a follow-up question for low ratings.",
    document: feedback,
  },
  {
    id: "eventRegistration",
    name: "Event registration",
    description: "Two pages, ticket type, dietary needs and guests.",
    document: event,
  },
  {
    id: "jobApplication",
    name: "Job application",
    description: "Candidate details, experience and a CV upload.",
    document: job,
  },
  {
    id: "rentalApplication",
    name: "Rental application",
    description:
      "The full example: four pages, calculations, repeaters, sensitive fields, outcomes, two languages.",
    document: rentalApplication as unknown as FormDocument,
  },
];
