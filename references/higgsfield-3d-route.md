# Rota WebGL: asset 3D próprio via Higgsfield (o que Jane e JCodes NÃO fazem)

Quando o alvo usa uma malha 3D proprietária (`.glb`/`.drc` Draco no bundle, cena
Three.js/R3F pesada), você **não pode nem deve** ripar a malha deles (obscuro,
lento, lado errado do copyright). A metodologia Jane sabe **reverter a receita**
(shaders, lighting, física via `effect-extraction.md` + gate SOURCE/PARTIAL/GUESS)
mas explicitamente **não gera nem exporta o asset 3D** — é o gap #3 dela.

Esta é a peça que a gente adiciona: **extrair a receita do alvo → gerar um asset
próprio equivalente via Higgsfield → aplicar material próprio na engine.**

Validado num hero real de cristal de vidro (landing page de cliente). Custo total:
**22 créditos ≈ US$ 0,86** no plano Plus anual (~$0,039/crédito).

## Os 4 passos

1. **Render conceitual** — `mcp__higgsfield__generate_image`, modelo `nano_banana_pro`,
   1:1, 1k (**2 créditos**). Regras de ouro do prompt (requisitos do reconstrutor 3D):
   **objeto ÚNICO, centrado, fundo neutro liso, sem texto, luz difusa suave, sombra
   de contato leve.** Template que funcionou:
   > *"A single sculpted [FORMA], standing upright and centered. Hand-carved organic
   > facets — slightly irregular planes, chipped bevel edges, fine internal fractures
   > catching the light. Frosted translucent glass fading to clear, faint warm [COR]
   > tint. Seamless light-grey studio background, soft diffuse lighting, gentle contact
   > shadow. Product photography, photorealistic, no text, no other objects."*
2. **Conversão** — `mcp__higgsfield__generate_3d`, modelo `image_to_3d`, `media` =
   job_id da imagem (**20 créditos**; sempre `get_cost:true` antes). Default
   `should_texture:false` = **geometria pura** — é o que se quer pra aplicar material
   próprio. Sai GLB ~800KB / ~30k tris.
3. **Validar** — magic bytes `glTF` v2 + viewer de sanidade (three + GLTFLoader +
   material glass + PMREM local) ANTES de integrar. Nunca integrar às cegas.
4. **Integrar** (Three/R3F) — 2 gotchas SEMPRE:
   - **normalizar por bounding box** (`escala = 2.2/maxDim`) — unidades vêm arbitrárias;
   - **corrigir eixo** — o eixo mais longo pode vir em Z/X; rotacionar pra Y.
   - Material: `MeshTransmissionMaterial` (drei) com `chromaticAberration ~0.5` =
     vidro com dispersão sem escrever shader custom.

## Lições de cena (pagas 2x, do hero real)

- **Vidro transmission sobre fundo liso lê como OPACO** — dar conteúdo pra refratar
  (backdrop com gradiente + barras de contraste + glows). Câmera orbitando → backdrop
  **cilíndrico** (`BackSide`), não plano.
- Texto em textura de cilindro visto por dentro **espelha** → `texture.repeat.x = -1`.
- `Environment preset` da drei = CDN que **cai e congela o Suspense inteiro** → sempre
  HDRI local (`files="./studio.hdr"`, Poly Haven CC0 1k ≈ 1.5MB).
- **Verificação headless de R3F em aba de fundo NÃO funciona** (rAF congelado adia o
  mount/Suspense) — o teste real de animação multi-fase é com a aba EM FOCO. Isto vale
  pro gate de verify (não confie em screenshot de aba de fundo pra cena WebGL animada).

## Quando NÃO usar esta rota

- Alvo estático (Astro/Vite SSG) com WebGL: o asset já está no bundle público →
  `mirror-site.mjs` baixa tudo (incl. `.glb`/`.sog`/`.wasm` runtime-fetched). Aí é
  clone 1:1 verdadeiro, não precisa gerar asset novo.
- Só precisa da *aparência* de um objeto simples (esfera de vidro, plano) →
  `MeshTransmissionMaterial` sozinho já entrega; não gaste crédito.
