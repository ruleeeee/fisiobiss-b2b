import { C } from "../../lib/constants";

export const s = {
  card: {
    backgroundColor: C.card,
    borderRadius: "12px",\n    padding: "20px",\n    border: `1px solid ${C.cardB}`,\n    boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
  },
  input: {
    width: "100%",\n    backgroundColor: C.inputBg,\n    border: `1px solid ${C.inputB}`,\n    color: C.text,\n    padding: "10px 14px",\n    borderRadius: "6px",\n    fontSize: "14px",\n    outline: "none"
  },
  btn: {
    backgroundColor: C.accent,\n    color: C.text,\n    border: "none",\n    padding: "10px 20px",\n    borderRadius: "6px",\n    cursor: "pointer",\n    fontWeight: "600",\n    transition: "opacity 0.2s"
  }
};