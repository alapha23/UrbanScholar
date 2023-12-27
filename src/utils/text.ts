import { unified } from "unified";
import markdown from "remark-parse";
import html from "remark-html";

// https://www.tunglt.com/2018/11/bo-dau-tieng-viet-javascript-es6/
export const formatAccountName = (name: string) =>
  name
    ? name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/[^a-zA-Z_\d]/g, "")
        .toLowerCase()
    : "";

export async function markdownToHtml(markdownText: string): Promise<string> {
  const result = await unified().use(markdown).use(html).process(markdownText);
  return result.toString();
}
