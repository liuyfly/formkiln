import {
  FIELD_VALUE_TYPES,
  type Element,
  type Field,
  type FormDocument,
  type ItemElement,
  type Page,
  type ValueType,
} from "@formkiln/spec";

/** A page or element of a form document, with its position and context. */
export interface FormNode {
  kind: "page" | "panel" | "content" | "repeater" | "field";
  key: string;
  /** The page or element object from the document. */
  source: Page | Element | ItemElement;
  /** JSON Pointer (RFC 6901) to the object. */
  pointer: string;
  parent: FormNode | null;
  /** The enclosing repeater, if any. */
  repeater: FormNode | null;
  children: FormNode[];
  /** Value type of fields and repeaters. */
  valueType: ValueType | null;
}

export interface FormModel {
  doc: FormDocument;
  /** Every node in document order (depth first). */
  nodes: FormNode[];
  /** Fields and repeaters outside repeaters, by key. */
  topValues: Map<string, FormNode>;
  /** Fields inside each repeater, by repeater key and child key. */
  repeaterFields: Map<string, Map<string, FormNode>>;
}

export const DEFAULT_PARTS: Readonly<Record<"name" | "address", readonly string[]>> = {
  name: ["given", "family"],
  address: ["line1", "line2", "city", "postalCode", "country"],
};

export const DEFAULT_REQUIRED_PARTS: Readonly<Record<"name" | "address", readonly string[]>> = {
  name: ["given", "family"],
  address: ["line1", "city", "postalCode"],
};

export function fieldValueType(field: Field): ValueType {
  return field.type === "hidden" ? field.valueType : FIELD_VALUE_TYPES[field.type];
}

export function partsOf(field: Field): readonly string[] {
  if (field.type === "name" || field.type === "address") {
    return field.parts ?? DEFAULT_PARTS[field.type];
  }
  return [];
}

export function requiredPartsOf(field: Field): readonly string[] {
  if (field.type === "name" || field.type === "address") {
    return field.requiredParts ?? DEFAULT_REQUIRED_PARTS[field.type];
  }
  return [];
}

/** Builds the node tree of a structurally valid form document. */
export function buildModel(doc: FormDocument): FormModel {
  const nodes: FormNode[] = [];
  const topValues = new Map<string, FormNode>();
  const repeaterFields = new Map<string, Map<string, FormNode>>();

  const visit = (
    source: Page | Element | ItemElement,
    pointer: string,
    parent: FormNode | null,
    repeater: FormNode | null,
  ): FormNode => {
    const kind: FormNode["kind"] =
      parent === null
        ? "page"
        : "type" in source &&
            (source.type === "panel" || source.type === "content" || source.type === "repeater")
          ? source.type
          : "field";
    const node: FormNode = {
      kind,
      key: source.key,
      source,
      pointer,
      parent,
      repeater,
      children: [],
      valueType:
        kind === "field" ? fieldValueType(source as Field) : kind === "repeater" ? "item[]" : null,
    };
    nodes.push(node);

    if (kind === "field" || kind === "repeater") {
      if (repeater) {
        const fields = repeaterFields.get(repeater.key)!;
        if (!fields.has(node.key)) fields.set(node.key, node);
      } else if (!topValues.has(node.key)) {
        topValues.set(node.key, node);
      }
    }
    if (kind === "repeater" && !repeaterFields.has(node.key)) {
      repeaterFields.set(node.key, new Map());
    }

    const elements = "elements" in source ? (source.elements as (Element | ItemElement)[]) : [];
    const innerRepeater = kind === "repeater" ? node : repeater;
    elements.forEach((element, index) => {
      node.children.push(visit(element, `${pointer}/elements/${index}`, node, innerRepeater));
    });
    return node;
  };

  doc.pages.forEach((page, index) => visit(page, `/pages/${index}`, null, null));
  return { doc, nodes, topValues, repeaterFields };
}

/** Fields of a repeater in document order. */
export function repeaterChildFields(node: FormNode): FormNode[] {
  const result: FormNode[] = [];
  const walk = (n: FormNode) => {
    for (const child of n.children) {
      if (child.kind === "field") result.push(child);
      walk(child);
    }
  };
  walk(node);
  return result;
}
