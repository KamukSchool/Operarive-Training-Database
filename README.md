# Operarive Training Database — Kamuk School

**Twin de Infinity Studio CR** — misma experiencia de producto (Portal, Engine, Nexora, IA, juegos, evaluación), **datos y accesos 100% separados**.

| | Infinity | Kamuk |
|--|--|--|
| Repo | INFINTYSTUDIOCR/Database- | KamukSchool/Operarive-Training-Database |
| Supabase | infinity_* | kamuk_* (`lbspgbeqtcnjrbhiuucu`) |
| IDs | `IS-` | `KAM-` |
| Brand | púrpura | azul Kamuk |
| **Portal estudiantes** | studioinfinitycr.com | **https://kamukschool.github.io/Operarive-Training-Database/** (`index.html`) |
| Engine | studioinfinitycr.com | https://kamukschool.github.io/Operarive-Training-Database/Kamuk_Engine.html |

## Apps

| Archivo | Uso |
|---------|-----|
| **`index.html`** | **Portal del estudiante** (entrada única / raíz del sitio) |
| `Kamuk_Student_Portal.html` | Redirect → `index.html` (compatibilidad links viejos) |
| `ops.html` | Hub ops: Engine + Nexora |
| `Kamuk_Engine.html` | Engine trainers / master |
| `nexora.html` | Lab Nexora |

## Acceso

- Estudiantes: abren la **raíz** del sitio (index). No hace falta copiar `Kamuk_Student_Portal.html`.
- Trainers / master: `Kamuk_Engine.html` o hub `ops.html`.

## Build

Desde el monorepo Infinity:

```bash
node scripts/_archive_kamuk/build-kamuk-twin.mjs
```

Static JS/CSS se cargan desde `studioinfinitycr.com` (solo librerías). **No** se leen tablas Infinity.

## GitHub Pages

https://kamukschool.github.io/Operarive-Training-Database/
