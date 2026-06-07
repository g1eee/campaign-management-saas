/**
 * Product master data (sample seeded from the team's "calculate campaign"
 * master sheet). Each entry carries HPP (cost) and Harga Jual (selling price);
 * all marketplace fees are derived from the selling price by productCalc.
 */

import { Product, ProductCategory } from "./productCalc.js";

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  hjb: "Hijab",
  inner: "Inner",
  "dress/bls": "Dress / Blouse",
  Acs: "Aksesoris",
  mkn: "Mukena",
};

/** A representative spread of the master catalog across all categories. */
export const SEED_PRODUCTS: Product[] = [
  { id: "p-alea", name: "Alea Hijab", category: "hjb", hpp: 7000, hargaJual: 19800 },
  { id: "p-alifa", name: "Alifa", category: "hjb", hpp: 11000, hargaJual: 32700 },
  { id: "p-amira-l", name: "Amira L", category: "hjb", hpp: 16000, hargaJual: 45200 },
  { id: "p-arab-anak", name: "Arab Anak", category: "inner", hpp: 4000, hargaJual: 12900 },
  { id: "p-manset-l", name: "Manset Anak L", category: "inner", hpp: 16500, hargaJual: 46600 },
  { id: "p-azura", name: "Azura Dress", category: "dress/bls", hpp: 31000, hargaJual: 90800 },
  { id: "p-keisa", name: "Keisa Dress", category: "dress/bls", hpp: 65000, hargaJual: 183700 },
  { id: "p-jarum", name: "Jarum Pentul", category: "Acs", hpp: 527, hargaJual: 3000 },
  { id: "p-kartu", name: "Kartu Ucapan", category: "Acs", hpp: 500, hargaJual: 5000 },
  { id: "p-sejadah", name: "Sejadah Traveling", category: "Acs", hpp: 6931, hargaJual: 22400 },
  { id: "p-arsy", name: "Mkn Arsy Kids", category: "mkn", hpp: 65935, hargaJual: 257400 },
  { id: "p-lavela", name: "Mkn Lavela Kids", category: "mkn", hpp: 97269, hargaJual: 280000 },
  { id: "p-pin-square", name: "Pin Square", category: "hjb", hpp: 18000, hargaJual: 52000 },
  { id: "p-bundling", name: "Alika Bundling 2pcs", category: "hjb", hpp: 20200, hargaJual: 52000 },
];
