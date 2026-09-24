import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mesada Kids",
    short_name: "Mesada Kids",
    description:
      "Tarefas, conquistas e educação financeira para toda a família.",
    start_url: "/acesso-infantil",
    display: "standalone",
    background_color: "#fafaff",
    theme_color: "#6658f5",
    orientation: "portrait",
    icons: [
      {
        src: "/branding/mesada-kids-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/branding/mesada-kids-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}