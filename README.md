# Operarive Training Database — Kamuk School

**Twin de Infinity Studio CR** — misma experiencia de producto (Portal, Engine, Nexora, IA, juegos, evaluación), **datos y accesos 100% separados**.

| | Infinity | Kamuk |
|--|--|--|
| Repo | INFINTYSTUDIOCR/Database- | KamukSchool/Operarive-Training-Database |
| Supabase | infinity_* | kamuk_* (`lbspgbeqtcnjrbhiuucu`) |
| IDs | `IS-` | `KAM-` |
| Brand | púrpura | azul Kamuk |
| Portal | studioinfinitycr.com | https://kamukschool.github.io/Operarive-Training-Database/Kamuk_Student_Portal.html |
| Engine | studioinfinitycr.com | https://kamukschool.github.io/Operarive-Training-Database/Kamuk_Engine.html |

## Apps

| Archivo | Uso |
|---------|-----|
| `index.html` | Hub GitHub Pages |
| `Kamuk_Student_Portal.html` | Paridad Infinity Student Portal |
| `Kamuk_Engine.html` | Paridad Infinity Nexus Engine |
| `nexora.html` | Lab Nexora |

## Build

Desde el monorepo Infinity:

```bash
node scripts/_archive_kamuk/build-kamuk-twin.mjs
```

Static JS/CSS se cargan desde `studioinfinitycr.com` (solo librerías). **No** se leen tablas Infinity.

## GitHub Pages

https://kamukschool.github.io/Operarive-Training-Database/
