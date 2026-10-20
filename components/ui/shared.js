import { C } from "../../lib/constants";

export const s = {
  card: {
    backgroundColor: C.card,
    borderRadius: "12px",
    padding: "20px",
    border: `1px solid ${C.cardB}`,
    boxShadow: "0 4px 12px rgba(20,16,18,.12)"
  },
  input: {
    width: "100%",
    backgroundColor: C.inputBg,
    border: `1px solid ${C.inputB}`,
    color: C.text,
    padding: "10px 14px",
    borderRadius: "6px",
    fontSize: "14px",
    outline: "none"
  },
  btn: {
    backgroundColor: C.accent,
    color: C.text,
    border: "none",
    padding: "10px 20px",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "600",
    transition: "opacity 0.2s"
  }
};