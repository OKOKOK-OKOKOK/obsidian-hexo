import esbuild from "esbuild";

esbuild.build({
    entryPoints: ["src/main.ts"],
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "es2018",
    outfile: "main.js",
    external: ["obsidian"],
});
