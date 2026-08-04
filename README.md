# Operarive Training Database — Kamuk School

**Twin de Infinity Studio CR** — misma experiencia de producto (Portal, Engine, Nexora, IA, juegos, evaluación), **datos y accesos 100% separados**.

| | Infinity | Kamuk |
|--|--|--|
| Repo | INFINTYSTUDIOCR/Database- | KamukSchool/Operarive-Training-Database |
| Supabase | infinity_* | kamuk_* (`lbspgbeqtcnjrbhiuucu`) |
| IDs | `IS-` | `KAM-` |
| Brand | púrpura | azul Kamuk |
| **Portal (punto de entrada)** | studioinfinitycr.com | **https://kamukschool.github.io/Operarive-Training-Database/** |
| Engine | studioinfinitycr.com | https://kamukschool.github.io/Operarive-Training-Database/Kamuk_Engine.html |

## Apps

| Archivo | Uso |
|---------|-----|
| **`index.html`** | **Portal del estudiante (entrada principal Pages)** |
| `Kamuk_Student_Portal.html` | Redirect → `./` (compatibilidad de links viejos) |
| `ops.html` | Hub ops (Engine / Nexora accesos) |
| `Kamuk_Engine.html` | Engine trainers / master |
| `nexora.html` | Lab Nexora |

## GitHub Pages

**URL del portal (estudiantes):**  
https://kamukschool.github.io/Operarive-Training-Database/

**Ops:**  
https://kamukschool.github.io/Operarive-Training-Database/ops.html

## Build

Desde el monorepo Infinity:

```bash
node scripts/_archive_kamuk/build-kamuk-twin.mjs
```

Tras rebuild, el portal debe quedar publicado como **`index.html`** (no solo `Kamuk_Student_Portal.html`).

Static JS/CSS se cargan desde `studioinfinitycr.com` (solo librerías). **No** se leen tablas Infinity.
