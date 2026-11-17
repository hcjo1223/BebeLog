import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const eslintConfig = [
  {
    ignores: [".next/**", ".next-prod/**", "node_modules/**", ".agents/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // 아이콘 PNG와 인증 프록시 이미지는 next/image 최적화 대상이 아니다
      "@next/next/no-img-element": "off",
    },
  },
];

export default eslintConfig;
