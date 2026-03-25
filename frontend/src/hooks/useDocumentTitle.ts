import { useEffect } from "react";

const SITE = "CosmétiShop";

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    const next = title.includes(SITE) ? title : `${title} | ${SITE}`;
    document.title = next;
    return () => {
      document.title = previous;
    };
  }, [title]);
}

export function useMetaDescription(description: string | null | undefined) {
  useEffect(() => {
    if (!description) return;
    let el = document.querySelector('meta[name="description"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "description");
      document.head.appendChild(el);
    }
    const previous = el.getAttribute("content") || "";
    el.setAttribute("content", description);
    return () => {
      if (previous) el?.setAttribute("content", previous);
    };
  }, [description]);
}
