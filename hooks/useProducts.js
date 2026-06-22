// hooks/useProducts.js
"use client";
import { useState, useEffect } from "react";
import { getProducts, saveProducts } from "../lib/db";
import { PRODUCTS } from "../lib/constants";

export function useProducts() {
  const [products, setProducts] = useState(PRODUCTS); // fallback inmediato
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts()
      .then(p => { if (p?.length) setProducts(p); })
      .catch(() => {}) // silently keep fallback
      .finally(() => setLoading(false));
  }, []);

  const updateProducts = async (newProducts) => {
    setProducts(newProducts); // optimistic local update
    try {
      await saveProducts(newProducts);
    } catch (err) {
      throw err;
    }
  };

  return { products, setProducts, loading, updateProducts };
}