/* Tiny className helpers — no framework, just strings */

export const panel = "card";
export const btn = "btn";
export const btnPrimary = "btn btn-primary";
export const btnDanger = "btn btn-danger";
export const btnSecondary = "btn btn-secondary";
export const badge = "tag tag-purple";
export const input = ""; // base styles from globals.css already apply to <input>
export const tile = "tile";

/** Merge class names, filtering falsy values */
export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
