import esbuild from "esbuild";

esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "es2018",
    outfile: "dist/main.js",
    external: ["obsidian"],
});
