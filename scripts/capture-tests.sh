#!/usr/bin/env bash
#
# capture-tests.sh — Ejecuta un comando de tests y deja evidencia REPRODUCIBLE:
#   1. Log crudo con timestamp (con color)      -> logs/<label>_<ts>.log
#   2. Copia limpia sin códigos ANSI (LLM/texto) -> logs/<label>_<ts>.clean.log
#   3. Imprime el bloque de resumen final
#   4. (opcional) Genera un PNG del resumen con `freeze`  (--png <ruta>)
#
# Uso:
#   bash scripts/capture-tests.sh                                   # por defecto: pnpm test
#   bash scripts/capture-tests.sh --label vitest -- pnpm test
#   bash scripts/capture-tests.sh --png ../metricas-memoria/figures/tests-vitest-run.png -- pnpm test
#
# Los logs viven en tfg/logs/ (git-ignored: /logs/). Idempotente y ordenable por timestamp.

set -uo pipefail

LABEL="vitest"
PNG=""
CMD=()

while [[ $# -gt 0 ]]; do
    case "$1" in
        --label) LABEL="$2"; shift 2 ;;
        --png)   PNG="$2";   shift 2 ;;
        --)      shift; CMD=("$@"); break ;;
        *)       CMD+=("$1"); shift ;;
    esac
done
[[ ${#CMD[@]} -eq 0 ]] && CMD=(pnpm test)

TS="$(date +%Y%m%d_%H%M%S)"
mkdir -p logs
RAW="logs/${LABEL}_${TS}.log"
CLEAN="logs/${LABEL}_${TS}.clean.log"

echo "▶ ${CMD[*]}"
echo "  log crudo  → $RAW"

# FORCE_COLOR conserva color en el crudo; al no ser TTY, vitest no hace redibujado interactivo.
FORCE_COLOR=1 "${CMD[@]}" 2>&1 | tee "$RAW"
STATUS=${PIPESTATUS[0]}

# Copia limpia: quita secuencias ANSI (CSI) y retornos de carro. perl es fiable en macOS/Linux.
perl -pe 's/\e\[[0-9;?]*[ -\/]*[@-~]//g' "$RAW" | tr -d '\r' > "$CLEAN"
echo "  log limpio → $CLEAN"

echo
echo "── Resumen ──────────────────────────────────────────"
grep -vE '^[[:space:]]*\{' "$CLEAN" | grep -E "Test Files|Tests |Start at|Duration" | tail -n 6 || true
echo "─────────────────────────────────────────────────────"

if [[ -n "$PNG" ]]; then
    if command -v freeze >/dev/null 2>&1; then
        SUMMARY="logs/${LABEL}_${TS}.summary.txt"
        { printf '$ %s\n\n' "${CMD[*]}"; grep -vE '^[[:space:]]*\{' "$CLEAN" | tail -n 14; } > "$SUMMARY"
        mkdir -p "$(dirname "$PNG")"
        freeze "$SUMMARY" --output "$PNG"
        echo "🖼  PNG → $PNG"
    else
        echo "⚠ 'freeze' no está instalado; se omite la imagen."
        echo "   Instálalo con: brew install charmbracelet/tap/freeze"
    fi
fi

exit "$STATUS"
